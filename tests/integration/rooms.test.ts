/**
 * ATDD Red-Phase Scaffolds — Story 3.1: Create and Edit Rooms
 * Integration Tests: Room CRUD, validation, authorization, audit log
 *
 * TDD RED PHASE: All tests are marked test.skip() (or test.skipIf()) and will remain
 * skipped until the developer activates them task-by-task during implementation.
 *
 * These tests run in the Vitest `integration` project which requires a real
 * PostgreSQL instance. The global setup (tests/support/integration-setup.ts)
 * starts Testcontainers when DATABASE_URL is not set, or uses the CI Postgres
 * service when DATABASE_URL is already provided.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` (or `test.skipIf(` → `test.skipIf(`) for the
 *      current task's test(s).
 *   2. Ensure Postgres is running (via Testcontainers or CI service).
 *   3. Run: `bun run test:integration` — verify it FAILS first (red).
 *   4. Implement the feature (per task in story 3.1).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: Admin creates a room → saved to DB + appears in room list with correct fields
 *   - AC-2: Edit-room form with changed values → room row updated + new values in list
 *   - AC-3: Empty name → HTTP 422, field-level error, no room row inserted
 *   - AC-4: Non-admin POST to /admin/rooms/** → 403 (requireAdmin enforcement)
 *   - AC-5: Create/edit that commits → audit_log row (entity='room', action, actor_id, diff)
 *   - AC-6: routeGuards registry has requireAdmin guard for /admin/rooms/** pattern
 *
 * Scenario IDs (from test-design-epic-3.md):
 *   P0:
 *   - 3.1-INT-001: Admin creates room → appears in list [P0]
 *   - 3.1-INT-002: Empty name rejected → 422, no row inserted [P0]
 *   - 3.1-INT-003: Room edit saves updated fields [P0]
 *   - 3.1-INT-006: Non-admin POST room create → 403 (IDOR/authorization) [P0]
 *   - 3.1-INT-008: Room create/edit writes audit_log row [P0]
 *   P1:
 *   - 3.1-INT-004: All 3 features stored as correct enum values [P1]
 *   - 3.1-INT-005: No features → empty array (not null) [P1]
 *   - 3.1-INT-007: Non-admin PATCH room edit → 403 [P1]
 *   - 3.1-UNIT-001: requireAdmin guard registered for /admin/rooms/** in routeGuards [P1]
 *   (3.1-UNIT-002 is in db-schema.test.ts — partial index assertion)
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - Story 3.1 implemented: rooms table, room-service.ts, admin routes, requireAdmin guard
 *   - drizzle-kit migrate applied (includes rooms table + partial index)
 *   - DEV_SERVER_URL env var for HTTP-level tests (default: http://localhost:3000)
 *   - AUTH_DEV_BYPASS=true for dev server HTTP tests
 *
 * Architecture requirements (from story dev notes):
 *   - Route handlers call room-service.ts — never call Drizzle directly
 *   - Every create/update mutation writes audit_log in the same transaction
 *   - Admin routes protected by requireAdmin pushed to routeGuards (not per-route inline)
 *   - Dev bypass user has is_admin=false — NOT usable for admin success tests
 *   - HTTP-level admin tests use service-level calls (no auth needed) for success paths
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   All user-facing strings flow through Paraglide (m.* keys).
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { createHmac } from 'node:crypto';

// ---------------------------------------------------------------------------
// Cookie signing helper — same HMAC-SHA256 pattern used by profile.test.ts
// Better Auth requires signed session cookies.
// ---------------------------------------------------------------------------

function buildSignedSessionCookie(token: string): string {
	const secret = process.env['AUTH_SECRET'];
	if (!secret) {
		throw new Error(
			'AUTH_SECRET env var not set — integration tests require AUTH_SECRET to sign session cookies.'
		);
	}
	const signature = createHmac('sha256', secret).update(token).digest('base64');
	const signedValue = encodeURIComponent(`${token}.${signature}`);
	return `better-auth.session_token=${signedValue}`;
}

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
// Per-test table truncation for isolation
// Truncation order: rooms + audit_log (no FK from audit_log to rooms)
// ---------------------------------------------------------------------------

async function truncateRoomTables(): Promise<void> {
	const client = await pool.connect();
	try {
		for (const table of [
			'bookings',
			'rooms',
			'audit_log',
			'user_profiles',
			'sessions',
			'accounts',
			'users'
		]) {
			const result = await client.query<{ exists: boolean }>(
				`SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists`,
				[table]
			);
			if (result.rows[0]?.exists) {
				await client.query(`TRUNCATE TABLE ${table} CASCADE`);
			}
		}
	} finally {
		client.release();
	}
}

// ---------------------------------------------------------------------------
// Seed helpers — direct DB writes (no HTTP auth needed for service-level tests)
// ---------------------------------------------------------------------------

/**
 * Seeds a user row suitable for acting as admin.
 * Sets is_admin=true so service-level tests can pass actorId to createRoom/updateRoom.
 */
async function seedAdminUser(
	client: pg.PoolClient,
	opts: { userId?: string; email?: string } = {}
): Promise<{ userId: string; email: string }> {
	const userId = opts.userId ?? `test-admin-3.1-${randomUUID().slice(0, 8)}`;
	const email = opts.email ?? `test-admin-3.1-${randomUUID().slice(0, 8)}@example.com`;

	await client.query(
		`INSERT INTO users (id, email, "createdAt", "updatedAt", is_admin)
     VALUES ($1, $2, NOW(), NOW(), true)
     ON CONFLICT (id) DO NOTHING`,
		[userId, email]
	);

	return { userId, email };
}

/**
 * Seeds a non-admin (organizer) user + signed session cookie for HTTP-level IDOR tests.
 * The dev bypass seam creates the same fixed user with is_admin=false, so we use
 * direct DB seeding here for explicit control.
 */
async function seedOrganizerUserWithSession(
	client: pg.PoolClient,
	opts: { userId?: string; email?: string } = {}
): Promise<{ userId: string; email: string; sessionCookie: string }> {
	const userId = opts.userId ?? `test-org-3.1-${randomUUID().slice(0, 8)}`;
	const email = opts.email ?? `test-org-3.1-${randomUUID().slice(0, 8)}@example.com`;

	// Seed user with is_admin=false (organizer role — the default)
	await client.query(
		`INSERT INTO users (id, email, "createdAt", "updatedAt", is_admin)
     VALUES ($1, $2, NOW(), NOW(), false)
     ON CONFLICT (id) DO NOTHING`,
		[userId, email]
	);

	// Seed a profile row so the profile-complete guard doesn't intercept the request
	const profileId = `profile-org-3.1-${userId}`;
	await client.query(
		`INSERT INTO user_profiles (id, "userId", email, title, "firstName", "lastName", phone, organization, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT ("userId") DO NOTHING`,
		[profileId, userId, email, 'Mr.', 'Organizer', 'Test', '+1234567890', 'Test Org']
	);

	// Seed a session row and build a signed cookie
	const sessionToken = `test-session-org-3.1-${randomUUID().slice(0, 8)}`;
	const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

	await client.query(
		`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
		[`session-id-${userId}`, sessionToken, userId, expiresAt]
	);

	const sessionCookie = buildSignedSessionCookie(sessionToken);
	return { userId, email, sessionCookie };
}

const DEV_SERVER_URL = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// 3.1-INT-001 — Admin creates room → appears in list [P0]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Room Create: Admin creates a room and it appears in the list (AC-1)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P0] 3.1-INT-001 — createRoom() inserts a room row and listRooms() returns it with correct fields', async () => {
		// ACTIVE — Story 3.1: room-service.ts created with createRoom/listRooms (Tasks 1–3).
		//
		// AC-1: Given I am an admin, When I submit the create-room form with name, floor,
		//       capacity, and features, Then the room is saved to the database and appears
		//       in the admin room list with its correct field values.
		//
		// Strategy: service-level call (no HTTP needed — dev bypass user is not admin).
		// Import createRoom and listRooms directly; use seeded actorId.

		const { createRoom, listRooms } = await import('../../src/lib/server/services/room-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const input = {
			name: 'Conference Room A',
			floor: '2',
			capacity: 20,
			features: ['projector', 'whiteboard'] as const
		};

		const created = await createRoom(actorId, input);

		expect(created.id, 'createRoom must return a room with a non-empty id').toBeTruthy();
		expect(created.name, 'Room name must match input').toBe(input.name);
		expect(created.floor, 'Room floor must match input').toBe(input.floor);
		expect(created.capacity, 'Room capacity must match input').toBe(input.capacity);
		expect(created.features, 'Room features must match input').toEqual(
			expect.arrayContaining([...input.features])
		);
		expect(created.features.length, 'Features array length must match').toBe(input.features.length);

		const rooms = await listRooms();
		const found = rooms.find((r) => r.id === created.id);

		expect(found, 'listRooms() must include the newly created room').toBeDefined();
		expect(found?.name, 'Room in list must have correct name').toBe(input.name);
		expect(found?.floor, 'Room in list must have correct floor').toBe(input.floor);
		expect(found?.capacity, 'Room in list must have correct capacity').toBe(input.capacity);
	});
});

// ---------------------------------------------------------------------------
// 3.1-INT-002 — Empty name rejected → 422, no row inserted [P0]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Room Create Validation: Empty name returns 422, no row created (AC-3)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P0] 3.1-INT-002 — POST /admin/rooms with empty name → HTTP 422, no room row inserted',
		{ timeout: 15000 },
		async () => {
			// THIS TEST WILL FAIL — admin rooms route not yet implemented (Task 5).
			// Activate after Task 1 (schema), Task 2 (Valibot), Task 3 (service), Task 5 (routes).
			//
			// AC-3: Given I am an admin, When I submit a create-room form with an empty name,
			//       Then the form is rejected with HTTP 422 and a field-level error message,
			//       and no room row is inserted.
			//
			// Strategy: POST with empty name. The admin route uses superforms + valibot adapter
			// which returns fail(422, { form }) for validation errors.
			// Note: Requires a running dev server with an admin-authenticated session.
			//
			// Dev bypass user has is_admin=false. For HTTP-level test we need an admin session.
			// Seed an admin user directly in the DB and build a signed cookie.

			const client = await pool.connect();
			let adminSession: string;
			try {
				const admin = await seedAdminUser(client);

				// Seed a profile for the admin so profile-complete guard doesn't intercept
				const profileId = `profile-admin-3.1-${admin.userId}`;
				await client.query(
					`INSERT INTO user_profiles (id, "userId", email, title, "firstName", "lastName", phone, organization, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT ("userId") DO NOTHING`,
					[profileId, admin.userId, admin.email, 'Mr.', 'Admin', 'Test', '+1234567890', 'Test Org']
				);

				// Seed session
				const sessionToken = `test-session-admin-3.1-${randomUUID().slice(0, 8)}`;
				const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
				await client.query(
					`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
					[`session-admin-${admin.userId}`, sessionToken, admin.userId, expiresAt]
				);

				adminSession = buildSignedSessionCookie(sessionToken);
			} finally {
				client.release();
			}

			// POST with empty name — Valibot RoomSchema requires name to be non-empty
			const body = new URLSearchParams({
				name: '', // empty — must fail validation
				floor: '1',
				capacity: '10',
				'features[0]': 'projector'
			}).toString();

			// SvelteKit named-action form POSTs require the ?/actionName query param.
			// POSTing without it bypasses the action and hits no handler, resulting in a
			// 403 from the admin route guard instead of the expected 422 validation error.
			//
			// Accept: 'text/html' forces SvelteKit to use the non-JSON form action path,
			// which returns real HTTP status codes (422 for fail(), 302 for redirect()).
			// Without it, SvelteKit defaults to the JSON action path (Accept: */*)
			// which always returns HTTP 200 with the result encoded in the JSON body.
			// This is the same pattern used by profile.test.ts 2.3-INT-003.
			const response = await fetch(`${DEV_SERVER_URL}/admin/rooms?/create`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html',
					Cookie: adminSession
				},
				body,
				redirect: 'manual'
			});

			// superforms + valibot adapter returns fail(422) on validation error
			expect(
				response.status,
				`Expected HTTP 422 (Unprocessable Entity) for empty room name but got ${response.status}`
			).toBe(422);

			// Verify no room row was inserted
			const result = await pool.query<{ count: string }>(
				`SELECT COUNT(*)::text AS count FROM rooms`
			);
			const count = parseInt(result.rows[0]?.count ?? '0', 10);
			expect(count, 'No room row must be inserted when validation fails').toBe(0);
		}
	);
});

// ---------------------------------------------------------------------------
// 3.1-INT-003 — Room edit saves updated fields [P0]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Room Edit: Submitting edit form updates the room row (AC-2)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P0] 3.1-INT-003 — updateRoom() saves changed fields; prior values replaced', async () => {
		// ACTIVE — Story 3.1: room-service.ts created with updateRoom (Task 3).
		//
		// AC-2: Given an existing room, When I submit the edit-room form with changed values,
		//       Then the room row is updated and the new values appear in the room list.
		//
		// Strategy: service-level — createRoom then updateRoom, assert new values.

		const { createRoom, updateRoom, getRoomById } =
			await import('../../src/lib/server/services/room-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const originalInput = {
			name: 'Original Room',
			floor: '1',
			capacity: 10,
			features: ['projector'] as const
		};

		const created = await createRoom(actorId, originalInput);
		const roomId = created.id;

		const updatedInput = {
			name: 'Updated Room Name',
			floor: '3',
			capacity: 25,
			features: ['whiteboard', 'vc'] as const
		};

		const updated = await updateRoom(actorId, roomId, updatedInput);

		expect(updated.id, 'Updated room must retain the same id').toBe(roomId);
		expect(updated.name, 'Room name must reflect the update').toBe(updatedInput.name);
		expect(updated.floor, 'Room floor must reflect the update').toBe(updatedInput.floor);
		expect(updated.capacity, 'Room capacity must reflect the update').toBe(updatedInput.capacity);
		expect(updated.features, 'Room features must reflect the update').toEqual(
			expect.arrayContaining([...updatedInput.features])
		);

		// Verify via getRoomById
		const fetched = await getRoomById(roomId);
		expect(fetched, 'getRoomById must find the room after update').toBeDefined();
		expect(fetched?.name, 'DB row must show updated name').toBe(updatedInput.name);
		expect(fetched?.capacity, 'DB row must show updated capacity').toBe(updatedInput.capacity);
	});
});

// ---------------------------------------------------------------------------
// 3.1-INT-006 — Non-admin POST room create → 403 [P0]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Authorization: Non-admin organizer POST room create → 403 (AC-4, R-002)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P0] 3.1-INT-006 — Non-admin (organizer) POST /admin/rooms → 403 (IDOR proof)',
		{ timeout: 15000 },
		async () => {
			// THIS TEST WILL FAIL — admin rooms route not yet implemented (Task 4 + Task 5).
			// Activate after Task 4 (requireAdmin guard pushed to routeGuards) and Task 5 (routes).
			//
			// AC-4: Given an authenticated organizer (non-admin), When they attempt to POST
			//       to any /admin/rooms/** route, Then the server returns 403.
			//
			// Risk R-002: IDOR on admin room routes — organizer bypasses requireAdmin.
			//
			// Strategy: Seed a non-admin user + session, POST to /admin/rooms, assert 403.
			// Use testOwnershipEnforcement() with expectedDenialStatuses: [403].

			const { testOwnershipEnforcement } = await import('../support/helpers/idor-template.js');

			const client = await pool.connect();
			let organizerCookie: string;
			try {
				const organizer = await seedOrganizerUserWithSession(client);
				organizerCookie = organizer.sessionCookie;
			} finally {
				client.release();
			}

			const body = new URLSearchParams({
				name: 'Unauthorized Room',
				floor: '1',
				capacity: '10'
			}).toString();

			await testOwnershipEnforcement({
				routeUrl: `${DEV_SERVER_URL}/admin/rooms`,
				method: 'POST',
				nonOwnerCookie: organizerCookie,
				body,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				expectedDenialStatuses: [403]
			});
			// testOwnershipEnforcement throws on failure; reaching here means the 403 was enforced.
			// expect.assertions is required by vitest requireAssertions: true global config.
			expect(true).toBe(true);
		}
	);
});

// ---------------------------------------------------------------------------
// 3.1-INT-008 — Room create/edit writes audit_log row [P0]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Audit Log: Room create/edit writes audit_log row (AC-5)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P0] 3.1-INT-008a — createRoom() writes audit_log row with entity=room, action=create, actor_id, non-null diff', async () => {
		// ACTIVE — Story 3.1: createRoom writes audit_log in transaction (Task 3).
		//
		// AC-5: Given a room create that commits successfully, When the transaction completes,
		//       Then an audit_log row is written with entity='room', action='create',
		//       actor_id=userId, and a non-null diff containing the changed fields.
		//
		// Pattern: matches profile.test.ts audit log tests (2.7-INT-002 pattern).

		const { createRoom } = await import('../../src/lib/server/services/room-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const input = {
			name: 'Audit Test Room',
			floor: '1',
			capacity: 8,
			features: ['projector'] as const
		};

		const created = await createRoom(actorId, input);

		// Query audit_log for the row written during createRoom
		const auditResult = await pool.query<{
			entity: string;
			action: string;
			actor_id: string;
			diff: unknown;
		}>(
			`SELECT entity, action, actor_id, diff
         FROM audit_log
         WHERE entity = 'room'
           AND action = 'create'
           AND actor_id = $1
         ORDER BY id DESC
         LIMIT 1`,
			[actorId]
		);

		expect(
			auditResult.rows.length,
			'audit_log must contain exactly one create row after createRoom()'
		).toBe(1);

		const auditRow = auditResult.rows[0];
		expect(auditRow?.entity, "audit_log entity must be 'room'").toBe('room');
		expect(auditRow?.action, "audit_log action must be 'create'").toBe('create');
		expect(auditRow?.actor_id, 'audit_log actor_id must match the admin userId').toBe(actorId);
		expect(auditRow?.diff, 'audit_log diff must be non-null').not.toBeNull();

		// Verify the diff contains the key fields from the input
		const diff = auditRow?.diff as Record<string, unknown>;
		expect(diff, 'diff must contain room name').toHaveProperty('name', input.name);

		// Verify the created room ID is what we got back
		expect(created.id, 'createRoom must return the inserted room').toBeTruthy();
	});

	test('[P0] 3.1-INT-008b — updateRoom() writes audit_log row with entity=room, action=update, non-null diff of changed fields', async () => {
		// ACTIVE — Story 3.1: updateRoom writes audit_log in transaction (Task 3).
		//
		// AC-5: Given a room edit that commits successfully, When the transaction completes,
		//       Then an audit_log row is written with action='update' and diff containing
		//       only the changed fields (computeDiff pattern from profile-service.ts).

		const { createRoom, updateRoom } =
			await import('../../src/lib/server/services/room-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const originalInput = {
			name: 'Pre-Update Room',
			floor: '2',
			capacity: 15,
			features: [] as const
		};

		const created = await createRoom(actorId, originalInput);

		const updatedInput = {
			name: 'Post-Update Room',
			floor: '2', // unchanged
			capacity: 20, // changed
			features: ['vc'] as const // changed
		};

		await updateRoom(actorId, created.id, updatedInput);

		// Query for the update audit row
		const auditResult = await pool.query<{
			entity: string;
			action: string;
			actor_id: string;
			diff: unknown;
		}>(
			`SELECT entity, action, actor_id, diff
         FROM audit_log
         WHERE entity = 'room'
           AND action = 'update'
           AND actor_id = $1
         ORDER BY id DESC
         LIMIT 1`,
			[actorId]
		);

		expect(auditResult.rows.length, 'audit_log must contain an update row after updateRoom()').toBe(
			1
		);

		const auditRow = auditResult.rows[0];
		expect(auditRow?.entity, "audit_log entity must be 'room'").toBe('room');
		expect(auditRow?.action, "audit_log action must be 'update'").toBe('update');
		expect(auditRow?.actor_id, 'audit_log actor_id must match the admin userId').toBe(actorId);
		expect(auditRow?.diff, 'audit_log diff must be non-null for update').not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// 3.1-INT-004 — All 3 features stored as correct enum values [P1]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Room Features: All 3 features stored correctly (AC-1, R-007)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P1] 3.1-INT-004 — Room with all 3 features selected → features array contains projector, whiteboard, vc', async () => {
		// ACTIVE — Story 3.1: createRoom + getRoomById implemented (Tasks 1–3).
		//
		// AC-1: features multi-select stores projector/whiteboard/vc as enum values.
		// Risk R-007: Features stored incorrectly or as free-form strings.
		//
		// Strategy: createRoom with all 3 features, query DB, assert exact array values.

		const { createRoom, getRoomById } =
			await import('../../src/lib/server/services/room-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const input = {
			name: 'Full Features Room',
			floor: '1',
			capacity: 12,
			features: ['projector', 'whiteboard', 'vc'] as const
		};

		const created = await createRoom(actorId, input);
		const fetched = await getRoomById(created.id);

		expect(fetched, 'getRoomById must return the created room').toBeDefined();
		expect(fetched?.features, 'features array must contain all 3 values').toEqual(
			expect.arrayContaining(['projector', 'whiteboard', 'vc'])
		);
		expect(fetched?.features.length, 'features array must have exactly 3 items').toBe(3);

		// Verify directly in DB (not just through service layer)
		const dbResult = await pool.query<{ features: string[] }>(
			`SELECT features FROM rooms WHERE id = $1`,
			[created.id]
		);
		const dbFeatures = dbResult.rows[0]?.features;
		expect(dbFeatures, 'DB features column must be an array').toBeInstanceOf(Array);
		expect(dbFeatures, 'DB features must contain projector').toContain('projector');
		expect(dbFeatures, 'DB features must contain whiteboard').toContain('whiteboard');
		expect(dbFeatures, 'DB features must contain vc').toContain('vc');
	});
});

// ---------------------------------------------------------------------------
// 3.1-INT-005 — No features → empty array stored (not null) [P1]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Room Features: No features → empty array, not null (AC-1, R-007)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P1] 3.1-INT-005 — Room created with no features → features column equals [] (not null)', async () => {
		// ACTIVE — Story 3.1: features column is text[] NOT NULL DEFAULT '{}' (Task 1).
		//
		// AC-1: features column is text[] NOT NULL with default [].
		// Risk R-007: Empty features stored as null instead of [].
		//
		// DISTINCT from 3.1-INT-004 — this tests the zero-features case.

		const { createRoom, getRoomById } =
			await import('../../src/lib/server/services/room-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const input = {
			name: 'No Features Room',
			floor: '2',
			capacity: 5,
			features: [] as const
		};

		const created = await createRoom(actorId, input);
		const fetched = await getRoomById(created.id);

		expect(fetched, 'getRoomById must return the created room').toBeDefined();
		expect(fetched?.features, 'features must be an empty array, not null').toEqual([]);

		// Verify directly in DB
		const dbResult = await pool.query<{ features: string[] | null }>(
			`SELECT features FROM rooms WHERE id = $1`,
			[created.id]
		);
		const dbFeatures = dbResult.rows[0]?.features;
		expect(dbFeatures, 'DB features column must not be null').not.toBeNull();
		expect(dbFeatures, 'DB features column must be an empty array []').toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// 3.1-INT-007 — Non-admin PATCH room edit → 403 [P1]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Authorization: Non-admin PATCH room edit → 403 (AC-4, R-002)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P1] 3.1-INT-007 — Non-admin organizer POST /admin/rooms/[id]/edit → 403',
		{ timeout: 15000 },
		async () => {
			// THIS TEST WILL FAIL — admin rooms edit route not yet implemented (Task 5.3).
			// Activate after Task 4 (guard) + Task 5 (routes).
			//
			// AC-4: Non-admin POST to /admin/rooms/[id]/edit → 403.
			// Risk R-002: IDOR — organizer directly calls the edit endpoint.
			//
			// Strategy: Seed a room (service-level), then attempt non-admin POST to edit endpoint.

			const { testOwnershipEnforcement } = await import('../support/helpers/idor-template.js');
			const { createRoom } = await import('../../src/lib/server/services/room-service.js');

			const client = await pool.connect();
			let actorId: string;
			let organizerCookie: string;
			try {
				const admin = await seedAdminUser(client);
				actorId = admin.userId;

				const organizer = await seedOrganizerUserWithSession(client);
				organizerCookie = organizer.sessionCookie;
			} finally {
				client.release();
			}

			// Create a room with admin (service-level, no auth needed)
			const room = await createRoom(actorId, {
				name: 'Room to Edit',
				floor: '1',
				capacity: 8,
				features: [] as const
			});

			const body = new URLSearchParams({
				name: 'IDOR Edit Attempt',
				floor: '1',
				capacity: '8'
			}).toString();

			await testOwnershipEnforcement({
				routeUrl: `${DEV_SERVER_URL}/admin/rooms/${room.id}/edit`,
				method: 'POST',
				nonOwnerCookie: organizerCookie,
				body,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				expectedDenialStatuses: [403]
			});
			// testOwnershipEnforcement throws on failure; reaching here means the 403 was enforced.
			// expect.assertions is required by vitest requireAssertions: true global config.
			expect(true).toBe(true);
		}
	);
});

// ---------------------------------------------------------------------------
// 3.4-INT-001 — createBlockSlot() inserts block; listBlockSlotsForRoom() returns it [P0]
// ---------------------------------------------------------------------------

describe('Story 3.4 — Block Create: createBlockSlot() inserts a block and listBlockSlotsForRoom() returns it (AC-1)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P0] 3.4-INT-001 — createBlockSlot() inserts a room_blocks row; listBlockSlotsForRoom() returns it with correct fields', async () => {
		// THIS TEST WILL FAIL — block-slot-service.ts and room_blocks table not yet created (Tasks 1–3).
		// Activate after Task 1 (schema + migration), Task 2 (BlockSlotSchema), Task 3 (service).
		//
		// AC-1: Given a room, When I create a block for a time range, Then that range shows as
		//       blocked, the block is persisted in room_blocks, and the block is returned in the
		//       room's block list.
		//
		// Strategy: service-level — createRoom → createBlockSlot → listBlockSlotsForRoom.

		const { createRoom } = await import('../../src/lib/server/services/room-service.js');
		const { createBlockSlot, listBlockSlotsForRoom } =
			await import('../../src/lib/server/services/block-slot-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const room = await createRoom(actorId, {
			name: 'Block Test Room',
			floor: '1',
			capacity: 10,
			features: [] as const
		});

		const startAt = '2026-07-01T09:00:00.000Z';
		const endAt = '2026-07-01T10:00:00.000Z';

		const created = await createBlockSlot(actorId, room.id, {
			startAt,
			endAt,
			reason: 'Maintenance'
		});

		expect(created.id, 'createBlockSlot must return a block with a non-empty id').toBeTruthy();
		expect(created.roomId, 'Block roomId must match the room').toBe(room.id);
		expect(created.reason, 'Block reason must match input').toBe('Maintenance');

		const blocks = await listBlockSlotsForRoom(room.id);
		expect(blocks.length, 'listBlockSlotsForRoom must return exactly one block').toBe(1);
		expect(blocks[0]?.id, 'Listed block id must match created block').toBe(created.id);
	});
});

// ---------------------------------------------------------------------------
// 3.4-INT-002 — Block overlapping existing booking → 422 conflict (app-level) [P0]
// ---------------------------------------------------------------------------

describe('Story 3.4 — Block Conflict: Block over an existing booking → 422 conflict, app-level check (AC-3)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P0] 3.4-INT-002 — createBlockSlot() over an existing booking rejects with 422 conflict (application-level pre-check)', async () => {
		// THIS TEST WILL FAIL — block-slot-service.ts not yet created (Task 3).
		// Activate after Task 3 (service with app-level booking overlap pre-check).
		//
		// AC-3: Given a room with an existing booking, When I attempt to create a block that
		//       overlaps that booking's time range, Then the attempt is rejected with HTTP 422
		//       (not 500) and a structured conflict message.
		//
		// Strategy: service-level — createRoom, seed a booking row directly in DB, then attempt
		// createBlockSlot for the same time range; assert conflict error is thrown (not 500).
		//
		// The application-level pre-check queries:
		//   SELECT 1 FROM bookings WHERE room_id = $1 AND during && $2 AND status <> 'cancelled'
		// before the INSERT into room_blocks.

		const { createRoom } = await import('../../src/lib/server/services/room-service.js');
		const { createBlockSlot } = await import('../../src/lib/server/services/block-slot-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const room = await createRoom(actorId, {
			name: 'Conflict Test Room',
			floor: '2',
			capacity: 8,
			features: [] as const
		});

		// Seed a booking directly in the DB so we have a conflict to detect.
		// booking covers 10:00–11:00; the block will try to cover 10:30–11:30 (overlapping).
		const bookingClient = await pool.connect();
		try {
			await bookingClient.query(
				`INSERT INTO bookings (room_id, during, status)
         VALUES ($1, tstzrange($2::timestamptz, $3::timestamptz, '[)'), 'active')`,
				[room.id, '2026-07-02T10:00:00.000Z', '2026-07-02T11:00:00.000Z']
			);
		} finally {
			bookingClient.release();
		}

		// Attempt to create a block that overlaps the booking — must throw a conflict error.
		let conflictThrown = false;
		let errorCode: string | undefined;

		try {
			await createBlockSlot(actorId, room.id, {
				startAt: '2026-07-02T10:30:00.000Z',
				endAt: '2026-07-02T11:30:00.000Z'
			});
		} catch (err: unknown) {
			conflictThrown = true;
			// The service must throw a structured conflict error (HTTP 422 surface),
			// NOT a raw Postgres error (23P01) — this is the application-level pre-check.
			const e = err as { statusCode?: number; message?: string; name?: string };
			errorCode = e.statusCode?.toString() ?? e.name;
		}

		expect(
			conflictThrown,
			'createBlockSlot over an existing booking must throw a conflict error'
		).toBe(true);
		expect(
			errorCode,
			'Conflict error must carry a 422-indicative code (statusCode=422 or ConflictError name)'
		).toBe('422');
	});
});

// ---------------------------------------------------------------------------
// 3.4-INT-003 — Block-vs-block EXCLUDE constraint → 23P01 → 422 [P0]
// ---------------------------------------------------------------------------

describe('Story 3.4 — Block EXCLUDE Constraint: Two overlapping blocks for same room → DB 23P01 → 422 (AC-4)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P0] 3.4-INT-003 — createBlockSlot() with an overlapping existing block raises DB 23P01 (EXCLUDE violation) mapped to 422', async () => {
		// THIS TEST WILL FAIL — room_blocks EXCLUDE constraint and service not yet created (Tasks 1, 3).
		// Activate after Task 1 (migration with EXCLUDE USING gist) and Task 3 (service catches 23P01).
		//
		// AC-4: Two blocks for the same time range on the same room must be rejected by the
		//       room_blocks EXCLUDE constraint with HTTP 422.
		//
		// Strategy: service-level — createRoom → createBlockSlot (first block, succeeds) →
		// createBlockSlot (second overlapping block, must trigger 23P01 → catch → throw 422 conflict).
		//
		// The EXCLUDE constraint:
		//   EXCLUDE USING gist (room_id WITH =, during WITH &&)
		// raises Postgres error code 23P01 (exclusion_violation) when two rows conflict.

		const { createRoom } = await import('../../src/lib/server/services/room-service.js');
		const { createBlockSlot } = await import('../../src/lib/server/services/block-slot-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const room = await createRoom(actorId, {
			name: 'EXCLUDE Test Room',
			floor: '3',
			capacity: 5,
			features: [] as const
		});

		// First block: 14:00–15:00 — must succeed.
		await createBlockSlot(actorId, room.id, {
			startAt: '2026-07-03T14:00:00.000Z',
			endAt: '2026-07-03T15:00:00.000Z',
			reason: 'First block'
		});

		// Second block: same time range — must trigger EXCLUDE (23P01) → 422 conflict.
		let conflictThrown = false;
		let errorCode: string | undefined;

		try {
			await createBlockSlot(actorId, room.id, {
				startAt: '2026-07-03T14:00:00.000Z',
				endAt: '2026-07-03T15:00:00.000Z',
				reason: 'Conflicting block'
			});
		} catch (err: unknown) {
			conflictThrown = true;
			const e = err as { statusCode?: number; name?: string };
			errorCode = e.statusCode?.toString() ?? e.name;
		}

		expect(
			conflictThrown,
			'Second overlapping block must throw a conflict error (EXCLUDE constraint 23P01)'
		).toBe(true);
		expect(
			errorCode,
			'Conflict error must carry a 422-indicative code (statusCode=422 or ConflictError name)'
		).toBe('422');
	});
});

// ---------------------------------------------------------------------------
// 3.4-INT-004 — Non-admin POST /admin/rooms/[id]/blocks → 403 [P1]
// ---------------------------------------------------------------------------

describe('Story 3.4 — Authorization: Non-admin POST block slot → 403 (AC-5, R-002)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P1] 3.4-INT-004 — Non-admin (organizer) POST /admin/rooms/[id]/blocks → 403 (IDOR proof)',
		{ timeout: 15000 },
		async () => {
			// THIS TEST WILL FAIL — /admin/rooms/[id]/blocks route not yet created (Task 5).
			// Activate after Task 4 (requireAdmin guard via routeGuards) and Task 5 (routes).
			//
			// AC-5: Given a non-admin authenticated user (organizer), When they attempt to
			//       POST to the block-slots route (/admin/rooms/[id]/blocks), Then the server
			//       returns 403.
			//
			// Risk R-002: IDOR on admin room routes — organizer bypasses requireAdmin.
			//
			// Strategy: Seed a room (service-level) + non-admin session, POST the block-create
			// action, assert 403 via testOwnershipEnforcement().

			const { testOwnershipEnforcement } = await import('../support/helpers/idor-template.js');
			const { createRoom } = await import('../../src/lib/server/services/room-service.js');

			const client = await pool.connect();
			let actorId: string;
			let organizerCookie: string;
			try {
				const admin = await seedAdminUser(client);
				actorId = admin.userId;

				const organizer = await seedOrganizerUserWithSession(client);
				organizerCookie = organizer.sessionCookie;
			} finally {
				client.release();
			}

			const room = await createRoom(actorId, {
				name: 'IDOR Block Room',
				floor: '1',
				capacity: 6,
				features: [] as const
			});

			const body = new URLSearchParams({
				startAt: '2026-07-04T09:00',
				endAt: '2026-07-04T10:00'
			}).toString();

			await testOwnershipEnforcement({
				routeUrl: `${DEV_SERVER_URL}/admin/rooms/${room.id}/blocks?/create`,
				method: 'POST',
				nonOwnerCookie: organizerCookie,
				body,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html'
				},
				expectedDenialStatuses: [403]
			});
			// testOwnershipEnforcement throws on failure; reaching here means the 403 was enforced.
			expect(true).toBe(true);
		}
	);
});

// ---------------------------------------------------------------------------
// 3.4-INT-005 — deleteBlockSlot() removes block; time range bookable again [P1]
// ---------------------------------------------------------------------------

describe('Story 3.4 — Block Delete: deleteBlockSlot() removes the block (AC-2)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P1] 3.4-INT-005 — deleteBlockSlot() removes the room_blocks row; listBlockSlotsForRoom() returns empty list', async () => {
		// THIS TEST WILL FAIL — block-slot-service.ts not yet created (Task 3).
		// Activate after Task 3 (deleteBlockSlot implemented).
		//
		// AC-2: Given a persisted block, When I delete it, Then the block is removed and
		//       the time range becomes bookable again.
		//
		// Strategy: service-level — createRoom → createBlockSlot → deleteBlockSlot →
		// listBlockSlotsForRoom returns empty; direct DB query confirms row deleted.

		const { createRoom } = await import('../../src/lib/server/services/room-service.js');
		const { createBlockSlot, deleteBlockSlot, listBlockSlotsForRoom } =
			await import('../../src/lib/server/services/block-slot-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const room = await createRoom(actorId, {
			name: 'Delete Block Room',
			floor: '1',
			capacity: 8,
			features: [] as const
		});

		const block = await createBlockSlot(actorId, room.id, {
			startAt: '2026-07-05T08:00:00.000Z',
			endAt: '2026-07-05T09:00:00.000Z',
			reason: 'To be deleted'
		});

		expect(block.id, 'Block must be created before deletion').toBeTruthy();

		await deleteBlockSlot(actorId, block.id, room.id);

		const blocks = await listBlockSlotsForRoom(room.id);
		expect(blocks.length, 'listBlockSlotsForRoom must return empty after deletion').toBe(0);

		// Verify directly in DB
		const dbResult = await pool.query<{ count: string }>(
			`SELECT COUNT(*)::text AS count FROM room_blocks WHERE id = $1`,
			[block.id]
		);
		const count = parseInt(dbResult.rows[0]?.count ?? '0', 10);
		expect(count, 'DB room_blocks row must be deleted').toBe(0);
	});
});

// ---------------------------------------------------------------------------
// 3.4-INT-006 — createBlockSlot() writes audit_log row [P2]
// ---------------------------------------------------------------------------

describe('Story 3.4 — Audit Log: createBlockSlot() writes audit_log row (AC-6)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P2] 3.4-INT-006 — createBlockSlot() writes audit_log row with entity=room_block, action=create, actor_id, non-null diff', async () => {
		// THIS TEST WILL FAIL — block-slot-service.ts not yet created (Task 3).
		// Activate after Task 3 (createBlockSlot writes writeAuditLog in transaction).
		//
		// AC-6: Given a successful block creation, When the transaction completes, Then an
		//       audit_log row is written with entity='room_block', action='create', actor_id,
		//       and a non-null diff containing the roomId and time range string.

		const { createRoom } = await import('../../src/lib/server/services/room-service.js');
		const { createBlockSlot } = await import('../../src/lib/server/services/block-slot-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const room = await createRoom(actorId, {
			name: 'Audit Block Room',
			floor: '2',
			capacity: 4,
			features: [] as const
		});

		const startAt = '2026-07-06T13:00:00.000Z';
		const endAt = '2026-07-06T14:00:00.000Z';

		await createBlockSlot(actorId, room.id, {
			startAt,
			endAt,
			reason: 'Audit test block'
		});

		const auditResult = await pool.query<{
			entity: string;
			action: string;
			actor_id: string;
			diff: unknown;
		}>(
			`SELECT entity, action, actor_id, diff
       FROM audit_log
       WHERE entity = 'room_block'
         AND action = 'create'
         AND actor_id = $1
       ORDER BY id DESC
       LIMIT 1`,
			[actorId]
		);

		expect(
			auditResult.rows.length,
			"audit_log must contain a 'create' row for entity='room_block' after createBlockSlot()"
		).toBe(1);

		const auditRow = auditResult.rows[0];
		expect(auditRow?.entity, "audit_log entity must be 'room_block'").toBe('room_block');
		expect(auditRow?.action, "audit_log action must be 'create'").toBe('create');
		expect(auditRow?.actor_id, 'audit_log actor_id must match the admin userId').toBe(actorId);
		expect(auditRow?.diff, 'audit_log diff must be non-null').not.toBeNull();

		// Verify diff contains the expected fields
		const diff = auditRow?.diff as Record<string, unknown>;
		expect(diff, 'diff must contain roomId').toHaveProperty('roomId', room.id);
		expect(diff, 'diff must contain a during/time range field').toHaveProperty('during');
	});
});

// ---------------------------------------------------------------------------
// 3.4-INT-007 — Two non-overlapping blocks for same room both succeed [P2]
// ---------------------------------------------------------------------------

describe('Story 3.4 — Non-Overlapping Blocks: Two non-overlapping blocks for same room succeed (AC-4)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P2] 3.4-INT-007 — Two non-overlapping blocks for the same room can both be created without error', async () => {
		// THIS TEST WILL FAIL — block-slot-service.ts not yet created (Task 3).
		// Activate after Task 3 (createBlockSlot + room_blocks EXCLUDE constraint in place).
		//
		// AC-4 (partial): Given a room with two blocks at non-overlapping time ranges,
		//       When both are created, Then both succeed without error.
		//
		// Strategy: service-level — createRoom → createBlockSlot (09:00–10:00) →
		// createBlockSlot (11:00–12:00, non-overlapping) → both succeed → listBlockSlotsForRoom
		// returns 2 blocks.
		//
		// This verifies the EXCLUDE constraint correctly allows non-overlapping ranges and
		// is the positive counterpart to 3.4-INT-003 (same-range EXCLUDE violation).

		const { createRoom } = await import('../../src/lib/server/services/room-service.js');
		const { createBlockSlot, listBlockSlotsForRoom } =
			await import('../../src/lib/server/services/block-slot-service.js');

		const client = await pool.connect();
		let actorId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
		} finally {
			client.release();
		}

		const room = await createRoom(actorId, {
			name: 'Non-Overlap Block Room',
			floor: '4',
			capacity: 12,
			features: [] as const
		});

		// First block: 09:00–10:00 (half-open [))
		const block1 = await createBlockSlot(actorId, room.id, {
			startAt: '2026-07-07T09:00:00.000Z',
			endAt: '2026-07-07T10:00:00.000Z',
			reason: 'Morning maintenance'
		});

		// Second block: 11:00–12:00 — non-overlapping with first (gap 10:00–11:00)
		const block2 = await createBlockSlot(actorId, room.id, {
			startAt: '2026-07-07T11:00:00.000Z',
			endAt: '2026-07-07T12:00:00.000Z',
			reason: 'Afternoon maintenance'
		});

		expect(block1.id, 'First block must be created').toBeTruthy();
		expect(block2.id, 'Second non-overlapping block must also be created').toBeTruthy();
		expect(block1.id, 'Block IDs must be distinct').not.toBe(block2.id);

		const blocks = await listBlockSlotsForRoom(room.id);
		expect(blocks.length, 'listBlockSlotsForRoom must return 2 non-overlapping blocks').toBe(2);
	});
});

// ---------------------------------------------------------------------------
// 3.1-UNIT-001 — requireAdmin guard registered for /admin/rooms/** in routeGuards [P1]
// ---------------------------------------------------------------------------

describe('Story 3.1 — Static Source Assertion: requireAdmin guard registered in routeGuards (AC-6, R-002)', () => {
	test('[P1] 3.1-UNIT-001 — hooks.server.ts registers a requireAdmin guard for /admin routes in routeGuards', async () => {
		// ACTIVE — Story 3.1: requireAdmin guard pushed to routeGuards (Task 4).
		//
		// AC-6: The routeGuards registry in hooks.server.ts must have a requireAdmin guard
		//       registered for the /admin/rooms/** pattern so all admin room routes are
		//       protected without per-route duplication.
		//
		// Strategy: Source-level inspection (same as 2.5-UNIT-001 in auth-guard.test.ts).
		// hooks.server.ts cannot be dynamically imported (validateEnv() at module load time),
		// so we read the source file text and assert the pattern string is present.
		// This is consistent with the existing static source assertion convention.

		const { readFileSync } = await import('fs');
		const { resolve } = await import('path');
		const { fileURLToPath } = await import('url');

		// rooms.test.ts is at tests/integration/rooms.test.ts
		// Go up 3 levels: rooms.test.ts → integration → tests → project root
		const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
		const HOOKS_PATH = resolve(PROJECT_ROOT, 'src', 'hooks.server.ts');

		const hooksSource = readFileSync(HOOKS_PATH, 'utf-8');

		// Assert that a requireAdmin guard entry is pushed to routeGuards for /admin routes.
		// The pattern from the story spec is: /^\/admin(?:\/|$)/
		// The guard must call requireAdmin(event) for the /admin pattern.
		expect(hooksSource, 'hooks.server.ts must import requireAdmin for the admin guard').toContain(
			'requireAdmin'
		);

		expect(
			hooksSource,
			'hooks.server.ts must register a guard entry matching /admin routes in routeGuards'
		).toMatch(/\/admin/);

		// Verify the guard is pushed to routeGuards (not inlined per R-006 requirement)
		expect(
			hooksSource,
			'Admin guard must be pushed to the routeGuards array (not hardcoded inline)'
		).toContain('routeGuards');
	});
});
