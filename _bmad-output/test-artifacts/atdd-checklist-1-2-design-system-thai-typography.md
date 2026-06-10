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
storyId: '1.2'
storyKey: '1-2-design-system-thai-typography'
storyFile: '_bmad-output/implementation-artifacts/1-2-design-system-thai-typography.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-2-design-system-thai-typography.md'
generatedTestFiles:
  - tests/unit/design-system.spec.ts
  - tests/e2e/design-system-theme.spec.ts
  - tests/support/fixtures/design-system-context.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/1-2-design-system-thai-typography.md
  - _bmad/tea/config.yaml
  - src/app.css
  - playwright.config.ts
  - package.json
tddPhase: RED
---

# ATDD Checklist — Story 1.2: Design System & Thai Typography

**Date:** 2026-06-10
**Story ID:** 1.2
**Story Key:** 1-2-design-system-thai-typography
**TDD Phase:** RED (all tests skipped — implementation pending)
**Workflow:** bmad-testarch-atdd
**Execution Mode:** SEQUENTIAL (API → E2E)

---

## Story Summary

> As a developer, I want the DESIGN.md tokens and Thai fonts wired into the shadcn-svelte theme, so that every component renders in the locked visual identity.

**Note:** This is a CSS/design-system story with no domain logic or API endpoints. Tests verify CSS custom property values, font loading, component structure, typography enforcement, and quality gates.

---

## TDD Red Phase — Current Status

All scaffolds are generated with `test.skip()`.

| File | Tests | Priority Coverage | Status |
|------|-------|------------------|--------|
| `tests/unit/design-system.spec.ts` | 15 | P0: 8, P1: 5, P2: 2 | RED (skipped) |
| `tests/e2e/design-system-theme.spec.ts` | 10 | P0: 6, P1: 4 | RED (skipped) |
| **Total** | **25** | **P0: 14, P1: 9, P2: 2** | **All skipped** |

---

## Acceptance Criteria Coverage

| # | Acceptance Criterion | Test(s) | Priority | Level |
|---|---------------------|---------|---------|-------|
| AC-1 | Forest & Copper palette as CSS variables in `src/app.css` — `--primary`=green-700, `--background`=cream, `--card`=#FFF, `--border`=#E0DBD3 | `1.2-UNIT-001`, `1.2-UNIT-002`, `1.2-E2E-001` | P0 | Unit + E2E |
| AC-2 | Spacing, radius (sm=6px, md=10px, lg=16px, xl=20px), and shadow tokens added | `1.2-UNIT-003`, `1.2-UNIT-004`, `1.2-E2E-002` | P0 | Unit + E2E |
| AC-3 | Noto Serif/Sans Thai loaded from Google Fonts CDN — preconnect + stylesheet in `src/app.html`, `--font-sans`/`--font-serif` in `src/app.css` | `1.2-UNIT-005`, `1.2-UNIT-006`, `1.2-E2E-003`, `1.2-E2E-004` | P0 | Unit + E2E |
| AC-4 | Sample page renders shadcn `<Button>` with green-700 primary and md radius | `1.2-UNIT-007`, `1.2-UNIT-008`, `1.2-E2E-005`, `1.2-E2E-006`, `1.2-E2E-010` | P1 | Unit + E2E |
| AC-5 | Thai sample text with line-height ≥ 1.65 and font-size ≥ 14px (UXD-008) | `1.2-UNIT-009`, `1.2-UNIT-010`, `1.2-E2E-007`, `1.2-E2E-008` | P0 | Unit + E2E |
| AC-6 | `bun run check`, `bun run lint`, `bun run format` exit 0 | `1.2-UNIT-011`, `1.2-UNIT-012`, `1.2-UNIT-013`, `1.2-E2E-009` | P1 | Unit + E2E |

**Coverage:** 6/6 acceptance criteria covered (100%).

---

## Test Strategy

**Stack detection:** `fullstack` (SvelteKit frontend, Tailwind v4 CSS, no backend API endpoints in this story).

**Test levels selected:**
- **Unit/structural tests** (`tests/unit/design-system.spec.ts`): File system checks, CSS content assertions, quality gate commands. Fast, no browser required.
- **E2E browser tests** (`tests/e2e/design-system-theme.spec.ts`): Computed CSS property verification, font loading detection, visual rendering checks. Requires dev server.

**No API tests:** This story has zero backend endpoints. All behavior is CSS/static-file-based.

**Generation mode:** AI generation (no browser recording needed — ACs are structural/CSS, not interaction-heavy).

---

## Task-by-Task Activation Guide

**During implementation of each task, activate the corresponding test group:**

### Task 1: Wire DESIGN.md color tokens into `src/app.css`
Activate: `1.2-UNIT-001`, `1.2-UNIT-002`, `1.2-UNIT-015`, `1.2-E2E-001`

```bash
# Remove test.skip( → test( for each test, then run:
bun run test -- tests/unit/design-system.spec.ts
# Expect: FAIL (red) — then implement Tasks 1.1–1.3, then PASS (green)

# After dev server is running (bun run dev):
bun run test:e2e -- tests/e2e/design-system-theme.spec.ts --grep "1.2-E2E-001"
```

### Task 2: Add spacing, radius, and shadow tokens
Activate: `1.2-UNIT-003`, `1.2-UNIT-004`, `1.2-E2E-002`

```bash
bun run test -- tests/unit/design-system.spec.ts --grep "1.2-UNIT-00[34]"
bun run test:e2e -- tests/e2e/design-system-theme.spec.ts --grep "1.2-E2E-002"
```

### Task 3: Load Thai fonts from Google Fonts CDN
Activate: `1.2-UNIT-005`, `1.2-UNIT-006`, `1.2-E2E-003`, `1.2-E2E-004`

```bash
bun run test -- tests/unit/design-system.spec.ts --grep "1.2-UNIT-00[56]"
bun run test:e2e -- tests/e2e/design-system-theme.spec.ts --grep "1.2-E2E-00[34]"
```

### Task 4: Install Button and update sample page
Activate: `1.2-UNIT-007`, `1.2-UNIT-008`, `1.2-UNIT-009`, `1.2-UNIT-010`, `1.2-E2E-005`, `1.2-E2E-006`, `1.2-E2E-007`, `1.2-E2E-008`, `1.2-E2E-010`

```bash
bun run test -- tests/unit/design-system.spec.ts --grep "1.2-UNIT-0(0[789]|10)"
bun run test:e2e -- tests/e2e/design-system-theme.spec.ts --grep "1.2-E2E-0(0[5-9]|10)"
```

### Task 5: Run all quality gates
Activate: `1.2-UNIT-011`, `1.2-UNIT-012`, `1.2-UNIT-013`, `1.2-UNIT-014`, `1.2-E2E-009`

```bash
# After ALL tasks done, activate ALL remaining tests:
bun run test -- tests/unit/design-system.spec.ts
bun run test:e2e -- tests/e2e/design-system-theme.spec.ts
```

---

## Required `data-testid` Attributes

No `data-testid` attributes required for Story 1.2. Tests use semantic role selectors (`getByRole('button')`) and element type selectors (`h1`, `p`). This is intentional — WCAG semantic HTML should be sufficient for these foundational design system components.

If the sample page layout makes role-based selection ambiguous, add:
- `data-testid="theme-demo-heading"` on the `<h1>`
- `data-testid="theme-demo-body"` on the sample `<p>` paragraph

---

## Mock Requirements

None — Story 1.2 tests only check CSS property values, file content, and dev server responses.
No external API calls, authentication, or database interactions involved.

---

## Fixture Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| `tests/support/fixtures/design-system-context.ts` | Design token constants (hex values, RGB equivalents), CSS property reader helpers | Created (RED phase) |

Full fixture infrastructure (Playwright `test.extend()`, DB factories, auth helpers) is created in **Story 1.8 (Test Harness & CI)**.

---

## Known Constraints & Assumptions

1. **CSS custom property computed values:** Browser computed style may return hex OR `var(--token)` depending on whether the property is resolved. E2E tests use regex patterns to accept both forms. If the browser resolves through the chain, the final hex value will be checked.
2. **No Thai characters in tests:** Per project rule — all Thai text is managed by Rawinan via Paraglide. Tests only verify structural/CSS properties, never Thai string content.
3. **Tailwind v4 CSS-only:** No `tailwind.config.js` must exist. Test `1.2-UNIT-014` guards against accidental creation.
4. **Sequential execution:** Subagent mode was not used. Tests generated sequentially.
5. **Bun only:** All commands use `bun run *`. No `npm`/`yarn`/`pnpm`.
6. **E2E requires dev server:** `1.2-E2E-*` tests require `bun run dev` to be running on port 5173. The `playwright.config.ts` `webServer` config starts it automatically during `bun run test:e2e`.
7. **leading-relaxed tolerance:** DESIGN.md specifies 1.65 line-height; Tailwind's `leading-relaxed` is 1.625. E2E test `1.2-E2E-007` accepts >= 1.6 to accommodate both values. Unit test `1.2-UNIT-009` accepts either class.
8. **shadcn-svelte Button install:** Task 4.1 runs `bunx shadcn-svelte@latest add button` — do NOT hand-write the Button component. Test `1.2-UNIT-007` only checks directory/file existence, not the implementation.

---

## Red-Green-Refactor Workflow

```
RED   ← You are here. All tests marked test.skip().
        Tests document EXPECTED behavior that doesn't exist yet.

GREEN ← During each task: remove test.skip(), confirm RED,
        implement the feature, confirm GREEN.

REFACTOR ← After GREEN: clean up code; tests must stay green.
```

**IMPORTANT:** Before activating a test, always confirm it FAILs first:
```bash
# 1. Remove test.skip() for ONE test
# 2. Run it — it should FAIL with a meaningful error, not pass trivially
# 3. If it passes before implementation — the assertion is wrong, fix the test
# 4. Implement the feature
# 5. Run again — should PASS
```

---

## Execution Commands

```bash
# Run unit/structural tests (Story 1.2)
bun run test -- tests/unit/design-system.spec.ts

# Run all unit tests
bun run test

# Run E2E theme tests (requires dev server: bun run dev)
bun run test:e2e -- tests/e2e/design-system-theme.spec.ts

# Run all E2E tests
bun run test:e2e

# Run full quality gate (mirrors CI)
bun run check && bun run lint && bun run format && bun run test && bun run build
```

---

## ATDD Artifacts (Linked in Story)

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-2-design-system-thai-typography.md`
- **Unit tests:** `tests/unit/design-system.spec.ts`
- **E2E tests:** `tests/e2e/design-system-theme.spec.ts`
- **Fixture context:** `tests/support/fixtures/design-system-context.ts`

---

## Next Steps for Dev Agent

1. **Pick up the story:** `bmad-dev-story` with story file `_bmad-output/implementation-artifacts/1-2-design-system-thai-typography.md`
2. **Activate tests task-by-task** using the guide above — confirm RED before implementing, GREEN after
3. **After Story 1.2 is done:** proceed to Story 1.3 (Database Migration Setup)
4. **After Epic 1 is complete:** run `bmad-testarch-automate` to generate the full automated test suite for CI (Story 1.8 concern)

---

## Completion Summary

- **Story:** 1.2 — Design System & Thai Typography
- **TDD Phase:** RED
- **Total Tests Generated:** 25 (all `test.skip()`)
  - Unit/structural tests: 15 (in `tests/unit/design-system.spec.ts`)
  - E2E browser tests: 10 (in `tests/e2e/design-system-theme.spec.ts`)
- **Priority breakdown:** P0: 14, P1: 9, P2: 2
- **Acceptance criteria covered:** 6/6 (100%)
- **Fixtures created:** 1 context file with design token constants and CSS helpers
- **Mock requirements:** 0
- **data-testid requirements:** 0 (optional — semantic role selectors used)

**Generated by:** BMad TEA Agent — ATDD Module
**Workflow:** `bmad-testarch-atdd`
**Version:** 4.0 (BMad v6)
