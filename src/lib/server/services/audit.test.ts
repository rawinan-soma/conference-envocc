/**
 * ATDD Red-Phase Scaffolds — Story 1.6: Audit-log write-hook foundation
 * Module: src/lib/server/services/audit.ts — writeAuditLog helper (unit tests)
 *
 * TDD RED PHASE: Tests use test.skip() and will fail until the service module
 * is created. Activate task-by-task during implementation.
 *
 * Activation guide (Task 3 — create audit.ts service):
 *   1. Remove `test.skip(` → `test(` for the tests in this file.
 *   2. Run: `bun run test` — verify tests FAIL first (red).
 *   3. Implement src/lib/server/services/audit.ts with writeAuditLog.
 *   4. Run again — verify tests PASS (green).
 *   5. Commit passing tests.
 *
 * Strategy: Mock the Drizzle transaction (tx) object with vi.fn() spies.
 * No real database connection needed — pure unit test.
 *
 * AC Coverage:
 *   - AC-2: writeAuditLog calls tx.insert(auditLog).values(...) correctly
 *   - AC-4: writeAuditLog accepts (tx, entry) with correct types; rejects missing fields at TS level
 *   - AC-5: bun run test exits 0 after implementation
 */

import { describe, test, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factory for Drizzle transaction
// ---------------------------------------------------------------------------

/**
 * Creates a minimal Drizzle transaction mock with an insert spy.
 * The mock chains: tx.insert(table).values(data)
 * Both .insert() and .values() are vi.fn() returning the chain.
 */
function createMockTx() {
	const valuesSpy = vi.fn().mockResolvedValue(undefined);
	const insertSpy = vi.fn().mockReturnValue({ values: valuesSpy });

	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		insert: insertSpy as any,
		_spies: { insertSpy, valuesSpy }
	};
}

// ---------------------------------------------------------------------------
// 1.6-UNIT-002 — writeAuditLog: correct insert call with actorId set
// AC-2: When writeAuditLog(tx, entry) is called, it calls tx.insert(auditLog).values(...)
// ---------------------------------------------------------------------------

describe('Story 1.6 — writeAuditLog helper (AC-2, AC-4)', () => {
	test.skip('[P1] 1.6-UNIT-002 — writeAuditLog calls tx.insert(auditLog).values with correct args (actorId=user)', async () => {
		// THIS TEST WILL FAIL — audit.ts does not exist yet.
		// Activate after Task 3 (audit.ts created with writeAuditLog).
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});
		const { auditLog } = await import('../db/schema/audit-log.js').catch(() => {
			throw new Error('audit-log.ts not implemented yet — red phase');
		});

		const mockTx = createMockTx();

		await writeAuditLog(mockTx as never, {
			actorId: 'user-123',
			entity: 'booking',
			action: 'create'
		});

		// Must call tx.insert with the auditLog table
		expect(mockTx._spies.insertSpy).toHaveBeenCalledOnce();
		expect(mockTx._spies.insertSpy).toHaveBeenCalledWith(auditLog);

		// Must call .values with correct data
		expect(mockTx._spies.valuesSpy).toHaveBeenCalledOnce();
		const [insertedValues] = mockTx._spies.valuesSpy.mock.calls[0] as [Record<string, unknown>];
		expect(insertedValues.actorId).toBe('user-123');
		expect(insertedValues.entity).toBe('booking');
		expect(insertedValues.action).toBe('create');
	});

	test.skip('[P1] 1.6-UNIT-002b — writeAuditLog calls tx.insert with actorId=null (system action)', async () => {
		// THIS TEST WILL FAIL — audit.ts does not exist yet.
		// AC-2 + AC-4: actorId=null is valid for system-initiated mutations.
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});
		const { auditLog } = await import('../db/schema/audit-log.js').catch(() => {
			throw new Error('audit-log.ts not implemented yet — red phase');
		});

		const mockTx = createMockTx();

		await writeAuditLog(mockTx as never, {
			actorId: null,
			entity: 'room',
			action: 'deactivate'
		});

		expect(mockTx._spies.insertSpy).toHaveBeenCalledWith(auditLog);

		const [insertedValues] = mockTx._spies.valuesSpy.mock.calls[0] as [Record<string, unknown>];
		// actorId must be null (not undefined) — explicit null for system actions
		expect(insertedValues.actorId).toBeNull();
		expect(insertedValues.entity).toBe('room');
		expect(insertedValues.action).toBe('deactivate');
	});

	test.skip('[P1] 1.6-UNIT-002c — writeAuditLog passes diff payload to tx.insert when provided', async () => {
		// THIS TEST WILL FAIL — audit.ts does not exist yet.
		// AC-2 + AC-4: diff is optional — when provided it must be forwarded to .values().
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});

		const mockTx = createMockTx();
		const diffPayload = { before: { status: 'active' }, after: { status: 'cancelled' } };

		await writeAuditLog(mockTx as never, {
			actorId: 'user-456',
			entity: 'registration',
			action: 'cancel',
			diff: diffPayload
		});

		const [insertedValues] = mockTx._spies.valuesSpy.mock.calls[0] as [Record<string, unknown>];
		expect(insertedValues.diff).toEqual(diffPayload);
	});

	test.skip('[P1] 1.6-UNIT-002d — writeAuditLog passes null diff when diff is omitted', async () => {
		// THIS TEST WILL FAIL — audit.ts does not exist yet.
		// AC-4: diff is optional — when omitted it must be stored as null (not undefined).
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});

		const mockTx = createMockTx();

		await writeAuditLog(mockTx as never, {
			actorId: 'user-789',
			entity: 'booking',
			action: 'update'
			// diff intentionally omitted
		});

		const [insertedValues] = mockTx._spies.valuesSpy.mock.calls[0] as [Record<string, unknown>];
		// diff must be null (not undefined) to satisfy Drizzle's jsonb column expectations
		expect(insertedValues.diff).toBeNull();
	});

	test.skip('[P1] 1.6-UNIT-002e — writeAuditLog returns Promise<void> (awaitable, no return value)', async () => {
		// THIS TEST WILL FAIL — audit.ts does not exist yet.
		// AC-4: return type is Promise<void> — must be awaitable and resolve to undefined.
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});

		const mockTx = createMockTx();

		const result = await writeAuditLog(mockTx as never, {
			actorId: 'user-000',
			entity: 'booking',
			action: 'create'
		});

		expect(result).toBeUndefined();
	});

	test.skip('[P2] 1.6-UNIT-002f — writeAuditLog does not mutate the entry object', async () => {
		// THIS TEST WILL FAIL — audit.ts does not exist yet.
		// Defensive: writeAuditLog must not mutate its input argument.
		const { writeAuditLog } = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});

		const mockTx = createMockTx();
		const entry = {
			actorId: 'user-123',
			entity: 'booking',
			action: 'create',
			diff: { foo: 'bar' }
		};
		const originalEntry = { ...entry, diff: { ...entry.diff } };

		await writeAuditLog(mockTx as never, entry);

		// Entry object must be unchanged after the call
		expect(entry).toEqual(originalEntry);
	});
});

// ---------------------------------------------------------------------------
// 1.6-UNIT-003 — AuditLogEntry type export
// AC-4: AuditLogEntry type must be exported and have correct shape
// ---------------------------------------------------------------------------

describe('Story 1.6 — AuditLogEntry type export (AC-4)', () => {
	test.skip('[P1] 1.6-UNIT-003 — audit.ts exports AuditLogEntry type (module-level existence check)', async () => {
		// THIS TEST WILL FAIL — audit.ts does not exist yet.
		// AuditLogEntry is a TypeScript type — verified at compile time.
		// This test verifies that audit.ts exports both writeAuditLog and can be imported.
		const auditModule = await import('./audit.js').catch(() => {
			throw new Error('audit.ts not implemented yet — red phase');
		});

		// writeAuditLog must be a callable function
		expect(typeof auditModule.writeAuditLog).toBe('function');
	});
});
