/**
 * ATDD Red-Phase E2E Scaffolds — Story 1.8: Test Harness & CI
 * Accessibility Smoke Test (axe-core)
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current test.
 *   2. Run: `bun run test:e2e` — verify it FAILS first (red).
 *   3. Install @axe-core/playwright: `bun add -d @axe-core/playwright` (Task 5.1)
 *   4. Run again — verify it PASSES (green) once axe-core is integrated.
 *   5. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-3: axe-core check runs against rendered page and reports zero violations
 *
 * Scenario IDs:
 *   - 1.8-INT-002: axe-core check against rendered page with zero violations
 *
 * Prerequisites:
 *   - @axe-core/playwright installed (Task 5.1)
 *   - Dev server running at http://localhost:5173 (or CI at http://localhost:3000)
 *   - playwright.config.ts updated with CI baseURL (Task 6.1)
 *
 * Note: No Thai text hardcoded — per project rule, Rawinan handles all Thai translations.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// 1.8-INT-002 — axe-core: zero violations on rendered home page (AC-3)
// ---------------------------------------------------------------------------

test.describe('Story 1.8 — Accessibility Smoke Test (AC-3, ATDD Red Phase)', () => {
	test('[P1] 1.8-INT-002 — axe-core reports zero WCAG 2.1 AA violations on home page', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — @axe-core/playwright is not installed yet (Task 5.1).
		// Activate after Task 5.1 and Task 5.2.
		//
		// AC-3: When the Playwright suite executes, an axe-core check runs against a
		// rendered page and reports zero violations.
		await page.goto('/');

		// Run axe-core with WCAG 2.1 AA tag scope
		// Using .withTags to avoid failing on early-scaffold violations outside WCAG 2.1 AA
		// Do NOT use .disableRules([...]) — that hides real violations
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		// Assert zero violations
		expect(
			accessibilityScanResults.violations,
			`axe-core found ${accessibilityScanResults.violations.length} WCAG 2.1 AA violation(s):\n` +
				accessibilityScanResults.violations
					.map(
						(v) =>
							`  - [${v.impact}] ${v.id}: ${v.description}\n    Affected nodes: ${v.nodes.map((n) => n.html).join(', ')}`
					)
					.join('\n')
		).toEqual([]);
	});

	test('[P2] 1.8-INT-002b — axe-core passes on all critical P0 pages', async ({ page }) => {
		// THIS TEST WILL FAIL — additional pages may not exist yet.
		// Activate after Task 5.2 and when routes beyond / are scaffolded.
		//
		// Runs axe-core on all critical user-facing pages.
		// Scope to WCAG 2.1 AA for consistent baseline.

		const pagesToCheck = [
			'/' // Home page (walking skeleton vertical slice — Story 1.9)
		];

		for (const pagePath of pagesToCheck) {
			await page.goto(pagePath);

			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.analyze();

			expect(
				results.violations,
				`Page "${pagePath}": axe-core found ${results.violations.length} WCAG 2.1 AA violation(s):\n` +
					results.violations.map((v) => `  - [${v.impact}] ${v.id}: ${v.description}`).join('\n')
			).toEqual([]);
		}
	});
});
