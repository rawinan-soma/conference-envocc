/**
 * Shared fixture: pg.Pool test factory for Story 1.8 integration tests.
 *
 * TDD RED PHASE: This file provides the minimal factory needed for
 * integration test scaffolds. Full implementation (migrations, truncation)
 * will be completed in Task 2.2 during Story 1.8 implementation.
 *
 * Usage:
 *   import { createPgFactory } from '../support/fixtures/pg-factory';
 *
 *   const { pool, cleanup } = await createPgFactory(process.env.DATABASE_URL!);
 *   // ... run tests ...
 *   await cleanup();
 *
 * Dependencies:
 *   - pg (already a production dependency in package.json)
 *   - drizzle-kit (devDependency — used via execSync for migrations)
 *   - DATABASE_URL set in environment (by Testcontainers or CI service)
 *
 * Note: This fixture does NOT import src/lib/server/db/index.ts — that module
 * is created in Task 4.0 and may not exist during early test runs.
 * Use raw pg.Pool here to avoid circular dependencies.
 */

import { execSync } from 'child_process';
import pg from 'pg';
import path from 'path';

// Project root — resolved relative to tests/support/fixtures/
export const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');

// ---------------------------------------------------------------------------
// Factory result type
// ---------------------------------------------------------------------------

export interface PgFactoryResult {
	/** Raw pg.Pool connected to the test database */
	pool: pg.Pool;
	/**
	 * Truncates all user tables between tests.
	 * Only truncates tables that exist — safe to call even if schema is partial.
	 */
	truncateAll: () => Promise<void>;
	/** Closes the pool and cleans up resources. Call in afterAll. */
	cleanup: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Tables to truncate between integration tests
// ---------------------------------------------------------------------------

/**
 * Tables managed by drizzle migrations — truncated for test isolation.
 * Order matters for FK constraints: truncate child tables before parent tables.
 * Better Auth tables: sessions → accounts → users (sessions/accounts FK to users).
 */
const TRUNCATABLE_TABLES = [
	// Better Auth tables (Story 2.1) — child tables before parent
	'sessions',
	'accounts',
	'verifications',
	// Application tables — child before parent (FK: user_profiles.userId → users.id)
	'user_profiles',
	'users',
	'bookings',
	'audit_log'
] as const;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CreatePgFactoryOptions {
	/**
	 * Skip running `drizzle-kit migrate` inside the factory.
	 * Set to `true` when the Vitest global setup (integration-setup.ts) already
	 * ran migrations — avoids a redundant second migration execution and the
	 * extra ~10-60s it adds to test startup.
	 *
	 * Default: false (runs migrations for standalone/non-global-setup usage).
	 */
	skipMigrations?: boolean;
}

// ---------------------------------------------------------------------------
// createPgFactory
// ---------------------------------------------------------------------------

/**
 * Creates a pg.Pool connected to the given database URL, optionally runs
 * drizzle-kit migrate, and returns helpers for test teardown and isolation.
 *
 * @param databaseUrl - PostgreSQL connection string (e.g. from Testcontainers or CI)
 * @param options - Optional configuration (see CreatePgFactoryOptions)
 * @returns PgFactoryResult with pool, truncateAll, and cleanup
 *
 * @throws Error if migrations fail (misconfigured schema or missing drizzle files)
 */
export async function createPgFactory(
	databaseUrl: string,
	options: CreatePgFactoryOptions = {}
): Promise<PgFactoryResult> {
	const { skipMigrations = false } = options;

	if (!skipMigrations) {
		// Run migrations before test suite starts
		// drizzle-kit reads drizzle.config.ts and applies all migrations in drizzle/
		execSync('bunx drizzle-kit migrate', {
			cwd: PROJECT_ROOT,
			env: { ...process.env, DATABASE_URL: databaseUrl },
			stdio: 'pipe',
			timeout: 60_000
		});
	}

	const pool = new pg.Pool({ connectionString: databaseUrl });

	// Verify connectivity
	const client = await pool.connect();
	await client.query('SELECT 1');
	client.release();

	const truncateAll = async (): Promise<void> => {
		const client = await pool.connect();
		try {
			for (const table of TRUNCATABLE_TABLES) {
				// Check if table exists before truncating (graceful for partial schema)
				const result = await client.query<{ exists: boolean }>(
					`SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = $1
          ) AS exists`,
					[table]
				);
				if (result.rows[0]?.exists) {
					await client.query(`TRUNCATE TABLE ${table} CASCADE`);
				}
			}
		} finally {
			client.release();
		}
	};

	const cleanup = async (): Promise<void> => {
		await pool.end();
	};

	return { pool, truncateAll, cleanup };
}
