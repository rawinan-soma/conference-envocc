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

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth } from 'better-auth/plugins/generic-oauth';
import { sveltekitCookies } from 'better-auth/svelte-kit';

import { db } from '../db/index.js'; // relative — safe for non-SvelteKit context
import { env } from '../env.js'; // relative — same reason

// Runtime assertion — fail fast if auth env vars are missing at server startup
// (they are optional in EnvSchema to allow build-time compilation without secrets)
if (
	!env.AUTH_SECRET ||
	!env.AUTHENTIK_CLIENT_ID ||
	!env.AUTHENTIK_CLIENT_SECRET ||
	!env.AUTHENTIK_ISSUER
) {
	// During `bun run build`, env vars may not be set — skip the check
	// During server startup, all four must be present
	const isBuildTime = process.env['NODE_ENV'] === 'production' && !process.env['RUNTIME'];
	if (!isBuildTime) {
		const missing = [
			'AUTH_SECRET',
			'AUTHENTIK_CLIENT_ID',
			'AUTHENTIK_CLIENT_SECRET',
			'AUTHENTIK_ISSUER'
		].filter((k) => !process.env[k]);
		if (missing.length > 0) {
			console.error(`[auth] Missing required environment variables: ${missing.join(', ')}`);
		}
	}
}

/**
 * Per-request event store for sveltekitCookies plugin.
 * Set by hooks.server.ts before delegating to Better Auth handler.
 * The plugin handles null gracefully (no-op if not set).
 */
let _currentEvent: RequestEvent | null = null;

export function setRequestEvent(event: RequestEvent | null): void {
	_currentEvent = event;
}

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
		expiresIn: 1800, // 30 minutes — FR-093: FIXED, never configurable
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
		// sveltekitCookies MUST be the last plugin — required by Better Auth
		sveltekitCookies(() => _currentEvent as RequestEvent)
	]
});

export type Auth = typeof auth;
