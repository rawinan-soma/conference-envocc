/**
 * Profile edit route — Story 2.3
 *
 * AC-6: User can view and edit title, first name, last name, phone, organization.
 *       Email field is read-only and cannot be changed via form submission.
 * AC-7: Any email field in POST body is silently ignored; stored email remains unchanged.
 * AC-8: Profile update writes an audit_log row atomically in the same transaction.
 */
import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import { ProfileSchema } from '$lib/schemas/profile';
import { requireUser } from '$lib/server/auth/guards';
import { updateProfile } from '$lib/server/services/profile-service';

import type { ProfileInput } from '$lib/schemas/profile';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	// userProfile is pre-populated by hooks.server.ts once per request.
	// The profile guard ensures the user has a complete profile before reaching this route.
	const userProfile = event.locals.userProfile!;

	// Cast the DB title string to the Valibot enum type for superValidate's initial data.
	// The DB stores only valid enum values (enforced by the create path), so this is safe.
	const initialData: ProfileInput = {
		title: userProfile.title as ProfileInput['title'],
		firstName: userProfile.firstName,
		lastName: userProfile.lastName,
		phone: userProfile.phone,
		organization: userProfile.organization
	};

	const form = await superValidate(initialData, valibot(ProfileSchema));

	return {
		form,
		email: user.email,
		userProfile
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUser(event);
		const existingProfile = event.locals.userProfile!;

		const form = await superValidate(event.request, valibot(ProfileSchema));

		// AC-5: Return field-level errors if validation fails.
		if (!form.valid) {
			return fail(422, { form });
		}

		// AC-7: email is never read from form.data — it comes from event.locals.user.email only.
		await updateProfile(user.id, existingProfile, form.data);

		// Return the form in its valid state to show a success state.
		return { form };
	}
};
