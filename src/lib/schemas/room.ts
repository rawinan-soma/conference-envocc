/**
 * Room form schema — Story 3.1
 *
 * Shared Valibot schema for room creation and editing.
 * Validated on the server in +page.server.ts form actions via superforms + valibot adapter.
 *
 * features is validated as an array of allowed ROOM_FEATURES values.
 * An empty array is valid (no features selected).
 */
import * as v from 'valibot';

export const ROOM_FEATURES = ['projector', 'whiteboard', 'vc'] as const;
export type RoomFeature = (typeof ROOM_FEATURES)[number];

export const RoomSchema = v.object({
	// trim() before minLength so whitespace-only strings are rejected
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Room name is required.')),
	floor: v.pipe(v.string(), v.trim(), v.minLength(1, 'Floor is required.')),
	capacity: v.pipe(
		v.union([v.number(), v.pipe(v.string(), v.transform(Number))]),
		v.integer('Capacity must be a whole number.'),
		v.minValue(1, 'Capacity must be at least 1.')
	),
	features: v.array(v.picklist(ROOM_FEATURES, 'Invalid feature value.'))
});

export type RoomInput = v.InferOutput<typeof RoomSchema>;
