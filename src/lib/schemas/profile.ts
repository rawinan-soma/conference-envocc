/**
 * Profile form schema — Story 2.3
 *
 * Shared Valibot schema for profile creation and editing.
 * NOTE: email is NOT included — it is sourced server-side from event.locals.user.email (OIDC claim).
 * Including email here would create a security hole (AC-7).
 */
import * as v from 'valibot';

export const PROFILE_TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Other'] as const;
export type ProfileTitle = (typeof PROFILE_TITLES)[number];

export const ProfileSchema = v.object({
	title: v.picklist(PROFILE_TITLES, 'Please select a title.'),
	firstName: v.pipe(v.string(), v.minLength(1, 'First name is required.')),
	lastName: v.pipe(v.string(), v.minLength(1, 'Last name is required.')),
	phone: v.pipe(v.string(), v.minLength(1, 'Phone is required.')),
	organization: v.pipe(v.string(), v.minLength(1, 'Organization is required.'))
});

export type ProfileInput = v.InferOutput<typeof ProfileSchema>;
