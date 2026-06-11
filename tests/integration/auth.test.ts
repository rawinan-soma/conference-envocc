/**
 * ATDD Red-Phase Scaffolds — Story 2.1: Sign in with Authentik (OIDC)
 * Integration Tests: Auth guard, session lifecycle, OIDC callback safety
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
 *   4. Implement the feature (per task in story 2.1).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: Unauthenticated (app) request → 302 to /login
 *   - AC-2: PKCE flow initiated via Better Auth
 *   - AC-3: OIDC callback → DB-backed session row created; available on event.locals
 *   - AC-4: Sign out destroys session; subsequent (app) request → 302 to login
 *   - AC-5: No (app) route reachable without valid session
 *   - AC-6: OIDC callback does not echo code/state params
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.1-INT-001: Unauthenticated request to any (app) route → 302 to /login [P0]
 *   - 2.1-INT-002: Logout destroys session; subsequent (app) request → 302 [P0]
 *   - 2.1-INT-003: OIDC callback does not echo code or state parameters [P1]
 *   - 2.1-INT-004: OIDC error callback (invalid state) → user-facing error, not 500 [P2]
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - drizzle-kit migrate has been run (including 0002_better_auth.sql)
 *   - Better Auth installed and configured in src/lib/server/auth/index.ts
 *   - SvelteKit dev server running on port 3000 (for HTTP-level guard tests)
 *   - AUTH_DEV_BYPASS=true is NOT required for these tests (they test unauthenticated paths)
 *
 * Note: Full OIDC round-trip (AC-2/AC-3 E2E flow) requires Story 2.2 dev bypass seam.
 *   Tests 2.1-INT-001 and 2.1-INT-002 test the guard layer (AC-1, AC-4, AC-5) which can
 *   be verified without a full OIDC provider. 2.1-INT-003 tests the callback route directly.
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

// ---------------------------------------------------------------------------
// 2.1-INT-001 — Unauthenticated (app) route → 302 to /login (AC-1, AC-5) [P0]
// ---------------------------------------------------------------------------

describe('Story 2.1 — Auth Guard: Unauthenticated Redirect (AC-1, AC-5)', () => {
	test.skip(
		'[P0] 2.1-INT-001 — Unauthenticated GET to (app) route redirects 302 to /login',
		async () => {
			// THIS TEST WILL FAIL — hooks.server.ts auth guard not yet implemented (Task 2.3).
			// Activate after Task 2.3 (handleAuthGuard in hooks.server.ts).
			//
			// AC-1: Given a configured Authentik OIDC provider, When I navigate to an (app) route
			//       unauthenticated, Then I am redirected to the login page (302 → /login).
			// AC-5: No (app) route is reachable without a valid session.
			//
			// Strategy: Send HTTP GET to /dashboard (an (app) route) with no session cookie.
			// Expect: 302 redirect to /login.
			// Do NOT follow redirects — assert the redirect response itself.

			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			// Fetch without following redirects — assert redirect is issued
			const response = await fetch(`${devServerUrl}/dashboard`, {
				redirect: 'manual' // Do NOT follow — assert the 302 directly
			});

			expect(
				response.status,
				'Unauthenticated GET to /dashboard must return 302 (not 200 or 404)'
			).toBe(302);

			const location = response.headers.get('location');
			expect(
				location,
				'302 redirect must point to /login (the Better Auth entry point)'
			).toMatch(/\/login/);
		}
	);

	test.skip(
		'[P0] 2.1-INT-001b — Unauthenticated GET to nested (app) route also redirects 302',
		async () => {
			// THIS TEST WILL FAIL — hooks.server.ts auth guard not yet implemented.
			// Verifies the guard covers nested routes, not just the root app route.
			//
			// AC-5: No (app) route is reachable without a valid session.

			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			const response = await fetch(`${devServerUrl}/bookings`, {
				redirect: 'manual'
			});

			expect(
				response.status,
				'Unauthenticated GET to /bookings must return 302'
			).toBe(302);

			const location = response.headers.get('location');
			expect(location, '302 redirect must point to /login').toMatch(/\/login/);
		}
	);

	test.skip(
		'[P1] 2.1-INT-001c — Public route /login is accessible without session (no redirect loop)',
		async () => {
			// THIS TEST WILL FAIL — login page not yet created (Task 3.3).
			// The /login route is explicitly allow-listed and must NOT redirect.
			//
			// Anti-pattern guard: if /login itself redirected to /login, every unauthenticated
			// user would be trapped in an infinite redirect loop.

			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			const response = await fetch(`${devServerUrl}/login`, {
				redirect: 'manual'
			});

			// Login page must return 200 (rendered) — not 302
			expect(response.status, '/login must return 200 for unauthenticated users').toBe(200);
		}
	);

	test.skip(
		'[P1] 2.1-INT-001d — Public route /auth/** is accessible without session (OIDC callback receiver)',
		async () => {
			// THIS TEST WILL FAIL — auth route not yet created (Task 3.1).
			// /auth/** is the Better Auth handler and must not be guarded.
			// Specifically /auth/sign-in/social must be reachable for the PKCE flow initiation.

			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			// /auth/sign-in/social — PKCE flow initiation; Better Auth handles routing
			// A GET with no valid params may return 400/422, but NOT 302 to login
			const response = await fetch(`${devServerUrl}/auth/sign-in/social`, {
				redirect: 'manual'
			});

			// Must NOT be a redirect to /login (that would break the auth flow)
			expect(
				response.status,
				'/auth/** must NOT redirect to /login — Better Auth handles this route'
			).not.toBe(302);
		}
	);
});

// ---------------------------------------------------------------------------
// 2.1-INT-002 — Logout destroys session; subsequent (app) request → 302 (AC-4) [P0]
// ---------------------------------------------------------------------------

describe('Story 2.1 — Session Lifecycle: Logout Destroys Session (AC-4)', () => {
	test.skip(
		'[P0] 2.1-INT-002 — POST /auth/sign-out destroys DB session row; subsequent (app) GET → 302',
		async () => {
			// THIS TEST WILL FAIL — Better Auth not yet installed; session tables not yet created.
			// Activate after Task 1.3 (auth schema) + Task 2.2 (hooks wired) + Task 3.1 (auth routes).
			// Depends on Story 2.2 dev bypass to seed an authenticated session.
			//
			// AC-4: Given a logged-in user, When I click "Sign out", Then the session row is
			//       destroyed and a subsequent request to any (app) route redirects to login.
			//
			// Strategy (requires Story 2.2 dev bypass for session seeding):
			//   1. Seed a session row directly in the DB (simulating a logged-in user)
			//   2. POST to /auth/sign-out with the session cookie
			//   3. Assert the session row is deleted from the DB
			//   4. GET an (app) route with the now-invalid cookie → assert 302 to /login
			//
			// NOTE: Full activation requires Story 2.2 dev bypass. Mark conditional until merged.

			await truncateBetterAuthTables();

			const client = await pool.connect();
			try {
				// Pre-condition: verify sessions table exists (requires Task 1.3 migration)
				const tableCheck = await client.query<{ exists: boolean }>(
					`SELECT EXISTS (
						SELECT 1 FROM information_schema.tables
						WHERE table_schema = 'public' AND table_name = 'sessions'
					) AS exists`
				);
				expect(
					tableCheck.rows[0]?.exists,
					'sessions table must exist — run migration 0002_better_auth.sql'
				).toBe(true);

				// Seed a test user
				const userId = 'test-user-2-1-int-002';
				await client.query(
					`INSERT INTO users (id, email, "emailVerified", "createdAt", "updatedAt")
					 VALUES ($1, $2, false, NOW(), NOW())
					 ON CONFLICT (id) DO NOTHING`,
					[userId, 'test-2-1-int-002@example.com']
				);

				// Seed a test session row (simulating Better Auth session)
				const sessionToken = 'test-session-token-2-1-int-002';
				const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
				await client.query(
					`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
					 VALUES ($1, $2, $3, $4, NOW(), NOW())
					 ON CONFLICT (id) DO NOTHING`,
					[`session-${userId}`, sessionToken, userId, expiresAt]
				);

				// Verify session exists before logout
				const sessionBefore = await client.query(
					`SELECT id FROM sessions WHERE token = $1`,
					[sessionToken]
				);
				expect(
					sessionBefore.rowCount,
					'Session row must exist before sign-out'
				).toBeGreaterThan(0);

				// POST /auth/sign-out with session cookie
				const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';
				const signOutResponse = await fetch(`${devServerUrl}/auth/sign-out`, {
					method: 'POST',
					headers: {
						Cookie: `better-auth.session_token=${sessionToken}`,
						'Content-Type': 'application/json'
					},
					redirect: 'manual'
				});

				// Better Auth sign-out should succeed (2xx or 3xx to home/login)
				expect(
					signOutResponse.status,
					'Sign-out response must not be 5xx'
				).toBeLessThan(500);

				// Verify session row is destroyed in DB
				const sessionAfter = await client.query(
					`SELECT id FROM sessions WHERE token = $1`,
					[sessionToken]
				);
				expect(
					sessionAfter.rowCount,
					'Session row must be deleted after sign-out'
				).toBe(0);

				// Subsequent (app) GET with the old cookie must redirect to /login
				const appResponse = await fetch(`${devServerUrl}/dashboard`, {
					headers: {
						Cookie: `better-auth.session_token=${sessionToken}` // expired/deleted token
					},
					redirect: 'manual'
				});

				expect(
					appResponse.status,
					'Subsequent (app) GET with deleted session must return 302'
				).toBe(302);

				const location = appResponse.headers.get('location');
				expect(location, '302 must redirect to /login').toMatch(/\/login/);
			} finally {
				client.release();
				await truncateBetterAuthTables();
			}
		}
	);
});

// ---------------------------------------------------------------------------
// 2.1-INT-003 — OIDC callback does not echo code/state params (AC-6) [P1]
// ---------------------------------------------------------------------------

describe('Story 2.1 — OIDC Callback Safety: No code/state Leak (AC-6)', () => {
	test.skip(
		'[P1] 2.1-INT-003 — OIDC callback response does not echo code or state parameters',
		async () => {
			// THIS TEST WILL FAIL — auth route not yet created (Task 3.1).
			// Activate after Task 3.1 (auth/[...all]/+server.ts) + Better Auth configured.
			//
			// AC-6: Given the OIDC callback, When the response is returned, Then the code and
			//       state OAuth parameters are not echoed in the response body or redirect URL.
			//
			// Risk R-007: OIDC callback handling exposes authorization code or state token via
			//             URL logs or error pages.
			//
			// Strategy:
			//   1. Send a GET to the OIDC callback URL with fake code and state params
			//   2. Better Auth will reject the invalid params (state mismatch)
			//   3. Assert the response body does NOT contain the literal "code=" or "state=" values
			//   4. Assert any redirect URL does NOT contain the code or state values
			//
			// Note: The fake code/state will cause Better Auth to return an error response.
			// We are testing that the error response does not leak the params — not that the
			// flow succeeds with invalid params.

			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			const fakeCode = 'FAKE_OIDC_CODE_MUST_NOT_APPEAR_IN_RESPONSE_abc123';
			const fakeState = 'FAKE_OIDC_STATE_MUST_NOT_APPEAR_IN_RESPONSE_xyz789';

			// Better Auth OIDC callback URL (Generic OAuth / SSO plugin pattern)
			const callbackUrl = `${devServerUrl}/auth/callback/authentik?code=${fakeCode}&state=${fakeState}`;

			const response = await fetch(callbackUrl, {
				redirect: 'manual'
			});

			// The response status should be 4xx (error) or 3xx (redirect) — not 5xx (server crash)
			expect(
				response.status,
				'OIDC callback with invalid params must not return 5xx'
			).toBeLessThan(500);

			// Assert code param is NOT echoed in response body
			const responseBody = await response.text().catch(() => '');
			expect(
				responseBody,
				'Response body must not echo the OIDC authorization code parameter'
			).not.toContain(fakeCode);

			// Assert state param is NOT echoed in response body
			expect(
				responseBody,
				'Response body must not echo the OIDC state parameter'
			).not.toContain(fakeState);

			// Assert redirect URL (if any) does NOT contain code or state
			const locationHeader = response.headers.get('location') ?? '';
			expect(
				locationHeader,
				'Redirect Location header must not contain the OIDC code parameter'
			).not.toContain(fakeCode);
			expect(
				locationHeader,
				'Redirect Location header must not contain the OIDC state parameter'
			).not.toContain(fakeState);
		}
	);
});

// ---------------------------------------------------------------------------
// 2.1-INT-004 — OIDC error callback (invalid state) → user-facing error, not 500 [P2]
// ---------------------------------------------------------------------------

describe('Story 2.1 — OIDC Error Handling: Invalid State (AC-6, UX)', () => {
	test.skip(
		'[P2] 2.1-INT-004 — OIDC callback with invalid state returns user-facing error, not 500',
		async () => {
			// THIS TEST WILL FAIL — auth route not yet created (Task 3.1).
			// Activate after Task 3.1 + Better Auth error handling confirmed.
			//
			// Strategy: Send OIDC callback with invalid state → assert not 500.
			// Better Auth should return a redirect to /login with an error param or render an
			// error page — either is acceptable; a 500 server error is NOT acceptable.

			const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

			const callbackUrl = `${devServerUrl}/auth/callback/authentik?code=invalid&state=invalid_state_that_does_not_match`;

			const response = await fetch(callbackUrl, {
				redirect: 'manual'
			});

			// Must NOT be 500 (Internal Server Error)
			expect(
				response.status,
				'OIDC callback with invalid state must not return 500 — must render user-facing error'
			).not.toBe(500);

			// Must be 4xx (Bad Request / Unauthorized) or 3xx (redirect to error page / login)
			expect(
				response.status,
				'OIDC callback with invalid state must return 4xx or 3xx'
			).toBeLessThan(500);
		}
	);
});

// ---------------------------------------------------------------------------
// 2.1-UNIT-001 — Auth config static assertion: session.expiresIn === 1800 (FR-093) [P1]
// ---------------------------------------------------------------------------

describe('Story 2.1 — Auth Config: Fixed Session Timeout (FR-093)', () => {
	test.skip(
		'[P1] 2.1-UNIT-001 — Better Auth config has session.expiresIn fixed at 1800 seconds (30 min)',
		async () => {
			// THIS TEST WILL FAIL — src/lib/server/auth/index.ts not yet created (Task 1.4).
			// Activate after Task 1.4 (auth/index.ts with Better Auth config).
			//
			// FR-093: Fixed 30-min session timeout — NEVER configurable.
			// Architecture: "fixed 30-min default (not configurable)" — hard-code expiresIn: 1800.
			//
			// Strategy: Import the auth config and assert the session.expiresIn value.
			// This is a static assertion — no Postgres required.
			//
			// NOTE: This test is in auth.test.ts (integration project) because it imports server
			// modules that require DATABASE_URL. Move to unit project if Better Auth config can be
			// loaded without a live DB connection.

			// Dynamic import to defer until test activation (module may not exist yet)
			// The auth module exports the Better Auth instance; we inspect its internal config.
			// Better Auth exposes options via `auth.options` (verify against installed version).
			const { auth } = await import('../../src/lib/server/auth/index.js');

			// @ts-expect-error — accessing internal options; verify property path against Better Auth version
			const sessionConfig = auth.options?.session ?? auth.$context?.options?.session;

			expect(
				sessionConfig,
				'auth.options.session must be defined — verify Better Auth config in src/lib/server/auth/index.ts'
			).toBeDefined();

			expect(
				sessionConfig.expiresIn,
				'session.expiresIn must be exactly 1800 seconds (30 min) — FR-093 fixed timeout'
			).toBe(1800);
		}
	);
});
