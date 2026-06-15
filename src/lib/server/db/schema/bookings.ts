import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

// Custom type for tstzrange — no native Drizzle support
const tstzrange = customType<{ data: string }>({
	dataType() {
		return 'tstzrange';
	}
});

export const bookings = pgTable('bookings', {
	// UUID v7 — time-ordered, non-enumerable (architecture §Naming Patterns)
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	roomId: text('room_id').notNull(),
	organizerId: text('organizer_id').notNull(),
	eventName: text('event_name').notNull(),
	agenda: text('agenda'),
	during: tstzrange('during').notNull(),
	status: text('status').notNull().default('active'),
	cateringEnabled: boolean('catering_enabled').notNull().default(false),
	registrationEnabled: boolean('registration_enabled').notNull().default(false),
	registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }),
	registrationToken: text('registration_token').unique(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type BookingInsert = typeof bookings.$inferInsert;
