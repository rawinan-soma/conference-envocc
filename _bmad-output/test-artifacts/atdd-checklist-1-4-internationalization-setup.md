---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-10'
storyId: '1.4'
storyKey: 1-4-internationalization-setup
storyFile: _bmad-output/implementation-artifacts/1-4-internationalization-setup.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-1-4-internationalization-setup.md
generatedTestFiles:
  - tests/unit/i18n-messages.spec.ts
  - tests/unit/i18n-config.spec.ts
  - tests/e2e/i18n-setup.spec.ts
sharedHelpers:
  - tests/support/helpers/cmd-helpers.ts
---

# ATDD Checklist: Story 1.4 — Internationalization Setup

## TDD Green Phase (Unit Tests)

All unit tests are active and passing. E2E tests remain skipped (require running dev server).

- Unit Tests (messages + ESLint): 6 tests (all passing) — `tests/unit/i18n-messages.spec.ts`
- Unit Tests (config verification): 5 tests (all passing) — `tests/unit/i18n-config.spec.ts`
- E2E Tests: 5 tests (all skipped — dev server required) — `tests/e2e/i18n-setup.spec.ts`

## Stack Detection

- Detected stack: **fullstack** (SvelteKit frontend + server hooks)
- Test framework: Vitest (unit) + Playwright (E2E)
- Playwright Utils: enabled (UI+API profile)
- Generation mode: AI generation (sequential)

## Acceptance Criteria Coverage

| AC | Description | Test IDs | Level | Priority |
|----|-------------|----------|-------|----------|
| AC-1 | `bun run build` compiles Paraglide into `src/lib/paraglide/` | 1.4-UNIT-003, 1.4-UNIT-011 | Unit (quality gate) | P1 |
| AC-2 | `m.home_title()` renders compiled string correctly | 1.4-UNIT-006, 1.4-E2E-001, 1.4-E2E-004 | Unit + E2E | P1 |
| AC-3 | ESLint rule fires on hardcoded inline English UI strings | 1.4-UNIT-004 | Unit (quality gate) | P1 |
| AC-4 | ESLint exits 0 when all Svelte/TS files use only `m.*()` | 1.4-UNIT-005 | Unit (quality gate) | P1 |
| AC-5 | `Accept-Language: th` → `lang`/`dir` HTML attrs set correctly | 1.4-E2E-002, 1.4-E2E-003, 1.4-UNIT-008, 1.4-UNIT-009 | E2E + Unit | P1 |
| AC-6 | Page renders English source string correctly | 1.4-E2E-001, 1.4-E2E-004 | E2E | P1 |

## Test File Index

### Unit Tests (messages + ESLint guard): `tests/unit/i18n-messages.spec.ts`

| Test ID | Description | Task | Priority |
|---------|-------------|------|----------|
| 1.4-UNIT-001 | `messages/en.json` has canonical keys `app_name` and `home_title` | Task 2.1 | P1 |
| 1.4-UNIT-002 | `messages/th.json` mirrors all keys from `en.json` (no Thai text) | Task 2.2 | P1 |
| 1.4-UNIT-003 | `bun run build` compiles Paraglide into `src/lib/paraglide/` | Task 2.3 | P1 |
| 1.4-UNIT-004 | ESLint fires on hardcoded inline UI strings in `.svelte` files | Task 4.1–4.3 | P1 |
| 1.4-UNIT-005 | `bun run lint` exits 0 after all strings use `m.*()` | Task 4.5 | P1 |
| 1.4-UNIT-006 | `+page.svelte` imports `* as m` and uses `m.home_title()` | Task 3.1–3.2 | P1 |

### Unit Tests (Paraglide config verification): `tests/unit/i18n-config.spec.ts`

| Test ID | Description | Task | Priority |
|---------|-------------|------|----------|
| 1.4-UNIT-007 | `project.inlang/settings.json` has `baseLocale: "en"` and `locales: ["en","th"]` | Task 1.1 | P2 |
| 1.4-UNIT-008 | `src/app.html` has `%paraglide.lang%` and `%paraglide.dir%` placeholders | Task 1.4 | P2 |
| 1.4-UNIT-009 | `src/hooks.server.ts` uses Paraglide 2.0 `paraglideMiddleware` + `transformPageChunk` | Task 1.3 | P2 |
| 1.4-UNIT-010 | `bun run check` (svelte-check) exits 0 | Task 5.3 | P1 |
| 1.4-UNIT-011 | `vite.config.ts` includes `paraglideVitePlugin` pointing to `project.inlang` | Task 1.2 | P1 |

### Shared Helper: `tests/support/helpers/cmd-helpers.ts`

Extracted `runCmd()` utility — used by `i18n-messages.spec.ts`, `i18n-config.spec.ts`, and `scaffold.spec.ts`.

### E2E Tests: `tests/e2e/i18n-setup.spec.ts`

| Test ID | Description | Task | Priority |
|---------|-------------|------|----------|
| 1.4-E2E-001 | Home page renders `m.home_title()` = "Room Booking System" | Task 3.1–3.3 | P1 |
| 1.4-E2E-002 | Home page has `html[lang="en"]` and `html[dir="ltr"]` set by Paraglide | Task 1.3–1.4 | P1 |
| 1.4-E2E-003 | `Accept-Language: th` sets `html[lang="th"]` and `html[dir="ltr"]` | Task 1.3 | P1 |
| 1.4-E2E-004 | Home page loads without console errors after Paraglide wiring | Task 3.3 | P1 |
| 1.4-E2E-005 | Page renders `m.app_name()` = "Conference Room Booking" | Task 3 | P2 |

## Task-by-Task Activation Guide

During implementation of each task, activate the relevant tests:

### Task 1 — Verify and finalize Paraglide 2.0 configuration

Activate after confirming all configuration files:
- `1.4-UNIT-007` — `project.inlang/settings.json` verification
- `1.4-UNIT-008` — `src/app.html` Paraglide placeholders
- `1.4-UNIT-009` — `src/hooks.server.ts` paraglideMiddleware
- `1.4-UNIT-011` — `vite.config.ts` paraglideVitePlugin

### Task 2 — Establish canonical message keys

Activate after replacing scaffold placeholders in `messages/*.json`:
- `1.4-UNIT-001` — `messages/en.json` canonical keys
- `1.4-UNIT-002` — `messages/th.json` mirrors en.json (no Thai text)
- `1.4-UNIT-003` — `bun run build` Paraglide compilation

### Task 3 — Update +page.svelte to use Paraglide messages

Activate after replacing hardcoded strings in `src/routes/+page.svelte`:
- `1.4-UNIT-006` — `+page.svelte` uses `m.home_title()`
- `1.4-E2E-001` — Home page renders "Room Booking System"
- `1.4-E2E-004` — Home page loads without console errors
- `1.4-E2E-002` — html[lang="en"] set by Paraglide (also validates middleware)

### Task 4 — Add ESLint hardcoded-string guard

Activate after configuring ESLint rule in `eslint.config.js`:
- `1.4-UNIT-004` — ESLint fires on hardcoded strings
- `1.4-UNIT-005` — `bun run lint` exits 0 with all strings using m.*()

### Task 5 — Run all quality gates

Activate final validation tests:
- `1.4-UNIT-010` — `bun run check` exits 0
- `1.4-UNIT-003` — `bun run build` exits 0 (confirms Paraglide compilation)
- `1.4-E2E-003` — Accept-Language: th locale negotiation (validates full middleware)

## Key Architecture Constraints

- **No Thai text in code or mocks**: All `messages/th.json` values must use English placeholder strings until Rawinan provides translations
- **Do NOT hand-edit `src/lib/paraglide/`**: Generated exclusively by the Paraglide Vite plugin at build/dev time
- **Paraglide 2.0 API**: Uses `paraglideMiddleware` from `$lib/paraglide/server` (not `i18n.handle()`)
- **ESLint rule target**: `**/*.svelte` files only; `*.ts` files may be included with appropriate allowlisting
- **`hello_world` placeholder**: Not referenced in any test file — safe to remove and replace with canonical keys

## Activation Workflow (per test)

1. Remove `test.skip(` → `test(` for the current test
2. Run: `bun run test` (unit) or `bun run test:e2e` (E2E) — verify test FAILS (red phase)
3. Implement the feature for the current task
4. Run again — verify test PASSES (green phase)
5. If the test still fails unexpectedly: fix implementation (feature bug) or fix test (test design gap)
6. Commit passing tests

## Next Steps

After ATDD scaffolds are in place, proceed to:
1. **`bmad-dev-story`** — implement Story 1.4 task-by-task using TDD activation
2. **`bmad-testarch-automate`** — run and verify activated tests after implementation
