/**
 * Booking confirmation/detail page — Story 4.5
 *
 * load:  Loads the booking by id, asserts organizer ownership,
 *        generates QR data URL (if registration enabled).
 *
 * Auth:  requireUser (throws redirect 302 if unauthenticated)
 *        assertOwner (throws error 403 if wrong organizer)
 */
import { error } from '@sveltejs/kit';
import { requireUser, assertOwner } from '$lib/server/auth/guards.js';
import { getBookingById } from '$lib/server/db/queries/bookings.js';
import { generateQrDataUrl } from '$lib/server/qr/qr.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
	requireUser(event);

	const { id } = event.params;

	const booking = await getBookingById(id);
	if (!booking) {
		error(404, 'Booking not found');
	}

	assertOwner(event, booking.organizerId);

	// Build the absolute registration URL using the request origin.
	// The /r/[token] public route is implemented in Epic 5 — it 404s until then.
	// This is intentional; the link is correct and shareable immediately.
	const registrationUrl = booking.registrationToken
		? `${event.url.origin}/r/${booking.registrationToken}`
		: null;

	// Generate QR data URL server-side (render the image on the server, not in client JS)
	const qrDataUrl = registrationUrl ? await generateQrDataUrl(registrationUrl) : null;

	return {
		booking,
		registrationUrl,
		qrDataUrl
	};
};
