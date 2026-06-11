/**
 * Database schema — Story 1.8 (carry-forward from Story 1.3)
 *
 * Architecture AR-02:
 *  - Extension: btree_gist (required for EXCLUDE USING gist on non-gist types)
 *  - Bookings table with tstzrange and EXCLUDE constraint
 *  - Half-open ranges [start, end) — tstzrange(start, end, '[)')
 *  - Active-only predicate: WHERE (status != 'cancelled')
 *
 * Note: Drizzle ORM does not support EXCLUDE USING gist natively.
 * The EXCLUDE constraint is added via a hand-written SQL migration (drizzle/0000_init.sql).
 */

import { pgTable, text, serial } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Custom type: tstzrange (Postgres range type for timestamptz)
// ---------------------------------------------------------------------------

export const tstzrange = customType<{ data: string; driverData: string }>({
	dataType() {
		return 'tstzrange';
	}
});

// ---------------------------------------------------------------------------
// bookings table
// ---------------------------------------------------------------------------

export const bookings = pgTable('bookings', {
	id: serial('id').primaryKey(),
	roomId: text('room_id').notNull(),
	during: tstzrange('during').notNull(),
	status: text('status').notNull().default('active')
	// EXCLUDE constraint added via hand-written SQL in drizzle/0000_init.sql
	// EXCLUDE USING gist (room_id WITH =, during WITH &&) WHERE (status != 'cancelled')
});
