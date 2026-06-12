// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { UserProfile } from '$lib/server/db/schema/profiles.js';
import type { Session, User } from '$lib/server/db/schema/auth.js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/**
			 * The authenticated user, or null if not authenticated.
			 * Populated by the Better Auth handler in hooks.server.ts.
			 */
			user: User | null;
			/**
			 * The current session, or null if not authenticated.
			 * Populated by the Better Auth handler in hooks.server.ts.
			 * Use this to check authentication status in load functions and actions.
			 */
			session: Session | null;
			/**
			 * Whether the current user has completed their profile.
			 * null = not authenticated; true = profile exists; false = profile not yet created.
			 * Populated by the Better Auth handler in hooks.server.ts (Story 2.3).
			 * Used by the profile completeness guard to redirect incomplete-profile users.
			 */
			profileComplete: boolean | null;
			/**
			 * The current user's profile row, or null if not yet created / not authenticated.
			 * Populated by the Better Auth handler in hooks.server.ts (Story 2.3).
			 * Available in all (app) route load functions via event.locals.userProfile —
			 * no additional DB query needed in individual routes.
			 */
			userProfile: UserProfile | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
