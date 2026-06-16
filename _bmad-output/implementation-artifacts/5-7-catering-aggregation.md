---
baseline_commit: 362d34e4db992fa98aa8fd2c8e9c4a3147c087fc
---

# Story 5.7: Catering Aggregation

**Status:** `review`
**Epic:** 5 — External Registration & Headcount
**GH Issue:** #35
**Previous Story:** 5.2 — Submit a Registration
**Next Story:** 5.8 — Registrant List & Dashboard Headcount

## Story

As an organizer,
I want meal-type counts aggregated,
so that I can plan catering.

## Acceptance Criteria

1. **Catering summary on dashboard BookingCard (FR-022, FR-051)**: Each BookingCard on
   `/dashboard` shows per-meal-type counts (Normal / Vegetarian / Muslim / Other) when
   `cateringEnabled=true` for that booking. The summary is omitted (not rendered) when
   `cateringEnabled=false`.

2. **Catering summary on booking detail page (FR-022, FR-051 symmetry)**: The
   `/bookings/[id]` detail page also shows the per-meal-type counts when
   `cateringEnabled=true`. Same omit-when-disabled rule.

3. **Counts reflect only `status='registered'` rows (FR-022)**: Cancelled registrations
   are excluded from all counts. This satisfies "counts update as cancellations change."

4. **Zero counts are shown (not hidden) when catering is enabled but no registrations
   exist**: Render all four meal-type rows with count 0, not an empty section. This
   confirms the query is correct and the section is always present when catering is on.

5. **`meal_type IS NULL` rows excluded from summary**: Rows where `meal_type` is NULL
   (submitted when `cateringEnabled=false`) are excluded from aggregation — they never
   increment any count.

6. **"Other" count only — no aggregation of `meal_type_other_text`**: The free-text
   field is NOT aggregated or displayed. Show only the count of registrants who chose
   "Other".

7. **Scope boundary with Story 5.8**: The existing registrant-count placeholder
   `dashboard_registrant_count_placeholder` ("—") in `BookingCard.svelte` is untouched
   by this story. Do NOT replace it with a real count — that belongs to Story 5.8.

8. **All new UI strings via Paraglide**: English values in `messages/en.json`; empty
   `""` in `messages/th.json`. No hardcoded Thai text anywhere in code or mocks.

9. **ATDD tests** (P0 and P1 stubs, integration + E2E) are scaffolded per scenario IDs
   from `test-design-epic-5.md`, matching the patterns in `tests/integration/registrations.test.ts`.

## Tasks / Subtasks

- [x] Task 1: Add `getCateringCounts` query to `src/lib/server/db/queries/registrations.ts` (AC: 1, 2, 3, 4, 5, 6)
  - [x] 1.1: Define return type `CateringCounts`:
    ```ts
    export type CateringCounts = {
      normal: number;
      vegetarian: number;
      muslim: number;
      other: number;
    };
    ```
  - [x] 1.2: Export `getCateringCountsByBookingId(bookingId: string): Promise<CateringCounts>` — runs a single `GROUP BY meal_type` query on the `registrations` table with `WHERE booking_id = $1 AND status = 'registered' AND meal_type IS NOT NULL`; maps rows to the four buckets. Returns `{ normal: 0, vegetarian: 0, muslim: 0, other: 0 }` when there are no rows.
  - [x] 1.3: Also export `getCateringCountsByBookingIds(bookingIds: string[]): Promise<Map<string, CateringCounts>>` — single query (one round trip for all IDs) with `WHERE booking_id = ANY($1) AND status = 'registered' AND meal_type IS NOT NULL GROUP BY booking_id, meal_type`. Returns a Map from bookingId → CateringCounts. Missing bookingIds return the zero struct. Prevents N+1 on the dashboard. Return empty Map when `bookingIds` is empty (skip DB call).
  - [x] 1.4: Meal-type matching is case-sensitive and matches `MEAL_OPTIONS` from `src/lib/schemas/registration.ts` exactly: `'Normal'`, `'Vegetarian'`, `'Muslim'`, `'Other'`. Use lower-case property names (`normal`, `vegetarian`, `muslim`, `other`) in the return type.

- [x] Task 2: Update the dashboard load to include catering counts (AC: 1)
  - [x] 2.1: In `src/routes/(app)/dashboard/+page.server.ts`, after resolving `getUpcomingBookingsByOrganizer`, collect all `bookingId`s where `cateringEnabled=true` and call `getCateringCountsByBookingIds`. Add `cateringCounts: CateringCounts | null` (null when catering off) to each booking row returned to the page. Keep the existing streamed pattern: the `bookings` promise pipeline should be extended, not replaced.
  - [x] 2.2: The extended row type should be `UpcomingBookingRow & { registrationUrl: string | null; cateringCounts: CateringCounts | null }`. Update the type annotation if explicit typing is needed for clarity.

- [x] Task 3: Update `BookingCard.svelte` to render catering summary (AC: 1, 5, 6, 7, 8)
  - [x] 3.1: Add an optional prop `cateringCounts?: CateringCounts | null` to `BookingCard.svelte`. The prop is `null` / absent when `cateringEnabled=false`.
  - [x] 3.2: When `cateringCounts` is non-null, render a catering summary section below the existing "Registrant count" placeholder. Show all four meal types as label-count pairs in a compact layout. Use new Paraglide keys for labels. Do not modify the existing registrant count row (AC-7).
  - [x] 3.3: When `cateringCounts` is null, render nothing for the catering section (not even a heading).
  - [x] 3.4: Follow the established `BookingCard` row pattern (label span + value span, `text-xs text-muted-foreground` label, `text-sm font-medium` value). Group the four meal counts under a shared heading using a new i18n key.

- [x] Task 4: Update the booking detail page to include catering counts (AC: 2, 3, 4, 5, 6, 8)
  - [x] 4.1: In `src/routes/(app)/bookings/[id]/+page.server.ts`, after `getBookingById`, if `booking.cateringEnabled`, call `getCateringCountsByBookingId(booking.id)` and add `cateringCounts` to the returned data. When `cateringEnabled=false`, return `cateringCounts: null`.
  - [x] 4.2: In `src/routes/(app)/bookings/[id]/+page.svelte`, add a catering summary section below the existing "Catering: Yes/No" row. Render it only when `data.cateringCounts !== null`. Show all four meal-type counts using the same Paraglide keys as `BookingCard`. Use the existing `<div class="flex flex-col gap-0.5">` row pattern of the page.

- [x] Task 5: Add Paraglide message keys (AC: 8)
  - [x] 5.1: Add all new keys to `messages/en.json` with English values.
  - [x] 5.2: Add all new keys to `messages/th.json` with empty string `""`.
  - [x] New keys needed:
    - `catering_summary_heading` — "Catering Summary"
    - `catering_summary_normal_label` — "Normal"
    - `catering_summary_vegetarian_label` — "Vegetarian"
    - `catering_summary_muslim_label` — "Muslim"
    - `catering_summary_other_label` — "Other"

- [x] Task 6: ATDD — add integration test stubs (AC: 1, 3, 4, 5)
  - [x] 6.1: Add new stubs to `tests/integration/registrations.test.ts`:
    - `5.7-INT-001` [P0 ACTIVATED]: `getCateringCountsByBookingId` returns correct per-meal counts after 5 concurrent inserts via `Promise.all` — concurrency / R-006 mitigation. Use raw SQL via `pg.Pool` to insert 5 registrations for the same booking with varied `meal_type` values (`Normal ×2`, `Vegetarian ×1`, `Muslim ×1`, `Other ×1`) concurrently. Assert aggregate counts match. [P0]
    - `5.7-INT-002` [P0 ACTIVATED]: Cancel 2 of the 5 registrations (update `status='cancelled'`); call `getCateringCountsByBookingId` again; assert counts decrement correctly (cancelled rows excluded). [P0]
    - `5.7-INT-003` [P2 SKIP]: `getCateringCountsByBookingId` returns all-zero struct when no registrations exist for that bookingId. [P2]
  - [x] 6.2: Follow the seeding pattern established in `tests/integration/registrations.test.ts` — insert user, room, booking, and registrations with raw SQL via `pg.Pool`. Never import `$lib/*` in integration tests.
  - [x] 6.3: All P0 tests start as `test(` (activated, red phase first). P2 tests use `test.skip(`.

- [x] Task 7: ATDD — add E2E test stub (AC: 1)
  - [x] 7.1: Add stub to `tests/e2e/registrations.spec.ts` (or `tests/e2e/bookings.spec.ts`):
    - `5.7-E2E-001` [P1 SKIP]: Dashboard BookingCard shows catering summary with correct Normal/Vegetarian/Muslim/Other counts when `cateringEnabled=true`. Playwright: seed a booking with `cateringEnabled=true`, seed 2 "Normal" + 1 "Vegetarian" registrations; navigate to `/dashboard`; assert the catering summary labels and counts are visible. Use `test.skip(` per repo convention.

## Dev Notes

### Critical Scope Boundaries

**DO implement:**
- `getCateringCountsByBookingId(bookingId)` and `getCateringCountsByBookingIds(bookingIds[])` queries in `src/lib/server/db/queries/registrations.ts`
- Dashboard: extend `+page.server.ts` to call `getCateringCountsByBookingIds`; extend `BookingCard.svelte` with optional `cateringCounts` prop
- Booking detail: extend `/bookings/[id]/+page.server.ts` + `+page.svelte` to show counts
- 5 new Paraglide keys (English + empty Thai)
- ATDD stubs: 5.7-INT-001, -002, -003, -E2E-001

**DO NOT implement (deferred):**
- Real registrant total count in `BookingCard` — that is Story 5.8. The `dashboard_registrant_count_placeholder` ("—") stays as-is.
- `meal_type_other_text` aggregation or display — count only.
- Admin-wide catering analytics (F8/Epic 7).
- Any DB migration — no new schema columns needed; read directly from `registrations`.
- Cached counter column — direct GROUP BY from `registrations` is the mandated approach (R-006 strategy: live read prevents counter drift).

### No Migration Required

The `registrations` table already has `meal_type` text (nullable) and `status` text with
`'registered'` as the default. The aggregation query reads these directly with no schema
changes. `cateringEnabled` is already on the `bookings` table (Story 1.x migration).

### Deferred Work from Story 5.2 That Is Relevant

From `_bmad-output/implementation-artifacts/deferred-work.md` (lines 62–65):

- `cateringEnabled` is not re-validated from DB in `createRegistration` — `mealType` can
  be stored even when `cateringEnabled=false`. As a result, `meal_type IS NOT NULL`
  alone is NOT a reliable proxy for "catering was enabled at submit time." The query
  guard `AND meal_type IS NOT NULL` is still correct behaviour for aggregation (do not
  count NULL rows), but it does not catch the edge case where a misbehaving client
  submitted a `mealType` for a non-catering booking. This story does NOT need to fix
  that deferred item — it is low-severity and out of scope. The display guard
  `cateringEnabled=true` at the booking level prevents exposing bogus counts to the
  organizer for bookings with catering off.

### Query Spec

```ts
// src/lib/server/db/queries/registrations.ts

import { sql } from 'drizzle-orm';
import { db } from '../index.js';
import { registrations } from '../schema/registrations.js';

export type CateringCounts = {
  normal: number;
  vegetarian: number;
  muslim: number;
  other: number;
};

const ZERO_COUNTS: CateringCounts = { normal: 0, vegetarian: 0, muslim: 0, other: 0 };

// Single-booking variant (for /bookings/[id] detail page)
export async function getCateringCountsByBookingId(bookingId: string): Promise<CateringCounts> {
  const rows = await db
    .select({
      mealType: registrations.mealType,
      count: sql<number>`cast(count(*) as integer)`
    })
    .from(registrations)
    .where(
      sql`${registrations.bookingId} = ${bookingId}
        AND ${registrations.status} = 'registered'
        AND ${registrations.mealType} IS NOT NULL`
    )
    .groupBy(registrations.mealType);

  return rowsToCounts(rows);
}

// Multi-booking variant (for dashboard — avoids N+1)
export async function getCateringCountsByBookingIds(
  bookingIds: string[]
): Promise<Map<string, CateringCounts>> {
  if (bookingIds.length === 0) return new Map();

  const rows = await db
    .select({
      bookingId: registrations.bookingId,
      mealType: registrations.mealType,
      count: sql<number>`cast(count(*) as integer)`
    })
    .from(registrations)
    .where(
      sql`${registrations.bookingId} = ANY(ARRAY[${sql.join(bookingIds.map(id => sql`${id}`), sql`, `)}]::text[])
        AND ${registrations.status} = 'registered'
        AND ${registrations.mealType} IS NOT NULL`
    )
    .groupBy(registrations.bookingId, registrations.mealType);

  const result = new Map<string, CateringCounts>();
  for (const row of rows) {
    const existing = result.get(row.bookingId) ?? { ...ZERO_COUNTS };
    mergeMealRow(existing, row.mealType, row.count);
    result.set(row.bookingId, existing);
  }
  return result;
}

// Helper: merge a single meal_type row into a CateringCounts struct
function mergeMealRow(counts: CateringCounts, mealType: string | null, count: number): void {
  if (mealType === 'Normal') counts.normal += count;
  else if (mealType === 'Vegetarian') counts.vegetarian += count;
  else if (mealType === 'Muslim') counts.muslim += count;
  else if (mealType === 'Other') counts.other += count;
  // anything else (null, unknown) is ignored
}

function rowsToCounts(rows: Array<{ mealType: string | null; count: number }>): CateringCounts {
  const counts = { ...ZERO_COUNTS };
  for (const row of rows) {
    mergeMealRow(counts, row.mealType, row.count);
  }
  return counts;
}
```

**Alternative for `getCateringCountsByBookingIds` WHERE clause:** If Drizzle `sql.join`
syntax is awkward, use a raw parameterized query via `db.execute()` with the `pg` driver:

```ts
const rows = await db.execute(
  sql`SELECT booking_id, meal_type, CAST(COUNT(*) AS INTEGER) AS count
      FROM registrations
      WHERE booking_id = ANY(${bookingIds})
        AND status = 'registered'
        AND meal_type IS NOT NULL
      GROUP BY booking_id, meal_type`
);
```

Either approach is acceptable — what matters is a single DB round-trip, not N queries.

### Dashboard Integration

Extend `src/routes/(app)/dashboard/+page.server.ts` pipeline:

```ts
const bookings = getUpcomingBookingsByOrganizer(user.id).then(async (rows) => {
  // Collect bookingIds where catering is enabled (skip the DB call for others)
  const cateringBookingIds = rows
    .filter((b) => b.cateringEnabled)
    .map((b) => b.id);

  const cateringMap = await getCateringCountsByBookingIds(cateringBookingIds);

  return rows.map((booking) => ({
    ...booking,
    registrationUrl: booking.registrationToken ? `${origin}/r/${booking.registrationToken}` : null,
    cateringCounts: booking.cateringEnabled ? (cateringMap.get(booking.id) ?? ZERO_COUNTS) : null
  }));
});
```

Note: `ZERO_COUNTS` constant can be re-imported from the query module or re-declared locally.

### BookingCard.svelte Prop Extension

Add `cateringCounts` as an optional prop:

```ts
const {
  booking,
  registrationUrl = null,
  cateringCounts = null,
  onCopy
}: {
  booking: UpcomingBookingRow;
  registrationUrl?: string | null;
  cateringCounts?: CateringCounts | null;
  onCopy?: () => void;
} = $props();
```

Render the catering summary section after the registrant count placeholder (do NOT
replace the placeholder — AC-7):

```svelte
<!-- Catering summary (only when cateringCounts is provided) -->
{#if cateringCounts !== null}
  <div class="flex flex-col gap-1">
    <span class="text-xs text-muted-foreground">{m.catering_summary_heading()}</span>
    <div class="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm font-medium text-foreground">
      <span class="text-xs text-muted-foreground">{m.catering_summary_normal_label()}</span>
      <span>{cateringCounts.normal}</span>
      <span class="text-xs text-muted-foreground">{m.catering_summary_vegetarian_label()}</span>
      <span>{cateringCounts.vegetarian}</span>
      <span class="text-xs text-muted-foreground">{m.catering_summary_muslim_label()}</span>
      <span>{cateringCounts.muslim}</span>
      <span class="text-xs text-muted-foreground">{m.catering_summary_other_label()}</span>
      <span>{cateringCounts.other}</span>
    </div>
  </div>
{/if}
```

Adapt the exact Tailwind classes to match the rest of the card (the `flex flex-col gap-0.5` row
style established in the existing `BookingCard.svelte` pattern). The grid is one approach;
a vertical list of label-value pairs (matching the other rows) is equally valid.

### Booking Detail Page Integration

In `src/routes/(app)/bookings/[id]/+page.server.ts`, after the existing
`getBookingById` + `assertOwner` block:

```ts
const cateringCounts = booking.cateringEnabled
  ? await getCateringCountsByBookingId(booking.id)
  : null;

return {
  booking,
  room,
  startAt,
  endAt,
  registrationUrl,
  qrDataUrl,
  cateringCounts    // new field
};
```

In `src/routes/(app)/bookings/[id]/+page.svelte`, add the catering summary after the
existing "Catering: Yes/No" row (which already uses `m.booking_catering_label()`).
Use the same `<div class="flex flex-col gap-0.5">` row pattern:

```svelte
<!-- Catering counts (Story 5.7 — only when cateringEnabled and counts loaded) -->
{#if data.cateringCounts !== null}
  <div class="flex flex-col gap-1">
    <span class="text-xs text-muted-foreground">{m.catering_summary_heading()}</span>
    <!-- four meal rows matching the page's existing pattern -->
  </div>
{/if}
```

### Paraglide Key Changes

Add to `messages/en.json`:
```json
"catering_summary_heading": "Catering Summary",
"catering_summary_normal_label": "Normal",
"catering_summary_vegetarian_label": "Vegetarian",
"catering_summary_muslim_label": "Muslim",
"catering_summary_other_label": "Other"
```

Add to `messages/th.json` (empty — Rawinan handles all Thai translations):
```json
"catering_summary_heading": "",
"catering_summary_normal_label": "",
"catering_summary_vegetarian_label": "",
"catering_summary_muslim_label": "",
"catering_summary_other_label": ""
```

**CRITICAL: Do NOT write any Thai text in code, mocks, or messages. Empty string only.**
**The existing `reg_form_meal_*` keys in `en.json` are for the registration form picker (Story 5.2).**
**New `catering_summary_*` keys are for the organizer-facing summary display (this story).**

### MEAL_OPTIONS Constant

The canonical meal type values are exported from `src/lib/schemas/registration.ts`:
```ts
export const MEAL_OPTIONS = ['Normal', 'Vegetarian', 'Muslim', 'Other'] as const;
```
The aggregation query matches these exact strings case-sensitively. Do NOT redefine them.
Import or reference them for documentation — the query does not need to iterate MEAL_OPTIONS
but the bucket names must match exactly.

### ATDD Integration Test Pattern

Follow `tests/integration/registrations.test.ts` exactly:
- Use raw `pg.Pool` (never Drizzle) for seed inserts
- Seed: user row in `user_accounts`, profile in `user_profiles`, room in `rooms`, booking in `bookings`, registrations in `registrations`
- Insert the user with `role = 'organizer'` and a profile row (required by INNER JOIN in getBookingByRegistrationToken, though that isn't called in this story)
- Tests need only: room, booking (with `catering_enabled = true`), registrations with `meal_type`
- Use `randomUUID()` from `node:crypto` for all IDs; `uuidv7()` is used in production but either works in tests
- Clean up rows in `afterAll` (or use test-specific prefixes like `'5.7-INT-001-'` in `event_name` for easy cleanup)
- All `count(*)` values from `sql<number>` must be cast to integer explicitly — Postgres returns bigint as string; use `CAST(count(*) AS INTEGER)` or `parseInt(row.count, 10)` on the client side

### Files to Create/Modify

**MODIFY (extend, do NOT rewrite):**
- `src/lib/server/db/queries/registrations.ts` — add `CateringCounts` type + two query functions
- `src/routes/(app)/dashboard/+page.server.ts` — extend promise pipeline to call `getCateringCountsByBookingIds`
- `src/lib/components/booking/BookingCard.svelte` — add `cateringCounts` prop + render block
- `src/routes/(app)/bookings/[id]/+page.server.ts` — add `getCateringCountsByBookingId` call + return `cateringCounts`
- `src/routes/(app)/bookings/[id]/+page.svelte` — add catering summary section
- `messages/en.json` — 5 new keys
- `messages/th.json` — 5 new empty-string keys
- `tests/integration/registrations.test.ts` — add 5.7-INT-001, -002, -003 stubs
- `tests/e2e/registrations.spec.ts` (or `tests/e2e/bookings.spec.ts`) — add 5.7-E2E-001 stub

**DO NOT CREATE new files** unless you confirm none of the above exist.

### TypeScript / Svelte Patterns

- Svelte 5 runes only: `$props()`, `$derived`, `$state`. No Svelte 4 reactive declarations (`$:`).
- Import `CateringCounts` in `BookingCard.svelte` from the query module (server import in Svelte component is fine for type-only usage; use `import type`).
- `sql<number>` in Drizzle requires explicit cast — `sql<number>\`cast(count(*) as integer)\`` — because Postgres returns `count(*)` as bigint which arrives as a string without the cast.

### Risk Registry (from test-design-epic-5.md)

**R-006 — Catering aggregation concurrency (score=6)**
- No cached counter column. Live GROUP BY read from `registrations`. This means no
  counter can drift; each read reflects the true DB state.
- Concurrency mitigation: `5.7-INT-001` (Promise.all insert of 5 registrations → assert count=5).
- Cancellation correctness: `5.7-INT-002` (cancel 2 → assert count=3).
- Both must be P0 ACTIVATED (not skipped) in the scaffolded ATDD stubs.

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Story 5.7 ACs (lines 809–822)
- PRD: `_bmad-output/planning-artifacts/prds/prd-conference-envocc-2026-06-07/prd.md` — FR-022 (catering aggregation), FR-051 (booking card content), FR-035 (registrant list)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — F3 Catering mapping (line 617), analytics in `analytics/registration` queries pattern
- UX DESIGN.md: `_bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/DESIGN.md` — Booking card spec (line 165)
- UX EXPERIENCE.md: `_bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/EXPERIENCE.md` — Flow 1 step 5 (catering summary on dashboard)
- Test design: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` — 5.7-INT-001, -002, -003, -E2E-001 scenario specs; R-006 (lines 185–189)
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md` — 5.2 deferred: cateringEnabled not re-validated in createRegistration (lines 62–65)
- Registrations schema: `src/lib/server/db/schema/registrations.ts`
- Bookings schema: `src/lib/server/db/schema/bookings.ts`
- Existing registrations query: `src/lib/server/db/queries/registrations.ts`
- Dashboard server: `src/routes/(app)/dashboard/+page.server.ts`
- Dashboard page: `src/routes/(app)/dashboard/+page.svelte`
- BookingCard component: `src/lib/components/booking/BookingCard.svelte`
- Booking detail server: `src/routes/(app)/bookings/[id]/+page.server.ts`
- Booking detail page: `src/routes/(app)/bookings/[id]/+page.svelte`
- MEAL_OPTIONS constant: `src/lib/schemas/registration.ts` — `export const MEAL_OPTIONS = ['Normal', 'Vegetarian', 'Muslim', 'Other'] as const`
- Integration test pattern reference: `tests/integration/registrations.test.ts`
- Dashboard query function: `src/lib/server/db/queries/bookings.ts` — `getUpcomingBookingsByOrganizer` (lines 117–135)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation went smoothly. ATDD stubs were already scaffolded from the red-phase commit; implementation made them green.

### Completion Notes List

- Task 1: Added `CateringCounts` type, `CATERING_ZERO_COUNTS` constant, `getCateringCountsByBookingId()` (single-booking variant), and `getCateringCountsByBookingIds()` (multi-booking, N+1 prevention) to `src/lib/server/db/queries/registrations.ts`. Used Drizzle `.select()` builder with `cast(count(*) as integer)` for type-safe count return values.
- Task 2: Extended `src/routes/(app)/dashboard/+page.server.ts` async pipeline: collects all `cateringEnabled` booking IDs, single `getCateringCountsByBookingIds` call, maps `cateringCounts: CateringCounts | null` per row. Preserved existing streamed/unawaited pattern.
- Task 3: Added `cateringCounts?: CateringCounts | null` prop to `BookingCard.svelte`. Renders 4-row catering summary section after registrant count placeholder (AC-7 scope boundary preserved — placeholder untouched). Used `{#if cateringCounts !== null}` guard (AC-3). `import type { CateringCounts }` from server module (type-only, safe for Svelte).
- Task 4: Added `getCateringCountsByBookingId` call to `/bookings/[id]/+page.server.ts` and catering summary section to `/bookings/[id]/+page.svelte`. Used same pattern as BookingCard.
- Task 5: Added 5 Paraglide keys (`catering_summary_heading`, `catering_summary_normal_label`, `catering_summary_vegetarian_label`, `catering_summary_muslim_label`, `catering_summary_other_label`) to `messages/en.json` with English values and `messages/th.json` with empty strings (per project policy — Rawinan translates Thai).
- Tasks 6 & 7: ATDD stubs were already scaffolded in the red-phase ATDD commit. 5.7-INT-001 and 5.7-INT-002 both PASS green. 5.7-INT-003 and 5.7-E2E-001 remain correctly skipped (P2/P1).
- Pre-existing check errors (28) are all paraglide generated-file not-found errors present before this story; no new errors introduced.

### File List

- `src/lib/server/db/queries/registrations.ts` — added `CateringCounts` type, `CATERING_ZERO_COUNTS` constant, `getCateringCountsByBookingId()`, `getCateringCountsByBookingIds()`
- `src/routes/(app)/dashboard/+page.server.ts` — extended promise pipeline with catering counts
- `src/lib/components/booking/BookingCard.svelte` — added `cateringCounts` prop and catering summary section
- `src/routes/(app)/bookings/[id]/+page.server.ts` — added `getCateringCountsByBookingId` call and `cateringCounts` return
- `src/routes/(app)/bookings/[id]/+page.svelte` — added catering summary section
- `messages/en.json` — added 5 catering_summary_* keys
- `messages/th.json` — added 5 catering_summary_* keys (empty strings)

### Change Log

- 2026-06-16: Story 5.7 Catering Aggregation implemented — `getCateringCounts` queries, dashboard BookingCard catering summary, booking detail catering counts, 5 Paraglide keys. 5.7-INT-001 and 5.7-INT-002 PASS green.
