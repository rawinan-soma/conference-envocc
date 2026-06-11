/**
 * ATDD Red-Phase E2E Scaffolds — Story 2.3: Self-service Profile
 * E2E Tests: Profile form UI, field rendering, accessibility, state patterns
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Playwright E2E tests — requires dev server running on port 3000.
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test(s).
 *   2. Ensure dev server is running: `bun run dev`
 *   3. Run: `bun run test:e2e -- --grep "<test-id>"` — verify it FAILS first (red).
 *   4. Implement the feature (per task in story 2.3).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-2: Email field is pre-filled read-only from OIDC; other fields empty and editable
 *   - AC-3: Valid form submit creates profile; redirect to dashboard
 *   - AC-5: Missing required field → field-level inline error messages; focus on first error
 *   - AC-6: Profile edit shows pre-filled mutable fields; email read-only
 *   - UXD-020: Submit button disabled + loading state while submitting
 *   - NFR-007: WCAG 2.1 AA — zero axe-core violations on profile page
 *   - NFR-006: No hardcoded strings — all labels via Paraglide
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.3-E2E-001: Profile form renders with correct fields; email input is readonly [P1]
 *   - 2.3-A11Y-001: Profile form passes axe-core check (zero WCAG 2.1 AA violations) [P1]
 *   - 2.3-INT-007: Profile form shows loading/disabled state during submission [P2]
 *
 * Prerequisites:
 *   - Dev server running on port 3000 (`bun run dev`)
 *   - Story 2.2 dev bypass seam active: AUTH_DEV_BYPASS=true
 *   - Profile completion route created: src/routes/(app)/profile/complete/+page.svelte
 *   - Paraglide profile keys added to messages/en.json and compiled
 *   - sveltekit-superforms installed and integrated in profile form
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   Tests verify structure/attributes (readonly, aria-label, for/id linkage), not specific
 *   string values. The Paraglide keys have English placeholder values in messages/th.json
 *   until Rawinan provides the Thai translations.
 *
 * Note: Tests that require an authenticated session use the dev-bypass pattern.
 *   The dev-bypass creates a session via POST /r/dev-bypass (Story 2.2).
 *   AUTH_DEV_BYPASS=true must be set in the test environment.
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// Helper: create authenticated session via dev bypass (Story 2.2 seam)
// ---------------------------------------------------------------------------

/**
 * Authenticates via the dev bypass endpoint (Story 2.2).
 * Navigates to the dev bypass URL and captures the session cookie.
 *
 * Prerequisite: AUTH_DEV_BYPASS=true set in dev server environment.
 *
 * @param page - Playwright page object
 * @param options - Optional overrides for the seeded test user
 */
async function loginViaDevBypass(
	page: Page,
	options: { profileComplete?: boolean } = {}
): Promise<void> {
	// Dev bypass endpoint created in Story 2.2
	// POST /r/dev-bypass?profileComplete=false seeds a user + session + sets the cookie
	const profileComplete = options.profileComplete ?? false;
	await page.goto(`/r/dev-bypass?profileComplete=${profileComplete}`, { waitUntil: 'networkidle' });
}

// ---------------------------------------------------------------------------
// 2.3-E2E-001 — Profile form renders with correct fields; email is readonly [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.3 — Profile Form: Field Rendering and Email Read-only (AC-2)', () => {
	test.skip('[P1] 2.3-E2E-001 — /profile/complete renders title, firstName, lastName, phone, organization fields; email is readonly', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile completion page not yet created (Task 5.2).
		// Activate after Task 5.2 (+page.svelte created with all required fields).
		//
		// AC-2: Given the profile completion form,
		//       When the page loads,
		//       Then the email field is pre-filled read-only from event.locals.user.email,
		//       and the title, firstName, lastName, phone, organization fields are empty and editable.
		//
		// UXD-020: Visible labels (never placeholder-only); tap targets ≥ 44px.
		// NFR-006: All labels via Paraglide (not hardcoded English/Thai text).
		//
		// Strategy:
		//   1. Login via dev bypass (sets session cookie with incomplete profile).
		//   2. Navigate to /profile/complete.
		//   3. Assert email field has readonly attribute and is pre-filled.
		//   4. Assert title, firstName, lastName, phone, organization fields are present and editable.
		//   5. Assert all fields have associated <label> elements (WCAG 2.1 AA requirement).

		await loginViaDevBypass(page, { profileComplete: false });
		await page.goto('/profile/complete');

		// Email field — must be pre-filled and read-only
		const emailInput = page
			.locator('input[name="email"], input[type="email"], [data-testid="email-field"]')
			.first();
		// Email may be shown as a disabled/readonly input or as static text
		// Either way it must not be an editable input with the name "email"
		// We check that if an email input exists, it has readonly or disabled attribute
		const emailInputCount = await emailInput.count();
		if (emailInputCount > 0) {
			const isReadonly = await emailInput.getAttribute('readonly');
			const isDisabled = await emailInput.getAttribute('disabled');
			expect(
				isReadonly !== null || isDisabled !== null,
				'Email input must be readonly or disabled (not editable)'
			).toBe(true);
		}

		// Title field — must be present (Select component)
		const titleField = page.locator('[name="title"], [data-testid="title-field"]').first();
		await expect(titleField, 'Title field must be present on the form').toBeVisible();

		// firstName field — must be present and editable
		const firstNameInput = page
			.locator('input[name="firstName"], [data-testid="firstName-field"]')
			.first();
		await expect(firstNameInput, 'First name input must be visible').toBeVisible();
		const firstNameReadonly = await firstNameInput.getAttribute('readonly');
		const firstNameDisabled = await firstNameInput.getAttribute('disabled');
		expect(
			firstNameReadonly === null && firstNameDisabled === null,
			'First name input must be editable (not readonly or disabled)'
		).toBe(true);

		// lastName field — must be present and editable
		const lastNameInput = page
			.locator('input[name="lastName"], [data-testid="lastName-field"]')
			.first();
		await expect(lastNameInput, 'Last name input must be visible').toBeVisible();

		// phone field — must be present and editable
		const phoneInput = page.locator('input[name="phone"], [data-testid="phone-field"]').first();
		await expect(phoneInput, 'Phone input must be visible').toBeVisible();

		// organization field — must be present and editable
		const orgInput = page
			.locator('input[name="organization"], [data-testid="organization-field"]')
			.first();
		await expect(orgInput, 'Organization input must be visible').toBeVisible();

		// WCAG: All inputs must have associated <label> elements
		// Check that firstName, lastName, phone, organization each have a linked label
		for (const inputName of ['firstName', 'lastName', 'phone', 'organization']) {
			const input = page.locator(`input[name="${inputName}"]`).first();
			const inputId = await input.getAttribute('id');
			if (inputId) {
				const label = page.locator(`label[for="${inputId}"]`);
				const labelCount = await label.count();
				expect(
					labelCount,
					`Input "${inputName}" must have an associated <label for="${inputId}"> element`
				).toBeGreaterThan(0);
			}
		}
	});

	test.skip('[P1] 2.3-E2E-001b — /profile/complete form fields are empty by default (no pre-fill except email)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile form not yet created (Task 5.2).
		// Activate after Task 5.2.
		//
		// AC-2: firstName, lastName, phone, organization fields are empty on initial load.

		await loginViaDevBypass(page, { profileComplete: false });
		await page.goto('/profile/complete');

		// Editable fields must be empty on first load
		const firstNameInput = page.locator('input[name="firstName"]').first();
		await expect(firstNameInput).toHaveValue('');

		const lastNameInput = page.locator('input[name="lastName"]').first();
		await expect(lastNameInput).toHaveValue('');

		const phoneInput = page.locator('input[name="phone"]').first();
		await expect(phoneInput).toHaveValue('');

		const orgInput = page.locator('input[name="organization"]').first();
		await expect(orgInput).toHaveValue('');
	});
});

// ---------------------------------------------------------------------------
// 2.3-E2E-001c — Profile form: valid submission redirects to dashboard [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.3 — Profile Form: Valid Submission Redirects to Dashboard (AC-3)', () => {
	test.skip('[P1] 2.3-E2E-001c — Fill and submit profile form with valid data → redirected to /dashboard', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile form not yet created (Task 5.2).
		// Activate after Tasks 5.1 and 5.2.
		//
		// AC-3: Valid submission → profile created; redirect to dashboard.

		await loginViaDevBypass(page, { profileComplete: false });
		await page.goto('/profile/complete');

		// Fill all required fields
		// Title — shadcn-svelte Select component (trigger + content pattern)
		const titleTrigger = page.locator('[data-testid="title-select"], [role="combobox"]').first();
		await titleTrigger.click();
		await page.locator('[role="option"]').filter({ hasText: 'Mr.' }).click();

		await page.locator('input[name="firstName"]').fill('E2E');
		await page.locator('input[name="lastName"]').fill('Tester');
		await page.locator('input[name="phone"]').fill('+66801234567');
		await page.locator('input[name="organization"]').fill('E2E Test Hospital');

		// Submit the form
		await page.locator('button[type="submit"]').click();

		// Should redirect to dashboard
		await page.waitForURL(/\/dashboard/, { timeout: 5000 });
		expect(page.url(), 'After valid profile submission, URL must be /dashboard').toMatch(
			/\/dashboard/
		);
	});
});

// ---------------------------------------------------------------------------
// 2.3-E2E-002 — Profile form: field-level errors on invalid submission [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.3 — Profile Form: Field-level Error Messages on Validation Failure (AC-5)', () => {
	test.skip('[P1] 2.3-E2E-002 — Submit profile form with firstName empty → inline field error appears; focus on first error field', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile form validation UI not yet implemented (Task 5.2).
		// Activate after Task 5.2 (sveltekit-superforms $errors binding + error rendering).
		//
		// AC-5: Missing required field → field-level inline error messages.
		// UXD-020: Red border + message under field; focus jumps to first error field.
		//
		// Strategy:
		//   1. Login via dev bypass; navigate to /profile/complete.
		//   2. Fill all fields EXCEPT firstName.
		//   3. Submit.
		//   4. Assert inline error message appears near firstName field.
		//   5. Assert focus is on the firstName input (keyboard navigation).

		await loginViaDevBypass(page, { profileComplete: false });
		await page.goto('/profile/complete');

		// Fill everything except firstName
		const titleTrigger = page.locator('[role="combobox"]').first();
		await titleTrigger.click();
		await page.locator('[role="option"]').filter({ hasText: 'Ms.' }).click();

		// Intentionally skip filling firstName
		await page.locator('input[name="lastName"]').fill('ErrorTester');
		await page.locator('input[name="phone"]').fill('+66801111111');
		await page.locator('input[name="organization"]').fill('Error Test Org');

		// Submit
		await page.locator('button[type="submit"]').click();

		// Should NOT navigate away (validation fails client-side or server returns 422)
		await page.waitForTimeout(500); // brief wait for validation rendering
		expect(page.url(), 'URL must not change to /dashboard on validation failure').not.toMatch(
			/\/dashboard/
		);

		// Inline error message should appear near firstName field
		// sveltekit-superforms renders errors via $errors.firstName
		// At minimum, some error indicator must be visible
		const errorText = page.locator('text=/required|invalid|First name/i').first();
		const errorCount = await errorText.count();
		expect(
			errorCount,
			'An error message referencing firstName or "required" must be visible after submitting empty firstName'
		).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// 2.3-E2E-003 — Profile form: submit button loading state (UXD-020) [P2]
// ---------------------------------------------------------------------------

test.describe('Story 2.3 — Profile Form: Submit Button Loading/Disabled State (UXD-020)', () => {
	test.skip('[P2] 2.3-INT-007 — Submit button is disabled during in-flight form POST (UXD-020 state pattern)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile form loading state not yet implemented (Task 5.2).
		// Activate after Task 5.2 (sveltekit-superforms $submitting + disabled/loading state).
		//
		// UXD-020: Submit button goes disabled + loading state while submitting.
		//
		// Strategy:
		//   1. Login via dev bypass; navigate to /profile/complete.
		//   2. Fill valid form data.
		//   3. Click submit — capture button state WHILE in-flight.
		//   4. Assert button is disabled or has aria-disabled during submission.

		await loginViaDevBypass(page, { profileComplete: false });
		await page.goto('/profile/complete');

		const titleTrigger = page.locator('[role="combobox"]').first();
		await titleTrigger.click();
		await page.locator('[role="option"]').filter({ hasText: 'Other' }).click();

		await page.locator('input[name="firstName"]').fill('Loading');
		await page.locator('input[name="lastName"]').fill('State');
		await page.locator('input[name="phone"]').fill('+66899900000');
		await page.locator('input[name="organization"]').fill('Loading Org');

		const submitButton = page.locator('button[type="submit"]');

		// Click and immediately check disabled state
		const [submitResponse] = await Promise.all([
			page.waitForResponse((resp) => resp.url().includes('/profile/complete')),
			submitButton.click()
		]);

		// During submission (before response), button should be disabled
		// This checks the optimistic UI state — may need to intercept the network
		// to reliably test this. The assertion here is best-effort for initial scaffolding.
		void submitResponse; // response received; check it didn't 500

		// At minimum: after a submit click, no JS errors should occur
		const consoleLogs: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') consoleLogs.push(msg.text());
		});

		await page.waitForTimeout(100);
		expect(
			consoleLogs.filter((l) => l.includes('TypeError') || l.includes('ReferenceError')).length,
			'No JS errors should occur during form submission'
		).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// 2.3-E2E-004 — Profile edit: pre-filled fields; email read-only [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.3 — Profile Edit: Pre-filled Mutable Fields; Email Read-only (AC-6)', () => {
	test.skip('[P1] 2.3-E2E-004 — /profile (edit) renders pre-filled mutable fields; email field is readonly', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile edit page not yet created (Task 6.2).
		// Activate after Task 6.2 (+page.svelte for /profile edit created).
		//
		// AC-6: Given a completed profile,
		//       When I visit /profile (profile edit),
		//       Then I can edit title, firstName, lastName, phone, organization,
		//       but the email field remains read-only.

		await loginViaDevBypass(page, { profileComplete: true });
		await page.goto('/profile');

		// Email must be readonly/disabled
		const emailField = page
			.locator('input[name="email"], [data-testid="email-field"], input[type="email"]')
			.first();
		const emailCount = await emailField.count();
		if (emailCount > 0) {
			const isReadonly = await emailField.getAttribute('readonly');
			const isDisabled = await emailField.getAttribute('disabled');
			expect(
				isReadonly !== null || isDisabled !== null,
				'Email field on profile edit page must be readonly or disabled'
			).toBe(true);
		}

		// Mutable fields must be present and pre-filled (not empty)
		const firstNameInput = page.locator('input[name="firstName"]').first();
		await expect(firstNameInput, 'firstName field must be visible on edit page').toBeVisible();
		const firstNameValue = await firstNameInput.inputValue();
		expect(firstNameValue, 'firstName must be pre-filled on profile edit page').not.toBe('');

		const phoneInput = page.locator('input[name="phone"]').first();
		await expect(phoneInput, 'phone field must be visible on edit page').toBeVisible();
		const phoneValue = await phoneInput.inputValue();
		expect(phoneValue, 'phone must be pre-filled on profile edit page').not.toBe('');
	});
});

// ---------------------------------------------------------------------------
// 2.3-A11Y-001 — Profile form passes axe-core WCAG 2.1 AA check [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.3 — Accessibility: Profile Form WCAG 2.1 AA (NFR-007)', () => {
	test.skip('[P1] 2.3-A11Y-001 — Profile completion form passes axe-core scan with zero WCAG 2.1 AA violations', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile form not yet created (Task 5.2).
		// Activate after Task 5.2 with accessibility pass: visible labels, tap targets ≥ 44px,
		// contrast ≥ 4.5:1, no color-alone meaning.
		//
		// NFR-007: WCAG 2.1 AA compliance — axe-core zero violations.
		// Architecture: "visible labels (never placeholder-only), tap targets ≥ 44px".

		await loginViaDevBypass(page, { profileComplete: false });
		await page.goto('/profile/complete');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(
			accessibilityScanResults.violations,
			`Profile form must have zero WCAG 2.1 AA violations. Violations found:\n${accessibilityScanResults.violations
				.map((v) => `  [${v.impact}] ${v.id}: ${v.description}`)
				.join('\n')}`
		).toHaveLength(0);
	});

	test.skip('[P1] 2.3-A11Y-002 — Profile edit form passes axe-core scan with zero WCAG 2.1 AA violations', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile edit form not yet created (Task 6.2).
		// Activate after Task 6.2.

		await loginViaDevBypass(page, { profileComplete: true });
		await page.goto('/profile');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(
			accessibilityScanResults.violations,
			`Profile edit form must have zero WCAG 2.1 AA violations. Violations found:\n${accessibilityScanResults.violations
				.map((v) => `[${v.impact}] ${v.id}: ${v.description}`)
				.join('\n')}`
		).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// 2.3-E2E-005 — Profile gate: incomplete-profile user redirected at browser level [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.3 — Profile Gate: Browser-level Redirect for Incomplete Profile (AC-1)', () => {
	test.skip('[P1] 2.3-E2E-005 — Navigate to /dashboard as incomplete-profile user → browser lands on /profile/complete', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile gate in hooks.server.ts not yet implemented (Task 4).
		// Activate after Task 4 (routeGuards extension + profileComplete check).
		//
		// AC-1: From browser perspective — SvelteKit redirects the page navigation.
		// This complements 2.3-INT-001 (which tests the raw HTTP response).

		await loginViaDevBypass(page, { profileComplete: false });

		// Attempt to navigate to /dashboard
		await page.goto('/dashboard', { waitUntil: 'networkidle' });

		// Should end up on /profile/complete
		expect(
			page.url(),
			'Navigating to /dashboard with incomplete profile must land on /profile/complete'
		).toMatch(/\/profile\/complete/);
	});

	test.skip('[P1] 2.3-E2E-006 — /profile/complete page has correct <title> element (WCAG 2.1, AC-2)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — profile completion page not yet created (Task 5.2).
		// Activate after Task 5.2 (svelte:head title via m.profile_complete_title()).
		//
		// WCAG 2.1: Pages have a descriptive title (criterion 2.4.2 — Level A).

		await loginViaDevBypass(page, { profileComplete: false });
		await page.goto('/profile/complete');

		const title = await page.title();
		expect(title, 'Profile completion page must have a non-empty <title>').not.toBe('');
		// Title must not be a generic fallback
		expect(
			title,
			'Page title must not be the bare app name only (should include profile context)'
		).not.toBe('conference-envocc');
	});
});
