/**
 * Login page server load + action — Story 2.1
 *
 * load: redirects already-authenticated users away from the login page.
 *
 * default action: initiates the Authentik OIDC (authorization-code + PKCE) flow
 * server-side. Better Auth's `/sign-in/oauth2` endpoint returns the authorization
 * URL as JSON (not a 302) and stores the PKCE state/verifier in a cookie. Doing
 * this in a form action (rather than a plain HTML form post to the Better Auth
 * route) lets us issue a real SvelteKit redirect to Authentik and keeps the OAuth
 * code/state handling entirely server-side.
 */
import type { Actions, PageServerLoad } from './$types';

import { redirect } from '@sveltejs/kit';

import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	if (event.locals.session) {
		redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		// Ask Better Auth for the authorization URL. asResponse: true ensures the
		// Set-Cookie headers (PKCE state/verifier) are emitted and applied to the
		// SvelteKit response via the sveltekitCookies plugin.
		const response = await auth.api.signInWithOAuth2({
			body: {
				providerId: 'authentik',
				callbackURL: '/',
				disableRedirect: true
			},
			headers: event.request.headers,
			asResponse: true
		});

		const data = (await response.json()) as { url?: string };
		if (!data.url) {
			// Provider unavailable / misconfigured — surface a user-facing error.
			redirect(303, '/login?error=provider_unavailable');
		}

		redirect(303, data.url);
	}
};
