/**
 * ATDD Red-Phase Scaffolds — Story 2.3: Self-service Profile
 * Integration Tests: Profile gate, profile form, email immutability, audit log
 *
 * TDD RED PHASE: All tests are marked test() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * These tests run in the Vitest `integration` project which requires a real
 * PostgreSQL instance. The global setup (tests/support/integration-setup.ts)
 * starts Testcontainers when DATABASE_URL is not set, or uses the CI Postgres
 * service when DATABASE_URL is already provided.
 *
 * Activation guide:
 *   1. Remove `test(` → `test(` for the current task's test(s).
 *   2. Ensure Postgres is running (via Testcontainers or CI service).
 *   3. Run: `bun run test:integration` — verify it FAILS first (red).
 *   4. Implement the feature (per task in story 2.3).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: Authenticated user with incomplete profile redirected to /profile/complete
 *   - AC-2: Form pre-fills read-only email from OIDC; other fields empty/editable
 *   - AC-3: Valid form submission creates user_profiles row; redirect to dashboard
 *   - AC-4: Already-completed profile → redirect to dashboard from /profile/complete
 *   - AC-5: Missing required field → 422 with field-level errors; no row created
 *   - AC-6: Profile edit allows updating mutable fields; email stays read-only
 *   - AC-7: POST body email override is silently ignored; stored email unchanged
 *   - AC-8: Audit log row written atomically on profile create and update
 *   - AC-9: Incomplete profile cannot reach /bookings, /dashboard, /calendar
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.3-INT-001: Incomplete-profile user GETs /dashboard → 302 to /profile/complete [P0]
 *   - 2.3-INT-002: Valid profile form POST → profile row created; GET /dashboard → 200 [P0]
 *   - 2.3-INT-003: Profile form POST with firstName empty → 422 + error payload [P0]
 *   - 2.3-INT-004: Profile form POST with email override → stored email unchanged [P0]
 *   - 2.3-INT-005: Profile edit POST saves updated fields; email remains immutable [P1]
 *   - 2.7-INT-002: Profile creation → audit_log row written (entity, actor, action, diff) [P1]
 *   - 2.7-INT-003: Profile update → audit_log row with correct diff [P1]
 *   - 2.7-INT-004: Rolled-back profile update → no audit_log row written [P1]
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - Story 2.1 merged: Better Auth session management in place (auth.ts, hooks.server.ts)
 *   - Story 2.2 merged: AUTH_DEV_BYPASS=true seam available for test session creation
 *   - Dev server running on port 3000 (DEV_SERVER_URL env var, default http://localhost:3000)
 *   - drizzle-kit migrate applied (includes 0001, 0002_better_auth, 0003_user_profiles)
 *   - profile-service.ts created with createProfile / updateProfile / getProfileByUserId
 *   - hooks.server.ts extended: event.locals.profileComplete populated; routeGuards extended
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   All profile form labels, errors, and placeholders must flow through Paraglide (m.* keys).
 *
 * Note: Tests use the dev-bypass session seeding pattern established in Story 2.1
 *   (see tests/integration/auth.test.ts). AUTH_DEV_BYPASS=true must be set in test env.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { createHmac } from 'node:crypto';
import { randomUUID } from 'node:crypto';

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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Truncates tables that participate in profile integration tests.
 * Order: user_profiles (child) → sessions, accounts, verifications, users → audit_log.
 * CASCADE handles any remaining FK dependencies.
 */
async function truncateProfileTables(): Promise<void> {
	const client = await pool.connect();
	try {
		for (const table of [
			'user_profiles',
			'sessions',
			'accounts',
			'verifications',
			'users',
			'audit_log'
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

/**
 * Seeds a test user (Better Auth user row) and returns the userId.
 * The user has NO associated user_profiles row — simulating a first-time login.
 */
async function seedIncompleteProfileUser(
	client: pg.PoolClient,
	opts: { userId?: string; email?: string } = {}
): Promise<{ userId: string; email: string }> {
	const userId = opts.userId ?? `test-user-2-3-${randomUUID().slice(0, 8)}`;
	const email = opts.email ?? `test-2.3-${randomUUID().slice(0, 8)}@example.com`;

	await client.query(
		`INSERT INTO users (id, email, "createdAt", "updatedAt")
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
		[userId, email]
	);

	return { userId, email };
}

/**
 * Inserts a Better Auth session for the given user.
 * Returns:
 *   - sessionToken: the raw token stored in the sessions table
 *   - sessionCookie: the full signed "Cookie: better-auth.session_token=..." header value
 *     ready for use in fetch() headers. Better Auth requires HMAC-signed cookies.
 */
async function seedUserSession(
	client: pg.PoolClient,
	userId: string
): Promise<{ sessionToken: string; sessionCookie: string }> {
	const sessionToken = `test-session-2.3-${randomUUID().slice(0, 8)}`;
	const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

	await client.query(
		`INSERT INTO sessions (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
		[`session-id-${userId}`, sessionToken, userId, expiresAt]
	);

	// Build the signed cookie that Better Auth's getSignedCookie() will accept.
	const sessionCookie = buildSignedSessionCookie(sessionToken);
	return { sessionToken, sessionCookie };
}

/**
 * Seeds a user with a completed profile row.
 */
async function seedCompletedProfileUser(
	client: pg.PoolClient,
	opts: { userId?: string; email?: string } = {}
): Promise<{ userId: string; email: string; profileId: string }> {
	const { userId, email } = await seedIncompleteProfileUser(client, opts);
	const profileId = `profile-id-${userId}`;

	await client.query(
		`INSERT INTO user_profiles (id, "userId", email, title, "firstName", "lastName", phone, organization, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT ("userId") DO NOTHING`,
		[profileId, userId, email, 'Mr.', 'Test', 'User', '+1234567890', 'Test Org']
	);

	return { userId, email, profileId };
}

const DEV_SERVER_URL = process.env['DEV_SERVER_URL'] ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// 2.3-INT-001 — Profile gate: incomplete profile → redirect to /profile/complete [P0]
// ---------------------------------------------------------------------------

describe('Story 2.3 — Profile Gate: Incomplete Profile Redirects to /profile/complete (AC-1, AC-9)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P0] 2.3-INT-001 — GET /dashboard with authenticated-but-incomplete-profile session → 302 to /profile/complete', async () => {
		// THIS TEST WILL FAIL — profile gate guard not yet implemented (Task 4).
		// Activate after Task 4 (hooks.server.ts routeGuards extension for profile gate).
		//
		// AC-1: Given a first-time authenticated user with an incomplete profile,
		//       When they navigate to any (app) route,
		//       Then they are redirected to /profile/complete (302).
		//
		// AC-9: Incomplete profile cannot reach /bookings, /dashboard, /calendar, etc.
		//
		// Risk R-005: Profile gate bypass — user skips /profile/complete and reaches main app.
		//
		// Strategy:
		//   1. Seed a user with NO user_profiles row (incomplete profile).
		//   2. Seed a valid session for that user.
		//   3. GET /dashboard with the session cookie.
		//   4. Assert 302 redirect to /profile/complete.
		//   5. Also verify /bookings and /calendar redirect similarly (AC-9).

		const client = await pool.connect();
		try {
			const { userId } = await seedIncompleteProfileUser(client);
			const { sessionCookie } = await seedUserSession(client, userId);

			// Attempt to access /dashboard — must redirect to /profile/complete
			const dashboardResponse = await fetch(`${DEV_SERVER_URL}/dashboard`, {
				headers: { Cookie: sessionCookie },
				redirect: 'manual'
			});

			expect(
				dashboardResponse.status,
				'GET /dashboard with incomplete-profile session must return 302'
			).toBe(302);

			const locationDashboard = dashboardResponse.headers.get('location');
			expect(locationDashboard, '302 redirect must point to /profile/complete').toMatch(
				/\/profile\/complete/
			);

			// AC-9: Also verify /bookings redirects
			const bookingsResponse = await fetch(`${DEV_SERVER_URL}/bookings`, {
				headers: { Cookie: sessionCookie },
				redirect: 'manual'
			});

			expect(
				bookingsResponse.status,
				'GET /bookings with incomplete-profile session must return 302'
			).toBe(302);

			const locationBookings = bookingsResponse.headers.get('location');
			expect(
				locationBookings,
				'302 redirect from /bookings must point to /profile/complete'
			).toMatch(/\/profile\/complete/);
		} finally {
			client.release();
		}
	});

	test('[P0] 2.3-INT-001b — Authenticated user with COMPLETED profile can access /dashboard (gate is satisfied)', async () => {
		// THIS TEST WILL FAIL — profile gate guard not yet implemented (Task 4).
		// Activate after Tasks 3 and 4.
		//
		// AC-4: Given a user who has already completed their profile,
		//       When they navigate to any (app) route,
		//       Then they are NOT redirected to /profile/complete.

		const client = await pool.connect();
		try {
			const { userId } = await seedCompletedProfileUser(client);
			const { sessionCookie } = await seedUserSession(client, userId);

			const dashboardResponse = await fetch(`${DEV_SERVER_URL}/dashboard`, {
				headers: { Cookie: sessionCookie },
				redirect: 'manual'
			});

			// Must NOT redirect to /profile/complete (gate satisfied)
			// Should be 200 or redirect to login — but NOT /profile/complete
			const location = dashboardResponse.headers.get('location') ?? '';
			expect(
				location,
				'Completed-profile user must not be redirected to /profile/complete'
			).not.toMatch(/\/profile\/complete/);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.3-INT-002 — Valid profile form POST → profile row created; dashboard accessible [P0]
// ---------------------------------------------------------------------------

describe('Story 2.3 — Profile Form: Valid Submission Creates Profile (AC-3)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P0] 2.3-INT-002 — POST to /profile/complete with all required fields → user_profiles row created; GET /dashboard → 200', async () => {
		// THIS TEST WILL FAIL — profile form action not yet implemented (Task 5).
		// Activate after Task 5 (/profile/complete/+page.server.ts actions.default).
		//
		// AC-3: Given the profile completion form,
		//       When I submit all required fields with valid data,
		//       Then the user_profiles row is created with userId referencing users.id,
		//       the read-only email from the IdP is stored,
		//       and I am redirected to the dashboard.
		//
		// Risk R-005: Profile gate enforcement (completion unlocks app access).
		//
		// Strategy:
		//   1. Seed user with no profile; seed session.
		//   2. POST /profile/complete with valid form data.
		//   3. Assert redirect to /dashboard (3xx).
		//   4. Assert user_profiles row exists in DB with correct userId and OIDC email.
		//   5. GET /dashboard with same session → assert NOT redirected to /profile/complete.

		const client = await pool.connect();
		try {
			const { userId, email } = await seedIncompleteProfileUser(client);
			const { sessionCookie } = await seedUserSession(client, userId);

			// POST valid profile data (sveltekit-superforms sends application/x-www-form-urlencoded)
			const formData = new URLSearchParams({
				title: 'Mr.',
				firstName: 'Integration',
				lastName: 'Tester',
				phone: '+66812345678',
				organization: 'Test Hospital'
				// NOTE: email is intentionally NOT included — it's sourced from OIDC on the server
			});

			const postResponse = await fetch(`${DEV_SERVER_URL}/profile/complete`, {
				method: 'POST',
				headers: {
					Cookie: sessionCookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					// Accept: text/html forces SvelteKit to use the non-JSON form action path,
					// which returns real HTTP status codes (302 for redirect, 422 for fail()).
					// Without this, SvelteKit defaults to the JSON action path (Accept: */*)
					// which always returns HTTP 200 with the result encoded in the JSON body.
					Accept: 'text/html'
				},
				body: formData.toString(),
				redirect: 'manual'
			});

			// SvelteKit form action success → redirect (302/303)
			expect(
				postResponse.status,
				'Profile form POST with valid data must redirect (3xx)'
			).toBeGreaterThanOrEqual(300);
			expect(
				postResponse.status,
				'Profile form POST with valid data must redirect (3xx, not 4xx/5xx)'
			).toBeLessThan(400);

			// Assert user_profiles row was created in DB
			const profileRow = await client.query(`SELECT * FROM user_profiles WHERE "userId" = $1`, [
				userId
			]);
			expect(
				profileRow.rowCount,
				'user_profiles row must be created after valid form submission'
			).toBe(1);

			const profile = profileRow.rows[0];
			expect(profile['firstName'], 'Stored firstName must match submitted value').toBe(
				'Integration'
			);
			expect(profile['lastName'], 'Stored lastName must match submitted value').toBe('Tester');
			expect(profile['phone'], 'Stored phone must match submitted value').toBe('+66812345678');
			expect(profile['organization'], 'Stored organization must match submitted value').toBe(
				'Test Hospital'
			);
			// Email must come from OIDC claim (seeded user email), NOT from POST body
			expect(
				profile['email'],
				'Stored email must match OIDC user email (not any POST override)'
			).toBe(email);

			// After profile completion, GET /dashboard must NOT redirect to /profile/complete
			const dashboardResponse = await fetch(`${DEV_SERVER_URL}/dashboard`, {
				headers: { Cookie: sessionCookie },
				redirect: 'manual'
			});

			const dashboardLocation = dashboardResponse.headers.get('location') ?? '';
			expect(
				dashboardLocation,
				'After profile completion, /dashboard must not redirect to /profile/complete'
			).not.toMatch(/\/profile\/complete/);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.3-INT-003 — Profile form: missing required field → 422 + field-level errors [P0]
// ---------------------------------------------------------------------------

describe('Story 2.3 — Profile Form: Validation Rejects Missing Required Fields (AC-5)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P0] 2.3-INT-003 — POST /profile/complete with firstName empty → 422 + error payload; no profile row created', async () => {
		// THIS TEST WILL FAIL — profile form validation not yet implemented (Task 5).
		// Activate after Task 5 (sveltekit-superforms Valibot validation in actions.default).
		//
		// AC-5: Given the profile form,
		//       When I submit with a required field empty,
		//       Then the form is rejected with field-level inline error messages
		//       and no profile row is created or modified.
		//
		// Risk R-005: Invalid profile submissions must not complete the profile gate.
		//
		// Strategy:
		//   1. Seed user with no profile; seed session.
		//   2. POST /profile/complete with firstName intentionally empty.
		//   3. Assert response is 422 (sveltekit-superforms fail(422, { form })).
		//   4. Assert user_profiles row does NOT exist.

		const client = await pool.connect();
		try {
			const { userId } = await seedIncompleteProfileUser(client);
			const { sessionCookie } = await seedUserSession(client, userId);

			// POST with missing firstName
			const formData = new URLSearchParams({
				title: 'Ms.',
				firstName: '', // INTENTIONALLY EMPTY — required field
				lastName: 'Tester',
				phone: '+66812345678',
				organization: 'Test Org'
			});

			const postResponse = await fetch(`${DEV_SERVER_URL}/profile/complete`, {
				method: 'POST',
				headers: {
					Cookie: sessionCookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html' // force SvelteKit's non-JSON action path for real HTTP status codes
				},
				body: formData.toString(),
				redirect: 'manual'
			});

			// sveltekit-superforms returns 422 on validation failure
			expect(
				postResponse.status,
				'Profile form POST with empty firstName must return 422 (Unprocessable Entity)'
			).toBe(422);

			// Assert no user_profiles row was created
			const profileRow = await client.query(`SELECT id FROM user_profiles WHERE "userId" = $1`, [
				userId
			]);
			expect(
				profileRow.rowCount,
				'No user_profiles row should be created when required field is missing'
			).toBe(0);
		} finally {
			client.release();
		}
	});

	test('[P0] 2.3-INT-003b — POST /profile/complete with multiple missing fields → each missing field produces an error', async () => {
		// THIS TEST WILL FAIL — profile form validation not yet implemented (Task 5).
		// Activate after Task 5.
		//
		// AC-5: All required fields (title, firstName, lastName, phone, organization) must be validated.

		const client = await pool.connect();
		try {
			const { userId } = await seedIncompleteProfileUser(client);
			const { sessionCookie } = await seedUserSession(client, userId);

			// POST with all required fields empty
			const formData = new URLSearchParams({
				title: '',
				firstName: '',
				lastName: '',
				phone: '',
				organization: ''
			});

			const postResponse = await fetch(`${DEV_SERVER_URL}/profile/complete`, {
				method: 'POST',
				headers: {
					Cookie: sessionCookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html' // force SvelteKit's non-JSON action path for real HTTP status codes
				},
				body: formData.toString(),
				redirect: 'manual'
			});

			expect(postResponse.status, 'POST with all required fields empty must return 422').toBe(422);

			const profileRow = await client.query(`SELECT id FROM user_profiles WHERE "userId" = $1`, [
				userId
			]);
			expect(
				profileRow.rowCount,
				'No user_profiles row created when all required fields are empty'
			).toBe(0);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.3-INT-004 — Email immutability: POST body email override silently ignored [P0]
// ---------------------------------------------------------------------------

describe('Story 2.3 — Email Immutability: POST Body email Override Ignored (AC-7)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P0] 2.3-INT-004 — POST /profile/complete with email override in body → stored email unchanged (OIDC email preserved)', async () => {
		// THIS TEST WILL FAIL — profile form action not yet implemented (Task 5).
		// Activate after Task 5 (email must never be read from POST body in actions.default).
		//
		// AC-7: Given a form submission that includes an email field override,
		//       When the server action processes the request,
		//       Then the email value from the POST body is silently ignored;
		//       the stored email remains the original OIDC-sourced value unchanged.
		//
		// Risk R-008: Profile update allows email field to be mutated (security violation).
		//
		// Critical: email is NOT in ProfileSchema (Valibot). Server action MUST source
		//           email from event.locals.user.email (OIDC claim), NEVER from POST body.
		//
		// Strategy:
		//   1. Seed user with a known OIDC email; seed session.
		//   2. POST /profile/complete with all valid fields PLUS an extra 'email' field
		//      set to an attacker-controlled value.
		//   3. Assert profile is created (200/redirect).
		//   4. Assert stored email in user_profiles matches the SEEDED OIDC email,
		//      NOT the attacker-supplied email.

		const client = await pool.connect();
		try {
			const oidcEmail = `oidc-${randomUUID().slice(0, 8)}@legitimate.org`;
			const attackerEmail = 'attacker@evil.com';

			const { userId } = await seedIncompleteProfileUser(client, { email: oidcEmail });
			const { sessionCookie } = await seedUserSession(client, userId);

			// POST with all valid fields + attacker email override
			const formData = new URLSearchParams({
				title: 'Mrs.',
				firstName: 'Real',
				lastName: 'User',
				phone: '+66898765432',
				organization: 'Legitimate Org',
				email: attackerEmail // MUST be silently ignored by server
			});

			const postResponse = await fetch(`${DEV_SERVER_URL}/profile/complete`, {
				method: 'POST',
				headers: {
					Cookie: sessionCookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html' // force SvelteKit's non-JSON action path for real HTTP status codes
				},
				body: formData.toString(),
				redirect: 'manual'
			});

			// Request should succeed (other fields are valid)
			expect(
				postResponse.status,
				'POST with valid fields + email override must not return 4xx/5xx'
			).toBeLessThan(500);

			// Assert stored email is OIDC email, not attacker email
			const profileRow = await client.query(`SELECT email FROM user_profiles WHERE "userId" = $1`, [
				userId
			]);
			expect(
				profileRow.rowCount,
				'user_profiles row must exist after valid submission'
			).toBeGreaterThan(0);

			expect(
				profileRow.rows[0]?.['email'],
				'Stored email must be the OIDC-sourced email, not the attacker-supplied email'
			).toBe(oidcEmail);

			expect(
				profileRow.rows[0]?.['email'],
				'Stored email must NOT be the attacker-controlled email'
			).not.toBe(attackerEmail);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.3-INT-005 — Profile edit: update mutable fields; email stays immutable [P1]
// ---------------------------------------------------------------------------

describe('Story 2.3 — Profile Edit: Update Mutable Fields, Email Stays Immutable (AC-6, AC-7)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P1] 2.3-INT-005 — POST /profile (edit) with new phone value → phone updated; email unchanged', async () => {
		// THIS TEST WILL FAIL — profile edit route not yet implemented (Task 6).
		// Activate after Task 6 (/profile/+page.server.ts actions.default).
		//
		// AC-6: Given a completed profile, When I visit /profile (profile edit),
		//       Then I can edit mutable fields but email remains read-only.
		//
		// Risk R-008: Profile edit must not accept email mutations.
		//
		// Strategy:
		//   1. Seed user with completed profile; seed session.
		//   2. POST /profile (edit) with updated phone and attacker email override.
		//   3. Assert phone is updated in DB.
		//   4. Assert email unchanged in DB.

		const client = await pool.connect();
		try {
			const oidcEmail = `oidc-edit-${randomUUID().slice(0, 8)}@example.com`;
			const { userId } = await seedCompletedProfileUser(client, { email: oidcEmail });
			const { sessionCookie } = await seedUserSession(client, userId);

			const updatedPhone = '+66812399999';
			const attackerEmail = 'hacker@evil.com';

			const formData = new URLSearchParams({
				title: 'Ms.',
				firstName: 'Updated',
				lastName: 'Name',
				phone: updatedPhone,
				organization: 'New Org',
				email: attackerEmail // MUST be silently ignored
			});

			const postResponse = await fetch(`${DEV_SERVER_URL}/profile`, {
				method: 'POST',
				headers: {
					Cookie: sessionCookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html' // force SvelteKit's non-JSON action path for real HTTP status codes
				},
				body: formData.toString(),
				redirect: 'manual'
			});

			// Profile edit should succeed
			expect(postResponse.status, 'Profile edit POST must not return 5xx').toBeLessThan(500);

			// Assert phone updated
			const profileRow = await client.query(
				`SELECT phone, email, "firstName" FROM user_profiles WHERE "userId" = $1`,
				[userId]
			);
			expect(profileRow.rowCount, 'user_profiles row must still exist after edit').toBe(1);

			const profile = profileRow.rows[0];
			expect(profile['phone'], 'Phone must be updated to new value').toBe(updatedPhone);
			expect(profile['firstName'], 'firstName must be updated to new value').toBe('Updated');
			expect(profile['email'], 'Email must remain the original OIDC email after edit').toBe(
				oidcEmail
			);
			expect(profile['email'], 'Email must not be the attacker-supplied value').not.toBe(
				attackerEmail
			);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.3-INT-004c — /profile/complete gate: completed-profile user redirected to dashboard [P0]
// ---------------------------------------------------------------------------

describe('Story 2.3 — Profile Gate: Already-complete User Bypasses /profile/complete (AC-4)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P0] 2.3-INT-004c — GET /profile/complete with already-completed profile → redirected to dashboard', async () => {
		// THIS TEST WILL FAIL — /profile/complete load function not yet implemented (Task 5.1).
		// Activate after Task 5.1 (load function checks profileComplete and redirects).
		//
		// AC-4: Given a user who has already completed their profile,
		//       When they navigate to /profile/complete,
		//       Then they are redirected to the dashboard (profile gate is satisfied).

		const client = await pool.connect();
		try {
			const { userId } = await seedCompletedProfileUser(client);
			const { sessionCookie } = await seedUserSession(client, userId);

			const response = await fetch(`${DEV_SERVER_URL}/profile/complete`, {
				headers: { Cookie: sessionCookie },
				redirect: 'manual'
			});

			expect(
				response.status,
				'GET /profile/complete for completed-profile user must return 3xx redirect'
			).toBeGreaterThanOrEqual(300);
			expect(response.status, 'Redirect must be 3xx, not 4xx/5xx').toBeLessThan(400);

			const location = response.headers.get('location') ?? '';
			expect(location, 'Redirect must point to /dashboard (not back to /profile/complete)').toMatch(
				/\/dashboard/
			);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.7-INT-002 — Audit log: profile create writes audit_log row (AC-8) [P1]
// ---------------------------------------------------------------------------

describe('Story 2.7 (via 2.3) — Audit Log: Profile Create Writes audit_log Row (AC-8)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P1] 2.7-INT-002 — Profile form completion → audit_log row written with entity=user_profile, action=create', async () => {
		// THIS TEST WILL FAIL — profile-service.ts createProfile not yet implemented (Task 3).
		// Activate after Tasks 3, 5 (profile service + form action creating profile in transaction).
		//
		// AC-8: Given a completed profile mutation (create or update),
		//       When the server action commits the transaction,
		//       Then an audit_log row is written atomically.
		//
		// Risk R-011: Audit-log write missing on profile mutations.
		//
		// Strategy:
		//   1. Seed user with no profile; seed session.
		//   2. Record audit_log count before POST.
		//   3. POST /profile/complete with all valid fields.
		//   4. Assert audit_log count increased by 1.
		//   5. Assert the new row has entity='user_profile', action='create', actorId=userId.

		const client = await pool.connect();
		try {
			const { userId } = await seedIncompleteProfileUser(client);
			const { sessionCookie } = await seedUserSession(client, userId);

			// Count audit_log rows before
			const countBefore = await client.query<{ count: string }>(
				`SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'user_profile'`
			);
			const auditCountBefore = parseInt(countBefore.rows[0]?.['count'] ?? '0', 10);

			// POST valid profile data
			const formData = new URLSearchParams({
				title: 'Mr.',
				firstName: 'Audit',
				lastName: 'Tester',
				phone: '+66801234567',
				organization: 'Audit Org'
			});

			await fetch(`${DEV_SERVER_URL}/profile/complete`, {
				method: 'POST',
				headers: {
					Cookie: sessionCookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html' // force SvelteKit's non-JSON action path for real HTTP status codes
				},
				body: formData.toString(),
				redirect: 'manual'
			});

			// Count audit_log rows after
			const countAfter = await client.query<{ count: string }>(
				`SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'user_profile'`
			);
			const auditCountAfter = parseInt(countAfter.rows[0]?.['count'] ?? '0', 10);

			expect(
				auditCountAfter,
				'audit_log count for entity=user_profile must increase by 1 after profile creation'
			).toBe(auditCountBefore + 1);

			// Assert row content
			const auditRow = await client.query(
				// audit_log uses snake_case column names (actor_id, created_at) per migration 0001.
				`SELECT * FROM audit_log WHERE entity = 'user_profile' AND actor_id = $1 ORDER BY created_at DESC LIMIT 1`,
				[userId]
			);
			expect(auditRow.rowCount, 'audit_log row must exist for this user').toBeGreaterThan(0);

			const audit = auditRow.rows[0];
			expect(audit['entity'], 'audit entity must be user_profile').toBe('user_profile');
			expect(audit['action'], 'audit action must be create').toBe('create');
			expect(audit['actor_id'], 'audit actor_id must match the user who submitted the form').toBe(
				userId
			);
			expect(audit['diff'], 'audit diff must be non-null and contain profile fields').toBeTruthy();
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.7-INT-003 — Audit log: profile update writes audit_log row with diff [P1]
// ---------------------------------------------------------------------------

describe('Story 2.7 (via 2.3) — Audit Log: Profile Update Writes audit_log Row with Diff (AC-8)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P1] 2.7-INT-003 — Profile edit with new phone → audit_log row written with action=update and diff containing changed field', async () => {
		// THIS TEST WILL FAIL — profile-service.ts updateProfile not yet implemented (Task 3).
		// Activate after Tasks 3, 6 (profile service + edit route).
		//
		// AC-8: When the server action commits the transaction (update),
		//       an audit_log row is written with action='update' and diff containing
		//       changed field names/values.
		//
		// Risk R-011: Audit log missing on profile mutations.
		//
		// Strategy:
		//   1. Seed user with completed profile; seed session.
		//   2. Record audit_log count.
		//   3. POST /profile with an updated phone value.
		//   4. Assert audit_log count +1 with action='update'.
		//   5. Assert diff contains the changed phone field.

		const client = await pool.connect();
		try {
			const { userId } = await seedCompletedProfileUser(client);
			const { sessionCookie } = await seedUserSession(client, userId);

			const countBefore = await client.query<{ count: string }>(
				`SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'user_profile' AND action = 'update'`
			);
			const auditCountBefore = parseInt(countBefore.rows[0]?.['count'] ?? '0', 10);

			const newPhone = '+66899988877';
			const formData = new URLSearchParams({
				title: 'Mr.',
				firstName: 'Test',
				lastName: 'User',
				phone: newPhone,
				organization: 'Test Org'
			});

			await fetch(`${DEV_SERVER_URL}/profile`, {
				method: 'POST',
				headers: {
					Cookie: sessionCookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html' // force SvelteKit's non-JSON action path for real HTTP status codes
				},
				body: formData.toString(),
				redirect: 'manual'
			});

			const countAfter = await client.query<{ count: string }>(
				`SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'user_profile' AND action = 'update'`
			);
			const auditCountAfter = parseInt(countAfter.rows[0]?.['count'] ?? '0', 10);

			expect(
				auditCountAfter,
				'audit_log count for update action must increase by 1 after profile edit'
			).toBe(auditCountBefore + 1);

			// Assert the diff contains the phone field change
			const auditRow = await client.query(
				// audit_log uses snake_case column names (actor_id, created_at) per migration 0001.
				`SELECT diff FROM audit_log WHERE entity = 'user_profile' AND actor_id = $1 AND action = 'update' ORDER BY created_at DESC LIMIT 1`,
				[userId]
			);
			expect(auditRow.rowCount, 'audit_log update row must exist').toBeGreaterThan(0);

			const diff = auditRow.rows[0]?.['diff'];
			// diff should contain the phone field (exact shape depends on updateProfile implementation)
			const diffStr = typeof diff === 'string' ? diff : JSON.stringify(diff ?? {});
			expect(diffStr, 'audit diff must reference the phone field that was changed').toContain(
				'phone'
			);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.7-INT-004 — Audit log: rollback prevents audit_log write [P1]
// ---------------------------------------------------------------------------

describe('Story 2.7 (via 2.3) — Audit Log: Rolled-back Transaction Writes No audit_log Row (AC-8)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P1] 2.7-INT-004 — DB error mid-transaction → audit_log count unchanged (atomic rollback)', async () => {
		// THIS TEST WILL FAIL — profile-service.ts transaction handling not yet implemented (Task 3).
		// Activate after Task 3 (createProfile/updateProfile wrapped in db.transaction()).
		//
		// AC-8: audit_log row is written ATOMICALLY — if the profile insert fails,
		//       no audit row is written.
		//
		// Risk R-011: Incomplete audit trail due to non-atomic writes.
		//
		// Strategy (unit-level via direct service import):
		//   1. Import createProfile service directly (bypasses HTTP layer for atomic control).
		//   2. Seed a user.
		//   3. Record audit_log count before.
		//   4. Call createProfile with a duplicate userId (will fail on UNIQUE constraint).
		//   5. Assert audit_log count is UNCHANGED.
		//
		// Note: This test imports the service module directly (not HTTP). It requires
		//       DATABASE_URL to be set and migrations applied (including user_profiles table).
		//       The integration test project is the right home for this since it needs a live DB.

		const client = await pool.connect();
		try {
			const { userId, email } = await seedIncompleteProfileUser(client);

			// Seed an EXISTING profile row to trigger a UNIQUE constraint violation on second insert
			await client.query(
				`INSERT INTO user_profiles (id, "userId", email, title, "firstName", "lastName", phone, organization, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'Mr.', 'Existing', 'Profile', '+66800000001', 'Pre-existing Org', NOW(), NOW())`,
				[`existing-profile-${userId}`, userId, email]
			);

			const countBefore = await client.query<{ count: string }>(
				`SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'user_profile'`
			);
			const auditCountBefore = parseInt(countBefore.rows[0]?.['count'] ?? '0', 10);

			// Dynamically import profile service to call createProfile directly
			// This will FAIL because a profile for this userId already exists (UNIQUE constraint)
			const { createProfile } = await import('../../src/lib/server/services/profile-service.js');

			const profileInput = {
				title: 'Mr.' as const,
				firstName: 'Should',
				lastName: 'Fail',
				phone: '+66800000002',
				organization: 'Should Not Exist'
			};

			// createProfile must throw (UNIQUE violation on userId)
			await expect(
				createProfile(userId, email, profileInput),
				'createProfile must throw when userId already has a profile (UNIQUE constraint)'
			).rejects.toThrow();

			// Audit log must be UNCHANGED (transaction rolled back)
			const countAfter = await client.query<{ count: string }>(
				`SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'user_profile'`
			);
			const auditCountAfter = parseInt(countAfter.rows[0]?.['count'] ?? '0', 10);

			expect(
				auditCountAfter,
				'audit_log count must be unchanged after rolled-back profile insert'
			).toBe(auditCountBefore);
		} finally {
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 2.3-INT-006 — Profile title field accepts all valid enum values [P2]
// ---------------------------------------------------------------------------

describe('Story 2.3 — Profile Form: Title Field Accepts All Valid Enum Values (AC-3)', () => {
	beforeEach(async () => {
		await truncateProfileTables();
	});

	test('[P2] 2.3-INT-006 — POST /profile/complete with each valid title value (Mr., Mrs., Ms., Other) → all accepted', async () => {
		// THIS TEST WILL FAIL — profile form not yet implemented (Task 5).
		// Activate after Tasks 2 and 5 (ProfileSchema with title enum + form action).
		//
		// Strategy:
		//   Test each title option in sequence, truncating between each.

		const validTitles = ['Mr.', 'Mrs.', 'Ms.', 'Other'];

		for (const title of validTitles) {
			await truncateProfileTables();

			const client = await pool.connect();
			try {
				const { userId } = await seedIncompleteProfileUser(client);
				const { sessionCookie } = await seedUserSession(client, userId);

				const formData = new URLSearchParams({
					title,
					firstName: 'Title',
					lastName: 'Test',
					phone: '+66812300000',
					organization: 'Title Test Org'
				});

				const response = await fetch(`${DEV_SERVER_URL}/profile/complete`, {
					method: 'POST',
					headers: {
						Cookie: sessionCookie,
						'Content-Type': 'application/x-www-form-urlencoded',
						Accept: 'text/html' // force SvelteKit's non-JSON action path for real HTTP status codes
					},
					body: formData.toString(),
					redirect: 'manual'
				});

				expect(
					response.status,
					`POST with title="${title}" must not return 422 (must be valid enum value)`
				).not.toBe(422);

				const profileRow = await client.query(
					`SELECT title FROM user_profiles WHERE "userId" = $1`,
					[userId]
				);
				expect(profileRow.rowCount, `Profile must be created for title="${title}"`).toBe(1);
				expect(profileRow.rows[0]?.['title'], `Stored title must match submitted title`).toBe(
					title
				);
			} finally {
				client.release();
			}
		}
	});
});
