---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-15'
storyId: '4.4'
storyKey: 4-4-create-a-booking-conflict-free
storyFile: _bmad-output/implementation-artifacts/4-4-create-a-booking-conflict-free.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-4-4-create-a-booking-conflict-free.md
generatedTestFiles:
  - tests/integration/bookings.test.ts
  - tests/e2e/bookings.spec.ts
---

# ATDD Checklist: Story 4.4 — Create a Booking (Conflict-Free)

## TDD Red Phase (Completed)

All red-phase test scaffolds generated. Tests use `test.skip()` — activate task-by-task during implementation.

- Integration Tests: 3 new tests added (all skipped)
- E2E Tests: 3 new tests added (all skipped)

---

## Stack Detection

- **Detected Stack:** `fullstack`
- **Indicators:** `playwright.config.ts` (frontend/E2E), Vitest integration tests with Testcontainers/pg (backend)
- **Generation Mode:** AI generation (standard form CRUD + conflict handling scenarios)
- **Execution Mode:** Sequential (subagent fan-out not needed; single-context generation)

---

## Acceptance Criteria Coverage

| AC | Description | Test Coverage |
|---|---|---|
| AC-1 | Form fields render; ?room= and ?date= pre-fill | 4.4-E2E-001, 4.4-INT-001 |
| AC-2 | Conflict-free: 23P01 → ConflictError → setError → 422 | 4.4-E2E-002, 4.4-INT-001 (service layer) |
| AC-3 | Successful booking redirects to /calendar | 4.4-E2E-001 |
| AC-4 | registration_enabled + registration_closes_at persisted | 4.4-INT-002, 4.4-INT-003 |
| AC-5 | Calendar chips show eventName (not null) | 4.4-E2E-001 (booking creation prerequisite) |
| AC-6 | UUID v7 PK (text string, not integer) | 4.4-INT-001 (id type assertion) |

---

## Scenario Inventory

### Integration Tests (Vitest + Postgres)

Appended to: `tests/integration/bookings.test.ts`

| ID | Priority | Description | Activation Task |
|---|---|---|---|
| 4.4-INT-001 | P0 | createBooking with full input persists all columns; id is UUID v7 string | Task 5 (expanded CreateBookingInput) |
| 4.4-INT-002 | P0 | registrationEnabled=true + registrationClosesAt persists correctly | Task 5 |
| 4.4-INT-003 | P1 | registrationEnabled=true without registrationClosesAt succeeds at service level (schema boundary doc) | Task 5 |

### E2E Tests (Playwright)

Appended to: `tests/e2e/bookings.spec.ts`

| ID | Priority | Description | Activation Task |
|---|---|---|---|
| 4.4-E2E-001 | P1 | /bookings/new with ?room=&date= pre-fills form; booking creates; redirect to /calendar | Task 9 (/bookings/new route) |
| 4.4-E2E-002 | P1 | Conflicting booking shows localized conflict error; stays on /bookings/new | Task 9 |
| 4.4-A11Y-001 | P2 | /bookings/new passes axe-core zero WCAG 2.1 AA violations | Task 9 |

### Story 4.3 E2E Stubs (pre-existing — NOT modified by 4.4 ATDD)

| ID | Priority | Description | Activation Task |
|---|---|---|---|
| 4.3-E2E-001 | P1 | Calendar grid renders; chips visible; cells link to /bookings/new | Story 4.4 Task 13 (developer activates) |
| 4.3-A11Y-001 | P2 | /calendar passes axe-core zero WCAG 2.1 AA | Story 4.4 Task 13 (developer activates) |

---

## Test Strategy Decisions

### Why Integration over API tests for AC-2 (conflict)

The conflict logic is already covered at the service layer by 4.1-INT-001/003 (active, passing). The new 4.4-INT-001 adds the full-input call signature test. Adding a separate HTTP-level test (route action → 422 form error) was considered but deferred: it requires a full Playwright-driven form submission with seed data, which is already covered by 4.4-E2E-002.

### Dynamic imports in test.skip() bodies

The new 4.4-INT tests use `await import(...)` inside the test body (not top-level static imports) to avoid breaking existing test collection when the expanded service signature does not yet exist. This pattern matches the existing 4.1 test conventions in the same file.

### Cast to `unknown` on import

The `createBooking` function is cast to `(...args: unknown[]) => Promise<Record<string, unknown>>` in the skipped tests. This is intentional for the red phase — the current `CreateBookingInput = { startAt, endAt }` signature does not accept the expanded input. The cast prevents compile-time failures while the test is skipped. Remove the cast when activating (Task 5 changes the signature).

### Valibot schema unit tests

AC-1 cross-field validation (endAt > startAt, registrationClosesAt required when enabled) is best tested as unit tests for `src/lib/schemas/booking.ts`. These belong to Story 4.4 Task 4 but are out of scope for ATDD scaffolds here — they are pure unit tests, not acceptance tests.

---

## Next Steps (Task-by-Task Activation Guide)

### During Story 4.4 Implementation

**Task 5 (expand CreateBookingInput + createBooking):**
1. Remove `test.skip(` from `4.4-INT-001`
2. Run: `bun run test:integration -- --grep "4.4-INT-001"` → verify FAILS first (red)
3. Implement expanded createBooking — run again → PASS (green)
4. Repeat for `4.4-INT-002` and `4.4-INT-003`

**Task 9 (/bookings/new route):**
1. Remove `test.skip(` from `4.4-E2E-001`, `4.4-E2E-002`, `4.4-A11Y-001`
2. Update `SEED_ROOM_ID` in E2E tests with an actual seeded room id
3. Run: `bun run test:e2e -- --grep "4.4-E2E-001"` → verify FAILS first (red)
4. Implement /bookings/new route → run → PASS (green)

**Task 13 (activate 4.3 stubs):**
1. Remove `test.skip(` from `4.3-E2E-001` and `4.3-A11Y-001` in `tests/e2e/bookings.spec.ts`
2. Run both → verify PASS

### Also required before marking 4.4 done:
- [ ] `4.1-INT-001..006` call sites updated to pass full expanded input (Task 12b — active tests, must compile)
- [ ] `bun run check` — zero errors after Tasks 1–9
- [ ] `bun run test:integration` — all 4.1+4.2+4.4 integration tests pass
- [ ] `bun run test:e2e` — 4.3 and 4.4 E2E tests activated and passing

---

## ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-4-4-create-a-booking-conflict-free.md`
- **Integration tests:** `tests/integration/bookings.test.ts` (appended: 4.4-INT-001, 4.4-INT-002, 4.4-INT-003)
- **E2E tests:** `tests/e2e/bookings.spec.ts` (appended: 4.4-E2E-001, 4.4-E2E-002, 4.4-A11Y-001)

---

## Key Risks & Assumptions

1. **SEED_ROOM_ID placeholder** — E2E tests 4.4-E2E-001 and 4.4-E2E-002 use `SEED_ROOM_ID` as a placeholder. Before activating, the developer must replace with the actual active room id available in the test database (or use a database seeding strategy in `tests/support/`).

2. **Paraglide build required** — `bun run check` reports pre-existing paraglide module errors in the worktree because `$lib/paraglide/messages.js` is generated at dev/build time. These errors are not caused by the ATDD scaffolds and existed before this step.

3. **4.1 call sites** — The existing 4.1-CONC-001 test uses raw SQL (not the service), so it does not need updating for the expanded input. The service-layer tests (4.1-INT-001..006) use `{ startAt, endAt }` directly. Task 12b requires updating them to pass full input — this is an implementation-phase task, not an ATDD task.

4. **UUID v7 assertion** — The 4.4-INT-001 test asserts `booking.id.length === 36` (standard UUID hyphenated format). The `uuidv7()` package produces this format. If a different UUID library is used, adjust the length assertion.

---

*Generated by ATDD workflow (bmad-testarch-atdd) — 2026-06-15. Next recommended workflow: `bmad-dev-story`.*
