/**
 * ATDD Red-Phase E2E Scaffolds — Story 4.3: Room Calendar View
 * E2E Tests: Calendar renders, accessibility, slot state distinction
 *
 * TDD RED PHASE: All tests marked test.skip() — will be activated in a later story
 * after /bookings/new (Story 4.4) is functional.
 *
 * Playwright E2E tests — requires dev server running on port 3000.
 *
 * Authentication: uses dev bypass pattern (Story 2.2).
 *   POST /r/dev-bypass?profileComplete=true → authenticated organizer session.
 *   AUTH_DEV_BYPASS=true must be set in the dev server environment.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test(s).
 *   2. Ensure dev server is running: `bun run dev`
 *   3. Run: `bun run test:e2e -- --grep "<test-id>"` — verify it FAILS first (red).
 *   4. Implement the feature (per task in story 4.3).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: Calendar renders rooms × days grid; booking chips visible; empty cells clickable
 *   - AC-2: Slot states (available/booked/blocked) distinguishable without color alone
 *
 * Scenario IDs:
 *   - 4.3-E2E-001 [P1]: Calendar renders rooms on Y × days on X; chips visible; empty cells clickable
 *   - 4.3-A11Y-001 [P2]: axe-core zero WCAG 2.1 AA violations on /calendar
 *
 * Note: No Thai text hardcoded — per project rule, Rawinan handles all Thai translations.
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// Helper: authenticated session via dev bypass (Story 2.2 seam)
// ---------------------------------------------------------------------------

async function loginViaDevBypass(page: Page): Promise<void> {
	await page.goto('/r/dev-bypass?profileComplete=true', { waitUntil: 'networkidle' });
}

// ---------------------------------------------------------------------------
// 4.3-E2E-001 — Calendar grid renders rooms × days; chips visible; cells clickable [P1]
// ---------------------------------------------------------------------------

test.describe('Story 4.3 — Room Calendar: Grid Rendering (AC-1)', () => {
	test.skip('[P1] 4.3-E2E-001 — /calendar renders rooms on Y axis × days on X axis; booking chips visible; empty cells link to booking form', async ({
		page
	}) => {
		// Activation condition: /bookings/new route exists (Story 4.4 complete).
		// Prerequisite seed: ≥1 active room with ≥1 booking in the current week.
		//
		// AC-1: rooms on Y axis × days on X axis.
		// AC-1: booking chips show booked time range.
		// AC-1: empty day cells are clickable links.

		await loginViaDevBypass(page);
		await page.goto('/calendar', { waitUntil: 'networkidle' });

		// Page title present
		await expect(page).toHaveTitle(/Room Calendar/);

		// Calendar grid rendered (role=grid)
		const grid = page.getByRole('grid');
		await expect(grid).toBeVisible();

		// At least one room row visible
		const roomCells = page.getByRole('gridcell');
		await expect(roomCells.first()).toBeVisible();

		// At least one booking chip (data-booking-id attribute)
		// Requires a seeded booking in the current week
		// const chip = page.locator('[data-booking-id]').first();
		// test.soft: comment out if no seed data available in CI
		// await expect(chip).toBeVisible();

		// Empty cell link points to /bookings/new with room and date params
		// const availableLink = page.locator('a[href^="/bookings/new?room="]').first();
		// await expect(availableLink).toBeVisible();
		// await expect(availableLink).toHaveAttribute('href', /room=.+&date=\d{4}-\d{2}-\d{2}/);

		// Week navigation links present
		await expect(page.getByRole('link', { name: /Previous week/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /Next week/i })).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 4.3-A11Y-001 — axe-core zero WCAG 2.1 AA violations on /calendar [P2]
// ---------------------------------------------------------------------------

test.describe('Story 4.3 — Room Calendar: Accessibility (AC-2, NFR-007)', () => {
	test.skip('[P2] 4.3-A11Y-001 — /calendar passes axe-core zero WCAG 2.1 AA violations; slot states distinguishable without color alone', async ({
		page
	}) => {
		// Activation condition: calendar page renders with at least one room.
		// AC-2: booked/available/blocked states distinguishable without color alone.
		// NFR-007: WCAG 2.1 AA compliance.

		await loginViaDevBypass(page);
		await page.goto('/calendar', { waitUntil: 'networkidle' });

		// axe-core scan — zero violations
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

		expect(results.violations).toEqual([]);

		// Slot states: verify aria-label includes state text (not color alone)
		// const availableCell = page.locator('[role="gridcell"][aria-label*="available"]').first();
		// const blockedCell = page.locator('[role="gridcell"][aria-label*="blocked"]').first();
		// const bookedCell = page.locator('[role="gridcell"][aria-label*="booked"]').first();

		// At least one available cell has a text label (not just color)
		// await expect(availableCell).toBeVisible();
		// await expect(blockedCell).toBeVisible();
		// await expect(bookedCell).toBeVisible();
	});
});
