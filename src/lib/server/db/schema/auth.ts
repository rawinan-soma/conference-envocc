/**
 * Better Auth Drizzle schema — Story 2.1
 * Tables: users, sessions, accounts, verifications
 * Column names use camelCase to match Better Auth's default Drizzle adapter convention.
 */
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull().default(''),
	email: text('email').notNull().unique(),
	emailVerified: boolean('emailVerified').notNull().default(false),
	image: text('image'),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' })
});

export const accounts = pgTable('accounts', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

export const verifications = pgTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
