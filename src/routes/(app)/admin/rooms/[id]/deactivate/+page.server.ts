/**
 * Admin room deactivate route — Story 3.3
 *
 * deactivate: Sets is_active=false on the room (soft delete), writes audit_log entry,
 *             then redirects to the room list.
 *
 * Authorization: handled globally by the requireAdmin guard in hooks.server.ts
 * (pattern: /^\/admin(?:\/|$)/). No per-route guard change needed.
 *
 * Out of scope: cascade behaviour (auto-cancelling future bookings) is Story 7.1.
 * No booking-existence check is performed here.
 */
import { error, redirect } from '@sveltejs/kit';

import { requireAdmin } from '$lib/server/auth/guards';
import { deactivateRoom } from '$lib/server/services/room-service';

import type { Actions } from './$types';

export const actions: Actions = {
	deactivate: async (event) => {
		const user = requireAdmin(event);

		try {
			await deactivateRoom(user.id, event.params.id);
		} catch (err) {
			if (err instanceof Error && err.message.includes('room not found')) {
				error(404, 'Room not found');
			}
			throw err;
		}

		redirect(302, '/admin/rooms');
	}
};
