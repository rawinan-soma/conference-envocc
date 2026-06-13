---
baseline_commit: 8525c4b19209fcc8824ffe5c05055387a2b34f73
---

# Story 4.1: Conflict Translation & EXCLUDE Predicate

Status: review

## Story

As a developer,
I want booking writes to catch `23P01` exclusion violations and translate them to typed conflict errors,
so that conflicts surface as clean localized errors, not 500s.

## Acceptance Criteria

1. **Given** the `bookings_no_overlap` EXCLUDE constraint, **When** the migration is applied, **Then** the predicate `WHERE (status != 'cancelled')` is present — confirmed by a static assertion in `db-schema.test.ts` (`4.1-UNIT-001`).
2. **Given** two concurrent insert attempts for the same room and time slot, **When** N=5 parallel transactions are submitted, **Then** exactly one commits and the rest raise Postgres error `23P01` — proven by `4.1-CONC-001` (AR-11 mandatory, must pass in PR gate).
3. **Given** a booking write that triggers the EXCLUDE constraint, **When** Postgres returns `23P01`, **Then** `booking-service.ts` catches it, walks the error cause chain, and throws `ConflictError` carrying key `booking_conflict_error`.
4. **Given** a `ConflictError` thrown by the booking service, **When** it reaches the form action in a future story (4.4), **Then** the response is HTTP 422 with a localized field-level message — the Paraglide key `booking_conflict_error` must exist in `messages/en.json` (added in this story) and a placeholder in `messages/th.json`.

## Tasks / Subtasks

- [x] Task 1: Add `booking_conflict_error` Paraglide message key (AC: 4)
  - [x] 1.1 In `messages/en.json`, add: `"booking_conflict_error": "This time range conflicts with an existing booking."` (alphabetical or near existing `room_block_conflict_*` keys).
  - [x] 1.2 In `messages/th.json`, add placeholder: `"booking_conflict_error": ""` — Rawinan provides the Thai translation; never write Thai text in code.
  - [x] 1.3 Run `bun run check` — verify Paraglide regenerates the `m.booking_conflict_error()` function with zero TypeScript errors.

- [x] Task 2: Create `tests/integration/bookings.test.ts` ATDD scaffold, then implement `booking-service.ts` (AC: 2, 3)
  - [x] 2.1 Create `tests/integration/bookings.test.ts` following the `rooms.test.ts` header pattern (comment block with AC coverage, scenario IDs, prerequisites, architecture requirements).
  - [x] 2.2 Scaffold ALL Story 4.1 scenarios as `test.skip(...)` — file must be fully scaffolded before any are activated:
    - `4.1-CONC-001` (P0, AR-11 mandatory): N=5 concurrent inserts on same room+slot → assert exactly one succeeds, rest raise `23P01`.
    - `4.1-INT-001` (P0): sequential conflict → `23P01` caught → `ConflictError` thrown (service-layer call assertion).
    - `4.1-INT-002` (P0): cancelled booking does not block → cancel booking A, create booking B for same slot → B succeeds.
    - `4.1-INT-003` (P0): `23P01` maps to typed `ConflictError`, not raw exception or 500.
    - `4.1-INT-004` (P1): back-to-back bookings (10:00–11:00 + 11:00–12:00 same room) both succeed — `[)` half-open confirmed.
    - `4.1-INT-005` (P1): conflict response body never contains raw `23P01` string.
    - `4.1-INT-006` (P2): same room on different days — no conflict.
  - [x] 2.3 Activate `4.1-INT-001` only (remove `test.skip(` → `test(`). Run `bun run test:integration` — expect FAIL (service not yet created).
  - [x] 2.4 Create `src/lib/server/services/booking-service.ts`:
    - Export `ConflictError` class (pattern from `block-slot-service.ts`): `readonly statusCode = 422; readonly key: string`.
    - Define a minimal local input type for 4.1's scope only — NOT the full booking form schema (that belongs in Story 4.4): `type CreateBookingInput = { startAt: string; endAt: string; };`. Do NOT create `$lib/schemas/booking.ts` or a Valibot booking schema — those are 4.4 concerns.
    - Export `createBooking(actorId: string, roomId: string, input: CreateBookingInput): Promise<typeof bookings.$inferSelect>`. The return type can also be expressed by adding `export type Booking = typeof bookings.$inferSelect;` to `src/lib/server/db/schema/bookings.ts` (mirrors `RoomBlock` export pattern) — either approach is fine.
    - Inside a `db.transaction()`: INSERT into `bookings` using `tstzrange(${input.startAt}::timestamptz, ${input.endAt}::timestamptz, '[)')`. Include only `roomId`, `during`, and optionally `status: 'active'` in insert values — no `id` (DB generates it).
    - Catch block: walk error cause chain for `pgCode === '23P01'` → `throw new ConflictError('booking_conflict_error')`.
    - Write `writeAuditLog(tx, { actorId, entity: 'booking', action: 'create', diff })` inside the transaction.
    - Do NOT include an application-level overlap pre-check (SELECT before INSERT) — the EXCLUDE constraint is the sole authority; a pre-check reintroduces the TOCTOU race that `4.1-CONC-001` exists to close.
  - [x] 2.5 Run `bun run test:integration` — `4.1-INT-001` must pass (green).
  - [x] 2.6 Activate `4.1-CONC-001`. Run `bun run test:integration` — must pass (concurrent inserts: exactly one succeeds, rest raise `23P01`).

- [x] Task 3: Add `4.1-UNIT-001` static assertion to `db-schema.test.ts` (AC: 1)
  - [x] 3.1 Open `tests/integration/db-schema.test.ts`. Append test following the existing test patterns in that file. Activate immediately (no `test.skip` — this test passes from day one).
  - [x] 3.2 Assert the EXCLUDE constraint predicate `WHERE (status != 'cancelled')` is present. Used live-DB `pg_get_constraintdef()` query. Regex updated to handle Postgres normalization (`::text` cast + double parens). Run `bun run test:integration` — passes immediately.

- [x] Task 4: Quality gates (AC: all)
  - [x] 4.1 Run `bunx prettier --write . && bun run lint` — zero errors.
  - [x] 4.2 Run `bun run check` — zero TypeScript errors (0 errors, improved from baseline).
  - [x] 4.3 Run `bun run test:integration` — `4.1-UNIT-001`, `4.1-INT-001`, `4.1-CONC-001` pass; no regressions.
  - [x] 4.4 Run `bun run build` — build succeeds (requires DATABASE_URL placeholder, same as CI).

## Dev Notes

### Critical: What This Story Is (and Is NOT)

**Story 4.1 is a service-layer + test story.** The EXCLUDE constraint with predicate `WHERE (status != 'cancelled')` was shipped in Story 1.3 and is already present in `drizzle/0000_init.sql` (lines 23–29, constraint name `bookings_no_overlap`). Do NOT write a new migration to add or modify this constraint — a second migration would conflict. The `4.1-UNIT-001` test only *asserts* the existing predicate is present.

**Scope of Story 4.1:**
1. Add `booking_conflict_error` Paraglide key (missing from `messages/en.json` as of baseline).
2. Create `src/lib/server/services/booking-service.ts` with minimal `createBooking` + `ConflictError` + `23P01` catch.
3. Static predicate assertion (`4.1-UNIT-001`) appended to `tests/integration/db-schema.test.ts`.
4. ATDD red-phase scaffold in new `tests/integration/bookings.test.ts`.

**Deferred to later stories:**
- Booking form/route (`(app)/bookings/new/+page.server.ts`) → Story 4.4
- `organizer_id`, `registration_token_hash`, `qr_token`, registration-config columns on bookings → Story 4.4
- HTTP-422 rendering via superforms `fail(422, { form })` → Story 4.4
- UUID v7 PK for bookings (currently serial integer) → Story 4.4

### ConflictError Pattern (Copy from block-slot-service.ts)

The `ConflictError` class and the `23P01` cause-chain walk already exist in `src/lib/server/services/block-slot-service.ts`. Copy the exact pattern — do NOT reinvent:

```typescript
export class ConflictError extends Error {
  readonly statusCode = 422;
  readonly key: string;
  constructor(key: string) {
    super(key);
    this.name = 'ConflictError';
    this.key = key;
  }
}
```

Cause-chain walk (Drizzle may wrap `pg` errors in `DrizzleQueryError`):

```typescript
let pgCode: string | undefined;
let cur: unknown = err;
while (cur instanceof Error) {
  if ('code' in cur && typeof (cur as { code?: unknown }).code === 'string') {
    pgCode = (cur as { code: string }).code;
    break;
  }
  cur = cur.cause;
}
if (pgCode === '23P01') {
  throw new ConflictError('booking_conflict_error');
}
throw err;
```

**Key differences from block-slot-service.ts:**
- `block-slot-service.ts` has an application-level pre-check (SELECT bookings before INSERT into room_blocks) because it handles *cross-table* conflict detection (block-over-booking). `booking-service.ts` does NOT need a pre-check — booking-vs-booking conflict is handled entirely by the DB EXCLUDE constraint. A pre-check reintroduces the exact TOCTOU race that `4.1-CONC-001` exists to eliminate.
- `block-slot-service.ts` inserts with `id: uuidv7()` because room_blocks uses a UUID PK. `bookings` uses `serial`/`generatedAlwaysAsIdentity` — **do NOT pass `id` in the INSERT values**; the DB generates it.
- `block-slot-service.ts` accepts `BlockSlotInput` from `$lib/schemas/block-slot.ts` (a Valibot schema). Story 4.1 does NOT create a Valibot booking schema — that belongs to Story 4.4's form layer. Use a minimal inline type `{ startAt: string; endAt: string }` instead.
- `block-slot-service.ts` imports `BlockSlotInput` from a schema file and returns `RoomBlock` (exported from room-blocks.ts). For 4.1, use `typeof bookings.$inferSelect` as the return type, or export a `Booking` type alias from `bookings.ts`.

### Bookings Schema (Current State)

File: `src/lib/server/db/schema/bookings.ts`

```typescript
// Current schema — integer PK (not UUID v7; Story 4.4 will migrate)
export const bookings = pgTable('bookings', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  roomId: text('room_id').notNull(),
  during: tstzrange('during').notNull(),
  status: text('status').notNull().default('active')
});
export type BookingInsert = typeof bookings.$inferInsert;
```

The `BookingInsert` type does NOT include `id` (generated by DB). INSERT values must match current schema columns: `roomId`, `during`, `status` (optional, defaults to `'active'`).

### tstzrange Expression (Half-Open `[)`)

Construct the range for INSERT using:

```typescript
sql`tstzrange(${input.startAt}::timestamptz, ${input.endAt}::timestamptz, '[)')`
```

Half-open `[)` means back-to-back bookings (10:00–11:00 and 11:00–12:00) are adjacent, not overlapping. `&&` operator in Postgres returns false for adjacent `[)` ranges. This is why `4.1-INT-004` must assert both succeed.

### `booking_conflict_error` Message Key

Architecture (§Error Handling) names this key explicitly as `m.booking_conflict_error()`. It is NOT present in `messages/en.json` at baseline. Add it in Task 1.1.

English value: `"This time range conflicts with an existing booking."`

Thai placeholder: `""` — Rawinan provides the Thai translation. Never write Thai text in code or mocks.

Note the difference from existing keys in `messages/en.json`:
- `"room_block_conflict_error"` — block-vs-block conflict
- `"room_block_conflict_booking"` — block-over-booking conflict
- `"booking_conflict_error"` — booking-vs-booking conflict (NEW in Story 4.1)

### Test File: `tests/integration/bookings.test.ts`

This is a NEW file (does not exist at baseline). Follow the `rooms.test.ts` header pattern exactly:
- Comment block with story reference, AC coverage, scenario IDs (P0/P1/P2), activation guide, prerequisites, architecture requirements.
- Import Testcontainers Postgres fixture from `tests/support/fixtures/pg-factory.ts`.
- All tests start as `test.skip(...)` — activated task-by-task per ATDD discipline.
- No hardcoded Thai strings — all string assertions use English mock data for seeding.

### `4.1-CONC-001` — AR-11 Mandatory Concurrent Test

This is non-negotiable. Architecture rule AR-11 mandates a concurrent double-booking test. It must:
- Use N ≥ 5 parallel transactions each attempting to INSERT a booking for the same `roomId` + `during` range via the Testcontainers Postgres pool (direct `pg` pool calls, not via the service layer — to test the constraint directly).
- Assert exactly one INSERT succeeds (exactly one row in bookings after all N attempts).
- Assert the rest raise an error with `code === '23P01'` (or are rolled back).
- Run in the PR gate (not nightly-only). It must be in `bookings.test.ts`.

### `4.1-UNIT-001` — Static Predicate Assertion

Append to EXISTING file `tests/integration/db-schema.test.ts`. Assert the `bookings_no_overlap` EXCLUDE constraint predicate contains `WHERE (status != 'cancelled')`.

**Preferred approach:** Use `pg_get_constraintdef()` via live-DB `pool.query` — consistent with the file's existing style (`1.3-INT-001` does this). Example query: `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'bookings_no_overlap'`. Assert the returned string includes `WHERE (status <> 'cancelled')` or `WHERE (status != 'cancelled')`.

**Alternative:** Read `drizzle/0000_init.sql` via `fs.readFileSync` and assert the string `WHERE (status != 'cancelled')` is present. Simpler but doesn't reflect actual migrated state.

This test passes immediately at red-phase because the predicate already exists from Story 1.3.

### Audit Log

`writeAuditLog(tx, { actorId, entity: 'booking', action: 'create', diff })` must be called inside the transaction in `createBooking`. Entity name is `'booking'` (not `'bookings'`). The `diff` should include `{ roomId, during: '[startAt, endAt)' }`.

Source: `src/lib/server/services/audit.ts` — `writeAuditLog(tx: DrizzleTransaction, entry: AuditLogEntry): Promise<void>`.

### Quality Gate Notes

- Run `bunx prettier --write . && bun run lint` BEFORE every commit (mandatory per project memory; Task 4.1).
- Baseline TypeScript error count: 46 pre-existing errors. `bun run check` must not produce new errors above this count.
- `bun run test:integration` baseline: 45 pass, 21 skip — no regression allowed.
- Tests activated at story end: `4.1-UNIT-001` (Task 3), `4.1-INT-001` (Task 2.3), `4.1-CONC-001` (Task 2.6). All remaining 4.1 scenarios stay `test.skip()` for later stories to activate.

### Project Structure Notes

- `booking-service.ts` is the correct name per `architecture.md` (§Code Structure, line 349 + §Directory Tree, line 526). The test-design file references `bookings.ts` as the service — that is an outlier; follow architecture.
- Service location: `src/lib/server/services/booking-service.ts`
- New test file: `tests/integration/bookings.test.ts` (not under `src/`)
- Modified test file: `tests/integration/db-schema.test.ts` (append `4.1-UNIT-001`)
- Message files: `messages/en.json` (add key), `messages/th.json` (add placeholder)

### References

- EXCLUDE constraint DDL already shipped: `drizzle/0000_init.sql` (lines 22–29)
- ConflictError + cause-chain pattern: `src/lib/server/services/block-slot-service.ts` (lines 34–122)
- Current bookings schema: `src/lib/server/db/schema/bookings.ts`
- Audit log helper: `src/lib/server/services/audit.ts`
- Test header pattern: `tests/integration/rooms.test.ts` (lines 1–60)
- Architecture service naming: `_bmad-output/planning-artifacts/architecture.md` §Code Structure (line 349), §Directory Tree (line 526)
- Concurrent test requirement: AR-11 in `_bmad-output/planning-artifacts/architecture.md`; test-design-epic-4.md R-002
- Message key: `_bmad-output/planning-artifacts/architecture.md` §Error Handling (`m.booking_conflict_error()`)
- Story ACs: `_bmad-output/planning-artifacts/epics.md` Epic 4, Story 4.1 (GH Issue #21)
- Test scenarios: `_bmad-output/test-artifacts/test-design/test-design-epic-4.md` (P0: `4.1-CONC-001`, `4.1-INT-001–003`; P1: `4.1-INT-004–005`, `4.1-UNIT-001`; P2: `4.1-INT-006`)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `seedOrganizer` in the ATDD scaffold used wrong table name `"user"` instead of `"users"`. Fixed to return UUID directly since `audit_log.actor_id` is plain text with no FK constraint.
- `4.1-UNIT-001` regex `/WHERE\s*\(status\s*<>\s*'cancelled'\)/i` failed because Postgres normalizes the constraint def to `WHERE ((status <> 'cancelled'::text))` (double parens + `::text` cast). Fixed regex to `/WHERE\s*\(*\s*status\s*<>\s*'cancelled'/i`.
- `4.1-CONC-001` flake diagnosed: under high concurrent load (50-iteration stress test within a single Testcontainers session), Postgres GiST EXCLUDE constraint losers occasionally receive `40P01` (deadlock_detected) instead of `23P01` (exclusion_violation). The strict `r.code === '23P01'` assertion broke on `40P01` results. Fixed: replaced the strict 23P01-only count with `legitimateCodes = Set(['23P01', '40P01'])` and asserted `legitimateRejections.length === N - 1` (strict count preserved). AR-11 states "assert the rest raise 23P01 **or are rolled back**" — a deadlock victim IS rolled back, so 40P01 is AC-compliant. Critical invariants (`committed.length === 1` and `COUNT(*) === 1`) remain strictly asserted.

### Completion Notes List

- Task 1: Added `"booking_conflict_error": "This time range conflicts with an existing booking."` to `messages/en.json` (near `room_block_conflict_*` keys). Added placeholder `""` to `messages/th.json`. `bun run check` passes with 0 errors.
- Task 2: Created `src/lib/server/services/booking-service.ts` with `ConflictError` (copied from `block-slot-service.ts`), `CreateBookingInput` minimal type, `Booking` type alias, and `createBooking()`. No app-level pre-check — EXCLUDE constraint is sole authority. Cause-chain walk catches `23P01` → `ConflictError('booking_conflict_error')`. Audit log written inside transaction with `entity: 'booking'`. Activated `4.1-INT-001` (green) then `4.1-CONC-001` (green). INT-002 through INT-006 remain `test.skip()` per story scope.
- Task 3: Activated `4.1-UNIT-001` in `tests/integration/db-schema.test.ts`. Updated regex to handle Postgres's `::text` normalization. Passes immediately.
- Task 4: prettier/lint — zero errors. TypeScript check — 0 errors (improved from 22 baseline, booking-service.ts created). Integration tests — 3 new passing tests (`4.1-UNIT-001`, `4.1-INT-001`, `4.1-CONC-001`), no regressions. Build succeeds with DATABASE_URL placeholder.

### File List

- `_bmad-output/implementation-artifacts/4-1-conflict-translation-exclude-predicate.md` (story file — updated)
- `messages/en.json` (added `booking_conflict_error` key)
- `messages/th.json` (added `booking_conflict_error` placeholder)
- `src/lib/server/services/booking-service.ts` (new — booking service with ConflictError)
- `tests/integration/bookings.test.ts` (activated `4.1-INT-001`, `4.1-CONC-001`; fixed `seedOrganizer`)
- `tests/integration/db-schema.test.ts` (activated `4.1-UNIT-001`; fixed regex for Postgres normalization)

## Change Log

- 2026-06-13: Story 4.1 implemented — added `booking_conflict_error` Paraglide key, created `booking-service.ts` with `ConflictError` + `23P01` cause-chain catch + audit log, activated `4.1-UNIT-001` / `4.1-INT-001` / `4.1-CONC-001`. Status → review.
- 2026-06-13: Fixed `4.1-CONC-001` flakiness — stress testing revealed Postgres GiST EXCLUDE losers can return `40P01` (deadlock) instead of `23P01` under high load. Broadened rejection assertion to accept `{23P01, 40P01}`; critical invariants remain strict (exactly one commit, exactly one DB row). Committed as `3c1248f`.
