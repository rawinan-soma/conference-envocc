---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-13'
storyId: '3.3'
storyKey: 3-3-deactivate-a-room
storyFile: _bmad-output/implementation-artifacts/3-3-deactivate-a-room.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-3-3-deactivate-a-room.md
generatedTestFiles:
  - tests/integration/rooms.test.ts (appended 3.3-INT-001, 3.3-INT-002, 3.3-INT-003, 3.3-INT-005)
inputDocuments:
  - _bmad-output/implementation-artifacts/3-3-deactivate-a-room.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-3.md
  - _bmad/tea/config.yaml
  - tests/integration/rooms.test.ts
  - tests/support/helpers/idor-template.ts
---

# ATDD Checklist: Story 3.3 — Deactivate a Room

**Date:** 2026-06-13
**Author:** TEA Agent (bmad-testarch-atdd)
**Story:** 3.3 — Deactivate a Room
**Status:** RED PHASE — All tests scaffolded as `test.skip()` / `test.skipIf()`

---

## TDD Red Phase Summary

All acceptance test scaffolds generated. Tests are marked `test.skip()` or
`test.skipIf(!process.env['DEV_SERVER_URL'])` and will fail until the implementation tasks
are completed. Activate one test (or group) at a time alongside the corresponding task.

| Metric | Value |
|--------|-------|
| Total new tests | 4 (appended to rooms.test.ts) |
| P0 tests | 2 (3.3-INT-001, 3.3-INT-002) |
| P1 tests | 2 (3.3-INT-003, 3.3-INT-005) |
| All tests skipped (red phase) | yes |
| Expected to fail before implementation | yes |
| Execution mode | SEQUENTIAL (AI generation) |

---

## Generated Test Files

| File | Status | Notes |
|------|--------|-------|
| `tests/integration/rooms.test.ts` | APPENDED | +4 tests covering P0 + P1 scenarios for story 3.3 |

---

## Acceptance Criteria Coverage

| AC | Description | Test(s) | Priority |
|----|-------------|---------|----------|
| AC-1, AC-2 | Deactivated room absent from `listRooms()` | 3.3-INT-001 | P0 |
| AC-1 | Deactivated room row still in DB with `is_active=false` (soft delete) | 3.3-INT-002 | P0 |
| AC-3 | Non-admin POST `/admin/rooms/[id]/deactivate` → 403 | 3.3-INT-003 | P1 |
| AC-4 | Deactivation writes `audit_log` row (`action='deactivate'`, correct diff) | 3.3-INT-005 | P1 |

**Out of scope:** 3.3-INT-004 (deactivated room cannot be selected in booking form) is bounded
by Epic 4 — the booking selector does not exist yet. Coverage is provided via `listRooms()`
exclusion in INT-001/INT-002. A note in the test file documents this boundary.

---

## Scenario Details

### 3.3-INT-001 — Deactivated room absent from active room list [P0]

**AC:** AC-1, AC-2
**Risk:** R-004 (deactivated room remains visible or selectable)
**File:** `tests/integration/rooms.test.ts`
**Skip form:** `test.skip()`

**Scenario:**
- Seed admin user via `seedAdminUser()`
- Create room via `createRoom(actorId, input)` — assert room appears in `listRooms()` before deactivation
- Call `deactivateRoom(actorId, created.id)`
- Assert the room is **absent** from `listRooms()` after deactivation

**Activation:** Task 1.1 (write stub — already done) → Task 1.2 (remove skip) → Task 1.3 (implement) → Task 1.4 (green)

---

### 3.3-INT-002 — Deactivated room row persists in DB with `is_active=false` [P0]

**AC:** AC-1
**Risk:** R-004
**File:** `tests/integration/rooms.test.ts`
**Skip form:** `test.skip()`

**Scenario:**
- Seed admin user, create room
- Direct pool query to confirm `is_active=true` before deactivation
- Call `deactivateRoom(actorId, created.id)`
- Direct pool query: assert row still exists AND `is_active=false`

**Activation:** Alongside 3.3-INT-001 (same task group, Task 1)

---

### 3.3-INT-003 — Non-admin POST room deactivate → 403 [P1]

**AC:** AC-3
**Risk:** R-002 (IDOR on admin room deactivate route)
**File:** `tests/integration/rooms.test.ts`
**Skip form:** `test.skipIf(!process.env['DEV_SERVER_URL'])`

**Scenario:**
- Seed admin + organizer users via `seedAdminUser()` + `seedOrganizerUserWithSession()`
- Create room via `createRoom()` (service-level, no auth needed)
- POST to `${DEV_SERVER_URL}/admin/rooms/${room.id}/deactivate` with organizer session cookie
- Assert `testOwnershipEnforcement()` returns 403

**Prerequisites:** Requires `DEV_SERVER_URL` env var pointing to a running dev server. `AUTH_SECRET` required for `buildSignedSessionCookie()`.

**Activation:** Task 2.1 (write stub — already done) → Task 2.2 (implement route) → Task 2.3 (green)

---

### 3.3-INT-005 — `deactivateRoom()` writes `audit_log` row [P1]

**AC:** AC-4
**Risk:** R-008 (audit log missing on room mutations)
**File:** `tests/integration/rooms.test.ts`
**Skip form:** `test.skip()`

**Scenario:**
- Seed admin user, create room
- Call `deactivateRoom(actorId, created.id)`
- Query `audit_log WHERE entity='room' AND action='deactivate' AND actor_id=$actorId`
- Assert: exactly 1 row, `entity='room'`, `action='deactivate'`, `actor_id` matches, `diff.isActive.old===true`, `diff.isActive.new===false`

**Note:** Diff key is camelCase `isActive` (Drizzle column name convention), matching `writeAuditLog(tx, { ..., diff: { isActive: { old: true, new: false } } })`.

**Activation:** Alongside 3.3-INT-001 and 3.3-INT-002 (same task group, Task 1)

---

## Test Activation Order

Follow red-green cycle strictly:

1. **Task 1** — Activate 3.3-INT-001, 3.3-INT-002, 3.3-INT-005 together:
   - Remove `test.skip(` from all three tests
   - Run `bun run test:integration` → expect **FAIL** (red: `deactivateRoom` not yet exported)
   - Implement `deactivateRoom(actorId, roomId)` in `src/lib/server/services/room-service.ts`
   - Run `bun run test:integration` → expect **PASS** (green)

2. **Task 2** — Activate 3.3-INT-003:
   - Test already uses `test.skipIf(!process.env['DEV_SERVER_URL'])` — it stays skipped until `DEV_SERVER_URL` is set
   - Implement deactivate route at `src/routes/(app)/admin/rooms/[id]/deactivate/+page.server.ts`
   - Set `DEV_SERVER_URL`, run `bun run test:integration` → expect **PASS** (green)

---

## Architecture Notes

- **No schema change needed:** `is_active` column and `idx_rooms_is_active WHERE is_active = true` partial index already exist from Story 3.1 (migration `0005_rooms.sql`).
- **`listRooms()` already filters active-only:** `WHERE is_active = true` already in the query. Deactivating makes rooms disappear without further code changes.
- **`requireAdmin` guard already covers `/admin/**`:** The new deactivate route is automatically protected — no hooks.server.ts changes needed.
- **Do NOT route through `updateRoom`:** `deactivateRoom` must be a dedicated function (story dev notes).
- **Diff format:** `{ isActive: { old: true, new: false } }` — camelCase matching Drizzle column name.
- **No cascade:** Epic 7, Story 7.1 delivers future-booking auto-cancel. `deactivateRoom` flips `is_active` unconditionally.

---

## Risk Mitigations

| Risk | Mitigation | Status |
|------|-----------|--------|
| R-004: Deactivated room visible in list | 3.3-INT-001 + 3.3-INT-002 | SCAFFOLDED |
| R-002: IDOR on deactivate route | 3.3-INT-003 | SCAFFOLDED |
| R-008: Audit log missing on deactivation | 3.3-INT-005 | SCAFFOLDED |

---

## Quality Gate Checklist (for implementation, not ATDD phase)

- [ ] `bun run test:integration` — all 3.3 tests pass; no regressions in 3.1 tests
- [ ] `bunx prettier --write . && bun run lint` — zero errors
- [ ] `bun run check` — TypeScript error count does not increase (baseline: 46 from Story 3.1)
- [ ] `bun run build` — build succeeds
