/**
 * Server load + action for the resend-a-lost-link page — Story 5.5
 *
 * Route: /r/[token]/resend
 *
 * This route is PUBLIC — no authentication required. The /r prefix is
 * already allow-listed in src/hooks.server.ts (routeGuards pattern).
 * DO NOT add requireUser() here.
 *
 * Neutral disclosure (R-003 PARTIAL MITIGATE — body/status only):
 *   The `resend` action ALWAYS returns { form, acknowledged: true } —
 *   regardless of whether a registration exists for the email.
 *   This prevents email enumeration via response body/status.
 *   The service returns found: boolean internally, but the action DISCARDS this
 *   from the response. Timing-channel neutrality is a consciously deferred MVP
 *   risk (see resend-registration-service.ts §R-003 comment for details).
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

		// Intentionally no registrationEnabled guard here.
		// registrationEnabled=false blocks NEW registrations (Story 5.6), but existing
		// registrants must still be able to recover their cancel link even after an event
		// closes. The cancel route (/r/[token]/cancel) also has no such guard.

		// Call the resend service.
		// R-003 PARTIAL MITIGATE (body/status): always run; never short-circuit before
		// the DB lookup. The service returns found: boolean internally — we DISCARD it
		// from the response. Timing side-channel is an accepted MVP deferral (see service).
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
			//
			// IMPORTANT — per-rotation singletonKey (prevents stale-link bug):
			//   Each call to resendRegistrationLink rotates the cancel token in the DB.
			//   If we used 'resend-link-${registrationId}' with singletonSeconds:300, a
			//   second resend within the 5-min window would rotate the DB token (hash B)
			//   but have the email job deduped — so the user's emailed link (token A)
			//   would be stale. Fix: include a per-rotation nonce so every token rotation
			//   enqueues a distinct job and the emailed link always matches the stored hash.
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
						singletonKey: `resend-link-${result.registrationId}-${result.tokenNonce}`
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
