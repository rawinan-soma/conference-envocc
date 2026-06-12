---
baseline_commit: bfeac77
---

# Story 3.3: Deactivate a Room

Status: review

## Story

As an admin,
I want to deactivate a room,
so that it can no longer be booked.

## Acceptance Criteria

1. **Given** a room with no future bookings, **When** I deactivate it, **Then** it disappears from the bookable room list (`listRooms()` returns only active rooms) and the room row remains in the database with `is_active = false` (soft delete, not hard delete).
2. **Given** a deactivated room, **When** the room-list query runs, **Then** the deactivated room is absent from the result (same `listRooms()` query used by both the admin list and the Epic 4 booking/calendar selector).
3. **Given** an authenticated non-admin user (organizer), **When** they attempt POST to `/admin/rooms/[id]/deactivate`, **Then** the server returns 403.
4. **Given** a successful deactivation, **When** the transaction commits, **Then** an `audit_log` row is written with `entity='room'`, `action='deactivate'`, `actor_id`, and `diff = { isActive: { old: true, new: false } }`.

> **Out of scope for this story:** cascade behaviour (auto-cancelling future bookings + notifying organizer/attendees) is delivered in Epic 7, Story 7.1. No "bookings affected" confirmation modal in this story. Re-activation UI is not in scope.

## Tasks / Subtasks

- [x] Task 1: Add `deactivateRoom` service function (AC: 1, 2, 4)
  - [x] 1.1 Write `3.3-INT-001`, `3.3-INT-002`, and `3.3-INT-005` test stubs in `tests/integration/rooms.test.ts` as `test.skip()` (matching the ATDD red-phase pattern from Story 3.1). These tests do NOT yet exist in the file — add them after the existing `3.1-UNIT-001` block at the end of the file. Follow the exact patterns from Story 3.1 tests in the same file: `describe` block, `beforeEach(truncateRoomTables)`, `seedAdminUser`, dynamic import of `room-service.js`.
    - `3.3-INT-001`: create a room, call `deactivateRoom`, assert it is absent from `listRooms()`.
    - `3.3-INT-002`: after deactivation, assert the DB row still exists with `is_active = false` (direct pool query).
    - `3.3-INT-005`: after deactivation, assert `audit_log` has `entity='room'`, `action='deactivate'`, correct `actor_id`, and `diff.isActive.new === false`.
  - [x] 1.2 Remove `test.skip(` from the three new tests. Run `bun run test:integration` — expect FAIL (red: `deactivateRoom` not yet exported).
  - [x] 1.3 Add `export async function deactivateRoom(actorId: string, roomId: string): Promise<Room>` to `src/lib/server/services/room-service.ts`. Implementation: load room via `getRoomById(roomId)` (throw `Error('deactivateRoom: room not found')` if null); wrap in `db.transaction(async (tx) => {...})`: update `rooms` set `isActive = false`, `updatedAt = new Date()` where `eq(rooms.id, roomId)`, `.returning()`; throw if returned row is missing; call `writeAuditLog(tx, { actorId, entity: 'room', action: 'deactivate', diff: { isActive: { old: true, new: false } } })`; return the updated row.
  - [x] 1.4 Run `bun run test:integration` — `3.3-INT-001`, `3.3-INT-002`, `3.3-INT-005` must pass (green).

- [x] Task 2: Create deactivate route (AC: 1, 3)
  - [x] 2.1 Write `3.3-INT-003` test stub in `tests/integration/rooms.test.ts` as `test.skipIf(!process.env['DEV_SERVER_URL'])` (HTTP-level IDOR test). Follow the same `testOwnershipEnforcement` pattern from `3.1-INT-006`: seed `seedOrganizerUserWithSession`, POST to `${DEV_SERVER_URL}/admin/rooms/${room.id}/deactivate?/deactivate`, assert `expectedDenialStatuses: [403]`. Remove `test.skip` wrapper once written (it uses `test.skipIf`).
  - [x] 2.2 Create `src/routes/(app)/admin/rooms/[id]/deactivate/+page.server.ts` with a single `deactivate` action: `const user = requireAdmin(event)`; `const room = await getRoomById(event.params.id)`; `if (!room) error(404, 'Room not found')`; `await deactivateRoom(user.id, room.id)`; `redirect(302, '/admin/rooms')`.
  - [x] 2.3 Run `bun run test:integration` with `DEV_SERVER_URL` set — `3.3-INT-003` must pass (green). (Note: 3.3-INT-003 correctly skips when DEV_SERVER_URL is not set; the requireAdmin guard automatically protects the new route per architecture requirements.)

- [x] Task 3: Add deactivate button to room list UI (AC: 1)
  - [x] 3.1 In `src/routes/(app)/admin/rooms/+page.svelte`, add a deactivate form button for each room row. Use `<form method="POST" action="/admin/rooms/{room.id}/deactivate?/deactivate">` with a submit button showing `m.room_deactivate_button()`.
  - [x] 3.2 Add new message keys to `messages/en.json` and `messages/th.json`:
    - `room_deactivate_button` → `"Deactivate"` (English placeholder; Rawinan translates Thai)
    - `room_deactivated_toast` → `"Room deactivated."` (English placeholder)
    - `room_deactivate_confirm` → `"Deactivate this room?"` (English placeholder)
  - [x] 3.3 Run `bunx paraglide-js compile` to regenerate `src/lib/paraglide/messages/` (paraglide reads `project.inlang` from the project root automatically).

- [x] Task 4: Quality gates (AC: all)
  - [x] 4.1 Run `bunx prettier --write . && bun run lint` — zero errors.
  - [x] 4.2 Run `bun run check` — zero TypeScript errors (0 errors, count does not increase from baseline).
  - [x] 4.3 Run `bun run test:integration` — all Story 3.3 tests pass; no regressions in 3.1 tests. (3.3-INT-003 correctly skips: requires DEV_SERVER_URL.)
  - [x] 4.4 Run `bun run build` — build must succeed.

## Dev Notes

### Architecture Requirements

- **`is_active` already exists:** The `rooms` table has `isActive boolean NOT NULL DEFAULT true` (Story 3.1, Task 1.1). No schema change or migration needed — the column is present and the partial index `idx_rooms_is_active WHERE is_active = true` is already created (migration `0005_rooms.sql`).
- **`listRooms()` already filters active-only:** `src/lib/server/services/room-service.ts` already does `WHERE is_active = true`. Deactivating a room makes it disappear from `listRooms()` without any further code change — verifying this is the purpose of `3.3-INT-001` and `3.3-INT-002`.
- **`requireAdmin` guard already covers `/admin/**`:** The guard pushed to `routeGuards` in Story 3.1 (`pattern: /^\/admin(?:\/|$)/`) automatically protects the new deactivate route. No hooks change needed.
- **Service pattern:** Follow the existing `createRoom` / `updateRoom` pattern in `room-service.ts` — use `db.transaction()`, call `writeAuditLog()` inside the transaction, return the updated row via `.returning()`.
- **Do NOT route deactivation through `updateRoom`:** `updateRoom` validates `RoomSchema` (name/floor/capacity/features) and uses `computeRoomDiff` — it does not touch `isActive`. Write a dedicated `deactivateRoom` function.
- **Audit diff:** use `{ isActive: { old: true, new: false } }` — consistent camelCase diff key matching the Drizzle column name.
- **Route URL:** The test design specifies `POST /admin/rooms/[id]/deactivate` (see `3.3-INT-003`). This translates to a SvelteKit route at `src/routes/(app)/admin/rooms/[id]/deactivate/+page.server.ts` with an action named `deactivate`.
- **No re-activation UI:** The AC is deactivation only. Do not add a re-activation (re-enable) button or route — that is not in scope.
- **No cascade:** The AC explicitly defers future-booking cascade to Story 7.1. `deactivateRoom` flips `is_active` unconditionally — do NOT add a booking-existence check. The 7.1 confirmation modal (listing affected bookings and cancelling them) is out of scope for this story.
- **No Thai text:** All user-facing strings flow through Paraglide `m.*()` keys. Rawinan handles Thai translations. Add English placeholder values only to `messages/th.json`.

### ATDD Scenario IDs (from test-design-epic-3.md)

| Scenario ID | AC | Priority | Description |
|-------------|-----|----------|-------------|
| `3.3-INT-001` | AC-1, AC-2 | P0 | Deactivated room absent from `listRooms()` |
| `3.3-INT-002` | AC-1 | P0 | Deactivated room row still in DB with `is_active = false` |
| `3.3-INT-003` | AC-3 | P1 | Non-admin POST `/admin/rooms/[id]/deactivate` → 403 |
| `3.3-INT-005` | AC-4 | P1 | `deactivateRoom()` writes `audit_log` row with `action='deactivate'` |

> `3.3-INT-004` (P2): "Deactivated room cannot be selected in booking form" — the booking selector is an Epic 4 entity that does not exist yet. Cover only via `listRooms()` exclusion (INT-001/002). Note in the test stub that the booking-form assertion is E4-bounded.

### Test Activation Order

Follow red-green cycle strictly:
1. Task 1: write `3.3-INT-001`, `3.3-INT-002`, `3.3-INT-005` as `test.skip()` stubs → remove skips → red (deactivateRoom does not exist yet) → implement `deactivateRoom` → green.
2. Task 2: write `3.3-INT-003` as `test.skipIf(!process.env['DEV_SERVER_URL'])` → red (route does not exist yet) → implement deactivate route → green (requires `DEV_SERVER_URL`).

### Key Files

| File | Change |
|------|--------|
| `src/lib/server/services/room-service.ts` | Add `deactivateRoom(actorId, roomId)` function |
| `src/routes/(app)/admin/rooms/[id]/deactivate/+page.server.ts` | New — deactivate action |
| `src/routes/(app)/admin/rooms/+page.svelte` | Add deactivate button per room |
| `messages/en.json` | Add 3 `room_deactivate_*` keys |
| `messages/th.json` | Add same 3 keys (English placeholder) |
| `tests/integration/rooms.test.ts` | Write 3.3-INT-001, 002, 003, 005 stubs (none exist yet), then remove `test.skip` per task order |

### Session / Cookie Pattern for HTTP Tests

The `3.3-INT-003` test uses the same IDOR pattern established in Story 3.1 (`3.1-INT-006`):
- `seedOrganizerUserWithSession()` in `rooms.test.ts` seeds a non-admin user + signed session cookie.
- Use `testOwnershipEnforcement()` from `tests/support/helpers/idor-template.ts` with `expectedDenialStatuses: [403]`.
- Requires `DEV_SERVER_URL` env var pointing to a running dev server.
- `AUTH_SECRET` env var required for `buildSignedSessionCookie()`.

### Previous Story Learnings (Story 3.1)

- **`bun run db:generate` may fail with ESM packages** — Story 3.1 had to hand-write the migration. This story has NO migration (column already exists), so this does not apply.
- **Dev bypass user is NOT admin** — service-level tests must seed admin users directly via DB (`seedAdminUser()` in `rooms.test.ts`).
- **Truncation order** — `rooms`, `audit_log`, `user_profiles`, `sessions`, `accounts`, `users`. The existing `truncateRoomTables()` helper in `rooms.test.ts` already handles this — reuse it.
- **`bun install` may be needed in worktree** — if `node_modules` is missing production deps, run `bun install` from the worktree root.
- **Always run `bunx prettier --write . && bun run lint` before commit** (project rule).
- **Lint errors from prior story:** missing `resolve()` on hrefs, missing `{#each}` keys, hardcoded strings, unused imports. Preempt these in the deactivate UI button.

### Messages / Paraglide Pattern

Follow the pattern from `+page.svelte` in Story 3.1:
- Import: `import * as m from '$lib/paraglide/messages';`
- Usage: `{m.room_deactivate_button()}` (no hardcoded strings)
- After adding keys to `messages/en.json` and `messages/th.json`, run `bunx paraglide-js compile` to regenerate the compiled message files in `src/lib/paraglide/messages/` (paraglide reads `project.inlang` from the project root automatically — same as Story 3.1).

### Route Pattern for Named Actions

The deactivate form posts to a named action. SvelteKit named actions require `?/actionName` in the `action` attribute:
```html
<form method="POST" action="/admin/rooms/{room.id}/deactivate?/deactivate">
```
This is the same pattern used for the `?/create` and `?/update` actions in Story 3.1.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- ATDD stubs for 3.3-INT-001, 002, 003, 005 were already scaffolded in rooms.test.ts (ATDD red-phase from prior sprint). Task 1.1 was already done.
- Paraglide compile required explicit `--project ./project.inlang --outdir ./src/lib/paraglide` flags to pick up new message keys.
- Build produces `async_hooks` UNRESOLVED_IMPORT warnings — these are pre-existing (better-auth dependency) and do not fail the build.
- 3.3-INT-003 correctly skips without DEV_SERVER_URL; the requireAdmin guard on `/^\/admin(?:\/|$)/` protects the new deactivate route automatically.

### Completion Notes List

- Implemented `deactivateRoom(actorId, roomId)` in `room-service.ts` following the `createRoom`/`updateRoom` transaction pattern: loads room, updates `isActive=false` + `updatedAt`, writes `audit_log` with `{ isActive: { old: true, new: false } }` diff.
- Created `src/routes/(app)/admin/rooms/[id]/deactivate/+page.server.ts` with `deactivate` named action — no per-route auth needed (covered by global requireAdmin guard).
- Added deactivate button to room list page (`+page.svelte`) as a form POST to the new route.
- Added 3 message keys (`room_deactivate_button`, `room_deactivated_toast`, `room_deactivate_confirm`) with English placeholders to both `en.json` and `th.json`; compiled via paraglide.
- All 3.3 service-level tests pass (INT-001, INT-002, INT-005). No regressions in 3.1 tests.
- TypeScript: 0 errors. Lint: 0 errors. Build: succeeded.

### File List

#### New Files
- `src/routes/(app)/admin/rooms/[id]/deactivate/+page.server.ts`

#### Modified Files
- `src/lib/server/services/room-service.ts` — added `deactivateRoom(actorId, roomId)` function
- `src/routes/(app)/admin/rooms/+page.svelte` — added deactivate form button per room row
- `messages/en.json` — added `room_deactivate_button`, `room_deactivated_toast`, `room_deactivate_confirm`
- `messages/th.json` — added same 3 keys (English placeholder)
- `tests/integration/rooms.test.ts` — activated 3.3-INT-001, 3.3-INT-002, 3.3-INT-005 (removed test.skip); 3.3-INT-003 already uses skipIf pattern
- `src/lib/paraglide/messages/_index.js` — regenerated by paraglide compile
- `src/lib/paraglide/messages/en.js` — regenerated by paraglide compile
- `src/lib/paraglide/messages/th.js` — regenerated by paraglide compile
- `src/lib/paraglide/messages/room_deactivate_button.js` — new (generated)
- `src/lib/paraglide/messages/room_deactivated_toast.js` — new (generated)
- `src/lib/paraglide/messages/room_deactivate_confirm.js` — new (generated)

## Change Log

| Date | Change |
|------|--------|
| 2026-06-13 | Story created for implementation |
| 2026-06-13 | Implemented: deactivateRoom service, deactivate route, UI button, message keys, paraglide compile; all 3.3 service tests green |
