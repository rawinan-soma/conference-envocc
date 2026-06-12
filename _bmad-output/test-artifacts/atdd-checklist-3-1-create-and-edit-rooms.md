---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-12'
storyId: '3.1'
storyKey: 3-1-create-and-edit-rooms
storyFile: _bmad-output/implementation-artifacts/3-1-create-and-edit-rooms.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-3-1-create-and-edit-rooms.md
generatedTestFiles:
  - tests/integration/rooms.test.ts
  - tests/integration/db-schema.test.ts (appended 3.1-UNIT-002)
inputDocuments:
  - _bmad-output/implementation-artifacts/3-1-create-and-edit-rooms.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-3.md
  - _bmad/tea/config.yaml
  - tests/integration/profile.test.ts
  - tests/integration/auth-guard.test.ts
  - tests/integration/db-schema.test.ts
  - tests/support/fixtures/pg-factory.ts
  - tests/support/helpers/idor-template.ts
  - tests/support/helpers/dev-bypass.ts
---

# ATDD Checklist: Story 3.1 — Create and Edit Rooms

**Date:** 2026-06-12
**Author:** TEA Agent (bmad-testarch-atdd)
**Story:** 3.1 — Create and Edit Rooms
**Status:** RED PHASE — All tests scaffolded as `test.skip()` / `test.skipIf()`

---

## TDD Red Phase Summary

All acceptance test scaffolds generated. Tests are marked `test.skip()` or
`test.skipIf(!process.env['DEV_SERVER_URL'])` and will fail until the implementation tasks
are completed. Activate one test (or group) at a time alongside the corresponding task.

| Metric | Value |
|--------|-------|
| Total new tests | 10 (rooms.test.ts: 9, db-schema.test.ts: 1) |
| P0 tests | 5 |
| P1 tests | 5 |
| All tests skipped (red phase) | ✅ |
| Expected to fail before implementation | ✅ |
| Execution mode | SEQUENTIAL (AI generation) |

---

## Generated Test Files

| File | Status | Notes |
|------|--------|-------|
| `tests/integration/rooms.test.ts` | NEW | 9 tests covering P0 + P1 scenarios |
| `tests/integration/db-schema.test.ts` | APPENDED | +1 test: `3.1-UNIT-002` partial index |

---

## Acceptance Criteria Coverage

| AC | Description | Test(s) | Priority |
|----|-------------|---------|----------|
| AC-1 | Admin creates room → saved + in list with correct fields | 3.1-INT-001 | P0 |
| AC-1 | All 3 features stored as correct enum values | 3.1-INT-004 | P1 |
| AC-1 | No features → empty array (not null) | 3.1-INT-005 | P1 |
| AC-1 | Partial index WHERE is_active = true | 3.1-UNIT-002 | P1 |
| AC-2 | Edit-room form → room updated, new values visible | 3.1-INT-003 | P0 |
| AC-3 | Empty name → HTTP 422, no room row inserted | 3.1-INT-002 | P0 |
| AC-4 | Non-admin POST create → 403 | 3.1-INT-006 | P0 |
| AC-4 | Non-admin PATCH edit → 403 | 3.1-INT-007 | P1 |
| AC-5 | Create commits → audit_log row (create) | 3.1-INT-008a | P0 |
| AC-5 | Edit commits → audit_log row (update + diff) | 3.1-INT-008b | P0 |
| AC-6 | routeGuards has requireAdmin guard for /admin | 3.1-UNIT-001 | P1 |

---

## Test Scenarios

### P0 — Critical (must pass before merge)

| Scenario ID | Test | File | Skip Condition |
|-------------|------|------|----------------|
| 3.1-INT-001 | `createRoom()` inserts room; `listRooms()` returns it with correct fields | rooms.test.ts | `test.skip` |
| 3.1-INT-002 | POST /admin/rooms with empty name → 422, no row | rooms.test.ts | `test.skipIf(!DEV_SERVER_URL)` |
| 3.1-INT-003 | `updateRoom()` saves changed fields; prior values replaced | rooms.test.ts | `test.skip` |
| 3.1-INT-006 | Non-admin POST /admin/rooms → 403 (IDOR proof) | rooms.test.ts | `test.skipIf(!DEV_SERVER_URL)` |
| 3.1-INT-008a | `createRoom()` writes audit_log (entity=room, action=create, diff) | rooms.test.ts | `test.skip` |
| 3.1-INT-008b | `updateRoom()` writes audit_log (entity=room, action=update, diff) | rooms.test.ts | `test.skip` |

### P1 — High (must pass or have triage comment)

| Scenario ID | Test | File | Skip Condition |
|-------------|------|------|----------------|
| 3.1-INT-004 | All 3 features stored as projector/whiteboard/vc | rooms.test.ts | `test.skip` |
| 3.1-INT-005 | No features → empty array `[]` (not null) | rooms.test.ts | `test.skip` |
| 3.1-INT-007 | Non-admin POST /admin/rooms/[id]/edit → 403 | rooms.test.ts | `test.skipIf(!DEV_SERVER_URL)` |
| 3.1-UNIT-001 | hooks.server.ts has requireAdmin guard for /admin in routeGuards | rooms.test.ts | `test.skip` |
| 3.1-UNIT-002 | Partial index WHERE is_active = true on rooms table | db-schema.test.ts | `test.skip` |

---

## Task-by-Task Activation Guide

Follow this sequence. Activate the test **before** implementing the task, verify it fails (red),
then implement, then verify it passes (green).

### Task 1 — Create `rooms` Drizzle schema + migration

**Tests to activate:**
- `3.1-UNIT-002` in `tests/integration/db-schema.test.ts`
  → Remove `test.skip(` from the `3.1-UNIT-002` describe block
  → Run: `bun run test:integration` — expect FAIL
  → Implement Task 1.1–1.4 (schema + migration with partial index)
  → Run again — expect PASS

### Task 2 — Create `RoomSchema` Valibot schema

No dedicated ATDD test (schema is exercised indirectly via service + route tests).
Static TypeScript check: `bun run check` confirms the schema compiles correctly.

### Task 3 — Create `room-service.ts`

**Tests to activate (remove `test.skip(` from):**
- `3.1-INT-001` — createRoom + listRooms
- `3.1-INT-003` — updateRoom
- `3.1-INT-004` — all 3 features
- `3.1-INT-005` — empty features array
- `3.1-INT-008a` — audit_log on create
- `3.1-INT-008b` — audit_log on update

Run: `bun run test:integration` — expect FAIL (service module doesn't exist yet)
Implement room-service.ts per Task 3 spec.
Run again — expect PASS.

### Task 4 — Register `requireAdmin` guard for `/admin/**` in hooks.server.ts

**Tests to activate:**
- `3.1-UNIT-001` — static source assertion
  → Remove `test.skip(` from `3.1-UNIT-001`
  → Run: `bun run test:integration` — expect FAIL
  → Implement Task 4.2 (push to routeGuards)
  → Run again — expect PASS

### Task 5 — Create admin room routes

**HTTP-level tests (require DEV_SERVER_URL):**
- `3.1-INT-002` — 422 for empty name (already `test.skipIf(!DEV_SERVER_URL)` — activate by
  setting `DEV_SERVER_URL=http://localhost:3000` and running with dev server)
- `3.1-INT-006` — Non-admin POST → 403 (same activation)
- `3.1-INT-007` — Non-admin edit → 403 (same activation)

Run: `DEV_SERVER_URL=http://localhost:3000 bun run test:integration` — expect FAIL on first run
Implement Task 5.1–5.4 (admin route files)
Run again — expect PASS.

---

## Architecture Notes for Implementation

- **Import pattern for service-level tests:** `await import('../../src/lib/server/services/room-service.js')`
- **Dev bypass user is NOT admin** — service-level tests seed admin users directly via DB
- **Signed cookies** — HTTP-level tests use `buildSignedSessionCookie()` with `AUTH_SECRET`
- **Profile-complete guard** — seed `user_profiles` row for any user that will hit HTTP routes
- **Truncation order** — `rooms`, `audit_log`, `user_profiles`, `sessions`, `accounts`, `users`
  (no FK from audit_log to rooms; all truncated before each test via `truncateRoomTables()`)

---

## Running the Tests

```bash
# Run integration tests (Testcontainers auto-starts Postgres if no DATABASE_URL)
bun run test:integration

# Run with a running dev server (for HTTP-level tests)
DEV_SERVER_URL=http://localhost:3000 bun run test:integration

# Run only rooms tests
bun run test:integration --reporter=verbose rooms.test
```

---

## Next Steps After All Tests Green

1. Confirm all P0 tests pass: `bun run test:integration`
2. Confirm no regressions in existing tests (auth-guard, profile, db-schema, roles, session-timeout)
3. Run `bun run check` (TypeScript + svelte-check)
4. Run `bunx prettier --write . && bun run lint`
5. Run `bun run build`
6. Update sprint-status.yaml: set story 3.1 to `done`

---

## E2E Tests (Deferred)

`3.1-E2E-001` (P1): Admin opens room list UI, creates a room, sees it appear in the list.
→ Deferred pending Playwright `webServer` activation (dev-server config work from E2 backlog).
→ Scaffold will be created in `tests/e2e/rooms.spec.ts` when Playwright webServer config lands.

---

**Generated by:** BMad TEA Agent — ATDD Workflow
**Workflow:** `bmad-testarch-atdd`
**Version:** BMad v6
**Story:** 3.1 — Create and Edit Rooms
**Stack:** fullstack (SvelteKit + PostgreSQL)
**Mode:** SEQUENTIAL — AI generation (standard CRUD + auth scenarios)
