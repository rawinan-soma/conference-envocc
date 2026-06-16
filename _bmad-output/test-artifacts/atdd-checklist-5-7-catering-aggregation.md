---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
lastStep: step-04c-aggregate
lastSaved: '2026-06-16'
storyId: '5.7'
storyKey: 5-7-catering-aggregation
storyFile: _bmad-output/implementation-artifacts/5-7-catering-aggregation.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-5-7-catering-aggregation.md
generatedTestFiles:
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/5-7-catering-aggregation.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-5.md
  - _bmad/tea/config.yaml
  - playwright.config.ts
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
---

# ATDD Checklist: Story 5.7 — Catering Aggregation

## Stack Detection

- Detected stack: **fullstack** (SvelteKit + Vitest integration + Playwright E2E)
- Test framework: Vitest (integration) + Playwright (E2E)
- Playwright Utils: enabled
- Pact.js: disabled

## TDD Red Phase (Current)

Red-phase test scaffolds generated and appended to existing test files.

- Integration Tests: 3 scenarios (2 activated [P0], 1 skipped [P2])
- E2E Tests: 1 scenario (skipped [P1])

### Activation State by Test ID

| Test ID | Priority | Status | File | Note |
|---------|----------|--------|------|------|
| 5.7-INT-001 | P0 | **ACTIVATED** (`test(`) | `tests/integration/registrations.test.ts` | Red — fails until `getCateringCountsByBookingId` implemented (Task 1) |
| 5.7-INT-002 | P0 | **ACTIVATED** (`test(`) | `tests/integration/registrations.test.ts` | Red — fails until `getCateringCountsByBookingId` implemented (Task 1) |
| 5.7-INT-003 | P2 | SKIPPED (`test.skip(`) | `tests/integration/registrations.test.ts` | Activate during or after Task 1 |
| 5.7-E2E-001 | P1 | SKIPPED (`test.skip(`) | `tests/e2e/registrations.spec.ts` | Activate after Tasks 1–3 complete + seed wiring done |

## Generation Mode

**AI Generation** selected (fullstack project; acceptance criteria clear; scenarios are DB query + UI rendering).

## Test Strategy

### Acceptance Criteria → Test Mapping

| AC | Description | Test IDs |
|----|-------------|----------|
| AC-1 (FR-022, FR-051) | BookingCard on /dashboard shows per-meal-type counts when cateringEnabled=true | 5.7-INT-001, 5.7-INT-002, 5.7-E2E-001 |
| AC-2 (FR-022, FR-051) | /bookings/[id] detail page shows per-meal-type counts when cateringEnabled=true | 5.7-INT-001, 5.7-INT-002 |
| AC-3 (FR-022) | Only status='registered' rows counted; cancelled excluded | 5.7-INT-002 |
| AC-4 | Zero counts shown (not hidden) when no registrations exist | 5.7-INT-003 |
| AC-5 | meal_type IS NULL rows excluded from aggregation | 5.7-INT-001 (seeds explicit mealType; null rows never inserted) |
| AC-6 | Only count of 'Other'; no meal_type_other_text aggregation | 5.7-INT-001 (asserts only numeric counts) |
| AC-7 (scope) | registrant-count placeholder "—" is untouched | 5.7-E2E-001 (asserts "—" still present) |
| AC-8 | All new UI strings via Paraglide | Covered by implementation tasks 5.1–5.2 (no test needed at ATDD level) |
| AC-9 | ATDD tests scaffolded per scenario IDs from test-design-epic-5.md | This checklist |

### Risk Coverage

| Risk | Score | Mitigated by |
|------|-------|--------------|
| R-006 Catering aggregation concurrency | 6 | 5.7-INT-001 (Promise.all 5 concurrent inserts → assert counts), 5.7-INT-002 (cancel 2 → assert decrement) |

## Acceptance Criteria Coverage

- [x] AC-1: Catering summary on dashboard BookingCard → `5.7-INT-001`, `5.7-INT-002`, `5.7-E2E-001`
- [x] AC-2: Catering summary on booking detail page → `5.7-INT-001`, `5.7-INT-002`
- [x] AC-3: Counts reflect only status='registered' rows → `5.7-INT-002`
- [x] AC-4: Zero counts shown when no registrations exist → `5.7-INT-003`
- [x] AC-5: meal_type IS NULL rows excluded → `5.7-INT-001` (only explicit mealType values seeded)
- [x] AC-6: Other count only — no free-text aggregation → `5.7-INT-001`
- [x] AC-7: Scope boundary — registrant-count placeholder untouched → `5.7-E2E-001`
- [x] AC-8: Paraglide keys → implementation task (no separate ATDD test needed)
- [x] AC-9: ATDD scaffolds per test-design-epic-5.md → this checklist + committed tests

## Infrastructure Changes

### `seedBookingWithToken` helper extended

Added optional `cateringEnabled?: boolean` parameter to `tests/integration/registrations.test.ts`.
- Default: `false` (backward-compatible — all existing callers unaffected)
- Story 5.7 tests pass `cateringEnabled: true` for catering-enabled seed bookings

## Next Steps (Task-by-Task Activation)

### Task 1: getCateringCountsByBookingId implementation

1. INT-001 and INT-002 are **already activated** (P0, red phase — they will fail until Task 1 is done)
2. Implement `getCateringCountsByBookingId` and `getCateringCountsByBookingIds` in
   `src/lib/server/db/queries/registrations.ts`
3. Run: `bun run test:integration -- --reporter verbose --testNamePattern "5.7-INT-001|5.7-INT-002"`
4. Verify INT-001 and INT-002 PASS (green)
5. Remove `test.skip(` from INT-003 and run to verify it also passes

### Tasks 2–3: Dashboard and BookingCard integration

1. Implement Task 2 (dashboard page.server.ts) and Task 3 (BookingCard.svelte)
2. Wire up E2E seed for the catering-enabled booking (dev-bypass or global setup SQL)
3. Remove `test.skip(` from `5.7-E2E-001`
4. Run: `bun run test:e2e -- --grep "5.7-E2E-001"` → verify PASS

### Task 4: Booking detail page

- Covered by INT-001/INT-002 at service level; no new ATDD test required for Task 4 alone

## ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-5-7-catering-aggregation.md`
- Integration tests: `tests/integration/registrations.test.ts` (appended: 5.7-INT-001, -002, -003)
- E2E tests: `tests/e2e/registrations.spec.ts` (appended: 5.7-E2E-001)
- Test design reference: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`
