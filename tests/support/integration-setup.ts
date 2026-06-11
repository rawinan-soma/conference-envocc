/**
 * Vitest global setup for the integration test project.
 *
 * TDD RED PHASE: This file is the global setup for the Vitest `integration`
 * project. It is referenced in vite.config.ts once the integration project
 * is added (Task 2.4).
 *
 * Responsibilities:
 *   1. Start Testcontainers Postgres if DATABASE_URL is not already set
 *      (local dev mode — see testcontainers-context.ts)
 *   2. In CI, DATABASE_URL is set by the GitHub Actions postgres service —
 *      Testcontainers is skipped entirely
 *
 * This function is called once before ALL integration tests run.
 * The returned teardown function is called once after ALL tests complete.
 *
 * Usage (in vite.config.ts integration project):
 *   globalSetup: './tests/support/integration-setup.ts'
 *
 * Note: Do NOT import this file directly in tests — it is a Vitest global setup.
 */

import { setupTestcontainerPostgres } from './fixtures/testcontainers-context.js';

// ---------------------------------------------------------------------------
// Vitest Global Setup
// ---------------------------------------------------------------------------

/**
 * Vitest global setup function.
 * Called once before the integration test suite starts.
 *
 * @returns Teardown function called after all integration tests complete.
 */
export default async function setup(): Promise<() => Promise<void>> {
	console.log('[integration-setup] Starting integration test global setup...');

	// Start Testcontainers if DATABASE_URL not provided (local dev mode)
	// In CI, this is a no-op — DATABASE_URL comes from the postgres service container
	const teardownTestcontainers = await setupTestcontainerPostgres();

	console.log(
		'[integration-setup] Global setup complete. DATABASE_URL:',
		process.env['DATABASE_URL'] ? 'set' : 'NOT SET (this is an error)'
	);

	if (!process.env['DATABASE_URL']) {
		throw new Error(
			'[integration-setup] DATABASE_URL is not set after setup. ' +
				'Testcontainers must set it, or provide DATABASE_URL in the environment.'
		);
	}

	// Return teardown function
	return async () => {
		console.log('[integration-setup] Running integration test global teardown...');
		await teardownTestcontainers();
		console.log('[integration-setup] Teardown complete.');
	};
}
