/**
 * ATDD Red-Phase Scaffolds — Story 1.8: Test Harness & CI
 * Integration Tests: DB Schema EXCLUDE Constraint (AC-2)
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
 *   1. Remove `test.skip(` → `test(` for each test below.
 *   2. Ensure Postgres is running (via Testcontainers or CI service).
 *   3. Run: `bun run test:integration` — verify it FAILS first (red).
 *   4. Implement Task 4.0 (schema.ts + 0000_init.sql with EXCLUDE).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-2: constraint-exists test asserts EXCLUDE constraint is present in migrated schema
 *   - AC-4: integration tests use real Postgres instance
 *
 * Scenario IDs:
 *   - 1.3-INT-001: EXCLUDE constraint exists in migrated schema
 *   - 1.3-INT-002: Overlapping tstzrange inserts raise error 23P01
 *   - 1.3-INT-003: Non-overlapping (back-to-back) ranges do NOT conflict
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - drizzle-kit migrate has run (via integration-setup.ts or CI step)
 *   - bookings table created with EXCLUDE USING gist (room_id WITH =, during WITH &&)
 *     WHERE (status != 'cancelled')
 *   - btree_gist extension loaded
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import pg from 'pg';

// ---------------------------------------------------------------------------
// Postgres client — uses DATABASE_URL from environment
// ---------------------------------------------------------------------------

let pool: pg.Pool;

beforeAll(async () => {
	// DATABASE_URL is set by integration-setup.ts (Testcontainers) or CI environment
	const databaseUrl = process.env['DATABASE_URL'];
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL not set — integration-setup.ts should have configured it via Testcontainers'
		);
	}
	pool = new pg.Pool({ connectionString: databaseUrl });
});

afterAll(async () => {
	if (pool) {
		await pool.end();
	}
});

// ---------------------------------------------------------------------------
// 1.3-INT-001 — EXCLUDE constraint exists in migrated schema (AC-2)
// ---------------------------------------------------------------------------

describe('Story 1.8 — DB Schema: EXCLUDE Constraint (AC-2)', () => {
	test('[P0] 1.3-INT-001 — EXCLUDE constraint exists on bookings table after migration', async () => {
		// THIS TEST WILL FAIL — schema.ts and migration not yet created (Task 4.0).
		// Activate after Task 4.0 + Task 4.1.
		//
		// Expected: drizzle-kit migrate creates the bookings table with
		//   EXCLUDE USING gist (room_id WITH =, during WITH &&) WHERE (status != 'cancelled')
		// This test blocks CI if the constraint is missing.

		// Note: information_schema.table_constraints does NOT include EXCLUDE constraints
		// (they are PostgreSQL-specific). Use pg_constraint with contype = 'x' instead.
		const result = await pool.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'bookings'::regclass
        AND contype = 'x'
    `);

		expect(
			result.rows.length,
			'No EXCLUDE constraint found on bookings table — migration may not have run or EXCLUDE clause is missing from SQL'
		).toBeGreaterThan(0);

		// Log the constraint name for traceability
		const constraintName = result.rows[0]?.conname;
		expect(constraintName, 'EXCLUDE constraint name must be a non-empty string').toBeTruthy();
	});

	test('[P0] 1.3-INT-002 — Overlapping tstzrange inserts for same room raise SQLSTATE 23P01', async () => {
		// THIS TEST WILL FAIL — bookings table does not exist yet (Task 4.0).
		// Activate after Task 4.0 + Task 4.1.
		//
		// Expected: PostgreSQL raises SQLSTATE 23P01 (exclusion violation)
		// when two rows have the same room_id and overlapping time ranges.

		const client = await pool.connect();

		try {
			await client.query('BEGIN');

			// Clean state for this test
			await client.query(`DELETE FROM bookings WHERE room_id = 'test-room-overlap-001'`);

			// Insert first booking: room-001, 10:00–11:00 UTC
			await client.query(`
        INSERT INTO bookings (room_id, during, status)
        VALUES (
          'test-room-overlap-001',
          tstzrange('2026-01-15 10:00:00+00', '2026-01-15 11:00:00+00', '[)'),
          'active'
        )
      `);

			// Insert second overlapping booking: room-001, 10:30–11:30 UTC (overlaps with first)
			// This MUST raise SQLSTATE 23P01 (exclusion_violation)
			let exclusionRaised = false;
			let errorCode: string | undefined;

			try {
				await client.query(`
          INSERT INTO bookings (room_id, during, status)
          VALUES (
            'test-room-overlap-001',
            tstzrange('2026-01-15 10:30:00+00', '2026-01-15 11:30:00+00', '[)'),
            'active'
          )
        `);
			} catch (err: unknown) {
				const pgErr = err as { code?: string };
				errorCode = pgErr.code;
				exclusionRaised = pgErr.code === '23P01';
			}

			expect(
				exclusionRaised,
				`Expected SQLSTATE 23P01 (exclusion_violation) but got: ${errorCode ?? 'no error'}`
			).toBe(true);
		} finally {
			// Always rollback — even if the assertion above throws — so the connection
			// is returned to the pool in a clean state (no aborted transaction).
			await client.query('ROLLBACK').catch(() => {});
			client.release();
		}
	});

	test('[P0] 1.3-INT-003 — Back-to-back non-overlapping ranges for same room do NOT conflict', async () => {
		// THIS TEST WILL FAIL — bookings table does not exist yet (Task 4.0).
		// Activate after Task 4.0 + Task 4.1.
		//
		// Expected: Half-open [) ranges allow back-to-back bookings without conflict.
		// 10:00–11:00 and 11:00–12:00 are adjacent, NOT overlapping in tstzrange [) semantics.

		const client = await pool.connect();

		try {
			await client.query('BEGIN');

			// Clean state for this test
			await client.query(`DELETE FROM bookings WHERE room_id = 'test-room-adjacent-001'`);

			// Insert first booking: room, 10:00–11:00 [) half-open
			await client.query(`
        INSERT INTO bookings (room_id, during, status)
        VALUES (
          'test-room-adjacent-001',
          tstzrange('2026-01-15 10:00:00+00', '2026-01-15 11:00:00+00', '[)'),
          'active'
        )
      `);

			// Insert second back-to-back booking: 11:00–12:00 — must NOT conflict
			let conflictRaised = false;

			try {
				await client.query(`
          INSERT INTO bookings (room_id, during, status)
          VALUES (
            'test-room-adjacent-001',
            tstzrange('2026-01-15 11:00:00+00', '2026-01-15 12:00:00+00', '[)'),
            'active'
          )
        `);
			} catch (err: unknown) {
				conflictRaised = true;
				const pgErr = err as { code?: string; message?: string };
				throw new Error(
					`Back-to-back bookings SHOULD NOT conflict but raised ${pgErr.code}: ${pgErr.message}`,
					{ cause: err }
				);
			}

			expect(
				conflictRaised,
				'Back-to-back bookings must NOT trigger EXCLUDE constraint (half-open [) semantics)'
			).toBe(false);
		} finally {
			// Always rollback — even if the assertion above throws — so the connection
			// is returned to the pool in a clean state (no aborted transaction).
			await client.query('ROLLBACK').catch(() => {});
			client.release();
		}
	});

	test('[P1] 1.3-INT-004 — Cancelled booking does not block overlapping active booking', async () => {
		// THIS TEST WILL FAIL — bookings table does not exist yet (Task 4.0).
		// Activate after Task 4.0 + Task 4.1.
		//
		// Expected: The EXCLUDE constraint has WHERE (status != 'cancelled') predicate.
		// A cancelled booking should NOT block a new active booking in the same time range.
		// This verifies the partial-index behavior of the predicate-scoped EXCLUDE constraint.

		const client = await pool.connect();

		try {
			await client.query('BEGIN');

			// Clean state for this test
			await client.query(`DELETE FROM bookings WHERE room_id = 'test-room-cancelled-001'`);

			// Insert a cancelled booking
			await client.query(`
        INSERT INTO bookings (room_id, during, status)
        VALUES (
          'test-room-cancelled-001',
          tstzrange('2026-01-15 14:00:00+00', '2026-01-15 15:00:00+00', '[)'),
          'cancelled'
        )
      `);

			// Insert an overlapping active booking — should NOT conflict because cancelled booking
			// is excluded from the constraint scope (WHERE status != 'cancelled')
			let conflictRaised = false;

			try {
				await client.query(`
          INSERT INTO bookings (room_id, during, status)
          VALUES (
            'test-room-cancelled-001',
            tstzrange('2026-01-15 14:00:00+00', '2026-01-15 15:00:00+00', '[)'),
            'active'
          )
        `);
			} catch (err: unknown) {
				conflictRaised = true;
				const pgErr = err as { code?: string; message?: string };
				throw new Error(
					`Cancelled booking should NOT block new active booking but raised ${pgErr.code}: ${pgErr.message}`,
					{ cause: err }
				);
			}

			expect(
				conflictRaised,
				'Cancelled booking should NOT block overlapping active booking (predicate-scoped EXCLUDE)'
			).toBe(false);
		} finally {
			// Always rollback — even if the assertion above throws — so the connection
			// is returned to the pool in a clean state (no aborted transaction).
			await client.query('ROLLBACK').catch(() => {});
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 1.8-INT-001 — Worker integration tests are active (AC-4)
// ---------------------------------------------------------------------------

describe('Story 1.8 — Worker Integration Tests Activated (AC-4)', () => {
	test('[P1] 1.8-INT-001 — src/worker.integration.test.ts has no test.skip() calls', async () => {
		// Activated: pg-boss API fixed (getQueueSize → getQueueStats, getJobs → findJobs)
		//
		// Verifies that the Story 1.5 RED-phase stubs have been activated in this story.

		const workerTestPath = path.join(process.cwd(), 'src', 'worker.integration.test.ts');
		expect(existsSync(workerTestPath), 'src/worker.integration.test.ts not found').toBe(true);

		const content = readFileSync(workerTestPath, 'utf-8');

		// Strip comments before counting so that activation-guide prose mentioning
		// `test.skip(` (e.g. "Remove `test.skip(` → `test(`") is not mistaken for a
		// real skipped test. Remove block comments, then line/JSDoc comments.
		const codeOnly = content
			.replace(/\/\*[\s\S]*?\*\//g, '') // block comments
			.replace(/^\s*\*.*$/gm, '') // JSDoc continuation lines
			.replace(/\/\/.*$/gm, ''); // line comments

		// After Task 3.1, there should be NO test.skip() calls — all 4 tests activated
		const skipCount = (codeOnly.match(/test\.skip\(/g) ?? []).length;
		expect(
			skipCount,
			`Found ${skipCount} test.skip() calls in worker.integration.test.ts — Task 3.1 must activate all tests`
		).toBe(0);
	});
});
