/**
 * Dev Auth Bypass Route — Story 2.2: Local Dev Auth Bypass
 *
 * POST /auth/dev-bypass
 *
 * Creates a DB-backed Better Auth session for a seeded test user without requiring
 * a live Authentik instance. Intended for local development and CI integration tests only.
 *
 * Security: Two-condition guard (R-001 mitigation):
 *   1. AUTH_DEV_BYPASS must equal 'true' in the env
 *   2. NODE_ENV must NOT equal 'production'
 *
 * Neither condition alone is sufficient — both must be satisfied.
 *
 * Public route: /auth/** is allow-listed in routeGuards (hooks.server.ts); no additional
 * guard exclusion needed. The existing regex /^\/(?!(?:login|auth(?:\/|$)|r\/|skeleton|$))/
 * excludes all /auth/** paths via the negative lookahead 'auth(?:\/|$)'.
 *
 * Note: hooks.server.ts explicitly passes through /auth/dev-bypass before calling
 * svelteKitHandler (which intercepts all /auth/** for Better Auth). This route must
 * remain a standalone +server.ts file — not delegated to Better Auth's handler.
 */
import type { RequestHandler } from './$types';

import { error } from '@sveltejs/kit';

import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema/auth';
import { env } from '$lib/server/env';
import { auth } from '$lib/server/auth';

/**
 * Seeded dev bypass user constants.
 * Prefixed with '_' so SvelteKit allows the export from a +server.ts file
 * (valid exports: HTTP methods, fallback, prerender, trailingSlash, config, entries, or '_' prefixed).
 * Export so integration tests can reference known user ID/email without hardcoding.
 * Do NOT move to a shared module — the bypass is intentionally isolated to this route.
 */
export const _DEV_BYPASS_USER = {
	id: 'dev-bypass-user-00000000-0000-0000-0000-000000000001',
	email: 'dev@local.test',
	name: 'Dev User',
	emailVerified: true
} as const;

export const POST: RequestHandler = async () => {
	// MUST check BOTH conditions — R-001 mitigation.
	// Checking only AUTH_DEV_BYPASS: if someone sets it accidentally in prod, route is open.
	// Checking only NODE_ENV: if NODE_ENV is misconfigured, flag alone doesn't protect prod.
	if (env.AUTH_DEV_BYPASS !== 'true' || process.env['NODE_ENV'] === 'production') {
		error(404);
	}

	// Upsert the seeded dev user — insert if absent, update name on conflict.
	// Conflict target: email (unique constraint in users table).
	// Column casing: camelCase per auth.ts schema (drizzle adapter uses camelCase: true).
	const devUser = _DEV_BYPASS_USER;

	try {
		await db
			.insert(users)
			.values({
				id: devUser.id,
				email: devUser.email,
				name: devUser.name,
				emailVerified: devUser.emailVerified
			})
			.onConflictDoUpdate({
				target: users.email,
				set: {
					name: devUser.name,
					emailVerified: devUser.emailVerified
				}
			});
	} catch (upsertErr) {
		console.error('[dev-bypass] User upsert failed:', upsertErr);
		error(500, 'Dev bypass user upsert failed');
	}

	// Create a Better Auth session.
	//
	// Strategy: Insert session row directly via Drizzle, then sign the token using
	// Better Auth's internal crypto API (makeSignature from better-auth/crypto).
	//
	// Rationale: internalAdapter.createSession() fails with the Drizzle adapter when
	// schema table exports use plural names (e.g. "sessions") but Better Auth's internal
	// adapter looks up the singular model name "session". Direct Drizzle insert bypasses
	// the model name resolution issue while still creating a valid DB row.
	//
	// The session token in the cookie is signed: ${token}.${hmacSignature}.
	// auth.api.getSession() reads the cookie, verifies the signature (using AUTH_SECRET
	// via ctx.secret), then looks up the token in sessions.token column.
	let signedCookieValue: string;
	try {
		const ctx = await auth.$context;

		// Generate session ID and token (random strings, Better Auth style)
		const { generateRandomString } = await import('better-auth/crypto');
		const sessionId = generateRandomString(32);
		const sessionToken = generateRandomString(32);

		// Session expires in 30 minutes — FR-093: FIXED, never configurable
		const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
		const now = new Date();

		// Insert session row directly via Drizzle
		await db.insert(sessions).values({
			id: sessionId,
			token: sessionToken,
			userId: devUser.id,
			expiresAt,
			createdAt: now,
			updatedAt: now
		});

		// Sign the token with Better Auth's HMAC-SHA256 so auth.api.getSession() can verify it.
		// The signed cookie value format: "${token}.${base64HmacSignature}"
		const { makeSignature } = await import('better-auth/crypto');
		const signature = await makeSignature(sessionToken, ctx.secret);
		signedCookieValue = `${sessionToken}.${signature}`;
	} catch (err) {
		console.error('[dev-bypass] Session creation failed:', err);
		error(500, 'Dev bypass failed');
	}

	// Build the Set-Cookie header from Better Auth's own cookie definition so the dev-bypass
	// cookie is byte-for-byte compatible with what Better Auth writes and reads:
	//   - name: respects the __Secure- prefix and useSecureCookies (derived from NODE_ENV).
	//   - options: HttpOnly / SameSite / Secure / Path exactly as configured by Better Auth.
	// Reusing these (instead of hand-rolling the attribute string) prevents drift such as a
	// missing Secure flag or a __Secure- name without the Secure attribute (browser-rejected).
	const ctx = await auth.$context;
	const { name: cookieName, attributes: cookieAttributes } = ctx.authCookies.sessionToken;

	// Better Auth URL-encodes the signed value on write and decodeURIComponent's it on read
	// (better-call cookie serialization). Encode here so the value survives that round-trip.
	const cookieParts = [`${cookieName}=${encodeURIComponent(signedCookieValue)}`];
	cookieParts.push(`Path=${cookieAttributes.path ?? '/'}`);
	// Align the cookie lifetime with the 30-minute DB session expiry (FR-093) instead of
	// emitting a browser session cookie with no Max-Age.
	cookieParts.push(`Max-Age=${30 * 60}`);
	if (cookieAttributes.httpOnly) cookieParts.push('HttpOnly');
	if (cookieAttributes.secure) cookieParts.push('Secure');
	// sameSite is one of 'Strict'|'Lax'|'None' (or lowercase); normalize to a valid cookie token.
	const sameSite = String(cookieAttributes.sameSite ?? 'lax');
	cookieParts.push(
		`SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase()}`
	);

	return new Response(JSON.stringify({ ok: true, userId: devUser.id }), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Set-Cookie': cookieParts.join('; ')
		}
	});
};
