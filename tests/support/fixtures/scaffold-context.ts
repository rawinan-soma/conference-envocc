/**
 * Shared fixture context for Story 1.1 scaffold tests.
 *
 * TDD RED PHASE: This file provides minimal type stubs and helpers for the
 * red-phase test scaffolds. Full fixture implementations will be added in
 * Story 1.8 (Test Harness & CI).
 *
 * No `test.extend()` patterns yet — Story 1.1 tests are unit/smoke tests
 * that do not require database or auth fixtures.
 */

import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScaffoldCheckResult {
	/** Exit code from the shell command (0 = success) */
	exitCode: number;
	stdout: string;
	stderr: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the dev server root and collect any console errors.
 * Used by E2E smoke tests (Story 1.1).
 *
 * Uses a relative path ('/' by default) so Playwright resolves it against
 * the baseURL configured in playwright.config.ts — avoids hardcoding
 * http://localhost:PORT which breaks when the config port changes.
 *
 * RED PHASE: The dev server does not exist yet. This helper is a placeholder.
 */
export async function navigateToDevRoot(
	page: Page,
	path = '/'
): Promise<{ status: number | null; consoleErrors: string[] }> {
	const consoleErrors: string[] = [];

	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			consoleErrors.push(msg.text());
		}
	});

	const response = await page.goto(path);

	return {
		status: response?.status() ?? null,
		consoleErrors
	};
}

/**
 * Known required script names that must appear in package.json after scaffolding.
 * Exported so tests and CI validation scripts can reference the same list.
 */
export const REQUIRED_SCRIPTS: readonly string[] = [
	'dev',
	'build',
	'preview',
	'check',
	'lint',
	'format',
	'test',
	'test:e2e'
] as const;

/**
 * Known required files/paths that the scaffold must produce.
 * Aligns with Story 1.1 AC-1 and Dev Notes §"Project Structure".
 */
// NOTE: sv CLI v0.16.1+ uses vite.config.ts as the primary SvelteKit config (no svelte.config.js)
export const REQUIRED_SCAFFOLD_PATHS: readonly string[] = [
	'package.json',
	'bun.lock',
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
	'src/hooks.ts',
	'src/routes/+page.svelte',
	'src/routes/+layout.svelte'
] as const;
