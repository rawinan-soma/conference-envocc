/**
 * (app) layout server load — Story 2.1 / extended in Story 2.3
 *
 * This layout file is the single auth gate for all routes in the (app) group.
 * It calls requireUser() which throws redirect(302, '/login') if no valid session.
 *
 * All (app) child routes inherit this check automatically — no per-route auth
 * check is needed in this story (Story 2.5 adds the dispatcher pattern).
 *
 * The loaded user data is passed to $page.data for Svelte components to display
 * the logged-in user's name/email (e.g. in the navigation bar).
 *
 * Story 2.3: Also passes userProfile and profileComplete to $page.data.
 * IMPORTANT: Do NOT add profile completeness enforcement (redirect) here —
 * that is the hook guard's job. Adding a redirect here would cause an infinite
 * loop for users at /profile/complete (which inherits this layout).
 */
import type { LayoutServerLoad } from './$types';

import { requireUser } from '$lib/server/auth/guards';

export const load: LayoutServerLoad = async (event) => {
	const user = requireUser(event);
	return {
		user,
		userProfile: event.locals.userProfile,
		profileComplete: event.locals.profileComplete
	};
};
