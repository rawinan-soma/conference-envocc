---
baseline_commit: 1aac108
---

# Story 1.4: Internationalization Setup

Status: review

## Story

As a developer,
I want Paraglide configured with English source + Thai locale and a no-hardcoded-strings guard,
so that all user-facing text is translatable and Thai-ready.

## Acceptance Criteria

1. **Given** the scaffolded app, **When** `bun run build` is executed, **Then** Paraglide compiles `messages/en.json` and `messages/th.json` into `src/lib/paraglide/` (generated, do not edit).
2. **Given** Paraglide is configured (source `en`, locale `th`), **When** a page component imports `* as m from '$lib/paraglide/messages'` and renders a message (e.g., `m.home_title()`), **Then** the compiled string is rendered correctly on the page.
3. **Given** the ESLint config, **When** a `.svelte` or `.ts` file contains a hardcoded inline English UI string (e.g., `<h1>Welcome</h1>` or `const label = "Submit"`), **Then** the custom ESLint rule fires and `bun run lint` exits non-zero.
4. **Given** the ESLint guard is active, **When** all Svelte/TS source files use only `m.*()` for user-facing text, **Then** `bun run lint` exits 0.
5. **Given** the Paraglide middleware in `hooks.server.ts`, **When** a request is made with `Accept-Language: th`, **Then** the `lang` and `dir` HTML attributes are set correctly on the `<html>` tag.
6. **Given** the app runs (`bun run dev`), **When** a page using `m.home_title()` is visited, **Then** the page renders the English source string correctly (Thai translation is Rawinan's responsibility post-implementation).

## Tasks / Subtasks

- [x] Task 1: Verify and finalize Paraglide 2.0 configuration (AC: 1, 2, 5)
  - [x] 1.1 Confirm `project.inlang/settings.json` has `baseLocale: "en"`, `locales: ["en", "th"]`, and the correct module URLs (already present from Story 1.1)
  - [x] 1.2 Confirm `vite.config.ts` includes `paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })` (already present from Story 1.1)
  - [x] 1.3 Confirm `src/hooks.server.ts` uses `paraglideMiddleware` with `transformPageChunk` replacing `%paraglide.lang%` and `%paraglide.dir%` (already present from Story 1.1 — verify it compiles cleanly after this story's changes)
  - [x] 1.4 Confirm `src/app.html` has `<html lang="%paraglide.lang%" dir="%paraglide.dir%">` placeholders

- [x] Task 2: Establish canonical message keys for the walking skeleton (AC: 1, 2)
  - [x] 2.1 Replace the scaffold placeholder in `messages/en.json` with a proper initial message set: add key `app_name` = `"Conference Room Booking"` and `home_title` = `"Room Booking System"`; the `hello_world` placeholder key is **not referenced in any test file** (verified) and can be safely removed or replaced
  - [x] 2.2 Ensure `messages/th.json` mirrors all keys from `en.json` with placeholder values (e.g., same English strings — Rawinan will provide Thai translations; **never write Thai text in code or mocks**)
  - [x] 2.3 Run `bun run build` (or `bun run check`) to trigger Paraglide compilation and confirm `src/lib/paraglide/` is generated

- [x] Task 3: Update `+page.svelte` to use Paraglide messages (AC: 2, 3, 4, 6)
  - [x] 3.1 Replace the hardcoded strings in `src/routes/+page.svelte` (`<h1>Welcome to SvelteKit</h1>` and the `<p>Visit...` paragraph) with `m.home_title()` and a placeholder message key
  - [x] 3.2 Import `* as m from '$lib/paraglide/messages'` at the top of the script block
  - [x] 3.3 Verify the page renders via `bun run dev` and the compiled message appears correctly

- [x] Task 4: Add ESLint rule to guard against hardcoded UI strings in Svelte files (AC: 3, 4)
  - [x] 4.1 Try Option A first: `bun add -d eslint-plugin-no-hardcoded-strings` — if the package supports ESLint flat config (eslint v10) and Svelte 5, use it; otherwise fall back to Option C (inline custom rule in `eslint.config.js`) — see Dev Notes for full config snippets
  - [x] 4.2 NOTE: Do NOT attempt `svelte/no-raw-text` — that rule does NOT exist in `eslint-plugin-svelte` v3.19.0 (installed version); using it will throw an unknown rule error
  - [x] 4.3 Configure the rule in `eslint.config.js` targeting `**/*.svelte` files only; configure allowlist for non-UI strings (class names, href values, aria labels, data-* attributes, empty strings, route paths)
  - [x] 4.4 Verify the rule fires: temporarily revert `+page.svelte` to hardcoded `<h1>Welcome to SvelteKit</h1>`, run `bun run lint`, confirm error is reported, then re-apply the fix
  - [x] 4.5 Run `bun run lint` on the full codebase and confirm exit 0

- [x] Task 5: Run all quality gates (AC: 1–6)
  - [x] 5.1 `bun run lint` → exit 0
  - [x] 5.2 `bun run format` → exit 0
  - [x] 5.3 `bun run check` (svelte-check) → exit 0
  - [x] 5.4 `bun run test:unit -- --run` → exit 0
  - [x] 5.5 `bun run build` → exit 0 (confirms Paraglide compilation pipeline)

## Dev Notes

### Current State After Story 1.1

Paraglide 2.0 is **already wired** from Story 1.1:

- `project.inlang/settings.json` — configured with `baseLocale: "en"`, `locales: ["en", "th"]`
- `vite.config.ts` — `paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })` present
- `src/hooks.server.ts` — `paraglideMiddleware` with `transformPageChunk` for `%paraglide.lang%` and `%paraglide.dir%`
- `messages/en.json` — contains `{ "hello_world": "Hello, {name} from en!" }` (scaffold placeholder)
- `messages/th.json` — contains `{ "hello_world": "Hello, {name} from th!" }` (scaffold placeholder)
- `src/lib/paraglide/` — **does NOT exist yet** (generated at build/dev time by the Vite plugin)
- `src/routes/+page.svelte` — still has hardcoded strings (`<h1>Welcome to SvelteKit</h1>`)
- `src/routes/+layout.svelte` — already imports from `$lib/paraglide/runtime` (locales, localizeHref)

**This story's job:** add the hardcoded-string ESLint guard, establish canonical message keys, and fix the one hardcoded-string violation in `+page.svelte`.

### Critical: Thai Language Rule

**NEVER write Thai text in code or mocks.** All `messages/th.json` values must use English placeholder strings or empty strings until Rawinan provides translations. The message keys must match between `en.json` and `th.json`.

### Paraglide 2.0 API

Paraglide 2.0 uses a **server middleware** model (not the older `i18n.handle()` pattern from docs). The correct import is:

```ts
// src/hooks.server.ts — already correct from Story 1.1
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
```

In `.svelte` components use:

```svelte
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
</script>

<h1>{m.home_title()}</h1>
```

Do NOT hand-write anything in `src/lib/paraglide/` — it is 100% generated by the Paraglide Vite plugin at build/dev time.

### Hardcoded-String ESLint Guard — Implementation Options

The epic AC says "a lint rule/CI check for inline UI strings". The architecture does not prescribe a specific package. Use **one** of these approaches (in preference order):

**Option A (Recommended): `eslint-plugin-no-hardcoded-strings` (npm)**

```bash
bun add -d eslint-plugin-no-hardcoded-strings
```

In `eslint.config.js`:

```js
import noHardcodedStrings from 'eslint-plugin-no-hardcoded-strings';
// ...
{
  files: ['**/*.svelte'],
  plugins: { 'no-hardcoded-strings': noHardcodedStrings },
  rules: {
    'no-hardcoded-strings/no-hardcoded-strings': ['error', {
      // Allow: class names, href/src, aria attributes, data-* attrs, empty strings
      ignore: [
        '^$',           // empty strings
        '^/[\\w/-]*$',  // route paths like "/rooms"
      ],
    }],
  },
}
```

**Option B: Custom ESLint rule (if Option A has compatibility issues with Svelte 5)**

Write a minimal inline ESLint rule in `eslint.config.js` that flags `Literal` nodes with string values inside JSX `JSXText` elements (svelte template HTML text). This is a valid fallback if the npm package does not support Svelte 5 / flat config.

**Option C: Custom inline ESLint rule targeting `SvelteText` AST nodes**

`eslint-plugin-svelte` v3.x (installed at `^3.19.0`) does NOT include a `no-raw-text` rule (that existed in an older, unmaintained fork). Instead write a minimal inline rule directly in `eslint.config.js`:

```js
// In eslint.config.js — no new package required
{
  files: ['**/*.svelte'],
  rules: {
    // Inline rule: flag raw text content in Svelte template HTML
    // (SvelteText nodes that are non-whitespace and not inside script/style)
  },
  plugins: {
    local: {
      rules: {
        'no-raw-svelte-text': {
          create(context) {
            return {
              SvelteText(node) {
                if (/\S/.test(node.value)) {
                  context.report({ node, message: 'Use m.*() for user-facing text.' });
                }
              },
            };
          },
        },
      },
    },
  },
  // rules: { 'local/no-raw-svelte-text': 'error' }
}
```

This uses the `SvelteText` AST node type exposed by `eslint-plugin-svelte`'s Svelte parser. **Prefer Option A** if the npm package supports flat config + Svelte 5; fall back to this inline approach if not.

### app.html Paraglide Placeholders

The `src/app.html` must have:

```html
<html lang="%paraglide.lang%" dir="%paraglide.dir%">
```

Verify this is already present from Story 1.1 — if not, add it. The `transformPageChunk` in `hooks.server.ts` replaces these at render time.

### Message Key Naming Convention

Keys use `snake_case`. Per architecture, all Paraglide messages are English source. Initial keys for this story:

- `app_name` — the application name used in titles/headers (value: `"Conference Room Booking"`)
- `home_title` — the home page heading (value: `"Room Booking System"`)

The scaffold placeholder `hello_world` is **not referenced in any test or source file** (verified by grep) — remove it and replace with the canonical keys above.

### Files to Create/Modify

| File | Action | Notes |
|------|--------|-------|
| `messages/en.json` | UPDATE | Replace scaffold placeholder with canonical keys |
| `messages/th.json` | UPDATE | Mirror keys with English placeholders (no Thai text) |
| `eslint.config.js` | UPDATE | Add hardcoded-string rule for `.svelte` files |
| `src/routes/+page.svelte` | UPDATE | Replace hardcoded strings with `m.*()` calls |
| `src/app.html` | VERIFY | Confirm `%paraglide.lang%` and `%paraglide.dir%` present |
| `src/hooks.server.ts` | VERIFY | Confirm `paraglideMiddleware` wiring is intact |
| `package.json` | MAYBE UPDATE | Only if installing a new ESLint plugin |

**Do NOT create or modify** any files under `src/lib/paraglide/` — that directory is generated.

### Testing Standards for This Story

This is an infrastructure/configuration story. Tests focus on verifying the wiring:

- `tests/unit/scaffold.spec.ts` (from Story 1.1) does **not** reference any Paraglide message keys directly — no test updates needed when replacing `hello_world`.
- No new domain test files are needed for this story.
- All acceptance criteria are validated by quality gate commands (lint, check, build) — not by unit tests.

### Architecture Compliance Checklist

- [ ] No Thai text written in any source file or mock
- [ ] All user-facing strings in `.svelte` files go through `m.*()` — no raw text content
- [ ] `src/lib/paraglide/` is not hand-edited (generated only)
- [ ] ESLint hardcoded-string rule is active for `**/*.svelte`
- [ ] `messages/en.json` and `messages/th.json` have identical key sets
- [ ] `bun run lint` exits 0
- [ ] `bun run check` (svelte-check) exits 0
- [ ] `bun run build` exits 0 (Paraglide compilation confirmed)

### Previous Story Intelligence (Story 1.1)

From Story 1.1 review findings:
- The scaffold was verified with `svelte-adapter-bun` in `vite.config.ts` (not `svelte.config.js`) — do not create a separate `svelte.config.js`.
- `bun run build` emits `[UNRESOLVED_IMPORT] async_hooks` — this is expected/benign, do not attempt to suppress it.
- `src/lib/server/db/` and other `src/lib/server/**` subdirectories do NOT exist yet (Story 1.3). Do not create them.
- All quality gates must pass before marking this story done.

### References

- [Source: architecture.md §"Process Patterns → i18n (mandatory)"] — every user-facing string via `m.some_key()`, no hardcoded Thai or English UI text
- [Source: architecture.md §"Enforcement Guidelines"] — ESLint enforcement for inline UI text
- [Source: architecture.md §"Structure Patterns"] — `src/lib/paraglide/**` is generated; `messages/{en,th}.json` are source
- [Source: epics.md §"Story 1.4: Internationalization setup"] — acceptance criteria and GH issue #4
- [Source: implementation-artifacts/1-1-scaffold-the-project.md §"Dev Notes → Paraglide wiring"] — middleware API for Paraglide 2.0

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-1-4-internationalization-setup.md`
- Unit tests: `tests/unit/i18n-setup.spec.ts`
- E2E tests: `tests/e2e/i18n-setup.spec.ts`

All tests are red-phase scaffolds (`test.skip()`). Activate task-by-task during implementation.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Option A (`eslint-plugin-no-hardcoded-strings`) only handles `JSXText` nodes, not Svelte's `SvelteText` AST. Fell back to Option C: inline custom ESLint rule using `SvelteText` nodes via `eslint-plugin-svelte` parser.
- Test file `i18n-setup.spec.ts` had a `require('fs')` (ATDD scaffold) that violated `@typescript-eslint/no-require-imports`. Fixed by converting to ESM imports (`mkdirSync`, `writeFileSync`, `unlinkSync` added to the fs import).

### Completion Notes List

- Task 1: All Paraglide 2.0 wiring verified as correctly set from Story 1.1 — `project.inlang/settings.json`, `vite.config.ts`, `hooks.server.ts`, and `app.html` all confirmed correct.
- Task 2: `messages/en.json` and `messages/th.json` updated with canonical keys `app_name` and `home_title`. Scaffold `hello_world` key removed. No Thai text written (English placeholders used).
- Task 3: `src/routes/+page.svelte` updated to import `* as m from '$lib/paraglide/messages'` and use `m.home_title()` and `m.app_name()`. Hardcoded strings removed.
- Task 4: Added inline `local/no-raw-svelte-text` ESLint rule to `eslint.config.js` targeting `**/*.svelte` files. Uses `SvelteText` AST node. Rule confirmed to fire on hardcoded strings (exit non-zero) and pass on `m.*()` usage (exit 0). `eslint-plugin-no-hardcoded-strings` installed but not used (JSX-only).
- Task 5: All quality gates pass — lint (exit 0), format (exit 0), svelte-check (0 errors), unit tests (11/11 pass), build (exit 0, Paraglide compiled to `src/lib/paraglide/`).
- ATDD tests activated: UNIT-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011 (all 11 pass). Remaining skipped tests are E2E (require running dev server, out of scope for this story's unit test phase).

### File List

- `messages/en.json` — updated with canonical keys `app_name`, `home_title`; removed `hello_world` scaffold
- `messages/th.json` — updated to mirror `en.json` keys with English placeholder values (no Thai text)
- `src/routes/+page.svelte` — replaced hardcoded strings with `m.home_title()` and `m.app_name()`
- `eslint.config.js` — added `local/no-raw-svelte-text` inline ESLint rule for `**/*.svelte` files
- `tests/unit/i18n-setup.spec.ts` — activated 11 ATDD tests (removed `test.skip`); fixed `require('fs')` → ESM imports
- `tests/e2e/i18n-setup.spec.ts` — formatted by prettier (no logic changes)
- `package.json` — added `eslint-plugin-no-hardcoded-strings` devDependency (installed but not used in final config)
- `bun.lock` — updated with new dependency

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-10 | Story created via bmad-create-story workflow | claude-sonnet-4-6 |
| 2026-06-10 | Implemented all tasks: message keys, page.svelte, ESLint guard, quality gates | claude-sonnet-4-6 |
