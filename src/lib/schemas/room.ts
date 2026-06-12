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

export const ROOM_FEATURES = ['projector', 'whiteboard', 'vc', 'tv'] as const;
export type RoomFeature = (typeof ROOM_FEATURES)[number];

export const RoomSchema = v.object({
	// trim() before minLength so whitespace-only strings are rejected
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Room name is required.')),
	floor: v.pipe(v.string(), v.trim(), v.minLength(1, 'Floor is required.')),
	// Declare capacity as v.number() — sveltekit-superforms coerces HTML form strings to the
	// schema's declared type automatically (runs Number() for number fields).
	// Using v.pipe(v.string(), v.transform(Number), …) sets input-type=string / output-type=number,
	// which superforms reads as an ambiguous multi-type union and throws
	// "[capacity] Multi-type unions must have a default value" at every superValidate call.
	capacity: v.pipe(
		v.number('Capacity must be a number.'),
		v.integer('Capacity must be a whole number.'),
		v.minValue(1, 'Capacity must be at least 1.')
	),
	features: v.array(v.picklist(ROOM_FEATURES, 'Invalid feature value.'))
});

export type RoomInput = v.InferOutput<typeof RoomSchema>;
