/**
 * Login page server load — Story 2.1
 *
 * Redirects already-authenticated users away from the login page.
 * This prevents a logged-in user from seeing the login form again.
 */
import type { PageServerLoad } from './$types';

import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	if (event.locals.session) {
		redirect(302, '/');
	}
	return {};
};
