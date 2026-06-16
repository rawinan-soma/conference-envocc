/**
 * Booking detail/management page — Story 4.5 + Story 4.7 + Story 5.6
 *
 * load:             Requires authenticated user. Fetches booking by [id].
 *                   Asserts ownership (assertOwner). Returns booking data for display,
 *                   including QR / registration URL (Story 4.5) and room/time info (Story 4.7).
 *
 * cancel:           Calls cancelBooking(). Redirects back to /bookings/[id] on success.
 *                   Non-owner → 403 (assertOwner guard).
 *
 * closeRegistration: Sets registration_enabled=false immediately. Writes audit log.
 *                   Idempotent: no-op if already closed. Non-owner → 403.
 *                   (Story 5.6, AC-2, FR-034b)
 *
 * Auth:   requireUser (throws redirect 302 if unauthenticated)
 *         assertOwner (throws error 403 if wrong organizer)
 */
import { error, redirect } from '@sveltejs/kit';

import { requireUser, assertOwner } from '$lib/server/auth/guards.js';
import {
	getBookingById,
	cancelBooking,
	closeRegistrationManual
} from '$lib/server/services/booking-service.js';
import { getRoomById } from '$lib/server/services/room-service.js';
import { generateQrDataUrl } from '$lib/server/qr/qr.js';
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

	// Parse tstzrange for display (Story 4.7)
	const range = parseTstzrange(booking.during);
	const startAt = range
		? `${formatDateBangkok(range.lower, 'date')}T${formatDateBangkok(range.lower, 'time')}`
		: null;
	const endAt = range
		? `${formatDateBangkok(range.upper, 'date')}T${formatDateBangkok(range.upper, 'time')}`
		: null;

	// Load room info for display (Story 4.7)
	const room = await getRoomById(booking.roomId);

	// Build the absolute registration URL using the request origin (Story 4.5).
	// The /r/[token] public route is implemented in Epic 5 — it 404s until then.
	// This is intentional; the link is correct and shareable immediately.
	const registrationUrl = booking.registrationToken
		? `${event.url.origin}/r/${booking.registrationToken}`
		: null;

	// Generate QR data URL server-side (Story 4.5)
	const qrDataUrl = registrationUrl ? await generateQrDataUrl(registrationUrl) : null;

	return {
		booking,
		room,
		startAt,
		endAt,
		registrationUrl,
		qrDataUrl
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

		redirect(303, `/bookings/${id}`);
	},

	closeRegistration: async (event) => {
		const user = requireUser(event);
		const { id } = event.params;

		// Delegates to service: ownership check, status guard, TOCTOU-safe FOR UPDATE lock,
		// idempotency guard, UPDATE + audit log — all inside one transaction.
		// Throws 404/403/422 if preconditions fail; returns false if already closed (no-op).
		await closeRegistrationManual(user.id, id);

		redirect(303, `/bookings/${id}`);
	}
};
