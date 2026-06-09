/**
 * ATDD Red-Phase Scaffolds — Story 1.1: Scaffold the Project
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
 * Scenario IDs align with test-design-epic-1.md.
 */

import { test, expect, describe } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a shell command synchronously and return { stdout, exitCode }.
 *  Never throws — caller asserts on exitCode / stdout. */
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
// P1 — 1.1-UNIT-001
// Given: an empty repo, When: `bun install` runs, Then: exits 0
// ---------------------------------------------------------------------------

describe('Story 1.1 — Scaffold Acceptance Tests (ATDD Red Phase)', () => {
	test.skip('[P1] 1.1-UNIT-001 — bun install succeeds (exit 0)', () => {
		// THIS TEST WILL FAIL — bun is not installed or package.json does not exist yet.
		// After `bunx sv create .` + `bun install` complete, remove test() to activate.
		const result = runCmd('bun install --frozen-lockfile', PROJECT_ROOT);

		expect(result.exitCode).toBe(0);
	});

	// ---------------------------------------------------------------------------
	// P1 — 1.1-UNIT-001 (continued)
	// Given: scaffolded project, When: `bun run dev` starts, Then: it serves on port 5173
	// Note: We test that the dev script exists and is invokable; full serve test is manual.
	// ---------------------------------------------------------------------------

	test.skip('[P1] 1.1-UNIT-001b — package.json has all required scripts', () => {
		// THIS TEST WILL FAIL — package.json does not exist yet.
		const pkgPath = path.join(PROJECT_ROOT, 'package.json');

		expect(existsSync(pkgPath)).toBe(true);

		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { scripts?: Record<string, string> };
		const scripts = pkg.scripts ?? {};

		// AC-1: All required scripts must be present
		const requiredScripts = [
			'dev',
			'build',
			'preview',
			'check',
			'lint',
			'format',
			'test',
			'test:e2e'
		];
		for (const script of requiredScripts) {
			expect(scripts, `Missing script: "${script}"`).toHaveProperty(script);
		}
	});

	// ---------------------------------------------------------------------------
	// P1 — 1.1-UNIT-002
	// Given: scaffolded project, When: `bun run build`, Then: produces Bun server bundle
	// ---------------------------------------------------------------------------

	test.skip('[P1] 1.1-UNIT-002 — bun run build produces Bun server bundle (exit 0)', () => {
		// THIS TEST WILL FAIL — build infrastructure not yet set up.
		// Remove test() after sv create + svelte-adapter-bun are configured.
		const result = runCmd('bun run build', PROJECT_ROOT);

		expect(result.exitCode).toBe(0);

		// The Bun adapter outputs to build/; verify server entry exists
		const serverEntry = path.join(PROJECT_ROOT, 'build', 'index.js');
		expect(
			existsSync(serverEntry),
			'svelte-adapter-bun server bundle not found at build/index.js'
		).toBe(true);
	});

	// ---------------------------------------------------------------------------
	// P1 — 1.1-UNIT-002 (sub-check)
	// svelte.config.js must reference svelte-adapter-bun, NOT @sveltejs/adapter-node
	// ---------------------------------------------------------------------------

	test.skip('[P1] 1.1-UNIT-002b — vite.config.ts uses svelte-adapter-bun (not adapter-node)', () => {
		// NOTE: sv CLI v0.16.1+ uses vite.config.ts as the primary SvelteKit config (no separate svelte.config.js).
		// The adapter is configured via sveltekit({ adapter: adapter() }) in vite.config.ts.
		const configPath = path.join(PROJECT_ROOT, 'vite.config.ts');

		expect(existsSync(configPath), 'vite.config.ts not found').toBe(true);

		const content = readFileSync(configPath, 'utf-8');

		// Must import from svelte-adapter-bun
		expect(content).toMatch(/from ['"]svelte-adapter-bun['"]/);

		// Must NOT reference the node adapter
		expect(content).not.toMatch(/@sveltejs\/adapter-node/);
	});

	// ---------------------------------------------------------------------------
	// P1 — 1.1-UNIT-003
	// Given: scaffolded project, When: ESLint runs, Then: exits 0 with no errors
	// ---------------------------------------------------------------------------

	test.skip('[P1] 1.1-UNIT-003a — eslint exits 0 (no lint errors)', () => {
		// THIS TEST WILL FAIL — eslint and project source do not exist yet.
		const result = runCmd('bun run lint', PROJECT_ROOT);

		expect(result.exitCode).toBe(0);
	});

	// ---------------------------------------------------------------------------
	// P1 — 1.1-UNIT-003 (Prettier)
	// Given: scaffolded project, When: `bun run format --check`, Then: exits 0
	// ---------------------------------------------------------------------------

	test.skip('[P1] 1.1-UNIT-003b — prettier --check exits 0 (no formatting errors)', () => {
		// THIS TEST WILL FAIL — prettier and project source do not exist yet.
		const result = runCmd('bun run format', PROJECT_ROOT);

		expect(result.exitCode).toBe(0);
	});

	// ---------------------------------------------------------------------------
	// P1 — 1.1-UNIT-003 (svelte-check / TypeScript)
	// Given: scaffolded project, When: `bun run check`, Then: exits 0
	// ---------------------------------------------------------------------------

	test.skip('[P1] 1.1-UNIT-003c — svelte-check exits 0 (no type errors)', () => {
		// THIS TEST WILL FAIL — svelte-check and project source do not exist yet.
		const result = runCmd('bun run check', PROJECT_ROOT);

		expect(result.exitCode).toBe(0);
	});

	// ---------------------------------------------------------------------------
	// P1 — Vitest scaffold placeholder passes
	// Given: scaffolded project, When: `bun run test`, Then: vitest exits 0
	// ---------------------------------------------------------------------------

	test.skip('[P1] 1.1-UNIT-003d — vitest exits 0 (scaffold placeholder tests pass)', () => {
		// THIS TEST WILL FAIL — vitest and placeholder tests do not exist yet.
		// sv create generates placeholder Vitest tests; they must pass clean.
		const result = runCmd('bun run test', PROJECT_ROOT);

		expect(result.exitCode).toBe(0);
	});

	// ---------------------------------------------------------------------------
	// P2 — 1.1-UNIT-004
	// Given: scaffolded project, When: build runs, Then: Bun bundle (not Node) is produced
	// ---------------------------------------------------------------------------

	test.skip('[P2] 1.1-UNIT-004 — svelte-adapter-bun produces standalone Bun server bundle', () => {
		// THIS TEST WILL FAIL — build infrastructure not yet set up.
		// Verifies the bundle is the Bun adapter output (not the Node adapter).
		const serverEntry = path.join(PROJECT_ROOT, 'build', 'index.js');

		expect(existsSync(serverEntry), 'build/index.js not found — run `bun run build` first').toBe(
			true
		);

		const entryContent = readFileSync(serverEntry, 'utf-8');

		// svelte-adapter-bun's output server should NOT reference Node's http.createServer in a way
		// that indicates the Node adapter. The Bun adapter uses Bun.serve().
		// This is a smoke assertion — the adapter produces a fundamentally different entrypoint.
		expect(
			entryContent,
			'build/index.js appears to be Node adapter output (http.createServer found without Bun.serve)'
		).toSatisfy(
			(content: string) => content.includes('Bun.serve') || !content.includes('http.createServer')
		);
	});

	// ---------------------------------------------------------------------------
	// P1 — Required project files exist (directory structure AC)
	// ---------------------------------------------------------------------------

	test.skip('[P1] 1.1-UNIT-001c — required scaffold files and directories exist', () => {
		// THIS TEST WILL FAIL — project not yet scaffolded.
		// Verifies AC-1 directory structure per story dev notes.
		const required = [
			'package.json',
			'bun.lock',
			// NOTE: sv CLI v0.16.1+ uses vite.config.ts as the primary SvelteKit config (no svelte.config.js)
			'vite.config.ts',
			'tsconfig.json',
			'drizzle.config.ts',
			'components.json',
			'eslint.config.js',
			'.prettierrc',
			'project.inlang/settings.json',
			'messages/en.json',
			'messages/th.json',
			'.env.example',
			'src/app.html',
			'src/app.css',
			'src/app.d.ts',
			'src/hooks.server.ts',
			'src/routes/+page.svelte',
			'src/routes/+layout.svelte'
		];

		for (const rel of required) {
			const full = path.join(PROJECT_ROOT, rel);
			expect(existsSync(full), `Required file missing: ${rel}`).toBe(true);
		}
	});

	test.skip('[P1] 1.1-UNIT-001d — .gitignore includes .env', () => {
		// THIS TEST WILL FAIL — .gitignore not set up yet.
		const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');

		expect(existsSync(gitignorePath), '.gitignore not found').toBe(true);

		const content = readFileSync(gitignorePath, 'utf-8');
		expect(content).toMatch(/^\.env$/m);
	});

	test.skip('[P1] 1.1-UNIT-001e — vite.config.ts includes Tailwind v4 and Paraglide Vite plugins', () => {
		// THIS TEST WILL FAIL — vite.config.ts not yet created.
		const viteConfigPath = path.join(PROJECT_ROOT, 'vite.config.ts');

		expect(existsSync(viteConfigPath), 'vite.config.ts not found').toBe(true);

		const content = readFileSync(viteConfigPath, 'utf-8');

		// Tailwind v4 Vite plugin
		expect(content, 'Tailwind v4 Vite plugin not found in vite.config.ts').toMatch(
			/@tailwindcss\/vite/
		);

		// Paraglide Vite plugin
		expect(content, 'Paraglide Vite plugin not found in vite.config.ts').toMatch(/paraglide/i);
	});

	test.skip('[P1] 1.1-UNIT-001f — hooks.server.ts wires Paraglide middleware', () => {
		// NOTE: Paraglide 2.0 uses paraglideMiddleware from '$lib/paraglide/server'
		// instead of i18n.handle() (which was Paraglide v1 style).
		const hooksPath = path.join(PROJECT_ROOT, 'src/hooks.server.ts');

		expect(existsSync(hooksPath), 'src/hooks.server.ts not found').toBe(true);

		const content = readFileSync(hooksPath, 'utf-8');

		// Paraglide 2.0: paraglideMiddleware from $lib/paraglide/server
		// OR legacy Paraglide 1.x: i18n.handle() from $lib/paraglide/i18n
		const hasParaglideV2 = /paraglideMiddleware/.test(content);
		const hasParaglideV1 = /i18n\.handle\(\)/.test(content);
		expect(
			hasParaglideV2 || hasParaglideV1,
			'Paraglide middleware not found in hooks.server.ts'
		).toBe(true);
	});

	test.skip('[P1] 1.1-UNIT-001g — project.inlang/settings.json has en source and th locale', () => {
		// NOTE: Paraglide 2.0 uses "baseLocale" and "locales" instead of
		// "sourceLanguageTag" and "languageTags" (Paraglide v1 schema).
		const settingsPath = path.join(PROJECT_ROOT, 'project.inlang/settings.json');

		expect(existsSync(settingsPath), 'project.inlang/settings.json not found').toBe(true);

		const settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) as {
			sourceLanguageTag?: string;
			languageTags?: string[];
			baseLocale?: string;
			locales?: string[];
		};

		// Support both Paraglide v1 (sourceLanguageTag/languageTags) and v2 (baseLocale/locales)
		const sourceLocale = settings.baseLocale ?? settings.sourceLanguageTag;
		const allLocales = settings.locales ?? settings.languageTags;
		expect(sourceLocale, 'source locale must be "en"').toBe('en');
		expect(allLocales, 'locales must include "th"').toContain('th');
	});

	test.skip('[P1] 1.1-UNIT-001h — drizzle.config.ts uses node-postgres dialect and correct schema path', () => {
		// THIS TEST WILL FAIL — drizzle.config.ts not yet created.
		const drizzleConfigPath = path.join(PROJECT_ROOT, 'drizzle.config.ts');

		expect(existsSync(drizzleConfigPath), 'drizzle.config.ts not found').toBe(true);

		const content = readFileSync(drizzleConfigPath, 'utf-8');

		expect(content, 'drizzle.config.ts must use dialect: postgresql').toMatch(
			/dialect.*postgresql/
		);
		expect(content, 'drizzle.config.ts must reference schema in src/lib/server/db/').toMatch(
			/src\/lib\/server\/db\/schema/
		);
		expect(content, 'drizzle.config.ts output must be ./drizzle').toMatch(/out.*\.\/drizzle/);
	});

	test.skip('[P2] 1.1-UNIT-003e — no hardcoded Tailwind config.js file exists (Tailwind v4 is CSS-only)', () => {
		// THIS TEST WILL FAIL — project not yet created.
		// Tailwind v4 does NOT use tailwind.config.js. If sv create or shadcn-svelte
		// accidentally creates one, this test catches it.
		const legacyConfig = path.join(PROJECT_ROOT, 'tailwind.config.js');
		const legacyConfigCjs = path.join(PROJECT_ROOT, 'tailwind.config.cjs');
		const legacyConfigTs = path.join(PROJECT_ROOT, 'tailwind.config.ts');

		expect(
			existsSync(legacyConfig),
			'tailwind.config.js must NOT exist — Tailwind v4 uses CSS-only config'
		).toBe(false);
		expect(existsSync(legacyConfigCjs), 'tailwind.config.cjs must NOT exist').toBe(false);
		expect(existsSync(legacyConfigTs), 'tailwind.config.ts must NOT exist').toBe(false);
	});
});
