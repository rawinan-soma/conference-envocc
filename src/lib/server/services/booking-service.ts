/**
 * Booking service — Story 4.1
 *
 * Provides createBooking with:
 * - INSERT into bookings using tstzrange half-open [) range
 * - Postgres EXCLUDE constraint (bookings_no_overlap) as sole conflict authority
 * - 23P01 exclusion_violation caught → throws ConflictError('booking_conflict_error')
 * - Audit log written inside the same transaction
 *
 * IMPORTANT: No application-level overlap pre-check (SELECT before INSERT).
 * The EXCLUDE constraint is the sole conflict authority. A pre-check would
 * reintroduce the TOCTOU race that 4.1-CONC-001 exists to eliminate.
 *
 * AC Coverage:
 *   AC-2: bookings_no_overlap EXCLUDE constraint prevents concurrent double-bookings (23P01)
 *   AC-3: 23P01 caught by cause-chain walk → ConflictError('booking_conflict_error')
 *   AC-4: ConflictError carries Paraglide key 'booking_conflict_error' (key exists in messages/en.json)
 */
import { sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { bookings } from '../db/schema/bookings.js';
import { writeAuditLog } from './audit.js';

// ---------------------------------------------------------------------------
// ConflictError — structured 422 error surfaced from service layer
// Pattern copied from block-slot-service.ts
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
// Types
// ---------------------------------------------------------------------------

/** Minimal input type for Story 4.1 scope — full booking form schema belongs to Story 4.4 */
export type CreateBookingInput = {
	startAt: string;
	endAt: string;
};

/** Booking row type — mirrors RoomBlock export pattern from room-blocks.ts */
export type Booking = typeof bookings.$inferSelect;

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

/**
 * Create a new booking for a room.
 *
 * Runs inside a transaction:
 *   1. INSERT into bookings using tstzrange half-open [) range.
 *      The bookings_no_overlap EXCLUDE constraint fires on conflict (23P01 → ConflictError).
 *   2. Write audit_log entry.
 *
 * No app-level pre-check — the EXCLUDE constraint is the sole conflict authority.
 *
 * @param actorId - User ID performing the action
 * @param roomId  - Room to book
 * @param input   - { startAt, endAt } ISO timestamps
 * @throws ConflictError if the slot conflicts with an existing active booking (23P01)
 */
export async function createBooking(
	actorId: string,
	roomId: string,
	input: CreateBookingInput
): Promise<Booking> {
	return db.transaction(async (tx) => {
		// --- INSERT into bookings ---
		// bookings_no_overlap EXCLUDE constraint catches booking-vs-booking overlap (AC-2).
		// No id in values — DB generates via generatedAlwaysAsIdentity.
		let booking: Booking;
		try {
			const [inserted] = await tx
				.insert(bookings)
				.values({
					roomId,
					during: sql`tstzrange(${input.startAt}::timestamptz, ${input.endAt}::timestamptz, '[)')`,
					status: 'active'
				})
				.returning();

			if (!inserted) {
				throw new Error('Insert returned no rows — unexpected DB state');
			}
			booking = inserted;
		} catch (err: unknown) {
			// Catch Postgres 23P01 (exclusion_violation) from the EXCLUDE constraint (AC-3).
			// Drizzle may wrap pg errors in DrizzleQueryError, so walk the cause chain to find
			// the original pg error code (pattern from block-slot-service.ts).
			let pgCode: string | undefined;
			let cur: unknown = err;
			while (cur instanceof Error) {
				if ('code' in cur && typeof (cur as { code?: unknown }).code === 'string') {
					pgCode = (cur as { code: string }).code;
					break;
				}
				cur = (cur as Error).cause;
			}
			if (pgCode === '23P01') {
				throw new ConflictError('booking_conflict_error');
			}
			throw err;
		}

		// --- Write audit log (AC-3) ---
		const duringString = `[${input.startAt}, ${input.endAt})`;
		await writeAuditLog(tx, {
			actorId,
			entity: 'booking',
			action: 'create',
			diff: { roomId, during: duringString }
		});

		return booking;
	});
}
