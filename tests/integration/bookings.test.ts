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
 *   - AC-4: Paraglide key booking_conflict_error exists (asserted in 4.1-INT-005 en.json key check)
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
 */
function seedOrganizer(): string {
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
						`INSERT INTO bookings (id, room_id, organizer_id, event_name, during, status)
               VALUES (gen_random_uuid()::text, $1, 'conc-test-actor', 'CONC Test Event', tstzrange($2::timestamptz, $3::timestamptz, '[)'), 'active')`,
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

		// Map allSettled results to a uniform shape. A rejected promise means pool.connect() itself
		// threw (e.g. pool exhausted) — propagate the rejection reason's code so infrastructure
		// errors are not silently collapsed into "losers without a code" and produce a misleading
		// assertion failure message.
		const settled = results.map((r) =>
			r.status === 'fulfilled'
				? r.value
				: {
						committed: false,
						code: (r.reason as { code?: string } | undefined)?.code ?? 'POOL_ERROR'
					}
		);

		// Assert no unexpected error codes before checking invariants. Any code other than 23P01
		// or 40P01 (or the synthetic POOL_ERROR sentinel) indicates an infrastructure problem
		// that would make the subsequent invariant assertions meaningless.
		const legitimateCodes = new Set(['23P01', '40P01']);
		const committed = settled.filter((r) => r.committed);
		const notCommitted = settled.filter((r) => !r.committed);
		// Under concurrent GiST EXCLUDE, losers raise 23P01 (exclusion_violation).
		// Under high concurrency, Postgres may also raise 40P01 (deadlock_detected) for some
		// losers — a deadlock victim IS rolled back, which satisfies AR-11's "or are rolled back"
		// clause. Both codes are legitimate; any other code signals an unexpected failure.
		const unexpectedRejections = notCommitted.filter(
			(r) => 'code' in r && !legitimateCodes.has(r.code as string)
		);
		expect(
			unexpectedRejections.length,
			`Expected all losers to raise 23P01/40P01 but found unexpected codes: [${unexpectedRejections.map((r) => ('code' in r ? r.code : 'no-code')).join(', ')}] — possible pool exhaustion or infrastructure error`
		).toBe(0);
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
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-07-16T09:00:00.000Z',
			endAt: '2026-07-16T10:00:00.000Z',
			eventName: 'Test Event INT-001',
			cateringEnabled: false,
			registrationEnabled: false
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
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const slotStart = '2026-07-17T13:00:00.000Z';
		const slotEnd = '2026-07-17T14:00:00.000Z';

		// Step 1+2: insert and cancel booking A via direct SQL
		const insertClient = await pool.connect();
		try {
			await insertClient.query(
				`INSERT INTO bookings (id, room_id, organizer_id, event_name, during, status)
           VALUES (gen_random_uuid()::text, $1, 'int-002-actor', 'INT-002 Test Event', tstzrange($2::timestamptz, $3::timestamptz, '[)'), 'active')`,
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
			newBooking = await createBooking(actorId, roomId, {
				startAt: slotStart,
				endAt: slotEnd,
				eventName: 'Test Event INT-002',
				cateringEnabled: false,
				registrationEnabled: false
			});
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
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const slotStart = '2026-07-18T10:00:00.000Z';
		const slotEnd = '2026-07-18T11:00:00.000Z';

		// Step 1: insert conflicting row via raw SQL (force conflict for next call)
		const insertClient = await pool.connect();
		try {
			await insertClient.query(
				`INSERT INTO bookings (id, room_id, organizer_id, event_name, during, status)
           VALUES (gen_random_uuid()::text, $1, 'int-003-actor', 'INT-003 Test Event', tstzrange($2::timestamptz, $3::timestamptz, '[)'), 'active')`,
				[roomId, slotStart, slotEnd]
			);
		} finally {
			insertClient.release();
		}

		// Step 2: service call must throw ConflictError
		let thrown: unknown = null;
		try {
			await createBooking(actorId, roomId, {
				startAt: slotStart,
				endAt: slotEnd,
				eventName: 'Test Event INT-003',
				cateringEnabled: false,
				registrationEnabled: false
			});
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
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		// First booking: 10:00–11:00
		const booking1 = await createBooking(actorId, roomId, {
			startAt: '2026-07-19T10:00:00.000Z',
			endAt: '2026-07-19T11:00:00.000Z',
			eventName: 'Test Event INT-004 First',
			cateringEnabled: false,
			registrationEnabled: false
		});
		expect(booking1.id, 'First back-to-back booking must succeed').toBeTruthy();

		// Second booking: 11:00–12:00 (adjacent, not overlapping)
		let thrown: unknown = null;
		let booking2: { id: unknown } | null = null;
		try {
			booking2 = await createBooking(actorId, roomId, {
				startAt: '2026-07-19T11:00:00.000Z',
				endAt: '2026-07-19T12:00:00.000Z',
				eventName: 'Test Event INT-004 Second',
				cateringEnabled: false,
				registrationEnabled: false
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
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-07-20T09:00:00.000Z',
			endAt: '2026-07-20T10:00:00.000Z',
			eventName: 'Test Event INT-005',
			cateringEnabled: false,
			registrationEnabled: false
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
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		// Day 1: 2026-07-21 10:00–11:00
		const booking1 = await createBooking(actorId, roomId, {
			startAt: '2026-07-21T10:00:00.000Z',
			endAt: '2026-07-21T11:00:00.000Z',
			eventName: 'Test Event INT-006 Day1',
			cateringEnabled: false,
			registrationEnabled: false
		});
		expect(booking1.id, 'Booking on day 1 must succeed').toBeTruthy();

		// Day 2: 2026-07-22 10:00–11:00 (same time, different date — must NOT conflict)
		let thrown: unknown = null;
		let booking2: { id: unknown } | null = null;
		try {
			booking2 = await createBooking(actorId, roomId, {
				startAt: '2026-07-22T10:00:00.000Z',
				endAt: '2026-07-22T11:00:00.000Z',
				eventName: 'Test Event INT-006 Day2',
				cateringEnabled: false,
				registrationEnabled: false
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

// ---------------------------------------------------------------------------
// 4.2-INT-001 — Week Calendar Read-Model: Correct Data [P1]
// RED PHASE — scaffolded as test.skip(); activate at Task 2.3 after
// getWeekCalendar() is implemented. Expect FAIL on first activation.
// ---------------------------------------------------------------------------

describe('Story 4.2 — Week Calendar Read-Model: Correct Data (P1)', () => {
	test('[P1] 4.2-INT-001 — getWeekCalendar returns per-room bookings; deactivated rooms absent', async () => {
		// Activate at Task 2.3 after getWeekCalendar() is implemented.
		//
		// Strategy:
		//   1. Seed 2 active rooms and 1 inactive room.
		//   2. Seed bookings for the week (2026-07-14 Mon → 2026-07-21 Mon) for both active rooms.
		//   3. Call getWeekCalendar(weekStart) where weekStart = Monday 2026-07-14 00:00:00 UTC.
		//   4. Assert result contains entries only for active rooms.
		//   5. Assert the inactive room is absent from result.
		//   6. Assert each active room's bookings array contains the correct seeded bookings.
		//
		// AC-1: per-room bookings returned for the week; deactivated rooms absent.
		// No Thai text — per project rule; Rawinan handles all translations.

		const client = await pool.connect();
		let activeRoomId1: string;
		let activeRoomId2: string;
		let inactiveRoomId: string;

		try {
			// Seed active room 1
			activeRoomId1 = `test-4.2-int-001-active1-${randomUUID()}`;
			await client.query(
				`INSERT INTO rooms (id, name, floor, capacity, features, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
				[activeRoomId1, `Active Room 1 ${activeRoomId1}`, '1', 10, '{}']
			);

			// Seed active room 2
			activeRoomId2 = `test-4.2-int-001-active2-${randomUUID()}`;
			await client.query(
				`INSERT INTO rooms (id, name, floor, capacity, features, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
				[activeRoomId2, `Active Room 2 ${activeRoomId2}`, '2', 20, '{}']
			);

			// Seed inactive room
			inactiveRoomId = `test-4.2-int-001-inactive-${randomUUID()}`;
			await client.query(
				`INSERT INTO rooms (id, name, floor, capacity, features, is_active)
         VALUES ($1, $2, $3, $4, $5, false)`,
				[inactiveRoomId, `Inactive Room ${inactiveRoomId}`, '3', 5, '{}']
			);

			// Seed a booking for active room 1 within the week (Mon 2026-07-14 10:00–11:00 UTC)
			await client.query(
				`INSERT INTO bookings (id, room_id, organizer_id, event_name, during, status)
         VALUES (gen_random_uuid()::text, $1, '4.2-int-001-actor', '4.2 Test Event Room1', tstzrange('2026-07-14 10:00:00+00'::timestamptz, '2026-07-14 11:00:00+00'::timestamptz, '[)'), 'active')`,
				[activeRoomId1]
			);

			// Seed a booking for active room 2 within the week (Tue 2026-07-15 14:00–15:00 UTC)
			await client.query(
				`INSERT INTO bookings (id, room_id, organizer_id, event_name, during, status)
         VALUES (gen_random_uuid()::text, $1, '4.2-int-001-actor', '4.2 Test Event Room2', tstzrange('2026-07-15 14:00:00+00'::timestamptz, '2026-07-15 15:00:00+00'::timestamptz, '[)'), 'active')`,
				[activeRoomId2]
			);

			// Seed a cancelled booking for active room 1 — must NOT appear in results
			await client.query(
				`INSERT INTO bookings (id, room_id, organizer_id, event_name, during, status)
         VALUES (gen_random_uuid()::text, $1, '4.2-int-001-actor', '4.2 Cancelled Event', tstzrange('2026-07-16 09:00:00+00'::timestamptz, '2026-07-16 10:00:00+00'::timestamptz, '[)'), 'cancelled')`,
				[activeRoomId1]
			);

			// Seed a booking for the inactive room within the week — must NOT appear in results
			await client.query(
				`INSERT INTO bookings (id, room_id, organizer_id, event_name, during, status)
         VALUES (gen_random_uuid()::text, $1, '4.2-int-001-actor', '4.2 Inactive Room Event', tstzrange('2026-07-14 13:00:00+00'::timestamptz, '2026-07-14 14:00:00+00'::timestamptz, '[)'), 'active')`,
				[inactiveRoomId]
			);
		} finally {
			client.release();
		}

		// Import and call the function under test
		const { getWeekCalendar } = await import('../../src/lib/server/db/queries/bookings.js');

		// weekStart = Monday 2026-07-14 00:00:00 UTC
		const weekStart = new Date('2026-07-14T00:00:00.000Z');
		const result = await getWeekCalendar(weekStart);

		// Assert: inactive room must not appear in results
		const resultRoomIds = result.map((row) => row.room.id);
		expect(
			resultRoomIds,
			'Inactive room must be absent from getWeekCalendar results'
		).not.toContain(inactiveRoomId);

		// Assert: both active rooms must appear
		expect(resultRoomIds, 'Active room 1 must appear in results').toContain(activeRoomId1);
		expect(resultRoomIds, 'Active room 2 must appear in results').toContain(activeRoomId2);

		// Assert: active room 1 has 1 booking (the active one; cancelled excluded)
		const room1Row = result.find((row) => row.room.id === activeRoomId1);
		expect(
			room1Row?.bookings.length,
			'Active room 1 must have exactly 1 booking (cancelled booking excluded)'
		).toBe(1);
		expect(room1Row?.bookings[0]?.status, "Active room 1 booking status must be 'active'").toBe(
			'active'
		);

		// Assert: active room 2 has 1 booking
		const room2Row = result.find((row) => row.room.id === activeRoomId2);
		expect(room2Row?.bookings.length, 'Active room 2 must have exactly 1 booking').toBe(1);
	});
});

// ---------------------------------------------------------------------------
// 4.2-INT-002 — Week Calendar Read-Model: Index-Backed Query [P1]
// RED PHASE — scaffolded as test.skip(); activate at Task 2.4 after
// 4.2-INT-001 passes. Uses SET enable_seqscan = off to probe the planner.
// ---------------------------------------------------------------------------

describe('Story 4.2 — Week Calendar Read-Model: Index-Backed Query (P1)', () => {
	test('[P1] 4.2-INT-002 — EXPLAIN ANALYZE confirms GiST index is usable for range-overlap query (R-007)', async () => {
		// Activate at Task 2.4 after 4.2-INT-001 passes.
		//
		// Strategy: SET enable_seqscan = off forces the planner to use an index if any
		// applicable one exists. If a Seq Scan still appears after this SET, the composite
		// GiST index (room_id, during) cannot serve the during-only query — trigger the
		// migration fallback in Task 2.4.
		//
		// MUST use a dedicated client (pool.connect()) so SET + EXPLAIN run on the same
		// connection. pool.query() may assign different connections per call.
		//
		// AC-2 (R-007 mitigation): GiST index is usable for the tstzrange && range-overlap query.
		// If this fails: add migration drizzle/0008_booking_gist_index.sql (see Dev Notes §GiST Index).

		const client = await pool.connect();
		try {
			await client.query('SET enable_seqscan = off');
			const explainResult = await client.query<{ 'QUERY PLAN': string }>(`
        EXPLAIN (ANALYZE, FORMAT TEXT)
        SELECT * FROM bookings
        WHERE during && tstzrange(
          '2026-07-14 00:00:00+07'::timestamptz,
          '2026-07-21 00:00:00+07'::timestamptz,
          '[)'
        )
        AND status != 'cancelled'
      `);
			const plan = explainResult.rows.map((r) => r['QUERY PLAN']).join('\n');
			// Positive assertion: planner chose an index-based strategy (Index Scan or Bitmap Index Scan).
			// If this fails even with enable_seqscan=off, the index is not usable for this access pattern
			// → add migration 0008_booking_gist_index.sql (see §GiST Index in Dev Notes).
			expect(
				plan,
				'GiST index must be usable for during && range query (enable_seqscan=off, planner must pick Index Scan)'
			).toMatch(/Index Scan|Bitmap.*Index/i);
		} finally {
			// Reset the session-level GUC before returning the connection to the pool
			// so subsequent tests that reuse this connection are not affected.
			await client.query('RESET enable_seqscan');
			client.release();
		}
	});
});

// ===========================================================================
// STORY 4.4 — Create a Booking (Conflict-Free)
// GREEN PHASE: All tests are active (test()) — activated during feat(4.4) implementation.
// ---------------------------------------------------------------------------
// AC-2: createBooking with full expanded input persists all columns
// AC-4: registration_enabled + registration_closes_at columns written correctly
// AC-6: bookings.id is UUID v7 (text string, not integer)
// ===========================================================================

// ---------------------------------------------------------------------------
// 4.4-INT-001 — createBooking with full expanded input persists all columns [P0]
// Activation condition: Task 2 (schema) + Task 5 (expanded createBooking) complete.
// ---------------------------------------------------------------------------

describe('Story 4.4 — createBooking Full Input: All Columns Persist (AC-1, AC-2, AC-4, AC-6)', () => {
	test('[P0] 4.4-INT-001 — createBooking with full expanded input persists eventName, agenda, cateringEnabled, registrationEnabled, and id is a UUID v7 string', async () => {
		// ACTIVE — createBooking accepts full expanded input (eventName, agenda, cateringEnabled,
		// registrationEnabled, registrationClosesAt). Activated at Task 5; passing per feat(4.4).
		//
		// AC-1: expanded form fields (eventName, agenda, catering, registration) are written to DB.
		// AC-6: bookings.id is now a UUID v7 text string, not an integer serial.
		//
		// Strategy:
		//   1. Seed a room and organizer.
		//   2. Call createBooking() with full expanded input including eventName, agenda,
		//      cateringEnabled=true, registrationEnabled=false.
		//   3. Assert the returned booking has id as a non-empty string (UUID v7).
		//   4. Assert eventName, agenda, cateringEnabled are persisted (read back from DB).
		//
		// Dynamic import is required because the expanded service module does not exist yet.
		// Using cast to unknown to avoid compile-time type errors in red phase (module
		// signature will change in Task 5 — this cast is intentional for red-phase scaffold).

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-4.4-int-001');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		// Full expanded input — matches Task 5 CreateBookingInput shape
		const input = {
			startAt: '2026-08-01T09:00:00.000Z',
			endAt: '2026-08-01T10:00:00.000Z',
			eventName: 'Annual Conference 4.4-INT-001',
			agenda: 'Morning session agenda',
			cateringEnabled: true,
			registrationEnabled: false
		};

		const booking = await createBooking(actorId, roomId, input);

		// AC-6: id must be a UUID v7 string (not a number)
		expect(typeof booking.id, 'booking.id must be a string (UUID v7)').toBe('string');
		expect(booking.id, 'booking.id must be non-empty').toBeTruthy();
		// UUID v7 format: starts with a time component; 36 chars total for standard UUID format.
		// The uuidv7() package produces standard 8-4-4-4-12 hyphenated UUID.
		expect(booking.id.length, 'UUID v7 id must be 36 characters').toBe(36);

		// Assert persisted columns (read back from DB to confirm insert succeeded)
		const result = await pool.query<{
			id: string;
			event_name: string;
			agenda: string | null;
			catering_enabled: boolean;
			registration_enabled: boolean;
			organizer_id: string;
		}>(
			'SELECT id, event_name, agenda, catering_enabled, registration_enabled, organizer_id FROM bookings WHERE id = $1',
			[booking.id]
		);

		expect(result.rows.length, 'booking row must exist in DB').toBe(1);
		const row = result.rows[0]!;
		expect(row.event_name, 'event_name must be persisted').toBe(input.eventName);
		expect(row.agenda, 'agenda must be persisted').toBe(input.agenda);
		expect(row.catering_enabled, 'catering_enabled must be persisted as true').toBe(true);
		expect(row.registration_enabled, 'registration_enabled must be false').toBe(false);
		expect(row.organizer_id, 'organizer_id must be the actorId').toBe(actorId);
	});
});

// ---------------------------------------------------------------------------
// 4.4-INT-002 — createBooking with registrationEnabled=true persists registrationClosesAt [P0]
// Activation condition: Task 2 (schema) + Task 5 (expanded createBooking) complete.
// ---------------------------------------------------------------------------

describe('Story 4.4 — createBooking Registration Columns (AC-4)', () => {
	test('[P0] 4.4-INT-002 — createBooking with registrationEnabled=true and registrationClosesAt persists correctly', async () => {
		// ACTIVE — createBooking accepts full expanded input (registrationEnabled, registrationClosesAt).
		// Activated at Task 5; passing per feat(4.4).
		//
		// AC-4: registration_enabled and registration_closes_at columns are written.
		// Out-of-scope for 4.4: token/link generation (belongs to Story 4.5).
		//
		// Strategy:
		//   1. Seed a room and organizer.
		//   2. Call createBooking() with registrationEnabled=true and registrationClosesAt set.
		//   3. Read back from DB and assert both columns are persisted.
		//   4. Assert registrationClosesAt is stored as a valid timestamptz (not null).

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-4.4-int-002');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const registrationClosesAt = '2026-07-28T17:00:00.000Z';

		const input = {
			startAt: '2026-08-02T09:00:00.000Z',
			endAt: '2026-08-02T10:00:00.000Z',
			eventName: 'Registration Test Event 4.4-INT-002',
			cateringEnabled: false,
			registrationEnabled: true,
			registrationClosesAt
		};

		const booking = await createBooking(actorId, roomId, input);

		expect(booking.id, 'booking must be created').toBeTruthy();

		// Read back registration columns from DB
		const result = await pool.query<{
			registration_enabled: boolean;
			registration_closes_at: Date | null;
		}>('SELECT registration_enabled, registration_closes_at FROM bookings WHERE id = $1', [
			booking.id
		]);

		expect(result.rows.length, 'booking row must exist in DB').toBe(1);
		const row = result.rows[0]!;
		expect(row.registration_enabled, 'registration_enabled must be true').toBe(true);
		expect(row.registration_closes_at, 'registration_closes_at must not be null').not.toBeNull();

		// Verify it stores the correct timestamp (within 1 second tolerance for timezone conversion)
		const storedTime = new Date(row.registration_closes_at!).getTime();
		const expectedTime = new Date(registrationClosesAt).getTime();
		expect(
			Math.abs(storedTime - expectedTime),
			'registration_closes_at must match the provided ISO datetime (within 1s)'
		).toBeLessThan(1000);
	});
});

// ===========================================================================
// STORY 4.7 — Edit, Cancel, and Duplicate a Booking
// RED PHASE: All tests are test.skip() — activate task-by-task during implementation.
// ---------------------------------------------------------------------------
// AC-1: Edit re-checks conflicts via EXCLUDE constraint; non-owner → 403
// AC-2: Cancel sets status='cancelled'; EXCLUDE predicate frees the slot automatically
// AC-3: Duplicate pre-fills /bookings/new?from=[id]; startAt/endAt intentionally blank
// AC-4: Ownership guard (requireUser + assertOwner) on all mutations; IDOR tests required
// ===========================================================================

// ---------------------------------------------------------------------------
// 4.7-INT-001 — edit changes eventName → DB reflects new value [P0]
// Activation condition: Task 1 (updateBooking service method) complete.
// ---------------------------------------------------------------------------

describe('Story 4.7 — Edit Booking: DB Update (AC-1)', () => {
	test.skip('[P0] 4.7-INT-001 — updateBooking changes eventName and DB reflects new value', async () => {
		// THIS TEST WILL FAIL until updateBooking() is implemented in booking-service.ts.
		// Activate at Task 1.2 → run → expect FAIL → implement updateBooking → PASS.
		//
		// AC-1: editing a booking persists changed fields to the bookings table.
		//
		// Strategy:
		//   1. Seed a room and organizer (owner).
		//   2. Call createBooking() to create the initial booking.
		//   3. Call updateBooking(actorId, bookingId, { ...same slot, eventName: 'Updated Name' }).
		//   4. Read the row back from DB via direct SQL.
		//   5. Assert event_name in DB equals 'Updated Name'.
		//
		// Note: edit self-conflict is a non-issue — Postgres EXCLUDE checks new row against
		// OTHER rows, not itself. No "exclude self" workaround needed.
		//
		// No Thai text — per project rule; Rawinan handles all Thai translations.

		const { createBooking, updateBooking } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-4.7-int-001');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-09-01T09:00:00.000Z',
			endAt: '2026-09-01T10:00:00.000Z',
			eventName: 'Original Event Name 4.7-INT-001',
			cateringEnabled: false,
			registrationEnabled: false
		};

		// Step 1: create initial booking
		const booking = await createBooking(actorId, roomId, input);
		expect(booking.id, 'Initial booking must be created').toBeTruthy();

		// Step 2: update the booking with a new eventName (same slot — self-conflict not triggered)
		const updated = await updateBooking(actorId, booking.id, {
			...input,
			eventName: 'Updated Event Name 4.7-INT-001'
		});
		expect(updated.id, 'updateBooking must return the updated booking').toBeTruthy();

		// Step 3: read back from DB and assert the change persisted
		const result = await pool.query<{ event_name: string }>(
			'SELECT event_name FROM bookings WHERE id = $1',
			[booking.id]
		);
		expect(result.rows.length, 'booking row must exist in DB after update').toBe(1);
		expect(result.rows[0]!.event_name, 'event_name must reflect the updated value').toBe(
			'Updated Event Name 4.7-INT-001'
		);
	});
});

// ---------------------------------------------------------------------------
// 4.7-INT-002 — edit into occupied slot → ConflictError (422) [P0]
// Activation condition: Task 1 (updateBooking) + Task 1.2 (23P01 cause-chain).
// ---------------------------------------------------------------------------

describe('Story 4.7 — Edit Booking: Conflict Detection (AC-1)', () => {
	test.skip('[P0] 4.7-INT-002 — updateBooking into an occupied slot raises ConflictError (same 23P01 path as createBooking)', async () => {
		// THIS TEST WILL FAIL until updateBooking() catches 23P01 and throws ConflictError.
		// Activate at Task 1.2 → run → expect FAIL → implement cause-chain catch → PASS.
		//
		// AC-1: edit re-checks conflicts via the same EXCLUDE constraint path as createBooking.
		//       The service must walk the DrizzleQueryError cause chain identically.
		//
		// Strategy:
		//   1. Seed room + two organizers (ownerA, ownerB).
		//   2. ownerA creates booking A for slot 10:00–11:00.
		//   3. ownerB creates booking B for slot 13:00–14:00 (no conflict yet).
		//   4. ownerB calls updateBooking to move booking B to 10:00–11:00 (same as A) → must throw ConflictError.
		//   5. Assert thrown instanceof ConflictError with statusCode 422.

		const { createBooking, updateBooking, ConflictError } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let ownerA: string;
		let ownerB: string;
		try {
			roomId = await seedRoom(client, 'test-4.7-int-002');
			ownerA = seedOrganizer();
			ownerB = seedOrganizer();
		} finally {
			client.release();
		}

		// Step 1: ownerA books 10:00–11:00
		await createBooking(ownerA, roomId, {
			startAt: '2026-09-02T10:00:00.000Z',
			endAt: '2026-09-02T11:00:00.000Z',
			eventName: 'Owner A Booking 4.7-INT-002',
			cateringEnabled: false,
			registrationEnabled: false
		});

		// Step 2: ownerB books 13:00–14:00 (no conflict)
		const bookingB = await createBooking(ownerB, roomId, {
			startAt: '2026-09-02T13:00:00.000Z',
			endAt: '2026-09-02T14:00:00.000Z',
			eventName: 'Owner B Booking 4.7-INT-002',
			cateringEnabled: false,
			registrationEnabled: false
		});

		// Step 3: ownerB tries to move booking B into ownerA's slot → ConflictError
		let thrown: unknown = null;
		try {
			await updateBooking(ownerB, bookingB.id, {
				startAt: '2026-09-02T10:00:00.000Z',
				endAt: '2026-09-02T11:00:00.000Z',
				eventName: 'Owner B Booking 4.7-INT-002 (moved)',
				cateringEnabled: false,
				registrationEnabled: false
			});
		} catch (err: unknown) {
			thrown = err;
		}

		expect(thrown, 'updateBooking must throw when moving into an occupied slot').not.toBeNull();
		expect(
			thrown instanceof ConflictError,
			`Expected ConflictError but got: ${Object.prototype.toString.call(thrown)}`
		).toBe(true);
		const conflictErr = thrown as InstanceType<typeof ConflictError>;
		expect(conflictErr.statusCode, 'ConflictError.statusCode must be 422').toBe(422);
		expect(conflictErr.key, 'ConflictError.key must be booking_conflict_error').toBe(
			'booking_conflict_error'
		);
	});
});

// ---------------------------------------------------------------------------
// 4.7-INT-003 — cancel sets status='cancelled'; slot is then re-bookable [P0]
// Activation condition: Task 1 (cancelBooking service method) complete.
// ---------------------------------------------------------------------------

describe("Story 4.7 — Cancel Booking: Slot Freed (AC-2, EXCLUDE predicate 'status<>cancelled')", () => {
	test.skip("[P0] 4.7-INT-003 — cancelBooking sets status='cancelled'; EXCLUDE predicate frees slot for a new active booking", async () => {
		// THIS TEST WILL FAIL until cancelBooking() is implemented in booking-service.ts.
		// Activate at Task 1.3 → run → expect FAIL → implement cancelBooking → PASS.
		//
		// AC-2: cancel sets status = 'cancelled'. The EXCLUDE predicate is
		//       WHERE status <> 'cancelled', so a cancelled booking no longer blocks new bookings.
		//       getWeekCalendar also filters status != 'cancelled' — slot is freed with no schema change.
		//
		// Strategy:
		//   1. Seed room + organizer.
		//   2. createBooking for slot 10:00–11:00 (booking A, active).
		//   3. cancelBooking(actorId, bookingA.id) — sets status='cancelled'.
		//   4. Assert bookingA.status === 'cancelled' in DB.
		//   5. createBooking for same slot (booking B) — must SUCCEED (cancelled A is out of EXCLUDE scope).
		//   6. Assert booking B exists with status='active'.
		//
		// This mirrors the 4.1-CONC-001 pattern for slot re-use after cancellation.

		const { createBooking, cancelBooking } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-4.7-int-003');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const slotStart = '2026-09-03T10:00:00.000Z';
		const slotEnd = '2026-09-03T11:00:00.000Z';

		// Step 1: create initial active booking
		const bookingA = await createBooking(actorId, roomId, {
			startAt: slotStart,
			endAt: slotEnd,
			eventName: 'Booking A to Cancel 4.7-INT-003',
			cateringEnabled: false,
			registrationEnabled: false
		});
		expect(bookingA.id, 'Booking A must be created').toBeTruthy();

		// Step 2: cancel booking A
		await cancelBooking(actorId, bookingA.id);

		// Step 3: verify status is 'cancelled' in DB
		const checkA = await pool.query<{ status: string }>(
			'SELECT status FROM bookings WHERE id = $1',
			[bookingA.id]
		);
		expect(checkA.rows.length, 'Booking A must still exist in DB after cancel').toBe(1);
		expect(checkA.rows[0]!.status, "Booking A status must be 'cancelled'").toBe('cancelled');

		// Step 4: re-book the same slot — must succeed (cancelled row is outside EXCLUDE scope)
		let thrown: unknown = null;
		let bookingB: { id: unknown; status: unknown } | null = null;
		try {
			bookingB = await createBooking(actorId, roomId, {
				startAt: slotStart,
				endAt: slotEnd,
				eventName: 'Booking B After Cancel 4.7-INT-003',
				cateringEnabled: false,
				registrationEnabled: false
			});
		} catch (err: unknown) {
			thrown = err;
		}

		expect(
			thrown,
			`createBooking must NOT throw after cancel — EXCLUDE predicate excludes 'cancelled' rows — got: ${String(thrown)}`
		).toBeNull();
		expect(bookingB, 'Booking B must be created after cancellation of A').not.toBeNull();
		expect(bookingB?.id, 'Booking B must have an id').toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// 4.7-INT-004 — non-owner cannot edit (assertOwner → 403-equivalent) [P0]
// Activation condition: Task 1.2 (updateBooking) + assertOwner guard on edit action.
// ---------------------------------------------------------------------------

describe('Story 4.7 — Edit Booking: Ownership Guard (AC-4)', () => {
	test.skip('[P0] 4.7-INT-004 — non-owner cannot edit a booking (assertOwner throws 403-equivalent error)', async () => {
		// THIS TEST WILL FAIL until updateBooking() enforces ownership via assertOwner.
		// Activate at Task 1.2 + Task 3 (edit action guards) → run → expect FAIL → implement → PASS.
		//
		// AC-4: assertOwner(event, booking.organizerId) must reject a non-owner actor.
		// IDOR negative test: a second organizer (non-owner) must NOT be able to mutate another's booking.
		//
		// Strategy:
		//   1. Seed room + two organizers (owner, nonOwner).
		//   2. owner creates a booking.
		//   3. nonOwner calls updateBooking(nonOwner, bookingId, ...) → must throw an error with status 403.
		//   4. Assert the thrown error has statusCode 403 (or equivalent SvelteKit HttpError).
		//   5. Assert the DB row is UNCHANGED (eventName still equals the original).
		//
		// Note: assertOwner in guards.ts throws error(403) — a SvelteKit HttpError. The service
		// layer does not call assertOwner directly; this guard runs at the route action layer.
		// For a pure service-level IDOR test, the updateBooking implementation must either:
		//   a) Accept an assertOwner check in the route action (HTTP level), or
		//   b) Verify organizerId matches actorId inside the service itself.
		// Check the story Dev Notes for the chosen approach and adjust this test accordingly
		// during activation (the stub documents the intent).

		const { createBooking, updateBooking } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let owner: string;
		let nonOwner: string;
		try {
			roomId = await seedRoom(client, 'test-4.7-int-004');
			owner = seedOrganizer();
			nonOwner = seedOrganizer();
		} finally {
			client.release();
		}

		// Step 1: owner creates a booking
		const booking = await createBooking(owner, roomId, {
			startAt: '2026-09-04T09:00:00.000Z',
			endAt: '2026-09-04T10:00:00.000Z',
			eventName: 'Owner Booking 4.7-INT-004',
			cateringEnabled: false,
			registrationEnabled: false
		});

		// Step 2: nonOwner attempts to update the booking → must be rejected
		let thrown: unknown = null;
		try {
			await updateBooking(nonOwner, booking.id, {
				startAt: '2026-09-04T09:00:00.000Z',
				endAt: '2026-09-04T10:00:00.000Z',
				eventName: 'Hijacked Event Name 4.7-INT-004',
				cateringEnabled: false,
				registrationEnabled: false
			});
		} catch (err: unknown) {
			thrown = err;
		}

		expect(thrown, 'updateBooking must throw when called by a non-owner actor').not.toBeNull();

		// Assert DB row is unchanged
		const result = await pool.query<{ event_name: string }>(
			'SELECT event_name FROM bookings WHERE id = $1',
			[booking.id]
		);
		expect(result.rows[0]!.event_name, 'DB event_name must be unchanged after IDOR attempt').toBe(
			'Owner Booking 4.7-INT-004'
		);
	});
});

// ---------------------------------------------------------------------------
// 4.7-INT-005 — non-owner cannot cancel [P0]
// Activation condition: Task 1.3 (cancelBooking) + assertOwner guard on cancel action.
// ---------------------------------------------------------------------------

describe('Story 4.7 — Cancel Booking: Ownership Guard (AC-4)', () => {
	test.skip('[P0] 4.7-INT-005 — non-owner cannot cancel a booking (assertOwner denies and status remains active)', async () => {
		// THIS TEST WILL FAIL until cancelBooking() enforces ownership.
		// Activate at Task 1.3 + Task 2 (cancel action guards) → run → expect FAIL → implement → PASS.
		//
		// AC-4: non-owner must NOT be able to cancel another organizer's booking.
		// IDOR negative test: parallel to INT-004 for the cancel operation.
		//
		// Strategy:
		//   1. Seed room + two organizers (owner, nonOwner).
		//   2. owner creates a booking.
		//   3. nonOwner calls cancelBooking(nonOwner, bookingId) → must throw.
		//   4. Assert DB status remains 'active' (booking was NOT cancelled).

		const { createBooking, cancelBooking } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let owner: string;
		let nonOwner: string;
		try {
			roomId = await seedRoom(client, 'test-4.7-int-005');
			owner = seedOrganizer();
			nonOwner = seedOrganizer();
		} finally {
			client.release();
		}

		// Step 1: owner creates a booking
		const booking = await createBooking(owner, roomId, {
			startAt: '2026-09-05T09:00:00.000Z',
			endAt: '2026-09-05T10:00:00.000Z',
			eventName: 'Owner Booking 4.7-INT-005',
			cateringEnabled: false,
			registrationEnabled: false
		});

		// Step 2: nonOwner attempts to cancel the booking → must be rejected
		let thrown: unknown = null;
		try {
			await cancelBooking(nonOwner, booking.id);
		} catch (err: unknown) {
			thrown = err;
		}

		expect(thrown, 'cancelBooking must throw when called by a non-owner actor').not.toBeNull();

		// Assert DB status is still 'active' (cancel was NOT applied)
		const result = await pool.query<{ status: string }>(
			'SELECT status FROM bookings WHERE id = $1',
			[booking.id]
		);
		expect(result.rows[0]!.status, "DB status must remain 'active' after IDOR cancel attempt").toBe(
			'active'
		);
	});
});

// ---------------------------------------------------------------------------
// 4.7-INT-006 — duplicate pre-fill loads correct field values from source booking [P1]
// Activation condition: Task 1.1 (getBookingById) + Task 5 (?from= pre-fill in load).
// ---------------------------------------------------------------------------

describe('Story 4.7 — Duplicate Pre-Fill: Correct Field Values (AC-3)', () => {
	test.skip('[P1] 4.7-INT-006 — getBookingById returns correct fields for duplicate pre-fill; startAt/endAt intentionally not pre-filled', async () => {
		// THIS TEST WILL FAIL until getBookingById() is implemented in booking-service.ts.
		// Activate at Task 1.1 → run → expect FAIL → implement getBookingById → PASS.
		//
		// AC-3: Duplicate pre-fills /bookings/new with room, eventName, agenda, catering, and
		//       registration fields. startAt/endAt are intentionally NOT pre-filled (blank).
		//
		// Strategy:
		//   1. Seed room + organizer.
		//   2. createBooking with full expanded input (eventName, agenda, cateringEnabled,
		//      registrationEnabled).
		//   3. Call getBookingById(bookingId).
		//   4. Assert all pre-fill fields match: roomId, eventName, agenda, cateringEnabled,
		//      registrationEnabled.
		//   5. Verify the service does NOT return a startAt/endAt in a pre-fill-friendly format
		//      (the during column is a tstzrange — the route load function parses it via
		//      parseTstzrange; this test documents that getBookingById returns the raw row
		//      and the route is responsible for blanking startAt/endAt on duplicate).
		//
		// Note: duplicate is a stateless GET — no new DB write. This test only verifies the
		// data-fetch layer (getBookingById). The route-level pre-fill logic (Task 5) is
		// covered by E2E-003.

		const { createBooking, getBookingById } =
			await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-4.7-int-006');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		// Create a booking with full expanded fields
		const booking = await createBooking(actorId, roomId, {
			startAt: '2026-09-06T09:00:00.000Z',
			endAt: '2026-09-06T10:00:00.000Z',
			eventName: 'Source Booking 4.7-INT-006',
			agenda: 'Morning session agenda for duplication test',
			cateringEnabled: true,
			registrationEnabled: false
		});

		// Call getBookingById and assert all pre-fill fields
		const fetched = await getBookingById(booking.id);

		expect(fetched, 'getBookingById must return the booking').not.toBeUndefined();
		expect(fetched?.id, 'fetched booking id must match').toBe(booking.id);
		expect(fetched?.roomId, 'roomId must match source booking').toBe(roomId);
		expect(fetched?.eventName, 'eventName must match source booking').toBe(
			'Source Booking 4.7-INT-006'
		);
		expect(fetched?.agenda, 'agenda must match source booking').toBe(
			'Morning session agenda for duplication test'
		);
		expect(fetched?.cateringEnabled, 'cateringEnabled must match source booking').toBe(true);
		expect(fetched?.registrationEnabled, 'registrationEnabled must match source booking').toBe(
			false
		);
		// The during column is a tstzrange string — the route uses parseTstzrange to convert it.
		// getBookingById returns the raw row; this field exists but is the raw DB value.
		expect(
			fetched?.during,
			'during (tstzrange) must be present for route-layer parsing'
		).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// 4.4-INT-003 — createBooking with registrationEnabled=true but no registrationClosesAt [P1]
// Activation condition: Task 2 (schema) + Task 5 (expanded createBooking) complete.
// ---------------------------------------------------------------------------

describe('Story 4.4 — createBooking Registration Without ClosesAt (Schema Boundary)', () => {
	test('[P1] 4.4-INT-003 — createBooking with registrationEnabled=true but no registrationClosesAt succeeds at service level (validation is route-layer responsibility)', async () => {
		// ACTIVE — createBooking accepts registrationEnabled=true without registrationClosesAt.
		// Activated at Task 5; passing per feat(4.4).
		//
		// Scope boundary: the registrationClosesAt-required-when-enabled rule is enforced
		// at the route layer via BookingSchema (Valibot cross-field check in Task 4).
		// The service itself does NOT re-validate this constraint — it accepts the input as-is.
		// This test documents and verifies that boundary: the service succeeds even when
		// registrationClosesAt is absent with registrationEnabled=true.
		//
		// This is intentional — the service trusts the route has already validated.
		// Tests for the Valibot schema cross-field check belong in unit tests for booking.ts schema.
		//
		// Strategy:
		//   1. Call createBooking() with registrationEnabled=true and no registrationClosesAt.
		//   2. Assert it does NOT throw (service-layer passes; validation is route's job).
		//   3. Assert registration_closes_at is null in the DB.

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-4.4-int-003');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-08-03T09:00:00.000Z',
			endAt: '2026-08-03T10:00:00.000Z',
			eventName: 'No ClosesAt Test 4.4-INT-003',
			cateringEnabled: false,
			registrationEnabled: true
			// registrationClosesAt intentionally omitted
		};

		let thrown: unknown = null;
		let booking: Awaited<ReturnType<typeof createBooking>> | null = null;
		try {
			booking = await createBooking(actorId, roomId, input);
		} catch (err: unknown) {
			thrown = err;
		}

		// Service must NOT throw (validation is the route's responsibility, not the service's)
		expect(
			thrown,
			'createBooking must not throw when registrationClosesAt is absent — service trusts route validation'
		).toBeNull();
		expect(booking, 'booking must be returned').not.toBeNull();

		// registration_closes_at must be null (nothing was provided)
		const result = await pool.query<{
			registration_closes_at: Date | null;
		}>('SELECT registration_closes_at FROM bookings WHERE id = $1', [booking!.id]);

		expect(result.rows.length, 'booking row must exist in DB').toBe(1);
		expect(
			result.rows[0]!.registration_closes_at,
			'registration_closes_at must be null when not provided'
		).toBeNull();
	});
});
