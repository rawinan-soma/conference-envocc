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
storyId: '1.7'
storyKey: '1-7-docker-deployment-skeleton'
storyFile: '_bmad-output/implementation-artifacts/1-7-docker-deployment-skeleton.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-7-docker-deployment-skeleton.md'
generatedTestFiles:
  - src/lib/server/env.test.ts
  - tests/unit/docker-deployment.spec.ts
  - tests/support/fixtures/docker-context.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/1-7-docker-deployment-skeleton.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-1.md
  - _bmad/tea/config.yaml
tddPhase: RED
---

# ATDD Checklist — Story 1.7: Docker & Deployment Skeleton

**Date:** 2026-06-10
**Story ID:** 1.7
**Story Key:** 1-7-docker-deployment-skeleton
**TDD Phase:** RED (all tests skipped — implementation pending)
**Workflow:** bmad-testarch-atdd
**Execution Mode:** SEQUENTIAL (Unit → Integration)

---

## Story Summary

> As an operator, I want web + worker images and a compose stack with nginx and Postgres, so that the app deploys on-prem with migrations applied on start.

**Note:** This is an infrastructure story. Tests cover Docker build correctness, compose stack health, nginx proxy config, fail-fast env validation, and dev compose isolation. No domain logic or API endpoints are introduced in this story.

---

## TDD Red Phase — Current Status

All scaffolds are generated with `test.skip()`.

| File | Tests | Priority Coverage | Status |
|------|-------|------------------|--------|
| `src/lib/server/env.test.ts` | 6 | P0: 3, P1: 3 | RED (skipped) |
| `tests/unit/docker-deployment.spec.ts` | 16 | P0: 5, P1: 8, P2: 1, P3: 1 | RED (skipped — requires Docker) |
| **Total** | **22** | **P0: 8, P1: 11, P2: 1, P3: 1** | **All skipped** |

---

## Acceptance Criteria Coverage

| # | Acceptance Criterion | Test(s) | Priority | Level |
|---|---------------------|---------|---------|-------|
| AC-1 | `docker compose up` starts all services; drizzle-kit migrate runs pre-start; app reachable through nginx | `1.7-INT-001`, `1.7-INT-002`, `1.7-UNIT-COMPOSE-003` | P0, P1 | Integration/Ops |
| AC-2 | Missing `DATABASE_URL` → process exits immediately with clear error | `1.7-UNIT-001–003`, `1.7-INT-003` | P0 | Unit + Ops |
| AC-3 | `docker build -f Dockerfile .` produces minimal multi-stage web image on oven/bun | `1.7-UNIT-BUILD-001–003` | P0, P1 | Build/Ops |
| AC-4 | `docker build -f Dockerfile.worker .` produces minimal worker image | `1.7-UNIT-BUILD-004–005` | P0, P1 | Build/Ops |
| AC-5 | Bun listens; nginx proxies with X-Forwarded-* headers | `1.7-INT-004`, `1.7-INT-005` | P1 | Integration |
| AC-6 | Dev compose.yaml has no web/worker services; only db (and mailpit) | `1.7-UNIT-COMPOSE-001–002` | P1 | Unit/Static |

**Coverage:** 6/6 acceptance criteria covered (100%).

---

## Test Design Alignment

Tests align with Epic 1 test design scenarios (`_bmad-output/test-artifacts/test-design/test-design-epic-1.md`):

| Scenario ID | Priority | Description | Test File(s) |
|-------------|----------|-------------|-------------|
| `1.7-INT-001` | P0 | `docker compose up` cold start: all services healthy, migrations applied | `tests/unit/docker-deployment.spec.ts` |
| `1.7-INT-002` | P0 | App reachable through nginx; HTTP 200 on health endpoint | `tests/unit/docker-deployment.spec.ts` |
| `1.7-INT-003` | P0 | Missing required env var causes web container to exit non-zero (fail-fast) | `tests/unit/docker-deployment.spec.ts` |
| `1.7-INT-004` | P1 | nginx propagates `X-Forwarded-For` and `X-Forwarded-Proto` headers | `tests/unit/docker-deployment.spec.ts` |
| `1.7-INT-005` | P1 | Secrets load from env; health endpoint returns DB-connected status | `tests/unit/docker-deployment.spec.ts` |
| `1.7-INT-006` | P2 | Worker container restarts cleanly after crash (pg-boss reconnects) | `tests/unit/docker-deployment.spec.ts` |
| `1.7-INT-007` | P3 | Docker image size within reasonable bound (<500MB) | `tests/unit/docker-deployment.spec.ts` |
| *(new)* `1.7-UNIT-001–006` | P0/P1 | `validateEnv()` unit tests — fail-fast on missing DATABASE_URL | `src/lib/server/env.test.ts` |

---

## Task-by-Task Activation Guide

**During implementation of each task, activate the corresponding test group:**

### Task 1: Create `Dockerfile` for the web service (AC: 1, 3)
Activate: `1.7-UNIT-BUILD-001`, `1.7-UNIT-BUILD-002`, `1.7-UNIT-BUILD-003`

```bash
# Remove test.skip( → test( for each test, then run:
bun run test -- tests/unit/docker-deployment.spec.ts
# Expect: FAIL (red) — Dockerfile missing
# Implement Task 1
# Expect: PASS (green)
```

### Task 2: Create `Dockerfile.worker` (AC: 1, 4)
Activate: `1.7-UNIT-BUILD-004`, `1.7-UNIT-BUILD-005`

```bash
bun run test -- tests/unit/docker-deployment.spec.ts
```

### Task 3: Create `nginx/conf.d/app.conf` (AC: 1, 5)
Activate: `1.7-INT-005` (nginx conf static check), `1.7-INT-004` (nginx header proxy — requires compose up)

```bash
bun run test -- tests/unit/docker-deployment.spec.ts
```

### Task 4: Create `docker-compose.prod.yml` (AC: 1, 5, 6)
Activate: `1.7-UNIT-COMPOSE-003`, `1.7-UNIT-COMPOSE-004`

For Docker Compose cold-start tests (nightly — requires running stack):
Activate: `1.7-INT-001`, `1.7-INT-002`

```bash
bun run test -- tests/unit/docker-deployment.spec.ts
```

### Task 5: Update `compose.yaml` (dev) — add Mailpit, confirm no web/worker (AC: 6)
Activate: `1.7-UNIT-COMPOSE-001`, `1.7-UNIT-COMPOSE-002`

```bash
bun run test -- tests/unit/docker-deployment.spec.ts
```

### Task 6: Create `src/lib/server/env.ts` — validated runtime env (AC: 2)
Activate: `1.7-UNIT-001`, `1.7-UNIT-002`, `1.7-UNIT-003`, `1.7-UNIT-004`, `1.7-UNIT-005`, `1.7-UNIT-006`

```bash
bun run test -- src/lib/server/env.test.ts
# Expect: FAIL (red) — env.ts does not exist
# Implement validateEnv with Valibot
# Expect: PASS (green)
```

### Task 6 (continued): Update `src/hooks.server.ts` + `src/worker.ts`
After `validateEnv` passes unit tests, verify integration:
- web: `validateEnv` called at module load via `$env/dynamic/private`
- worker: `validateEnv` called via `process.env`

Activate: `1.7-INT-003` (fail-fast Docker test)

```bash
bun run test -- tests/unit/docker-deployment.spec.ts
```

### Tasks 7–8: `.env.example` + `package.json` worker script
No dedicated tests — covered by `1.7-UNIT-PREFLIGHT-001` (file existence check).

### Task 9: Smoke test the stack (AC: 1, 2, 3, 4, 5)
Activate all remaining P0 tests as a final integration gate:
`1.7-INT-001`, `1.7-INT-002`, `1.7-INT-003`, `1.7-UNIT-PREFLIGHT-001`

```bash
# After all tasks done, activate ALL remaining tests:
bun run test -- src/lib/server/env.test.ts
bun run test -- tests/unit/docker-deployment.spec.ts
```

---

## CI Execution Classification

Per `test-design-epic-1.md` execution strategy:

| Test Group | CI Tier | Reason |
|-----------|---------|--------|
| `src/lib/server/env.test.ts` (all) | **PR Gate** | Fast unit tests; no Docker required |
| `1.7-UNIT-PREFLIGHT-001`, `1.7-UNIT-BUILD-*`, `1.7-UNIT-COMPOSE-*`, `1.7-INT-004`, `1.7-INT-005` | **PR Gate** | Static/config checks; Docker build (if image cache available) |
| `1.7-INT-001`, `1.7-INT-002`, `1.7-INT-003` | **Nightly** | Full `docker compose up` cold start takes 2–3 min |
| `1.7-INT-006` | **Nightly** | Worker restart test requires running stack |
| `1.7-INT-007` | **On-Demand** | Image size check — informational |

---

## Required `data-testid` Attributes

None required for Story 1.7 (no UI components implemented in this story).

---

## Mock Requirements

| Test | Mock | Rationale |
|------|------|-----------|
| `env.test.ts` | `vi.spyOn(process, 'exit')` | Prevent actual process exit during unit tests |
| `env.test.ts` | `vi.spyOn(console, 'error')` | Capture error output for assertion |
| Docker tests | None — uses real Docker CLI | Infrastructure tests must use real containers |

---

## Fixture Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| `tests/support/fixtures/docker-context.ts` | Constants, `runCmd()` helper, `waitForUrl()` helper for Docker tests | Created (RED phase) |

Full fixture infrastructure (Playwright `test.extend()`, DB factories, auth helpers) is created in **Story 1.8 (Test Harness & CI)**.

---

## Red-Green-Refactor Workflow

```
RED   ← You are here. All tests marked test.skip().
        Tests document EXPECTED behavior that doesn't exist yet.

GREEN ← During each task: remove test.skip(), confirm RED,
        implement the feature, confirm GREEN.

REFACTOR ← After GREEN: clean up code; tests must stay green.
```

**IMPORTANT:** Before activating a test, always confirm it FAILs first:
```bash
# 1. Remove test.skip() for ONE test
# 2. Run it — it should FAIL with a meaningful error, not pass trivially
# 3. If it passes before implementation — the assertion is wrong, fix the test
# 4. Implement the feature
# 5. Run again — should PASS
```

---

## Execution Commands

```bash
# Run validateEnv unit tests (fast — no Docker required)
bun run test -- src/lib/server/env.test.ts

# Run Docker infrastructure tests (requires Docker running)
bun run test -- tests/unit/docker-deployment.spec.ts

# Run all unit tests
bun run test

# Run E2E tests (Story 1.7 has no E2E tests — those are in Story 1.9)
# bun run test:e2e

# Run full quality gate (mirrors CI)
bun run lint && bun run format && bun run check && bun run test && bun run build
```

---

## Assumptions & Known Constraints

1. **Docker required for infrastructure tests** — `tests/unit/docker-deployment.spec.ts` requires Docker Desktop or Docker Engine running locally. Tests will skip gracefully via `test.skip()` in red phase.
2. **`.env` file required for compose tests** — `1.7-INT-001` and related tests need a valid `.env` with `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. Use `.env.example` as the template.
3. **story 1.5 dependency** — `src/worker.ts` is created in story 1.5. Story 1.7 dev notes specify creating a stub if 1.5 is not merged.
4. **Vitest project config** — unit tests run in the `server` vitest project (see `vite.config.ts`). `src/lib/server/env.test.ts` matches `src/**/*.{test,spec}.{js,ts}` pattern.
5. **Sequential execution** — subagent mode was not used (single agent context). Tests generated sequentially.
6. **Bun only** — all commands use `bun run *`. No `npm`/`yarn`/`pnpm`.
7. **Thai text rule** — no Thai text hardcoded in test files (per project memory: Rawinan handles all translations).
8. **`import.meta.dirname`** — used in `docker-context.ts` (available in Bun/ESM context). If Vitest runs in a different context, fall back to `path.resolve(__dirname, ...)`.
9. **P0 compose tests designated nightly** — `1.7-INT-001/002/003` take 2–3 minutes for cold-start compose. They are in the `docker-deployment.spec.ts` unit file but should be excluded from fast PR gates via test timeout and CI configuration in Story 1.8.
10. **No `require('fs')` in final tests** — the generated tests use `require('fs')` for lazy file reads in `test.skip()` blocks. After activation, replace with top-level `import { readFileSync } from 'fs'` for better style.

---

## ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-7-docker-deployment-skeleton.md`
- **Unit tests (validateEnv):** `src/lib/server/env.test.ts`
- **Integration/Ops tests:** `tests/unit/docker-deployment.spec.ts`
- **Fixture:** `tests/support/fixtures/docker-context.ts`

---

## Next Steps for Dev Agent

1. **Pick up the story:** `bmad-dev-story` with story file `_bmad-output/implementation-artifacts/1-7-docker-deployment-skeleton.md`
2. **Activate tests task-by-task** using the guide above — confirm RED before implementing, GREEN after
3. **After Story 1.7 is done:** story 1.8 CI pipeline will pick up these test files and integrate them into the PR gate and nightly pipelines
4. **After Epic 1 is complete:** run `bmad-testarch-automate` to generate the full automated test suite for CI

---

## Completion Summary

- **Story:** 1.7 — Docker & Deployment Skeleton
- **TDD Phase:** RED
- **Total Tests Generated:** 22 (all `test.skip()`)
  - Unit tests (validateEnv): 6 (in `src/lib/server/env.test.ts`)
  - Integration/Ops tests (Docker): 16 (in `tests/unit/docker-deployment.spec.ts`)
- **Priority breakdown:** P0: 8, P1: 11, P2: 1, P3: 1 (all skipped — informational P3: 1)
- **Acceptance criteria covered:** 6/6 (100%)
- **Fixtures created:** 1 (`docker-context.ts`)
- **Mock requirements:** `vi.spyOn(process, 'exit')`, `vi.spyOn(console, 'error')`
- **data-testid requirements:** 0

**Generated by:** BMad TEA Agent — ATDD Module
**Workflow:** `bmad-testarch-atdd`
**Version:** 4.0 (BMad v6)
