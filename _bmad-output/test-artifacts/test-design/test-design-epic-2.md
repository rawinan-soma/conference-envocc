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
lastSaved: '2026-06-11'
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad/tea/config.yaml
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/risk-governance.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/probability-impact.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-levels-framework.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-priorities-matrix.md
---

# Test Design: Epic 2 — Identity & Access

**Date:** 2026-06-11
**Author:** Rawinan
**Status:** Draft (v1)
**Mode:** Epic-Level Test Design

---

## Executive Summary

**Scope:** Epic-level test design for Epic 2 — Identity & Access

Epic 2 delivers the authentication backbone and authorization envelope that every downstream epic inherits. Its deliverables are: Authentik OIDC sign-in via Better Auth, a dev-bypass for local development, a self-service user profile, a two-tier role model (organizer default / admin assignable), a server-side guard dispatcher pattern, a fixed 30-minute session timeout, and the IDOR/authorization negative-test template wired to the E1 audit-log hook.

**Why this epic is high-stakes for testing:**
Every user interaction in Epics 3–7 passes through the auth guards established here. An incorrectly scoped `assertOwner`, a broken session cookie, or a leaking dev bypass in production would compromise the entire application. Epic 2 is also the first point where NFR-001 (Security: no critical/high vulns) becomes testable in a meaningful end-to-end context. Getting the guard dispatcher pattern right here means all later epics append rules rather than rewrite them — a test regression in Epic 2 late in the project is far more expensive than catching it now.

**Implementation Status (2026-06-11):** All Epic 2 stories (2.1–2.7) are in `backlog` status. Epic 1 is `done` — all platform foundations (Drizzle, audit-log, pg-boss, test harness, CI, walking skeleton) are in place.

**Risk Summary:**

- Total risks identified: 11
- High-priority risks (score ≥6): 6
- Critical categories: SEC, BUS, TECH, OPS

**Coverage Summary:**

- P0 scenarios: 14 (~28–40 hours)
- P1 scenarios: 17 (~20–30 hours)
- P2/P3 scenarios: 10 (~6–12 hours)
- **Total effort**: ~54–82 hours (~7–10 engineering days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **External token security (FR-092)** | Opaque CSPRNG token model is Epic 5 — external registrants never hold Better Auth sessions | Covered in Epic 5 test design |
| **Admin Settings UI for role assignment** | The assignment UI is Epic 7 (Story 7.6); the role model itself is tested here | Epic 7 test design covers the UI surface |
| **Audit log view UI** | The read surface (FR-073 view) is Epic 7; Epic 2 only wires the write hook | Epic 7 test design |
| **Profile email-change via IdP** | Email is read-only from OIDC claim; IdP email management is outside this app | No app test needed |
| **Authentik server configuration** | IdP server setup is an ops dependency, not an app test | Documented in runbook; dev bypass covers local gaps |
| **Password / credential auth** | This app uses IdP exclusively (FR-090); no username/password flow exists | Not applicable |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | SEC | Dev auth bypass (`AUTH_DEV_BYPASS`) enabled or reachable in production — any user can impersonate a seeded test user without credentials | 2 | 3 | **6** | Integration test: assert bypass route returns 404/403 when flag is `false` or env is `production`; CI lint rule asserts flag cannot be committed `true` in `.env.production` | Dev / QA | Before Story 2.2 done |
| R-002 | SEC | Authorization guard dispatcher misconfigured — an `(app)` route lacks a `requireUser` check, allowing unauthenticated access to internal resources | 2 | 3 | **6** | Integration test: request every guarded route without a session; assert 302→/login redirect; negative-test template from Story 2.7 asserts 403/404 for IDOR attempts | Dev / QA | Before Story 2.5 done |
| R-003 | SEC | `assertOwner` guard is bypassable via forged or guessed IDs (IDOR) — a non-owner organizer reads or mutates another organizer's resource | 2 | 3 | **6** | Reusable IDOR negative-test template (Story 2.7): seed two organizer sessions, request owner-scoped resource with non-owner session, assert 403/404; template is parameterized so E3–E7 inherit it | Dev / QA | Before Story 2.7 done |
| R-004 | BUS | Session does not expire after 30 minutes of inactivity — sessions persist indefinitely, violating FR-093 and NFR-001 | 2 | 3 | **6** | Integration test: create session, advance clock past 30 min (Better Auth test utility or DB row manipulation), assert next request triggers re-auth redirect; also assert the timeout is not surfaced as a configurable setting | Dev / QA | Before Story 2.6 done |
| R-005 | BUS | Profile gate bypass — a user with an incomplete profile can skip the profile form and reach the main app (bookings, dashboard) | 2 | 3 | **6** | E2E test: complete OIDC flow, assert unauthenticated redirect to `/profile/complete`; submit profile form with empty required fields, assert block; complete profile, assert redirect to dashboard | Dev / QA | Before Story 2.3 done |
| R-006 | TECH | Guard dispatcher pattern not extensible — the `hooks.server.ts` matcher table is not structured as an appendable registry, forcing later epics to rewrite the hook instead of appending rules | 2 | 3 | **6** | Unit/static test: assert `hooks.server.ts` exposes a named `routeGuards` array or map that can be imported and extended in tests; code review AC before Story 2.5 closes | Dev | Before Story 2.5 done |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- |
| R-007 | SEC | OIDC callback handling exposes authorization code or state token via URL logs or error pages | 2 | 2 | 4 | Integration test: assert callback route does not echo `code` or `state` parameters in response body or redirect URL; assert Better Auth strips them | Dev / QA |
| R-008 | BUS | Profile update allows email field to be mutated — OIDC email claim should be read-only | 2 | 2 | 4 | Unit + Integration test: send PATCH to profile endpoint with a new `email` field; assert field is ignored and stored email is unchanged | Dev / QA |
| R-009 | BUS | `read-to-attend` privilege missing — an organizer cannot view another organizer's event to register for it; breaks the intended FR-094 access model | 2 | 2 | 4 | Integration test: user A owns an event; user B (non-owner organizer) GETs the event detail route; assert HTTP 200 (read-only visible) | Dev / QA |
| R-010 | OPS | Session DB rows not cleaned up after expiry — dead session rows accumulate in Postgres without a purge mechanism, potentially impacting DB performance over time | 1 | 3 | 3 | Unit/static: assert Better Auth is configured with a session cleanup job or TTL-based expiry; note as TECH DEBT if no automatic purge exists | Dev |
| R-011 | BUS | Audit-log write missing on profile mutations — profile updates are not audit-trailed, leaving FR-073 coverage incomplete for Epic 2 mutations | 2 | 2 | 4 | Integration test: update profile, assert `audit_log` row written with `entity='user_profile'`, correct `actor_id`, `action='update'`, and `diff` fields; uses E1 `writeAuditLog` pattern | Dev / QA |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Prob | Impact | Score | Action |
| ------- | -------- | ----------- | ---- | ------ | ----- | ------ |
| R-012 | BUS | Thai Paraglide strings missing for profile form error messages — blank or English errors shown in the profile form | 1 | 2 | 2 | Monitor — Epic 1 no-hardcoded-strings lint rule catches this in CI; Thai content audit deferred to production review |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture epic-level NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is a planning document, not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| **Security (NFR-001)** | No critical/high vulns at launch; dev bypass unreachable in production; IDOR-prevented by guard pattern | R-001, R-002, R-003, R-007 | Integration negative tests; dev-bypass flag assertion; IDOR template tests; dependency scan in CI | Test pass report; CI vuln-scan report |
| **Session Security (FR-093)** | Fixed 30-min timeout (not configurable); session expires on next request after idle | R-004 | Integration test: clock advance or DB manipulation → assert redirect to login | Test pass report asserting session expired |
| **Authorization (FR-094)** | Organizers see only own resources for mutation; any internal user can view any event read-only; admins read-all | R-002, R-003, R-009 | Integration tests: guard dispatch (unauthorized → redirect), assertOwner (non-owner → 403), read-to-attend (non-owner → 200 read-only) | Test pass report |
| **Audit Trail (FR-073)** | Every Epic 2 mutation (profile create/update, role assignment) writes an `audit_log` row via E1 hook | R-011 | Integration test: mutation → assert audit row in DB; rollback → assert no row | Test pass report |
| **Accessibility (NFR-007)** | Profile form and login redirect are WCAG 2.1 AA compliant | — | axe-core scan on profile page (E2E); inherit E1 baseline | axe-core zero-violation report on profile page |
| **i18n / Thai (NFR-006)** | All profile form labels, errors, and success messages are via Paraglide; no hardcoded strings | — | CI lint: `no-hardcoded-strings` rule; E2E: assert `lang="th"` on profile page | Lint run clean; page HTML snapshot |

**Unknown thresholds:**
- No explicit session-cleanup frequency or max-stale-session count defined (FR-093 says "fixed 30-min default"). Mark UNKNOWN — acceptable for MVP if Better Auth handles cleanup automatically. Tracked as R-010.
- No explicit OIDC token rotation or refresh policy defined in the PRD. Mark UNKNOWN — deferred to Better Auth defaults.

---

## Entry Criteria

- [x] Epic 1 fully done — scaffold, DB, audit-log, test harness, CI all in place
- [x] `tests/integration/` tier working with real Postgres (Testcontainers/CI service)
- [x] `writeAuditLog` helper available (`src/lib/server/services/audit.ts`)
- [x] `tests/support/fixtures/` directory and `pgFactory` pattern established
- [ ] Story 2.1 acceptance criteria agreed by Dev and QA before dev begins
- [ ] Authentik OIDC provider credentials available in CI secrets (or dev bypass active for local integration tests)
- [ ] `AUTH_DEV_BYPASS` mechanism designed so tests can use the bypass without touching production env

## Exit Criteria

- [ ] All P0 tests passing (zero failures)
- [ ] All P1 tests passing (zero failures, or each failure triaged with owner + waiver)
- [ ] R-001 mitigation: dev bypass unreachable in production — integration test green
- [ ] R-002 mitigation: every `(app)` route redirects unauthenticated requests — integration test green
- [ ] R-003 mitigation: IDOR negative-test template passes for at least one owner-scoped resource — template parameterized and usable by E3+
- [ ] R-004 mitigation: session timeout test green
- [ ] R-005 mitigation: profile gate test green
- [ ] R-006 mitigation: guard dispatcher extensibility confirmed — code review + unit test
- [ ] `audit_log` writes confirmed on all Epic 2 mutations (profile create/update)
- [ ] CI pipeline green (lint + typecheck + unit + integration + E2E + build)
- [ ] axe-core zero violations on profile page

---

## Risk Mitigation Plans

### R-001: Dev Bypass in Production (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. Unit/static test: assert `AUTH_DEV_BYPASS` is checked against a runtime env guard — the flag must only activate when `NODE_ENV !== 'production'` (two conditions required: flag set AND non-production env).
2. Integration test: start app with `AUTH_DEV_BYPASS=true` and `NODE_ENV=production`; assert the dev login route returns 404 or 403 and does not create a session.
3. CI lint rule: assert `.env.production*` files do not contain `AUTH_DEV_BYPASS=true` (grep or dedicated lint check).

**Owner:** Dev
**Timeline:** Merged with Story 2.2
**Status:** Planned
**Verification:** Integration test `2.2-INT-001` green in CI; dev login 404 when production flag set

---

### R-002: Guard Dispatcher Coverage (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. Integration test suite: for each `(app)` route registered in the matcher table, send an unauthenticated HTTP request; assert response is 302→/login (not 200).
2. The matcher table coverage assertion is a unit/static test — import the `routeGuards` registry and assert every `(app)` route prefix is present.
3. Add a CI step that fails if a new `+page.server.ts` under `src/routes/(app)/` is created without a corresponding entry in the guards registry.

**Owner:** Dev / QA
**Timeline:** Merged with Story 2.5
**Status:** Planned
**Verification:** Test `2.5-INT-001` through `2.5-INT-003` green; new route without guard fails CI check

---

### R-003: IDOR Negative-Test Template (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. Story 2.7 produces a reusable, parameterized `testOwnershipEnforcement(route, seedFn)` helper.
2. The helper: seeds an owner resource, creates a non-owner session via dev bypass, attempts GET/PATCH/DELETE on the owner's resource, asserts 403 or 404.
3. At least one usage of the template ships in Story 2.7 (e.g., against a profile or user-owned stub resource).
4. The template is documented in `tests/support/helpers/idor-template.ts` so E3, E4, E5 can import it.

**Owner:** Dev / QA
**Timeline:** Merged with Story 2.7
**Status:** Planned
**Verification:** Template helper in `tests/support/helpers/idor-template.ts`; `2.7-INT-001` green; E3–E7 stories reference the template in their ATDD checklists

---

### R-004: Session Timeout Enforcement (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. Unit test: assert Better Auth configuration includes `session.expiresIn` set to `1800` seconds (30 min) and `session.updateAge` not extending past the fixed window.
2. Integration test: create a DB-backed session, directly mutate the `updated_at` / `expires_at` column to simulate 31-minute idle, send a subsequent request to an `(app)` route, assert 302→/login.
3. Assert there is no settings endpoint or env variable that exposes this value as user-configurable.

**Owner:** Dev
**Timeline:** Merged with Story 2.6
**Status:** Planned
**Verification:** `2.6-INT-001` and `2.6-UNIT-001` green; grep for any configurable-timeout exposure returns empty

---

### R-005: Profile Gate Enforcement (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. E2E test: new OIDC user (via dev bypass with `profile_complete: false`) GETs `/dashboard`; assert redirect to `/profile/complete`.
2. Integration test: authenticated user with incomplete profile POSTs to a booking creation endpoint; assert 302 to profile page.
3. Integration test: after profile submission with all required fields, assert user can access `/dashboard` (HTTP 200).
4. Integration test: submitting profile with missing required field (`firstName` empty) returns 422 with field-level error; user still blocked.

**Owner:** Dev / QA
**Timeline:** Merged with Story 2.3
**Status:** Planned
**Verification:** `2.3-INT-001` through `2.3-INT-004` green

---

### R-006: Guard Dispatcher Extensibility (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. Code-review AC for Story 2.5: `hooks.server.ts` must define `routeGuards` as an exported, typed array/map that callers can push new entries into without modifying the hook itself.
2. Unit test: import `routeGuards` from hooks module, push a test entry, confirm the dispatch function honors it — proves the contract is importable and extensible.
3. Architecture rule: documented in a brief inline comment in `hooks.server.ts` so future epics know the pattern.

**Owner:** Dev
**Timeline:** Story 2.5 code review
**Status:** Planned
**Verification:** `2.5-UNIT-001` green; code review sign-off before Story 2.5 closes

---

## Test Coverage Plan

### Scenario ID Format

`2.{story}-{LEVEL}-{SEQ}` — e.g., `2.1-INT-001` = Epic 2, Story 1, Integration test, sequence 001.

---

### P0 (Critical)

**Criteria:** Blocks core journey + High risk (score ≥6) + No workaround

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | Notes |
| ----------- | ----- | -------------------- | ---------- | --------- | ----- |
| 2.1-E2E-001 | 2.1 | OIDC authorization-code + PKCE flow completes → DB-backed session created, available on `event.locals` | E2E | R-002 | Dev bypass used; assert `event.locals.session` populated; Playwright |
| 2.1-INT-001 | 2.1 | Unauthenticated request to any `(app)` route redirects to login (302) | Integration | R-002 | GET `/dashboard` without session → assert 302; covers guard dispatcher foundation |
| 2.1-INT-002 | 2.1 | Logout destroys session — subsequent `(app)` request redirects to login | Integration | R-002 | POST `/logout`, GET `(app)` route → assert 302 |
| 2.2-INT-001 | 2.2 | Dev bypass creates valid session for seeded test user when flag enabled in non-prod env | Integration | R-001 | `AUTH_DEV_BYPASS=true, NODE_ENV=test` → dev login succeeds |
| 2.2-INT-002 | 2.2 | Dev bypass is unreachable when `AUTH_DEV_BYPASS` is false OR `NODE_ENV=production` | Integration | R-001 | Two sub-cases: flag=false → 404; flag=true + production env → 404/403 |
| 2.3-INT-001 | 2.3 | New authenticated user with incomplete profile is redirected to profile form | Integration | R-005 | GET `/dashboard` with incomplete-profile session → 302 to `/profile/complete` |
| 2.3-INT-002 | 2.3 | Profile form submission with all required fields saves profile and allows app access | Integration | R-005 | POST profile form → 200; subsequent GET `/dashboard` → 200 |
| 2.3-INT-003 | 2.3 | Profile form submission missing required field is rejected with field-level error | Integration | R-005 | POST with `firstName` empty → 422 + error payload |
| 2.3-INT-004 | 2.3 | Email field on profile is pre-filled read-only from OIDC claim and cannot be changed via form submission | Integration | R-008 | POST with `email` overridden → stored email unchanged |
| 2.5-INT-001 | 2.5 | `requireUser` guard: unauthenticated request to protected route → 302→/login | Integration | R-002 | All `(app)` route prefixes in the matcher table |
| 2.5-INT-002 | 2.5 | `requireAdmin` guard: organizer (non-admin) request to admin route → 403 | Integration | R-002, R-003 | GET an admin-only route with organizer session → 403 |
| 2.5-INT-003 | 2.5 | `assertOwner` guard: non-owner organizer request to owner-scoped resource → 403/404 | Integration | R-003 | Uses IDOR template; seed resource for user A, request with user B session → 403/404 |
| 2.6-INT-001 | 2.6 | Session expired after 30-min inactivity → next request triggers re-auth | Integration | R-004 | Mutate session `expires_at` to past; GET `(app)` route → 302→/login |
| 2.7-INT-001 | 2.7 | IDOR negative-test template: `testOwnershipEnforcement` helper denies non-owner access and is usable by later epics | Integration | R-003 | Template helper exported from `tests/support/helpers/idor-template.ts`; one usage proven |

**Total P0:** 14 scenarios, ~28–40 hours

---

### P1 (High)

**Criteria:** Important foundation features + Medium risk (score 3–5) + Common workflows

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | Notes |
| ----------- | ----- | -------------------- | ---------- | --------- | ----- |
| 2.1-E2E-002 | 2.1 | Login page renders with Thai Paraglide string and `lang="th"` attribute | E2E | — | Playwright; assert `html[lang=th]` and at least one m.key() output |
| 2.1-E2E-003 | 2.1 | Login redirect preserves the originally-requested URL after authentication | E2E | — | GET `/dashboard`, redirect to login, complete auth, assert back at `/dashboard` |
| 2.2-UNIT-001 | 2.2 | Dev bypass requires BOTH the flag (`AUTH_DEV_BYPASS`) AND non-production env — static assertion | Unit/Static | R-001 | AST or grep check on the guard condition in the bypass handler |
| 2.3-E2E-001 | 2.3 | Profile form renders with correct fields (title, first name, last name, phone, org) and email read-only | E2E | — | Playwright: assert email input has `readonly` attribute; other fields editable |
| 2.3-INT-005 | 2.3 | Profile edit (post-first-login) saves updated fields while keeping email immutable | Integration | R-008 | PATCH profile with new `phone`; assert phone updated, email unchanged |
| 2.4-INT-001 | 2.4 | New authenticated user defaults to organizer role without any explicit assignment | Integration | — | Create user via dev bypass; query role field → assert `organizer` or equivalent default |
| 2.4-INT-002 | 2.4 | Admin flag can be set on a user record via direct DB manipulation (assignment UI in E7) | Integration | — | Set `is_admin=true` via DB seed; assert admin-only route returns 200 for that user |
| 2.5-INT-004 | 2.5 | `read-to-attend`: non-owner organizer can GET another organizer's event detail (200 read-only) | Integration | R-009 | User B reads User A's event → 200; User B PATCHes User A's event → 403 |
| 2.5-UNIT-001 | 2.5 | `routeGuards` registry is exported and extensible — importing and pushing a new entry is honored | Unit | R-006 | Import + push test entry; assert dispatch uses it |
| 2.5-INT-005 | 2.5 | Public `r/[token]` routes are explicitly allow-listed and skip auth guards | Integration | — | GET `/r/test-token` without session → 200 (or 404 on invalid token — not 302 to login) |
| 2.6-UNIT-001 | 2.6 | Better Auth session config has `expiresIn: 1800` (30 min) — static assertion | Unit/Static | R-004 | Import auth config; assert `session.expiresIn === 1800` |
| 2.6-INT-002 | 2.6 | Session timeout is not exposed as a user-configurable setting (no settings endpoint reveals it) | Integration | R-004 | GET `/settings` or scan all routes — assert no timeout-related field editable |
| 2.7-INT-002 | 2.7 | Profile create mutation writes audit_log row (entity, actor_id, action, diff) | Integration | R-011 | Submit profile → assert `audit_log` count +1; row has `entity='user_profile'`, `action='create'` |
| 2.7-INT-003 | 2.7 | Profile update mutation writes audit_log row with correct before/after diff | Integration | R-011 | PATCH phone → assert audit row `diff` contains old and new value |
| 2.7-INT-004 | 2.7 | Rolled-back profile update writes no audit_log row | Integration | R-011 | Force DB error mid-transaction → assert audit_log count unchanged |
| 2.1-INT-003 | 2.1 | OIDC callback does not echo `code` or `state` parameters in response | Integration | R-007 | Assert callback response body and redirect URL do not contain `code=` or `state=` |
| 2.3-A11Y-001 | 2.3 | Profile form passes axe-core check (zero WCAG 2.1 AA violations) | E2E | — | Playwright + axe-core; assert zero violations on profile form page |

**Total P1:** 17 scenarios, ~20–30 hours

---

### P2 (Medium)

**Criteria:** Secondary/edge-case coverage + Low risk (score 1–3)

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | Notes |
| ----------- | ----- | -------------------- | ---------- | --------- | ----- |
| 2.1-INT-004 | 2.1 | OIDC error callback (invalid state) returns a user-facing error page, not a 500 | Integration | — | Simulate invalid `state` param on callback; assert 400 or error page rendered |
| 2.3-INT-006 | 2.3 | Profile title field accepts all valid values (Mr / Mrs / Ms / Other + free text) | Integration | — | POST with each title option; assert all saved correctly |
| 2.4-INT-003 | 2.4 | Admin flag correctly scopes admin-only routes — admin user gets 200, non-admin gets 403 | Integration | — | Both happy and unhappy paths for admin routes using DB-seeded admin flag |
| 2.5-INT-006 | 2.5 | Adding a new route entry to the guards registry without modifying hooks.server.ts works correctly | Integration | R-006 | E2E: simulate the append-to-registry pattern used by later epics |
| 2.6-INT-003 | 2.6 | Session rows for expired sessions are not returned by Better Auth on subsequent requests | Integration | R-010 | Query expired session; assert `event.locals.session` is null |
| 2.7-UNIT-001 | 2.7 | `testOwnershipEnforcement` helper covers GET, PATCH, and DELETE HTTP methods | Unit | R-003 | Unit test the helper with mock route; assert all three methods denied |
| 2.3-INT-007 | 2.3 | Profile form shows loading/disabled state during submission (UX-DR8 state pattern) | Component | — | Playwright: assert submit button disabled during in-flight POST |
| 2.1-E2E-004 | 2.1 | Login page shows actionable error message on OIDC provider unavailable (UX-DR8 system-error pattern) | E2E | — | Mock Authentik unavailable; assert page banner + retry link, no 500 stack trace |

**Total P2:** 8 scenarios, ~4–8 hours

---

### P3 (Low) — Run on-demand only

**Criteria:** Nice-to-have, exploratory, edge conditions

| Scenario ID | Story | Description | Test Level | Notes |
| ----------- | ----- | ----------- | ---------- | ----- |
| 2.6-INT-004 | 2.6 | Multiple concurrent sessions for the same user are each tracked and expired independently | Integration | Informational; complex to set up; no SLA |
| 2.3-INT-008 | 2.3 | Profile page renders correctly on mobile viewport (≤375px) per UX-DR10 | E2E/Visual | Playwright viewport override; no automated threshold |
| 2.5-P3-001 | 2.5 | Guard dispatcher log output (pino) is emitted on every guard decision | Integration | Observability smoke; no gate effect |

**Total P3:** 3 scenarios, ~2–4 hours

---

## Execution Strategy

**Philosophy:** Run all functional tests on every PR if total wall-clock time stays under 15 minutes. The Epic 2 integration tests are mostly server-side (no Docker Compose cold-start required beyond the Testcontainers Postgres already established in E1), so the full P0+P1 suite is PR-gate eligible.

### PR Gate (every PR — target < 15 min)

- Lint + typecheck + svelte-check (`bun run check`)
- Vitest unit suite (P1 static assertions, unit tests)
- Vitest integration suite (P0+P1 integration tests — uses Testcontainers Postgres)
- Playwright E2E suite (P0 E2E login/profile flows, P1 a11y)
- `bun run build`

**Total: ~31 scenarios** — feasible in < 15 min with Playwright parallelization and the Testcontainers Postgres teardown pattern from E1.

### Nightly

- P2 edge-case scenarios (8 scenarios)
- Full Docker Compose cold-start smoke (inherited from E1, confirms auth routes work through nginx)
- Dependency / vulnerability scan

### On-Demand

- P3 scenarios (visual, observability, concurrency)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Avg Hours/Test | Total Hours | Notes |
| -------- | ----- | -------------- | ----------- | ----- |
| P0 | 14 | 2.0–2.75 | 28–40 | Auth integration setup; IDOR template authoring; dev bypass test |
| P1 | 17 | 1.25–1.75 | 20–30 | Session config assertions lighter; audit-log tests reuse E1 fixtures |
| P2 | 8 | 0.5–1.0 | 4–8 | Edge cases; reuse P0/P1 fixtures |
| P3 | 3 | 0.5–1.5 | 2–4 | Informational / visual |
| **Total** | **42** | — | **~54–82** | **~7–10 engineering days** |

### Prerequisites

**Test Data / Fixtures:**
- `userFactory` — seeds Better Auth user records with `profile_complete` flag; auto-cleanup via transaction rollback
- `adminUserFactory` — seeds user with `is_admin=true`
- `sessionFactory` — creates a DB-backed Better Auth session for a given user; supports `expiresAt` override for timeout tests
- `oidcDevBypassFixture` — wraps the dev-bypass login endpoint for integration test setup
- `testOwnershipEnforcement(route, seedFn)` — IDOR negative-test template exported from `tests/support/helpers/idor-template.ts`

**Tooling:**
- Vitest (unit + integration) with Testcontainers Postgres (already in place from E1)
- Playwright (E2E + a11y with axe-core plugin)
- Better Auth test utilities for session manipulation (or direct Drizzle DB access to mutate session rows)
- `bun audit` / `trivy` for dependency scanning (inherited from CI)

**Environment:**
- CI: Testcontainers Postgres service (already configured in `vite.config.ts` `integration` project)
- Local: `docker compose up -d db` (`compose.yaml`) — no Authentik required (dev bypass)
- No external Authentik instance required for unit/integration tests; E2E login tests use dev bypass
- `AUTH_DEV_BYPASS=true` in test env only; never in `.env.production`

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (zero exceptions — any P0 failure blocks merge)
- **P1 pass rate:** ≥95% (each failure requires triage comment with owner)
- **P2/P3 pass rate:** ≥90% (informational; failures do not block merge but are tracked)
- **Security mitigations (R-001 through R-003):** All must be Complete before Epic 2 is closed

### Coverage Targets

- **Auth guard paths (critical):** 100% — unauthenticated, admin-only, owner-scoped, and public routes all tested
- **Dev bypass safety:** 100% — both bypass-enabled and bypass-disabled scenarios confirmed
- **Audit trail (Epic 2 mutations):** 100% — profile create, profile update, rollback path
- **IDOR negative-test template:** Template exists and one usage proven before Epic 2 closes

### Non-Negotiable Requirements

- [ ] All P0 tests pass (zero failures) before Epic 2 is marked done
- [ ] R-001 (dev bypass in production) — integration test green
- [ ] R-002 (guard dispatcher coverage) — all `(app)` routes redirect unauthenticated requests
- [ ] R-003 (IDOR template) — `testOwnershipEnforcement` helper in `tests/support/helpers/` and green
- [ ] R-004 (session timeout) — 30-min expiry integration test green
- [ ] R-005 (profile gate) — profile completion gate E2E test green
- [ ] Audit-log writes on Epic 2 mutations — integration tests green
- [ ] CI pipeline stays green (no regression to E1 tests)

---

## Assumptions and Dependencies

### Assumptions

1. `AUTH_DEV_BYPASS` is the actual env var name for the dev login bypass — if the name changes, test references must be updated.
2. Better Auth stores sessions in a Drizzle-managed `session` table in Postgres; the integration tests can directly mutate `expires_at` to simulate timeout without mocking a clock.
3. The guard dispatcher is implemented in `src/hooks.server.ts` as a named, exported `routeGuards` array/map — this is an architecture AC that Story 2.5 must satisfy for R-006 mitigation.
4. The dev bypass seeded user has a known `id` and `email` (fixed test fixture) so integration tests can reference it deterministically.
5. No Thai text is hardcoded in profile form components — all strings flow through Paraglide (per project memory rule; Rawinan handles Thai translations).
6. Better Auth's `svelteKitHandler` + `sveltekitCookies` plugin is the session mechanism; tests assert session presence on `event.locals`, not cookie header directly.
7. The Testcontainers Postgres setup from E1 (`tests/support/fixtures/pg-factory.ts`, `testcontainers-context.ts`) is reusable for Epic 2 integration tests without modification.
8. The `routeGuards` pattern is the implementation of the guard dispatcher — if Better Auth middleware is used instead, R-006 mitigation tests must be updated.

### Dependencies

1. **Epic 1 (done)** — scaffold, Drizzle, test harness, CI pipeline, audit-log write hook all in place.
2. **Story 2.2 (dev bypass)** — must be implemented before any auth-dependent integration test can run; it is the test seam for all subsequent Epic 2 tests.
3. **Story 2.5 (guard dispatcher)** — P0 guard tests depend on the dispatcher being in place; guard tests can be written speculatively but only pass once 2.5 is merged.
4. **Better Auth + Authentik OIDC credentials** — E2E tests against real Authentik are not required (dev bypass is the test seam); however, the OIDC callback route must exist for `2.1-INT-003` (callback parameter assertion).
5. **`tests/support/helpers/idor-template.ts`** — created in Story 2.7; E3–E7 ATDD checklists reference this file.

### Risks to Plan

- **Risk:** Authentik is not available in CI at all, including the callback route — even with dev bypass active, the OIDC callback endpoint may not exist, making `2.1-INT-003` un-runnable.
  - **Impact:** R-007 mitigation (callback parameter leak) cannot be verified.
  - **Contingency:** Mock the OIDC callback with a test-only handler that exercises the same code path; or defer to a dedicated OIDC smoke test in a staging environment.

- **Risk:** Better Auth session manipulation via direct DB write is not reliable (Better Auth may re-validate session from in-memory cache before checking DB).
  - **Impact:** R-004 timeout integration test (`2.6-INT-001`) may produce false positives.
  - **Contingency:** Use Better Auth's test utilities if available, or advance system clock using a test clock injection; escalate to a dev spike before Story 2.6.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **E1 audit-log write hook** | Epic 2 mutations (profile create/update) must call `writeAuditLog` — if the hook signature changes, all Epic 2 audit tests break | `2.7-INT-002/003/004` must remain green whenever `audit.ts` is modified |
| **`hooks.server.ts` guard dispatcher** | Every story in E3–E7 that adds a new route will push to the guards registry; any change to the dispatcher format breaks all registered guards | `2.5-INT-001/002/003/004` must remain green; regression run triggered by any `hooks.server.ts` change |
| **Dev bypass (`AUTH_DEV_BYPASS`)** | All integration test fixtures in E3–E7 rely on the dev bypass as the test seam for seeding authenticated sessions | `2.2-INT-001/002` must remain green; removing the bypass without replacing the test seam blocks all downstream integration tests |
| **Better Auth session schema** | Drizzle migration changes to the `session` table (e.g., adding columns) must not break session creation or expiry tests | `2.1-INT-001`, `2.6-INT-001` must remain green; migration change triggers full auth integration re-run |
| **Profile schema** | E6 (Story 6.4) prefills internal registration from the profile; a schema change to `user_profile` breaks the E6 prefill path | `2.3-INT-002/005` must remain green; profile schema changes trigger E6 regression |
| **E1 CI pipeline** | E1 CI gates (lint, typecheck, Vitest, Playwright, build) must continue passing with Epic 2 code added | Full CI run required on every Epic 2 PR; no regression to E1 unit/integration tests |

---

## Follow-on Workflows

- Run `*atdd` for each Epic 2 story to generate failing P0 test stubs before implementation begins (acceptance-test-driven).
- Run `*automate` for P1 test generation once Story 2.1–2.4 are merged.
- After Epic 2 is complete, run `*nfr-assess` with evidence (CI report, security test results) to produce the first Security NFR PASS/CONCERNS/FAIL assessment.
- Reusable IDOR template (`tests/support/helpers/idor-template.ts`) should be referenced in ATDD checklists for E3, E4, E5, and E6 stories involving owner-scoped resources.

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
- **Epics:** `_bmad-output/planning-artifacts/epics.md` (Epic 2, lines 411–518)
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md`
- **Sprint Status:** `_bmad-output/implementation-artifacts/sprint-status.yaml`
- **Epic 1 Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-1.md`
- **E1 Audit ATDD:** `_bmad-output/test-artifacts/atdd-checklist-1-6-audit-log-write-hook-foundation.md`
- **E1 Test Harness ATDD:** `_bmad-output/test-artifacts/atdd-checklist-1-8-test-harness-ci.md`
- **IDOR Template (to be created):** `tests/support/helpers/idor-template.ts` (Story 2.7)

### Risk Score Legend

| Score | Action | Gate Effect |
| ----- | ------ | ----------- |
| 9 | BLOCK | Automatic FAIL — must resolve before shipping |
| 6–8 | MITIGATE | CONCERNS — must have mitigation plan before merge |
| 4–5 | MONITOR | Watch; plan mitigations proactively |
| 1–3 | DOCUMENT | Awareness only |

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
**Epic:** 2 — Identity & Access
**Mode:** Epic-Level
**Revision:** v1 (2026-06-11) — Initial generation. All 7 stories (2.1–2.7) in backlog. 42 scenarios: 14 P0, 17 P1, 8 P2, 3 P3. 6 high-priority risks with mitigation plans. IDOR negative-test template pattern seeded here for downstream epics.
