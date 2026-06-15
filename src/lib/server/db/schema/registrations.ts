import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const registrations = pgTable('registrations', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	bookingId: text('booking_id').notNull(), // FK → bookings.id (enforced in SQL migration)
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
});

export type Registration = typeof registrations.$inferSelect;
export type RegistrationInsert = typeof registrations.$inferInsert;
