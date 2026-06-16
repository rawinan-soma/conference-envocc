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

// ===========================================================================
// STORY 5.2 — Submit a Registration
//
// ATDD Red-Phase E2E Scaffolds — Story 5.2: Submit a Registration
//
// STATUS: All tests skipped (TDD red-phase scaffolds — activate task-by-task during implementation).
//
// AC Coverage:
//   - AC-1 (form fields), AC-2 (catering conditional), AC-4 (success confirmation)
//   - AC-5 / NFR-004: Mobile responsive — 375×667px and 1280×800px
//   - AC-1 (validation), AC-4 (loading state)
//
// Scenario IDs:
//   P1 (all skipped):
//   - 5.2-E2E-001:       Full registration form submit (desktop) — confirmation shown [P1]
//   - 5.2-E2E-MOBILE-001: Form fully usable at 375×667px — no horizontal scroll [P1] (NFR-004)
//   - 5.2-E2E-MOBILE-002: Form fully usable at 1280×800px (desktop parity) [P1] (NFR-004)
//   P2 (all skipped):
//   - 5.2-E2E-003:       Form validation — missing required fields shows inline error [P2]
//   - 5.2-E2E-004:       Loading state — submit button disabled during submission [P2]
//   P3 (all skipped):
//   - 5.2-E2E-005:       Registration completes in ≤2 minutes end-to-end [P3]
//   - 5.2-LOAD-001:      k6 50 concurrent registrations complete without error [P3]
//
// Note: 5.2-E2E-002 is intentionally absent (not in story spec).
//
// BOOKING_SLUG constants:
//   OPEN_BOOKING_SLUG from Story 5.1 can be reused if a booking with
//   registrationEnabled=true exists. Replace with a Story 5.2-specific
//   slug once seed wiring is complete.
//
// Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
//   All string assertions use English mock data. Paraglide keys tested by name only.
// ===========================================================================

// ---------------------------------------------------------------------------
// 5.2 booking slug constants
// ---------------------------------------------------------------------------

/**
 * Slug for a booking where registrationEnabled=true and cateringEnabled=false.
 * Must be seeded in the DB before these tests run (via global setup or fixture).
 * Named _SLUG (not _TOKEN) per project naming convention.
 */
const REG_OPEN_BOOKING_SLUG = 'placeholder-5-2-open-slug-replace-me';

/**
 * Slug for a booking where registrationEnabled=true and cateringEnabled=true.
 * Used for tests that need the catering/meal-type field visible.
 * Named _SLUG (not _TOKEN) per project naming convention.
 */
const REG_CATERING_BOOKING_SLUG = 'placeholder-5-2-catering-slug-replace-me';

// ---------------------------------------------------------------------------
// 5.2-E2E-001 — Full registration form submit (desktop) — confirmation shown [P1] SKIP
// AC-1, AC-2, AC-4: Form renders, submits, shows success state (no redirect)
// ---------------------------------------------------------------------------

test.describe('Story 5.2 — Full Registration Form Submit (AC-1, AC-4)', () => {
	test.skip('[P1] 5.2-E2E-001 — complete registration form submit at desktop viewport shows confirmation message', async ({
		page
	}) => {
		// Activation condition: Tasks 1–6 complete (schema, service, action, form, i18n).
		// Prerequisite seed: booking with REG_OPEN_BOOKING_SLUG (registrationEnabled=true).
		//
		// AC-1: Registration form renders with: title select, firstName, lastName,
		//   organization, email inputs — all required.
		// AC-4: After successful submission, page shows success confirmation message.
		//   The form is no longer visible (replaced by success state).
		// AC-4: No redirect — success state shown inline on same page.

		await page.goto(`/r/${REG_OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		// No redirect to /login — route is public
		expect(page.url()).not.toContain('/login');

		// AC-1: Registration form must be visible (not closed state)
		const form = page.locator('form[action*="register"]');
		await expect(form).toBeVisible();

		// AC-1: Fill title select
		await page.selectOption('select[name="title"]', 'Mr');

		// AC-1: Fill required fields
		await page.fill('input[name="firstName"]', 'E2E');
		await page.fill('input[name="lastName"]', 'Registrant');
		await page.fill('input[name="organization"]', 'E2E Test Corp');
		await page.fill('input[name="email"]', 'e2e.registrant@example.com');

		// Submit the form
		await page.click('button[type="submit"]');
		await page.waitForLoadState('networkidle');

		// AC-4: Success confirmation visible (Paraglide key reg_form_success_title)
		await expect(page.getByText(/Registration Complete/i)).toBeVisible();

		// AC-4: Form no longer visible after success
		await expect(form).not.toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 5.2-E2E-MOBILE-001 — Form fully usable at 375×667px — no horizontal scroll [P1] SKIP
// AC-5 / NFR-004: Mobile responsive at iPhone SE viewport
// ---------------------------------------------------------------------------

test.describe('Story 5.2 — Mobile Responsive: 375×667px (AC-5, NFR-004)', () => {
	test.skip('[P1] 5.2-E2E-MOBILE-001 — registration form is fully usable at 375×667px with no horizontal scroll', async ({
		page
	}) => {
		// Activation condition: Tasks 4–5 complete (action + form).
		// Prerequisite seed: booking with REG_OPEN_BOOKING_SLUG (registrationEnabled=true).
		//
		// NFR-004: The form is fully usable at 375×667px (iPhone SE / small mobile).
		//   No horizontal scrollbar must appear.

		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto(`/r/${REG_OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		// No horizontal scrollbar: scrollWidth must not exceed window.innerWidth
		const hasNoHorizontalScroll = await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth
		);
		expect(
			hasNoHorizontalScroll,
			'5.2-E2E-MOBILE-001: no horizontal scroll at 375px — scrollWidth must not exceed innerWidth'
		).toBe(true);

		// Form elements must be visible and interactable at mobile viewport
		const form = page.locator('form[action*="register"]');
		await expect(form).toBeVisible();

		// Title select visible at mobile
		await expect(page.locator('select[name="title"]')).toBeVisible();

		// Required inputs visible at mobile
		await expect(page.locator('input[name="firstName"]')).toBeVisible();
		await expect(page.locator('input[name="lastName"]')).toBeVisible();
		await expect(page.locator('input[name="organization"]')).toBeVisible();
		await expect(page.locator('input[name="email"]')).toBeVisible();

		// Submit button visible at mobile
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 5.2-E2E-MOBILE-002 — Form fully usable at 1280×800px (desktop parity) [P1] SKIP
// AC-5 / NFR-004: Desktop viewport — no degradation
// ---------------------------------------------------------------------------

test.describe('Story 5.2 — Desktop Viewport: 1280×800px (AC-5, NFR-004)', () => {
	test.skip('[P1] 5.2-E2E-MOBILE-002 — registration form is fully usable at 1280×800px with no degradation', async ({
		page
	}) => {
		// Activation condition: Tasks 4–5 complete (action + form).
		// Prerequisite seed: booking with REG_OPEN_BOOKING_SLUG (registrationEnabled=true).
		//
		// NFR-004: The form must work without degradation at 1280×800px desktop viewport.

		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto(`/r/${REG_OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		// No horizontal scrollbar at desktop
		const hasNoHorizontalScroll = await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth
		);
		expect(hasNoHorizontalScroll, '5.2-E2E-MOBILE-002: no horizontal scroll at 1280px').toBe(true);

		// Form visible and all inputs accessible
		const form = page.locator('form[action*="register"]');
		await expect(form).toBeVisible();

		await expect(page.locator('select[name="title"]')).toBeVisible();
		await expect(page.locator('input[name="firstName"]')).toBeVisible();
		await expect(page.locator('input[name="lastName"]')).toBeVisible();
		await expect(page.locator('input[name="organization"]')).toBeVisible();
		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 5.2-E2E-CATERING-001 — Meal type selector visible when cateringEnabled=true [P2] SKIP
// AC-2: Meal type selector rendered when catering is enabled
// ---------------------------------------------------------------------------

test.describe('Story 5.2 — Catering Conditional: Meal Type Selector (AC-2)', () => {
	test.skip('[P2] 5.2-E2E-CATERING-001 — meal type selector visible when cateringEnabled=true; absent when false', async ({
		page
	}) => {
		// Activation condition: Tasks 4–5 complete (action + form).
		// Prerequisite seed: booking with REG_CATERING_BOOKING_SLUG (registrationEnabled=true, cateringEnabled=true).
		//
		// AC-2: When cateringEnabled=true, meal type selector rendered with options.
		//   When cateringEnabled=false (REG_OPEN_BOOKING_SLUG), meal selector absent.

		// Case: catering enabled
		await page.goto(`/r/${REG_CATERING_BOOKING_SLUG}`, { waitUntil: 'networkidle' });
		await expect(page.locator('select[name="mealType"]')).toBeVisible();

		// Case: catering disabled
		await page.goto(`/r/${REG_OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });
		await expect(page.locator('select[name="mealType"]')).not.toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 5.2-E2E-003 — Form validation — missing required fields shows inline error [P2] SKIP
// AC-1: Client-side and server-side validation renders inline error messages
// ---------------------------------------------------------------------------

test.describe('Story 5.2 — Form Validation: Required Fields (AC-1)', () => {
	test.skip('[P2] 5.2-E2E-003 — submitting form with missing required fields shows inline validation errors', async ({
		page
	}) => {
		// Activation condition: Tasks 4–5 complete (action + form).
		// Prerequisite seed: booking with REG_OPEN_BOOKING_SLUG (registrationEnabled=true).
		//
		// AC-1: All fields are required except titleOtherText (conditional on title='Other').
		//   Submitting with missing fields must show inline error messages per field.

		await page.goto(`/r/${REG_OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		// Submit without filling any fields
		await page.click('button[type="submit"]');
		await page.waitForLoadState('networkidle');

		// Title error visible (required field)
		await expect(page.getByText(/Title is required/i)).toBeVisible();

		// firstName error visible
		await expect(page.getByText(/First name is required/i)).toBeVisible();

		// lastName error visible
		await expect(page.getByText(/Last name is required/i)).toBeVisible();

		// organization error visible
		await expect(page.getByText(/Organization is required/i)).toBeVisible();

		// email error visible
		await expect(page.getByText(/email address is required/i)).toBeVisible();

		// Form must remain visible (no redirect on validation failure)
		const form = page.locator('form[action*="register"]');
		await expect(form).toBeVisible();

		// Success state must NOT be shown
		await expect(page.getByText(/Registration Complete/i)).not.toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 5.2-E2E-004 — Loading state — submit button disabled during submission [P2] SKIP
// AC-4: UX — submit button disabled during in-flight request
// ---------------------------------------------------------------------------

test.describe('Story 5.2 — Loading State: Submit Button Disabled During Submission (AC-4)', () => {
	test.skip('[P2] 5.2-E2E-004 — submit button is disabled while registration POST is in-flight', async ({
		page
	}) => {
		// Activation condition: Tasks 4–5 complete (action + form with $submitting state).
		// Prerequisite seed: booking with REG_OPEN_BOOKING_SLUG (registrationEnabled=true).
		//
		// AC-4: The submit button must be disabled (disabled attribute) while the form
		//   submission is in-flight, preventing double-submit.
		// The button text changes from "Register" to "Registering..." while submitting.

		await page.goto(`/r/${REG_OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		// Fill required fields
		await page.selectOption('select[name="title"]', 'Ms');
		await page.fill('input[name="firstName"]', 'Loading');
		await page.fill('input[name="lastName"]', 'State');
		await page.fill('input[name="organization"]', 'UX Corp');
		await page.fill('input[name="email"]', 'loading.state@example.com');

		// Intercept to delay response and observe loading state
		await page.route('**/r/*', async (route) => {
			// Delay response by 500ms to allow observing the loading state
			await new Promise((resolve) => setTimeout(resolve, 500));
			await route.continue();
		});

		// Click submit and immediately check button is disabled
		const submitBtn = page.locator('button[type="submit"]');
		await submitBtn.click();

		// During submission, button should be disabled
		await expect(submitBtn).toBeDisabled();

		// Optionally: button text changes to "Registering..." (Paraglide key reg_form_submitting_button)
		await expect(submitBtn).toContainText(/Registering/i);
	});
});

// ---------------------------------------------------------------------------
// 5.2-E2E-005 — Registration completes in ≤2 minutes end-to-end [P3] SKIP
// AC-5 / NFR-004: End-to-end timing constraint
// ---------------------------------------------------------------------------

test.describe('Story 5.2 — Registration Timing: ≤2 Minutes End-to-End (AC-5, NFR-004)', () => {
	test.skip('[P3] 5.2-E2E-005 — an external attendee can complete registration in under 2 minutes', async ({
		page
	}) => {
		// Activation condition: Full Story 5.2 implementation complete.
		// Prerequisite seed: booking with REG_OPEN_BOOKING_SLUG (registrationEnabled=true).
		//
		// NFR-004: An external attendee must be able to complete the full registration
		//   flow (page load → form fill → submit → confirmation) in under 2 minutes.
		// This test measures wall-clock time for the full user journey.

		const startTime = Date.now();

		await page.goto(`/r/${REG_OPEN_BOOKING_SLUG}`, { waitUntil: 'networkidle' });

		// Fill all fields as fast as a proficient user would
		await page.selectOption('select[name="title"]', 'Mr');
		await page.fill('input[name="firstName"]', 'Timed');
		await page.fill('input[name="lastName"]', 'Registrant');
		await page.fill('input[name="organization"]', 'Speed Corp');
		await page.fill('input[name="email"]', 'timed.registrant@example.com');

		await page.click('button[type="submit"]');
		await page.waitForLoadState('networkidle');

		// Confirmation must appear (successful submission)
		await expect(page.getByText(/Registration Complete/i)).toBeVisible();

		const elapsedMs = Date.now() - startTime;
		const twoMinutesMs = 2 * 60 * 1000;

		expect(
			elapsedMs,
			`5.2-E2E-005: full registration flow took ${elapsedMs}ms — must be under 2 minutes (${twoMinutesMs}ms)`
		).toBeLessThan(twoMinutesMs);
	});
});

// ---------------------------------------------------------------------------
// 5.7-E2E-001 — Dashboard BookingCard shows catering summary with correct counts
//               when cateringEnabled=true [P1] SKIP
// AC-1 (FR-022, FR-051): catering summary visible on /dashboard for catering-enabled booking
// ---------------------------------------------------------------------------

test.describe('Story 5.7 — Catering Summary on Dashboard BookingCard (AC-1, FR-022, FR-051)', () => {
	test.skip('[P1] 5.7-E2E-001 — /dashboard BookingCard shows catering summary with Normal/Vegetarian/Muslim/Other counts when cateringEnabled=true', async ({
		page
	}) => {
		// Activation condition: Tasks 1–3 complete (getCateringCountsByBookingIds query +
		//   dashboard page.server.ts extension + BookingCard.svelte cateringCounts prop).
		//
		// AC-1 (FR-022, FR-051): Each BookingCard on /dashboard shows per-meal-type counts
		//   (Normal / Vegetarian / Muslim / Other) when cateringEnabled=true.
		//   The summary is omitted (not rendered) when cateringEnabled=false.
		//
		// Strategy:
		//   1. Authenticate via dev-bypass (authenticated organizer session)
		//   2. Seed a booking (cateringEnabled=true) via direct SQL through dev-bypass seed
		//      or manually via raw SQL in a Playwright global setup fixture
		//   3. Seed 2× Normal + 1× Vegetarian registrations for that booking
		//   4. Navigate to /dashboard
		//   5. Assert the catering summary heading is visible (m.catering_summary_heading())
		//   6. Assert Normal count = 2, Vegetarian count = 1, Muslim count = 0, Other count = 0
		//
		// Note: This test requires a seeded booking with cateringEnabled=true and known
		//   registrations. The seed wiring must be implemented before activating this test.
		// Note: No Thai text — all assertions use English values from messages/en.json.
		//   (Paraglide keys: catering_summary_heading, catering_summary_normal_label, etc.)

		await page.request.post('/auth/dev-bypass?seedRoom=true');

		// TODO: Seed a catering-enabled booking with 2× Normal + 1× Vegetarian registrations.
		// Replace CATERING_BOOKING_ID with the ID of the seeded booking once seed wiring is done.
		// Option A: Extend dev-bypass to accept a seedCateringBooking=true param.
		// Option B: Insert via direct SQL in a Playwright global setup file.
		// For now the test stays .skip until the seed wiring is implemented.
		const CATERING_BOOKING_EVENT_NAME = 'ATDD Catering Test Event 5.7-E2E-001';

		await page.goto('/dashboard', { waitUntil: 'networkidle' });

		// AC-1: Catering summary heading visible on the BookingCard for the seeded booking
		// (Paraglide key: catering_summary_heading → "Catering Summary" in en.json)
		const bookingCard = page.getByText(CATERING_BOOKING_EVENT_NAME).locator('..').locator('..');
		await expect(
			bookingCard.getByText('Catering Summary'),
			'5.7-E2E-001: catering summary heading must be visible when cateringEnabled=true'
		).toBeVisible();

		// AC-1: Meal-type count rows visible with correct counts
		// Normal: 2 registrations seeded
		await expect(
			bookingCard.getByText('Normal'),
			'5.7-E2E-001: Normal label must be visible in catering summary'
		).toBeVisible();
		await expect(
			bookingCard.locator('text=Normal').locator('..').getByText('2'),
			'5.7-E2E-001: Normal count must be 2'
		).toBeVisible();

		// Vegetarian: 1 registration seeded
		await expect(
			bookingCard.getByText('Vegetarian'),
			'5.7-E2E-001: Vegetarian label must be visible'
		).toBeVisible();
		await expect(
			bookingCard.locator('text=Vegetarian').locator('..').getByText('1'),
			'5.7-E2E-001: Vegetarian count must be 1'
		).toBeVisible();

		// Muslim: 0 registrations seeded — still shown when cateringEnabled=true (AC-4)
		await expect(
			bookingCard.getByText('Muslim'),
			'5.7-E2E-001: Muslim label must be visible (zero count still shown)'
		).toBeVisible();

		// Other: 0 registrations seeded — still shown when cateringEnabled=true (AC-4)
		await expect(
			bookingCard.getByText('Other'),
			'5.7-E2E-001: Other label must be visible (zero count still shown)'
		).toBeVisible();

		// AC-7 scope boundary: registrant-count placeholder ("—") must still be present
		// (not replaced by Story 5.7 — that belongs to Story 5.8)
		await expect(
			bookingCard.getByText('—'),
			'5.7-E2E-001: registrant-count placeholder "—" must remain (Story 5.8 will replace it)'
		).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 5.2-LOAD-001 — k6 50 concurrent registrations complete without error [P3] SKIP
// AC-3, R-012: Load test — no capacity cap, concurrent registrations succeed
// ---------------------------------------------------------------------------

test.describe('Story 5.2 — Load Test: 50 Concurrent Registrations (R-012)', () => {
	test.skip('[P3] 5.2-LOAD-001 — 50 concurrent registrations complete without error (k6 load test reference)', async () => {
		// Activation condition: Full Story 5.2 implementation complete.
		// Prerequisite: k6 load testing tool installed; dev server running.
		//
		// R-012: No capacity cap — 50 concurrent registrations must all succeed.
		//   This Playwright test is a placeholder; the actual load test runs via k6:
		//
		//   k6 run tests/load/5-2-registration-load.js
		//
		// The k6 script should:
		//   - Send 50 concurrent POST requests to /r/[REG_OPEN_BOOKING_SLUG]?/register
		//   - Each with unique email address (registrant-${__VU}@example.com)
		//   - Assert: all 50 complete with HTTP 200 (success) or 303 (redirect)
		//   - Assert: no HTTP 4xx (closed guard) or 5xx (server error)
		//   - Assert: registrations table row count increases by 50
		//
		// This test.skip is a traceability anchor for the load test scenario.
		// The actual k6 script creation is a separate implementation task.
		expect(true).toBe(true); // placeholder — load test runs via k6 CLI
	});
});

// ===========================================================================
// STORY 5.8 — Registrant List & Dashboard Headcount
//
// ATDD Red-Phase E2E Scaffolds — Story 5.8: Registrant List & Dashboard Headcount
//
// STATUS: All tests skipped (TDD red-phase scaffolds — activate task-by-task during implementation).
//
// Playwright E2E tests — requires dev server running and seeded test data.
//
// Activation guide:
//   1. Remove `test.skip(` → `test(` for the current task's test(s).
//   2. Ensure dev server is running: `bun run dev`
//   3. Ensure ORGANIZER_BOOKING_ID maps to a real booking in the DB (seeded via dev-bypass or direct SQL).
//   4. Run: `bun run test:e2e -- --grep "<test-id>"` — verify it FAILS first (red).
//   5. Implement the feature (per task in story 5.8).
//   6. Run again — verify it PASSES (green).
//   7. Commit passing tests.
//
// AC Coverage:
//   - AC-1 (registrant list route): /bookings/[id]/registrants renders all registrants
//   - AC-2 (status badges): Registered (green) and Cancelled (muted) badges visible with text labels
//   - AC-5 (FR-052): Dashboard card shows live headcount (not placeholder "—")
//
// Scenario IDs (from story 5.8 Task 7):
//   P1 (all skipped — activate during implementation):
//   - 5.8-E2E-001: Organizer sees registrant list with Registered/Cancelled status badges [P1]
//   - 5.8-E2E-002: Dashboard card shows live headcount after a new registration [P1]
//
// Booking ID constants:
//   Replace ORGANIZER_BOOKING_ID with a real booking ID once seed wiring is complete.
//   The booking must:
//   - Be owned by the organizer in the authenticated session
//   - Have at least one 'registered' and one 'cancelled' registrant seeded (for 5.8-E2E-001)
//   - Have registrationEnabled=true (for 5.8-E2E-002)
//
// Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
//   All string assertions use English mock data. Paraglide keys tested by name only.
// ===========================================================================

// ---------------------------------------------------------------------------
// 5.8 booking ID constant — replace with real booking ID once seed wiring is complete
// ---------------------------------------------------------------------------

/**
 * ID of a booking owned by the test organizer, with mixed-status registrants.
 * Must be seeded in the DB before these tests run.
 */
const ORGANIZER_BOOKING_ID_5_8 = 'placeholder-5-8-booking-id-replace-me';

// ---------------------------------------------------------------------------
// 5.8-E2E-001 — Organizer sees registrant list with status badges [P1] SKIP
// AC-1, AC-2: /bookings/[id]/registrants renders table + Registered/Cancelled badges
// ---------------------------------------------------------------------------

test.describe('Story 5.8 — Registrant List with Status Badges (AC-1, AC-2)', () => {
	test.skip('[P1] 5.8-E2E-001 — organizer sees registrant list with Registered and Cancelled status badges', async ({
		page
	}) => {
		// Activation condition: Tasks 1, 4, and 5 complete (query + route + i18n keys).
		// Prerequisite seed: booking with ORGANIZER_BOOKING_ID_5_8 must have at least
		//   one 'registered' and one 'cancelled' registrant in the DB.
		//   The organizer session must be authenticated (use dev-bypass or seed session).
		//
		// AC-1: /bookings/[id]/registrants page renders list of all registrants.
		//   Page heading shows event name. Table shows name, org, email, status badge per row.
		// AC-2: Status badges:
		//   - "Registered" badge uses green styling (bg-green-100 text-green-700)
		//   - "Cancelled" badge uses muted styling (bg-cream-200 text-ink-2 or equivalent)
		//   - Each badge must contain a visible text label — status NOT conveyed by color alone (WCAG 2.1 AA)
		// Note: If dev-bypass is available, use getDevBypassCookie() to authenticate the organizer.

		// Navigate to the registrant list page as an authenticated organizer
		await page.goto(`/bookings/${ORGANIZER_BOOKING_ID_5_8}/registrants`, {
			waitUntil: 'networkidle'
		});

		// No redirect to /login — route must be accessible to the authenticated organizer
		expect(page.url()).not.toContain('/login');
		expect(page.url()).toContain('/registrants');

		// AC-1: Page heading (event name) visible — Paraglide key: registrant_list_title
		const heading = page.getByRole('heading').first();
		await expect(heading).toBeVisible();

		// AC-1: Table/list rows visible — at least one registrant row must render
		const tableRows = page.locator('table tbody tr, [data-testid="registrant-row"]');
		await expect(tableRows.first()).toBeVisible();

		// AC-2: "Registered" status badge visible with text label
		// Matches Paraglide key: registrant_list_status_registered ("Registered")
		await expect(page.getByText('Registered')).toBeVisible();

		// AC-2: "Cancelled" status badge visible with text label
		// Matches Paraglide key: registrant_list_status_cancelled ("Cancelled")
		await expect(page.getByText('Cancelled')).toBeVisible();

		// AC-2 (WCAG 2.1 AA): Both badges must have visible text (not conveyed by color alone)
		// The badge elements must not have aria-hidden on their text content
		const registeredBadge = page.locator('[class*="green"]').filter({ hasText: 'Registered' });
		await expect(registeredBadge).toBeVisible();

		const cancelledBadge = page
			.locator('[class*="cream"], [class*="stone"], [class*="amber"]')
			.filter({
				hasText: 'Cancelled'
			});
		await expect(cancelledBadge).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// 5.8-E2E-002 — Dashboard card shows live headcount after a new registration [P1] SKIP
// AC-5 (FR-052): Dashboard BookingCard replaces "—" placeholder with real registrantCount
// ---------------------------------------------------------------------------

test.describe('Story 5.8 — Dashboard Live Headcount (AC-5, FR-052)', () => {
	test.skip('[P1] 5.8-E2E-002 — dashboard card shows live headcount after a new registration (not "—" placeholder)', async ({
		page
	}) => {
		// Activation condition: Tasks 2, 3, and 4 complete (headcount subquery +
		//   BookingCard.svelte update + route).
		// Prerequisite: An organizer with at least one FUTURE booking that has registrationEnabled=true.
		//   Use dev-bypass to authenticate as the organizer.
		//   Seed the booking via SQL or dev-bypass endpoint.
		//
		// AC-5 (FR-052): The dashboard BookingCard for each upcoming booking shows
		//   the live count of status='registered' registrants.
		//   Before this story: the placeholder "—" is shown.
		//   After implementation: the real count (e.g. "1", "3") replaces "—".
		//
		// Strategy:
		//   1. Authenticate as organizer (dev-bypass or seeded session)
		//   2. Navigate to /dashboard — verify booking card shows initial headcount (0 or N)
		//   3. Submit a new registration via the public /r/[token] form
		//   4. Navigate back to /dashboard
		//   5. Assert the booking card shows the updated headcount (> previous value)
		//   6. Assert "—" placeholder is NOT visible on the card

		// Step 1: Navigate to dashboard as authenticated organizer
		await page.goto('/dashboard', { waitUntil: 'networkidle' });

		// Must not redirect to /login — organizer must be authenticated
		expect(page.url()).not.toContain('/login');
		expect(page.url()).toContain('/dashboard');

		// Step 2: Record the initial headcount on the booking card
		// The booking card for ORGANIZER_BOOKING_ID_5_8 should show the registrant count
		// Look for the count display area on the booking card
		const bookingCard = page
			.locator(
				`[data-booking-id="${ORGANIZER_BOOKING_ID_5_8}"], [href*="${ORGANIZER_BOOKING_ID_5_8}"]`
			)
			.first();
		await expect(bookingCard).toBeVisible();

		// AC-5: After implementation, "—" placeholder must NOT appear
		// (BookingCard.svelte replaces dashboard_registrant_count_placeholder with booking.registrantCount)
		await expect(page.getByText('—')).not.toBeVisible();

		// AC-5: A numeric value must be shown in the headcount area
		// The headcount area contains a number (0, 1, 2, etc.)
		const headcountText = bookingCard.locator('span').filter({ hasText: /^\d+$/ }).first();
		await expect(headcountText).toBeVisible();

		const initialCount = Number(await headcountText.textContent());
		expect(
			Number.isInteger(initialCount),
			'5.8-E2E-002: headcount must be a non-negative integer'
		).toBe(true);
		expect(initialCount, '5.8-E2E-002: headcount must be >= 0').toBeGreaterThanOrEqual(0);
	});
});
