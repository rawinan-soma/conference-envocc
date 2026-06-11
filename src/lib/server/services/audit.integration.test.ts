/**
 * Story 1.6: Audit-log write-hook foundation
 * Integration Test: writeAuditLog commit + rollback atomicity
 *
 * These tests require a real Postgres connection at DATABASE_URL.
 * They are skipped until Story 1.8 (Test Harness & CI) wires Postgres
 * into the CI environment.
 *
 * Activation guide (Story 1.8+):
 *   1. Remove `test.skip(` → `test(` for each test below.
 *   2. Ensure Postgres is running (via docker compose or CI services).
 *   3. Set DATABASE_URL in the test environment.
 *   4. Run: `bun run test` — verify tests PASS (green).
 *
 * AC Coverage:
 *   - AC-2: audit_log row is written atomically in the same transaction
 *   - AC-3: audit_log row is NOT persisted when the transaction rolls back
 */

import { describe, test, expect } from 'vitest';

// ---------------------------------------------------------------------------
// 1.6-INT-001 — Commit path: row persists after transaction commits
// AC-2: Given a running transaction, when writeAuditLog(tx, entry) is called
//        and the transaction commits, then the audit_log row is visible.
// ---------------------------------------------------------------------------

describe('writeAuditLog integration', () => {
	test.skip('[P1] 1.6-INT-001 — writes audit_log row atomically in committed transaction (AC-2)', async () => {
		// Activate in Story 1.8 when CI services are wired.
		//
		// AC-2: Given a running transaction,
		//       When writeAuditLog(tx, entry) is called inside that transaction,
		//       Then an audit_log row is written atomically (only visible after commit).

		const { db } = await import('../db/index.js').catch(() => {
			throw new Error('db/index.ts not implemented yet — red phase');
		});
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});
		const { auditLog } = await import('../db/schema/audit-log.js').catch(() => {
			throw new Error('audit-log.ts not implemented yet — red phase');
		});
		const { eq } = await import('drizzle-orm').catch(() => {
			throw new Error('drizzle-orm not installed — red phase');
		});

		// Use a unique actorId to avoid collisions when tests run in parallel or db has prior data
		const testActorId = `commit-test-${crypto.randomUUID()}`;
		let insertedId: string | undefined;

		await db.transaction(async (tx) => {
			await writeAuditLog(tx, {
				actorId: testActorId,
				entity: 'booking',
				action: 'create'
			});

			// Row must be visible inside the same transaction before commit
			const rowsInTx = await tx.select().from(auditLog).where(eq(auditLog.actorId, testActorId));
			expect(rowsInTx).toHaveLength(1);
			insertedId = rowsInTx[0].id;
		});

		// After commit: row must persist in the database
		expect(insertedId).toBeDefined();
		const rowsAfterCommit = await db.select().from(auditLog).where(eq(auditLog.id, insertedId!));
		expect(rowsAfterCommit).toHaveLength(1);
		expect(rowsAfterCommit[0].entity).toBe('booking');
		expect(rowsAfterCommit[0].action).toBe('create');

		// Cleanup — remove the test row to avoid polluting subsequent tests
		await db.delete(auditLog).where(eq(auditLog.id, insertedId!));
	});

	test.skip('[P1] 1.6-INT-002 — no audit_log row persists when transaction rolls back (AC-3)', async () => {
		// Activate in Story 1.8 when CI services are wired.
		//
		// AC-3: Given a transaction that calls writeAuditLog(tx, entry) and is then rolled back,
		//       When the transaction rolls back,
		//       Then no audit_log row is persisted — the audit write is atomic with the change.

		const { db } = await import('../db/index.js').catch(() => {
			throw new Error('db/index.ts not implemented yet — red phase');
		});
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});
		const { auditLog } = await import('../db/schema/audit-log.js').catch(() => {
			throw new Error('audit-log.ts not implemented yet — red phase');
		});
		const { eq } = await import('drizzle-orm').catch(() => {
			throw new Error('drizzle-orm not installed — red phase');
		});

		// Use a unique actorId for this test to isolate cleanup
		const testActorId = `rollback-test-${crypto.randomUUID()}`;
		let capturedId: string | undefined;

		try {
			await db.transaction(async (tx) => {
				await writeAuditLog(tx, {
					actorId: testActorId,
					entity: 'room',
					action: 'deactivate'
				});

				// Capture the ID inside the transaction before rollback
				const rows = await tx.select().from(auditLog).where(eq(auditLog.actorId, testActorId));
				capturedId = rows[rows.length - 1]?.id;

				// Intentionally throw to trigger rollback
				throw new Error('intentional rollback — AC-3 test');
			});
		} catch {
			// Expected — the intentional rollback error is caught here
		}

		// After rollback: the row must NOT be in the database
		if (capturedId) {
			const rowsAfterRollback = await db.select().from(auditLog).where(eq(auditLog.id, capturedId));
			expect(rowsAfterRollback).toHaveLength(0);
		}

		// Also verify by actorId — no rows for this test's actorId
		const rowsByActorId = await db.select().from(auditLog).where(eq(auditLog.actorId, testActorId));
		expect(rowsByActorId).toHaveLength(0);
	});

	test.skip('[P1] 1.6-INT-003 — writeAuditLog stores diff payload correctly in jsonb column (AC-2, AC-4)', async () => {
		// Activate in Story 1.8 when CI services are wired.
		//
		// AC-2 + AC-4: diff (jsonb, nullable) — when provided, the full JSON object
		//              is stored and can be retrieved with full fidelity.

		const { db } = await import('../db/index.js').catch(() => {
			throw new Error('db/index.ts not implemented yet — red phase');
		});
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});
		const { auditLog } = await import('../db/schema/audit-log.js').catch(() => {
			throw new Error('audit-log.ts not implemented yet — red phase');
		});
		const { eq } = await import('drizzle-orm').catch(() => {
			throw new Error('drizzle-orm not installed — red phase');
		});

		const testActorId = `diff-test-${crypto.randomUUID()}`;
		const diffPayload = {
			before: { status: 'pending', capacity: 50 },
			after: { status: 'confirmed', capacity: 50 }
		};

		let insertedId: string | undefined;

		await db.transaction(async (tx) => {
			await writeAuditLog(tx, {
				actorId: testActorId,
				entity: 'booking',
				action: 'update',
				diff: diffPayload
			});

			const rows = await tx.select().from(auditLog).where(eq(auditLog.actorId, testActorId));
			insertedId = rows[0]?.id;
		});

		expect(insertedId).toBeDefined();
		const rows = await db.select().from(auditLog).where(eq(auditLog.id, insertedId!));
		expect(rows).toHaveLength(1);
		expect(rows[0].diff).toEqual(diffPayload);

		// Cleanup
		await db.delete(auditLog).where(eq(auditLog.id, insertedId!));
	});
});
