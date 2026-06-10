---
baseline_commit: 1aac108
---

# Story 1.2: Design System & Thai Typography

Status: ready-for-dev

## Story

As a developer,
I want the DESIGN.md tokens and Thai fonts wired into the shadcn-svelte theme,
so that every component renders in the locked visual identity.

## Acceptance Criteria

1. **Given** the scaffolded app, **When** the "Forest & Copper" palette is defined as CSS variables in `src/app.css` (replacing the shadcn default theme), **Then** `--primary` maps to `green-700` (#2D6A4F), `--background` maps to `cream` (#FAFAF7), `--card` maps to #FFFFFF, `--border` maps to #E0DBD3, and the full color set from DESIGN.md is present as named CSS custom properties.
2. **Given** the CSS theme, **When** spacing tokens, radius tokens (sm=6px, md=10px, lg=16px, xl=20px), and three-tier green-tinted shadow tokens are added to `src/app.css`, **Then** they are available as CSS variables and Tailwind v4 theme extensions for use throughout the app.
3. **Given** the CSS theme, **When** Noto Serif Thai (headings) and Noto Sans Thai (body/UI) are loaded from the Google Fonts CDN, **Then** they appear in `src/app.html` as `<link rel="preconnect">` + `<link rel="stylesheet">` tags and in `src/app.css` as the `--font-sans` and `--font-serif` Tailwind theme values.
4. **Given** the fonts and theme are wired, **When** a sample page at `src/routes/+page.svelte` is rendered, **Then** shadcn `<Button>` components render with `green-700` primary color and `md` radius, and text uses Noto Sans Thai.
5. **Given** the sample page, **When** it includes Thai sample text, **Then** that text renders with `line-height ≥ 1.65` (DESIGN.md Thai body) and a minimum font-size of `14px` (never below per UXD-008), enforced via CSS utility classes or base styles.
6. **Given** all changes, **When** `bun run check`, `bun run lint`, and `bun run format` are run, **Then** all three exit 0 with no errors.

## Tasks / Subtasks

- [ ] Task 1: Wire DESIGN.md color tokens into `src/app.css` shadcn theme block (AC: 1)
  - [ ] 1.1 Replace all `:root` and `.dark` CSS variable values in `src/app.css` with the Forest & Copper palette mapped to shadcn semantic variables. Preserve the `@theme` block structure; only update the variable values.
  - [ ] 1.2 Add named custom properties for all DESIGN.md colors (e.g. `--color-green-900`, `--color-green-700`, `--color-copper`, `--color-cream`, `--color-ink`, etc.) as direct CSS custom properties under `:root` for use in one-off component styling.
  - [ ] 1.3 Map semantic shadcn roles: `--primary` → green-700, `--primary-foreground` → white, `--background` → cream (#FAFAF7), `--foreground` → ink (#1C1C1C), `--card` → #FFFFFF, `--card-foreground` → ink, `--border` → #E0DBD3, `--muted` → cream-100, `--muted-foreground` → ink-2, `--accent` → copper-bg, `--accent-foreground` → copper, `--destructive` → #B3261E, `--ring` → green-500.

- [ ] Task 2: Add spacing, radius, and shadow tokens to `src/app.css` (AC: 2)
  - [ ] 2.1 In the `@theme` block, update `--radius` to `0.625rem` (10px md base) and add `--radius-sm: 0.375rem` (6px), `--radius-md: 0.625rem` (10px), `--radius-lg: 1rem` (16px), `--radius-xl: 1.25rem` (20px).
  - [ ] 2.2 Add shadow token CSS variables: `--shadow-1: 0 1px 2px rgba(27,67,50,0.06)`, `--shadow-2: 0 2px 8px rgba(27,67,50,0.08)`, `--shadow-3: 0 8px 24px rgba(27,67,50,0.12)` under `:root`.
  - [ ] 2.3 Add Tailwind v4 `@theme` extensions for spacing scale using `rem` values: `--spacing-1: 0.25rem` (4px), `--spacing-2: 0.5rem` (8px), `--spacing-4: 1rem` (16px), `--spacing-6: 1.5rem` (24px), `--spacing-8: 2rem` (32px), `--spacing-12: 3rem` (48px), `--spacing-16: 4rem` (64px). Note: Tailwind v4 already provides a default spacing scale — only add these if you need to alias/name them explicitly for the DESIGN.md 8px scale. If Tailwind's default scale already covers these values, this step can be skipped.

- [ ] Task 3: Load Thai fonts from Google Fonts CDN in `src/app.html` (AC: 3)
  - [ ] 3.1 Add `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` in `<head>` before the existing `%sveltekit.head%`.
  - [ ] 3.2 Add a single Google Fonts stylesheet link requesting: `Noto+Serif+Thai:wght@400;500;600;700` and `Noto+Sans+Thai:wght@400;500;600;700`. Use `display=swap`.
  - [ ] 3.3 In `src/app.css` `@theme` block, update `--font-sans` to `'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif` and `--font-serif` to `'Noto Serif Thai', ui-serif, Georgia, serif`.

- [ ] Task 4: Install a shadcn button component and update sample page (AC: 4, 5)
  - [ ] 4.1 Run `bunx shadcn-svelte@latest add button` to install the Button component into `src/lib/components/ui/button/`.
  - [ ] 4.2 Update `src/routes/+page.svelte` to import and render a `<Button>` (primary variant) with English placeholder text.
  - [ ] 4.3 Add a `<p>` element with a Thai sample text placeholder string. Apply `leading-relaxed` (≥ 1.6) and `text-sm` (14px minimum) Tailwind classes — or define a `.thai-body` CSS class with `line-height: 1.65` and `font-size: 14px`. Text content must be in English or empty — do NOT hardcode Thai characters in code or mocks (production Thai text is handled via Paraglide by Rawinan).
  - [ ] 4.4 Verify in the browser that the Button renders in green-700 and Noto Sans Thai font is applied.

- [ ] Task 5: Run quality gates (AC: 6)
  - [ ] 5.1 `bun run check` (svelte-check) → exit 0
  - [ ] 5.2 `bun run lint` (ESLint) → exit 0
  - [ ] 5.3 `bun run format` (Prettier check) → exit 0
  - [ ] 5.4 `bun run test` (Vitest) → exit 0
  - [ ] 5.5 `bun run test:e2e` (Playwright) → exit 0

## Dev Notes

### Critical Rules — Read First

- **No Thai text in code or mocks.** The project rule is: Rawinan handles all translation manually. Never write Thai characters in `.svelte`, `.ts`, `.json`, or any source file. Use English placeholder text for all sample strings.
- **Tailwind v4 config is CSS-only.** There is NO `tailwind.config.js`. All theme customization is done inside the `@theme {}` block in `src/app.css`. Do not create a `tailwind.config.js` or `tailwind.config.ts`.
- **shadcn-svelte with Tailwind v4.** The project uses `shadcn-svelte` with Tailwind v4. CSS variables in shadcn are `oklch()` color values by default from `shadcn-svelte init`. This story replaces those with hex-based custom properties and remaps them. Use the approach of defining raw hex values in `:root` then mapping through shadcn semantic names.
- **Bun only.** Use `bun` / `bunx` — never `npm`, `pnpm`, or `yarn`.
- **No dark mode required.** The `.dark {}` block in `src/app.css` can be left as-is from scaffolding or removed; the product is light-mode only (no dark theme in DESIGN.md).

### Files to Modify (UPDATE)

| File | Action | Notes |
|------|--------|-------|
| `src/app.css` | UPDATE | Replace shadcn default theme vars with Forest & Copper tokens; update `--font-sans`/`--font-serif` in `@theme`; add shadow/radius vars |
| `src/app.html` | UPDATE | Add Google Fonts preconnect + stylesheet `<link>` tags in `<head>` |
| `src/routes/+page.svelte` | UPDATE | Replace default SvelteKit welcome content with Button + sample text demo |

### Files to Create (NEW)

| File | Notes |
|------|-------|
| `src/lib/components/ui/button/` | Created by `bunx shadcn-svelte@latest add button` — do NOT hand-write |

**Important:** `components.json` already exists from Story 1.1 (`shadcn-svelte init`). Do NOT re-run `shadcn-svelte init` — only run `bunx shadcn-svelte@latest add button` to add the button component. Re-running init would overwrite `src/app.css` with default shadcn colors, undoing Task 1.

`src/lib/components/ui/` may already exist from Story 1.1 if `shadcn-svelte init` created it. The `add button` command will create or extend this directory — either way is correct.

### Current State of Files Being Modified

**`src/app.css`** (current state from Story 1.1):
- Has `@import 'tailwindcss'` and `@import 'tw-animate-css'`
- Has `@custom-variant dark (&:is(.dark *))`
- Has `@theme {}` block with default Inter font, default shadcn radius vars, and color bridge vars (`--color-*: var(--*)` mappings)
- Has `:root {}` with default shadcn oklch colors (neutral/grey scheme from `shadcn-svelte init`)
- Has `.dark {}` block with dark theme vars
- **This story replaces the `:root` color values** while preserving the `@theme`, `@import`, and `@custom-variant` structure

**`src/app.html`** (current state from Story 1.1):
- Standard SvelteKit html template with `%sveltekit.head%` and `%sveltekit.body%`
- No font links yet — this story adds them

**`src/routes/+page.svelte`** (current state from Story 1.1):
- Default "Welcome to SvelteKit" content
- This story replaces it with a theme demo page

### Design Token Mapping to shadcn CSS Variables

```css
/* DESIGN.md → shadcn semantic mapping */
/* In :root {} */

/* ── Forest & Copper raw values ── */
--green-900: #1B4332;
--green-700: #2D6A4F;
--green-500: #40916C;
--green-200: #95D5B2;
--green-100: #D8F3DC;
--copper: #B5651D;
--copper-light: #E8A96A;
--copper-bg: #FDF3E7;
--cream: #FAFAF7;
--cream-100: #F0EDE6;
--cream-200: #E8E3DA;
--border-color: #E0DBD3;
--ink: #1C1C1C;
--ink-2: #5A5A5A;
--ink-3: #9A9A9A;

/* ── Semantic (shadcn) vars ── */
--background: var(--cream);           /* #FAFAF7 */
--foreground: var(--ink);             /* #1C1C1C */
--card: #FFFFFF;
--card-foreground: var(--ink);
--popover: #FFFFFF;
--popover-foreground: var(--ink);
--primary: var(--green-700);          /* #2D6A4F */
--primary-foreground: #FFFFFF;
--secondary: var(--cream-100);        /* #F0EDE6 */
--secondary-foreground: var(--ink);
--muted: var(--cream-100);
--muted-foreground: var(--ink-2);
--accent: var(--copper-bg);           /* #FDF3E7 */
--accent-foreground: var(--copper);   /* #B5651D */
--destructive: #B3261E;
--destructive-foreground: #FFFFFF;
--border: var(--border-color);        /* #E0DBD3 */
--input: var(--border-color);
--ring: var(--green-500);             /* #40916C */

/* ── Shadows ── */
--shadow-1: 0 1px 2px rgba(27, 67, 50, 0.06);
--shadow-2: 0 2px 8px rgba(27, 67, 50, 0.08);
--shadow-3: 0 8px 24px rgba(27, 67, 50, 0.12);
```

### Radius Mapping

DESIGN.md defines: `sm=6px`, `md=10px`, `lg=16px`, `xl=20px`.

The scaffolded `src/app.css` has a `--radius` base in `@theme`. Override with explicit values to match DESIGN.md exactly — do NOT use `calc()` offsets from a base, as that produces wrong values:

```css
/* In @theme {} block */
--radius: 0.625rem;    /* 10px — shadcn base, maps to md */
--radius-sm: 0.375rem; /* 6px */
--radius-md: 0.625rem; /* 10px */
--radius-lg: 1rem;     /* 16px */
--radius-xl: 1.25rem;  /* 20px */
```

The default shadcn scaffolding uses `calc(var(--radius) - 4px)` etc., which gives 6px/8px/10px/14px — this is NOT what DESIGN.md specifies. Replace with the explicit `rem` values above.

### Font Loading Pattern

```html
<!-- In src/app.html <head>, before %sveltekit.head% -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Noto+Serif+Thai:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

In `src/app.css` `@theme {}`:
```css
--font-sans: 'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif;
--font-serif: 'Noto Serif Thai', ui-serif, Georgia, serif;
```

### Thai Typography CSS Rules

These must be present as either utilities or base CSS:
```css
/* Option A: add to @layer base in src/app.css */
@layer base {
  body {
    line-height: 1.65;
    font-size: 1rem; /* 16px */
  }
  small, .text-sm {
    font-size: 0.875rem; /* 14px — hard floor per DESIGN.md UXD-008 */
    line-height: 1.65;
  }
}
```

The sample page can demonstrate with:
```svelte
<p class="leading-[1.65] text-sm">Sample body text (English placeholder)</p>
```

`leading-relaxed` in Tailwind is 1.625 — acceptable. `leading-[1.65]` is also valid in Tailwind v4.

### Sample Page Pattern

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
</script>

<main class="min-h-screen bg-background p-8">
  <h1 class="font-serif text-4xl font-bold text-foreground mb-4">
    Forest &amp; Copper Theme Demo
  </h1>
  <p class="text-muted-foreground mb-6 leading-[1.65] text-sm">
    Noto Sans Thai body text — minimum 14px, line-height ≥ 1.65
  </p>
  <Button>Primary Action</Button>
</main>
```

### shadcn-svelte Button Install Command

```bash
bunx shadcn-svelte@latest add button
```

This installs into `src/lib/components/ui/button/` — do NOT create this directory or files manually.

### Accessibility Note

Per DESIGN.md §5 (WCAG 2.1 AA):
- `copper (#B5651D) on cream (#FAFAF7)` — verify contrast at AA (≥ 4.5:1 for normal text). If the ratio is below 4.5:1, use copper only for large text (≥18px/bold) and prefer `green-700` for body-size interactive elements.
- `green-500 (#40916C) on white` — similarly verify; if it fails AA for body text, reserve for large text or use `green-700`.
- This story does not require automated contrast tests; a visual check suffices for the sample page. Automated a11y testing is covered in Story 1.8/1.9.

### Previous Story (1.1) Learnings

- Story 1.1 confirmed: `shadcn-svelte init` was run with defaults, so `src/app.css` already has the shadcn CSS-variable block and `components.json` exists. This story updates those default colors.
- `vite.config.ts` uses the SvelteKit adapter setup (not `svelte.config.js`). The Tailwind v4 plugin is already wired.
- `svelte-adapter-bun` is installed. Build produces to `.svelte-kit/adapter-bun/`.
- All quality gates (lint, check, format) were passing at story 1.1 completion. This story must keep them green.
- The `src/routes/+layout.svelte` imports `../app.css` — no change needed for fonts loaded via `<link>` in `app.html`.

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-1-2-design-system-thai-typography.md`
- Unit tests: `tests/unit/design-system.spec.ts`
- E2E tests: `tests/e2e/design-system-theme.spec.ts`
- Fixture context: `tests/support/fixtures/design-system-context.ts`

### Architecture References

- [Source: architecture.md §"Styling / Components"] — shadcn-svelte themed with DESIGN.md tokens; Noto Serif/Sans Thai loaded per DESIGN.md
- [Source: architecture.md §"Frontend Architecture"] — WCAG 2.1 AA; Thai line-height rules
- [Source: DESIGN.md §1–§5] — complete token specification (colors, typography, spacing, radius, elevation, accessibility)
- [Source: architecture.md §"Complete Project Directory Structure"] — `src/app.css`, `static/fonts/` (fonts via CDN for this story, not self-hosted)
- [Source: 1-1-scaffold-the-project.md §"Dev Notes"] — stack constraints, Tailwind v4 CSS-only config, no tailwind.config.js

### Out of Scope for This Story

- Self-hosted fonts in `static/fonts/` (architecture shows this path exists; CDN is acceptable for dev — self-hosting is a deployment concern for Story 1.7)
- Adding any shadcn components beyond `button` (later stories add components as needed)
- Paraglide message keys for any UI strings (Story 1.4)
- Dark mode theme (not in DESIGN.md — product is light-mode only)
- Automated accessibility/contrast tests (Story 1.8/1.9)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
