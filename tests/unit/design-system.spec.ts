/**
 * ATDD Tests — Story 1.2: Design System & Thai Typography
 *
 * All tests activated (green phase) after implementation.
 *
 * Scenario IDs align with acceptance criteria in story 1-2-design-system-thai-typography.md.
 * No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 */

import { test, expect, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { REQUIRED_RAW_TOKENS } from '../support/fixtures/design-system-context';
import { runCmd } from '../support/helpers/run-cmd';

const PROJECT_ROOT = path.resolve(process.cwd());

// ---------------------------------------------------------------------------
// AC-1: Forest & Copper color tokens in src/app.css
// Given: scaffolded app,
// When: Forest & Copper palette is defined as CSS variables in src/app.css,
// Then: --primary maps to green-700 (#2D6A4F), --background to cream (#FAFAF7),
//       --card to #FFFFFF, --border to #E0DBD3, and full DESIGN.md color set present.
// ---------------------------------------------------------------------------

describe('Story 1.2 — Design System & Thai Typography (ATDD Red Phase)', () => {
	test('[P0] 1.2-UNIT-001 — src/app.css defines Forest & Copper raw color tokens', () => {
		// THIS TEST WILL FAIL — color tokens not yet replaced in app.css.
		// Activate after Task 1 (Wire DESIGN.md color tokens) is complete.
		const appCssPath = path.join(PROJECT_ROOT, 'src/app.css');

		expect(existsSync(appCssPath), 'src/app.css not found').toBe(true);

		const content = readFileSync(appCssPath, 'utf-8');
		// Normalize content to lowercase for case-insensitive hex comparison (Prettier lowercases hex)
		const contentLower = content.toLowerCase();

		// Use REQUIRED_RAW_TOKENS from fixture as single source of truth for design token values.
		// Fixture stores uppercase hex (#1B4332); Prettier lowercases hex in CSS — lowercase before check.
		for (const [token, value] of REQUIRED_RAW_TOKENS) {
			expect(contentLower, `Missing raw token: ${token}: ${value}`).toContain(
				`${token}: ${value.toLowerCase()}`
			);
		}
	});

	test('[P0] 1.2-UNIT-002 — src/app.css maps shadcn semantic variables to Forest & Copper tokens', () => {
		// THIS TEST WILL FAIL — semantic mappings not yet added.
		// Activate after Task 1.3 (map semantic shadcn roles) is complete.
		const appCssPath = path.join(PROJECT_ROOT, 'src/app.css');

		expect(existsSync(appCssPath), 'src/app.css not found').toBe(true);

		const content = readFileSync(appCssPath, 'utf-8');

		// AC-1 specific checks: the four key shadcn semantic vars
		// Use case-insensitive matching because Prettier lowercases hex values
		// --primary must reference green-700 (#2D6A4F / #2d6a4f) — either directly or via var(--green-700)
		expect(content, '--primary must map to green-700 (#2D6A4F) or var(--green-700)').toMatch(
			/--primary\s*:\s*(var\(--green-700\)|#[2][dD][6][aA][4][fF])/i
		);

		// --background must reference cream (#FAFAF7) or var(--cream)
		expect(content, '--background must map to cream (#FAFAF7) or var(--cream)').toMatch(
			/--background\s*:\s*(var\(--cream\)|#fafaf7)/i
		);

		// --card must map to #FFFFFF (or lowercase)
		expect(content, '--card must map to #FFFFFF').toMatch(/--card\s*:\s*#(FFFFFF|ffffff)/i);

		// --border must reference #E0DBD3 or var(--border-color)
		expect(content, '--border must map to #E0DBD3 or var(--border-color)').toMatch(
			/--border\s*:\s*(var\(--border-color\)|#e0dbd3)/i
		);

		// Must NOT contain oklch() for the primary/background/card/border vars
		// (this story replaces oklch with hex-based tokens)
		const primarySection = content.match(/--primary\s*:[^;]+/)?.[0] ?? '';
		expect(primarySection, '--primary must not use oklch() after this story').not.toContain(
			'oklch'
		);
	});

	// ---------------------------------------------------------------------------
	// AC-2: Spacing, radius, and shadow tokens
	// Given: CSS theme, When: radius/spacing/shadow tokens added to src/app.css,
	// Then: available as CSS variables for use throughout the app.
	// ---------------------------------------------------------------------------

	test('[P0] 1.2-UNIT-003 — src/app.css has explicit DESIGN.md radius tokens (not calc offsets)', () => {
		// THIS TEST WILL FAIL — radius tokens not yet set to explicit values.
		// Activate after Task 2.1 (update radius vars) is complete.
		const appCssPath = path.join(PROJECT_ROOT, 'src/app.css');

		expect(existsSync(appCssPath), 'src/app.css not found').toBe(true);

		const content = readFileSync(appCssPath, 'utf-8');

		// DESIGN.md radius: sm=6px (0.375rem), md=10px (0.625rem), lg=16px (1rem), xl=20px (1.25rem)
		// Must be explicit — NOT calc() offsets from a base
		expect(content, '--radius-sm must be 0.375rem (6px)').toContain('--radius-sm: 0.375rem');
		expect(content, '--radius-md must be 0.625rem (10px)').toContain('--radius-md: 0.625rem');
		expect(content, '--radius-lg must be 1rem (16px)').toContain('--radius-lg: 1rem');
		expect(content, '--radius-xl must be 1.25rem (20px)').toContain('--radius-xl: 1.25rem');

		// Verify radius vars are NOT calc() based (DESIGN.md rule)
		const radiusSmSection = content.match(/--radius-sm\s*:[^;]+/)?.[0] ?? '';
		const radiusMdSection = content.match(/--radius-md\s*:[^;]+/)?.[0] ?? '';
		expect(radiusSmSection, '--radius-sm must not use calc()').not.toContain('calc(');
		expect(radiusMdSection, '--radius-md must not use calc()').not.toContain('calc(');
	});

	test('[P0] 1.2-UNIT-004 — src/app.css has green-tinted shadow tokens', () => {
		// THIS TEST WILL FAIL — shadow tokens not yet added.
		// Activate after Task 2.2 (add shadow vars) is complete.
		const appCssPath = path.join(PROJECT_ROOT, 'src/app.css');

		expect(existsSync(appCssPath), 'src/app.css not found').toBe(true);

		const content = readFileSync(appCssPath, 'utf-8');

		// Three-tier green-tinted shadow tokens from DESIGN.md
		expect(content, '--shadow-1 must be present').toContain('--shadow-1:');
		expect(content, '--shadow-2 must be present').toContain('--shadow-2:');
		expect(content, '--shadow-3 must be present').toContain('--shadow-3:');

		// Verify they reference rgba(27, 67, 50, ...) — the green-900 base color
		expect(content, '--shadow-1 must use green-tinted rgba(27, 67, 50, ...)').toMatch(
			/--shadow-1\s*:[^;]*rgba\(27,\s*67,\s*50/
		);
		expect(content, '--shadow-3 must use green-tinted rgba(27, 67, 50, ...)').toMatch(
			/--shadow-3\s*:[^;]*rgba\(27,\s*67,\s*50/
		);
	});

	// ---------------------------------------------------------------------------
	// AC-3: Thai fonts loaded from Google Fonts CDN
	// Given: CSS theme, When: Noto Serif/Sans Thai loaded from CDN,
	// Then: appear in src/app.html as preconnect + stylesheet links,
	//       and in src/app.css as --font-sans and --font-serif.
	// ---------------------------------------------------------------------------

	test('[P0] 1.2-UNIT-005 — src/app.html has Google Fonts preconnect and stylesheet links', () => {
		// THIS TEST WILL FAIL — font links not yet added to app.html.
		// Activate after Task 3.1 and 3.2 (Google Fonts CDN links) are complete.
		const appHtmlPath = path.join(PROJECT_ROOT, 'src/app.html');

		expect(existsSync(appHtmlPath), 'src/app.html not found').toBe(true);

		const content = readFileSync(appHtmlPath, 'utf-8');

		// Preconnect links (Task 3.1)
		expect(content, 'Must preconnect to fonts.googleapis.com').toContain(
			'href="https://fonts.googleapis.com"'
		);
		expect(content, 'Must preconnect to fonts.gstatic.com crossorigin').toContain(
			'href="https://fonts.gstatic.com"'
		);
		expect(content, 'fonts.gstatic.com preconnect must have crossorigin').toMatch(
			/fonts\.gstatic\.com[^>]*crossorigin/
		);

		// Google Fonts stylesheet (Task 3.2)
		expect(content, 'Must load Noto Sans Thai from Google Fonts').toContain('Noto+Sans+Thai');
		expect(content, 'Must load Noto Serif Thai from Google Fonts').toContain('Noto+Serif+Thai');
		expect(content, 'Google Fonts link must use display=swap').toContain('display=swap');
		expect(content, 'Font link must be rel="stylesheet"').toMatch(
			/rel="stylesheet"[^>]*Noto|Noto[^>]*rel="stylesheet"/
		);
	});

	test('[P0] 1.2-UNIT-006 — src/app.css @theme sets --font-sans and --font-serif to Noto Thai fonts', () => {
		// THIS TEST WILL FAIL — font vars not yet updated in app.css.
		// Activate after Task 3.3 (update @theme font vars) is complete.
		const appCssPath = path.join(PROJECT_ROOT, 'src/app.css');

		expect(existsSync(appCssPath), 'src/app.css not found').toBe(true);

		const content = readFileSync(appCssPath, 'utf-8');

		// --font-sans must lead with Noto Sans Thai
		expect(content, "--font-sans must start with 'Noto Sans Thai'").toMatch(
			/--font-sans\s*:\s*'Noto Sans Thai'/
		);

		// --font-serif must lead with Noto Serif Thai
		expect(content, "--font-serif must start with 'Noto Serif Thai'").toMatch(
			/--font-serif\s*:\s*'Noto Serif Thai'/
		);

		// Must NOT still use the default 'Inter' for --font-sans
		const fontSansSection = content.match(/--font-sans\s*:[^;]+/)?.[0] ?? '';
		expect(fontSansSection, "--font-sans must not use default 'Inter'").not.toContain("'Inter'");
	});

	// ---------------------------------------------------------------------------
	// AC-4: shadcn Button renders with correct theme (verified via page source)
	// Given: fonts and theme wired, When: sample page rendered,
	// Then: shadcn Button component installed and used.
	// ---------------------------------------------------------------------------

	test('[P1] 1.2-UNIT-007 — shadcn Button component files exist in src/lib/components/ui/button/', () => {
		// THIS TEST WILL FAIL — Button component not yet installed.
		// Activate after Task 4.1 (bunx shadcn-svelte@latest add button) is complete.
		const buttonDir = path.join(PROJECT_ROOT, 'src/lib/components/ui/button');

		expect(
			existsSync(buttonDir),
			'src/lib/components/ui/button/ not found — run: bunx shadcn-svelte@latest add button'
		).toBe(true);

		// Button index file must exist (shadcn-svelte convention)
		const indexFile = path.join(buttonDir, 'index.js');
		const indexTsFile = path.join(buttonDir, 'index.ts');
		const hasIndex = existsSync(indexFile) || existsSync(indexTsFile);

		expect(hasIndex, 'Button component must have index.js or index.ts entry point').toBe(true);
	});

	test('[P1] 1.2-UNIT-008 — src/routes/+page.svelte imports and renders a Button component', () => {
		// THIS TEST WILL FAIL — +page.svelte not yet updated with Button.
		// Activate after Task 4.2 (update page.svelte) is complete.
		const pagePath = path.join(PROJECT_ROOT, 'src/routes/+page.svelte');

		expect(existsSync(pagePath), 'src/routes/+page.svelte not found').toBe(true);

		const content = readFileSync(pagePath, 'utf-8');

		// Must import Button from shadcn-svelte
		expect(content, 'Must import Button from $lib/components/ui/button').toMatch(
			/import\s*\{[^}]*Button[^}]*\}\s*from\s*['"]\$lib\/components\/ui\/button/
		);

		// Must use <Button> component in template
		expect(content, 'Must render a <Button> component').toMatch(/<Button[^/]*>/);

		// No hardcoded Thai text (project rule)
		// Thai Unicode range: ฀-๿
		expect(
			content,
			'Must not contain hardcoded Thai characters (use English placeholders per project rule)'
		).not.toMatch(/[฀-๿]/);
	});

	// ---------------------------------------------------------------------------
	// AC-5: Thai typography CSS rules (line-height >= 1.65, min font-size 14px)
	// Given: sample page, When: Thai sample text rendered,
	// Then: line-height >= 1.65 and min font-size 14px.
	// ---------------------------------------------------------------------------

	test('[P0] 1.2-UNIT-009 — src/app.css enforces Thai body typography rules (line-height and font-size)', () => {
		// THIS TEST WILL FAIL — Thai typography rules not yet in app.css.
		// Activate after Task 4.3 (Thai body styles) is complete.
		const appCssPath = path.join(PROJECT_ROOT, 'src/app.css');

		expect(existsSync(appCssPath), 'src/app.css not found').toBe(true);

		const content = readFileSync(appCssPath, 'utf-8');

		// Either a @layer base body rule OR a .thai-body class must set line-height >= 1.65
		// and font-size >= 14px (0.875rem per UXD-008)
		const hasBodyLineHeight =
			content.includes('line-height: 1.65') ||
			content.includes('line-height: 1.6') ||
			content.includes('leading-relaxed') ||
			content.includes('leading-[1.65]');

		expect(
			hasBodyLineHeight,
			'app.css must set body or .thai-body line-height >= 1.65 (DESIGN.md Thai body rule)'
		).toBe(true);

		// font-size floor: 14px = 0.875rem (UXD-008)
		const hasFontSizeFloor =
			content.includes('font-size: 0.875rem') ||
			content.includes('font-size: 14px') ||
			content.includes('text-sm') ||
			content.includes('font-size: 1rem'); // body default 16px is acceptable

		expect(
			hasFontSizeFloor,
			'app.css must set a font-size >= 14px (UXD-008: never below 14px)'
		).toBe(true);
	});

	test('[P1] 1.2-UNIT-010 — src/routes/+page.svelte sample text has Thai typography classes applied', () => {
		// THIS TEST WILL FAIL — +page.svelte not yet updated with typography demo.
		// Activate after Task 4.3 is complete.
		const pagePath = path.join(PROJECT_ROOT, 'src/routes/+page.svelte');

		expect(existsSync(pagePath), 'src/routes/+page.svelte not found').toBe(true);

		const content = readFileSync(pagePath, 'utf-8');

		// The sample paragraph must have a class that enforces line-height >= 1.65
		// Accept: leading-[1.65], leading-relaxed (1.625), leading-loose, or .thai-body
		const hasLeadingClass =
			content.includes('leading-[1.65]') ||
			content.includes('leading-relaxed') ||
			content.includes('leading-loose') ||
			content.includes('thai-body');

		expect(
			hasLeadingClass,
			'Sample text element must have a leading-* class or thai-body class (DESIGN.md line-height >= 1.65)'
		).toBe(true);

		// Must also have a text-sm or text-base class (font-size >= 14px = UXD-008 floor)
		const hasFontSizeClass =
			content.includes('text-sm') || content.includes('text-base') || content.includes('thai-body');

		expect(
			hasFontSizeClass,
			'Sample text must have text-sm or larger (UXD-008: font-size floor 14px)'
		).toBe(true);
	});

	// ---------------------------------------------------------------------------
	// AC-6: Quality gates — bun run check, lint, format all exit 0
	// ---------------------------------------------------------------------------

	test('[P1] 1.2-UNIT-011 — bun run check (svelte-check) exits 0 after design system changes', () => {
		// THIS TEST WILL FAIL — svelte-check likely fails before implementation.
		// Activate after Tasks 1-4 are complete and checked for type errors.
		const result = runCmd('bun run check', PROJECT_ROOT);

		expect(result.exitCode, `svelte-check failed:\n${result.stdout}\n${result.stderr}`).toBe(0);
	});

	test('[P1] 1.2-UNIT-012 — bun run lint (ESLint) exits 0 after design system changes', () => {
		// THIS TEST WILL FAIL — ESLint may fail before page.svelte is updated.
		// Activate after Tasks 1-4 are complete.
		const result = runCmd('bun run lint', PROJECT_ROOT);

		expect(result.exitCode, `ESLint failed:\n${result.stdout}\n${result.stderr}`).toBe(0);
	});

	test('[P1] 1.2-UNIT-013 — bun run format (Prettier check) exits 0 after design system changes', () => {
		// THIS TEST WILL FAIL — Prettier may fail before files are formatted.
		// Activate after Tasks 1-4 are complete.
		const result = runCmd('bun run format', PROJECT_ROOT);

		expect(result.exitCode, `Prettier check failed:\n${result.stdout}\n${result.stderr}`).toBe(0);
	});

	// ---------------------------------------------------------------------------
	// Structural guard: no tailwind.config.js must be created (Tailwind v4 is CSS-only)
	// ---------------------------------------------------------------------------

	test('[P2] 1.2-UNIT-014 — no tailwind.config.js created (Tailwind v4 is CSS-only)', () => {
		// THIS TEST WILL FAIL if tailwind.config.js is mistakenly created.
		// Activate after any task that touches CSS/theme configuration.
		const legacyConfig = path.join(PROJECT_ROOT, 'tailwind.config.js');
		const legacyConfigCjs = path.join(PROJECT_ROOT, 'tailwind.config.cjs');
		const legacyConfigTs = path.join(PROJECT_ROOT, 'tailwind.config.ts');

		expect(
			existsSync(legacyConfig),
			'tailwind.config.js must NOT exist — Tailwind v4 uses CSS-only @theme config'
		).toBe(false);
		expect(existsSync(legacyConfigCjs), 'tailwind.config.cjs must NOT exist').toBe(false);
		expect(existsSync(legacyConfigTs), 'tailwind.config.ts must NOT exist').toBe(false);
	});

	test('[P2] 1.2-UNIT-015 — src/app.css preserves @import tailwindcss and @theme block structure', () => {
		// THIS TEST WILL FAIL until app.css is updated correctly.
		// Guards against accidentally destroying the Tailwind v4 CSS structure.
		const appCssPath = path.join(PROJECT_ROOT, 'src/app.css');

		expect(existsSync(appCssPath), 'src/app.css not found').toBe(true);

		const content = readFileSync(appCssPath, 'utf-8');

		// Must preserve Tailwind imports
		expect(content, "Must preserve @import 'tailwindcss'").toContain("@import 'tailwindcss'");
		expect(content, "Must preserve @import 'tw-animate-css'").toContain("@import 'tw-animate-css'");

		// Must preserve @theme block (Tailwind v4 theming)
		expect(content, 'Must preserve @theme { ... } block').toMatch(/@theme\s*\{/);

		// Must preserve @custom-variant dark
		expect(content, 'Must preserve @custom-variant dark').toContain('@custom-variant dark');
	});
});
