import type { Handle } from '@sveltejs/kit';

import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';

import { env } from '$env/dynamic/private';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { auth, eventStorage } from '$lib/server/auth';
import { getProfileByUserId } from '$lib/server/services/profile-service';
import { validateEnv } from '$lib/server/env';

// Validate at module load — fails fast on missing secrets
validateEnv(env as Record<string, string | undefined>);

// ---------------------------------------------------------------------------
// Route guards registry (R-006 architecture requirement)
//
// Story 2.5 and later stories push additional guards to this array without
// modifying the hook body. Export is required for test assertions (2.5-UNIT-001).
//
// Pattern:
//   { pattern: RegExp; guard: (event: Parameters<Handle>[0]['event']) => void }
//   The guard throws redirect(302, '/login') or error(403) as appropriate.
// ---------------------------------------------------------------------------

export const routeGuards: Array<{
	pattern: RegExp;
	guard: (event: Parameters<Handle>[0]['event']) => void;
}> = [
	{
		// All (app) routes require:
		//   1. An authenticated session (redirect → /login if missing)
		//   2. A completed profile (redirect → /profile/complete if missing)
		//
		// The SvelteKit route group "/(app)/" maps to URL paths under / (not literally /(app)/).
		// Public routes explicitly excluded: /login, /auth (bare or with subpath), /r/[token]/**, /, /skeleton (dev probe)
		// Profile completion route explicitly excluded: /profile/complete (would cause infinite redirect loop)
		//
		// Each exemption is end-anchored with (?:\/|$) so the negative lookahead only matches the
		// exact segment(s), not arbitrary prefixes. Without anchoring, "/profile/completeX",
		// "/loginx", "/skeletonx" would all be (incorrectly) treated as exempt and bypass the guard.
		pattern: /^\/(?!(?:login|auth|r|skeleton|profile\/complete)(?:\/|$)|$)/,
		guard: (event) => {
			const session = event.locals.session;
			if (!session) {
				redirect(302, '/login');
			}
			// Redirect authenticated users with incomplete profiles to the completion form.
			// event.locals.profileComplete is populated by handleBetterAuth before this guard runs.
			// Note: profileComplete === null means unauthenticated (handled above).
			//       profileComplete === false means authenticated but profile not yet created.
			if (event.locals.profileComplete === false) {
				redirect(302, '/profile/complete');
			}
		}
	}
];

// ---------------------------------------------------------------------------
// Better Auth handler — populates event.locals.session, user, userProfile, profileComplete
// ---------------------------------------------------------------------------

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// Wrap the entire request's async call tree in eventStorage.run(event, ...) so that:
	//   1. auth.api.getSession()'s after-hooks (sveltekitCookies) can call getRequestEvent()
	//      without getting undefined from AsyncLocalStorage.
	//   2. svelteKitHandler can write Set-Cookie headers via the same per-request event.
	//
	// IMPORTANT: auth.api.getSession() MUST be called inside eventStorage.run().
	// The sveltekitCookies plugin's after hook (matcher: always true, flag: "json")
	// runs after every direct auth.api.* call and calls getRequestEvent(). If the
	// event is not in AsyncLocalStorage, getRequestEvent() throws — causing a 500.
	//
	// AsyncLocalStorage guarantees per-request isolation: concurrent requests each have
	// their own storage slot, so request B cannot overwrite request A's event reference.
	return eventStorage.run(event, async () => {
		// Populate event.locals from the current session cookie.
		// auth.api.getSession() performs one DB round-trip to verify the session token.
		// This must be done explicitly: svelteKitHandler does NOT populate event.locals —
		// it only routes /auth/** requests to Better Auth's handler and resolves others.
		const sessionData = await auth.api.getSession({ headers: event.request.headers });
		if (sessionData) {
			// @ts-expect-error — Better Auth session type maps to our Drizzle schema types
			event.locals.session = sessionData.session;
			// @ts-expect-error — Better Auth user type maps to our Drizzle schema types
			event.locals.user = sessionData.user;
			// Check profile completeness once per request (avoids per-route DB hit).
			// This is one extra DB query per authenticated request — acceptable for MVP.
			// Try/catch ensures a DB error (timeout, pool exhaustion) degrades gracefully
			// (treats profile as incomplete → redirect to /profile/complete) rather than
			// converting every authenticated request into an unhandled 500.
			let profile = null;
			try {
				profile = await getProfileByUserId(sessionData.user.id);
			} catch {
				// DB unavailable — fall through with profile = null (profileComplete = false).
				// The guard will redirect to /profile/complete; the DB error will surface there.
			}
			event.locals.userProfile = profile;
			event.locals.profileComplete = profile !== null;
		} else {
			event.locals.session = null;
			event.locals.user = null;
			event.locals.userProfile = null;
			event.locals.profileComplete = null;
		}

		return svelteKitHandler({ auth, event, resolve, building });
	});
};

// ---------------------------------------------------------------------------
// Auth guard — runs after Better Auth populates event.locals
// ---------------------------------------------------------------------------

const handleAuthGuard: Handle = async ({ event, resolve }) => {
	for (const { pattern, guard } of routeGuards) {
		if (pattern.test(event.url.pathname)) {
			guard(event);
		}
	}
	return resolve(event);
};

// ---------------------------------------------------------------------------
// Paraglide i18n handle
// ---------------------------------------------------------------------------

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

// Compose: Better Auth → Auth Guard → Paraglide
// Order is critical: Better Auth must run first to populate event.locals.session
export const handle: Handle = sequence(handleBetterAuth, handleAuthGuard, handleParaglide);
