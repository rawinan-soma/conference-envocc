import * as v from 'valibot';

// title and mealType option constants (for both schema and form)
export const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Other'] as const;
export const MEAL_OPTIONS = ['Normal', 'Vegetarian', 'Muslim', 'Other'] as const;

export const RegistrationSchema = v.pipe(
	v.object({
		title: v.pipe(v.string(), v.minLength(1, 'Title is required.')),
		// titleOtherText: accept '' when title != 'Other'; cross-field check enforces required when title='Other'
		titleOtherText: v.optional(v.string()),
		firstName: v.pipe(v.string(), v.trim(), v.minLength(1, 'First name is required.')),
		lastName: v.pipe(v.string(), v.trim(), v.minLength(1, 'Last name is required.')),
		organization: v.pipe(v.string(), v.trim(), v.minLength(1, 'Organization is required.')),
		email: v.pipe(v.string(), v.email('A valid email address is required.')),
		// cateringEnabled is a hidden field so the server action knows whether to validate mealType.
		// It is re-checked against the DB record inside the action — this is defence-in-depth only.
		cateringEnabled: v.boolean(),
		// mealType: accept '' (empty string from hidden/unfilled select) as absent value,
		// same as BookingSchema's registrationClosesAt pattern.
		mealType: v.optional(v.union([v.literal(''), v.pipe(v.string(), v.minLength(1))])),
		mealTypeOtherText: v.optional(v.string())
	}),
	// Cross-field: titleOtherText required when title = 'Other'
	v.forward(
		v.check(
			(d) => d.title !== 'Other' || (!!d.titleOtherText && d.titleOtherText.trim().length > 0),
			'Please specify your title.'
		),
		['titleOtherText']
	),
	// Cross-field: mealType required when cateringEnabled = true
	v.forward(
		v.check(
			(d) => !d.cateringEnabled || (!!d.mealType && d.mealType !== ''),
			'Meal preference is required.'
		),
		['mealType']
	),
	// Cross-field: mealTypeOtherText required when mealType = 'Other'
	v.forward(
		v.check(
			(d) =>
				d.mealType !== 'Other' || (!!d.mealTypeOtherText && d.mealTypeOtherText.trim().length > 0),
			'Please specify your meal preference.'
		),
		['mealTypeOtherText']
	)
);

export type RegistrationInput = v.InferOutput<typeof RegistrationSchema>;
