/**
 * Admin room list + create route — Story 3.1
 *
 * load:   Returns the list of active rooms + an empty create form.
 * create: Validates RoomSchema, calls createRoom(), returns 422 on validation error.
 *
 * Authorization: handled globally by the requireAdmin guard in hooks.server.ts
 * (pushed to routeGuards in Task 4). No per-route requireAdmin call needed.
 */
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import { RoomSchema } from '$lib/schemas/room';
import { requireAdmin } from '$lib/server/auth/guards';
import { createRoom, listRooms } from '$lib/server/services/room-service';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// requireAdmin ensures the request is authenticated + admin; redirects/403 otherwise.
	// The global hooks guard already enforces this, but calling it here is belt-and-suspenders
	// and lets us obtain the typed User for the actor ID in form actions.
	requireAdmin(event);

	const [rooms, form] = await Promise.all([listRooms(), superValidate(valibot(RoomSchema))]);

	return { rooms, form };
};

export const actions: Actions = {
	create: async (event) => {
		const user = requireAdmin(event);

		const form = await superValidate(event.request, valibot(RoomSchema));

		if (!form.valid) {
			return fail(422, { form });
		}

		await createRoom(user.id, form.data);

		redirect(302, '/admin/rooms');
	}
};
