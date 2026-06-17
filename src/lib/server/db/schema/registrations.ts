import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { bookings } from './bookings.js';

export const registrations = pgTable(
	'registrations',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		bookingId: text('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		title: text('title').notNull(), // 'Mr' | 'Mrs' | 'Ms' | 'Other'
		titleOtherText: text('title_other_text'), // nullable; required when title='Other'
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		organization: text('organization').notNull(),
		email: text('email').notNull(),
		mealType: text('meal_type'), // nullable when cateringEnabled=false
		mealTypeOtherText: text('meal_type_other_text'), // nullable; required when mealType='Other'
		cancelTokenHash: text('cancel_token_hash'), // nullable — Story 5.4 sets to NULL after single use (AR-05); populated on insert
		status: text('status').notNull().default('registered'), // 'registered' | 'cancelled'
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		// Partial unique index: enforces one active hash per row; NULL (post-cancel) rows are exempt.
		// Matches drizzle/0011_cancel_token_hash_unique.sql — declared here so drizzle-kit
		// does not treat the index as unknown and drop it in future auto-generated migrations.
		uniqueIndex('registrations_cancel_token_hash_unique')
			.on(t.cancelTokenHash)
			.where(sql`${t.cancelTokenHash} is not null`)
	]
);

export type Registration = typeof registrations.$inferSelect;
export type RegistrationInsert = typeof registrations.$inferInsert;
