---
baseline_commit: e3434382e0f4f9ea4b6a4b9c710d812de2143f28
---

# Story 4.7: Edit, Cancel, and Duplicate a Booking

**Status:** `review`
**Epic:** 4 — Room Booking & Organizer Workspace
**GH Issue:** #27
**Previous Story:** 4.4 — Create a Booking (Conflict-Free)
**Next Story:** 4.8 — Organizer Dashboard

## Story

As an organizer,
I want to edit, cancel, or duplicate my bookings,
so that I can manage changes efficiently.

## Acceptance Criteria

1. **Edit re-checks conflicts**: Submitting an edited booking validates via the same EXCLUDE constraint path as create; a time conflict surfaces `ConflictError('booking_conflict_error')` → `setError` on the form. An organizer cannot edit a booking they do not own (403 via `assertOwner`).
2. **Cancel frees the slot**: Cancel sets `status = 'cancelled'`. Because the EXCLUDE constraint predicate is `WHERE status <> 'cancelled'` and `getWeekCalendar` filters `status != 'cancelled'`, the slot is freed automatically with no schema or query change.
3. **Duplicate pre-fills form**: Duplicate opens `/bookings/new` with room, eventName, agenda, catering, and registration fields pre-filled from the source booking. `startAt`/`endAt` are intentionally left blank — submitting a pre-filled copy with the same time would conflict with the still-active original.
4. **Ownership guard on all mutations**: `requireUser` + `assertOwner(event, booking.organizerId)` on edit load, edit action, and cancel action. Non-owner → 403. IDOR negative tests required.
5. **Booking detail/management page**: `/bookings/[id]` route that shows booking details and exposes Edit, Cancel, Duplicate actions. This story creates this page (4.5/4.6 not yet merged; BookingChip already links here, currently 404).
6. **FR-023 (catering toggle post-creation)**: Covered by the edit form — `cateringEnabled` is already a field in `BookingForm.svelte`.
7. **Cancel is destructive → confirm modal**: UX-DR8 pattern — confirm dialog lists consequences before cancel fires.
8. **All new UI strings in Paraglide**: English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text anywhere in code.

## Tasks / Subtasks

- [x] Task 1: Add service methods to `booking-service.ts` (AC: 1, 2, 4)
  - [x] 1.1: Add `getBookingById(id: string): Promise<Booking | undefined>` — simple SELECT by PK
  - [x] 1.2: Add `updateBooking(actorId, bookingId, input: CreateBookingInput): Promise<Booking>` — UPDATE inside transaction, same 23P01 cause-chain catch as `createBooking`, audit `action='update'`
  - [x] 1.3: Add `cancelBooking(actorId, bookingId): Promise<void>` — UPDATE status='cancelled' inside transaction, audit `action='cancel'`

- [x] Task 2: Create booking detail/management page (AC: 5)
  - [x] 2.1: `src/routes/(app)/bookings/[id]/+page.server.ts` — `requireUser`, `getBookingById`, `assertOwner`, cancel action
  - [x] 2.2: `src/routes/(app)/bookings/[id]/+page.svelte` — display booking details; Edit button → `/bookings/[id]/edit`; Duplicate button → `/bookings/new?from=[id]`; Cancel confirm modal

- [x] Task 3: Create edit route (AC: 1, 4, 6)
  - [x] 3.1: `src/routes/(app)/bookings/[id]/edit/+page.server.ts` — `requireUser`, `getBookingById`, `assertOwner`, pre-fill superValidate from existing booking (parse `during` via `parseTstzrange` + `formatDateBangkok`), `edit` action calls `updateBooking`, `ConflictError` → `setError`
  - [x] 3.2: `src/routes/(app)/bookings/[id]/edit/+page.svelte` — reuse `BookingForm.svelte` (must pass `action="?/edit"` prop — see BookingForm refactor note)

- [x] Task 4: Refactor `BookingForm.svelte` to accept configurable action + submit label (AC: 1, 3)
  - [x] 4.1: Add `formAction?: string` prop (default `"?/create"`) and `submitLabel?: string` prop (default `m.booking_submit_button()`)
  - [x] 4.2: Replace hardcoded `action="?/create"` with `action={formAction ?? '?/create'}` and submit label with `submitLabel ?? m.booking_submit_button()`
  - [x] 4.3: Verify `bookings/new/+page.svelte` still works without passing the props (uses defaults)

- [x] Task 5: Extend `/bookings/new` to support `?from=[id]` duplicate pre-fill (AC: 3)
  - [x] 5.1: In `bookings/new/+page.server.ts` load function, if `?from=` param present: load source booking, pre-fill room + eventName + agenda + catering + registration; leave `startAt`/`endAt` blank
  - [x] 5.2: Duplicate action is stateless — no new route, no new DB operation; just a link/button that navigates to `/bookings/new?from=[id]`

- [x] Task 6: Add Paraglide message keys (AC: 8)
  - [x] 6.1: Add all new keys to `messages/en.json` with English values
  - [x] 6.2: Add all new keys to `messages/th.json` with empty string `""`
  - [x] New keys needed:
    - `booking_detail_title` — "Booking Details"
    - `booking_edit_title` — "Edit Booking"
    - `booking_edit_button` — "Edit"
    - `booking_edit_save_button` — "Save changes"
    - `booking_edit_success` — "Booking updated."
    - `booking_cancel_button` — "Cancel booking"
    - `booking_cancel_confirm_title` — "Cancel this booking?"
    - `booking_cancel_confirm_body` — "This will free the room slot. Registered attendees will not be notified automatically."
    - `booking_cancel_confirm_action` — "Yes, cancel booking"
    - `booking_cancel_success` — "Booking cancelled."
    - `booking_duplicate_button` — "Duplicate"
    - `booking_not_found` — "Booking not found."
    - `booking_status_active` — "Active"
    - `booking_status_cancelled` — "Cancelled"

- [x] Task 7: ATDD — activate integration tests (AC: 1, 2, 3, 4)
  - [x] 7.1: In `tests/integration/bookings.test.ts` activated stubs (removed `.skip`):
    - `4.7-INT-001`: edit changes eventName → DB reflects new value ✓ PASS
    - `4.7-INT-002`: edit into occupied slot → ConflictError (422) ✓ PASS
    - `4.7-INT-003`: cancel sets status='cancelled', slot is then re-bookable ✓ PASS
    - `4.7-INT-004`: non-owner cannot edit (assertOwner → 403-equivalent) ✓ PASS
    - `4.7-INT-005`: non-owner cannot cancel ✓ PASS
    - `4.7-INT-006`: duplicate pre-fill loads correct field values from source booking ✓ PASS

- [x] Task 8: ATDD — activate E2E tests (AC: 1, 2, 3, 5, 7)
  - [x] 8.1: In `tests/e2e/bookings.spec.ts` activated stubs (removed `.skip`):
    - `4.7-E2E-001`: organizer edits booking — form pre-filled, saves, detail page shows updated name
    - `4.7-E2E-002`: organizer cancels booking — confirm modal shown, cancel fires, status shown as cancelled
    - `4.7-E2E-003`: organizer duplicates booking — lands on /bookings/new with fields pre-filled, time blank
    - `4.7-E2E-004`: IDOR — non-owner cannot reach edit page (redirect/403)
    - `4.7-A11Y-001`: booking detail page passes axe accessibility scan
    - Note: E2E tests require running dev server; execution is CI-gated

## Dev Notes

### Scope Decision: Story 4.7 Creates the `/bookings/[id]` Page

4.4 deferred the booking detail page, noting "Story 4.6 or later." However 4.5 = confirmation-link-token-qr and 4.6 = confirmation-email — neither creates a management UI. BookingChip already links to `/bookings/[id]` (currently 404). Story 4.7 must create the detail/management page as a prerequisite for edit/cancel/duplicate actions. **Do not wait for 4.5/4.6 — those stories have not merged.**

### Service Layer — How to Implement

**`getBookingById`** — simplest method, add after `createBooking`:
```ts
export async function getBookingById(id: string): Promise<Booking | undefined> {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
  return row;
}
```

**`updateBooking`** — key constraints:
- Wrap in `db.transaction`. Use `UPDATE ... SET ... WHERE id = bookingId` then `.returning()`.
- Re-check 23P01 with the **exact same cause-chain walk** already in `createBooking` (lines 114–130 of `booking-service.ts`). Copy verbatim, do not inline or simplify — the pattern is intentional (Drizzle wraps pg errors in DrizzleQueryError).
- Edit self-conflict is a non-issue: Postgres EXCLUDE checks the new row against other rows, not itself. Do NOT add a "exclude self" workaround.
- Audit: `action: 'update'`, diff includes changed fields.

**`cancelBooking`** — simplest mutation:
- `UPDATE bookings SET status = 'cancelled' WHERE id = bookingId`. Status string must be exactly `'cancelled'` (matches EXCLUDE predicate `status <> 'cancelled'` and `getWeekCalendar` filter).
- Audit: `action: 'cancel'`, diff `{ bookingId }`.
- No ConflictError possible on cancel.

### Guards Pattern (from `guards.ts`)
```ts
const user = requireUser(event);          // redirects to /login if unauthenticated
const booking = await getBookingById(id);
if (!booking) error(404, 'Booking not found');
assertOwner(event, booking.organizerId);  // throws error(403) if user.id !== ownerId
```
Apply this sequence on: edit load, edit action, cancel action. Duplicate is a GET (redirect), no mutation guard needed.

### BookingForm.svelte Refactor (CRITICAL)

`BookingForm.svelte` currently has `action="?/create"` hardcoded (line 23). The edit route uses `action="?/edit"`. Without the refactor, the component cannot be reused.

**Required changes:**
```svelte
interface Props {
  // ... existing props ...
  formAction?: string;       // defaults to "?/create"
  submitLabel?: string;      // defaults to m.booking_submit_button()
}
let { form, errors, enhance, submitting, rooms, userProfile, formAction, submitLabel }: Props = $props();
```
```svelte
<form method="POST" action={formAction ?? '?/create'} use:enhance ...>
```
```svelte
<Button type="submit" ...>{$submitting ? '…' : (submitLabel ?? m.booking_submit_button())}</Button>
```

`bookings/new/+page.svelte` does NOT pass these props, so it uses defaults — no change needed there.

### Pre-filling Edit Form from `during` tstzrange

The DB column `during` is a tstzrange string, e.g. `[2026-07-01 09:00:00+07,2026-07-01 10:00:00+07)`. The datetime-local input expects `YYYY-MM-DDTHH:MM`. Use existing utilities:

```ts
import { parseTstzrange } from '$lib/utils/tstzrange.js';
import { formatDateBangkok } from '$lib/utils/date.js';

const range = parseTstzrange(booking.during);
const startAt = range ? `${formatDateBangkok(range.lower, 'date')}T${formatDateBangkok(range.lower, 'time')}` : '';
const endAt   = range ? `${formatDateBangkok(range.upper, 'date')}T${formatDateBangkok(range.upper, 'time')}` : '';
```

Do not hand-roll date parsing. `parseTstzrange` handles timezone offset normalization.

### Duplicate Pre-fill Pattern

In `bookings/new/+page.server.ts` load function, add `?from=` support:
```ts
const fromId = event.url.searchParams.get('from');
if (fromId) {
  const source = await getBookingById(fromId);
  if (source) {
    // pre-fill everything except startAt/endAt (intentionally blank to force user to pick a new time)
    initialData.roomId = source.roomId;
    initialData.eventName = source.eventName;
    initialData.agenda = source.agenda ?? '';
    initialData.cateringEnabled = source.cateringEnabled;
    initialData.registrationEnabled = source.registrationEnabled;
    // registrationClosesAt intentionally NOT pre-filled — old date is invalid for new booking
  }
}
```

The Duplicate button on the detail page is simply:
```svelte
<a href={`/bookings/new?from=${booking.id}`}>{m.booking_duplicate_button()}</a>
```
No form action, no POST, no DB operation for duplicate.

### Cancel Confirm Modal (UX-DR8)

Cancel must show a confirm dialog before mutating. Pattern: use a `<dialog>` element or a Svelte `$state` toggle controlling a modal overlay. The confirm action POSTs to `?/cancel`. Existing pattern example: `room_deactivate_confirm` in room management UI.

### IDOR Test Pattern

Story 2.7 established `tests/integration/idor.test.ts`. The 4.7-INT-004/005 stubs verify the `assertOwner` guard at the service/route level. Check the existing IDOR test file for the helper pattern (two-user setup: owner vs. non-owner).

### Edit Form Validation — Reuse BookingSchema As-Is

The edit route uses the **same `BookingSchema`** from `src/lib/schemas/booking.ts` for `superValidate`. Do not create a separate edit schema. The `registrationClosesAt` empty-string handling (4.4 code review fix) applies equally to edit:
- Hidden `<input type="datetime-local">` submits `""` when registration is disabled
- `v.literal('')` branch in the schema accepts it as a valid absent value
- `!!input.registrationClosesAt` guard in `updateBooking` maps `''` → `null` stored (same as `createBooking`)

Pre-fill the edit form's `registrationClosesAt` only when `source.registrationEnabled && source.registrationClosesAt` — otherwise leave it `''`.

### i18n Rules

- All UI strings via `$lib/paraglide/messages.js` (`m.*()` calls).
- Add English values to `messages/en.json`, empty `""` to `messages/th.json`.
- **Never write Thai text** in code or mocks. Rawinan handles all translation.
- Run `bun run paraglide:build` (or the project's i18n compile step) if Paraglide's generated `messages.js` needs refresh after adding keys.

### Pre-commit Gate

Before every commit:
```bash
bunx prettier --write . && bun run lint
```

### File List Summary

**New files:**
- `src/routes/(app)/bookings/[id]/+page.server.ts`
- `src/routes/(app)/bookings/[id]/+page.svelte`
- `src/routes/(app)/bookings/[id]/edit/+page.server.ts`
- `src/routes/(app)/bookings/[id]/edit/+page.svelte`

**Updated files:**
- `src/lib/server/services/booking-service.ts` — add `getBookingById`, `updateBooking`, `cancelBooking`
- `src/lib/components/booking/BookingForm.svelte` — add `formAction?` and `submitLabel?` props
- `src/routes/(app)/bookings/new/+page.server.ts` — add `?from=` duplicate pre-fill in load
- `messages/en.json` — add 14 new keys
- `messages/th.json` — add 14 new keys (empty strings)
- `tests/integration/bookings.test.ts` — add 6 `test.skip` stubs (4.7-INT-001..006)
- `tests/e2e/bookings.spec.ts` — add 4 `test.skip` stubs + 1 a11y stub (4.7-E2E-001..004, 4.7-A11Y-001)

### References

- Booking schema: `src/lib/server/db/schema/bookings.ts` — column names, status enum, EXCLUDE predicate
- Booking service (create pattern): `src/lib/server/services/booking-service.ts`
- Guards: `src/lib/server/auth/guards.ts` — `requireUser`, `assertOwner`
- BookingForm component: `src/lib/components/booking/BookingForm.svelte` (hardcoded `action="?/create"` to fix)
- Booking Valibot schema: `src/lib/schemas/booking.ts`
- tstzrange parser: `src/lib/utils/tstzrange.ts` — `parseTstzrange()`
- Date formatter: `src/lib/utils/date.ts` — `formatDateBangkok(date, 'date'|'time')`
- New booking page (server): `src/routes/(app)/bookings/new/+page.server.ts` — pattern to follow
- New booking page (client): `src/routes/(app)/bookings/new/+page.svelte` — BookingForm usage
- Audit log service: `src/lib/server/services/audit.ts` — `writeAuditLog(tx, { actorId, entity, action, diff })`
- IDOR pattern: `tests/integration/idor.test.ts` (Story 2.7)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — route structure, service boundaries
- Epics: `_bmad-output/planning-artifacts/epics.md` — story 4.7 ACs, FR-014, FR-015, FR-023
- Previous story: `_bmad-output/implementation-artifacts/4-4-create-a-booking-conflict-free.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Ownership guard implemented at **service layer** (inside `updateBooking`/`cancelBooking`) so that INT-004/005 can test it directly without HTTP. Route layer also enforces via `assertOwner` for defense-in-depth (AC-4).
- `@sveltejs/kit`'s `error()` function is dynamically imported inside the service to avoid circular imports with the framework; this is a tested pattern in this codebase.
- E2E tests (4.7-E2E-001 through A11Y-001) activated (`.skip` removed) but execution is CI-gated — requires running dev server + Playwright browsers.
- All 6 integration tests (4.7-INT-001 through 4.7-INT-006) pass green locally against Testcontainers Postgres.
- `bunx prettier --write .` + `bun run lint` + `bun run check` all pass (0 errors, 0 warnings).
- Pre-existing HTTP-level test failures (auth, profile, session-timeout) in integration suite are unrelated to story 4.7 — they require a running dev server on port 3000.

### File List

**New files:**
- `src/routes/(app)/bookings/[id]/+page.server.ts`
- `src/routes/(app)/bookings/[id]/+page.svelte`
- `src/routes/(app)/bookings/[id]/edit/+page.server.ts`
- `src/routes/(app)/bookings/[id]/edit/+page.svelte`

**Updated files:**
- `src/lib/server/services/booking-service.ts` — added `getBookingById`, `updateBooking`, `cancelBooking`
- `src/lib/components/booking/BookingForm.svelte` — added `formAction?` and `submitLabel?` props
- `src/routes/(app)/bookings/new/+page.server.ts` — added `?from=` duplicate pre-fill in load
- `messages/en.json` — added 14 new Paraglide keys
- `messages/th.json` — added 14 new Paraglide keys (empty strings)
- `src/lib/paraglide/messages.js` — regenerated (Paraglide compile)
- `tests/integration/bookings.test.ts` — activated 6 test stubs (removed `.skip`)
- `tests/e2e/bookings.spec.ts` — activated 5 test stubs (removed `.skip`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status updated
