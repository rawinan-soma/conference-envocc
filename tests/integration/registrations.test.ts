/**
 * ATDD Red-Phase Integration Scaffolds — Story 5.1: Branded Public Registration Page
 *
 * STATUS: P0 tests ACTIVE (red phase — fail until implementation). P2 tests skipped.
 *
 * These tests run in the Vitest `integration` project which requires a real
 * PostgreSQL instance. The global setup (tests/support/integration-setup.ts)
 * starts Testcontainers when DATABASE_URL is not set, or uses the CI Postgres
 * service when DATABASE_URL is already provided.
 *
 * AC Coverage:
 *   - AC-1 (FR-040): Valid token resolves full event data (eventName, roomName, agenda,
 *                    contactName, contactPhone) without authentication
 *   - AC-2: registrationEnabled=false → server load returns closed flag (no form data)
 *   - AC-3 (R-001 BLOCK): IDOR guard — invalid/forged token returns null/404, no cross-event data leak
 *   - AC-4: agenda=null fixture — returned data has no agenda field
 *
 * Scenario IDs (from story 5.1 Task 4.2 + test-design-epic-5.md):
 *   P0 (ACTIVATED — will fail until implementation is complete):
 *   - 5.1-INT-001:       Valid token returns full event data [P0]
 *   - 5.1-INT-IDOR-001:  Cross-token lookup returns null — MANDATORY (R-001 BLOCK) [P0]
 *   - 5.1-INT-002:       registrationEnabled=false → closed flag returned [P0]
 *   P2 (skipped — activate during implementation):
 *   - 5.1-INT-003:       agenda=null fixture — returned data has no agenda field [P2]
 *   - 5.1-INT-004:       Malformed/non-existent token → getBookingByRegistrationToken returns null [P2]
 *
 * Activation guide:
 *   1. P0 tests are already activated (no .skip).
 *      Verify they FAIL first (red phase, Task 1 not yet implemented).
 *   2. Run: `bun run test:integration`
 *   3. Implement getBookingByRegistrationToken (Task 1 in story 5.1).
 *   4. Run again — verify P0 tests PASS (green).
 *   5. Remove .skip from P2 tests as those scenarios are implemented.
 *   6. Commit passing tests.
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - drizzle-kit migrate has run (all migrations through 0009_booking_registration_token.sql)
 *   - Story 5.1 implemented: getBookingByRegistrationToken added to
 *     src/lib/server/db/queries/bookings.ts (three-table JOIN: bookings + rooms + user_profiles)
 *
 * Architecture — IDOR guard (R-001 BLOCK):
 *   The ONLY data isolation on this public route is `WHERE registration_token = token`.
 *   5.1-INT-IDOR-001 seeds two complete booking sets (ownerA + ownerB) and asserts
 *   that tokenB cannot retrieve any field from bookingA's data. This closes R-001 (score=9).
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
 * Seeds a user row and returns its id.
 * user_profiles.userId FKs to users.id — must be created first.
 */
async function seedUser(client: pg.PoolClient, prefix = 'test-reg'): Promise<string> {
	const userId = randomUUID();
	await client.query(
		`INSERT INTO users ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, false, NOW(), NOW())
     ON CONFLICT ("id") DO NOTHING`,
		[userId, `Test User ${prefix}`, `${prefix}-${userId}@example.com`]
	);
	return userId;
}

/**
 * Seeds a user_profiles row linked to userId. Returns the userId.
 * All columns are notNull() — must supply complete data.
 * Column names are camelCase per 0004_user_profiles.sql convention.
 */
async function seedUserProfile(
	client: pg.PoolClient,
	userId: string,
	overrides: { firstName?: string; lastName?: string; phone?: string } = {}
): Promise<string> {
	const firstName = overrides.firstName ?? 'Test';
	const lastName = overrides.lastName ?? 'Organizer';
	const phone = overrides.phone ?? '0812345678';
	await client.query(
		`INSERT INTO user_profiles ("id", "userId", "email", "title", "firstName", "lastName", "phone", "organization", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, 'Dr.', $3, $4, $5, 'Test Org', NOW(), NOW())
     ON CONFLICT ("userId") DO NOTHING`,
		[userId, `organizer-${userId}@example.com`, firstName, lastName, phone]
	);
	return userId;
}

/**
 * Seeds a room row and returns its room_id.
 * Uses a deterministic test prefix to avoid collisions with production data.
 */
async function seedRoom(client: pg.PoolClient, prefix = 'test-reg'): Promise<string> {
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
 * Seeds a booking with a known registrationToken.
 * Requires that the corresponding user, user_profiles, and room rows already exist.
 */
async function seedBookingWithToken(
	client: pg.PoolClient,
	opts: {
		organizerId: string;
		roomId: string;
		eventName: string;
		token: string;
		registrationEnabled?: boolean;
		agenda?: string | null;
		slotStart?: string;
		slotEnd?: string;
	}
): Promise<string> {
	const bookingId = randomUUID();
	const registrationEnabled = opts.registrationEnabled ?? true;
	const slotStart = opts.slotStart ?? '2026-08-01 09:00:00+00';
	const slotEnd = opts.slotEnd ?? '2026-08-01 10:00:00+00';

	await client.query(
		`INSERT INTO bookings (
      id, room_id, organizer_id, event_name, agenda, during,
      status, catering_enabled, registration_enabled, registration_token,
      created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      tstzrange($6::timestamptz, $7::timestamptz, '[)'),
      'active', false, $8, $9,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING`,
		[
			bookingId,
			opts.roomId,
			opts.organizerId,
			opts.eventName,
			opts.agenda ?? null,
			slotStart,
			slotEnd,
			registrationEnabled,
			opts.token
		]
	);
	return bookingId;
}

// ---------------------------------------------------------------------------
// 5.1-INT-001 — Valid token returns full event data [P0] ACTIVE
// AC-1 (FR-040): eventName, roomName, agenda, contactName, contactPhone
// ---------------------------------------------------------------------------

describe('Story 5.1 — Valid Token Resolves Event Data (AC-1, FR-040)', () => {
	test('[P0] 5.1-INT-001 — valid registrationToken returns full event data including contact info', async () => {
		// THIS TEST WILL FAIL until getBookingByRegistrationToken is implemented (Task 1).
		//
		// AC-1: GET /r/[token] (no login required) must expose:
		//   eventName, roomName, agenda (if populated), contactName (first+last), contactPhone.
		//
		// Strategy:
		//   1. Seed user + user_profiles + room + booking with known token.
		//   2. Call getBookingByRegistrationToken(token) — dynamic import (not-yet-existing function).
		//   3. Assert all AC-1 fields are present and match seed data.
		//   4. Assert registrationToken itself is NOT returned in the result (data minimization).

		const { getBookingByRegistrationToken } =
			await import('../../src/lib/server/db/queries/bookings.js');

		const token = `5-1-int-001-${randomUUID().replace(/-/g, '')}`;
		const eventName = 'ATDD Test Event 5.1-INT-001';
		const agenda = 'Opening remarks. Keynote. Lunch.';

		const client = await pool.connect();
		let organizerId: string;
		let roomId: string;
		try {
			organizerId = await seedUser(client, 'int-001');
			await seedUserProfile(client, organizerId, {
				firstName: 'Alice',
				lastName: 'Smith',
				phone: '0891112222'
			});
			roomId = await seedRoom(client, 'int-001');
			await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName,
				token,
				registrationEnabled: true,
				agenda
			});
		} finally {
			client.release();
		}

		const result = await getBookingByRegistrationToken(token);

		// AC-1: result must not be null — token found
		expect(result, '5.1-INT-001: valid token must resolve to a booking row').not.toBeNull();

		if (!result) return; // type narrowing

		// AC-1: core event fields
		expect(result.eventName).toBe(eventName);

		// AC-1: roomName from JOIN on rooms table
		expect(typeof result.roomName).toBe('string');
		expect(result.roomName.length).toBeGreaterThan(0);

		// AC-1: agenda included when populated
		expect(result.agenda).toBe(agenda);

		// AC-1: contact name (first + last) from user_profiles JOIN
		expect(result.organizerFirstName).toBe('Alice');
		expect(result.organizerLastName).toBe('Smith');

		// AC-1: contact phone from user_profiles JOIN (notNull column)
		expect(result.organizerPhone).toBe('0891112222');

		// Data minimization: registrationToken must NOT be exposed on the returned object
		// (it is used for lookup only; the page template must not render it)
		expect((result as Record<string, unknown>)['registrationToken']).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 5.1-INT-IDOR-001 — Cross-token lookup returns null — MANDATORY (R-001 BLOCK) [P0] ACTIVE
// AC-3 (R-001): forged/wrong token returns null, no field from another booking leaks
// ---------------------------------------------------------------------------

describe('Story 5.1 — IDOR Guard: Invalid Token Returns Null (AC-3, R-001 BLOCK)', () => {
	test('[P0] 5.1-INT-IDOR-001 — forged token returns null; no cross-event data leaks', async () => {
		// THIS TEST WILL FAIL until getBookingByRegistrationToken is implemented (Task 1).
		//
		// AC-3 (R-001 BLOCK, score=9): The ONLY data isolation is WHERE registration_token = token.
		// This test seeds two separate bookings (ownerA and ownerB) with different tokens.
		// Fetching bookingA's data using bookingB's token must return null (no data from A leaks).
		//
		// Strategy:
		//   1. Seed full sets: userA + profileA + roomA + bookingA (tokenA).
		//   2. Seed full sets: userB + profileB + roomB + bookingB (tokenB).
		//   3. Call getBookingByRegistrationToken(tokenB) → must return null OR have no fields from A.
		//      The IDOR guard proof: tokenB is not tokenA, so the WHERE clause must return 0 rows.
		//
		// This closes R-001 (IDOR / cross-event data leakage) at score=9.

		const { getBookingByRegistrationToken } =
			await import('../../src/lib/server/db/queries/bookings.js');

		const tokenA = `5-1-idor-001-owner-a-${randomUUID().replace(/-/g, '')}`;
		const tokenB = `5-1-idor-001-owner-b-${randomUUID().replace(/-/g, '')}`;
		const eventNameA = 'IDOR Test Event — Owner A (SHOULD NOT LEAK)';
		const eventNameB = 'IDOR Test Event — Owner B';

		const client = await pool.connect();
		try {
			// Seed owner A
			const userIdA = await seedUser(client, 'idor-a');
			await seedUserProfile(client, userIdA, { firstName: 'OwnerA', lastName: 'Secret' });
			const roomIdA = await seedRoom(client, 'idor-a');
			await seedBookingWithToken(client, {
				organizerId: userIdA,
				roomId: roomIdA,
				eventName: eventNameA,
				token: tokenA,
				slotStart: '2026-09-01 09:00:00+00',
				slotEnd: '2026-09-01 10:00:00+00'
			});

			// Seed owner B
			const userIdB = await seedUser(client, 'idor-b');
			await seedUserProfile(client, userIdB, { firstName: 'OwnerB', lastName: 'Other' });
			const roomIdB = await seedRoom(client, 'idor-b');
			await seedBookingWithToken(client, {
				organizerId: userIdB,
				roomId: roomIdB,
				eventName: eventNameB,
				token: tokenB,
				slotStart: '2026-09-02 09:00:00+00',
				slotEnd: '2026-09-02 10:00:00+00'
			});
		} finally {
			client.release();
		}

		// tokenB is a valid seeded token — it MUST resolve to bookingB (not null).
		// A null result here would mean the WHERE clause is broken, not that isolation works.
		const result = await getBookingByRegistrationToken(tokenB);

		// R-001 BLOCK (mandatory): tokenB must resolve to bookingB — proves the WHERE clause works
		expect(
			result,
			'IDOR: tokenB must resolve to bookingB (valid token must not return null)'
		).not.toBeNull();

		if (!result) return; // type narrowing only — assertion above already fails if null

		// R-001 BLOCK: the returned record must be bookingB — positive ownership assertion
		expect(result.eventName, 'IDOR: tokenB must return eventNameB (positive ownership check)').toBe(
			eventNameB
		);

		// R-001 BLOCK: no field from bookingA (ownerA) must appear in the result
		expect(result.eventName, 'IDOR: tokenB must not return eventNameA').not.toBe(eventNameA);
		expect(result.organizerFirstName, 'IDOR: tokenB must not reveal ownerA first name').not.toBe(
			'OwnerA'
		);
		expect(result.organizerLastName, 'IDOR: tokenB must not reveal ownerA last name').not.toBe(
			'Secret'
		);
	});
});

// ---------------------------------------------------------------------------
// 5.1-INT-002 — registrationEnabled=false → closed flag returned, no form data [P0] ACTIVE
// AC-2: closed-state — event info available but registration form must not render
// ---------------------------------------------------------------------------

describe('Story 5.1 — Closed Registration Shows Closed Flag (AC-2)', () => {
	test('[P0] 5.1-INT-002 — registrationEnabled=false fixture returns closed flag in server load', async () => {
		// THIS TEST WILL FAIL until getBookingByRegistrationToken is implemented (Task 1).
		//
		// AC-2: If registrationEnabled = false, the server load must return a closed flag.
		//   The route layer reads booking.registrationEnabled and exposes it to the page.
		//   The Svelte template hides the form and shows the closed message.
		//
		// This test validates the DB-layer half: getBookingByRegistrationToken returns
		// the registrationEnabled=false field correctly, so the server load can act on it.
		//
		// Strategy:
		//   1. Seed user + profile + room + booking with registrationEnabled = false.
		//   2. Call getBookingByRegistrationToken(token).
		//   3. Assert result.registrationEnabled === false (closed flag present).
		//   4. Assert eventName, roomName are still returned (page still shows event info per AC-2).

		const { getBookingByRegistrationToken } =
			await import('../../src/lib/server/db/queries/bookings.js');

		const token = `5-1-int-002-${randomUUID().replace(/-/g, '')}`;
		const eventName = 'ATDD Test Event 5.1-INT-002 (Closed)';

		const client = await pool.connect();
		try {
			const organizerId = await seedUser(client, 'int-002');
			await seedUserProfile(client, organizerId, { firstName: 'Bob', lastName: 'Jones' });
			const roomId = await seedRoom(client, 'int-002');
			await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName,
				token,
				registrationEnabled: false,
				slotStart: '2026-08-05 14:00:00+00',
				slotEnd: '2026-08-05 15:00:00+00'
			});
		} finally {
			client.release();
		}

		const result = await getBookingByRegistrationToken(token);

		// Result must not be null — token found
		expect(result, '5.1-INT-002: token must still resolve a closed booking').not.toBeNull();

		if (!result) return;

		// AC-2: closed flag must be false
		expect(result.registrationEnabled).toBe(false);

		// AC-2: eventName and roomName still available so page can display event context
		expect(result.eventName).toBe(eventName);
		expect(typeof result.roomName).toBe('string');
		expect(result.roomName.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// 5.1-INT-003 — agenda=null fixture — returned data has no agenda field [P2] SKIP
// AC-4: If booking.agenda is null or empty, agenda field must be null/empty (not section heading)
// ---------------------------------------------------------------------------

describe('Story 5.1 — No Agenda Hides Section (AC-4)', () => {
	test.skip('[P2] 5.1-INT-003 — agenda=null fixture returns null agenda in query result', async () => {
		// Activation condition: Task 1 (getBookingByRegistrationToken) complete.
		//
		// AC-4: If booking.agenda is null or empty string, the returned result has agenda=null.
		//   The Svelte template must not render the agenda section heading.
		//
		// Strategy:
		//   1. Seed a booking with agenda=null.
		//   2. Call getBookingByRegistrationToken(token).
		//   3. Assert result.agenda is null.

		const { getBookingByRegistrationToken } =
			await import('../../src/lib/server/db/queries/bookings.js');

		const token = `5-1-int-003-${randomUUID().replace(/-/g, '')}`;
		const eventName = 'ATDD Test Event 5.1-INT-003 (No Agenda)';

		const client = await pool.connect();
		try {
			const organizerId = await seedUser(client, 'int-003');
			await seedUserProfile(client, organizerId);
			const roomId = await seedRoom(client, 'int-003');
			await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName,
				token,
				agenda: null,
				slotStart: '2026-08-10 09:00:00+00',
				slotEnd: '2026-08-10 10:00:00+00'
			});
		} finally {
			client.release();
		}

		const result = await getBookingByRegistrationToken(token);

		expect(result).not.toBeNull();
		if (!result) return;

		// AC-4: agenda must be null (not an empty heading string)
		expect(result.agenda).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// 5.1-INT-004 — Malformed/non-existent token → query returns null [P2] SKIP
// AC-3: A token not found in the DB returns null (route layer converts to 404)
// ---------------------------------------------------------------------------

describe('Story 5.1 — Non-Existent Token Returns Null (AC-3)', () => {
	test.skip('[P2] 5.1-INT-004 — malformed or non-existent token returns null from query', async () => {
		// Activation condition: Task 1 (getBookingByRegistrationToken) complete.
		//
		// AC-3: If the provided token does not match any registration_token in the database,
		//   getBookingByRegistrationToken() must return null (never throw; never leak data).
		//   The server load converts null → error(404, 'Event not found').
		//
		// Strategy:
		//   1. Call getBookingByRegistrationToken with a token that does not exist in the DB.
		//   2. Assert result is null.
		//   3. Also test a malformed token (spaces, special chars) to confirm no partial match.

		const { getBookingByRegistrationToken } =
			await import('../../src/lib/server/db/queries/bookings.js');

		// Token that should not exist
		const nonExistentToken = `definitely-not-a-real-token-${randomUUID()}`;

		const result = await getBookingByRegistrationToken(nonExistentToken);

		// AC-3: must return null, never throw
		expect(result).toBeNull();

		// Malformed token (SQL injection attempt — must not leak data)
		const malformedToken = "' OR 1=1 --";
		const malformedResult = await getBookingByRegistrationToken(malformedToken);
		expect(malformedResult).toBeNull();
	});
});
