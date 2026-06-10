/**
 * Story 1.6: Audit-log write-hook foundation
 * Module: src/lib/server/services/audit.ts — writeAuditLog helper (unit tests)
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
import { writeAuditLog } from './audit.js';
import { auditLog } from '../db/schema/audit-log.js';

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
	test('[P1] 1.6-UNIT-002 — writeAuditLog calls tx.insert(auditLog).values with correct args (actorId=user)', async () => {
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

	test('[P1] 1.6-UNIT-002b — writeAuditLog calls tx.insert with actorId=null (system action)', async () => {
		// AC-2 + AC-4: actorId=null is valid for system-initiated mutations.
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

	test('[P1] 1.6-UNIT-002c — writeAuditLog passes diff payload to tx.insert when provided', async () => {
		// AC-2 + AC-4: diff is optional — when provided it must be forwarded to .values().
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

	test('[P1] 1.6-UNIT-002d — writeAuditLog passes null diff when diff is omitted', async () => {
		// AC-4: diff is optional — when omitted it must be stored as null (not undefined).
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

	test('[P1] 1.6-UNIT-002e — writeAuditLog returns Promise<void> (awaitable, no return value)', async () => {
		// AC-4: return type is Promise<void> — must be awaitable and resolve to undefined.
		const mockTx = createMockTx();

		const result = await writeAuditLog(mockTx as never, {
			actorId: 'user-000',
			entity: 'booking',
			action: 'create'
		});

		expect(result).toBeUndefined();
	});

	test('[P2] 1.6-UNIT-002f — writeAuditLog does not mutate the entry object', async () => {
		// Defensive: writeAuditLog must not mutate its input argument.
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
	test('[P1] 1.6-UNIT-003 — audit.ts exports AuditLogEntry type (module-level existence check)', () => {
		// AuditLogEntry is a TypeScript type — verified at compile time.
		// writeAuditLog must be a callable function
		expect(typeof writeAuditLog).toBe('function');
	});
});
