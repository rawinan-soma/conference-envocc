/**
 * Booking service — Story 4.1, expanded in Story 4.4, Story 4.7
 *
 * Provides createBooking with:
 * - INSERT into bookings using tstzrange half-open [) range
 * - Postgres EXCLUDE constraint (bookings_no_overlap) as sole conflict authority
 * - 23P01 exclusion_violation caught → throws ConflictError('booking_conflict_error')
 * - Audit log written inside the same transaction
 *
 * Story 4.7 additions:
 * - getBookingById: SELECT by PK
 * - updateBooking: UPDATE inside transaction (same 23P01 cause-chain, ownership check, audit)
 * - cancelBooking: UPDATE status='cancelled', ownership check, audit
 *
 * Story 5.6 additions:
 * - createBooking + updateBooking: schedule/re-schedule close-registration pg-boss job
 *   AFTER the transaction commits (not inside it — enqueueJob is outside DB transaction)
 *
 * IMPORTANT: No application-level overlap pre-check (SELECT before INSERT/UPDATE).
 * The EXCLUDE constraint is the sole conflict authority. A pre-check would
 * reintroduce the TOCTOU race that 4.1-CONC-001 exists to eliminate.
 *
 * AC Coverage:
 *   AC-2: bookings_no_overlap EXCLUDE constraint prevents concurrent double-bookings (23P01)
 *   AC-3: 23P01 caught by cause-chain walk → ConflictError('booking_conflict_error')
 *   AC-4: ConflictError carries Paraglide key 'booking_conflict_error' (key exists in messages/en.json)
 */
import { eq, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

import { db } from '../db/index.js';
import { bookings } from '../db/schema/bookings.js';
import { writeAuditLog } from './audit.js';
import { enqueueJob, QUEUE } from '../jobs/index.js';
import type { CloseRegistrationPayload } from '../jobs/queues.js';

/**
 * Generate a cryptographically random registration token.
 * Returns a 64-char lowercase hex string (32 bytes of entropy).
 * Token is stored plaintext — accepted deviation from AR-05 (hash storage is
 * incompatible with the resolvable/redisplayable link AC). See
 * _bmad-output/implementation-artifacts/adr-4-5-registration-token-storage.md
 */
function generateRegistrationToken(): string {
	return randomBytes(32).toString('hex');
}

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

/** Full booking form input — Story 4.4 */
export type CreateBookingInput = {
	/**
	 * Optional here because `createBooking` takes roomId as a separate parameter (and ignores
	 * this field). `updateBooking` reads it from the input to apply room changes. Production
	 * callers always pass `form.data`, which carries roomId; when absent (some tests), Drizzle
	 * omits the column from the UPDATE rather than writing NULL.
	 */
	roomId?: string;
	eventName: string;
	agenda?: string;
	startAt: string; // ISO datetime string (UTC)
	endAt: string; // ISO datetime string (UTC)
	cateringEnabled: boolean;
	registrationEnabled: boolean;
	registrationClosesAt?: string; // ISO datetime string (UTC) or undefined
};

/** Booking row type — mirrors RoomBlock export pattern from room-blocks.ts */
export type Booking = typeof bookings.$inferSelect;

// ---------------------------------------------------------------------------
// scheduleCloseRegistration — private helper (Story 5.6)
// ---------------------------------------------------------------------------

/**
 * Schedule (or re-schedule) the auto-close pg-boss job for a booking.
 * Called AFTER the DB transaction commits — enqueueJob uses its own pg connection.
 *
 * No-op if booking.registrationClosesAt is null.
 */
async function scheduleCloseRegistration(booking: Booking): Promise<void> {
	if (booking.registrationClosesAt) {
		await enqueueJob(
			QUEUE.CLOSE_REGISTRATION,
			{ bookingId: booking.id } satisfies CloseRegistrationPayload,
			{
				startAfter: booking.registrationClosesAt, // Date object from Drizzle
				singletonKey: `close-registration:${booking.id}`
			}
		);
	}
}

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
 * @param input   - Full booking form input (Story 4.4)
 * @throws ConflictError if the slot conflicts with an existing active booking (23P01)
 */
export async function createBooking(
	actorId: string,
	roomId: string,
	input: CreateBookingInput
): Promise<Booking> {
	// Capture the booking result BEFORE scheduling the job.
	// enqueueJob (pg-boss send) must be called AFTER the transaction commits — not inside it.
	const booking = await db.transaction(async (tx) => {
		// --- INSERT into bookings ---
		// bookings_no_overlap EXCLUDE constraint catches booking-vs-booking overlap (AC-2).
		let insertedBooking: Booking;
		try {
			const [inserted] = await tx
				.insert(bookings)
				.values({
					roomId,
					organizerId: actorId,
					eventName: input.eventName,
					agenda: input.agenda ?? null,
					during: sql`tstzrange(${input.startAt}::timestamptz, ${input.endAt}::timestamptz, '[)')`,
					status: 'active',
					cateringEnabled: input.cateringEnabled,
					registrationEnabled: input.registrationEnabled,
					// Only persist a closing date when registration is enabled, and parse it via the
					// same ::timestamptz cast as `during` (session-timezone aware) rather than JS
					// `new Date()` (Node-process-timezone), so all datetime columns use one consistent
					// parse path. (Story 4.4 code review)
					registrationClosesAt:
						input.registrationEnabled && input.registrationClosesAt
							? sql`${input.registrationClosesAt}::timestamptz`
							: null,
					// AC-1 (Story 4.5): generate a CSPRNG token when registration is enabled.
					// Stored plaintext (accepted AR-05 deviation — see adr-4-5-registration-token-storage.md).
					// Never log the actual token value.
					registrationToken: input.registrationEnabled ? generateRegistrationToken() : null
				})
				.returning();

			if (!inserted) {
				throw new Error('Insert returned no rows — unexpected DB state');
			}
			insertedBooking = inserted;
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

		// --- Write audit log ---
		await writeAuditLog(tx, {
			actorId,
			entity: 'booking',
			action: 'create',
			diff: {
				roomId,
				eventName: input.eventName,
				during: `[${input.startAt}, ${input.endAt})`,
				cateringEnabled: input.cateringEnabled,
				registrationEnabled: input.registrationEnabled,
				// Never log the actual token value — use placeholder (Story 4.5)
				registrationToken: input.registrationEnabled ? '[generated]' : null
			}
		});

		return insertedBooking;
	});

	// --- Schedule auto-close job AFTER transaction commits (AC-1, Story 5.6) ---
	// enqueueJob is outside the DB transaction: pg-boss.send() uses its own connection.
	// registrationClosesAt is persisted only when registrationEnabled=true, so this guard
	// naturally skips disabled-registration bookings (no unnecessary jobs).
	await scheduleCloseRegistration(booking);

	return booking;
}

// ---------------------------------------------------------------------------
// getBookingById — Story 4.7
// ---------------------------------------------------------------------------

/**
 * Fetch a single booking row by primary key.
 *
 * @param id - Booking UUID
 * @returns The booking row, or undefined if not found
 */
export async function getBookingById(id: string): Promise<Booking | undefined> {
	const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
	return row;
}

// ---------------------------------------------------------------------------
// updateBooking — Story 4.7
// ---------------------------------------------------------------------------

/**
 * Update an existing booking.
 *
 * Runs inside a transaction:
 *   1. Ownership check — throws 403 if actorId !== booking.organizerId.
 *   2. UPDATE bookings SET … WHERE id = bookingId (RETURNING).
 *      bookings_no_overlap EXCLUDE constraint still fires on conflict (23P01 → ConflictError).
 *   3. Write audit_log entry with action='update'.
 *
 * Edit self-conflict is not an issue: Postgres EXCLUDE checks the new row against OTHER rows,
 * not itself — no "exclude self" workaround is needed.
 *
 * @param actorId   - User ID performing the action
 * @param bookingId - Booking to update
 * @param input     - Full booking form input (same schema as createBooking)
 * @throws 403 HttpError if actorId does not own the booking
 * @throws ConflictError if the new slot conflicts with another active booking (23P01)
 */
export async function updateBooking(
	actorId: string,
	bookingId: string,
	input: CreateBookingInput
): Promise<Booking> {
	// Capture the booking result BEFORE scheduling the job.
	// enqueueJob (pg-boss send) must be called AFTER the transaction commits — not inside it.
	const booking = await db.transaction(async (tx) => {
		// --- Ownership check (service-level IDOR guard, AC-4) ---
		const [existing] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
		if (!existing) {
			const { error } = await import('@sveltejs/kit');
			error(404, 'Booking not found');
		}
		if (existing.organizerId !== actorId) {
			const { error } = await import('@sveltejs/kit');
			error(403, 'Forbidden: you do not own this resource');
		}

		// --- UPDATE bookings ---
		let updatedBooking: Booking;
		try {
			const [updated] = await tx
				.update(bookings)
				.set({
					roomId: input.roomId,
					eventName: input.eventName,
					agenda: input.agenda ?? null,
					during: sql`tstzrange(${input.startAt}::timestamptz, ${input.endAt}::timestamptz, '[)')`,
					cateringEnabled: input.cateringEnabled,
					registrationEnabled: input.registrationEnabled,
					registrationClosesAt:
						input.registrationEnabled && input.registrationClosesAt
							? sql`${input.registrationClosesAt}::timestamptz`
							: null,
					updatedAt: sql`now()`
				})
				.where(eq(bookings.id, bookingId))
				.returning();

			if (!updated) {
				throw new Error('Update returned no rows — unexpected DB state');
			}
			updatedBooking = updated;
		} catch (err: unknown) {
			// Catch Postgres 23P01 (exclusion_violation) from the EXCLUDE constraint.
			// Drizzle may wrap pg errors in DrizzleQueryError, so walk the cause chain to find
			// the original pg error code (pattern from createBooking).
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

		// --- Write audit log ---
		await writeAuditLog(tx, {
			actorId,
			entity: 'booking',
			action: 'update',
			diff: {
				bookingId,
				roomId: input.roomId,
				eventName: input.eventName,
				during: `[${input.startAt}, ${input.endAt})`,
				cateringEnabled: input.cateringEnabled,
				registrationEnabled: input.registrationEnabled
			}
		});

		return updatedBooking;
	});

	// --- Re-schedule auto-close job AFTER transaction commits (AC-1, Story 5.6) ---
	// Multiple jobs may coexist per booking under the 'standard' policy — singletonKey
	// is metadata only, not a unique index. Correctness comes from handler's two guards:
	//   (a) registrationEnabled guard — if already false, no-op (R-004 MITIGATE)
	//   (b) time guard — if closesAt is null or future, no-op (stale-job safe)
	// If registrationClosesAt was removed (now null): do NOT enqueue. Any pending jobs
	// will fire but the time guard will no-op safely (!registrationClosesAt → return).
	await scheduleCloseRegistration(booking);

	return booking;
}

// ---------------------------------------------------------------------------
// closeRegistrationManual — Story 5.6, AC-2
// ---------------------------------------------------------------------------

/**
 * Close registration on a booking immediately (manual action by organizer).
 *
 * Runs inside a transaction with a SELECT … FOR UPDATE row lock so that
 * concurrent double-submits are safe — only one write wins:
 *   1. Ownership check — throws 403 if actorId !== booking.organizerId.
 *   2. Status guard — throws 422 if booking is not 'active' (prevents closing
 *      a cancelled booking's registration via direct POST).
 *   3. Idempotent — no-op (returns false) if registrationEnabled is already false.
 *   4. UPDATE bookings SET registrationEnabled=false + write audit_log.
 *
 * Returns `true` when registration was closed, `false` when it was already closed
 * (caller can redirect without taking action either way).
 *
 * @param actorId   - User ID performing the action
 * @param bookingId - Booking whose registration to close
 * @throws 404 HttpError if booking is not found
 * @throws 403 HttpError if actorId does not own the booking
 * @throws 422 HttpError if booking status is not 'active'
 */
export async function closeRegistrationManual(
	actorId: string,
	bookingId: string
): Promise<boolean> {
	return db.transaction(async (tx) => {
		// SELECT … FOR UPDATE — prevents concurrent double-submits from both
		// passing the idempotency guard and writing duplicate audit rows.
		const [booking] = await tx
			.select()
			.from(bookings)
			.where(eq(bookings.id, bookingId))
			.for('update');

		if (!booking) {
			const { error } = await import('@sveltejs/kit');
			error(404, 'Booking not found');
		}

		// Ownership check (service-level IDOR guard)
		if (booking.organizerId !== actorId) {
			const { error } = await import('@sveltejs/kit');
			error(403, 'Forbidden: you do not own this resource');
		}

		// Status guard — only active bookings can have registration closed
		// (defence-in-depth matching the UI button gate: status='active' && registrationEnabled)
		if (booking.status !== 'active') {
			const { error } = await import('@sveltejs/kit');
			error(422, 'Cannot close registration on a non-active booking');
		}

		// Idempotent: already closed → no-op
		if (!booking.registrationEnabled) {
			return false;
		}

		await tx
			.update(bookings)
			.set({ registrationEnabled: false, updatedAt: sql`now()` })
			.where(eq(bookings.id, bookingId));

		await writeAuditLog(tx, {
			actorId,
			entity: 'booking',
			action: 'close-registration',
			diff: { bookingId }
		});

		return true;
	});
}

// ---------------------------------------------------------------------------
// cancelBooking — Story 4.7
// ---------------------------------------------------------------------------

/**
 * Cancel a booking by setting status = 'cancelled'.
 *
 * The EXCLUDE constraint predicate is `WHERE status <> 'cancelled'`, so cancelling
 * a booking automatically frees the slot for new active bookings — no schema change needed.
 *
 * Runs inside a transaction:
 *   1. Ownership check — throws 403 if actorId !== booking.organizerId.
 *   2. UPDATE bookings SET status='cancelled' WHERE id = bookingId.
 *   3. Write audit_log entry with action='cancel'.
 *
 * @param actorId   - User ID performing the action
 * @param bookingId - Booking to cancel
 * @throws 403 HttpError if actorId does not own the booking
 */
export async function cancelBooking(actorId: string, bookingId: string): Promise<void> {
	await db.transaction(async (tx) => {
		// --- Ownership check (service-level IDOR guard, AC-4) ---
		const [existing] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
		if (!existing) {
			const { error } = await import('@sveltejs/kit');
			error(404, 'Booking not found');
		}
		if (existing.organizerId !== actorId) {
			const { error } = await import('@sveltejs/kit');
			error(403, 'Forbidden: you do not own this resource');
		}

		// --- UPDATE status = 'cancelled' ---
		await tx
			.update(bookings)
			.set({ status: 'cancelled', updatedAt: sql`now()` })
			.where(eq(bookings.id, bookingId));

		// --- Write audit log ---
		await writeAuditLog(tx, {
			actorId,
			entity: 'booking',
			action: 'cancel',
			diff: { bookingId }
		});
	});
}
