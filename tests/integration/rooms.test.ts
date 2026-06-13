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

// ===========================================================================
// STORY 3.2 — Room Photo Upload
// ===========================================================================
//
// Shared test helpers (Story 3.2)

/**
 * Returns a minimal 22-byte JPEG buffer (JFIF APP0 marker) — sufficient for
 * MIME-type and magic-byte validation in uploadRoomPhoto() tests.
 */
function makeJpegBuffer(): Buffer {
	return Buffer.from([
		0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
		0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
	]);
}

/**
 * Creates a fresh temp directory, sets UPLOAD_DIR to it, runs `fn`, then
 * restores the original UPLOAD_DIR value and removes the temp directory.
 * Used by service-level upload tests that need an isolated UPLOAD_DIR.
 */
async function withTempUploadDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
	const { mkdtemp, rm } = await import('fs/promises');
	const { join } = await import('path');
	const { tmpdir } = await import('os');
	const uploadDir = await mkdtemp(join(tmpdir(), prefix));
	const originalUploadDir = process.env['UPLOAD_DIR'];
	process.env['UPLOAD_DIR'] = uploadDir;
	try {
		return await fn(uploadDir);
	} finally {
		if (originalUploadDir === undefined) {
			delete process.env['UPLOAD_DIR'];
		} else {
			process.env['UPLOAD_DIR'] = originalUploadDir;
		}
		await rm(uploadDir, { recursive: true, force: true });
	}
}
//
// Test IDs (from test-design-epic-3.md + story 3.2 dev notes):
//   P0:
//   - 3.2-INT-001: Admin uploadRoomPhoto() → file on volume, photo_path in DB, audit_log row [P0]
//   - 3.2-INT-004: Unauthenticated GET /rooms/[id]/photo → 302 or 403 [P0]
//   P1:
//   - 3.2-INT-002: uploadRoomPhoto() with non-image MIME → throws typed validation error, no file written [P1]
//   - 3.2-INT-003: Authenticated admin GET /rooms/[id]/photo → 200, Content-Type: image/* [P1]
//   - 3.2-INT-005: Authenticated organizer GET /rooms/[id]/photo → 200 (requireUser, NOT requireAdmin) [P1]
//   - 3.2-UNIT-001: room-service.ts UPLOAD_DIR resolved from env var, not hardcoded [P1]
//   P2:
//   - 3.2-INT-006: uploadRoomPhoto() → file content retrievable from volume path in DB [P2]
//   - 3.2-UNIT-002: UPLOAD_DIR env var in compose.yaml matches declared volume mount [P2]
//   P3:
//   - 3.2-P3-001: Re-upload replaces stored path; new file retrievable at new path [P3]
//
// Also: 3.2-UNIT-003 is in tests/integration/db-schema.test.ts (photo_path column exists)
//
// Activation order (per story Task ordering):
//   Task 1 → activate 3.2-UNIT-003 in db-schema.test.ts
//   Task 2 → activate 3.2-UNIT-002 here
//   Task 3 → activate 3.2-INT-001, 3.2-INT-002, 3.2-INT-006 here
//   Task 4 → activate 3.2-INT-004, 3.2-UNIT-001 here
//   Task 5 → activate 3.2-INT-003, 3.2-INT-005 here (requires DEV_SERVER_URL)
//
// CRITICAL Architecture notes (story "CRITICAL: Photo Serve Guard Scope"):
//   - Photo SERVE route uses requireUser (NOT requireAdmin): organizers CAN view photos.
//   - INT-005 asserts 200, NOT 403 — test-design line 284 has this wrong (story overrides).
//   - INT-002 is a service-level test (assert throws), NOT an HTTP-level 422 test.
//   - HTTP-level tests (INT-003, INT-004, INT-005) use test.skipIf(!DEV_SERVER_URL).
//   - No Thai text literals — Rawinan handles all translations.
//   - No credential literals in test code.

// ---------------------------------------------------------------------------
// Seed helpers (Story 3.2 specific)
// ---------------------------------------------------------------------------

/**
 * Seeds an admin user with a signed session cookie for HTTP-level photo tests (3.2).
 */
async function seedAdminUserWithSession32(
	client: pg.PoolClient,
	opts: { userId?: string; email?: string } = {}
): Promise<{ userId: string; email: string; sessionCookie: string }> {
	const userId = opts.userId ?? `test-admin-3.2-${randomUUID().slice(0, 8)}`;
	const email = opts.email ?? `test-admin-3.2-${randomUUID().slice(0, 8)}@example.com`;

	await client.query(
		`INSERT INTO users (id, email, "createdAt", "updatedAt", is_admin)
     VALUES ($1, $2, NOW(), NOW(), true)
     ON CONFLICT (id) DO NOTHING`,
		[userId, email]
	);

	const profileId = `profile-admin-3.2-${userId}`;
	await client.query(
		`INSERT INTO user_profiles (id, "userId", email, title, "firstName", "lastName", phone, organization, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT ("userId") DO NOTHING`,
		[profileId, userId, email, 'Mr.', 'Admin32', 'Test', '+1234567890', 'Test Org']
	);

	const sessionToken = `test-session-admin-3.2-${randomUUID().slice(0, 8)}`;
	const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
	await client.query(
		`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
		[`session-admin-3.2-${userId}`, sessionToken, userId, expiresAt]
	);

	return { userId, email, sessionCookie: buildSignedSessionCookie(sessionToken) };
}

/**
 * Seeds a non-admin organizer user with a signed session cookie for HTTP-level photo tests (3.2).
 */
async function seedOrganizerUserWithSession32(
	client: pg.PoolClient,
	opts: { userId?: string; email?: string } = {}
): Promise<{ userId: string; email: string; sessionCookie: string }> {
	const userId = opts.userId ?? `test-org-3.2-${randomUUID().slice(0, 8)}`;
	const email = opts.email ?? `test-org-3.2-${randomUUID().slice(0, 8)}@example.com`;

	await client.query(
		`INSERT INTO users (id, email, "createdAt", "updatedAt", is_admin)
     VALUES ($1, $2, NOW(), NOW(), false)
     ON CONFLICT (id) DO NOTHING`,
		[userId, email]
	);

	const profileId = `profile-org-3.2-${userId}`;
	await client.query(
		`INSERT INTO user_profiles (id, "userId", email, title, "firstName", "lastName", phone, organization, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT ("userId") DO NOTHING`,
		[profileId, userId, email, 'Mr.', 'Organizer32', 'Test', '+1234567890', 'Test Org']
	);

	const sessionToken = `test-session-org-3.2-${randomUUID().slice(0, 8)}`;
	const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
	await client.query(
		`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
		[`session-org-3.2-${userId}`, sessionToken, userId, expiresAt]
	);

	return { userId, email, sessionCookie: buildSignedSessionCookie(sessionToken) };
}

// ---------------------------------------------------------------------------
// 3.2-INT-001 — Admin uploadRoomPhoto() → file stored, path in DB, audit_log [P0]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Photo Upload: Admin uploads a photo → file on volume, photo_path in DB, audit_log (AC-1)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P0] 3.2-INT-001 — uploadRoomPhoto() writes file to UPLOAD_DIR, saves photo_path on room row, and writes audit_log in same transaction', async () => {
		// ACTIVATED — uploadRoomPhoto() implemented. Story 3.2 complete (feat: commit 88e89ff).
		//
		// AC-1: Given an existing room and I am an admin, When I upload an image file
		//       (JPEG/PNG/WebP, ≤10MB), Then the file is stored on the on-prem volume at
		//       a path derived from UPLOAD_DIR, the path is saved in photo_path on the rooms
		//       row, and an audit_log entry (entity='room', action='upload_photo', actor_id,
		//       diff containing the new path) is written in the same transaction.
		//
		// Strategy: service-level call (no HTTP needed). UPLOAD_DIR set to isolated temp dir
		// via withTempUploadDir(). Assert: (1) file written, (2) photo_path in DB, (3) audit_log.

		const { createRoom, uploadRoomPhoto } =
			await import('../../src/lib/server/services/room-service.js');
		const { readFile } = await import('fs/promises');
		const { join } = await import('path');

		const client = await pool.connect();
		let actorId: string;
		let roomId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
			const room = await createRoom(actorId, {
				name: 'Photo Room',
				floor: '1',
				capacity: 10,
				features: [] as const
			});
			roomId = room.id;
		} finally {
			client.release();
		}

		await withTempUploadDir('tea-atdd-3.2-', async (uploadDir) => {
			const jpegData = makeJpegBuffer();

			const updated = await uploadRoomPhoto(actorId, roomId, {
				data: jpegData,
				mimeType: 'image/jpeg',
				size: jpegData.length
			});

			// Assert 1: photo_path is saved on the room row
			expect(
				updated.photoPath,
				'uploadRoomPhoto() must return updated room with non-null photoPath'
			).toBeTruthy();

			// Assert 2: file exists on disk at UPLOAD_DIR/<photoPath>
			const storedFilePath = join(uploadDir, updated.photoPath!);
			const writtenData = await readFile(storedFilePath);
			expect(writtenData.length, 'Written file must be non-empty').toBeGreaterThan(0);

			// Assert 3: DB row updated
			const dbResult = await pool.query<{ photo_path: string | null }>(
				`SELECT photo_path FROM rooms WHERE id = $1`,
				[roomId]
			);
			expect(dbResult.rows[0]?.photo_path, 'DB photo_path must match returned photoPath').toBe(
				updated.photoPath
			);

			// Assert 4: audit_log row written in same transaction
			const auditResult = await pool.query<{
				entity: string;
				action: string;
				actor_id: string;
				diff: unknown;
			}>(
				`SELECT entity, action, actor_id, diff
         FROM audit_log
         WHERE entity = 'room'
           AND action = 'upload_photo'
           AND actor_id = $1
         ORDER BY id DESC
         LIMIT 1`,
				[actorId]
			);

			expect(
				auditResult.rows.length,
				'audit_log must contain an upload_photo row after uploadRoomPhoto()'
			).toBe(1);

			const auditRow = auditResult.rows[0];
			expect(auditRow?.entity, "audit_log entity must be 'room'").toBe('room');
			expect(auditRow?.action, "audit_log action must be 'upload_photo'").toBe('upload_photo');
			expect(auditRow?.actor_id, 'audit_log actor_id must match the admin userId').toBe(actorId);
			expect(auditRow?.diff, 'audit_log diff must be non-null').not.toBeNull();

			const diff = auditRow?.diff as Record<string, unknown>;
			expect(diff, 'diff must contain photoPath key').toHaveProperty('photoPath');
		});
	});
});

// ---------------------------------------------------------------------------
// 3.2-INT-002 — Non-image MIME type rejected — service throws, no file written [P1]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Photo Upload Validation: Non-image MIME type rejected by uploadRoomPhoto() (AC-2)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P1] 3.2-INT-002 — uploadRoomPhoto() with non-image MIME type throws typed validation error and writes no file', async () => {
		// ACTIVATED — MIME validation implemented. Story 3.2 complete (feat: commit 88e89ff).
		//
		// AC-2: Given a file upload with a non-image MIME type (e.g., .txt, .pdf, .php),
		//       When I submit the upload form, Then no file is written to disk and the rooms
		//       row is unchanged. (HTTP 422 is the form-action layer — this is a service test.)
		//
		// Strategy: SERVICE-LEVEL test — call uploadRoomPhoto() with non-image MIME and
		// assert it THROWS a typed validation error. Also assert no file was written.

		const { createRoom, uploadRoomPhoto } =
			await import('../../src/lib/server/services/room-service.js');
		const { readdir } = await import('fs/promises');

		const client = await pool.connect();
		let actorId: string;
		let roomId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
			const room = await createRoom(actorId, {
				name: 'Validation Room',
				floor: '2',
				capacity: 5,
				features: [] as const
			});
			roomId = room.id;
		} finally {
			client.release();
		}

		await withTempUploadDir('tea-atdd-3.2-mime-', async (uploadDir) => {
			const textFileData = Buffer.from('This is a text file — not an image');

			// Assert that uploadRoomPhoto throws for a non-image MIME type
			await expect(
				uploadRoomPhoto(actorId, roomId, {
					data: textFileData,
					mimeType: 'text/plain',
					size: textFileData.length
				}),
				'uploadRoomPhoto() must throw a typed validation error for non-image MIME type'
			).rejects.toThrow();

			// Assert no file was written to UPLOAD_DIR
			const filesInDir = await readdir(uploadDir);
			expect(
				filesInDir.length,
				'No file must be written to UPLOAD_DIR when MIME validation fails'
			).toBe(0);

			// Assert room.photo_path remains null (row unchanged)
			const dbResult = await pool.query<{ photo_path: string | null }>(
				`SELECT photo_path FROM rooms WHERE id = $1`,
				[roomId]
			);
			expect(
				dbResult.rows[0]?.photo_path,
				'photo_path must remain null when upload is rejected'
			).toBeNull();

			// Also test .pdf rejection
			const pdfData = Buffer.from('%PDF-1.4 fake pdf content');
			await expect(
				uploadRoomPhoto(actorId, roomId, {
					data: pdfData,
					mimeType: 'application/pdf',
					size: pdfData.length
				}),
				'uploadRoomPhoto() must throw for application/pdf MIME type'
			).rejects.toThrow();
		});
	});
});

// ---------------------------------------------------------------------------
// 3.2-INT-003 — Authenticated admin GET /rooms/[id]/photo → 200, image/* [P1]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Photo Serve: Authenticated admin can retrieve uploaded photo (AC-3)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P1] 3.2-INT-003 — Authenticated admin GET /rooms/[id]/photo → HTTP 200 with Content-Type: image/*',
		{ timeout: 15000 },
		async () => {
			// ACTIVATED — photo serve route implemented. Story 3.2 complete (feat: commit 88e89ff).
			// Requires DEV_SERVER_URL + AUTH_SECRET in environment (skipped otherwise).
			//
			// AC-3: Given an authenticated internal user (admin or organizer), When they GET
			//       /rooms/[id]/photo, Then the server streams the image with the correct
			//       Content-Type: image/* header and HTTP 200.
			//
			// Strategy: Upload a photo via service-level call (sets photo_path in DB),
			// then HTTP GET /rooms/[id]/photo with admin session cookie → assert 200 + image/*.
			//
			// Note: uploadDir is intentionally not cleaned after this test — the dev server
			// needs the file at uploadDir to serve the /rooms/[id]/photo response.

			const { createRoom, uploadRoomPhoto } =
				await import('../../src/lib/server/services/room-service.js');
			const { join } = await import('path');
			const { tmpdir } = await import('os');

			const client = await pool.connect();
			let actorId: string;
			let roomId: string;
			let adminCookie: string;
			try {
				const admin = await seedAdminUserWithSession32(client);
				actorId = admin.userId;
				adminCookie = admin.sessionCookie;

				const room = await createRoom(actorId, {
					name: 'Serve Test Room',
					floor: '1',
					capacity: 10,
					features: [] as const
				});
				roomId = room.id;
			} finally {
				client.release();
			}

			// UPLOAD_DIR must match what the dev server is configured to read from.
			// If DEV_SERVER_URL is set, UPLOAD_DIR should also be set to the same path.
			const uploadDir = process.env['UPLOAD_DIR'] ?? join(tmpdir(), 'tea-atdd-3.2-serve');
			const originalUploadDir = process.env['UPLOAD_DIR'];
			process.env['UPLOAD_DIR'] = uploadDir;

			try {
				const jpegData = makeJpegBuffer();

				await uploadRoomPhoto(actorId, roomId, {
					data: jpegData,
					mimeType: 'image/jpeg',
					size: jpegData.length
				});

				const response = await fetch(`${DEV_SERVER_URL}/rooms/${roomId}/photo`, {
					method: 'GET',
					headers: { Cookie: adminCookie },
					redirect: 'manual'
				});

				expect(
					response.status,
					`Expected HTTP 200 for authenticated admin GET /rooms/[id]/photo but got ${response.status}`
				).toBe(200);

				const contentType = response.headers.get('content-type') ?? '';
				expect(
					contentType,
					`Expected Content-Type to start with 'image/' but got '${contentType}'`
				).toMatch(/^image\//);
			} finally {
				if (originalUploadDir === undefined) {
					delete process.env['UPLOAD_DIR'];
				} else {
					process.env['UPLOAD_DIR'] = originalUploadDir;
				}
				// uploadDir is intentionally not cleaned — dev server needs the file to serve it.
			}
		}
	);
});

// ---------------------------------------------------------------------------
// 3.2-INT-004 — Unauthenticated GET /rooms/[id]/photo → 302/403 [P0]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Photo Access Control: Unauthenticated GET /rooms/[id]/photo → 302 or 403 (AC-4, R-001)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P0] 3.2-INT-004 — Unauthenticated GET /rooms/[id]/photo → HTTP 302 (redirect to /login) or 403',
		{ timeout: 15000 },
		async () => {
			// ACTIVATED — photo serve route + routeGuard implemented. Story 3.2 complete (feat: commit 88e89ff).
			// Requires DEV_SERVER_URL in environment (skipped otherwise).
			//
			// AC-4: Given an unauthenticated request, When they GET /rooms/[id]/photo, Then
			//       the server returns a redirect to /login (302) or 403.
			//       The photo route must be in routeGuards.
			//
			// Risk R-001: Photo file served without access control — any unauthenticated user
			//              can fetch a room photo via a guessable/enumerable URL.
			//
			// Strategy: HTTP GET with NO session cookie → assert 302 or 403.

			const { createRoom } = await import('../../src/lib/server/services/room-service.js');

			const client = await pool.connect();
			let actorId: string;
			let roomId: string;
			try {
				const admin = await seedAdminUser(client);
				actorId = admin.userId;
				const room = await createRoom(actorId, {
					name: 'Access Control Room',
					floor: '1',
					capacity: 10,
					features: [] as const
				});
				roomId = room.id;
			} finally {
				client.release();
			}

			// Request with NO authentication cookie
			const response = await fetch(`${DEV_SERVER_URL}/rooms/${roomId}/photo`, {
				method: 'GET',
				redirect: 'manual'
			});

			expect(
				[302, 403],
				`Expected HTTP 302 (redirect to /login) or 403 for unauthenticated photo request but got ${response.status}`
			).toContain(response.status);

			if (response.status === 302) {
				const location = response.headers.get('location') ?? '';
				expect(
					location,
					`302 redirect for unauthenticated photo request must point to /login, got '${location}'`
				).toContain('/login');
			}
		}
	);
});

// ---------------------------------------------------------------------------
// 3.2-INT-005 — Authenticated organizer GET /rooms/[id]/photo → 200 [P1]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Photo Access Control: Authenticated organizer GET /rooms/[id]/photo → 200 (AC-3)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P1] 3.2-INT-005 — Authenticated non-admin organizer GET /rooms/[id]/photo → HTTP 200 (requireUser, not requireAdmin)',
		{ timeout: 15000 },
		async () => {
			// ACTIVATED — photo serve route implemented. Story 3.2 complete (feat: commit 88e89ff).
			// Requires DEV_SERVER_URL in environment (skipped otherwise).
			//
			// AC-3: Authenticated internal user (admin OR organizer) → 200.
			//
			// CRITICAL: This test asserts HTTP 200, NOT 403.
			// The test-design document (line 284) incorrectly states "non-admin organizer → 403".
			// The story's "CRITICAL: Photo Serve Guard Scope" section is authoritative:
			//   - GET /rooms/[id]/photo uses requireUser (any authenticated user → 200).
			//   - Only the UPLOAD action (/admin/rooms/[id]/photo POST) is requireAdmin.
			//   - Story purpose: "so that organizers can recognize the space" (AC-3, FR-061).
			//
			// Note: uploadDir is intentionally not cleaned — dev server needs the file to serve it.

			const { createRoom, uploadRoomPhoto } =
				await import('../../src/lib/server/services/room-service.js');
			const { join } = await import('path');
			const { tmpdir } = await import('os');

			const client = await pool.connect();
			let actorId: string;
			let roomId: string;
			let organizerCookie: string;
			try {
				const admin = await seedAdminUser(client);
				actorId = admin.userId;

				const organizer = await seedOrganizerUserWithSession32(client);
				organizerCookie = organizer.sessionCookie;

				const room = await createRoom(actorId, {
					name: 'Organizer Photo Room',
					floor: '2',
					capacity: 15,
					features: [] as const
				});
				roomId = room.id;
			} finally {
				client.release();
			}

			// UPLOAD_DIR must match what the dev server is configured to read from.
			const uploadDir = process.env['UPLOAD_DIR'] ?? join(tmpdir(), 'tea-atdd-3.2-org');
			const originalUploadDir = process.env['UPLOAD_DIR'];
			process.env['UPLOAD_DIR'] = uploadDir;

			try {
				const jpegData = makeJpegBuffer();

				await uploadRoomPhoto(actorId, roomId, {
					data: jpegData,
					mimeType: 'image/jpeg',
					size: jpegData.length
				});

				// HTTP GET with ORGANIZER (non-admin) session cookie
				const response = await fetch(`${DEV_SERVER_URL}/rooms/${roomId}/photo`, {
					method: 'GET',
					headers: { Cookie: organizerCookie },
					redirect: 'manual'
				});

				// Organizers MUST get 200 — the route uses requireUser, not requireAdmin.
				expect(
					response.status,
					`Expected HTTP 200 for authenticated organizer GET /rooms/[id]/photo but got ${response.status}. ` +
						'IMPORTANT: The photo serve route must use requireUser (NOT requireAdmin). ' +
						'Organizers need to view room photos (story purpose: "so that organizers can recognize the space").'
				).toBe(200);

				const contentType = response.headers.get('content-type') ?? '';
				expect(
					contentType,
					`Expected Content-Type to start with 'image/' but got '${contentType}'`
				).toMatch(/^image\//);
			} finally {
				if (originalUploadDir === undefined) {
					delete process.env['UPLOAD_DIR'];
				} else {
					process.env['UPLOAD_DIR'] = originalUploadDir;
				}
				// uploadDir is intentionally not cleaned — dev server needs the file to serve it.
			}
		}
	);
});

// ---------------------------------------------------------------------------
// 3.2-UNIT-001 — UPLOAD_DIR resolved from env var, not hardcoded [P1]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Static Source Assertion: UPLOAD_DIR resolved from env var, not hardcoded (AC-6, R-005)', () => {
	test('[P1] 3.2-UNIT-001 — room-service.ts resolves UPLOAD_DIR from process.env, never from a hardcoded path', async () => {
		// ACTIVATED — uploadRoomPhoto() implemented. Story 3.2 complete (feat: commit 88e89ff).
		//
		// AC-6: Given the upload implementation, When UPLOAD_DIR is set via env var,
		//       Then the upload directory is resolved exclusively from that env var
		//       (never a hardcoded path), consistent with the 12-factor config pattern.
		//
		// Risk R-005: Photo file storage path not preserved on restart — if the path is
		//             hardcoded, the Docker volume mount may not match.
		//
		// Strategy: Source-level inspection (same pattern as 3.1-UNIT-001).
		// Read room-service.ts source and assert process.env['UPLOAD_DIR'] is referenced.

		const { readFileSync } = await import('fs');
		const { resolve } = await import('path');
		const { fileURLToPath } = await import('url');

		// rooms.test.ts → integration → tests → project root
		const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
		const SERVICE_PATH = resolve(
			PROJECT_ROOT,
			'src',
			'lib',
			'server',
			'services',
			'room-service.ts'
		);

		const serviceSource = readFileSync(SERVICE_PATH, 'utf-8');

		// Assert UPLOAD_DIR is read from process.env
		expect(
			serviceSource,
			'room-service.ts must reference process.env[\'UPLOAD_DIR\'] or process.env["UPLOAD_DIR"]'
		).toMatch(/process\.env\[['"]UPLOAD_DIR['"]\]/);

		// Assert uploadRoomPhoto function is exported
		expect(serviceSource, 'room-service.ts must export uploadRoomPhoto function').toContain(
			'uploadRoomPhoto'
		);

		// Assert ALLOWED_PHOTO_MIME_TYPES is exported (per story Task 3.2 spec)
		expect(
			serviceSource,
			'room-service.ts must export ALLOWED_PHOTO_MIME_TYPES constant'
		).toContain('ALLOWED_PHOTO_MIME_TYPES');

		// Assert no hardcoded absolute upload path literals
		expect(
			serviceSource,
			"room-service.ts must not contain hardcoded upload directory path literals like '/uploads/'"
		).not.toMatch(/['"`]\/(?:uploads?|var\/uploads?|app\/uploads?|files?)[/'"`]/);
	});
});

// ---------------------------------------------------------------------------
// 3.2-INT-006 — Uploaded photo file content retrievable from DB-recorded path [P2]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Photo Volume Persistence: Uploaded photo retrievable from recorded path (AC-1, R-005)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test('[P2] 3.2-INT-006 — uploadRoomPhoto() → file content at UPLOAD_DIR/<photoPath> matches uploaded data', async () => {
		// ACTIVATED — uploadRoomPhoto() implemented. Story 3.2 complete (feat: commit 88e89ff).
		//
		// AC-1 + R-005: The uploaded file is stored at a path derived from UPLOAD_DIR
		//               and that path is recorded in photo_path. The content at that
		//               path must match what was uploaded — verifies volume persistence.
		//
		// Strategy: service-level — upload a known buffer, read back from the stored path,
		// assert content matches. Simulates a restart scenario at the unit level.

		const { createRoom, uploadRoomPhoto } =
			await import('../../src/lib/server/services/room-service.js');
		const { readFile } = await import('fs/promises');
		const { join } = await import('path');

		const client = await pool.connect();
		let actorId: string;
		let roomId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
			const room = await createRoom(actorId, {
				name: 'Persistence Room',
				floor: '3',
				capacity: 8,
				features: [] as const
			});
			roomId = room.id;
		} finally {
			client.release();
		}

		await withTempUploadDir('tea-atdd-3.2-persist-', async (uploadDir) => {
			// Use a PNG with distinctive magic bytes to verify read-back fidelity
			const pngData = Buffer.from([
				0x89,
				0x50,
				0x4e,
				0x47,
				0x0d,
				0x0a,
				0x1a,
				0x0a, // PNG magic bytes
				0x00,
				0x00,
				0x00,
				0x0d,
				0x49,
				0x48,
				0x44,
				0x52, // IHDR chunk
				0x00,
				0x00,
				0x00,
				0x01,
				0x00,
				0x00,
				0x00,
				0x01, // 1x1 pixel
				0x08,
				0x00,
				0x00,
				0x00,
				0x00,
				0x3a,
				0x7e,
				0x9b,
				0x55 // greyscale, CRC
			]);

			const updated = await uploadRoomPhoto(actorId, roomId, {
				data: pngData,
				mimeType: 'image/png',
				size: pngData.length
			});

			expect(updated.photoPath, 'uploadRoomPhoto() must return a non-null photoPath').toBeTruthy();

			// Read back the file from the stored path
			const storedFilePath = join(uploadDir, updated.photoPath!);
			const readBackData = await readFile(storedFilePath);

			expect(readBackData.length, 'Read-back file must be non-empty').toBeGreaterThan(0);
			expect(
				Buffer.compare(pngData, readBackData),
				'Read-back file content must exactly match what was uploaded (byte-for-byte)'
			).toBe(0);

			// Round-trip via DB path: DB photo_path → file → content
			const dbResult = await pool.query<{ photo_path: string | null }>(
				`SELECT photo_path FROM rooms WHERE id = $1`,
				[roomId]
			);
			const dbPhotoPath = dbResult.rows[0]?.photo_path;
			expect(dbPhotoPath, 'DB photo_path must be non-null after upload').toBeTruthy();

			const pathFromDb = join(uploadDir, dbPhotoPath!);
			const readFromDb = await readFile(pathFromDb);
			expect(
				Buffer.compare(pngData, readFromDb),
				'File accessible via DB-recorded path must match original upload data'
			).toBe(0);
		});
	});
});

// ---------------------------------------------------------------------------
// 3.2-UNIT-002 — UPLOAD_DIR env var in docker-compose.prod.yml matches volume mount [P2]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Static Source Assertion: UPLOAD_DIR env var matches volume mount in docker-compose.prod.yml (AC-6, R-005)', () => {
	test('[P2] 3.2-UNIT-002 — docker-compose.prod.yml declares UPLOAD_DIR env var and a named uploads volume mounted at that path', async () => {
		// ACTIVATED — docker-compose.prod.yml wires UPLOAD_DIR + uploads volume. Story 3.2 complete.
		//
		// AC-6 + R-005: The upload directory is resolved from UPLOAD_DIR env var (12-factor).
		//               The production compose file must declare a named volume and mount it at
		//               the path UPLOAD_DIR resolves to, so files persist across container restarts.
		//
		// Note: compose.yaml (dev) only starts db + mailpit; the web service runs on the host
		//       via `bun run dev`. The production wiring lives in docker-compose.prod.yml.
		//
		// Strategy: Source-level inspection of docker-compose.prod.yml.
		// Assert: (1) UPLOAD_DIR env var is declared in the web service environment section,
		//         (2) an uploads volume is declared in top-level volumes section,
		//         (3) the volume is mounted in the web service.

		const { readFileSync } = await import('fs');
		const { resolve } = await import('path');
		const { fileURLToPath } = await import('url');

		const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
		const COMPOSE_PATH = resolve(PROJECT_ROOT, 'docker-compose.prod.yml');

		const composeSource = readFileSync(COMPOSE_PATH, 'utf-8');

		// Assert UPLOAD_DIR is declared as an environment variable in the web service
		expect(
			composeSource,
			'docker-compose.prod.yml must declare UPLOAD_DIR in the web service environment section'
		).toContain('UPLOAD_DIR');

		// Assert a named uploads volume is declared at the top level
		expect(
			composeSource,
			'docker-compose.prod.yml must declare a named uploads volume in the top-level volumes section'
		).toMatch(/^volumes:/m);

		expect(
			composeSource,
			'docker-compose.prod.yml volumes section must include an uploads volume entry'
		).toMatch(/volumes:[\s\S]*uploads/);

		// Assert the volume is mounted (appears in the web service volumes list)
		expect(
			composeSource,
			'docker-compose.prod.yml must mount the uploads volume in the web service volumes section'
		).toContain('uploads:/app/uploads');

		// Assert UPLOAD_DIR has an explicit non-empty value
		const uploadDirMatch = composeSource.match(/UPLOAD_DIR[=:]\s*([^\s\n]+)/);
		expect(
			uploadDirMatch,
			'UPLOAD_DIR must have an explicit value in docker-compose.prod.yml environment section'
		).not.toBeNull();

		const uploadDirValue = uploadDirMatch?.[1]?.trim();
		expect(
			uploadDirValue,
			'UPLOAD_DIR value in docker-compose.prod.yml must be non-empty'
		).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// 3.2-P3-001 — Re-upload replaces stored path; new file retrievable at new path [P3]
// ---------------------------------------------------------------------------

describe('Story 3.2 — Photo Re-upload: Re-uploading replaces stored path (AC-1)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skip('[P3] 3.2-P3-001 — uploadRoomPhoto() called twice on same room → photo_path updated to new path, new file readable', async () => {
		// P3 priority — activate on-demand when re-upload behavior needs verification.
		// uploadRoomPhoto() is implemented; this test remains test.skip() as a backlog item.
		//
		// Story P3-001: Overwriting a photo (uploading again) replaces stored file and path.
		// The DB photo_path must point to the latest upload; the new file must be readable.
		// (Orphan file cleanup of the old path is not required by AC — just FS+DB consistency.)
		//
		// Strategy: Upload once (path1). Upload again (path2). Assert path2 != path1.
		// Assert DB records path2. Assert file at path2 matches second upload data.

		const { createRoom, uploadRoomPhoto } =
			await import('../../src/lib/server/services/room-service.js');
		const { readFile } = await import('fs/promises');
		const { join } = await import('path');

		const client = await pool.connect();
		let actorId: string;
		let roomId: string;
		try {
			const admin = await seedAdminUser(client);
			actorId = admin.userId;
			const room = await createRoom(actorId, {
				name: 'Re-upload Room',
				floor: '1',
				capacity: 5,
				features: [] as const
			});
			roomId = room.id;
		} finally {
			client.release();
		}

		await withTempUploadDir('tea-atdd-3.2-reupload-', async (uploadDir) => {
			// Two distinct JPEG buffers with differing bytes so read-back is unambiguous.
			// jpegData1 uses makeJpegBuffer(); jpegData2 has different marker bytes.
			const jpegData1 = makeJpegBuffer();
			const jpegData2 = Buffer.from([
				0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x02, 0x02, 0x00, 0x00,
				0x02, 0x00, 0x02, 0x00, 0x00, 0xff, 0xd9
			]);

			// First upload
			const result1 = await uploadRoomPhoto(actorId, roomId, {
				data: jpegData1,
				mimeType: 'image/jpeg',
				size: jpegData1.length
			});
			const path1 = result1.photoPath;
			expect(path1, 'First upload must produce a non-null photoPath').toBeTruthy();

			// Second upload (re-upload)
			const result2 = await uploadRoomPhoto(actorId, roomId, {
				data: jpegData2,
				mimeType: 'image/jpeg',
				size: jpegData2.length
			});
			const path2 = result2.photoPath;
			expect(path2, 'Second upload must produce a non-null photoPath').toBeTruthy();

			// Paths must differ (uuidv7-based filenames are unique per upload)
			expect(path2, 'Re-upload must generate a new unique filename (paths must differ)').not.toBe(
				path1
			);

			// New file must be readable and contain the second upload's data
			const newFilePath = join(uploadDir, path2!);
			const readNewFile = await readFile(newFilePath);
			expect(
				Buffer.compare(jpegData2, readNewFile),
				'File at new path must match the second upload data'
			).toBe(0);

			// DB must record the new path
			const dbResult = await pool.query<{ photo_path: string | null }>(
				`SELECT photo_path FROM rooms WHERE id = $1`,
				[roomId]
			);
			expect(dbResult.rows[0]?.photo_path, 'DB photo_path must be updated to the new path').toBe(
				path2
			);
		});
	});
});
