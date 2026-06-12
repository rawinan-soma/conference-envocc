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
		for (const table of ['rooms', 'audit_log', 'user_profiles', 'sessions', 'accounts', 'users']) {
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
// Story 3.3 Test Stubs — Deactivate a Room (RED PHASE)
// ---------------------------------------------------------------------------
//
// All tests below are scaffolded with test.skip() or test.skipIf() and will remain
// skipped until the developer activates them task-by-task during implementation.
//
// Activation guide (from story 3.3 dev notes):
//   Task 1: Activate 3.3-INT-001, 3.3-INT-002, 3.3-INT-005 → run → expect FAIL
//            → implement deactivateRoom() → run → expect PASS (green)
//   Task 2: Activate 3.3-INT-003 → run → expect FAIL
//            → implement deactivate route → run → expect PASS (green)
//
// AC Coverage:
//   - AC-1, AC-2: 3.3-INT-001 (deactivated room absent from listRooms())
//   - AC-1:       3.3-INT-002 (deactivated room row still in DB with is_active=false)
//   - AC-3:       3.3-INT-003 (non-admin POST /admin/rooms/[id]/deactivate → 403)
//   - AC-4:       3.3-INT-005 (deactivateRoom() writes audit_log row)
//
// Note: 3.3-INT-004 (deactivated room cannot be selected in booking form) is bounded by
// Epic 4 (booking selector does not exist yet). Coverage is provided via listRooms()
// exclusion in INT-001/INT-002. INT-004 will be implemented alongside the booking selector.

// ---------------------------------------------------------------------------
// 3.3-INT-001 — Deactivated room absent from active room list [P0]
// ---------------------------------------------------------------------------

describe('Story 3.3 — Room Deactivate: Deactivated room absent from listRooms() (AC-1, AC-2)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skip('[P0] 3.3-INT-001 — createRoom() then deactivateRoom() → room absent from listRooms()', async () => {
		// THIS TEST WILL FAIL — deactivateRoom() not yet exported from room-service.ts (Task 1.2).
		// Activate after Task 1.1 (write stub) → remove test.skip → expect red.
		// Then implement deactivateRoom (Task 1.3) → expect green (Task 1.4).
		//
		// AC-1: Given a room with no future bookings, When I deactivate it,
		//       Then it disappears from the bookable room list (listRooms() returns only active rooms).
		// AC-2: Given a deactivated room, When the room-list query runs,
		//       Then the deactivated room is absent from the result.
		//
		// Strategy: service-level — createRoom, then deactivateRoom, then assert listRooms()
		//           does not include the deactivated room.

		const { createRoom, listRooms, deactivateRoom } =
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
			name: 'Room To Deactivate 001',
			floor: '3',
			capacity: 15,
			features: ['projector'] as const
		};

		const created = await createRoom(actorId, input);

		// Verify the room is in the list before deactivation
		const beforeRooms = await listRooms();
		const beforeFound = beforeRooms.find((r) => r.id === created.id);
		expect(beforeFound, 'Room must appear in listRooms() before deactivation').toBeDefined();

		// Deactivate the room
		await deactivateRoom(actorId, created.id);

		// After deactivation, the room must not appear in listRooms()
		const afterRooms = await listRooms();
		const afterFound = afterRooms.find((r) => r.id === created.id);
		expect(
			afterFound,
			'Deactivated room must NOT appear in listRooms() after deactivation'
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 3.3-INT-002 — Deactivated room row still in DB with is_active=false [P0]
// ---------------------------------------------------------------------------

describe('Story 3.3 — Room Deactivate: Deactivated room row persists in DB with is_active=false (AC-1)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skip('[P0] 3.3-INT-002 — deactivateRoom() performs soft delete: DB row remains with is_active=false', async () => {
		// THIS TEST WILL FAIL — deactivateRoom() not yet exported from room-service.ts (Task 1.2).
		// Activate alongside 3.3-INT-001 (same task group).
		//
		// AC-1: Deactivation is a soft delete — the room row remains in the database
		//       with is_active=false (not hard deleted).
		//
		// Strategy: service-level — createRoom, deactivateRoom, direct pool query to assert
		//           the row still exists and is_active = false.

		const { createRoom, deactivateRoom } =
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
			name: 'Room To Deactivate 002',
			floor: '1',
			capacity: 8,
			features: [] as const
		};

		const created = await createRoom(actorId, input);

		// Verify is_active=true before deactivation
		const beforeResult = await pool.query<{ is_active: boolean }>(
			`SELECT is_active FROM rooms WHERE id = $1`,
			[created.id]
		);
		expect(
			beforeResult.rows[0]?.is_active,
			'Room must have is_active=true before deactivation'
		).toBe(true);

		// Deactivate the room
		await deactivateRoom(actorId, created.id);

		// Row must still exist in DB with is_active=false (soft delete, not hard delete)
		const afterResult = await pool.query<{ is_active: boolean; id: string }>(
			`SELECT id, is_active FROM rooms WHERE id = $1`,
			[created.id]
		);

		expect(
			afterResult.rows.length,
			'Room row must still exist in the DB after deactivation (soft delete)'
		).toBe(1);
		expect(afterResult.rows[0]?.is_active, 'is_active must be false after deactivateRoom()').toBe(
			false
		);
	});
});

// ---------------------------------------------------------------------------
// 3.3-INT-003 — Non-admin POST /admin/rooms/[id]/deactivate → 403 [P1]
// ---------------------------------------------------------------------------

describe('Story 3.3 — Authorization: Non-admin POST room deactivate → 403 (AC-3, R-002)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P1] 3.3-INT-003 — Non-admin (organizer) POST /admin/rooms/[id]/deactivate → 403 (IDOR proof)',
		{ timeout: 15000 },
		async () => {
			// THIS TEST WILL FAIL — deactivate route not yet implemented (Task 2.2).
			// Activate after Task 2.1 (write stub).
			// Then implement the deactivate route (Task 2.2) → expect green (Task 2.3).
			//
			// AC-3: Given an authenticated non-admin user (organizer),
			//       When they attempt POST to /admin/rooms/[id]/deactivate,
			//       Then the server returns 403.
			//
			// Risk R-002: IDOR on admin room deactivate route — organizer bypasses requireAdmin.
			//
			// Strategy: Seed a room (service-level), seed a non-admin session, POST to deactivate
			//           endpoint, assert 403 via testOwnershipEnforcement().
			// Note: requireAdmin guard covers /^\/admin(?:\/|$)/ — the new deactivate route is
			//       automatically protected without additional hooks changes (story dev notes).

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
				name: 'Room to Deactivate IDOR',
				floor: '2',
				capacity: 10,
				features: [] as const
			});

			await testOwnershipEnforcement({
				routeUrl: `${DEV_SERVER_URL}/admin/rooms/${room.id}/deactivate`,
				method: 'POST',
				nonOwnerCookie: organizerCookie,
				body: new URLSearchParams().toString(),
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
// 3.3-INT-005 — deactivateRoom() writes audit_log row [P1]
// ---------------------------------------------------------------------------

describe('Story 3.3 — Audit Log: deactivateRoom() writes audit_log row (AC-4)', () => {
	beforeEach(async () => {
		await truncateRoomTables();
	});

	test.skip('[P1] 3.3-INT-005 — deactivateRoom() writes audit_log row with entity=room, action=deactivate, actor_id, diff.isActive.new===false', async () => {
		// THIS TEST WILL FAIL — deactivateRoom() not yet exported from room-service.ts (Task 1.2).
		// Activate alongside 3.3-INT-001 and 3.3-INT-002 (same task group, Task 1).
		//
		// AC-4: Given a successful deactivation, When the transaction commits,
		//       Then an audit_log row is written with entity='room', action='deactivate',
		//       actor_id, and diff = { isActive: { old: true, new: false } }.
		//
		// Strategy: service-level — createRoom, deactivateRoom, query audit_log,
		//           assert entity, action, actor_id, and diff.isActive.new === false.
		// Note: diff key is camelCase 'isActive' (Drizzle column name convention), matching
		//       the writeAuditLog call: { isActive: { old: true, new: false } }.

		const { createRoom, deactivateRoom } =
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
			name: 'Room To Deactivate 005',
			floor: '4',
			capacity: 12,
			features: ['whiteboard'] as const
		};

		const created = await createRoom(actorId, input);

		// Deactivate the room
		await deactivateRoom(actorId, created.id);

		// Query audit_log for the deactivate row written during deactivateRoom()
		const auditResult = await pool.query<{
			entity: string;
			action: string;
			actor_id: string;
			diff: unknown;
		}>(
			`SELECT entity, action, actor_id, diff
         FROM audit_log
         WHERE entity = 'room'
           AND action = 'deactivate'
           AND actor_id = $1
         ORDER BY id DESC
         LIMIT 1`,
			[actorId]
		);

		expect(
			auditResult.rows.length,
			'audit_log must contain exactly one deactivate row after deactivateRoom()'
		).toBe(1);

		const auditRow = auditResult.rows[0];
		expect(auditRow?.entity, "audit_log entity must be 'room'").toBe('room');
		expect(auditRow?.action, "audit_log action must be 'deactivate'").toBe('deactivate');
		expect(auditRow?.actor_id, 'audit_log actor_id must match the admin userId').toBe(actorId);
		expect(auditRow?.diff, 'audit_log diff must be non-null').not.toBeNull();

		// Verify the diff contains isActive: { old: true, new: false }
		const diff = auditRow?.diff as Record<string, { old: unknown; new: unknown }>;
		expect(diff, 'diff must contain isActive key (camelCase Drizzle column)').toHaveProperty(
			'isActive'
		);
		expect(
			diff['isActive']?.old,
			'diff.isActive.old must be true (room was active before deactivation)'
		).toBe(true);
		expect(diff['isActive']?.new, 'diff.isActive.new must be false (room deactivated)').toBe(false);
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
