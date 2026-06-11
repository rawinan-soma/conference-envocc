/**
 * Profile service — Story 2.3
 *
 * Provides createProfile, updateProfile, and getProfileByUserId.
 * All mutations wrap DB operations in a transaction that also writes an audit_log entry
 * (AC-8 / R-011 — audit on profile mutations).
 *
 * Email is always provided by the caller from event.locals.user.email (OIDC claim).
 * It must never come from form input.
 */
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import type { ProfileInput } from '$lib/schemas/profile.js';

import { db } from '../db/index.js';
import { userProfiles } from '../db/schema/profiles.js';
import type { UserProfile } from '../db/schema/profiles.js';
import { writeAuditLog } from './audit.js';

// ---------------------------------------------------------------------------
// getProfileByUserId
// ---------------------------------------------------------------------------

/**
 * Look up a user's profile by their user ID.
 * Returns null if no profile row exists (user has not yet completed their profile).
 * Used by hooks.server.ts to check profile completeness once per request.
 */
export async function getProfileByUserId(userId: string): Promise<UserProfile | null> {
	const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
	return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// createProfile
// ---------------------------------------------------------------------------

/**
 * Insert a new user_profiles row inside a transaction that also writes an audit_log entry.
 * Throws if the user already has a profile (userId UNIQUE constraint).
 *
 * @param userId  - The authenticated user's ID (from event.locals.user.id)
 * @param email   - OIDC email from event.locals.user.email (NOT from form input)
 * @param input   - Validated ProfileInput (title, firstName, lastName, phone, organization)
 */
export async function createProfile(
	userId: string,
	email: string,
	input: ProfileInput
): Promise<UserProfile> {
	return db.transaction(async (tx) => {
		const [profile] = await tx
			.insert(userProfiles)
			.values({
				id: uuidv7(), // UUID v7 — time-ordered, non-enumerable (architecture §Naming Patterns)
				userId,
				email,
				title: input.title,
				firstName: input.firstName,
				lastName: input.lastName,
				phone: input.phone,
				organization: input.organization
			})
			.returning();

		await writeAuditLog(tx, {
			actorId: userId,
			entity: 'user_profile',
			action: 'create',
			diff: {
				title: input.title,
				firstName: input.firstName,
				lastName: input.lastName,
				phone: input.phone,
				organization: input.organization
			}
		});

		return profile!;
	});
}

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

/**
 * Compute diff between existing profile and new input (only changed fields).
 */
function computeDiff(
	existing: UserProfile,
	input: ProfileInput
): Record<string, { old: string; new: string }> {
	const diff: Record<string, { old: string; new: string }> = {};
	const fields = ['title', 'firstName', 'lastName', 'phone', 'organization'] as const;
	for (const field of fields) {
		if (existing[field] !== input[field]) {
			diff[field] = { old: existing[field], new: input[field] };
		}
	}
	return diff;
}

/**
 * Update an existing user_profiles row inside a transaction that also writes an audit_log entry.
 * Email is NEVER updated — it remains the original OIDC-sourced value.
 *
 * @param userId   - The authenticated user's ID
 * @param existing - The existing UserProfile row (loaded by hooks or load function)
 * @param input    - Validated ProfileInput with updated values
 */
export async function updateProfile(
	userId: string,
	existing: UserProfile,
	input: ProfileInput
): Promise<UserProfile> {
	return db.transaction(async (tx) => {
		const diff = computeDiff(existing, input);

		const [profile] = await tx
			.update(userProfiles)
			.set({
				title: input.title,
				firstName: input.firstName,
				lastName: input.lastName,
				phone: input.phone,
				organization: input.organization,
				updatedAt: new Date() // Drizzle does NOT auto-update updatedAt — must be explicit
			})
			.where(eq(userProfiles.userId, userId))
			.returning();

		await writeAuditLog(tx, {
			actorId: userId,
			entity: 'user_profile',
			action: 'update',
			diff
		});

		return profile!;
	});
}
