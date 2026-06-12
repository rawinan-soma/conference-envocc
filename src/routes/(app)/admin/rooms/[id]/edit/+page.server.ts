/**
 * Admin room edit route — Story 3.1
 *
 * load:   Loads the room by ID and returns it with a pre-populated edit form.
 * update: Validates RoomSchema, calls updateRoom(), returns 422 on validation error.
 *
 * Authorization: handled globally by the requireAdmin guard in hooks.server.ts.
 * No per-route requireAdmin call needed, but called here for the typed User actor ID.
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import type { RoomInput } from '$lib/schemas/room';
import { RoomSchema } from '$lib/schemas/room';
import { requireAdmin } from '$lib/server/auth/guards';
import { getRoomById, updateRoom } from '$lib/server/services/room-service';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);

	const room = await getRoomById(event.params.id);
	if (!room) {
		error(404, 'Room not found');
	}

	// Cast stored features to the typed RoomInput features for superValidate initial data.
	// The DB stores only valid feature values (enforced at create/update time).
	const initialData: RoomInput = {
		name: room.name,
		floor: room.floor,
		capacity: room.capacity,
		features: room.features as RoomInput['features']
	};

	const form = await superValidate(initialData, valibot(RoomSchema));

	return { room, form };
};

export const actions: Actions = {
	update: async (event) => {
		const user = requireAdmin(event);

		const room = await getRoomById(event.params.id);
		if (!room) {
			error(404, 'Room not found');
		}

		const form = await superValidate(event.request, valibot(RoomSchema));

		if (!form.valid) {
			return fail(422, { form });
		}

		await updateRoom(user.id, room.id, form.data);

		redirect(302, '/admin/rooms');
	}
};
