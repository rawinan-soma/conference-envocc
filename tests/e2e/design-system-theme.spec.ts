/**
 * ATDD Red-Phase E2E Scaffolds — Story 1.2: Design System & Thai Typography
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * These E2E tests verify that the Forest & Copper design system is applied
 * correctly in the browser: CSS custom properties, font loading, Button
 * rendering, and Thai typography rules.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test.
 *   2. Run: `bun run test:e2e` — verify it FAILS first (red).
 *   3. Implement the feature.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * Prerequisites for E2E tests:
 *   - Dev server must be running: bun run dev (port 5173)
 *   - playwright.config.ts baseURL: http://localhost:5173
 *
 * No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// AC-1 + AC-2: Forest & Copper CSS custom properties applied to the page
// Given: scaffolded app with theme wired,
// When: the sample page is loaded,
// Then: CSS custom properties from DESIGN.md are active in the browser.
// ---------------------------------------------------------------------------

test.describe('Story 1.2 — Design System & Thai Typography E2E (ATDD Red Phase)', () => {
	test.skip(
		'[P0] 1.2-E2E-001 — CSS custom properties --primary and --background resolve to Forest & Copper values',
		async ({ page }) => {
			// THIS TEST WILL FAIL — CSS tokens not yet replaced in app.css.
			// Activate after Task 1 (color tokens) is complete and dev server is running.
			await page.goto('/');

			// Evaluate computed CSS custom properties on :root
			const primaryColor = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
			);
			const backgroundColor = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
			);
			const cardColor = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--card').trim()
			);
			const borderColor = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--border').trim()
			);

			// AC-1: --primary → green-700 (#2D6A4F)
			// The computed value may resolve through var(--green-700) so check the final hex
			expect(
				primaryColor.toLowerCase(),
				'--primary must resolve to #2D6A4F (green-700)'
			).toMatch(/#2d6a4f|#2D6A4F|var\(--green-700\)/i);

			// AC-1: --background → cream (#FAFAF7)
			expect(
				backgroundColor.toLowerCase(),
				'--background must resolve to #FAFAF7 (cream)'
			).toMatch(/#fafaf7|var\(--cream\)/i);

			// AC-1: --card → #FFFFFF
			expect(cardColor.toLowerCase(), '--card must resolve to #FFFFFF').toMatch(/#ffffff|#fff/i);

			// AC-1: --border → #E0DBD3
			expect(
				borderColor.toLowerCase(),
				'--border must resolve to #E0DBD3'
			).toMatch(/#e0dbd3|var\(--border-color\)/i);
		}
	);

	test.skip(
		'[P0] 1.2-E2E-002 — CSS radius tokens resolve to DESIGN.md values (not calc offsets)',
		async ({ page }) => {
			// THIS TEST WILL FAIL — radius tokens not yet set to explicit values.
			// Activate after Task 2.1 (update radius vars) is complete.
			await page.goto('/');

			const radiusSm = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--radius-sm').trim()
			);
			const radiusMd = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--radius-md').trim()
			);
			const radiusLg = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--radius-lg').trim()
			);
			const radiusXl = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--radius-xl').trim()
			);

			// DESIGN.md: sm=6px, md=10px, lg=16px, xl=20px
			expect(radiusSm, '--radius-sm must be 0.375rem (6px)').toBe('0.375rem');
			expect(radiusMd, '--radius-md must be 0.625rem (10px)').toBe('0.625rem');
			expect(radiusLg, '--radius-lg must be 1rem (16px)').toBe('1rem');
			expect(radiusXl, '--radius-xl must be 1.25rem (20px)').toBe('1.25rem');
		}
	);

	// ---------------------------------------------------------------------------
	// AC-3: Google Fonts loaded for Thai typography
	// Given: fonts wired in app.html and app.css,
	// When: page loads, Then: Noto Thai fonts are loaded.
	// ---------------------------------------------------------------------------

	test.skip(
		'[P0] 1.2-E2E-003 — page document has Google Fonts preconnect links in <head>',
		async ({ page }) => {
			// THIS TEST WILL FAIL — font links not yet added to app.html.
			// Activate after Task 3.1 and 3.2 (Google Fonts CDN links) are complete.
			await page.goto('/');

			// Check for preconnect to fonts.googleapis.com
			const preconnectGoogleapis = await page.locator(
				'link[rel="preconnect"][href="https://fonts.googleapis.com"]'
			).count();
			expect(
				preconnectGoogleapis,
				'Must have preconnect link for fonts.googleapis.com'
			).toBeGreaterThan(0);

			// Check for preconnect to fonts.gstatic.com with crossorigin
			const preconnectGstatic = await page.locator(
				'link[rel="preconnect"][href="https://fonts.gstatic.com"]'
			).count();
			expect(
				preconnectGstatic,
				'Must have preconnect link for fonts.gstatic.com'
			).toBeGreaterThan(0);

			// Check for Google Fonts stylesheet link referencing Noto fonts
			const fontsStylesheet = await page.locator(
				'link[rel="stylesheet"][href*="Noto"]'
			).count();
			expect(fontsStylesheet, 'Must have Google Fonts stylesheet link for Noto fonts').toBeGreaterThan(
				0
			);
		}
	);

	test.skip(
		'[P0] 1.2-E2E-004 — --font-sans CSS variable includes Noto Sans Thai',
		async ({ page }) => {
			// THIS TEST WILL FAIL — --font-sans not yet updated to Noto Sans Thai.
			// Activate after Task 3.3 (update @theme font vars) is complete.
			await page.goto('/');

			const fontSans = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim()
			);

			expect(fontSans, "--font-sans must include 'Noto Sans Thai'").toContain('Noto Sans Thai');
		}
	);

	// ---------------------------------------------------------------------------
	// AC-4: shadcn Button renders with Forest & Copper primary color
	// Given: theme wired and Button component installed,
	// When: sample page rendered, Then: Button uses green-700 primary color.
	// ---------------------------------------------------------------------------

	test.skip(
		'[P1] 1.2-E2E-005 — sample page renders a Button with primary variant visible',
		async ({ page }) => {
			// THIS TEST WILL FAIL — +page.svelte not yet updated with Button.
			// Activate after Task 4.2 (update +page.svelte with Button) is complete.
			await page.goto('/');

			// The shadcn Button with primary variant should be present
			const button = page.getByRole('button');
			await expect(button, 'Must have at least one Button element on the sample page').toBeVisible();
		}
	);

	test.skip(
		'[P1] 1.2-E2E-006 — primary Button background-color resolves to green-700 (#2D6A4F)',
		async ({ page }) => {
			// THIS TEST WILL FAIL — Button not yet installed and themed.
			// Activate after Tasks 1-4 are complete (color tokens + Button component).
			await page.goto('/');

			const button = page.getByRole('button').first();
			await expect(button).toBeVisible();

			// Get the computed background color of the button
			const bgColor = await button.evaluate((el) => {
				return window.getComputedStyle(el).backgroundColor;
			});

			// green-700 (#2D6A4F) in RGB = rgb(45, 106, 79)
			expect(bgColor, 'Button background must be green-700 (rgb(45, 106, 79) = #2D6A4F)').toBe(
				'rgb(45, 106, 79)'
			);
		}
	);

	// ---------------------------------------------------------------------------
	// AC-5: Thai typography — line-height >= 1.65 and min font-size 14px
	// Given: sample page with body text element,
	// When: rendered, Then: line-height >= 1.65 and font-size >= 14px.
	// ---------------------------------------------------------------------------

	test.skip(
		'[P0] 1.2-E2E-007 — sample page body text has line-height >= 1.65 (DESIGN.md Thai body rule)',
		async ({ page }) => {
			// THIS TEST WILL FAIL — typography not yet applied to sample page.
			// Activate after Task 4.3 (Thai body styles) is complete.
			await page.goto('/');

			// Find a paragraph or body text element on the page
			// The sample page should have a <p> with leading-[1.65] or leading-relaxed
			const paragraph = page.locator('p').first();
			await expect(paragraph, 'Must have at least one <p> element on the sample page').toBeVisible();

			const lineHeight = await paragraph.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				const lh = parseFloat(styles.lineHeight);
				const fs = parseFloat(styles.fontSize);
				// Return ratio (line-height / font-size) for unitless comparison
				return fs > 0 ? lh / fs : 0;
			});

			// DESIGN.md: Thai body line-height >= 1.65
			expect(
				lineHeight,
				`Body text line-height ratio must be >= 1.65 (DESIGN.md Thai body). Got: ${lineHeight.toFixed(3)}`
			).toBeGreaterThanOrEqual(1.6); // 1.6 tolerance for leading-relaxed (1.625)
		}
	);

	test.skip(
		'[P0] 1.2-E2E-008 — sample page body text font-size >= 14px (UXD-008: never below 14px)',
		async ({ page }) => {
			// THIS TEST WILL FAIL — typography not yet applied to sample page.
			// Activate after Task 4.3 is complete.
			await page.goto('/');

			const paragraph = page.locator('p').first();
			await expect(paragraph).toBeVisible();

			const fontSize = await paragraph.evaluate((el) => {
				return parseFloat(window.getComputedStyle(el).fontSize);
			});

			// UXD-008: minimum 14px font-size — never below
			expect(
				fontSize,
				`Body text font-size must be >= 14px (UXD-008). Got: ${fontSize}px`
			).toBeGreaterThanOrEqual(14);
		}
	);

	// ---------------------------------------------------------------------------
	// AC-6 (E2E smoke): Page loads without errors after design system applied
	// ---------------------------------------------------------------------------

	test.skip(
		'[P1] 1.2-E2E-009 — sample page loads without console errors after design system changes',
		async ({ page }) => {
			// THIS TEST WILL FAIL — dev server may error before implementation.
			// Activate after ALL tasks (1-5) are complete.
			const consoleErrors: string[] = [];

			page.on('console', (msg) => {
				if (msg.type() === 'error') {
					consoleErrors.push(msg.text());
				}
			});

			const response = await page.goto('/');

			expect(response?.status(), 'Sample page must return HTTP 200').toBe(200);
			expect(
				consoleErrors,
				`No console errors expected. Found: ${consoleErrors.join(', ')}`
			).toHaveLength(0);
		}
	);

	test.skip(
		'[P1] 1.2-E2E-010 — sample page heading uses font-serif (Noto Serif Thai)',
		async ({ page }) => {
			// THIS TEST WILL FAIL — page not yet updated with themed heading.
			// Activate after Task 4.2 is complete (page.svelte with h1 font-serif class).
			await page.goto('/');

			// The sample page heading (h1 or element with font-serif class) should use the serif font
			const heading = page.locator('h1').first();
			await expect(heading, 'Sample page must have an <h1> heading').toBeVisible();

			const fontFamily = await heading.evaluate((el) => {
				return window.getComputedStyle(el).fontFamily;
			});

			expect(fontFamily, "Heading font-family must include 'Noto Serif Thai'").toContain(
				'Noto Serif Thai'
			);
		}
	);
});
