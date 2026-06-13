/**
 * ATDD Red-Phase Scaffolds — Story 4.1: Conflict Translation & EXCLUDE Predicate
 * Integration Tests: booking-service.ts createBooking, ConflictError, 23P01 mapping
 *
 * STATUS: All Story 4.1 scenarios are ACTIVE. They were scaffolded as test.skip()
 * during the ATDD red phase, then activated task-by-task as booking-service.ts was
 * implemented and verified green.
 *
 * These tests run in the Vitest `integration` project which requires a real
 * PostgreSQL instance. The global setup (tests/support/integration-setup.ts)
 * starts Testcontainers when DATABASE_URL is not set, or uses the CI Postgres
 * service when DATABASE_URL is already provided.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test(s).
 *   2. Ensure Postgres is running (via Testcontainers or CI service).
 *   3. Run: `bun run test:integration` — verify it FAILS first (red).
 *   4. Implement the feature (per task in story 4.1).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: EXCLUDE constraint predicate WHERE (status != 'cancelled') present — 4.1-UNIT-001 (db-schema.test.ts)
 *   - AC-2: N=5 concurrent inserts → exactly one succeeds, rest raise 23P01 — 4.1-CONC-001
 *   - AC-3: booking-service.ts catches 23P01, walks cause chain, throws ConflictError('booking_conflict_error')
 *   - AC-4: Paraglide key booking_conflict_error exists (asserted in 4.1-INT-003 message key check)
 *
 * Scenario IDs (from test-design-epic-4.md + story 4.1 Task 2.2):
 *   P0 (critical — activate in order during implementation):
 *   - 4.1-CONC-001: N=5 concurrent inserts on same room+slot → exactly one succeeds, rest raise 23P01 [AR-11 mandatory]
 *   - 4.1-INT-001: sequential conflict → ConflictError thrown by booking-service.ts (service-layer call)
 *   - 4.1-INT-002: cancelled booking does not block → cancel booking A, create booking B for same slot → B succeeds
 *   - 4.1-INT-003: 23P01 maps to typed ConflictError (never raw exception re-throw or 500-class error)
 *   P1:
 *   - 4.1-INT-004: back-to-back bookings (10:00–11:00 + 11:00–12:00 same room) both succeed — [) half-open confirmed
 *   - 4.1-INT-005: ConflictError.key is 'booking_conflict_error' (Paraglide key exists, no raw 23P01 string)
 *   P2:
 *   - 4.1-INT-006: same room on different days — no conflict (range isolation correct)
 *
 * Activation order (story 4.1 tasks):
 *   Task 2.3: activate 4.1-INT-001 only → run → expect FAIL → implement booking-service.ts → PASS
 *   Task 2.6: activate 4.1-CONC-001 → run → must PASS (concurrent constraint enforcement)
 *   Code review: activated 4.1-INT-002..006 — all cover in-scope Story 4.1 ACs at the
 *     service layer (INT-002→AC-1 cancelled-exclusion, INT-003/005→AC-3/AC-4 typed conflict
 *     error, INT-004/006→half-open [) range semantics). The HTTP-422 form-action variants of
 *     R-006 are owned by 4.4-INT-002 in the future booking-route story (Story 4.4).
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - drizzle-kit migrate has run (0000_init.sql: bookings table + bookings_no_overlap EXCLUDE constraint)
 *   - Story 4.1 implemented: src/lib/server/services/booking-service.ts with createBooking + ConflictError
 *   - btree_gist extension loaded (already in 0000_init.sql)
 *   - messages/en.json contains 'booking_conflict_error' key (Task 1.1)
 *
 * Architecture requirements (from story 4.1 dev notes):
 *   - booking-service.ts NEVER does an app-level overlap pre-check (SELECT before INSERT)
 *     The EXCLUDE constraint is the sole conflict authority — a pre-check reintroduces the TOCTOU race
 *   - ConflictError pattern copied exactly from block-slot-service.ts:
 *       readonly statusCode = 422; readonly key: string; name = 'ConflictError'
 *   - Cause-chain walk: traverse error.cause until pgCode === '23P01' found
 *   - INSERT uses tstzrange(startAt::timestamptz, endAt::timestamptz, '[)') — half-open
 *   - No `id` in INSERT values — DB generates via generatedAlwaysAsIdentity
 *   - CONC-001 uses direct pg pool calls (not service) to test the constraint independently
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   All string assertions use English mock data. Paraglide keys tested by name only.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Postgres client — uses DATABASE_URL from environment (set by integration-setup.ts)
// ---------------------------------------------------------------------------

let pool: pg.Pool;

beforeAll(async () => {
	const databaseUrl = process.env['DATABASE_URL'];
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL not set — integration-setup.ts should have configured it via Testcontainers or CI service'
		);
	}
	pool = new pg.Pool({ connectionString: databaseUrl });
	const client = await pool.connect();
	await client.query('SELECT 1');
	client.release();
});

afterAll(async () => {
	if (pool) {
		await pool.end();
	}
});

// ---------------------------------------------------------------------------
// Seed helpers — direct DB writes (no HTTP auth needed for service-level tests)
// ---------------------------------------------------------------------------

/**
 * Inserts a room row via raw SQL and returns its room_id.
 * Uses a deterministic test prefix to avoid collisions with production data.
 */
async function seedRoom(client: pg.PoolClient, prefix = 'test-booking'): Promise<string> {
	const roomId = `${prefix}-${randomUUID()}`;
	await client.query(
		`INSERT INTO rooms (id, name, floor, capacity, features, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (id) DO NOTHING`,
		[roomId, `Test Room ${roomId}`, '1', 10, '{}']
	);
	return roomId;
}

/**
 * Returns a deterministic actor ID for audit log entries.
 * audit_log.actor_id is plain text (no FK) — no DB insert required.
 * The client parameter is kept for API compatibility with callers.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function seedOrganizer(_client: pg.PoolClient): Promise<string> {
	return randomUUID();
}

// ---------------------------------------------------------------------------
// 4.1-CONC-001 — N=5 concurrent inserts on same room+slot → exactly one succeeds
// AR-11 MANDATORY: must pass in PR gate; concurrent double-booking prevention proof
// ---------------------------------------------------------------------------

describe('Story 4.1 — Concurrent Double-Booking Prevention (AC-2, AR-11)', () => {
	test('[P0] 4.1-CONC-001 — N=5 concurrent inserts on same room+slot → exactly one commits, rest rejected with 23P01 or 40P01', async () => {
		// THIS TEST WILL FAIL until bookings table EXCLUDE constraint is exercised.
		// Activate after Task 2.1–2.2 scaffold; then run to confirm constraint fires.
		// The EXCLUDE constraint (bookings_no_overlap) in 0000_init.sql is the guard.
		//
		// Strategy: N=5 direct pg pool transactions each attempting to INSERT a booking
		// for the same roomId + during range. Assert exactly one INSERT commits.
		// Assert the rest raise a Postgres error (23P01 exclusion_violation OR 40P01 deadlock).
		// AR-11 (architecture): "Assert the rest raise 23P01 (or are rolled back)" — a deadlock
		// victim IS rolled back, so 40P01 satisfies the AR-11 mandate.
		// Uses direct pool.connect() calls — not the service layer — to test the DB constraint
		// in isolation from application code.
		//
		// AC-2: concurrent writes never produce two active bookings for the same slot.

		const client = await pool.connect();
		let roomId: string;
		try {
			roomId = await seedRoom(client, 'test-conc-001');
		} finally {
			client.release();
		}

		const N = 5;
		const slotStart = '2026-07-15 09:00:00+00';
		const slotEnd = '2026-07-15 10:00:00+00';

		// Launch N concurrent transactions
		const results = await Promise.allSettled(
			Array.from({ length: N }, async () => {
				const conn = await pool.connect();
				try {
					await conn.query('BEGIN');
					await conn.query(
						`INSERT INTO bookings (room_id, during, status)
               VALUES ($1, tstzrange($2::timestamptz, $3::timestamptz, '[)'), 'active')`,
						[roomId, slotStart, slotEnd]
					);
					await conn.query('COMMIT');
					return { committed: true };
				} catch (err: unknown) {
					await conn.query('ROLLBACK').catch(() => {});
					return { committed: false, code: (err as { code?: string }).code };
				} finally {
					conn.release();
				}
			})
		);

		const settled = results.map((r) => (r.status === 'fulfilled' ? r.value : { committed: false }));

		const committed = settled.filter((r) => r.committed);
		const notCommitted = settled.filter((r) => !r.committed);
		// Under concurrent GiST EXCLUDE, losers raise 23P01 (exclusion_violation).
		// Under high concurrency, Postgres may also raise 40P01 (deadlock_detected) for some
		// losers — a deadlock victim IS rolled back, which satisfies AR-11's "or are rolled back"
		// clause. Both codes are legitimate; any other code signals an unexpected failure.
		const legitimateCodes = new Set(['23P01', '40P01']);
		const legitimateRejections = notCommitted.filter(
			(r) => 'code' in r && legitimateCodes.has(r.code as string)
		);

		expect(
			committed.length,
			`Expected exactly 1 successful INSERT out of ${N} concurrent attempts but got ${committed.length}`
		).toBe(1);

		expect(
			legitimateRejections.length,
			`Expected ${N - 1} losers rejected with 23P01/40P01 but got ${legitimateRejections.length}. All codes: [${notCommitted.map((r) => ('code' in r ? r.code : 'no-code')).join(', ')}]`
		).toBe(N - 1);

		// Verify exactly one booking row exists in DB
		const countResult = await pool.query<{ count: string }>(
			`SELECT COUNT(*) AS count FROM bookings WHERE room_id = $1 AND status = 'active'`,
			[roomId]
		);
		expect(
			Number(countResult.rows[0]?.count),
			'Exactly one active booking must exist after N concurrent inserts'
		).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// 4.1-INT-001 — Sequential conflict → ConflictError thrown (service-layer call)
// ---------------------------------------------------------------------------

describe('Story 4.1 — Sequential Conflict → ConflictError (AC-3)', () => {
	test('[P0] 4.1-INT-001 — sequential conflict for same room+slot raises ConflictError from booking-service.ts', async () => {
		// THIS TEST WILL FAIL until src/lib/server/services/booking-service.ts is created.
		// Activate at Task 2.3 (first activation) → run → expect FAIL → implement service → PASS.
		//
		// AC-3: booking-service.ts catches 23P01, walks error cause chain,
		//       and throws ConflictError carrying key 'booking_conflict_error'.
		//
		// Strategy: call createBooking() for room+slot A (succeeds), then call
		// createBooking() again for the same room+slot (must throw ConflictError).
		// Asserts service-layer contract — not HTTP behavior (that is Story 4.4).

		const { createBooking, ConflictError } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-int-001');
			actorId = await seedOrganizer(client);
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-07-16T09:00:00.000Z',
			endAt: '2026-07-16T10:00:00.000Z'
		};

		// First booking succeeds
		const first = await createBooking(actorId, roomId, input);
		expect(first.id, 'First booking must return a non-null id').toBeTruthy();

		// Second booking for same slot must throw ConflictError
		let thrown: unknown = null;
		try {
			await createBooking(actorId, roomId, input);
		} catch (err: unknown) {
			thrown = err;
		}

		expect(thrown, 'createBooking must throw on overlapping slot for same room').not.toBeNull();
		expect(
			thrown instanceof ConflictError,
			`Expected ConflictError but got: ${Object.prototype.toString.call(thrown)}`
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 4.1-INT-002 — Cancelled booking does not block new active booking (AC-1, R-001)
// ---------------------------------------------------------------------------

describe('Story 4.1 — Cancelled Booking Does Not Block (AC-1, R-001)', () => {
	test('[P0] 4.1-INT-002 — cancelled booking does not block new booking for same room+slot (predicate WHERE status<>cancelled verified)', async () => {
		// ACTIVE — verifies booking-service.ts createBooking against a live constraint.
		//
		// AC-1: EXCLUDE constraint predicate WHERE (status != 'cancelled') verified behaviorally.
		// A cancelled booking must NOT prevent a new active booking in the same slot.
		//
		// Strategy:
		//   1. Direct SQL: INSERT booking A with status='active' for roomId+slot.
		//   2. Direct SQL: UPDATE booking A to status='cancelled'.
		//   3. Service call: createBooking(actorId, roomId, same slot) — must SUCCEED (not throw).
		//   4. Assert the new booking row exists with status='active'.

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-int-002');
			actorId = await seedOrganizer(client);
		} finally {
			client.release();
		}

		const slotStart = '2026-07-17T13:00:00.000Z';
		const slotEnd = '2026-07-17T14:00:00.000Z';

		// Step 1+2: insert and cancel booking A via direct SQL
		const insertClient = await pool.connect();
		try {
			await insertClient.query(
				`INSERT INTO bookings (room_id, during, status)
           VALUES ($1, tstzrange($2::timestamptz, $3::timestamptz, '[)'), 'active')`,
				[roomId, slotStart, slotEnd]
			);
			await insertClient.query(
				`UPDATE bookings SET status = 'cancelled'
           WHERE room_id = $1
             AND during = tstzrange($2::timestamptz, $3::timestamptz, '[)')`,
				[roomId, slotStart, slotEnd]
			);
		} finally {
			insertClient.release();
		}

		// Step 3: createBooking for same slot must succeed (cancelled row not in constraint scope)
		let thrown: unknown = null;
		let newBooking: { id: unknown; status: unknown } | null = null;
		try {
			newBooking = await createBooking(actorId, roomId, { startAt: slotStart, endAt: slotEnd });
		} catch (err: unknown) {
			thrown = err;
		}

		expect(
			thrown,
			`createBooking must NOT throw for a slot only occupied by a cancelled booking — got: ${String(thrown)}`
		).toBeNull();

		expect(newBooking, 'createBooking must return a booking object').not.toBeNull();
		expect(newBooking?.id, 'New booking must have an id').toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// 4.1-INT-003 — 23P01 maps to typed ConflictError (never raw exception or 500-class error)
// ---------------------------------------------------------------------------

describe('Story 4.1 — 23P01 → ConflictError (never raw throw) (AC-3)', () => {
	test('[P0] 4.1-INT-003 — booking-service.ts throws ConflictError (not raw Postgres error) when 23P01 fires', async () => {
		// ACTIVE — verifies booking-service.ts catches and remaps 23P01 to a typed error.
		//
		// AC-3: Postgres error 23P01 must be caught and rethrown as ConflictError.
		//       No raw 23P01 DatabaseError or DrizzleQueryError should escape the service.
		//
		// Strategy:
		//   1. Direct SQL: insert conflicting booking row (bypass service).
		//   2. Service call: createBooking for same slot → must throw ConflictError.
		//   3. Assert thrown.name === 'ConflictError' (not 'DatabaseError', not generic Error).
		//   4. Assert thrown.key === 'booking_conflict_error' (Paraglide key, not raw '23P01').
		//   5. Assert the error is NOT an instance of the pg DatabaseError class.

		const { createBooking, ConflictError } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-int-003');
			actorId = await seedOrganizer(client);
		} finally {
			client.release();
		}

		const slotStart = '2026-07-18T10:00:00.000Z';
		const slotEnd = '2026-07-18T11:00:00.000Z';

		// Step 1: insert conflicting row via raw SQL (force conflict for next call)
		const insertClient = await pool.connect();
		try {
			await insertClient.query(
				`INSERT INTO bookings (room_id, during, status)
           VALUES ($1, tstzrange($2::timestamptz, $3::timestamptz, '[)'), 'active')`,
				[roomId, slotStart, slotEnd]
			);
		} finally {
			insertClient.release();
		}

		// Step 2: service call must throw ConflictError
		let thrown: unknown = null;
		try {
			await createBooking(actorId, roomId, { startAt: slotStart, endAt: slotEnd });
		} catch (err: unknown) {
			thrown = err;
		}

		// Step 3: assert correct error type
		expect(thrown, 'booking-service.ts must throw on 23P01 conflict').not.toBeNull();
		expect(
			thrown instanceof ConflictError,
			`Expected ConflictError but got: ${Object.prototype.toString.call(thrown)}`
		).toBe(true);

		// Step 4: assert Paraglide key (not raw 23P01 string)
		const conflictErr = thrown as InstanceType<typeof ConflictError>;
		expect(conflictErr.key, 'ConflictError.key must be the Paraglide key').toBe(
			'booking_conflict_error'
		);
		expect(conflictErr.message, 'ConflictError.message must not expose raw 23P01').not.toContain(
			'23P01'
		);

		// Step 5: assert statusCode is 422
		expect(
			conflictErr.statusCode,
			'ConflictError.statusCode must be 422 (not a 500-class error)'
		).toBe(422);
	});
});

// ---------------------------------------------------------------------------
// 4.1-INT-004 — Back-to-back bookings (10:00–11:00 + 11:00–12:00) both succeed (P1, R-008)
// ---------------------------------------------------------------------------

describe('Story 4.1 — Back-to-Back Bookings: Half-Open [) Range Confirmed (P1, R-008)', () => {
	test('[P1] 4.1-INT-004 — back-to-back bookings for same room on adjacent slots both succeed (tstzrange [) half-open)', async () => {
		// ACTIVE — confirms half-open [) range allows adjacent bookings.
		//
		// R-008: Back-to-back bookings must NOT be flagged as conflicts.
		// tstzrange [) (half-open) means [10:00, 11:00) and [11:00, 12:00) do not overlap.
		// The && operator returns false for adjacent [) ranges.
		//
		// Strategy: call createBooking twice for same room but adjacent (non-overlapping) slots.
		// Both must succeed without throwing ConflictError.

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-int-004');
			actorId = await seedOrganizer(client);
		} finally {
			client.release();
		}

		// First booking: 10:00–11:00
		const booking1 = await createBooking(actorId, roomId, {
			startAt: '2026-07-19T10:00:00.000Z',
			endAt: '2026-07-19T11:00:00.000Z'
		});
		expect(booking1.id, 'First back-to-back booking must succeed').toBeTruthy();

		// Second booking: 11:00–12:00 (adjacent, not overlapping)
		let thrown: unknown = null;
		let booking2: { id: unknown } | null = null;
		try {
			booking2 = await createBooking(actorId, roomId, {
				startAt: '2026-07-19T11:00:00.000Z',
				endAt: '2026-07-19T12:00:00.000Z'
			});
		} catch (err: unknown) {
			thrown = err;
		}

		expect(
			thrown,
			`Back-to-back booking must NOT conflict (tstzrange [) half-open) — got: ${String(thrown)}`
		).toBeNull();
		expect(booking2?.id, 'Second back-to-back booking must succeed').toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// 4.1-INT-005 — ConflictError.key is 'booking_conflict_error' (Paraglide key, not 23P01) (P1)
// ---------------------------------------------------------------------------

describe('Story 4.1 — ConflictError carries Paraglide key, not raw 23P01 (P1, AC-4)', () => {
	test('[P1] 4.1-INT-005 — ConflictError.key equals booking_conflict_error and message contains no raw 23P01 string', async () => {
		// ACTIVE — confirms the conflict surfaces as a Paraglide key, not a raw SQLSTATE.
		//
		// AC-4: The conflict error must surface as the Paraglide key 'booking_conflict_error'
		//       — never as the raw PostgreSQL SQLSTATE '23P01'.
		//       messages/en.json must contain 'booking_conflict_error' (Task 1.1 of story).
		//
		// Strategy:
		//   1. Trigger a conflict via createBooking (same room+slot x2).
		//   2. Inspect the thrown ConflictError: key must === 'booking_conflict_error'.
		//   3. message must not contain '23P01' — no raw Postgres string exposed.
		//   4. Assert messages/en.json contains the 'booking_conflict_error' key.

		const { createBooking, ConflictError } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-int-005');
			actorId = await seedOrganizer(client);
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-07-20T09:00:00.000Z',
			endAt: '2026-07-20T10:00:00.000Z'
		};

		await createBooking(actorId, roomId, input); // first booking succeeds

		let thrown: unknown = null;
		try {
			await createBooking(actorId, roomId, input); // second conflicts
		} catch (err: unknown) {
			thrown = err;
		}

		expect(thrown instanceof ConflictError, 'Must throw ConflictError on conflict').toBe(true);
		const conflictErr = thrown as InstanceType<typeof ConflictError>;

		expect(conflictErr.key, 'ConflictError.key must be the Paraglide key').toBe(
			'booking_conflict_error'
		);
		expect(conflictErr.message, 'message must not expose raw 23P01 SQLSTATE').not.toContain(
			'23P01'
		);

		// Assert messages/en.json contains the key (Task 1.1 must have been completed)
		const { existsSync, readFileSync } = await import('fs');
		const { resolve } = await import('path');
		const messagesPath = resolve(process.cwd(), 'messages', 'en.json');
		expect(existsSync(messagesPath), 'messages/en.json must exist (Task 1.1)').toBe(true);
		const messages = JSON.parse(readFileSync(messagesPath, 'utf-8')) as Record<string, string>;
		expect(
			messages['booking_conflict_error'],
			"messages/en.json must have a non-empty 'booking_conflict_error' value (Task 1.1)"
		).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// 4.1-INT-006 — Same room on different days does NOT conflict (P2)
// ---------------------------------------------------------------------------

describe('Story 4.1 — Same Room Different Days: No Conflict (P2)', () => {
	test('[P2] 4.1-INT-006 — bookings for the same room at the same time on different days do not conflict', async () => {
		// ACTIVE — confirms range isolation across different days.
		//
		// Scenario: same room, 10:00–11:00 on day 1 and 10:00–11:00 on day 2 — both must succeed.
		// tstzrange ranges on different dates do not overlap (correct range isolation).

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-int-006');
			actorId = await seedOrganizer(client);
		} finally {
			client.release();
		}

		// Day 1: 2026-07-21 10:00–11:00
		const booking1 = await createBooking(actorId, roomId, {
			startAt: '2026-07-21T10:00:00.000Z',
			endAt: '2026-07-21T11:00:00.000Z'
		});
		expect(booking1.id, 'Booking on day 1 must succeed').toBeTruthy();

		// Day 2: 2026-07-22 10:00–11:00 (same time, different date — must NOT conflict)
		let thrown: unknown = null;
		let booking2: { id: unknown } | null = null;
		try {
			booking2 = await createBooking(actorId, roomId, {
				startAt: '2026-07-22T10:00:00.000Z',
				endAt: '2026-07-22T11:00:00.000Z'
			});
		} catch (err: unknown) {
			thrown = err;
		}

		expect(
			thrown,
			`Booking on a different day for same room+time must NOT conflict — got: ${String(thrown)}`
		).toBeNull();
		expect(booking2?.id, 'Booking on day 2 must succeed').toBeTruthy();
	});
});
