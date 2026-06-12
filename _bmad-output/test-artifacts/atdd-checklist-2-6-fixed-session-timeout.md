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
storyId: '2.6'
storyKey: 2-6-fixed-session-timeout
storyFile: _bmad-output/planning-artifacts/epics.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-2-6-fixed-session-timeout.md
generatedTestFiles:
  - tests/integration/session-timeout.test.ts
workflowStatus: completed
tddPhase: RED
---

# ATDD Checklist: Story 2.6 — Fixed Session Timeout

**Story:** 2.6 — Fixed Session Timeout
**Date:** 2026-06-11
**TDD Phase:** RED (all scaffolds skipped — activate task-by-task)
**Stack:** fullstack (SvelteKit + Drizzle + Vitest + Playwright)
**Execution Mode:** SEQUENTIAL (API — no new E2E needed)

---

## Story Acceptance Criteria

**Given** an authenticated session idle for the fixed 30-minute default
**When** the next request is made
**Then** the session is expired and re-authentication is required
**And** the timeout is not exposed as a configurable setting.

---

## TDD Red Phase Status

All integration test scaffolds marked `test.skip()` are RED phase — they will FAIL when
activated until the feature is implemented. The two UNIT tests (2.6-UNIT-001, 2.6-UNIT-003)
are already ACTIVATED (no `test.skip()`) because the auth config was implemented in Story 2.1.

| Test File | Tests | Phase | Status |
|-----------|-------|-------|--------|
| `tests/integration/session-timeout.test.ts` | 7 | RED/GREEN mix | 2 activated; 5 `test.skip()` |
| **Total** | **7** | RED | **5 skipped, 2 activated** |

---

## Acceptance Criteria Coverage

| AC | Description | Test ID(s) | Level | Priority |
|----|-------------|-----------|-------|----------|
| AC-1 | Session expired after 30-min idle → 302 to /login (re-auth) | 2.6-INT-001, 2.6-INT-001b | Integration | P0 |
| AC-2 | Timeout not exposed as configurable setting | 2.6-UNIT-001, 2.6-UNIT-002, 2.6-UNIT-003, 2.6-INT-002 | Unit + Integration | P1 |

**Coverage:** 2/2 acceptance criteria covered (100%)

---

## Test Scenario Inventory

### Integration + Unit Tests (`tests/integration/session-timeout.test.ts`)

| Test ID | Description | AC | Priority | Status | Activation Task |
|---------|-------------|-----|----------|--------|----------------|
| 2.6-UNIT-001 | `session.expiresIn === 1800` — static config assertion | AC-2 | P1 | ACTIVATED | Story 2.1 Task 1.4 (already done) |
| 2.6-UNIT-002 | `session.expiresIn` not derived from env var | AC-2 | P1 | ACTIVATED | Story 2.1 Task 1.4 (already done) |
| 2.6-UNIT-003 | No env var exists for session timeout | AC-2 | P1 | ACTIVATED | Immediate — static assertion |
| 2.6-INT-001 | Expired session token → 302 to /login | AC-1 | P0 | `test.skip()` | Story 2.1 complete (auth guard active) |
| 2.6-INT-001b | Fresh session token (29 min) → NOT redirected to /login | AC-1 | P0 | `test.skip()` | Story 2.1 complete |
| 2.6-INT-002 | Settings routes do not expose session timeout as editable field | AC-2 | P1 | `test.skip()` | When any settings route exists (Epic 7) |
| 2.6-INT-003 | Expired session → `event.locals.session` is null | AC-1 | P2 | `test.skip()` | Test introspection endpoint needed |
| 2.6-INT-004 | Two concurrent sessions: expired one rejected, fresh one accepted | AC-1 | P3 | `test.skip()` | Story 2.1 complete (on-demand) |

---

## Note on 2.1-UNIT-001 Overlap

The existing `tests/integration/auth.test.ts` contains `2.1-UNIT-001` which is already
ACTIVATED and tests `session.expiresIn === 1800`. Story 2.6 adds:
- `2.6-UNIT-001`: same core assertion in the story-2.6 test file (duplicate guard)
- `2.6-UNIT-002`: extends to assert env-var independence
- `2.6-UNIT-003`: static env-key scan (new — not in 2.1)

This is intentional: story 2.6 is the canonical owner of FR-093 session-timeout behavior.
The 2.1-UNIT-001 test in auth.test.ts remains as an early regression guard.

---

## Task-by-Task Activation Guide

### Immediate (Story 2.1 already done)

`2.6-UNIT-001`, `2.6-UNIT-002`, `2.6-UNIT-003` are already ACTIVATED (no `test.skip()`).
Run `bun run test:integration` to confirm they pass now.

### After Story 2.1 Complete (auth guard active in hooks.server.ts)

```
tests/integration/session-timeout.test.ts → 2.6-INT-001 (expired session → 302)
tests/integration/session-timeout.test.ts → 2.6-INT-001b (fresh session → NOT 302)
```

Remove `test.skip(` → `test(` in the 2.6-INT-001 and 2.6-INT-001b blocks.
Verify the test FAILS first (red), then implement story 2.6, verify it PASSES (green).

### Story 2.6 Implementation Note

Story 2.6 is a verification story — Better Auth already enforces `expiresAt` at the DB
level. The primary implementation task is:
1. Confirm `session.expiresIn: 1800` is set in `src/lib/server/auth/index.ts` (done in Story 2.1)
2. Confirm the auth guard in `hooks.server.ts` correctly rejects expired sessions
3. Activate and pass 2.6-INT-001 and 2.6-INT-001b

### When /settings Route Exists (Epic 7+)

```
tests/integration/session-timeout.test.ts → 2.6-INT-002 (no timeout in settings)
```

### On-Demand (P2/P3)

```
tests/integration/session-timeout.test.ts → 2.6-INT-003 (requires debug introspection endpoint)
tests/integration/session-timeout.test.ts → 2.6-INT-004 (concurrent sessions, P3)
```

---

## Fixture Needs

| Fixture | Needed For | Story |
|---------|-----------|-------|
| `seedExpiredSession()` | 2.6-INT-001, 2.6-INT-003, 2.6-INT-004 | Inline helper in session-timeout.test.ts |
| `truncateBetterAuthTables()` | All integration tests (cleanup) | Inline helper (same as auth.test.ts) |
| Test introspection endpoint `/api/test/session-status` | 2.6-INT-003 | Story 2.6 task (dev-only, guarded by NODE_ENV) |

---

## Risk Coverage

| Risk ID | Description | Test(s) Covering |
|---------|-------------|-----------------|
| R-004 | Session does not expire after 30 minutes — sessions table row stays but guard lets it through | 2.6-INT-001, 2.6-INT-001b |
| R-010 | Expired session rows returned by Better Auth on subsequent requests | 2.6-INT-003 |
| FR-093 violation | session.expiresIn accidentally made configurable via env var | 2.6-UNIT-001, 2.6-UNIT-002, 2.6-UNIT-003 |

---

## Quality Gates

### Before Story 2.6 can be marked done

- [ ] 2.6-UNIT-001 passing (session.expiresIn === 1800)
- [ ] 2.6-UNIT-002 passing (env-var independence)
- [ ] 2.6-UNIT-003 passing (no forbidden env keys)
- [ ] 2.6-INT-001 passing (expired session → 302 to /login)
- [ ] 2.6-INT-001b passing (fresh session → NOT redirected)
- [ ] `bun run lint` exit 0
- [ ] `bun run check` exit 0
- [ ] `bun run test:integration` exit 0 (new session-timeout tests pass; no regression on auth.test.ts)
- [ ] `bun run build` exit 0

---

## Key Constraints (anti-patterns to avoid during implementation)

1. **NO configurable session timeout** — FR-093: hard-code `expiresIn: 1800`, never read from env
2. **NO Thai text hardcoded** — all UI strings via Paraglide m.*() keys; Rawinan handles translations
3. **NO SESSION_TIMEOUT env var** — adding one violates FR-093 and will fail 2.6-UNIT-003
4. **NO credential literals in any committed file** — use GH Secrets for auth env vars
5. **Test introspection endpoint** (for 2.6-INT-003) must be guarded: only active when
   `AUTH_DEV_BYPASS=true` AND `NODE_ENV !== 'production'`

---

## ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-2-6-fixed-session-timeout.md`
- **Integration + unit tests:** `tests/integration/session-timeout.test.ts`
- **Story context:** `_bmad-output/planning-artifacts/epics.md` (Story 2.6 section)
- **Epic 2 test design:** `_bmad-output/test-artifacts/test-design/test-design-epic-2.md`
- **Related test file (Story 2.1):** `tests/integration/auth.test.ts` (contains 2.1-UNIT-001)

---

## E2E Coverage

No new E2E tests are added for Story 2.6. The session expiry behavior is tested at the
integration level (HTTP requests with expired session cookies). If a UI-level regression
guard is needed, the existing `tests/e2e/auth.spec.ts` covers unauthenticated redirect
behavior which indirectly covers expired-session redirect.

---

**Generated by:** BMad TEA Agent — ATDD Module
**Workflow:** `bmad-testarch-atdd`
**Story:** 2.6 — Fixed Session Timeout
**Mode:** Create (AI generation, sequential)
**Stack:** fullstack
**Execution Mode:** SEQUENTIAL (integration tests only; no new E2E)
**Revision:** v1 (2026-06-11) — Initial red-phase scaffold generation.
  7 tests in 1 file: 3 immediately activated unit assertions; 4 integration `test.skip()` scaffolds.
  Both ACs covered. P0 session-expiry test (2.6-INT-001) red-phase ready for Story 2.1 activation.
