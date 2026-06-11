// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

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
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
