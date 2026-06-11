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
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// integration-setup.ts lives at tests/support/integration-setup.ts
// go up 3 levels: integration-setup.ts → support → tests → project root
const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');

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

	// Apply migrations so all tests see the fully-migrated schema
	console.log('[integration-setup] Running drizzle-kit migrate...');
	try {
		execSync('bunx drizzle-kit migrate', {
			cwd: PROJECT_ROOT,
			env: { ...process.env },
			stdio: 'pipe',
			timeout: 60_000
		});
	} catch (err: unknown) {
		const e = err as { stderr?: Buffer; stdout?: Buffer; message?: string };
		const detail = (e.stderr?.toString() ?? '') || (e.stdout?.toString() ?? '') || String(e.message ?? err);
		throw new Error(`[integration-setup] drizzle-kit migrate failed:\n${detail}`);
	}
	console.log('[integration-setup] Migrations applied.');

	// Return teardown function
	return async () => {
		console.log('[integration-setup] Running integration test global teardown...');
		await teardownTestcontainers();
		console.log('[integration-setup] Teardown complete.');
	};
}
