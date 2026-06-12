---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-11'
storyId: '2.3'
storyKey: 2-3-self-service-profile
storyFile: _bmad-output/implementation-artifacts/2-3-self-service-profile.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-2-3-self-service-profile.md
generatedTestFiles:
  - tests/integration/profile.test.ts
  - tests/e2e/profile.spec.ts
workflowStatus: completed
tddPhase: RED
---

# ATDD Checklist: Story 2.3 — Self-service Profile

**Story:** 2.3 — Self-service Profile
**Date:** 2026-06-11
**TDD Phase:** RED (all scaffolds skipped — activate task-by-task)
**Stack:** fullstack (SvelteKit + Drizzle + Vitest + Playwright)
**Execution Mode:** SEQUENTIAL (Integration → E2E)

---

## Summary

| Category | Count |
| -------- | ----- |
| Integration tests (Vitest) | 12 |
| E2E tests (Playwright) | 9 |
| **Total scaffolds** | **21** |
| Test files created | 2 |
| TDD Phase | RED (all `test.skip()`) |

---

## Stack Detection

- **Detected Stack:** `fullstack`
- **Frontend indicators:** `package.json` with SvelteKit, `playwright.config.ts`, `vite.config.ts`
- **Backend indicators:** Drizzle ORM, PostgreSQL, Vitest integration project
- **Test Framework:** Vitest (integration) + Playwright (E2E)
- **Playwright Utils:** `tea_use_playwright_utils: true` (Full UI+API profile)

---

## Prerequisites Verified

- [x] Story story has clear acceptance criteria (AC-1 through AC-9)
- [x] `playwright.config.ts` exists
- [x] `vite.config.ts` integration project configured
- [x] `tests/support/fixtures/pg-factory.ts` exists (pgFactory pattern from Story 1.8)
- [x] `tests/support/integration-setup.ts` — Testcontainers / CI Postgres setup
- [x] Story 2.1 ATDD checklist completed (auth guard pattern available)
- [ ] Story 2.2 merged (dev bypass seam — required for HTTP-level session tests)
- [ ] `user_profiles` table migration (Task 1) applied before integration tests activate
- [ ] `profile-service.ts` created (Task 3) before audit log tests activate
- [ ] `/profile/complete` route created (Task 5) before profile form tests activate

---

## Risk Coverage

| Risk ID | Description | Test Scenarios | Priority |
| ------- | ----------- | -------------- | -------- |
| R-005 | Profile gate bypass | 2.3-INT-001, 2.3-INT-001b, 2.3-E2E-005 | P0 |
| R-008 | Email mutability via POST body | 2.3-INT-004, 2.3-INT-005 | P0/P1 |
| R-011 | Audit log missing on profile mutations | 2.7-INT-002, 2.7-INT-003, 2.7-INT-004 | P1 |

---

## Integration Test Scaffolds (`tests/integration/profile.test.ts`)

### P0 — Critical (blocks core journey)

| Scenario ID | AC | Description | Activation Task |
| ----------- | -- | ----------- | --------------- |
| 2.3-INT-001 | AC-1, AC-9 | GET /dashboard with incomplete-profile session → 302 to /profile/complete | Task 4 (hooks guard) |
| 2.3-INT-001b | AC-4 | Completed-profile user not redirected to /profile/complete | Tasks 3+4 |
| 2.3-INT-002 | AC-3 | Valid POST /profile/complete → user_profiles row created; dashboard accessible | Task 5.1 |
| 2.3-INT-003 | AC-5 | POST with empty firstName → 422; no profile row created | Task 5 |
| 2.3-INT-003b | AC-5 | POST with all fields empty → 422; no profile row created | Task 5 |
| 2.3-INT-004 | AC-7 | POST with email override → stored email unchanged (OIDC email preserved) | Task 5 |
| 2.3-INT-004c | AC-4 | GET /profile/complete with completed profile → redirect to dashboard | Task 5.1 |

### P1 — High (important, non-blocking)

| Scenario ID | AC | Description | Activation Task |
| ----------- | -- | ----------- | --------------- |
| 2.3-INT-005 | AC-6, AC-7 | POST /profile edit with new phone → phone updated; email unchanged | Task 6 |
| 2.7-INT-002 | AC-8 | Profile create → audit_log row with entity=user_profile, action=create | Tasks 3+5 |
| 2.7-INT-003 | AC-8 | Profile update → audit_log row with action=update; diff contains changed field | Tasks 3+6 |
| 2.7-INT-004 | AC-8 | DB error mid-transaction → audit_log count unchanged (atomic rollback) | Task 3 |

### P2 — Medium (edge case)

| Scenario ID | AC | Description | Activation Task |
| ----------- | -- | ----------- | --------------- |
| 2.3-INT-006 | AC-3 | POST with each valid title (Mr., Mrs., Ms., Other) → all accepted | Tasks 2+5 |

---

## E2E Test Scaffolds (`tests/e2e/profile.spec.ts`)

### P1 — High

| Scenario ID | AC/NFR | Description | Activation Task |
| ----------- | ------- | ----------- | --------------- |
| 2.3-E2E-001 | AC-2 | /profile/complete renders all fields; email has readonly attribute | Task 5.2 |
| 2.3-E2E-001b | AC-2 | Mutable fields are empty on initial load | Task 5.2 |
| 2.3-E2E-001c | AC-3 | Valid form fill + submit → redirect to /dashboard | Tasks 5.1+5.2 |
| 2.3-E2E-002 | AC-5 | Submit with empty firstName → inline error visible; no navigation | Task 5.2 |
| 2.3-E2E-004 | AC-6 | /profile edit renders pre-filled fields; email readonly | Task 6.2 |
| 2.3-A11Y-001 | NFR-007 | Profile completion form: zero axe-core WCAG 2.1 AA violations | Task 5.2 |
| 2.3-A11Y-002 | NFR-007 | Profile edit form: zero axe-core WCAG 2.1 AA violations | Task 6.2 |
| 2.3-E2E-005 | AC-1 | Navigate to /dashboard as incomplete-profile user → lands on /profile/complete | Task 4 |
| 2.3-E2E-006 | WCAG 2.4.2 | /profile/complete has non-empty descriptive <title> element | Task 5.2 |

### P2 — Medium

| Scenario ID | AC/NFR | Description | Activation Task |
| ----------- | ------- | ----------- | --------------- |
| 2.3-INT-007 | UXD-020 | Submit button is disabled/loading state during in-flight POST | Task 5.2 |

---

## AC Coverage Matrix

| AC | Description | Integration Tests | E2E Tests |
| -- | ----------- | ----------------- | --------- |
| AC-1 | Incomplete profile → redirect to /profile/complete | 2.3-INT-001 | 2.3-E2E-005 |
| AC-2 | Email pre-filled read-only; other fields empty/editable | — | 2.3-E2E-001, 2.3-E2E-001b |
| AC-3 | Valid submission → profile created; redirect to dashboard | 2.3-INT-002, 2.3-INT-006 | 2.3-E2E-001c |
| AC-4 | Completed profile → redirect from /profile/complete to dashboard | 2.3-INT-001b, 2.3-INT-004c | — |
| AC-5 | Missing required field → 422; field-level errors; no row created | 2.3-INT-003, 2.3-INT-003b | 2.3-E2E-002 |
| AC-6 | Profile edit: mutable fields editable; email read-only | 2.3-INT-005 | 2.3-E2E-004 |
| AC-7 | POST body email override silently ignored | 2.3-INT-004, 2.3-INT-005 | — |
| AC-8 | Audit log written atomically on create/update | 2.7-INT-002, 2.7-INT-003, 2.7-INT-004 | — |
| AC-9 | Incomplete profile blocked from /bookings, /dashboard, /calendar | 2.3-INT-001 (covers /bookings) | 2.3-E2E-005 |

---

## TDD Activation Guide

Tests are activated task-by-task during implementation. Use `test.skip(` → `test(` for each:

**Task 1 (DB migration — user_profiles table):**
- No tests activate yet; prerequisite for all below.
- After Task 1.4: update `TRUNCATABLE_TABLES` in `tests/support/fixtures/pg-factory.ts` to include `'user_profiles'`.

**Task 2 (sveltekit-superforms + Valibot schema):**
- No tests activate yet; enables validation in Tasks 5/6.

**Task 3 (profile service):**
- Activate: `2.7-INT-004` (atomic rollback via direct service import)

**Task 4 (hooks.server.ts profile gate):**
- Activate: `2.3-INT-001`, `2.3-INT-001b`
- Activate E2E: `2.3-E2E-005`

**Task 5 (/profile/complete route + form):**
- Activate: `2.3-INT-002`, `2.3-INT-003`, `2.3-INT-003b`, `2.3-INT-004`, `2.3-INT-004c`
- Activate E2E: `2.3-E2E-001`, `2.3-E2E-001b`, `2.3-E2E-001c`, `2.3-E2E-002`, `2.3-A11Y-001`, `2.3-E2E-006`, `2.3-INT-007`

**Tasks 3+5 (profile service + form action):**
- Activate: `2.7-INT-002`

**Task 6 (/profile edit route + form):**
- Activate: `2.3-INT-005`
- Activate E2E: `2.3-E2E-004`, `2.3-A11Y-002`

**Tasks 3+6 (profile service + edit route):**
- Activate: `2.7-INT-003`

**Task 2 (schema) + Task 5 (form):**
- Activate: `2.3-INT-006`

---

## Quality Gates

- [ ] All P0 integration tests pass before Tasks 1–5 are closed
- [ ] 2.3-INT-001 (profile gate) must pass before any further story 2.x integration tests run
- [ ] `2.3-INT-004` (email immutability) must pass — R-008 mitigation required before merge
- [ ] `2.7-INT-002/003/004` audit log tests must pass — R-011 mitigation required
- [ ] `2.3-A11Y-001` axe-core zero violations on profile completion form — NFR-007
- [ ] `bun run test:integration` exit 0 — no regressions to Story 2.1 tests
- [ ] `bun run test:e2e` exit 0 — no regressions to prior E2E suite

---

## Test Infrastructure Notes

**Session seeding pattern** (same as Story 2.1 `auth.test.ts`):
- Direct SQL INSERT into `users` + `sessions` tables via `pg.Pool`
- Session token used as `better-auth.session_token` cookie value
- Relies on dev server running at `DEV_SERVER_URL` (default: `http://localhost:3000`)

**`user_profiles` table must be added to `TRUNCATABLE_TABLES`** in `tests/support/fixtures/pg-factory.ts`:
```ts
// Add after 'verifications', before 'users' (FK child before parent):
'user_profiles',
```

**Direct service import for transaction atomicity test** (`2.7-INT-004`):
- Imports `createProfile` from `../../src/lib/server/services/profile-service.js`
- Requires `DATABASE_URL` set (integration project) — not a unit test
- Tests that DB transaction rollback prevents audit_log row from being written

**Dev bypass for E2E tests**:
- `POST /r/dev-bypass?profileComplete=false` → seeds user with no profile row
- `POST /r/dev-bypass?profileComplete=true` → seeds user with completed profile row
- `AUTH_DEV_BYPASS=true` required in dev server env

---

## Files Modified / Created

| File | Action | Notes |
| ---- | ------ | ----- |
| `tests/integration/profile.test.ts` | **CREATED** | 12 integration test scaffolds (all `test.skip()`) |
| `tests/e2e/profile.spec.ts` | **CREATED** | 9 E2E test scaffolds (all `test.skip()`) |
| `tests/support/fixtures/pg-factory.ts` | **TO UPDATE** | Add `'user_profiles'` to `TRUNCATABLE_TABLES` (Task 1.4) |

---

## Generated By

**Tool:** BMad TEA ATDD Workflow
**Workflow:** `bmad-testarch-atdd`
**Mode:** Sequential (API + E2E)
**TDD Phase:** RED
**Story:** 2.3 — Self-service Profile
**Date:** 2026-06-11
