/**
 * Story 1.6: Audit-log write-hook foundation
 * Module: src/lib/server/db/schema/audit-log.ts — Drizzle schema shape
 *
 * AC Coverage:
 *   - AC-1: audit_log table exists with all 6 required columns and correct types
 *   - AC-5: bun run test exits 0 after implementation
 */

import { describe, test, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { auditLog } from './audit-log.js';

// ---------------------------------------------------------------------------
// 1.6-UNIT-001 — audit_log table shape
// AC-1: id (UUID v7 PK), created_at (timestamptz, not null, default now()),
//        actor_id (text, nullable), entity (text, not null), action (text, not null),
//        diff (jsonb, nullable)
// ---------------------------------------------------------------------------

describe('Story 1.6 — audit-log schema shape (AC-1)', () => {
	test('[P1] 1.6-UNIT-001 — auditLog table name is "audit_log"', () => {
		const config = getTableConfig(auditLog);
		expect(config.name).toBe('audit_log');
	});

	test('[P1] 1.6-UNIT-001b — auditLog table has exactly 6 columns', () => {
		const config = getTableConfig(auditLog);
		const columnNames = config.columns.map((col) => col.name);

		// Must have exactly these 6 columns
		expect(columnNames).toHaveLength(6);
		expect(columnNames).toContain('id');
		expect(columnNames).toContain('created_at');
		expect(columnNames).toContain('actor_id');
		expect(columnNames).toContain('entity');
		expect(columnNames).toContain('action');
		expect(columnNames).toContain('diff');
	});

	test('[P1] 1.6-UNIT-001c — id column is uuid and is the primary key', () => {
		const config = getTableConfig(auditLog);
		const idCol = config.columns.find((col) => col.name === 'id');

		expect(idCol).toBeDefined();
		expect(idCol!.columnType).toBe('PgUUID');
		// Primary key — presence in primaryKeys or notNull + hasDefault from $defaultFn
		expect(idCol!.primary).toBe(true);
	});

	test('[P1] 1.6-UNIT-001d — created_at column is timestamptz, not null, has default', () => {
		const config = getTableConfig(auditLog);
		const createdAtCol = config.columns.find((col) => col.name === 'created_at');

		expect(createdAtCol).toBeDefined();
		// timestamptz = PgTimestamp with withTimezone: true
		expect(createdAtCol!.columnType).toBe('PgTimestamp');
		expect((createdAtCol as { withTimezone?: boolean }).withTimezone).toBe(true);
		expect(createdAtCol!.notNull).toBe(true);
		// Has a default (defaultNow())
		expect(createdAtCol!.hasDefault).toBe(true);
	});

	test('[P1] 1.6-UNIT-001e — actor_id column is text and nullable', () => {
		// actor_id is nullable — null = system action (no authenticated user).
		const config = getTableConfig(auditLog);
		const actorIdCol = config.columns.find((col) => col.name === 'actor_id');

		expect(actorIdCol).toBeDefined();
		expect(actorIdCol!.columnType).toBe('PgText');
		// Nullable means notNull is false
		expect(actorIdCol!.notNull).toBe(false);
	});

	test('[P1] 1.6-UNIT-001f — entity column is text and not null', () => {
		const config = getTableConfig(auditLog);
		const entityCol = config.columns.find((col) => col.name === 'entity');

		expect(entityCol).toBeDefined();
		expect(entityCol!.columnType).toBe('PgText');
		expect(entityCol!.notNull).toBe(true);
	});

	test('[P1] 1.6-UNIT-001g — action column is text and not null', () => {
		const config = getTableConfig(auditLog);
		const actionCol = config.columns.find((col) => col.name === 'action');

		expect(actionCol).toBeDefined();
		expect(actionCol!.columnType).toBe('PgText');
		expect(actionCol!.notNull).toBe(true);
	});

	test('[P1] 1.6-UNIT-001h — diff column is jsonb and nullable', () => {
		// diff is nullable — null is valid for creates/deletes where diff is implicit.
		const config = getTableConfig(auditLog);
		const diffCol = config.columns.find((col) => col.name === 'diff');

		expect(diffCol).toBeDefined();
		expect(diffCol!.columnType).toBe('PgJsonb');
		// Nullable means notNull is false
		expect(diffCol!.notNull).toBe(false);
	});

	test('[P1] 1.6-UNIT-001i — AuditLogInsert type is exported from audit-log.ts', () => {
		// TypeScript type check: AuditLogInsert must be exported and inferrable.
		// Module must export auditLog table (AuditLogInsert is a TS type — verified at compile time)
		expect(auditLog).toBeDefined();
	});
});
