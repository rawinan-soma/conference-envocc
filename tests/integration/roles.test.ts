/**
 * ATDD Red-Phase Scaffolds — Story 2.4: Roles & Assignment Model
 * Integration Tests: is_admin DB default, requireAdmin guard, role scoping
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
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
 *   4. Implement the feature (per task in story 2.4).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: Every user with is_admin=false is treated as organizer (default capability)
 *   - AC-2: users table carries is_admin boolean column (default false)
 *   - AC-3: requireAdmin passes for is_admin=true, throws error(403) for is_admin=false
 *   - AC-4: Drizzle schema + migration — existing users default to is_admin=false
 *   - AC-5: App.Locals user.isAdmin typed correctly (TypeScript; verified by bun run check)
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.4-INT-001 [P1]: New authenticated user defaults to organizer (is_admin=false)
 *   - 2.4-INT-002 [P1]: Admin flag set via DB → requireAdmin passes for admin user
 *   - 2.4-INT-003 [P2]: Admin flag scopes routes — admin passes, non-admin throws 403
 *
 * Test Implementation Strategy:
 *   - 2.4-INT-001: Real Postgres via pgFactory — seed a user, assert is_admin=false default
 *   - 2.4-INT-002: Unit-level (mock RequestEvent) — no DB, no admin HTTP routes yet
 *   - 2.4-INT-003: Unit-level (mock RequestEvent) — both happy/unhappy paths
 *
 * Why mock events for 002/003:
 *   Story 2.2 (dev auth bypass) is still backlog; (app)/admin/** routes do not exist yet.
 *   Both tests must call requireAdmin() directly with a mocked event.locals.
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   All error messages and UI strings must flow through Paraglide (m.* keys).
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createPgFactory } from '../support/fixtures/pg-factory.js';
import type { PgFactoryResult } from '../support/fixtures/pg-factory.js';

// ---------------------------------------------------------------------------
// requireAdmin import — will fail to compile until guards.ts is corrected
// (removing @ts-expect-error; Task 2 of story 2.4)
// ---------------------------------------------------------------------------

import { requireAdmin } from '$lib/server/auth/guards.js';

// ---------------------------------------------------------------------------
// Shared DB factory — used for 2.4-INT-001 (real Postgres)
// ---------------------------------------------------------------------------

let pgFactory: PgFactoryResult;

beforeAll(async () => {
	const databaseUrl = process.env['DATABASE_URL'];
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL not set — integration-setup.ts should have configured it via Testcontainers or CI service'
		);
	}
	pgFactory = await createPgFactory(databaseUrl);
});

afterAll(async () => {
	if (pgFactory) {
		await pgFactory.cleanup();
	}
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fixed timestamps used in mock events — deterministic, never clock-sensitive.
 * Using a far-future session expiry ensures requireUser's expiry check always
 * passes for mock sessions regardless of when the test suite runs.
 */
const MOCK_CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const MOCK_UPDATED_AT = new Date('2026-01-01T00:00:00.000Z');
const MOCK_SESSION_EXPIRES_AT = new Date('2099-12-31T23:59:59.000Z');

/**
 * Build a minimal mock RequestEvent with controlled user and session in locals.
 * Used for unit-level tests of requireAdmin (no real HTTP, no real session).
 */
function makeMockEvent(userOverrides: Record<string, unknown> | null): {
	locals: {
		user: Record<string, unknown> | null;
		session: { expiresAt: Date } | null;
	};
} {
	if (userOverrides === null) {
		return { locals: { user: null, session: null } };
	}
	return {
		locals: {
			user: {
				id: 'test-user-uuid-001',
				name: 'Test User',
				email: 'testuser@envocc.test',
				emailVerified: true,
				image: null,
				createdAt: MOCK_CREATED_AT,
				updatedAt: MOCK_UPDATED_AT,
				isAdmin: false,
				...userOverrides
			},
			session: {
				expiresAt: MOCK_SESSION_EXPIRES_AT
			}
		}
	};
}

// ---------------------------------------------------------------------------
// 2.4-INT-001 — New user defaults to organizer (is_admin=false) [P1]
// AC-1, AC-2, AC-4
// ---------------------------------------------------------------------------

describe('Story 2.4 — Roles Model: DB Default (AC-1, AC-2, AC-4)', () => {
	test('[P1] 2.4-INT-001 — New authenticated user defaults to organizer role (is_admin=false)', async () => {
		// THIS TEST WILL FAIL — is_admin column does not exist until Task 1 adds it
		// (drizzle/0003_roles.sql migration applied by createPgFactory via drizzle-kit migrate).
		//
		// Activate after Task 1 (schema + migration) is complete.
		//
		// Strategy: Insert a user row via raw SQL without specifying is_admin,
		// then SELECT the row back and assert is_admin = false (DB default).
		// This confirms the migration applied and the DEFAULT false constraint works.

		await pgFactory.truncateAll();

		const { pool } = pgFactory;
		const client = await pool.connect();
		try {
			// Insert a user without specifying is_admin — should default to false
			await client.query(
				`INSERT INTO users (id, name, email, "emailVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, false, NOW(), NOW())`,
				['int-001-user-id', 'Organizer Default', 'organizer@envocc.test']
			);

			// Read the row back and assert the is_admin column defaults to false
			const result = await client.query<{ is_admin: boolean }>(
				`SELECT is_admin FROM users WHERE id = $1`,
				['int-001-user-id']
			);

			// Assertions — will fail until 0003_roles.sql migration is applied
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0]).toBeDefined();
			expect(result.rows[0]!.is_admin).toBe(false);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.4-INT-002 — Admin flag set via DB → requireAdmin passes [P1]
// AC-2, AC-3
// ---------------------------------------------------------------------------

describe('Story 2.4 — Roles Model: requireAdmin Guard — Admin Access (AC-2, AC-3)', () => {
	test('[P1] 2.4-INT-002 — Admin user (is_admin=true) passes requireAdmin without error', () => {
		// THIS TEST WILL FAIL until:
		//   1. Task 1: isAdmin column added to User type (src/lib/server/db/schema/auth.ts)
		//   2. Task 2: @ts-expect-error removed from requireAdmin (guards.ts)
		//
		// Activate after Task 1 and Task 2.
		//
		// Strategy: Build a mock event with an admin user (isAdmin: true)
		// and verify requireAdmin() returns the user without throwing.
		// No DB or HTTP required — we mock event.locals directly.

		const adminEvent = makeMockEvent({ isAdmin: true });

		// Should NOT throw — admin user passes the guard
		expect(() => requireAdmin(adminEvent as Parameters<typeof requireAdmin>[0])).not.toThrow();

		// Should return the user object
		const returnedUser = requireAdmin(adminEvent as Parameters<typeof requireAdmin>[0]);
		expect(returnedUser).toBeDefined();
		expect(returnedUser.isAdmin).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 2.4-INT-003 — Admin flag scopes routes — admin passes, non-admin → 403 [P2]
// AC-3
// ---------------------------------------------------------------------------

describe('Story 2.4 — Roles Model: requireAdmin Guard — Role Scoping (AC-3)', () => {
	test('[P2] 2.4-INT-003a — Non-admin user (is_admin=false) blocked by requireAdmin with 403', () => {
		// THIS TEST WILL FAIL until Task 1 + Task 2 are implemented.
		// Activate after Task 1 and Task 2.
		//
		// Strategy: Mock event with a non-admin user (isAdmin: false) and assert
		// that requireAdmin throws (SvelteKit error(403)).

		const organizerEvent = makeMockEvent({ isAdmin: false });

		// Should THROW with 403 status — non-admin is rejected
		expect(() => requireAdmin(organizerEvent as Parameters<typeof requireAdmin>[0])).toThrow();
	});

	test('[P2] 2.4-INT-003b — Admin user (is_admin=true) passes requireAdmin (happy path re-assert)', () => {
		// THIS TEST WILL FAIL until Task 1 + Task 2 are implemented.
		// Activate after Task 1 and Task 2.
		//
		// Confirms both unhappy (003a) and happy (003b) paths in a single describe block
		// for clean AC-3 traceability.

		const adminEvent = makeMockEvent({ isAdmin: true });

		// Should NOT throw — admin passes
		expect(() => requireAdmin(adminEvent as Parameters<typeof requireAdmin>[0])).not.toThrow();
	});

	test('[P2] 2.4-INT-003c — Unauthenticated request (no session) is redirected before 403 check', () => {
		// THIS TEST WILL FAIL until Task 1 + Task 2 are implemented.
		// Activate after Task 1 and Task 2.
		//
		// Strategy: Null user in locals — requireUser() inside requireAdmin() should
		// throw a redirect(302) before the isAdmin check is reached.
		// SvelteKit redirect() throws a Response-like object.

		const unauthEvent = makeMockEvent(null);

		// Should THROW (redirect to /login), not reach the 403 isAdmin check
		expect(() => requireAdmin(unauthEvent as Parameters<typeof requireAdmin>[0])).toThrow();
	});
});
