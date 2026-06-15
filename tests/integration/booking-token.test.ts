/**
 * ATDD Red-Phase Integration Scaffolds — Story 4.5: Booking Confirmation Registration Link & QR
 *
 * STATUS: TDD RED PHASE — All tests marked test.skip() — activate task-by-task during implementation.
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
 *   4. Implement the feature (per task in story 4.5).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: Token generated and persisted when registrationEnabled = true; null when false
 *   - AC-1: Token is a 64-char lowercase hex string (32-byte CSPRNG)
 *   - AC-1: Token unique per booking (UNIQUE constraint enforces at DB level)
 *   - Task 6: getBookingById returns correct booking by id; returns null for unknown id
 *
 * Scenario IDs (Story 4.5):
 *   P1:
 *   - IT-001 [P1]: Token generated and persisted when registrationEnabled = true
 *   - IT-002 [P1]: Token is null when registrationEnabled = false
 *   - IT-003 [P1]: Token is unique across multiple bookings
 *   - IT-004 [P1]: getBookingById returns booking by id
 *   - IT-005 [P1]: getBookingById returns null for unknown id
 *
 * Activation order (story 4.5 tasks):
 *   Task 1+2+3+5: activate IT-001, IT-002, IT-003 — DB migration + schema + token generation
 *   Task 6: activate IT-004, IT-005 — getBookingById query
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - drizzle-kit migrate has run (0009_booking_registration_token.sql migration applied)
 *   - Story 4.5 implemented: createBooking updated with token generation; getBookingById added
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   All string assertions use English mock data.
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
async function seedRoom(client: pg.PoolClient, prefix = 'test-booking-token'): Promise<string> {
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
 * Returns a deterministic actor ID for integration tests.
 * audit_log.actor_id is plain text (no FK) — no DB insert required.
 */
function seedOrganizer(): string {
	return randomUUID();
}

// ---------------------------------------------------------------------------
// IT-001 — Token generated and persisted when registrationEnabled = true [P1]
// Activation condition: Tasks 1 (DB migration), 2 (schema), 3 (qrcode install), 5 (token generation) complete.
// ---------------------------------------------------------------------------

describe('Story 4.5 — Token Generation (AC-1)', () => {
	test.skip('[P1] IT-001 — token generated and persisted when registrationEnabled = true', async () => {
		// THIS TEST WILL FAIL until:
		//   Task 1 (0009_booking_registration_token.sql migration), Task 2 (schema column),
		//   and Task 5 (generateRegistrationToken + createBooking update) are complete.
		//
		// AC-1: A 32-byte CSPRNG token is generated and stored plaintext in bookings.registration_token.
		// The token must be a 64-character lowercase hex string.
		//
		// Strategy:
		//   1. Seed a room and organizer via direct SQL.
		//   2. Call createBooking() with registrationEnabled = true.
		//   3. Assert booking.registrationToken is a 64-char lowercase hex string.
		//   4. Assert the DB row has a matching registration_token value.

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-it-001');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-07-20T09:00:00.000Z',
			endAt: '2026-07-20T10:00:00.000Z',
			eventName: 'Registration Token Test IT-001',
			cateringEnabled: false,
			registrationEnabled: true,
			registrationClosesAt: '2026-07-19T23:59:59.000Z'
		};

		const booking = await createBooking(actorId, roomId, input);

		// AC-1: registrationToken must be set (not null)
		expect(
			booking.registrationToken,
			'Token must not be null when registrationEnabled=true'
		).not.toBeNull();

		// AC-1: token must be a 64-char lowercase hex string (32 bytes = 256 bits entropy)
		expect(booking.registrationToken).toMatch(
			/^[0-9a-f]{64}$/,
			'Token must be a 64-char lowercase hex string'
		);

		// AC-1: verify the token is persisted in the database
		const dbResult = await pool.query<{ registration_token: string | null }>(
			`SELECT registration_token FROM bookings WHERE id = $1`,
			[booking.id]
		);
		expect(dbResult.rows).toHaveLength(1);
		expect(dbResult.rows[0]?.registration_token).toBe(booking.registrationToken);
	});
});

// ---------------------------------------------------------------------------
// IT-002 — Token is null when registrationEnabled = false [P1]
// Activation condition: Tasks 1, 2, 5 complete.
// ---------------------------------------------------------------------------

describe('Story 4.5 — Token Null When Registration Disabled (AC-1)', () => {
	test.skip('[P1] IT-002 — registrationToken is null when registrationEnabled = false', async () => {
		// THIS TEST WILL FAIL until Tasks 1, 2, 5 are complete.
		//
		// AC-1: When registrationEnabled = false, registration_token must be null.
		//
		// Strategy:
		//   1. Seed a room and organizer.
		//   2. Call createBooking() with registrationEnabled = false.
		//   3. Assert booking.registrationToken is null.
		//   4. Assert the DB row has registration_token = null.

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-it-002');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-07-21T09:00:00.000Z',
			endAt: '2026-07-21T10:00:00.000Z',
			eventName: 'No Registration Token Test IT-002',
			cateringEnabled: false,
			registrationEnabled: false
		};

		const booking = await createBooking(actorId, roomId, input);

		// AC-1: registrationToken must be null when registrationEnabled = false
		expect(
			booking.registrationToken,
			'Token must be null when registrationEnabled=false'
		).toBeNull();

		// Verify the DB row also has null
		const dbResult = await pool.query<{ registration_token: string | null }>(
			`SELECT registration_token FROM bookings WHERE id = $1`,
			[booking.id]
		);
		expect(dbResult.rows).toHaveLength(1);
		expect(dbResult.rows[0]?.registration_token).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// IT-003 — Token is unique across multiple bookings [P1]
// Activation condition: Tasks 1, 2, 5 complete.
// ---------------------------------------------------------------------------

describe('Story 4.5 — Token Uniqueness (AC-1)', () => {
	test.skip('[P1] IT-003 — registration tokens are unique across multiple bookings', async () => {
		// THIS TEST WILL FAIL until Tasks 1, 2, 5 are complete.
		//
		// AC-1: Token is unique per booking (UNIQUE constraint enforces at DB level).
		// The CSPRNG guarantees uniqueness with overwhelming probability; the DB UNIQUE
		// index provides the hard guarantee.
		//
		// Strategy:
		//   1. Seed a room and organizer.
		//   2. Create two bookings with registrationEnabled = true for different time slots.
		//   3. Assert tokens are both non-null 64-char hex strings.
		//   4. Assert the two tokens are different values.

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-it-003');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const inputA = {
			startAt: '2026-07-22T09:00:00.000Z',
			endAt: '2026-07-22T10:00:00.000Z',
			eventName: 'Unique Token Test IT-003 Booking A',
			cateringEnabled: false,
			registrationEnabled: true,
			registrationClosesAt: '2026-07-21T23:59:59.000Z'
		};

		const inputB = {
			startAt: '2026-07-22T11:00:00.000Z',
			endAt: '2026-07-22T12:00:00.000Z',
			eventName: 'Unique Token Test IT-003 Booking B',
			cateringEnabled: false,
			registrationEnabled: true,
			registrationClosesAt: '2026-07-21T23:59:59.000Z'
		};

		const bookingA = await createBooking(actorId, roomId, inputA);
		const bookingB = await createBooking(actorId, roomId, inputB);

		// Both tokens must be non-null 64-char lowercase hex strings
		expect(bookingA.registrationToken).toMatch(/^[0-9a-f]{64}$/);
		expect(bookingB.registrationToken).toMatch(/^[0-9a-f]{64}$/);

		// Tokens must be different values
		expect(bookingA.registrationToken).not.toBe(bookingB.registrationToken);
	});
});

// ---------------------------------------------------------------------------
// IT-004 — getBookingById returns correct booking by id [P1]
// Activation condition: Task 6 (getBookingById query) complete.
// ---------------------------------------------------------------------------

describe('Story 4.5 — getBookingById Query (Task 6)', () => {
	test.skip('[P1] IT-004 — getBookingById returns the correct booking row by id', async () => {
		// THIS TEST WILL FAIL until Task 6 (getBookingById in bookings.ts queries) is complete.
		//
		// Strategy:
		//   1. Seed a room and organizer.
		//   2. Call createBooking() to create a booking with registrationEnabled = true.
		//   3. Call getBookingById(booking.id).
		//   4. Assert the returned booking has same id, eventName, and registrationToken.

		const { createBooking } = await import('../../src/lib/server/services/booking-service.js');
		const { getBookingById } = await import('../../src/lib/server/db/queries/bookings.js');

		const client = await pool.connect();
		let roomId: string;
		let actorId: string;
		try {
			roomId = await seedRoom(client, 'test-it-004');
			actorId = seedOrganizer();
		} finally {
			client.release();
		}

		const input = {
			startAt: '2026-07-23T09:00:00.000Z',
			endAt: '2026-07-23T10:00:00.000Z',
			eventName: 'GetBookingById Test IT-004',
			cateringEnabled: false,
			registrationEnabled: true,
			registrationClosesAt: '2026-07-22T23:59:59.000Z'
		};

		const created = await createBooking(actorId, roomId, input);

		// Retrieve by id
		const fetched = await getBookingById(created.id);

		// Assertions
		expect(fetched, 'getBookingById must return a non-null booking for a valid id').not.toBeNull();
		expect(fetched!.id).toBe(created.id);
		expect(fetched!.eventName).toBe('GetBookingById Test IT-004');
		expect(fetched!.registrationToken).toBe(created.registrationToken);
		expect(fetched!.registrationToken).toMatch(/^[0-9a-f]{64}$/);
	});

	// -------------------------------------------------------------------------
	// IT-005 — getBookingById returns null for unknown id [P1]
	// -------------------------------------------------------------------------

	test.skip('[P1] IT-005 — getBookingById returns null for an unknown id', async () => {
		// THIS TEST WILL FAIL until Task 6 (getBookingById query) is complete.
		//
		// Strategy:
		//   1. Call getBookingById() with a random UUID that has never been inserted.
		//   2. Assert the result is null.

		const { getBookingById } = await import('../../src/lib/server/db/queries/bookings.js');

		const nonexistentId = randomUUID();
		const result = await getBookingById(nonexistentId);

		expect(result, 'getBookingById must return null for an unknown id').toBeNull();
	});
});
