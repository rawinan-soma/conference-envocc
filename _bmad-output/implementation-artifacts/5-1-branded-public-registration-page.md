---
baseline_commit: 157943a59d467107455cc7b901d7fe3d176dfbee
---

# Story 5.1: Branded Public Registration Page

**Status:** `done`
**Epic:** 5 — External Registration & Headcount
**GH Issue:** #29
**Previous Story:** 4.8 — Organizer Dashboard
**Next Story:** 5.2 — Submit a Registration

## Story

As an external attendee,
I want to open the event's registration page,
So that I can see the event and register.

## Acceptance Criteria

1. **Valid token resolves event data (AC-1 / FR-040)**: Given a valid `registration_token`, GET `/r/[token]` (no login required) renders: org logo (`/logo.svg`, with graceful fallback if absent), event name, formatted date and time (Asia/Bangkok, UTC+7), room name, agenda (if populated), and contact name + phone from the organizer's profile. No authentication guard fires on this route.

2. **Closed registration shows closed message (AC-2)**: If `registrationEnabled = false`, the page shows a clear "registration closed" message instead of the registration form. The event name, date, and room are still displayed so the attendee knows they reached the right page. The form fields are not rendered at all.

3. **IDOR guard: invalid/forged token returns 404 (AC-3 / R-001 BLOCK)**: If the provided token does not match any `registration_token` in the database, the server returns a 404 error with no event data leaked. A forged token constructed from a known-valid token prefix cannot reveal another event's details. This closes R-001 (score=9, BLOCK). Test `5.1-INT-IDOR-001` is mandatory P0.

4. **No agenda hides section (AC-4)**: If `booking.agenda` is `null` or empty string, the agenda section is not rendered. The page must not display a blank agenda heading.

5. **Accessibility (NFR-007)**: Public registration page passes WCAG 2.1 AA. axe-core must not report any violations on either the open-state page or the closed-state page.

6. **All UI strings via Paraglide**: English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text anywhere in code or mocks.

## Tasks / Subtasks

- [x] Task 1: Add `getBookingByRegistrationToken` query to `src/lib/server/db/queries/bookings.ts` (AC: 1, 3)
  - [x] 1.1: Export `getBookingByRegistrationToken(token: string): Promise<RegistrationPageRow | null>` — see Query Spec in Dev Notes
  - [x] 1.2: Return type `RegistrationPageRow` = `Booking & { roomName: string; organizerFirstName: string; organizerLastName: string; organizerPhone: string }` — sourced via three-table JOIN (bookings + rooms + user_profiles); `phone` is `notNull()` in `user_profiles` schema
  - [x] 1.3: If no row matches `registration_token = token`, return `null` (never throw; the route layer converts null → `error(404)`)

- [x] Task 2: Create `/r/[token]` route (AC: 1, 2, 3, 4, 5)
  - [x] 2.1: `src/routes/r/[token]/+page.server.ts` — query `getBookingByRegistrationToken(params.token)`; if null → `error(404, 'Event not found')`; return event data for display
  - [x] 2.2: `src/routes/r/[token]/+page.svelte` — render event info, conditional agenda section, conditional form placeholder (Story 5.2), closed-state message; **NO** auth calls (`requireUser` must NOT be used here)
  - [x] 2.3: Do NOT modify `src/hooks.server.ts` — `/r` is already allow-listed in `routeGuards`; adding it again would create a regression

- [x] Task 3: Add Paraglide message keys (AC: 6)
  - [x] 3.1: Add all new keys to `messages/en.json` with English values
  - [x] 3.2: Add all new keys to `messages/th.json` with empty string `""`
  - [x] 3.3: New keys needed:
    - `reg_page_title` — "Event Registration"
    - `reg_page_date_label` — "Date & Time"
    - `reg_page_room_label` — "Room"
    - `reg_page_agenda_label` — "Agenda"
    - `reg_page_contact_label` — "Contact"
    - `reg_page_closed_title` — "Registration Closed"
    - `reg_page_closed_message` — "Registration for this event is no longer available."
    - `reg_page_registration_section_title` — "Register to Attend"
  - [x] 3.4: Run `bun run paraglide:build` if `messages.js` needs refresh after adding keys

- [x] Task 4: ATDD — add integration test stubs (AC: 1, 2, 3, 4)
  - [x] 4.1: Create `tests/integration/registrations.test.ts` (NEW file)
  - [x] 4.2: Add the following stubs — P0 tests must be activated (`.skip` removed), P1/P2 start as `test.skip`:
    - `5.1-INT-001`: Valid token returns full event data (eventName, roomName, agenda, contact name+phone) [P0] — **ACTIVATE** (remove `.skip`)
    - `5.1-INT-IDOR-001`: Cross-token lookup — seed two bookings with different tokens; fetching booking A's data using booking B's token returns null/404; no fields from booking A leak [P0] — **ACTIVATE** (remove `.skip`) — MANDATORY (R-001 BLOCK)
    - `5.1-INT-002`: `registration_enabled=false` fixture — server load returns a closed flag, no form data [P0] — **ACTIVATE** (remove `.skip`)
    - `5.1-INT-003`: `agenda=null` fixture — returned data has no agenda field [P2] — `test.skip`
    - `5.1-INT-004`: Malformed/non-existent token → `getBookingByRegistrationToken` returns null [P2] — `test.skip`

- [x] Task 5: ATDD — add E2E test stubs (AC: 1, 2, 5)
  - [x] 5.1: Create `tests/e2e/registrations.spec.ts` (NEW file)
  - [x] 5.2: Add all stubs as `test.skip` per repo convention (E2E requires seed wiring not done in CI):
    - `5.1-E2E-001`: Open registration page renders event name, room, date/time for a seeded booking [P1]
    - `5.1-E2E-002`: Closed registration page shows closed message; form is not visible [P1]
    - `5.1-E2E-A11Y-001`: axe-core passes WCAG 2.1 AA on open-state `/r/[token]` [P1] (NFR-007)
    - `5.1-E2E-A11Y-002`: axe-core passes WCAG 2.1 AA on closed-state `/r/[token]` [P1] (NFR-007)

### Review Findings

_Code review 2026-06-15 (Step 5). 3 adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. All 6 ACs PASS; R-001 BLOCK (IDOR + token non-exposure) confirmed. lint + svelte-check clean (0 errors)._

**Patch (applied):**

- [x] [Review][Patch] "Register to Attend" heading no longer shown in closed state — moved `reg_page_registration_section_title` heading into the open (`{:else}`) branch so it does not contradict the "Registration Closed" alert [src/routes/r/[token]/+page.svelte:96]

**Deferred (pre-existing / out-of-scope, no action this story):**

- [x] [Review][Defer] INNER JOIN on user_profiles makes a valid token 404 if organizer has no profile row — low real risk (organizer profile completion is gated), spec mandated INNER JOIN; revisit only if a missing-profile case is observed [src/lib/server/db/queries/bookings.ts:209] — deferred
- [x] [Review][Defer] Blank date line if parseTstzrange returns null — `during` is notNull and DB-generated as a valid tstzrange; defensive-only [src/routes/r/[token]/+page.server.ts:39] — deferred
- [x] [Review][Defer] Dangling `·` separator / empty contact name when organizer first/last name is empty string — name columns are notNull; cosmetic edge [src/routes/r/[token]/+page.server.ts:52] — deferred
- [x] [Review][Defer] Hand-written `RegistrationPageRow` type can drift from schema (unchecked `as` cast) — has upside (excludes registrationToken at type level, reinforcing data minimization); maintainability trade-off only [src/lib/server/db/queries/bookings.ts:150] — deferred

**Dismissed (by design / out of story scope):**

- `status` not filtered (cancelled/draft bookings reachable) — closed-state is ONLY `registrationEnabled` per AC-2; status-based gating is not in 5.1 scope.
- `registrationClosesAt` not evaluated — time-based auto-close is explicitly Story 5.6 scope (Dev Notes "Closed-State Logic").
- Organizer phone exposed on public page — required by AC-1 (contact name + phone); intended.
- Logo renders bare `<img src="/logo.svg">` with no JS fallback — sanctioned by Dev Notes "Logo Handling" (broken-img icon acceptable for dev).

## Dev Notes

### Scope Boundaries — Critical

**DO implement:**
- `getBookingByRegistrationToken` query (three-table JOIN, returns null on miss)
- `src/routes/r/[token]/+page.server.ts` and `+page.svelte` (public, unauthenticated)
- Display: org logo, event name, date/time (Bangkok timezone), room, agenda (conditional), contact name + phone
- Closed-state message when `registrationEnabled = false`
- IDOR guard: `error(404)` when token not found
- ATDD stubs: `tests/integration/registrations.test.ts` and `tests/e2e/registrations.spec.ts`
- Paraglide i18n keys (English + empty Thai)

**DO NOT implement (scoped to later stories):**
- Registration FORM fields (title, name, org, email, meal) — Story 5.2
- Form submit action — Story 5.2
- Confirmation email — Story 5.3
- Self-cancel link or cancel token — Story 5.4
- Resend flow — Story 5.5
- Auto-close rules / `registrationClosesAt` date evaluation — Story 5.6
- Catering aggregation — Story 5.7
- Registrant list — Story 5.8
- Any modification to `hooks.server.ts` — `/r` already allow-listed (see Auth Guard section)

The "and register" in the user story is aspirational framing for the epic; the submission form is 5.2's scope. This story delivers the READ-ONLY branded display page only.

### Auth Guard — No Changes Needed

`src/hooks.server.ts` already excludes `/r` from the auth guard:

```ts
// Pattern in routeGuards — already allow-listed:
pattern: /^\/(?!(?:login|auth|r|skeleton|profile\/complete)(?:\/|$)|$)/
```

The `/r/[token]` route is explicitly public. Do NOT add `requireUser` anywhere in this route. Do NOT touch `hooks.server.ts`.

### Query Spec for `getBookingByRegistrationToken`

This is a three-table JOIN: `bookings` → `rooms` (by `roomId`) → `user_profiles` (by `organizerId`).
Contact name and phone live on the `user_profiles` table, not on `bookings`.

```ts
import { getTableColumns, eq, sql } from 'drizzle-orm';
import { db } from '../index.js'; // same pattern as existing getUpcomingBookingsByOrganizer
import { bookings } from '../schema/bookings.js';
import { rooms } from '../schema/rooms.js';
import { userProfiles } from '../schema/profiles.js'; // NEW import — not yet in bookings.ts

export type RegistrationPageRow = typeof bookings.$inferSelect & {
  roomName: string;
  organizerFirstName: string;
  organizerLastName: string;
  organizerPhone: string; // phone is notNull() in user_profiles schema
};

export async function getBookingByRegistrationToken(
  token: string
): Promise<RegistrationPageRow | null> {
  // SELECT all booking columns + rooms.name + user_profiles firstName/lastName/phone
  // FROM bookings
  // INNER JOIN rooms ON bookings.room_id = rooms.id
  // INNER JOIN user_profiles ON bookings.organizer_id = user_profiles."userId"
  //   NOTE: user_profiles uses camelCase column names ('userId', not 'user_id')
  // WHERE bookings.registration_token = token
  // LIMIT 1
  const rows = await db
    .select({
      ...getTableColumns(bookings),
      roomName: rooms.name,
      organizerFirstName: userProfiles.firstName,
      organizerLastName: userProfiles.lastName,
      organizerPhone: userProfiles.phone
    })
    .from(bookings)
    .innerJoin(rooms, eq(bookings.roomId, rooms.id))
    .innerJoin(userProfiles, eq(bookings.organizerId, userProfiles.userId))
    // Use sql template for where — matches existing getUpcomingBookingsByOrganizer convention
    .where(sql`${bookings.registrationToken} = ${token}`)
    .limit(1);

  return rows[0] ?? null;
}
```

**Critical:** Return `null` (not throw) when no row found. The server load converts `null` to `error(404)`.

**Schema note — camelCase column names in `user_profiles`:** Unlike other tables that use `snake_case` DB column names, the `user_profiles` table uses camelCase column names (e.g., `'userId'`, `'firstName'`, `'lastName'`, `'phone'`). Drizzle field references are: `userProfiles.userId`, `userProfiles.firstName`, `userProfiles.lastName`, `userProfiles.phone`. The JOIN clause must use `eq(bookings.organizerId, userProfiles.userId)`.

**Data minimization:** Only expose `firstName`, `lastName`, `phone` from the organizer's profile to the registration page — not email, title, organization.

### Schema References

`bookings` table (`src/lib/server/db/schema/bookings.ts`):
- `registrationToken: text('registration_token').unique()` — stored PLAINTEXT (ADR 4.5 accepted deviation from AR-05)
- `registrationEnabled: boolean('registration_enabled')` — `false` → show closed message
- `agenda: text('agenda')` — nullable; hide section if null or empty
- `organizerId: text('organizer_id').notNull()` — FK to `user_profiles.userId` for contact info
- `during: tstzrange` — parse via `parseTstzrange()`, display via `formatDateBangkok()`

`user_profiles` table (`src/lib/server/db/schema/profiles.ts`):
- `userId`, `firstName`, `lastName`, `phone` — use these for contact display
- The table import name and column names: check `src/lib/server/db/schema/profiles.ts` for exact Drizzle identifiers before coding

`rooms` table (`src/lib/server/db/schema/rooms.ts`):
- `name: text('name').notNull()` — display as room name on the registration page

### Server Load (`+page.server.ts`) Pattern

```ts
import { error } from '@sveltejs/kit';
import { getBookingByRegistrationToken } from '$lib/server/db/queries/bookings.js';
import { parseTstzrange } from '$lib/utils/tstzrange.js';
import { formatDateBangkok } from '$lib/utils/date.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
  // NO requireUser — this route is public
  const booking = await getBookingByRegistrationToken(params.token);

  if (!booking) {
    error(404, 'Event not found');
  }

  const range = parseTstzrange(booking.during as unknown as string);
  const dateStr = range ? formatDateBangkok(range.lower, 'date') : '';
  const startTime = range ? formatDateBangkok(range.lower, 'time') : '';
  const endTime = range ? formatDateBangkok(range.upper, 'time') : '';

  return {
    eventName: booking.eventName,
    roomName: booking.roomName,
    agenda: booking.agenda ?? null,
    registrationEnabled: booking.registrationEnabled,
    dateStr,
    startTime,
    endTime,
    contactName: `${booking.organizerFirstName} ${booking.organizerLastName}`.trim(),
    contactPhone: booking.organizerPhone // string — notNull() in user_profiles schema
  };
};
```

### IDOR Guardrail (R-001 BLOCK)

The ONLY data isolation for this public route is the `WHERE registration_token = token` clause. There is no session-based authorization. This means:

1. The query MUST use `eq(bookings.registrationToken, token)` — never do any partial match or prefix scan
2. If the token is not found, return `error(404, 'Event not found')` — never return partial data
3. Never include the `registration_token` field itself in the returned page data (no need to expose it on the rendered page)
4. Test `5.1-INT-IDOR-001` seeds two separate bookings (owner A and owner B) and asserts that token-B cannot retrieve any fields from booking A's data

### Date Formatting

Use existing utilities — do NOT hand-roll date parsing:

```ts
import { parseTstzrange } from '$lib/utils/tstzrange.js';
import { formatDateBangkok } from '$lib/utils/date.js';

// booking.during is a tstzrange stored as a string (Drizzle custom type)
const range = parseTstzrange(booking.during as unknown as string);
const dateStr = range ? formatDateBangkok(range.lower, 'date') : '';
const startTime = range ? formatDateBangkok(range.lower, 'time') : '';
const endTime = range ? formatDateBangkok(range.upper, 'time') : '';
// Display: "2026-07-01  09:00–10:00" (Asia/Bangkok, UTC+7, no DST)
```

The `as unknown as string` cast is the established codebase convention for the custom `tstzrange` type — see `/bookings/[id]/+page.svelte` and the dashboard for precedent.

### Logo Handling

Architecture references `static/logo.svg` as the org logo for the registration page. **This file does not exist in the repository** — it is a deployment-time asset provided by the organization.

- Render: `<img src="/logo.svg" alt="Organization logo" ... />`
- Graceful fallback: wrap in a `{#if}` that checks if the logo is expected, or use CSS `onerror` handler — the simplest approach is to attempt to render the img tag and let it fail gracefully (broken img icon is acceptable for dev). Do NOT block the story on logo provisioning.
- Add a dev note comment in the `.svelte` file: `<!-- static/logo.svg must be provided at deployment time by the organization -->`

### Svelte Component Pattern

The `/r/[token]` route is under `src/routes/r/[token]/` (NOT under `src/routes/(app)/` — there is no layout wrapper needed). Files:

- `src/routes/r/[token]/+page.server.ts`
- `src/routes/r/[token]/+page.svelte`

The `(app)` group applies the authenticated shell layout. The public route `r/[token]` must NOT be inside `(app)` — it renders without the nav sidebar or authenticated shell.

Design tokens (from DESIGN.md):
- Card surface: `bg-card border rounded-md`
- Shadow: `shadow-sm`
- Primary action color: `green-700` class or equivalent

Thai typography requirements (NFR-006 / Story 1.2):
- Font: Noto Serif Thai or Noto Sans Thai (check `app.html` or global CSS for loaded fonts)
- Line height: `≥ 1.65`
- Min font size: `14px`
- The registration page is public and may be used by Thai-speaking external attendees — ensure `lang="th"` or body-level font stack works

### Closed-State Logic

Closed-state check is ONLY `registrationEnabled === false`. Do NOT evaluate `registrationClosesAt` (date-based auto-close) — that is Story 5.6's scope. Example:

```svelte
{#if !registrationEnabled}
  <div role="alert">
    <h2>{m.reg_page_closed_title()}</h2>
    <p>{m.reg_page_closed_message()}</p>
  </div>
{:else}
  <!-- registration form placeholder — Story 5.2 will fill this -->
  <!-- DO NOT add form fields here -->
{/if}
```

### Integration Test Pattern

New file: `tests/integration/registrations.test.ts`

Use the same Testcontainers + pg-factory pattern as `tests/integration/bookings.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../support/fixtures/pg-factory.js';
// seed a booking with a known token
// call getBookingByRegistrationToken(token)
// assert returned fields
```

For `5.1-INT-IDOR-001`:
```ts
it('5.1-INT-IDOR-001: forged token returns null, no cross-event data leaks', async () => {
  // Seed booking A (org A's event, tokenA)
  // Seed booking B (org B's event, tokenB)
  // Call getBookingByRegistrationToken(tokenB)
  // Assert: result is null OR result.eventName !== bookingA.eventName
  // This proves tokenB cannot retrieve bookingA's data
});
```

Reuse helpers:
- `tests/support/helpers/dev-bypass.ts` — authenticated session for seeding
- `tests/support/fixtures/pg-factory.ts` — real-Postgres Testcontainers
- `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement()` (if applicable)

### E2E Test Pattern

New file: `tests/e2e/registrations.spec.ts`

All E2E stubs start as `test.skip` per repo convention. Use Playwright. For A11Y tests, inject axe-core:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip('5.1-E2E-A11Y-001: axe-core passes WCAG 2.1 AA on open registration page', async ({ page }) => {
  await page.goto(`/r/${SEED_TOKEN}`);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);
});
```

### Pre-commit Gate

Before every commit:

```bash
bunx prettier --write . && bun run lint
```

### i18n Rules

- All UI strings via `$lib/paraglide/messages.js` (`m.*()` calls in Svelte templates)
- Add English values to `messages/en.json`, empty `""` to `messages/th.json`
- **Never write Thai text** in code, mocks, or fixtures — Rawinan handles all translation
- Run `bun run paraglide:build` after adding keys if `messages.js` needs refresh

### File List Summary

**New files:**
- `src/routes/r/[token]/+page.server.ts`
- `src/routes/r/[token]/+page.svelte`
- `tests/integration/registrations.test.ts`
- `tests/e2e/registrations.spec.ts`

**Updated files:**
- `src/lib/server/db/queries/bookings.ts` — add `RegistrationPageRow` type + `getBookingByRegistrationToken` query
- `messages/en.json` — add 8 new `reg_page_*` keys
- `messages/th.json` — add 8 new `reg_page_*` keys (empty strings)

**No changes needed:**
- `src/hooks.server.ts` — `/r` already allow-listed in `routeGuards`
- `src/lib/server/db/schema/bookings.ts` — `registration_token` column already exists (Story 4.5)
- `src/lib/server/auth/guards.ts` — `requireUser` is NOT used in this route

### References

- Epics file: `_bmad-output/planning-artifacts/epics.md` — Story 5.1 ACs (lines 718–732)
- Test design: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` — P0/P1/P2 scenarios for 5.1
- ADR 4.5: `_bmad-output/implementation-artifacts/adr-4-5-registration-token-storage.md` — token stored plaintext (accepted AR-05 deviation)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — public route pattern, NFR-004, NFR-007
- Bookings schema: `src/lib/server/db/schema/bookings.ts`
- Profiles schema: `src/lib/server/db/schema/profiles.ts`
- Rooms schema: `src/lib/server/db/schema/rooms.ts`
- Existing bookings queries: `src/lib/server/db/queries/bookings.ts` — JOIN pattern with `getTableColumns`
- Auth guards: `src/lib/server/auth/guards.ts` — `requireUser` (NOT used here)
- Hooks (route guard): `src/hooks.server.ts` — `/r` already allow-listed
- Date formatter: `src/lib/utils/date.ts` — `formatDateBangkok`
- tstzrange parser: `src/lib/utils/tstzrange.ts` — `parseTstzrange`
- Previous story: `_bmad-output/implementation-artifacts/4-8-organizer-dashboard.md` — JOIN pattern, `getTableColumns` usage
- IDOR template: `tests/support/helpers/idor-template.ts`
- Dev bypass: `tests/support/helpers/dev-bypass.ts`
- pg factory: `tests/support/fixtures/pg-factory.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- 2026-06-15: ESLint flagged nested `<!-- -->` inside Svelte comment block — moved AC coverage doc to `<script>` JSDoc comment
- 2026-06-15: `@typescript-eslint/no-unused-vars` on `_omit` from destructure — added `// eslint-disable-next-line` inline suppression

### Completion Notes List

- Task 1 (getBookingByRegistrationToken): Three-table JOIN (bookings + rooms + user_profiles) implemented with explicit column selection that excludes `registrationToken` for data minimization (AC-3 / R-001 BLOCK). Returns null on miss — never throws.
- Task 2 (+page.server.ts + +page.svelte): Public route created outside (app) layout. Server load converts null → error(404). Svelte page renders org logo, event name, date/time (Bangkok TZ), room, conditional agenda, contact. Closed-state uses `role="alert"` for WCAG AA.
- Task 3 (Paraglide i18n): 8 `reg_page_*` keys added to en.json (with English values) and th.json (with empty strings). Compiled via `bunx @inlang/paraglide-js compile`.
- Task 4 (Integration tests): P0 tests 5.1-INT-001, 5.1-INT-IDOR-001, 5.1-INT-002 all PASS. P2 tests remain skipped per story spec. Pre-existing test failures in auth/session tests are unrelated (require running dev server on port 3000).
- Task 5 (E2E stubs): All 4 E2E tests remain `test.skip` per repo convention — activate in Story 5.2 when seed wiring is done.
- AC-4 (No agenda hides section): Svelte template uses `{#if data.agenda && data.agenda.trim().length > 0}` to fully skip the agenda section.
- No changes to hooks.server.ts — `/r` already allow-listed in routeGuards (confirmed in code).

### File List

**New files:**
- `src/routes/r/[token]/+page.server.ts`
- `src/routes/r/[token]/+page.svelte`

**Updated files:**
- `src/lib/server/db/queries/bookings.ts` — added `RegistrationPageRow` type + `getBookingByRegistrationToken` query + `userProfiles` import
- `messages/en.json` — added 8 `reg_page_*` keys with English values
- `messages/th.json` — added 8 `reg_page_*` keys with empty strings
- `src/lib/paraglide/messages/` — regenerated (build artifact, 8 new message files)
- `_bmad-output/implementation-artifacts/5-1-branded-public-registration-page.md` — story tracking
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated

**No changes:**
- `src/hooks.server.ts` — `/r` already allow-listed (Task 2.3 confirmed, no change needed)
- `tests/integration/registrations.test.ts` — pre-existing ATDD scaffold (already in place)
- `tests/e2e/registrations.spec.ts` — pre-existing E2E scaffold (already in place)

### Change Log

- 2026-06-15: Story 5.1 created — branded public registration page (read-only display, IDOR guard, closed-state)
- 2026-06-15: Story 5.1 implemented — getBookingByRegistrationToken query, /r/[token] route, 8 i18n keys, P0 integration tests passing (5.1-INT-001, 5.1-INT-IDOR-001, 5.1-INT-002)
