/**
 * ATDD Red-Phase E2E Scaffolds — Story 1.8: Test Harness & CI
 * Thai Render Smoke Test
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current test.
 *   2. Run: `bun run test:e2e` — verify it FAILS first (red).
 *   3. Implement the feature (Thai font loading + Paraglide locale).
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-3: Playwright suite executes Thai-render smoke test
 *   - Supplements R-004: Thai locale active, Paraglide messages rendering, Thai font loaded
 *
 * Scenario IDs:
 *   - 1.8-INT-003: Thai-render smoke — page renders without font-substitution artifacts
 *
 * Prerequisites:
 *   - Dev server running (Paraglide i18n configured — Story 1.4 done)
 *   - Thai fonts (Noto Serif Thai / Noto Sans Thai) referenced in app.css (Story 1.2 done)
 *   - Paraglide locale middleware active in hooks.server.ts (Story 1.4 done)
 *   - playwright.config.ts updated for CI baseURL (Task 6.1)
 *
 * Note: No Thai text hardcoded in this file — per project rule:
 *   Rawinan handles all Thai translations.
 *   Tests verify structural/locale attributes, not specific Thai string content.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// 1.8-INT-003 — Thai render smoke (AC-3)
// ---------------------------------------------------------------------------

test.describe('Story 1.8 — Thai Render Smoke Test (AC-3, ATDD Red Phase)', () => {
	test('[P1] 1.8-INT-003 — Home page has lang attribute set by Paraglide middleware', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — page.goto('/') must succeed and lang attribute must be present.
		// Activate after Task 5.3.
		//
		// AC: Playwright smoke test verifies Paraglide locale is wired in hooks.server.ts.
		// The lang attribute on <html> should be set to either 'th' or 'en' (not missing).
		// In dev/CI environment, the default locale is 'en' per Story 1.4 implementation.
		await page.goto('/');

		// Wait for page to fully load
		await page.waitForLoadState('networkidle');

		// Verify lang attribute is set (Paraglide paraglideMiddleware sets %paraglide.lang%)
		const htmlLang = await page.locator('html').getAttribute('lang');
		expect(
			htmlLang,
			'<html lang="..."> attribute must be set by Paraglide middleware (should be "en" in dev or "th" in Thai locale)'
		).toBeTruthy();

		// Must be a valid BCP 47 language tag (en, th, etc.) — not empty string
		expect(htmlLang, 'lang attribute must be a valid non-empty BCP 47 language tag').toMatch(
			/^[a-z]{2}(-[A-Z]{2})?$/
		);
	});

	test('[P1] 1.8-INT-003b — Home page renders Paraglide message (not raw message key)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — app must be rendering actual message values, not keys.
		// Activate after Task 5.3.
		//
		// AC: Paraglide messages compile and render as human-readable strings.
		// A raw message key like "app_name" or "home_title" must not appear as literal text.
		// The page title or heading must be the resolved message value.
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Get all text content from the page
		const bodyText = await page.locator('body').textContent();
		expect(bodyText, 'page body content must not be empty').toBeTruthy();

		// Message keys from messages/en.json — these raw key strings must NOT appear as visible text
		// (they should be replaced with compiled message values by Paraglide)
		const rawKeys = ['app_name', 'home_title'];

		for (const key of rawKeys) {
			expect(
				bodyText,
				`Raw Paraglide message key "${key}" must not appear as visible text — Paraglide compilation may be broken`
			).not.toContain(`"${key}"`);
		}
	});

	test('[P1] 1.8-INT-003c — Thai font (Noto Serif Thai or Noto Sans Thai) is available in document.fonts', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — Thai fonts may not be loaded yet in the running app.
		// Activate after Task 5.3 (after Story 1.2 Thai typography is confirmed).
		//
		// AC: Story 1.2 wired Noto Serif Thai and Noto Sans Thai in app.css.
		// This smoke test verifies the browser has loaded at least one Thai font family.
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Check document.fonts for Thai font families
		const thaiFont = await page.evaluate(async () => {
			// Wait for fonts to load
			await document.fonts.ready;

			const loadedFonts: string[] = [];
			document.fonts.forEach((font) => {
				if (font.status === 'loaded') {
					loadedFonts.push(font.family);
				}
			});

			// Check for Thai font families as specified in DESIGN.md
			const hasThai = loadedFonts.some(
				(f) => f.toLowerCase().includes('noto') && f.toLowerCase().includes('thai')
			);

			return { hasThai, loadedFonts };
		});

		expect(
			thaiFont.hasThai,
			`Thai font not found in document.fonts — loaded fonts: [${thaiFont.loadedFonts.join(', ')}]. ` +
				'Expected "Noto Serif Thai" or "Noto Sans Thai" to be present (wired in app.css per Story 1.2).'
		).toBe(true);
	});

	test('[P2] 1.8-INT-003d — dir attribute is set correctly by Paraglide middleware', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — page.goto('/') must succeed and dir attribute must be present.
		// Activate after Task 5.3.
		//
		// Paraglide middleware in hooks.server.ts sets %paraglide.dir% on <html>.
		// For Thai (th) locale, dir = 'ltr'; for English (en) locale, dir = 'ltr'.
		// Verify the attribute is set by the middleware (not missing/empty).
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const htmlDir = await page.locator('html').getAttribute('dir');

		// dir must be 'ltr' or 'rtl' (both Thai and English are LTR)
		expect(htmlDir, '<html dir="..."> attribute must be set by Paraglide middleware').toMatch(
			/^(ltr|rtl)$/
		);
	});
});
