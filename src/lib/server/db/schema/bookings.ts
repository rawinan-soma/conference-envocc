import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';

// Custom type for tstzrange — no native Drizzle support
const tstzrange = customType<{ data: string }>({
	dataType() {
		return 'tstzrange';
	}
});

// NOTE: The existing migration (drizzle/0000_init.sql) uses `id serial PRIMARY KEY`
// (integer). We match the actual DB column type here to avoid Drizzle type conflicts.
// The UUID v7 PK for bookings will be corrected in Epic 4 (Story 4.4).
export const bookings = pgTable('bookings', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	roomId: text('room_id').notNull(),
	during: tstzrange('during').notNull(),
	status: text('status').notNull().default('active')
});

export type BookingInsert = typeof bookings.$inferInsert;
