/**
 * Organizer Dashboard — Story 4.8
 *
 * load: Requires authenticated user. Fetches all upcoming non-cancelled bookings
 *       for the current organizer. Builds registrationUrl for each booking that
 *       has registrationEnabled (same pattern as /bookings/[id]/+page.server.ts).
 *
 * Auth:     requireUser (throws redirect 302 if unauthenticated — layout also guards)
 * IDOR:     organizerId filter in getUpcomingBookingsByOrganizer — enforced at DB level
 * NFR-003:  <3s under org load; index on bookings(organizer_id) may be needed if slow
 *
 * AC Coverage:
 *   AC-1 (FR-050): only my upcoming non-cancelled bookings (getUpcomingBookingsByOrganizer)
 *   AC-2 (FR-051): booking row includes roomName (JOIN in query — no N+1)
 *   AC-3 (FR-052): registrationUrl built per booking for copy-link button
 *   AC-5 (UXD-020): skeleton loading handled in +page.svelte via {#await}
 *   AC-11: creating this route fixes 2.3's profile-complete → /dashboard redirect
 */
import { requireUser } from '$lib/server/auth/guards.js';
import { getUpcomingBookingsByOrganizer } from '$lib/server/db/queries/bookings.js';

import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	const rows = await getUpcomingBookingsByOrganizer(user.id);

	// Build absolute registrationUrl for each booking that has a token (AC-3).
	// Same pattern as /bookings/[id]/+page.server.ts.
	const bookings = rows.map((booking) => ({
		...booking,
		registrationUrl: booking.registrationToken
			? `${event.url.origin}/r/${booking.registrationToken}`
			: null
	}));

	return { bookings };
};
