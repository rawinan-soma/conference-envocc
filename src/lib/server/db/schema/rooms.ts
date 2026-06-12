/**
 * Drizzle schema for rooms table — Story 3.1
 *
 * Rooms are the bookable spaces managed by admins and selected by organizers
 * when creating bookings (Epic 4).
 *
 * Column naming convention note:
 *   This table uses camelCase column names (isActive, createdAt, updatedAt)
 *   to match the convention established by Better Auth tables and user_profiles
 *   (migrations 0002_better_auth.sql, 0004_user_profiles.sql).
 *
 * features is stored as text[] NOT NULL with default {} (empty array).
 * Allowed values: 'projector' | 'whiteboard' | 'vc' | 'tv' — validated at the service layer
 * via the RoomSchema Valibot schema.
 *
 * is_active is used as a soft-delete flag. A partial index (WHERE is_active = true)
 * is added manually to the generated migration (Task 1.3) to support the room-list
 * query used by the calendar/booking selector in Epic 4 (NFR-003 < 3s).
 */
import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const rooms = pgTable('rooms', {
	// UUID v7 — time-ordered, non-enumerable (architecture §Naming Patterns)
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text('name').notNull(),
	floor: text('floor').notNull(),
	capacity: integer('capacity').notNull(),
	// text[] stored as Postgres array; validated at service layer to ROOM_FEATURES values
	features: text('features').array().notNull().default([]),
	// Soft-delete flag — false hides the room from the bookable calendar (Story 3.3)
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
