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

import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema/auth';
import { userProfiles } from '$lib/server/db/schema/profiles';
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

export const POST: RequestHandler = async ({ cookies, url }) => {
	// MUST check BOTH conditions — R-001 mitigation.
	// Checking only AUTH_DEV_BYPASS: if someone sets it accidentally in prod, route is open.
	// Checking only NODE_ENV: if NODE_ENV is misconfigured, flag alone doesn't protect prod.
	if (env.AUTH_DEV_BYPASS !== 'true' || process.env['NODE_ENV'] === 'production') {
		error(404);
	}

	// Resolve auth context once — used for signing the session token and reading cookie
	// attributes. Hoisted before both try blocks so both share the same resolved value
	// and any rejection from auth.$context is handled in a single place.
	let ctx: Awaited<typeof auth.$context>;
	try {
		ctx = await auth.$context;
	} catch (ctxErr) {
		console.error('[dev-bypass] auth.$context resolution failed:', ctxErr);
		error(500, 'Dev bypass failed');
	}

	// Upsert the seeded dev user — insert if absent, update name on conflict.
	// Conflict target: email (unique constraint in users table).
	// Column casing: camelCase per auth.ts schema (drizzle adapter uses camelCase: true).
	try {
		await db
			.insert(users)
			.values({
				id: _DEV_BYPASS_USER.id,
				email: _DEV_BYPASS_USER.email,
				name: _DEV_BYPASS_USER.name,
				emailVerified: _DEV_BYPASS_USER.emailVerified
			})
			.onConflictDoUpdate({
				target: users.email,
				set: {
					name: _DEV_BYPASS_USER.name,
					emailVerified: _DEV_BYPASS_USER.emailVerified
				}
			});
	} catch (upsertErr) {
		console.error('[dev-bypass] User upsert failed:', upsertErr);
		error(500, 'Dev bypass user upsert failed');
	}

	// Optionally upsert a dev profile row so authenticated routes that require a completed
	// profile (profileComplete check in hooks.server.ts) are accessible.
	// ?profileComplete=false skips this — useful for tests that need an incomplete-profile state.
	// Default: profileComplete=true so calendar/booking E2E tests can reach protected pages.
	const profileCompleteParam = url.searchParams.get('profileComplete');
	const shouldCreateProfile = profileCompleteParam !== 'false';
	if (shouldCreateProfile) {
		try {
			await db
				.insert(userProfiles)
				.values({
					userId: _DEV_BYPASS_USER.id,
					email: _DEV_BYPASS_USER.email,
					title: 'Dr.',
					firstName: 'Dev',
					lastName: 'User',
					phone: '0000000000',
					organization: 'Test Org'
				})
				.onConflictDoUpdate({
					target: userProfiles.userId,
					set: {
						email: _DEV_BYPASS_USER.email,
						title: 'Dr.',
						firstName: 'Dev',
						lastName: 'User',
						phone: '0000000000',
						organization: 'Test Org'
					}
				});
		} catch (profileErr) {
			console.error('[dev-bypass] Profile upsert failed:', profileErr);
			error(500, 'Dev bypass profile upsert failed');
		}
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
	try {
		const { generateRandomString, makeSignature } = await import('better-auth/crypto');
		const sessionId = generateRandomString(32);
		const sessionToken = generateRandomString(32);

		// Session expires in 30 minutes — FR-093: FIXED, never configurable
		const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
		const now = new Date();

		// Delete any prior dev bypass sessions before inserting a new one so the sessions
		// table doesn't accumulate unbounded rows across repeated bypass calls (e.g. one
		// per test file in a CI run). Only sessions for the dev bypass user are touched.
		await db.delete(sessions).where(eq(sessions.userId, _DEV_BYPASS_USER.id));

		// Insert session row directly via Drizzle
		await db.insert(sessions).values({
			id: sessionId,
			token: sessionToken,
			userId: _DEV_BYPASS_USER.id,
			expiresAt,
			createdAt: now,
			updatedAt: now
		});

		// Sign the token with Better Auth's HMAC-SHA256 so auth.api.getSession() can verify it.
		// The signed cookie value format: "${token}.${base64HmacSignature}"
		const signature = await makeSignature(sessionToken, ctx.secret);
		const signedCookieValue = `${sessionToken}.${signature}`;

		// Set the session cookie using Better Auth's own cookie definition so the dev-bypass
		// cookie is byte-for-byte compatible with what Better Auth writes and reads:
		//   - name: respects the __Secure- prefix and useSecureCookies (derived from NODE_ENV).
		//   - options: HttpOnly / SameSite / Secure / Path exactly as configured by Better Auth.
		// Using cookies.set() (SvelteKit's built-in serialiser) rather than hand-rolling the
		// Set-Cookie header string prevents drift such as a missing Secure flag or a __Secure-
		// name without the Secure attribute (browser-rejected), and picks up any new attributes
		// Better Auth adds to its cookie config automatically.
		const { name: cookieName, attributes: cookieAttributes } = ctx.authCookies.sessionToken;
		cookies.set(cookieName, signedCookieValue, {
			path: cookieAttributes.path ?? '/',
			// Align the cookie lifetime with the 30-minute DB session expiry (FR-093).
			maxAge: 30 * 60,
			httpOnly: cookieAttributes.httpOnly ?? true,
			secure: cookieAttributes.secure ?? false,
			sameSite: (cookieAttributes.sameSite as 'lax' | 'strict' | 'none') ?? 'lax'
		});
	} catch (err) {
		console.error('[dev-bypass] Session creation failed:', err);
		error(500, 'Dev bypass failed');
	}

	return new Response(JSON.stringify({ ok: true, userId: _DEV_BYPASS_USER.id }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
