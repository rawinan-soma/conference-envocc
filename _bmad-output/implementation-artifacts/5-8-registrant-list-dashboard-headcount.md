---
baseline_commit: 6984b37
---

# Story 5.8: Registrant List & Dashboard Headcount

**Status:** `done`
**Epic:** 5 — External Registration & Headcount
**GH Issue:** #36
**Previous Story:** 5.2 — Submit a Registration
**Next Story:** 5.3 — Confirmation Email with Self-Cancel Link

## Story

As an organizer,
I want to see a list of registrants for my event and a live headcount on the dashboard,
So that I can track attendance and monitor registration numbers at a glance.

## Acceptance Criteria

1. **Registrant list page (AC-1)**: A new route `/bookings/[id]/registrants` renders a list of all registrants for the given booking. Each row shows: first name, last name, organization, email, and a status badge (Registered or Cancelled). The page title displays the event name.

2. **Status badge display (AC-2)**: Status is displayed as a styled pill badge — "Registered" badge uses `green-100` background / `green-700` text; "Cancelled" badge uses `cream-200` background / `ink-2` text (per DESIGN.md). Status is conveyed via text label, never by color alone (WCAG 2.1 AA).

3. **IDOR ownership guard (AC-3 / R-007 MITIGATE)**: Only the event owner (organizer) may view the registrant list. Any other authenticated user attempting access receives 403. Admin users (`user.isAdmin = true`) may view registrant lists for ALL events (cross-event access). Unauthenticated users are redirected to `/login`.

4. **Empty state (AC-4)**: When a booking has no registrants, the page shows a meaningful empty state message rather than an empty list.

5. **Dashboard headcount (AC-5 / FR-052)**: The organizer dashboard card for each booking shows the live count of `status='registered'` (non-cancelled) registrants. The placeholder "—" is replaced with the actual number. Headcount is computed via a subquery/aggregation in `getUpcomingBookingsByOrganizer`; does not require a separate request.

6. **Headcount excludes cancelled registrants (AC-6)**: Registrants with `status='cancelled'` are NOT counted in the headcount. Only `status='registered'` rows count.

7. **All UI strings via Paraglide (AC-7)**: English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text in code or mocks.

## Tasks / Subtasks

- [x] Task 1: Add `getRegistrantsByBookingId` query to `registrations.ts` (AC: 1, 3)
  - [x] 1.1: In `src/lib/server/db/queries/registrations.ts`, add `getRegistrantsByBookingId(bookingId: string): Promise<Registration[]>` — returns all registrations for the booking ordered by `createdAt` ASC
  - [x] 1.2: Import `eq`, `asc` from `drizzle-orm` and use standard Drizzle select syntax (NOT raw SQL)
  - [x] 1.3: Export the function from the module (no barrel re-export needed; routes import directly)

- [x] Task 2: Extend `getUpcomingBookingsByOrganizer` to include registrant count (AC: 5, 6)
  - [x] 2.1: In `src/lib/server/db/queries/bookings.ts`, extend the `UpcomingBookingRow` type to add `registrantCount: number`
  - [x] 2.2: Update `getUpcomingBookingsByOrganizer` to add a subquery COUNT: `(SELECT COUNT(*) FROM registrations WHERE booking_id = bookings.id AND status = 'registered')` as `registrantCount` — count only `status='registered'` rows (excludes cancelled per AC-6)
  - [x] 2.3: Use Drizzle's `sql<number>` tagged template for the subquery; cast with `::int` to ensure number type not string
  - [x] 2.4: Verify the returned type is `number` (not `string`) — Drizzle's `sql<number>` may still return string from pg driver; if so, apply `Number(row.registrantCount)` coercion in the query or caller

- [x] Task 3: Wire `registrantCount` through dashboard (AC: 5)
  - [x] 3.1: In `src/routes/(app)/dashboard/+page.server.ts`, the `registrantCount` from the query is already on the `UpcomingBookingRow` spread — no explicit mapping needed; verify it flows through the `.map()` callback
  - [x] 3.2: In `src/lib/components/booking/BookingCard.svelte`, replace the `dashboard_registrant_count_placeholder` span with the actual `booking.registrantCount` value. Replace:
    ```svelte
    <span class="text-sm font-medium text-muted-foreground">{m.dashboard_registrant_count_placeholder()}</span>
    ```
    With:
    ```svelte
    <span class="text-sm font-medium text-foreground">{booking.registrantCount}</span>
    ```
  - [x] 3.3: Remove the `dashboard_registrant_count_placeholder` Paraglide call (the key itself stays in `messages/en.json` for now — just stop calling it in the component)

- [x] Task 4: Create registrant list route (AC: 1, 2, 3, 4, 7)
  - [x] 4.1: Create `src/routes/(app)/bookings/[id]/registrants/+page.server.ts` — follows same auth pattern as `/bookings/[id]/+page.server.ts`:
    - `requireUser(event)` → redirect 302 if unauthenticated
    - `getBookingById(id)` → `error(404, 'Booking not found')` if missing
    - Owner-or-admin guard: if `!user.isAdmin`, call `assertOwner(event, booking.organizerId)` (403 for non-owner, non-admin); if `user.isAdmin`, skip assertOwner (admin sees all — AC-3)
    - `getRegistrantsByBookingId(id)` — all registrations (both statuses displayed)
    - Return `{ booking, registrants }`
  - [x] 4.2: Create `src/routes/(app)/bookings/[id]/registrants/+page.svelte` — renders the registrant list:
    - Page heading: event name from `data.booking.eventName`
    - Table or list with columns: name (first + last), organization, email, status badge
    - Status badge: pill with `rounded-sm` per DESIGN.md; "Registered" = `bg-green-100 text-green-700`; "Cancelled" = `bg-amber-50 text-stone-500` (tailwind equivalents — cream-200/ink-2 are CSS vars, not utilities)
    - Empty state: if `data.registrants.length === 0`, show `m.registrant_list_empty_state()` message
    - Use Svelte 5 runes: `$props()` — NO `$:` reactive declarations, NO Svelte 4 syntax
  - [x] 4.3: Add "View Registrants" link from `/bookings/[id]` page pointing to `/bookings/[id]/registrants` — check `src/routes/(app)/bookings/[id]/+page.svelte` for where to insert; only show when `booking.registrationEnabled`

- [x] Task 5: Add Paraglide message keys (AC: 7)
  - [x] 5.1: Add the following keys to `messages/en.json` (English values as shown):
    ```json
    "registrant_list_title": "Registrants",
    "registrant_list_column_name": "Name",
    "registrant_list_column_org": "Organization",
    "registrant_list_column_email": "Email",
    "registrant_list_column_status": "Status",
    "registrant_list_status_registered": "Registered",
    "registrant_list_status_cancelled": "Cancelled",
    "registrant_list_empty_state": "No registrants yet.",
    "registrant_list_view_link": "View Registrants",
    "registrant_list_back_link": "Back to Booking"
    ```
  - [x] 5.2: Add same keys to `messages/th.json` with empty string `""` for every key — no Thai text in code; Rawinan handles translation
  - [x] 5.3: Run `bun run paraglide:build` if the `messages.js` module needs refresh after adding keys

- [x] Task 6: ATDD — integration test stubs (AC: 1, 3, 5, 6)
  - [x] 6.1: Append to `tests/integration/registrations.test.ts`:
  - [x] 6.2: **P0 ACTIVE** — `5.8-INT-IDOR-001`: Registrant list IDOR — non-owner organizer gets 403/404
    - Use `testOwnershipEnforcement()` from `tests/support/helpers/idor-template.ts`
    - Seed two users + bookings; organizer B requests `/bookings/[A-id]/registrants`
    - Assert response status 403 or 404
    - Do NOT use `getDevBypassCookie()` for two-user IDOR proofs — seed both users directly in DB
  - [x] 6.3: **P0 ACTIVE** — `5.8-INT-001`: Registrant list shows correct status
    - Seed one booking with two registrants: one `status='registered'`, one `status='cancelled'`
    - Load the route with the booking owner's session
    - Assert both registrants appear in returned data with correct status values
  - [x] 6.4: **P0 ACTIVE** — `5.8-INT-002`: Dashboard headcount updates live
    - Seed booking with 3 registered + 1 cancelled registrants (4 total)
    - Call `getUpcomingBookingsByOrganizer(organizerId)`
    - Assert `registrantCount === 3` (cancelled excluded per AC-6)
  - [x] 6.5: **P2 `test.skip`** — `5.8-INT-003`: Admin sees all registrant lists (not just own events)
    - Seed admin user (isAdmin=true); seed second organizer's booking with registrants
    - Admin requests `/bookings/[other-organizer-id]/registrants` — assert 200 (not 403)

- [x] Task 7: ATDD — E2E test stubs (AC: 1, 2, 5)
  - [x] 7.1: Append to `tests/e2e/registrations.spec.ts`:
  - [x] 7.2: **P1 `test.skip`** — `5.8-E2E-001`: Organizer sees registrant list with status badges
    - Playwright; seed booking + mixed-status registrants; navigate to `/bookings/[id]/registrants`
    - Assert table rows visible; Registered badge present; Cancelled badge present
  - [x] 7.3: **P1 `test.skip`** — `5.8-E2E-002`: Dashboard card shows live headcount after a new registration
    - Playwright; seed booking; create registration via form submit; navigate to `/dashboard`
    - Assert the booking card shows `1` (not `—`)

## Dev Notes

### Scope Boundaries — Critical

**DO implement:**
- `getRegistrantsByBookingId(bookingId)` query in `src/lib/server/db/queries/registrations.ts`
- `registrantCount` field added to `UpcomingBookingRow` via subquery in `getUpcomingBookingsByOrganizer`
- Dashboard `BookingCard.svelte` — replace `—` placeholder with real `booking.registrantCount`
- New route `src/routes/(app)/bookings/[id]/registrants/` (`+page.server.ts` + `+page.svelte`)
- "View Registrants" link added to `/bookings/[id]/+page.svelte`
- Owner-or-admin guard pattern on the registrant list route (NOT bare `assertOwner`)
- Status badges: Registered (green) and Cancelled (muted) — Svelte 5 runes
- Paraglide `registrant_list_*` i18n keys (English + empty Thai)
- ATDD stubs: integration P0 active + P2 skip, E2E P1 skip (in existing test files)

**DO NOT implement (scoped to later stories):**
- "Attended" status — the `registrations.status` column only has `'registered' | 'cancelled'` today. The "Attended" state and its badge (`green-700` bg / white text from DESIGN.md) belong to **Epic 6** (sign-in sheet / attendance marking). Story 5.8 displays only the two existing statuses. Do NOT extend the status enum.
- Mark-attended action / attendance-marking of any kind — Epic 6 scope
- Attendance QR scanning — Epic 6 scope
- CSV export of registrants — Epic 7 (7-4-csv-export)
- Catering aggregation / meal type breakdown — Story 5.7
- Cancellation by organizer — Story 5.4 handles self-cancel; organizer-cancel is a separate concern
- Pagination — the registrant list has no pagination requirement in Story 5.8; render all rows
- `5.8-PERF-001` (500-registrant load test) — P3/nightly only; do NOT block dev or PR on it

### Tech Stack Reminders

- **SvelteKit 5 + Svelte 5 runes**: Use `$props()`, `$derived`, `$state`. Zero Svelte 4 syntax (`$:`, `export let`).
- **Drizzle ORM** for all DB queries. No raw `pg` in production query files.
- **Paraglide 2.0**: Import from `$lib/paraglide/messages.js` as `import * as m from '$lib/paraglide/messages.js'`; call `m.key_name()`. All strings go through Paraglide — no hardcoded English/Thai literals in `.svelte` or `.ts` files.
- **TypeScript strict**: All new functions must have explicit return types. No `any`.
- **No Thai text** in source code, fixtures, or mocks — Rawinan handles all translation.

### Guard Pattern — Owner-or-Admin (Critical)

The standard `assertOwner` guard **rejects admin users** (it compares `user.id === ownerId`, and an admin has a different ID). The registrant list route requires a **custom guard**:

```typescript
// In +page.server.ts for /bookings/[id]/registrants
const user = requireUser(event);
const booking = await getBookingById(id);
if (!booking) error(404, 'Booking not found');

// Owner-or-admin guard — DO NOT use bare assertOwner()
if (!user.isAdmin && user.id !== booking.organizerId) {
  error(403, 'Forbidden: you do not own this resource');
}
```

Do NOT call `assertOwner(event, booking.organizerId)` unconditionally — it will block admin access. This is the required pattern for `5.8-INT-003` (admin cross-event) and `5.8-INT-IDOR-001` (non-owner denial) to both pass.

### Headcount Subquery Spec

The `getUpcomingBookingsByOrganizer` query in `src/lib/server/db/queries/bookings.ts` must be extended to include a correlated subquery:

```typescript
// Add to UpcomingBookingRow type:
export type UpcomingBookingRow = Booking & { roomName: string; registrantCount: number };

// In the .select() call, add:
registrantCount: sql<number>`(
  SELECT COUNT(*)::int
  FROM registrations r
  WHERE r.booking_id = ${bookings.id}
    AND r.status = 'registered'
)`.as('registrant_count'),
```

**Critical**: Cast `COUNT(*)` to `::int` in SQL. Without the cast, PostgreSQL returns `count` as `bigint`, which pg driver returns as a JS `string`. The `::int` cast coerces it to a 32-bit integer which pg driver returns as JS `number`. If the result is still a string at runtime, add `Number(row.registrantCount)` in the caller.

**Import**: `sql` is already imported in `bookings.ts` from `drizzle-orm`.

### Query for Registrant List Page

```typescript
// src/lib/server/db/queries/registrations.ts — add after createRegistrant:
import { eq, asc } from 'drizzle-orm';
import { db } from '../index.js';

export async function getRegistrantsByBookingId(bookingId: string): Promise<Registration[]> {
  return db
    .select()
    .from(registrations)
    .where(eq(registrations.bookingId, bookingId))
    .orderBy(asc(registrations.createdAt));
}
```

Note: `db` is imported from `'../index.js'` — the same pattern as other query files. The existing `createRegistrant` function takes a `DrizzleTransaction` (not `db`); `getRegistrantsByBookingId` uses `db` directly (no transaction needed for reads).

### Status Badge Styling

DESIGN.md specifies:
- **Registered**: pill, `radius: sm`, background `green-100`, text `green-700`
- **Cancelled**: pill, `radius: sm`, background `cream-200`, text `ink-2`

Verify exact Tailwind class names by checking `tailwind.config.ts` for custom `cream-200` and `ink-2` color tokens — these are project-specific design tokens from Story 1.2. Do not assume standard Tailwind colors. If `cream-200`/`ink-2` are not in the Tailwind config, use nearest equivalents (e.g., `bg-amber-50 text-stone-500`).

The badge must carry a visible text label — status is NEVER communicated by color alone (WCAG 2.1 AA, NFR-007). No `aria-hidden` on the text.

Example badge template:
```svelte
<span class={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${
  reg.status === 'registered'
    ? 'bg-green-100 text-green-700'
    : 'bg-amber-50 text-stone-500'
}`}>
  {reg.status === 'registered'
    ? m.registrant_list_status_registered()
    : m.registrant_list_status_cancelled()}
</span>
```

### "Attended" Status — Forward-Compat Decision

Story 5.8 does NOT add "Attended" status handling. The badge component should only handle `'registered'` and `'cancelled'` branches. When Epic 6 implements attendance marking, it will extend the schema and add the "Attended" badge branch at that time. The `else` branch of the badge (for unknown status) can default to the "Cancelled" styling as a safe fallback.

### Existing Files Being Modified

| File | Change | Risk |
|------|--------|------|
| `src/lib/server/db/queries/registrations.ts` | Add `getRegistrantsByBookingId` | Low — additive only |
| `src/lib/server/db/queries/bookings.ts` | Extend `UpcomingBookingRow` type + add subquery to `getUpcomingBookingsByOrganizer` | Medium — type change affects all callers |
| `src/routes/(app)/dashboard/+page.server.ts` | Verify `registrantCount` flows through — likely no code change needed | Low |
| `src/lib/components/booking/BookingCard.svelte` | Replace placeholder span with `booking.registrantCount` | Low |
| `src/routes/(app)/bookings/[id]/+page.svelte` | Add "View Registrants" link | Low |
| `messages/en.json` | Add `registrant_list_*` keys | Low |
| `messages/th.json` | Add same keys as `""` | Low |
| `tests/integration/registrations.test.ts` | Append 5.8 test scenarios | Low — append only |
| `tests/e2e/registrations.spec.ts` | Append 5.8 E2E stubs | Low — append only |

**New files:**
- `src/routes/(app)/bookings/[id]/registrants/+page.server.ts`
- `src/routes/(app)/bookings/[id]/registrants/+page.svelte`

### `UpcomingBookingRow` Type Change — Ripple Check

When `registrantCount: number` is added to `UpcomingBookingRow`, TypeScript will error on any existing code that constructs `UpcomingBookingRow` objects manually in tests. Check:
- `tests/integration/` — if any test mocks a `UpcomingBookingRow`, add `registrantCount: 0`
- Dashboard's `+page.server.ts` — the spread `...booking` already passes through all fields; no change needed

### Integration Test Scaffold

```typescript
// Append to tests/integration/registrations.test.ts

// ── Story 5.8: Registrant List & Dashboard Headcount ────────────────────────

describe('5.8 – Registrant List & Dashboard Headcount', () => {
  // 5.8-INT-IDOR-001 — P0 ACTIVE — R-007 MITIGATE gate test
  test('5.8-INT-IDOR-001: registrant list IDOR — non-owner gets 403/404', async () => {
    // Use testOwnershipEnforcement() from idor-template.ts
    // Seed organizer A's booking + organizer B's session
    // Assert B cannot access A's registrant list
    await testOwnershipEnforcement({
      // See idor-template.ts for config shape
      // resourcePath: `/bookings/${bookingAId}/registrants`
    });
  });

  // 5.8-INT-001 — P0 ACTIVE
  test('5.8-INT-001: registrant list shows correct status: Registered / Cancelled', async () => {
    // Seed: 1 booking with 2 registrants — one registered, one cancelled
    // Fetch via getRegistrantsByBookingId
    // Assert both rows returned; statuses correct
  });

  // 5.8-INT-002 — P0 ACTIVE
  test('5.8-INT-002: dashboard headcount = registered count only (excludes cancelled)', async () => {
    // Seed: 1 booking, 3 registered + 1 cancelled
    // Call getUpcomingBookingsByOrganizer(organizerId)
    // Assert registrantCount === 3
  });

  // 5.8-INT-003 — P2 test.skip
  test.skip('5.8-INT-003: admin sees registrant list for event they do not own', async () => {
    // Seed admin user; seed other organizer's booking with registrants
    // Admin requests /bookings/[id]/registrants
    // Assert 200, registrants returned
  });
});
```

### E2E Test Scaffold

```typescript
// Append to tests/e2e/registrations.spec.ts

// ── Story 5.8: Registrant List & Dashboard Headcount ────────────────────────

test.skip('5.8-E2E-001: organizer sees registrant list with status badges', async ({ page }) => {
  // Playwright; seed booking + mixed-status registrants
  // Navigate to /bookings/[id]/registrants as organizer
  // Assert table rows; Registered badge visible; Cancelled badge visible
});

test.skip('5.8-E2E-002: dashboard card shows live headcount after a new registration', async ({ page }) => {
  // Playwright; seed booking; register via public form; navigate to /dashboard
  // Assert booking card shows "1" (not "—" / placeholder)
});
```

### i18n Keys — Full List

Add to `messages/en.json`:

```json
"registrant_list_title": "Registrants",
"registrant_list_column_name": "Name",
"registrant_list_column_org": "Organization",
"registrant_list_column_email": "Email",
"registrant_list_column_status": "Status",
"registrant_list_status_registered": "Registered",
"registrant_list_status_cancelled": "Cancelled",
"registrant_list_empty_state": "No registrants yet.",
"registrant_list_view_link": "View Registrants",
"registrant_list_back_link": "Back to Booking"
```

Add same keys to `messages/th.json` with `""` values. Run `bun run paraglide:build` after.

### PR Gate Tests

Tests that MUST pass before PR merge (P0 — no `.skip`):
- `5.8-INT-IDOR-001` — R-007 MITIGATE (mandatory, same tier as `5.1-INT-IDOR-001` and `5.2-INT-CLOSED-001`)
- `5.8-INT-001` — registrant list statuses
- `5.8-INT-002` — headcount excludes cancelled

The full mandatory gate list from test-design-epic-5.md (for reference) now includes:
`5.1-INT-IDOR-001`, `5.2-INT-CLOSED-001`, `5.8-INT-IDOR-001` (all BLOCK/MITIGATE tests).

### Pre-commit Checklist

```bash
bunx prettier --write . && bun run lint
```

Run before every commit. CI will also run lint; failing lint blocks merge.

## Dev Agent Record

### Implementation Notes

- Task 1: Added `getRegistrantsByBookingId(bookingId)` to `src/lib/server/db/queries/registrations.ts`. Added `eq`, `asc` imports from drizzle-orm and `db` from `../index.js`. Uses standard Drizzle `.select().from().where().orderBy()` — no raw SQL.
- Task 2: Extended `UpcomingBookingRow` type to add `registrantCount: number`. Added correlated subquery `(SELECT COUNT(*)::int FROM registrations r WHERE r.booking_id = bookings.id AND r.status = 'registered')` using `sql<number>` tagged template. Added `Number()` coercion in the return map to guard against pg driver string return.
- Task 3: `dashboard/+page.server.ts` — spread `...booking` already passes `registrantCount` through. `BookingCard.svelte` — replaced placeholder span with `{booking.registrantCount}`.
- Task 4: Created `src/routes/(app)/bookings/[id]/registrants/+page.server.ts` with owner-or-admin guard (`!user.isAdmin && user.id !== booking.organizerId → error(403)`). Created `+page.svelte` with Svelte 5 runes, table layout, status badges (`bg-green-100 text-green-700` / `bg-amber-50 text-stone-500` — cream-200/ink-2 are CSS vars only, not Tailwind utilities). Added "View Registrants" link to `/bookings/[id]/+page.svelte` behind `registrationEnabled` guard.
- Task 5: Added 10 `registrant_list_*` keys to `messages/en.json` and `messages/th.json`. Recompiled paraglide via `bunx @inlang/paraglide-js compile`.
- Tasks 6 & 7: ATDD scaffolds already committed in commit `c3ba10b` (ATDD red-phase). Tests 5.8-INT-001 and 5.8-INT-002 now PASS. 5.8-INT-IDOR-001 is guarded by `test.skipIf(!DEV_SERVER_URL)` — guard is implemented in `+page.server.ts`.

### Test Results

- `5.8-INT-001` — PASS (getRegistrantsByBookingId returns both registered and cancelled statuses)
- `5.8-INT-002` — PASS (registrantCount=3 for 3 registered + 1 cancelled; type=number confirmed)
- `5.8-INT-IDOR-001` — SKIP (no dev server in test env; guard verified by code inspection)
- `svelte-check` — 0 errors, 0 warnings
- `eslint` — 0 errors

## File List

**Modified:**
- `_bmad-output/implementation-artifacts/5-8-registrant-list-dashboard-headcount.md`
- `messages/en.json`
- `messages/th.json`
- `src/lib/components/booking/BookingCard.svelte`
- `src/lib/server/db/queries/bookings.ts`
- `src/lib/server/db/queries/registrations.ts`
- `src/routes/(app)/bookings/[id]/+page.svelte`

**New:**
- `src/routes/(app)/bookings/[id]/registrants/+page.server.ts`
- `src/routes/(app)/bookings/[id]/registrants/+page.svelte`

## Review Findings

Code review 2026-06-16 (adversarial: Blind Hunter + Edge Case Hunter + Acceptance Auditor). Outcome: clean — 0 patches, 0 decisions, 2 deferred, 6 dismissed. Acceptance Auditor confirmed all seven ACs satisfied; prettier + eslint green.

- [x] [Review][Defer] E2E `getByText('—')` placeholder assertion is brittle [tests/e2e/registrations.spec.ts] — deferred: test-only, inside a `test.skip` red-phase stub; harden (use a scoped locator / role) when 5.8-E2E-002 is activated in its green phase.
- [x] [Review][Defer] Registrant list route not gated by `registrationEnabled` [src/routes/(app)/bookings/[id]/registrants/+page.server.ts] — deferred: by design. The "View Registrants" link is gated (Task 4.3) but the route is intentionally reachable so an organizer can review registrants after registration closes; route is still owner-or-admin guarded (AC-3). Revisit only if product requires hiding the list once registration is disabled.

Dismissed as noise/false-positive or documented intent: (1) 403-vs-404 enumeration oracle — AC-3 explicitly mandates 403 for non-owner; booking IDs are UUIDs (non-enumerable). (2) Status badge `else`-branch labels unknown status as "Cancelled" — intentional forward-compat per Dev Notes (line 235). (3) `let bookingAId`/`nonOwnerCookie` definite-assignment in test — cosmetic; tsc/eslint pass. (4) Unbounded result set / no pagination — explicitly out of scope (Dev Notes; PERF test is P3 do-not-block). (5) IDOR gate `5.8-INT-IDOR-001` skipped in CI — verified false: CI sets `DEV_SERVER_URL` (`.github/workflows/ci.yml:128`) and starts the dev server, so the R-007 MITIGATE gate runs in CI. (6) Owner-or-admin guard phrasing — Acceptance Auditor confirmed functionally identical to spec, not a violation.

## Change Log

- 2026-06-16: Code review complete — clean (0 patches, 0 decisions). 2 items deferred (test-only / by-design), 6 dismissed. Status → done.
- 2026-06-16: Story 5.8 implementation complete — getRegistrantsByBookingId query, registrantCount subquery in getUpcomingBookingsByOrganizer, BookingCard headcount wired, registrant list route with owner-or-admin guard, status badges, "View Registrants" link, 10 i18n keys. ATDD P0 tests (INT-001, INT-002) PASS.
