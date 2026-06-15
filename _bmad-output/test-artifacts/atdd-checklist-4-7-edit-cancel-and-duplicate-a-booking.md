---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
lastStep: step-04-generate-tests
lastSaved: '2026-06-15'
storyId: '4.7'
storyKey: 4-7-edit-cancel-and-duplicate-a-booking
storyFile: >-
  _bmad-output/implementation-artifacts/4-7-edit-cancel-and-duplicate-a-booking.md
atddChecklistPath: >-
  _bmad-output/test-artifacts/atdd-checklist-4-7-edit-cancel-and-duplicate-a-booking.md
generatedTestFiles:
  - tests/integration/bookings.test.ts
  - tests/e2e/bookings.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/4-7-edit-cancel-and-duplicate-a-booking.md
  - _bmad-output/planning-artifacts/architecture.md
  - tests/integration/bookings.test.ts
  - tests/integration/idor.test.ts
  - tests/e2e/bookings.spec.ts
  - playwright.config.ts
---

# ATDD Checklist — Story 4.7: Edit, Cancel, and Duplicate a Booking

## Step 1: Preflight & Context

### Stack Detection

- **Detected stack:** `fullstack`
- **Indicators:** `playwright.config.ts` (frontend E2E), `package.json` (SvelteKit/Vite), Vitest
  integration tests with PostgreSQL (Testcontainers)
- **Test framework:** Vitest (integration) + Playwright (E2E)

### Prerequisites

- [x] Story approved with clear acceptance criteria (8 ACs)
- [x] `playwright.config.ts` present
- [x] Vitest integration test infra in `tests/integration/`
- [x] Development environment available

### Story Context

**Story 4.7: Edit, Cancel, and Duplicate a Booking**

- **AC-1:** Edit re-checks conflicts via EXCLUDE constraint; non-owner gets 403
- **AC-2:** Cancel sets `status = 'cancelled'`; slot freed automatically (predicate + filter)
- **AC-3:** Duplicate pre-fills `/bookings/new?from=[id]`; `startAt`/`endAt` intentionally blank
- **AC-4:** Ownership guard (`requireUser` + `assertOwner`) on all mutations; IDOR tests required
- **AC-5:** `/bookings/[id]` route created with Edit, Cancel, Duplicate actions
- **AC-6:** FR-023 catering toggle — covered by edit form
- **AC-7:** Cancel confirm modal (UX-DR8)
- **AC-8:** All new UI strings in Paraglide (en.json English, th.json empty `""`)

### Framework Config

- `tea_use_playwright_utils: true`
- `tea_use_pactjs_utils: false`
- `tea_browser_automation: auto`
- `test_stack_type: auto` → resolved `fullstack`

---

## Step 2: Generation Mode

**Mode selected:** AI Generation (sequential)

**Rationale:** Acceptance criteria are clear and explicit. The story itself defines exact scenario
IDs for both integration (Tasks 7) and E2E (Task 8) test stubs. Standard CRUD + auth + navigation
patterns. No novel UI interactions requiring live browser recording.

---

## Step 3: Test Strategy

### AC → Test Level Mapping

| AC   | Scenario ID      | Level       | Priority | Description                                                   |
| ---- | ---------------- | ----------- | -------- | ------------------------------------------------------------- |
| 1, 4 | 4.7-INT-001      | Integration | P0       | Edit changes eventName → DB reflects new value                |
| 1    | 4.7-INT-002      | Integration | P0       | Edit into occupied slot → ConflictError (422)                 |
| 2, 4 | 4.7-INT-003      | Integration | P0       | Cancel sets status='cancelled'; slot is then re-bookable      |
| 4    | 4.7-INT-004      | Integration | P0       | Non-owner cannot edit (assertOwner → 403-equivalent)          |
| 4    | 4.7-INT-005      | Integration | P0       | Non-owner cannot cancel                                       |
| 3    | 4.7-INT-006      | Integration | P1       | Duplicate pre-fill loads correct field values from source     |
| 1, 5 | 4.7-E2E-001      | E2E         | P1       | Organizer edits booking — form pre-filled, saves, detail page |
| 2, 7 | 4.7-E2E-002      | E2E         | P1       | Organizer cancels booking — confirm modal, cancel fires       |
| 3    | 4.7-E2E-003      | E2E         | P1       | Organizer duplicates — /bookings/new pre-filled, time blank   |
| 4    | 4.7-E2E-004      | E2E         | P1       | IDOR — non-owner cannot reach edit page (redirect/403)        |
| 5    | 4.7-A11Y-001     | E2E (a11y)  | P2       | Booking detail page passes axe accessibility scan             |

### Red Phase Requirements

All test stubs scaffolded as `test.skip()`. They are designed to **fail before implementation**
(TDD red phase). Activation order follows story task order:

1. Task 1 (service methods) → activate INT-001, INT-002, INT-003, INT-004, INT-005
2. Task 2 (detail page) → activate E2E-002 (cancel), A11Y-001
3. Task 3 (edit route) → activate E2E-001 (edit)
4. Task 5 (duplicate pre-fill) → activate INT-006, E2E-003
5. Task 2+4 (IDOR guard) → activate E2E-004

---

## Step 4: Test Scaffolds Generated

### Integration Tests (RED PHASE)

File: `tests/integration/bookings.test.ts`

Stubs added (Task 7):

- `4.7-INT-001` [P0] — edit changes eventName → DB reflects new value
- `4.7-INT-002` [P0] — edit into occupied slot → ConflictError (422)
- `4.7-INT-003` [P0] — cancel sets status='cancelled'; slot is then re-bookable
- `4.7-INT-004` [P0] — non-owner cannot edit (assertOwner → 403-equivalent)
- `4.7-INT-005` [P0] — non-owner cannot cancel
- `4.7-INT-006` [P1] — duplicate pre-fill loads correct field values

### E2E Tests (RED PHASE)

File: `tests/e2e/bookings.spec.ts`

Stubs added (Task 8):

- `4.7-E2E-001` [P1] — organizer edits booking — form pre-filled, saves, detail page updated
- `4.7-E2E-002` [P1] — organizer cancels booking — confirm modal shown, cancel fires
- `4.7-E2E-003` [P1] — organizer duplicates booking — /bookings/new pre-filled, time blank
- `4.7-E2E-004` [P1] — IDOR — non-owner cannot reach edit page
- `4.7-A11Y-001` [P2] — booking detail page passes axe scan

---

## ATDD Red-Phase Checklist

### Pre-Implementation (RED)

- [x] Story acceptance criteria reviewed and mapped to test scenarios
- [x] Test levels assigned (Integration for service/guard logic; E2E for user journeys)
- [x] All scenarios have unique IDs (4.7-INT-001..006, 4.7-E2E-001..004, 4.7-A11Y-001)
- [x] All test stubs written with `test.skip()` (red phase)
- [x] No Thai text in test code (project rule)
- [x] IDOR negative tests included (AC-4; story explicitly requires)
- [x] Concurrent/destructive scenario included (INT-003 covers cancel + re-book pattern)
- [x] Accessibility test included (A11Y-001)

### During Implementation (Task-by-Task Activation)

- [ ] INT-001 activated → confirm RED → implement `updateBooking` → confirm GREEN
- [ ] INT-002 activated → confirm RED → implement conflict path → confirm GREEN
- [ ] INT-003 activated → confirm RED → implement `cancelBooking` → confirm GREEN
- [ ] INT-004 activated → confirm RED → implement `assertOwner` on edit → confirm GREEN
- [ ] INT-005 activated → confirm RED → implement `assertOwner` on cancel → confirm GREEN
- [ ] INT-006 activated → confirm RED → implement `getBookingById` pre-fill → confirm GREEN
- [ ] E2E-001 activated → confirm RED → implement edit route UI → confirm GREEN
- [ ] E2E-002 activated → confirm RED → implement cancel confirm modal → confirm GREEN
- [ ] E2E-003 activated → confirm RED → implement `/bookings/new?from=` → confirm GREEN
- [ ] E2E-004 activated → confirm RED → implement IDOR guard on edit page → confirm GREEN
- [ ] A11Y-001 activated → confirm RED → fix violations → confirm GREEN

### Post-Implementation (GREEN)

- [ ] All 11 test scenarios pass
- [ ] No `test.skip()` remaining for story 4.7 tests
- [ ] `bun run test:integration` green
- [ ] `bun run test:e2e` green
- [ ] PR gate passes

---

## Notes

- **IDOR pattern:** follows `tests/integration/idor.test.ts` two-user setup (Story 2.7)
- **Concurrent guarantee:** INT-003 verifies the EXCLUDE constraint predicate (`status <>
  'cancelled'`) behaviorally — cancel frees the slot for a new booking (same as 4.1-CONC-001
  pattern)
- **Edit self-conflict:** Postgres EXCLUDE checks new row against other rows, not itself —
  no "exclude self" workaround needed (documented in story Dev Notes)
- **Duplicate is stateless:** no POST needed; just a link to `/bookings/new?from=[id]` — INT-006
  tests the `getBookingById` pre-fill at the service level, not a DB write
- **No Thai text:** all mock data uses English; Rawinan handles all Thai translations
