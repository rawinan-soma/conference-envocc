/**
 * Admin photo upload action — Story 3.2
 *
 * load:   Returns the room for display (photo upload form + current photo if set).
 * upload: Validates the uploaded file, calls uploadRoomPhoto(), redirects on success.
 *
 * Authorization: all /admin/** routes are protected by the requireAdmin guard in
 * hooks.server.ts. Per-route requireAdmin() here is belt-and-suspenders per the
 * established project pattern (same as rooms list + edit routes).
 *
 * AC-1: Admin uploads valid image → stored on volume, photo_path saved, audit log written.
 * AC-2: Non-image MIME type or oversized file → HTTP 422, no file written, row unchanged.
 */
import { error, fail, redirect } from '@sveltejs/kit';

import { requireAdmin } from '$lib/server/auth/guards';
import {
	PhotoValidationError,
	getRoomById,
	uploadRoomPhoto
} from '$lib/server/services/room-service';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Belt-and-suspenders: routeGuard already enforces admin; explicit call here
	// lets us obtain the typed User and the Room for the template.
	requireAdmin(event);

	const room = await getRoomById(event.params.id);
	if (!room) {
		error(404, 'Room not found');
	}

	return { room };
};

export const actions: Actions = {
	upload: async (event) => {
		const user = requireAdmin(event);

		const formData = await event.request.formData();
		// SvelteKit request.formData() returns Web API FormData; file fields are File (Blob) objects
		const file = formData.get('photo') as File | null;

		// Return a stable code (not raw English) so the page can render a localized message.
		if (!file || file.size === 0) {
			return fail(422, { code: 'no_file' as const });
		}

		// Convert Web API File (Blob) to Node.js Buffer for the service layer
		const buffer = Buffer.from(await file.arrayBuffer());

		try {
			await uploadRoomPhoto(user.id, event.params.id, {
				data: buffer,
				mimeType: file.type,
				size: file.size
			});
		} catch (err: unknown) {
			if (err instanceof PhotoValidationError) {
				return fail(422, { code: err.code });
			}
			// Room deleted between load and upload — surface a 404 rather than a 500.
			if (err instanceof Error && err.message.includes('no room row matched')) {
				error(404, 'Room not found');
			}
			throw err;
		}

		redirect(302, '/admin/rooms');
	}
};
