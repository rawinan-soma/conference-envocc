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

const handleBetterAuth: Handle = ({ event, resolve }) => {
	// Wrap the entire request's async call tree in eventStorage.run(event, ...) so the
	// sveltekitCookies plugin can retrieve the correct RequestEvent via AsyncLocalStorage.
	// AsyncLocalStorage provides per-request isolation: concurrent requests each have their
	// own storage slot and cannot overwrite each other — unlike a module-level singleton.
	//
	// svelteKitHandler handles:
	//   - Routing /auth/** requests to Better Auth's handler
	//   - Populating event.locals.session / event.locals.user for all other requests
	//     (via the sveltekitCookies plugin's after-hook, which calls getRequestEvent())
	return eventStorage.run(event, () => svelteKitHandler({ auth, event, resolve, building }));
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
