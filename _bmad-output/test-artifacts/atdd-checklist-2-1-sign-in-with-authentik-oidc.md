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
storyId: '2.1'
storyKey: 2-1-sign-in-with-authentik-oidc
storyFile: _bmad-output/implementation-artifacts/2-1-sign-in-with-authentik-oidc.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-2-1-sign-in-with-authentik-oidc.md
generatedTestFiles:
  - tests/integration/auth.test.ts
  - tests/integration/auth-guard.test.ts
  - tests/e2e/auth.spec.ts
workflowStatus: completed
tddPhase: RED
---

# ATDD Checklist: Story 2.1 — Sign in with Authentik (OIDC)

**Story:** 2.1 — Sign in with Authentik (OIDC)
**Date:** 2026-06-11
**TDD Phase:** RED (all scaffolds skipped — activate task-by-task)
**Stack:** fullstack (SvelteKit + Drizzle + Vitest + Playwright)
**Execution Mode:** SEQUENTIAL (API → E2E)

---

## TDD Red Phase Status

All test scaffolds are marked `test.skip()` (integration) or `test.skip()` (E2E).
They will **FAIL** when activated until the feature is implemented — that is the intent.

| Test File | Tests | Phase | Status |
|-----------|-------|-------|--------|
| `tests/integration/auth.test.ts` | 7 | RED | All `test.skip()` |
| `tests/integration/auth-guard.test.ts` | 7 | RED | All `test.todo()` (Story 2.5 stubs) |
| `tests/e2e/auth.spec.ts` | 9 | RED | All `test.skip()` |
| **Total** | **23** | RED | **All skipped** |

---

## Acceptance Criteria Coverage

| AC | Description | Test ID(s) | Level | Priority |
|----|-------------|-----------|-------|----------|
| AC-1 | Unauthenticated (app) route → 302 to /login | 2.1-INT-001, 2.1-E2E-LOGIN-002 | Integration + E2E | P0 |
| AC-2 | "Sign in" initiates PKCE flow via Better Auth | 2.1-E2E-LOGIN-001, 2.1-E2E-LOGIN-003, 2.1-E2E-001 | E2E | P0 |
| AC-3 | OIDC callback → DB session row created; on event.locals | 2.1-E2E-001, 2.1-INT-002 | E2E + Integration | P0 |
| AC-4 | Sign out destroys session; subsequent (app) request → 302 | 2.1-INT-002 | Integration | P0 |
| AC-5 | No (app) route reachable without valid session | 2.1-INT-001, 2.1-INT-001b | Integration | P0 |
| AC-6 | OIDC callback does not echo code/state params | 2.1-INT-003 | Integration | P1 |

**Coverage:** 6/6 acceptance criteria covered (100%)

---

## Test Scenario Inventory

### Integration Tests (`tests/integration/auth.test.ts`)

| Test ID | Description | AC | Priority | Activation Task |
|---------|-------------|-----|----------|----------------|
| 2.1-INT-001 | Unauthenticated GET to (app) route → 302 to /login | AC-1, AC-5 | P0 | Task 2.3 (handleAuthGuard) |
| 2.1-INT-001b | Nested (app) route also redirects 302 | AC-5 | P0 | Task 2.3 |
| 2.1-INT-001c | /login accessible without session (no redirect loop) | AC-1 | P1 | Task 3.3 (login page) |
| 2.1-INT-001d | /auth/** accessible without session (OIDC callback receiver) | AC-2 | P1 | Task 3.1 (auth route) |
| 2.1-INT-002 | POST /auth/sign-out destroys DB session; subsequent GET → 302 | AC-4 | P0 | Task 1.3 + Task 2.2 + Task 3.1 (needs Story 2.2 dev bypass) |
| 2.1-INT-003 | OIDC callback does not echo code or state params | AC-6 | P1 | Task 3.1 (auth route) |
| 2.1-INT-004 | OIDC callback with invalid state → 4xx, not 500 | AC-6, UX | P2 | Task 3.1 |
| 2.1-UNIT-001 | auth config session.expiresIn === 1800 (FR-093) | AC-3 | P1 | Task 1.4 (auth/index.ts) |

### Integration Tests — Guard Stubs (`tests/integration/auth-guard.test.ts`)

| Test ID | Description | AC | Priority | Activation Story |
|---------|-------------|-----|----------|-----------------|
| 2.5-INT-001 | requireUser guard: unauthenticated → 302→/login | 2.5 AC | P0 | Story 2.5 |
| 2.5-INT-002 | requireAdmin guard: organizer → 403 on admin route | 2.5 AC | P0 | Story 2.5 |
| 2.5-INT-003 | assertOwner guard: non-owner → 403/404 | 2.5 AC | P0 | Story 2.5 |
| 2.5-INT-004 | read-to-attend: non-owner organizer can read event | 2.5 AC | P1 | Story 2.5 |
| 2.5-INT-005 | Public r/[token] routes skip auth guards | 2.5 AC | P1 | Story 2.5 |
| 2.5-UNIT-001 | routeGuards exported and extensible (R-006) | 2.5 AC | P1 | Story 2.5 |

### E2E Tests (`tests/e2e/auth.spec.ts`)

| Test ID | Description | AC | Priority | Activation Task |
|---------|-------------|-----|----------|----------------|
| 2.1-E2E-001 | Full OIDC PKCE flow → DB session created | AC-2, AC-3 | P0 | Task 3.2 + Story 2.2 dev bypass |
| 2.1-E2E-LOGIN-001 | Login page renders with Sign in button | AC-2 | P0 | Task 3.3 (login page) |
| 2.1-E2E-LOGIN-002 | Unauthenticated (app) visit → redirected to login | AC-1 | P0 | Task 2.3 + Task 3.3 |
| 2.1-E2E-LOGIN-003 | Clicking Sign in initiates OIDC redirect | AC-2 | P0 | Task 3.3 + Task 2.2 |
| 2.1-E2E-002 | Login page renders with Paraglide i18n + html[lang] | NFR-006 | P1 | Task 3.3 |
| 2.1-E2E-002b | Login page has no hardcoded strings (all via Paraglide) | NFR-006 | P1 | Task 3.3 |
| 2.1-E2E-003 | Login redirect preserves originally-requested URL | UX | P1 | Task 2.3 + Story 2.2 |
| 2.1-E2E-004 | Login shows error on OIDC provider unavailable (UX-DR8) | UX | P2 | Task 3.3 |
| 2.1-E2E-A11Y | Login page zero axe-core WCAG 2.1 AA violations | NFR-007 | P1 | Task 3.3 |

---

## Task-by-Task Activation Guide

### Task 1.3 — Better Auth schema (users, sessions, accounts)
**Activate after:** `drizzle/0002_better_auth.sql` migration applied
```
tests/integration/auth.test.ts → 2.1-INT-002 (session row exists prerequisite)
```

### Task 1.4 — Better Auth config (auth/index.ts)
**Activate after:** `src/lib/server/auth/index.ts` created
```
tests/integration/auth.test.ts → 2.1-UNIT-001 (session.expiresIn assertion)
```

### Task 2.3 — Auth guard in hooks.server.ts
**Activate after:** `handleAuthGuard` handle active in `hooks.server.ts`
```
tests/integration/auth.test.ts   → 2.1-INT-001, 2.1-INT-001b
tests/e2e/auth.spec.ts           → 2.1-E2E-LOGIN-002
```

### Task 3.1 — Auth route handler (/auth/[...all]/+server.ts)
**Activate after:** `src/routes/auth/[...all]/+server.ts` created
```
tests/integration/auth.test.ts   → 2.1-INT-001d, 2.1-INT-003, 2.1-INT-004
```

### Task 3.3 — Login page (/routes/login/+page.svelte)
**Activate after:** Login page created with m.login_sign_in_button() button
```
tests/integration/auth.test.ts   → 2.1-INT-001c
tests/e2e/auth.spec.ts           → 2.1-E2E-LOGIN-001, 2.1-E2E-002, 2.1-E2E-002b, 2.1-E2E-004, 2.1-E2E-A11Y
```

### After Story 2.2 (Dev Bypass) merged
**Activate after:** `AUTH_DEV_BYPASS=true` endpoint available
```
tests/integration/auth.test.ts   → 2.1-INT-002 (full session lifecycle test)
tests/e2e/auth.spec.ts           → 2.1-E2E-001, 2.1-E2E-LOGIN-003, 2.1-E2E-003
```

### Story 2.5 — Guard Dispatcher
**Activate after:** `routeGuards` registry exported from hooks.server.ts
```
tests/integration/auth-guard.test.ts → 2.5-INT-001 through 2.5-UNIT-001
  Convert test.todo() → test.skip() with assertions, then activate
```

---

## Fixture Needs

The following fixtures are needed when activating tests. These are **not created in red phase** — track for green-phase implementation:

| Fixture | Needed For | Story |
|---------|-----------|-------|
| `sessionFactory` | 2.1-INT-002 (seed DB session with expiresAt override) | 2.1 |
| `userFactory` | 2.1-INT-002, 2.5 guard tests (seed Better Auth user) | 2.1 |
| `oidcDevBypassFixture` | 2.1-E2E-001, 2.1-E2E-003 (dev login via Story 2.2 seam) | 2.2 |
| `adminUserFactory` | 2.5-INT-002 (admin flag = true in DB) | 2.5 |
| `testOwnershipEnforcement` | 2.5-INT-003 (IDOR template) | 2.7 |

---

## Risk Coverage

| Risk ID | Description | Test(s) Covering |
|---------|-------------|-----------------|
| R-002 | Guard dispatcher misconfigured → unauthenticated (app) access | 2.1-INT-001, 2.1-INT-001b |
| R-006 | Guard dispatcher not extensible (routeGuards not appendable) | 2.5-UNIT-001 |
| R-007 | OIDC callback leaks code/state params | 2.1-INT-003 |

---

## Quality Gates

### Before Story 2.1 can be marked done

- [ ] 2.1-INT-001 passing (unauthenticated (app) redirect)
- [ ] 2.1-INT-002 passing (session destroyed on logout) — requires Story 2.2
- [ ] 2.1-INT-003 passing (no code/state leak in callback)
- [ ] 2.1-E2E-LOGIN-001 passing (login page renders)
- [ ] 2.1-UNIT-001 passing (session.expiresIn === 1800)
- [ ] `bun run lint` exit 0
- [ ] `bun run check` exit 0
- [ ] `bun run test` unit count does not decrease
- [ ] `bun run test:integration` exit 0 (new auth tests pass; E1 tests no regression)
- [ ] `bun run build` exit 0

---

## Key Constraints (anti-patterns to avoid during implementation)

1. **NO username/password auth** — Authentik IdP exclusively (FR-090)
2. **NO hardcoded Thai text** — all strings via Paraglide m.*() keys; Rawinan handles translations
3. **NO configurable session timeout** — FR-093: hard-code `expiresIn: 1800` (30 min)
4. **NO credential literals in any committed file** — AUTH_SECRET, AUTHENTIK_* must use GH Secrets
5. **NO `$lib` alias in auth/index.ts** — use relative imports (may be imported outside SvelteKit)
6. **NO `drizzle-kit generate`** — hand-write and register `0002_better_auth.sql` per E1 pattern
7. **sequence() ORDER**: Better Auth handler BEFORE Paraglide; guard AFTER Better Auth, BEFORE Paraglide
8. **routeGuards MUST be exported** — appendable registry pattern (R-006); Story 2.5 extends it

---

## ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-2-1-sign-in-with-authentik-oidc.md`
- **Integration tests:** `tests/integration/auth.test.ts`
- **Guard stubs:** `tests/integration/auth-guard.test.ts`
- **E2E tests:** `tests/e2e/auth.spec.ts`
- **Story file:** `_bmad-output/implementation-artifacts/2-1-sign-in-with-authentik-oidc.md`
- **Epic 2 test design:** `_bmad-output/test-artifacts/test-design/test-design-epic-2.md`

---

## Next Steps

1. **Developer:** Implement Story 2.1 tasks (see story file for task list)
2. **Developer:** Activate tests task-by-task per the activation guide above
3. **Developer:** After Story 2.2 (dev bypass), activate the full session lifecycle tests
4. **QA:** After Story 2.5, activate auth-guard.test.ts stubs (convert todo → test with assertions)
5. **Future:** Run `bmad-testarch-automate` after implementation to upgrade P1/P2 coverage

---

**Generated by:** BMad TEA Agent — ATDD Module
**Workflow:** `bmad-testarch-atdd`
**Story:** 2.1 — Sign in with Authentik (OIDC)
**Mode:** Create (AI generation)
**Stack:** fullstack
**Execution Mode:** SEQUENTIAL (API → E2E)
**Revision:** v1 (2026-06-11) — Initial red-phase scaffold generation.
  23 test stubs across 3 files: 8 integration (auth.test.ts), 7 guard stubs (auth-guard.test.ts), 9 E2E (auth.spec.ts).
  All 6 ACs covered. 5 P0 integration tests, 3 P0 E2E tests.
  Guard dispatcher stubs (2.5-INT-001 through 2.5-UNIT-001) pre-created for Story 2.5.
