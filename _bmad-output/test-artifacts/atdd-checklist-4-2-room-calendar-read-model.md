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
storyId: '4.2'
storyKey: 4-2-room-calendar-read-model
storyFile: _bmad-output/implementation-artifacts/4-2-room-calendar-read-model.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-4-2-room-calendar-read-model.md
generatedTestFiles:
  - tests/integration/db-schema.test.ts (appended 4.2-UNIT-001)
  - tests/integration/bookings.test.ts (appended 4.2-INT-001, 4.2-INT-002)
inputDocuments:
  - _bmad-output/implementation-artifacts/4-2-room-calendar-read-model.md
  - _bmad/tea/config.yaml
  - tests/integration/db-schema.test.ts
  - tests/integration/bookings.test.ts
  - src/lib/server/db/schema/bookings.ts
  - src/lib/server/db/schema/rooms.ts
---

# ATDD Checklist: Story 4.2 — Room Calendar Read-Model

**Date:** 2026-06-13
**Author:** TEA Agent (bmad-testarch-atdd)
**Story:** 4.2 — Room Calendar Read-Model
**Status:** RED PHASE — INT tests scaffolded as `test.skip()`; UNIT-001 active immediately

---

## TDD Red Phase Summary

All acceptance test scaffolds generated. `4.2-UNIT-001` is activated immediately (the GiST index
already exists from Story 1.3's EXCLUDE constraint). `4.2-INT-001` and `4.2-INT-002` are scaffolded
as `test.skip()` and will fail until `getWeekCalendar()` is implemented. Activate one test at a time
alongside the corresponding task as directed in the story dev notes.

| Metric | Value |
|--------|-------|
| Total new tests | 3 (db-schema.test.ts: 1, bookings.test.ts: 2) |
| P0 tests | 1 (4.2-UNIT-001 — active immediately) |
| P1 tests | 2 (4.2-INT-001, 4.2-INT-002 — test.skip()) |
| Tests skipped (red phase) | 4.2-INT-001, 4.2-INT-002 |
| 4.2-UNIT-001 expected to pass immediately | ✅ (GiST index from Story 1.3 already exists) |
| Execution mode | SEQUENTIAL (AI generation) |

---

## Generated Test Files

| File | Status | Notes |
|------|--------|-------|
| `tests/integration/db-schema.test.ts` | APPENDED | +1 test: `4.2-UNIT-001` GiST index assertion — ACTIVE |
| `tests/integration/bookings.test.ts` | APPENDED | +2 tests: `4.2-INT-001` (test.skip), `4.2-INT-002` (test.skip) |

---

## Acceptance Criteria Coverage

| AC | Description | Test(s) | Priority |
|----|-------------|---------|----------|
| AC-1 | Week calendar query returns per-room bookings; deactivated rooms absent | 4.2-INT-001 | P1 |
| AC-2 | `EXPLAIN ANALYZE` with `enable_seqscan = off` confirms Index Scan on `bookings.during` | 4.2-INT-002 | P1 |
| AC-3 | GiST index covering `bookings(during)` confirmed to exist in migrated schema | 4.2-UNIT-001 | P0 |

---

## Test Scenarios

### P0 (Critical — active immediately)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 4.2-UNIT-001 | GiST index on `bookings(during)` exists via `bookings_no_overlap` EXCLUDE constraint | `db-schema.test.ts` | ✅ ACTIVE (passes immediately) |

### P1 (Important — scaffolded as test.skip)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 4.2-INT-001 | `getWeekCalendar` returns per-room bookings; inactive rooms absent; cancelled bookings excluded | `bookings.test.ts` | 🔴 test.skip() |
| 4.2-INT-002 | `EXPLAIN ANALYZE` + `SET enable_seqscan = off` → plan contains `Index Scan` or `Bitmap Index Scan` | `bookings.test.ts` | 🔴 test.skip() |

---

## Activation Schedule (per story dev notes)

| Task | Test to Activate | Expected Result After Activation |
|------|-----------------|----------------------------------|
| Task 2.1 | `4.2-UNIT-001` (already active) | PASS immediately (GiST index from Story 1.3) |
| Task 2.3 | `4.2-INT-001` (remove `test.skip`) | FAIL → implement `getWeekCalendar()` (Task 1) → PASS |
| Task 2.4 | `4.2-INT-002` (remove `test.skip`) | PASS if composite GiST index covers `during &&` query; if FAIL → add `drizzle/0008_booking_gist_index.sql` |

---

## Architecture Notes

- Story 4.2 is a **data-layer story only** — no routes, no Svelte components, no form actions.
- `4.2-UNIT-001` appended to `tests/integration/db-schema.test.ts` after `4.1-UNIT-001` block.
- `4.2-INT-001` and `4.2-INT-002` appended to `tests/integration/bookings.test.ts` after Story 4.1 tests.
- Both integration tests use the existing `pg.Pool` (`pool`) and `randomUUID` from `node:crypto`.
- `4.2-INT-001` uses direct raw SQL for seeding (no service layer), then calls `getWeekCalendar()` via dynamic `import()`.
- `4.2-INT-002` **must** use `pool.connect()` (dedicated client) for `SET enable_seqscan = off` + `EXPLAIN ANALYZE`. Using `pool.query()` would route the two calls to different connections, making the `SET` ineffective.
- Import path for `getWeekCalendar`: `../../src/lib/server/db/queries/bookings.js`
- The new directory `src/lib/server/db/queries/` does NOT exist at baseline — Story 4.2 Task 1.1 creates it.

---

## Conditional Migration Note

The story's `4.2-INT-002` probe determines whether a separate GiST migration is needed:

- **Plan shows `Index Scan` or `Bitmap Index Scan`** → composite index `(room_id, during)` from Story 1.3 is sufficient. No new migration.
- **Plan shows `Seq Scan` even with `enable_seqscan = off`** → composite index cannot serve the `during`-only query. Add `drizzle/0008_booking_gist_index.sql` and update `4.2-UNIT-001` to also assert `idx_bookings_during` exists.

Do not pre-decide. Let the probe decide at Task 2.4.

---

## Non-Negotiable Requirements

- [x] `4.2-UNIT-001` is active immediately (no `test.skip`) — GiST index already exists
- [x] `4.2-INT-001` and `4.2-INT-002` start as `test.skip()` — ATDD red-phase discipline
- [x] `4.2-INT-002` uses `pool.connect()` dedicated client for `SET enable_seqscan = off`
- [x] No Thai text hardcoded in test data (all strings are English mock data)
- [x] Dynamic `import()` for `getWeekCalendar` inside test body — avoids compilation error when `src/lib/server/db/queries/bookings.ts` doesn't exist yet

---

## Risk Mitigations Covered

| Risk | Test | Status |
|------|------|--------|
| R-007: GiST index not present → range-overlap queries use Seq Scan | 4.2-UNIT-001, 4.2-INT-002 | ✅ UNIT-001 active; 🔴 INT-002 scaffolded |
| AC-1: Inactive rooms appear in calendar query | 4.2-INT-001 | 🔴 Scaffolded |
| AC-1: Cancelled bookings appear in week calendar | 4.2-INT-001 | 🔴 Scaffolded |
| AC-2: Index not usable for `during &&` range query | 4.2-INT-002 | 🔴 Scaffolded |

---

## Next Steps

1. Run `bun run test:integration` — verify `4.2-UNIT-001` passes immediately (green).
2. Implement `getWeekCalendar()` in `src/lib/server/db/queries/bookings.ts` (Task 1).
3. Activate `4.2-INT-001` (Task 2.3) → run → expect FAIL → verify implementation → PASS.
4. Activate `4.2-INT-002` (Task 2.4) → run → check plan → add migration if needed → PASS.
5. Run `bunx prettier --write . && bun run lint` before each commit.
6. Run `bun run build` to verify build succeeds.
