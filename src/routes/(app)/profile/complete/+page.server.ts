/**
 * Profile completion route — Story 2.3
 *
 * AC-1: Authenticated users with incomplete profiles are redirected here by the hook guard.
 * AC-2: Email field is pre-filled read-only from event.locals.user.email (OIDC claim).
 * AC-3: On valid submission, user_profiles row is created and user is redirected.
 * AC-4: Users who already have a profile are redirected to the post-login landing page.
 * AC-5: Incomplete or invalid submissions return field-level errors.
 *
 * NOTE on redirect target: the spec refers to "/dashboard" as the post-login landing,
 * but that route does not yet exist (a future story). The established authenticated
 * landing in this codebase is "/" (see login flow callbackURL). We redirect there so the
 * happy path resolves to a real page instead of a 404.
 */
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import { ProfileSchema } from '$lib/schemas/profile';
import { requireUser } from '$lib/server/auth/guards';
import { createProfile, isUniqueViolation } from '$lib/server/services/profile-service';

import type { Actions, PageServerLoad } from './$types';

// Post-login landing page. "/dashboard" does not exist yet (future story);
// the existing authenticated landing in this app is "/".
const POST_COMPLETE_DESTINATION = '/';

/**
 * Resolve a safe local redirect target from an untrusted `redirectTo` query param.
 * Only same-origin absolute paths are allowed (must start with a single "/").
 * This blocks open-redirect attacks via `?redirectTo=https://evil.com` or `//evil.com`.
 */
function resolveRedirectTarget(raw: string | null): string {
	if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
		return raw;
	}
	return POST_COMPLETE_DESTINATION;
}

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	// AC-4: If the user already has a complete profile, redirect to the landing page.
	if (event.locals.profileComplete === true) {
		redirect(302, POST_COMPLETE_DESTINATION);
	}

	const form = await superValidate(valibot(ProfileSchema));
	return {
		form,
		email: user.email
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUser(event);

		const form = await superValidate(event.request, valibot(ProfileSchema));

		// AC-5: Return field-level errors if validation fails.
		if (!form.valid) {
			return fail(422, { form });
		}

		// AC-3: Redirect after successful profile creation.
		// Preserve the originally-intended route if provided as a query parameter,
		// constrained to a safe same-origin path (no open redirect).
		const redirectTo = resolveRedirectTarget(event.url.searchParams.get('redirectTo'));

		try {
			await createProfile(user.id, user.email, form.data);
		} catch (err) {
			// Concurrency / double-submit: another request already created this user's
			// profile (userId UNIQUE constraint). Treat as success and redirect — the
			// profile now exists, which is the user's intent.
			if (isUniqueViolation(err)) {
				redirect(302, redirectTo);
			}
			throw err;
		}

		redirect(302, redirectTo);
	}
};
