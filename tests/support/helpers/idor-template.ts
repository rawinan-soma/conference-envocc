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
	 * Defaults to 'GET'. For mutation proofs, use 'POST', 'PATCH', 'PUT', or 'DELETE'.
	 * Per FR-094: assertOwner is called only from mutations, not from GET load functions.
	 */
	method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

	/**
	 * Session cookie string for the NON-OWNER's authenticated session.
	 * Format: 'better-auth.session_token=<signed-value>'
	 *
	 * Obtain via seedUserSession() using a distinct user id that does NOT own the resource.
	 */
	nonOwnerCookie: string;

	/**
	 * Optional request body for mutations (POST / PATCH / DELETE).
	 * Supply a URL-encoded form string or JSON string as appropriate for the route.
	 * Ignored for GET (which cannot carry a body).
	 */
	body?: string;

	/**
	 * Optional additional request headers to include. The non-owner `Cookie`
	 * header is always applied last and cannot be overridden by this map (any
	 * caller-supplied `Cookie`/`cookie` entry is dropped) so the IDOR session
	 * stays intact.
	 */
	headers?: Record<string, string>;

	/**
	 * HTTP status codes that constitute a valid denial response.
	 * Defaults to [403, 404]. Must be non-empty.
	 *
	 * 403 Forbidden — preferred when the server confirms the resource exists but the
	 *   caller does not own it (assertOwner pattern).
	 * 404 Not Found — acceptable when the server hides resource existence from
	 *   non-owners as a security measure (information-hiding pattern).
	 *
	 * Do NOT add any 2xx status here: a 2xx for a non-owner is always treated as an
	 * IDOR bypass and throws regardless of this set. A 302 auth-redirect denial may
	 * be added explicitly, but only when the route genuinely denies via redirect
	 * (not when the non-owner session is merely invalid/expired).
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

	// Guard: an empty denial set would reject every response (including a correct
	// 403), turning the helper into an always-failing assertion. Reject the
	// misconfiguration loudly instead of producing a confusing IDOR "failure".
	if (expectedDenialStatuses.length === 0) {
		throw new Error(
			'testOwnershipEnforcement: expectedDenialStatuses must be non-empty ' +
				'(an empty set rejects every response, including a correct 403/404).'
		);
	}

	// Spread caller headers FIRST, then force the non-owner Cookie last so a
	// caller-supplied `Cookie`/`cookie` header can never clobber the session the
	// IDOR proof depends on (HTTP header names are case-insensitive, so we strip
	// any case variant the caller passed before applying ours).
	const requestHeaders: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === 'cookie') continue;
		requestHeaders[key] = value;
	}
	requestHeaders['Cookie'] = nonOwnerCookie;

	const fetchOptions: RequestInit = {
		method,
		headers: requestHeaders,
		redirect: 'manual' // Do not follow redirects — capture raw status code
	};

	// Attach the body for any method that carries one. DELETE-with-body, PUT, and
	// POST `_action` form payloads are valid mutation shapes; only GET (which
	// cannot carry a body) is excluded.
	if (body !== undefined && method !== 'GET') {
		fetchOptions.body = body;
	}

	let response: Response;
	try {
		response = await fetch(routeUrl, fetchOptions);
	} catch (cause) {
		// A network-level failure (e.g. ECONNREFUSED when the dev server is not
		// running) is a harness problem, not an IDOR result. Surface it clearly
		// rather than letting an opaque "fetch failed" masquerade as a denial.
		throw new Error(
			`testOwnershipEnforcement: request to ${method} ${routeUrl} failed before ` +
				`a response was received (is the dev server running?).`,
			{ cause }
		);
	}

	// A 2xx success is the unambiguous IDOR-bypass signal: the non-owner reached
	// (and possibly mutated) the resource. Callers must NOT add 2xx codes to the
	// denial set — doing so would mask a real bypass that ends in a redirect.
	if (response.status >= 200 && response.status < 300) {
		throw new Error(
			`IDOR enforcement FAILED: ${method} ${routeUrl} returned HTTP ${response.status} ` +
				`(success) for a non-owner session — the request was NOT denied. ` +
				`This indicates an IDOR bypass: the assertOwner guard is missing or ineffective.`
		);
	}

	if (!expectedDenialStatuses.includes(response.status)) {
		throw new Error(
			`IDOR enforcement FAILED: ${method} ${routeUrl} ` +
				`responded with HTTP ${response.status} for non-owner session. ` +
				`Expected one of [${expectedDenialStatuses.join(', ')}]. ` +
				`Note: an auth redirect (302 → /login) means the non-owner session was ` +
				`invalid/expired — seed a valid non-owner session, or add the redirect ` +
				`status to expectedDenialStatuses if the route denies via redirect.`
		);
	}
}
