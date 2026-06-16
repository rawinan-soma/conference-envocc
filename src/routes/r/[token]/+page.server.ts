/**
 * Server load for the public registration page — Story 5.1, Story 5.2, Story 5.3
 *
 * Route: /r/[token]
 *
 * This route is PUBLIC — no authentication required.
 * DO NOT add requireUser() here. The route is already allow-listed in
 * src/hooks.server.ts (routeGuards pattern: /^\/(?!(?:login|auth|r|...)/).
 *
 * IDOR guard (R-001 BLOCK, score=9):
 *   Token not found in DB → error(404, 'Event not found').
 *   The DB query enforces isolation: WHERE registration_token = token.
 *   registrationToken is excluded from returned data (data minimization).
 *
 * AC Coverage:
 *   AC-1 (FR-040): Valid token → event name, room, date/time (Bangkok TZ), agenda, contact
 *   AC-2: registrationEnabled=false → registrationEnabled flag returned; page shows closed msg
 *   AC-3 (R-001 BLOCK): token not found → error(404)
 *   AC-4: agenda=null → agenda field is null; Svelte template hides section
 *   Story 5.2:
 *   AC-3 (5.2): Valid form submission → registrations row + audit log
 *   AC-4 (5.2): On success, return { form, success: true } — page shows confirmation
 *   AC-6 (5.2, R-005 MITIGATE): register action catches RegistrationClosedError → fail(400)
 *   Story 5.3:
 *   AC-1 (5.3): After createRegistration commits, enqueue send-email pg-boss job
 *   AC-3 (5.3): HTTP response never delayed by SMTP — email via pg-boss only
 *   AC-4 (5.3): singletonKey = 'registration-confirm-${registrationId}' (dedup)
 */

import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { getBookingByRegistrationToken } from '$lib/server/db/queries/bookings.js';
import { parseTstzrange } from '$lib/utils/tstzrange.js';
import { formatDateBangkok } from '$lib/utils/date.js';
import { RegistrationSchema } from '$lib/schemas/registration.js';
import {
	createRegistration,
	RegistrationClosedError
} from '$lib/server/services/registration-service.js';
import { getRegistrationConfirmationTemplate } from '$lib/server/email/templates/registration-confirmation.js';
import { enqueueJob, QUEUE } from '$lib/server/jobs/index.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	// NO requireUser — this route is public (unauthenticated)
	const booking = await getBookingByRegistrationToken(params.token);

	if (!booking) {
		error(404, 'Event not found');
	}

	// Parse the tstzrange value (RegistrationPageRow types `during` as string directly,
	// so no cast is needed — parseTstzrange accepts string).
	const range = parseTstzrange(booking.during);
	const dateStr = range ? formatDateBangkok(range.lower, 'date') : '';
	const startTime = range ? formatDateBangkok(range.lower, 'time') : '';
	const endTime = range ? formatDateBangkok(range.upper, 'time') : '';

	// Initialize superform (Story 5.2 — needed so page has form prop for the register action)
	const form = await superValidate(valibot(RegistrationSchema));

	return {
		eventName: booking.eventName,
		roomName: booking.roomName,
		agenda: booking.agenda,
		registrationEnabled: booking.registrationEnabled,
		cateringEnabled: booking.cateringEnabled, // NEW (Story 5.2) — conditional meal type field
		dateStr,
		startTime,
		endTime,
		contactName: `${booking.organizerFirstName} ${booking.organizerLastName}`.trim(),
		contactPhone: booking.organizerPhone, // string — notNull() in user_profiles schema
		form // NEW (Story 5.2) — superform initial state
	};
};

export const actions: Actions = {
	register: async (event) => {
		// Parse form first (consumes body stream — must be first to avoid unconsumed-body error)
		const form = await superValidate(event.request, valibot(RegistrationSchema));

		// Fetch booking — 404 if token invalid
		const booking = await getBookingByRegistrationToken(event.params.token);
		if (!booking) {
			error(404, 'Event not found');
		}

		if (!form.valid) {
			return fail(422, { form });
		}

		try {
			// createRegistration handles the closed-guard inside a transaction (R-005 MITIGATE)
			// cancelToken is for the confirmation email only — NEVER returned to the browser (AC-3 5.3)
			const { registrationId, cancelToken } = await createRegistration(booking.id, form.data);

			// Build cancel link URL (Story 5.4 contract: ?token= query param)
			// event.params.token is the event's registrationToken (public, already on the URL)
			const cancelLink = `${event.url.origin}/r/${event.params.token}/cancel?token=${cancelToken}`;

			// Pre-render the email template in the web process (worker cannot import $lib alias)
			const template = getRegistrationConfirmationTemplate({
				firstName: form.data.firstName,
				lastName: form.data.lastName,
				eventName: booking.eventName,
				cancelLink
			});

			// Enqueue AFTER transaction commits (createRegistration already committed) — AC-1, AC-3
			// singletonKey prevents duplicate emails for the same registration — AC-4
			await enqueueJob(
				QUEUE.SEND_EMAIL,
				{
					to: form.data.email,
					subject: template.subject,
					textBody: template.text,
					htmlBody: template.html
				},
				{ singletonKey: `registration-confirm-${registrationId}` }
			);
		} catch (err) {
			if (err instanceof RegistrationClosedError) {
				// R-005 MITIGATE: registration closed — guard enforced in service layer
				return fail(400, { form });
			}
			throw err;
		}

		// AC-4 (5.2): return success flag — page hides form and shows confirmation message
		// cancelToken is NOT returned here (used only for email link — AC-3 5.3)
		return { form, success: true };
	}
};
