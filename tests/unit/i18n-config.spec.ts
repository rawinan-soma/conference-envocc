/**
 * ATDD Tests — Story 1.4: Internationalization Setup
 * Focus: Paraglide infrastructure configuration verification (AC-1, AC-5 supplemental)
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test.
 *   2. Run: `bunx vitest run tests/unit/i18n-config.spec.ts` — verify it FAILS (red).
 *   3. Implement the feature.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * See i18n-messages.spec.ts for message key, ESLint guard, and page component tests.
 */

import { test, expect, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { runCmd } from '../support/helpers/cmd-helpers';

const PROJECT_ROOT = path.resolve(process.cwd());

describe('Story 1.4 — i18n Paraglide Configuration', () => {
	// -------------------------------------------------------------------------
	// P2 — 1.4-UNIT-007
	// AC-1 (supplemental): project.inlang/settings.json has correct Paraglide 2.0 config
	// -------------------------------------------------------------------------

	test('[P2] 1.4-UNIT-007 — project.inlang/settings.json has baseLocale "en" and locales ["en","th"]', () => {
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
	// Quality-gate test — runs bun run check (slow by design).
	// -------------------------------------------------------------------------

	test('[P1] 1.4-UNIT-010 — bun run check (svelte-check) exits 0', () => {
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
