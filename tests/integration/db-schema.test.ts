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

// ---------------------------------------------------------------------------
// 3.4-UNIT-001 — room_blocks table + tstzrange column + EXCLUDE constraint exists [P1]
// ---------------------------------------------------------------------------

describe('Story 3.4 — DB Schema: room_blocks table, during tstzrange column, and EXCLUDE constraint (AC-1, AC-4)', () => {
	test('[P1] 3.4-UNIT-001 — room_blocks table exists with during tstzrange column and room_blocks_no_overlap EXCLUDE constraint after migration', async () => {
		// THIS TEST WILL FAIL — room_blocks table and migration not yet created (Task 1).
		// Activate after Task 1.1–1.3 (room-blocks.ts schema + drizzle/0006_room_blocks.sql migration
		// applied via bun run db:migrate).
		//
		// AC-1: block is persisted in room_blocks
		// AC-4: EXCLUDE constraint prevents two overlapping blocks for the same room
		//
		// Migration drizzle/0006_room_blocks.sql must:
		//   1. CREATE TABLE room_blocks with a 'during tstzrange NOT NULL' column
		//   2. ADD CONSTRAINT room_blocks_no_overlap EXCLUDE USING gist (room_id WITH =, during WITH &&)
		//
		// Strategy: direct DB assertions using pg_catalog — same pattern as 1.3-INT-001 (bookings EXCLUDE).

		// 1. Assert the room_blocks table exists
		const tableResult = await pool.query<{ exists: boolean }>(
			`SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'room_blocks'
      ) AS exists`
		);
		expect(
			tableResult.rows[0]?.exists,
			'room_blocks table must exist in the public schema — run migration drizzle/0006_room_blocks.sql'
		).toBe(true);

		// 2. Assert the during column has type tstzrange
		const columnResult = await pool.query<{ data_type: string; udt_name: string }>(
			`SELECT data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'room_blocks'
         AND column_name = 'during'`
		);
		expect(columnResult.rows.length, 'room_blocks.during column must exist').toBe(1);
		// PostgreSQL reports tstzrange as udt_name 'tstzrange' with data_type 'USER-DEFINED'
		expect(
			columnResult.rows[0]?.udt_name,
			"room_blocks.during column must have udt_name 'tstzrange'"
		).toBe('tstzrange');

		// 3. Assert the EXCLUDE constraint room_blocks_no_overlap exists
		const constraintResult = await pool.query<{ conname: string }>(
			`SELECT conname
       FROM pg_constraint
       WHERE conrelid = 'room_blocks'::regclass
         AND contype = 'x'`
		);
		expect(
			constraintResult.rows.length,
			'No EXCLUDE constraint found on room_blocks table — migration must include: ' +
				'ALTER TABLE room_blocks ADD CONSTRAINT room_blocks_no_overlap EXCLUDE USING gist (room_id WITH =, during WITH &&)'
		).toBeGreaterThan(0);

		const constraintName = constraintResult.rows[0]?.conname;
		expect(constraintName, "EXCLUDE constraint name must be 'room_blocks_no_overlap'").toBe(
			'room_blocks_no_overlap'
		);
	});
});

// ---------------------------------------------------------------------------
// 3.1-UNIT-002 — Partial index on rooms WHERE is_active = true exists [P1]
// ---------------------------------------------------------------------------

describe('Story 3.1 — DB Schema: Partial index on rooms (is_active) WHERE is_active = true (AC-1, R-009)', () => {
	test('[P1] 3.1-UNIT-002 — rooms table has a partial index WHERE is_active = true in migrated schema', async () => {
		// ACTIVE — Story 3.1 Task 1: rooms schema + migration with partial index created.
		//
		// From story dev notes Task 1.3:
		//   After generating the migration with `bun run db:generate`, manually add:
		//   CREATE INDEX idx_rooms_is_active ON rooms (id) WHERE is_active = true;
		//
		// Risk R-009: Room list query unindexed — sequential scan on large rooms table
		//   under org load risks NFR-003 < 3s threshold.
		//
		// Strategy: Query pg_indexes for the rooms table and assert an index
		//   with a WHERE clause referencing is_active = true exists.
		// Pattern: same pool-based assertion as the EXCLUDE constraint test above.

		const result = await pool.query<{ indexname: string; indexdef: string }>(
			`SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = 'rooms'
           AND indexdef ILIKE '%where%is_active%true%'`
		);

		expect(
			result.rows.length,
			'No partial index WHERE is_active = true found on rooms table — ' +
				'Task 1.3 requires manually adding the partial index to the migration SQL: ' +
				'CREATE INDEX idx_rooms_is_active ON rooms (id) WHERE is_active = true;'
		).toBeGreaterThan(0);

		const index = result.rows[0];
		expect(index?.indexname, 'Partial index must have a non-empty name').toBeTruthy();
		expect(index?.indexdef, 'Partial index definition must reference the rooms table').toContain(
			'rooms'
		);
	});
});
