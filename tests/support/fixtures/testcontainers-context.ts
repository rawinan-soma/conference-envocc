/**
 * Testcontainers setup for Story 1.8 integration tests.
 *
 * TDD RED PHASE: This file provides the Testcontainers setup for local
 * development integration testing. Full implementation will be completed
 * in Task 2.3 during Story 1.8 implementation.
 *
 * Dual-mode operation:
 *   - CI: DATABASE_URL is already set via GitHub Actions postgres service.
 *         Testcontainers is NOT started — the function is a no-op.
 *   - Local dev: DATABASE_URL is not set.
 *         Testcontainers starts an ephemeral postgres:17 container.
 *
 * Usage (called from tests/support/integration-setup.ts globalSetup):
 *   const teardown = await setupTestcontainerPostgres();
 *   // ... run tests ...
 *   await teardown();
 *
 * Dependencies (added in Task 2.1):
 *   - @testcontainers/postgresql — PostgreSqlContainer
 *   - testcontainers — base package
 *
 * Note: This module must be importable even before @testcontainers/postgresql
 * is installed — the import is guarded by the DATABASE_URL check so CI
 * environments without testcontainers can still load the module.
 */

import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// setupTestcontainerPostgres
// ---------------------------------------------------------------------------

/**
 * Starts a temporary PostgreSQL 17 container if DATABASE_URL is not already set.
 * Sets process.env.DATABASE_URL for the test process.
 *
 * Returns a teardown function that stops the container. In CI mode (DATABASE_URL
 * already set), the teardown is a no-op.
 *
 * @returns Teardown function to call after all tests complete
 */
export async function setupTestcontainerPostgres(): Promise<() => Promise<void>> {
	// CI mode: DATABASE_URL is provided by GitHub Actions postgres service
	// Skip Testcontainers entirely — do not import the package at all
	if (process.env['DATABASE_URL']) {
		console.log(
			'[testcontainers-context] DATABASE_URL already set — using CI Postgres service, skipping Testcontainers'
		);
		return async () => {
			// No-op teardown in CI mode
		};
	}

	// Local dev mode: Start a temporary PostgreSQL container
	console.log(
		'[testcontainers-context] DATABASE_URL not set — starting Testcontainers Postgres...'
	);

	// Generate a random password at runtime — no credential literal in source
	const dbPassword = randomBytes(16).toString('hex');

	// Dynamic import to avoid loading testcontainers in CI (package may not be installed)
	// This will fail until Task 2.1 installs @testcontainers/postgresql
	const { PostgreSqlContainer } = await import('@testcontainers/postgresql');

	const container = await new PostgreSqlContainer('postgres:17')
		.withDatabase('test_db')
		.withUsername('postgres')
		.withPassword(dbPassword)
		.start();

	const connectionUrl = container.getConnectionUri();
	process.env['DATABASE_URL'] = connectionUrl;

	console.log(
		`[testcontainers-context] Postgres ready at ${connectionUrl.replace(/:[^:@]*@/, ':***@')}`
	);

	return async () => {
		console.log('[testcontainers-context] Stopping Testcontainers Postgres...');
		await container.stop();
		delete process.env['DATABASE_URL'];
	};
}
