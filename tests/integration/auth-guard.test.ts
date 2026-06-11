/**
 * ATDD Red-Phase Scaffolds — Story 2.1 / 2.5: Auth Guard Dispatcher
 * Integration Tests: routeGuards registry extensibility (R-006)
 *
 * TDD RED PHASE: All tests are marked test.skip() or test.todo() and will remain
 * so until the developer activates them task-by-task during implementation.
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
 *   4. Implement the feature (per task in story 2.5).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - Story 2.1 AC-5: Auth guard must cover all (app) routes (guard dispatcher foundation)
 *   - Story 2.5 AC: routeGuards registry is exported and extensible (R-006)
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.5-INT-001: requireUser guard: unauthenticated request → 302→/login [P0] — stub (test.todo)
 *   - 2.5-UNIT-001: routeGuards registry is exported and extensible [P1] — stub (test.todo)
 *
 * Story 2.5 Dependency:
 *   This file is created in Story 2.1 to establish the file path and pattern.
 *   The actual guard dispatcher tests activate when Story 2.5 is implemented.
 *   The 2.5 dev agent must activate these stubs rather than creating new test files.
 *
 * Architecture Requirement R-006:
 *   hooks.server.ts must define routeGuards as an exported, typed array/map that
 *   callers can push new entries into without modifying the hook itself.
 *   Pattern:
 *     export const routeGuards: Array<{ pattern: RegExp; guard: (event) => void }> = [
 *       { pattern: /^\/(app)\//, guard: (event) => requireUser(event) },
 *     ];
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 */

import { describe, test } from 'vitest';

// ---------------------------------------------------------------------------
// 2.5-INT-001 — requireUser guard dispatcher: unauthenticated → 302 [P0]
// (Activates when Story 2.5 guard dispatcher is implemented)
// ---------------------------------------------------------------------------

describe('Story 2.5 — Guard Dispatcher: requireUser Coverage (R-006)', () => {
	// test.todo marks this as a planned test — visible in reports, not counted as failure
	// The Story 2.5 dev agent must activate this to a real test.skip() with assertions.
	test.todo(
		'[P0] 2.5-INT-001 — requireUser guard: unauthenticated request to protected route → 302→/login'
	);

	// Additional guard dispatcher tests to be activated in Story 2.5:
	test.todo(
		'[P0] 2.5-INT-002 — requireAdmin guard: organizer (non-admin) request to admin route → 403'
	);

	test.todo(
		'[P0] 2.5-INT-003 — assertOwner guard: non-owner organizer request to owner-scoped resource → 403/404'
	);

	test.todo(
		'[P1] 2.5-INT-004 — read-to-attend: non-owner organizer can GET another organizer\'s event detail → 200'
	);

	test.todo(
		'[P1] 2.5-INT-005 — Public r/[token] routes skip auth guards (accessible without session)'
	);
});

// ---------------------------------------------------------------------------
// 2.5-UNIT-001 — routeGuards registry is exported and extensible [P1]
// (Activates when Story 2.5 guard dispatcher is implemented)
// ---------------------------------------------------------------------------

describe('Story 2.5 — Guard Dispatcher: routeGuards Extensibility (R-006)', () => {
	test.todo(
		'[P1] 2.5-UNIT-001 — routeGuards registry is exported from hooks.server.ts and can be extended without modifying hook body'
	);
});

// ---------------------------------------------------------------------------
// 2.1-INT-001 stub — guard foundation established in Story 2.1 [P0]
// Full guard coverage (all (app) routes) verified in Story 2.5 dispatcher tests above.
// See auth.test.ts for the primary 2.1-INT-001 implementation.
// ---------------------------------------------------------------------------

// No additional stubs needed here — 2.1-INT-001 is fully implemented in auth.test.ts.
// This file is the designated home for all guard dispatcher and routeGuards tests.
