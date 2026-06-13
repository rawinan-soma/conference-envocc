---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-14'
story: '4.2-room-calendar-read-model'
inputDocuments:
  - tests/integration/bookings.test.ts
  - tests/integration/db-schema.test.ts
  - src/lib/server/db/queries/bookings.ts
  - drizzle/0000_init.sql
  - vite.config.ts
  - _bmad-output/test-artifacts/atdd-checklist-4-2-room-calendar-read-model.md
  - _bmad-output/implementation-artifacts/4-2-room-calendar-read-model.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-4.md
---

# Test Quality Review — Story 4.2: Room Calendar Read-Model

## Overall Quality Score: 88/100 (Grade: B+)

**Execution Mode:** Sequential
**Reviewed:** 2026-06-14
**Reviewer:** Master Test Architect (TEA)
**Scope:**
- `tests/integration/bookings.test.ts` (APPENDED — 4.2-INT-001 at lines 615–723, 4.2-INT-002 at lines 731–771)
- `tests/integration/db-schema.test.ts` (APPENDED — 4.2-UNIT-001, GiST index assertion)
- `vite.config.ts` (MODIFIED — added `fileParallelism: false` to integration project)

---

## Dimension Scores

| Dimension       | Score | Grade | Weight | Weighted |
|-----------------|-------|-------|--------|----------|
| Determinism     | 95    | A     | 30%    | 28.5     |
| Isolation       | 75    | C+    | 30%    | 22.5     |
| Maintainability | 92    | A     | 25%    | 23.0     |
| Performance     | 90    | A     | 15%    | 13.5     |
| **Overall**     | **88**| **B+**|        |          |

> Coverage is excluded from `test-review` scoring. Use `trace` for coverage analysis and gates.

---

## AC Coverage Verification

All three Story 4.2 acceptance criteria are covered by ACTIVE (non-skipped) tests:

| AC   | Scenario ID   | Test File            | Status  |
|------|---------------|----------------------|---------|
| AC-1 | 4.2-INT-001   | bookings.test.ts     | ACTIVE  |
| AC-2 | 4.2-INT-002   | bookings.test.ts     | ACTIVE  |
| AC-3 | 4.2-UNIT-001  | db-schema.test.ts    | ACTIVE  |

No `test.skip()` calls were found for any Story 4.2 scenario.

---

## Violations Summary

| Severity | Count |
|----------|-------|
| HIGH     | 1     |
| MEDIUM   | 0     |
| LOW      | 2     |
| **Total**| **3** |

---

## Violations Detail

### HIGH — FIXED

**[Isolation] Cross-file DB race: `rooms.test.ts` TRUNCATE racing with `bookings.test.ts` data seeding**

- **File:** `vite.config.ts` (integration project config); root cause in `tests/integration/rooms.test.ts`
- **Category:** shared-database-truncation-race
- **Symptom:** `4.2-INT-001` intermittently failed in the full suite (`bun run test:integration`) with:
  ```
  AssertionError: Active room 1 must appear in results: expected [ Array(1) ] to include 'test-4.2-int-001-active1-<uuid>'
  ```
  The test passed consistently in isolation (`bun run test:integration bookings.test.ts`).
- **Root cause:** `rooms.test.ts` calls `truncateRoomTables()` in `beforeEach` hooks, which issues
  `TRUNCATE TABLE rooms CASCADE` and `TRUNCATE TABLE bookings CASCADE`. When vitest runs
  integration files in parallel (the default), a rooms.test.ts worker can truncate the shared DB
  while a bookings.test.ts worker is mid-execution in `4.2-INT-001`. Specifically: rooms seeded by
  the test are committed (auto-commit, no transaction), but before `getWeekCalendar()` executes,
  the rooms table is wiped by a parallel worker. The result is `getWeekCalendar()` returns 0 or 1
  unrelated rooms.
- **Fix applied:** Added `fileParallelism: false` to the integration project in `vite.config.ts`.
  This serializes integration test file execution, eliminating all cross-file DB races. Tests within
  each file continue to run sequentially (vitest default for non-concurrent describe blocks).
- **Verification:** Full suite (`bun run test:integration`) with `fileParallelism: false` shows
  zero Story 4.x failures. Only pre-existing Stories 2.x failures remain (ECONNREFUSED — dev server
  not running locally; AUTH_SECRET not set — both are env-only failures that CI provides).

### LOW — ACCEPTED (no code change applied)

**[Isolation] `4.2-INT-001` does not clean up seeded rooms and bookings after test completion**

- **File:** `tests/integration/bookings.test.ts`, lines 615–723
- **Category:** missing-cleanup (advisory)
- **Description:** `4.2-INT-001` seeds 2 active rooms, 1 inactive room, and 4 bookings via direct
  SQL. These rows are not deleted in an `afterAll` or `finally` block. With `fileParallelism: false`,
  this is benign: `rooms.test.ts` runs `TRUNCATE rooms CASCADE` at the start of each of its own
  describe blocks, so the seeded rooms are wiped before any rooms.test.ts assertions run. The
  bookings table is also explicitly truncated in `truncateRoomTables()`. Within Testcontainers, each
  test run starts from a clean database.
- **Decision:** ACCEPTED — isolation is fully provided by (1) `fileParallelism: false` serialization,
  (2) UUID-keyed IDs preventing identity collision, and (3) Testcontainers fresh-DB-per-run. Adding
  explicit cleanup would be defensive-in-depth but is not required for correctness.

### LOW — ACCEPTED (no code change applied)

**[Determinism] Fixed future timestamps will become past timestamps after July 2026**

- **File:** `tests/integration/bookings.test.ts`, 4.2-INT-001 and 4.2-INT-002
- **Category:** time-dependency (advisory)
- **Description:** `4.2-INT-001` and `4.2-INT-002` use fixed timestamps in July 2026
  (e.g., `'2026-07-14T00:00:00.000Z'` as weekStart). After those dates pass, the inserted
  bookings will carry past timestamps. PostgreSQL `tstzrange` range-overlap queries and GiST
  EXCLUDE operate identically on past vs. future timestamps — no behavioral difference. There is no
  assertion comparing against `CURRENT_TIMESTAMP`. The test remains functionally correct.
- **Decision:** ACCEPTED — not a correctness risk. Consistent with the established approach in
  Story 3.4 and Story 4.1 tests.

---

## Key Strengths

1. **`4.2-UNIT-001` is a robust schema-level guard**: The test queries `pg_constraint` →
   `pg_class` → `pg_am` to verify that the `bookings_no_overlap` EXCLUDE constraint's implicit
   index uses the GiST access method (`amname = 'gist'`). This is the correct query path — it
   proves the index exists and is GiST, without relying on `pg_indexes.indexname` naming
   conventions that could vary. The constraint name `bookings_no_overlap` is stable and defined
   in the migration.

2. **`4.2-INT-002` correctly uses a dedicated client for session-level SET**: The test calls
   `pool.connect()` to obtain a dedicated client, runs `SET enable_seqscan = off` and
   `EXPLAIN ANALYZE` on the same connection, then releases. Using `pool.query()` would have been
   wrong — it may dispatch each query to a different connection from the pool, causing the GUC
   to be lost. The current implementation is the architecturally correct approach.

3. **`4.2-INT-001` seeding strategy is thorough**: The test seeds exactly the data matrix required
   to assert all aspects of AC-1 — 2 active rooms with bookings, 1 inactive room with a booking
   (proves inactive filtering), and 1 cancelled booking for an active room (proves status filtering).
   This 4-case seed matrix gives full assertion coverage of `getWeekCalendar()` behavior.

4. **`getWeekCalendar()` implementation is correct and complete**: The query separates active-room
   fetching from booking fetching into two queries, then joins in application code via a `Map`.
   This avoids a complex SQL JOIN while remaining efficient for the expected data sizes (tens of
   rooms, hundreds of bookings per week). The `tstzrange && ...` overlap operator ensures
   partial-week bookings are included.

5. **Dynamic import prevents compilation failure during red phase**: Both `4.2-INT-001` and
   `4.2-INT-002` import `getWeekCalendar` via `await import('../../src/lib/server/db/queries/bookings.js')`
   inside the test body. This matches the ATDD pattern established in Story 4.1 — the test file
   remains compilable even when the implementation file does not yet exist.

6. **No Thai text hardcoded**: All string assertions use English mock data (room names contain
   UUIDs, status strings are `'active'`/`'cancelled'`). Complies with the project-wide rule that
   Rawinan handles all Thai translations.

7. **Scenario IDs and priority markers follow project conventions**: `[P0] 4.2-UNIT-001`,
   `[P1] 4.2-INT-001`, `[P1] 4.2-INT-002` — IDs match `test-design-epic-4.md` exactly. Priority
   markers `[P0]`/`[P1]` are correct per AC criticality. No deviations from the naming schema.

---

## Architecture Notes

**`fileParallelism: false` is the correct scope for the fix:**
The alternative — adding per-test cleanup to `4.2-INT-001` — would not prevent the race.
`rooms.test.ts` TRUNCATEs before its own `beforeEach` tests run, which means even if
`bookings.test.ts` cleaned up after `4.2-INT-001`, a later rooms.test.ts `beforeEach` running
concurrently with `4.2-INT-002` would still cause races. The truncation is a cross-file problem
that only `fileParallelism: false` (file-level serialization) can solve.

**Composite GiST index `(room_id, during)` is sufficient for AC-2:**
The `bookings_no_overlap` EXCLUDE USING gist constraint on `(room_id, during)` implicitly creates
a composite GiST index. A composite GiST index where the first column is `room_id` (btree_gist
type) supports range queries on `during` alone via a full index scan — the planner can use it when
`enable_seqscan = off`. The dev agent record confirms no additional dedicated `CREATE INDEX` on
`(during)` alone was needed.

**Booking-to-room join strategy:**
`getWeekCalendar()` fetches all active rooms, then all bookings for the week in two separate
queries, then groups bookings by `roomId` in a `Map`. This strategy is intentional — it avoids an
outer-join SQL query whose plan is harder to verify. The two-query approach also makes the
GiST index EXPLAIN test (`4.2-INT-002`) clearer: the EXPLAIN targets the bookings query directly.

**`4.2-INT-001` uses `toContain` (not exact equality) on `resultRoomIds`:**
The test asserts `resultRoomIds.toContain(activeRoomId1)` rather than checking that the array
contains exactly 2 items. This is the correct design — the integration suite may have pre-existing
rooms from earlier tests that survive through test ordering, and requiring exactly N rooms would
make the test order-dependent. The inactive-room `not.toContain` assertion handles the negative
case explicitly.

---

## Fixes Applied

| Fix | File | Change |
|-----|------|--------|
| fileParallelism: false | `vite.config.ts` | Added `fileParallelism: false` to integration project config to prevent cross-file DB race between `rooms.test.ts` (TRUNCATE) and `bookings.test.ts` (4.2-INT-001 data seeding + getWeekCalendar call) |

---

## Recommendations

1. No HIGH violations remain — the one HIGH was the `fileParallelism` race, now fixed. All Story
   4.2 tests pass in both isolation and full-suite runs.
2. If `bookings.test.ts` is ever run against a persistent shared database (not Testcontainers),
   add `DELETE FROM bookings WHERE room_id IN (activeRoomId1, activeRoomId2, inactiveRoomId)` and
   corresponding room DELETEs to a `finally` block in `4.2-INT-001` for defence-in-depth.
3. After July 2026, migrate hardcoded timestamps to relative offsets if temporal assertions are
   added. No functional impact before then.
4. Story 4.3 and 4.8 (consumers of `getWeekCalendar`) should add their own integration tests for
   the UI/dashboard rendering layer; the read-model itself is fully covered here.

---

## Next Workflow

Tests reviewed. One HIGH violation fixed (`fileParallelism: false`). No LOW violations required
code changes. All three Story 4.2 ACs are covered by ACTIVE tests. Suite is ready for CI gate
validation. All in-scope tests (`4.2-UNIT-001`, `4.2-INT-001`, `4.2-INT-002`) pass in both
isolated and full-suite runs with the `fileParallelism: false` config.
