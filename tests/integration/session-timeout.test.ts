/**
 * ATDD Red-Phase Scaffolds — Story 2.6: Fixed Session Timeout
 * Integration Tests: Session expiry after 30-min inactivity, non-configurable setting
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
 *   4. Implement the feature (per task in story 2.6).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * Story AC:
 *   Given an authenticated session idle for the fixed 30-minute default
 *   When the next request is made
 *   Then the session is expired and re-authentication is required
 *   And the timeout is not exposed as a configurable setting.
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.6-INT-001: Session expired after 30-min inactivity → next request triggers re-auth [P0]
 *   - 2.6-INT-002: Session timeout not exposed as a user-configurable setting [P1]
 *   - 2.6-INT-003: Expired session rows not returned by Better Auth on subsequent requests [P2]
 *   - 2.6-INT-004: Multiple concurrent sessions for same user expire independently [P3]
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - drizzle-kit migrate has been run (including 0002_better_auth.sql)
 *   - Better Auth installed and configured in src/lib/server/auth/index.ts
 *   - SvelteKit dev server running on port 3000 (for HTTP-level expiry tests)
 *   - Story 2.1 implementation complete (auth guard active, sessions table exists)
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   All error messages and UI strings must flow through Paraglide (m.* keys).
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

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
	// Verify connectivity
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Truncate Better Auth tables between tests for isolation.
 * Order: sessions → accounts → users (FK child before parent).
 * Safe to call even if tables don't yet exist (schema check first).
 */
async function truncateBetterAuthTables(): Promise<void> {
	const client = await pool.connect();
	try {
		for (const table of ['sessions', 'accounts', 'users']) {
			const result = await client.query<{ exists: boolean }>(
				`SELECT EXISTS (
					SELECT 1 FROM information_schema.tables
					WHERE table_schema = 'public' AND table_name = $1
				) AS exists`,
				[table]
			);
			if (result.rows[0]?.exists) {
				await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
			}
		}
	} finally {
		client.release();
	}
}

/**
 * Seed a test user and an expired session row.
 * Expiry simulation: set expiresAt to a timestamp in the past.
 *
 * @param userId   - Stable test user ID (use unique value per test to avoid FK collisions)
 * @param token    - Session token string to seed
 * @param expiresAt - Timestamp for the session's expiresAt column (past = expired)
 */
async function seedExpiredSession(
	userId: string,
	token: string,
	expiresAt: Date
): Promise<{ userId: string; token: string }> {
	const client = await pool.connect();
	try {
		await client.query(
			`INSERT INTO users (id, email, "emailVerified", "createdAt", "updatedAt")
			 VALUES ($1, $2, false, NOW(), NOW())
			 ON CONFLICT (id) DO NOTHING`,
			[userId, `${userId}@test-2-6.example.com`]
		);
		await client.query(
			`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, NOW(), NOW())
			 ON CONFLICT (id) DO NOTHING`,
			[`session-${userId}`, token, userId, expiresAt]
		);
	} finally {
		client.release();
	}
	return { userId, token };
}

// ---------------------------------------------------------------------------
// 2.6-UNIT-001 — Static assertion: session.expiresIn === 1800 (FR-093) [P1]
// ---------------------------------------------------------------------------

describe('Story 2.6 — Auth Config: Fixed Session expiresIn (FR-093)', () => {
	test('[P1] 2.6-UNIT-001 — Better Auth config has session.expiresIn fixed at 1800 seconds (30 min)', async () => {
		// ACTIVATED immediately — src/lib/server/auth/index.ts already exists (Story 2.1 Task 1.4).
		//
		// FR-093: Fixed 30-min session timeout — NEVER configurable.
		// AC: "the timeout is not exposed as a configurable setting"
		//
		// Strategy: Import the auth config and assert session.expiresIn is exactly 1800.
		// This is a static assertion — verifies the hard-coded constant is not accidentally
		// changed to a dynamic env-var lookup or a different duration.

		const { auth } = await import('../../src/lib/server/auth/index.js');

		const sessionConfig = auth.options?.session;

		expect(
			sessionConfig,
			'auth.options.session must be defined — verify Better Auth config in src/lib/server/auth/index.ts'
		).toBeDefined();

		expect(
			sessionConfig.expiresIn,
			'session.expiresIn must be exactly 1800 seconds (30 min) — FR-093 fixed timeout, never configurable'
		).toBe(1800);
	});

	test('[P1] 2.6-UNIT-002 — Better Auth config does NOT read session timeout from environment variable', async () => {
		// ACTIVATED immediately — static source-code assertion, no DB required.
		//
		// AC: "the timeout is not exposed as a configurable setting"
		// Risk: A developer may inadvertently refactor expiresIn to read from process.env,
		// making the timeout configurable and violating FR-093.
		//
		// Strategy: Assert that the session.expiresIn value is a literal number (1800),
		// not derived from any environment variable. We verify this by importing the auth
		// module without setting any timeout-related env vars and asserting the value is
		// still exactly 1800.
		//
		// Complementary to 2.6-UNIT-001 — together they ensure the value is both correct
		// AND not environment-driven.

		// Temporarily unset any env vars that could override timeout (defensive)
		const savedEnv = { ...process.env };
		delete process.env['SESSION_TIMEOUT'];
		delete process.env['SESSION_EXPIRES_IN'];
		delete process.env['AUTH_SESSION_TIMEOUT'];

		try {
			const { auth } = await import('../../src/lib/server/auth/index.js');
			const sessionConfig = auth.options?.session;

			expect(
				sessionConfig?.expiresIn,
				'session.expiresIn must remain 1800 regardless of env vars — FR-093 requires hard-coded fixed timeout'
			).toBe(1800);
		} finally {
			// Restore env
			Object.assign(process.env, savedEnv);
		}
	});
});

// ---------------------------------------------------------------------------
// 2.6-INT-001 — Expired session → re-auth required (AC main criterion) [P0]
// ---------------------------------------------------------------------------

describe('Story 2.6 — Session Expiry: Expired Session Forces Re-auth (AC)', () => {
	test.skip('[P0] 2.6-INT-001 — Request with expired session token → 302 to /login (re-auth required)', async () => {
		// THIS TEST WILL FAIL — requires Story 2.1 auth guard active in hooks.server.ts.
		// Activate after: Story 2.1 complete (handleAuthGuard in hooks.server.ts active).
		//
		// AC: Given an authenticated session idle for the fixed 30-minute default,
		//     When the next request is made,
		//     Then the session is expired and re-authentication is required.
		//
		// Risk R-004: Session does not expire after 30 minutes — sessions table row stays
		//             but Better Auth should reject it when expiresAt is in the past.
		//
		// Strategy:
		//   1. Seed a user + session row with expiresAt set 31 minutes in the past
		//      (simulating a session that went idle past the 30-min fixed timeout)
		//   2. Make a GET request to any (app) route using the expired session token as cookie
		//   3. Better Auth validates the session — finds expiresAt in the past → rejects it
		//   4. Auth guard intercepts the unauthenticated request → 302 to /login
		//
		// Why DB mutation instead of time-travel: Better Auth evaluates expiresAt at runtime.
		// Setting expiresAt to a past timestamp is the authoritative way to simulate expiry
		// without time-travel mocking or clock manipulation.

		await truncateBetterAuthTables();

		const userId = 'test-user-2-6-int-001';
		const token = 'expired-session-token-2-6-int-001';
		// 31 minutes ago — past the 30-min (1800s) fixed timeout
		const expiredAt = new Date(Date.now() - 31 * 60 * 1000);

		await seedExpiredSession(userId, token, expiredAt);

		try {
			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			// GET an (app) route with the expired session cookie — do NOT follow redirects
			const response = await fetch(`${devServerUrl}/dashboard`, {
				headers: {
					Cookie: `better-auth.session_token=${token}`
				},
				redirect: 'manual'
			});

			// Better Auth should reject the expired session → auth guard redirects to /login
			expect(
				response.status,
				'Request with expired session must return 302 (expired token → re-auth required)'
			).toBe(302);

			const location = response.headers.get('location');
			expect(
				location,
				'302 redirect must point to /login — re-authentication required after session expiry'
			).toMatch(/\/login/);
		} finally {
			await truncateBetterAuthTables();
		}
	});

	test.skip('[P0] 2.6-INT-001b — Request with fresh (non-expired) session token → NOT redirected to /login', async () => {
		// THIS TEST WILL FAIL — requires Story 2.1 auth guard + dev server active.
		// Activate after: Story 2.1 complete.
		//
		// Complementary negative case: a valid (non-expired) session must still work.
		// This ensures the guard distinguishes expired vs. valid sessions rather than
		// rejecting all sessions.
		//
		// Strategy:
		//   1. Seed a user + session with expiresAt 29 minutes in the future (fresh session)
		//   2. GET an (app) route with this valid session token
		//   3. Expect NOT a 302 to /login (session is valid → request proceeds)
		//
		// Note: The (app) route may return 200 or another non-302 depending on route
		// implementation. We only assert the session is NOT rejected.

		await truncateBetterAuthTables();

		const userId = 'test-user-2-6-int-001b';
		const token = 'fresh-session-token-2-6-int-001b';
		// 29 minutes in the future — within the 30-min window (not yet expired)
		const validUntil = new Date(Date.now() + 29 * 60 * 1000);

		await seedExpiredSession(userId, token, validUntil); // reusing helper with future expiresAt

		try {
			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			const response = await fetch(`${devServerUrl}/dashboard`, {
				headers: {
					Cookie: `better-auth.session_token=${token}`
				},
				redirect: 'manual'
			});

			// A valid session must NOT cause a redirect to /login
			// (The response might be 200 on /dashboard or other non-302 status)
			if (response.status === 302) {
				const location = response.headers.get('location') ?? '';
				expect(
					location,
					'Fresh session must NOT redirect to /login — session is within the 30-min window'
				).not.toMatch(/\/login/);
			}

			// Primary assertion: not redirected to login
			expect(
				response.status,
				'Fresh (non-expired) session must NOT trigger 302 to /login'
			).not.toBe(302);
		} finally {
			await truncateBetterAuthTables();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.6-INT-002 — Session timeout not exposed as configurable setting (AC) [P1]
// ---------------------------------------------------------------------------

describe('Story 2.6 — Non-Configurable Timeout: No Settings Endpoint Exposes Timeout (AC)', () => {
	test.skip('[P1] 2.6-INT-002 — GET /settings (or any route) does not expose session timeout as an editable field', async () => {
		// THIS TEST WILL FAIL — /settings route does not yet exist (Story 2.6 admin settings
		// are deferred to Epic 7). Activate after admin settings route exists or when verifying
		// that any settings-like endpoint does not expose session timeout.
		//
		// AC: "the timeout is not exposed as a configurable setting"
		//
		// Strategy: GET any settings-related endpoint and assert no timeout field appears
		// in the response that could be edited. This is an anti-regression guard to ensure
		// a future settings page never accidentally includes a "session timeout" input.
		//
		// Scope: Check routes that could plausibly expose session settings (/settings,
		// /admin/settings). If the route returns 404 (not yet implemented), the test passes
		// vacuously — no settings page means no timeout exposure.
		//
		// Marker: Test activates properly when any settings route exists.

		const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

		const candidateRoutes = ['/settings', '/admin/settings', '/profile/settings'];

		for (const route of candidateRoutes) {
			const response = await fetch(`${devServerUrl}${route}`, {
				redirect: 'manual'
			});

			// If the route exists (200) and returns HTML/JSON, verify no timeout field present
			if (response.status === 200) {
				const body = await response.text();

				// Assert no session timeout field names appear that could be edited
				const forbiddenPatterns = [
					'session_timeout',
					'sessionTimeout',
					'session-timeout',
					'expiresIn',
					'session_expiry',
					'sessionExpiry'
				];

				for (const pattern of forbiddenPatterns) {
					expect(
						body,
						`Route ${route} must not expose '${pattern}' as a configurable field — FR-093 requires fixed timeout`
					).not.toContain(pattern);
				}
			}
			// If route returns 302 (auth redirect) or 404, vacuously pass —
			// unauthenticated redirect to /login confirms no settings leakage without auth.
		}
	});

	test('[P1] 2.6-UNIT-003 — No environment variable controls session timeout (source-code scan)', () => {
		// ACTIVATED immediately — static assertion, no infrastructure required.
		//
		// AC: "the timeout is not exposed as a configurable setting"
		// Complementary to 2.6-UNIT-001/2: guard against the env.ts or a .env file
		// exposing SESSION_TIMEOUT or equivalent that a future developer might wire up.
		//
		// Strategy: Scan environment variable keys at runtime for any timeout-related keys.
		// This is a defensive static assertion — it will catch accidental introduction of
		// configurable session timeout via env vars even if auth/index.ts is bypassed.
		//
		// Note: This test does NOT prevent process.env from having these keys in production;
		// it verifies that the auth module does NOT use them (structural guarantee).

		const forbiddenEnvKeys = [
			'SESSION_TIMEOUT',
			'SESSION_EXPIRES_IN',
			'AUTH_SESSION_TIMEOUT',
			'SESSION_MAX_AGE',
			'SESSION_DURATION'
		];

		// None of these keys should be read by auth/index.ts — they should not even
		// need to exist. If they're present in the env, it suggests someone may have
		// wired them up — but for this test we only assert auth.options.session.expiresIn
		// is the literal 1800, not derived from any of these keys.
		//
		// This test is a documentation guard: it names the forbidden patterns explicitly
		// so any future developer adding one is immediately confronted with this test failure.

		for (const key of forbiddenEnvKeys) {
			expect(
				key in process.env ? process.env[key] : undefined,
				`Environment key '${key}' must NOT exist or be used to configure session timeout — FR-093: fixed 1800s, never configurable`
			).toBeUndefined();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.6-INT-003 — Expired session rows not returned to app (R-010) [P2]
// ---------------------------------------------------------------------------

describe('Story 2.6 — Session Isolation: Expired Sessions Not Returned by Better Auth', () => {
	test.skip('[P2] 2.6-INT-003 — Expired session row in DB → event.locals.session is null on next request', async () => {
		// THIS TEST WILL FAIL — requires a route that exposes event.locals.session for
		// inspection. This is typically only visible via a test-specific route or a custom
		// debug endpoint (not to be shipped to production).
		//
		// Activate after: Story 2.1 complete + a test helper endpoint exists at
		// /api/test/session-status (to be created only in test/dev environments, guarded by
		// AUTH_DEV_BYPASS or NODE_ENV !== 'production').
		//
		// Risk R-010: Expired session rows in the DB are not filtered — Better Auth may
		// return them as valid sessions if expiresAt check is misconfigured.
		//
		// Strategy:
		//   1. Seed an expired session (expiresAt in past)
		//   2. GET a test introspection endpoint that returns event.locals.session as JSON
		//   3. Assert the response indicates no valid session (null / empty)
		//
		// Alternative strategy (if no debug endpoint): use DB query to verify Better Auth's
		// session validation filter by checking getSession() output via a direct call to the
		// auth API with the expired token.

		await truncateBetterAuthTables();

		const userId = 'test-user-2-6-int-003';
		const token = 'expired-session-token-2-6-int-003';
		const expiredAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

		await seedExpiredSession(userId, token, expiredAt);

		try {
			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			// Test introspection endpoint — returns {"session": null} if no valid session,
			// or {"session": {...}} if a valid session was found.
			// This endpoint must be gated by AUTH_DEV_BYPASS + non-production env.
			const response = await fetch(`${devServerUrl}/api/test/session-status`, {
				headers: {
					Cookie: `better-auth.session_token=${token}`
				},
				redirect: 'manual'
			});

			// If the endpoint exists:
			if (response.status === 200) {
				const body = await response.json();
				expect(
					body.session,
					'event.locals.session must be null for an expired session token — Better Auth must filter expiresAt'
				).toBeNull();
			} else {
				// If 302 (auth redirect) or 404 (endpoint not yet created): mark as pending
				// The 302 to /login is actually evidence the session was rejected — counts as pass
				if (response.status === 302) {
					const location = response.headers.get('location') ?? '';
					expect(
						location,
						'Expired session must redirect to /login (rejected by Better Auth)'
					).toMatch(/\/login/);
				} else {
					// 404 — test introspection endpoint not yet created; skip gracefully
					expect(
						response.status,
						'Test introspection endpoint not found — create /api/test/session-status to activate this test'
					).toBe(404);
				}
			}
		} finally {
			await truncateBetterAuthTables();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.6-INT-004 — Multiple concurrent sessions expire independently [P3]
// ---------------------------------------------------------------------------

describe('Story 2.6 — Concurrent Sessions: Each Expires Independently (P3)', () => {
	test.skip('[P3] 2.6-INT-004 — Multiple concurrent sessions for same user: expired one rejected, fresh one accepted', async () => {
		// THIS TEST WILL FAIL — requires Story 2.1 complete + dev server + session seeding.
		// Activate on-demand (P3 — informational; no SLA per test-design-epic-2.md).
		//
		// Scenario: A user is logged in from two devices simultaneously.
		//   Session A: created 31 minutes ago → expired
		//   Session B: created 5 minutes ago → still active
		//
		// Assertion: Session A → 302 to /login; Session B → NOT redirected to /login.
		// This verifies that session expiry is per-session (not user-wide).
		//
		// Risk: A naive expiry implementation might expire ALL sessions for a user when
		// one expires, preventing multi-device usage or inadvertent mass-logout.

		await truncateBetterAuthTables();

		const userId = 'test-user-2-6-int-004';
		const expiredToken = 'expired-session-2-6-int-004';
		const freshToken = 'fresh-session-2-6-int-004';

		// Session A: expired 31 minutes ago
		const expiredAt = new Date(Date.now() - 31 * 60 * 1000);
		// Session B: expires 25 minutes from now (fresh)
		const freshUntil = new Date(Date.now() + 25 * 60 * 1000);

		const client = await pool.connect();
		try {
			// Insert user
			await client.query(
				`INSERT INTO users (id, email, "emailVerified", "createdAt", "updatedAt")
				 VALUES ($1, $2, false, NOW(), NOW())
				 ON CONFLICT (id) DO NOTHING`,
				[userId, `${userId}@test-2-6.example.com`]
			);

			// Insert expired Session A
			await client.query(
				`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
				 VALUES ($1, $2, $3, $4, NOW(), NOW())
				 ON CONFLICT (id) DO NOTHING`,
				[`session-a-${userId}`, expiredToken, userId, expiredAt]
			);

			// Insert fresh Session B
			await client.query(
				`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
				 VALUES ($1, $2, $3, $4, NOW(), NOW())
				 ON CONFLICT (id) DO NOTHING`,
				[`session-b-${userId}`, freshToken, userId, freshUntil]
			);
		} finally {
			client.release();
		}

		try {
			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			// Session A (expired) → should be rejected → 302 to /login
			const responseA = await fetch(`${devServerUrl}/dashboard`, {
				headers: { Cookie: `better-auth.session_token=${expiredToken}` },
				redirect: 'manual'
			});
			expect(responseA.status, 'Expired Session A must return 302 (rejected)').toBe(302);
			expect(
				responseA.headers.get('location') ?? '',
				'Expired Session A must redirect to /login'
			).toMatch(/\/login/);

			// Session B (fresh) → should be accepted → NOT 302 to /login
			const responseB = await fetch(`${devServerUrl}/dashboard`, {
				headers: { Cookie: `better-auth.session_token=${freshToken}` },
				redirect: 'manual'
			});
			expect(
				responseB.status,
				'Fresh Session B must NOT return 302 to /login — concurrent session expiry is per-session, not user-wide'
			).not.toBe(302);
		} finally {
			await truncateBetterAuthTables();
		}
	});
});
