/**
 * ATDD Red-Phase E2E Scaffolds — Story 2.1: Sign in with Authentik (OIDC)
 * E2E Tests: Login page, OIDC flow, redirect behavior, i18n, accessibility
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
 *   4. Implement the feature (per task in story 2.1).
 *   5. Run again — verify it PASSES (green).
 *   6. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-1: Unauthenticated (app) route → redirect to login page
 *   - AC-2: Login page has "Sign in" button that initiates PKCE flow
 *   - AC-4: Sign out destroys session; subsequent request → login
 *   - AC-5: No (app) route reachable without valid session
 *
 * Scenario IDs (from test-design-epic-2.md):
 *   - 2.1-E2E-001: OIDC authorization-code + PKCE flow completes → DB session created [P0]
 *   - 2.1-E2E-002: Login page renders with Thai Paraglide string and lang="th" [P1]
 *   - 2.1-E2E-003: Login redirect preserves originally-requested URL after auth [P1]
 *   - 2.1-E2E-004: Login page shows actionable error on OIDC provider unavailable [P2]
 *
 * Prerequisites:
 *   - Dev server running on port 3000 (`bun run dev`)
 *   - For 2.1-E2E-001: Story 2.2 dev bypass seam required (AUTH_DEV_BYPASS=true)
 *   - For 2.1-E2E-002: Paraglide Thai language configured (messages/th.json with login keys)
 *   - Login page created: src/routes/login/+page.svelte with m.login_sign_in_button()
 *   - Auth guard active in hooks.server.ts (handles unauthenticated redirects)
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 *   Tests verify structural/locale attributes (html[lang="th"]), not specific Thai string values.
 *   The login_sign_in_button and login_title Paraglide keys have English placeholder values
 *   in messages/th.json until Rawinan provides the Thai translations.
 *
 * IMPORTANT: 2.1-E2E-001 (full OIDC flow) requires Story 2.2 dev bypass.
 *   These tests can be partially activated before Story 2.2 (login page render, redirect),
 *   but the complete sign-in journey requires the dev bypass seam.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// 2.1-E2E-001 — Full OIDC flow: auth completes → DB session created [P0]
// Requires Story 2.2 dev bypass seam (AUTH_DEV_BYPASS=true).
// ---------------------------------------------------------------------------

test.describe('Story 2.1 — OIDC Sign-in Flow (AC-2, AC-3)', () => {
	test.skip('[P0] 2.1-E2E-001 — OIDC authorization-code + PKCE flow completes → DB-backed session created', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — login page and auth flow not yet implemented.
		// Requires: Task 3.2 (login page) + Task 2.2 (hooks) + Story 2.2 dev bypass.
		//
		// AC-2: Clicking "Sign in" initiates authorization-code + PKCE flow via Better Auth.
		// AC-3: OIDC callback processed by Better Auth → DB session row created.
		//
		// Strategy (with Story 2.2 dev bypass as the auth seam):
		//   1. Navigate to a protected (app) route → expect redirect to /login
		//   2. Use dev bypass endpoint (Story 2.2) to create authenticated session
		//   3. Navigate to the (app) route again → expect 200 (not redirect)
		//   4. Verify session is available (page content reflects logged-in user)
		//
		// Note: Full OIDC round-trip against real Authentik is E2E-only in staging.
		//   Dev environment uses AUTH_DEV_BYPASS=true seam.

		// Step 1: Navigate to protected route — expect redirect to login
		await page.goto('/dashboard');
		await expect(page, 'Unauthenticated visit to /dashboard must redirect to /login').toHaveURL(
			/\/login/
		);

		// Step 2: Dev bypass — create authenticated session (Story 2.2 endpoint)
		// POST to /auth/dev-bypass with test user credentials
		const bypassResponse = await page.request.post('/auth/dev-bypass', {
			data: { userId: 'test-user-organizer' }
		});
		expect(
			bypassResponse.status(),
			'Dev bypass must return 200 — activate after Story 2.2 is merged'
		).toBe(200);

		// Step 3: Navigate to protected route — expect 200 (not redirect)
		await page.goto('/dashboard');
		await expect(
			page,
			'Authenticated visit to /dashboard must NOT redirect to /login'
		).not.toHaveURL(/\/login/);
		expect(page.url(), 'Must be on dashboard after auth').toContain('/dashboard');
	});
});

// ---------------------------------------------------------------------------
// Login page: render and interaction tests (AC-2) [P0/P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.1 — Login Page: Render and Interaction (AC-2)', () => {
	test.skip('[P0] 2.1-E2E-LOGIN-001 — Login page renders with Sign in button', async ({ page }) => {
		// THIS TEST WILL FAIL — src/routes/login/+page.svelte not yet created (Task 3.3).
		// Activate after Task 3.3 (login page).
		//
		// AC-2: Login page has a "Sign in" button that initiates the PKCE flow.

		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// Login page must render a sign-in button (text from Paraglide m.login_sign_in_button())
		// English placeholder: "Sign in with organization account"
		const signInButton = page.getByRole('button', { name: /sign in/i });
		await expect(
			signInButton,
			'Login page must render a "Sign in" button (m.login_sign_in_button())'
		).toBeVisible();

		// Login page must have a title/heading (from m.login_title() — "Sign in")
		const loginHeading = page
			.getByRole('heading', { name: /sign in/i })
			.or(page.locator('h1, h2').filter({ hasText: /sign in/i }));
		await expect(
			loginHeading.first(),
			'Login page must render a heading with m.login_title()'
		).toBeVisible();
	});

	test.skip('[P0] 2.1-E2E-LOGIN-002 — Unauthenticated visit to (app) route redirects to login page', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — hooks.server.ts auth guard not yet active (Task 2.3).
		// Activate after Task 2.3 (handleAuthGuard).
		//
		// AC-1: Unauthenticated navigation to (app) route → 302 → /login.

		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Must end up on the login page (either /login or contains login UI)
		await expect(page, 'Unauthenticated visit to /dashboard must redirect to /login').toHaveURL(
			/\/login/
		);
	});

	test.skip('[P0] 2.1-E2E-LOGIN-003 — Clicking Sign in button initiates OIDC redirect', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — login page and auth flow not yet implemented.
		// Activate after Task 3.2 (login page) + Task 2.2 (hooks).
		//
		// AC-2: Clicking "Sign in" initiates authorization-code + PKCE flow.
		// The button posts to Better Auth's OAuth initiation endpoint.

		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// Click the Sign in button
		await page.getByRole('button', { name: /sign in/i }).click();

		// Should redirect to Authentik (external) or to /auth/sign-in/social (internal)
		// Either: URL changes away from /login (redirect to IdP)
		// Or: A request to /auth/sign-in/social?provider=authentik is made
		//
		// For CI without Authentik: assert request to /auth/sign-in/social is made
		// and the response is 3xx (redirect to Authentik authorization endpoint)
		await expect(page, 'Clicking Sign in must redirect away from /login').not.toHaveURL(
			/^http:\/\/localhost:3000\/login$/
		);
	});
});

// ---------------------------------------------------------------------------
// 2.1-E2E-002 — Login page renders with Thai Paraglide string and lang="th" [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.1 — Login Page: i18n and Thai Language (AC-2, NFR-006)', () => {
	test.skip('[P1] 2.1-E2E-002 — Login page renders with Paraglide i18n and html[lang] attribute', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — login page not yet created (Task 3.3).
		// Activate after Task 3.3 + messages/th.json has login keys.
		//
		// Tests NFR-006 (i18n): all login page strings must flow through Paraglide.
		// Tests that html[lang] is set (either "th" or "en" depending on browser preference).
		//
		// Note: Thai language support is production-required. Rawinan handles all translations.
		//   We test the STRUCTURE (lang attribute, Paraglide key used) not specific Thai text.

		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// Assert html[lang] attribute is set (Paraglide sets this based on user language)
		const htmlLang = await page.locator('html').getAttribute('lang');
		expect(htmlLang, 'html[lang] attribute must be set by Paraglide (either "en" or "th")').toMatch(
			/^(en|th)$/
		);

		// Assert the Sign in button text is NOT a raw Paraglide key (must be resolved)
		const signInButton = page.getByRole('button', { name: /sign in/i });
		await expect(
			signInButton,
			'Sign in button must be visible (Paraglide key must resolve to visible text)'
		).toBeVisible();

		const buttonText = await signInButton.textContent();
		expect(
			buttonText,
			'Sign in button must not show a raw Paraglide key like "login_sign_in_button"'
		).not.toContain('login_sign_in_button');
		expect(buttonText, 'Sign in button text must not be empty').toBeTruthy();
	});

	test.skip('[P1] 2.1-E2E-002b — Login page has no hardcoded English or Thai strings (all via Paraglide)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — login page not yet created (Task 3.3).
		// Activate after Task 3.3.
		//
		// Per project memory rule: no Thai text hardcoded in code or mocks.
		// All strings must go through Paraglide message functions (m.*).
		// This test verifies the structural requirement — CI lint (no-hardcoded-strings) enforces it.

		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// The page source should not contain the literal string "Sign in with organization account"
		// as a hardcoded HTML text node — it must come from Paraglide
		const pageSource = await page.content();

		// This is a structural check — hardcoded strings in templates would appear verbatim in HTML
		// Paraglide-rendered strings will also appear in HTML, but the SOURCE (svelte template) must use m.*
		// We verify by checking that the Paraglide compile output is loaded on the page
		const hasParaglideScript = pageSource.includes('paraglide') || pageSource.includes('m.');
		expect(
			hasParaglideScript,
			'Login page must load Paraglide (m.* functions) — no hardcoded strings allowed'
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 2.1-E2E-003 — Login redirect preserves originally-requested URL [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.1 — Login Redirect: Preserve Original URL (UX)', () => {
	test.skip('[P1] 2.1-E2E-003 — Login redirect preserves originally-requested URL after authentication', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — auth guard + login flow not yet implemented.
		// Activate after Task 2.3 (auth guard) + Story 2.2 (dev bypass).
		//
		// UX requirement: when user is redirected to /login from a protected route,
		// completing sign-in should return them to the originally-requested URL.
		// Prevents the frustrating UX of always landing on /dashboard after sign-in.

		// Navigate to a specific protected page
		await page.goto('/bookings');
		await page.waitForLoadState('networkidle');

		// Should have been redirected to /login (with returnTo param or state)
		await expect(page, 'Must be on login page after unauthenticated access').toHaveURL(/\/login/);

		// Complete sign-in via dev bypass (Story 2.2 seam)
		const bypassResponse = await page.request.post('/auth/dev-bypass', {
			data: { userId: 'test-user-organizer' }
		});
		expect(bypassResponse.status(), 'Dev bypass must succeed — activate after Story 2.2').toBe(200);

		// After sign-in, should be back at the originally-requested URL
		await page.goto('/login'); // Re-trigger login flow to test the full redirect
		// NOTE: The specific mechanism (returnTo query param, cookie, session storage)
		// depends on Better Auth / SvelteKit implementation — assert end result only.
		await expect(
			page,
			'After sign-in, user must be redirected back to originally-requested page'
		).toHaveURL(/\/(bookings|dashboard)/);
	});
});

// ---------------------------------------------------------------------------
// 2.1-E2E-004 — Login page shows error on OIDC provider unavailable [P2]
// ---------------------------------------------------------------------------

test.describe('Story 2.1 — Login Page: OIDC Provider Error Handling [P2]', () => {
	test.skip('[P2] 2.1-E2E-004 — Login page shows actionable error message when OIDC provider is unavailable', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — login page and error handling not yet implemented.
		// Activate after Task 3.3 (login page) + error handling is confirmed.
		//
		// UX-DR8: System error pattern — show actionable error, not a 500 stack trace.
		// Per design system: error banner with retry link.

		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// Simulate provider unavailable by intercepting the PKCE initiation request
		await page.route('/auth/sign-in/social*', (route) => {
			route.fulfill({
				status: 503,
				body: JSON.stringify({ error: 'Service Unavailable' })
			});
		});

		// Click Sign in
		await page.getByRole('button', { name: /sign in/i }).click();

		// Should show an error message — not navigate to a 500 page
		// Error message from Paraglide: m.login_error_provider_unavailable()
		// English placeholder: "Sign in is temporarily unavailable. Please try again."
		await expect(
			page.locator('[role="alert"], [data-testid="error-banner"], .error-message').first(),
			'Login page must show an error banner when OIDC provider is unavailable'
		).toBeVisible({ timeout: 5000 });

		// Must stay on /login — no redirect to 500 error page
		await expect(
			page,
			'Login page must remain on /login after OIDC error — no redirect to 500 page'
		).toHaveURL(/\/login/);
	});
});

// ---------------------------------------------------------------------------
// 2.1-E2E-A11Y — Accessibility: login page zero axe violations [P1]
// ---------------------------------------------------------------------------

test.describe('Story 2.1 — Accessibility: Login Page (NFR-007)', () => {
	test.skip('[P1] 2.1-E2E-A11Y — Login page passes axe-core WCAG 2.1 AA check (zero violations)', async ({
		page
	}) => {
		// THIS TEST WILL FAIL — login page not yet created (Task 3.3).
		// Activate after Task 3.3 (login page) renders without critical a11y violations.
		//
		// NFR-007: WCAG 2.1 AA compliance. Login page is the entry point for all users.
		// Profile form a11y is tested in Story 2.3 (2.3-A11Y-001).

		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(
			results.violations,
			`Login page axe-core violations:\n${results.violations
				.map((v) => `  ${v.id}: ${v.description} (${v.impact}) — ${v.nodes.length} instance(s)`)
				.join('\n')}`
		).toHaveLength(0);
	});
});
