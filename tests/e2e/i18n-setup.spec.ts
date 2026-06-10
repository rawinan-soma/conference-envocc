/**
 * ATDD Red-Phase E2E Scaffolds — Story 1.4: Internationalization Setup
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * These E2E tests verify browser-observable behaviour:
 *   - AC-5: Accept-Language: th sets correct html[lang] and html[dir] attributes
 *   - AC-6: Home page renders English source string via m.home_title()
 *   - AC-2: Paraglide-compiled message renders correctly in the browser
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test.
 *   2. Run: `bun run test:e2e` — verify it FAILS first (red).
 *   3. Implement the feature.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * NOTE: Thai language is a production requirement. Rawinan provides all Thai
 * translations. NEVER write Thai text in code or mocks — use English
 * placeholder strings for th locale assertions.
 */

import { test, expect } from '@playwright/test';

test.describe('Story 1.4 — Internationalization E2E Tests (ATDD Red Phase)', () => {
	// -------------------------------------------------------------------------
	// P1 — 1.4-E2E-001
	// AC-6: Home page renders the English source string (m.home_title())
	// -------------------------------------------------------------------------

	test.skip('[P1] 1.4-E2E-001 — home page renders m.home_title() English source string', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — +page.svelte still has hardcoded strings, not m.home_title().
		// Activate after Task 3.1–3.3: replace hardcoded strings with m.*() calls.
		const response = await page.goto('/');

		// Page must respond successfully
		expect(response?.status()).toBe(200);

		// The Paraglide-compiled home_title message must appear in the page
		// Per dev notes: home_title = "Room Booking System"
		await expect(
			page.getByRole('heading', { name: 'Room Booking System' }),
			'Home page heading must render m.home_title() = "Room Booking System"'
		).toBeVisible();
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-E2E-002
	// AC-5: html[lang] and html[dir] attributes are set for the default "en" locale
	// -------------------------------------------------------------------------

	test.skip('[P1] 1.4-E2E-002 — home page has html[lang="en"] and html[dir] set by Paraglide', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — Paraglide middleware may not be wired or app.html
		// may be missing %paraglide.lang% / %paraglide.dir% placeholders.
		// Activate after Task 1.3–1.4 verification.
		await page.goto('/');

		const lang = await page.getAttribute('html', 'lang');
		const dir = await page.getAttribute('html', 'dir');

		// Default locale is "en" — Paraglide sets lang="en"
		expect(
			lang,
			'html[lang] must be set to "en" by paraglideMiddleware for the default locale'
		).toBe('en');

		// English is LTR — dir must be "ltr"
		expect(
			dir,
			'html[dir] must be set to "ltr" for the "en" locale (left-to-right)'
		).toBe('ltr');
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-E2E-003
	// AC-5: Accept-Language: th header causes Paraglide to set lang="th" and dir="ltr"
	// -------------------------------------------------------------------------

	test.skip('[P1] 1.4-E2E-003 — Accept-Language: th sets html[lang="th"] and html[dir] via Paraglide', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — paraglideMiddleware not yet wired, or locale negotiation
		// not respecting Accept-Language header.
		// Activate after Task 1.3 (hooks.server.ts paraglideMiddleware verification).
		//
		// Strategy: set Accept-Language header on the request; Paraglide 2.0
		// middleware negotiates locale from Accept-Language when no explicit
		// URL prefix / cookie is set.
		await page.setExtraHTTPHeaders({ 'Accept-Language': 'th,en;q=0.9' });
		await page.goto('/');

		const lang = await page.getAttribute('html', 'lang');
		const dir = await page.getAttribute('html', 'dir');

		// Paraglide must negotiate "th" from Accept-Language header
		expect(
			lang,
			'html[lang] must be "th" when Accept-Language: th is sent'
		).toBe('th');

		// Thai is LTR — dir must be "ltr"
		expect(
			dir,
			'html[dir] must be "ltr" for Thai locale'
		).toBe('ltr');
	});

	// -------------------------------------------------------------------------
	// P1 — 1.4-E2E-004
	// AC-2 + AC-6: Page renders without console errors (Paraglide import path valid)
	// -------------------------------------------------------------------------

	test.skip('[P1] 1.4-E2E-004 — home page loads without console errors after Paraglide wiring', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — +page.svelte may have import errors (e.g. broken
		// $lib/paraglide/messages import) before the build is run.
		// Activate after Task 3.3: verify page renders via bun run dev.
		const consoleErrors: string[] = [];

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto('/');

		expect(
			consoleErrors,
			`Page must load without console errors. Found: ${consoleErrors.join(', ')}`
		).toHaveLength(0);
	});

	// -------------------------------------------------------------------------
	// P2 — 1.4-E2E-005
	// AC-2: The compiled Paraglide message for app_name is accessible in the page
	// -------------------------------------------------------------------------

	test.skip('[P2] 1.4-E2E-005 — page title or app name reflects m.app_name() "Conference Room Booking"', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — app_name message key is not yet wired into any
		// visible element. Activate when a component uses m.app_name().
		// Per dev notes: app_name = "Conference Room Booking"
		await page.goto('/');

		// The app name must appear somewhere on the page (title, header, nav, etc.)
		const appName = 'Conference Room Booking';

		await expect(
			page.getByText(appName, { exact: false }),
			`Page must display app name "${appName}" rendered via m.app_name()`
		).toBeVisible();
	});
});
