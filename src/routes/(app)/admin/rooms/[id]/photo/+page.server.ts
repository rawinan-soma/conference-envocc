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
import { fail, redirect } from '@sveltejs/kit';

import { requireAdmin } from '$lib/server/auth/guards';
import { PhotoValidationError, uploadRoomPhoto } from '$lib/server/services/room-service';
import { getRoomById } from '$lib/server/services/room-service';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Belt-and-suspenders: routeGuard already enforces admin; explicit call here
	// lets us obtain the typed User and the Room for the template.
	requireAdmin(event);

	const room = await getRoomById(event.params.id);
	if (!room) {
		throw new Error(`Room not found: ${event.params.id}`);
	}

	return { room };
};

export const actions: Actions = {
	upload: async (event) => {
		const user = requireAdmin(event);

		const formData = await event.request.formData();
		// SvelteKit request.formData() returns Web API FormData; file fields are File (Blob) objects
		const file = formData.get('photo') as File | null;

		if (!file || file.size === 0) {
			return fail(422, { error: 'No file provided' });
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
				return fail(422, { error: err.message });
			}
			throw err;
		}

		redirect(302, '/admin/rooms');
	}
};
