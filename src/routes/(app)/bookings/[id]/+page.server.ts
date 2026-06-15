/**
 * Booking detail/management page — Story 4.7
 *
 * load:   Requires authenticated user. Fetches booking by [id].
 *         Asserts ownership (assertOwner). Returns booking data for display.
 *
 * cancel: Calls cancelBooking(). Redirects back to /calendar on success.
 *         Non-owner → 403 (assertOwner guard).
 */
import { error, redirect } from '@sveltejs/kit';

import { requireUser, assertOwner } from '$lib/server/auth/guards.js';
import { getBookingById, cancelBooking } from '$lib/server/services/booking-service.js';
import { getRoomById } from '$lib/server/services/room-service.js';
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

	// Parse tstzrange for display
	const range = parseTstzrange(booking.during);
	const startAt = range
		? `${formatDateBangkok(range.lower, 'date')}T${formatDateBangkok(range.lower, 'time')}`
		: null;
	const endAt = range
		? `${formatDateBangkok(range.upper, 'date')}T${formatDateBangkok(range.upper, 'time')}`
		: null;

	// Load room info for display
	const room = await getRoomById(booking.roomId);

	return {
		booking,
		room,
		startAt,
		endAt
	};
};

export const actions: Actions = {
	cancel: async (event) => {
		const user = requireUser(event);

		const { id } = event.params;

		const booking = await getBookingById(id);
		if (!booking) {
			error(404, 'Booking not found');
		}

		assertOwner(event, booking.organizerId);

		await cancelBooking(user.id, id);

		redirect(303, '/calendar');
	}
};
