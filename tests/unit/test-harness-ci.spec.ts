/**
 * ATDD Red-Phase Scaffolds — Story 1.8: Test Harness & CI
 * Unit / Static Quality Gate Tests
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test.
 *   2. Run: `bun run test` — verify it FAILS first (red).
 *   3. Implement the feature.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: CI runs lint + typecheck + Vitest + Playwright + build + image + vuln scan
 *   - AC-5: GitHub Actions CI workflow runs on PR and fails on gate failure
 *
 * Scenario IDs align with test-design-epic-1.md.
 */

import { test, expect, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd());

// ---------------------------------------------------------------------------
// 1.8-UNIT-001 — CI workflow file exists (AC-5)
// ---------------------------------------------------------------------------

describe('Story 1.8 — GitHub Actions CI Workflow (AC-5)', () => {
	test('[P1] 1.8-UNIT-001 — .github/workflows/ci.yml exists', () => {
		// THIS TEST WILL FAIL — .github/workflows/ci.yml does not exist yet.
		// Activate after Task 7.1 (ci.yml created).
		const ciPath = path.join(PROJECT_ROOT, '.github', 'workflows', 'ci.yml');
		expect(existsSync(ciPath), '.github/workflows/ci.yml not found').toBe(true);
	});

	test('[P1] 1.8-UNIT-002 — ci.yml contains required jobs', () => {
		// THIS TEST WILL FAIL — ci.yml does not exist yet.
		// Activate after Task 7.1.
		const ciPath = path.join(PROJECT_ROOT, '.github', 'workflows', 'ci.yml');
		expect(existsSync(ciPath), '.github/workflows/ci.yml not found').toBe(true);

		const ciContent = readFileSync(ciPath, 'utf-8');

		// Must have quality gate job
		expect(ciContent, 'quality job missing from ci.yml').toContain('quality');

		// Must have test-unit job
		expect(ciContent, 'test-unit job missing from ci.yml').toContain('test-unit');

		// Must have test-integration job
		expect(ciContent, 'test-integration job missing from ci.yml').toContain('test-integration');

		// Must have test-e2e job
		expect(ciContent, 'test-e2e job missing from ci.yml').toContain('test-e2e');

		// Must have build-images job
		expect(ciContent, 'build-images job missing from ci.yml').toContain('build-images');

		// Must have vuln-scan job
		expect(ciContent, 'vuln-scan job missing from ci.yml').toContain('vuln-scan');
	});

	test('[P1] 1.8-UNIT-003 — ci.yml runs on pull_request trigger', () => {
		// THIS TEST WILL FAIL — ci.yml does not exist yet.
		// Activate after Task 7.1.
		const ciPath = path.join(PROJECT_ROOT, '.github', 'workflows', 'ci.yml');
		const ciContent = readFileSync(ciPath, 'utf-8');

		// PR trigger must be present
		expect(ciContent, 'pull_request trigger missing from ci.yml').toContain('pull_request');
	});

	test('[P1] 1.8-UNIT-004 — ci.yml uses oven-sh/setup-bun action', () => {
		// THIS TEST WILL FAIL — ci.yml does not exist yet.
		// Activate after Task 7.2.
		const ciPath = path.join(PROJECT_ROOT, '.github', 'workflows', 'ci.yml');
		const ciContent = readFileSync(ciPath, 'utf-8');

		// Must use official Bun action (not manual curl/install)
		expect(ciContent, 'oven-sh/setup-bun missing from ci.yml').toContain('oven-sh/setup-bun');
	});

	test('[P1] 1.8-UNIT-005 — ci.yml configures PostgreSQL service for integration tests', () => {
		// THIS TEST WILL FAIL — ci.yml does not exist yet.
		// Activate after Task 7.1.
		const ciPath = path.join(PROJECT_ROOT, '.github', 'workflows', 'ci.yml');
		const ciContent = readFileSync(ciPath, 'utf-8');

		// Must include postgres service definition
		expect(ciContent, 'postgres service missing from ci.yml').toContain('postgres:17');
		// Must use health check for readiness
		expect(ciContent, 'pg_isready health check missing').toContain('pg_isready');
	});

	test('[P1] 1.8-UNIT-006 — ci.yml configures Mailpit service for integration tests', () => {
		// THIS TEST WILL FAIL — ci.yml does not exist yet.
		// Activate after Task 7.1.
		const ciPath = path.join(PROJECT_ROOT, '.github', 'workflows', 'ci.yml');
		const ciContent = readFileSync(ciPath, 'utf-8');

		// Must include mailpit service for SMTP testing
		expect(ciContent, 'mailpit service missing from ci.yml').toContain('axllent/mailpit');
	});
});

// ---------------------------------------------------------------------------
// 1.8-UNIT-007 — Integration test project in vite.config.ts (AC-1)
// ---------------------------------------------------------------------------

describe('Story 1.8 — Vitest Integration Project Configuration (AC-1)', () => {
	test('[P1] 1.8-UNIT-007 — vite.config.ts has integration Vitest project', () => {
		// THIS TEST WILL FAIL — integration project not yet added to vite.config.ts.
		// Activate after Task 2.4.
		const viteConfigPath = path.join(PROJECT_ROOT, 'vite.config.ts');
		expect(existsSync(viteConfigPath), 'vite.config.ts not found').toBe(true);

		const viteConfig = readFileSync(viteConfigPath, 'utf-8');

		// Must define a project named 'integration'
		expect(viteConfig, 'integration project not found in vite.config.ts').toContain(
			"name: 'integration'"
		);

		// Must include integration test files
		expect(viteConfig, 'integration test include pattern missing').toContain('integration.test.ts');

		// Must use node environment
		expect(viteConfig, "integration project must use environment: 'node'").toContain(
			"environment: 'node'"
		);
	});

	test('[P1] 1.8-UNIT-008 — vite.config.ts integration project has globalSetup', () => {
		// THIS TEST WILL FAIL — integration project not yet added.
		// Activate after Task 2.4 and Task 2.5.
		const viteConfigPath = path.join(PROJECT_ROOT, 'vite.config.ts');
		const viteConfig = readFileSync(viteConfigPath, 'utf-8');

		// Must define globalSetup for Testcontainers initialization
		expect(viteConfig, 'globalSetup missing in integration project').toContain('globalSetup');
		expect(viteConfig, 'integration-setup.ts missing in globalSetup').toContain(
			'integration-setup.ts'
		);
	});

	test('[P1] 1.8-UNIT-009 — vite.config.ts server project excludes integration tests', () => {
		// THIS TEST WILL FAIL — server project exclude not yet updated.
		// Activate after Task 2.4.
		const viteConfigPath = path.join(PROJECT_ROOT, 'vite.config.ts');
		const viteConfig = readFileSync(viteConfigPath, 'utf-8');

		// Server project must exclude integration tests to prevent double execution
		expect(viteConfig, 'integration tests not excluded from server project').toContain(
			'integration.test.ts'
		);
	});
});

// ---------------------------------------------------------------------------
// 1.8-UNIT-010 — package.json scripts (AC-1)
// ---------------------------------------------------------------------------

describe('Story 1.8 — Package Scripts (AC-1)', () => {
	test('[P1] 1.8-UNIT-010 — package.json has test:integration script', () => {
		// THIS TEST WILL FAIL — test:integration script not yet added.
		// Activate after Task 8.1.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

		expect(pkg.scripts, 'scripts missing from package.json').toBeDefined();
		expect(pkg.scripts['test:integration'], 'test:integration script missing').toBeDefined();

		// Must use vitest run with integration project
		expect(
			pkg.scripts['test:integration'],
			'test:integration must run integration project'
		).toContain('integration');
	});

	test('[P1] 1.8-UNIT-011 — package.json has test:ci script', () => {
		// THIS TEST WILL FAIL — test:ci script not yet added.
		// Activate after Task 8.2.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

		expect(pkg.scripts['test:ci'], 'test:ci script missing').toBeDefined();

		// Must chain lint + check + test + integration + e2e
		const script = pkg.scripts['test:ci'];
		expect(script, 'test:ci must include lint').toContain('lint');
		expect(script, 'test:ci must include check').toContain('check');
	});

	test('[P1] 1.8-UNIT-012 — existing test scripts still work (no regressions)', () => {
		// THIS TEST WILL FAIL if scripts are removed.
		// Activate after Task 8.3 to verify no regressions.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

		// Original scripts must still be present
		expect(pkg.scripts['test:unit'], 'test:unit must remain').toBeDefined();
		expect(pkg.scripts['test'], 'test script must remain').toBeDefined();
		expect(pkg.scripts['test:e2e'], 'test:e2e must remain').toBeDefined();
		expect(pkg.scripts['lint'], 'lint must remain').toBeDefined();
		expect(pkg.scripts['check'], 'check must remain').toBeDefined();
		expect(pkg.scripts['build'], 'build must remain').toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// 1.8-UNIT-013 — Test infrastructure files exist (AC-1, AC-4)
// ---------------------------------------------------------------------------

describe('Story 1.8 — Test Infrastructure Files (AC-1, AC-4)', () => {
	test('[P1] 1.8-UNIT-013 — tests/support/fixtures/pg-factory.ts exists', () => {
		// THIS TEST WILL FAIL — pg-factory.ts does not exist yet.
		// Activate after Task 2.2.
		const factoryPath = path.join(PROJECT_ROOT, 'tests', 'support', 'fixtures', 'pg-factory.ts');
		expect(existsSync(factoryPath), 'tests/support/fixtures/pg-factory.ts not found').toBe(true);
	});

	test('[P1] 1.8-UNIT-014 — tests/support/fixtures/testcontainers-context.ts exists', () => {
		// THIS TEST WILL FAIL — testcontainers-context.ts does not exist yet.
		// Activate after Task 2.3.
		const tcPath = path.join(
			PROJECT_ROOT,
			'tests',
			'support',
			'fixtures',
			'testcontainers-context.ts'
		);
		expect(existsSync(tcPath), 'testcontainers-context.ts not found').toBe(true);
	});

	test('[P1] 1.8-UNIT-015 — tests/support/integration-setup.ts exists', () => {
		// THIS TEST WILL FAIL — integration-setup.ts does not exist yet.
		// Activate after Task 2.5.
		const setupPath = path.join(PROJECT_ROOT, 'tests', 'support', 'integration-setup.ts');
		expect(existsSync(setupPath), 'tests/support/integration-setup.ts not found').toBe(true);
	});

	test('[P1] 1.8-UNIT-016 — src/lib/server/db/schema.ts exists', () => {
		// THIS TEST WILL FAIL — schema.ts does not exist yet (Story 1.3 carry-forward).
		// Activate after Task 4.0.
		const schemaPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'db', 'schema.ts');
		expect(existsSync(schemaPath), 'src/lib/server/db/schema.ts not found').toBe(true);
	});

	test('[P1] 1.8-UNIT-017 — src/lib/server/db/index.ts exists', () => {
		// THIS TEST WILL FAIL — db/index.ts does not exist yet (Story 1.3 carry-forward).
		// Activate after Task 4.0.
		const dbIndexPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'db', 'index.ts');
		expect(existsSync(dbIndexPath), 'src/lib/server/db/index.ts not found').toBe(true);
	});

	test('[P1] 1.8-UNIT-018 — drizzle/0000_init.sql migration file exists', () => {
		// THIS TEST WILL FAIL — migration file does not exist yet (Story 1.3 carry-forward).
		// Activate after Task 4.0 (bunx drizzle-kit generate + manual EXCLUDE SQL).
		const migrationPath = path.join(PROJECT_ROOT, 'drizzle', '0000_init.sql');
		expect(existsSync(migrationPath), 'drizzle/0000_init.sql not found').toBe(true);
	});

	test('[P1] 1.8-UNIT-019 — drizzle/0000_init.sql contains btree_gist extension and EXCLUDE constraint', () => {
		// THIS TEST WILL FAIL — migration file does not exist yet.
		// Activate after Task 4.0.
		const migrationPath = path.join(PROJECT_ROOT, 'drizzle', '0000_init.sql');
		expect(existsSync(migrationPath), 'drizzle/0000_init.sql not found').toBe(true);

		const migrationSql = readFileSync(migrationPath, 'utf-8');

		// Must create btree_gist extension
		expect(migrationSql.toLowerCase(), 'btree_gist extension missing from migration').toContain(
			'btree_gist'
		);

		// Must create EXCLUDE constraint
		expect(migrationSql.toUpperCase(), 'EXCLUDE constraint missing from migration').toContain(
			'EXCLUDE'
		);

		// Must reference bookings table
		expect(migrationSql.toLowerCase(), 'bookings table missing from migration').toContain(
			'bookings'
		);
	});
});

// ---------------------------------------------------------------------------
// 1.8-UNIT-020 — src/lib/server/env.ts exports validateEnv (AC-1, AC-4)
// ---------------------------------------------------------------------------

describe('Story 1.8 — env.ts validateEnv Export (AC-4)', () => {
	test('[P1] 1.8-UNIT-020 — src/lib/server/env.ts exports validateEnv function', () => {
		// THIS TEST WILL FAIL — validateEnv function is not exported yet.
		// Activate after Task 1.1.
		const envPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'env.ts');
		expect(existsSync(envPath), 'src/lib/server/env.ts not found').toBe(true);

		const envContent = readFileSync(envPath, 'utf-8');

		// Must export validateEnv as a named function
		expect(envContent, 'validateEnv function not exported from env.ts').toMatch(
			/export\s+(function\s+validateEnv|const\s+validateEnv)/
		);
	});

	test('[P1] 1.8-UNIT-021 — validateEnv accepts a record argument, not process.env directly', () => {
		// THIS TEST WILL FAIL — function signature not yet updated.
		// Activate after Task 1.1.
		const envPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'env.ts');
		const envContent = readFileSync(envPath, 'utf-8');

		// validateEnv must accept an explicit record parameter (not close over process.env)
		// This allows hooks.server.ts and env.test.ts to pass custom env objects
		expect(envContent, 'validateEnv must accept a record parameter').toMatch(
			/validateEnv\s*\(\s*\w+\s*:/
		);
	});
});

// ---------------------------------------------------------------------------
// 1.8-UNIT-022 — .env.example documents test/CI env vars (AC-1)
// ---------------------------------------------------------------------------

describe('Story 1.8 — .env.example Test/CI Documentation (AC-1)', () => {
	test('[P2] 1.8-UNIT-022 — .env.example documents DATABASE_URL for test Postgres', () => {
		// THIS TEST WILL FAIL — .env.example not yet updated with CI section.
		// Activate after Task 9.1.
		const envExamplePath = path.join(PROJECT_ROOT, '.env.example');
		expect(existsSync(envExamplePath), '.env.example not found').toBe(true);

		const envExample = readFileSync(envExamplePath, 'utf-8');

		// Must document DATABASE_URL for test/CI
		expect(envExample, 'DATABASE_URL missing from .env.example').toContain('DATABASE_URL');
	});

	test('[P2] 1.8-UNIT-023 — .env.example documents MAILPIT_URL', () => {
		// THIS TEST WILL FAIL — .env.example not yet verified/updated.
		// Activate after Task 9.2.
		const envExamplePath = path.join(PROJECT_ROOT, '.env.example');
		const envExample = readFileSync(envExamplePath, 'utf-8');

		// Mailpit URL must be documented (from Story 1.7 — verify it exists)
		expect(envExample, 'MAILPIT_URL missing from .env.example').toContain('MAILPIT_URL');
	});
});
