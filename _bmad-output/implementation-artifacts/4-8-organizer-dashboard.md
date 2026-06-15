---
baseline_commit: fad9f2f28ab4a4ab246c0ab85908ba1c78e65ba0
---

# Story 4.8: Organizer Dashboard

**Status:** `ready-for-dev`
**Epic:** 4 — Room Booking & Organizer Workspace
**GH Issue:** #28
**Previous Story:** 4.7 — Edit, Cancel, and Duplicate a Booking
**Next Story:** 5.1 — Branded Public Registration Page (Epic 5)

## Story

As an organizer,
I want a dashboard of my upcoming bookings,
so that I can manage them at a glance.

## Acceptance Criteria

1. **My upcoming bookings only (FR-050)**: The dashboard loads all bookings where `organizerId = me AND status != 'cancelled' AND upper(during) >= now()`, ordered by start time ascending. No other organizer's bookings appear (IDOR boundary enforced in the query by `organizerId` filter).

2. **Booking card content (FR-051)**: Each booking entry shows: event name, room name, date and time (formatted Bangkok timezone via `formatDateBangkok`). If `registrationEnabled`, the registration link is shown; otherwise that column is absent. A registrant-count **placeholder** is shown (e.g. "—") — the real count belongs to Epic 5 (no registrations table exists yet).

3. **One-click copy of registration link (FR-052)**: When `registrationEnabled`, a copy-link button is present per booking card. Clicking copies the `https://.../r/[token]` URL to the clipboard using the same `navigator.clipboard?.writeText()` guard pattern from `/bookings/[id]/+page.svelte`. Reuse i18n keys `booking_copy_link_button` / `booking_copy_link_aria`. Show a transient "Link copied" toast on success (matches DESIGN.md Toast pattern, top-right, auto-dismiss).

4. **Empty state (UXD-020)**: If the organizer has no upcoming bookings, show one calm line and a primary CTA to the room calendar.

5. **Skeleton loading (UXD-020)**: Show skeleton placeholder while the page data loads. Use Svelte's `{#await}` or SvelteKit streaming where appropriate (the architecture specifies skeleton for lists/dashboard).

6. **NFR-003 Performance**: Dashboard load ≤ 3s under org load. The query filters by `organizerId` — add a note that the `organizer_id` column on the `bookings` table may need an index if performance testing shows > 3s.

7. **All new UI strings via Paraglide**: English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text anywhere in code or mocks.

8. **Sign-in sheet PDF**: Deferred to Epic 5 (FR-053). Requires `registrations` table which does not exist. Do not implement or stub — simply omit.

9. **Registrant count (real data)**: Deferred to Story 5.8 (registrant-list-dashboard-headcount). Show the `—` placeholder only.

10. **Catering summary**: Deferred to Epic 5 (requires `registrations` table). Omit entirely from this story.

11. **`/dashboard` route resolves**: This story creates the `(app)/dashboard/` route, which makes the existing profile-complete → `/dashboard` redirect (story 2.3) resolve instead of 404. No code change to the redirect needed — it just works once the route exists.

## Tasks / Subtasks

- [ ] Task 1: Add `getUpcomingBookingsByOrganizer` query to `src/lib/server/db/queries/bookings.ts` (AC: 1, 6)
  - [ ] 1.1: Export `getUpcomingBookingsByOrganizer(organizerId: string): Promise<UpcomingBookingRow[]>` — see query spec in Dev Notes
  - [ ] 1.2: The return type `UpcomingBookingRow` extends `Booking` with `roomName: string` (joined from `rooms` table) — avoids N+1 fetches for room names
  - [ ] 1.3: Add a dev-note comment that an index on `bookings(organizer_id)` may be needed if NFR-003 (<3s) is at risk; do NOT add a migration unless measurably needed

- [ ] Task 2: Create `/dashboard` route (AC: 1, 2, 3, 4, 5, 7)
  - [ ] 2.1: `src/routes/(app)/dashboard/+page.server.ts` — `requireUser` + call `getUpcomingBookingsByOrganizer(user.id)`; build `registrationUrl` per booking using `event.url.origin + '/r/' + booking.registrationToken`
  - [ ] 2.2: `src/routes/(app)/dashboard/+page.svelte` — render booking cards; copy-link button per registration-enabled booking; empty state; skeleton loading

- [ ] Task 3: `BookingCard` component (AC: 2, 3)
  - [ ] 3.1: New `src/lib/components/booking/BookingCard.svelte` — `card` surface, `shadow-2`, `radius-md` (DESIGN.md spec); props: booking row data + optional registrationUrl + optional onCopy callback
  - [ ] 3.2: Reuse the inline copy-link button pattern from `/bookings/[id]/+page.svelte` (do NOT create a new shared sub-component for just one use-case — inline is fine)

- [ ] Task 4: Add Paraglide message keys (AC: 7)
  - [ ] 4.1: Add all new keys to `messages/en.json` with English values
  - [ ] 4.2: Add all new keys to `messages/th.json` with empty string `""`
  - [ ] New keys needed:
    - `dashboard_title` — "My Bookings"
    - `dashboard_empty_title` — "No upcoming bookings"
    - `dashboard_empty_cta` — "Book a room"
    - `dashboard_registrant_count_label` — "Registrants"
    - `dashboard_registrant_count_placeholder` — "—"
    - `dashboard_copy_link_success` — "Link copied"
    - `dashboard_booking_card_room_label` — "Room"
    - `dashboard_booking_card_time_label` — "Time"

- [ ] Task 5: ATDD — add integration test stubs (AC: 1)
  - [ ] 5.1: In `tests/integration/bookings.test.ts`, add stubs:
    - `4.8-INT-001`: `getUpcomingBookingsByOrganizer` returns only the requesting organizer's upcoming active bookings (not another organizer's, not cancelled, not past) [P0]
    - `4.8-INT-002`: cancelled bookings are excluded from the dashboard query [P1]
    - `4.8-INT-003`: past bookings (`upper(during) < now()`) are excluded [P1]
    - Leave all as `test.skip(` until implementation; remove `.skip` during green phase

- [ ] Task 6: ATDD — add E2E test stubs (AC: 2, 3, 4)
  - [ ] 6.1: In `tests/e2e/bookings.spec.ts`, add stubs:
    - `4.8-E2E-001`: dashboard shows event name, room, date/time for an active booking [P1]
    - `4.8-E2E-002`: empty state renders when no upcoming bookings exist [P1]
    - `4.8-A11Y-001`: heading hierarchy and interactive elements pass basic a11y check [P2]
    - Leave all as `test.skip(` (matches repo convention; E2E requires seed wiring not done in CI)

## Dev Notes

### Scope Boundaries — Critical

**DO implement:**
- `(app)/dashboard/` route: my own upcoming non-cancelled bookings
- Booking cards: event name, room, date/time, conditional copy-link, registrant-count placeholder
- `getUpcomingBookingsByOrganizer` query function (NEW — does NOT reuse `getWeekCalendar`)
- Empty state + skeleton loading (UXD-020)

**DO NOT implement (deferred to Epic 5):**
- Sign-in sheet PDF (FR-053) — needs `registrations` table
- Real registrant count — needs `registrations` table (Story 5.8)
- Catering summary — needs `registrations` table

### Why NOT Reuse `getWeekCalendar` (Critical Guardrail)

`getWeekCalendar` (in `src/lib/server/db/queries/bookings.ts`) is week-bounded, returns ALL organizers' bookings grouped by room, and requires a `weekStart` date parameter. The dashboard needs:
- Organizer-scoped (only my own bookings)
- Future-unbounded (all upcoming, not just one week)
- No room grouping — flat list ordered by start time

Write a **new query** `getUpcomingBookingsByOrganizer`. The 4.2 comment "calendar and dashboard share one query" is aspirational phrasing that does not match this use case — do not force `getWeekCalendar` to serve the dashboard.

### Query Spec for `getUpcomingBookingsByOrganizer`

```ts
export type UpcomingBookingRow = Booking & { roomName: string };

export async function getUpcomingBookingsByOrganizer(
  organizerId: string
): Promise<UpcomingBookingRow[]> {
  // JOIN bookings + rooms on roomId
  // WHERE bookings.organizerId = organizerId
  //   AND bookings.status != 'cancelled'
  //   AND upper(bookings.during) >= now()   ← upper() extracts end of tstzrange
  // ORDER BY lower(bookings.during) ASC     ← lower() extracts start
  // Use drizzle sql`` template for tstzrange operators — no native Drizzle support
}
```

Drizzle tstzrange operators use `sql` template (same pattern as `getWeekCalendar`):
```ts
import { sql, eq, and, ne } from 'drizzle-orm';
import { rooms } from '../schema/rooms.js';

// ...
.where(
  and(
    eq(bookings.organizerId, organizerId),
    ne(bookings.status, 'cancelled'),
    sql`upper(${bookings.during}) >= now()`
  )
)
.orderBy(sql`lower(${bookings.during}) asc`)
```

For the JOIN to get roomName — use `getTableColumns` to spread table columns safely (avoids column name ambiguity in Drizzle 0.45+):
```ts
import { getTableColumns } from 'drizzle-orm';
// ...
const rows = await db
  .select({
    ...getTableColumns(bookings),  // all booking columns
    roomName: rooms.name           // extra field from join
  })
  .from(bookings)
  .innerJoin(rooms, eq(bookings.roomId, rooms.id))
  .where(...)
  .orderBy(sql`lower(${bookings.during}) asc`);
```

Note: This is the first JOIN query in this codebase. `getTableColumns` is the Drizzle-recommended way to spread a table's columns when also selecting from a joined table — avoids ambiguous column issues.

### Building `registrationUrl` in the Server Load

Same pattern as `/bookings/[id]/+page.server.ts`:
```ts
const registrationUrl = booking.registrationToken
  ? `${event.url.origin}/r/${booking.registrationToken}`
  : null;
```
Build this for every booking in the list; pass it alongside the booking data.

### Date Formatting

Use existing utilities — do not hand-roll date display:
```ts
import { parseTstzrange } from '$lib/utils/tstzrange.js';
import { formatDateBangkok } from '$lib/utils/date.js';

const range = parseTstzrange(booking.during);
const dateStr = range ? formatDateBangkok(range.lower, 'date') : '';
const startTime = range ? formatDateBangkok(range.lower, 'time') : '';
const endTime = range ? formatDateBangkok(range.upper, 'time') : '';
// Display: "2026-07-01  09:00–10:00"
```

### Copy-Link Pattern (Reuse from `/bookings/[id]/+page.svelte`)

Exact pattern to copy — do NOT reinvent:
```ts
async function copyLink(url: string): Promise<void> {
  try {
    await navigator.clipboard?.writeText(url);
    // show toast on success
  } catch {
    // Clipboard unavailable or permission denied — silent
  }
}
```

I18n keys already in `messages/en.json`:
- `booking_copy_link_button` — "Copy link"
- `booking_copy_link_aria` — "Copy registration link"

Toast for copy success: use `dashboard_copy_link_success` (new key). DESIGN.md calls for a "Link copied" transient toast, top-right, auto-dismiss. Implement a simple `$state`-based in-component toast or reuse whatever toast mechanism exists in the project. Check `src/lib/components/ui/` for any existing toast pattern first.

### Booking Card Styling (DESIGN.md)

Per DESIGN.md §4: `card` surface, `shadow-2`, radius `md`; shows event name, room, date/time, registrant count, catering summary, copy-link action.

CSS classes to use (from existing patterns in the codebase):
- `card` surface: `bg-card border rounded-md`
- `shadow-2`: `shadow-sm` (check existing card components in `src/lib/components/ui/card/`)
- Link to `/bookings/[id]` for "manage" CTA on each card

### Empty State Pattern (UXD-020)

One calm line + single CTA:
```svelte
{#if bookings.length === 0}
  <div class="py-12 text-center">
    <p class="mb-4 text-muted-foreground">{m.dashboard_empty_title()}</p>
    <a href={calendarHref} class="...">{m.dashboard_empty_cta()}</a>
  </div>
{/if}
```

### Skeleton Loading (UXD-020)

Architecture and UX spec require skeleton placeholders for dashboard load. In SvelteKit, use `+page.server.ts` streaming or show skeletons via Svelte's `{#await}` pattern. At minimum: during SSR/fast server loads this is implicit. For client-side navigation, the simplest approach is to render 3 skeleton card shapes (grey-green shimmer blocks matching card dimensions) while data is pending. Check if any skeleton component exists in `src/lib/components/ui/`.

### Route Note: `/dashboard` Fixes 2.3 Profile Redirect

Story 2.3's `profile/complete/+page.server.ts` redirects to `/dashboard` after profile completion:
```ts
const POST_COMPLETE_DESTINATION = '/dashboard';
```
This currently 404s. Creating `(app)/dashboard/` in this story fixes that silently — no code change needed to 2.3, it just works.

### Security: IDOR Boundary

The `organizerId` filter in `getUpcomingBookingsByOrganizer` IS the authorization boundary — it is enforced in the DB query, not via `assertOwner`. There is no per-item ownership check needed because we only fetch the organizer's own rows. Integration tests (4.8-INT-001) must verify that organizer B's bookings are NOT returned when organizer A calls the function.

### Pre-commit Gate

Before every commit:
```bash
bunx prettier --write . && bun run lint
```

### i18n Rules

- All UI strings via `$lib/paraglide/messages.js` (`m.*()` calls)
- Add English values to `messages/en.json`, empty `""` to `messages/th.json`
- **Never write Thai text** in code or mocks — Rawinan handles all translation
- Run `bun run paraglide:build` if `messages.js` needs refresh after adding keys

### File List Summary

**New files:**
- `src/routes/(app)/dashboard/+page.server.ts`
- `src/routes/(app)/dashboard/+page.svelte`
- `src/lib/components/booking/BookingCard.svelte`

**Updated files:**
- `src/lib/server/db/queries/bookings.ts` — add `getUpcomingBookingsByOrganizer`
- `messages/en.json` — add 8 new keys
- `messages/th.json` — add 8 new keys (empty strings)
- `tests/integration/bookings.test.ts` — add 3 `test.skip` stubs (4.8-INT-001..003)
- `tests/e2e/bookings.spec.ts` — add 3 `test.skip` stubs (4.8-E2E-001..002, 4.8-A11Y-001)

### References

- Epics file: `_bmad-output/planning-artifacts/epics.md` — Story 4.8 AC (scope boundary)
- PRD F6: `_bmad-output/planning-artifacts/prds/prd-conference-envocc-2026-06-07/prd.md` — FR-050..053
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — `(app)/dashboard/` route, NFR-003
- UX DESIGN.md: `_bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/DESIGN.md` — Booking card spec, Toast, Skeleton, Empty state
- UX EXPERIENCE.md: `_bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/EXPERIENCE.md` — Organizer Dashboard flow §2 Flow 1
- Booking schema: `src/lib/server/db/schema/bookings.ts`
- Rooms schema: `src/lib/server/db/schema/rooms.ts`
- Existing bookings queries: `src/lib/server/db/queries/bookings.ts` — `getWeekCalendar` (NOT to reuse), `getBookingById`
- Booking service: `src/lib/server/services/booking-service.ts` — `Booking` type
- Guards: `src/lib/server/auth/guards.ts` — `requireUser`
- Copy-link pattern: `src/routes/(app)/bookings/[id]/+page.svelte` — `copyRegistrationLink()` + clipboard guard
- Booking detail page (server): `src/routes/(app)/bookings/[id]/+page.server.ts` — `registrationUrl` build pattern
- tstzrange parser: `src/lib/utils/tstzrange.ts`
- Date formatter: `src/lib/utils/date.ts`
- Existing booking card keys: `messages/en.json` — `booking_copy_link_button`, `booking_copy_link_aria` (reuse these)
- Profile complete redirect target: `src/routes/(app)/profile/complete/+page.server.ts` (L30 `POST_COMPLETE_DESTINATION = '/dashboard'`)
- Previous story: `_bmad-output/implementation-artifacts/4-7-edit-cancel-and-duplicate-a-booking.md`

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List
