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
lastSaved: '2026-06-12'
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad/tea/config.yaml
  - _bmad-output/test-artifacts/atdd-checklist-2-1-sign-in-with-authentik-oidc.md
  - _bmad-output/test-artifacts/atdd-checklist-2-3-self-service-profile.md
  - _bmad-output/test-artifacts/atdd-checklist-2-6-fixed-session-timeout.md
  - tests/integration/auth.test.ts
  - tests/integration/auth-bypass.test.ts
  - tests/integration/auth-guard.test.ts
  - tests/integration/profile.test.ts
  - tests/integration/roles.test.ts
  - tests/integration/session-timeout.test.ts
  - tests/e2e/auth.spec.ts
  - tests/e2e/profile.spec.ts
  - tests/support/helpers/dev-bypass.ts
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/risk-governance.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/probability-impact.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-levels-framework.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-priorities-matrix.md
---

# Test Design: Epic 2 — Identity & Access

**Date:** 2026-06-12
**Author:** Rawinan
**Status:** Living Document (v2)
**Mode:** Epic-Level Test Design

---

## Executive Summary

**Scope:** Epic-level test design for Epic 2 — Identity & Access

Epic 2 delivers the authentication backbone and authorization envelope that every downstream epic inherits. Its deliverables are: Authentik OIDC sign-in via Better Auth, a dev-bypass for local development, a self-service user profile, a two-tier role model (organizer default / admin assignable), a server-side guard dispatcher pattern, a fixed 30-minute session timeout, and the IDOR/authorization negative-test template wired to the E1 audit-log hook.

**Why this epic is high-stakes for testing:**
Every user interaction in Epics 3–7 passes through the auth guards established here. An incorrectly scoped `assertOwner`, a broken session cookie, or a leaking dev bypass in production would compromise the entire application. Epic 2 is also the first point where NFR-001 (Security: no critical/high vulns) becomes testable in a meaningful end-to-end context. Getting the guard dispatcher pattern right here means all later epics append rules rather than rewrite them — a test regression in Epic 2 late in the project is far more expensive than catching it now.

**Implementation Status (2026-06-12 — v2 update):** Stories 2.1, 2.2, 2.3, 2.4, and 2.6 are `done`. Stories 2.5 (authorization guard dispatcher) and 2.7 (IDOR negative-test pattern + audit on mutations) remain in `backlog`. Epic 1 is `done` — all platform foundations (Drizzle, audit-log, pg-boss, test harness, CI, walking skeleton) are in place.

**Test Infrastructure Status:**
- `tests/integration/auth.test.ts` — active (1 passing, 7 skipped pending Story 2.5 activation)
- `tests/integration/auth-bypass.test.ts` — active; Story 2.2 tests fully passing (2 env-conditional `skipIf` for production-guard tests that need special URLs)
- `tests/integration/auth-guard.test.ts` — 12 `test.todo()` stubs awaiting Story 2.5
- `tests/integration/profile.test.ts` — active; all Story 2.3 integration tests passing (1082 lines)
- `tests/integration/roles.test.ts` — active; all Story 2.4 tests passing
- `tests/integration/session-timeout.test.ts` — active; P0+P1 passing; 2 `test.todo()` on-demand (P2/P3)
- `tests/e2e/auth.spec.ts` — 11 skipped (Story 2.5 + full OIDC flow pending live Authentik)
- `tests/e2e/profile.spec.ts` — 12 skipped (Story 2.3 E2E pending dev-server activation)
- `tests/support/helpers/dev-bypass.ts` — created; `getDevBypassCookie()` + `extractCookiePair()` reusable seam

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (score ≥6): 6
- Risks fully mitigated (done stories): 4 (R-001, R-004, R-005, partially R-008)
- Risks requiring Story 2.5/2.7: 2 (R-002/R-006, R-003)
- Critical categories: SEC, BUS, TECH, OPS

**Coverage Summary:**

- P0 scenarios: 14 (~28–40 hours) — 10 implemented, 4 pending Stories 2.5/2.7
- P1 scenarios: 17 (~20–30 hours) — 12 implemented, 5 pending Stories 2.5/2.7
- P2/P3 scenarios: 11 (~6–12 hours) — 6 implemented/todo, 5 pending
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

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline | Status |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- | -------- | ------ |
| R-001 | SEC | Dev auth bypass (`AUTH_DEV_BYPASS`) enabled or reachable in production — any user can impersonate a seeded test user without credentials | 2 | 3 | **6** | Integration test: assert bypass route returns 404/403 when flag is `false` or env is `production`; CI lint rule asserts flag cannot be committed `true` in `.env.production`; `getDevBypassCookie()` helper gates on env check | Dev / QA | Story 2.2 done | **MITIGATED** — Story 2.2 merged; `auth-bypass.test.ts` active |
| R-002 | SEC | Authorization guard dispatcher misconfigured — an `(app)` route lacks a `requireUser` check, allowing unauthenticated access to internal resources | 2 | 3 | **6** | Integration test: request every guarded route without a session; assert 302→/login redirect; negative-test template from Story 2.7 asserts 403/404 for IDOR attempts | Dev / QA | Story 2.5 | **OPEN** — awaiting Story 2.5; stubs in `auth-guard.test.ts` |
| R-003 | SEC | `assertOwner` guard is bypassable via forged or guessed IDs (IDOR) — a non-owner organizer reads or mutates another organizer's resource | 2 | 3 | **6** | Reusable IDOR negative-test template (Story 2.7): seed two organizer sessions, request owner-scoped resource with non-owner session, assert 403/404; template is parameterized so E3–E7 inherit it | Dev / QA | Story 2.7 | **OPEN** — awaiting Story 2.7 |
| R-004 | BUS | Session does not expire after 30 minutes of inactivity — sessions persist indefinitely, violating FR-093 and NFR-001 | 2 | 3 | **6** | Integration test: create session, set `expires_at` to past, assert next request triggers re-auth redirect; also assert timeout is not configurable via env var | Dev / QA | Story 2.6 done | **MITIGATED** — Story 2.6 merged; `session-timeout.test.ts` active; `2.6-INT-001` passing |
| R-005 | BUS | Profile gate bypass — a user with an incomplete profile can skip the profile form and reach the main app (bookings, dashboard) | 2 | 3 | **6** | E2E test: complete OIDC flow, assert unauthenticated redirect to `/profile/complete`; submit profile form with empty required fields, assert block; complete profile, assert redirect to dashboard | Dev / QA | Story 2.3 done | **MITIGATED** — Story 2.3 merged; `profile.test.ts` active (all P0 passing) |
| R-006 | TECH | Guard dispatcher pattern not extensible — the `hooks.server.ts` matcher table is not structured as an appendable registry, forcing later epics to rewrite the hook instead of appending rules | 2 | 3 | **6** | Unit/static test: assert `hooks.server.ts` exposes a named `routeGuards` array or map that can be imported and extended in tests; code review AC before Story 2.5 closes | Dev | Story 2.5 | **OPEN** — awaiting Story 2.5; `2.5-UNIT-001` stub in `auth-guard.test.ts` |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Status |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- | ------ |
| R-007 | SEC | OIDC callback handling exposes authorization code or state token via URL logs or error pages | 2 | 2 | 4 | Integration test: assert callback route does not echo `code` or `state` parameters in response body or redirect URL | Dev / QA | **OPEN** — `2.1-INT-003` still skipped in `auth.test.ts` |
| R-008 | BUS | Profile update allows email field to be mutated — OIDC email claim should be read-only | 2 | 2 | 4 | Unit + Integration test: send POST to profile endpoint with a new `email` field; assert field is ignored and stored email is unchanged | Dev / QA | **MITIGATED** — `2.3-INT-004` passing in `profile.test.ts` |
| R-009 | BUS | `read-to-attend` privilege missing — an organizer cannot view another organizer's event to register for it; breaks the intended FR-094 access model | 2 | 2 | 4 | Integration test: user A owns an event; user B (non-owner organizer) GETs the event detail route; assert HTTP 200 (read-only visible) | Dev / QA | **OPEN** — `2.5-INT-004` stub awaiting Story 2.5 |
| R-010 | OPS | Session DB rows not cleaned up after expiry — dead session rows accumulate in Postgres without a purge mechanism | 1 | 3 | 3 | Unit/static: assert Better Auth is configured with a session cleanup job or TTL-based expiry; note as TECH DEBT if no automatic purge exists | Dev | **MONITORED** — `2.6-INT-003` todo (P2); `session-timeout.test.ts` active |
| R-011 | BUS | Audit-log write missing on profile mutations — profile updates are not audit-trailed, leaving FR-073 coverage incomplete for Epic 2 mutations | 2 | 2 | 4 | Integration test: update profile, assert `audit_log` row written with `entity='user_profile'`, correct `actor_id`, `action='update'`, and `diff` fields | Dev / QA | **PARTIALLY MITIGATED** — tests seeded in `profile.test.ts` (2.7-INT-002/003/004); formal IDOR template in Story 2.7 |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Prob | Impact | Score | Action | Status |
| ------- | -------- | ----------- | ---- | ------ | ----- | ------ | ------ |
| R-012 | BUS | Thai Paraglide strings missing for profile form error messages — blank or English errors shown in the profile form | 1 | 2 | 2 | Monitor — Epic 1 no-hardcoded-strings lint rule catches this in CI; Thai content audit deferred to production review | **MONITORED** — CI lint active |

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

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed | Status |
| ------------ | ----------------------- | --------- | ------------------ | --------------- | ------ |
| **Security (NFR-001)** | No critical/high vulns at launch; dev bypass unreachable in production; IDOR-prevented by guard pattern | R-001, R-002, R-003, R-007 | Integration negative tests; dev-bypass flag assertion; IDOR template tests; dependency scan in CI | Test pass report; CI vuln-scan report | R-001 PASS; R-002/R-003 pending Story 2.5/2.7 |
| **Session Security (FR-093)** | Fixed 30-min timeout (not configurable); session expires on next request after idle | R-004 | Integration test: set `expires_at` to past → assert redirect to login; static assertions on config | Test pass report asserting session expired | **PASS** — `2.6-INT-001`, `2.6-UNIT-001/002/003` all green |
| **Authorization (FR-094)** | Organizers see only own resources for mutation; any internal user can view any event read-only; admins read-all | R-002, R-003, R-009 | Integration tests: guard dispatch (unauthorized → redirect), assertOwner (non-owner → 403), read-to-attend (non-owner → 200 read-only) | Test pass report | Pending Story 2.5; role model PASS (Story 2.4) |
| **Audit Trail (FR-073)** | Every Epic 2 mutation (profile create/update, role assignment) writes an `audit_log` row via E1 hook | R-011 | Integration test: mutation → assert audit row in DB; rollback → assert no row | Test pass report | Tests seeded; pending Story 2.7 formal template |
| **Accessibility (NFR-007)** | Profile form and login redirect are WCAG 2.1 AA compliant | — | axe-core scan on profile page (E2E); inherit E1 baseline | axe-core zero-violation report on profile page | Pending E2E activation (profile.spec.ts skipped) |
| **i18n / Thai (NFR-006)** | All profile form labels, errors, and success messages are via Paraglide; no hardcoded strings | — | CI lint: `no-hardcoded-strings` rule; E2E: assert `lang="th"` on profile page | Lint run clean; page HTML snapshot | Lint active; E2E pending |

**Unknown thresholds:**
- No explicit session-cleanup frequency or max-stale-session count defined (FR-093 says "fixed 30-min default"). Mark UNKNOWN — acceptable for MVP if Better Auth handles cleanup automatically. Tracked as R-010.
- No explicit OIDC token rotation or refresh policy defined in the PRD. Mark UNKNOWN — deferred to Better Auth defaults.

---

## Entry Criteria

- [x] Epic 1 fully done — scaffold, DB, audit-log, test harness, CI all in place
- [x] `tests/integration/` tier working with real Postgres (Testcontainers/CI service)
- [x] `writeAuditLog` helper available (`src/lib/server/services/audit.ts`)
- [x] `tests/support/fixtures/` directory and `pgFactory` pattern established
- [x] Story 2.1 done — Better Auth OIDC, session table, `handleAuthGuard` in hooks
- [x] Story 2.2 done — `AUTH_DEV_BYPASS` seam; `getDevBypassCookie()` helper available
- [x] Story 2.3 done — profile gate, `user_profiles` table, profile service, audit hooks
- [x] Story 2.4 done — role model, `is_admin` flag, `requireAdmin` guard
- [x] Story 2.6 done — session expiry enforcement, `session.expiresIn: 1800`
- [ ] Story 2.5 acceptance criteria agreed — `routeGuards` exported registry pattern
- [ ] Story 2.7 acceptance criteria agreed — `testOwnershipEnforcement` helper design finalized

## Exit Criteria

- [x] R-001 mitigation: dev bypass unreachable in production — `auth-bypass.test.ts` green
- [x] R-004 mitigation: session timeout test green — `2.6-INT-001` passing
- [x] R-005 mitigation: profile gate test green — all `2.3-INT-*` passing
- [x] R-008 mitigation: email immutability — `2.3-INT-004` passing
- [ ] All P0 tests passing (zero failures) — 4 P0 tests pending Story 2.5
- [ ] R-002 mitigation: every `(app)` route redirects unauthenticated requests — `auth-guard.test.ts` green (Story 2.5)
- [ ] R-003 mitigation: IDOR negative-test template passes for at least one owner-scoped resource (Story 2.7)
- [ ] R-006 mitigation: guard dispatcher extensibility confirmed — code review + `2.5-UNIT-001` green (Story 2.5)
- [ ] `audit_log` writes confirmed on all Epic 2 mutations — `2.7-INT-002/003/004` green (Story 2.7)
- [ ] E2E suite fully activated — `auth.spec.ts` and `profile.spec.ts` skipped tests resolved
- [ ] CI pipeline green (lint + typecheck + unit + integration + E2E + build)
- [ ] axe-core zero violations on profile page (pending E2E activation)

---

## Risk Mitigation Plans

### R-001: Dev Bypass in Production (Score: 6 — MITIGATED ✅)

**Mitigation Strategy (implemented):**
1. `auth-bypass.test.ts` — `2.2-INT-001`: bypass creates valid session when `AUTH_DEV_BYPASS=true` and non-production env.
2. `auth-bypass.test.ts` — `2.2-INT-002`: two-condition guard assertion; `test.skipIf(!process.env.DEV_SERVER_NO_BYPASS_URL])` and `test.skipIf(!process.env.DEV_SERVER_PRODUCTION_URL])` run against special env URLs to verify 404/403 in production.
3. `auth-bypass.test.ts` (static section): Two-condition guard assertion — flag AND non-production both required.
4. `tests/support/helpers/dev-bypass.ts` — `getDevBypassCookie()` helper enforces this seam for all downstream tests.

**Owner:** Dev / QA
**Status:** MITIGATED — Story 2.2 merged (PR #107); `auth-bypass.test.ts` active
**Verification:** `auth-bypass.test.ts` passing in CI; two env-conditional tests (`skipIf`) require special URLs for full production-guard verification

---

### R-002: Guard Dispatcher Coverage (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Integration test suite (Story 2.5): for each `(app)` route registered in the matcher table, send an unauthenticated HTTP request; assert response is 302→/login.
2. The matcher table coverage assertion is a unit/static test — import the `routeGuards` registry and assert every `(app)` route prefix is present.
3. Add a CI step that fails if a new `+page.server.ts` under `src/routes/(app)/` is created without a corresponding entry in the guards registry.

**Owner:** Dev / QA
**Timeline:** Story 2.5
**Status:** OPEN — `auth-guard.test.ts` has 12 `test.todo()` stubs awaiting Story 2.5 implementation
**Verification:** `2.5-INT-001` through `2.5-INT-003` green; new route without guard fails CI check

---

### R-003: IDOR Negative-Test Template (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Story 2.7 produces a reusable, parameterized `testOwnershipEnforcement(route, seedFn)` helper.
2. The helper: seeds an owner resource, creates a non-owner session via dev bypass, attempts GET/PATCH/DELETE on the owner's resource, asserts 403 or 404.
3. At least one usage of the template ships in Story 2.7.
4. The template is documented in `tests/support/helpers/idor-template.ts` so E3, E4, E5 can import it.

**Owner:** Dev / QA
**Timeline:** Story 2.7
**Status:** OPEN — `tests/support/helpers/idor-template.ts` does not yet exist; `2.7-INT-001` stub awaiting Story 2.7
**Verification:** Template helper in `tests/support/helpers/idor-template.ts`; `2.7-INT-001` green; E3–E7 stories reference the template

---

### R-004: Session Timeout Enforcement (Score: 6 — MITIGATED ✅)

**Mitigation Strategy (implemented):**
1. `session-timeout.test.ts` — `2.6-UNIT-001`: asserts `session.expiresIn === 1800` (30 min).
2. `session-timeout.test.ts` — `2.6-UNIT-002`: asserts `expiresIn` is a hard-coded literal, not derived from env var.
3. `session-timeout.test.ts` — `2.6-UNIT-003`: static env-key scan — no `SESSION_TIMEOUT*` env var present.
4. `session-timeout.test.ts` — `2.6-INT-001`: seed expired session (set `expiresAt` to past); assert GET `(app)` route returns 302→/login.
5. `session-timeout.test.ts` — `2.6-INT-001b`: fresh session (29 min) — assert NOT redirected.
6. `session-timeout.test.ts` — `2.6-INT-002`: source-code scan confirms no route exposes timeout as editable field.

**Owner:** Dev
**Status:** MITIGATED — Story 2.6 merged (PR #110); P0+P1 tests passing; 2 `test.todo()` left for P2/P3 on-demand
**Verification:** `2.6-INT-001`, `2.6-UNIT-001/002/003`, `2.6-INT-001b`, `2.6-INT-002` all green

---

### R-005: Profile Gate Enforcement (Score: 6 — MITIGATED ✅)

**Mitigation Strategy (implemented):**
1. `profile.test.ts` — `2.3-INT-001`: GET `/dashboard` with incomplete-profile session → 302 to `/profile/complete`.
2. `profile.test.ts` — `2.3-INT-002`: Valid POST profile form → profile row created; subsequent GET `/dashboard` → 200.
3. `profile.test.ts` — `2.3-INT-003/003b`: POST with missing required field → 422; no profile row created.
4. `profile.test.ts` — `2.3-INT-004c`: GET `/profile/complete` with completed profile → redirect to dashboard.
5. All P0 profile gate tests active and passing.

**Owner:** Dev / QA
**Status:** MITIGATED — Story 2.3 merged (PR #109); all `2.3-INT-*` P0 tests passing
**Verification:** `2.3-INT-001` through `2.3-INT-004` green in CI

---

### R-006: Guard Dispatcher Extensibility (Score: 6 — OPEN)

**Mitigation Strategy (planned):**
1. Code-review AC for Story 2.5: `hooks.server.ts` must define `routeGuards` as an exported, typed array/map.
2. `auth-guard.test.ts` — `2.5-UNIT-001` (todo): import `routeGuards` from hooks module, push a test entry, confirm the dispatch function honors it.
3. Architecture rule: documented in a brief inline comment in `hooks.server.ts` so future epics know the pattern.

**Owner:** Dev
**Timeline:** Story 2.5 code review
**Status:** OPEN — awaiting Story 2.5
**Verification:** `2.5-UNIT-001` green; code review sign-off before Story 2.5 closes

---

## Test Coverage Plan

### Scenario ID Format

`2.{story}-{LEVEL}-{SEQ}` — e.g., `2.1-INT-001` = Epic 2, Story 1, Integration test, sequence 001.

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
| 2.1-E2E-001 | 2.1 | OIDC authorization-code + PKCE flow completes → DB-backed session created | E2E | R-002 | `tests/e2e/auth.spec.ts` | 🟡 SKIP (needs live Authentik or Story 2.5) |
| 2.1-INT-001 | 2.1 | Unauthenticated request to any `(app)` route redirects to login (302) | Integration | R-002 | `tests/integration/auth.test.ts` | 🟡 SKIP (pending activation — Story 2.1 auth guard exists) |
| 2.1-INT-002 | 2.1 | Logout destroys session — subsequent `(app)` request redirects to login | Integration | R-002 | `tests/integration/auth.test.ts` | ✅ ACTIVE |
| 2.2-INT-001 | 2.2 | Dev bypass creates valid session for seeded test user when flag enabled in non-prod env | Integration | R-001 | `tests/integration/auth-bypass.test.ts` | ✅ ACTIVE |
| 2.2-INT-002 | 2.2 | Dev bypass is unreachable when `AUTH_DEV_BYPASS` is false OR `NODE_ENV=production` | Integration | R-001 | `tests/integration/auth-bypass.test.ts` | ✅ ACTIVE (2 env-conditional `skipIf` sub-cases) |
| 2.3-INT-001 | 2.3 | New authenticated user with incomplete profile is redirected to profile form | Integration | R-005 | `tests/integration/profile.test.ts` | ✅ ACTIVE |
| 2.3-INT-002 | 2.3 | Profile form submission with all required fields saves profile and allows app access | Integration | R-005 | `tests/integration/profile.test.ts` | ✅ ACTIVE |
| 2.3-INT-003 | 2.3 | Profile form submission missing required field is rejected with field-level error | Integration | R-005 | `tests/integration/profile.test.ts` | ✅ ACTIVE |
| 2.3-INT-004 | 2.3 | Email field on profile is pre-filled read-only from OIDC claim and cannot be changed | Integration | R-008 | `tests/integration/profile.test.ts` | ✅ ACTIVE |
| 2.5-INT-001 | 2.5 | `requireUser` guard: unauthenticated request to protected route → 302→/login | Integration | R-002 | `tests/integration/auth-guard.test.ts` | 🔵 TODO (Story 2.5) |
| 2.5-INT-002 | 2.5 | `requireAdmin` guard: organizer (non-admin) request to admin route → 403 | Integration | R-002, R-003 | `tests/integration/auth-guard.test.ts` | 🔵 TODO (Story 2.5) |
| 2.5-INT-003 | 2.5 | `assertOwner` guard: non-owner organizer request to owner-scoped resource → 403/404 | Integration | R-003 | `tests/integration/auth-guard.test.ts` | 🔵 TODO (Story 2.5) |
| 2.6-INT-001 | 2.6 | Session expired after 30-min inactivity → next request triggers re-auth | Integration | R-004 | `tests/integration/session-timeout.test.ts` | ✅ ACTIVE |
| 2.7-INT-001 | 2.7 | IDOR negative-test template: `testOwnershipEnforcement` helper denies non-owner access | Integration | R-003 | `tests/support/helpers/idor-template.ts` (pending) | ⬜ PLANNED (Story 2.7) |

**Total P0:** 14 scenarios — 10 implemented/active, 3 todo (Story 2.5), 1 planned (Story 2.7)

---

### P1 (High)

**Criteria:** Important foundation features + Medium risk (score 3–5) + Common workflows

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | File | Status |
| ----------- | ----- | -------------------- | ---------- | --------- | ---- | ------ |
| 2.1-E2E-002 | 2.1 | Login page renders with Thai Paraglide string and `lang="th"` attribute | E2E | — | `tests/e2e/auth.spec.ts` | 🟡 SKIP |
| 2.1-E2E-003 | 2.1 | Login redirect preserves the originally-requested URL after authentication | E2E | — | `tests/e2e/auth.spec.ts` | 🟡 SKIP |
| 2.2-UNIT-001 | 2.2 | Dev bypass requires BOTH the flag AND non-production env — static assertion | Unit/Static | R-001 | `tests/integration/auth-bypass.test.ts` | ✅ ACTIVE |
| 2.3-E2E-001 | 2.3 | Profile form renders with correct fields; email has `readonly` attribute | E2E | — | `tests/e2e/profile.spec.ts` | 🟡 SKIP (E2E dev server) |
| 2.3-INT-005 | 2.3 | Profile edit saves updated fields while keeping email immutable | Integration | R-008 | `tests/integration/profile.test.ts` | ✅ ACTIVE |
| 2.4-INT-001 | 2.4 | New authenticated user defaults to organizer role without explicit assignment | Integration | — | `tests/integration/roles.test.ts` | ✅ ACTIVE |
| 2.4-INT-002 | 2.4 | Admin flag can be set on a user record; admin-only route returns 200 for admin | Integration | — | `tests/integration/roles.test.ts` | ✅ ACTIVE |
| 2.5-INT-004 | 2.5 | `read-to-attend`: non-owner organizer can GET another organizer's event detail (200 read-only) | Integration | R-009 | `tests/integration/auth-guard.test.ts` | 🔵 TODO (Story 2.5) |
| 2.5-UNIT-001 | 2.5 | `routeGuards` registry is exported and extensible — importing and pushing a new entry is honored | Unit | R-006 | `tests/integration/auth-guard.test.ts` | 🔵 TODO (Story 2.5) |
| 2.5-INT-005 | 2.5 | Public `r/[token]` routes are explicitly allow-listed and skip auth guards | Integration | — | `tests/integration/auth-guard.test.ts` | 🔵 TODO (Story 2.5) |
| 2.6-UNIT-001 | 2.6 | Better Auth session config has `expiresIn: 1800` (30 min) — static assertion | Unit/Static | R-004 | `tests/integration/session-timeout.test.ts` | ✅ ACTIVE |
| 2.6-INT-002 | 2.6 | Session timeout is not exposed as a user-configurable setting | Integration | R-004 | `tests/integration/session-timeout.test.ts` | ✅ ACTIVE (source-code scan) |
| 2.7-INT-002 | 2.7 | Profile create mutation writes audit_log row (entity, actor_id, action, diff) | Integration | R-011 | `tests/integration/profile.test.ts` | ✅ ACTIVE (seeded in profile.test.ts) |
| 2.7-INT-003 | 2.7 | Profile update mutation writes audit_log row with correct before/after diff | Integration | R-011 | `tests/integration/profile.test.ts` | ✅ ACTIVE (seeded in profile.test.ts) |
| 2.7-INT-004 | 2.7 | Rolled-back profile update writes no audit_log row | Integration | R-011 | `tests/integration/profile.test.ts` | ✅ ACTIVE (seeded in profile.test.ts) |
| 2.1-INT-003 | 2.1 | OIDC callback does not echo `code` or `state` parameters in response | Integration | R-007 | `tests/integration/auth.test.ts` | 🟡 SKIP (needs auth route live) |
| 2.3-A11Y-001 | 2.3 | Profile form passes axe-core check (zero WCAG 2.1 AA violations) | E2E | — | `tests/e2e/profile.spec.ts` | 🟡 SKIP (E2E dev server) |

**Total P1:** 17 scenarios — 10 active, 4 todo (Story 2.5), 3 skip (pending E2E/auth activation)

---

### P2 (Medium)

**Criteria:** Secondary/edge-case coverage + Low risk (score 1–3)

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | File | Status |
| ----------- | ----- | -------------------- | ---------- | --------- | ---- | ------ |
| 2.1-INT-004 | 2.1 | OIDC error callback (invalid state) returns a user-facing error page, not a 500 | Integration | — | `tests/integration/auth.test.ts` | 🟡 SKIP |
| 2.3-INT-006 | 2.3 | Profile title field accepts all valid values (Mr / Mrs / Ms / Other + free text) | Integration | — | `tests/integration/profile.test.ts` | ✅ ACTIVE |
| 2.4-INT-003 | 2.4 | Admin flag correctly scopes admin-only routes — admin gets 200, non-admin gets 403 | Integration | — | `tests/integration/roles.test.ts` | ✅ ACTIVE |
| 2.5-INT-006 | 2.5 | Adding a new route entry to the guards registry without modifying hooks.server.ts works | Integration | R-006 | `tests/integration/auth-guard.test.ts` | 🔵 TODO (Story 2.5) |
| 2.6-INT-003 | 2.6 | Session rows for expired sessions are not returned by Better Auth on subsequent requests | Integration | R-010 | `tests/integration/session-timeout.test.ts` | 🔵 TODO (on-demand, needs introspection endpoint) |
| 2.7-UNIT-001 | 2.7 | `testOwnershipEnforcement` helper covers GET, PATCH, and DELETE HTTP methods | Unit | R-003 | `tests/support/helpers/idor-template.ts` (pending) | ⬜ PLANNED (Story 2.7) |
| 2.3-INT-007 | 2.3 | Profile form shows loading/disabled state during submission | Component | — | `tests/e2e/profile.spec.ts` | 🟡 SKIP (E2E dev server) |
| 2.1-E2E-004 | 2.1 | Login page shows actionable error message on OIDC provider unavailable | E2E | — | `tests/e2e/auth.spec.ts` | 🟡 SKIP |

**Total P2:** 8 scenarios — 2 active, 1 todo (Story 2.5), 1 todo (on-demand), 1 planned (Story 2.7), 3 skip

---

### P3 (Low) — Run on-demand only

**Criteria:** Nice-to-have, exploratory, edge conditions

| Scenario ID | Story | Description | Test Level | File | Status |
| ----------- | ----- | ----------- | ---------- | ---- | ------ |
| 2.6-INT-004 | 2.6 | Multiple concurrent sessions for the same user are each tracked and expired independently | Integration | `tests/integration/session-timeout.test.ts` | 🔵 TODO (on-demand) |
| 2.3-INT-008 | 2.3 | Profile page renders correctly on mobile viewport (≤375px) per UX-DR10 | E2E/Visual | `tests/e2e/profile.spec.ts` | 🟡 SKIP |
| 2.5-P3-001 | 2.5 | Guard dispatcher log output (pino) is emitted on every guard decision | Integration | `tests/integration/auth-guard.test.ts` | 🔵 TODO (Story 2.5, on-demand) |

**Total P3:** 3 scenarios — all todo/skip

---

## Execution Strategy

**Philosophy:** Run all functional tests on every PR if total wall-clock time stays under 15 minutes. The Epic 2 integration tests are mostly server-side (no Docker Compose cold-start required beyond the Testcontainers Postgres already established in E1), so the full P0+P1 suite is PR-gate eligible.

### PR Gate (every PR — target < 15 min)

- Lint + typecheck + svelte-check (`bun run check`)
- Vitest unit suite (P1 static assertions, unit tests)
- Vitest integration suite (P0+P1 integration tests — uses Testcontainers Postgres)
  - Active now: `auth.test.ts`, `auth-bypass.test.ts`, `profile.test.ts`, `roles.test.ts`, `session-timeout.test.ts`
  - Activates on Story 2.5: `auth-guard.test.ts` (12 todo → active)
- Playwright E2E suite (P0 E2E login/profile flows, P1 a11y) — skipped tests become active as dev server + Story 2.5 lands
- `bun run build`

**Total: ~31 scenarios currently active** — feasible in < 15 min with Playwright parallelization and Testcontainers Postgres teardown pattern from E1.

### Nightly

- P2 edge-case scenarios (8 scenarios)
- Full Docker Compose cold-start smoke (inherited from E1, confirms auth routes work through nginx)
- Dependency / vulnerability scan

### On-Demand

- P3 scenarios (visual, observability, concurrency)
- `2.6-INT-003` and `2.6-INT-004` (require test introspection endpoint or concurrent setup)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Status | Remaining Effort | Notes |
| -------- | ----- | ------ | ---------------- | ----- |
| P0 | 14 | 10 active, 4 pending | ~8–14h | Story 2.5 (3 todos) + Story 2.7 (1 planned) |
| P1 | 17 | 10 active, 7 pending | ~8–14h | Story 2.5 (4 todos) + E2E activation (3 skips) |
| P2 | 8 | 2 active, 6 pending | ~3–6h | Story 2.5 (1) + Story 2.7 (1) + E2E activation (3) + on-demand (1) |
| P3 | 3 | 0 active, 3 pending | ~2–4h | On-demand; no gate effect |
| **Total remaining** | **42** | — | **~21–38h** | **~3–5 engineering days** |

### Prerequisites for Remaining Tests

**Story 2.5 (Guard Dispatcher) — ~14–24h remaining work:**
- `auth-guard.test.ts` convert 12 `test.todo()` → active tests + implementation
- `routeGuards` exported registry pattern in `hooks.server.ts`
- `requireUser`, `requireAdmin`, `assertOwner` guards implemented
- `read-to-attend` permission model

**Story 2.7 (IDOR Template + Audit Mutations) — ~8–14h remaining:**
- `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement(route, seedFn)` helper
- `2.7-INT-001` — one parameterized IDOR proof
- Formally close `2.7-INT-002/003/004` audit tests (already seeded in `profile.test.ts`)

**E2E Activation (auth.spec.ts + profile.spec.ts — 23 skipped tests):**
- `AUTH_DEV_BYPASS=true` dev server running during Playwright tests
- Profile form E2E tests require Story 2.3 dev server running
- Full OIDC E2E flow requires live Authentik (or continue using dev-bypass mock)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (zero exceptions — any P0 failure blocks merge)
- **P1 pass rate:** ≥95% (each failure requires triage comment with owner)
- **P2/P3 pass rate:** ≥90% (informational; failures do not block merge but are tracked)
- **Security mitigations (R-001 through R-003):** R-001 COMPLETE; R-002/R-003 must be Complete before Epic 2 is closed

### Coverage Targets

- **Auth guard paths (critical):** 100% — unauthenticated, admin-only, owner-scoped, and public routes all tested (pending Story 2.5)
- **Dev bypass safety:** 100% — both bypass-enabled and bypass-disabled scenarios confirmed ✅
- **Audit trail (Epic 2 mutations):** 100% — profile create, profile update, rollback path ✅ (seeded in profile.test.ts)
- **IDOR negative-test template:** Template exists and one usage proven before Epic 2 closes (pending Story 2.7)

### Non-Negotiable Requirements

- [x] R-001 (dev bypass in production) — `auth-bypass.test.ts` green ✅
- [x] R-004 (session timeout) — `2.6-INT-001` passing ✅
- [x] R-005 (profile gate) — `2.3-INT-001/002/003` passing ✅
- [x] Audit-log writes on Epic 2 mutations — `2.7-INT-002/003/004` seeded and passing in profile.test.ts ✅
- [ ] All P0 tests pass (zero failures) before Epic 2 is marked done
- [ ] R-002 (guard dispatcher coverage) — all `(app)` routes redirect unauthenticated requests (Story 2.5)
- [ ] R-003 (IDOR template) — `testOwnershipEnforcement` helper in `tests/support/helpers/` and green (Story 2.7)
- [ ] R-006 (guard dispatcher extensibility) — `2.5-UNIT-001` green and code review sign-off (Story 2.5)
- [ ] CI pipeline stays green (no regression to E1 tests)

---

## Assumptions and Dependencies

### Assumptions

1. `AUTH_DEV_BYPASS` is the actual env var name for the dev login bypass — confirmed in Story 2.2 ✅
2. Better Auth stores sessions in a Drizzle-managed `session` table in Postgres; integration tests can directly mutate `expires_at` to simulate timeout — confirmed in Story 2.6 ✅
3. The guard dispatcher is implemented in `src/hooks.server.ts` as a named, exported `routeGuards` array/map — this is an architecture AC that Story 2.5 must satisfy for R-006 mitigation.
4. The dev bypass seeded user has a known `id` and `email` (fixed test fixture) — confirmed in `auth-bypass.test.ts` and `dev-bypass.ts` helper ✅
5. No Thai text is hardcoded in profile form components — all strings flow through Paraglide (per project memory rule; Rawinan handles Thai translations).
6. Better Auth's `svelteKitHandler` + `sveltekitCookies` plugin is the session mechanism; tests assert session presence on `event.locals` — confirmed in Story 2.1/2.2 implementation ✅
7. The Testcontainers Postgres setup from E1 (`tests/support/fixtures/pg-factory.ts`, `testcontainers-context.ts`) is reusable for Epic 2 integration tests — confirmed ✅

### Dependencies

1. **Epic 1 (done)** ✅ — scaffold, Drizzle, test harness, CI pipeline, audit-log write hook all in place.
2. **Story 2.2 (done)** ✅ — `AUTH_DEV_BYPASS` seam implemented; `tests/support/helpers/dev-bypass.ts` available for all downstream tests.
3. **Story 2.5 (backlog)** — P0 guard tests depend on the dispatcher being in place; `auth-guard.test.ts` has 12 `test.todo()` stubs ready.
4. **Story 2.7 (backlog)** — IDOR template helper; `tests/support/helpers/idor-template.ts` must be created.
5. **`tests/support/helpers/idor-template.ts`** — to be created in Story 2.7; E3–E7 ATDD checklists will reference this file.

### Risks to Plan

- **Risk:** `auth-bypass.test.ts` `test.skipIf` tests (production guard) require `DEV_SERVER_NO_BYPASS_URL` and `DEV_SERVER_PRODUCTION_URL` env vars that may not be set in standard CI. These two sub-cases of R-001 mitigation are effectively conditional until those URLs are configured.
  - **Impact:** R-001 production-guard verification is incomplete without these env vars.
  - **Contingency:** Configure `DEV_SERVER_PRODUCTION_URL` in CI secrets using a test-only server instance with `NODE_ENV=production`; or mock the production env check at the unit level with `2.2-UNIT-001`.

- **Risk:** E2E tests in `auth.spec.ts` and `profile.spec.ts` (23 skipped) require a running dev server with `AUTH_DEV_BYPASS=true`. This may not be available in CI without a dedicated Playwright dev-server setup.
  - **Impact:** P1 E2E tests (Thai i18n, profile form rendering, a11y) are not validated in CI.
  - **Contingency:** Add `webServer` config to `playwright.config.ts` to auto-start `bun dev` with bypass env before E2E runs; tracked as part of Story 2.5/E2E activation work.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **E1 audit-log write hook** | Epic 2 profile mutations call `writeAuditLog` — if the hook signature changes, `2.7-INT-002/003/004` in `profile.test.ts` break | Must remain green whenever `audit.ts` is modified |
| **`hooks.server.ts` guard dispatcher** | Every story in E3–E7 that adds a new route will push to the guards registry; any change to the dispatcher format breaks all registered guards | `2.5-INT-001/002/003/004` must remain green; regression run triggered by any `hooks.server.ts` change |
| **Dev bypass (`AUTH_DEV_BYPASS`)** | All integration test fixtures in E3–E7 rely on `dev-bypass.ts` helper as the test seam | `2.2-INT-001/002` must remain green; `getDevBypassCookie()` API must not change signature |
| **Better Auth session schema** | Drizzle migration changes to the `session` table must not break session creation or expiry tests | `2.1-INT-002`, `2.6-INT-001` must remain green; migration change triggers full auth integration re-run |
| **Profile schema** | E6 (Story 6.4) prefills internal registration from the profile; a schema change to `user_profiles` breaks the E6 prefill path | `2.3-INT-002/005` must remain green; profile schema changes trigger E6 regression |
| **E1 CI pipeline** | E1 CI gates (lint, typecheck, Vitest, Playwright, build) must continue passing with Epic 2 code added | Full CI run required on every Epic 2 PR; no regression to E1 unit/integration tests |

---

## Follow-on Workflows

- **Story 2.5:** Run `*atdd` for Story 2.5 to convert `auth-guard.test.ts` todo stubs into full test implementations and generate Story 2.5 ATDD checklist.
- **Story 2.7:** Run `*atdd` for Story 2.7 to create `tests/support/helpers/idor-template.ts` and the `2.7-INT-001` IDOR proof; the profile audit tests (`2.7-INT-002/003/004`) are already seeded in `profile.test.ts` — they need to be formally closed in the Story 2.7 ATDD checklist.
- **E2E Activation:** After Story 2.5 lands and `playwright.config.ts` has a `webServer` setup, run `*automate` to activate the 23 skipped E2E tests.
- **After Epic 2 is complete:** Run `*nfr-assess` with evidence (CI report, security test results) to produce the first Security NFR PASS/CONCERNS/FAIL assessment.
- **Reusable IDOR template:** `tests/support/helpers/idor-template.ts` should be referenced in ATDD checklists for E3, E4, E5, and E6 stories involving owner-scoped resources.

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
- **Story 2.1 ATDD:** `_bmad-output/test-artifacts/atdd-checklist-2-1-sign-in-with-authentik-oidc.md`
- **Story 2.3 ATDD:** `_bmad-output/test-artifacts/atdd-checklist-2-3-self-service-profile.md`
- **Story 2.6 ATDD:** `_bmad-output/test-artifacts/atdd-checklist-2-6-fixed-session-timeout.md`
- **IDOR Template (to be created):** `tests/support/helpers/idor-template.ts` (Story 2.7)

### Risk Score Legend

| Score | Action | Gate Effect |
| ----- | ------ | ----------- |
| 9 | BLOCK | Automatic FAIL — must resolve before shipping |
| 6–8 | MITIGATE | CONCERNS — must have mitigation plan before merge |
| 4–5 | MONITOR | Watch; plan mitigations proactively |
| 1–3 | DOCUMENT | Awareness only |

### Test File Inventory (Epic 2)

| File | Tests | Skipped/Todo | Status |
| ---- | ----- | ------------ | ------ |
| `tests/integration/auth.test.ts` | 8 | 7 skip | Story 2.1 — 1 active; 7 skip pending Story 2.5 activation |
| `tests/integration/auth-bypass.test.ts` | ~12 | 2 `skipIf` | Story 2.2 — fully active; 2 env-conditional |
| `tests/integration/auth-guard.test.ts` | 12 | 12 todo | Story 2.5 — all `test.todo()` awaiting implementation |
| `tests/integration/profile.test.ts` | ~21 | 0 | Story 2.3 — all active and passing |
| `tests/integration/roles.test.ts` | ~9 | 0 | Story 2.4 — all active and passing |
| `tests/integration/session-timeout.test.ts` | 7 | 2 todo | Story 2.6 — P0+P1 passing; 2 P2/P3 todos |
| `tests/e2e/auth.spec.ts` | 9 | 11 skip | Story 2.1/2.5 — mostly skipped; need dev server + Story 2.5 |
| `tests/e2e/profile.spec.ts` | ~9 | 12 skip | Story 2.3 — all skipped; need dev server activation |
| `tests/support/helpers/dev-bypass.ts` | N/A | — | Story 2.2 — `getDevBypassCookie()` seam created |
| `tests/support/helpers/idor-template.ts` | — | — | Story 2.7 — NOT YET CREATED |

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
**Epic:** 2 — Identity & Access
**Mode:** Epic-Level
**Revision:** v2 (2026-06-12) — Updated post Stories 2.1, 2.2, 2.3, 2.4, 2.6 completion (PRs #107–110).
  Stories 2.5 (guard dispatcher) and 2.7 (IDOR template) remain backlog.
  R-001, R-004, R-005 risks mitigated. R-002, R-003, R-006 open pending Stories 2.5/2.7.
  Test inventory updated: 6 active test files, 23 E2E tests still skipped, 12 auth-guard todos.
  Dev bypass seam (`tests/support/helpers/dev-bypass.ts`) confirmed created and active.
