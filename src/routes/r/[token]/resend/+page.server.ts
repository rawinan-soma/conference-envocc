/**
 * Server load + action for the resend-a-lost-link page — Story 5.5
 *
 * Route: /r/[token]/resend
 *
 * This route is PUBLIC — no authentication required. The /r prefix is
 * already allow-listed in src/hooks.server.ts (routeGuards pattern).
 * DO NOT add requireUser() here.
 *
 * Neutral disclosure (R-003 MITIGATE — MANDATORY):
 *   The `resend` action ALWAYS returns { form, acknowledged: true } —
 *   regardless of whether a registration exists for the email.
 *   This prevents email enumeration. The service returns found: boolean
 *   internally, but the action DISCARDS this from the response.
 *
 * Token replacement (AR-05):
 *   A resend generates a NEW cancel token (password-reset semantics).
 *   The old cancel link is invalidated. See resend-registration-service.ts.
 *
 * AC Coverage:
 *   AC-1: Public route at /r/[token]/resend; 404 if token invalid
 *   AC-2: Superform with ResendSchema — single email field
 *   AC-3 (R-003 MITIGATE): always returns { form, acknowledged: true }
 *   AC-4: Found → new token + UPDATE + enqueue SEND_EMAIL job
 *   AC-5 (AR-05): New cancel token replaces old hash
 *   AC-6: Not found → silent no-op, same acknowledged response
 *   AC-7: All UI strings via Paraglide (see +page.svelte)
 *   AC-8: Audit log written when resend succeeds (in service)
 */

import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { getBookingByRegistrationToken } from '$lib/server/db/queries/bookings.js';
import { ResendSchema } from '$lib/schemas/resend.js';
import { resendRegistrationLink } from '$lib/server/services/resend-registration-service.js';
import { getRegistrationConfirmationTemplate } from '$lib/server/email/templates/registration-confirmation.js';
import { enqueueJob, QUEUE } from '$lib/server/jobs/index.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	// NO requireUser — this route is public (unauthenticated)
	const booking = await getBookingByRegistrationToken(params.token);

	if (!booking) {
		error(404, 'Event not found');
	}

	const form = await superValidate(valibot(ResendSchema));

	return { form, eventName: booking.eventName };
};

export const actions: Actions = {
	resend: async (event) => {
		// Parse form first (consumes body stream)
		const form = await superValidate(event.request, valibot(ResendSchema));

		// Fetch booking — 404 if token invalid
		const booking = await getBookingByRegistrationToken(event.params.token);
		if (!booking) {
			error(404, 'Event not found');
		}

		if (!form.valid) {
			return fail(422, { form });
		}

		// Call the resend service.
		// R-003 MITIGATE: always run; never short-circuit before the DB lookup.
		// The service returns found: boolean internally — we DISCARD it from the response.
		const result = await resendRegistrationLink(
			booking.id,
			event.params.token,
			form.data.email,
			event.url.origin,
			booking.eventName
		);

		if (result.found) {
			// Render email template (same as 5.3 register action — reuse getRegistrationConfirmationTemplate)
			const template = getRegistrationConfirmationTemplate({
				firstName: result.firstName,
				lastName: result.lastName,
				eventName: result.eventName,
				cancelLink: result.cancelLink
			});

			// Enqueue fire-and-forget. Failure must NOT prevent acknowledged: true response (AC-3).
			// singletonKey differs from 5.3: 'resend-link-${registrationId}' with 5-min dedup window.
			try {
				await enqueueJob(
					QUEUE.SEND_EMAIL,
					{
						to: form.data.email,
						subject: template.subject,
						textBody: template.text,
						htmlBody: template.html
					},
					{
						singletonKey: `resend-link-${result.registrationId}`,
						singletonSeconds: 300
					}
				);
			} catch (jobErr: unknown) {
				console.warn(
					'[r/[token]/resend] resend email enqueue failed (worker may not be running):',
					jobErr
				);
			}
		}

		// AC-3 (R-003 MITIGATE): ALWAYS return { form, acknowledged: true } —
		// never differ between found/not-found to prevent email enumeration.
		return { form, acknowledged: true };
	}
};
