/**
 * ATDD Red-Phase Scaffolds — Story 1.7: Docker & Deployment Skeleton
 * Unit tests for `src/lib/server/env.ts` — validateEnv() fail-fast validation.
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test.
 *   2. Run: `bun run test -- src/lib/server/env.test.ts`
 *      Verify it FAILS first (red — validateEnv does not exist yet).
 *   3. Implement `src/lib/server/env.ts` with the validateEnv() function.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * Scenario IDs align with test-design-epic-1.md (Story 1.7 section).
 */

import { describe, test, expect, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Spy on process.exit so tests can assert it was called without actually
 *  terminating the process. Restored after each test. */
function mockProcessExit() {
	return vi.spyOn(process, 'exit').mockImplementation((_code?: string | number | null | undefined) => {
		// do nothing — prevent actual process exit during tests
		return undefined as never;
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// P0 — Task 6: validateEnv() — fail-fast on missing required vars
// AC-2: "When a required runtime secret (e.g. DATABASE_URL) is missing from
//        the environment, Then the web/worker process exits immediately at
//        startup with a clear error message (fail-fast)."
// ---------------------------------------------------------------------------

describe('Story 1.7 — env.ts: validateEnv() (ATDD Red Phase)', () => {
	// -----------------------------------------------------------------------
	// 1.7-UNIT-001 (P0): valid env passes without exit
	// -----------------------------------------------------------------------
	test.skip('[P0] 1.7-UNIT-001 — valid env with DATABASE_URL passes without calling process.exit', async () => {
		// THIS TEST WILL FAIL — src/lib/server/env.ts does not exist yet.
		// Activate after Task 6 (create validateEnv in src/lib/server/env.ts).
		const { validateEnv } = await import('./env.js');

		const exitSpy = mockProcessExit();

		validateEnv({
			DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/conference_envocc',
			PORT: '3000',
			HOST: '0.0.0.0'
		});

		expect(exitSpy).not.toHaveBeenCalled();
	});

	// -----------------------------------------------------------------------
	// 1.7-UNIT-002 (P0): missing DATABASE_URL triggers process.exit(1)
	// -----------------------------------------------------------------------
	test.skip('[P0] 1.7-UNIT-002 — missing DATABASE_URL calls process.exit(1)', async () => {
		// THIS TEST WILL FAIL — src/lib/server/env.ts does not exist yet.
		// Activate after Task 6 (create validateEnv in src/lib/server/env.ts).
		const { validateEnv } = await import('./env.js');

		const exitSpy = mockProcessExit();
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		validateEnv({
			// DATABASE_URL intentionally omitted
			PORT: '3000',
			HOST: '0.0.0.0'
		});

		expect(exitSpy).toHaveBeenCalledWith(1);
		// Error message must mention the missing variable clearly
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL'));
	});

	// -----------------------------------------------------------------------
	// 1.7-UNIT-003 (P0): empty string DATABASE_URL is treated as missing
	// -----------------------------------------------------------------------
	test.skip('[P0] 1.7-UNIT-003 — empty string DATABASE_URL calls process.exit(1)', async () => {
		// THIS TEST WILL FAIL — src/lib/server/env.ts does not exist yet.
		// Activate after Task 6.
		const { validateEnv } = await import('./env.js');

		const exitSpy = mockProcessExit();
		vi.spyOn(console, 'error').mockImplementation(() => {});

		validateEnv({ DATABASE_URL: '' });

		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	// -----------------------------------------------------------------------
	// 1.7-UNIT-004 (P1): optional PORT/HOST default to '3000'/'0.0.0.0'
	// -----------------------------------------------------------------------
	test.skip('[P1] 1.7-UNIT-004 — PORT and HOST are optional (default values applied)', async () => {
		// THIS TEST WILL FAIL — src/lib/server/env.ts does not exist yet.
		// Activate after Task 6.
		const { validateEnv } = await import('./env.js');

		const exitSpy = mockProcessExit();

		// Only DATABASE_URL provided — PORT and HOST should use defaults
		validateEnv({ DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test_db' });

		expect(exitSpy).not.toHaveBeenCalled();
	});

	// -----------------------------------------------------------------------
	// 1.7-UNIT-005 (P1): completely empty env object triggers exit(1)
	// -----------------------------------------------------------------------
	test.skip('[P1] 1.7-UNIT-005 — completely empty env calls process.exit(1)', async () => {
		// THIS TEST WILL FAIL — src/lib/server/env.ts does not exist yet.
		// Activate after Task 6.
		const { validateEnv } = await import('./env.js');

		const exitSpy = mockProcessExit();
		vi.spyOn(console, 'error').mockImplementation(() => {});

		validateEnv({});

		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	// -----------------------------------------------------------------------
	// 1.7-UNIT-006 (P1): error message is informative (startup banner prefix)
	// -----------------------------------------------------------------------
	test.skip('[P1] 1.7-UNIT-006 — error message contains [startup] prefix for clarity', async () => {
		// THIS TEST WILL FAIL — src/lib/server/env.ts does not exist yet.
		// Activate after Task 6.
		const { validateEnv } = await import('./env.js');

		mockProcessExit();
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		validateEnv({});

		expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/\[startup\]/));
	});
});
