import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type * as schema from '../db/schema/index.js';
import { auditLog } from '../db/schema/audit-log.js';

// Matches the tx parameter inside db.transaction(async (tx) => { ... })
type DrizzleTransaction = PgTransaction<
	NodePgQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

export type AuditLogEntry = {
	actorId: string | null;
	entity: string;
	action: string;
	diff?: unknown;
};

export async function writeAuditLog(tx: DrizzleTransaction, entry: AuditLogEntry): Promise<void> {
	await tx.insert(auditLog).values({
		actorId: entry.actorId ?? null,
		entity: entry.entity,
		action: entry.action,
		diff: (entry.diff ?? null) as Record<string, unknown> | null
	});
}
