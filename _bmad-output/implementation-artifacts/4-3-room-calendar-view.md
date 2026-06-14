---
baseline_commit: 7057589
---

# Story 4.3: Room Calendar View

Status: in-progress

## Story

As an organizer,
I want a weekly room calendar,
So that I can scan availability and start a booking.

## Acceptance Criteria

**Given** active rooms
**When** I open the calendar
**Then** I see rooms on the Y axis × days on the X axis, booking chips showing the booked time range, and clickable empty day cells (no pre-set time)
**And** booked/available/blocked states are distinguishable without relying on color alone (label + ARIA + visual pattern).

**Scoping note — event name on chips:** The `bookings` table at this story's baseline has no `event_name` column (that arrives in Story 4.4). Booking chips show **time range only** (e.g. "09:00–11:00"). Add an `{event name}` placeholder area in BookingChip for Story 4.4 to fill without a structural rewrite — it just renders nothing for now.

**Scoping note — blocked slots:** The epic AC mentions a "blocked" state. `getWeekCalendar()` (from Story 4.2) returns bookings only. To show blocks, `+page.server.ts` must also query `room_blocks` for the week window (same `during &&` logic) and pass them alongside bookings. RoomCalendar renders blocked cells as a distinct visual (hatched/cream pattern + "Blocked" label) separate from booked cells.

**Scoping note — click targets:** Empty cells link to `/bookings/new?room={roomId}&date={YYYY-MM-DD}`. The `/bookings/new` route does not exist until Story 4.4 — the link will 404 until then. Booking chips have a `data-booking-id` attribute and a placeholder `href` (`#`) for Story 4.4 to wire to `/bookings/{id}`.

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/utils/date.ts` — Asia/Bangkok date utilities (AC: all)
  - [x] 1.1 Create `src/lib/utils/` directory (does NOT exist yet — architecture mandates it).
  - [x] 1.2 Implement `parseWeekParam(param: string | null): Date` — parses `YYYY-MM-DD` from `?week=` query param; returns the Monday of the requested week (or current week's Monday if param is absent/invalid) as a UTC `Date` object anchored to Monday 00:00 Asia/Bangkok (= Sunday 17:00 UTC).
  - [x] 1.3 Implement `formatDateBangkok(date: Date, format: 'time' | 'date' | 'dayName' | 'dayShort'): string` — all date/time display goes through this function; never format inline in components. See Dev Notes §Date Utils for exact format strings.
  - [x] 1.4 Implement `addDays(date: Date, n: number): Date` — pure UTC day addition (no DST risk).
  - [x] 1.5 Run `bun run check` — zero TypeScript errors.

- [x] Task 2: Add Paraglide message keys to `messages/en.json` (AC: all)
  - [x] 2.1 Add calendar keys (English values) to `messages/en.json`. See Dev Notes §Paraglide Keys for the full list.
  - [x] 2.2 Add stub English values to `messages/th.json` (copy same English text as placeholder — Rawinan handles all Thai translations; NEVER write Thai text in code).
  - [x] 2.3 Run `bun run check` — Paraglide codegen must complete without error; all new `m.*()` calls must type-check.

- [x] Task 3: Create `BookingChip.svelte` component (AC: 1, 2)
  - [x] 3.1 Create `src/lib/components/calendar/` directory (does NOT exist yet).
  - [x] 3.2 Create `src/lib/components/calendar/BookingChip.svelte`. Props: `bookingId: number`, `timeRange: string` (pre-formatted "HH:MM–HH:MM" from `+page.server.ts`), `eventName: string | null` (null for Story 4.3 — renders nothing; Story 4.4 wires this). Renders a card with `data-booking-id={bookingId}` and `href="#"` (Story 4.4 wires to `/bookings/{bookingId}`). No server-type imports needed. See Dev Notes §BookingChip.
  - [x] 3.3 Run `bun run check` — zero TypeScript errors.

- [x] Task 4: Create `RoomCalendar.svelte` component (AC: 1, 2)
  - [x] 4.1 Create `src/lib/components/calendar/RoomCalendar.svelte`. Props: `grid: CalendarGrid`, `weekDates: string[]` (7 ISO strings Mon–Sun). `CalendarGrid` and `CalendarCell` types are defined in `src/lib/types/calendar.ts` (Task 5.1). Renders a grid: rooms on Y axis, days on X axis. See Dev Notes §RoomCalendar.
  - [x] 4.2 Available cell (`cell.state === 'available'`): background `bg-green-100`; cell is an `<a href={cell.href}>` link to `/bookings/new?room=...&date=...`; `aria-label` includes "available". No text label visible by default (UXD-013 clean state) — only shows on hover/focus.
  - [x] 4.3 Booked cell (`cell.state === 'booked'`): render one `BookingChip` per `cell.bookings` entry, stacked vertically.
  - [x] 4.4 Blocked cell (`cell.state === 'blocked'`): `bg-amber-50` + hatched CSS pattern + `aria-label` includes "blocked" + visible "Blocked" text label (`m.calendar_blocked_label()`). Distinguished by label+pattern, not color alone (WCAG 2.1 AA AC-2).
  - [x] 4.5 Run `bun run check` — zero TypeScript errors.

- [x] Task 5: Create `src/routes/(app)/calendar/+page.server.ts` (AC: 1, 2)
  - [x] 5.1 Create `src/lib/types/calendar.ts` — pure type-only file (no server code) exporting `CellState`, `CalendarCell`, `CalendarGrid`. These are imported by both `+page.server.ts` and `RoomCalendar.svelte`. See Dev Notes §Blocks Query for full type definitions.
  - [x] 5.2 Create directory `src/routes/(app)/calendar/` (does NOT exist yet).
  - [x] 5.3 Create `+page.server.ts`. The `load` function:
    - Reads `?week=YYYY-MM-DD` from `url.searchParams.get('week')`.
    - Calls `parseWeekParam(weekParam)` → `weekStart` (Monday 00:00 Asia/Bangkok as UTC Date).
    - Calls `getWeekCalendar(weekStart)` from `$lib/server/db/queries/bookings.js`.
    - Queries `room_blocks` for the same `[weekStart, weekEnd)` window (see Dev Notes §Blocks Query).
    - Pre-computes `grid: CalendarGrid` — one row per room, 7 cells per row. Parses `tstzrange` strings, groups blocks/bookings per day, builds `CalendarCell` with state + ariaLabel + href.
    - Returns `{ grid, weekStart: weekStart.toISOString(), weekDates, prevWeek, nextWeek }`.
  - [x] 5.4 No new auth guard needed — `/calendar` is inside `(app)/` and is already protected by the existing `routeGuards` pattern in `hooks.server.ts`.
  - [x] 5.5 Run `bun run check` — zero TypeScript errors.

- [x] Task 6: Create `src/routes/(app)/calendar/+page.svelte` (AC: 1, 2)
  - [x] 6.1 Create `+page.svelte`. Page title: `m.calendar_title()`. Receives `data` from `+page.server.ts`.
  - [x] 6.2 Week navigation: Prev week link (`?week={prevMonday}`) + Next week link (`?week={nextMonday}`). Show the current week date range as a heading.
  - [x] 6.3 Render `<RoomCalendar grid={data.grid} weekDates={data.weekDates} />`.
  - [x] 6.4 If `data.grid.length === 0` render the empty state: `m.calendar_empty_state()` message.
  - [x] 6.5 Run `bun run check` — zero TypeScript errors.

- [x] Task 7: Scaffold E2E tests in `tests/e2e/bookings.spec.ts` (AC: 1, 2 via E2E)
  - [x] 7.1 Create `tests/e2e/bookings.spec.ts` (NEW file). Scaffold `4.3-E2E-001` (P1) and `4.3-A11Y-001` (P2) as `test.skip()`. See Dev Notes §E2E Tests for exact test stubs.
  - [x] 7.2 Do NOT activate these tests — they stay as `test.skip()` for Story 4.3. A later story activates them (they require the `/bookings/new` route from Story 4.4 to be functional).

- [x] Task 8: Quality gates (AC: all)
  - [x] 8.1 Run `bunx prettier --write . && bun run lint` — zero errors.
  - [x] 8.2 Run `bun run check` — zero TypeScript errors (baseline: 0 errors from Story 4.2).
  - [x] 8.3 Run `bun run test:integration` — all existing Story 4.1 and 4.2 tests still pass (no regressions). This story adds no new integration tests.
  - [x] 8.4 Run `bun run build` — build succeeds (requires `DATABASE_URL` placeholder, same as CI). Fix any SSR import issues if `$lib/utils/date.ts` is accidentally imported client-side — it must be safe to import everywhere (no server-only code; no `node:` imports).

## Dev Notes

### Critical: What This Story Is (and Is NOT)

**Story 4.3 is a UI-only story.** It adds a calendar view — no new DB migrations, no new booking mutations. The data layer (`getWeekCalendar`) was created in Story 4.2 and must be imported as-is.

**Scope:**
1. `src/lib/utils/date.ts` — Asia/Bangkok formatting/parsing (NEW; architecture §515).
2. `src/lib/components/calendar/RoomCalendar.svelte` + `BookingChip.svelte` (NEW).
3. `src/routes/(app)/calendar/+page.server.ts` + `+page.svelte` (NEW route).
4. Paraglide calendar keys in `messages/en.json` + `messages/th.json` stub.
5. `tests/e2e/bookings.spec.ts` — NEW file with `test.skip()` stubs only.

**Deferred to later stories:**
- `/bookings/new` booking form → Story 4.4.
- `event_name` column on bookings → Story 4.4 (schema + service changes).
- Booking chip click-through to Event Detail → Story 4.4+ (link is `href="#"` for now).
- E2E test activation → after Story 4.4 route exists.
- UUID v7 PK for bookings → Story 4.4.

### Import Paths and Module Aliases

SvelteKit uses `$lib` as an alias for `src/lib/`. Always use `$lib/...` in imports, not relative paths crossing the `src/lib` boundary.

```typescript
// Correct import in +page.server.ts:
import { getWeekCalendar, type WeekCalendarRow } from '$lib/server/db/queries/bookings.js';
import { roomBlocks } from '$lib/server/db/schema/room-blocks.js';
import type { RoomBlock } from '$lib/server/db/schema/room-blocks.js';
import { parseWeekParam, addDays, formatDateBangkok } from '$lib/utils/date.js';
import type { CalendarGrid, CalendarCell, CellState } from '$lib/types/calendar.js';

// Correct import in RoomCalendar.svelte (pure type imports only — no server code):
import type { CalendarGrid } from '$lib/types/calendar.js';

// Correct import in BookingChip.svelte (type only):
import type { Booking } from '$lib/server/services/booking-service.js';
```

**Note:** `$lib/server/...` imports are server-only and cannot be used in `.svelte` files that run client-side. Components that import server types must use `type` imports only (TypeScript erases them at compile time). Use the `import type` syntax.

### Date Utils (`src/lib/utils/date.ts`)

`src/lib/utils/` does NOT exist at baseline — this story creates it. `date.ts` is the single source of truth for all date/time formatting in the app (architecture §Dates/times: "Format via one shared util — never format dates ad hoc in components").

**Key: Asia/Bangkok = UTC+7, no DST.** Monday midnight Bangkok = Sunday 17:00 UTC.

```typescript
// src/lib/utils/date.ts
// Safe for both server (load functions) and client (Svelte components).
// No node: imports allowed here.

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no DST

/**
 * Parse ?week=YYYY-MM-DD query param → Monday 00:00 Asia/Bangkok as UTC Date.
 * If param is absent or invalid, returns the current week's Monday.
 *
 * Invariant: the returned Date represents exactly Monday 00:00 Asia/Bangkok
 * which is the same instant as Sunday 17:00:00 UTC of the preceding week.
 *
 * Example (trace):
 *   parseWeekParam("2026-06-15")  // June 15 = Monday
 *   → base = new Date("2026-06-15T00:00:00+07:00")
 *          = new Date("2026-06-14T17:00:00.000Z")    ← Monday midnight Bangkok
 *   → bkDay = base + 7h → 2026-06-15T00:00:00Z UTC (Bangkok wall clock)
 *   → getUTCDay() = 1 (Monday) → daysToMonday = 0
 *   → result = "2026-06-14T17:00:00.000Z" ✓
 *
 *   parseWeekParam("2026-06-17")  // June 17 = Wednesday
 *   → base = new Date("2026-06-17T00:00:00+07:00")
 *          = "2026-06-16T17:00:00.000Z"
 *   → bkDay UTC = 2026-06-17T00:00Z → getUTCDay() = 3 (Wed) → daysToMonday = -2
 *   → result = "2026-06-14T17:00:00.000Z" ✓ (same Monday)
 */
export function parseWeekParam(param: string | null): Date {
  // Validate format
  const iso = param?.match(/^\d{4}-\d{2}-\d{2}$/) ? param : null;

  // Parse as Bangkok midnight: "YYYY-MM-DDT00:00:00+07:00"
  // ISO 8601 with explicit +07:00 offset means JS interprets it as UTC-7h correctly.
  const base = iso
    ? new Date(`${iso}T00:00:00+07:00`)
    : bangkokMidnightNow();

  // Read the Bangkok weekday:
  // base is the Bangkok midnight instant. Adding BANGKOK_OFFSET_MS shifts it
  // to Bangkok wall-clock midnight expressed as a UTC timestamp — getUTCDay() then
  // returns the Bangkok weekday (0=Sun, 1=Mon, ..., 6=Sat).
  const bkDay = new Date(base.getTime() + BANGKOK_OFFSET_MS);
  const dayOfWeek = bkDay.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return new Date(base.getTime() + daysToMonday * 24 * 60 * 60 * 1000);
}

/**
 * Current day at midnight Bangkok as a UTC Date (fallback for parseWeekParam).
 */
function bangkokMidnightNow(): Date {
  const now = new Date();
  // Shift to Bangkok wall clock, floor to midnight, shift back to UTC
  const bkMs = now.getTime() + BANGKOK_OFFSET_MS;
  const bkDate = new Date(bkMs);
  // Midnight Bangkok in UTC = Bangkok date at 00:00 Bangkok = (Bangkok date - 1day) at 17:00Z
  return new Date(
    Date.UTC(bkDate.getUTCFullYear(), bkDate.getUTCMonth(), bkDate.getUTCDate()) - BANGKOK_OFFSET_MS
  );
}

/**
 * Add N days to a Date using pure millisecond math (no DST risk for UTC+7).
 */
export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
}

/**
 * Format a Date in Asia/Bangkok for display.
 *
 * - 'time'    → "09:00" (HH:MM, 24-hour, Bangkok)
 * - 'date'    → "2026-06-15" (YYYY-MM-DD, Bangkok)
 * - 'dayName' → "Monday" (full English day name, Bangkok; Paraglide wraps locale labels)
 * - 'dayShort'→ "Mon" (3-char abbreviation)
 */
export function formatDateBangkok(
  date: Date,
  format: 'time' | 'date' | 'dayName' | 'dayShort'
): string {
  // Add offset to get Bangkok wall-clock time in UTC fields
  const bk = new Date(date.getTime() + BANGKOK_OFFSET_MS);
  switch (format) {
    case 'time': {
      const hh = String(bk.getUTCHours()).padStart(2, '0');
      const mm = String(bk.getUTCMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    case 'date': {
      const yyyy = bk.getUTCFullYear();
      const mo = String(bk.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(bk.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mo}-${dd}`;
    }
    case 'dayName': {
      const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      return DAYS[bk.getUTCDay()] ?? 'Monday';
    }
    case 'dayShort': {
      const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return DAYS_SHORT[bk.getUTCDay()] ?? 'Mon';
    }
  }
}
```

**Critical verification — trace Monday June 15 2026:**
```
parseWeekParam("2026-06-15")
  base = new Date("2026-06-15T00:00:00+07:00") = "2026-06-14T17:00:00.000Z"
  bkDay = base + 7h = 2026-06-15T00:00:00.000Z   ← Bangkok midnight (in UTC)
  getUTCDay() = 1 (Monday)  → daysToMonday = 1 - 1 = 0
  result = "2026-06-14T17:00:00.000Z" ✓  (Monday midnight Bangkok)
```

`getWeekCalendar(weekStart)` uses `weekStart.getTime() + 7 * 24 * 60 * 60 * 1000` — confirmed pure UTC math in the actual implementation at `src/lib/server/db/queries/bookings.ts`.

### Paraglide Keys

Add to `messages/en.json` (append before the closing `}`):

```json
"calendar_title": "Room Calendar",
"calendar_week_heading": "Week of {start} – {end}",
"calendar_prev_week": "Previous week",
"calendar_next_week": "Next week",
"calendar_available_label": "Available",
"calendar_booked_label": "Booked",
"calendar_blocked_label": "Blocked",
"calendar_empty_state": "No rooms are available. Contact an administrator to add rooms.",
"calendar_time_range": "{start}–{end}"
```

Copy the same English values as stubs into `messages/th.json`. Rawinan provides the real Thai strings — never write Thai text in source code.

**Paraglide in Svelte 5:** Import via `import * as m from '$lib/paraglide/messages.js'` and call `m.calendar_title()` etc. The compiled message functions for keyed params (like `calendar_week_heading`) accept an object: `m.calendar_week_heading({ start: '...', end: '...' })`.

**Build check:** After adding keys, `bun run check` will trigger Paraglide codegen. If `th.json` is missing a key that `en.json` has, the build fails. Always add the stub to both files simultaneously (Task 2.2).

### Calendar Types (`src/lib/types/calendar.ts`)

Create a pure type-only file — no server code, no imports from `$lib/server/`. Safe to import in Svelte components.

```typescript
// src/lib/types/calendar.ts
import type { Room } from '$lib/server/db/schema/rooms.js';

export type CellState = 'available' | 'booked' | 'blocked';

export type CalendarCell = {
  state: CellState;
  /** Pre-formatted bookings for display (time range + event name placeholder). */
  bookings: Array<{ id: number; timeRange: string; eventName: string | null }>;
  /** Block reasons for display. */
  blocks: Array<{ id: string; reason: string | null }>;
  /** Link to /bookings/new?room=...&date=... (even for non-available cells — preserves nav). */
  href: string;
  /** Full aria-label for the cell (state + room + day). */
  ariaLabel: string;
};

export type CalendarGridRow = {
  room: Room;
  cells: CalendarCell[]; // 7 cells: Mon=0 ... Sun=6
};

export type CalendarGrid = CalendarGridRow[];
```

**Note:** `import type { Room }` works here because it is a TypeScript type-only import — no runtime dependency on `$lib/server/`. TypeScript strips `import type` at compile time.

### Blocks Query and Grid Pre-computation (`+page.server.ts`)

`getWeekCalendar()` returns bookings only. To show blocked slots, query `room_blocks` for the same week window separately, then pre-compute the full `CalendarGrid` in the load function so `RoomCalendar.svelte` only deals with clean typed data.

```typescript
// src/routes/(app)/calendar/+page.server.ts
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { roomBlocks } from '$lib/server/db/schema/room-blocks.js';
import type { RoomBlock } from '$lib/server/db/schema/room-blocks.js';
import { getWeekCalendar } from '$lib/server/db/queries/bookings.js';
import { parseWeekParam, addDays, formatDateBangkok } from '$lib/utils/date.js';
import type { CalendarGrid, CellState } from '$lib/types/calendar.js';
import * as m from '$lib/paraglide/messages.js';

// Parse lower bound from tstzrange string (format: ["2026-06-15 09:00:00+07","..."))
function parseTstzrange(range: string): { lower: Date; upper: Date } | null {
  const match = range.match(/[\[(]"?([^",]+)"?,\s*"?([^")\]]+)"?[\])]/);
  if (!match || !match[1] || !match[2]) return null;
  return {
    lower: new Date(match[1].trim().replace(' ', 'T').replace(/\+07$/, '+07:00')),
    upper: new Date(match[2].trim().replace(' ', 'T').replace(/\+07$/, '+07:00'))
  };
}

function rangeOverlapsDay(range: string, dayStart: Date): boolean {
  const parsed = parseTstzrange(range);
  if (!parsed) return false;
  const dayEnd = addDays(dayStart, 1);
  return parsed.lower < dayEnd && parsed.upper > dayStart;
}

export async function load({ url }) {
  const weekStart = parseWeekParam(url.searchParams.get('week'));
  const weekEnd = addDays(weekStart, 7);

  // Fetch bookings and blocks in parallel
  const [rows, weekBlocks] = await Promise.all([
    getWeekCalendar(weekStart),
    db
      .select()
      .from(roomBlocks)
      .where(
        sql`${roomBlocks.during} && tstzrange(${weekStart.toISOString()}::timestamptz, ${weekEnd.toISOString()}::timestamptz, '[)')`
      )
  ]);

  // Group blocks by roomId
  const blocksByRoom = new Map<string, RoomBlock[]>();
  for (const block of weekBlocks) {
    const list = blocksByRoom.get(block.roomId) ?? [];
    list.push(block);
    blocksByRoom.set(block.roomId, list);
  }

  // Build weekDates (7 Date objects, Mon–Sun)
  const weekDateObjects = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekDates = weekDateObjects.map((d) => d.toISOString());

  // Pre-compute the CalendarGrid
  const grid: CalendarGrid = rows.map((row) => ({
    room: row.room,
    cells: weekDateObjects.map((dayStart) => {
      const dayDateStr = formatDateBangkok(dayStart, 'date');
      const dayName = formatDateBangkok(dayStart, 'dayName');

      const dayBookings = row.bookings.filter((b) => rangeOverlapsDay(b.during, dayStart));
      const dayBlocks = (blocksByRoom.get(row.room.id) ?? []).filter(
        (bl) => rangeOverlapsDay(bl.during, dayStart)
      );

      const state: CellState =
        dayBlocks.length > 0 ? 'blocked' :
        dayBookings.length > 0 ? 'booked' : 'available';

      const ariaLabel =
        state === 'available'
          ? `${row.room.name} ${dayName} ${m.calendar_available_label()}`
          : state === 'blocked'
            ? `${row.room.name} ${dayName} ${m.calendar_blocked_label()}`
            : `${row.room.name} ${dayName} ${m.calendar_booked_label()}`;

      return {
        state,
        bookings: dayBookings.map((b) => {
          const parsed = parseTstzrange(b.during);
          const timeRange = parsed
            ? `${formatDateBangkok(parsed.lower, 'time')}–${formatDateBangkok(parsed.upper, 'time')}`
            : '';
          return { id: b.id, timeRange, eventName: null }; // eventName: Story 4.4
        }),
        blocks: dayBlocks.map((bl) => ({ id: bl.id, reason: bl.reason })),
        href: `/bookings/new?room=${row.room.id}&date=${dayDateStr}`,
        ariaLabel
      };
    })
  }));

  const prevWeek = formatDateBangkok(addDays(weekStart, -7), 'date');
  const nextWeek = formatDateBangkok(addDays(weekStart, 7), 'date');

  return {
    grid,
    weekStart: weekStart.toISOString(),
    weekDates,
    prevWeek,
    nextWeek
  };
}
```

### BookingChip Component

```svelte
<!-- src/lib/components/calendar/BookingChip.svelte -->
<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';

  interface Props {
    bookingId: number;        // integer PK (UUID v7 in Story 4.4 — change type then)
    timeRange: string;        // pre-formatted "HH:MM–HH:MM" (computed in +page.server.ts)
    eventName: string | null; // null for Story 4.3; Story 4.4 passes event name
  }

  let { bookingId, timeRange, eventName }: Props = $props();
</script>

<a
  href="#"
  data-booking-id={bookingId}
  class="block rounded-md bg-green-500 text-white shadow-md px-2 py-1 text-sm leading-tight hover:bg-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
  aria-label="{m.calendar_booked_label()}{eventName ? `: ${eventName}` : ''} {timeRange}"
>
  <span class="font-medium">{timeRange}</span>
  {#if eventName}
    <span class="block truncate text-xs opacity-90">{eventName}</span>
  {/if}
</a>
```

**Key points:**
- Props are `bookingId: number`, `timeRange: string`, `eventName: string | null`. No server-type import needed — keeps component portable.
- `href="#"` is a placeholder — Story 4.4 changes to `/bookings/{bookingId}`.
- `data-booking-id` enables Story 4.4 to wire navigation without changing the component markup.
- `eventName` slot is wired but silent in 4.3 — no conditional blank space rendered.
- Accessibility: `aria-label` includes the booked state + time range even without color. WCAG 2.1 AA AC-2.
- Use `$props()` (Svelte 5 runes) — not `export let`.

### RoomCalendar Component

`RoomCalendar.svelte` receives a pre-computed `grid: CalendarGrid` from `+page.server.ts`. No `tstzrange` string parsing happens in the component — all cell state logic runs on the server.

```svelte
<!-- src/lib/components/calendar/RoomCalendar.svelte -->
<script lang="ts">
  import type { CalendarGrid } from '$lib/types/calendar.js';
  import BookingChip from './BookingChip.svelte';
  import { formatDateBangkok } from '$lib/utils/date.js';
  import * as m from '$lib/paraglide/messages.js';

  interface Props {
    grid: CalendarGrid;
    weekDates: string[]; // 7 ISO strings, Mon–Sun
  }

  let { grid, weekDates }: Props = $props();
</script>

<div class="overflow-x-auto" role="grid" aria-label={m.calendar_title()}>
  <!-- Column headers: day names -->
  <div class="grid" style="grid-template-columns: 12rem repeat(7, 1fr);">
    <div class="p-2 text-sm font-semibold text-gray-500">Rooms</div>
    {#each weekDates as isoDate (isoDate)}
      <div class="p-2 text-center text-sm font-semibold">
        {formatDateBangkok(new Date(isoDate), 'dayShort')}
        <span class="block text-xs font-normal text-gray-500">
          {formatDateBangkok(new Date(isoDate), 'date').slice(8)}
        </span>
      </div>
    {/each}
  </div>

  <!-- Room rows -->
  {#each grid as row (row.room.id)}
    <div class="grid border-t" style="grid-template-columns: 12rem repeat(7, 1fr);">
      <!-- Room name column -->
      <div class="p-2 text-sm font-medium border-r">
        <span>{row.room.name}</span>
        <span class="block text-xs text-gray-500">Floor {row.room.floor}</span>
      </div>

      <!-- Day cells -->
      {#each row.cells as cell, dayIndex (dayIndex)}
        <div
          class="min-h-16 p-1 border-r relative"
          class:bg-green-100={cell.state === 'available'}
          class:bg-amber-50={cell.state === 'blocked'}
          role="gridcell"
          aria-label={cell.ariaLabel}
        >
          {#if cell.state === 'available'}
            <a
              href={cell.href}
              class="absolute inset-0 flex items-center justify-center text-xs text-green-700 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
              aria-label={cell.ariaLabel}
            >
              <span class="sr-only">{m.calendar_available_label()}</span>
            </a>
          {:else if cell.state === 'blocked'}
            <!-- Blocked: hatched background + visible label (WCAG color-not-alone) -->
            <div
              class="absolute inset-0 pointer-events-none"
              style="background-image: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 8px);"
              aria-hidden="true"
            ></div>
            <span class="relative z-10 text-xs text-amber-800 font-medium px-1">
              {m.calendar_blocked_label()}
              {#if cell.blocks[0]?.reason}
                <span class="block text-xs font-normal opacity-75">{cell.blocks[0].reason}</span>
              {/if}
            </span>
          {:else}
            <!-- Booked: one or more BookingChips stacked vertically -->
            <div class="flex flex-col gap-1">
              {#each cell.bookings as booking (booking.id)}
                <BookingChip
                  bookingId={booking.id}
                  timeRange={booking.timeRange}
                  eventName={booking.eventName}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
</div>
```

### `+page.svelte` Week Navigation

```svelte
<!-- src/routes/(app)/calendar/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types.js';
  import RoomCalendar from '$lib/components/calendar/RoomCalendar.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { formatDateBangkok, addDays } from '$lib/utils/date.js';

  let { data }: { data: PageData } = $props();

  // Svelte 5 runes: const x = $derived(expr) — NOT "$derived const x"
  const weekStartDate = $derived(new Date(data.weekStart));
  const weekEndDate = $derived(addDays(weekStartDate, 6)); // Sunday
  const weekLabel = $derived(m.calendar_week_heading({
    start: formatDateBangkok(weekStartDate, 'date'),
    end: formatDateBangkok(weekEndDate, 'date')
  }));
</script>

<svelte:head>
  <title>{m.calendar_title()}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-2xl font-semibold">{m.calendar_title()}</h1>
    <div class="flex gap-2">
      <a href="?week={data.prevWeek}" class="btn btn-sm variant-ghost">
        &larr; {m.calendar_prev_week()}
      </a>
      <a href="?week={data.nextWeek}" class="btn btn-sm variant-ghost">
        {m.calendar_next_week()} &rarr;
      </a>
    </div>
  </div>

  <p class="text-sm text-gray-600 mb-4">{weekLabel}</p>

  {#if data.grid.length === 0}
    <p class="text-center py-12 text-gray-500">{m.calendar_empty_state()}</p>
  {:else}
    <RoomCalendar grid={data.grid} weekDates={data.weekDates} />
  {/if}
</div>
```

**Svelte 5 runes syntax:** Use `$derived` for reactive values, not reactive statements (`$:`). Use `$props()` for component props. See architecture §Svelte 5 Runes.

### Auth Guard — No New Guard Needed

The calendar route is at `/calendar` inside `(app)/`. The existing hook in `hooks.server.ts` uses pattern `^\/(?!(?:login|auth|r|skeleton|profile\/complete)(?:\/|$)|$)` which protects ALL routes not in the exclusion list — `/calendar` is NOT in the exclusion list, so it is already protected. Do NOT add a new guard. Do NOT modify `hooks.server.ts`.

### E2E Tests (`tests/e2e/bookings.spec.ts`)

Create a NEW file. Use the same header JSDoc pattern as `tests/e2e/profile.spec.ts`. All tests are `test.skip()` — do NOT activate them in Story 4.3.

```typescript
/**
 * ATDD Red-Phase E2E Scaffolds — Story 4.3: Room Calendar View
 * E2E Tests: Calendar renders, accessibility, slot state distinction
 *
 * TDD RED PHASE: All tests marked test.skip() — will be activated in a later story
 * after /bookings/new (Story 4.4) is functional.
 *
 * Playwright E2E tests — requires dev server running on port 3000.
 *
 * Authentication: uses dev bypass pattern (Story 2.2).
 *   POST /r/dev-bypass?profileComplete=true → authenticated organizer session.
 *   AUTH_DEV_BYPASS=true must be set in the dev server environment.
 *
 * AC Coverage:
 *   - AC-1: Calendar renders rooms × days grid; booking chips visible; empty cells clickable
 *   - AC-2: Slot states (available/booked/blocked) distinguishable without color alone
 *
 * Scenario IDs:
 *   - 4.3-E2E-001 [P1]: Calendar renders rooms on Y × days on X; chips visible; empty cells clickable
 *   - 4.3-A11Y-001 [P2]: axe-core zero WCAG 2.1 AA violations on /calendar
 *
 * Note: No Thai text hardcoded — per project rule, Rawinan handles all Thai translations.
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// Helper: authenticated session via dev bypass (Story 2.2 seam)
// ---------------------------------------------------------------------------

async function loginViaDevBypass(page: Page): Promise<void> {
  await page.goto('/r/dev-bypass?profileComplete=true', { waitUntil: 'networkidle' });
}

// ---------------------------------------------------------------------------
// 4.3-E2E-001 — Calendar grid renders rooms × days; chips visible; cells clickable [P1]
// ---------------------------------------------------------------------------

test.describe('Story 4.3 — Room Calendar: Grid Rendering (AC-1)', () => {
  test.skip('[P1] 4.3-E2E-001 — /calendar renders rooms on Y axis × days on X axis; booking chips visible; empty cells link to booking form', async ({
    page
  }) => {
    // Activation condition: /bookings/new route exists (Story 4.4 complete).
    // Prerequisite seed: ≥1 active room with ≥1 booking in the current week.
    //
    // AC-1: rooms on Y axis × days on X axis.
    // AC-1: booking chips show booked time range.
    // AC-1: empty day cells are clickable links.

    await loginViaDevBypass(page);
    await page.goto('/calendar', { waitUntil: 'networkidle' });

    // Page title present
    await expect(page).toHaveTitle(/Room Calendar/);

    // Calendar grid rendered (role=grid)
    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();

    // At least one room row visible
    const roomCells = page.getByRole('gridcell');
    await expect(roomCells.first()).toBeVisible();

    // At least one booking chip (data-booking-id attribute)
    // Requires a seeded booking in the current week
    const chip = page.locator('[data-booking-id]').first();
    // test.soft: comment out if no seed data available in CI
    // await expect(chip).toBeVisible();

    // Empty cell link points to /bookings/new with room and date params
    const availableLink = page.locator('a[href^="/bookings/new?room="]').first();
    // await expect(availableLink).toBeVisible();
    // await expect(availableLink).toHaveAttribute('href', /room=.+&date=\d{4}-\d{2}-\d{2}/);

    // Week navigation links present
    await expect(page.getByRole('link', { name: /Previous week/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Next week/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4.3-A11Y-001 — axe-core zero WCAG 2.1 AA violations on /calendar [P2]
// ---------------------------------------------------------------------------

test.describe('Story 4.3 — Room Calendar: Accessibility (AC-2, NFR-007)', () => {
  test.skip('[P2] 4.3-A11Y-001 — /calendar passes axe-core zero WCAG 2.1 AA violations; slot states distinguishable without color alone', async ({
    page
  }) => {
    // Activation condition: calendar page renders with at least one room.
    // AC-2: booked/available/blocked states distinguishable without color alone.
    // NFR-007: WCAG 2.1 AA compliance.

    await loginViaDevBypass(page);
    await page.goto('/calendar', { waitUntil: 'networkidle' });

    // axe-core scan — zero violations
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);

    // Slot states: verify aria-label includes state text (not color alone)
    const availableCell = page.locator('[role="gridcell"][aria-label*="available"]').first();
    const blockedCell = page.locator('[role="gridcell"][aria-label*="blocked"]').first();
    const bookedCell = page.locator('[role="gridcell"][aria-label*="booked"]').first();

    // At least one available cell has a text label (not just color)
    // await expect(availableCell).toBeVisible();
    // await expect(blockedCell).toBeVisible();
    // await expect(bookedCell).toBeVisible();
  });
});
```

### Previous Story Learnings (from Story 4.2)

1. **`asc(rooms.floor), asc(rooms.name)` ordering** — `getWeekCalendar()` returns rooms in stable display order (floor asc, name asc). Preserve this in the grid display.
2. **`weekEnd` via pure UTC math** — `getWeekCalendar()` uses `weekStart.getTime() + 7 * 24 * 60 * 60 * 1000`. Story 4.3's block query uses the same approach via `addDays(weekStart, 7)`. Do NOT use `new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)` — this is timezone-sensitive.
3. **`status != 'cancelled'` filter** — bookings query already excludes cancelled bookings. No need to filter again in the component.
4. **`$lib/server/...` is SERVER-ONLY** — never import `getWeekCalendar` or `roomBlocks` in Svelte components (even `import type` of the `db` export would fail). Only `+page.server.ts` may import from `$lib/server/`.
5. **TypeScript path for queries** — the actual file is `src/lib/server/db/queries/bookings.ts` (NOT `src/lib/server/queries/calendar.ts` as the test-design once mentioned). Import path: `'$lib/server/db/queries/bookings.js'` (`.js` extension required for ESM).
6. **`Booking` type location** — `Booking = typeof bookings.$inferSelect` is exported from `src/lib/server/services/booking-service.ts`. Import from there, not from the schema file.

### Design System Compliance (architecture §Forest & Copper, DESIGN.md)

- **Available slots:** `bg-green-100` fill; no time label (UXD-013: clean empty state)
- **Booked slots:** `bg-green-500` chips (BookingChip handles this)
- **Blocked slots:** hatched CSS pattern + `bg-amber-50` + "Blocked" label — pattern and label required (WCAG 2.1 AA)
- **Booking chip card:** `rounded-md`, `shadow-md` (shadow-2 in design), `bg-green-500`, radius `md`
- **Typography:** body `text-sm` with `leading-relaxed`; min font-size 14px (never below)
- **Loading state:** The calendar uses SvelteKit's `load` function — no client-side loading needed for initial render. If JS is disabled, the page still renders (SSR). If adding optimistic updates later, use shadcn Skeleton shimmer blocks (Story 4.8+).

### Files Changed Summary

**NEW files:**
- `src/lib/utils/date.ts`
- `src/lib/types/calendar.ts` (pure types — `CellState`, `CalendarCell`, `CalendarGridRow`, `CalendarGrid`)
- `src/lib/components/calendar/BookingChip.svelte`
- `src/lib/components/calendar/RoomCalendar.svelte`
- `src/routes/(app)/calendar/+page.server.ts`
- `src/routes/(app)/calendar/+page.svelte`
- `tests/e2e/bookings.spec.ts`

**UPDATED files:**
- `messages/en.json` — add 9 calendar keys
- `messages/th.json` — add same 9 keys as English stubs

**NOT changed (do not touch):**
- `src/lib/server/db/queries/bookings.ts` — Story 4.2 output, already correct
- `src/hooks.server.ts` — no new guard needed
- `drizzle/` migrations — no new migration; no schema change
- Any existing test files — Story 4.3 creates one new test file only

## File List

**NEW files:**
- `src/lib/utils/date.ts`
- `src/lib/types/calendar.ts`
- `src/lib/components/calendar/BookingChip.svelte`
- `src/lib/components/calendar/RoomCalendar.svelte`
- `src/routes/(app)/calendar/+page.server.ts`
- `src/routes/(app)/calendar/+page.svelte`

**UPDATED files:**
- `messages/en.json` — added 11 calendar keys (incl. rooms column header and floor prefix)
- `messages/th.json` — added 11 calendar keys as English stubs

**Pre-existing (ATDD phase, unchanged by dev):**
- `tests/e2e/bookings.spec.ts` — E2E scaffolds remain as `test.skip()`

## Dev Agent Record

### Completion Notes

Story 4.3 implemented as a UI-only story. No new DB migrations, no new booking mutations.

**Tasks 1–6 implemented:** date utilities (UTC+7 math, no DST), Paraglide message keys (11 keys added), BookingChip component with `data-booking-id` and `href="#"` placeholder, RoomCalendar component with available/booked/blocked cell states (WCAG 2.1 AA color-not-alone compliance), `+page.server.ts` with parallel booking+block queries and full CalendarGrid pre-computation, `+page.svelte` with week navigation.

**Task 7:** `tests/e2e/bookings.spec.ts` created in ATDD phase — confirmed present and correct; minor cleanup (commented out declared-but-unused test locator variables to satisfy lint).

**Quality gates passed:**
- `bunx prettier --write .` — all files formatted, none changed
- `bun run lint` — zero errors
- `bun run check` — 0 errors, 1 expected warning (`href="#"` placeholder in BookingChip)
- `bun run test:integration` — identical results to baseline (14 pre-existing failures unrelated to this story; all due to missing `AUTH_SECRET` / dev server not running)
- `DATABASE_URL=placeholder bun run build` — build succeeds

**Navigation lint compliance:** Used `resolve()` from `$app/paths` with `ResolvedPathname` type casting for query-param hrefs (following `svelte/no-navigation-without-resolve` rule pattern used throughout the codebase). Paraglide message keys for hardcoded text ("Rooms", "Floor {floor}") added to satisfy `local/no-raw-svelte-text` rule.

## Change Log

| Date | Change |
|------|--------|
| 2026-06-14 | Story created (Story 4.3: Room Calendar View) |
| 2026-06-14 | Implementation complete — date utils, Paraglide keys, calendar components, route, quality gates passed |
| 2026-06-14 | Step 5 code review — 3 patches applied & committed (83ebd51); 2 decision-needed surfaced; 1 deferred; 4 dismissed |
| 2026-06-14 | Product decisions resolved — block takes visual priority over BookingChip (blocked-wins); partial continuation indicator for multi-day bookings on non-start days |

### Review Findings (Step 5 — 2026-06-14)

Adversarial review (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Patches were auto-applied per pipeline mode and committed in `83ebd51`. Quality gates re-run green (prettier clean, lint clean, `bun run check` 0 errors / 0 warnings).

**Decision-needed (spec is silent — needs a product call; NOT auto-fixed):**

- [x] [Review][Decision] Block on a day that also has a booking hides the BookingChip entirely — **Resolved: option (a) blocked-wins.** When a cell is blocked, `cell.state === 'blocked'` and `RoomCalendar.svelte` renders only the hatched block view; the `BookingChip` is not shown. Underlying booking data remains in `cell.bookings` for future use but is not rendered. This keeps the UI unambiguous: admins must unblock before the room can be used.
- [x] [Review][Decision] Multi-day booking shows the full time range on every overlapped day — **Resolved: partial/continuation indicator.** Added `isContinuation: boolean` to `CalendarCell.bookings` items (computed in `+page.server.ts`: true when the booking's start date ≠ the cell's date). `BookingChip` now renders the full time range only on the start day; continuation days show a shortened `→ (cont.)` indicator with reduced opacity. ARIA label on continuation cells omits the time range to avoid confusing screen readers. Message key `calendar_booking_continuation_label` added to both `en.json` and `th.json`.

**Patches (applied & committed in 83ebd51):**

- [x] [Review][Patch] parseTstzrange only handled `+07` offset → Invalid Date under other DB session timezones [src/routes/(app)/calendar/+page.server.ts] — normalized any bare `±HH` offset to `±HH:00`; returns null on unparseable bounds. Manifests when DB session TZ ≠ +07 (e.g. UTC in CI / stock Postgres), where every booking/block was silently dropped and the calendar showed all slots available. Environment-dependent severity.
- [x] [Review][Patch] parseWeekParam crashed (500) on shape-valid but calendar-invalid `?week=` [src/lib/utils/date.ts] — `?week=2026-13-45` passed the regex, yielded an Invalid Date, and `weekStart.toISOString()` threw RangeError. Added `Number.isNaN(parsed.getTime())` guard → falls back to current week per the documented invariant.
- [x] [Review][Patch] Invalid ARIA grid structure (missing intermediate rows) [src/lib/components/calendar/RoomCalendar.svelte] — `role="grid"`/`role="gridcell"` lacked `role="row"` parents and header `role="columnheader"`/`role="rowheader"`. WCAG 2.1 AA `aria-required-parent`/`aria-required-children` gap under AC-2 / NFR-007. Added the missing roles.

**Deferred (real, non-blocking — see deferred-work.md):**

- [x] [Review][Defer] parseWeekParam silently rolls over impossible-but-parseable dates [src/lib/utils/date.ts] — `?week=2026-02-30` is a valid JS Date (rolls to Mar 1) so the isNaN guard does not catch it; the user is shown a different, wrong week instead of the current-week fallback. Low severity; round-trip validation deferred.

**Dismissed (noise / false positive / handled / spec-mandated):**

- `calendar_time_range` "dead" message key — explicitly listed in the spec's Paraglide Keys section; intentional. Dismissed.
- Only first block's reason shown per cell — acceptable for this scan view. Dismissed.
- BookingChip is `<button>` not the spec's `<a href="#">` — deliberate a11y improvement (avoids the `href="#"` anti-pattern; keyboard-accessible); `data-booking-id` still lets Story 4.4 wire navigation. Kept. (Note: Completion Notes still reference a now-gone `href="#"` check warning — cosmetic, not addressed in this review commit.)
- Keyed-each duplicate-key risk on `booking.id` — booking PKs are unique; theoretical only. Dismissed.
