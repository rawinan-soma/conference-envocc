/**
 * Profile completion route — Story 2.3
 *
 * AC-1: Authenticated users with incomplete profiles are redirected here by the hook guard.
 * AC-2: Email field is pre-filled read-only from event.locals.user.email (OIDC claim).
 * AC-3: On valid submission, user_profiles row is created and user is redirected.
 * AC-4: Users who already have a profile are redirected to /dashboard.
 * AC-5: Incomplete or invalid submissions return field-level errors.
 */
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import { ProfileSchema } from '$lib/schemas/profile';
import { requireUser } from '$lib/server/auth/guards';
import { createProfile } from '$lib/server/services/profile-service';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	// AC-4: If the user already has a complete profile, redirect to dashboard.
	if (event.locals.profileComplete === true) {
		redirect(302, '/dashboard');
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

		await createProfile(user.id, user.email, form.data);

		// AC-3: Redirect after successful profile creation.
		// Preserve the originally-intended route if provided as a query parameter.
		const redirectTo = event.url.searchParams.get('redirectTo') ?? '/dashboard';
		redirect(302, redirectTo);
	}
};
