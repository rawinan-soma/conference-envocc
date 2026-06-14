---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-14'
storyId: '4.3'
storyKey: 4-3-room-calendar-view
storyFile: _bmad-output/implementation-artifacts/4-3-room-calendar-view.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-4-3-room-calendar-view.md
generatedTestFiles:
  - tests/e2e/bookings.spec.ts (NEW — 4.3-E2E-001, 4.3-A11Y-001)
inputDocuments:
  - _bmad-output/implementation-artifacts/4-3-room-calendar-view.md
  - _bmad/tea/config.yaml
  - _bmad-output/test-artifacts/test-design/test-design-epic-4.md
  - tests/e2e/profile.spec.ts
  - tests/integration/bookings.test.ts
---

# ATDD Checklist: Story 4.3 — Room Calendar View

**Date:** 2026-06-14
**Author:** TEA Agent (bmad-testarch-atdd)
**Story:** 4.3 — Room Calendar View
**Status:** RED PHASE — E2E tests scaffolded as `test.skip()`; no integration tests (UI-only story)

---

## TDD Red Phase Summary

Story 4.3 is a **UI-only story** — no new DB migrations, no new booking mutations. The data layer
(`getWeekCalendar`) was created in Story 4.2. Accordingly, the test design for Epic 4 identifies only
two E2E scenarios for Story 4.3: `4.3-E2E-001` [P1] and `4.3-A11Y-001` [P2]. Story Task 8.3 confirms
explicitly: "This story adds no new integration tests."

Both tests stay `test.skip()` — they require the `/bookings/new` route (Story 4.4) to be functional
and the Playwright webServer to be activated before they can run.

| Metric | Value |
|--------|-------|
| Total new tests | 2 (tests/e2e/bookings.spec.ts: 2 new scenarios) |
| P1 tests | 1 (4.3-E2E-001 — test.skip) |
| P2 tests | 1 (4.3-A11Y-001 — test.skip) |
| Integration tests | 0 (UI-only story; no new data layer) |
| Tests skipped (red phase) | 4.3-E2E-001, 4.3-A11Y-001 |
| Execution mode | SEQUENTIAL (AI generation) |

---

## Generated Test Files

| File | Status | Notes |
|------|--------|-------|
| `tests/e2e/bookings.spec.ts` | NEW | 2 tests: `4.3-E2E-001` (test.skip), `4.3-A11Y-001` (test.skip) |

---

## Acceptance Criteria Coverage

| AC | Description | Test(s) | Priority |
|----|-------------|---------|----------|
| AC-1 | Calendar renders rooms on Y axis × days on X axis; booking chips visible; empty cells clickable | 4.3-E2E-001 | P1 |
| AC-2 | Booked/available/blocked states distinguishable without relying on color alone (label + ARIA + visual pattern) | 4.3-A11Y-001 | P2 |

---

## Test Scenarios

### P1 (Important — scaffolded as test.skip)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 4.3-E2E-001 | `/calendar` renders rooms on Y axis × days on X axis; booking chips visible; empty cells link to `/bookings/new` | `tests/e2e/bookings.spec.ts` | 🔴 test.skip() |

### P2 (Medium — scaffolded as test.skip)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 4.3-A11Y-001 | `/calendar` passes axe-core zero WCAG 2.1 AA violations; slot states distinguishable without color alone | `tests/e2e/bookings.spec.ts` | 🔴 test.skip() |

---

## Activation Schedule (per story dev notes)

| Task | Test to Activate | Activation Condition | Expected Result After Activation |
|------|-----------------|---------------------|----------------------------------|
| Task 7.1 | `4.3-E2E-001` (stays skip in 4.3) | Story 4.4 `/bookings/new` route functional + Playwright webServer active | FAIL → implement calendar page (Tasks 1–6) → PASS |
| Task 7.1 | `4.3-A11Y-001` (stays skip in 4.3) | Calendar page renders with at least one room | FAIL until a11y attributes wired → PASS |

**Note (from story Task 7.2):** Do NOT activate these tests in Story 4.3. They stay as `test.skip()` for Story 4.3. A later story activates them after `/bookings/new` (Story 4.4) is functional.

---

## Architecture Notes

- Story 4.3 is a **UI-only story**: no new DB migrations, no new booking mutations.
- `tests/e2e/bookings.spec.ts` is a **new file** (did not exist before this story).
- Both tests use the dev-bypass authentication seam from Story 2.2: `GET /r/dev-bypass?profileComplete=true`.
- The E2E test file follows the same header JSDoc pattern as `tests/e2e/profile.spec.ts`.
- `4.3-A11Y-001` uses `@axe-core/playwright` (`AxeBuilder`) — already present in the project from Story 2.3.
- No Thai text is hardcoded — per project rule, Rawinan handles all Thai translations.
- The `chip` and `availableLink` assertions are commented out (soft) since CI may lack seed data; the navigation link assertions are unconditional (always verifiable once the route exists).

---

## Deferred E2E Activation Blocker

The key activation blocker for these tests is the Playwright `webServer` configuration in `playwright.config.ts`. Per test-design-epic-4.md §Risks:

> "Risk: Playwright webServer E2E activation is a deferred backlog item from E2/E3. If this remains unresolved, Story 4.3 calendar E2E (P1) and Story 4.4/4.8 a11y tests (P2) cannot activate."
> "Contingency: Scope as `test.skip()` stubs immediately; one `playwright.config.ts` `webServer` change unblocks all E2/E3/E4 E2E tests."

---

## Non-Negotiable Requirements

- [x] `4.3-E2E-001` and `4.3-A11Y-001` are scaffolded as `test.skip()` — ATDD red-phase discipline
- [x] No new integration tests (story is UI-only; Task 8.3 confirms this)
- [x] No Thai text hardcoded in test data
- [x] `tests/e2e/bookings.spec.ts` is a NEW file (not appended to existing spec files)
- [x] Activation is deferred to post-Story 4.4 (per story Task 7.2)

---

## Risk Mitigations Covered

| Risk | Test | Status |
|------|------|--------|
| AC-1: Calendar grid not rendering rooms × days | 4.3-E2E-001 | 🔴 Scaffolded (test.skip) |
| AC-2: Slot states indistinguishable without color (WCAG 2.1 AA) | 4.3-A11Y-001 | 🔴 Scaffolded (test.skip) |
| NFR-007: WCAG 2.1 AA violations on /calendar | 4.3-A11Y-001 | 🔴 Scaffolded (test.skip) |

---

## Next Steps

1. Implement Tasks 1–6 in story 4.3 (date utils, Paraglide keys, components, route).
2. Run `bunx prettier --write . && bun run lint` before each commit (story Task 8.1).
3. Run `bun run check` — zero TypeScript errors (story Task 8.2).
4. Run `bun run test:integration` — all existing Story 4.1 and 4.2 tests still pass (story Task 8.3).
5. Run `bun run build` — build succeeds (story Task 8.4).
6. E2E tests remain `test.skip()` throughout Story 4.3 — activation happens after Story 4.4 ships `/bookings/new`.
