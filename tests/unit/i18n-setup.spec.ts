/**
 * ATDD Red-Phase Scaffolds — Story 1.4: Internationalization Setup
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
 * Scenario IDs align with Story 1.4 acceptance criteria.
 * AC-1: Paraglide compiles en.json + th.json into src/lib/paraglide/
 * AC-2: Paraglide message keys render correctly
 * AC-3: ESLint rule fires on hardcoded inline English UI strings
 * AC-4: ESLint rule passes when only m.*() calls are used
 * AC-5: Accept-Language: th → lang/dir HTML attrs set (E2E, see e2e/i18n.spec.ts)
 * AC-6: Home page renders English source string via m.home_title()
 */

import { test, expect, describe } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a shell command synchronously and return { stdout, stderr, exitCode }.
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
// Task 2 — Canonical message keys
// AC-1: Given scaffolded app, When bun run build executes, Then Paraglide
//        compiles messages/en.json and messages/th.json into src/lib/paraglide/
// ---------------------------------------------------------------------------

describe('Story 1.4 — Internationalization Setup (ATDD Red Phase)', () => {
	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-001
	// messages/en.json must contain canonical keys: app_name and home_title
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-001 — messages/en.json has canonical keys app_name and home_title', () => {
		// THIS TEST WILL FAIL — messages/en.json still has scaffold placeholder (hello_world).
		// Activate after Task 2.1: replace scaffold placeholder with canonical keys.
		const enJsonPath = path.join(PROJECT_ROOT, 'messages/en.json');

		expect(existsSync(enJsonPath), 'messages/en.json not found').toBe(true);

		const messages = JSON.parse(readFileSync(enJsonPath, 'utf-8')) as Record<string, string>;

		// Canonical keys per story AC-2 and Dev Notes §"Message Key Naming Convention"
		expect(messages, 'messages/en.json must have key "app_name"').toHaveProperty('app_name');
		expect(messages, 'messages/en.json must have key "home_title"').toHaveProperty('home_title');

		// Values must be non-empty English strings
		expect(messages.app_name, 'app_name must be a non-empty string').toBeTruthy();
		expect(messages.home_title, 'home_title must be a non-empty string').toBeTruthy();

		// Scaffold placeholder must be removed (or absent)
		expect(
			messages,
			'hello_world scaffold placeholder must be removed from messages/en.json'
		).not.toHaveProperty('hello_world');
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-002
	// messages/th.json must mirror all keys from en.json (no Thai text in code)
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-002 — messages/th.json mirrors all keys from en.json (no Thai text)', () => {
		// THIS TEST WILL FAIL — messages/th.json still has scaffold placeholder (hello_world).
		// Activate after Task 2.2: mirror canonical keys with English placeholder values.
		const enJsonPath = path.join(PROJECT_ROOT, 'messages/en.json');
		const thJsonPath = path.join(PROJECT_ROOT, 'messages/th.json');

		expect(existsSync(enJsonPath), 'messages/en.json not found').toBe(true);
		expect(existsSync(thJsonPath), 'messages/th.json not found').toBe(true);

		const enMessages = JSON.parse(readFileSync(enJsonPath, 'utf-8')) as Record<string, string>;
		const thMessages = JSON.parse(readFileSync(thJsonPath, 'utf-8')) as Record<string, string>;

		const enKeys = Object.keys(enMessages).sort();
		const thKeys = Object.keys(thMessages).sort();

		// th.json must have the exact same key set as en.json
		expect(thKeys, 'messages/th.json must have the same keys as en.json').toEqual(enKeys);

		// Critical: no Thai characters in code (production rule — Rawinan provides translations)
		// Thai Unicode range: U+0E00–U+0E7F
		const thValuesStr = JSON.stringify(thMessages);
		expect(
			thValuesStr,
			'messages/th.json must NOT contain Thai characters — use English placeholders; Rawinan provides translations'
		).not.toMatch(/[฀-๿]/);
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-003
	// AC-1: bun run build compiles Paraglide and produces src/lib/paraglide/
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-003 — bun run build compiles Paraglide into src/lib/paraglide/', () => {
		// THIS TEST WILL FAIL — src/lib/paraglide/ does not exist until build runs.
		// Activate after Task 2.3: run bun run build and confirm output.
		const result = runCmd('bun run build', PROJECT_ROOT);

		expect(result.exitCode, `bun run build failed:\n${result.stderr}`).toBe(0);

		// Paraglide Vite plugin outputs to src/lib/paraglide/ (configured in vite.config.ts)
		const paraglideDir = path.join(PROJECT_ROOT, 'src/lib/paraglide');
		expect(
			existsSync(paraglideDir),
			'src/lib/paraglide/ directory not found — Paraglide Vite plugin did not generate output'
		).toBe(true);

		// messages.js (or messages/index.js) must exist in the generated dir
		const messagesFile = path.join(paraglideDir, 'messages.js');
		const messagesIndexFile = path.join(paraglideDir, 'messages', 'index.js');
		expect(
			existsSync(messagesFile) || existsSync(messagesIndexFile),
			'Paraglide generated messages module not found in src/lib/paraglide/'
		).toBe(true);
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-004
	// AC-3: ESLint rule fires on hardcoded inline English UI strings in .svelte files
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-004 — ESLint fires on hardcoded inline UI strings in .svelte files', () => {
		// THIS TEST WILL FAIL — the ESLint hardcoded-string rule is not yet configured.
		// Activate after Task 4.1–4.3: configure the ESLint rule.
		//
		// Strategy: temporarily write a fixture .svelte file with a hardcoded string,
		// run eslint on it, confirm non-zero exit, then clean up.
		const fixtureDir = path.join(PROJECT_ROOT, 'tests/support/fixtures');
		const fixtureFile = path.join(fixtureDir, '__hardcoded-string-fixture.svelte');

		// Write a minimal Svelte file with a hardcoded UI string
		const hardcodedContent = `<script lang="ts"></script>\n<h1>Welcome to SvelteKit</h1>\n`;
		mkdirSync(fixtureDir, { recursive: true });
		writeFileSync(fixtureFile, hardcodedContent, 'utf-8');

		try {
			const result = runCmd(`bunx eslint "${fixtureFile}"`, PROJECT_ROOT);

			// ESLint must exit non-zero (rule fires on hardcoded string)
			expect(
				result.exitCode,
				'ESLint should exit non-zero when a hardcoded UI string is found in a .svelte file'
			).not.toBe(0);
		} finally {
			// Always clean up the fixture file
			if (existsSync(fixtureFile)) {
				unlinkSync(fixtureFile);
			}
		}
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-005
	// AC-4: ESLint exits 0 when all Svelte/TS source files use only m.*() for user-facing text
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-005 — bun run lint exits 0 when all source files use m.*() for UI text', () => {
		// THIS TEST WILL FAIL — +page.svelte still has hardcoded strings before Task 3.
		// Activate after Task 3.1–3.2 and Task 4.5: all strings replaced, lint passes.
		const result = runCmd('bun run lint', PROJECT_ROOT);

		expect(
			result.exitCode,
			`bun run lint must exit 0 after replacing all hardcoded UI strings.\nStderr: ${result.stderr}\nStdout: ${result.stdout}`
		).toBe(0);
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-006
	// AC-2: src/routes/+page.svelte imports * as m and uses m.home_title()
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-006 — +page.svelte imports m from paraglide/messages and uses m.home_title()', () => {
		// THIS TEST WILL FAIL — +page.svelte still uses hardcoded strings.
		// Activate after Task 3.1–3.2: replace hardcoded strings with m.*() calls.
		const pagePath = path.join(PROJECT_ROOT, 'src/routes/+page.svelte');

		expect(existsSync(pagePath), 'src/routes/+page.svelte not found').toBe(true);

		const content = readFileSync(pagePath, 'utf-8');

		// Must import Paraglide messages namespace
		expect(content, '+page.svelte must import * as m from $lib/paraglide/messages').toMatch(
			/import\s+\*\s+as\s+m\s+from\s+['"](?:\$lib\/paraglide\/messages|\.\..*\/paraglide\/messages)['"]/
		);

		// Must use m.home_title() in the template
		expect(content, '+page.svelte must use m.home_title() for the home title').toMatch(
			/m\.home_title\(\)/
		);

		// Must NOT have hardcoded "Welcome to SvelteKit" raw text
		expect(
			content,
			'+page.svelte must not contain hardcoded "Welcome to SvelteKit" string — use m.home_title()'
		).not.toMatch(/Welcome to SvelteKit/);
	});

	// -------------------------------------------------------------------------
	// P2 — 1.4-UNIT-007
	// AC-1 (supplemental): project.inlang/settings.json has correct Paraglide 2.0 config
	// -------------------------------------------------------------------------

	test('[P2] 1.4-UNIT-007 — project.inlang/settings.json has baseLocale "en" and locales ["en","th"]', () => {
		// THIS TEST WILL FAIL if settings.json is not correctly set up.
		// Activate after Task 1.1 verification.
		const settingsPath = path.join(PROJECT_ROOT, 'project.inlang/settings.json');

		expect(existsSync(settingsPath), 'project.inlang/settings.json not found').toBe(true);

		const settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) as {
			baseLocale?: string;
			locales?: string[];
			sourceLanguageTag?: string;
			languageTags?: string[];
		};

		// Paraglide 2.0 uses baseLocale/locales (not sourceLanguageTag/languageTags)
		const sourceLocale = settings.baseLocale ?? settings.sourceLanguageTag;
		const allLocales = settings.locales ?? settings.languageTags;

		expect(sourceLocale, 'project.inlang/settings.json: baseLocale must be "en"').toBe('en');
		expect(allLocales, 'project.inlang/settings.json: locales must include "en"').toContain('en');
		expect(allLocales, 'project.inlang/settings.json: locales must include "th"').toContain('th');
	});

	// -------------------------------------------------------------------------
	// P2 — 1.4-UNIT-008
	// AC-5 (supplemental): src/app.html has %paraglide.lang% and %paraglide.dir% placeholders
	// -------------------------------------------------------------------------

	test('[P2] 1.4-UNIT-008 — src/app.html has %paraglide.lang% and %paraglide.dir% placeholders', () => {
		// THIS TEST WILL FAIL if app.html does not have the Paraglide placeholders.
		// Activate after Task 1.4 verification.
		const appHtmlPath = path.join(PROJECT_ROOT, 'src/app.html');

		expect(existsSync(appHtmlPath), 'src/app.html not found').toBe(true);

		const content = readFileSync(appHtmlPath, 'utf-8');

		expect(content, 'src/app.html <html> tag must have lang="%paraglide.lang%"').toMatch(
			/%paraglide\.lang%/
		);

		expect(content, 'src/app.html <html> tag must have dir="%paraglide.dir%"').toMatch(
			/%paraglide\.dir%/
		);
	});

	// -------------------------------------------------------------------------
	// P2 — 1.4-UNIT-009
	// AC-5 (supplemental): src/hooks.server.ts uses paraglideMiddleware
	// -------------------------------------------------------------------------

	test('[P2] 1.4-UNIT-009 — src/hooks.server.ts uses Paraglide 2.0 paraglideMiddleware', () => {
		// THIS TEST WILL FAIL if hooks.server.ts is missing or incorrectly set up.
		// Activate after Task 1.3 verification.
		const hooksPath = path.join(PROJECT_ROOT, 'src/hooks.server.ts');

		expect(existsSync(hooksPath), 'src/hooks.server.ts not found').toBe(true);

		const content = readFileSync(hooksPath, 'utf-8');

		// Paraglide 2.0 middleware pattern
		expect(content, 'src/hooks.server.ts must use paraglideMiddleware (Paraglide 2.0 API)').toMatch(
			/paraglideMiddleware/
		);

		// Must handle transformPageChunk for %paraglide.lang% / %paraglide.dir% replacement
		expect(
			content,
			'src/hooks.server.ts must implement transformPageChunk for paraglide placeholder substitution'
		).toMatch(/transformPageChunk/);
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-010
	// Quality gates: bun run check (svelte-check) exits 0
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-010 — bun run check (svelte-check) exits 0', () => {
		// THIS TEST WILL FAIL — svelte-check may fail before all changes are applied.
		// Activate after all tasks are complete (Task 5.3).
		const result = runCmd('bun run check', PROJECT_ROOT);

		expect(
			result.exitCode,
			`bun run check must exit 0.\nStderr: ${result.stderr}\nStdout: ${result.stdout}`
		).toBe(0);
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-011
	// Quality gates: vite.config.ts includes paraglideVitePlugin with correct config
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-011 — vite.config.ts includes paraglideVitePlugin pointing to project.inlang', () => {
		// THIS TEST WILL FAIL if vite.config.ts is missing the Paraglide plugin.
		// Activate after Task 1.2 verification.
		const viteConfigPath = path.join(PROJECT_ROOT, 'vite.config.ts');

		expect(existsSync(viteConfigPath), 'vite.config.ts not found').toBe(true);

		const content = readFileSync(viteConfigPath, 'utf-8');

		// Must include the Paraglide Vite plugin
		expect(content, 'vite.config.ts must include paraglide plugin import').toMatch(/paraglide/i);

		// Must point to the correct project and outdir
		expect(content, 'vite.config.ts paraglide plugin must reference project.inlang').toMatch(
			/project\.inlang/
		);

		expect(content, 'vite.config.ts paraglide plugin must output to src/lib/paraglide').toMatch(
			/src\/lib\/paraglide/
		);
	});
});
