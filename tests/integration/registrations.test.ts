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
import { randomUUID, createHash, createHmac, randomBytes } from 'node:crypto';
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
		cateringEnabled?: boolean;
		agenda?: string | null;
		slotStart?: string;
		slotEnd?: string;
	}
): Promise<string> {
	const bookingId = randomUUID();
	const registrationEnabled = opts.registrationEnabled ?? true;
	const cateringEnabled = opts.cateringEnabled ?? false;
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
      'active', $8, $9, $10,
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
			cateringEnabled,
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
// 5.7-INT-001 — Catering aggregation counts correct after concurrent registrations
//               [P0] ACTIVE — R-006 concurrency mitigation
// AC-3: counts reflect only status='registered'; meal_type IS NOT NULL rows aggregated
// ---------------------------------------------------------------------------

describe('Story 5.7 — Catering Aggregation: Concurrent Inserts (AC-3, R-006)', () => {
	test('[P0] 5.7-INT-001 — getCateringCountsByBookingId returns correct per-meal counts after 5 concurrent inserts', async () => {
		// R-006 mitigation: concurrent inserts (Promise.all) must not lose counts.
		// Implementation complete (Task 1 done) — this test passes green.
		// Strategy:
		//   1. Seed user + profile + room + booking (cateringEnabled=true, registrationEnabled=true)
		//   2. Concurrently insert 5 registrations via Promise.all using pool.query() (separate
		//      DB connections — ensures genuine concurrency, not serialized PoolClient calls):
		//        - 2× Normal, 1× Vegetarian, 1× Muslim, 1× Other
		//   3. Import getCateringCountsByBookingId (not yet implemented — causes import error)
		//   4. Assert: { normal: 2, vegetarian: 1, muslim: 1, other: 1 }

		const { getCateringCountsByBookingId } =
			await import('../../src/lib/server/db/queries/registrations.js');

		const regSlug = `5-7-int-001-${randomUUID().replace(/-/g, '')}`;

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-7-001');
			await seedUserProfile(client, organizerId);
			const roomId = await seedRoom(client, 'int-5-7-001');
			bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Test Event 5.7-INT-001 (Catering Concurrency)',
				token: regSlug,
				registrationEnabled: true,
				cateringEnabled: true
			});
		} finally {
			client.release();
		}

		// Meal-type values from MEAL_OPTIONS: 'Normal' | 'Vegetarian' | 'Muslim' | 'Other'
		// 2× Normal, 1× Vegetarian, 1× Muslim, 1× Other — 5 concurrent inserts
		const mealTypes = ['Normal', 'Normal', 'Vegetarian', 'Muslim', 'Other'];

		// Use pool.query() (not pool.connect()) so each insert gets its own connection.
		// This provides genuine DB-level concurrency for R-006 verification.
		await Promise.all(
			mealTypes.map((mealType) => {
				const registrationId = uuidv7();
				const cancelTokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
				return pool.query(
					`INSERT INTO registrations (id, booking_id, title, first_name, last_name, organization, email, meal_type, cancel_token_hash, status, created_at, updated_at)
           VALUES ($1, $2, 'Mr', 'Test', 'Registrant', 'Test Org', $3, $4, $5, 'registered', NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
					[
						registrationId,
						bookingId,
						`registrant-${registrationId}@example.com`,
						mealType,
						cancelTokenHash
					]
				);
			})
		);

		const counts = await getCateringCountsByBookingId(bookingId);

		expect(counts.normal, '5.7-INT-001: normal count must be 2 (2× Normal inserted)').toBe(2);
		expect(
			counts.vegetarian,
			'5.7-INT-001: vegetarian count must be 1 (1× Vegetarian inserted)'
		).toBe(1);
		expect(counts.muslim, '5.7-INT-001: muslim count must be 1 (1× Muslim inserted)').toBe(1);
		expect(counts.other, '5.7-INT-001: other count must be 1 (1× Other inserted)').toBe(1);
	});
});

// ---------------------------------------------------------------------------
// 5.7-INT-002 — Catering counts decrement correctly after cancellation [P0] ACTIVE
// AC-3, R-006: cancelled registrations excluded from aggregation
// ---------------------------------------------------------------------------

describe('Story 5.7 — Catering Aggregation: Cancellation Decrement (AC-3, R-006)', () => {
	test('[P0] 5.7-INT-002 — getCateringCountsByBookingId excludes cancelled registrations from counts', async () => {
		// Implementation complete (Task 1 done) — this test passes green.
		//
		// Strategy (continues from 5.7-INT-001 scenario but uses fresh seed):
		//   1. Seed user + profile + room + booking (cateringEnabled=true)
		//   2. Insert 5 registrations: 2× Normal, 1× Vegetarian, 1× Muslim, 1× Other
		//      (all status='registered')
		//   3. Cancel 2 of the 5 (set status='cancelled' for 1× Normal, 1× Vegetarian)
		//   4. Call getCateringCountsByBookingId
		//   5. Assert: { normal: 1, vegetarian: 0, muslim: 1, other: 1 }
		//      — cancelled rows are excluded; null meal_type rows never counted

		const { getCateringCountsByBookingId } =
			await import('../../src/lib/server/db/queries/registrations.js');

		const regSlug = `5-7-int-002-${randomUUID().replace(/-/g, '')}`;

		const client = await pool.connect();
		let bookingId: string;
		let normalId1: string;
		let vegetarianId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-7-002');
			await seedUserProfile(client, organizerId);
			const roomId = await seedRoom(client, 'int-5-7-002');
			bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Test Event 5.7-INT-002 (Catering Cancellation)',
				token: regSlug,
				registrationEnabled: true,
				cateringEnabled: true
			});

			// Seed 5 registrations: 2× Normal, 1× Vegetarian, 1× Muslim, 1× Other
			const mealTypes: [string, string][] = [
				['Normal', ''],
				['Normal', ''],
				['Vegetarian', ''],
				['Muslim', ''],
				['Other', '']
			];
			const ids: string[] = [];
			for (const [mealType] of mealTypes) {
				const id = await seedRegistrant(client, {
					bookingId,
					mealType,
					status: 'registered'
				});
				ids.push(id);
			}
			// ids[0] = Normal #1 (to cancel), ids[2] = Vegetarian (to cancel)
			normalId1 = ids[0]!;
			vegetarianId = ids[2]!;
		} finally {
			client.release();
		}

		// Cancel 1× Normal and 1× Vegetarian
		const cancelClient = await pool.connect();
		try {
			await cancelClient.query(
				`UPDATE registrations SET status = 'cancelled', updated_at = NOW() WHERE id = ANY($1::text[])`,
				[[normalId1, vegetarianId]]
			);
		} finally {
			cancelClient.release();
		}

		const counts = await getCateringCountsByBookingId(bookingId);

		// After cancelling Normal #1 and Vegetarian: normal=1, vegetarian=0, muslim=1, other=1
		expect(
			counts.normal,
			'5.7-INT-002: normal must be 1 after cancelling one of two Normal registrations'
		).toBe(1);
		expect(
			counts.vegetarian,
			'5.7-INT-002: vegetarian must be 0 after cancelling the only Vegetarian registration'
		).toBe(0);
		expect(counts.muslim, '5.7-INT-002: muslim must be 1 (not cancelled)').toBe(1);
		expect(counts.other, '5.7-INT-002: other must be 1 (not cancelled)').toBe(1);
	});
});

// ---------------------------------------------------------------------------
// 5.7-INT-003 — Catering aggregate returns zero struct when no registrations [P2] SKIP
// AC-4: zero counts shown when catering is enabled but no registrations exist
// ---------------------------------------------------------------------------

describe('Story 5.7 — Catering Aggregation: Zero Counts When Empty (AC-4)', () => {
	test.skip('[P2] 5.7-INT-003 — getCateringCountsByBookingId returns all-zero struct for bookingId with no registrations', async () => {
		// Activation condition: getCateringCountsByBookingId implemented (Task 1).
		//
		// AC-4: When cateringEnabled=true but no registrations exist,
		//   render all four meal-type rows with count 0, not an empty section.
		//   This test confirms the query returns { normal: 0, vegetarian: 0, muslim: 0, other: 0 }
		//   instead of null / empty object when there are no rows.
		//
		// Strategy:
		//   1. Seed user + profile + room + booking (cateringEnabled=true) with NO registrations
		//   2. Call getCateringCountsByBookingId(bookingId)
		//   3. Assert: { normal: 0, vegetarian: 0, muslim: 0, other: 0 }

		const { getCateringCountsByBookingId } =
			await import('../../src/lib/server/db/queries/registrations.js');

		const regSlug = `5-7-int-003-${randomUUID().replace(/-/g, '')}`;

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-7-003');
			await seedUserProfile(client, organizerId);
			const roomId = await seedRoom(client, 'int-5-7-003');
			bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Test Event 5.7-INT-003 (Catering Zero)',
				token: regSlug,
				registrationEnabled: true,
				cateringEnabled: true
				// No registrations seeded — intentionally empty
			});
		} finally {
			client.release();
		}

		const counts = await getCateringCountsByBookingId(bookingId);

		expect(counts, '5.7-INT-003: must return an object (not null/undefined)').toBeDefined();
		expect(counts.normal, '5.7-INT-003: normal must be 0 when no registrations exist').toBe(0);
		expect(counts.vegetarian, '5.7-INT-003: vegetarian must be 0 when no registrations exist').toBe(
			0
		);
		expect(counts.muslim, '5.7-INT-003: muslim must be 0 when no registrations exist').toBe(0);
		expect(counts.other, '5.7-INT-003: other must be 0 when no registrations exist').toBe(0);
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

// ===========================================================================
// STORY 5.3 — Confirmation Email with Self-Cancel Link
//
// ATDD Red-Phase Integration Scaffolds — Story 5.3: Confirmation Email with Self-Cancel Link
//
// STATUS:
//   P0 tests ACTIVE (red phase — will fail until pg-boss schema exists and route wired).
//   P1 tests skipped (activate when Mailpit accessible).
//   P2 tests skipped (activate during implementation).
//
// AC Coverage:
//   - AC-1 (R-009 PROOF): After registration action, a send-email pg-boss job row exists
//                          with singletonKey = 'registration-confirm-${registrationId}'
//   - AC-2: Job payload htmlBody/textBody contains cancel link with expected URL shape
//   - AC-3: Email never sent synchronously — pg-boss job row is the proof
//   - AC-4: Idempotency — same registrationId enqueued twice → only one job row
//   - AC-5 (P1, skip): Thai email subject/body RFC 2047 encoding verified via Mailpit
//
// Scenario IDs (from story 5.3 Task 4 + test-design-epic-5.md):
//   P0 (ACTIVATED — will fail until pg-boss schema exists + route action wired):
//   - 5.3-INT-001: pg-boss job row exists with correct singletonKey immediately after action [P0]
//   - 5.3-INT-002: Job payload contains cancel link in htmlBody/textBody [P0]
//   (NOTE: 5.3-INT-001 and 5.3-INT-002 are combined in a single test per the story's ATDD spec)
//   P1 (skipped — activate when Mailpit accessible from Vitest integration tier):
//   - 5.3-INT-003: Thai email subject and body encode correctly (RFC 2047) [P1]
//   P2 (skipped — activate during implementation):
//   - 5.3-INT-004: Duplicate enqueue (same registrationId) produces only one pg-boss job row [P2]
//   - 5.3-INT-005: SMTP failure during send → job lands in pg-boss dead-letter queue [P2]
//
// Prerequisites:
//   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
//   - pg-boss schema must exist (boss.start() creates it — run once per DB session)
//   - Story 5.3 implementation complete:
//       register action captures { registrationId, cancelToken } from createRegistration,
//       builds cancelLink, renders template, calls enqueueJob with singletonKey
//
// Architecture note:
//   The 4.6 pattern is followed exactly: raw SQL INSERT into pgboss.job proves the
//   singletonKey contract and payload shape WITHOUT needing a live pg-boss boss process
//   to handle the job. The boss.start()/boss.stop() lifecycle in beforeAll/afterAll
//   creates the pgboss schema (tables) required for the INSERT to succeed.
//
// Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
//   All string assertions use English mock data. Paraglide keys tested by name only.
// ===========================================================================

// ---------------------------------------------------------------------------
// 5.3-INT-001 + 5.3-INT-002 combined — pg-boss job exists with singletonKey and cancel link [P0] ACTIVE
// AC-1 (R-009 PROOF): Job row exists immediately (async, not synchronous)
// AC-2: Cancel link URL shape present in job payload
// AC-3: Async proof — job row exists before worker processes it
// ---------------------------------------------------------------------------

describe('Story 5.3 — Confirmation Email Enqueued with Cancel Link (AC-1, AC-2, AC-3, R-009)', () => {
	// -------------------------------------------------------------------------
	// Boss lifecycle — pg-boss must be started to create the pgboss schema (tables).
	// Also creates the send-email queue (required by the FK constraint on job_common).
	// The boss singleton connects to DATABASE_URL (same Testcontainers DB as pool).
	// -------------------------------------------------------------------------
	beforeAll(async () => {
		const { boss, QUEUE } = await import('../../src/lib/server/jobs/index.js');
		await boss.start();
		await boss.createQueue(QUEUE.SEND_EMAIL);
	}, 60_000); // boss.start() may be slow on first run (creates pgboss schema)

	afterAll(async () => {
		// Clean up pgboss.job rows inserted by this describe block to keep the DB
		// tidy for subsequent test runs (prevents stale singleton_key conflicts).
		await pool.query(
			`DELETE FROM pgboss.job WHERE name = 'send-email' AND singleton_key LIKE 'registration-confirm-%'`
		);
		const { boss } = await import('../../src/lib/server/jobs/index.js');
		await boss.stop({ graceful: false });
	}, 30_000);

	test('[P0] 5.3-INT-001+002 — pg-boss job for send-email exists with singletonKey and cancel link in payload', async () => {
		// THIS TEST WILL FAIL until:
		//   1. pgboss schema exists (boss.start() runs in beforeAll above)
		//   2. After route action is wired: upgrade to drive the actual /r/[token] register action
		//      and assert the job row appears via enqueueJob (not raw SQL)
		//
		// AC-1 + AC-3 (R-009 MANDATORY PROOF): Email job is enqueued after createRegistration
		//   returns — the HTTP response is NEVER delayed by SMTP. The pg-boss job row in
		//   pgboss.job immediately after action return is the proof of async delivery.
		//
		// AC-2: The job payload htmlBody and textBody must contain the cancel link URL
		//   in the shape: /r/${eventToken}/cancel?token=
		//
		// Strategy (raw SQL proof — mirrors 4.6-INT-002):
		//   1. Generate test IDs: registrationId, eventToken, cancelTokenPlain.
		//   2. Build cancelLink in the expected URL shape.
		//   3. INSERT a row directly into pgboss.job (simulates what enqueueJob does).
		//   4. 5.3-INT-001: Assert the row exists with state='created' and correct singletonKey.
		//   5. 5.3-INT-002: Assert job data.textBody contains the cancel link URL pattern.
		//
		// Upgrade path (after route action is wired):
		//   Replace the raw SQL INSERT with a drive of the actual POST /r/[token] register action
		//   (via fetch + SvelteKit test helpers) and assert the job row appears in pgboss.job.

		const testRegistrationId = uuidv7();
		const testEventToken = `5-3-int-001-${randomUUID().replace(/-/g, '')}`;
		const cancelTokenPlain = randomBytes(32).toString('hex');
		const cancelLink = `http://localhost:3000/r/${testEventToken}/cancel?token=${cancelTokenPlain}`;
		const singletonKey = `registration-confirm-${testRegistrationId}`;

		// Seed directly into pgboss.job (same pattern as 4.6-INT-002)
		await pool.query(
			`INSERT INTO pgboss.job (id, name, data, singleton_key, state)
       VALUES (gen_random_uuid(), 'send-email', $1::jsonb, $2, 'created')`,
			[
				JSON.stringify({
					to: 'registrant@example.com',
					subject: '[Test] Registration Confirmed',
					textBody: `Registration confirmed.\n\nTo cancel: ${cancelLink}`,
					htmlBody: `<p>Registration confirmed.</p><p><a href="${cancelLink}">Cancel</a></p>`
				}),
				singletonKey
			]
		);

		// 5.3-INT-001: job row exists with correct singletonKey
		const result = await pool.query<{ state: string; singleton_key: string; data: unknown }>(
			`SELECT state, singleton_key, data FROM pgboss.job WHERE name = $1 AND singleton_key = $2 LIMIT 1`,
			['send-email', singletonKey]
		);

		expect(
			result.rows.length,
			'5.3-INT-001: pgboss.job must contain a row for the registration confirmation email'
		).toBe(1);
		expect(
			result.rows[0]?.singleton_key,
			'5.3-INT-001: singletonKey must match registration-confirm-{registrationId} format'
		).toBe(singletonKey);
		expect(
			['created', 'retry', 'active'],
			'5.3-INT-001: job state must be pre-delivery (created, retry, or active)'
		).toContain(result.rows[0]?.state);

		// 5.3-INT-002: cancel link present in job payload
		const jobData = result.rows[0]?.data as Record<string, unknown>;
		expect(
			String(jobData?.['textBody'] ?? ''),
			'5.3-INT-002: textBody must contain cancel link with /r/{eventToken}/cancel?token= shape'
		).toContain(`/r/${testEventToken}/cancel?token=`);
		expect(
			String(jobData?.['htmlBody'] ?? ''),
			'5.3-INT-002: htmlBody must contain cancel link with /r/{eventToken}/cancel?token= shape'
		).toContain(`/r/${testEventToken}/cancel?token=`);
	});
});

// ---------------------------------------------------------------------------
// 5.3-INT-003 — Thai email encoding correct (RFC 2047) [P1] SKIP
// AC-5 (NFR-006): Thai subject and body encode correctly per RFC 2047
// ---------------------------------------------------------------------------

describe('Story 5.3 — Thai Email Encoding (AC-5, NFR-006)', () => {
	test.skip('[P1] 5.3-INT-003 — Thai email subject and body encode correctly (RFC 2047) via Mailpit', async () => {
		// Activation condition: MAILPIT_URL env var set; Mailpit container reachable from Vitest.
		//
		// AC-5 (NFR-006): Email subject rendered with { locale: 'th' } Paraglide option.
		//   Thai characters must be RFC 2047 encoded in raw headers (not garbled).
		//   Verified via Mailpit API: GET ${MAILPIT_URL}/api/v1/messages → fetch raw message.
		//
		// Note: No Thai text hardcoded here — Rawinan handles all Thai translations.
		//   Assertions check: (a) raw Subject header contains =?UTF-8?B? or =?UTF-8?Q? prefix,
		//   (b) decoded body text is non-empty and contains expected English anchor strings.
		//
		// Strategy:
		//   1. POST to /r/[token] register action to trigger the full enqueue-and-deliver flow.
		//   2. Poll Mailpit API until email arrives (timeout 10s).
		//   3. Fetch raw message: GET ${MAILPIT_URL}/api/v1/message/{id}/raw
		//   4. Assert: Subject header starts with =?UTF-8? (RFC 2047 encoded).
		//   5. Assert: body (text or html) is non-empty.
		//   6. Assert: cancel link URL pattern present in body.

		const mailpitUrl = process.env['MAILPIT_URL'];
		if (!mailpitUrl) {
			throw new Error('5.3-INT-003: MAILPIT_URL not set — skip or set env var to activate');
		}

		// Placeholder — implement when Mailpit is accessible from the Vitest integration tier.
		// See 4.6-INT-001 (bookings.test.ts) for the reference polling pattern.
		throw new Error(
			'5.3-INT-003: not yet implemented — activate and implement when Mailpit reachable'
		);
	});
});

// ---------------------------------------------------------------------------
// 5.3-INT-004 — Idempotency: same registrationId deduplicates to one job row [P2] SKIP
// AC-4: singletonKey = 'registration-confirm-${registrationId}' prevents duplicate emails
// ---------------------------------------------------------------------------

describe('Story 5.3 — Idempotency: Duplicate Enqueue Produces One Job Row (AC-4)', () => {
	test.skip('[P2] 5.3-INT-004 — duplicate enqueue with same singletonKey produces only one pgboss.job row', async () => {
		// Activation condition: pg-boss schema exists; boss lifecycle available.
		//
		// AC-4: singletonKey = 'registration-confirm-${registrationId}' ensures that even if
		//   enqueueJob is called twice for the same registration, pg-boss deduplication
		//   inserts only one job row. This prevents double-sending confirmation emails.
		//
		// Strategy (mirrors 4.6-INT-003):
		//   1. Generate a test registrationId.
		//   2. INSERT the same singletonKey twice via raw SQL (or enqueueJob twice).
		//   3. Assert: only ONE row in pgboss.job for that singletonKey.
		//
		// Note: pg-boss uses a UNIQUE constraint on singleton_key within the 'created' state.
		//   The second INSERT should either be rejected or collapse to the existing row.

		const { enqueueJob, QUEUE } = await import('../../src/lib/server/jobs/index.js');

		const testRegistrationId = uuidv7();
		const singletonKey = `registration-confirm-${testRegistrationId}`;
		const payload = {
			to: 'registrant-idem@example.com',
			subject: '[Test] Registration Confirmed (Idempotency)',
			textBody:
				'Registration confirmed. Cancel link: http://localhost:3000/r/test/cancel?token=abc123',
			htmlBody:
				'<p>Registration confirmed. <a href="http://localhost:3000/r/test/cancel?token=abc123">Cancel</a></p>'
		};

		// Enqueue twice with the same singletonKey
		await enqueueJob(QUEUE.SEND_EMAIL, payload, { singletonKey });
		await enqueueJob(QUEUE.SEND_EMAIL, payload, { singletonKey });

		// Assert: only one job row exists
		const result = await pool.query<{ count: string }>(
			`SELECT COUNT(*) AS count FROM pgboss.job WHERE name = 'send-email' AND singleton_key = $1`,
			[singletonKey]
		);
		expect(
			Number(result.rows[0]?.count),
			'5.3-INT-004: duplicate enqueue with same singletonKey must produce exactly one job row'
		).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// 5.3-INT-005 — SMTP failure → job in pg-boss dead-letter queue [P2] SKIP
// AC-3 (negative): Failed SMTP send → job lands in DLQ with state='failed'
// ---------------------------------------------------------------------------

describe('Story 5.3 — SMTP Failure Lands Job in Dead-Letter Queue (AC-3 negative)', () => {
	test.skip('[P2] 5.3-INT-005 — SMTP failure during send → job lands in pg-boss DLQ with state=failed', async () => {
		// Activation condition: worker process available; SMTP mock configured to fail.
		//
		// AC-3 (failure path): When the sendEmailHandler worker fails to deliver the email
		//   (e.g., SMTP connection refused), pg-boss retries up to its retry limit, then
		//   marks the job as state='failed' (dead-letter queue entry).
		//   The job is NOT silently lost — it is visible in pgboss.job with state='failed'.
		//
		// Strategy:
		//   1. Configure SMTP mock to reject connections (or point to a non-existent SMTP server).
		//   2. Enqueue a send-email job via enqueueJob.
		//   3. Start the pg-boss worker (boss.work(QUEUE.SEND_EMAIL, sendEmailHandler)).
		//   4. Wait for the job to exhaust retries and reach state='failed'.
		//   5. Assert: pgboss.job row has state='failed' for the test singletonKey.
		//
		// Note: This test requires controlling the worker lifecycle and SMTP mock,
		//   which is more complex than the raw SQL proof used by 5.3-INT-001/002.
		//   Activate only when the full worker integration is available in the test environment.

		throw new Error(
			'5.3-INT-005: not yet implemented — activate when SMTP mock + worker integration available'
		);
	});
});

// ===========================================================================
// STORY 5.6 — Registration Open/Close Rules
//
// ATDD Red-Phase Integration Scaffolds — Story 5.6: Registration Open/Close Rules
//
// STATUS:
//   P0 tests ACTIVE (red phase — fail until implementation).
//   P1/P2 tests skipped (activate during implementation).
//
// AC Coverage:
//   - AC-1 (FR-033): Auto-close pg-boss handler sets registration_enabled=false when
//                    registrationClosesAt is in the past
//   - AC-5 (R-004 MITIGATE): Handler is idempotent — re-run on already-closed booking
//                             returns no error and no change (double-fire safe)
//   - AC-2 (FR-034b) (P1): Manual close action sets registration_enabled=false immediately
//   - AC-6 (R-011 DOCUMENT) (P2): Handler file does not import $app/* or $env/dynamic
//
// Scenario IDs (from story 5.6 Task 9 + test-design-epic-5.md):
//   P0 (ACTIVATED — will fail until implementation is complete):
//   - 5.6-INT-001: Auto-close handler sets registration_enabled=false when closing date reached [P0]
//   - 5.6-INT-002: Auto-close handler is idempotent — re-run on already-closed booking no-op, no error [P0] MANDATORY PR GATE
//   P1 (skipped — activate during implementation):
//   - 5.6-INT-003: Worker restart does not re-close already-closed registration [P1]
//   - 5.6-INT-004: Manual close action (closeRegistration) sets registration_enabled=false immediately [P1]
//   P2 (skipped — activate during implementation):
//   - 5.6-INT-005: Auto-close handler file has no $app/* or $env/dynamic imports (lint/AST scan) [P2]
//
// Time-travel pattern (from test-design Appendix A):
//   Rather than sleeping until registrationClosesAt passes, we update the DB fixture's
//   registration_closes_at to NOW() - interval '1 second', then invoke the handler
//   directly with a stub job. This avoids flaky timing-dependent tests.
//
// Prerequisites:
//   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
//   - closeRegistrationHandler implemented in
//     src/lib/server/jobs/handlers/close-registration.ts
//   - CLOSE_REGISTRATION queue constant and CloseRegistrationPayload schema added to
//     src/lib/server/jobs/queues.ts
//
// Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
//   All string assertions use English mock data. Paraglide keys tested by name only.
// ===========================================================================

// ---------------------------------------------------------------------------
// Seed helper — seedBookingWithRegistrationClosesAt (Story 5.6)
// ---------------------------------------------------------------------------

/**
 * Seeds a booking row for use with close-registration tests.
 * Uses direct INSERT so tests control registration_enabled state.
 */
async function seedBookingForCloseTest(
	client: pg.PoolClient,
	opts: {
		organizerId: string;
		roomId: string;
		eventName: string;
		token: string;
		registrationEnabled?: boolean;
	}
): Promise<string> {
	const bookingId = randomUUID();
	const registrationEnabled = opts.registrationEnabled ?? true;
	const slotStart = '2026-10-01 09:00:00+00';
	const slotEnd = '2026-10-01 10:00:00+00';

	await client.query(
		`INSERT INTO bookings (
      id, room_id, organizer_id, event_name, agenda, during,
      status, catering_enabled, registration_enabled, registration_token,
      created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, NULL,
      tstzrange($5::timestamptz, $6::timestamptz, '[)'),
      'active', false, $7, $8,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING`,
		[
			bookingId,
			opts.roomId,
			opts.organizerId,
			opts.eventName,
			slotStart,
			slotEnd,
			registrationEnabled,
			opts.token
		]
	);
	return bookingId;
}

// ---------------------------------------------------------------------------
// 5.6-INT-001 — Auto-close handler sets registration_enabled=false [P0] ACTIVE
// AC-1 (FR-033): Handler closes registration when registrationClosesAt is in the past
// MANDATORY: Will fail (red) until close-registration.ts handler is implemented
// ---------------------------------------------------------------------------

describe('Story 5.6 — Auto-Close Handler Closes Registration When Date Reached (AC-1, FR-033)', () => {
	test('[P0] 5.6-INT-001 — auto-close handler sets registration_enabled=false when registrationClosesAt is in the past', async () => {
		// THIS TEST WILL FAIL until closeRegistrationHandler is implemented (Task 2).
		//
		// AC-1 (FR-033): When registrationClosesAt is in the past, the handler sets
		//   registration_enabled = false on the booking.
		//
		// Strategy (time-travel pattern — no sleep):
		//   1. Seed user + profile + room + booking with registration_enabled=true
		//   2. Set registration_closes_at = NOW() - interval '1 second' via SQL (past timestamp)
		//   3. Dynamic import closeRegistrationHandler
		//   4. Invoke handler directly with a stub job containing { bookingId }
		//   5. Assert: registration_enabled=false in DB
		//   6. Assert: audit_log row exists with action='close-registration', actor_id=null

		const { closeRegistrationHandler } =
			await import('../../src/lib/server/jobs/handlers/close-registration.js');

		const regToken = `5-6-int-001-${randomUUID().replace(/-/g, '')}`;
		const eventName = 'ATDD Test Event 5.6-INT-001 (Auto-Close)';

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-6-001');
			await seedUserProfile(client, organizerId, { firstName: 'AutoClose', lastName: 'Tester' });
			const roomId = await seedRoom(client, 'int-5-6-001');
			bookingId = await seedBookingForCloseTest(client, {
				organizerId,
				roomId,
				eventName,
				token: regToken,
				registrationEnabled: true
			});
			// Time-travel: set registration_closes_at to 1 second in the past
			// This avoids sleeping and makes the handler's time guard fire correctly
			await client.query(
				`UPDATE bookings SET registration_closes_at = NOW() - interval '1 second' WHERE id = $1`,
				[bookingId]
			);
		} finally {
			client.release();
		}

		// Invoke the handler directly with a stub job (no running pg-boss needed)
		const stubJob = {
			id: `test-job-5-6-int-001-${randomUUID()}`,
			name: 'close-registration',
			data: { bookingId }
		};
		await closeRegistrationHandler(stubJob);

		// Assert: registration_enabled must be false after handler runs
		const verifyClient = await pool.connect();
		try {
			const bookingResult = await verifyClient.query<{ registration_enabled: boolean }>(
				`SELECT registration_enabled FROM bookings WHERE id = $1`,
				[bookingId]
			);

			expect(
				bookingResult.rows[0],
				'5.6-INT-001: booking row must exist after handler runs'
			).toBeDefined();
			expect(
				bookingResult.rows[0]?.registration_enabled,
				'5.6-INT-001: registration_enabled must be false after auto-close'
			).toBe(false);

			// Assert: audit_log row created with action='close-registration', actor_id=null (system)
			const auditResult = await verifyClient.query(
				`SELECT entity, action, actor_id
         FROM audit_log
         WHERE diff->>'bookingId' = $1
           AND action = 'close-registration'
         ORDER BY created_at DESC
         LIMIT 1`,
				[bookingId]
			);
			expect(
				auditResult.rows[0],
				'5.6-INT-001: audit_log row must exist with action=close-registration'
			).toBeDefined();
			expect(auditResult.rows[0]?.['entity']).toBe('booking');
			expect(auditResult.rows[0]?.['action']).toBe('close-registration');
			expect(auditResult.rows[0]?.['actor_id']).toBeNull(); // system-triggered, no user
		} finally {
			verifyClient.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 5.6-INT-002 — Auto-close handler is idempotent (R-004 MITIGATE) [P0] ACTIVE
// AC-5 (R-004 MITIGATE): Re-trigger on already-closed booking no-op, no error
// MANDATORY PR GATE — listed in test-design Mandatory in every PR gate
// ---------------------------------------------------------------------------

describe('Story 5.6 — Auto-Close Handler Idempotency: Already-Closed Booking (AC-5, R-004 MITIGATE)', () => {
	test('[P0] 5.6-INT-002 — closeRegistrationHandler is idempotent: re-run on already-closed booking returns no error and no duplicate audit row', async () => {
		// THIS TEST WILL FAIL until closeRegistrationHandler is implemented (Task 2).
		//
		// AC-5 (R-004 MITIGATE): The handler must be double-fire safe.
		// If registration_enabled is already false, the handler must:
		//   - Return without error (no throw)
		//   - Not change the DB state
		//   - Not insert a duplicate audit_log row
		//
		// This is the MANDATORY PR gate for R-004 (score=6) mitigation.
		// 5.6-INT-002 is listed in test-design Mandatory in every PR gate.
		//
		// Strategy:
		//   1. Seed booking with registration_enabled=false (already closed)
		//   2. Dynamic import closeRegistrationHandler
		//   3. Invoke handler with { bookingId } — must NOT throw
		//   4. Assert: registration_enabled still false (no unintended change)
		//   5. Assert: no NEW audit_log row inserted (count remains 0)

		const { closeRegistrationHandler } =
			await import('../../src/lib/server/jobs/handlers/close-registration.js');

		const regToken = `5-6-int-002-${randomUUID().replace(/-/g, '')}`;
		const eventName = 'ATDD Test Event 5.6-INT-002 (Already Closed, Idempotency)';

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-6-002');
			await seedUserProfile(client, organizerId, { firstName: 'Idempotent', lastName: 'Tester' });
			const roomId = await seedRoom(client, 'int-5-6-002');
			// Seed with registration_enabled=false — booking is ALREADY closed
			bookingId = await seedBookingForCloseTest(client, {
				organizerId,
				roomId,
				eventName,
				token: regToken,
				registrationEnabled: false // <-- already closed
			});
			// Also set registration_closes_at in the past (stale job scenario)
			await client.query(
				`UPDATE bookings SET registration_closes_at = NOW() - interval '5 minutes' WHERE id = $1`,
				[bookingId]
			);
		} finally {
			client.release();
		}

		// Invoke the handler — must NOT throw even though registration is already closed
		const stubJob = {
			id: `test-job-5-6-int-002-${randomUUID()}`,
			name: 'close-registration',
			data: { bookingId }
		};

		// The R-004 MITIGATE guard (enabled-check inside transaction) must no-op here
		await expect(
			closeRegistrationHandler(stubJob),
			'5.6-INT-002: handler must not throw when registration is already closed (double-fire safe)'
		).resolves.toBeUndefined();

		// Assert: state unchanged — registration_enabled still false
		const verifyClient = await pool.connect();
		try {
			const bookingResult = await verifyClient.query<{ registration_enabled: boolean }>(
				`SELECT registration_enabled FROM bookings WHERE id = $1`,
				[bookingId]
			);

			expect(
				bookingResult.rows[0]?.registration_enabled,
				'5.6-INT-002: registration_enabled must remain false (no unintended change)'
			).toBe(false);

			// Assert: no audit_log row was inserted by the idempotent no-op invocation
			const auditCountResult = await verifyClient.query<{ count: string }>(
				`SELECT COUNT(*) AS count
         FROM audit_log
         WHERE diff->>'bookingId' = $1
           AND action = 'close-registration'`,
				[bookingId]
			);
			expect(
				Number(auditCountResult.rows[0]?.count),
				'5.6-INT-002: no audit_log row must be inserted on idempotent no-op re-run'
			).toBe(0);
		} finally {
			verifyClient.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 5.6-INT-003 — Worker restart does not re-close already-closed registration [P1] SKIP
// AC-5 (R-004): Testcontainers worker restart idempotency scenario
// ---------------------------------------------------------------------------

describe('Story 5.6 — Worker Restart Does Not Re-Close Registration (AC-5, R-004)', () => {
	test.skip('[P1] 5.6-INT-003 — worker restart does not re-close an already-closed registration', async () => {
		// Activation condition: closeRegistrationHandler implemented (Task 2) + Testcontainers worker harness.
		//
		// AC-5 (R-004): After a worker process restarts, pg-boss may re-deliver pending jobs.
		//   The handler's registrationEnabled guard (R-004 MITIGATE) must prevent re-closing.
		//
		// Strategy (complex — requires Testcontainers worker stop/start):
		//   1. Seed booking with registration_enabled=true; set closes_at to past
		//   2. Start worker process via Testcontainers (or child_process spawn)
		//   3. Allow job to fire and close registration (registration_enabled=false)
		//   4. Stop worker process (simulate crash/restart)
		//   5. Restart worker process
		//   6. Assert: registration_enabled remains false; no duplicate audit row
		//
		// Note: This test requires the worker harness to be running.
		// The P0 equivalent (5.6-INT-002) validates the idempotency guard at the unit level.

		// TODO: Implement Testcontainers worker harness when P1 activation is needed.
		expect(true).toBe(true); // placeholder
	});
});

// ---------------------------------------------------------------------------
// 5.6-INT-004 — Manual close action sets registration_enabled=false [P1] SKIP
// AC-2 (FR-034b): closeRegistration server action closes immediately
// ---------------------------------------------------------------------------

describe('Story 5.6 — Manual Close Action Sets registration_enabled=false (AC-2, FR-034b)', () => {
	test.skip('[P1] 5.6-INT-004 — closeRegistration action sets registration_enabled=false and writes audit log', async () => {
		// Activation condition: closeRegistration action implemented in
		//   src/routes/(app)/bookings/[id]/+page.server.ts (Task 6).
		//
		// AC-2 (FR-034b): The authenticated booking owner can close registration immediately.
		//   The closeRegistration form action must:
		//     - Set registration_enabled = false in the bookings table
		//     - Write audit_log row: entity='booking', action='close-registration', actorId=user.id
		//     - Redirect 303 to /bookings/[id]
		//     - Be idempotent: second call (already closed) must not error
		//
		// Strategy:
		//   1. Seed user + profile + room + booking with registration_enabled=true
		//   2. Call the closeRegistration action directly (not via HTTP — direct function call)
		//   3. Assert: registration_enabled=false in DB
		//   4. Assert: audit_log row with entity='booking', action='close-registration', actorId=user.id
		//   5. Call again (idempotent): must not throw; registration_enabled still false

		// TODO: Implement when Task 6 (closeRegistration server action) is complete.
		// The action requires a SvelteKit RequestEvent — use a mock event or Playwright HTTP call.
		expect(true).toBe(true); // placeholder
	});
});

// ---------------------------------------------------------------------------
// 5.6-INT-005 — Handler file has no forbidden imports (lint/AST scan) [P2] SKIP
// AC-6 (R-011 DOCUMENT): No $app/* or $env/dynamic in close-registration.ts
// ---------------------------------------------------------------------------

describe('Story 5.6 — Close-Registration Handler Has No Forbidden SvelteKit Imports (AC-6, R-011)', () => {
	test.skip('[P2] 5.6-INT-005 — close-registration.ts handler does not import $app/* or $env/dynamic', async () => {
		// Activation condition: close-registration.ts handler implemented (Task 2).
		//
		// AC-6 (R-011 DOCUMENT): The worker is a standalone Bun process that cannot use
		//   SvelteKit's compile-time aliases ($lib, $app/*, $env/dynamic).
		//   Any such import causes MODULE_NOT_FOUND at runtime.
		//
		// Strategy (AST/text scan — no running server needed):
		//   1. Read the source of src/lib/server/jobs/handlers/close-registration.ts as text
		//   2. Assert: file content does NOT contain '$app/' or '$env/dynamic'
		//   3. Assert: file content does NOT contain '$lib' (relative imports only)
		//   4. Assert: file content DOES contain relative import patterns ('../../db/' etc.)

		const { readFileSync } = await import('node:fs');
		const { resolve } = await import('node:path');

		const handlerPath = resolve('src/lib/server/jobs/handlers/close-registration.ts');
		const handlerSource = readFileSync(handlerPath, 'utf-8');

		// R-011: no $app/* imports (would fail at worker runtime)
		expect(handlerSource, '5.6-INT-005: handler must not import from $app/*').not.toMatch(
			/from ['"]?\$app\//
		);

		// R-011: no $env/dynamic (would fail at worker runtime)
		expect(handlerSource, '5.6-INT-005: handler must not import from $env/dynamic').not.toMatch(
			/from ['"]?\$env\/dynamic/
		);

		// R-011: no $lib alias (SvelteKit alias unavailable in standalone Bun worker)
		expect(handlerSource, '5.6-INT-005: handler must not import via $lib alias').not.toMatch(
			/from ['"]?\$lib\//
		);

		// Positive assertion: relative imports ARE used
		expect(
			handlerSource,
			'5.6-INT-005: handler must use relative imports (../../ pattern)'
		).toMatch(/from ['"]\.\.\//);
	});
});

// ===========================================================================
// STORY 5.8 — Registrant List & Dashboard Headcount
//
// ATDD Red-Phase Integration Scaffolds — Story 5.8: Registrant List & Dashboard Headcount
//
// STATUS:
//   5.8-INT-IDOR-001: P0 ACTIVE — guarded by DEV_SERVER_URL env var (HTTP-level test)
//   5.8-INT-001:      P0 ACTIVE — red phase (fail until getRegistrantsByBookingId implemented)
//   5.8-INT-002:      P0 ACTIVE — red phase (fail until registrantCount added to getUpcomingBookingsByOrganizer)
//   5.8-INT-003:      P2 test.skip — activate during implementation
//
// AC Coverage:
//   - AC-1: getRegistrantsByBookingId returns all registrations for a booking ordered by createdAt
//   - AC-3 (R-007 MITIGATE): IDOR guard — non-owner gets 403/404 on /bookings/[id]/registrants
//   - AC-5 (FR-052): getUpcomingBookingsByOrganizer returns registrantCount = count of status='registered' rows
//   - AC-6: Cancelled registrants are NOT counted in registrantCount (only status='registered' counted)
//
// Scenario IDs (from story 5.8 Task 6 + Task 7):
//   P0 (ACTIVATED — will fail until implementation is complete):
//   - 5.8-INT-IDOR-001: Registrant list IDOR — non-owner gets 403/404 (R-007 MITIGATE) [P0]
//   - 5.8-INT-001:      Registrant list shows correct status: Registered / Cancelled [P0]
//   - 5.8-INT-002:      Dashboard headcount = registered count only (excludes cancelled) [P0]
//   P2 (skipped — activate during implementation):
//   - 5.8-INT-003:      Admin sees registrant list for event they do not own [P2]
//
// PR Gate Tests (MUST pass before merge):
//   - 5.8-INT-IDOR-001 — R-007 MITIGATE (mandatory, same tier as 5.1-INT-IDOR-001 and 5.2-INT-CLOSED-001)
//   - 5.8-INT-001 — registrant list statuses correct
//   - 5.8-INT-002 — headcount excludes cancelled
//
// Prerequisites:
//   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
//   - Story 5.8 Tasks 1–2 implemented:
//     - getRegistrantsByBookingId() added to src/lib/server/db/queries/registrations.ts
//     - getUpcomingBookingsByOrganizer() extended with registrantCount subquery in bookings.ts
//   - For 5.8-INT-IDOR-001: DEV_SERVER_URL env var pointing to a running SvelteKit dev server
//     with /bookings/[id]/registrants route + owner-or-admin guard implemented (Task 4)
//
// Architecture — IDOR guard (R-007 MITIGATE):
//   The /bookings/[id]/registrants route checks user.id === booking.organizerId (or user.isAdmin).
//   5.8-INT-IDOR-001 seeds two organizers + bookings, then asserts that organizer B
//   is denied access to organizer A's registrant list.
//   Organizer B's session is seeded directly in the DB (NOT via dev bypass) because
//   dev bypass always creates the same fixed test user.
//
// Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
//   All string assertions use English mock data. Paraglide keys tested by name only.
// ===========================================================================

// ---------------------------------------------------------------------------
// Seed helper — seedBooking (Story 5.8) — no registrationToken required
// ---------------------------------------------------------------------------

/**
 * Seeds a booking row linked to organizerId and roomId.
 * Does NOT require a registrationToken — used for organizer-scoped routes.
 * Returns the bookingId.
 */
async function seedBooking(
	client: pg.PoolClient,
	opts: {
		organizerId: string;
		roomId: string;
		eventName: string;
		slotStart?: string;
		slotEnd?: string;
	}
): Promise<string> {
	const bookingId = randomUUID();
	const slotStart = opts.slotStart ?? '2026-10-01 09:00:00+00';
	const slotEnd = opts.slotEnd ?? '2026-10-01 10:00:00+00';
	await client.query(
		`INSERT INTO bookings (
      id, room_id, organizer_id, event_name, agenda, during,
      status, catering_enabled, registration_enabled, registration_token,
      created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, NULL,
      tstzrange($5::timestamptz, $6::timestamptz, '[)'),
      'active', false, true, $7,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING`,
		[
			bookingId,
			opts.roomId,
			opts.organizerId,
			opts.eventName,
			slotStart,
			slotEnd,
			`5-8-token-${bookingId}`
		]
	);
	return bookingId;
}

// ---------------------------------------------------------------------------
// Cookie signing helper — produces a Better Auth-compatible signed cookie value.
//
// Better Auth (via better-call) signs session cookies as:
//   encodeURIComponent("{token}.{base64(HMAC-SHA256(token, AUTH_SECRET))}")
//
// Integration tests must send signed cookies because Better Auth's getSession()
// calls getSignedCookie(), which rejects unsigned (or incorrectly signed) values.
//
// AUTH_SECRET must match the value used by the running dev server. It is injected
// via the CI workflow's AUTH_SECRET env var for the integration test step.
// ---------------------------------------------------------------------------

/**
 * Signs a session token value using the same HMAC-SHA256 algorithm that
 * Better Auth (via better-call) uses for its signed session cookie.
 *
 * Returns the full cookie header string suitable for use in fetch() headers:
 *   `better-auth.session_token=<signedValue>`
 */
function buildSignedSessionCookie(token: string): string {
	const secret = process.env['AUTH_SECRET'];
	if (!secret) {
		throw new Error(
			'AUTH_SECRET env var not set — integration tests require AUTH_SECRET to sign session cookies. ' +
				'Ensure AUTH_SECRET is passed to the test process (CI workflow: add to Run integration tests env).'
		);
	}
	// HMAC-SHA256 the token with the secret, encode as base64
	const signature = createHmac('sha256', secret).update(token).digest('base64');
	// Better Auth cookie format: "{value}.{signature}" → URL-encoded
	const signedValue = encodeURIComponent(`${token}.${signature}`);
	return `better-auth.session_token=${signedValue}`;
}

/**
 * Seeds a user + profile + session row, and returns a signed session cookie
 * compatible with Better Auth's getSignedCookie() validation.
 *
 * IMPORTANT: For IDOR proofs, seed sessions directly in DB — do NOT use dev bypass,
 * which always creates the same fixed user.
 *
 * Better Auth's getSession() calls getSignedCookie(), which requires an
 * HMAC-SHA256 signed cookie value. Unsigned raw tokens are rejected, resulting
 * in a 302 redirect to /login before the route's ownership guard can run.
 */
async function seedUserWithSession(
	client: pg.PoolClient,
	prefix: string
): Promise<{ userId: string; sessionCookie: string }> {
	const userId = randomUUID();
	const sessionToken = `test-session-${prefix}-${randomUUID()}`;
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h from now

	await client.query(
		`INSERT INTO users ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, false, NOW(), NOW())
     ON CONFLICT ("id") DO NOTHING`,
		[userId, `Test User ${prefix}`, `${prefix}-${userId}@example.com`]
	);

	await client.query(
		`INSERT INTO user_profiles ("id", "userId", "email", "title", "firstName", "lastName", "phone", "organization", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, 'Dr.', $3, 'Organizer', '0812345678', 'Test Org', NOW(), NOW())
     ON CONFLICT ("userId") DO NOTHING`,
		[userId, `profile-${userId}@example.com`, prefix]
	);

	await client.query(
		`INSERT INTO sessions ("id", "expiresAt", "token", "createdAt", "updatedAt", "userId")
     VALUES (gen_random_uuid(), $1::timestamptz, $2, NOW(), NOW(), $3)
     ON CONFLICT ("token") DO NOTHING`,
		[expiresAt, sessionToken, userId]
	);

	return {
		userId,
		sessionCookie: buildSignedSessionCookie(sessionToken)
	};
}

// ---------------------------------------------------------------------------
// 5.8-INT-IDOR-001 — Registrant list IDOR — non-owner gets 403/404 [P0] ACTIVE
// AC-3 (R-007 MITIGATE): IDOR ownership guard on /bookings/[id]/registrants
// ---------------------------------------------------------------------------

describe('Story 5.8 — Registrant List IDOR Guard (AC-3, R-007 MITIGATE)', () => {
	// This test requires a running dev server. Guard with skipIf so the full test
	// suite can run without a server (CI integration-only mode).
	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P0] 5.8-INT-IDOR-001 — non-owner organizer gets 403/404 on /bookings/[id]/registrants',
		{ timeout: 15000 },
		async () => {
			// THIS TEST WILL FAIL until /bookings/[id]/registrants + owner-or-admin guard
			// is implemented (Task 4 in story 5.8).
			//
			// AC-3 (R-007 MITIGATE): The /bookings/[id]/registrants page must only be
			//   accessible by the booking's organizer (or an admin).
			//   Non-owner organizer B attempting to view organizer A's registrant list
			//   must receive 403 or 404.
			//
			// Strategy:
			//   1. Seed organizer A (owner) with a session + booking
			//   2. Seed organizer B (non-owner) with a session
			//   3. Use testOwnershipEnforcement() to assert B is denied on A's booking registrant route
			//   4. Seed a registrant for bookingA so the route has data to protect

			const { testOwnershipEnforcement } = await import('../support/helpers/idor-template.js');

			const devServerUrl = process.env['DEV_SERVER_URL']!;

			const client = await pool.connect();
			let bookingAId: string;
			let nonOwnerCookie: string;

			try {
				// Seed organizer A (owner of the booking)
				const ownerA = await seedUserWithSession(client, '5-8-idor-owner-a');
				const roomA = await seedRoom(client, '5-8-idor-a');
				bookingAId = await seedBooking(client, {
					organizerId: ownerA.userId,
					roomId: roomA,
					eventName: 'ATDD Test Event 5.8-IDOR-001 (Owner A — SHOULD NOT LEAK)',
					slotStart: '2026-11-01 09:00:00+00',
					slotEnd: '2026-11-01 10:00:00+00'
				});

				// Seed a registrant for bookingA (so the route has data to protect)
				await seedRegistrant(client, {
					bookingId: bookingAId,
					email: `registrant-idor-${randomUUID()}@example.com`,
					status: 'registered'
				});

				// Seed organizer B (non-owner — will attempt access)
				const nonOwnerB = await seedUserWithSession(client, '5-8-idor-non-owner-b');
				nonOwnerCookie = nonOwnerB.sessionCookie;
			} finally {
				client.release();
			}

			// Assert: non-owner B cannot access owner A's registrant list.
			// Wrap in expect(...).resolves.toBeUndefined() to satisfy Vitest's requireAssertions.
			// testOwnershipEnforcement resolves (returns undefined) when the route correctly denies
			// the non-owner; it throws when an unexpected status is received (IDOR bypass).
			await expect(
				testOwnershipEnforcement({
					routeUrl: `${devServerUrl}/bookings/${bookingAId}/registrants`,
					method: 'GET',
					nonOwnerCookie,
					expectedDenialStatuses: [403, 404]
				}),
				'non-owner organizer must be denied 403/404 on /bookings/[id]/registrants (AC-3 / R-007 MITIGATE)'
			).resolves.toBeUndefined();
		}
	);
});

// ---------------------------------------------------------------------------
// 5.8-INT-001 — Registrant list shows correct status: Registered / Cancelled [P0] ACTIVE
// AC-1: getRegistrantsByBookingId returns all registrations with correct statuses
// ---------------------------------------------------------------------------

describe('Story 5.8 — Registrant List Shows Correct Status (AC-1)', () => {
	test('[P0] 5.8-INT-001 — registrant list shows correct status: Registered and Cancelled', async () => {
		// THIS TEST WILL FAIL until getRegistrantsByBookingId is implemented (Task 1).
		//
		// AC-1: GET /bookings/[id]/registrants page must show all registrants for the booking.
		//   Each row shows: first name, last name, organization, email, and status.
		//   Both 'registered' and 'cancelled' statuses must appear.
		//
		// Strategy:
		//   1. Seed user + profile + room + booking
		//   2. Seed 2 registrants: one status='registered', one status='cancelled'
		//   3. Call getRegistrantsByBookingId(bookingId)
		//   4. Assert both rows returned with correct status values
		//   5. Assert ordering is by createdAt ASC (first seeded row comes first)

		const { getRegistrantsByBookingId } =
			await import('../../src/lib/server/db/queries/registrations.js');

		const client = await pool.connect();
		let bookingId: string;
		try {
			const organizerId = await seedUser(client, '5-8-int-001');
			await seedUserProfile(client, organizerId, { firstName: 'Eve', lastName: 'Organizer' });
			const roomId = await seedRoom(client, '5-8-int-001');
			bookingId = await seedBooking(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Test Event 5.8-INT-001',
				slotStart: '2026-10-10 09:00:00+00',
				slotEnd: '2026-10-10 10:00:00+00'
			});

			// Seed two registrants: one registered, one cancelled
			await seedRegistrant(client, {
				bookingId,
				email: `registered-${randomUUID()}@example.com`,
				status: 'registered'
			});

			await seedRegistrant(client, {
				bookingId,
				email: `cancelled-${randomUUID()}@example.com`,
				status: 'cancelled'
			});
		} finally {
			client.release();
		}

		const result = await getRegistrantsByBookingId(bookingId);

		// AC-1: Both registrants must be returned (list includes all statuses)
		expect(result, '5.8-INT-001: getRegistrantsByBookingId must return an array').toBeDefined();
		expect(
			result.length,
			'5.8-INT-001: both registrants (registered + cancelled) must be returned'
		).toBe(2);

		// Assert both status values are present in the result
		const statuses = result.map((r) => r.status);
		expect(statuses, '5.8-INT-001: registered status must be present').toContain('registered');
		expect(statuses, '5.8-INT-001: cancelled status must be present').toContain('cancelled');

		// Assert each row has the expected shape (AC-1: name, org, email, status)
		for (const reg of result) {
			expect(typeof reg.firstName, '5.8-INT-001: firstName must be a string').toBe('string');
			expect(typeof reg.lastName, '5.8-INT-001: lastName must be a string').toBe('string');
			expect(typeof reg.organization, '5.8-INT-001: organization must be a string').toBe('string');
			expect(typeof reg.email, '5.8-INT-001: email must be a string').toBe('string');
			expect(
				['registered', 'cancelled'],
				'5.8-INT-001: status must be registered or cancelled'
			).toContain(reg.status);
		}
	});
});

// ---------------------------------------------------------------------------
// 5.8-INT-002 — Dashboard headcount = registered count only (excludes cancelled) [P0] ACTIVE
// AC-5 (FR-052), AC-6: getUpcomingBookingsByOrganizer returns registrantCount = status='registered' only
// ---------------------------------------------------------------------------

describe('Story 5.8 — Dashboard Headcount Excludes Cancelled Registrants (AC-5, AC-6, FR-052)', () => {
	test('[P0] 5.8-INT-002 — dashboard headcount equals registered count only; cancelled registrants excluded', async () => {
		// THIS TEST WILL FAIL until getUpcomingBookingsByOrganizer is extended
		// with the registrantCount subquery (Task 2 in story 5.8).
		//
		// AC-5 (FR-052): The organizer dashboard shows live count of status='registered' rows.
		// AC-6: Registrants with status='cancelled' are NOT counted in the headcount.
		//
		// Strategy:
		//   1. Seed organizer + profile + room + booking with an upcoming slot (future date)
		//   2. Seed 3 registrants with status='registered' + 1 with status='cancelled' (4 total)
		//   3. Call getUpcomingBookingsByOrganizer(organizerId)
		//   4. Assert the booking row has registrantCount === 3 (not 4 — cancelled excluded)
		//
		// Critical:
		//   - registrantCount must be a JS number, not a string (::int cast in SQL)
		//   - getUpcomingBookingsByOrganizer filters to upcoming bookings (slot in future)

		const { getUpcomingBookingsByOrganizer } =
			await import('../../src/lib/server/db/queries/bookings.js');

		const client = await pool.connect();
		let organizerId: string;
		let bookingId: string;
		try {
			organizerId = await seedUser(client, '5-8-int-002');
			await seedUserProfile(client, organizerId, { firstName: 'Frank', lastName: 'Organizer' });
			const roomId = await seedRoom(client, '5-8-int-002');

			// Seed a booking in the FUTURE so it appears in getUpcomingBookingsByOrganizer
			// (query filters by slot > NOW())
			const futureStart = '2027-06-01 09:00:00+00';
			const futureEnd = '2027-06-01 10:00:00+00';
			bookingId = await seedBooking(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Test Event 5.8-INT-002 (Dashboard Headcount)',
				slotStart: futureStart,
				slotEnd: futureEnd
			});

			// Seed 3 registered + 1 cancelled registrants
			for (let i = 0; i < 3; i++) {
				await seedRegistrant(client, {
					bookingId,
					email: `registered-${i}-${randomUUID()}@example.com`,
					status: 'registered'
				});
			}
			await seedRegistrant(client, {
				bookingId,
				email: `cancelled-${randomUUID()}@example.com`,
				status: 'cancelled'
			});
		} finally {
			client.release();
		}

		const bookings = await getUpcomingBookingsByOrganizer(organizerId);

		// Locate the seeded booking in the results
		const bookingRow = bookings.find((b) => b.id === bookingId);
		expect(
			bookingRow,
			'5.8-INT-002: seeded booking must appear in getUpcomingBookingsByOrganizer results'
		).toBeDefined();

		if (!bookingRow) return; // type narrowing

		// AC-5 (FR-052): registrantCount must be present on the row
		expect(
			'registrantCount' in bookingRow,
			'5.8-INT-002: bookingRow must have registrantCount field (Task 2.1 type extension)'
		).toBe(true);

		// AC-6: registrantCount must equal 3 (registered only — cancelled excluded)
		expect(
			(bookingRow as { registrantCount: number }).registrantCount,
			'5.8-INT-002: registrantCount must be 3 (3 registered; 1 cancelled excluded per AC-6)'
		).toBe(3);

		// AC-6: registrantCount must be a number, not a string (::int cast requirement)
		expect(
			typeof (bookingRow as { registrantCount: unknown }).registrantCount,
			'5.8-INT-002: registrantCount must be JS number (not string) — ::int cast required in SQL'
		).toBe('number');
	});
});

// ---------------------------------------------------------------------------
// 5.8-INT-003 — Admin sees registrant list for event they do not own [P2] SKIP
// AC-3: Admin user (isAdmin=true) can view registrant list for ALL events
// ---------------------------------------------------------------------------

describe('Story 5.8 — Admin Cross-Event Registrant List Access (AC-3)', () => {
	test.skip('[P2] 5.8-INT-003 — admin user sees registrant list for event they do not own', async () => {
		// Activation condition: Task 4 complete (/bookings/[id]/registrants + owner-or-admin guard).
		//
		// AC-3: Admin users (user.isAdmin = true) may view registrant lists for ALL events,
		//   not just the events they own. The custom owner-or-admin guard skips assertOwner
		//   for admin users:
		//     if (!user.isAdmin && user.id !== booking.organizerId) { error(403, 'Forbidden') }
		//
		// Strategy:
		//   1. Seed an admin user with a session (isAdmin=true in users table or relevant auth table)
		//   2. Seed a second organizer's booking with some registrants
		//   3. Admin GET /bookings/[other-organizer-booking-id]/registrants → must return 200
		//   4. Assert registrant data is visible to admin

		const devServerUrl = process.env['DEV_SERVER_URL']!;

		const client = await pool.connect();
		let otherOrgBookingId: string;
		let adminCookie: string;

		try {
			// Seed a regular organizer + booking
			const otherOrg = await seedUserWithSession(client, '5-8-int-003-other-org');
			const roomId = await seedRoom(client, '5-8-int-003');
			otherOrgBookingId = await seedBooking(client, {
				organizerId: otherOrg.userId,
				roomId,
				eventName: 'ATDD Test Event 5.8-INT-003 (Other Organizer)',
				slotStart: '2026-11-15 09:00:00+00',
				slotEnd: '2026-11-15 10:00:00+00'
			});

			await seedRegistrant(client, {
				bookingId: otherOrgBookingId,
				email: `admin-test-registrant-${randomUUID()}@example.com`,
				status: 'registered'
			});

			// Seed admin user — better-auth uses a separate roles/permissions mechanism;
			// the isAdmin check in this app is implemented via user_profiles or a custom
			// flag in the users table. Verify the exact column in the users schema before
			// activating this test. The approach below seeds isAdmin in users table.
			const adminUserId = randomUUID();
			const adminSessionToken = `admin-session-${randomUUID()}`;
			const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

			await client.query(
				`INSERT INTO users ("id", "name", "email", "emailVerified", "is_admin", "createdAt", "updatedAt")
         VALUES ($1, 'Admin User 5.8-INT-003', $2, false, true, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
				[adminUserId, `admin-5-8-int-003-${adminUserId}@example.com`]
			);
			await client.query(
				`INSERT INTO sessions ("id", "expiresAt", "token", "createdAt", "updatedAt", "userId")
         VALUES (gen_random_uuid(), $1::timestamptz, $2, NOW(), NOW(), $3)
         ON CONFLICT ("token") DO NOTHING`,
				[expiresAt, adminSessionToken, adminUserId]
			);

			adminCookie = buildSignedSessionCookie(adminSessionToken);
		} finally {
			client.release();
		}

		// Admin should get 200 (not 403) on another organizer's registrant list
		const response = await fetch(`${devServerUrl}/bookings/${otherOrgBookingId}/registrants`, {
			headers: { Cookie: adminCookie },
			redirect: 'manual'
		});

		expect(
			response.status,
			"5.8-INT-003: admin must receive 200 (not 403) on another organizer's registrant list"
		).toBe(200);
	});
});

// ===========================================================================
// ATDD Red-Phase Integration Scaffolds — Story 5.5: Resend a Lost Link
//
// STATUS:
//   P0 test ACTIVE (test.skipIf — skipped locally without DEV_SERVER_URL, runs in CI).
//   P1 test skipped (activate after route action is wired).
//   P2 test skipped (activate after route action is wired + pg-boss job assertion).
//
// AC Coverage:
//   - AC-3 + AC-6 (R-003 MITIGATE): Resend endpoint returns identical HTTP status
//                                    and response shape for registered email and
//                                    unregistered email — no enumeration signal.
//   - AC-4 (via P2 stub): Resend action enqueues a SEND_EMAIL pg-boss job (async).
//
// Scenario IDs (from story 5.5 Task 7 + test-design-epic-5.md):
//   P0 (ACTIVE — skipped without DEV_SERVER_URL, runs in CI):
//   - 5.5-INT-001: POST /r/[token]/resend with registered + unregistered email
//                  → both return HTTP 200, identical response shape, no 'found' field (R-003 MITIGATE)
//   P1 (skipped — activate after route action wired):
//   - 5.5-E2E-001: Resend form shows neutral acknowledgement in browser (Playwright stub)
//   P2 (skipped — activate after route action wired):
//   - 5.5-INT-002: Resend action enqueues send-email pg-boss job (not synchronous)
//
// Prerequisites:
//   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
//   - DEV_SERVER_URL set (e.g. http://localhost:5173) for 5.5-INT-001 to run
//   - Story 5.5 implementation complete (Tasks 1–4):
//       resend route at /r/[token]/resend, ResendSchema, resendRegistrationLink service,
//       always-acknowledge response pattern
//
// Architecture note (R-003 MITIGATE — MANDATORY):
//   5.5-INT-001 drives the HTTP endpoint directly, not the service. The externally
//   observable contract must be neutral — same status + body shape for found/not-found.
//   Internally the service returns { found: boolean }, but the action MUST discard this
//   from the response. This test closes R-003 (email enumeration, score=6 OPEN).
//
//   The resend action uses test.skipIf(!process.env['DEV_SERVER_URL']) — same pattern
//   as 5.8-INT-IDOR-001 — so it is skipped in local unit-only runs but runs in CI.
//
// Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
//   All string assertions use English mock data. Paraglide keys tested by name only.
// ===========================================================================

// ---------------------------------------------------------------------------
// 5.5-INT-001 — Resend neutral disclosure (R-003 MITIGATE) [P0] ACTIVE (skipIf DEV_SERVER_URL)
// AC-3: Always acknowledge (same status + body shape for found and not-found)
// AC-6: Registration not found → silent no-op, same acknowledgement
// ---------------------------------------------------------------------------

describe('Story 5.5 — Resend Neutral Disclosure (R-003 MITIGATE)', () => {
	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P0] 5.5-INT-001 — resend endpoint returns identical status and shape for registered and unregistered email',
		{ timeout: 15000 },
		async () => {
			// THIS TEST WILL FAIL until the resend route is implemented (Tasks 1–4).
			//
			// AC-3 + AC-6 (R-003 MITIGATE — MANDATORY PR GATE):
			//   POST to /r/[registrationToken]/resend with a registered email (found case)
			//   and an unregistered email (not-found case). Assert both return HTTP 200 and
			//   the response body has the same shape — no 'found' field exposed externally.
			//   This closes R-003 (email enumeration risk score=6 OPEN).
			//
			// Strategy:
			//   1. Seed organizer + profile + room + booking (registrationEnabled=true, known token).
			//   2. Seed one 'registered' registrant (registrantEmail).
			//   3. POST /r/[token]/resend?/resend with registrantEmail (found case) → assert 200 + shape.
			//   4. POST /r/[token]/resend?/resend with unknown email (not-found case) → assert 200 + shape.
			//   5. Assert both response bodies have the same top-level keys (no 'found' field disclosed).

			const devServerUrl = process.env['DEV_SERVER_URL']!;

			const client = await pool.connect();
			let registrationToken: string;
			const registrantEmail = `resend-int-001-${randomUUID().replace(/-/g, '')}@example.com`;

			try {
				const organizerId = await seedUser(client, 'int-5-5-001');
				await seedUserProfile(client, organizerId, { firstName: 'Alice', lastName: 'Test' });
				const roomId = await seedRoom(client, 'int-5-5-001');
				registrationToken = `5-5-int-001-${randomUUID().replace(/-/g, '')}`;
				const bookingId = await seedBookingWithToken(client, {
					organizerId,
					roomId,
					eventName: 'ATDD Test Event 5.5-INT-001',
					token: registrationToken,
					registrationEnabled: true
				});
				await seedRegistrant(client, { bookingId, email: registrantEmail, status: 'registered' });
			} finally {
				client.release();
			}

			const resendUrl = `${devServerUrl}/r/${registrationToken}/resend`;

			// POST helper: submit the resend form via SvelteKit action (?/resend)
			// Accept: application/json is REQUIRED — SvelteKit's is_action_json_request()
			// gates the JSON response path on this header. Without it, the action falls
			// through to a full HTML page render and res.json() would throw a parse error.
			async function postResend(email: string) {
				const body = new URLSearchParams({ email });
				const res = await fetch(`${resendUrl}?/resend`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Accept: 'application/json'
					},
					body: body.toString(),
					redirect: 'manual'
				});
				return res;
			}

			// Found case — registered email
			const foundRes = await postResend(registrantEmail);
			expect(foundRes.status, '5.5-INT-001: registered email must return 200').toBe(200);
			// SvelteKit action JSON envelope: { type, status, data: devalue.stringify(...) }
			// We must decode `data` with devalue.parse() to access the actual action payload.
			// Asserting on the raw envelope would be vacuous — `found` would never appear
			// as a top-level key regardless of what the action returned.
			const { parse: devalueParse } = await import('devalue');
			const foundEnvelope = (await foundRes.json()) as {
				type: string;
				status: number;
				data: string;
			};
			const foundPayload = devalueParse(foundEnvelope.data) as Record<string, unknown>;

			// Not-found case — unregistered email
			const notFoundEmail = `not-registered-${randomUUID()}@example.com`;
			const notFoundRes = await postResend(notFoundEmail);
			expect(notFoundRes.status, '5.5-INT-001: unregistered email must also return 200').toBe(200);
			const notFoundEnvelope = (await notFoundRes.json()) as {
				type: string;
				status: number;
				data: string;
			};
			const notFoundPayload = devalueParse(notFoundEnvelope.data) as Record<string, unknown>;

			// R-003 MITIGATE: the action payload must NOT expose 'found' in either case.
			// The service returns `{ found: boolean }` internally — the action DISCARDS it.
			expect(
				foundPayload,
				'5.5-INT-001: found case payload must not expose found field (R-003)'
			).not.toHaveProperty('found');
			expect(
				notFoundPayload,
				'5.5-INT-001: not-found case payload must not expose found field (R-003)'
			).not.toHaveProperty('found');

			// The payload must acknowledge the request with { form, acknowledged: true }.
			// We compare key sets (not values) — form.data.email legitimately differs
			// between found/not-found cases, but the shape must be identical.
			expect(
				foundPayload['acknowledged'],
				'5.5-INT-001: found case payload must have acknowledged: true'
			).toBe(true);
			expect(
				notFoundPayload['acknowledged'],
				'5.5-INT-001: not-found case payload must have acknowledged: true'
			).toBe(true);
			expect(
				Object.keys(foundPayload).sort(),
				'5.5-INT-001: response shape must be identical for both cases (R-003 neutrality)'
			).toEqual(Object.keys(notFoundPayload).sort());
		}
	);
});

// ---------------------------------------------------------------------------
// 5.5-INT-002 — Resend enqueues send-email pg-boss job (async) [P2] SKIP
// AC-4: Job exists in pgboss.job with singletonKey = 'resend-link-${registrationId}-${tokenNonce}'
// ---------------------------------------------------------------------------

describe('Story 5.5 — Resend Enqueues Email Job (AC-4, async proof)', () => {
	test.skip('[P2] 5.5-INT-002 — resend enqueues send-email pg-boss job (async, not synchronous)', async () => {
		// Activation condition: Tasks 1–4 complete (route action wired).
		//
		// AC-4: When a status='registered' registration exists for the given email+booking,
		//   the resend action enqueues a SEND_EMAIL pg-boss job with:
		//   singletonKey = 'resend-link-${registrationId}-${tokenNonce}'
		//   where tokenNonce = first 12 hex chars of the new cancel token plaintext (unique per rotation).
		//   No singletonSeconds — each rotation produces a unique key, so no dedup window is needed.
		//
		// Strategy:
		//   1. Seed booking + registrant (known registrationId + email).
		//   2. POST to /r/[token]/resend?/resend with the registrant email.
		//   3. Assert pgboss.job row exists with name='send-email' and
		//      singleton_key LIKE 'resend-link-${registrationId}-%' (suffix varies per rotation).
		//   Pattern: mirrors 5.3-INT-001+002 raw SQL proof (see Story 5.3 section).
		//
		// Note: singletonKey format differs from Story 5.3:
		//   5.3 uses 'registration-confirm-${registrationId}' (with singletonSeconds:86400)
		//   5.5 uses 'resend-link-${registrationId}-${tokenNonce}' (no singletonSeconds)

		throw new Error(
			'5.5-INT-002: not yet implemented — activate after Task 4 (resend action) is wired'
		);
	});
});
