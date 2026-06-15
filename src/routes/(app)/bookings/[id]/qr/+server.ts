/**
 * QR download endpoint — Story 4.5
 *
 * GET /bookings/[id]/qr
 *   → returns the registration QR code as a downloadable PNG
 *   → requires auth + booking ownership
 *   → 404 if booking not found or registration not enabled
 */
import { error } from '@sveltejs/kit';
import { requireUser, assertOwner } from '$lib/server/auth/guards.js';
import { getBookingById } from '$lib/server/db/queries/bookings.js';
import { generateQrBuffer } from '$lib/server/qr/qr.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async (event) => {
	requireUser(event);

	const { id } = event.params;

	const booking = await getBookingById(id);
	if (!booking) {
		error(404, 'Booking not found');
	}

	assertOwner(event, booking.organizerId);

	if (!booking.registrationToken) {
		error(404, 'Registration not enabled for this booking');
	}

	const registrationUrl = `${event.url.origin}/r/${booking.registrationToken}`;
	const pngBuffer = await generateQrBuffer(registrationUrl);
	// Copy into a new ArrayBuffer — required by TS 6 / DOM lib (BodyInit = BufferSource | …).
	// Buffer.buffer may be a SharedArrayBuffer; Response constructor requires a strict ArrayBuffer.
	const body = pngBuffer.buffer.slice(
		pngBuffer.byteOffset,
		pngBuffer.byteOffset + pngBuffer.byteLength
	) as ArrayBuffer;

	return new Response(body, {
		headers: {
			'Content-Type': 'image/png',
			'Content-Disposition': `attachment; filename="registration-qr-${id}.png"`,
			'Content-Length': String(pngBuffer.length),
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
