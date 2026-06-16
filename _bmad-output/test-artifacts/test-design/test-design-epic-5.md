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
lastSaved: '2026-06-16'
version: v3
changeLog:
  - 'v1 (2026-06-15): initial epic-level test design — all 5.1–5.8 stories backlog'
  - 'v2 (2026-06-15): status update — 5.1 done (PR #128), 5.2 atdd-done; implementation status table added; foundation from 5.1 documented'
  - 'v3 (2026-06-16): status update — 5.2 done (PR #129 merged); R-005 MITIGATED; implementation details documented; P1 stubs status updated'
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/implementation-artifacts/5-2-submit-a-registration.md
  - _bmad-output/implementation-artifacts/adr-4-5-registration-token-storage.md
  - _bmad/tea/config.yaml
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/risk-governance.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/probability-impact.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-levels-framework.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-priorities-matrix.md
  - tests/support/helpers/idor-template.ts
  - tests/support/helpers/dev-bypass.ts
  - tests/support/fixtures/pg-factory.ts
  - tests/integration/booking-token.test.ts
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
  - _bmad-output/test-artifacts/atdd-checklist-5-1-branded-public-registration-page.md
  - _bmad-output/test-artifacts/atdd-checklist-5-2-submit-a-registration.md
---

# Test Design: Epic 5 — External Registration & Headcount

**Date:** 2026-06-15
**Author:** Rawinan
**Status:** Living Document (v3 — updated 2026-06-16)
**Mode:** Epic-Level Test Design

---

## Executive Summary

**Scope:** Epic-level test design for Epic 5 — External Registration & Headcount

Epic 5 is the shippable end-to-end headline: external attendees self-register via a branded token link, pick meals, cancel without a login, and recover lost links — and the organizer can finally see who is coming via a live registrant list and a live dashboard headcount. This is the first epic that exposes a public unauthenticated surface (`/r/[token]`), the first to implement hashed single-use cancel tokens (per AR-05, confirmed by ADR 4.5 scope note), the first to run a pg-boss auto-close job, and the first to make the organizer dashboard headcount column live (the placeholder was delivered in Story 4.8).

**Why this epic is high-stakes for testing:**

Epic 5 carries five distinct failure vectors that each block the shippable headline:

1. **Token IDOR** — a forged or replayed registration token must never expose another event's data. The public route is unauthenticated, so the only isolation mechanism is token entropy + server-side lookup; there is no session guard to fall back on.
2. **Single-use cancel token** — the self-cancel token is hashed per AR-05. A hash collision, a double-use, or a predictability flaw makes cancellation unreliable or exploitable.
3. **Resend neutral disclosure** — the resend flow (FR-047) must return the same response regardless of whether the email matches a live registration, or it leaks registrant existence to unauthenticated callers.
4. **Auto-close job idempotency** — the pg-boss registration-close sweeper must not double-close, must self-heal after worker restarts, and must tolerate already-closed bookings without error.
5. **Mobile responsiveness** — NFR-004 mandates full-responsive external registration (mobile + desktop, equal). This is the only NFR with an explicit "equal" parity requirement rather than "usable."

**Implementation Status (2026-06-16 — v3):**

| Story | Status | Notes |
|-------|--------|-------|
| 5.1 Branded Public Registration Page | **done** | PR #128 merged 2026-06-15; `getBookingByRegistrationToken` implemented; `/r/[token]` route live; R-001 IDOR test (`5.1-INT-IDOR-001`) green in CI gate |
| 5.2 Submit a Registration | **done** | PR #129 merged 2026-06-16; `registrations` schema + migration (`0010_registrations.sql`); `createRegistration` service + `RegistrationClosedError`; superform action; 22 i18n keys; `5.2-INT-001` + `5.2-INT-CLOSED-001` green (R-005 MITIGATED) |
| 5.3–5.8 | backlog | Not yet started |

Epic 4 is done (PR #126 merged). The complete E4 platform is available: `registration_token` column and token generation (`createBooking`), `getBookingById`, the `r/[token]` route stub (token generation confirmed; page content is E5's job), pg-boss + nodemailer wired, IDOR template, dev bypass seam, Testcontainers fixture, CI pipeline.

**Foundation deployed by 5.1 (now live in `main`):**
- `getBookingByRegistrationToken(token)` — query returns full registration page row or null
- `/r/[token]` route — public, unauthenticated; closed-state and 404-on-bad-token implemented
- `tests/integration/registrations.test.ts` — file created; 5.1-INT-001, 5.1-INT-IDOR-001, 5.1-INT-002 are green (P0 active)
- `tests/e2e/registrations.spec.ts` — file created; 5.1 E2E scaffolds are `test.skip` pending seed wiring

**Foundation deployed by 5.2 (now live in `main`):**
- `src/lib/server/db/schema/registrations.ts` — Drizzle schema for `registrations` table; `RegistrationClosedError` exported from `registration-service.ts`
- `drizzle/0010_registrations.sql` — migration with FK cascade (`REFERENCES bookings(id) ON DELETE CASCADE`), `cancel_token_hash` column (sha256 hex), `status` column, both indexes
- `src/lib/server/db/queries/registrations.ts` — `createRegistrant(tx, data)` insert query
- `src/lib/server/services/registration-service.ts` — `createRegistration(bookingId, input)` wraps in `db.transaction()`: re-queries booking, checks `registrationEnabled`, generates 32-byte CSPRNG cancel token (plaintext returned for email; sha256 hash stored), calls `createRegistrant`, calls `writeAuditLog` (actorId=null), returns `{ registrationId, cancelToken }`
- `src/lib/schemas/registration.ts` — Valibot `RegistrationSchema` with conditional `mealType` (required only when `cateringEnabled=true`) and conditional `titleOtherText` (required only when `title='Other'`)
- `src/routes/r/[token]/+page.server.ts` — `register` form action (superform + `RegistrationSchema`); catches `RegistrationClosedError` → `fail(400)`; also initializes superform in `load` and returns `cateringEnabled`
- `src/routes/r/[token]/+page.svelte` — full registration form (salutation, first/last name, org, email, conditional meal type); success confirmation on `data.success===true`
- `messages/en.json` + `messages/th.json` — 22 new `reg_form_*` i18n keys added; Thai values set to `""` per project rule
- `tests/support/fixtures/pg-factory.ts` — `'registrations'` added to `TRUNCATABLE_TABLES` (before `'bookings'`)
- `tests/integration/db-schema.test.ts` — schema assertion for `registrations` table columns added
- `tests/integration/registrations.test.ts` — `seedRegistrant` helper added; `5.2-INT-001` (P0 ACTIVE) and `5.2-INT-CLOSED-001` (P0 ACTIVE) green; `5.2-INT-002/003/004/005` (P1 `test.skip`)
- `tests/e2e/registrations.spec.ts` — `5.2-E2E-001/MOBILE-001/MOBILE-002` (P1 `test.skip`), `5.2-E2E-003/004` (P2 `test.skip`), `5.2-E2E-005` (P3 `test.skip`) appended

**Foundation Available from E1–E4:**

- `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement()` for owner-scoped proofs
- `tests/support/helpers/dev-bypass.ts` — authenticated organizer sessions in integration tests
- `tests/support/fixtures/pg-factory.ts` — real-Postgres via Testcontainers; `registrations` now included in truncation order
- `tests/integration/booking-token.test.ts` — token generation assertions (IT-001–005); establishes the `registration_token` column shape this epic's tests consume
- `hooks.server.ts` `routeGuards` registry — `/r/[token]` already explicitly allow-listed as public
- `src/lib/server/services/audit.ts` — `writeAuditLog()` for registration mutations

**Risk Summary (v3 — 2026-06-16):**

- Total risks identified: 13
- High-priority risks (score ≥ 6): 7
- Score = 9 (BLOCK): 1 (R-001 — IDOR on public token route) → **CLOSED** by 5.1 (PR #128)
- Score = 6 (MITIGATE): 6 → R-001 CLOSED, R-005 **MITIGATED** by 5.2 (PR #129), 4 open (R-002, R-003, R-004, R-006, R-007 — 5 remaining but R-005 now closed means 4 open mitigate risks excluding closed R-001)

---

## Not in Scope

| Item | Rationale |
|------|-----------|
| Internal registration (FR-100–105) | E6 — internal register-to-attend is a separate epic |
| Sign-in sheet PDF | E6 — pdfmake PDF delivery |
| One-day reminder sweeper | E6 — reminder is a separate pg-boss sweep |
| Cancel-notify attendees (FR-016) | E6 — organizer booking cancellation notifies attendees |
| Room deactivation cascade | E7 |
| Admin analytics / CSV | E7 |
| SMTP configuration UI | E7 |

---

## Step 3: Risk & Testability Assessment

### Risk Register

> **Score = Probability × Impact** (1–3 each). Score ≥ 6 requires mitigation before ship. Score = 9 blocks gate automatically.

| Risk ID | Category | Title | P | I | Score | Status |
|---------|----------|-------|---|---|-------|--------|
| R-001 | SEC | Forged / replayed registration token reveals another event's data | 3 | 3 | **9** | **CLOSED** (5.1 done; `5.1-INT-IDOR-001` green) |
| R-002 | SEC | Single-use cancel token is hashed but collision or replay enables double-cancel or impersonation | 2 | 3 | **6** | OPEN |
| R-003 | SEC | Resend-link endpoint discloses whether an email is registered (enumeration) | 3 | 2 | **6** | OPEN |
| R-004 | BUS | Auto-close pg-boss job double-fires after worker restart, closing already-open registrations | 2 | 3 | **6** | OPEN |
| R-005 | BUS | Closed-state page still accepts form submissions via direct POST (bypass of closed-state UI) | 3 | 2 | **6** | **MITIGATED** (5.2 done; `5.2-INT-CLOSED-001` green; service-layer guard in `createRegistration`) |
| R-006 | DATA | Catering aggregation counts diverge from actual registration records on concurrent submit + cancel | 2 | 3 | **6** | OPEN |
| R-007 | BUS | Registrant list ownership: organizer A can query registrants for organizer B's event | 2 | 3 | **6** | OPEN |
| R-008 | PERF | NFR-004 mobile responsiveness — registration form unusable on small viewports (< 375px) | 2 | 2 | **4** | OPEN — `5.2-E2E-MOBILE-001/002` scaffolded (`test.skip`; activate in Story 5.2 E2E activation) |
| R-009 | BUS | Confirmation email not sent (job dropped, DLQ silent) — registrant has no cancel link | 2 | 2 | **4** | OPEN |
| R-010 | DATA | Meal type "Other→text" field value stored/displayed as generic "Other" with no text | 2 | 2 | **4** | OPEN — `5.2-INT-002/004` scaffolded (`test.skip`; activate during E2E pass) |
| R-011 | TECH | Auto-close job handler imports `$app/*` or `$env/dynamic` violating lint boundary (AR-06) | 1 | 3 | **3** | OPEN |
| R-012 | BUS | No-capacity rule (FR-032) is accidentally broken by a guard that caps registrations | 1 | 3 | **3** | OPEN — `5.2-INT-005` scaffolded (`test.skip`; activate during E2E pass) |
| R-013 | OPS | Cancel token single-use state lost on DB failover / migration rollback | 1 | 2 | **2** | OPEN |

**Total: 13 risks (1 BLOCK score=9 → CLOSED by 5.1, 6 MITIGATE score=6 → 4 OPEN / 2 CLOSED [R-001 + R-005], 3 MONITOR score=4, 3 DOCUMENT score ≤3)**

---

### Mitigation Plans (score ≥ 6)

**R-001 — Token IDOR on public route (BLOCK, score=9)**
- **Strategy:** (1) `/r/[token]` server load function does a DB lookup by `registration_token`; non-match returns `404` with no event data. (2) Integration test seeds two bookings with two tokens and asserts cross-token lookup is denied. (3) Story 5.1 ATDD checklist includes `5.1-INT-IDOR-001` as mandatory P0.
- **Owner:** Story 5.1 implementer
- **Timeline:** Story 5.1
- **Verification:** `5.1-INT-IDOR-001` passes in PR gate; no event fields returned for mismatched token

**R-002 — Cancel token hash collision / replay (score=6)**
- **Strategy:** (1) Self-cancel token: 256-bit CSPRNG stored as `bcrypt` or `sha256` hash in `registrations.cancel_token_hash`; token cleared after use (nulled or marked used). (2) Integration test: use token once → success; use same token again → `410 Gone` or redirect to already-cancelled page. (3) Collision probability documented (astronomically low with 32-byte entropy).
- **Owner:** Story 5.4 implementer
- **Timeline:** Story 5.4
- **Verification:** `5.4-INT-001` (single-use assertion) passes

**R-003 — Resend endpoint enumeration (score=6)**
- **Strategy:** (1) Resend action always returns the same neutral message (e.g., "If a registration exists for this email, a link has been resent") regardless of match. (2) Integration test sends for an unregistered email and a registered email and asserts response body/status is identical. (3) Response time must not leak match/no-match (avoid DB short-circuit).
- **Owner:** Story 5.5 implementer
- **Timeline:** Story 5.5
- **Verification:** `5.5-INT-001` (neutral disclosure assertion) passes

**R-004 — Auto-close job double-fires (score=6)**
- **Strategy:** (1) pg-boss job is idempotent: check `registration_enabled = true` before closing; no-op if already false. (2) Job uses a singleton key (booking ID) to prevent parallel workers from enqueuing duplicates. (3) Integration test: close a booking, re-trigger the job, assert registration_enabled remains false and no error is thrown. (4) Test worker restart mid-job (via Testcontainers stop/start).
- **Owner:** Story 5.6 implementer
- **Timeline:** Story 5.6
- **Verification:** `5.6-INT-002` (idempotency) and `5.6-INT-003` (restart recovery) pass

**R-005 — Closed-state POST bypass (score=6) — MITIGATED ✅**
- **Strategy:** (1) Server action checks `registration_enabled` before processing any form submission; returns `400` or redirects to closed-state page if closed. (2) Integration test: close registration, then send a raw POST to the registration action endpoint, assert 400/redirect. (3) UI-layer closed check is defence-in-depth only.
- **Owner:** Story 5.2 implementer ✅ done
- **Timeline:** Story 5.2 ✅ done (PR #129 merged 2026-06-16)
- **Implementation:** `RegistrationClosedError` thrown from `createRegistration(bookingId, input)` service when `registrationEnabled=false`; caught in form action → `fail(400)`. Guard lives in the service layer (not UI), so direct POST bypass is also blocked.
- **Verification:** `5.2-INT-CLOSED-001` green in CI gate; `createRegistration` throws `RegistrationClosedError` + no DB row inserted when `registrationEnabled=false`

**R-006 — Catering aggregation concurrency (score=6)**
- **Strategy:** (1) Aggregation query reads from `registrations` table directly; no cached counter. (2) Integration test: insert 5 registrations concurrently (Promise.all), assert aggregate count = 5. (3) Cancel 2 registrations, assert count = 3. (4) If a cached counter column is used, it must be updated atomically with the registration mutation.
- **Owner:** Story 5.7 implementer
- **Timeline:** Story 5.7
- **Verification:** `5.7-INT-001` (concurrent registration count) and `5.7-INT-002` (cancel decrement) pass

**R-007 — Registrant list IDOR (score=6)**
- **Strategy:** (1) Registrant list route guards with `assertOwner` on the booking. (2) Integration test: organizer A owns event; organizer B (seeded separately) requests `/bookings/[A-id]/registrants`; assert 403/404. (3) Reuse `testOwnershipEnforcement()` from `idor-template.ts`.
- **Owner:** Story 5.8 implementer
- **Timeline:** Story 5.8
- **Verification:** `5.8-INT-IDOR-001` passes using `idor-template.ts`

---

### NFR Planning (in scope for E5)

| NFR | Threshold | Planned Validation | Evidence Artifact |
|-----|-----------|-------------------|-------------------|
| NFR-001 Security | No known critical/high vulns; token entropy ≥ 256-bit | `5.1-INT-IDOR-001`, `5.4-INT-001` (single-use cancel), `5.5-INT-001` (neutral disclosure) | Integration test results in CI |
| NFR-004 Responsiveness | External registration full-responsive (mobile + desktop, equal) | `5.2-E2E-MOBILE-001` Playwright viewport 375px × 667px; `5.2-E2E-MOBILE-002` 1280px × 800px | E2E screenshots + pass/fail in CI |
| NFR-006 Localization | Thai UI, emails, generated content | Thai fixtures in integration tests; Mailpit assertion on Thai subject/body encoding | Mailpit captured email, CI test results |
| NFR-007 Accessibility | WCAG 2.1 AA on public registration page | `5.1-E2E-A11Y-001` axe-core on `/r/[token]` open-state; `5.1-E2E-A11Y-002` axe-core on closed-state | axe-core report in Playwright |

> Full NFR PASS/CONCERNS/FAIL assessment is deferred to `nfr-assess` after implementation evidence exists.

---

## Step 4: Coverage Plan

> **Note:** P0/P1/P2/P3 denote risk-based priority, NOT execution timing. See Execution Strategy for timing.

### P0 — Blocks core functionality; high risk (≥6); no workaround

**Criteria:** Missing P0 test = epic cannot ship. Each P0 directly closes a BLOCK or MITIGATE risk.

| Test ID | Story | Requirement | Test Level | Risk Link | Notes |
|---------|-------|-------------|------------|-----------|-------|
| 5.1-INT-001 | 5.1 | Valid token resolves event data (org logo, event name, date, time, room, agenda, contact) | Integration | R-001 | Real DB; seed booking with token |
| 5.1-INT-IDOR-001 | 5.1 | Forged / mismatched token returns 404 with no event fields | Integration | R-001 (BLOCK) | Seed two bookings; cross-lookup asserted |
| 5.1-INT-002 | 5.1 | Closed registration token shows closed-state response, not form | Integration | R-001, R-005 | `registration_enabled=false` fixture |
| 5.2-INT-001 | 5.2 | Valid form submission (all fields) creates a registrant record | Integration | R-005 | **GREEN** — `createRegistration` service active; asserts all DB columns + audit log row |
| 5.2-INT-CLOSED-001 | 5.2 | Direct POST to registration action when closed returns 400/redirect | Integration | R-005 (MITIGATE) | **GREEN** — `RegistrationClosedError` thrown; no row inserted asserted |
| 5.3-INT-001 | 5.3 | Confirmation email enqueued (not synchronous); Mailpit receives Thai email | Integration | R-009 | pg-boss job asserted; Mailpit API checked |
| 5.3-INT-002 | 5.3 | Confirmation email body contains a unique single-use cancel link | Integration | R-002 | Mailpit body parsed; link URL extracted |
| 5.4-INT-001 | 5.4 | Self-cancel link cancels registration in one step; second use returns error | Integration | R-002 (MITIGATE) | Single-use assertion mandatory |
| 5.4-INT-002 | 5.4 | Forged cancel token cannot cancel another's registration | Integration | R-002 | Two registrants; cross-token attempt |
| 5.5-INT-001 | 5.5 | Resend endpoint returns identical response for registered email and unregistered email | Integration | R-003 (MITIGATE) | Both paths tested; body/status compared |
| 5.6-INT-001 | 5.6 | Auto-close pg-boss job closes registration when closing date reached | Integration | R-004 | Time-travel via DB fixture; assert `registration_enabled=false` |
| 5.6-INT-002 | 5.6 | Auto-close job is idempotent (re-trigger on already-closed booking → no-op, no error) | Integration | R-004 (MITIGATE) | Run job twice; assert stable state |
| 5.7-INT-001 | 5.7 | Catering aggregation counts correct after concurrent registrations | Integration | R-006 (MITIGATE) | Promise.all(5 inserts); assert counts |
| 5.7-INT-002 | 5.7 | Catering counts decrement correctly after cancellation | Integration | R-006 | Cancel 2 of 5; assert count = 3 per type |
| 5.8-INT-IDOR-001 | 5.8 | Registrant list: non-owner organizer gets 403/404 | Integration | R-007 (MITIGATE) | `testOwnershipEnforcement()` reused |
| 5.8-INT-001 | 5.8 | Registrant list shows correct status: Registered / Cancelled | Integration | R-007 | Seed registrations with mixed status |
| 5.8-INT-002 | 5.8 | Dashboard headcount updates live after registration and cancellation | Integration | R-007 | Assert count column in bookings query |

**P0 total: 17 scenarios**

---

### P1 — Critical paths; medium/high risk; important feature correctness

**Criteria:** Covers core happy paths and important negative flows not classified P0.

| Test ID | Story | Requirement | Test Level | Risk Link | Notes |
|---------|-------|-------------|------------|-----------|-------|
| 5.1-E2E-001 | 5.1 | Open registration page renders event fields correctly (E2E happy path) | E2E | — | Playwright; real token from seeded booking |
| 5.1-E2E-002 | 5.1 | Closed registration page shows closed message, no form visible | E2E | R-005 | `registration_enabled=false` seed |
| 5.1-E2E-A11Y-001 | 5.1 | axe-core passes on open registration page (WCAG 2.1 AA) | E2E | NFR-007 | axe-core injected into Playwright |
| 5.1-E2E-A11Y-002 | 5.1 | axe-core passes on closed registration page | E2E | NFR-007 | |
| 5.2-E2E-001 | 5.2 | Full registration form submit (desktop) — success confirmation shown | E2E | — | Playwright desktop viewport |
| 5.2-E2E-MOBILE-001 | 5.2 | Registration form fully usable at 375 × 667px — no horizontal scroll | E2E | NFR-004 | Screenshot assertion; no overflow |
| 5.2-E2E-MOBILE-002 | 5.2 | Registration form fully usable at 1280 × 800px (desktop parity) | E2E | NFR-004 | Parity assertion |
| 5.2-INT-002 | 5.2 | Title "Other→text" free-text field stored and retrieved correctly | Integration | R-010 | Assert `title_other_text` DB column |
| 5.2-INT-003 | 5.2 | Meal type required when catering enabled; absent when disabled | Integration | — | Two fixture bookings (catering on/off) |
| 5.2-INT-004 | 5.2 | Meal type "Other→text" stored and displayed with free-text | Integration | R-010 | |
| 5.2-INT-005 | 5.2 | No maximum capacity enforced — 100th registration succeeds | Integration | R-012 | Seed 99 registrants; insert 100th; assert success |
| 5.3-INT-003 | 5.3 | Thai email subject and body encode correctly (RFC 2047) | Integration | NFR-006 | Mailpit raw headers checked |
| 5.4-E2E-001 | 5.4 | Cancel link visited in browser cancels registration and shows confirmation | E2E | R-002 | Playwright; full cancel flow |
| 5.5-E2E-001 | 5.5 | Resend form shows neutral acknowledgement in browser | E2E | R-003 | Submit with registered email; assert same UI |
| 5.6-INT-003 | 5.6 | Worker restart does not re-close already-closed registration | Integration | R-004 | Testcontainers worker stop/start |
| 5.6-INT-004 | 5.6 | Manual close (organizer) sets `registration_enabled=false` immediately | Integration | — | Direct action call; assert DB |
| 5.7-E2E-001 | 5.7 | Catering summary visible in organizer event view (Normal/Vegetarian/Muslim/Other counts) | E2E | R-006 | Playwright; seed registrants with varied meals |
| 5.8-E2E-001 | 5.8 | Organizer sees registrant list with status badges | E2E | — | Playwright; seed registrations |
| 5.8-E2E-002 | 5.8 | Dashboard card shows live headcount after a new registration | E2E | — | Playwright; register → navigate to dashboard |

**P1 total: 19 scenarios**

---

### P2 — Secondary flows; low/medium risk; edge cases

**Criteria:** Valuable coverage for correctness and UX quality, but not blocking ship.

| Test ID | Story | Requirement | Test Level | Risk Link | Notes |
|---------|-------|-------------|------------|-----------|-------|
| 5.1-INT-003 | 5.1 | Event without agenda hides agenda section | Integration | — | `agenda=null` fixture |
| 5.1-INT-004 | 5.1 | Invalid token (malformed hex) returns 404 | Integration | R-001 | Non-UUID, non-hex strings |
| 5.2-E2E-003 | 5.2 | Form validation — missing required fields shows inline error on correct field | E2E | — | Submit empty; assert field-level error |
| 5.2-E2E-004 | 5.2 | Loading state — submit button disabled and shows loading indicator during submission | E2E | — | Intercept network; assert disabled state |
| 5.3-INT-004 | 5.3 | Confirmation email job has idempotency key — duplicate enqueue does not double-send | Integration | R-009 | Enqueue twice; assert one Mailpit email |
| 5.3-INT-005 | 5.3 | Failed email send lands in pg-boss dead-letter queue with visible status | Integration | R-009 | Mock SMTP failure; assert DLQ entry |
| 5.4-INT-003 | 5.4 | Cancel token nulled / invalidated in DB after use | Integration | R-002 | Assert `cancel_token_hash IS NULL` post-cancel |
| 5.5-INT-002 | 5.5 | Resend enqueues email job (not synchronous) | Integration | R-009 | pg-boss job assertion after resend action |
| 5.6-INT-005 | 5.6 | Auto-close job does not import `$app/*` or `$env/dynamic` (lint boundary) | Unit/Lint | R-011 | ESLint rule check or import AST scan |
| 5.7-INT-003 | 5.7 | Catering aggregate returns zero for all types when no registrations | Integration | — | Empty fixture; assert all counts = 0 |
| 5.8-INT-003 | 5.8 | Admin sees all registrant lists (not just own events) | Integration | — | Seed admin session; assert cross-event access |

**P2 total: 11 scenarios**

---

### P3 — Nice-to-have; exploratory; benchmarks

**Criteria:** Run on-demand or nightly; deferred if resource-constrained.

| Test ID | Story | Requirement | Test Level | Notes |
|---------|-------|-------------|------------|-------|
| 5.2-LOAD-001 | 5.2 | k6 load: 50 concurrent registrations on one event complete without error | Load (k6) | On-demand; validates NFR-004 under load |
| 5.1-E2E-003 | 5.1 | Visual snapshot regression on registration page (open state) | E2E/Visual | On-demand; detects unexpected layout shifts |
| 5.2-E2E-005 | 5.2 | Registration completes in ≤ 2 minutes end-to-end (form fill + submit + confirmation) | E2E/Timing | Playwright timing assertion; on-demand |
| 5.8-PERF-001 | 5.8 | Registrant list query returns < 3s for event with 500 registrants | Integration | On-demand; validates NFR-003 at scale |

**P3 total: 4 scenarios**

---

## Execution Strategy

**Philosophy:** Run everything in every PR if the total runtime is under 15 minutes. Playwright parallelizes across workers; 100+ Playwright tests finish in 10–15 minutes.

| Tier | When | What |
|------|------|------|
| Every PR | On every push / pull request | All P0 + P1 Integration tests (Vitest + Testcontainers) + All P0 + P1 E2E tests (Playwright) — target: < 15 min total |
| Nightly | Nightly CI run | P2 tests + P3 LOAD/timing tests (k6 `5.2-LOAD-001`, `5.8-PERF-001`, `5.2-E2E-005`) |
| On-demand | Developer request | Visual snapshot (`5.1-E2E-003`); large-dataset integration tests |

**Mandatory in every PR gate:** `5.1-INT-IDOR-001` (BLOCK risk), `5.2-INT-CLOSED-001`, `5.4-INT-001` (single-use cancel), `5.5-INT-001` (neutral disclosure), `5.6-INT-002` (idempotency), `5.7-INT-001` (concurrent catering count), `5.8-INT-IDOR-001`.

---

## Resource Estimates

| Priority | Scenarios | Estimated Effort |
|----------|-----------|-----------------|
| P0 | 17 | ~30–45 hours |
| P1 | 19 | ~20–32 hours |
| P2 | 11 | ~8–16 hours |
| P3 | 4 | ~3–6 hours |
| **Total** | **51** | **~61–99 hours (~2–3 weeks)** |

Estimates include test setup, fixture seeding, pg-boss job harness wiring, Mailpit integration, and one round of stabilization. P0 estimate is weighted higher due to IDOR proof complexity (two-user seeding per test) and Mailpit async assertion patterns.

---

## Quality Gate Criteria

| Gate | Threshold |
|------|-----------|
| P0 pass rate | 100% — no exceptions; epic cannot ship with any P0 failure |
| P1 pass rate | ≥ 95% — at most 1 P1 failure with documented waiver |
| High-risk mitigations | All 6 MITIGATE risks (R-002 to R-007) must have passing tests before ship |
| BLOCK risk (R-001) | `5.1-INT-IDOR-001` must pass; score=9 gates are automatic FAIL |
| Coverage target | ≥ 80% of story acceptance criteria covered by P0+P1 tests |
| NFR-004 (Mobile) | `5.2-E2E-MOBILE-001` and `5.2-E2E-MOBILE-002` both pass |
| NFR-007 (A11y) | `5.1-E2E-A11Y-001` and `5.1-E2E-A11Y-002` both pass |
| NFR-006 (Thai) | `5.3-INT-003` Thai encoding assertion passes |
| Open bugs at ship | Zero P0/P1-severity bugs open; P2/P3 logged, not blocking |

---

## Planned Test Files

| File | Status | Owner | Stories |
|------|--------|-------|---------|
| `tests/integration/registrations.test.ts` | **New** | E5 | 5.1–5.8 (all integration P0+P1+P2 scenarios) |
| `tests/e2e/registrations.spec.ts` | **New** | E5 | 5.1–5.8 E2E scenarios |
| `tests/integration/db-schema.test.ts` | **Append** | E5 | `registrations` table schema assertion; `cancel_token_hash` column; unique constraint |
| `k6/registration-load.js` | **New** | E5 | `5.2-LOAD-001` (on-demand) |

**Reused helpers (no modification needed):**
- `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement()` for `5.1-INT-IDOR-001` and `5.8-INT-IDOR-001`
- `tests/support/helpers/dev-bypass.ts` — authenticated organizer sessions
- `tests/support/fixtures/pg-factory.ts` — Testcontainers Postgres; append booking + registration factories

---

## Appendix A: Fixture Design Notes

**Registration factory (append to `pg-factory.ts`):**

```typescript
// Seed a booking with a known registration token (from E4 createBooking)
// Seed a registration record linked to that booking
// Seed cancel token: 32-byte random → stored as sha256 hex hash in cancel_token_hash
// For IDOR proofs: seed ownerUser + nonOwnerUser separately via pg-factory pool
//   (do NOT use getDevBypassCookie() for two-user IDOR tests — it always seeds the same fixed user)
```

**Mailpit assertion pattern (pg-boss + nodemailer):**

```typescript
// After registration action, poll Mailpit API /api/v1/messages until message arrives
// Assert: subject contains event name (Thai), body contains cancel link URL
// Assert: RFC 2047 encoded-word in To/Subject headers for Thai characters
// Use idempotency key from pg-boss job record to assert single delivery
```

**Auto-close time-travel pattern:**
```typescript
// Instead of sleeping: update bookings SET registration_closes_at = NOW() - interval '1 second'
// Then trigger the job handler directly (or via pg-boss test harness)
// Assert: registration_enabled = false
// Re-trigger: assert no error thrown, registration_enabled still false (idempotent)
```

---

## Appendix B: ADR Reference

**ADR 4.5 (registration token storage)** — Event registration token is stored **plaintext** (deviation from AR-05 hash requirement; accepted because the token is public by design, printed on QR, and must be redisplayable). The **self-cancel token** (this epic) remains **hashed** per AR-05. E5 tests must assert:
- `registration_token` column: plaintext 64-char hex (confirmed by E4 `booking-token.test.ts` IT-001)
- `cancel_token_hash` column: hash value (never the raw token)

---

## Appendix C: Risk Summary Table

| Risk ID | Score | Status | Closing Test |
|---------|-------|--------|-------------|
| R-001 | 9 (BLOCK) | **CLOSED** — 5.1 done (PR #128); `5.1-INT-IDOR-001` green in CI | `5.1-INT-IDOR-001` |
| R-002 | 6 | OPEN | `5.4-INT-001` |
| R-003 | 6 | OPEN | `5.5-INT-001` |
| R-004 | 6 | OPEN | `5.6-INT-002` |
| R-005 | 6 | **MITIGATED** ✅ — 5.2 done (PR #129); `5.2-INT-CLOSED-001` green in CI; service-layer `RegistrationClosedError` guard active | `5.2-INT-CLOSED-001` |
| R-006 | 6 | OPEN | `5.7-INT-001` |
| R-007 | 6 | OPEN | `5.8-INT-IDOR-001` |
| R-008 | 4 | OPEN — `5.2-E2E-MOBILE-001/002` scaffolded (`test.skip`; activate during E2E pass) | `5.2-E2E-MOBILE-001/002` |
| R-009 | 4 | OPEN | `5.3-INT-001`, `5.3-INT-004/005` |
| R-010 | 4 | OPEN — `5.2-INT-002/004` scaffolded (`test.skip`; activate during E2E pass) | `5.2-INT-002`, `5.2-INT-004` |
| R-011 | 3 | OPEN | `5.6-INT-005` (lint) |
| R-012 | 3 | OPEN — `5.2-INT-005` scaffolded (`test.skip`; activate during E2E pass) | `5.2-INT-005` |
| R-013 | 2 | OPEN | Accepted; documented only |
