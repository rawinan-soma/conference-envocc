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

# Test Design: Epic 4 — Room Booking & Organizer Workspace

**Date:** 2026-06-13
**Author:** Rawinan
**Status:** Living Document (v1)
**Mode:** Epic-Level Test Design

---

## Executive Summary

**Scope:** Epic-level test design for Epic 4 — Room Booking & Organizer Workspace

Epic 4 is the system's revenue engine. It delivers the conflict-free booking core (Stories 4.1–4.4), the shareable registration link + QR (4.5), the booking-confirmation email (4.6), edit/cancel/duplicate (4.7), and the organizer dashboard (4.8). It is the first epic that fires real transactional email via the pg-boss → nodemailer → org SMTP pipeline established in E1. It is also the first epic to exercise the EXCLUDE constraint *behaviorally* (the bare DDL was proven in E1; E4 refines the predicate to `WHERE status <> 'cancelled'` and maps `23P01` → localized field error). E5 (external registration) and E6/E7 all depend on the booking and token model E4 creates.

**Why this epic is high-stakes for testing:**

Epic 4 sits at the intersection of the system's three hardest technical problems: (1) the EXCLUDE constraint predicate refinement under concurrent writes; (2) the first transactional email through the real SMTP pipeline; and (3) the token generation model that E5 will serve to the public. A double-booking not caught here invalidates NFR-002 entirely. A missing `assertOwner` guard on booking mutations is an IDOR vulnerability that exposes every organizer's event data. An unqueued synchronous email blocks the booking request thread. Any of these failures blocks every downstream epic.

**Implementation Status (2026-06-13 — v1):** All eight stories (4.1–4.8) are `backlog`. Epic 1 (done), Epic 2 (done), and Epic 3 (done) provide the complete platform: EXCLUDE constraint DDL proven, pg-boss + nodemailer wired, Drizzle + PostgreSQL, audit-log write hook, test harness (Testcontainers + Vitest), CI pipeline, dev bypass seam, guard dispatcher (`requireUser` / `requireAdmin` / `assertOwner`), IDOR template, rooms table + blocks table (E3).

**Foundation Available from E1/E2/E3:**

- `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement()` ready for booking ownership assertions
- `tests/support/helpers/dev-bypass.ts` — `getDevBypassCookie()` seam for authenticated organizer sessions
- `tests/support/fixtures/pg-factory.ts` — real-Postgres via Testcontainers
- `tests/integration/db-schema.test.ts` — append concurrent double-booking test here
- `hooks.server.ts` `routeGuards` registry — append-only; E4 booking routes push `requireUser` + `assertOwner` entries
- `src/lib/server/services/audit.ts` — `writeAuditLog()` available for booking mutations

**Risk Summary:**

- Total risks identified: 13
- High-priority risks (score ≥6): 7
- Critical categories: DATA, SEC, BUS, TECH, PERF

**Coverage Summary:**

- P0 scenarios: 16 (~32–48 hours)
- P1 scenarios: 16 (~18–28 hours)
- P2 scenarios: 9 (~6–10 hours)
- P3 scenarios: 4 (~2–4 hours)
- **Total effort**: ~58–90 hours (~8–11 engineering days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **External registration page (FR-040–047)** | The public `/r/[token]` destination page is E5. E4 asserts token *generation* and persistence only, not the public page behavior. | Epic 5 test design covers all external registration flows. |
| **Registrant list & dashboard headcount** | FR-035 was explicitly moved to E5 (epics.md). Dashboard headcount placeholder is shown in E4 (zero count); live count populates in E5. | Epic 5 test design covers registrant list and count. |
| **Booking cancellation notifies attendees (FR-016)** | Attendees do not exist in E4 (they are created in E5). The cancellation email to attendees is E6. | Epic 6 test design (Story 6.3). |
| **Room deactivation cascade (FR-063)** | Cascade auto-cancels future bookings — this is E7 (Story 7.1). E3 deactivation only removes rooms from the selector. | Epic 7 test design (Story 7.1). |
| **Sign-in sheet PDF (FR-036)** | pdfmake + Thai font rendering is E6 (Story 6.1). | Epic 6 test design. |
| **1-day reminder email (FR-037)** | The reminder sweeper pg-boss job is E6 (Story 6.2). | Epic 6 test design. |
| **Registration open/close auto-close job (FR-033)** | The auto-close pg-boss job is E5 (Story 5.6). E4 only persists the closing date column for E5 to act on. | Epic 5 test design. |
| **Internal "register to attend" (FR-100–105)** | Internal registration is E6 (Stories 6.4–6.6). | Epic 6 test design. |
| **Admin analytics / CSV export / audit-log view** | All E7. | Epic 7 test design. |
| **SMTP settings UI (FR-081)** | Admin SMTP configuration is E7 (Story 7.6). E4 uses the SMTP platform wired in E1. | Epic 7 test design. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline | Status |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- | -------- | ------ |
| R-001 | DATA | EXCLUDE predicate not refined — if `WHERE status <> 'cancelled'` is not applied to the constraint predicate in Story 4.1, cancelled bookings continue to block new bookings, violating NFR-002 and causing false conflict errors for organizers | 2 | 3 | **6** | Integration test: create booking A, cancel it (status=cancelled), create booking B for same room+time; assert B succeeds; static assertion: confirm predicate is `WHERE (status != 'cancelled')` in migration SQL | Dev / QA | Story 4.1 | OPEN |
| R-002 | DATA | Concurrent double-booking not prevented at DB level — if the EXCLUDE predicate is correct but only enforced by app-level pre-checks (not the DB constraint), two simultaneous POST requests can both succeed, creating two active bookings for the same slot | 3 | 3 | **9** | Concurrent integration test (mandated by AR-11 + epics.md): N parallel inserts on one slot via Testcontainers Postgres — assert exactly one commit and the rest raise `23P01`; this is the non-negotiable AR-11 concurrent double-booking test | Dev / QA | Story 4.1 | OPEN |
| R-003 | SEC | IDOR on booking mutations — a non-owner organizer can edit, cancel, or duplicate another organizer's booking by hitting the action endpoint directly (assertOwner guard missing or misconfigured for booking routes) | 2 | 3 | **6** | Integration test using `testOwnershipEnforcement()`: seed owner + non-owner organizer sessions; POST edit/cancel/duplicate on owner's booking with non-owner cookie; assert 403; static assertion: `assertOwner` guard registered in `routeGuards` for all booking mutation routes | Dev / QA | Stories 4.4, 4.7 | OPEN |
| R-004 | BUS | Booking confirmation email sent synchronously (blocks request thread) — if the nodemailer send is called directly in the form action instead of via pg-boss enqueue, a slow or unavailable SMTP server causes booking creation to fail or time out for the organizer | 2 | 3 | **6** | Integration test `4.6-INT-002`: after booking creation, assert the pg-boss job queue contains an email job (not that the email was sent inline); assert the booking form action returns before Mailpit receives the email; Mailpit delivery confirmed in a separate assertion | Dev / QA | Story 4.6 | OPEN |
| R-005 | SEC | Registration token is predictable or unhashed — if the token is generated with `Math.random()` or stored plaintext, an attacker can enumerate or steal registration links | 2 | 3 | **6** | Integration test `4.5-INT-002`: assert the `registration_token` column in `bookings` table stores a hash (not the raw token); assert the token in the confirmation URL is not derivable from booking metadata (opaque, high entropy); CSPRNG verification (not Math.random) via static source assertion | Dev / QA | Story 4.5 | OPEN |
| R-006 | BUS | `23P01` error not caught and mapped — if the booking service does not catch Postgres error `23P01` and rethrow as a typed conflict error, the organizer sees a generic 500 error instead of a localized field-level conflict message (violates UX-DR8 + AC of Story 4.1) | 2 | 3 | **6** | Integration test `4.1-INT-003`: force a conflict by inserting a booking via raw SQL, then POST a booking via the API for the same slot; assert HTTP 422 (not 500) and a structured `{field: 'time', error: '...'}`-shaped response; assert the response is never a 500 | Dev / QA | Story 4.1 | OPEN |
| R-007 | PERF | Room calendar query unindexed — the week-calendar read-model (Story 4.2) performs a range overlap query (`during && [week_start, week_end)`) across all rooms; without a GiST index on `bookings.during`, this degrades to a sequential scan that violates NFR-003 (<3s) | 2 | 3 | **6** | Static test `4.2-UNIT-001`: assert a GiST index exists on `bookings (during)` in the migrated schema (in addition to the EXCLUDE constraint index); optional: k6 smoke on the week-calendar endpoint under N-room load | Dev / QA | Story 4.2 | OPEN |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Status |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- | ------ |
| R-008 | BUS | Back-to-back bookings incorrectly flagged as conflicts — the half-open `tstzrange [)` must allow 10:00–11:00 and 11:00–12:00 for the same room without conflict; if the range is closed `[]` or if the EXCLUDE uses `>` instead of `&&`, adjacent bookings are incorrectly rejected | 2 | 2 | 4 | Integration test `4.1-INT-004`: insert bookings for same room at 10:00–11:00 and 11:00–12:00; assert both succeed; assert no `23P01` raised | Dev / QA | OPEN |
| R-009 | BUS | QR code not downloadable or links wrong URL — if the QR encodes the wrong base URL (hardcoded, missing env var) or the download endpoint returns a wrong content-type, organizers cannot share a working QR | 2 | 2 | 4 | Integration test `4.5-INT-004`: create booking, request QR download endpoint; assert `Content-Type: image/png` (or `image/svg+xml`); assert QR content decodes to a URL matching the expected registration link pattern | Dev / QA | OPEN |
| R-010 | BUS | Duplicate booking does not pre-fill correctly — if the duplicate action copies the wrong fields (e.g. omits the closing date or catering toggle), organizers get an incomplete pre-fill and may miss configuration | 2 | 2 | 4 | Integration test `4.7-INT-004`: create a booking with catering=true, closing_date, event name; duplicate it; assert the new form pre-fill contains all copied fields at their original values; assert the duplicate creates a new booking row (not mutates the original) | Dev / QA | OPEN |
| R-011 | BUS | Audit log missing on booking mutations — booking create, edit, cancel are organizer mutations that must write an `audit_log` row via the E1 hook; if Story 4.4/4.7 omits the hook call, the audit trail is incomplete (FR-073 coverage gap) | 2 | 2 | 4 | Integration test `4.4-INT-004`: create booking → assert `audit_log` row (entity=`booking`, action=`create`, actor_id, diff); cancel booking → assert `cancel` row; edit booking → assert `update` row | Dev / QA | OPEN |
| R-012 | TECH | Booking email idempotency key collision — if two booking-confirmation jobs for the same booking use the same pg-boss idempotency key, only the first is delivered (but this is correct); if different jobs share a key, the second is silently dropped | 1 | 3 | 3 | Integration test: create two distinct bookings; assert two distinct idempotency keys in the job queue; assert both emails appear in Mailpit | Dev / QA | OPEN |
| R-013 | OPS | Organizer dashboard shows bookings from other organizers — if the dashboard query omits the `WHERE organizer_id = current_user_id` filter, an organizer can see all org bookings; this is a data-visibility regression, not a write-access issue | 2 | 2 | 4 | Integration test `4.8-INT-003`: seed two organizers with separate bookings; log in as organizer A; assert dashboard returns only organizer A's bookings (organizer B's bookings absent) | Dev / QA | OPEN |

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
| **Reliability (NFR-002)** | 100% double-booking prevention — EXCLUDE constraint predicate `WHERE status <> 'cancelled'` + `23P01` → field error; concurrent writes never produce two active bookings for the same slot | R-001, R-002, R-006 | Concurrent integration test (AR-11 mandate): N parallel inserts on one slot → assert exactly one commit; `23P01` → 422 field error test; cancelled-booking-reuse test | Concurrent test pass report; zero 500s on conflict; pass report for `4.1-INT-001/002/003` | OPEN — Story 4.1 |
| **Security (NFR-001)** | No IDOR on booking mutations; registration token is opaque CSPRNG stored hashed; no credential literals in code | R-003, R-005 | `testOwnershipEnforcement()` proofs for edit/cancel/duplicate; CSPRNG + hash static assertion; dependency/vuln scan in CI | Test pass report; static source assertion; CI vuln-scan report | OPEN — Stories 4.4, 4.5, 4.7 |
| **Performance (NFR-003)** | Room calendar and organizer dashboard load < 3s under normal org load | R-007 | Static GiST index assertion on `bookings.during`; optional k6 smoke on `/calendar?week=...` and `/dashboard` endpoints | GiST index present in schema; load test p95 < 3s (optional for MVP) | OPEN — Story 4.2 |
| **Accessibility (NFR-007)** | WCAG 2.1 AA — booking form, calendar view, dashboard, confirmation screen | — | axe-core E2E scan on booking form, calendar, dashboard, confirmation pages; visible focus rings; form labels not placeholder-only; color-not-alone for slot states | axe-core zero-violation report | Pending E2E Playwright activation |
| **Localization (NFR-006)** | All booking form labels, errors, email subject/body, dashboard text via Paraglide; no hardcoded Thai text in code | — | CI lint `no-hardcoded-strings`; Mailpit email subject/body assertion in Thai locale; assert `m.*()` keys used in booking form components | Lint run clean; Mailpit email in Thai; no hardcoded strings in booking components | Ongoing CI gate |
| **Responsiveness (NFR-004)** | Organizer booking form and dashboard usable on smartphone (no horizontal scroll at 375px); calendar UX-DR10 tier | — | E2E viewport test at 375px on booking form + dashboard | No horizontal scroll/zoom at 375px | Pending E2E activation |

**Unknown thresholds:**

- No explicit maximum booking event name length defined in PRD. Mark UNKNOWN — implementation default: 255 chars; test assertion: accept 255, reject 256.
- No maximum duration for a single booking defined. Mark UNKNOWN — implementation should cap at a reasonable value (e.g. 24 hours); consult Rawinan.
- No explicit QR code format (PNG vs SVG) mandated. Implementation default: PNG; test against actual served content-type.

---

## Entry Criteria

- [x] Epic 1 fully done — scaffold, DB with EXCLUDE DDL, pg-boss + nodemailer platform, audit-log hook, test harness (Testcontainers + Vitest), CI pipeline
- [x] `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement()` available (Story 2.7, PR #112)
- [x] `tests/support/helpers/dev-bypass.ts` — `getDevBypassCookie()` seam available (Story 2.2)
- [x] `tests/support/fixtures/pg-factory.ts` — real-Postgres Testcontainers tier active (Story 1.8)
- [x] `writeAuditLog` helper available (`src/lib/server/services/audit.ts`) (Story 1.6)
- [x] `hooks.server.ts` `routeGuards` registry — `requireUser` + `assertOwner` patterns available (Story 2.5)
- [x] `rooms` table + `room_blocks` table — available from Epic 3 (Stories 3.1, 3.4)
- [x] `is_active` flag on rooms — deactivated rooms filtered from booking room selector (Story 3.3)
- [ ] `bookings` Drizzle schema module with `during tstzrange`, `status`, `organizer_id`, `registration_token_hash`, `qr_token`, and registration-config columns — to be created in Story 4.1/4.4
- [ ] EXCLUDE predicate refined to `WHERE status <> 'cancelled'` in Story 4.1 migration
- [ ] Booking service `src/lib/server/services/bookings.ts` — catches `23P01`, throws typed conflict error

## Exit Criteria

- [ ] R-002 mitigation (concurrent double-booking test) — `4.1-CONC-001` green (AR-11 mandatory)
- [ ] R-001 mitigation (cancelled booking reuse) — `4.1-INT-002` green
- [ ] R-003 mitigation (IDOR on booking mutations) — `testOwnershipEnforcement` proofs green for edit/cancel/duplicate
- [ ] R-005 mitigation (token CSPRNG + hash) — `4.5-INT-002` static assertion green
- [ ] R-006 mitigation (`23P01` → 422 field error) — `4.1-INT-003` green (never 500)
- [ ] R-007 mitigation (GiST index) — `4.2-UNIT-001` schema assertion green
- [ ] R-004 mitigation (email async) — `4.6-INT-002` pg-boss queue assertion green
- [ ] All P0 tests passing (100%, zero failures)
- [ ] `audit_log` writes confirmed for booking create, edit, cancel — integration tests green
- [ ] Booking confirmation email delivered to Mailpit in Thai — `4.6-INT-001` green
- [ ] CI pipeline green (lint + typecheck + unit + integration + build)
- [ ] axe-core zero violations on booking form and dashboard pages (pending E2E activation)

---

## Risk Mitigation Plans

### R-001: EXCLUDE Predicate Not Refined (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `4.1-INT-001`: create booking A (active), create booking B for same room+time → assert `23P01` / HTTP 422 conflict.
2. Integration test `4.1-INT-002`: create booking A, cancel it (status=`cancelled`), create booking B for same room+time → assert B **succeeds** (no conflict).
3. Static migration assertion: read the migration SQL, assert the EXCLUDE constraint includes `WHERE (status != 'cancelled')` predicate.
4. Append to `tests/integration/db-schema.test.ts` — constraint-predicate existence check.

**Owner:** Dev / QA
**Timeline:** Story 4.1
**Status:** OPEN

---

### R-002: Concurrent Double-Booking (Score: 9 — OPEN)

**Mitigation Strategy (planned):**
1. Concurrent integration test `4.1-CONC-001` (AR-11 mandate): spawn N concurrent transactions each attempting to INSERT a booking for the same room+time slot via the Testcontainers Postgres pool; assert exactly one INSERT succeeds and the rest raise `23P01` or are rolled back. N = 5 minimum.
2. This test must be in `tests/integration/db-schema.test.ts` or `tests/integration/bookings.test.ts` and run in the PR gate (not nightly-only).
3. Confirm the EXCLUDE constraint (not app-level check) is the final guard — remove any app-level pre-check and verify the constraint still blocks concurrent writes.

**Owner:** Dev / QA
**Timeline:** Story 4.1 (non-negotiable AR-11 requirement)
**Status:** OPEN

---

### R-003: IDOR on Booking Mutations (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `4.4-INT-005`: seed organizer A (owner) + organizer B (non-owner) via `pg-factory`; POST edit action on organizer A's booking with organizer B's session → assert 403.
2. Integration test `4.7-INT-005`: non-owner POST cancel → assert 403.
3. Integration test `4.7-INT-006`: non-owner POST duplicate → assert 403.
4. Static assertion `4.4-UNIT-001`: `assertOwner` guard registered for booking mutation routes in `routeGuards` registry.
5. Reuse `testOwnershipEnforcement()` from `idor-template.ts` for all three proofs.

**Owner:** Dev / QA
**Timeline:** Stories 4.4, 4.7
**Status:** OPEN

---

### R-004: Booking Confirmation Email Sent Synchronously (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `4.6-INT-002`: POST create-booking action; assert the HTTP response returns (with the booking confirmation screen) **before** the email appears in Mailpit. This is measured by asserting the pg-boss jobs table contains a pending email job immediately after the response.
2. Integration test `4.6-INT-001`: assert the Mailpit inbox eventually receives the Thai booking-confirmation email (via worker processing); assert Thai subject + org sender display name (FR-083).
3. Static source assertion: confirm the booking action body does **not** call `sendMail()` directly — it calls the pg-boss enqueue helper only.

**Owner:** Dev / QA
**Timeline:** Story 4.6
**Status:** OPEN

---

### R-005: Registration Token Predictable or Unhashed (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `4.5-INT-002`: create booking; query `bookings` table for `registration_token_hash`; assert it is a hash (non-empty, not equal to the raw token in the confirmation URL); assert the hash length matches the expected output of the chosen hash function (e.g. SHA-256 → 64 hex chars).
2. Static source assertion `4.5-UNIT-001`: confirm token generation uses `crypto.getRandomValues()` or `node:crypto` `randomBytes()` — not `Math.random()`; confirm raw token is never written to the DB column.
3. IDOR negative test `4.5-INT-003`: forge a registration URL with a made-up token; assert the server returns 404 (not 200, not 500).

**Owner:** Dev / QA
**Timeline:** Story 4.5
**Status:** OPEN

---

### R-006: `23P01` Error Not Caught and Mapped (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test `4.1-INT-003`: force a conflict by inserting a booking directly into the DB via the Testcontainers pool (bypassing app logic); then POST a booking for the same slot via the SvelteKit action; assert HTTP 422 (superforms `message`) **not** HTTP 500; assert response contains a structured field-level conflict error.
2. Integration test `4.1-INT-005`: assert the error message renders as a localized field-level message (not a raw Postgres error string) by checking the response body contains no `23P01` literal.

**Owner:** Dev / QA
**Timeline:** Story 4.1
**Status:** OPEN

---

### R-007: Room Calendar Query Unindexed (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Static schema test `4.2-UNIT-001`: append to `tests/integration/db-schema.test.ts` — assert a GiST index on `bookings (during)` exists in the migrated schema (separate from the EXCLUDE constraint index; or confirm the EXCLUDE constraint index covers range queries).
2. Integration read-model test `4.2-INT-001`: execute the week-calendar query via `EXPLAIN ANALYZE`; assert no `Seq Scan` on `bookings` when filtered by week range — must use `Index Scan` or `Bitmap Index Scan`.
3. Optional k6 smoke: GET `/calendar?week=YYYY-MM-DD` with 50 rooms × 100 bookings; assert p95 < 3s.

**Owner:** Dev / QA
**Timeline:** Story 4.2
**Status:** OPEN

---

## Test Coverage Plan

### Scenario ID Format

`4.{story}-{LEVEL}-{SEQ}` — e.g., `4.1-INT-001` = Epic 4, Story 1, Integration test, sequence 001. `4.1-CONC-001` = concurrent test.

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
| 4.1-CONC-001 | 4.1 | N concurrent inserts on same slot → exactly one succeeds, rest raise `23P01` (AR-11 concurrent double-booking test) | Integration/Concurrent | R-002 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.1-INT-001 | 4.1 | Sequential conflict: active booking exists for slot → POST same slot → `23P01` caught → HTTP 422, field-level conflict message (not 500) | Integration | R-001, R-006 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.1-INT-002 | 4.1 | Cancelled booking does not block: cancel booking A → POST booking B for same room+time → B succeeds (predicate `WHERE status<>'cancelled'` verified) | Integration | R-001 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.1-INT-003 | 4.1 | `23P01` maps to 422 not 500: force conflict via raw DB insert, then POST conflict via action → assert HTTP 422 + structured field error, never 500 | Integration | R-006 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.2-UNIT-001 | 4.2 | GiST index on `bookings (during)` exists in migrated schema (append to `db-schema.test.ts`) | Integration/Static | R-007 | `tests/integration/db-schema.test.ts` | ⬜ PLANNED |
| 4.4-INT-001 | 4.4 | Organizer creates booking (room, event name, date, start/end, catering toggle, registration toggle + closing date) → booking row saved; registration-config columns persisted; no headcount/capacity field present | Integration | — | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.4-INT-002 | 4.4 | Booking creation with overlapping slot rejected: HTTP 422, field-level localized error | Integration | R-001, R-006 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.4-INT-005 | 4.4 | IDOR: non-owner organizer POST edit-booking action → 403 (`assertOwner` enforcement) | Integration | R-003 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.5-INT-001 | 4.5 | Booking confirmation: registration token generated + persisted as hash; registration URL present in confirmation response; QR downloadable | Integration | R-005 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.5-INT-002 | 4.5 | Token security: `registration_token_hash` column stores a hash (not raw token); token in URL ≠ DB value; length matches hash function output | Integration/Static | R-005 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.6-INT-001 | 4.6 | Booking-confirmation email delivered to Mailpit in Thai; sender display name = org name; subject and body not empty; email is NOT sent inline (arrives after response) | Integration | R-004 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.6-INT-002 | 4.6 | Email is enqueued async: pg-boss jobs table contains email job immediately after booking action returns (before worker processes it) | Integration | R-004 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.7-INT-001 | 4.7 | Cancel booking: status set to `cancelled`; slot freed (subsequent booking for same slot succeeds) | Integration | — | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.7-INT-005 | 4.7 | IDOR: non-owner POST cancel → 403 | Integration | R-003 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.8-INT-001 | 4.8 | Dashboard returns upcoming bookings for the logged-in organizer: event name, room, date/time, registration link present | Integration | — | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.8-INT-003 | 4.8 | Dashboard data isolation: organizer A sees only their bookings; organizer B's bookings are absent from A's dashboard response | Integration | R-013 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |

**Total P0:** 16 scenarios — all planned (all 8 stories backlog)

---

### P1 (High)

**Criteria:** Important foundation features + Medium risk (score 3–5) + Common workflows

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | File | Status |
| ----------- | ----- | -------------------- | ---------- | --------- | ---- | ------ |
| 4.1-INT-004 | 4.1 | Back-to-back bookings (10:00–11:00 + 11:00–12:00 same room) both succeed — `tstzrange [)` half-open confirmed | Integration | R-008 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.1-INT-005 | 4.1 | Conflict error message does not expose raw Postgres `23P01` string — response body contains localized message only | Integration | R-006 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.1-UNIT-001 | 4.1 | EXCLUDE constraint predicate `WHERE (status != 'cancelled')` present in migration SQL — static source assertion | Unit/Static | R-001 | `tests/integration/db-schema.test.ts` | ⬜ PLANNED |
| 4.2-INT-001 | 4.2 | Week-calendar read-model returns per-room bookings for the requested week; deactivated rooms absent from response | Integration | R-007 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.2-INT-002 | 4.2 | `EXPLAIN ANALYZE` on week-calendar query uses index scan (not seq scan) on `bookings` | Integration | R-007 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.3-E2E-001 | 4.3 | Calendar renders rooms on Y axis × days on X axis; booking chips visible; empty cells clickable | E2E | — | `tests/e2e/bookings.spec.ts` | ⬜ PLANNED |
| 4.4-INT-003 | 4.4 | Booking with catering=false and registration=false creates booking with correct flags | Integration | — | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.4-INT-004 | 4.4 | Booking create writes `audit_log` row (entity=`booking`, action=`create`, actor_id, diff) | Integration | R-011 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.4-UNIT-001 | 4.4 | `assertOwner` guard registered for booking mutation routes in `routeGuards` — static source assertion | Unit/Static | R-003 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.5-INT-003 | 4.5 | IDOR negative: forged registration token URL → 404 (not 200, not 500) | Integration | R-005 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.5-INT-004 | 4.5 | QR code download endpoint returns correct content-type and QR decodes to registration URL | Integration | R-009 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.5-UNIT-001 | 4.5 | Token generated via CSPRNG (not `Math.random()`) — static source assertion | Unit/Static | R-005 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.7-INT-002 | 4.7 | Edit booking re-checks conflict: edit booking A to a slot already taken by booking B → HTTP 422 conflict | Integration | R-001 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.7-INT-003 | 4.7 | Edit booking writes `audit_log` row (action=`update`, diff shows changed fields) | Integration | R-011 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.7-INT-004 | 4.7 | Duplicate booking pre-fills all fields (event name, catering, registration toggle, closing date) in a new booking form; original booking unchanged | Integration | R-010 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.7-INT-006 | 4.7 | IDOR: non-owner POST duplicate → 403 | Integration | R-003 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |

**Total P1:** 16 scenarios — all planned

---

### P2 (Medium)

**Criteria:** Secondary/edge-case coverage + Low risk (score 1–3)

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | File | Status |
| ----------- | ----- | -------------------- | ---------- | --------- | ---- | ------ |
| 4.1-INT-006 | 4.1 | Two bookings for same room on different days do not conflict (correct range isolation) | Integration | — | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.4-INT-006 | 4.4 | Booking create with rolled-back transaction writes no `audit_log` row | Integration | R-011 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.6-INT-003 | 4.6 | Booking-confirmation email idempotency: two distinct bookings produce two distinct pg-boss idempotency keys; both emails appear in Mailpit | Integration | R-012 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.7-INT-007 | 4.7 | Cancel booking writes `audit_log` row (action=`cancel`) | Integration | R-011 | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.8-INT-002 | 4.8 | Dashboard registration link copy: link is present per entry, points to the correct registration URL pattern | Integration | — | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.3-A11Y-001 | 4.3 | Room calendar passes axe-core (zero WCAG 2.1 AA violations); slot states distinguishable without color alone | E2E | — | `tests/e2e/bookings.spec.ts` | ⬜ PLANNED |
| 4.4-A11Y-001 | 4.4 | Booking form passes axe-core; all labels explicit (not placeholder-only); focus ring visible on all interactive elements | E2E | — | `tests/e2e/bookings.spec.ts` | ⬜ PLANNED |
| 4.4-E2E-001 | 4.4 | Booking form renders correctly at 375px viewport (no horizontal scroll); submit disabled+loading spinner during submit | E2E | — | `tests/e2e/bookings.spec.ts` | ⬜ PLANNED |
| 4.8-E2E-001 | 4.8 | Dashboard renders at 375px (organizer-smartphone tier); all entries visible; one-click copy visible | E2E | — | `tests/e2e/bookings.spec.ts` | ⬜ PLANNED |

**Total P2:** 9 scenarios — all planned

---

### P3 (Low) — Run on-demand only

**Criteria:** Nice-to-have, exploratory, edge conditions

| Scenario ID | Story | Description | Test Level | File | Status |
| ----------- | ----- | ----------- | ---------- | ---- | ------ |
| 4.4-P3-001 | 4.4 | Event name at maximum length (255 chars) accepted; name exceeding maximum rejected with field-level error | Integration | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.6-P3-001 | 4.6 | Booking-confirmation email Thai subject is RFC 2047 correctly encoded (no mojibake in email headers) | Integration | `tests/integration/bookings.test.ts` | ⬜ PLANNED |
| 4.2-P3-001 | 4.2 | k6 smoke: week-calendar endpoint with 30 active rooms × 200 bookings; assert p95 < 3s | Load | `k6/calendar-load.js` (new) | ⬜ PLANNED |
| 4.7-P3-001 | 4.7 | Concurrent cancel attempts on same booking — only one cancel wins; second attempt returns 404 or 409 (idempotent cancel) | Integration | `tests/integration/bookings.test.ts` | ⬜ PLANNED |

**Total P3:** 4 scenarios — all planned

---

## Execution Strategy

**Philosophy:** Run all functional tests on every PR if total wall-clock time stays under 15 minutes. Epic 4 integration tests are server-side (no additional Docker Compose cold-start beyond the Testcontainers Postgres already established in E1/E2/E3). The concurrent double-booking test (`4.1-CONC-001`) must be in the PR gate — it is the only mechanical proof of NFR-002 and cannot be deferred to nightly.

### Proposed Test Files

| File | Coverage | Notes |
| ---- | -------- | ----- |
| `tests/integration/bookings.test.ts` | Stories 4.1–4.8 — all P0/P1/P2 integration + concurrent scenarios | NEW file; follows `rooms.test.ts` pattern; Testcontainers Postgres |
| `tests/e2e/bookings.spec.ts` | Stories 4.3, 4.4, 4.8 E2E + P2 a11y + responsive | NEW file; requires Playwright webServer activation (same as E2/E3 deferred E2E) |
| `tests/integration/db-schema.test.ts` | `4.1-UNIT-001` (EXCLUDE predicate), `4.2-UNIT-001` (GiST index) | **EXISTING file** — append two tests |
| `k6/calendar-load.js` | `4.2-P3-001` k6 load smoke (on-demand only) | NEW file; on-demand only; not in PR gate |

### PR Gate (every PR — target < 15 min)

- Lint + typecheck + svelte-check (`bun run check`)
- Vitest unit suite (static/unit assertions: `4.1-UNIT-001`, `4.2-UNIT-001`, `4.4-UNIT-001`, `4.5-UNIT-001`)
- Vitest integration suite (P0 + P1 integration tests — uses Testcontainers Postgres)
  - New: `bookings.test.ts` — all P0 + P1 integration scenarios including `4.1-CONC-001`
  - Existing: `db-schema.test.ts` — append EXCLUDE predicate + GiST index assertions
- Playwright E2E (`bookings.spec.ts`) — P1 calendar UI + P2 a11y; activate alongside Playwright dev-server config from E2/E3 backlog
- `bun run build`

### Nightly

- P2 edge-case scenarios (9 scenarios)
- Full Docker Compose cold-start smoke (confirms booking flow through nginx; SMTP + pg-boss worker)
- Dependency / vulnerability scan

### On-Demand

- P3 scenarios (max-length names, RFC 2047 encoding, k6 load, concurrent cancel)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Estimated Effort | Notes |
| -------- | ----- | ---------------- | ----- |
| P0 | 16 | ~32–48h | New `bookings.test.ts` file; concurrent test setup; IDOR proofs using existing template; Mailpit assertions |
| P1 | 16 | ~18–28h | Static assertions quick; E2E activation depends on Playwright webServer config |
| P2 | 9 | ~6–10h | Mostly append to existing patterns; E2E a11y fast once Playwright active |
| P3 | 4 | ~2–4h | On-demand; no gate effect |
| **Total** | **45** | **~58–90h** | **~8–11 engineering days** |

### Prerequisites for Story-Specific Tests

**Story 4.1 (~14–20h):**
- Create `tests/integration/bookings.test.ts` with Testcontainers Postgres fixture
- `bookings` Drizzle schema module with `during tstzrange` + EXCLUDE predicate `WHERE status<>'cancelled'`
- Booking service `src/lib/server/services/bookings.ts` — `23P01` catch + typed `ConflictError`
- Append EXCLUDE predicate assertion to `db-schema.test.ts`

**Story 4.2 (~6–10h):**
- Week-calendar read-model (`src/lib/server/queries/calendar.ts` or similar)
- GiST index on `bookings (during)` in Drizzle migration
- Append GiST index assertion to `db-schema.test.ts`

**Story 4.3 (~4–6h):**
- `+page.svelte` calendar component with rooms × days grid
- Playwright webServer activation (blocks all E2E)

**Story 4.4 (~10–16h):**
- Booking form action with `requireUser` + audit log write
- `assertOwner` guard registered in `routeGuards`
- Registration-config columns (`registration_enabled`, `registration_closing_date`, `catering_enabled`) on `bookings` table

**Story 4.5 (~6–8h):**
- CSPRNG token generator (`src/lib/server/services/tokens.ts`)
- `registration_token_hash` on bookings (hashed storage)
- QR endpoint (`+server.ts` returning image)

**Story 4.6 (~6–8h):**
- Booking-confirmation email template (Paraglide Thai)
- pg-boss job type `booking-confirmation-email`; idempotency key per booking
- Mailpit available in test environment (already wired in E1)

**Story 4.7 (~6–8h):**
- Edit/cancel/duplicate SvelteKit actions + `assertOwner` proofs
- Edit re-checks conflict via booking service

**Story 4.8 (~4–6h):**
- Dashboard load function — `WHERE organizer_id = current_user_id AND start_time > now()`
- Registration link per booking (from `registration_token_hash`)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (zero exceptions — any P0 failure blocks merge)
- **P1 pass rate:** ≥95% (each failure requires triage comment with owner)
- **P2/P3 pass rate:** ≥90% (informational; failures do not block merge but are tracked)
- **Security mitigations (R-002, R-003, R-005):** Must be COMPLETE before Epic 4 closes
- **NFR-002 concurrent test (`4.1-CONC-001`):** Non-negotiable; blocking for Epic 4

### Coverage Targets

- **Concurrent double-booking prevention (critical — AR-11 + NFR-002):** 100% — `4.1-CONC-001` green
- **Booking route authorization (IDOR enforcement):** 100% — non-owner → 403 for all booking mutations tested
- **`23P01` error mapping:** 100% — zero 500s on conflict input
- **Email async (never synchronous):** 100% — pg-boss enqueue asserted for all email sends
- **Token security (CSPRNG + hash):** 100% — static + dynamic assertions green
- **Audit trail (Epic 4 mutations):** 100% — booking create, edit, cancel all audited

### Non-Negotiable Requirements

- [ ] R-002 (concurrent double-booking) — `4.1-CONC-001` green (AR-11 mandate)
- [ ] R-001 (EXCLUDE predicate with cancelled rows) — `4.1-INT-002` green
- [ ] R-003 (IDOR booking mutations) — `testOwnershipEnforcement` proofs green for edit/cancel/duplicate
- [ ] R-005 (token CSPRNG + hash storage) — `4.5-INT-002` + `4.5-UNIT-001` green
- [ ] R-006 (`23P01` → 422 not 500) — `4.1-INT-003` green
- [ ] R-004 (email async via pg-boss) — `4.6-INT-002` green
- [ ] All P0 tests pass (zero failures)
- [ ] CI pipeline stays green (no regression to E1/E2/E3 tests)

---

## Assumptions and Dependencies

### Assumptions

1. The `bookings` Drizzle schema module will follow the per-domain pattern: `src/lib/server/db/schema/bookings.ts` (consistent with E3 `rooms.ts`).
2. The EXCLUDE constraint predicate will be added as a partial index in a new migration (not modifying the E1 bare constraint migration — a second migration in E4 that `ALTER TABLE bookings ADD CONSTRAINT ...` with the WHERE predicate, replacing the bare constraint).
3. The booking service will expose a single `createBooking()` function that wraps the insert in a transaction, catches `23P01`, and throws a typed `ConflictError` (not raw `pg` error).
4. Registration token generation will use `node:crypto` `randomBytes(32)` (256-bit entropy) hashed with SHA-256 before storage — consistent with the architecture's "opaque, high-entropy CSPRNG" requirement.
5. pg-boss job names for E4 email sends will follow the pattern `booking:confirmation-email` (consistent with E1 pg-boss job naming patterns).
6. `assertOwner` will be called in the booking form action (not just in a hook) with the booking's `organizer_id` — consistent with E2 patterns from `profile.test.ts`.
7. No Thai text will be hardcoded in booking form components — all strings flow through Paraglide (Rawinan handles Thai translations).
8. The Mailpit integration test environment (Testcontainers Mailpit or a CI service) is already wired from E1 Story 1.5 — E4 email tests reuse it.

### Dependencies

1. **Epic 1 (done)** ✅ — scaffold, EXCLUDE DDL, pg-boss + nodemailer + Mailpit platform, test harness, CI, audit hook.
2. **Epic 2 (done)** ✅ — `requireUser`/`assertOwner` guards, `routeGuards` registry, dev-bypass seam, `idor-template.ts`.
3. **Epic 3 (done)** ✅ — `rooms` table, `is_active` filter, `room_blocks` table, `requireAdmin` patterns.
4. **`bookings` Drizzle schema (Story 4.1)** — `during tstzrange`, `status`, `organizer_id`, `registration_token_hash`, `catering_enabled`, `registration_enabled`, `registration_closing_date`.
5. **EXCLUDE predicate migration (Story 4.1)** — `WHERE (status != 'cancelled')` applied before Story 4.4 tests.
6. **`src/lib/server/services/bookings.ts` (Story 4.1)** — `23P01` → `ConflictError` mapping before Stories 4.4/4.7.
7. **pg-boss job type `booking:confirmation-email` (Story 4.6)** — must use idempotency key = `booking-confirm-${bookingId}`.
8. **Playwright webServer config activation** — required for Story 4.3 E2E calendar tests (single activation effort covers all E2/E3/E4 deferred E2E).

### Risks to Plan

- **Risk:** The concurrent test (`4.1-CONC-001`) using Testcontainers requires a multi-connection pool that simulates truly concurrent transactions. Single-connection pools serialize inserts.
  - **Impact:** `4.1-CONC-001` may not actually test concurrency if Testcontainers connection pool is `maxConnections=1`.
  - **Contingency:** Explicitly configure the Testcontainers Postgres pool with `max: 10` connections in `pg-factory.ts`; use `Promise.all()` with `N=5` raw `pg` INSERT transactions.

- **Risk:** Mailpit assertions in `4.6-INT-001` require either a Testcontainers Mailpit setup or a pre-running Mailpit service. The E1 platform wired Mailpit for the walking skeleton but may have been configured only for Docker Compose, not Testcontainers.
  - **Impact:** `4.6-INT-001` may be `test.skip()` until Mailpit is accessible from the Vitest integration tier.
  - **Contingency:** Fallback: assert pg-boss job table contains a pending `booking:confirmation-email` job (synchronous proof without Mailpit); mark Mailpit-dependent test `test.skip()` until CI Mailpit service is added.

- **Risk:** Playwright webServer E2E activation is a deferred backlog item from E2/E3. If this remains unresolved, Story 4.3 calendar E2E (P1) and Story 4.4/4.8 a11y tests (P2) cannot activate.
  - **Impact:** `4.3-E2E-001`, `4.3-A11Y-001`, `4.4-A11Y-001`, `4.4-E2E-001`, `4.8-E2E-001` remain `test.skip()`.
  - **Contingency:** Scope as `test.skip()` stubs immediately; one `playwright.config.ts` `webServer` change unblocks all E2/E3/E4 E2E tests.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **E1 EXCLUDE constraint (bare DDL)** | E4 Story 4.1 migration adds the `WHERE status<>'cancelled'` predicate — this replaces (or amends) the bare E1 constraint. Any migration error breaks E1 constraint-exists tests | `1.3-INT-001/002/003` in `db-schema.test.ts` must remain green after E4 migration; `4.1-UNIT-001` asserts the predicate is present |
| **E2 `routeGuards` registry** | E4 booking routes push `requireUser` + `assertOwner` entries; hook format changes break both E2 and E4 guards | `2.5-INT-001/002/003` in `auth-guard.test.ts` must remain green; regression triggered by `hooks.server.ts` changes |
| **E2 `idor-template.ts`** | E4 IDOR proofs (Stories 4.4, 4.7) depend on `testOwnershipEnforcement()` API staying stable | `2.7-INT-001` must remain green; `idor-template.ts` signature must not change |
| **E1 audit-log write hook** | Booking mutations call `writeAuditLog()` — any change to `audit.ts` breaks `4.4-INT-004`, `4.7-INT-003`, `4.7-INT-007` | `writeAuditLog` signature frozen; E1 audit tests must remain green |
| **E1 pg-boss + nodemailer platform** | E4 enqueues `booking:confirmation-email` jobs — any change to the pg-boss worker/queue setup breaks `4.6-INT-001/002` | E1 jobs/email platform tests (`1.5-*`) must remain green |
| **E3 rooms table** | E4 `bookings.room_id` FK references E3 `rooms.id`; any rooms schema change in E3 must not break the FK | E3 rooms integration tests must remain green on every E4 PR |
| **E5 registration page** | E4 generates and persists the registration token; E5 reads it via `/r/[token]`. Token format must be stable. | `4.5-INT-001/002` gate the token contract E5 depends on |
| **E1 CI pipeline** | CI gates (lint, typecheck, Vitest, Playwright, build) must continue passing with E4 code added | Full CI run required on every E4 PR; no regression to E1/E2/E3 tests |

---

## Follow-on Workflows

- **For each Story 4.1–4.8:** Run `/bmad-testarch-atdd` to generate the per-story ATDD checklist, seeding the specific test stubs planned in this test design.
- **Story 4.1 (concurrent test):** The `4.1-CONC-001` concurrent test is the AR-11 mandatory "concurrent double-booking test" — it must be listed as a non-negotiable in the Story 4.1 ATDD checklist.
- **Story 4.5 (token):** Run `/bmad-testarch-test-review` after implementation to verify the CSPRNG source, hash algorithm, and IDOR negative proof against the security model.
- **Story 4.6 (email):** After implementation, verify the pg-boss idempotency key format is consistent with the E1 pattern and add a dead-letter queue drain test if not already present from E1.
- **After Epic 4 closes:** Run E5 test design (`/bmad-testarch-test-design Epic 5 — External Registration & Headcount`) — E5 depends on the token contract and booking model established in E4.
- **E2E activation:** Add `webServer` config to `playwright.config.ts` with `AUTH_DEV_BYPASS=true`; single activation unblocks E2/E3/E4/E5+ E2E test suites.
- **IDOR template reuse:** `testOwnershipEnforcement()` must be referenced in ATDD checklists for Stories 4.4 and 4.7 (all booking mutations with `assertOwner`).

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

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-conference-envocc-2026-06-07/prd.md`
- **Epics:** `_bmad-output/planning-artifacts/epics.md` (Epic 4, lines 587–712)
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md`
- **Sprint Status:** `_bmad-output/implementation-artifacts/sprint-status.yaml`
- **Epic 1 Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-1.md`
- **Epic 2 Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-2.md`
- **Epic 3 Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-3.md`
- **IDOR Template:** `tests/support/helpers/idor-template.ts` (Story 2.7, done)
- **Dev Bypass Helper:** `tests/support/helpers/dev-bypass.ts` (Story 2.2, done)
- **Auth Guard Tests (E2):** `tests/integration/auth-guard.test.ts` (8 tests, all green)
- **DB Schema Tests:** `tests/integration/db-schema.test.ts` (append `4.1-UNIT-001` + `4.2-UNIT-001`)
- **Rooms Tests (E3):** `tests/integration/rooms.test.ts` (all P0/P1 scenarios planned)

### Risk Score Legend

| Score | Action | Gate Effect |
| ----- | ------ | ----------- |
| 9 | BLOCK | Automatic FAIL — must resolve before shipping |
| 6–8 | MITIGATE | CONCERNS — must have mitigation plan before merge |
| 4–5 | MONITOR | Watch; plan mitigations proactively |
| 1–3 | DOCUMENT | Awareness only |

### Test File Inventory (Epic 4 — Planned)

| File | Tests | Status |
| ---- | ----- | ------ |
| `tests/integration/bookings.test.ts` | ~41 (P0: 16, P1: 14 integration, P2: 7 integration, P3: 4) | NEW — to be created in Story 4.1 |
| `tests/e2e/bookings.spec.ts` | ~5 (P1: 1 calendar E2E, P2: 4 a11y + responsive) | NEW — requires Playwright webServer activation |
| `tests/integration/db-schema.test.ts` | +2 (`4.1-UNIT-001` EXCLUDE predicate + `4.2-UNIT-001` GiST index) | EXISTING — append two tests |
| `k6/calendar-load.js` | 1 (`4.2-P3-001` load smoke) | NEW — on-demand only |

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
**Epic:** 4 — Room Booking & Organizer Workspace
**Mode:** Epic-Level
**Revision:** v1 (2026-06-13) — Initial generation; all 8 stories backlog.
  7 high-priority risks identified (R-002 concurrent double-booking score=9; R-001/003/004/005/006/007 score=6).
  16 P0 + 16 P1 + 9 P2 + 4 P3 scenarios planned.
  Reuses `idor-template.ts` (Story 2.7), `testcontainers-context.ts` (E1), `db-schema.test.ts` (E1/E3) without modification.
  Planned test files: `bookings.test.ts` (new), `bookings.spec.ts` (new), `db-schema.test.ts` (append 2), `k6/calendar-load.js` (new, on-demand).
