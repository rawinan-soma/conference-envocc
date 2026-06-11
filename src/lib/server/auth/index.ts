/**
 * Better Auth configuration — Story 2.1
 *
 * Uses:
 *   - Drizzle adapter (node-postgres / pg pool) with camelCase columns
 *   - Generic OAuth plugin → Authentik as OIDC IdP (authorization-code + PKCE)
 *   - sveltekitCookies plugin (MUST be last per Better Auth requirement)
 *
 * IMPORTANT: Use relative imports only — this file may be imported outside SvelteKit
 * context (e.g. worker.ts). Do NOT use $lib alias here.
 *
 * Session timeout: 1800 seconds (30 min) — fixed per FR-093, NEVER make configurable.
 */
import type { RequestEvent } from '@sveltejs/kit';

import { AsyncLocalStorage } from 'async_hooks';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth } from 'better-auth/plugins/generic-oauth';
import { sveltekitCookies } from 'better-auth/svelte-kit';

import { db } from '../db/index.js'; // relative — safe for non-SvelteKit context
import { env } from '../env.js'; // relative — same reason

// Warn if auth env vars are absent at module load time.
// env.ts validateEnv() is the primary fail-fast gate (called on import); this warning
// is a belt-and-suspenders signal for the auth module specifically.
// Note: during `bun run build` the env vars are genuinely absent — the build CI step
// provides only DATABASE_URL. This warning is expected and harmless at build time.
{
	const missing = [
		'AUTH_SECRET',
		'AUTHENTIK_CLIENT_ID',
		'AUTHENTIK_CLIENT_SECRET',
		'AUTHENTIK_ISSUER'
	].filter((k) => !process.env[k]);
	if (missing.length > 0) {
		console.warn(
			`[auth] Missing environment variables: ${missing.join(', ')} — auth flows will not work until these are set`
		);
	}
}

/**
 * Per-request event store for the sveltekitCookies plugin.
 *
 * AsyncLocalStorage provides true per-request isolation: each request's call stack
 * has its own storage slot, so concurrent requests cannot overwrite each other's event
 * reference. This is the correct alternative to a module-level mutable singleton,
 * which would be a concurrency hazard (request B could overwrite the singleton between
 * request A's setRequestEvent() call and the sveltekitCookies hook reading it).
 *
 * hooks.server.ts wraps handleBetterAuth in eventStorage.run(event, ...) so the
 * current RequestEvent is always available within the async call tree of each request.
 */
export const eventStorage = new AsyncLocalStorage<RequestEvent>();

export const auth = betterAuth({
	secret: env.AUTH_SECRET ?? 'placeholder-secret-for-build-time-only-not-used-in-production',
	// Mount Better Auth under /auth (matches src/routes/auth/[...all]/+server.ts and the
	// public-route allow-list in hooks.server.ts). Without this, Better Auth defaults to
	// /api/auth — svelteKitHandler's isAuthPath() and the OIDC redirectURI would not align
	// with the /auth route zone, breaking the sign-in and callback flow.
	basePath: '/auth',
	database: drizzleAdapter(db, {
		provider: 'pg',
		camelCase: true
	}),
	session: {
		expiresIn: 1800, // FR-093: FIXED 30-min timeout — NEVER make configurable
		updateAge: 900 // refresh session cookie every 15 min of activity
	},
	plugins: [
		genericOAuth({
			config: [
				{
					providerId: 'authentik',
					discoveryUrl: `${env.AUTHENTIK_ISSUER ?? ''}/.well-known/openid-configuration`,
					issuer: env.AUTHENTIK_ISSUER ?? '',
					clientId: env.AUTHENTIK_CLIENT_ID ?? '',
					clientSecret: env.AUTHENTIK_CLIENT_SECRET ?? '',
					scopes: ['openid', 'email', 'profile'],
					pkce: true
				}
			]
		}),
		// sveltekitCookies MUST be the last plugin — required by Better Auth.
		// getRequestEvent is called inside Better Auth's after-hook, within the same async
		// call tree as handleBetterAuth in hooks.server.ts, so eventStorage.getStore() returns
		// the correct per-request event with no cross-request contamination.
		sveltekitCookies(() => {
			const event = eventStorage.getStore();
			if (!event)
				throw new Error(
					'[auth] sveltekitCookies: no RequestEvent in AsyncLocalStorage — ensure handleBetterAuth wraps svelteKitHandler with eventStorage.run()'
				);
			return event;
		})
	]
});

export type Auth = typeof auth;
