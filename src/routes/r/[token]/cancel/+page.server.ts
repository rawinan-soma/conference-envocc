/**
 * Server load and action for the self-cancel registration page — Story 5.4
 *
 * Route: /r/[token]/cancel?token=<cancelTokenPlain>
 *
 * This route is PUBLIC — no authentication required.
 * The route prefix `r` is already allow-listed in src/hooks.server.ts:
 *   pattern: /^\/(?!(?:login|auth|r|skeleton|profile\/complete)(?:\/|$)|$)/
 *
 * CRITICAL: GET (load) must NEVER cancel — confirm-page pattern required.
 * Email clients / link prefetchers fire GET before the user clicks. Cancellation
 * happens exclusively in the actions.default POST handler.
 *
 * AC Coverage:
 *   AC-1 (FR-044): load validates token presence; passes cancelTokenPlain to page
 *   AC-2 (R-002 MITIGATE): single-use token — POST calls cancelRegistration; returns { success }
 *   AC-3 (R-002 IDOR): no client-supplied registrationId; hash-only lookup in service
 *   AC-4: missing token → error(400); invalid/already-used token → { success: false }
 *   AC-5: no Thai text; i18n strings in +page.svelte
 */

import { error } from '@sveltejs/kit';
import { cancelRegistration } from '$lib/server/services/registration-service.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url }) => {
	// AC-4: validate token presence — throw 400 if missing
	const cancelTokenPlain = url.searchParams.get('token');
	if (!cancelTokenPlain) {
		error(400, 'Invalid cancel link');
	}

	// Pass cancelTokenPlain to page (for hidden form input only — never displayed)
	// params.token (eventToken) is available via $page.params in client if needed for display
	return {
		cancelTokenPlain
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		// Read cancelTokenPlain from the hidden form input (POST body)
		const formData = await request.formData();
		const cancelTokenPlain = formData.get('token');

		if (!cancelTokenPlain || typeof cancelTokenPlain !== 'string') {
			return { success: false, alreadyCancelled: false };
		}

		// cancelRegistration handles hash lookup, FOR UPDATE lock, audit log
		// Returns { cancelled: true } on first use; { cancelled: false } if invalid/already used
		const result = await cancelRegistration(cancelTokenPlain);

		return { success: result.cancelled, alreadyCancelled: !result.cancelled };
	}
};
