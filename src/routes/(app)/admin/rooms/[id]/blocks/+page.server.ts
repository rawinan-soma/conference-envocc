/**
 * Admin block-slot route — Story 3.4
 *
 * load:   Returns room + list of existing blocks + empty create form.
 * create: Validates BlockSlotSchema, calls createBlockSlot(), fail(422) on error.
 * remove: Calls deleteBlockSlot() by blockId from form data.
 *
 * Authorization: handled globally by the requireAdmin guard in hooks.server.ts
 * (the /^\/admin(?:\/|$)/ pattern covers this route). No per-route guard needed,
 * but requireAdmin is called here for the typed User actor ID.
 */
import { error, fail } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

import { BlockSlotSchema } from '$lib/schemas/block-slot';
import { requireAdmin } from '$lib/server/auth/guards';
import {
	ConflictError,
	createBlockSlot,
	deleteBlockSlot,
	listBlockSlotsForRoom
} from '$lib/server/services/block-slot-service';
import { getRoomById } from '$lib/server/services/room-service';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);

	const room = await getRoomById(event.params.id);
	if (!room) {
		error(404, 'Room not found');
	}

	const [blocks, form] = await Promise.all([
		listBlockSlotsForRoom(event.params.id),
		superValidate(valibot(BlockSlotSchema))
	]);

	return { room, blocks, form };
};

export const actions: Actions = {
	create: async (event) => {
		const user = requireAdmin(event);
		const roomId = event.params.id;

		// Validate form and check room existence in parallel (both are independent)
		const [room, form] = await Promise.all([
			getRoomById(roomId),
			superValidate(event.request, valibot(BlockSlotSchema))
		]);

		if (!room) {
			error(404, 'Room not found');
		}

		if (!form.valid) {
			return fail(422, { form });
		}

		try {
			await createBlockSlot(user.id, roomId, form.data);
		} catch (err: unknown) {
			if (err instanceof ConflictError) {
				// setError sets form.valid = false and returns ActionFailure<{ form }>
				return setError(form, '', err.key);
			}
			throw err;
		}

		// Reload form to clear fields after successful creation
		const freshForm = await superValidate(valibot(BlockSlotSchema));
		return { form: freshForm };
	},

	remove: async (event) => {
		const user = requireAdmin(event);

		const formData = await event.request.formData();
		const blockId = formData.get('blockId');

		if (typeof blockId !== 'string' || !blockId) {
			return fail(400, { error: 'Missing blockId' });
		}

		await deleteBlockSlot(user.id, blockId, event.params.id);

		return {};
	}
};
