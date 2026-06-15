/**
 * Booking edit route — Story 4.7
 *
 * load:   Requires authenticated user. Fetches booking by [id].
 *         Asserts ownership (assertOwner). Pre-fills form from existing booking
 *         (parses tstzrange → datetime-local format via parseTstzrange + formatDateBangkok).
 *         Loads active rooms list for the room selector.
 *
 * edit:   Validates BookingSchema via superforms + valibot adapter.
 *         Calls updateBooking() — ConflictError → setError, success → redirect /bookings/[id].
 *         Non-owner → 403 (assertOwner guard).
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import { BookingSchema } from '$lib/schemas/booking.js';
import { requireUser, assertOwner } from '$lib/server/auth/guards.js';
import {
	getBookingById,
	updateBooking,
	ConflictError
} from '$lib/server/services/booking-service.js';
import { listRooms } from '$lib/server/services/room-service.js';
import { parseTstzrange } from '$lib/utils/tstzrange.js';
import { formatDateBangkok } from '$lib/utils/date.js';

import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
	requireUser(event);

	const { id } = event.params;

	const booking = await getBookingById(id);
	if (!booking) {
		error(404, 'Booking not found');
	}

	assertOwner(event, booking.organizerId);

	// Parse tstzrange to datetime-local format (YYYY-MM-DDTHH:MM)
	const range = parseTstzrange(booking.during);
	const startAt = range
		? `${formatDateBangkok(range.lower, 'date')}T${formatDateBangkok(range.lower, 'time')}`
		: '';
	const endAt = range
		? `${formatDateBangkok(range.upper, 'date')}T${formatDateBangkok(range.upper, 'time')}`
		: '';

	// Pre-fill registrationClosesAt only when registration is enabled and value exists
	const registrationClosesAt =
		booking.registrationEnabled && booking.registrationClosesAt
			? `${formatDateBangkok(booking.registrationClosesAt, 'date')}T${formatDateBangkok(booking.registrationClosesAt, 'time')}`
			: '';

	const [rooms, form] = await Promise.all([
		listRooms(),
		superValidate(
			{
				roomId: booking.roomId,
				startAt,
				endAt,
				eventName: booking.eventName,
				agenda: booking.agenda ?? '',
				cateringEnabled: booking.cateringEnabled,
				registrationEnabled: booking.registrationEnabled,
				registrationClosesAt
			},
			valibot(BookingSchema)
		)
	]);

	return {
		form,
		rooms,
		userProfile: event.locals.userProfile,
		bookingId: id
	};
};

export const actions: Actions = {
	edit: async (event) => {
		const user = requireUser(event);

		const { id } = event.params;

		// Re-validate ownership before mutating
		const booking = await getBookingById(id);
		if (!booking) {
			error(404, 'Booking not found');
		}
		assertOwner(event, booking.organizerId);

		const form = await superValidate(event.request, valibot(BookingSchema));

		if (!form.valid) {
			return fail(422, { form });
		}

		try {
			await updateBooking(user.id, id, form.data);
		} catch (err: unknown) {
			if (err instanceof ConflictError) {
				return setError(form, '', err.key);
			}
			throw err;
		}

		redirect(303, `/bookings/${id}`);
	}
};
