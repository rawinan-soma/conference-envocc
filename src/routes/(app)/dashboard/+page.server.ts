/**
 * Organizer Dashboard — Story 4.8 + Story 5.7
 *
 * load: Requires authenticated user. Fetches all upcoming non-cancelled bookings
 *       for the current organizer. Builds registrationUrl for each booking that
 *       has registrationEnabled (same pattern as /bookings/[id]/+page.server.ts).
 *       Story 5.7: Extends the pipeline to attach cateringCounts for catering-enabled bookings.
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
 *   Story 5.7 AC-1: cateringCounts attached per booking when cateringEnabled=true
 */
import { requireUser } from '$lib/server/auth/guards.js';
import { getUpcomingBookingsByOrganizer } from '$lib/server/db/queries/bookings.js';
import {
	getCateringCountsByBookingIds,
	CATERING_ZERO_COUNTS
} from '$lib/server/db/queries/registrations.js';
import type { CateringCounts } from '$lib/server/db/queries/registrations.js';

import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const origin = event.url.origin;

	// Return the promise unawaited so SvelteKit streams it to the client.
	// +page.svelte renders skeleton cards via {#await} while data is pending (AC-5).
	const bookings = getUpcomingBookingsByOrganizer(user.id).then(async (rows) => {
		// Collect bookingIds where catering is enabled — skip the DB call for others (Story 5.7 AC-1).
		const cateringBookingIds = rows.filter((b) => b.cateringEnabled).map((b) => b.id);

		// Single DB round-trip for all catering-enabled bookings (avoids N+1 — Story 5.7 Task 1.3).
		const cateringMap = await getCateringCountsByBookingIds(cateringBookingIds);

		return rows.map(
			(
				booking
			): typeof booking & {
				registrationUrl: string | null;
				cateringCounts: CateringCounts | null;
			} => ({
				...booking,
				// Build absolute registrationUrl for each booking that has a token (AC-3, Story 4.8).
				// Same pattern as /bookings/[id]/+page.server.ts.
				registrationUrl: booking.registrationToken
					? `${origin}/r/${booking.registrationToken}`
					: null,
				// cateringCounts: non-null only when cateringEnabled=true (AC-1, Story 5.7).
				// Fall back to zero struct if no rows found for this bookingId (AC-4).
				cateringCounts: booking.cateringEnabled
					? (cateringMap.get(booking.id) ?? CATERING_ZERO_COUNTS)
					: null
			})
		);
	});

	return { bookings };
};
