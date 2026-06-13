---
baseline_commit: 8525c4b19209fcc8824ffe5c05055387a2b34f73
---

# Story 4.2: Room calendar read-model

Status: review

## Story

As a developer,
I want a single booking read-model for the week view,
so that calendar and dashboard share one query.

## Acceptance Criteria

1. **Given** rooms and bookings, **When** the week calendar data is requested (rooms × days), **Then** one read-model query function returns per-room bookings with times for the week — deactivated rooms absent.
2. **Given** the week-calendar query, **When** `EXPLAIN ANALYZE` is run with `enable_seqscan = off`, **Then** the plan contains an Index Scan or Bitmap Index Scan on `bookings` — confirming a GiST index is usable for the range-overlap access pattern.
3. **Given** the migrated schema, **When** `4.2-UNIT-001` runs, **Then** a GiST index covering `bookings(during)` is confirmed to exist (asserted in `db-schema.test.ts`).

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/server/db/queries/` directory and `bookings.ts` query file (AC: 1, 2)
  - [x] 1.1 Create directory `src/lib/server/db/queries/` — this directory does NOT exist yet; Story 4.2 creates it first.
  - [x] 1.2 Create `src/lib/server/db/queries/bookings.ts` with the `getWeekCalendar(weekStart: Date): Promise<WeekCalendarRow[]>` function (see Dev Notes for exact shape and query).
  - [x] 1.3 Export the `WeekCalendarRow` type from the same file for Story 4.3 to import.
  - [x] 1.4 Run `bun run check` — verify zero new TypeScript errors (baseline: 0 errors as of Story 4.1 review completion).

- [x] Task 2: Scaffold ATDD tests in existing test files (AC: 1, 2, 3)
  - [x] 2.1 Append `4.2-UNIT-001` to EXISTING `tests/integration/db-schema.test.ts`:
    - Activate immediately (no `test.skip`) — asserts a GiST index covering `bookings(during)` exists. The EXCLUDE constraint `bookings_no_overlap` already creates a GiST index; this test asserts it survives in the migrated schema.
    - Assert via `pg_indexes` or `pg_class`/`pg_index` that a GiST index on `bookings` referencing the `during` column exists.
    - Run `bun run test:integration` — must pass immediately (index exists from Story 1.3 EXCLUDE constraint).
  - [x] 2.2 Append `4.2-INT-001` and `4.2-INT-002` to EXISTING `tests/integration/bookings.test.ts` as `test.skip(...)`:
    - `4.2-INT-001` (P1): seed active rooms + bookings for a week → call `getWeekCalendar(weekStart)` → assert per-room bookings returned; deactivated rooms absent.
    - `4.2-INT-002` (P1): `SET enable_seqscan = off` then `EXPLAIN ANALYZE` the week-calendar query on a dedicated `pool.connect()` client → assert the plan matches `/Index Scan|Bitmap.*Index/i`. See Dev Notes for the exact test body including the client release pattern.
  - [x] 2.3 Activate `4.2-INT-001` (remove `test.skip` → `test`). Run `bun run test:integration` — expect FAIL (query not yet implemented). Implement `getWeekCalendar` (Task 1). Run again — must PASS.
  - [x] 2.4 Activate `4.2-INT-002`. Run `bun run test:integration` — must PASS (index scan confirmed via `enable_seqscan = off` probe). If the test fails (Seq Scan still appears even with seqscan disabled), the composite index `(room_id, during)` does not cover the `during`-only query — add migration `0008_booking_gist_index.sql` (see Dev Notes §GiST Index) and re-run.

- [x] Task 3: Quality gates (AC: all)
  - [x] 3.1 Run `bunx prettier --write . && bun run lint` — zero errors.
  - [x] 3.2 Run `bun run check` — zero TypeScript errors (baseline 0; must not regress).
  - [x] 3.3 Run `bun run test:integration` — `4.2-UNIT-001`, `4.2-INT-001`, `4.2-INT-002` all pass; no regressions against Story 4.1 tests (7 in `bookings.test.ts` + `4.1-UNIT-001` in `db-schema.test.ts`).
  - [x] 3.4 Run `bun run build` — build succeeds (requires DATABASE_URL placeholder, same as CI).

## Dev Notes

### Critical: What This Story Is (and Is NOT)

**Story 4.2 is a data-layer story.** The output is one new query function consumed by Story 4.3 (calendar UI) and Story 4.8 (dashboard). No routes, no Svelte components, no form actions.

**Scope:**
1. Create `src/lib/server/db/queries/bookings.ts` with `getWeekCalendar()`.
2. Append `4.2-UNIT-001` (active) to `tests/integration/db-schema.test.ts`.
3. Append `4.2-INT-001` + `4.2-INT-002` as `test.skip()` to `tests/integration/bookings.test.ts`; activate task-by-task.

**Deferred to later stories:**
- Calendar `+page.svelte`, `+page.server.ts`, `RoomCalendar.svelte`, `BookingChip.svelte` → Story 4.3
- `organizer_id`, `registration_token_hash`, `qr_token`, registration-config columns on `bookings` → Story 4.4
- Dashboard query → Story 4.8

### GiST Index: Migration Is Conditional on `4.2-INT-002` Outcome

The EXCLUDE constraint `bookings_no_overlap` in `drizzle/0000_init.sql` creates a composite GiST index on `(room_id, during)` using `btree_gist`. **Whether this composite index is sufficient for a `during`-only range query (no `room_id` filter) must be verified empirically by `4.2-INT-002`.**

**Decision rule (from Task 2.4's probe):**

- `4.2-INT-002` uses `SET enable_seqscan = off` before running `EXPLAIN ANALYZE` (see test code below). This forces the planner to use an index if one is usable.
  - **Index Scan appears in the plan** → composite index covers the `during &&` query. No new migration. `4.2-UNIT-001` is the only schema test needed.
  - **Seq Scan still appears even with `enable_seqscan = off`** → the composite index cannot serve this access pattern. Hand-write migration `0008_booking_gist_index.sql`:
    ```sql
    -- 0008_booking_gist_index.sql
    CREATE INDEX idx_bookings_during ON bookings USING gist (during);
    ```
    Follow the hand-written migration pattern in `drizzle/0007_room_blocks.sql`. Then update `4.2-UNIT-001` to also assert `idx_bookings_during` exists.

Do not pre-decide — let the probe decide. The composite index may be sufficient (non-leading column GiST scans are possible) or it may not. `4.2-INT-002` is the discriminator.

### New Directory: `src/lib/server/db/queries/`

This directory does NOT exist at baseline. Story 4.2 creates it. Architecture anticipates it at the DB layer.

- Path: `src/lib/server/db/queries/bookings.ts`
- Server-only — never imported client-side.
- Exports: `getWeekCalendar(weekStart: Date): Promise<WeekCalendarRow[]>` and `WeekCalendarRow` type.

The test-design references `src/lib/server/queries/calendar.ts` — that is an outlier. **Follow architecture, not test-design**: path is `src/lib/server/db/queries/bookings.ts`.

### `getWeekCalendar` — Query Shape and Implementation

```typescript
// src/lib/server/db/queries/bookings.ts
import { eq, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { bookings } from '../schema/bookings.js';
import { rooms } from '../schema/rooms.js';
import type { Room } from '../schema/rooms.js';
import type { Booking } from '../../services/booking-service.js';

export type WeekCalendarRow = {
  room: Room;
  bookings: Booking[];
};

/**
 * Returns per-room bookings for a 7-day window starting at weekStart.
 * - Only active rooms (is_active = true) are included.
 * - Only active/non-cancelled bookings overlapping the week window are returned.
 * - weekStart should be a Monday 00:00:00 local time (Asia/Bangkok, UTC+7).
 * - weekEnd is computed as weekStart + 7 days.
 */
export async function getWeekCalendar(weekStart: Date): Promise<WeekCalendarRow[]> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Fetch all active rooms
  const allRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.isActive, true));

  if (allRooms.length === 0) return [];

  // Fetch bookings overlapping the week range for active rooms.
  // Uses tstzrange && operator — backed by the GiST index from bookings_no_overlap.
  // Status filter excludes cancelled bookings (mirrors EXCLUDE constraint predicate).
  const weekBookings = await db
    .select()
    .from(bookings)
    .where(
      sql`${bookings.during} && tstzrange(${weekStart.toISOString()}::timestamptz, ${weekEnd.toISOString()}::timestamptz, '[)')
          AND ${bookings.status} != 'cancelled'`
    );

  // Group bookings by roomId
  const byRoom = new Map<string, Booking[]>();
  for (const booking of weekBookings) {
    const list = byRoom.get(booking.roomId) ?? [];
    list.push(booking);
    byRoom.set(booking.roomId, list);
  }

  return allRooms.map((room) => ({
    room,
    bookings: byRoom.get(room.id) ?? []
  }));
}
```

**Notes on the query:**
- The `&&` (range overlap) operator on `bookings.during` triggers the GiST index from the EXCLUDE constraint. The constraint's index is on `(room_id, during)` with btree_gist — Postgres can use it for single-column range queries on `during`.
- `status != 'cancelled'` matches the EXCLUDE predicate and filters the same rows.
- Do NOT join bookings to rooms in a single SQL join — the separate SELECT + in-memory group preserves clarity and Drizzle type-safety without writing raw SQL for the join. Story 4.3 can optimize if needed.
- `weekStart` is a JavaScript `Date` in UTC. The caller (Story 4.3's `+page.server.ts`) is responsible for constructing the correct `weekStart` (Monday midnight Asia/Bangkok = Monday midnight UTC−7 hours). Story 4.2 is not responsible for timezone conversion.

### Existing Schema State (Story 4.1 Baseline)

```typescript
// src/lib/server/db/schema/bookings.ts — current at Story 4.1 completion
export const bookings = pgTable('bookings', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  roomId: text('room_id').notNull(),
  during: tstzrange('during').notNull(),
  status: text('status').notNull().default('active')
});
export type BookingInsert = typeof bookings.$inferInsert;
// Note: 'Booking' type is exported from booking-service.ts as:
//   export type Booking = typeof bookings.$inferSelect;
```

The `Booking` type exported from `booking-service.ts` (added in Story 4.1) is the canonical type alias. Import it from there. Do NOT re-export a duplicate from the query file.

`Room` is exported from `src/lib/server/db/schema/rooms.ts`:
```typescript
export type Room = typeof rooms.$inferSelect;
```

### `4.2-UNIT-001` — GiST Index Assertion (Append to `db-schema.test.ts`)

Append to EXISTING `tests/integration/db-schema.test.ts` after the `4.1-UNIT-001` block. Activate immediately (no `test.skip`).

**Strategy:** Query `pg_indexes` for a GiST index on `bookings` covering the `during` column, OR query `pg_class`/`pg_index` for the `bookings_no_overlap` constraint index (which is a GiST index by definition of `EXCLUDE USING gist`).

Recommended approach — assert via `pg_constraint` that the `bookings_no_overlap` EXCLUDE constraint (which IS a GiST index) exists AND assert its index type is GiST:

```typescript
// 4.2-UNIT-001 — append to tests/integration/db-schema.test.ts
describe("Story 4.2 — DB Schema: GiST index on bookings(during) exists (AC-3, R-007)", () => {
  test("[P0] 4.2-UNIT-001 — a GiST index covering bookings.during exists in migrated schema", async () => {
    // The bookings_no_overlap EXCLUDE USING gist constraint creates an implicit GiST index
    // on (room_id, during). This test asserts that index exists and is of type GiST.
    // R-007 mitigation: confirms range-overlap queries are index-backed.
    //
    // Strategy: join pg_constraint → pg_class (index) → pg_am (access method)
    // to confirm the access method is 'gist'.
    const result = await pool.query<{ amname: string }>(`
      SELECT am.amname
      FROM pg_constraint c
      JOIN pg_class idx ON idx.oid = c.conindid
      JOIN pg_am am ON am.oid = idx.relam
      WHERE c.conname = 'bookings_no_overlap'
        AND c.conrelid = 'bookings'::regclass
    `);

    expect(
      result.rows.length,
      "bookings_no_overlap constraint not found — migration 0000_init.sql must have run"
    ).toBe(1);

    expect(
      result.rows[0]?.amname,
      "bookings_no_overlap constraint index must be a GiST index (amname = 'gist')"
    ).toBe('gist');
  });
});
```

This test passes immediately because the EXCLUDE constraint from Story 1.3 is already present.

### `4.2-INT-001` — Week Calendar Returns Correct Data (Append to `bookings.test.ts` as `test.skip`)

```typescript
// 4.2-INT-001 — append to tests/integration/bookings.test.ts as test.skip()
describe('Story 4.2 — Week Calendar Read-Model: Correct Data (P1)', () => {
  test.skip('[P1] 4.2-INT-001 — getWeekCalendar returns per-room bookings; deactivated rooms absent', async () => {
    // Activate at Task 2.3 after getWeekCalendar() is implemented.
    // Seed: 2 active rooms, 1 inactive room, bookings for week
    // Assert: result contains only active rooms; inactive room absent;
    //         bookings grouped by room correctly.
    const { getWeekCalendar } = await import('../../src/lib/server/db/queries/bookings.js');
    // ... seed via raw SQL, call getWeekCalendar(), assert shape
  });
});
```

Scaffold the full test body in Task 2.2 (seed active/inactive rooms, seed bookings, call `getWeekCalendar`, assert `room.id` present for active rooms, absent for inactive room, `bookings` array contains correct entries).

### `4.2-INT-002` — EXPLAIN ANALYZE: Index Scan Confirmed (Append to `bookings.test.ts` as `test.skip`)

**Important:** Do NOT use `pool.query` for this test. The `SET enable_seqscan = off` directive only applies to the current connection session. Use `pool.connect()` to acquire a dedicated client, run `SET` and `EXPLAIN ANALYZE` on the same client, then release. Using `pool.query` may hand you different connections for the two calls and the `SET` will have no effect.

```typescript
// 4.2-INT-002 — append to tests/integration/bookings.test.ts as test.skip()
describe('Story 4.2 — Week Calendar Read-Model: Index-Backed Query (P1)', () => {
  test.skip('[P1] 4.2-INT-002 — EXPLAIN ANALYZE confirms GiST index is usable for range-overlap query (R-007)', async () => {
    // Activate at Task 2.4 after 4.2-INT-001 passes.
    //
    // Strategy: SET enable_seqscan = off forces the planner to use an index if any
    // applicable one exists. If a Seq Scan still appears after this SET, the composite
    // GiST index (room_id, during) cannot serve the during-only query — trigger the
    // migration fallback in Task 2.4.
    //
    // MUST use a dedicated client (pool.connect()) so SET + EXPLAIN run on the same
    // connection. pool.query() may assign different connections per call.
    const client = await pool.connect();
    try {
      await client.query('SET enable_seqscan = off');
      const explainResult = await client.query<{ 'QUERY PLAN': string }>(`
        EXPLAIN (ANALYZE, FORMAT TEXT)
        SELECT * FROM bookings
        WHERE during && tstzrange(
          '2026-07-14 00:00:00+07'::timestamptz,
          '2026-07-21 00:00:00+07'::timestamptz,
          '[)'
        )
        AND status != 'cancelled'
      `);
      const plan = explainResult.rows.map((r) => r['QUERY PLAN']).join('\n');
      // Positive assertion: planner chose an index-based strategy (Index Scan or Bitmap Index Scan).
      // If this fails even with enable_seqscan=off, the index is not usable for this access pattern
      // → add migration 0008_booking_gist_index.sql (see §GiST Index in Dev Notes).
      expect(plan, 'GiST index must be usable for during && range query (enable_seqscan=off, planner must pick Index Scan)').toMatch(/Index Scan|Bitmap.*Index/i);
    } finally {
      client.release();
    }
  });
});
```

### Audit Log

No audit log required for read operations. `getWeekCalendar` is a pure read — no `writeAuditLog` call.

### Quality Gate Notes

- Run `bunx prettier --write . && bun run lint` BEFORE every commit (mandatory per project memory).
- TypeScript baseline post Story 4.1: 0 errors. `bun run check` must not produce new errors.
- `bun run test:integration` baseline post Story 4.1: 7 active tests in `bookings.test.ts` + `4.1-UNIT-001` in `db-schema.test.ts` — all must remain green.
- Tests activated at story end: `4.2-UNIT-001` (Task 2.1), `4.2-INT-001` (Task 2.3), `4.2-INT-002` (Task 2.4).

### Project Structure Notes

- New directory: `src/lib/server/db/queries/` — first file ever in this path; must create the directory.
- New file: `src/lib/server/db/queries/bookings.ts` — query module (server-only; never import client-side).
- Modified test files:
  - `tests/integration/db-schema.test.ts` — append `4.2-UNIT-001` (active immediately).
  - `tests/integration/bookings.test.ts` — append `4.2-INT-001` + `4.2-INT-002` as `test.skip()`.
- Migration files: conditional on `4.2-INT-002` probe outcome (see §GiST Index). Only add `drizzle/0008_booking_gist_index.sql` if the probe shows Seq Scan with `enable_seqscan = off`.
- No new schema files, no service files, no route files, no Svelte components.

### References

- Story 4.2 ACs: `_bmad-output/planning-artifacts/epics.md` Epic 4, Story 4.2 (GH Issue #22, lines 607–621)
- R-007 risk mitigation (GiST index, EXPLAIN ANALYZE): `_bmad-output/test-artifacts/test-design/test-design-epic-4.md` (R-007, 4.2-UNIT-001, 4.2-INT-001, 4.2-INT-002)
- Architecture directory tree (db/queries path): `_bmad-output/planning-artifacts/architecture.md` §Directory Tree
- NFR-003 performance < 3s: `_bmad-output/planning-artifacts/architecture.md` §Non-Functional Requirements
- Existing EXCLUDE constraint (GiST index source): `drizzle/0000_init.sql` (lines 22–29, `bookings_no_overlap`)
- Bookings schema (current): `src/lib/server/db/schema/bookings.ts`
- Booking type alias: `src/lib/server/services/booking-service.ts` (`export type Booking = typeof bookings.$inferSelect`)
- Rooms schema + Room type: `src/lib/server/db/schema/rooms.ts`
- db export (pool + drizzle instance): `src/lib/server/db/index.ts`
- Previous story (4.1) precedent — no migration when constraint already exists: `_bmad-output/implementation-artifacts/4-1-conflict-translation-exclude-predicate.md` (§Critical: What This Story Is)
- Test header pattern: `tests/integration/bookings.test.ts` (lines 1–67)
- db-schema test pattern: `tests/integration/db-schema.test.ts` (lines 459–512, `4.1-UNIT-001`)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues encountered. 4.2-INT-002 probe result: composite GiST index on
`(room_id, during)` IS sufficient for the `during`-only range query — no migration needed.
The `enable_seqscan = off` probe confirmed an Index Scan path was available. Migration
`0008_booking_gist_index.sql` was NOT created (per the decision rule in Dev Notes §GiST Index).

### Completion Notes List

- Created `src/lib/server/db/queries/` directory (first time in project).
- Created `src/lib/server/db/queries/bookings.ts` with `getWeekCalendar(weekStart: Date): Promise<WeekCalendarRow[]>` and exported `WeekCalendarRow` type.
- Activated `4.2-INT-001` (was `test.skip`) — passes: per-room bookings returned, deactivated rooms absent, cancelled bookings excluded.
- Activated `4.2-INT-002` (was `test.skip`) — passes: composite GiST index on `(room_id, during)` confirmed usable for `during`-only range overlap query. No new migration required.
- All Story 4.1 regression tests remain green (7 bookings tests + 4.1-UNIT-001 in db-schema.test.ts).
- `4.2-UNIT-001` (active from ATDD phase) confirmed GiST index exists via `bookings_no_overlap` constraint.
- `bun run check`: 0 TypeScript errors. `bunx prettier --write . && bun run lint`: 0 errors. `bun run build`: succeeded (warnings are pre-existing, not introduced by this story).

### File List

- `src/lib/server/db/queries/bookings.ts` (created)
- `tests/integration/bookings.test.ts` (modified — activated 4.2-INT-001 and 4.2-INT-002)
- `_bmad-output/implementation-artifacts/4-2-room-calendar-read-model.md` (story file)

## Change Log

- 2026-06-13: Implementation complete — created `src/lib/server/db/queries/bookings.ts` with `getWeekCalendar()`, activated `4.2-INT-001` and `4.2-INT-002`. All ACs satisfied. No migration needed (composite GiST index sufficient). Status → review.
