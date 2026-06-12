/**
 * Auth guard helpers — Story 2.1
 *
 * Exported functions used in SvelteKit load functions and form actions to enforce
 * authentication and authorization requirements.
 *
 * Usage:
 *   import { requireUser, requireAdmin, assertOwner } from '$lib/server/auth/guards';
 *
 *   // In +page.server.ts or +layout.server.ts load:
 *   const user = requireUser(event); // throws redirect(302, '/login') if unauthenticated
 *   const admin = requireAdmin(event); // throws error(403) if not admin
 *   assertOwner(event, booking.userId); // throws error(403) if not the owner
 */
import type { RequestEvent } from '@sveltejs/kit';

import { error, redirect } from '@sveltejs/kit';

import type { User } from '../db/schema/auth.js';

/**
 * Require an authenticated user session.
 * Throws redirect(302, '/login') if not authenticated or session is expired.
 *
 * @param event - SvelteKit RequestEvent
 * @returns The authenticated User
 */
export function requireUser(event: RequestEvent): User {
	const { session, user } = event.locals;

	if (!session || !user) {
		redirect(302, '/login');
	}

	// Check session expiry (defensive — Better Auth should handle this, but belt-and-suspenders)
	if (session.expiresAt < new Date()) {
		redirect(302, '/login');
	}

	return user;
}

/**
 * Require an authenticated admin user.
 * Throws redirect(302, '/login') if not authenticated.
 * Throws error(403) if authenticated but not an admin.
 *
 * @param event - SvelteKit RequestEvent
 * @returns The authenticated admin User
 */
export function requireAdmin(event: RequestEvent): User {
	const user = requireUser(event);

	if (!user.isAdmin) {
		error(403, 'Forbidden: admin access required');
	}

	return user;
}

/**
 * Assert that the current user is the owner of a resource.
 * Throws redirect(302, '/login') if not authenticated.
 * Throws error(403) if authenticated but not the owner.
 *
 * @param event - SvelteKit RequestEvent
 * @param ownerId - The ID of the resource owner
 */
export function assertOwner(event: RequestEvent, ownerId: string): void {
	const user = requireUser(event);

	if (user.id !== ownerId) {
		error(403, 'Forbidden: you do not own this resource');
	}
}
