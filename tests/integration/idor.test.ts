/**
 * Story 2.7: Authorization Negative-Test Pattern
 * Integration Tests: IDOR / Ownership Enforcement
 *
 * STATUS: GREEN PHASE — Tests activated (Story 2.7 implementation complete).
 *
 * All active tests in this file are unit-level mock tests — they do NOT require
 * a PostgreSQL instance or a live HTTP server. They test assertOwner() (via the
 * makeMockEvent pattern, identical to 2.5-INT-003 in auth-guard.test.ts) and
 * testOwnershipEnforcement() (by stubbing global.fetch so the helper's real
 * denial logic — status-set check, IDOR-bypass throw, header handling — runs
 * against a controlled response). No DB or running dev server is needed.
 *
 * TODO(E4): When activating 2.7-INT-001b (HTTP-level ownership proof for
 * /bookings/[id] routes against a real dev server), add pgFactory setup and
 * DEV_SERVER_URL guards. The two-user seeding pattern is documented in
 * idor-template.ts JSDoc.
 *
 * AC Coverage:
 *   - AC-1: Non-owner organizer attempt on owner-scoped resource denied (403)
 *           testOwnershipEnforcement helper correctly asserts the denial.
 *   - AC-2: Forged/guessed resource ID (IDOR) -> 403 or 404 (no data leakage);
 *           template exercises both GET and mutation (PATCH/DELETE/POST-action) paths.
 *   - AC-3: testOwnershipEnforcement lives at tests/support/helpers/idor-template.ts
 *           and can be imported by E3-E7 stories without copy/paste.
 *   - AC-7: At least one proof exercising the helper's denial logic passes green.
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.7-INT-001: IDOR negative-test template: testOwnershipEnforcement helper
 *                  denies non-owner access [P0]
 *   - 2.7-UNIT-001: testOwnershipEnforcement helper covers GET, PATCH, DELETE methods [P2]
 *
 * Design Note - Why Unit-Level for Epic 2:
 *   Epic 2 has no resource-ID-in-URL routes. The /profile route is per-session
 *   (not /profile/:id). The first owner-scoped-by-ID resource is /bookings/[id] in E4.
 *   For the Epic 2 proof (2.7-INT-001), we (a) test the assertOwner guard directly
 *   using the makeMockEvent pattern — identical to 2.5-INT-003 in auth-guard.test.ts —
 *   and (b) exercise the testOwnershipEnforcement HTTP helper against a stubbed
 *   fetch so its real assertion logic is proven without an E4 route.
 *
 * Note: No Thai text hardcoded - per project rule: Rawinan handles all Thai translations.
 */

import { describe, test, expect, afterEach, vi } from 'vitest';

import { assertOwner } from '../../src/lib/server/auth/guards.js';
import { makeMockEvent } from '../support/helpers/mock-event.js';
import {
	testOwnershipEnforcement,
	type OwnershipTestConfig
} from '../support/helpers/idor-template.js';

// ---------------------------------------------------------------------------
// fetch stub helpers — let the helper's real logic run against a controlled
// response without a live server.
// ---------------------------------------------------------------------------

interface CapturedRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: BodyInit | null;
}

/**
 * Replace global.fetch with a stub that returns a `status`-only Response and
 * records the outgoing request so tests can assert on method/headers/body.
 * Returns the capture object; restore via vi.restoreAllMocks() in afterEach.
 */
function stubFetchWithStatus(status: number): CapturedRequest {
	const captured: CapturedRequest = { url: '', method: '', headers: {} };
	vi.spyOn(globalThis, 'fetch').mockImplementation(
		async (input: RequestInfo | URL, init?: RequestInit) => {
			captured.url = String(input);
			captured.method = init?.method ?? 'GET';
			captured.headers = (init?.headers as Record<string, string>) ?? {};
			captured.body = init?.body ?? null;
			return new Response(null, { status });
		}
	);
	return captured;
}

afterEach(() => {
	vi.restoreAllMocks();
});

const BASE_URL = 'http://idor-test.local';
const NON_OWNER_COOKIE = 'better-auth.session_token=non-owner-test-token';

// ---------------------------------------------------------------------------
// 2.7-INT-001 - IDOR negative-test template: assertOwner denies non-owner [P0]
// ---------------------------------------------------------------------------

describe('Story 2.7 - IDOR Negative-Test Template (R-003)', () => {
	test('[P0] 2.7-INT-001 - assertOwner denies non-owner AND testOwnershipEnforcement asserts the HTTP denial', async () => {
		// AC-1: Given an owner-scoped resource (ownerId = 'owner-user-id'),
		//       When a non-owner organizer (id = 'other-user-id') attempts to access it,
		//       Then assertOwner throws error(403) and the helper accepts the 403 denial.
		//
		// AC-7: Unit-level assertOwner mock + a real exercise of the helper's denial
		//       logic against a stubbed fetch (Epic 2 has no resource-ID-in-URL routes).

		const ownerUserId = 'owner-user-id';
		const nonOwnerUserId = 'other-user-id';

		// Step 1: assertOwner denies the non-owner (direct unit-level assertion).
		const nonOwnerEvent = makeMockEvent({ id: nonOwnerUserId, isAdmin: false });

		let thrownError: unknown;
		try {
			assertOwner(nonOwnerEvent as Parameters<typeof assertOwner>[0], ownerUserId);
		} catch (e) {
			thrownError = e;
		}

		expect(thrownError, 'assertOwner must throw for a non-owner user').toBeDefined();
		expect(
			(thrownError as { status?: number }).status,
			'assertOwner must throw error(403) when user.id !== ownerId'
		).toBe(403);

		// Step 2: assertOwner PASSES for the owner (happy path - no throw).
		const ownerEvent = makeMockEvent({ id: ownerUserId, isAdmin: false });
		expect(
			() => assertOwner(ownerEvent as Parameters<typeof assertOwner>[0], ownerUserId),
			'assertOwner must NOT throw when user.id === ownerId (owner access is allowed)'
		).not.toThrow();

		// Step 3: Exercise the helper's REAL denial logic. A 403 from the route must
		// be accepted (resolves), and the non-owner cookie must be sent.
		const captured = stubFetchWithStatus(403);
		await expect(
			testOwnershipEnforcement({
				routeUrl: `${BASE_URL}/bookings/some-id/edit`,
				method: 'PATCH',
				nonOwnerCookie: NON_OWNER_COOKIE,
				body: new URLSearchParams({ title: 'IDOR attempt' }).toString(),
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}),
			'helper must resolve (no throw) when the route denies a non-owner with 403'
		).resolves.toBeUndefined();

		expect(captured.method, 'helper must dispatch the configured method').toBe('PATCH');
		expect(captured.headers['Cookie'], 'helper must send the non-owner session cookie').toBe(
			NON_OWNER_COOKIE
		);
	});

	test('[P0] 2.7-INT-001 - testOwnershipEnforcement THROWS when a non-owner is NOT denied (IDOR bypass detected)', async () => {
		// AC-1 / AC-2: a 200 success for a non-owner is an IDOR bypass — the helper
		// must throw. This is the assertion that actually protects E3-E7.
		stubFetchWithStatus(200);
		await expect(
			testOwnershipEnforcement({
				routeUrl: `${BASE_URL}/bookings/some-id/edit`,
				method: 'PATCH',
				nonOwnerCookie: NON_OWNER_COOKIE
			}),
			'a 200 for a non-owner must be reported as an IDOR bypass'
		).rejects.toThrow(/IDOR enforcement FAILED/);

		// An unexpected status outside the denial set also throws.
		stubFetchWithStatus(500);
		await expect(
			testOwnershipEnforcement({
				routeUrl: `${BASE_URL}/bookings/some-id/edit`,
				method: 'DELETE',
				nonOwnerCookie: NON_OWNER_COOKIE
			}),
			'a status outside expectedDenialStatuses must throw'
		).rejects.toThrow(/IDOR enforcement FAILED/);
	});
});

// ---------------------------------------------------------------------------
// 2.7-UNIT-001 - testOwnershipEnforcement helper covers multiple HTTP methods [P2]
// ---------------------------------------------------------------------------

describe('Story 2.7 - testOwnershipEnforcement helper contract (2.7-UNIT-001)', () => {
	test('[P2] 2.7-UNIT-001 - helper dispatches GET, PATCH, DELETE, and POST with the correct method', async () => {
		// AC-2: The template exercises both GET and mutation (PATCH/DELETE/POST-action)
		//       paths. Each config is actually dispatched through the helper.
		const methods: Array<OwnershipTestConfig['method']> = ['GET', 'PATCH', 'DELETE', 'POST'];

		for (const method of methods) {
			const captured = stubFetchWithStatus(404);
			await testOwnershipEnforcement({
				routeUrl: `${BASE_URL}/resource/test-id`,
				method,
				nonOwnerCookie: NON_OWNER_COOKIE,
				body: method === 'GET' ? undefined : new URLSearchParams({ _action: 'x' }).toString()
			});
			expect(captured.method, `helper must dispatch ${method}`).toBe(method);
			vi.restoreAllMocks();
		}
	});

	test('[P2] 2.7-UNIT-001 - GET drops a body; mutations forward it', async () => {
		// GET cannot carry a body — the helper must drop it.
		const getCapture = stubFetchWithStatus(404);
		await testOwnershipEnforcement({
			routeUrl: `${BASE_URL}/resource/test-id`,
			method: 'GET',
			nonOwnerCookie: NON_OWNER_COOKIE,
			body: 'should-be-dropped'
		});
		expect(getCapture.body ?? null, 'GET must not forward a body').toBeNull();
		vi.restoreAllMocks();

		// DELETE-with-body is valid and must be forwarded.
		const deleteCapture = stubFetchWithStatus(404);
		const deleteBody = new URLSearchParams({ _action: 'delete' }).toString();
		await testOwnershipEnforcement({
			routeUrl: `${BASE_URL}/resource/test-id`,
			method: 'DELETE',
			nonOwnerCookie: NON_OWNER_COOKIE,
			body: deleteBody
		});
		expect(deleteCapture.body, 'DELETE-with-body must be forwarded').toBe(deleteBody);
	});

	test('[P2] 2.7-UNIT-001 - a caller-supplied Cookie header cannot clobber the non-owner session', async () => {
		const captured = stubFetchWithStatus(403);
		await testOwnershipEnforcement({
			routeUrl: `${BASE_URL}/resource/test-id`,
			method: 'GET',
			nonOwnerCookie: NON_OWNER_COOKIE,
			headers: { cookie: 'better-auth.session_token=ATTACKER-OVERRIDE' }
		});
		expect(
			captured.headers['Cookie'],
			'the non-owner cookie must win over a caller-supplied cookie header'
		).toBe(NON_OWNER_COOKIE);
		expect(
			captured.headers['cookie'],
			'no lowercase cookie override may leak through'
		).toBeUndefined();
	});

	test('[P2] 2.7-UNIT-001 - custom expectedDenialStatuses are honored; an empty set is rejected', async () => {
		// 405 is accepted only when the caller opts in.
		stubFetchWithStatus(405);
		await expect(
			testOwnershipEnforcement({
				routeUrl: `${BASE_URL}/resource/test-id`,
				method: 'GET',
				nonOwnerCookie: NON_OWNER_COOKIE,
				expectedDenialStatuses: [403, 404, 405]
			}),
			'405 must be accepted when included in expectedDenialStatuses'
		).resolves.toBeUndefined();

		// An empty denial set is a misconfiguration and must be rejected up front.
		await expect(
			testOwnershipEnforcement({
				routeUrl: `${BASE_URL}/resource/test-id`,
				method: 'GET',
				nonOwnerCookie: NON_OWNER_COOKIE,
				expectedDenialStatuses: []
			}),
			'an empty expectedDenialStatuses set must be rejected as a misconfiguration'
		).rejects.toThrow(/non-empty/);
	});

	test('[P2] 2.7-UNIT-001 - a network failure surfaces a clear harness error, not a silent denial', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
		await expect(
			testOwnershipEnforcement({
				routeUrl: `${BASE_URL}/resource/test-id`,
				method: 'GET',
				nonOwnerCookie: NON_OWNER_COOKIE
			}),
			'a network error must throw a descriptive harness error'
		).rejects.toThrow(/failed before a response was received/);
	});
});

// ---------------------------------------------------------------------------
// HTTP-level IDOR proof stub (activate in E4 when /bookings/[id] routes exist)
// ---------------------------------------------------------------------------

describe('Story 2.7 - HTTP-level ownership proof (future E4)', () => {
	// To activate in E4: replace test.skip with test.skipIf(!process.env['DEV_SERVER_URL'])
	// Prerequisites: DEV_SERVER_URL set, E4 story 4.4/4.7 implements /bookings/[id] with assertOwner,
	//   seedBooking() helper available. Seed owner + non-owner separately via DB (not getDevBypassCookie).
	test.skip('[P0] 2.7-INT-001b - HTTP-level ownership proof against a live dev server (future - requires E4 owner-scoped routes)', async () => {
		// Red phase stub - activate with DB seeding pattern in E4.
		// See idor-template.ts JSDoc for the two-user seeding pattern.
		expect(true).toBe(true);
	});
});
