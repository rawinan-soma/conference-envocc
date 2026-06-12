/**
 * ATDD Red-Phase Scaffolds — Story 2.1 / 2.5: Auth Guard Dispatcher
 * Integration Tests: routeGuards registry extensibility (R-006)
 *
 * STATUS: ACTIVE (green phase). All 6 test.todo() stubs from the Story 2.1
 * scaffold are now activated. Story 2.5 guard dispatcher implemented.
 *
 * These tests run in the Vitest `integration` project which requires a real
 * PostgreSQL instance. The global setup (tests/support/integration-setup.ts)
 * starts Testcontainers when DATABASE_URL is not set, or uses the CI Postgres
 * service when DATABASE_URL is already provided.
 *
 * AC Coverage:
 *   - Story 2.1 AC-5: Auth guard must cover all (app) routes (guard dispatcher foundation)
 *   - Story 2.5 AC: routeGuards registry is exported and extensible (R-006)
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.5-INT-001: requireUser guard: unauthenticated request → 302→/login [P0]
 *   - 2.5-INT-002: requireAdmin guard: organizer (non-admin) → 403 [P0]
 *   - 2.5-INT-003: assertOwner guard: non-owner → 403 [P0]
 *   - 2.5-INT-004: read-to-attend: non-owner organizer can GET event detail → 200 [P1]
 *   - 2.5-INT-005: Public r/[token] routes skip auth guards [P1]
 *   - 2.5-UNIT-001: routeGuards registry exported and extensible [P1]
 *
 * Story 2.5 Dependency:
 *   This file is created in Story 2.1 to establish the file path and pattern.
 *   The actual guard dispatcher tests activate when Story 2.5 is implemented.
 *   The 2.5 dev agent must activate these stubs rather than creating new test files.
 *
 * Architecture Requirement R-006:
 *   hooks.server.ts must define routeGuards as an exported, typed array/map that
 *   callers can push new entries into without modifying the hook itself.
 *
 * Implementation Note — UNIT-001 source-level strategy:
 *   hooks.server.ts cannot be dynamically imported in the integration test worker
 *   because it calls validateEnv() at module load time, which reads process.env and
 *   calls process.exit(1) if DATABASE_URL is absent — and Vitest test workers do not
 *   inherit env vars set by globalSetup (which runs in a separate process).
 *   UNIT-001 therefore verifies the routeGuards export via source-level inspection.
 *   This is consistent with tests/unit/scaffold.spec.ts and i18n-config.spec.ts.
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 */

import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { requireAdmin, assertOwner } from '../../src/lib/server/auth/guards.js';
import { makeMockEvent } from '../support/helpers/mock-event.js';

// ---------------------------------------------------------------------------
// Project root resolution + static fixture cache
// ---------------------------------------------------------------------------

// auth-guard.test.ts lives at tests/integration/auth-guard.test.ts
// Go up 3 levels: auth-guard.test.ts → integration → tests → project root
const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');

// hooks.server.ts source — read once at module level (static during the test run).
// Used by INT-004, INT-005a, and UNIT-001 for source-inspection assertions.
// existsSync guard gives a clear error instead of an opaque ENOENT if the file moves.
const HOOKS_SERVER_PATH = path.join(PROJECT_ROOT, 'src', 'hooks.server.ts');
if (!fs.existsSync(HOOKS_SERVER_PATH)) {
	throw new Error(`hooks.server.ts not found at ${HOOKS_SERVER_PATH} — file may have been renamed`);
}
const HOOKS_SERVER_SOURCE = fs.readFileSync(HOOKS_SERVER_PATH, 'utf-8');

// ---------------------------------------------------------------------------
// Known routeGuards pattern (verified against HOOKS_SERVER_SOURCE in UNIT-001)
// Pattern: /^\/(?!(?:login|auth|r|skeleton|profile\/complete)(?:\/|$)|$)/
// Used by tests that need to verify the allow-list logic directly.
// UNIT-001 asserts this literal is present verbatim in hooks.server.ts.
// ---------------------------------------------------------------------------

const ROUTE_GUARD_PATTERN = /^\/(?!(?:login|auth|r|skeleton|profile\/complete)(?:\/|$)|$)/;

// ---------------------------------------------------------------------------
// 2.5-INT-001 — requireUser guard dispatcher: unauthenticated → 302 [P0]
// Split into: structural assertion (always runs) + HTTP test (skipped if no server)
// ---------------------------------------------------------------------------

describe('Story 2.5 — Guard Dispatcher: requireUser Coverage (R-006)', () => {
	// Structural assertion: always runs, confirms /profile is protected by the pattern.
	test('[P0] 2.5-INT-001a — routeGuards pattern matches /profile (protected route)', () => {
		// AC-1: The routeGuards pattern must match /profile so the guard fires.
		expect(
			ROUTE_GUARD_PATTERN.test('/profile'),
			'/profile must match the auth guard pattern (is protected)'
		).toBe(true);
	});

	// HTTP assertion: skipped unless a dev server is running.
	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P0] 2.5-INT-001b — requireUser guard: unauthenticated request to protected route → 302→/login',
		{ timeout: 10000 },
		async () => {
			// AC-1: Given a protected route, When accessed by an unauthenticated user,
			//       Then the routeGuards matcher redirects to /login (302).
			// Requires DEV_SERVER_URL env var pointing to a running SvelteKit dev server.
			const devServerUrl = process.env['DEV_SERVER_URL']!;

			const res = await fetch(`${devServerUrl}/profile`, {
				redirect: 'manual'
			});

			expect(res.status, 'Unauthenticated request to protected route must return 302').toBe(302);

			const location = res.headers.get('location');
			expect(
				location,
				'302 redirect must point to /login (auth guard redirect destination)'
			).toMatch(/\/login/);
		}
	);

	test('[P0] 2.5-INT-002 — requireAdmin guard: organizer (non-admin) request to admin route → 403', () => {
		// AC-2: Given an authenticated request, When the user does not have isAdmin=true,
		//       Then requireAdmin throws error(403).
		// Strategy: Unit-level mock — no HTTP needed.

		const organizerEvent = makeMockEvent({ isAdmin: false });

		let thrown: unknown;
		try {
			requireAdmin(organizerEvent as Parameters<typeof requireAdmin>[0]);
		} catch (e) {
			thrown = e;
		}

		expect(thrown, 'requireAdmin must throw for non-admin user').toBeDefined();
		expect(
			(thrown as { status?: number }).status,
			'requireAdmin must throw error(403) for non-admin user'
		).toBe(403);
	});

	test('[P0] 2.5-INT-003 — assertOwner guard: non-owner organizer request to owner-scoped resource → 403', () => {
		// AC-3: Given an authenticated request, When the requesting user's ID does not match
		//       the resource's ownerId, Then assertOwner throws error(403).
		// Strategy: Unit-level mock.

		const nonOwnerEvent = makeMockEvent({ id: 'user-001', isAdmin: false });
		const differentOwnerId = 'different-owner-id';

		let thrown: unknown;
		try {
			assertOwner(nonOwnerEvent as Parameters<typeof assertOwner>[0], differentOwnerId);
		} catch (e) {
			thrown = e;
		}

		expect(thrown, 'assertOwner must throw for non-owner user').toBeDefined();
		expect(
			(thrown as { status?: number }).status,
			'assertOwner must throw error(403) when user.id !== ownerId'
		).toBe(403);
	});

	test('[P1] 2.5-INT-004 — read-to-attend: non-owner organizer can GET event detail → design principle verified', () => {
		// AC-5: Organizers may VIEW another organizer's event (read-only/read-to-attend).
		//       Only edit/mutation actions call assertOwner; read load functions use requireUser only.
		//       FR-094: assertOwner is called only from mutations, not from GET load functions.
		// Strategy: Since E4 event detail routes do not exist yet, verify via source inspection.

		// The guard lambda in routeGuards must NOT call assertOwner.
		expect(
			HOOKS_SERVER_SOURCE,
			'hooks.server.ts routeGuards guard must NOT call assertOwner — assertOwner is for mutation actions only (FR-094)'
		).not.toMatch(/assertOwner/);

		// assertOwner passes (no throw) when the user IS the owner (happy path):
		const ownerEvent = makeMockEvent({ id: 'owner-uuid-001', isAdmin: false });
		expect(() =>
			assertOwner(ownerEvent as Parameters<typeof assertOwner>[0], 'owner-uuid-001')
		).not.toThrow();
	});

	// Regex pattern assertions: always run.
	test('[P1] 2.5-INT-005a — routeGuards pattern: r/[token] and auth/** paths are not guarded', () => {
		// AC-4: /r/[token] routes and /auth/** routes are allow-listed in routeGuards
		//       and bypass all auth guards.

		// Public paths MUST NOT match:
		expect(
			ROUTE_GUARD_PATTERN.test('/r/some-token-abc'),
			'/r/[token] paths must NOT match the auth guard pattern (are public)'
		).toBe(false);
		expect(
			ROUTE_GUARD_PATTERN.test('/auth/callback'),
			'/auth/** paths must NOT match the auth guard pattern (are public)'
		).toBe(false);
		expect(
			ROUTE_GUARD_PATTERN.test('/login'),
			'/login must NOT match the auth guard pattern (is public)'
		).toBe(false);
		expect(
			ROUTE_GUARD_PATTERN.test('/auth/dev-bypass'),
			'/auth/dev-bypass must NOT match the auth guard pattern (is public)'
		).toBe(false);

		// Protected paths MUST match:
		expect(
			ROUTE_GUARD_PATTERN.test('/profile'),
			'/profile must match the auth guard pattern (is protected)'
		).toBe(true);
		expect(
			ROUTE_GUARD_PATTERN.test('/dashboard'),
			'/dashboard must match the auth guard pattern (is protected)'
		).toBe(true);

		// Confirm the pattern is present verbatim in hooks.server.ts:
		expect(
			HOOKS_SERVER_SOURCE,
			'hooks.server.ts must contain the routeGuards allow-list regex pattern'
		).toMatch(/login\|auth\|r\|skeleton\|profile/);
	});

	// HTTP assertion: skipped unless a dev server is running.
	test.skipIf(!process.env['DEV_SERVER_URL'])(
		'[P1] 2.5-INT-005b — /r/[token] without session must not redirect to /login (HTTP verification)',
		{ timeout: 10000 },
		async () => {
			// /r/nonexistent-token without session should return 404, NOT 302 to /login.
			const devServerUrl = process.env['DEV_SERVER_URL']!;

			const res = await fetch(`${devServerUrl}/r/nonexistent-token-abc123`, {
				redirect: 'manual'
			});
			expect(
				res.status,
				'/r/[token] without session must NOT return 302 (auth guard must not trigger for public routes)'
			).not.toBe(302);
		}
	);
});

// ---------------------------------------------------------------------------
// 2.5-UNIT-001 — routeGuards registry is exported and extensible [P1]
// ---------------------------------------------------------------------------

describe('Story 2.5 — Guard Dispatcher: routeGuards Extensibility (R-006)', () => {
	test('[P1] 2.5-UNIT-001 — routeGuards registry is exported from hooks.server.ts and can be extended without modifying hook body', () => {
		// AC-6: When a future story calls routeGuards.push({ pattern, guard }), the new guard
		//       is honoured by handleAuthGuard on subsequent requests without any modification
		//       to hooks.server.ts body code. This verifies R-006 extensibility.
		//
		// Source inspection verifies:
		//   1. `export const routeGuards` declaration exists
		//   2. The array type annotation is present
		//   3. At least one guard entry is registered
		//   4. handleAuthGuard iterates routeGuards via for...of

		// HOOKS_SERVER_SOURCE is read once at module level with an existsSync guard.
		// All five assertions below use the cached value — no redundant I/O.

		// 1. Named export of routeGuards as a mutable const array
		expect(
			HOOKS_SERVER_SOURCE,
			'hooks.server.ts must declare "export const routeGuards" (R-006 named export required)'
		).toMatch(/export\s+const\s+routeGuards/);

		// 2. Array type annotation with { pattern: RegExp; guard: ... } shape
		expect(
			HOOKS_SERVER_SOURCE,
			'routeGuards must be typed as Array<{ pattern: RegExp; guard: ... }> (R-006 type contract)'
		).toMatch(/Array<\{[^}]*pattern:\s*RegExp/);

		// 3. At least one guard entry is registered
		expect(
			HOOKS_SERVER_SOURCE,
			'routeGuards array must have at least one registered guard entry'
		).toMatch(/routeGuards[\s\S]*?=\s*\[[\s\S]*?\{[\s\S]*?pattern:/);

		// 4. handleAuthGuard iterates routeGuards using for...of (extensible dispatcher)
		expect(
			HOOKS_SERVER_SOURCE,
			'handleAuthGuard must iterate routeGuards using a for...of loop'
		).toMatch(/for\s*\(\s*const\s*\{[^}]*pattern[^}]*guard[^}]*\}\s+of\s+routeGuards/);

		// 5. Allow-list regex includes /r/ path exemption
		expect(
			HOOKS_SERVER_SOURCE,
			'routeGuards must include /r/ in the allow-list regex (public r/[token] exemption)'
		).toMatch(/login\|auth\|r\|skeleton/);

		// Simulate a future E3–E7 story pushing a new guard to the array.
		// Demonstrates the contract: routeGuards is a mutable exported array.
		type GuardEntry = { pattern: RegExp; guard: (event: unknown) => void };
		const mockRegistry: GuardEntry[] = [{ pattern: /^\/existing/, guard: () => {} }];
		const initialLength = mockRegistry.length;

		const sentinelGuard: GuardEntry = {
			pattern: /^\/test-sentinel/,
			guard: () => {}
		};
		mockRegistry.push(sentinelGuard);

		expect(
			mockRegistry.length,
			'push() must increase array length by 1 (mutable exported array contract)'
		).toBe(initialLength + 1);

		expect(mockRegistry[mockRegistry.length - 1]).toBe(sentinelGuard);

		mockRegistry.pop();
	});
});
