/**
 * Shared Mock Event Helper — Auth Guard Tests
 *
 * Provides a minimal mock RequestEvent with controlled user and session in locals.
 * Used by unit-level guard tests (auth-guard.test.ts, roles.test.ts) to test
 * requireUser / requireAdmin / assertOwner without a real HTTP server or DB.
 *
 * Design:
 *   - Fixed timestamps are used throughout — never clock-sensitive
 *   - MOCK_SESSION_EXPIRES_AT is far-future to ensure requireUser's expiry check passes
 *   - userOverrides=null produces an unauthenticated event (user=null, session=null)
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 */

/**
 * Fixed timestamps — deterministic, never clock-sensitive.
 * Using a far-future session expiry ensures requireUser's expiry check always
 * passes for mock sessions regardless of when the test suite runs.
 */
export const MOCK_TIMESTAMP = new Date('2026-01-01T00:00:00.000Z');
export const MOCK_SESSION_EXPIRES_AT = new Date('2099-12-31T23:59:59.000Z');

/**
 * Build a minimal mock RequestEvent with controlled user and session in locals.
 *
 * @param userOverrides - Fields to spread onto the default user object.
 *   Pass `null` to simulate an unauthenticated request (user=null, session=null).
 */
export function makeMockEvent(userOverrides: Record<string, unknown> | null): {
	locals: {
		user: Record<string, unknown> | null;
		session: { expiresAt: Date } | null;
	};
} {
	if (userOverrides === null) {
		return { locals: { user: null, session: null } };
	}
	return {
		locals: {
			user: {
				id: 'test-user-uuid-001',
				name: 'Test User',
				email: 'testuser@envocc.test',
				emailVerified: true,
				image: null,
				createdAt: MOCK_TIMESTAMP,
				updatedAt: MOCK_TIMESTAMP,
				isAdmin: false,
				...userOverrides
			},
			session: {
				expiresAt: MOCK_SESSION_EXPIRES_AT
			}
		}
	};
}
