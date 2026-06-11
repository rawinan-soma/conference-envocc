/**
 * ATDD Red-Phase E2E Scaffolds — Story 1.9: Walking-skeleton Vertical Slice
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test(s).
 *   2. Run: `bun run test:e2e -- --grep "<test-id>"` — verify it FAILS first (red).
 *   3. Implement the feature.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1a: Skeleton route renders themed page with Thai Paraglide string (not a raw key)
 *   - AC-1b: Route write inserts DB row guarded by EXCLUDE constraint (verified via INT tests)
 *   - AC-1c: Skeleton form submit → job → Mailpit email delivered (AC-1c)
 *   - Deferred 1.2-UNIT-008: Home page renders shadcn Button component
 *   - Deferred 1.2-COMP-002: Home page body text has Thai line-height >= 1.65
 *
 * Scenario IDs:
 *   - 1.9-E2E-001: Skeleton route renders with lang="th" and a Paraglide Thai string
 *   - 1.9-E2E-002: Skeleton route is themed (Forest & Copper CSS variable present)
 *   - 1.9-E2E-003: Form submit → Mailpit receives email within 10s
 *   - 1.9-E2E-004: axe-core: zero WCAG 2.1 AA violations on skeleton page
 *   - 1.9-E2E-005: Home page renders shadcn Button component (resolves deferred 1.2-UNIT-008)
 *   - 1.9-E2E-006: Home page body text has computed line-height >= 1.65 (resolves 1.2-COMP-002)
 *   - 1.9-E2E-007: Skeleton route displays success indicator after form submit (UX smoke)
 *   - 1.9-E2E-008: Skeleton route responds within 2s (informational baseline, no SLA)
 *
 * Prerequisites:
 *   - Dev server running on port 3000 (or Docker Compose stack for full-stack tests)
 *   - Mailpit running on port 8025 (for AC-1c / 1.9-E2E-003)
 *   - Skeleton route implemented: src/routes/skeleton/+page.svelte + +page.server.ts
 *   - @axe-core/playwright installed (already in devDependencies)
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   Tests verify structural/locale attributes, not specific Thai string content.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// Story 1.9 — Skeleton route: basic render checks (Task 5.2, AC-1, AC-6)
// ---------------------------------------------------------------------------

test.describe('Story 1.9 — Skeleton Route: Smoke Checks (activated)', () => {
	test('[P0] 1.9-E2E-TITLE — Skeleton route page title contains "Walking Skeleton"', async ({
		page
	}) => {
		await page.goto('/skeleton');
		await page.waitForLoadState('networkidle');

		// The CardTitle renders m.skeleton_title() = "Walking Skeleton"
		const titleText = await page.locator('h3').first().textContent();
		expect(
			titleText,
			'Skeleton page must contain "Walking Skeleton" heading from m.skeleton_title()'
		).toContain('Walking Skeleton');
	});

	test('[P1] 1.9-E2E-A11Y — axe-core: zero WCAG 2.1 AA violations on skeleton page (AC-6)', async ({
		page
	}) => {
		await page.goto('/skeleton');
		await page.waitForLoadState('networkidle');

		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(
			results.violations,
			`axe-core found ${results.violations.length} WCAG 2.1 AA violation(s):\n` +
				results.violations
					.map(
						(v) =>
							`  - [${v.impact}] ${v.id}: ${v.description}\n    Affected nodes: ${v.nodes.map((n) => n.html).join(', ')}`
					)
					.join('\n')
		).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// AC-1a: Skeleton route renders with lang="th" and a resolved Paraglide string
// ---------------------------------------------------------------------------

test.describe('Story 1.9 — Skeleton Route: Render & Theme (AC-1a, AC-1b)', () => {
	test.skip(
		true,
		'RED phase — activate after skeleton route is implemented in src/routes/skeleton/'
	);

	test('[P0] 1.9-E2E-001 — Skeleton route renders with lang="th" and Paraglide string visible (not raw key)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — skeleton route not yet created (src/routes/skeleton/+page.svelte).
		// Activate after Task: Implement Skeleton Route.
		//
		// AC-1a: Skeleton route renders a themed page with a Thai Paraglide string.
		// The <html> lang attribute must be "th" (set by Paraglide paraglideMiddleware).
		// The heading with data-testid="skeleton-heading" must contain a resolved message value
		// (not the raw Paraglide key like "skeleton_heading").
		await page.goto('/skeleton');
		await page.waitForLoadState('networkidle');

		// Assert Paraglide middleware set lang="th"
		const htmlLang = await page.locator('html').getAttribute('lang');
		expect(htmlLang, '<html lang="..."> must be set by Paraglide middleware — expected "th"').toBe(
			'th'
		);

		// Assert skeleton heading is present and contains a resolved string (not a raw key)
		const headingLocator = page.locator('[data-testid="skeleton-heading"]');
		await expect(headingLocator).toBeVisible();

		const headingText = await headingLocator.textContent();
		expect(headingText, 'Skeleton heading text must not be empty').toBeTruthy();

		// Raw Paraglide keys must NOT appear as visible text
		const rawKeys = ['skeleton_heading', 'home_title', 'app_name'];
		for (const key of rawKeys) {
			expect(
				headingText,
				`Raw Paraglide key "${key}" must not appear as visible text — Paraglide compilation may be broken`
			).not.toContain(key);
		}
	});

	test('[P0] 1.9-E2E-002 — Skeleton route is themed with Forest & Copper CSS variables', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — skeleton route not yet created.
		// Activate after Task: Implement Skeleton Route.
		//
		// AC-1a: Skeleton route renders a themed page using Forest & Copper palette.
		// The CSS custom property --color-primary (or a Forest/Copper variable such as
		// --green-500 or --copper-500) must be defined on the :root or body element.
		await page.goto('/skeleton');
		await page.waitForLoadState('networkidle');

		// Check for Forest & Copper theme CSS variable(s) on :root
		const hasPrimaryColor = await page.evaluate(() => {
			const rootStyles = getComputedStyle(document.documentElement);
			const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim();
			const green500 = rootStyles.getPropertyValue('--green-500').trim();
			const copper500 = rootStyles.getPropertyValue('--copper-500').trim();
			return colorPrimary.length > 0 || green500.length > 0 || copper500.length > 0;
		});

		expect(
			hasPrimaryColor,
			'Forest & Copper theme CSS variable (--color-primary, --green-500, or --copper-500) must be present on :root — theme not wired'
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// AC-1c: Form submit → enqueueJob → worker → Mailpit email delivered
// ---------------------------------------------------------------------------

test.describe('Story 1.9 — Skeleton Form: Job → Email Delivery (AC-1c)', () => {
	test.skip(
		true,
		'RED phase — activate after skeleton form action is implemented (DB write + audit + enqueueJob)'
	);

	test('[P0] 1.9-E2E-003 — Submitting skeleton form triggers job that delivers email to Mailpit within 10s', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — skeleton form action not yet implemented.
		// Activate after Task: Implement Skeleton Form Action (DB write + audit + job).
		//
		// AC-1c: The skeleton route form action enqueues a smoke email job.
		// The worker picks it up and delivers the email to Mailpit.
		// Full-stack test: requires Docker Compose stack (web + worker + Postgres + Mailpit).
		//
		// Mailpit API: GET http://localhost:8025/api/v1/messages
		// data.messages is an array; data.total is the count.

		const mailpitUrl = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

		// Clear Mailpit inbox before the test to avoid interference from prior tests
		await fetch(`${mailpitUrl}/api/v1/messages`, { method: 'DELETE' }).catch(() => {
			// Ignore — Mailpit may not support bulk delete; test still proceeds
		});

		// Navigate to skeleton route and submit the form
		await page.goto('/skeleton');
		await page.waitForLoadState('networkidle');

		// Submit the skeleton form (button with type="submit" or [data-testid="skeleton-submit"])
		const submitButton = page
			.locator('[data-testid="skeleton-submit"], button[type="submit"]')
			.first();
		await expect(submitButton).toBeVisible();
		await submitButton.click();

		// Wait for job to be processed and email to arrive in Mailpit (max 10s)
		const emailDelivered = await page
			.waitForFunction(
				async ([url]: [string]) => {
					try {
						const res = await fetch(`${url}/api/v1/messages`);
						if (!res.ok) return false;
						const data = (await res.json()) as { total?: number };
						return (data.total ?? 0) >= 1;
					} catch {
						return false;
					}
				},
				[mailpitUrl] as [string],
				{ timeout: 10_000, polling: 500 }
			)
			.catch(() => null);

		expect(
			emailDelivered,
			'Expected at least 1 email in Mailpit within 10s after skeleton form submit — worker may not be processing jobs or Mailpit is not running'
		).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// P1: Accessibility — axe-core WCAG 2.1 AA on skeleton page
// ---------------------------------------------------------------------------

test.describe('Story 1.9 — Skeleton Route: Accessibility (P1)', () => {
	test.skip(
		true,
		'RED phase — activate after skeleton route is implemented and renders without critical errors'
	);

	test('[P1] 1.9-E2E-004 — axe-core: zero WCAG 2.1 AA violations on skeleton page', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — skeleton route not yet created.
		// Activate after Task: Full Stack Verification.
		//
		// Run axe-core accessibility audit on the skeleton page.
		// Must have zero violations at WCAG 2.1 AA level.
		await page.goto('/skeleton');
		await page.waitForLoadState('networkidle');

		const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

		expect(
			results.violations,
			`axe-core found ${results.violations.length} WCAG 2.1 AA violation(s): ${JSON.stringify(
				results.violations.map((v) => ({ id: v.id, description: v.description, impact: v.impact })),
				null,
				2
			)}`
		).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// P1: Deferred Story 1.2 — Home page Button + Thai typography fixes
// ---------------------------------------------------------------------------

test.describe('Story 1.9 — Deferred 1.2 Fixes: Home Page Button & Thai Typography', () => {
	test.skip(
		true,
		'RED phase — activate after Task: Fix Deferred Story 1.2 Home Page (Button + Thai Typography)'
	);

	test('[P1] 1.9-E2E-005 — Home page renders a shadcn Button component (resolves deferred 1.2-UNIT-008)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — +page.svelte does not yet include a shadcn Button component.
		// Activate after Task: Fix Deferred Story 1.2 Home Page.
		//
		// Resolves deferred-work.md item: 1.2-UNIT-008
		// The home page must render a visible <button> element.
		// The button must have the Forest & Copper background styling applied via shadcn.
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// A visible button must be present on the home page
		const buttonLocator = page.locator('button').first();
		await expect(
			buttonLocator,
			'Home page must render at least one <button> element (shadcn Button component not found)'
		).toBeVisible();

		// Button must have a Forest & Copper background color class
		// shadcn Button uses Tailwind classes — check for presence of a non-trivial background
		const buttonClass = await buttonLocator.getAttribute('class');
		expect(buttonClass, 'Button must have Tailwind/shadcn styling classes applied').toBeTruthy();
	});

	test('[P1] 1.9-E2E-006 — Home page body text has computed line-height >= 1.65 and font-size >= 14px (resolves deferred 1.2-COMP-002)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — Thai line-height not yet applied to +page.svelte / +layout.svelte.
		// Activate after Task: Fix Deferred Story 1.2 Home Page.
		//
		// Resolves deferred-work.md item: 1.2-COMP-002
		// Thai typography requirement: body text must have line-height ratio >= 1.65
		// (Noto Serif Thai / Noto Sans Thai readability requirement from DESIGN.md).
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const typography = await page.evaluate(() => {
			const body = document.body;
			const styles = window.getComputedStyle(body);
			const lineHeightRaw = styles.lineHeight;
			const fontSizeRaw = styles.fontSize;

			const fontSize = parseFloat(fontSizeRaw); // px
			const lineHeightPx = parseFloat(lineHeightRaw); // px

			// line-height ratio = line-height(px) / font-size(px)
			const lineHeightRatio = lineHeightPx / fontSize;

			return { lineHeightRatio, fontSize, lineHeightPx, lineHeightRaw, fontSizeRaw };
		});

		expect(
			typography.fontSize,
			`Body font-size must be >= 14px, got ${typography.fontSizeRaw}`
		).toBeGreaterThanOrEqual(14);

		expect(
			typography.lineHeightRatio,
			`Body line-height ratio must be >= 1.65 for Thai readability, got ${typography.lineHeightRatio.toFixed(3)} (${typography.lineHeightRaw} / ${typography.fontSizeRaw})`
		).toBeGreaterThanOrEqual(1.65);
	});
});

// ---------------------------------------------------------------------------
// P2: UX smoke — success indicator after form submit
// ---------------------------------------------------------------------------

test.describe('Story 1.9 — Skeleton Route: UX Smoke (P2)', () => {
	test.skip(true, 'RED phase — activate after skeleton form action is implemented');

	test('[P2] 1.9-E2E-007 — Skeleton route displays success indicator (toast/status element) after form submit', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — skeleton form action not yet implemented.
		// Activate after Task: Implement Skeleton Form Action.
		//
		// UX smoke test: after form submit, a visible success state must appear.
		// Accepts: element with role="status" or a toast/alert element.
		// Tied to UX-DR8 success state pattern.
		await page.goto('/skeleton');
		await page.waitForLoadState('networkidle');

		// Submit the skeleton form
		const submitButton = page
			.locator('[data-testid="skeleton-submit"], button[type="submit"]')
			.first();
		await expect(submitButton).toBeVisible();
		await submitButton.click();

		// Wait for success indicator to appear (role="status", role="alert", or [data-testid="success"])
		const successLocator = page
			.locator('[role="status"], [role="alert"], [data-testid="success"], [data-testid="toast"]')
			.first();

		await expect(
			successLocator,
			'A success indicator (role="status", role="alert", [data-testid="success"], or [data-testid="toast"]) must be visible after form submit'
		).toBeVisible({ timeout: 5_000 });
	});
});

// ---------------------------------------------------------------------------
// P3: Performance baseline — informational only (no SLA)
// ---------------------------------------------------------------------------

test.describe('Story 1.9 — Skeleton Route: Performance Baseline (P3, informational)', () => {
	test.skip(true, 'RED phase — activate after skeleton route is implemented');

	test('[P3] 1.9-E2E-008 — Skeleton route responds within 2s under single-user load (informational baseline)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — skeleton route not yet created.
		// Activate after Task: Implement Skeleton Route.
		//
		// Informational baseline only — no SLA enforced in Epic 1.
		// Records Time to First Byte + DOM content loaded.
		// If it exceeds 2s, this is a flag for investigation, not a hard block.
		const startTime = Date.now();
		await page.goto('/skeleton');
		await page.waitForLoadState('domcontentloaded');
		const elapsed = Date.now() - startTime;

		// Log timing for traceability (not a hard assertion — P3 informational)
		console.info(`[P3] 1.9-E2E-008 — Skeleton route DOMContentLoaded: ${elapsed}ms`);

		// Soft assertion: warn if > 2000ms (adjust as needed in later sprints)
		if (elapsed > 2000) {
			console.warn(
				`[P3] 1.9-E2E-008 — Skeleton route took ${elapsed}ms (> 2000ms informational target) — investigate if this regresses further`
			);
		}

		// Hard assertion: must respond within 10s (sanity guard — not a real SLA)
		expect(
			elapsed,
			`Skeleton route took ${elapsed}ms — expected < 10000ms even under no-SLA conditions`
		).toBeLessThan(10_000);
	});
});
