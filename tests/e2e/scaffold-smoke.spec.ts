/**
 * ATDD Red-Phase E2E Scaffolds — Story 1.1: Scaffold the Project
 *
 * TDD RED PHASE: All tests are marked test.skip() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * These E2E tests verify that the SvelteKit scaffold boots and the
 * Playwright integration works. They map to AC-6 (Playwright exits 0).
 *
 * Activation guide:
 *   1. Remove `test.skip(` → `test(` for the current task's test.
 *   2. Run: `bun run test:e2e` — verify it FAILS first (red).
 *   3. Implement / configure the feature.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * Scenario IDs align with test-design-epic-1.md (P1 scenarios for Story 1.1).
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// P1 — AC-6: Playwright scaffold test passes (dev server smoke)
// Given: scaffolded project with `bun run dev` running,
// When:  Playwright navigates to http://localhost:5173,
// Then:  the page loads (HTTP 200, no crash)
// ---------------------------------------------------------------------------

test.describe('Story 1.1 — Scaffold E2E Smoke Tests (ATDD Red Phase)', () => {

  test.skip('[P1] 1.1-E2E-001 — dev server serves the scaffold page (HTTP 200)', async ({ page }) => {
    // THIS TEST WILL FAIL — dev server not running / project not scaffolded yet.
    // Remove test.skip() once sv create + bun install + bun run dev are complete.
    const response = await page.goto('http://localhost:5173');

    // Expect 200 — the scaffold default page must respond successfully
    expect(response?.status()).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // P1 — Root page renders without JavaScript errors
  // Given: dev server running, When: page loads, Then: no console errors thrown
  // ---------------------------------------------------------------------------

  test.skip('[P1] 1.1-E2E-002 — scaffold page loads without console errors', async ({ page }) => {
    // THIS TEST WILL FAIL — dev server not running / project not scaffolded yet.
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');

    // A freshly scaffolded SvelteKit project should produce zero console errors
    expect(consoleErrors, `Console errors found: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // P1 — Root page has valid HTML lang attribute (accessibility baseline)
  // Given: dev server running, When: page loads, Then: <html lang="..."> is set
  // ---------------------------------------------------------------------------

  test.skip('[P1] 1.1-E2E-003 — scaffold page has html[lang] attribute set', async ({ page }) => {
    // THIS TEST WILL FAIL — project not scaffolded yet.
    // Paraglide sets lang attribute based on active locale.
    await page.goto('http://localhost:5173');

    const lang = await page.getAttribute('html', 'lang');

    // The scaffold default locale is "en"; Paraglide sets this automatically.
    expect(lang, 'html[lang] attribute must be set by Paraglide').toBeTruthy();
    expect(['en', 'th'], 'html[lang] must be a configured Paraglide locale').toContain(lang);
  });

  // ---------------------------------------------------------------------------
  // P1 — Playwright config exists and test:e2e script is wired (meta-verification)
  // This test verifies the test runner infrastructure is set up correctly.
  // ---------------------------------------------------------------------------

  test.skip('[P1] 1.1-E2E-004 — playwright.config.ts exists and baseURL points to localhost:5173', async () => {
    // THIS TEST WILL FAIL — playwright.config.ts not yet created.
    // sv create generates a playwright.config.ts; we verify it references port 5173.
    // This test intentionally uses no page fixture because it only checks config file existence.
    const { existsSync, readFileSync } = await import('fs');
    const path = await import('path');

    const configPath = path.join(process.cwd(), 'playwright.config.ts');

    expect(existsSync(configPath), 'playwright.config.ts not found').toBe(true);

    const content = readFileSync(configPath, 'utf-8');

    // Must reference port 5173 (default SvelteKit dev server port)
    expect(content, 'playwright.config.ts must reference port 5173').toMatch(/5173/);
  });

});
