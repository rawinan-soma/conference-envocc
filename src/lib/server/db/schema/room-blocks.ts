/**
 * Drizzle schema for room_blocks table — Story 3.4
 *
 * room_blocks stores time-range blocks placed by admins on rooms to mark
 * maintenance or reserved periods unavailable for booking.
 *
 * Column naming convention:
 *   snake_case in SQL (room_id, created_by, created_at) mapped to camelCase in TypeScript
 *   (roomId, createdBy, createdAt) via explicit column name arguments, consistent with rooms.ts.
 *
 * The EXCLUDE constraint (room_id WITH =, during WITH &&) prevents overlapping blocks
 * for the same room. This is enforced at the DB level via btree_gist (already enabled
 * in 0000_init.sql). Postgres error code 23P01 (exclusion_violation) is caught in the
 * service layer and surfaced as HTTP 422.
 *
 * See also: drizzle/0007_room_blocks.sql (hand-written — drizzle-kit generate fails for uuidv7)
 */
import { customType, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

import { rooms } from './rooms.js';

// Custom type for tstzrange — no native Drizzle support
// Follows bookings.ts pattern
const tstzrange = customType<{ data: string }>({
	dataType() {
		return 'tstzrange';
	}
});

export const roomBlocks = pgTable('room_blocks', {
	// UUID v7 — time-ordered, non-enumerable (architecture §Naming Patterns)
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	roomId: text('room_id')
		.notNull()
		.references(() => rooms.id, { onDelete: 'cascade' }),
	during: tstzrange('during').notNull(),
	reason: text('reason'),
	createdBy: text('created_by').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type RoomBlock = typeof roomBlocks.$inferSelect;
export type NewRoomBlock = typeof roomBlocks.$inferInsert;
