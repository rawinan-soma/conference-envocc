---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-13'
storyId: '3.4'
storyKey: '3-4-block-time-slots'
storyFile: '_bmad-output/implementation-artifacts/3-4-block-time-slots.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-3-4-block-time-slots.md'
generatedTestFiles:
  - tests/integration/rooms.test.ts
  - tests/integration/db-schema.test.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/3-4-block-time-slots.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-3.md
  - _bmad/tea/config.yaml
  - tests/integration/rooms.test.ts
  - tests/integration/db-schema.test.ts
  - tests/support/helpers/idor-template.ts
---

# ATDD Checklist: Story 3.4 — Block Time Slots

**Date:** 2026-06-13
**Story ID:** 3.4
**Story Key:** 3-4-block-time-slots
**TDD Phase:** RED (all scaffolds are `test.skip()`)
**Execution Mode:** SEQUENTIAL (AI generation)
**Stack:** fullstack (frontend + backend)

---

## TDD Red Phase Summary

All 8 red-phase test scaffolds generated and written to disk with `test.skip()`.

- **Integration Tests (rooms.test.ts):** 7 test stubs (3.4-INT-001 through 007)
- **DB Schema Test (db-schema.test.ts):** 1 test stub (3.4-UNIT-001)
- **Total:** 8 scaffolds — all skipped until developer activates them task-by-task

Activated tests will FAIL until the feature is implemented. This is intentional (TDD red phase).

---

## Stack Detection

- **Detected Stack:** `fullstack` (SvelteKit frontend + PostgreSQL backend via Drizzle ORM)
- **Test Framework:** Vitest + pg.Pool (integration), Playwright (E2E)
- **Key Config:** `tea_use_playwright_utils: true`, `test_stack_type: auto`

**Note:** No E2E tests for Story 3.4 — the test design (test-design-epic-3.md) lists no E2E
scenarios for this story. All tests are integration-level (service + DB + HTTP).

---

## Generation Mode

**Mode selected:** AI generation (sequential)

The story acceptance criteria are clear and all scenarios are standard service-level and
DB constraint integration tests. The existing `rooms.test.ts` pattern (3.1) and
`db-schema.test.ts` pattern serve as templates. No browser recording needed.

---

## Acceptance Criteria Coverage

| AC | Description | Test IDs | Priority |
|----|-------------|----------|----------|
| AC-1 | Create block → persisted in room_blocks, returned in block list | 3.4-INT-001, 3.4-UNIT-001 | P0 / P1 |
| AC-2 | Delete block → block removed, range bookable again | 3.4-INT-005 | P1 |
| AC-3 | Block over existing booking → HTTP 422 (app-level check, not 500) | 3.4-INT-002 | P0 |
| AC-4 | Two non-overlapping blocks succeed; same-range block rejected by EXCLUDE (23P01 → 422) | 3.4-INT-003, 3.4-INT-007, 3.4-UNIT-001 | P0 / P1 / P2 |
| AC-5 | Non-admin POST block-slot route → 403 | 3.4-INT-004 | P1 |
| AC-6 | Block create → audit_log row (entity='room_block', action='create', actor_id, diff) | 3.4-INT-006 | P2 |

**Out of scope / deferred:**
- Scenario `3.4-INT-003` from test-design (booking attempt over an existing block) is
  **intentionally deferred to Story 4.4**. Story 4.4's booking service must add the block-check
  query. The test-design's "3.4-INT-003" naming collides; in rooms.test.ts:
  - `3.4-INT-003` = block-vs-block EXCLUDE (two overlapping blocks → 23P01 → 422)
  - deferred 4.4 scenario = booking-over-block conflict

---

## Test Scenarios

### 3.4-INT-001 — createBlockSlot() inserts block; listBlockSlotsForRoom() returns it [P0]

- **File:** `tests/integration/rooms.test.ts`
- **Level:** Service integration
- **AC:** 1
- **Risk:** R-003 (block slot conflict detection)
- **Activation condition:** Task 1 (schema + migration) + Task 2 (schema) + Task 3 (service) done
- **Activation:** Remove `test.skip(` → `test(`

**Red phase assertion:** `createBlockSlot()` returns a block with id + roomId; `listBlockSlotsForRoom()` returns it.

---

### 3.4-INT-002 — Block over existing booking → 422 (app-level) [P0]

- **File:** `tests/integration/rooms.test.ts`
- **Level:** Service integration
- **AC:** 3
- **Risk:** R-003, R-011
- **Activation condition:** Task 3 (service with app-level pre-check) done
- **Activation:** Remove `test.skip(` → `test(`

**Red phase assertion:** `createBlockSlot()` over a seeded booking row throws a structured
conflict error (statusCode=422 or ConflictError), NOT a raw Postgres error.

**Architecture note:** The service pre-check queries:
```sql
SELECT 1 FROM bookings WHERE room_id = $1 AND during && tstzrange($2::timestamptz, $3::timestamptz, '[)') AND status <> 'cancelled' LIMIT 1
```
This runs INSIDE the transaction before the INSERT to minimize TOCTOU window.

---

### 3.4-INT-003 — Block-vs-block EXCLUDE → 23P01 → 422 [P0]

- **File:** `tests/integration/rooms.test.ts`
- **Level:** Service integration + DB constraint
- **AC:** 4
- **Risk:** R-003
- **Activation condition:** Task 1 (migration with EXCLUDE constraint) + Task 3 (service catches 23P01) done
- **Activation:** Remove `test.skip(` → `test(`

**Red phase assertion:** Second overlapping block throws a 422-indicative conflict error
(service catches `23P01` SQLSTATE and maps to ConflictError).

---

### 3.4-INT-004 — Non-admin POST /admin/rooms/[id]/blocks → 403 [P1]

- **File:** `tests/integration/rooms.test.ts`
- **Level:** HTTP authorization (IDOR proof)
- **AC:** 5
- **Risk:** R-002
- **Activation condition:** Task 4 (requireAdmin guard via routeGuards) + Task 5 (routes) done
- **Activation:** Requires `DEV_SERVER_URL` env var; test uses `test.skipIf(!process.env['DEV_SERVER_URL'])`

**Red phase assertion:** `testOwnershipEnforcement()` asserts non-admin organizer POST → 403.

---

### 3.4-INT-005 — deleteBlockSlot() removes block [P1]

- **File:** `tests/integration/rooms.test.ts`
- **Level:** Service integration
- **AC:** 2
- **Activation condition:** Task 3 (deleteBlockSlot implemented) done
- **Activation:** Remove `test.skip(` → `test(`

**Red phase assertion:** After `deleteBlockSlot()`, `listBlockSlotsForRoom()` returns empty;
direct DB query confirms row count = 0.

---

### 3.4-INT-006 — createBlockSlot() writes audit_log row [P2]

- **File:** `tests/integration/rooms.test.ts`
- **Level:** Service integration + audit trail
- **AC:** 6
- **Risk:** R-008 (audit log missing on mutations)
- **Activation condition:** Task 3 (createBlockSlot writes writeAuditLog in transaction) done
- **Activation:** Remove `test.skip(` → `test(`

**Red phase assertion:** audit_log row with `entity='room_block'`, `action='create'`,
`actor_id`, non-null `diff` containing `roomId` and `during`.

**Note:** Story AC-6 specifies `entity='room_block'`, `action='create'`. The older test-design
doc used `'block_slot'` — the story wins.

---

### 3.4-INT-007 — Two non-overlapping blocks succeed [P2]

- **File:** `tests/integration/rooms.test.ts`
- **Level:** Service integration + DB constraint
- **AC:** 4 (partial)
- **Activation condition:** Task 3 (service + EXCLUDE constraint in place) done
- **Activation:** Remove `test.skip(` → `test(`

**Red phase assertion:** Two `createBlockSlot()` calls for non-overlapping ranges both succeed;
`listBlockSlotsForRoom()` returns 2 blocks with distinct IDs.

---

### 3.4-UNIT-001 — room_blocks table + tstzrange + EXCLUDE constraint exists [P1]

- **File:** `tests/integration/db-schema.test.ts`
- **Level:** DB schema static assertion
- **AC:** 1, 4
- **Risk:** R-003
- **Activation condition:** Task 1.1–1.3 (room-blocks.ts schema + drizzle/0006_room_blocks.sql migration applied) done
- **Activation:** Remove `test.skip(` → `test(`

**Red phase assertion:**
1. `information_schema.tables` — `room_blocks` table exists
2. `information_schema.columns` — `during` column has `udt_name='tstzrange'`
3. `pg_constraint` (`contype='x'`) — `room_blocks_no_overlap` EXCLUDE constraint exists

---

## Activation Guide (Task-by-Task)

| Task | Activate these tests | Command |
|------|---------------------|---------|
| Task 1 — Schema + migration | 3.4-UNIT-001 | `bun run test:integration --reporter=verbose` |
| Task 2 — BlockSlotSchema | (no new test; validates schema in Task 3) | — |
| Task 3 — block-slot-service.ts | 3.4-INT-001, 003, 005, 006, 007 | `bun run test:integration --reporter=verbose` |
| Task 3 (booking conflict) | 3.4-INT-002 | `bun run test:integration --reporter=verbose` |
| Task 4 + 5 — Routes | 3.4-INT-004 (requires DEV_SERVER_URL) | `DEV_SERVER_URL=http://localhost:3000 bun run test:integration` |

**Activation steps:**
1. Run `bun install` (if first run in worktree)
2. Ensure OrbStack / Postgres is running (Testcontainers)
3. Remove `test.skip(` → `test(` for the current task's test(s)
4. Run `bun run test:integration` — verify it **FAILS** first (red)
5. Implement the feature (per task in story 3.4)
6. Run again — verify it **PASSES** (green)
7. Run `bunx prettier --write . && bun run lint` before committing

---

## Prerequisites Verified

- [x] Story 3.4 has clear acceptance criteria (6 ACs)
- [x] `playwright.config.ts` present (frontend/fullstack stack confirmed)
- [x] `tests/integration/rooms.test.ts` exists (3.1 scaffolds present, appending 3.4)
- [x] `tests/integration/db-schema.test.ts` exists (appending 3.4-UNIT-001)
- [x] `tests/support/helpers/idor-template.ts` available (Story 2.7 done)
- [x] `tests/support/helpers/dev-bypass.ts` available (Story 2.2 done)
- [x] `writeAuditLog` available at `src/lib/server/services/audit.ts`
- [x] `routeGuards` registry in `hooks.server.ts` (Story 3.1 confirmed)
- [x] `requireAdmin` guard implemented and tested (Story 2.5 + 3.1 confirmed)

**Not-yet-existing (intentional — TDD red phase):**
- `src/lib/server/services/block-slot-service.ts` — to be created in Task 3
- `src/lib/server/db/schema/room-blocks.ts` — to be created in Task 1
- `src/lib/schemas/block-slot.ts` — to be created in Task 2
- `drizzle/0006_room_blocks.sql` — to be created in Task 1

---

## Architecture Notes for Dev

**Two-layer conflict detection** (story dev notes):
1. **Block-vs-block (DB EXCLUDE):** `EXCLUDE USING gist (room_id WITH =, during WITH &&)` on `room_blocks`. Catch `23P01` → throw ConflictError → surface HTTP 422.
2. **Block-over-booking (application-level):** Run `SELECT 1 FROM bookings WHERE room_id = $1 AND during && $2 AND status <> 'cancelled'` INSIDE the transaction before INSERT. Reject 422 with `m.room_block_conflict_booking()`.
3. **Booking-over-block (deferred to Story 4.4):** Not tested here. See story handoff contract.

**tstzrange pattern:** Follow `src/lib/server/db/schema/bookings.ts` — `customType<{ data: string }>({ dataType() { return 'tstzrange'; } })`. Insert as `tstzrange(startAt, endAt, '[)')`.

**Migration:** Hand-write `drizzle/0006_room_blocks.sql` (do NOT run `bun run db:generate` — ESM uuidv7 issue confirmed in Story 3.1).

**Key files to read first:**
- `src/lib/server/db/schema/bookings.ts` — tstzrange customType pattern
- `src/lib/server/services/room-service.ts` — transaction + audit log pattern
- `drizzle/0000_init.sql` — btree_gist extension reference
- `drizzle/0005_rooms.sql` — hand-written migration format reference

---

## Risks Addressed

| Risk ID | Description | Covered by |
|---------|-------------|------------|
| R-002 | IDOR: non-admin admin room routes | 3.4-INT-004 |
| R-003 | Block slot vs. booking overlap conflict | 3.4-INT-002, 3.4-INT-003 |
| R-008 | Audit log missing on room mutations | 3.4-INT-006 |
| R-011 | Block slot overlap conflict not surfaced (500 instead of 422) | 3.4-INT-002, 3.4-INT-003 |

---

## ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-3-4-block-time-slots.md` (this file)
- **Integration tests (modified):** `tests/integration/rooms.test.ts` — 7 new `test.skip()` stubs appended
- **DB schema tests (modified):** `tests/integration/db-schema.test.ts` — 1 new `test.skip()` stub appended
- **Story file:** `_bmad-output/implementation-artifacts/3-4-block-time-slots.md`

---

**Generated by:** BMad TEA Agent — ATDD Module (sequential mode)
**Workflow:** `bmad-testarch-atdd`
**Story:** 3.4 — Block Time Slots
**TDD Phase:** RED
**Date:** 2026-06-13
