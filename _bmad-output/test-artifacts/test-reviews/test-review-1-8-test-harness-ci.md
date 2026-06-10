---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-10'
workflowType: 'testarch-test-review'
inputDocuments:
  - '_bmad-output/test-artifacts/test-design/test-design-epic-1.md'
  - '_bmad/tea/config.yaml'
  - 'tests/unit/test-harness-ci.spec.ts'
  - 'tests/e2e/a11y-smoke.spec.ts'
  - 'tests/e2e/thai-render-smoke.spec.ts'
  - 'tests/integration/db-schema.test.ts'
  - 'tests/support/fixtures/pg-factory.ts'
  - 'tests/support/fixtures/testcontainers-context.ts'
  - 'tests/support/integration-setup.ts'
  - 'tests/support/helpers/cmd-helpers.ts'
  - 'tests/support/helpers/run-cmd.ts'
  - 'tests/support/run-cmd.ts'
  - '.github/workflows/ci.yml'
  - 'playwright.config.ts'
  - 'vite.config.ts'
  - 'package.json'
---

# Test Quality Review: Story 1.8 — Test Harness & CI

**Quality Score**: 83/100 (B — Good quality with actionable improvements needed)
**Review Date**: 2026-06-10
**Review Scope**: suite (all story 1.8 test files + CI workflow)
**Reviewer**: TEA Agent (Master Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Request Changes (fix HIGH issues before merge)

### Key Strengths

- Excellent determinism (98/100): no hard waits, no Math.random(), fixed test timestamps in DB tests
- Integration tests use proper BEGIN/ROLLBACK transaction pattern for perfect row isolation
- Testcontainers dual-mode (local dev vs CI service) correctly implemented in integration-setup.ts

### Key Weaknesses

- CI E2E job has a port mismatch that will cause E2E tests to fail silently in CI (HIGH)
- `runCmd` helper duplicated in 4 separate locations — maintenance burden (HIGH)
- `test-harness-ci.spec.ts` at 351 lines exceeds the 300-line guideline (HIGH)

### Summary

Story 1.8 delivers a solid test harness foundation. The unit and integration test scaffolds are
well-structured, deterministic, and properly isolated. The Testcontainers setup and pg-factory
fixture follow best practices. The primary concerns are in the CI pipeline configuration and
in one maintainability issue.

The most critical fix needed is the E2E CI job: the workflow manually starts `bun run dev &`
(which binds to port 5173 by default) and runs `wait-on` against port 5173 — but
`playwright.config.ts` uses `port: 3000` and `reuseExistingServer: false` when `CI=true`
(which GitHub Actions sets automatically). Playwright will try to start a fresh server on port
3000, but the pre-running server is on 5173. This will cause E2E tests to fail consistently
in CI. The fix is simple: remove the manual server-start steps and let `playwright.config.ts`
manage the server lifecycle.

Additionally the E2E job has no postgres/mailpit services, yet it starts the dev server with a
`DATABASE_URL` that points to localhost:5432. The dev server will fail to start.

---

## Quality Criteria Assessment

| Criterion                            | Status        | Violations | Notes                                                    |
| ------------------------------------ | ------------- | ---------- | -------------------------------------------------------- |
| BDD Format (Given-When-Then)         | ✅ PASS       | 0          | All tests use clear scenario names with scenario IDs     |
| Test IDs                             | ✅ PASS       | 0          | All tests have 1.8-UNIT-xxx / 1.8-INT-xxx IDs           |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS       | 0          | [P0]/[P1]/[P2] markers on all test cases                 |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS       | 0          | Zero hard waits — E2E uses waitForLoadState properly     |
| Determinism (no conditionals)        | ✅ PASS       | 0          | No Math.random(), no uncontrolled Date.now() in tests    |
| Isolation (cleanup, no shared state) | ⚠️ WARN      | 2          | Pool null-guard advisory; runCmd duplication             |
| Fixture Patterns                     | ✅ PASS       | 0          | pg-factory and testcontainers-context properly structured|
| Data Factories                       | ✅ PASS       | 0          | DB tests use direct SQL with unique test-scoped room_ids |
| Network-First Pattern                | ✅ PASS       | 0          | E2E uses waitForLoadState('networkidle') before checks   |
| Explicit Assertions                  | ✅ PASS       | 0          | All expect() calls in test bodies, not hidden in helpers |
| Test Length (≤300 lines)             | ❌ FAIL       | 1          | test-harness-ci.spec.ts is 351 lines (51 over limit)     |
| Test Duration (≤1.5 min)             | ✅ PASS       | 0          | Integration tests have 30s testTimeout, reasonable       |
| Flakiness Patterns                   | ❌ FAIL       | 1          | CI port mismatch causes deterministic failure in CI      |

**Total Violations**: 0 Critical, 3 High, 5 Medium, 2 Low

---

## Quality Score Breakdown

```
Dimension Scores (weighted):
  Determinism:     98/100 × 0.30 = 29.4
  Isolation:       80/100 × 0.30 = 24.0
  Maintainability: 72/100 × 0.25 = 18.0
  Performance:     77/100 × 0.15 = 11.6
                                  ------
Overall Score:                    83/100
Grade:                            B
```

---

## Critical Issues (Must Fix Before Merge)

### 1. CI E2E Job: Port Mismatch Causes E2E Tests to Always Fail

**Severity**: HIGH (deterministic CI failure)
**Location**: `.github/workflows/ci.yml` — `test-e2e` job, steps "Start dev server" and "Wait for server"
**Criterion**: CI Pipeline — flakiness / port configuration
**Knowledge Base**: [ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)

**Issue Description**:
GitHub Actions automatically sets `CI=true` in the runner environment. `playwright.config.ts`
uses `process.env.CI` to select:
- `webServer.port: 3000` (expects server on port 3000)
- `webServer.reuseExistingServer: false` (Playwright will try to start a fresh server)
- `use.baseURL: 'http://localhost:3000'`

The current CI workflow:
1. Manually starts `bun run dev &` — Vite defaults to port **5173**
2. Waits on `http://localhost:5173` — confirms the server on 5175 is ready
3. Runs `bun run test:e2e` — Playwright (with `CI=true`) expects port **3000**

Since `reuseExistingServer=false` in CI, Playwright will try to start a new server via
`bun run dev` on port 3000. But Vite defaults to 5173. Playwright will wait for port 3000
to become available (it never will), and the E2E job will timeout or fail.

**Current Code**:

```yaml
# ❌ Bad — manual server start conflicts with playwright.config.ts CI configuration
- name: Start dev server
  run: bun run dev &
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    ...
- name: Wait for server
  run: npx wait-on http://localhost:5173 --timeout 30000
- name: Run E2E tests
  run: bun run test:e2e
```

**Recommended Fix**:

```yaml
# ✅ Good — let playwright.config.ts manage the server lifecycle entirely
# Remove the "Start dev server" and "Wait for server" steps.
# playwright.config.ts webServer config handles this correctly.
- name: Run E2E tests
  run: bun run test:e2e
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    SMTP_HOST: localhost
    SMTP_PORT: '1025'
    SMTP_FROM: test@test.local
    SMTP_DISPLAY_NAME: Test
```

**Why This Matters**: E2E tests will fail every time in CI until this is fixed. The server
on port 5173 is running but Playwright looks at port 3000. All 1.8-INT-002 and 1.8-INT-003
acceptance criteria cannot be verified.

---

### 2. CI E2E Job: Missing postgres and mailpit Services

**Severity**: HIGH (runtime crash)
**Location**: `.github/workflows/ci.yml` — `test-e2e` job
**Criterion**: CI Pipeline — service dependencies

**Issue Description**:
The `test-e2e` job starts `bun run dev` with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db`.
However, the test-e2e job has no `services:` block — there is no postgres container running on
port 5432 in that job. The dev server startup will fail because `validateEnv()` calls
`process.exit(1)` if DATABASE_URL is set but the connection fails, OR the app crashes at
the first DB operation.

The `test-integration` job correctly has postgres and mailpit services.

**Current Code**:

```yaml
# ❌ Bad — test-e2e job has no services but uses DATABASE_URL pointing to localhost:5432
test-e2e:
  name: E2E Tests (Playwright + axe-core)
  runs-on: ubuntu-latest
  needs: quality
  steps:
    ...
    - name: Start dev server
      run: bun run dev &
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        # ^^^ No postgres container running on 5432 in this job!
```

**Recommended Fix**:

```yaml
# ✅ Good — add postgres and mailpit services to test-e2e job
test-e2e:
  name: E2E Tests (Playwright + axe-core)
  runs-on: ubuntu-latest
  needs: quality
  services:
    postgres:
      image: postgres:17
      env:
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: test_db
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432
    mailpit:
      image: axllent/mailpit:latest
      ports:
        - 1025:1025
        - 8025:8025
  steps:
    ...
```

**Why This Matters**: Without the services, the dev server crashes on startup. Even if the port
mismatch (Issue #1) is fixed, the E2E job cannot run until this is also fixed.

---

### 3. `runCmd` Duplicated in 4 Locations

**Severity**: HIGH (maintainability)
**Location**: `tests/support/run-cmd.ts`, `tests/support/helpers/run-cmd.ts`, `tests/support/helpers/cmd-helpers.ts`, `tests/support/fixtures/docker-context.ts`
**Criterion**: Maintainability — duplicate code

**Issue Description**:
The `runCmd` utility is defined four times with essentially identical implementations.
`jobs-email-platform.spec.ts` imports from the legacy `tests/support/run-cmd.ts` path
while `scaffold.spec.ts`, `i18n-config.spec.ts`, `i18n-messages.spec.ts` import from
`tests/support/helpers/cmd-helpers.ts` and `design-system.spec.ts` imports from
`tests/support/helpers/run-cmd.ts`. A bug fix in one copy does not propagate.

**Current State**:
```
tests/support/run-cmd.ts          ← legacy, used by jobs-email-platform.spec.ts
tests/support/helpers/run-cmd.ts  ← used by design-system.spec.ts
tests/support/helpers/cmd-helpers.ts ← used by scaffold, i18n-config, i18n-messages
tests/support/fixtures/docker-context.ts ← inlines its own copy
```

**Recommended Fix**:
1. Keep `tests/support/helpers/run-cmd.ts` as the single canonical location (it exports `CmdResult` interface which is the most complete version)
2. Delete `tests/support/run-cmd.ts` (legacy)
3. Update `tests/unit/jobs-email-platform.spec.ts` import: `'../support/run-cmd'` → `'../support/helpers/run-cmd'`
4. Delete `tests/support/helpers/cmd-helpers.ts` (or keep as re-export for backward compat)
5. Update `tests/support/fixtures/docker-context.ts` to import from `'../helpers/run-cmd'` instead of inlining

**Why This Matters**: Without consolidation, fixing a timeout bug or adding a `CmdResult` field requires updating 4 files. Per the fixture-architecture principle, helpers used 3+ times belong in a shared module.

---

## Recommendations (Should Fix)

### 1. Split `test-harness-ci.spec.ts` — Exceeds 300-Line Limit

**Severity**: P1 (High)
**Location**: `tests/unit/test-harness-ci.spec.ts:1` (351 lines)
**Criterion**: Test Length ≤300 lines

**Issue Description**:
The file contains 7 `describe` blocks covering 5 distinct concerns. At 351 lines it exceeds
the 300-line quality guideline and will only grow as more CI checks are added.

**Recommended Split**:

```
tests/unit/test-harness-ci-workflow.spec.ts   (~90 lines)
  → 1.8-UNIT-001 through 1.8-UNIT-006 (CI workflow file checks)

tests/unit/test-harness-vitest-config.spec.ts (~70 lines)
  → 1.8-UNIT-007 through 1.8-UNIT-009 (Vitest integration project config)

tests/unit/test-harness-scripts.spec.ts       (~80 lines)
  → 1.8-UNIT-010 through 1.8-UNIT-012 (package.json scripts)

tests/unit/test-harness-infra-files.spec.ts   (~120 lines)
  → 1.8-UNIT-013 through 1.8-UNIT-023 (infrastructure file existence + content)
```

**Benefits**: Each file < 100 lines, focused on one concern, failures immediately indicate
which concern regressed.

---

### 2. Add `timeout-minutes` to All CI Jobs

**Severity**: P2 (Medium)
**Location**: `.github/workflows/ci.yml` — all 6 jobs
**Criterion**: CI Pipeline — resource governance

**Issue Description**:
None of the 6 CI jobs have `timeout-minutes`. A hung test step can consume GitHub Actions
minutes for the default 6 hours.

**Recommended Fix**:

```yaml
quality:
  timeout-minutes: 15
test-unit:
  timeout-minutes: 15
test-integration:
  timeout-minutes: 20
test-e2e:
  timeout-minutes: 20
build-images:
  timeout-minutes: 20
vuln-scan:
  timeout-minutes: 15
```

---

### 3. Enable `vuln-scan` on Pull Requests

**Severity**: P2 (Medium)
**Location**: `.github/workflows/ci.yml:147`
**Criterion**: CI Pipeline — security gates

**Issue Description**:
The `vuln-scan` job condition `if: github.ref == 'refs/heads/main' || github.event_name == 'schedule'`
means vulnerability scans never run on pull requests. New dependencies with known vulnerabilities
can be merged without detection. Per test design 1.8-INT-004, the vuln scan is meant to gate CI.

**Recommended Fix**:

```yaml
vuln-scan:
  # Remove the `if` condition entirely, or change to:
  if: always()
  # OR simply remove the `if` line to run on all triggers
```

---

### 4. `db-schema.test.ts` Pool Null-Guard

**Severity**: P2 (Medium)
**Location**: `tests/integration/db-schema.test.ts:49`
**Criterion**: Isolation — test state guard

**Issue Description**:
The module-level `let pool: pg.Pool` is set in `beforeAll`. If `beforeAll` throws (e.g.,
`DATABASE_URL` is missing), subsequent tests receive an uninitialized `pool`. The current
`throw new Error(...)` in `beforeAll` covers this, but only if the guard is reached. A more
defensive approach is adding a null-check at the top of each test or using a factory fixture.

**Recommended Fix**:

```typescript
// Add to beforeAll for defensive guard
beforeAll(async () => {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set ...');
  }
  pool = new pg.Pool({ connectionString: databaseUrl });
  // Verify connectivity
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
});
```

This is already mostly correct — just confirm the `SELECT 1` connectivity check is present
(it currently is in `pg-factory.ts` but not in `db-schema.test.ts`'s own `beforeAll`).

---

## Best Practices Found

### 1. Testcontainers Dual-Mode Pattern

**Location**: `tests/support/fixtures/testcontainers-context.ts:40`
**Pattern**: CI/Local environment detection for external services

```typescript
// ✅ Excellent pattern: skip Testcontainers in CI, use for local dev
if (process.env['DATABASE_URL']) {
  console.log('[testcontainers-context] DATABASE_URL already set — using CI Postgres service');
  return async () => { /* no-op teardown */ };
}
// Dynamic import avoids loading testcontainers package when not needed
const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
```

This is the correct approach: dynamic import prevents the testcontainers package from being
loaded in CI (where it might not be installed) and returns a clean no-op teardown.

---

### 2. Transaction Rollback Pattern in Integration Tests

**Location**: `tests/integration/db-schema.test.ts:90`
**Pattern**: BEGIN/ROLLBACK for test isolation

```typescript
// ✅ Excellent: explicit transaction rollback after each test
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... test inserts ...
  await client.query('ROLLBACK');
} finally {
  client.release();
}
```

This ensures the database state is clean after each test, enabling parallel execution of
integration tests without state pollution.

---

### 3. Unique Test-Scoped Room IDs

**Location**: `tests/integration/db-schema.test.ts:100`
**Pattern**: Unique per-test identifiers prevent parallel collision

```typescript
// ✅ Good: unique room_id per test prevents cross-test interference
await client.query(`DELETE FROM bookings WHERE room_id = 'test-room-overlap-001'`);
// Then insert with 'test-room-overlap-001'
// Each test uses a different room_id suffix
```

---

## Test File Analysis

### File Metadata Summary

| File | Lines | Describes | Tests | Priority |
|------|-------|-----------|-------|----------|
| `tests/unit/test-harness-ci.spec.ts` | 351 | 7 | 23 | All P1/P2 |
| `tests/e2e/a11y-smoke.spec.ts` | 92 | 1 | 2 | P1, P2 |
| `tests/e2e/thai-render-smoke.spec.ts` | 152 | 1 | 4 | P1×3, P2×1 |
| `tests/integration/db-schema.test.ts` | 292 | 2 | 5 | P0×3, P1×2 |
| `tests/support/fixtures/pg-factory.ts` | 112 | — | — | Support |
| `tests/support/fixtures/testcontainers-context.ts` | 80 | — | — | Support |
| `tests/support/integration-setup.ts` | 60 | — | — | Support |

### Test Scope (Story 1.8)

- **Scenario IDs covered**: 1.8-UNIT-001 through 1.8-UNIT-023, 1.8-INT-001 through 1.8-INT-004
- **Carry-forward scenarios**: 1.3-INT-001 through 1.3-INT-004 (in db-schema.test.ts)
- **Priority distribution**:
  - P0 (Critical): 3 tests (DB EXCLUDE constraint enforcement)
  - P1 (High): 26 tests
  - P2 (Medium): 5 tests

---

## Context and Integration

### Related Artifacts

- **Test Design**: `_bmad-output/test-artifacts/test-design/test-design-epic-1.md`
  - Story 1.8 section: lines 387–391 (INT-001 through INT-004)
  - AC-1: CI runs lint + typecheck + Vitest + Playwright + build + image + vuln scan ✅ scaffolded
  - AC-2: Constraint-exists test asserts EXCLUDE constraint ✅ scaffolded
  - AC-3: axe-core + Thai render smoke tests ✅ scaffolded
  - AC-4: Integration tests use real Postgres (Testcontainers / CI service) ✅ scaffolded
  - AC-5: CI workflow on PR + fails on gate failure ✅ ci.yml exists, but has port mismatch

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Fix CI E2E port mismatch** — Remove manual `bun run dev &` and `wait-on` steps from `test-e2e` job; let `playwright.config.ts` webServer handle server lifecycle.
   - Priority: P1
   - Estimated Effort: 5 minutes

2. **Add postgres/mailpit services to test-e2e job** — Copy the `services:` block from `test-integration` job into `test-e2e` job.
   - Priority: P1
   - Estimated Effort: 10 minutes

3. **Consolidate runCmd helper** — Delete `tests/support/run-cmd.ts` (legacy). Update `jobs-email-platform.spec.ts` import to `'../support/helpers/run-cmd'`. Remove the inline copy from `docker-context.ts`.
   - Priority: P1
   - Estimated Effort: 15 minutes

### Follow-up Actions (Future PRs)

1. **Split test-harness-ci.spec.ts** into 4 focused files (each ~80-100 lines).
   - Priority: P2
   - Target: next sprint

2. **Add timeout-minutes to all CI jobs** — prevents runaway job consumption.
   - Priority: P2
   - Target: next sprint

3. **Remove if condition from vuln-scan** — run on all triggers including pull_request.
   - Priority: P2
   - Target: next sprint

### Re-Review Needed?

⚠️ Re-review after HIGH fixes — request changes, then re-review. The CI port mismatch and
missing services are deterministic failures that must be resolved before the pipeline can
be validated end-to-end.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
The story 1.8 test scaffolds themselves are high quality: deterministic, well-isolated, properly
structured with scenario IDs and priority markers. The integration test infrastructure
(Testcontainers dual-mode, pg-factory, transaction rollback) is correctly implemented.

However, the GitHub Actions CI workflow has two issues that will cause the `test-e2e` job to
fail every time: (1) a port mismatch between the manually-started dev server (5173) and what
Playwright expects in CI (3000), and (2) no postgres/mailpit services in the e2e job even
though the dev server requires a database connection. These are not test quality issues per se —
they are CI configuration bugs — but they mean AC-3 (Playwright executes axe-core and Thai
render) and AC-5 (CI workflow runs on PR) cannot be verified until fixed.

The `runCmd` duplication is a maintainability debt that should be addressed in this PR since
it was introduced in this story.

Once the 3 HIGH issues are fixed (estimated 30 minutes total), the review score will be
approximately 90+/100 and the PR is ready to merge.

---

## Appendix

### Violation Summary by Location

| File | Line | Severity | Category | Issue | Fix |
|------|------|----------|----------|-------|-----|
| `.github/workflows/ci.yml` | 102 | HIGH | ci-port-mismatch | E2E server on 5173, Playwright expects 3000 | Remove manual server start; let playwright.config.ts handle it |
| `.github/workflows/ci.yml` | 87 | HIGH | missing-services | No postgres/mailpit in test-e2e job | Add services block same as test-integration |
| `tests/support/run-cmd.ts` | 1 | HIGH | duplicate-impl | runCmd in 4 files | Consolidate to tests/support/helpers/run-cmd.ts |
| `tests/unit/test-harness-ci.spec.ts` | 1 | HIGH | file-too-long | 351 lines > 300 limit | Split into 4 focused files |
| `.github/workflows/ci.yml` | 147 | MEDIUM | vuln-scan-skipped | vuln-scan skipped on PRs | Remove if condition |
| `.github/workflows/ci.yml` | 1 | MEDIUM | missing-timeouts | No timeout-minutes on any job | Add 15-20min timeouts |
| `tests/integration/db-schema.test.ts` | 49 | MEDIUM | pool-null-guard | Pool null-guard advisory | Add SELECT 1 connectivity check in beforeAll |
| `tests/unit/jobs-email-platform.spec.ts` | 26 | MEDIUM | import-path | Uses legacy ../support/run-cmd import | Update to ../support/helpers/run-cmd |
| `tests/support/fixtures/docker-context.ts` | 107 | LOW | date-now-in-helper | Date.now() in timeout helper | Acceptable pattern — no change needed |

---

## Review Metadata

**Generated By**: BMad TEA Agent (Master Test Architect)
**Workflow**: testarch-test-review
**Review ID**: test-review-1-8-test-harness-ci-20260610
**Timestamp**: 2026-06-10 00:00:00
**Story**: 1.8-test-harness-ci
