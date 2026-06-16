import type { DrizzleTransaction } from '../db/index.js';
import { auditLog } from '../db/schema/audit-log.js';

export type AuditLogEntry = {
	actorId: string | null;
	entity: string;
	action: string;
	diff?: unknown;
};

export async function writeAuditLog(tx: DrizzleTransaction, entry: AuditLogEntry): Promise<void> {
	await tx.insert(auditLog).values({
		actorId: entry.actorId,
		entity: entry.entity,
		action: entry.action,
		diff: entry.diff ?? null
	});
}
