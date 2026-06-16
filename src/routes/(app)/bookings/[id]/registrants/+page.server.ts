/**
 * Registrant list page — Story 5.8
 *
 * load: Requires authenticated user. Fetches booking by [id].
 *       Applies owner-or-admin guard (AC-3 / R-007 MITIGATE):
 *         - Organizer who owns the booking → allowed
 *         - Admin user (isAdmin=true) → allowed for all bookings
 *         - Any other authenticated user → 403 Forbidden
 *         - Unauthenticated user → 302 redirect to /login (via requireUser)
 *       Returns booking + registrants for display.
 *
 * Auth:   requireUser (throws redirect 302 if unauthenticated)
 * IDOR:   Custom owner-or-admin guard — DO NOT use bare assertOwner()
 *         (assertOwner blocks admin access; Story 5.8 requires admin cross-event access)
 *
 * AC Coverage:
 *   AC-1: Returns all registrations for the booking (registered + cancelled)
 *   AC-3 (R-007 MITIGATE): Non-owner non-admin → 403; unauthenticated → 302
 *   AC-4: Empty registrants array handled in +page.svelte (empty state message)
 */
import { error } from '@sveltejs/kit';

import { requireUser } from '$lib/server/auth/guards.js';
import { getBookingById } from '$lib/server/db/queries/bookings.js';
import { getRegistrantsByBookingId } from '$lib/server/db/queries/registrations.js';

import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	const { id } = event.params;

	const booking = await getBookingById(id);
	if (!booking) {
		error(404, 'Booking not found');
	}

	// Owner-or-admin guard (AC-3 / R-007 MITIGATE):
	// Admin users (isAdmin=true) may view all registrant lists regardless of ownership.
	// Non-admin users must own the booking.
	// DO NOT use bare assertOwner() — it blocks admin access.
	if (!user.isAdmin && user.id !== booking.organizerId) {
		error(403, 'Forbidden: you do not own this resource');
	}

	const registrants = await getRegistrantsByBookingId(id);

	return {
		booking,
		registrants
	};
};
