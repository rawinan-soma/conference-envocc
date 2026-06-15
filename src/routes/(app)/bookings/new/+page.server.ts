/**
 * Booking creation route — Story 4.4, Story 4.6
 *
 * load:   Pre-fills form from ?room= and ?date= query params.
 *         Loads active rooms list (for room selector when ?room= is absent).
 *         Contact fields come from event.locals.userProfile (read-only, not stored in form).
 *         Requires authenticated organizer (requireUser guard).
 *
 * create: Validates BookingSchema via superforms + valibot adapter.
 *         Validates room exists. Calls createBooking() — ConflictError → setError, success → redirect /calendar.
 *         After successful booking, enqueues a send-email pg-boss job (Story 4.6, AC-1, AC-3).
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import { BookingSchema } from '$lib/schemas/booking.js';
import { requireUser } from '$lib/server/auth/guards.js';
import { enqueueJob, QUEUE } from '$lib/server/jobs/index.js';
import { getBookingConfirmationTemplate } from '$lib/server/email/templates/booking-confirmation.js';
import { createBooking, ConflictError } from '$lib/server/services/booking-service.js';
import { listRooms, getRoomById } from '$lib/server/services/room-service.js';
import { formatDateBangkok } from '$lib/utils/date.js';

import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
	requireUser(event);

	const roomId = event.url.searchParams.get('room') ?? '';
	const date = event.url.searchParams.get('date') ?? '';

	// Pre-populate datetime-local fields using ?date= param as the date portion.
	// A datetime-local input expects "YYYY-MM-DDTHH:MM". If date is provided,
	// default start to 09:00 and end to 10:00 on that day (convenient defaults).
	// These are edited by the user before submitting.
	const startAt = date ? `${date}T09:00` : '';
	const endAt = date ? `${date}T10:00` : '';

	// Load rooms list and pre-fill form in parallel
	const [rooms, form] = await Promise.all([
		listRooms(),
		superValidate(
			{
				roomId,
				startAt,
				endAt,
				eventName: '',
				agenda: '',
				cateringEnabled: false,
				registrationEnabled: false
			},
			valibot(BookingSchema)
		)
	]);

	return {
		form,
		rooms,
		userProfile: event.locals.userProfile
	};
};

export const actions: Actions = {
	create: async (event) => {
		const user = requireUser(event);

		const form = await superValidate(event.request, valibot(BookingSchema));

		if (!form.valid) {
			return fail(422, { form });
		}

		// Validate room exists (guards against stale ?room= params or tampered form data)
		const room = await getRoomById(form.data.roomId);
		if (!room || !room.isActive) {
			error(404, 'Room not found');
		}

		// Capture the returned Booking row (AC-1: enqueue after booking commits)
		let booking: Awaited<ReturnType<typeof createBooking>>;
		try {
			booking = await createBooking(user.id, form.data.roomId, form.data);
		} catch (err: unknown) {
			if (err instanceof ConflictError) {
				return setError(form, '', err.key);
			}
			throw err;
		}

		// Enqueue confirmation email (AC-1, AC-3: never sent synchronously)
		// Use form.data.startAt / form.data.endAt (ISO strings from validated form) — NOT booking.during
		// (which is a Postgres tstzrange string, not a plain ISO date).
		const startDisplay =
			formatDateBangkok(new Date(form.data.startAt), 'date') +
			' ' +
			formatDateBangkok(new Date(form.data.startAt), 'time');
		// Include the end date as well as the time — bookings may span multiple days
		// (the schema only enforces endAt > startAt), so a time-only end is ambiguous.
		const endDisplay =
			formatDateBangkok(new Date(form.data.endAt), 'date') +
			' ' +
			formatDateBangkok(new Date(form.data.endAt), 'time');

		// event.locals.userProfile is guaranteed non-null for authenticated organizers
		// (set by the profile middleware; requireUser already threw if unauthenticated)
		const userProfile = event.locals.userProfile!;
		const organizerName = `${userProfile.firstName} ${userProfile.lastName}`.trim();

		const emailTemplate = getBookingConfirmationTemplate({
			eventName: booking.eventName,
			roomName: room.name,
			startAt: startDisplay,
			endAt: endDisplay,
			organizerName
		});

		// Enqueue after the booking is committed. pg-boss is started in the worker
		// process, not the web process, so boss.send() can throw here (e.g. queue not
		// reachable). The booking already succeeded — log and continue so the organizer
		// still gets the redirect rather than a 500. (Mirrors src/routes/skeleton.)
		try {
			await enqueueJob(
				QUEUE.SEND_EMAIL,
				{
					to: userProfile.email,
					subject: emailTemplate.subject,
					textBody: emailTemplate.text,
					htmlBody: emailTemplate.html
				},
				// AC-4: idempotency per booking. The shared `send-email` queue uses the
				// default `standard` policy, under which `singletonKey` alone does NOT
				// dedup. Pairing it with `singletonSeconds` makes pg-boss compute a
				// (epoch-aligned) singleton slot, so a repeat enqueue for the same booking
				// within that slot collapses to one job (verified by 4.6-INT-003). The slot
				// is large (24h) so an immediate retry of this action always dedups; the
				// real risk (a single createBooking double-enqueuing) is fully covered.
				{ singletonKey: `booking-confirm-${booking.id}`, singletonSeconds: 86_400 }
			);
		} catch (jobErr: unknown) {
			console.warn(
				'[bookings/new] confirmation email enqueue failed (worker may not be running):',
				jobErr
			);
		}

		redirect(303, '/calendar');
	}
};
