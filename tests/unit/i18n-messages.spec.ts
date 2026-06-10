/**
 * ATDD Tests — Story 1.4: Internationalization Setup
 * Focus: Message keys, ESLint guard, and page component (AC-1..4, AC-6)
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test.
 *   2. Run: `bunx vitest run tests/unit/i18n-messages.spec.ts` — verify it FAILS (red).
 *   3. Implement the feature.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * Scenario IDs align with Story 1.4 acceptance criteria.
 * AC-1: Paraglide compiles en.json + th.json into src/lib/paraglide/
 * AC-2: Paraglide message keys render correctly
 * AC-3: ESLint rule fires on hardcoded inline English UI strings
 * AC-4: ESLint rule passes when only m.*() calls are used
 * AC-6: Home page renders English source string via m.home_title()
 *
 * See i18n-config.spec.ts for Paraglide infrastructure configuration tests (AC-5 supplemental).
 */

import { test, expect, describe } from 'vitest';
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { runCmd } from '../support/helpers/cmd-helpers';

const PROJECT_ROOT = path.resolve(process.cwd());

describe('Story 1.4 — i18n Messages & ESLint Guard', () => {
	// -------------------------------------------------------------------------
	// P1 — 1.4-UNIT-001
	// messages/en.json must contain canonical keys: app_name and home_title
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-001 — messages/en.json has canonical keys app_name and home_title', () => {
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
	// Quality-gate test — runs bun run build (slow by design).
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-003 — bun run build compiles Paraglide into src/lib/paraglide/', () => {
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
		// Activate after Task 4.1–4.3: configure the ESLint rule.
		//
		// Strategy: temporarily write a fixture .svelte file with a hardcoded string,
		// run eslint on it, confirm non-zero exit, then clean up.
		const fixtureDir = path.join(PROJECT_ROOT, 'tests/support/fixtures');
		// Use process.pid to make the filename worker-unique for parallel safety
		const fixtureFile = path.join(fixtureDir, `__hardcoded-string-fixture-${process.pid}.svelte`);

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
	// Quality-gate test — runs bun run lint (slow by design).
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-005 — bun run lint exits 0 when all source files use m.*() for UI text', () => {
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
});
