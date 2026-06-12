/**
 * Block slot service — Story 3.4
 *
 * Provides createBlockSlot, deleteBlockSlot, and listBlockSlotsForRoom.
 *
 * Two-layer conflict detection (architecture §Data Architecture):
 *
 * 1. Block-over-booking (app-level pre-check, AC-3):
 *    Before INSERT, query bookings table for active bookings overlapping the requested range.
 *    If found → throw ConflictError (surfaces as HTTP 422). Run INSIDE the transaction to
 *    minimize the TOCTOU window.
 *
 * 2. Block-vs-block (DB EXCLUDE constraint, AC-4):
 *    The room_blocks table has EXCLUDE USING gist (room_id WITH =, during WITH &&).
 *    Postgres error code 23P01 (exclusion_violation) is caught and rethrown as ConflictError.
 *
 * Audit log (AC-6): Every createBlockSlot writes an audit_log row inside the same transaction.
 */
import { asc, eq, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import type { BlockSlotInput } from '$lib/schemas/block-slot.js';

import { db } from '../db/index.js';
import { bookings } from '../db/schema/bookings.js';
import { roomBlocks } from '../db/schema/room-blocks.js';
import type { RoomBlock } from '../db/schema/room-blocks.js';
import { writeAuditLog } from './audit.js';

// ---------------------------------------------------------------------------
// ConflictError — structured 422 error surfaced from service layer
// ---------------------------------------------------------------------------

export class ConflictError extends Error {
	readonly statusCode = 422;
	readonly key: string;

	constructor(key: string) {
		super(key);
		this.name = 'ConflictError';
		this.key = key;
	}
}

// ---------------------------------------------------------------------------
// createBlockSlot
// ---------------------------------------------------------------------------

/**
 * Create a new time block on a room.
 *
 * Runs inside a transaction:
 *   1. Application-level pre-check: no active booking overlaps the requested range (AC-3).
 *   2. INSERT into room_blocks (the DB EXCLUDE constraint catches block-vs-block overlap, AC-4).
 *   3. Write audit_log entry (AC-6).
 *
 * @param actorId - Admin user ID performing the action
 * @param roomId  - Room to block
 * @param input   - Validated BlockSlotInput (startAt, endAt, reason)
 * @throws ConflictError if a booking (app-level) or existing block (DB 23P01) overlaps
 */
export async function createBlockSlot(
	actorId: string,
	roomId: string,
	input: BlockSlotInput
): Promise<RoomBlock> {
	return db.transaction(async (tx) => {
		// --- Step 1: Application-level booking overlap pre-check (AC-3) ---
		// Runs INSIDE the transaction to narrow the TOCTOU window.
		const duringExpr = sql`tstzrange(${input.startAt}::timestamptz, ${input.endAt}::timestamptz, '[)')`;

		const conflictingBooking = await tx
			.select({ id: bookings.id })
			.from(bookings)
			.where(
				sql`${bookings.roomId} = ${roomId}
          AND ${bookings.during} && ${duringExpr}
          AND ${bookings.status} <> 'cancelled'`
			)
			.limit(1);

		if (conflictingBooking.length > 0) {
			throw new ConflictError('room_block_conflict_booking');
		}

		// --- Step 2: INSERT into room_blocks ---
		// The EXCLUDE constraint catches block-vs-block overlap (23P01 → ConflictError).
		let block: RoomBlock;
		try {
			const [inserted] = await tx
				.insert(roomBlocks)
				.values({
					id: uuidv7(),
					roomId,
					during: sql`tstzrange(${input.startAt}::timestamptz, ${input.endAt}::timestamptz, '[)')`,
					reason: input.reason ?? null,
					createdBy: actorId
				})
				.returning();

			if (!inserted) {
				throw new Error('Insert returned no rows — unexpected DB state');
			}
			block = inserted;
		} catch (err: unknown) {
			// Catch Postgres 23P01 (exclusion_violation) from the EXCLUDE constraint (AC-4).
			// Drizzle may wrap pg errors in DrizzleQueryError, so walk the cause chain to find
			// the original pg error code (pattern from skeleton/+page.server.ts).
			let pgCode: string | undefined;
			let cur: unknown = err;
			while (cur instanceof Error) {
				if ('code' in cur && typeof (cur as { code?: unknown }).code === 'string') {
					pgCode = (cur as { code: string }).code;
					break;
				}
				cur = cur.cause;
			}
			if (pgCode === '23P01') {
				throw new ConflictError('room_block_conflict_error');
			}
			throw err;
		}

		// --- Step 3: Write audit log (AC-6) ---
		const duringString = `[${input.startAt}, ${input.endAt})`;
		await writeAuditLog(tx, {
			actorId,
			entity: 'room_block',
			action: 'create',
			diff: { roomId, during: duringString }
		});

		return block;
	});
}

// ---------------------------------------------------------------------------
// deleteBlockSlot
// ---------------------------------------------------------------------------

/**
 * Delete a time block by its ID.
 *
 * @param actorId - Admin user ID performing the action (for future audit if needed)
 * @param blockId - ID of the block to remove
 */
export async function deleteBlockSlot(actorId: string, blockId: string): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.delete(roomBlocks).where(eq(roomBlocks.id, blockId));

		// Audit the delete for completeness (ACs don't require it, but it's good practice)
		await writeAuditLog(tx, {
			actorId,
			entity: 'room_block',
			action: 'delete',
			diff: { blockId }
		});
	});
}

// ---------------------------------------------------------------------------
// listBlockSlotsForRoom
// ---------------------------------------------------------------------------

/**
 * List all time blocks for a room, ordered by start of `during`.
 *
 * @param roomId - Room to query
 */
export async function listBlockSlotsForRoom(roomId: string): Promise<RoomBlock[]> {
	return db
		.select()
		.from(roomBlocks)
		.where(eq(roomBlocks.roomId, roomId))
		.orderBy(asc(sql`lower(${roomBlocks.during})`));
}
