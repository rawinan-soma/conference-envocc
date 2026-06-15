/**
 * ATDD Red-Phase E2E Scaffolds — Story 5.1: Branded Public Registration Page
 *
 * STATUS: All tests skipped (TDD red-phase scaffolds — activate task-by-task during implementation).
 *
 * Playwright E2E tests — requires dev server running on port 3000.
 *
 * These tests exercise the public /r/[token] route which is unauthenticated.
 * No dev-bypass is required; a seeded booking with a known token is sufficient.
 * The route is already allow-listed in src/hooks.server.ts (routeGuards pattern).
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test(s).
 *   2. Ensure dev server is running: `bun run dev`
 *   3. Ensure OPEN_BOOKING_SLUG maps to a real booking in the DB (via dev-bypass seed or direct SQL).
 *   4. Run: `bun run test:e2e -- --grep "<test-id>"` — verify it FAILS first (red).
 *   5. Implement the feature (per task in story 5.1).
 *   6. Run again — verify it PASSES (green).
 *   7. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1 (FR-040): Open registration page renders event name, room, date/time for a seeded booking
 *   - AC-2: Closed registration page shows closed message; form is NOT visible
 *   - AC-5 (NFR-007): WCAG 2.1 AA — axe-core zero violations on open-state page
 *   - AC-5 (NFR-007): WCAG 2.1 AA — axe-core zero violations on closed-state page
 *
 * Scenario IDs (from story 5.1 Task 5.2 + test-design-epic-5.md):
 *   P1 (all skipped — activate during implementation):
 *   - 5.1-E2E-001:     Open page renders event name, room, date/time [P1]
 *   - 5.1-E2E-002:     Closed page shows closed message; form not visible [P1]
 *   - 5.1-E2E-A11Y-001: axe-core passes WCAG 2.1 AA on open-state /r/[token] [P1] (NFR-007)
 *   - 5.1-E2E-A11Y-002: axe-core passes WCAG 2.1 AA on closed-state /r/[token] [P1] (NFR-007)
 *
 * OPEN_BOOKING_SLUG / CLOSED_BOOKING_SLUG:
 *   Replace these placeholder values with real slugs seeded in the test database.
 *   Option A: Use dev-bypass endpoint to seed a booking with a predictable slug.
 *   Option B: Insert via direct SQL in a Playwright global setup (when implemented).
 *   For now these are left as placeholders — the tests remain .skip until seed wiring is done.
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   All string assertions use English mock data. Paraglide keys tested by name only.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// Booking slug constants — replace with real slugs once seed wiring is complete
// ---------------------------------------------------------------------------

/**
 * Slug for an OPEN registration booking (registrationEnabled = true).
 * Must be seeded in the DB before these tests run (via global setup or fixture).
 */
const OPEN_BOOKING_SLUG = 'placeholder-open-slug-replace-me';

/**
 * Slug for a CLOSED registration booking (registrationEnabled = false).
 * Must be seeded in the DB before these tests run (via global setup or fixture).
 */
const CLOSED_BOOKING_SLUG = 'placeholder-closed-slug-replace-me';

// ---------------------------------------------------------------------------
// 5.1-E2E-001 — Open registration page renders event name, room, date/time [P1] SKIP
// AC-1 (FR-040): public /r/[token] page with valid token shows event info
// ---------------------------------------------------------------------------

test.describe('Story 5.1 — Open Registration Page (AC-1, FR-040)', () => {
	test.skip('[P1] 5.1-E2E-001 — /r/[token] renders event name, room, and date/time for a seeded booking', async ({
		page
	}) => {
		// Activation condition: Tasks 1–3 complete (query + route + i18n keys).
		// Prerequisite seed: booking with OPEN_BOOKING_SLUG in DB (registrationEnabled=true).
		//
		// AC-1: The page renders without authentication.
		// AC-1: org logo img tag present (graceful fallback if static/logo.svg absent).
		// AC-1: event name displayed.
		// AC-1: date/time formatted in Asia/Bangkok timezone (UTC+7).
		// AC-1: room name displayed.
		// AC-1: agenda displayed when populated.
		// AC-1: contact name (first + last) and phone displayed.
		// Scope boundary: registration FORM is Story 5.2 — not present here.

		await page.goto(`/r/${OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		// No redirect to /login — route is public
		expect(page.url()).not.toContain('/login');
		expect(page.url()).toContain('/r/');

		// Page title — uses Paraglide key reg_page_title ("Event Registration")
		await expect(page).toHaveTitle(/Event Registration/i);

		// Logo img rendered (graceful fallback acceptable if static/logo.svg absent)
		const logo = page.locator('img[alt*="logo" i], img[alt*="organization" i]');
		await expect(logo).toBeVisible();

		// Event name heading visible
		const eventName = page.getByRole('heading').first();
		await expect(eventName).toBeVisible();

		// Date & Time section visible (Paraglide key reg_page_date_label)
		await expect(page.getByText(/Date & Time/i)).toBeVisible();

		// Room section visible (Paraglide key reg_page_room_label)
		await expect(page.getByText(/Room/i)).toBeVisible();

		// Contact section visible (Paraglide key reg_page_contact_label)
		await expect(page.getByText(/Contact/i)).toBeVisible();

		// Registration form section placeholder title visible (Paraglide key reg_page_registration_section_title)
		// Note: form FIELDS are Story 5.2 scope — only the section heading is expected here
		await expect(page.getByText(/Register to Attend/i)).toBeVisible();

		// Closed message must NOT be visible on an open registration page
		await expect(page.getByText(/Registration Closed/i)).not.toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 5.1-E2E-002 — Closed registration page shows closed message; form not visible [P1] SKIP
// AC-2: registrationEnabled=false → closed message shown; form NOT rendered
// ---------------------------------------------------------------------------

test.describe('Story 5.1 — Closed Registration Page (AC-2)', () => {
	test.skip('[P1] 5.1-E2E-002 — /r/[token] with registrationEnabled=false shows closed message; form not visible', async ({
		page
	}) => {
		// Activation condition: Tasks 1–3 complete (query + route + i18n keys).
		// Prerequisite seed: booking with CLOSED_BOOKING_SLUG in DB (registrationEnabled=false).
		//
		// AC-2: "Registration Closed" message shown (Paraglide key reg_page_closed_title).
		// AC-2: event name, date, room still shown so attendee knows they reached the right page.
		// AC-2: registration form fields are NOT rendered at all.

		await page.goto(`/r/${CLOSED_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		// No redirect to /login — route is still public even when closed
		expect(page.url()).not.toContain('/login');

		// AC-2: closed message visible (Paraglide key reg_page_closed_title)
		await expect(page.getByText(/Registration Closed/i)).toBeVisible();

		// AC-2: closed description visible (Paraglide key reg_page_closed_message)
		await expect(page.getByText(/no longer available/i)).toBeVisible();

		// AC-2: event name still displayed (attendee can confirm correct page)
		const eventName = page.getByRole('heading').first();
		await expect(eventName).toBeVisible();

		// AC-2: date/time section still visible
		await expect(page.getByText(/Date & Time/i)).toBeVisible();

		// AC-2: room still visible
		await expect(page.getByText(/Room/i)).toBeVisible();

		// AC-2: form fields NOT rendered — no input elements on page
		const inputs = page.locator('form input, form select, form textarea');
		await expect(inputs).toHaveCount(0);
	});
});

// ---------------------------------------------------------------------------
// 5.1-E2E-A11Y-001 — axe-core passes WCAG 2.1 AA on open-state /r/[token] [P1] SKIP
// AC-5 (NFR-007): WCAG 2.1 AA compliance on open-state registration page
// ---------------------------------------------------------------------------

test.describe('Story 5.1 — Accessibility: Open Registration Page (AC-5, NFR-007)', () => {
	test.skip('[P1] 5.1-E2E-A11Y-001 — axe-core passes WCAG 2.1 AA on open-state /r/[token]', async ({
		page
	}) => {
		// Activation condition: Tasks 1–3 complete (route renders fully).
		// Prerequisite seed: booking with OPEN_BOOKING_SLUG in DB (registrationEnabled=true).
		//
		// NFR-007: WCAG 2.1 AA — axe-core must report zero violations.
		// Tests the open-state (registration available) variant of the page.

		await page.goto(`/r/${OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

		expect(
			results.violations,
			`axe-core WCAG 2.1 AA violations on open /r/${OPEN_BOOKING_SLUG}: ${JSON.stringify(results.violations, null, 2)}`
		).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// 5.1-E2E-A11Y-002 — axe-core passes WCAG 2.1 AA on closed-state /r/[token] [P1] SKIP
// AC-5 (NFR-007): WCAG 2.1 AA compliance on closed-state registration page
// ---------------------------------------------------------------------------

test.describe('Story 5.1 — Accessibility: Closed Registration Page (AC-5, NFR-007)', () => {
	test.skip('[P1] 5.1-E2E-A11Y-002 — axe-core passes WCAG 2.1 AA on closed-state /r/[token]', async ({
		page
	}) => {
		// Activation condition: Tasks 1–3 complete (route renders both states).
		// Prerequisite seed: booking with CLOSED_BOOKING_SLUG in DB (registrationEnabled=false).
		//
		// NFR-007: WCAG 2.1 AA — axe-core must report zero violations.
		// Tests the closed-state (registration unavailable) variant of the page.
		// The closed-state renders a role="alert" element which must also be accessible.

		await page.goto(`/r/${CLOSED_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

		expect(
			results.violations,
			`axe-core WCAG 2.1 AA violations on closed /r/${CLOSED_BOOKING_SLUG}: ${JSON.stringify(results.violations, null, 2)}`
		).toEqual([]);
	});
});
