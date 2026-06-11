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

// Post-login landing page after profile completion.
// "/dashboard" is the specified AC destination (see AC-3, AC-4). The route does not yet
// exist as a real page (a future story), so requests will 404 after the redirect — but
// the redirect itself is correct per the acceptance criteria. Integration tests verify
// this redirect target (2.3-INT-004c expects location matching /\/dashboard/).
const POST_COMPLETE_DESTINATION = '/dashboard';

/**
 * Resolve a safe local redirect target from an untrusted `redirectTo` query param.
 * Only same-origin absolute paths are allowed (must start with a single "/" that is
 * not followed by "/" or "\").
 *
 * Attacks blocked:
 *   - `https://evil.com`    — does not start with "/"
 *   - `//evil.com`          — starts with "//"
 *   - `/\evil.com`          — backslash: some HTTP clients normalize "\" to "/" making
 *                             this equivalent to "//evil.com" (open redirect)
 *   - `/%2F%2Fevil.com`     — percent-encoded "//": URL-decoded by some clients before
 *                             following the Location header, equivalent to "//evil.com"
 */
function resolveRedirectTarget(raw: string | null): string {
	if (raw) {
		// Decode percent-encoding before checking so encoded bypass attempts are caught.
		let decoded: string;
		try {
			decoded = decodeURIComponent(raw);
		} catch {
			return POST_COMPLETE_DESTINATION;
		}
		// Must start with "/" but not "//" or "/\" (protocol-relative and backslash variants).
		if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.startsWith('/\\')) {
			return decoded;
		}
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
