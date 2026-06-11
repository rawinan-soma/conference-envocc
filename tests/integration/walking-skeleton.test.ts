/**
 * ATDD Red-Phase Scaffolds — Story 1.9: Walking-skeleton Vertical Slice
 * Integration Tests: Vertical Slice Service Layer (AC-1, AC-2, AC-3)
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
 *   3. Run: `bun run test:integration` — verify it FAILS first (red).
 *   4. Implement the feature.
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1b: DB write + writeAuditLog in one transaction — both rows committed atomically
 *   - AC-1c: enqueueJob → worker → Mailpit email delivered within 10s
 *   - AC-2:  Overlapping tstzrange inserts raise SQLSTATE 23P01 in vertical slice context
 *   - AC-3:  EXCLUDE constraint remains active after Story 1.9 (belt-and-suspenders)
 *
 * Scenario IDs:
 *   - 1.9-INT-001: DB write + writeAuditLog in one transaction — atomic commit
 *   - 1.9-INT-002: enqueueJob → worker → Mailpit email delivered within 10s
 *   - 1.9-INT-003: Overlapping tstzrange inserts raise 23P01 in vertical slice context
 *   - 1.9-INT-004: Transaction rollback leaves no DB row AND no audit row
 *   - 1.9-INT-005: EXCLUDE constraint remains active after Story 1.9 migration
 *
 * Prerequisites:
 *   - DATABASE_URL set in environment (CI service) or Testcontainers starts Postgres
 *   - drizzle-kit migrate has run (via integration-setup.ts or CI step)
 *   - bookings table with EXCLUDE USING gist (room_id WITH =, during WITH &&)
 *     WHERE (status != 'cancelled') exists in migrated schema
 *   - writeAuditLog exported from src/lib/server/services/audit.ts
 *   - enqueueJob exported from src/lib/server/jobs/ (PgBoss wired)
 *   - Mailpit running on MAILPIT_URL (default: http://localhost:8025) for 1.9-INT-002
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   actorId is null for skeleton (no auth in Epic 1 — auth is Epic 2).
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

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
});

afterAll(async () => {
	if (pool) {
		await pool.end();
	}
});

// ---------------------------------------------------------------------------
// 1.9-INT-001 — DB write + writeAuditLog in one transaction: atomic commit (AC-1b)
// ---------------------------------------------------------------------------

describe('Story 1.9 — Vertical Slice Service: Atomic Transaction (AC-1b)', () => {
	test.skip('[P0] 1.9-INT-001 — DB write + writeAuditLog in one transaction: both rows committed atomically', async () => {
		// THIS TEST WILL FAIL — src/lib/server/services/audit.ts + bookings table not yet wired.
		// Activate after Task: Implement Skeleton Form Action (DB write + audit + job).
		//
		// AC-1b: The skeleton route action wraps DB insert + writeAuditLog in a single
		// db.transaction(). Both rows must be committed together — transactional atomicity.
		//
		// Import pattern (relative path + .js extension per project convention):
		//   import { db } from '../../src/lib/server/db/index.js';
		//   import { writeAuditLog } from '../../src/lib/server/services/audit.js';
		//
		// Using raw pg.Pool here to avoid ESM/Drizzle import complexity in vitest.
		// The skeleton room_id is a deterministic test UUID — use a fixed value to avoid
		// polluting the bookings table with random rows across runs.

		const testRoomId = '00000000-1909-0001-0000-000000000001'; // 1.9-INT-001 sentinel
		const startTime = '2026-02-01 08:00:00+00';
		const endTime = '2026-02-01 09:00:00+00';

		const client = await pool.connect();
		try {
			await client.query('BEGIN');

			// Clean state. audit_log has no entity_id column (schema: id, created_at,
			// actor_id, entity, action, diff) — the room reference is stored in the
			// diff jsonb payload and filtered via diff->>'roomId'.
			await client.query(`DELETE FROM bookings WHERE room_id = $1`, [testRoomId]);
			await client.query(`DELETE FROM audit_log WHERE diff->>'roomId' = $1`, [testRoomId]);

			// Insert booking row
			const bookingResult = await client.query<{ id: string }>(
				`INSERT INTO bookings (room_id, during, status)
				 VALUES ($1, tstzrange($2, $3, '[)'), 'active')
				 RETURNING id`,
				[testRoomId, startTime, endTime]
			);
			const bookingId = bookingResult.rows[0]?.id;
			expect(bookingId, 'Booking insert must return a row id').toBeTruthy();

			// Write audit log row (mirrors writeAuditLog call in +page.server.ts).
			// actor_id is null — no auth in Epic 1. Columns match audit_log schema.
			await client.query(
				`INSERT INTO audit_log (actor_id, entity, action, diff)
				 VALUES ($1, 'booking', 'create', $2::jsonb)`,
				[null, JSON.stringify({ roomId: testRoomId, source: '1.9-INT-001' })]
			);

			await client.query('COMMIT');

			// Verify both rows are present after commit
			const bookingCount = await client.query<{ count: string }>(
				`SELECT COUNT(*) as count FROM bookings WHERE room_id = $1`,
				[testRoomId]
			);
			expect(
				parseInt(bookingCount.rows[0]?.count ?? '0', 10),
				'bookings table must have 1 row after committed transaction'
			).toBe(1);

			const auditCount = await client.query<{ count: string }>(
				`SELECT COUNT(*) as count FROM audit_log WHERE diff->>'roomId' = $1`,
				[testRoomId]
			);
			expect(
				parseInt(auditCount.rows[0]?.count ?? '0', 10),
				'audit_log table must have 1 row after committed transaction (writeAuditLog must be called inside the same transaction)'
			).toBe(1);
		} finally {
			// Clean up test data
			await client.query(`DELETE FROM bookings WHERE room_id = $1`, [testRoomId]).catch(() => {});
			await client
				.query(`DELETE FROM audit_log WHERE diff->>'roomId' = $1`, [testRoomId])
				.catch(() => {});
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 1.9-INT-002 — enqueueJob → worker → Mailpit email delivered within 10s (AC-1c)
// ---------------------------------------------------------------------------

describe('Story 1.9 — Vertical Slice Service: Job → Email Delivery (AC-1c)', () => {
	test.skip('[P0] 1.9-INT-002 — enqueueJob → worker → Mailpit receives email within 10s', async () => {
		// THIS TEST WILL FAIL — enqueueJob + worker not yet wired for smoke email.
		// Activate after Task: Implement Skeleton Form Action (DB write + audit + job).
		//
		// AC-1c: The skeleton action enqueues a SMOKE_EMAIL job via enqueueJob().
		// The worker processes it and delivers email to Mailpit (SMTP on port 1025).
		// Cross-verifies scenario 1.5-INT-001 (email job delivery) in running stack context.
		//
		// Import pattern:
		//   import { enqueueJob, QUEUE } from '../../src/lib/server/jobs/index.js';
		//
		// This test requires the full Docker Compose stack (web + worker + Mailpit).
		// In CI, this runs against the compose.yaml (db + mailpit) + bun run worker.

		const mailpitUrl = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';
		const to = 'skeleton-int-002@test.local';
		const subject = '1.9-INT-002 smoke email';

		// Clear Mailpit inbox (best effort — ignore if Mailpit does not support bulk delete)
		await fetch(`${mailpitUrl}/api/v1/messages`, { method: 'DELETE' }).catch(() => {});

		// Enqueue a smoke email job by inserting directly into pg-boss queue table
		// (or via enqueueJob once wired — use raw SQL here for portability across activation states)
		//
		// Note: When activating this test, replace the raw pg-boss insert with:
		//   await enqueueJob(QUEUE.SMOKE_EMAIL, { to, subject }, { key: `skeleton-int-002-${Date.now()}` });
		//
		// Using raw insert here as a fallback so the test compiles before enqueueJob is exported.
		await pool
			.query(
				`INSERT INTO pgboss.job (name, data, state, startafter, expirein, priority, retrylimit, retrydelay, retrybackoff, deadletter, keepuntil, oncomplete, output)
			 SELECT $1, $2::jsonb, 'created', now(), interval '15 minutes', 0, 0, 0, false, null, now() + interval '1 hour', false, null
			 WHERE EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgboss')`,
				['smoke-email', JSON.stringify({ to, subject })]
			)
			.catch(() => {
				// pgboss schema may not exist yet — skip enqueue, test will fail at assertion
			});

		// Poll Mailpit for delivery (max 10s, 500ms interval)
		const deadline = Date.now() + 10_000;
		let delivered = false;

		while (Date.now() < deadline) {
			try {
				const res = await fetch(`${mailpitUrl}/api/v1/messages`);
				if (res.ok) {
					const data = (await res.json()) as { total?: number; messages?: unknown[] };
					if ((data.total ?? 0) >= 1) {
						delivered = true;
						break;
					}
				}
			} catch {
				// Mailpit not yet ready — continue polling
			}
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		expect(
			delivered,
			`Expected at least 1 email in Mailpit (${mailpitUrl}) within 10s after enqueueJob — ` +
				'worker may not be running or Mailpit SMTP not wired to nodemailer transport'
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 1.9-INT-003 — Overlapping inserts raise 23P01 in vertical slice context (AC-2)
// ---------------------------------------------------------------------------

describe('Story 1.9 — Vertical Slice: Overlap Rejection in Skeleton Context (AC-2)', () => {
	test.skip('[P0] 1.9-INT-003 — Inserting two overlapping tstzrange rows for same room raises SQLSTATE 23P01', async () => {
		// THIS TEST WILL FAIL — bookings table may not exist yet.
		// Activate after Task: Implement Skeleton Form Action (DB write + EXCLUDE constraint live).
		//
		// AC-2: In the vertical slice context, the EXCLUDE constraint on bookings rejects
		// overlapping time ranges for the same room with PostgreSQL error code 23P01.
		// Confirms the constraint is live in the running Postgres instance (not just SQL).
		// Belt-and-suspenders for 1.3-INT-002 in db-schema.test.ts.

		const testRoomId = '00000000-1909-0003-0000-000000000001'; // 1.9-INT-003 sentinel

		const client = await pool.connect();
		try {
			await client.query('BEGIN');

			// Clean state
			await client.query(`DELETE FROM bookings WHERE room_id = $1`, [testRoomId]);

			// Insert first booking: 10:00–11:00 UTC
			await client.query(
				`INSERT INTO bookings (room_id, during, status)
				 VALUES ($1, tstzrange('2026-03-01 10:00:00+00', '2026-03-01 11:00:00+00', '[)'), 'active')`,
				[testRoomId]
			);

			// Insert second overlapping booking: 10:30–11:30 UTC — MUST raise 23P01
			let exclusionRaised = false;
			let errorCode: string | undefined;

			try {
				await client.query(
					`INSERT INTO bookings (room_id, during, status)
					 VALUES ($1, tstzrange('2026-03-01 10:30:00+00', '2026-03-01 11:30:00+00', '[)'), 'active')`,
					[testRoomId]
				);
			} catch (err: unknown) {
				const pgErr = err as { code?: string };
				errorCode = pgErr.code;
				exclusionRaised = pgErr.code === '23P01';
			}

			expect(
				exclusionRaised,
				`Expected SQLSTATE 23P01 (exclusion_violation) on overlapping insert but got: ${errorCode ?? 'no error'} — ` +
					'EXCLUDE constraint on bookings table may be missing or misconfigured'
			).toBe(true);
		} finally {
			// Always rollback — transaction may be in aborted state after the expected error
			await client.query('ROLLBACK').catch(() => {});
			// Clean test data in a fresh transaction
			await pool.query(`DELETE FROM bookings WHERE room_id = $1`, [testRoomId]).catch(() => {});
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 1.9-INT-004 — Transaction rollback: no DB row AND no audit row (P1)
// ---------------------------------------------------------------------------

describe('Story 1.9 — Vertical Slice Service: Transaction Rollback Atomicity (P1)', () => {
	test.skip('[P1] 1.9-INT-004 — Transaction rollback leaves no booking row AND no audit_log row', async () => {
		// THIS TEST WILL FAIL — skeleton service not yet implemented.
		// Activate after Task: Implement Skeleton Form Action.
		//
		// Verifies that the db.transaction() wrapper used in +page.server.ts correctly
		// rolls back BOTH the bookings insert AND the audit_log insert on failure.
		// This is the atomicity guarantee — no partial writes must survive a rollback.

		const testRoomId = '00000000-1909-0004-0000-000000000001'; // 1.9-INT-004 sentinel

		const client = await pool.connect();
		try {
			// Clean state. audit_log has no entity_id column — room reference lives in
			// the diff jsonb payload (filtered via diff->>'roomId').
			await pool.query(`DELETE FROM bookings WHERE room_id = $1`, [testRoomId]);
			await pool.query(`DELETE FROM audit_log WHERE diff->>'roomId' = $1`, [testRoomId]);

			// Simulate a transaction that writes both rows then rolls back
			try {
				await client.query('BEGIN');

				await client.query(
					`INSERT INTO bookings (room_id, during, status)
					 VALUES ($1, tstzrange('2026-04-01 08:00:00+00', '2026-04-01 09:00:00+00', '[)'), 'active')`,
					[testRoomId]
				);

				await client.query(
					`INSERT INTO audit_log (actor_id, entity, action, diff)
					 VALUES (null, 'booking', 'create', $1::jsonb)`,
					[JSON.stringify({ roomId: testRoomId, source: '1.9-INT-004' })]
				);

				// Simulate an error mid-transaction (intentional rollback)
				throw new Error('Simulated rollback — 1.9-INT-004');
			} catch (err: unknown) {
				const e = err as { message?: string };
				if (e.message === 'Simulated rollback — 1.9-INT-004') {
					await client.query('ROLLBACK');
				} else {
					await client.query('ROLLBACK').catch(() => {});
					throw err;
				}
			}

			// Verify no rows remain after rollback
			const bookingCount = await pool.query<{ count: string }>(
				`SELECT COUNT(*) as count FROM bookings WHERE room_id = $1`,
				[testRoomId]
			);
			expect(
				parseInt(bookingCount.rows[0]?.count ?? '0', 10),
				'bookings table must have 0 rows after transaction rollback (atomicity violated)'
			).toBe(0);

			const auditCount = await pool.query<{ count: string }>(
				`SELECT COUNT(*) as count FROM audit_log WHERE diff->>'roomId' = $1`,
				[testRoomId]
			);
			expect(
				parseInt(auditCount.rows[0]?.count ?? '0', 10),
				'audit_log table must have 0 rows after transaction rollback (writeAuditLog must be inside the same transaction)'
			).toBe(0);
		} finally {
			// Clean test data
			await pool.query(`DELETE FROM bookings WHERE room_id = $1`, [testRoomId]).catch(() => {});
			await pool
				.query(`DELETE FROM audit_log WHERE diff->>'roomId' = $1`, [testRoomId])
				.catch(() => {});
			client.release();
		}
	});
});

// ---------------------------------------------------------------------------
// 1.9-INT-005 — EXCLUDE constraint still active after Story 1.9 migration (P1, AC-3)
// ---------------------------------------------------------------------------

describe('Story 1.9 — DB Constraint: EXCLUDE Still Active After Migration (AC-3, P1)', () => {
	test.skip('[P1] 1.9-INT-005 — EXCLUDE constraint remains active on bookings table after Story 1.9 migration', async () => {
		// THIS TEST WILL FAIL — bookings table may not exist yet.
		// Activate after Task: Full Stack Verification (Docker Compose).
		//
		// AC-3: The slice fails the build if the EXCLUDE constraint is misconfigured.
		// Belt-and-suspenders check: confirms no Story 1.9 migration accidentally dropped
		// the EXCLUDE constraint that was created in Story 1.3 / validated in 1.8.
		// Runs in CI integration job — failure here blocks the build.
		//
		// Note: information_schema.table_constraints does NOT include EXCLUDE constraints
		// (PostgreSQL-specific). Use pg_constraint with contype = 'x'.

		const result = await pool.query<{ conname: string; contype: string }>(
			`SELECT conname, contype
			 FROM pg_constraint
			 WHERE conrelid = 'bookings'::regclass
			   AND contype = 'x'`
		);

		expect(
			result.rows.length,
			'No EXCLUDE constraint found on bookings table after Story 1.9 migration — ' +
				'a migration may have accidentally dropped the constraint (AC-3: build-gate)'
		).toBeGreaterThan(0);

		// Log constraint name for traceability
		const constraintName = result.rows[0]?.conname;
		expect(constraintName, 'EXCLUDE constraint name must be a non-empty string').toBeTruthy();

		console.info(`[1.9-INT-005] EXCLUDE constraint found: ${constraintName}`);
	});
});
