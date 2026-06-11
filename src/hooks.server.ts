import type { Handle } from '@sveltejs/kit';

import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';

import { env } from '$env/dynamic/private';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { auth, eventStorage } from '$lib/server/auth';
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
		// All (app) routes require authentication.
		// The SvelteKit route group "/(app)/" maps to URL paths under / (not literally /(app)/).
		// Public routes explicitly excluded: /login, /auth (bare or with subpath), /r/[token]/**, /, /skeleton (dev probe)
		pattern: /^\/(?!(?:login|auth(?:\/|$)|r\/|skeleton|$))/,
		guard: (event) => {
			const session = event.locals.session;
			if (!session) {
				redirect(302, '/login');
			}
		}
	}
];

// ---------------------------------------------------------------------------
// Better Auth handler — populates event.locals.session and event.locals.user
// ---------------------------------------------------------------------------

// Paths under /auth/** that are SvelteKit-native routes and must NOT be delegated to
// Better Auth's handler. svelteKitHandler intercepts all /auth/** because the catch-all
// src/routes/auth/[...all]/+server.ts delegates to it; standalone +server.ts routes
// nested under /auth/ must be explicitly excluded here so they are resolved directly.
//
// Why not use event.route.id: the catch-all /auth/[...all] gives every Better Auth
// request a non-null route.id too, so a generic "non-null means skip" check would
// prevent Better Auth from handling sign-in and callback flows.
//
// When adding a new SvelteKit-native route under /auth/**, add its path here.
const BETTER_AUTH_PASSTHROUGH_PATHS = new Set(['/auth/dev-bypass']);

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// Passthrough for SvelteKit-native routes under /auth/** that must NOT be delegated
	// to Better Auth. Checked BEFORE auth.api.getSession() so these routes avoid an
	// unnecessary DB session-lookup round-trip (they manage their own session lifecycle).
	if (BETTER_AUTH_PASSTHROUGH_PATHS.has(event.url.pathname)) {
		return resolve(event);
	}

	// Wrap the ENTIRE handler body in eventStorage.run(event, ...) so the sveltekitCookies
	// plugin's after-hook always has a valid RequestEvent via AsyncLocalStorage — regardless
	// of which code path triggers it (including auth.api.getSession() clearing an expired
	// session cookie). Without this, getSession() can fire the sveltekitCookies after-hook
	// before the storage context is established, causing:
	//   "sveltekitCookies: no RequestEvent in AsyncLocalStorage"
	//
	// AsyncLocalStorage guarantees per-request isolation: concurrent requests each have
	// their own storage slot, so request B cannot overwrite request A's event reference
	// (unlike a module-level mutable singleton, which was a concurrency hazard).
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
		} else {
			event.locals.session = null;
			event.locals.user = null;
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
