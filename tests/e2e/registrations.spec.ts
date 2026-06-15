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
