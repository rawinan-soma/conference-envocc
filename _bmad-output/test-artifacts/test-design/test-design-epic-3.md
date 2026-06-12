---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted:
  - step-01-detect-mode
  - step-02-load-context
  - step-03-risk-and-testability
  - step-04-coverage-plan
  - step-05-generate-output
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-13'
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad/tea/config.yaml
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/risk-governance.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/probability-impact.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-levels-framework.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-priorities-matrix.md
  - tests/support/helpers/idor-template.ts
  - tests/support/helpers/dev-bypass.ts
  - tests/support/fixtures/pg-factory.ts
---

# Test Design: Epic 3 — Room Inventory

**Date:** 2026-06-13
**Author:** Rawinan
**Status:** Living Document (v1)
**Mode:** Epic-Level Test Design

---

## Executive Summary

**Scope:** Epic-level test design for Epic 3 — Room Inventory

Epic 3 delivers the room management foundation that every downstream epic (E4 booking, E5 registration, E6 operations, E7 analytics) depends on. Its deliverables are: room CRUD with name/floor/capacity/features multi-select (Story 3.1), an optional on-prem photo upload with access-controlled serving (Story 3.2), soft deactivation (Story 3.3), and admin-managed block time slots with conflict detection (Story 3.4).

**Why this epic is high-stakes for testing:**

Epic 3 is the first epic that creates user-visible data (rooms) that all later epics query. The room model is the fulcrum of the entire booking system — a corrupt or missing room record propagates failures through the calendar view (E4), conflict detection (E4), deactivation cascade (E7), and analytics (E7). File storage security is a new attack surface (photo serving must be access-controlled). Block slots must integrate correctly with the EXCLUDE constraint established in E1 to prevent bookings from overlapping maintenance windows. The `testOwnershipEnforcement` IDOR helper from Story 2.7 is directly reusable here.

**Implementation Status (2026-06-13 — v2):** Story 3.1 is `done` (PR #113 merged); Stories 3.2–3.4 remain `backlog`. Epic 1 (done) and Epic 2 (done) provide the complete platform: Drizzle + PostgreSQL, audit-log write hook, test harness (Testcontainers + Vitest), CI pipeline, dev bypass seam, guard dispatcher, and IDOR template. Epic 3 is now `in-progress`.

**Foundation Available from E1/E2:**
- `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement()` ready for admin-only admin routes
- `tests/support/helpers/dev-bypass.ts` — `getDevBypassCookie()` seam for authenticated sessions
- `tests/support/fixtures/pg-factory.ts` — real-Postgres via Testcontainers
- `hooks.server.ts` `routeGuards` registry — append-only; Epic 3 routes push admin guard entries

**Risk Summary:**

- Total risks identified: 11
- High-priority risks (score ≥6): 5
- Critical categories: SEC, DATA, BUS, TECH

**Coverage Summary:**

- P0 scenarios: 12 (~24–36 hours)
- P1 scenarios: 14 (~18–28 hours)
- P2 scenarios: 8 (~6–12 hours)
- P3 scenarios: 3 (~2–4 hours)
- **Total effort**: ~50–80 hours (~7–10 engineering days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Room deactivation cascade (FR-063)** | Cascade auto-cancels future bookings and notifies organizers — bookings and attendees are E4/E5 entities that do not exist yet | Covered in Epic 7 test design (Story 7.1) |
| **Room usage in the calendar view** | Calendar rendering and booking creation use rooms but live in E4 | Epic 4 test design covers the room-calendar read-model |
| **Admin Settings UI (role assignment)** | Admin role assignment is E7 (Story 7.6); the role model is tested in Epic 2 | Epic 7 test design |
| **Utilization heatmap / analytics** | Room analytics are E7 (Story 7.2) | Epic 7 test design |
| **Room deactivation with existing bookings** | The `*(Cascade behavior for rooms with future bookings is delivered in E7.)*` note in Story 3.3 AC makes this an explicit out-of-scope deferral | Story 7.1 covers the full cascade |
| **External registration photo display** | Branded page uses room data but photo display is only relevant if the public page renders it — E5 test design will confirm photo URL resolution | E5 test design |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline | Status |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- | -------- | ------ |
| R-001 | SEC | Photo file served without access control — any unauthenticated user can fetch a room photo via a guessable/enumerable URL, bypassing the `requireUser` guard | 2 | 3 | **6** | Integration test: request photo URL without a session; assert 302→/login or 403; assert the route is registered in `routeGuards`; Story 3.2 AC explicitly requires access-controlled serving | Dev / QA | Story 3.2 | OPEN |
| R-002 | SEC | IDOR on room admin routes — a non-admin authenticated user (organizer) can invoke room create/edit/deactivate/block-slot actions by hitting the API endpoint directly | 2 | 3 | **6** | Integration test using `testOwnershipEnforcement()` adapted for admin-only routes: seed a non-admin organizer session via dev-bypass, attempt POST/PATCH/DELETE on admin room routes, assert 403; assert `requireAdmin` guard is registered for room mutation routes in `routeGuards` | Dev / QA | Story 3.1 | OPEN |
| R-003 | DATA | Block slot does not enforce the EXCLUDE constraint — a block can overlap an existing booking or another block because the slot is inserted as a separate record type outside the `bookings` EXCLUDE predicate | 2 | 3 | **6** | Integration test: insert a `bookings` row for room R, time T1–T2; then attempt to insert a `blocks` row for room R overlapping T1–T2; assert database constraint violation OR application-level conflict error; conversely: insert a block first, then attempt a booking overlapping it — assert conflict | Dev / QA | Story 3.4 | OPEN |
| R-004 | BUS | Deactivated room remains visible or selectable — if the `is_active` flag is not enforced in the booking room-selector query, E4 organizers can still select the deactivated room when creating a booking | 2 | 3 | **6** | Integration test: create a room, deactivate it, query the room-list endpoint used by E4 calendar/booking form, assert the deactivated room is absent; also assert the room record still exists in the DB (soft delete, not hard delete) | Dev / QA | Story 3.3 | OPEN |
| R-005 | TECH | Photo file storage path not preserved on restart — files uploaded to the on-prem volume may be lost if the Docker volume is not correctly declared and mounted, or if the path is hardcoded vs. env-configurable | 2 | 3 | **6** | Integration test: upload a photo, record the stored path; restart the container (or simulate volume read); assert file is retrievable at the same path; static test: assert the upload path is resolved from an env var (not hardcoded) and is the declared volume mount point per compose.yaml | Dev / QA | Story 3.2 | OPEN |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Status |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- | ------ |
| R-006 | BUS | Empty room name accepted — Story 3.1 AC explicitly states "validation rejects an empty name" but the implementation may skip server-side validation if only client-side is present | 2 | 2 | 4 | Integration test: POST room creation with empty name; assert HTTP 422 and field-level error; assert no room row is created | Dev / QA | OPEN |
| R-007 | BUS | Features multi-select stored incorrectly — the three features (projector/whiteboard/VC) may be stored as raw strings rather than a typed enum or bitmask, causing future query inconsistencies | 2 | 2 | 4 | Integration test: create room with all 3 features selected; assert each feature value is one of the allowed enum values in the DB; create room with no features; assert empty/null stored correctly | Dev / QA | OPEN |
| R-008 | BUS | Audit log missing on room mutations — room create/edit/deactivate are admin mutations that must write an `audit_log` row via the E1 hook; if the Epic 3 implementation omits the hook call, the audit trail is incomplete | 2 | 2 | 4 | Integration test (inherits pattern from `2.7-INT-002/003/004` in `profile.test.ts`): create room → assert `audit_log` row (entity=`room`, actor_id, action=`create`); update room → assert `update` row with diff; deactivate room → assert `deactivate` row | Dev / QA | OPEN |
| R-009 | PERF | Room list query unindexed — the room-list endpoint for E4 (calendar/booking selector) may do a sequential scan on `rooms` if `WHERE is_active = true` lacks a partial index; under org load with hundreds of rooms this risks the NFR-003 < 3s threshold | 1 | 3 | 3 | Static test: assert a partial index on `rooms (is_active) WHERE is_active = true` (or equivalent) is present in the Drizzle migration | Dev | OPEN |
| R-010 | SEC | Photo MIME type not validated — an attacker uploads a `.php` or `.html` file disguised as an image; if the server does not validate MIME type and extension, stored files could be executed if the serving path is misconfigured | 2 | 2 | 4 | Integration test: upload a file with `.txt` extension (non-image MIME); assert 400/422 rejection; assert allowed MIME types are checked server-side, not just by file extension | Dev / QA | OPEN |
| R-011 | BUS | Block slot overlap conflict not surfaced to user — the block-slot implementation may catch the DB constraint and swallow it silently (returning a 500 or generic error) instead of the required localized conflict message | 2 | 2 | 4 | Integration test: attempt to block an already-booked time range; assert HTTP 422 (not 500) and a structured error response (consistent with E1 `23P01` → localized conflict error pattern) | Dev / QA | OPEN |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture epic-level NFR thresholds, planned validation, and evidence expected for later `nfr-assess`.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed | Status |
| ------------ | ----------------------- | --------- | ------------------ | --------------- | ------ |
| **Security (NFR-001)** | No critical/high vulns; photo route access-controlled; admin routes guarded; IDOR prevented | R-001, R-002, R-010 | Integration auth-guard tests for room routes; IDOR tests using `testOwnershipEnforcement`; MIME validation test; dependency scan in CI | Test pass report; CI vuln-scan report | OPEN — Story 3.1/3.2 |
| **Reliability (NFR-002)** | Block slots honor EXCLUDE constraint — no overlapping blocks/bookings for same room+time | R-003 | Integration test: insert block over booking → assert conflict; insert booking over block → assert conflict | Test pass report (constraint violation caught) | OPEN — Story 3.4 |
| **Performance (NFR-003)** | Room list for calendar/booking selector loads < 3s under org load | R-009 | Static partial-index assertion in migration test; optional: k6 smoke on room-list endpoint | Partial-index present in schema; load test p95 < 3s | OPEN — Story 3.1 |
| **Accessibility (NFR-007)** | Room admin pages (list, create, edit, deactivate modal) WCAG 2.1 AA | — | axe-core E2E scan on room management pages; visible focus rings on form fields; form labels not placeholder-only | axe-core zero-violation report | Pending E2E activation |
| **Localization (NFR-006)** | All room form labels, errors, feature names via Paraglide; no hardcoded Thai text | — | CI lint `no-hardcoded-strings`; assert form renders via `m.*()` keys; Rawinan handles Thai translations | Lint run clean; no hardcoded strings in room components | Ongoing CI gate |
| **Responsiveness (NFR-004)** | Room admin pages usable on smartphone (organizer-flow tier per UX-DR10) | — | E2E viewport test at 375px on room list/form pages | No horizontal scroll/zoom at 375px | Pending E2E activation |

**Unknown thresholds:**
- No explicit maximum photo file size is defined in the PRD. Mark UNKNOWN — to be negotiated with Rawinan. Default: 10MB (common web upload cap); implement as an env-configurable limit.
- No explicit list of allowed MIME types for photos is defined. Mark UNKNOWN — implementation should default to `image/jpeg`, `image/png`, `image/webp`; tests should assert rejection of non-image types.

---

## Entry Criteria

- [x] Epic 1 fully done — scaffold, DB, audit-log, test harness, CI, Drizzle schema modules all in place
- [x] `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement()` available (Story 2.7 done via PR #112)
- [x] `tests/support/helpers/dev-bypass.ts` — `getDevBypassCookie()` seam available (Story 2.2)
- [x] `tests/support/fixtures/pg-factory.ts` — real-Postgres Testcontainers tier active (Story 1.8)
- [x] `writeAuditLog` helper available (`src/lib/server/services/audit.ts`) (Story 1.6)
- [x] `hooks.server.ts` `routeGuards` exported registry — append-only for Epic 3 admin routes (Story 2.5)
- [x] `requireAdmin` guard implemented and tested — `auth-guard.test.ts` green (Story 2.5)
- [ ] `rooms` Drizzle schema module — to be created in Story 3.1 (domain-scoped, consistent with E1 pattern)
- [ ] Room photo volume mount declared in `compose.yaml` and accessible from app routes (Story 3.2)
- [ ] `room_blocks` or `blocks` table declared with tstzrange column (Story 3.4)

## Exit Criteria

- [ ] R-001 mitigation: photo route returns 302/403 for unauthenticated requests — integration test green
- [ ] R-002 mitigation: non-admin organizer cannot invoke room mutations — `testOwnershipEnforcement` proof green
- [ ] R-003 mitigation: block slot vs. booking overlap raises conflict — integration test green
- [ ] R-004 mitigation: deactivated room absent from active room list — integration test green
- [ ] R-005 mitigation: uploaded photo survives restart — integration test green (volume path + env var assertion)
- [ ] All P0 tests passing (100%, zero failures)
- [ ] `audit_log` writes confirmed for room create, edit, deactivate — integration tests green
- [ ] CI pipeline green (lint + typecheck + unit + integration + build)
- [ ] axe-core zero violations on room management pages (pending E2E activation)

---

## Risk Mitigation Plans

### R-001: Photo Route Without Access Control (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `3.2-INT-004`: unauthenticated GET `/rooms/[id]/photo` → assert 302→/login or 403; confirm route is in `routeGuards` registry.
2. Integration test `3.2-INT-005`: authenticated admin GET `/rooms/[id]/photo` → assert 200 and content-type `image/*`.
3. Static assertion: confirm photo serving route does not use `+page.server.ts` with no guard — route must explicitly call `requireUser` (admin or any authenticated user; consult PRD re: scope).
4. `routeGuards` registry push in Story 3.2 — confirm via source inspection similar to `2.5-UNIT-001`.

**Owner:** Dev / QA
**Timeline:** Story 3.2
**Status:** OPEN

---

### R-002: IDOR on Admin Room Routes (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `3.1-INT-006`: use `testOwnershipEnforcement()` from `idor-template.ts` — seed a non-admin organizer session, attempt POST `/admin/rooms` (create) → assert 403.
2. Integration test `3.1-INT-007`: non-admin PATCH `/admin/rooms/[id]` (edit) → assert 403.
3. Integration test `3.3-INT-003`: non-admin POST `/admin/rooms/[id]/deactivate` → assert 403.
4. Integration test `3.4-INT-004`: non-admin POST `/admin/rooms/[id]/blocks` (create block) → assert 403.
5. Static assertion: confirm `requireAdmin` guard is registered for all `/admin/rooms/**` routes in `routeGuards`.

**Owner:** Dev / QA
**Timeline:** Story 3.1 (initial), extended in 3.3 and 3.4
**Status:** OPEN

---

### R-003: Block Slot vs. Booking Overlap (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `3.4-INT-002`: insert booking for room R, time T1–T2; insert block for room R overlapping T1–T2; assert constraint violation or HTTP 422 conflict response.
2. Integration test `3.4-INT-003`: insert block for room R, time T1–T2; attempt booking overlapping T1–T2 via the booking service/endpoint; assert conflict.
3. Static schema assertion: confirm `room_blocks` (or equivalent) participates in the EXCLUDE constraint or an application-level conflict check queries both `bookings` and `blocks` tables.

**Owner:** Dev / QA
**Timeline:** Story 3.4
**Status:** OPEN

---

### R-004: Deactivated Room Visible in Booking Selector (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `3.3-INT-001`: create room, deactivate it, query room-list endpoint (`GET /rooms?active=true` or equivalent); assert deactivated room is absent.
2. Integration test `3.3-INT-002`: assert deactivated room row still exists in DB with `is_active = false` (soft delete confirmed, record retained per NFR-005).
3. Integration test `3.3-INT-004`: re-activating a deactivated room (if applicable) makes it reappear — or document as out of scope if re-activation is not a Story 3.3 AC.

**Owner:** Dev / QA
**Timeline:** Story 3.3
**Status:** OPEN

---

### R-005: Photo Storage Path Not Preserved (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `3.2-INT-006`: upload photo, capture stored path from DB; simulate read (re-fetch file from resolved path); assert file content matches.
2. Static test `3.2-UNIT-001`: assert upload directory is resolved from an env var (e.g., `UPLOAD_DIR` or `PHOTO_STORAGE_PATH`), not a hardcoded string.
3. Static test `3.2-UNIT-002`: assert the env var resolves to the volume mount point declared in `compose.yaml` (consistent with AR-10 deployment pattern).

**Owner:** Dev / QA
**Timeline:** Story 3.2
**Status:** OPEN

---

## Test Coverage Plan

### Scenario ID Format

`3.{story}-{LEVEL}-{SEQ}` — e.g., `3.1-INT-001` = Epic 3, Story 1, Integration test, sequence 001.

### Implementation Status Codes

- ✅ **ACTIVE** — test implemented and passing
- 🟡 **SKIP** — scaffold exists; `test.skip()` pending activation condition
- 🔵 **TODO** — `test.todo()` stub; awaiting story implementation
- ⬜ **PLANNED** — no file yet; planned for upcoming story

---

### P0 (Critical)

**Criteria:** Blocks core journey + High risk (score ≥6) + No workaround

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | File | Status |
| ----------- | ----- | -------------------- | ---------- | --------- | ---- | ------ |
| 3.1-INT-001 | 3.1 | Admin creates a room with name, floor, capacity, features → room appears in list | Integration | R-002 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-INT-002 | 3.1 | Room creation with empty name rejected — HTTP 422, field-level error, no row created | Integration | R-006 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-INT-003 | 3.1 | Room edit saves updated fields; prior values are replaced | Integration | — | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-INT-006 | 3.1 | Non-admin (organizer) POST room create → 403 (IDOR/authorization) | Integration | R-002 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.2-INT-001 | 3.2 | Admin uploads a photo → file stored on volume, path saved on room record | Integration | R-005 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.2-INT-004 | 3.2 | Unauthenticated GET room photo → 302 to login or 403 | Integration | R-001 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.3-INT-001 | 3.3 | Deactivated room absent from active room list endpoint | Integration | R-004 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.3-INT-002 | 3.3 | Deactivated room row still exists in DB with `is_active = false` (soft delete) | Integration | R-004 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.4-INT-001 | 3.4 | Admin creates a block for a time range → range shows blocked; block is returned in room timeline query | Integration | R-003 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.4-INT-002 | 3.4 | Block over an already-booked time range → conflict reported (HTTP 422, not 500) | Integration | R-003, R-011 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.4-INT-003 | 3.4 | Booking attempt over an existing block → conflict detected | Integration | R-003 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-INT-008 | 3.1 | Room create/edit writes `audit_log` row (entity=`room`, action=`create`/`update`, actor_id, diff) | Integration | R-008 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |

**Total P0:** 12 scenarios — all planned (all 4 stories backlog)

---

### P1 (High)

**Criteria:** Important foundation features + Medium risk (score 3–5) + Common workflows

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | File | Status |
| ----------- | ----- | -------------------- | ---------- | --------- | ---- | ------ |
| 3.1-INT-004 | 3.1 | Room with all 3 features (projector/whiteboard/VC) selected — feature values are stored as correct enum values | Integration | R-007 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-INT-005 | 3.1 | Room with no features selected — features stored as empty/null, no error | Integration | R-007 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-INT-007 | 3.1 | Non-admin organizer PATCH room edit → 403 | Integration | R-002 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-UNIT-001 | 3.1 | `requireAdmin` guard is registered for all `/admin/rooms/**` route patterns in `routeGuards` — static source assertion | Unit/Static | R-002 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-UNIT-002 | 3.1 | Partial index on `rooms (is_active) WHERE is_active = true` exists in Drizzle migration | Unit/Static | R-009 | `tests/integration/db-schema.test.ts` | ⬜ PLANNED |
| 3.2-INT-002 | 3.2 | Non-image file (e.g., `.txt`) upload rejected — HTTP 400/422, MIME type validated server-side | Integration | R-010 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.2-INT-003 | 3.2 | Authenticated admin can retrieve uploaded photo via serving route → 200, `content-type: image/*` | Integration | R-001 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.2-INT-005 | 3.2 | Non-admin organizer attempt to serve photo route → same 302/403 restriction as unauthenticated (photo is admin/authenticated access) | Integration | R-001 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.2-UNIT-001 | 3.2 | Upload directory resolved from env var (not hardcoded) — static assertion | Unit/Static | R-005 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.3-INT-003 | 3.3 | Non-admin POST room deactivate → 403 | Integration | R-002 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.3-INT-005 | 3.3 | Room deactivate writes `audit_log` row (action=`deactivate`) | Integration | R-008 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.4-INT-004 | 3.4 | Non-admin POST block slot → 403 | Integration | R-002 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.4-INT-005 | 3.4 | Block slot delete (cancel) removes the block; time range becomes bookable again | Integration | — | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-E2E-001 | 3.1 | Admin opens room list, creates a room via UI form, sees it appear in the list | E2E | — | `tests/e2e/rooms.spec.ts` | ⬜ PLANNED |

**Total P1:** 14 scenarios — all planned

---

### P2 (Medium)

**Criteria:** Secondary/edge-case coverage + Low risk (score 1–3)

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | File | Status |
| ----------- | ----- | -------------------- | ---------- | --------- | ---- | ------ |
| 3.1-INT-009 | 3.1 | Room edit with rolled-back transaction writes no `audit_log` row | Integration | R-008 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-A11Y-001 | 3.1 | Room create/edit form passes axe-core (zero WCAG 2.1 AA violations) | E2E | — | `tests/e2e/rooms.spec.ts` | ⬜ PLANNED |
| 3.2-INT-006 | 3.2 | Uploaded photo file content is retrievable from the volume path recorded in DB | Integration | R-005 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.2-UNIT-002 | 3.2 | Photo storage env var matches volume mount in `compose.yaml` — static assertion | Unit/Static | R-005 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.3-INT-004 | 3.3 | Deactivated room cannot be selected in booking form (admin-only room-list query excludes it) | Integration | R-004 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.4-INT-006 | 3.4 | Block slot create writes `audit_log` row (action=`block_slot`) | Integration | R-008 | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.1-E2E-002 | 3.1 | Room list renders correctly on 375px viewport (smartphone, no horizontal scroll) | E2E | — | `tests/e2e/rooms.spec.ts` | ⬜ PLANNED |
| 3.4-INT-007 | 3.4 | Two blocks for the same room at non-overlapping times can both be created without error | Integration | — | `tests/integration/rooms.test.ts` | ⬜ PLANNED |

**Total P2:** 8 scenarios — all planned

---

### P3 (Low) — Run on-demand only

**Criteria:** Nice-to-have, exploratory, edge conditions

| Scenario ID | Story | Description | Test Level | File | Status |
| ----------- | ----- | ----------- | ---------- | ---- | ------ |
| 3.1-P3-001 | 3.1 | Room name at maximum length (255 chars) is accepted; name exceeding maximum is rejected | Integration | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.2-P3-001 | 3.2 | Overwriting a photo (uploading again) replaces stored file and path — no orphan files | Integration | `tests/integration/rooms.test.ts` | ⬜ PLANNED |
| 3.4-P3-001 | 3.4 | Concurrent block creation attempts for same room+time — only one succeeds (DB constraint wins) | Integration | `tests/integration/rooms.test.ts` | ⬜ PLANNED |

**Total P3:** 3 scenarios — all planned

---

## Execution Strategy

**Philosophy:** Run all functional tests on every PR if total wall-clock time stays under 15 minutes. Epic 3 integration tests are server-side (no Docker Compose cold-start beyond the Testcontainers Postgres already established in E1/E2).

### Proposed Test Files

| File | Coverage | Notes |
| ---- | -------- | ----- |
| `tests/integration/rooms.test.ts` | Stories 3.1–3.4 — all P0/P1/P2 integration scenarios | New file; follows `profile.test.ts` pattern; Testcontainers Postgres |
| `tests/e2e/rooms.spec.ts` | Story 3.1 E2E (P1: room list + create UI) + P2 a11y + responsive | New file; uses `playwright.config.ts` `webServer` config (needs activation) |
| `tests/integration/db-schema.test.ts` | `3.1-UNIT-002` — partial index assertion | **Existing file** — append test to existing schema assertion suite |

### PR Gate (every PR — target < 15 min)

- Lint + typecheck + svelte-check (`bun run check`)
- Vitest unit suite (static/unit assertions: `3.1-UNIT-001/002`, `3.2-UNIT-001/002`)
- Vitest integration suite (P0+P1 integration tests — uses Testcontainers Postgres)
  - New: `rooms.test.ts` — all P0 + P1 integration scenarios
  - Existing: `db-schema.test.ts` — append `3.1-UNIT-002` partial-index assertion
- Playwright E2E (`rooms.spec.ts`) — P1 room list/create UI; activate alongside Playwright dev-server config already needed from E2 backlog
- `bun run build`

### Nightly

- P2 edge-case scenarios (8 scenarios)
- Full Docker Compose cold-start smoke (confirms photo volume mount and room routes work through nginx)
- Dependency / vulnerability scan

### On-Demand

- P3 scenarios (max-length names, concurrent blocks, orphan file cleanup)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Estimated Effort | Notes |
| -------- | ----- | ---------------- | ----- |
| P0 | 12 | ~24–36h | New `rooms.test.ts` file; DB schema extensions; IDOR proofs using existing template |
| P1 | 14 | ~18–28h | Static assertions quick; E2E activation depends on Playwright webServer config |
| P2 | 8 | ~6–12h | Mostly append to existing patterns |
| P3 | 3 | ~2–4h | On-demand; no gate effect |
| **Total** | **37** | **~50–80h** | **~7–10 engineering days** |

### Prerequisites for Story-Specific Tests

**Story 3.1 (~12–18h):**
- Create `tests/integration/rooms.test.ts` with Testcontainers Postgres fixture
- Rooms Drizzle schema module (`src/lib/server/db/rooms.ts` or similar)
- `requireAdmin` guard registered for `/admin/rooms/**` in `routeGuards`

**Story 3.2 (~12–16h):**
- Photo upload handler + access-controlled serving route
- Volume mount declared in `compose.yaml`; `UPLOAD_DIR` env var
- File upload test helpers (multipart form POST simulation in Vitest)

**Story 3.3 (~6–8h):**
- `is_active` flag on `rooms` table; deactivate mutation
- Active room-list query (used by E4 room selector)

**Story 3.4 (~8–12h):**
- `room_blocks` table with `during tstzrange`; conflict detection logic
- Conflict error path (reuse or extend E1 `23P01` → localized error pattern)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (zero exceptions — any P0 failure blocks merge)
- **P1 pass rate:** ≥95% (each failure requires triage comment with owner)
- **P2/P3 pass rate:** ≥90% (informational; failures do not block merge but are tracked)
- **Security mitigations (R-001 through R-003):** Must be COMPLETE before Epic 3 closes

### Coverage Targets

- **Admin route authorization (critical):** 100% — non-admin → 403 for all room mutations tested
- **Photo access control:** 100% — unauthenticated and non-admin confirmed blocked
- **Block slot conflict detection:** 100% — both directions (block-over-booking AND booking-over-block)
- **Audit trail (Epic 3 mutations):** 100% — room create, edit, deactivate, block_slot all audited

### Non-Negotiable Requirements

- [ ] R-001 (photo route access control) — `3.2-INT-004` green
- [ ] R-002 (admin IDOR enforcement) — `testOwnershipEnforcement` proofs green for all room mutations
- [ ] R-003 (block slot vs. booking conflict) — `3.4-INT-002` and `3.4-INT-003` green
- [ ] R-004 (deactivated room hidden) — `3.3-INT-001` green
- [ ] R-005 (photo storage persistence) — `3.2-INT-006` + `3.2-UNIT-001` green
- [ ] All P0 tests pass (zero failures)
- [ ] CI pipeline stays green (no regression to E1/E2 tests)

---

## Assumptions and Dependencies

### Assumptions

1. The `rooms` Drizzle schema module will follow the same per-domain module pattern established in E1 (`src/lib/server/db/rooms.ts` or `src/lib/server/db/schema/rooms.ts`).
2. Photo serving will be implemented as an authenticated SvelteKit route (e.g., `src/routes/(app)/rooms/[id]/photo/+server.ts`) that streams from the volume path, not as a static file serve.
3. Room blocks will use a `tstzrange` column (consistent with E1 EXCLUDE design) and will conflict-check against both `bookings` and other `blocks` for the same room.
4. The `is_active` flag on `rooms` will be a boolean column with a partial index — `WHERE is_active = true` — to support fast room-list queries for E4.
5. Audit log writes follow the exact same `writeAuditLog(tx, { entity, actorId, action, diff })` signature established in E1 — Epic 3 stories copy the pattern from `profile.test.ts` audit assertions.
6. No Thai text will be hardcoded in room form components — all strings flow through Paraglide (per project memory rule; Rawinan handles Thai translations).
7. The `testOwnershipEnforcement` helper from `tests/support/helpers/idor-template.ts` is usable for admin-role enforcement by seeding a non-admin authenticated session (organizer role) using the dev-bypass seam, targeting room mutation routes.

### Dependencies

1. **Epic 1 (done)** ✅ — scaffold, Drizzle, test harness, CI pipeline, audit-log write hook, EXCLUDE constraint.
2. **Epic 2 (done)** ✅ — `requireAdmin` guard, `routeGuards` registry, `AUTH_DEV_BYPASS` seam, `dev-bypass.ts` helper, `idor-template.ts` (Story 2.7, PR #112).
3. **Rooms Drizzle schema (Story 3.1)** — `rooms` table with `name`, `floor`, `capacity`, `features`, `is_active`; partial index on `is_active`.
4. **Photo volume mount (Story 3.2)** — `UPLOAD_DIR` env var + volume declaration in `compose.yaml`.
5. **`room_blocks` table (Story 3.4)** — `tstzrange` column + conflict-check logic.

### Risks to Plan

- **Risk:** Photo upload multipart-form tests in Vitest require constructing `FormData` + `File` objects or using a multipart body string. This may require a test helper or `node-fetch`-compatible approach since Vitest runs in Bun.
  - **Impact:** `3.2-INT-001` implementation complexity is slightly higher than other tests.
  - **Contingency:** Use Bun's built-in `FormData` API (available in Bun >= 1.0) or delegate to Playwright's `request.post` with `multipart` option in `3.1-E2E-001`.

- **Risk:** Playwright `webServer` config (for `rooms.spec.ts`) requires the dev-server activation work already tracked as E2 backlog. If this isn't resolved before Story 3.1 E2E work begins, E2E room tests will be skipped.
  - **Impact:** `3.1-E2E-001` and `3.1-A11Y-001` (P1/P2) remain skipped until dev-server config lands.
  - **Contingency:** Scope E2E tests as `test.skip()` stubs immediately; activate via Playwright webServer config (single activation effort covers all E2/E3 E2E skips).

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **E1 EXCLUDE constraint** | Block slot implementation must either reuse or extend the constraint — any schema change to `bookings` or blocks table must not break the constraint | `1.3-INT-*` (constraint-exists) must remain green; `3.4-INT-002/003` gate block+booking conflicts |
| **E2 `routeGuards` registry** | Adding room route guards in Story 3.1/3.3/3.4 pushes new entries; any hook format change breaks both E2 and E3 guards | `2.5-INT-001/002/003` must remain green; regression run triggered by `hooks.server.ts` changes |
| **E2 `idor-template.ts`** | Story 3.1/3.3/3.4 IDOR proofs depend on `testOwnershipEnforcement` API staying stable | `2.7-INT-001` must remain green; `idor-template.ts` API must not change signature |
| **E1 audit-log write hook** | Room mutations call `writeAuditLog` — any change to `audit.ts` signature breaks `3.1-INT-008`, `3.3-INT-005`, `3.4-INT-006` | `writeAuditLog` signature frozen; E1 audit tests must remain green |
| **E4 room-list query** | E4 (Story 4.2 read-model) queries the same `rooms` table with `is_active = true`; a schema change to rooms in E3 must not break E4's query | `3.3-INT-001/003` gate the is_active behavior; E4 stories reference E3 schema |
| **E1 CI pipeline** | CI gates (lint, typecheck, Vitest, Playwright, build) must continue passing with Epic 3 code added | Full CI run required on every Epic 3 PR; no regression to E1/E2 tests |

---

## Follow-on Workflows

- **For each Story 3.1–3.4:** Run `*atdd` (bmad-testarch-atdd) to generate the per-story ATDD checklist, seeding the specific test stubs planned in this test design.
- **Story 3.2 photo upload:** Consider running `*test-review` after implementation to verify the photo serving route security model (access control + MIME validation).
- **After Epic 3 is complete:** The room model becomes a stable contract for E4 — run E4 test design (`*test-design Epic 4`) referencing this document as context.
- **IDOR template reuse:** `tests/support/helpers/idor-template.ts` should be referenced in ATDD checklists for Stories 3.1, 3.3, and 3.4 (all room admin mutations).
- **E2E activation (rooms.spec.ts):** Add `webServer` config to `playwright.config.ts` to auto-start `bun dev` with `AUTH_DEV_BYPASS=true`; this unblocks both the E2 and E3 skipped E2E tests in a single change.

---

## Approval

**Test Design Approved By:**

- [ ] Product / Stakeholder: Rawinan — Date: ___
- [ ] Tech Lead: ___ — Date: ___
- [ ] QA Lead: ___ — Date: ___

---

## Appendix

### Knowledge Base References Used

- `risk-governance.md` — Risk classification framework (P×I matrix, gate rules)
- `probability-impact.md` — Risk scoring methodology (1–3 scale definitions)
- `test-levels-framework.md` — Test level selection (Unit / Integration / E2E)
- `test-priorities-matrix.md` — P0–P3 prioritization criteria

### Related Documents

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-conference-envocc-2026-06-07/`
- **Epics:** `_bmad-output/planning-artifacts/epics.md` (Epic 3, lines 521–585)
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md`
- **Sprint Status:** `_bmad-output/implementation-artifacts/sprint-status.yaml`
- **Epic 1 Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-1.md`
- **Epic 2 Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-2.md`
- **IDOR Template:** `tests/support/helpers/idor-template.ts` (Story 2.7, done)
- **Dev Bypass Helper:** `tests/support/helpers/dev-bypass.ts` (Story 2.2, done)
- **Auth Guard Tests (E2):** `tests/integration/auth-guard.test.ts` (8 tests, all green)
- **DB Schema Tests:** `tests/integration/db-schema.test.ts` (append `3.1-UNIT-002`)

### Risk Score Legend

| Score | Action | Gate Effect |
| ----- | ------ | ----------- |
| 9 | BLOCK | Automatic FAIL — must resolve before shipping |
| 6–8 | MITIGATE | CONCERNS — must have mitigation plan before merge |
| 4–5 | MONITOR | Watch; plan mitigations proactively |
| 1–3 | DOCUMENT | Awareness only |

### Test File Inventory (Epic 3 — Planned)

| File | Tests | Status |
| ---- | ----- | ------ |
| `tests/integration/rooms.test.ts` | ~35 (P0: 12, P1: 11 integration, P2: 8, P3: 3) | NEW — to be created in Story 3.1 |
| `tests/e2e/rooms.spec.ts` | ~3 (P1: 1, P2: 2) | NEW — requires Playwright webServer activation |
| `tests/integration/db-schema.test.ts` | +1 (`3.1-UNIT-002` partial-index assertion) | EXISTING — append one test |

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
**Epic:** 3 — Room Inventory
**Mode:** Epic-Level
**Revision:** v2 (2026-06-13) — Status refresh; Story 3.1 done (PR #113), epic-3 in-progress; Stories 3.2–3.4 remain backlog. No scenarios added or removed; design for 3.2–3.4 unchanged.
**Revision:** v1 (2026-06-12) — Initial generation; all 4 stories backlog.
  5 high-priority risks identified (R-001 photo access, R-002 IDOR, R-003 block conflict, R-004 deactivation, R-005 storage).
  12 P0 + 14 P1 + 8 P2 + 3 P3 scenarios planned.
  Reuses `idor-template.ts` (Story 2.7) and `testcontainers-context.ts` (E1) without modification.
