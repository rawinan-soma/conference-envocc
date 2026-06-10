/**
 * ATDD Red-Phase Scaffolds — Story 1.5: Jobs & Email Platform
 * Quality Gates & Cross-Cutting Concerns
 *
 * TDD RED PHASE: All tests are marked test() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Activation guide:
 *   1. Remove `test(` → `test(` for the current task's test.
 *   2. Run: `bun run test` — verify it FAILS first (red).
 *   3. Implement the feature.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: Worker script exists and pg-boss dependency is in package.json
 *   - AC-5: ESLint no-restricted-imports rule blocks $app/* and $env/dynamic* imports
 *   - AC-6: Env validation fail-fast — missing vars cause immediate process.exit(1)
 *
 * Scenario IDs align with test-design-epic-1.md.
 */

import { test, expect, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runCmd(
	cmd: string,
	cwd = process.cwd()
): { stdout: string; stderr: string; exitCode: number } {
	try {
		const stdout = execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' });
		return { stdout: stdout.toString(), stderr: '', exitCode: 0 };
	} catch (err: unknown) {
		const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
		return {
			stdout: e.stdout?.toString() ?? '',
			stderr: e.stderr?.toString() ?? '',
			exitCode: e.status ?? 1
		};
	}
}

const PROJECT_ROOT = path.resolve(process.cwd());

// ---------------------------------------------------------------------------
// 1.5-UNIT-007 — Required files exist (AC-1)
// ---------------------------------------------------------------------------

describe('Story 1.5 — Required Files Exist (AC-1)', () => {
	test('[P1] 1.5-UNIT-007 — src/worker.ts exists', () => {
		// THIS TEST WILL FAIL — src/worker.ts does not exist yet.
		// Activate after Task 5.1 (worker.ts created).
		const workerPath = path.join(PROJECT_ROOT, 'src', 'worker.ts');
		expect(existsSync(workerPath), 'src/worker.ts not found').toBe(true);
	});

	test('[P1] 1.5-UNIT-007b — src/lib/server/env.ts exists', () => {
		// THIS TEST WILL FAIL — src/lib/server/env.ts does not exist yet.
		// Activate after Task 4.1 (env.ts created).
		const envPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'env.ts');
		expect(existsSync(envPath), 'src/lib/server/env.ts not found').toBe(true);
	});

	test('[P1] 1.5-UNIT-007c — src/lib/server/jobs/boss.ts exists', () => {
		// THIS TEST WILL FAIL — boss.ts does not exist yet.
		// Activate after Task 2.1.
		const bossPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'jobs', 'boss.ts');
		expect(existsSync(bossPath), 'src/lib/server/jobs/boss.ts not found').toBe(true);
	});

	test('[P1] 1.5-UNIT-007d — src/lib/server/jobs/queues.ts exists', () => {
		// THIS TEST WILL FAIL — queues.ts does not exist yet.
		// Activate after Task 2.2.
		const queuesPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'jobs', 'queues.ts');
		expect(existsSync(queuesPath), 'src/lib/server/jobs/queues.ts not found').toBe(true);
	});

	test('[P1] 1.5-UNIT-007e — src/lib/server/jobs/index.ts exists', () => {
		// THIS TEST WILL FAIL — jobs/index.ts does not exist yet.
		// Activate after Task 2.5.
		const indexPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'jobs', 'index.ts');
		expect(existsSync(indexPath), 'src/lib/server/jobs/index.ts not found').toBe(true);
	});

	test('[P1] 1.5-UNIT-007f — src/lib/server/email/mailer.ts exists', () => {
		// THIS TEST WILL FAIL — mailer.ts does not exist yet.
		// Activate after Task 3.1.
		const mailerPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'email', 'mailer.ts');
		expect(existsSync(mailerPath), 'src/lib/server/email/mailer.ts not found').toBe(true);
	});

	test('[P1] 1.5-UNIT-007g — src/lib/server/jobs/handlers/smoke-email.ts exists', () => {
		// THIS TEST WILL FAIL — smoke-email.ts handler does not exist yet.
		// Activate after Task 2.4.
		const handlerPath = path.join(
			PROJECT_ROOT,
			'src',
			'lib',
			'server',
			'jobs',
			'handlers',
			'smoke-email.ts'
		);
		expect(existsSync(handlerPath), 'smoke-email.ts handler not found').toBe(true);
	});

	test('[P1] 1.5-UNIT-007h — src/lib/server/jobs/handlers/send-email.ts exists', () => {
		// THIS TEST WILL FAIL — send-email.ts handler does not exist yet.
		// Activate after Task 2.3.
		const handlerPath = path.join(
			PROJECT_ROOT,
			'src',
			'lib',
			'server',
			'jobs',
			'handlers',
			'send-email.ts'
		);
		expect(existsSync(handlerPath), 'send-email.ts handler not found').toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 1.5-UNIT-008 — package.json scripts (AC-1, AC-6)
// ---------------------------------------------------------------------------

describe('Story 1.5 — package.json worker script (AC-1)', () => {
	test('[P1] 1.5-UNIT-008 — package.json has "worker" script pointing to src/worker.ts', () => {
		// THIS TEST WILL FAIL — package.json does not have the worker script yet.
		// Activate after Task 6.1.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');

		expect(existsSync(pkgPath), 'package.json not found').toBe(true);

		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
			scripts?: Record<string, string>;
		};
		const scripts = pkg.scripts ?? {};

		expect(scripts, 'package.json missing "worker" script').toHaveProperty('worker');
		expect(scripts.worker, '"worker" script must reference src/worker.ts').toMatch(
			/src\/worker\.ts/
		);
	});

	test('[P1] 1.5-UNIT-008b — package.json dependencies include pg-boss', () => {
		// THIS TEST WILL FAIL — pg-boss not yet installed.
		// Activate after Task 1.1.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
			dependencies?: Record<string, string>;
		};

		expect(pkg.dependencies, 'pg-boss not in dependencies').toHaveProperty('pg-boss');
	});

	test('[P1] 1.5-UNIT-008c — package.json dependencies include nodemailer', () => {
		// THIS TEST WILL FAIL — nodemailer not yet installed.
		// Activate after Task 1.1.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
			dependencies?: Record<string, string>;
		};

		expect(pkg.dependencies, 'nodemailer not in dependencies').toHaveProperty('nodemailer');
	});

	test('[P1] 1.5-UNIT-008d — package.json dependencies include valibot', () => {
		// THIS TEST WILL FAIL — valibot not yet installed.
		// Activate after Task 1.1.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
			dependencies?: Record<string, string>;
		};

		expect(pkg.dependencies, 'valibot not in dependencies').toHaveProperty('valibot');
	});

	test('[P1] 1.5-UNIT-008e — package.json devDependencies does NOT include @types/pg-boss', () => {
		// THIS TEST WILL FAIL if @types/pg-boss is accidentally installed.
		// pg-boss ships its own TypeScript types — do NOT install @types/pg-boss.
		// Activate after Task 1.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
			devDependencies?: Record<string, string>;
		};

		expect(pkg.devDependencies?.['@types/pg-boss']).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 1.5-UNIT-009 — ESLint no-restricted-imports rule (AC-5)
// ---------------------------------------------------------------------------

describe('Story 1.5 — ESLint no-restricted-imports rule (AC-5)', () => {
	test('[P1] 1.5-UNIT-009 — eslint.config.js includes no-restricted-imports rule for $app/* and $env/dynamic*', () => {
		// THIS TEST WILL FAIL — eslint.config.js does not have the rule yet.
		// Activate after Task 8.1.
		const eslintConfigPath = path.join(PROJECT_ROOT, 'eslint.config.js');

		expect(existsSync(eslintConfigPath), 'eslint.config.js not found').toBe(true);

		const content = readFileSync(eslintConfigPath, 'utf-8');

		// Must contain the no-restricted-imports rule
		expect(content, 'eslint.config.js must have no-restricted-imports rule').toMatch(
			/no-restricted-imports/
		);
		// Must restrict $app/* imports
		expect(content, 'no-restricted-imports must restrict $app/*').toMatch(/\$app/);
		// Must restrict $env/dynamic imports
		expect(content, 'no-restricted-imports must restrict $env/dynamic').toMatch(/\$env\/dynamic/);
		// Must apply to src/lib/server/**/*.ts
		expect(content, 'rule must target src/lib/server/**/*.ts').toMatch(/src\/lib\/server/);
	});

	test('[P1] 1.5-UNIT-009b — bun run lint exits 0 after no-restricted-imports rule is added', () => {
		// THIS TEST WILL FAIL — the lint rule has not been added yet.
		// Activate after Task 8.2. Note: this test runs lint on the whole project.
		const result = runCmd('bun run lint', PROJECT_ROOT);

		expect(
			result.exitCode,
			`lint failed:\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`
		).toBe(0);
	});

	test('[P1] 1.5-UNIT-009c — env.ts does NOT import $env/dynamic/private', () => {
		// THIS TEST WILL FAIL — env.ts does not exist yet.
		// AC-6: env.ts must use process.env directly, NOT $env/dynamic/private.
		// Activate after Task 4.1.
		const envPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'env.ts');

		expect(existsSync(envPath), 'src/lib/server/env.ts not found').toBe(true);

		const content = readFileSync(envPath, 'utf-8');

		expect(content, 'env.ts must NOT import $env/dynamic/private').not.toMatch(
			/\$env\/dynamic\/private/
		);
		expect(content, 'env.ts must NOT import $env/dynamic').not.toMatch(/\$env\/dynamic/);
		expect(content, 'env.ts must reference process.env').toMatch(/process\.env/);
	});

	test('[P1] 1.5-UNIT-009d — worker.ts does NOT import $app/* or $env/dynamic*', () => {
		// THIS TEST WILL FAIL — worker.ts does not exist yet.
		// AC-5: worker.ts must not import SvelteKit runtime modules.
		// Activate after Task 5.1.
		const workerPath = path.join(PROJECT_ROOT, 'src', 'worker.ts');

		expect(existsSync(workerPath), 'src/worker.ts not found').toBe(true);

		const content = readFileSync(workerPath, 'utf-8');

		expect(content, 'worker.ts must NOT import $app/*').not.toMatch(/from ['"]?\$app\//);
		expect(content, 'worker.ts must NOT import $env/dynamic').not.toMatch(
			/from ['"]?\$env\/dynamic/
		);
	});
});

// ---------------------------------------------------------------------------
// 1.5-UNIT-010 — .env.example updated with SMTP vars (AC-6)
// ---------------------------------------------------------------------------

describe('Story 1.5 — .env.example SMTP vars (AC-6)', () => {
	test('[P1] 1.5-UNIT-010 — .env.example contains SMTP_HOST', () => {
		// THIS TEST WILL FAIL — .env.example does not have SMTP vars yet.
		// Activate after Task 7.1.
		const envExamplePath = path.join(PROJECT_ROOT, '.env.example');

		expect(existsSync(envExamplePath), '.env.example not found').toBe(true);

		const content = readFileSync(envExamplePath, 'utf-8');
		expect(content, '.env.example missing SMTP_HOST').toMatch(/^SMTP_HOST=/m);
	});

	test('[P1] 1.5-UNIT-010b — .env.example contains SMTP_PORT', () => {
		// THIS TEST WILL FAIL — .env.example does not have SMTP vars yet.
		const envExamplePath = path.join(PROJECT_ROOT, '.env.example');
		const content = readFileSync(envExamplePath, 'utf-8');
		expect(content, '.env.example missing SMTP_PORT').toMatch(/^SMTP_PORT=/m);
	});

	test('[P1] 1.5-UNIT-010c — .env.example contains SMTP_FROM', () => {
		// THIS TEST WILL FAIL — .env.example does not have SMTP vars yet.
		const envExamplePath = path.join(PROJECT_ROOT, '.env.example');
		const content = readFileSync(envExamplePath, 'utf-8');
		expect(content, '.env.example missing SMTP_FROM').toMatch(/^SMTP_FROM=/m);
	});

	test('[P1] 1.5-UNIT-010d — .env.example contains SMTP_DISPLAY_NAME (FR-083)', () => {
		// THIS TEST WILL FAIL — .env.example does not have SMTP vars yet.
		// FR-083: sender display name = org name
		const envExamplePath = path.join(PROJECT_ROOT, '.env.example');
		const content = readFileSync(envExamplePath, 'utf-8');
		expect(content, '.env.example missing SMTP_DISPLAY_NAME').toMatch(/^SMTP_DISPLAY_NAME=/m);
	});
});

// ---------------------------------------------------------------------------
// 1.5-UNIT-011 — compose.yaml Mailpit service (AC-2)
// ---------------------------------------------------------------------------

describe('Story 1.5 — compose.yaml Mailpit service (AC-2)', () => {
	test('[P1] 1.5-UNIT-011 — compose.yaml contains mailpit service', () => {
		// THIS TEST WILL FAIL — compose.yaml does not have the mailpit service yet.
		// Activate after Task 9.1.
		const composePath = path.join(PROJECT_ROOT, 'compose.yaml');

		expect(existsSync(composePath), 'compose.yaml not found').toBe(true);

		const content = readFileSync(composePath, 'utf-8');

		expect(content, 'compose.yaml missing mailpit service').toMatch(/mailpit/);
		expect(content, 'compose.yaml mailpit must use axllent/mailpit image').toMatch(
			/axllent\/mailpit/
		);
	});

	test('[P1] 1.5-UNIT-011b — compose.yaml mailpit service exposes SMTP port 1025', () => {
		// THIS TEST WILL FAIL — compose.yaml does not have mailpit yet.
		const composePath = path.join(PROJECT_ROOT, 'compose.yaml');
		const content = readFileSync(composePath, 'utf-8');

		expect(content, 'compose.yaml mailpit must expose port 1025 (SMTP)').toMatch(/1025/);
	});

	test('[P2] 1.5-UNIT-011c — compose.yaml mailpit service exposes web UI port 8025', () => {
		// THIS TEST WILL FAIL — compose.yaml does not have mailpit yet.
		const composePath = path.join(PROJECT_ROOT, 'compose.yaml');
		const content = readFileSync(composePath, 'utf-8');

		expect(content, 'compose.yaml mailpit must expose port 8025 (web UI)').toMatch(/8025/);
	});
});

// ---------------------------------------------------------------------------
// 1.5-UNIT-012 — env.ts Valibot fail-fast validation (AC-6)
// ---------------------------------------------------------------------------

describe('Story 1.5 — env.ts Valibot fail-fast (AC-6)', () => {
	test('[P1] 1.5-UNIT-012 — env.ts exports `env` object with DATABASE_URL', () => {
		// THIS TEST WILL FAIL — env.ts does not exist yet.
		// Activate after Task 4.1. Requires valid env vars to be set.
		const envPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'env.ts');
		expect(existsSync(envPath), 'src/lib/server/env.ts not found').toBe(true);

		const content = readFileSync(envPath, 'utf-8');

		// Must export an `env` const
		expect(content, 'env.ts must export `env`').toMatch(/export const env/);
		// Must reference DATABASE_URL in the schema
		expect(content, 'env.ts must validate DATABASE_URL').toMatch(/DATABASE_URL/);
	});

	test('[P1] 1.5-UNIT-012b — env.ts uses v.safeParse and calls process.exit(1) on failure', () => {
		// THIS TEST WILL FAIL — env.ts does not exist yet.
		// Verifies the fail-fast pattern is implemented.
		const envPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'env.ts');
		const content = readFileSync(envPath, 'utf-8');

		expect(content, 'env.ts must use v.safeParse').toMatch(/v\.safeParse/);
		expect(content, 'env.ts must call process.exit(1) on validation failure').toMatch(
			/process\.exit\(1\)/
		);
	});

	test('[P1] 1.5-UNIT-012c — env.ts validates all required SMTP vars', () => {
		// THIS TEST WILL FAIL — env.ts does not exist yet.
		// Verifies all AC-6 required SMTP env vars are in the schema.
		const envPath = path.join(PROJECT_ROOT, 'src', 'lib', 'server', 'env.ts');
		const content = readFileSync(envPath, 'utf-8');

		const requiredVars = [
			'DATABASE_URL',
			'SMTP_HOST',
			'SMTP_PORT',
			'SMTP_FROM',
			'SMTP_DISPLAY_NAME'
		];
		for (const varName of requiredVars) {
			expect(content, `env.ts must validate ${varName}`).toMatch(varName);
		}
	});
});

// ---------------------------------------------------------------------------
// 1.5-UNIT-013 — Quality gates (AC-all, Task 11)
// ---------------------------------------------------------------------------

describe('Story 1.5 — Quality Gates (Task 11)', () => {
	test('[P1] 1.5-UNIT-013 — bun run lint exits 0', () => {
		// THIS TEST WILL FAIL — project not fully implemented yet.
		// Activate as the final quality gate check (Task 11.1).
		const result = runCmd('bun run lint', PROJECT_ROOT);

		expect(
			result.exitCode,
			`lint failed:\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`
		).toBe(0);
	});

	test('[P1] 1.5-UNIT-013b — bun run check exits 0', () => {
		// THIS TEST WILL FAIL — TypeScript types not resolved yet.
		// Activate as the final quality gate check (Task 11.2).
		const result = runCmd('bun run check', PROJECT_ROOT);

		expect(
			result.exitCode,
			`svelte-check/tsc failed:\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`
		).toBe(0);
	});

	test('[P1] 1.5-UNIT-013c — bun run format --check exits 0', () => {
		// THIS TEST WILL FAIL — files not formatted yet.
		// Activate as the final quality gate check (Task 11.4).
		const result = runCmd('bun run format', PROJECT_ROOT);

		expect(
			result.exitCode,
			`prettier --check failed:\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`
		).toBe(0);
	});
});
