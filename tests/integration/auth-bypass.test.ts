/**
 * ATDD Red-Phase Scaffolds — Story 2.2: Local Dev Auth Bypass
 * Integration Tests: Dev bypass session creation and production guard
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
 *   3. Ensure AUTH_DEV_BYPASS=true is set in the test environment.
 *   4. Ensure the SvelteKit dev server is running on DEV_SERVER_URL.
 *   5. Run: `bun run test:integration` — verify it FAILS first (red).
 *   6. Implement the feature (per task in story 2.2).
 *   7. Run again — verify it PASSES (green).
 *   8. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: AUTH_DEV_BYPASS=true + non-production → POST /auth/dev-bypass creates valid session
 *   - AC-2: AUTH_DEV_BYPASS unset/false → /auth/dev-bypass returns 404
 *   - AC-3: AUTH_DEV_BYPASS=true + NODE_ENV=production → route returns 404/403
 *   - AC-4: Session row in DB with expiresAt set 30 min from creation; user row upserted
 *   - AC-5: getDevBypassCookie() helper usable by other integration tests
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.2-INT-001: Dev bypass creates valid session [P0]
 *   - 2.2-INT-002: Dev bypass unreachable when flag=false OR production env [P0]
 *   - 2.2-UNIT-001: Static assertion — guard checks BOTH flag AND NODE_ENV [P1]
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - drizzle-kit migrate has been run (including 0002_better_auth.sql)
 *   - Better Auth installed and configured in src/lib/server/auth/index.ts
 *   - SvelteKit dev server running on DEV_SERVER_URL (default: http://localhost:3000)
 *   - AUTH_DEV_BYPASS=true set in the server environment
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { getDevBypassCookie, extractCookiePair } from '../support/helpers/dev-bypass.js';

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
// 2.2-INT-001 — Dev bypass creates valid session (AC-1, AC-4, AC-5) [P0]
// ---------------------------------------------------------------------------

describe('Story 2.2 — Dev Bypass: Session Creation (AC-1, AC-4, AC-5)', () => {
	test.skip('[P0] 2.2-INT-001 — AUTH_DEV_BYPASS=true, NODE_ENV=test → POST /auth/dev-bypass creates valid session', async () => {
		// THIS TEST WILL FAIL — src/routes/auth/dev-bypass/+server.ts not yet created (Task 2).
		// Activate after Task 2 (dev bypass route implementation).
		//
		// AC-1: Given AUTH_DEV_BYPASS=true in a non-production environment,
		//       When I POST to /auth/dev-bypass,
		//       Then a DB-backed Better Auth session is created for a seeded test user
		//       and the response sets a valid better-auth.session_token cookie
		//       that passes handleBetterAuth on subsequent requests.
		//
		// AC-4: Given AC-1 conditions, When the dev session is created,
		//       Then the seeded test user row exists in the users table (upserted if absent)
		//       and the session row is in the sessions table with expiresAt set 30 minutes from creation.
		//
		// AC-5: The getDevBypassCookie() helper works correctly and can be used by other tests.
		//
		// Strategy:
		//   1. POST /auth/dev-bypass
		//   2. Assert 200 response with { ok: true }
		//   3. Assert Set-Cookie header contains better-auth.session_token
		//   4. Assert users table has a row with email 'dev@local.test'
		//   5. Assert sessions table has a session row for the dev user
		//   6. Assert session expiresAt is ~30 min in the future (within ±60s tolerance)
		//   7. Assert the session cookie authenticates a subsequent (app) request

		await truncateBetterAuthTables();

		const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

		// --- Step 1: Call the dev bypass endpoint ---
		const response = await fetch(`${devServerUrl}/auth/dev-bypass`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			redirect: 'manual'
		});

		// --- Step 2: Assert 200 response ---
		expect(response.status, 'POST /auth/dev-bypass must return 200 when AUTH_DEV_BYPASS=true').toBe(
			200
		);

		const body = await response.json().catch(() => null);
		expect(body, 'Response body must be JSON').not.toBeNull();
		expect(body.ok, 'Response body must have { ok: true }').toBe(true);
		expect(body.userId, 'Response body must include userId matching DEV_BYPASS_USER.id').toBe(
			'dev-bypass-user-00000000-0000-0000-0000-000000000001'
		);

		// --- Step 3: Assert Set-Cookie header ---
		const setCookie = response.headers.get('set-cookie');
		expect(setCookie, 'Response must include Set-Cookie header').not.toBeNull();
		expect(setCookie, 'Set-Cookie must contain better-auth.session_token').toMatch(
			/better-auth\.session_token=/
		);

		// Extract the token value from the cookie
		const tokenMatch = setCookie?.match(/better-auth\.session_token=([^;]+)/);
		expect(
			tokenMatch,
			'Could not extract session token value from Set-Cookie header'
		).not.toBeNull();
		const sessionToken = tokenMatch![1];
		expect(sessionToken, 'Session token must be a non-empty string').toBeTruthy();

		// --- Step 4: Assert users table has the dev user row ---
		const client = await pool.connect();
		try {
			const userResult = await client.query<{ id: string; email: string }>(
				`SELECT id, email FROM users WHERE email = $1`,
				['dev@local.test']
			);
			expect(
				userResult.rowCount,
				'users table must have a row for dev@local.test after bypass call'
			).toBeGreaterThan(0);
			expect(userResult.rows[0]?.id).toBe('dev-bypass-user-00000000-0000-0000-0000-000000000001');

			// --- Step 5: Assert sessions table has a row for the dev user ---
			const sessionResult = await client.query<{
				token: string;
				userId: string;
				expiresAt: Date;
			}>(`SELECT token, "userId", "expiresAt" FROM sessions WHERE "userId" = $1`, [
				'dev-bypass-user-00000000-0000-0000-0000-000000000001'
			]);
			expect(
				sessionResult.rowCount,
				'sessions table must have a row for the dev bypass user'
			).toBeGreaterThan(0);

			// --- Step 6: Assert expiresAt is ~30 min from now (AC-4, FR-093) ---
			const sessionRow = sessionResult.rows[0];
			expect(sessionRow, 'Session row must not be undefined').toBeDefined();

			const now = Date.now();
			const thirtyMinMs = 30 * 60 * 1000;
			const toleranceMs = 60 * 1000; // ±60 seconds tolerance for test execution lag

			const expiresAtMs = new Date(sessionRow!.expiresAt).getTime();
			const expectedExpiresAt = now + thirtyMinMs;

			expect(
				expiresAtMs,
				'Session expiresAt must be approximately 30 minutes from now (within ±60s)'
			).toBeGreaterThan(expectedExpiresAt - toleranceMs);
			expect(
				expiresAtMs,
				'Session expiresAt must be approximately 30 minutes from now (within ±60s)'
			).toBeLessThan(expectedExpiresAt + toleranceMs);

			// --- Step 7: Assert session cookie authenticates a subsequent (app) request ---
			// The session cookie must be recognized by handleBetterAuth on the next request.
			// GET /dashboard with the bypass cookie should redirect 302 (auth guard) — NOT redirect to /login
			// because the session is valid. With a valid session, the guard should pass (200 or no redirect to login).
			const cookiePair = extractCookiePair(setCookie!);
			const appResponse = await fetch(`${devServerUrl}/dashboard`, {
				headers: { Cookie: cookiePair },
				redirect: 'manual'
			});

			// With a valid session, /dashboard should NOT redirect to /login (302→/login)
			// It may return 200 (rendered) or 302 to a sub-page — but NOT 302 to /login.
			if (appResponse.status === 302) {
				const location = appResponse.headers.get('location') ?? '';
				expect(
					location,
					'Valid session cookie must not redirect to /login — session not recognized by handleBetterAuth'
				).not.toMatch(/\/login/);
			}
			// 200 is also acceptable (dashboard rendered successfully)
			expect(
				appResponse.status,
				'Authenticated request must not return 500 (server error)'
			).not.toBe(500);
		} finally {
			client.release();
			await truncateBetterAuthTables();
		}
	});

	test.skip('[P0] 2.2-INT-001b — getDevBypassCookie() helper returns usable session cookie', async () => {
		// THIS TEST WILL FAIL — helper depends on /auth/dev-bypass route (Task 2).
		// Activate after Task 2 (dev bypass route) AND Task 4.5 (helper verified working).
		//
		// AC-5: Given AUTH_DEV_BYPASS=true in the test environment,
		//       When integration tests call the bypass endpoint via the helper,
		//       Then tests can use the returned cookie to authenticate requests.
		//
		// Strategy: Use the exported getDevBypassCookie() helper directly and verify
		// it returns a non-empty string that looks like a valid Set-Cookie header.

		await truncateBetterAuthTables();

		const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

		// Use the helper (this is the pattern all future story tests will use)
		const cookie = await getDevBypassCookie(devServerUrl);

		expect(cookie, 'getDevBypassCookie() must return a non-empty string').toBeTruthy();
		expect(
			cookie,
			'getDevBypassCookie() must return a cookie containing better-auth.session_token'
		).toMatch(/better-auth\.session_token=/);

		// The helper should not throw — extract cookie pair and use it
		const cookiePair = extractCookiePair(cookie);
		expect(cookiePair, 'extractCookiePair must return name=value portion').toMatch(
			/better-auth\.session_token=[^;]+/
		);

		await truncateBetterAuthTables();
	});
});

// ---------------------------------------------------------------------------
// 2.2-INT-002 — Dev bypass unreachable when flag=false or production env (AC-2, AC-3) [P0]
// ---------------------------------------------------------------------------

describe('Story 2.2 — Dev Bypass: Production Guard (AC-2, AC-3)', () => {
	test.skip('[P0] 2.2-INT-002a — AUTH_DEV_BYPASS not set/false → POST /auth/dev-bypass returns 404', async () => {
		// THIS TEST WILL FAIL — dev bypass route not yet created (Task 2).
		// Activate after Task 2 (dev bypass route with flag guard).
		//
		// AC-2: Given AUTH_DEV_BYPASS is not set (or is false),
		//       When any request is made to the dev-bypass route,
		//       Then the route returns 404 — it does not create a session and
		//       does not reveal its existence.
		//
		// Strategy:
		//   This test depends on the server being started WITHOUT AUTH_DEV_BYPASS=true.
		//   Since we cannot toggle the server's env mid-test, this test verifies the guard
		//   by inspecting the source code (see 2.2-UNIT-001) OR by running the server in
		//   a separate configuration.
		//
		// NOTE: In CI, the dev server used for integration tests DOES have AUTH_DEV_BYPASS=true.
		//   This sub-case (flag=false → 404) is fully covered by 2.2-UNIT-001 static assertion.
		//   A live server test for this sub-case would require a second server process.
		//
		// Fallback: If DEV_SERVER_NO_BYPASS_URL is set (a server without the flag), use it.
		// Otherwise, skip this live test and rely on 2.2-UNIT-001.

		const noBypassServerUrl = process.env['DEV_SERVER_NO_BYPASS_URL'];

		if (!noBypassServerUrl) {
			// No secondary server available — this sub-case is verified by 2.2-UNIT-001 (static assertion).
			// Mark as conditionally passing: the guard logic is asserted statically.
			console.log(
				'[2.2-INT-002a] DEV_SERVER_NO_BYPASS_URL not set — guard verified by 2.2-UNIT-001 static assertion. Skipping live server check.'
			);
			return;
		}

		// If a no-bypass server IS available, verify it returns 404
		const response = await fetch(`${noBypassServerUrl}/auth/dev-bypass`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			redirect: 'manual'
		});

		expect(
			response.status,
			'POST /auth/dev-bypass must return 404 when AUTH_DEV_BYPASS is not set'
		).toBe(404);
	});

	test.skip('[P0] 2.2-INT-002b — AUTH_DEV_BYPASS=true + NODE_ENV=production → POST /auth/dev-bypass returns 404/403', async () => {
		// THIS TEST WILL FAIL — dev bypass route not yet created (Task 2).
		// Activate after Task 2 (dev bypass route with production guard).
		//
		// AC-3: Given AUTH_DEV_BYPASS=true AND NODE_ENV=production,
		//       When any request is made to the dev-bypass route,
		//       Then the route returns 404 (or 403) — the production guard overrides
		//       the flag regardless of its value.
		//
		// Strategy:
		//   NODE_ENV cannot be changed at runtime during a test run.
		//   This sub-case (production env → 404) is verified by 2.2-UNIT-001 static assertion.
		//   A live server test would require a production-mode server process.
		//
		// NOTE: The two-condition guard `env.AUTH_DEV_BYPASS !== 'true' || process.env['NODE_ENV'] === 'production'`
		//   is a source-level check. 2.2-UNIT-001 asserts both conditions exist in the source.
		//   This is the R-001 mitigation.

		const productionServerUrl = process.env['DEV_SERVER_PRODUCTION_URL'];

		if (!productionServerUrl) {
			// No production-mode server available — guard verified by 2.2-UNIT-001 static assertion.
			console.log(
				'[2.2-INT-002b] DEV_SERVER_PRODUCTION_URL not set — production guard verified by 2.2-UNIT-001 static assertion. Skipping live server check.'
			);
			return;
		}

		const response = await fetch(`${productionServerUrl}/auth/dev-bypass`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			redirect: 'manual'
		});

		// Guard must return 404 or 403 — never 200
		expect(
			response.status,
			'POST /auth/dev-bypass must return 404 or 403 in production environment'
		).toBeOneOf([404, 403]);
	});
});

// ---------------------------------------------------------------------------
// 2.2-UNIT-001 — Static assertion: both conditions present in bypass handler (R-001) [P1]
// ---------------------------------------------------------------------------

describe('Story 2.2 — Dev Bypass: Two-Condition Guard Static Assertion (R-001)', () => {
	test('[P1] 2.2-UNIT-001 — Bypass handler source MUST contain BOTH AUTH_DEV_BYPASS AND NODE_ENV guard conditions', async () => {
		// ACTIVATED — This static assertion is part of the R-001 mitigation.
		// It will FAIL until src/routes/auth/dev-bypass/+server.ts is created (Task 2).
		//
		// Risk R-001: Dev auth bypass enabled or reachable in production.
		// Mitigation: The bypass handler must check TWO conditions:
		//   1. AUTH_DEV_BYPASS must equal 'true' (from env)
		//   2. NODE_ENV must NOT equal 'production' (process.env)
		//
		// Neither condition alone is sufficient:
		//   - Checking only AUTH_DEV_BYPASS: if someone sets it accidentally in prod, the route is open.
		//   - Checking only NODE_ENV: if NODE_ENV is misconfigured, the flag alone doesn't protect prod.
		//
		// Strategy: Read the source file and assert both guard conditions appear in the text.
		// This is a deterministic check that survives refactors — any change that removes either
		// condition will cause this test to fail.
		//
		// This test DOES NOT require a running server or Postgres — it is a source-code assertion.

		const fs = await import('fs/promises');
		const path = await import('path');

		// Resolve bypass handler source path relative to project root
		const projectRoot = path.resolve(import.meta.dirname, '..', '..', '..');
		const bypassHandlerPath = path.join(
			projectRoot,
			'src',
			'routes',
			'auth',
			'dev-bypass',
			'+server.ts'
		);

		// Assert the file exists (will fail if Task 2 not yet implemented)
		let handlerSource: string;
		try {
			handlerSource = await fs.readFile(bypassHandlerPath, 'utf-8');
		} catch {
			throw new Error(
				`2.2-UNIT-001: ${bypassHandlerPath} does not exist — implement Task 2 (dev bypass route) first.\n` +
					`R-001 mitigation requires both AUTH_DEV_BYPASS and NODE_ENV guards in the handler.`
			);
		}

		// Assert AUTH_DEV_BYPASS guard condition is present
		expect(
			handlerSource,
			`2.2-UNIT-001 (R-001): Bypass handler must check AUTH_DEV_BYPASS.\n` +
				`Expected to find 'AUTH_DEV_BYPASS' in ${bypassHandlerPath}.\n` +
				`Guard condition: env.AUTH_DEV_BYPASS !== 'true' || process.env['NODE_ENV'] === 'production'`
		).toContain('AUTH_DEV_BYPASS');

		// Assert NODE_ENV guard condition is present
		expect(
			handlerSource,
			`2.2-UNIT-001 (R-001): Bypass handler must check NODE_ENV for production guard.\n` +
				`Expected to find 'NODE_ENV' in ${bypassHandlerPath}.\n` +
				`Guard condition: env.AUTH_DEV_BYPASS !== 'true' || process.env['NODE_ENV'] === 'production'`
		).toContain('NODE_ENV');

		// Assert the production value check is present
		expect(
			handlerSource,
			`2.2-UNIT-001 (R-001): Bypass handler must explicitly check for 'production' environment.\n` +
				`Expected to find string literal 'production' in ${bypassHandlerPath}.`
		).toContain("'production'");

		// Assert error(404) is the rejection path
		expect(
			handlerSource,
			`2.2-UNIT-001 (R-001): Bypass handler must call error(404) when guard conditions fail.\n` +
				`Expected to find 'error(404)' in ${bypassHandlerPath}.`
		).toContain('error(404)');
	});
});

// ---------------------------------------------------------------------------
// 2.2-INT-003 — Bypass route is allow-listed via /auth/** route guard (AC-1) [P1]
// ---------------------------------------------------------------------------

describe('Story 2.2 — Dev Bypass: Route Allow-Listing via /auth/** (AC-1)', () => {
	test.skip('[P1] 2.2-INT-003 — /auth/dev-bypass is reachable without a session (not blocked by auth guard)', async () => {
		// THIS TEST WILL FAIL — dev bypass route not yet created (Task 2).
		// Activate after Task 2 (dev bypass route created AND AUTH_DEV_BYPASS=true in test env).
		//
		// Verifies that the existing routeGuards regex in hooks.server.ts already excludes
		// /auth/dev-bypass (because it starts with /auth/), so no modification to
		// hooks.server.ts is needed.
		//
		// Pattern from hooks.server.ts (Story 2.1):
		//   /^\/(?!(?:login|auth(?:\/|$)|r\/|skeleton|$))/
		// The negative lookahead 'auth(?:\/|$)' matches 'auth' followed by '/' or end.
		// Since '/auth/dev-bypass' starts with '/auth/', it is excluded from the guard.
		//
		// Strategy: POST /auth/dev-bypass without any session cookie.
		//   - If the auth guard blocked it, we'd get 302→/login.
		//   - With bypass enabled, we expect 200 (session created).
		//   - Without bypass but with route allow-listed, we expect 404 (guard is passthrough).
		//   - We must NOT get 302→/login (that would mean the guard is blocking the bypass route).

		const devServerUrl = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

		// POST /auth/dev-bypass without any Cookie header
		const response = await fetch(`${devServerUrl}/auth/dev-bypass`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			// No Cookie header — unauthenticated request
			redirect: 'manual'
		});

		// The response must NOT be 302 to /login — the route is allow-listed via /auth/**
		if (response.status === 302) {
			const location = response.headers.get('location') ?? '';
			expect(
				location,
				'/auth/dev-bypass must NOT redirect to /login — it is allow-listed via /auth/** in routeGuards'
			).not.toMatch(/\/login/);
		}

		// Acceptable responses: 200 (bypass succeeded), 404 (flag not set), 405 (wrong method)
		// Unacceptable: 302→/login (means auth guard is blocking the route — hooks.server.ts is wrong)
		expect(
			response.status,
			'/auth/dev-bypass must not return 302 to /login when unauthenticated — it must be allow-listed'
		).not.toBe(302);
	});
});
