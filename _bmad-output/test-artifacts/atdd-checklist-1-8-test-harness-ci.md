---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-10'
storyId: '1.8'
storyKey: '1-8-test-harness-ci'
storyFile: '_bmad-output/implementation-artifacts/1-8-test-harness-ci.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-8-test-harness-ci.md'
generatedTestFiles:
  - tests/unit/test-harness-ci.spec.ts
  - tests/integration/db-schema.test.ts
  - tests/e2e/a11y-smoke.spec.ts
  - tests/e2e/thai-render-smoke.spec.ts
  - tests/support/fixtures/pg-factory.ts
  - tests/support/fixtures/testcontainers-context.ts
  - tests/support/integration-setup.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/1-8-test-harness-ci.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-1.md
  - _bmad/tea/config.yaml
tddPhase: RED
---

# ATDD Checklist — Story 1.8: Test Harness & CI

**Date:** 2026-06-10
**Story ID:** 1.8
**Story Key:** 1-8-test-harness-ci
**TDD Phase:** RED (all tests skipped — implementation pending)
**Workflow:** bmad-testarch-atdd
**Execution Mode:** SEQUENTIAL (Unit → Integration → E2E)

---

## Story Summary

> As a developer, I want a real-Postgres integration tier and quality gates in CI, so that critical invariants are verified from day one.

**Note:** This is an infrastructure/testing story. Tests cover the CI pipeline definition, Vitest integration project setup, DB schema EXCLUDE constraint verification, axe-core accessibility smoke, Thai font/locale render smoke, and activation of Story 1.5 integration test stubs. No domain business logic is introduced in this story.

---

## TDD Red Phase — Current Status

All scaffolds generated with `test.skip()`.

| File | Tests | Priority Coverage | Status |
|------|-------|------------------|--------|
| `tests/unit/test-harness-ci.spec.ts` | 23 | P0: 0, P1: 18, P2: 2, P3: 0 | RED (skipped) |
| `tests/integration/db-schema.test.ts` | 5 | P0: 3, P1: 2 | RED (skipped — requires Postgres) |
| `tests/e2e/a11y-smoke.spec.ts` | 2 | P1: 1, P2: 1 | RED (skipped — requires browser + axe-core) |
| `tests/e2e/thai-render-smoke.spec.ts` | 4 | P1: 3, P2: 1 | RED (skipped — requires browser) |
| **Total** | **34** | **P0: 3, P1: 24, P2: 4** | **All skipped** |

Infrastructure files (no tests, task-by-task implementation):

| File | Purpose | Task |
|------|---------|------|
| `tests/support/fixtures/pg-factory.ts` | Raw pg.Pool + migrate + truncateAll | Task 2.2 |
| `tests/support/fixtures/testcontainers-context.ts` | Testcontainers dual-mode setup | Task 2.3 |
| `tests/support/integration-setup.ts` | Vitest globalSetup for integration project | Task 2.5 |

---

## Acceptance Criteria Coverage

| # | Acceptance Criterion | Test(s) | Priority | Level |
|---|---------------------|---------|---------|-------|
| AC-1 | CI runs lint + typecheck + Vitest + Playwright + build + image + vuln scan | `1.8-UNIT-001` through `1.8-UNIT-012` | P1 | Unit/Static |
| AC-2 | constraint-exists test asserts EXCLUDE constraint in migrated schema | `1.3-INT-001`, `1.3-INT-002`, `1.3-INT-003` | P0 | Integration |
| AC-3 | axe-core check against rendered page: zero violations | `1.8-INT-002` (a11y-smoke.spec.ts) | P1 | E2E |
| AC-3 | Thai-render smoke: page renders without font-substitution artifacts | `1.8-INT-003` (thai-render-smoke.spec.ts) | P1 | E2E |
| AC-4 | integration tests un-skipped and pass with real Postgres | `1.8-INT-001` (db-schema.test.ts) | P1 | Integration |
| AC-5 | GitHub Actions CI runs on PR and fails on gate failure | `1.8-UNIT-001` through `1.8-UNIT-006` | P1 | Unit/Static |

---

## Test Strategy

### Stack Detection
**Detected stack:** `fullstack`
- Frontend indicators: `package.json` (SvelteKit, Playwright), `playwright.config.ts`, `vite.config.ts`
- Backend indicators: `drizzle.config.ts`, `src/worker.ts`, `src/lib/server/`

### Test Level Selection

| Story 1.8 concern | Level chosen | Rationale |
|-------------------|-------------|-----------|
| CI pipeline file existence/content | Unit/Static (Vitest `server`) | Fast, no infra needed; validates YAML content |
| Vitest config + package scripts | Unit/Static (Vitest `server`) | File system checks, zero external deps |
| DB EXCLUDE constraint exists | Integration (Vitest `integration`) | Requires real Postgres + migrations |
| Overlapping booking rejection | Integration (Vitest `integration`) | Requires real Postgres + schema |
| Worker integration tests activated | Integration (Vitest `integration`) | Requires real Postgres + pg-boss |
| axe-core zero violations | E2E (Playwright) | Requires browser rendering |
| Thai font / locale / Paraglide | E2E (Playwright) | Requires browser + JS font loading |

### TDD Phase
All tests are RED-phase scaffolds. They use `test.skip()` to mark expected failures until each task is implemented. Activation order follows the story's recommended task order: 1 → 4 → 2 → 3 → 5 → 6 → 7 → 8 → 9.

---

## Task-by-Task Activation Guide

For each task during implementation:

1. **Remove `test.skip(`** → `test(` for the relevant tests
2. **Run the appropriate test command** to verify RED first:
   - Unit tests: `bun run test`
   - Integration tests: `bun run test:integration` (requires DATABASE_URL or Testcontainers)
   - E2E tests: `bun run test:e2e`
3. **Implement the feature** (the task)
4. **Run again** — verify tests PASS (green)
5. **Commit** passing tests

### Activation Map (task → test IDs)

| Task | Test(s) to Activate | Run Command |
|------|---------------------|-------------|
| Task 1.1 (validateEnv export) | `1.8-UNIT-020`, `1.8-UNIT-021` | `bun run test` |
| Task 2.2 (pg-factory.ts) | `1.8-UNIT-013` | `bun run test` |
| Task 2.3 (testcontainers-context.ts) | `1.8-UNIT-014` | `bun run test` |
| Task 2.4 (integration Vitest project) | `1.8-UNIT-007`, `1.8-UNIT-008`, `1.8-UNIT-009` | `bun run test` |
| Task 2.5 (integration-setup.ts) | `1.8-UNIT-015` | `bun run test` |
| Task 3.1 (un-skip worker integration tests) | `1.8-INT-001` | `bun run test:integration` |
| Task 4.0 (schema.ts + 0000_init.sql) | `1.8-UNIT-016`, `1.8-UNIT-017`, `1.8-UNIT-018`, `1.8-UNIT-019` | `bun run test` |
| Task 4.1 (db-schema.test.ts activated) | `1.3-INT-001`, `1.3-INT-002`, `1.3-INT-003`, `1.3-INT-004` | `bun run test:integration` |
| Task 5.1 (@axe-core/playwright install) | — (prerequisite) | — |
| Task 5.2 (a11y-smoke.spec.ts) | `1.8-INT-002` | `bun run test:e2e` |
| Task 5.3 (thai-render-smoke.spec.ts) | `1.8-INT-003` variants | `bun run test:e2e` |
| Task 7.1 (ci.yml created) | `1.8-UNIT-001` through `1.8-UNIT-006` | `bun run test` |
| Task 7.2 (oven-sh/setup-bun) | `1.8-UNIT-004` | `bun run test` |
| Task 8.1 (test:integration script) | `1.8-UNIT-010` | `bun run test` |
| Task 8.2 (test:ci script) | `1.8-UNIT-011` | `bun run test` |
| Task 8.3 (no regressions) | `1.8-UNIT-012` | `bun run test` |
| Task 9.1 (.env.example update) | `1.8-UNIT-022` | `bun run test` |
| Task 9.2 (MAILPIT_URL verify) | `1.8-UNIT-023` | `bun run test` |

---

## Infrastructure Files (Not Tests)

These files provide test infrastructure but contain no test.skip() scaffolds:

### `tests/support/fixtures/pg-factory.ts`
- **Purpose:** Creates a `pg.Pool`, runs `drizzle-kit migrate`, provides `truncateAll()` for test isolation
- **Implements:** Task 2.2
- **Used by:** `tests/integration/db-schema.test.ts`, `src/worker.integration.test.ts`

### `tests/support/fixtures/testcontainers-context.ts`
- **Purpose:** Starts PostgreSqlContainer when DATABASE_URL is not set (local dev); no-op in CI
- **Implements:** Task 2.3
- **Used by:** `tests/support/integration-setup.ts`

### `tests/support/integration-setup.ts`
- **Purpose:** Vitest global setup — calls setupTestcontainerPostgres(), validates DATABASE_URL
- **Implements:** Task 2.5
- **Referenced by:** vite.config.ts integration project `globalSetup` (Task 2.4)

---

## Key Constraints & Notes

### EXCLUDE Constraint (Critical — P0)
- `drizzle-kit generate` does NOT support `EXCLUDE USING gist` natively
- Migration `drizzle/0000_init.sql` must be **hand-written** or manually appended
- Required SQL: `CREATE EXTENSION IF NOT EXISTS btree_gist;` + `EXCLUDE USING gist (room_id WITH =, during WITH &&) WHERE (status != 'cancelled')`
- If constraint is missing: `1.3-INT-001` fails → CI gate fails PR → Story 1.8 cannot be merged

### Dual-Mode Postgres (Testcontainers vs CI Service)
- Local dev: Testcontainers starts `postgres:17` automatically if DATABASE_URL is not set
- CI: GitHub Actions postgres service provides DATABASE_URL — Testcontainers is skipped
- The `integration-setup.ts` globalSetup detects the mode automatically

### axe-core Scope
- Use `.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])` to scope to WCAG 2.1 AA
- Do NOT use `.disableRules([...])` — hiding violations is not acceptable

### Thai Font/Locale Tests
- No Thai text is hardcoded in test files (per project rule: Rawinan handles all Thai translations)
- Tests verify `lang` attribute, `dir` attribute, and `document.fonts` for Thai font family names
- English placeholder values remain in `messages/th.json` per project rule

### Worker Integration Tests (Story 1.5 carry-forward)
- `src/worker.integration.test.ts` has 4 tests currently marked `test.skip()`
- Task 3.1 removes all `test.skip()` calls to activate them
- These tests move from the `server` Vitest project to the `integration` project (Task 2.4)

---

## ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-8-test-harness-ci.md`
- **Unit tests:** `tests/unit/test-harness-ci.spec.ts`
- **Integration tests:** `tests/integration/db-schema.test.ts`
- **E2E tests:** `tests/e2e/a11y-smoke.spec.ts`, `tests/e2e/thai-render-smoke.spec.ts`
- **Infrastructure:** `tests/support/fixtures/pg-factory.ts`, `tests/support/fixtures/testcontainers-context.ts`, `tests/support/integration-setup.ts`
- **Story file:** `_bmad-output/implementation-artifacts/1-8-test-harness-ci.md`
