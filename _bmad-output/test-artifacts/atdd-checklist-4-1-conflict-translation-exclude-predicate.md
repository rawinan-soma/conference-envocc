---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-13'
storyId: '4.1'
storyKey: 4-1-conflict-translation-exclude-predicate
storyFile: _bmad-output/implementation-artifacts/4-1-conflict-translation-exclude-predicate.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-4-1-conflict-translation-exclude-predicate.md
generatedTestFiles:
  - tests/integration/bookings.test.ts
  - tests/integration/db-schema.test.ts (appended 4.1-UNIT-001)
inputDocuments:
  - _bmad-output/implementation-artifacts/4-1-conflict-translation-exclude-predicate.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-4.md
  - _bmad/tea/config.yaml
  - tests/integration/rooms.test.ts
  - tests/integration/db-schema.test.ts
  - drizzle/0000_init.sql
  - src/lib/server/services/block-slot-service.ts
  - src/lib/server/db/schema/bookings.ts
---

# ATDD Checklist: Story 4.1 — Conflict Translation & EXCLUDE Predicate

**Date:** 2026-06-13
**Author:** TEA Agent (bmad-testarch-atdd)
**Story:** 4.1 — Conflict Translation & EXCLUDE Predicate
**Status:** RED PHASE — All tests scaffolded as `test.skip()`

---

## TDD Red Phase Summary

All acceptance test scaffolds generated. Tests are marked `test.skip()` and will fail until
the implementation tasks are completed. Activate one test (or group) at a time alongside the
corresponding task as directed in the story dev notes.

| Metric | Value |
|--------|-------|
| Total new tests | 7 (bookings.test.ts: 6, db-schema.test.ts: 1) |
| P0 tests | 4 (4.1-CONC-001, INT-001, INT-002, INT-003) |
| P1 tests | 2 (4.1-INT-004, INT-005) + 1 in db-schema.test.ts (4.1-UNIT-001) |
| P2 tests | 1 (4.1-INT-006) |
| All tests skipped (red phase) | ✅ |
| Expected to fail before implementation | ✅ |
| Execution mode | SEQUENTIAL (AI generation) |

---

## Generated Test Files

| File | Status | Notes |
|------|--------|-------|
| `tests/integration/bookings.test.ts` | NEW | 6 tests covering P0 + P1 + P2 scenarios; Vitest + pg.Pool |
| `tests/integration/db-schema.test.ts` | APPENDED | +1 test: `4.1-UNIT-001` EXCLUDE predicate static assertion |

---

## Acceptance Criteria Coverage

| AC | Description | Test(s) | Priority |
|----|-------------|---------|----------|
| AC-1 | EXCLUDE predicate `WHERE (status != 'cancelled')` present in migrated schema | 4.1-UNIT-001 (db-schema.test.ts) | P1 |
| AC-1 | Cancelled booking does not block new active booking for same slot | 4.1-INT-002 | P0 |
| AC-2 | N=5 concurrent inserts → exactly one commits, rest raise `23P01` (AR-11 mandatory) | 4.1-CONC-001 | P0 |
| AC-3 | `23P01` caught by booking-service.ts, thrown as typed `ConflictError` | 4.1-INT-001, 4.1-INT-003 | P0 |
| AC-4 | `ConflictError.key` = `'booking_conflict_error'` (Paraglide key, not raw `23P01`) | 4.1-INT-005 | P1 |

---

## Test Scenarios

### P0 (Critical — must pass before story can close)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 4.1-CONC-001 | N=5 concurrent inserts → exactly one commits, rest `23P01` (AR-11) | `bookings.test.ts` | 🔴 test.skip() |
| 4.1-INT-001 | Sequential conflict → `ConflictError` from booking-service.ts | `bookings.test.ts` | 🔴 test.skip() |
| 4.1-INT-002 | Cancelled booking does not block same slot | `bookings.test.ts` | 🔴 test.skip() |
| 4.1-INT-003 | `23P01` → `ConflictError` (not raw exception, statusCode=422) | `bookings.test.ts` | 🔴 test.skip() |

### P1 (Important)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 4.1-UNIT-001 | `pg_get_constraintdef()` for `bookings_no_overlap` contains predicate | `db-schema.test.ts` | 🔴 test.skip() |
| 4.1-INT-004 | Back-to-back bookings (10:00–11:00 + 11:00–12:00) both succeed | `bookings.test.ts` | 🔴 test.skip() |
| 4.1-INT-005 | `ConflictError.key === 'booking_conflict_error'`; no raw `23P01` in message | `bookings.test.ts` | 🔴 test.skip() |

### P2 (Edge case)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 4.1-INT-006 | Same room different days — no conflict (range isolation) | `bookings.test.ts` | 🔴 test.skip() |

---

## Activation Schedule (per story dev notes)

| Task | Test to Activate | Expected Result After Activation |
|------|-----------------|----------------------------------|
| Task 2.3 | `4.1-INT-001` only | FAIL → implement `booking-service.ts` → PASS |
| Task 2.6 | `4.1-CONC-001` | PASS (constraint already present from Story 1.3) |
| Task 3.1 | `4.1-UNIT-001` | PASS immediately (predicate already in migration) |
| Post P0 | `4.1-INT-002`, `4.1-INT-003` | PASS once service catches `23P01` correctly |
| Post P1 | `4.1-INT-004`, `4.1-INT-005`, `4.1-INT-006` | PASS once service is green |

---

## Architecture Notes

- `bookings.test.ts` uses Vitest + `pg.Pool` (direct pool, NOT `@playwright/test`)
  — matches the `rooms.test.ts` / `db-schema.test.ts` pattern
- `4.1-CONC-001` uses direct `pg` pool connections (NOT the service layer) to test the
  EXCLUDE constraint in isolation — bypassing application code intentionally
- Service-layer tests (`INT-001/002/003/005/006`) use dynamic `import()` inside test body
  so `booking-service.ts` doesn't need to exist at scaffold time (matches `rooms.test.ts` pattern)
- `booking-service.ts` import path: `../../src/lib/server/services/booking-service.js`
- `4.1-UNIT-001` uses `pg_get_constraintdef()` (live-DB) matching `db-schema.test.ts` style
- Postgres normalizes `!=` → `<>` in `pg_get_constraintdef` output — assertion uses regex `/WHERE\s*\(status\s*<>\s*'cancelled'\)/i`

---

## Non-Negotiable Requirements

- [x] `4.1-CONC-001` is in the PR gate (AR-11 mandate — not nightly-only)
- [x] `4.1-CONC-001` uses N ≥ 5 concurrent transactions via direct pg pool (not service)
- [x] All tests start as `test.skip()` — ATDD red-phase discipline
- [x] No Thai text hardcoded in test data (all strings are English mock data)
- [x] No new imports at module level that reference `booking-service.ts` (would break compilation)
- [x] `booking_conflict_error` Paraglide key asserted by name in `4.1-INT-005`

---

## Risk Mitigations Covered

| Risk | Test | Status |
|------|------|--------|
| R-001: EXCLUDE predicate not refined | `4.1-UNIT-001`, `4.1-INT-002` | 🔴 Scaffolded |
| R-002: Concurrent double-booking not prevented | `4.1-CONC-001` | 🔴 Scaffolded |
| R-006: `23P01` not caught → 500 | `4.1-INT-001`, `4.1-INT-003` | 🔴 Scaffolded |
| R-008: Back-to-back bookings false conflict | `4.1-INT-004` | 🔴 Scaffolded |
