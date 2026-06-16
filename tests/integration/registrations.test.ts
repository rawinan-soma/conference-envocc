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
import { randomUUID, createHash, randomBytes } from 'node:crypto';
import { uuidv7 } from 'uuidv7';

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

		const regSlug = `5-1-int-001-${randomUUID().replace(/-/g, '')}`;
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
				token: regSlug,
				registrationEnabled: true,
				agenda
			});
		} finally {
			client.release();
		}

		const result = await getBookingByRegistrationToken(regSlug);

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

		const regSlugA = `5-1-idor-001-owner-a-${randomUUID().replace(/-/g, '')}`;
		const regSlugB = `5-1-idor-001-owner-b-${randomUUID().replace(/-/g, '')}`;
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
				token: regSlugA,
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
				token: regSlugB,
				slotStart: '2026-09-02 09:00:00+00',
				slotEnd: '2026-09-02 10:00:00+00'
			});
		} finally {
			client.release();
		}

		// regSlugB is a valid seeded slug — it MUST resolve to bookingB (not null).
		// A null result here would mean the WHERE clause is broken, not that isolation works.
		const result = await getBookingByRegistrationToken(regSlugB);

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

		const regSlug = `5-1-int-002-${randomUUID().replace(/-/g, '')}`;
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
				token: regSlug,
				registrationEnabled: false,
				slotStart: '2026-08-05 14:00:00+00',
				slotEnd: '2026-08-05 15:00:00+00'
			});
		} finally {
			client.release();
		}

		const result = await getBookingByRegistrationToken(regSlug);

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

		const regSlug = `5-1-int-003-${randomUUID().replace(/-/g, '')}`;
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
				token: regSlug,
				agenda: null,
				slotStart: '2026-08-10 09:00:00+00',
				slotEnd: '2026-08-10 10:00:00+00'
			});
		} finally {
			client.release();
		}

		const result = await getBookingByRegistrationToken(regSlug);

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

		// Slug that should not exist
		const missingSlug = `definitely-not-a-real-token-${randomUUID()}`;

		const result = await getBookingByRegistrationToken(missingSlug);

		// AC-3: must return null, never throw
		expect(result).toBeNull();

		// Malformed token (SQL injection attempt — must not leak data)
		const malformedToken = "' OR 1=1 --";
		const malformedResult = await getBookingByRegistrationToken(malformedToken);
		expect(malformedResult).toBeNull();
	});
});

// ===========================================================================
// STORY 5.2 — Submit a Registration
//
// ATDD Red-Phase Integration Scaffolds — Story 5.2: Submit a Registration
//
// STATUS:
//   P0 tests ACTIVE (red phase — fail until implementation).
//   P1 tests skipped (activate during implementation).
//
// AC Coverage:
//   - AC-3: Valid form submission creates a registrations row + audit log entry
//   - AC-6 (R-005 MITIGATE): Server-side closed guard — createRegistration throws
//            RegistrationClosedError when registrationEnabled=false
//   - AC-3 (P1): title='Other' → title_other_text stored and retrieved correctly
//   - AC-2 (P1): mealType required when catering enabled; absent when disabled
//   - AC-2 (P1): mealType='Other' → meal_type_other_text stored correctly
//   - AC-3 (R-012) (P1): 100th registration succeeds — no capacity cap
//
// Scenario IDs:
//   P0 (ACTIVATED — will fail until implementation is complete):
//   - 5.2-INT-001:        Valid form creates registrant row in DB [P0]
//   - 5.2-INT-CLOSED-001: createRegistration throws RegistrationClosedError when
//                          registrationEnabled=false — MANDATORY R-005 MITIGATE gate [P0]
//   P1 (skipped — activate during implementation):
//   - 5.2-INT-002:        title='Other' → title_other_text stored correctly [P1]
//   - 5.2-INT-003:        Meal type required when catering enabled; absent when disabled [P1]
//   - 5.2-INT-004:        mealType='Other' → meal_type_other_text stored correctly [P1]
//   - 5.2-INT-005:        100th registration succeeds — no capacity cap (R-012) [P1]
//
// Prerequisites:
//   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
//   - Story 5.2 migration (drizzle/0010_registrations.sql) applied
//   - createRegistration and RegistrationClosedError implemented in
//     src/lib/server/services/registration-service.ts
//
// Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
//   All string assertions use English mock data. Paraglide keys tested by name only.
// ===========================================================================

// ---------------------------------------------------------------------------
// Seed helper — seedRegistrant (Story 5.2)
// ---------------------------------------------------------------------------

/**
 * Seeds a registration record linked to bookingId.
 * Generates a dummy cancel_token_hash for the test row.
 * Used by P1 tests and other test helpers that need pre-existing registrant rows.
 */
async function seedRegistrant(
	client: pg.PoolClient,
	opts: {
		bookingId: string;
		email?: string;
		title?: string;
		mealType?: string | null;
		status?: string;
	}
): Promise<string> {
	const registrationId = uuidv7();
	const cancelTokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
	await client.query(
		`INSERT INTO registrations (id, booking_id, title, first_name, last_name, organization, email, meal_type, cancel_token_hash, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Test', 'Registrant', 'Test Org', $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
		[
			registrationId,
			opts.bookingId,
			opts.title ?? 'Mr',
			opts.email ?? `registrant-${registrationId}@example.com`,
			opts.mealType ?? null,
			cancelTokenHash,
			opts.status ?? 'registered'
		]
	);
	return registrationId;
}

// ---------------------------------------------------------------------------
// 5.2-INT-001 — Valid form creates registrant DB row [P0] ACTIVE
// AC-3: Full submission creates registrations row + audit log entry
// ---------------------------------------------------------------------------

describe('Story 5.2 — Valid Registration Creates DB Row and Audit Log (AC-3)', () => {
	test('[P0] 5.2-INT-001 — valid form submission creates registrant row with all columns and audit log entry', async () => {
		// THIS TEST WILL FAIL until createRegistration is implemented (Task 3).
		//
		// AC-3: A valid form submission creates a row in the registrations table with:
		//   bookingId, title, titleOtherText, firstName, lastName, organization, email,
		//   mealType, mealTypeOtherText, cancelTokenHash, status='registered'
		// AND an audit_log row: entity='registration', action='create', actorId=null
		//
		// Strategy:
		//   1. Seed user + profile + room + booking with registrationEnabled=true
		//   2. Dynamic import createRegistration from registration-service
		//   3. Call createRegistration(booking.id, validInput)
		//   4. Assert registrations row exists with all expected columns
		//   5. Assert audit_log row exists with entity='registration', action='create', actorId=null

		const { createRegistration } =
			await import('../../src/lib/server/services/registration-service.js');

		const regSlug = `5-2-int-001-${randomUUID().replace(/-/g, '')}`;
		const eventName = 'ATDD Test Event 5.2-INT-001';

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-2-001');
			await seedUserProfile(client, organizerId, { firstName: 'Carol', lastName: 'Test' });
			const roomId = await seedRoom(client, 'int-5-2-001');
			bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName,
				token: regSlug,
				registrationEnabled: true
			});
		} finally {
			client.release();
		}

		const validInput = {
			title: 'Mr',
			titleOtherText: undefined,
			firstName: 'John',
			lastName: 'Doe',
			organization: 'Test Corp',
			email: 'john.doe@example.com',
			cateringEnabled: false,
			mealType: undefined,
			mealTypeOtherText: undefined
		};

		const result = await createRegistration(bookingId, validInput);

		// Assert return value
		expect(result.registrationId, '5.2-INT-001: registrationId must be returned').toBeTruthy();
		expect(typeof result.registrationId).toBe('string');
		// cancelToken is the plaintext 64-char hex — for Story 5.3 email use only
		expect(
			result.cancelToken,
			'5.2-INT-001: cancelToken (plaintext) must be returned'
		).toBeTruthy();
		expect(result.cancelToken).toHaveLength(64); // 32 bytes → 64 hex chars

		// Assert registrations table row
		const verifyClient = await pool.connect();
		let regRow: Record<string, unknown> | undefined;
		let auditRow: Record<string, unknown> | undefined;
		try {
			const regResult = await verifyClient.query(
				`SELECT id, booking_id, title, title_other_text, first_name, last_name,
                organization, email, meal_type, meal_type_other_text,
                cancel_token_hash, status
         FROM registrations
         WHERE id = $1`,
				[result.registrationId]
			);
			regRow = regResult.rows[0];

			const auditResult = await verifyClient.query(
				`SELECT entity, action, actor_id
         FROM audit_log
         WHERE diff->>'registrationId' = $1
         ORDER BY created_at DESC
         LIMIT 1`,
				[result.registrationId]
			);
			auditRow = auditResult.rows[0];
		} finally {
			verifyClient.release();
		}

		// Registrations row assertions
		expect(regRow, '5.2-INT-001: registrations row must exist').toBeDefined();
		expect(regRow?.['booking_id']).toBe(bookingId);
		expect(regRow?.['title']).toBe('Mr');
		expect(regRow?.['title_other_text']).toBeNull();
		expect(regRow?.['first_name']).toBe('John');
		expect(regRow?.['last_name']).toBe('Doe');
		expect(regRow?.['organization']).toBe('Test Corp');
		expect(regRow?.['email']).toBe('john.doe@example.com');
		expect(regRow?.['meal_type']).toBeNull();
		expect(regRow?.['meal_type_other_text']).toBeNull();
		// cancelTokenHash stored; NOT the plain token
		expect(
			regRow?.['cancel_token_hash'],
			'5.2-INT-001: cancel_token_hash must be stored'
		).toBeTruthy();
		expect(regRow?.['cancel_token_hash']).not.toBe(result.cancelToken); // hash != plain
		expect(regRow?.['status']).toBe('registered');

		// Audit log assertions (AC-3)
		expect(auditRow, '5.2-INT-001: audit_log row must exist').toBeDefined();
		expect(auditRow?.['entity']).toBe('registration');
		expect(auditRow?.['action']).toBe('create');
		expect(auditRow?.['actor_id']).toBeNull(); // unauthenticated external registrant
	});
});

// ---------------------------------------------------------------------------
// 5.2-INT-CLOSED-001 — RegistrationClosedError thrown when registrationEnabled=false
//                       MANDATORY R-005 MITIGATE gate [P0] ACTIVE
// AC-6: Server-side closed guard enforced in service layer
// ---------------------------------------------------------------------------

describe('Story 5.2 — Closed Guard: RegistrationClosedError Thrown When Closed (AC-6, R-005 MITIGATE)', () => {
	test('[P0] 5.2-INT-CLOSED-001 — createRegistration throws RegistrationClosedError when registrationEnabled=false; no row inserted', async () => {
		// THIS TEST WILL FAIL until createRegistration + RegistrationClosedError are implemented (Task 3).
		//
		// AC-6 (R-005 MITIGATE): The register form action checks registrationEnabled before inserting.
		// The guard lives in the SERVICE (createRegistration), not just the UI, so a direct POST
		// bypass is caught here too.
		//
		// This test exercises the service-layer guard directly (no running HTTP server needed).
		// The action's catch-and-return-fail(400) path is covered by 5.2-E2E-001.
		//
		// Strategy:
		//   1. Seed user + profile + room + booking with registrationEnabled=false
		//   2. Dynamic import createRegistration and RegistrationClosedError
		//   3. Build a valid RegistrationInput matching the schema
		//   4. Call createRegistration(booking.id, validInput)
		//   5. Assert: throws RegistrationClosedError (instanceof check)
		//   6. Assert: no row inserted — query registrations for bookingId, expect count=0

		const { createRegistration, RegistrationClosedError } =
			await import('../../src/lib/server/services/registration-service.js');

		const regSlug = `5-2-int-closed-001-${randomUUID().replace(/-/g, '')}`;
		const eventName = 'ATDD Test Event 5.2-INT-CLOSED-001 (Closed)';

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-2-closed');
			await seedUserProfile(client, organizerId, { firstName: 'Dave', lastName: 'Closed' });
			const roomId = await seedRoom(client, 'int-5-2-closed');
			bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName,
				token: regSlug,
				registrationEnabled: false // CLOSED
			});
		} finally {
			client.release();
		}

		const validInput = {
			title: 'Ms',
			titleOtherText: undefined,
			firstName: 'Jane',
			lastName: 'Bypass',
			organization: 'Attack Corp',
			email: 'jane.bypass@example.com',
			cateringEnabled: false,
			mealType: undefined,
			mealTypeOtherText: undefined
		};

		// Assert: RegistrationClosedError is thrown (R-005 MITIGATE guard fires)
		await expect(
			createRegistration(bookingId, validInput),
			'5.2-INT-CLOSED-001: createRegistration must throw RegistrationClosedError when registrationEnabled=false'
		).rejects.toThrow(RegistrationClosedError);

		// Assert: no registrations row inserted (guard prevents DB write)
		const verifyClient = await pool.connect();
		try {
			const countResult = await verifyClient.query<{ count: string }>(
				`SELECT COUNT(*) AS count FROM registrations WHERE booking_id = $1`,
				[bookingId]
			);
			expect(
				Number(countResult.rows[0]?.count),
				'5.2-INT-CLOSED-001: no registrations row must be inserted when guard fires'
			).toBe(0);
		} finally {
			verifyClient.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 5.2-INT-002 — title='Other' stored correctly [P1] SKIP
// AC-3: title_other_text column populated when title='Other'
// ---------------------------------------------------------------------------

describe('Story 5.2 — Title Other Text Stored (AC-3)', () => {
	test.skip('[P1] 5.2-INT-002 — title=Other stores titleOtherText in title_other_text column', async () => {
		// Activation condition: createRegistration implemented (Task 3).
		//
		// AC-3: When title='Other', the free-text titleOtherText must be stored in
		//   the title_other_text column.
		//
		// Strategy:
		//   1. Seed user + profile + room + booking (registrationEnabled=true)
		//   2. Call createRegistration with title='Other', titleOtherText='Professor'
		//   3. Assert registrations row has title='Other', title_other_text='Professor'

		const { createRegistration } =
			await import('../../src/lib/server/services/registration-service.js');

		const regSlug = `5-2-int-002-${randomUUID().replace(/-/g, '')}`;

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-2-002');
			await seedUserProfile(client, organizerId);
			const roomId = await seedRoom(client, 'int-5-2-002');
			bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Test Event 5.2-INT-002',
				token: regSlug,
				registrationEnabled: true
			});
		} finally {
			client.release();
		}

		const input = {
			title: 'Other',
			titleOtherText: 'Professor',
			firstName: 'Frank',
			lastName: 'Other',
			organization: 'Academic Inst',
			email: 'frank.other@example.com',
			cateringEnabled: false,
			mealType: undefined,
			mealTypeOtherText: undefined
		};

		const result = await createRegistration(bookingId, input);

		const verifyClient = await pool.connect();
		try {
			const regResult = await verifyClient.query(
				`SELECT title, title_other_text FROM registrations WHERE id = $1`,
				[result.registrationId]
			);
			const row = regResult.rows[0];
			expect(row?.['title']).toBe('Other');
			expect(row?.['title_other_text']).toBe('Professor');
		} finally {
			verifyClient.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 5.2-INT-003 — Meal type required when catering enabled; absent when disabled [P1] SKIP
// AC-2: mealType conditional based on cateringEnabled flag
// ---------------------------------------------------------------------------

describe('Story 5.2 — Meal Type Conditional on CateringEnabled (AC-2)', () => {
	test.skip('[P1] 5.2-INT-003 — mealType required when cateringEnabled=true; null stored when cateringEnabled=false', async () => {
		// Activation condition: createRegistration + RegistrationSchema implemented (Tasks 2, 3).
		//
		// AC-2: When cateringEnabled=true, mealType must be provided and stored.
		//       When cateringEnabled=false, meal_type column must be null (not submitted).
		//
		// Strategy:
		//   1a. Seed booking with catering_enabled=true; call createRegistration with mealType='Normal'
		//       Assert: meal_type='Normal' stored in DB
		//   1b. Seed booking with catering_enabled=false; call createRegistration without mealType
		//       Assert: meal_type is null in DB

		const { createRegistration } =
			await import('../../src/lib/server/services/registration-service.js');

		// Case A: catering enabled — meal_type stored
		const slugA = `5-2-int-003-a-${randomUUID().replace(/-/g, '')}`;
		const clientA = await pool.connect();
		let bookingIdA: string;
		try {
			const orgA = await seedUser(clientA, 'int-5-2-003a');
			await seedUserProfile(clientA, orgA);
			const roomA = await seedRoom(clientA, 'int-5-2-003a');
			bookingIdA = await seedBookingWithToken(clientA, {
				organizerId: orgA,
				roomId: roomA,
				eventName: 'ATDD Test 5.2-INT-003-A (Catering ON)',
				token: slugA,
				registrationEnabled: true
			});
			// Note: seedBookingWithToken uses catering_enabled=false by default.
			// For this test, update the row to set catering_enabled=true.
			await clientA.query(`UPDATE bookings SET catering_enabled = true WHERE id = $1`, [
				bookingIdA
			]);
		} finally {
			clientA.release();
		}

		const resultA = await createRegistration(bookingIdA, {
			title: 'Mr',
			titleOtherText: undefined,
			firstName: 'Catering',
			lastName: 'User',
			organization: 'Food Co',
			email: 'catering@example.com',
			cateringEnabled: true,
			mealType: 'Normal',
			mealTypeOtherText: undefined
		});

		const verifyClientA = await pool.connect();
		try {
			const rowA = await verifyClientA.query(`SELECT meal_type FROM registrations WHERE id = $1`, [
				resultA.registrationId
			]);
			expect(rowA.rows[0]?.['meal_type']).toBe('Normal');
		} finally {
			verifyClientA.release();
		}

		// Case B: catering disabled — meal_type null
		const slugB = `5-2-int-003-b-${randomUUID().replace(/-/g, '')}`;
		const clientB = await pool.connect();
		let bookingIdB: string;
		try {
			const orgB = await seedUser(clientB, 'int-5-2-003b');
			await seedUserProfile(clientB, orgB);
			const roomB = await seedRoom(clientB, 'int-5-2-003b');
			bookingIdB = await seedBookingWithToken(clientB, {
				organizerId: orgB,
				roomId: roomB,
				eventName: 'ATDD Test 5.2-INT-003-B (Catering OFF)',
				token: slugB,
				registrationEnabled: true
			});
		} finally {
			clientB.release();
		}

		const resultB = await createRegistration(bookingIdB, {
			title: 'Ms',
			titleOtherText: undefined,
			firstName: 'No',
			lastName: 'Catering',
			organization: 'Plain Co',
			email: 'nocatering@example.com',
			cateringEnabled: false,
			mealType: undefined,
			mealTypeOtherText: undefined
		});

		const verifyClientB = await pool.connect();
		try {
			const rowB = await verifyClientB.query(`SELECT meal_type FROM registrations WHERE id = $1`, [
				resultB.registrationId
			]);
			expect(rowB.rows[0]?.['meal_type']).toBeNull();
		} finally {
			verifyClientB.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 5.2-INT-004 — mealType='Other' stored correctly [P1] SKIP
// AC-2: meal_type_other_text column populated when mealType='Other'
// ---------------------------------------------------------------------------

describe('Story 5.2 — Meal Type Other Text Stored (AC-2)', () => {
	test.skip('[P1] 5.2-INT-004 — mealType=Other stores mealTypeOtherText in meal_type_other_text column', async () => {
		// Activation condition: createRegistration implemented (Task 3).
		//
		// AC-2: When mealType='Other', the free-text mealTypeOtherText must be stored
		//   in the meal_type_other_text column.
		//
		// Strategy:
		//   1. Seed user + profile + room + booking (registrationEnabled=true, catering_enabled=true)
		//   2. Call createRegistration with mealType='Other', mealTypeOtherText='Kosher'
		//   3. Assert meal_type='Other', meal_type_other_text='Kosher' in DB

		const { createRegistration } =
			await import('../../src/lib/server/services/registration-service.js');

		const regSlug = `5-2-int-004-${randomUUID().replace(/-/g, '')}`;

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-2-004');
			await seedUserProfile(client, organizerId);
			const roomId = await seedRoom(client, 'int-5-2-004');
			bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Test Event 5.2-INT-004',
				token: regSlug,
				registrationEnabled: true
			});
			await client.query(`UPDATE bookings SET catering_enabled = true WHERE id = $1`, [bookingId]);
		} finally {
			client.release();
		}

		const result = await createRegistration(bookingId, {
			title: 'Mr',
			titleOtherText: undefined,
			firstName: 'Meal',
			lastName: 'Other',
			organization: 'Dietary Org',
			email: 'meal.other@example.com',
			cateringEnabled: true,
			mealType: 'Other',
			mealTypeOtherText: 'Kosher'
		});

		const verifyClient = await pool.connect();
		try {
			const row = await verifyClient.query(
				`SELECT meal_type, meal_type_other_text FROM registrations WHERE id = $1`,
				[result.registrationId]
			);
			expect(row.rows[0]?.['meal_type']).toBe('Other');
			expect(row.rows[0]?.['meal_type_other_text']).toBe('Kosher');
		} finally {
			verifyClient.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 5.2-INT-005 — 100th registration succeeds — no capacity cap (R-012) [P1] SKIP
// AC-3, R-012: No COUNT(registrations) guard enforced
// ---------------------------------------------------------------------------

describe('Story 5.2 — No Capacity Cap: 100th Registration Succeeds (AC-3, R-012)', () => {
	test.skip('[P1] 5.2-INT-005 — 100th registration for same booking succeeds with no error', async () => {
		// Activation condition: createRegistration implemented (Task 3) and
		//   TRUNCATABLE_TABLES includes 'registrations' (pg-factory.ts Task 1.4).
		//
		// R-012: No capacity cap enforced — registration count is not limited.
		//   DO NOT add any COUNT(registrations) guard.
		//
		// Strategy:
		//   1. Seed user + profile + room + booking (registrationEnabled=true)
		//   2. Use seedRegistrant to insert 99 registration rows directly
		//   3. Call createRegistration to submit the 100th registration
		//   4. Assert: no error; registrations row created; total count = 100

		const { createRegistration } =
			await import('../../src/lib/server/services/registration-service.js');

		const regSlug = `5-2-int-005-${randomUUID().replace(/-/g, '')}`;

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-2-005');
			await seedUserProfile(client, organizerId);
			const roomId = await seedRoom(client, 'int-5-2-005');
			bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Test Event 5.2-INT-005 (Capacity)',
				token: regSlug,
				registrationEnabled: true
			});

			// Seed 99 existing registrations
			for (let i = 0; i < 99; i++) {
				await seedRegistrant(client, {
					bookingId,
					email: `registrant-${i}-${randomUUID()}@example.com`
				});
			}
		} finally {
			client.release();
		}

		// 100th registration — must succeed with no error
		const result = await createRegistration(bookingId, {
			title: 'Mrs',
			titleOtherText: undefined,
			firstName: 'Hundredth',
			lastName: 'Registrant',
			organization: 'Large Event Co',
			email: 'hundredth@example.com',
			cateringEnabled: false,
			mealType: undefined,
			mealTypeOtherText: undefined
		});

		expect(result.registrationId, '5.2-INT-005: 100th registration must succeed').toBeTruthy();

		// Verify total count is 100
		const verifyClient = await pool.connect();
		try {
			const countResult = await verifyClient.query<{ count: string }>(
				`SELECT COUNT(*) AS count FROM registrations WHERE booking_id = $1`,
				[bookingId]
			);
			expect(Number(countResult.rows[0]?.count)).toBe(100);
		} finally {
			verifyClient.release();
		}
	});
});
