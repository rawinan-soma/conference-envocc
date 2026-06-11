import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const auditLog = pgTable('audit_log', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	actorId: text('actor_id'), // nullable — null = system
	entity: text('entity').notNull(), // e.g. 'booking', 'room'
	action: text('action').notNull(), // e.g. 'create', 'update', 'cancel'
	diff: jsonb('diff') // nullable — before/after JSON snapshot
});

export type AuditLogInsert = typeof auditLog.$inferInsert;
