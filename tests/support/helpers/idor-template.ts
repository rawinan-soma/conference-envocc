/**
 * IDOR Negative-Test Template — Story 2.7: Authorization Negative-Test Pattern
 *
 * Reusable helper for ownership-enforcement (IDOR) negative tests.
 * Used by Story 2.7 and inherited by Epic 3–7 stories that introduce
 * owner-scoped resources (rooms, bookings, registrations).
 *
 * Design Philosophy:
 *   - Parameterized: callers supply the route URL, HTTP method, and non-owner session
 *   - No duplicate guard logic: wraps a single fetch() and asserts status is in the
 *     denial set (defaults to [403, 404])
 *   - Throws descriptive errors when the server unexpectedly allows the request
 *
 * Usage Pattern for E3–E7 stories (HTTP-level ownership proof):
 * ```typescript
 * import { testOwnershipEnforcement } from '../support/helpers/idor-template.js';
 * import { pool } from '../support/fixtures/pg-factory.js';
 * // ...
 *
 * // Seed OWNER user + resource
 * const client = await pool.connect();
 * const ownerUserId = uuidv7();
 * await client.query(`INSERT INTO users ...`, [ownerUserId, ...]);
 * const ownerSession = await seedUserSession(client, ownerUserId);
 *
 * // Seed NON-OWNER user + session (different id — dev bypass always seeds the same fixed user)
 * const nonOwnerUserId = uuidv7();
 * await client.query(`INSERT INTO users ...`, [nonOwnerUserId, ...]);
 * const nonOwnerSession = await seedUserSession(client, nonOwnerUserId);
 * client.release();
 *
 * // Seed the resource owned by ownerUserId
 * const resourceId = uuidv7();
 * // ... insert into owned table with ownerId = ownerUserId ...
 *
 * // Assert non-owner is denied
 * await testOwnershipEnforcement({
 *   routeUrl: `${DEV_SERVER_URL}/bookings/${resourceId}/edit`,
 *   method: 'PATCH',
 *   nonOwnerCookie: nonOwnerSession.sessionCookie,
 *   body: JSON.stringify({ title: 'IDOR attempt' }),
 *   headers: { 'Content-Type': 'application/json' },
 * });
 * ```
 *
 * Note: Do NOT use `getDevBypassCookie()` to produce two distinct users for an IDOR proof.
 * The dev bypass always creates/reuses the same fixed test user (seeded in Story 2.2).
 * For two-user IDOR proofs, seed both users directly in the DB via the pg-factory pool
 * and use `seedUserSession()` (or equivalent) to produce their session cookies.
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 */

/**
 * Configuration for an ownership-enforcement (IDOR negative-test) assertion.
 */
export interface OwnershipTestConfig {
	/**
	 * Absolute URL of the route being tested.
	 * Example: `${DEV_SERVER_URL}/bookings/some-booking-id/edit`
	 */
	routeUrl: string;

	/**
	 * HTTP method for the request attempt.
	 * Defaults to 'GET'. For mutation proofs, use 'POST', 'PATCH', or 'DELETE'.
	 * Per FR-094: assertOwner is called only from mutations, not from GET load functions.
	 */
	method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';

	/**
	 * Session cookie string for the NON-OWNER's authenticated session.
	 * Format: 'better-auth.session_token=<signed-value>'
	 *
	 * Obtain via seedUserSession() using a distinct user id that does NOT own the resource.
	 */
	nonOwnerCookie: string;

	/**
	 * Optional request body for POST / PATCH mutations.
	 * Supply a URL-encoded form string or JSON string as appropriate for the route.
	 */
	body?: string;

	/**
	 * Optional additional request headers to include (merged with Cookie header).
	 */
	headers?: Record<string, string>;

	/**
	 * HTTP status codes that constitute a valid denial response.
	 * Defaults to [403, 404].
	 *
	 * 403 Forbidden — preferred when the server confirms the resource exists but the
	 *   caller does not own it (assertOwner pattern).
	 * 404 Not Found — acceptable when the server hides resource existence from
	 *   non-owners as a security measure (information-hiding pattern).
	 */
	expectedDenialStatuses?: number[];
}

/**
 * Assert that a non-owner cannot access or mutate an owner-scoped resource.
 *
 * Sends an HTTP request to `config.routeUrl` using `config.nonOwnerCookie` as the
 * authenticated session, then asserts the response status is one of
 * `config.expectedDenialStatuses` (default: [403, 404]).
 *
 * Throws a descriptive error if the server returns any other status (including 200,
 * which would indicate a successful IDOR bypass — a critical security regression).
 *
 * @param config - Ownership test configuration
 * @throws Error if the response status is not in `expectedDenialStatuses`
 *
 * @example
 * // Epic 4 — booking ownership: non-owner PATCH attempt on a booking
 * await testOwnershipEnforcement({
 *   routeUrl: `${DEV_SERVER_URL}/bookings/${bookingId}/edit`,
 *   method: 'PATCH',
 *   nonOwnerCookie: nonOwnerSession.sessionCookie,
 *   body: new URLSearchParams({ title: 'IDOR attempt' }).toString(),
 *   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 * });
 */
export async function testOwnershipEnforcement(config: OwnershipTestConfig): Promise<void> {
	const {
		routeUrl,
		method = 'GET',
		nonOwnerCookie,
		body,
		headers = {},
		expectedDenialStatuses = [403, 404]
	} = config;

	const requestHeaders: Record<string, string> = {
		Cookie: nonOwnerCookie,
		...headers
	};

	const fetchOptions: RequestInit = {
		method,
		headers: requestHeaders,
		redirect: 'manual' // Do not follow redirects — capture raw status code
	};

	if (body !== undefined && (method === 'POST' || method === 'PATCH')) {
		fetchOptions.body = body;
	}

	const response = await fetch(routeUrl, fetchOptions);

	if (!expectedDenialStatuses.includes(response.status)) {
		throw new Error(
			`IDOR enforcement FAILED: ${method} ${routeUrl} ` +
				`responded with HTTP ${response.status} for non-owner session. ` +
				`Expected one of [${expectedDenialStatuses.join(', ')}]. ` +
				`A ${response.status} response may indicate an IDOR bypass — ` +
				`assertOwner guard may not be applied to this route.`
		);
	}
}
