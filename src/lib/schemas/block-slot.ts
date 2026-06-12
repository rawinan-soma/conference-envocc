/**
 * Block slot form schema — Story 3.4
 *
 * Shared Valibot schema for creating a time-block on a room.
 * Validated on the server in the block-slot route action via superforms + valibot adapter.
 *
 * Cross-field check ensures endAt > startAt (schema-level guard before DB write).
 */
import * as v from 'valibot';

export const BlockSlotSchema = v.pipe(
	v.object({
		startAt: v.pipe(v.string(), v.isoDateTime('Start must be a valid date-time.')),
		endAt: v.pipe(v.string(), v.isoDateTime('End must be a valid date-time.')),
		reason: v.optional(v.pipe(v.string(), v.trim()))
	}),
	v.check((d) => d.endAt > d.startAt, 'End time must be after start time.')
);

export type BlockSlotInput = v.InferOutput<typeof BlockSlotSchema>;
