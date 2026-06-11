/**
 * Drizzle schema for user_profiles table — Story 2.3
 *
 * Column names use camelCase to match the convention set by Better Auth tables
 * (users, sessions, accounts, verifications) in 0002_better_auth.sql.
 *
 * Email is sourced from the OIDC claim at profile creation time and stored
 * read-only. It must never be updated via the profile form — only the IdP governs it.
 */
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

import { users } from './auth.js';

export const userProfiles = pgTable('user_profiles', {
	// $defaultFn ensures the application layer always generates a UUID v7 (time-ordered).
	// Without this, an insert that omits id falls back to the SQL DEFAULT gen_random_uuid()
	// which produces a UUID v4, violating the architecture's UUID v7 requirement.
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	userId: text('userId')
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	title: text('title').notNull(),
	firstName: text('firstName').notNull(),
	lastName: text('lastName').notNull(),
	phone: text('phone').notNull(),
	organization: text('organization').notNull(),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
