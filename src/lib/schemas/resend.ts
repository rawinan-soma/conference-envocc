import * as v from 'valibot';

/**
 * Schema for the resend-link form — Story 5.5
 *
 * Single email field only — no other registrant data collected.
 * Used by the public resend route (/r/[token]/resend).
 */
export const ResendSchema = v.object({
	email: v.pipe(v.string(), v.email('A valid email address is required.'))
});

export type ResendInput = v.InferOutput<typeof ResendSchema>;
