/**
 * Booking creation route — Story 4.4
 *
 * load:   Pre-fills form from ?room= and ?date= query params.
 *         Loads active rooms list (for room selector when ?room= is absent).
 *         Contact fields come from event.locals.userProfile (read-only, not stored in form).
 *         Requires authenticated organizer (requireUser guard).
 *
 * create: Validates BookingSchema via superforms + valibot adapter.
 *         Validates room exists. Calls createBooking() — ConflictError → setError, success → redirect /calendar.
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import { BookingSchema } from '$lib/schemas/booking.js';
import { requireUser } from '$lib/server/auth/guards.js';
import { createBooking, ConflictError } from '$lib/server/services/booking-service.js';
import { listRooms, getRoomById } from '$lib/server/services/room-service.js';

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

		try {
			await createBooking(user.id, form.data.roomId, form.data);
		} catch (err: unknown) {
			if (err instanceof ConflictError) {
				return setError(form, '', err.key);
			}
			throw err;
		}

		redirect(303, '/calendar');
	}
};
