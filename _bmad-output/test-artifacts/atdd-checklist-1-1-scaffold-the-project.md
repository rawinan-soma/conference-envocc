---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-09'
storyId: '1.1'
storyKey: '1-1-scaffold-the-project'
storyFile: '_bmad-output/implementation-artifacts/1-1-scaffold-the-project.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-1-scaffold-the-project.md'
generatedTestFiles:
  - tests/unit/scaffold.spec.ts
  - tests/e2e/scaffold-smoke.spec.ts
  - tests/support/fixtures/scaffold-context.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/1-1-scaffold-the-project.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-1.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad/tea/config.yaml
tddPhase: RED
---

# ATDD Checklist — Story 1.1: Scaffold the Project

**Date:** 2026-06-09
**Story ID:** 1.1
**Story Key:** 1-1-scaffold-the-project
**TDD Phase:** RED (all tests skipped — implementation pending)
**Workflow:** bmad-testarch-atdd
**Execution Mode:** SEQUENTIAL (API → E2E)

---

## Story Summary

> As a developer, I want the SvelteKit + Bun project scaffolded with the agreed tooling, so that all later work starts from the locked stack.

**Note:** This is a scaffold story with no domain logic. Tests verify CI/build gates and structural correctness of the scaffold output. No UI flows or API endpoints are implemented in this story.

---

## TDD Red Phase — Current Status

All scaffolds are generated with `test.skip()`.

| File | Tests | Priority Coverage | Status |
|------|-------|------------------|--------|
| `tests/unit/scaffold.spec.ts` | 13 | P1: 10, P2: 3 | RED (skipped) |
| `tests/e2e/scaffold-smoke.spec.ts` | 4 | P1: 4 | RED (skipped) |
| **Total** | **17** | **P1: 14, P2: 3** | **All skipped** |

---

## Acceptance Criteria Coverage

| # | Acceptance Criterion | Test(s) | Priority | Level |
|---|---------------------|---------|---------|-------|
| AC-1 | `bun install` succeeds, `bun run dev` serves, `bun run build` produces Bun server bundle | `1.1-UNIT-001`, `1.1-UNIT-001b–h`, `1.1-UNIT-002`, `1.1-UNIT-002b` | P1 | Unit/Smoke |
| AC-2 | ESLint exits 0 with no errors | `1.1-UNIT-003a` | P1 | Unit/Lint |
| AC-3 | Prettier exits 0 with no formatting errors | `1.1-UNIT-003b` | P1 | Unit/Lint |
| AC-4 | `svelte-check` exits 0 with no type errors | `1.1-UNIT-003c` | P1 | Unit/Type |
| AC-5 | Vitest exits 0 (scaffold placeholder tests pass) | `1.1-UNIT-003d` | P1 | Unit |
| AC-6 | Playwright exits 0 (scaffold placeholder e2e tests pass) | `1.1-E2E-001`, `1.1-E2E-002`, `1.1-E2E-003`, `1.1-E2E-004` | P1 | E2E |

**Coverage:** 6/6 acceptance criteria covered (100%).

---

## Test Design Alignment

Tests align with Epic 1 test design scenarios (`_bmad-output/test-artifacts/test-design/test-design-epic-1.md`):

| Scenario ID | Description | Test(s) |
|-------------|-------------|---------|
| `1.1-UNIT-001` | `bun install` + `bun run dev` (smoke) | `1.1-UNIT-001`, `1.1-UNIT-001b` |
| `1.1-UNIT-002` | `bun run build` produces Bun server bundle | `1.1-UNIT-002`, `1.1-UNIT-002b` |
| `1.1-UNIT-003` | ESLint + Prettier + svelte-check exit 0 | `1.1-UNIT-003a`, `1.1-UNIT-003b`, `1.1-UNIT-003c` |
| `1.1-UNIT-004` (P2) | `svelte-adapter-bun` produces standalone bundle | `1.1-UNIT-004` |
| `1.1-UNIT-005` (P3 — manual) | HMR responds within 1s | **not automated** (manual DX smoke per test design) |

---

## Task-by-Task Activation Guide

**During implementation of each task, activate the corresponding test group:**

### Task 1: `bunx sv create` scaffold + `bun install`
Activate: `1.1-UNIT-001`, `1.1-UNIT-001b`, `1.1-UNIT-001c`, `1.1-UNIT-001d`, `1.1-UNIT-001e`, `1.1-UNIT-001f`, `1.1-UNIT-001g`

```bash
# Remove test.skip( → test( for each test, then run:
bun run test -- tests/unit/scaffold.spec.ts
# Expect: FAIL (red) — then implement, then PASS (green)
```

### Task 2: `shadcn-svelte init`
No additional test activations — `components.json` checked in `1.1-UNIT-001c`.

### Task 3: `svelte-adapter-bun` + `bun run build`
Activate: `1.1-UNIT-002`, `1.1-UNIT-002b`, `1.1-UNIT-004`

```bash
bun run test -- tests/unit/scaffold.spec.ts
```

### Task 4: Verify directory structure
Already covered by `1.1-UNIT-001c`–`1.1-UNIT-001h`.

### Task 5: Run all quality gates
Activate: `1.1-UNIT-003a`, `1.1-UNIT-003b`, `1.1-UNIT-003c`, `1.1-UNIT-003d`
Activate E2E: `1.1-E2E-001`, `1.1-E2E-002`, `1.1-E2E-003`, `1.1-E2E-004`

```bash
# After all tasks done, activate ALL remaining tests:
bun run test -- tests/unit/scaffold.spec.ts
bun run test:e2e -- tests/e2e/scaffold-smoke.spec.ts
```

---

## Required `data-testid` Attributes

None required for Story 1.1 (no UI components implemented in this story).

---

## Mock Requirements

None — Story 1.1 tests only check file system state and shell command exit codes.
No network calls or external services are involved.

---

## Fixture Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| `tests/support/fixtures/scaffold-context.ts` | Type stubs and path constants for unit tests | Created (RED phase stub) |

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
# Run unit tests only (Story 1.1)
bun run test -- tests/unit/scaffold.spec.ts

# Run all unit tests
bun run test

# Run E2E smoke tests (requires dev server running: bun run dev)
bun run test:e2e -- tests/e2e/scaffold-smoke.spec.ts

# Run all E2E tests
bun run test:e2e

# Run full quality gate (mirrors CI)
bun run lint && bun run format && bun run check && bun run test && bun run build
```

---

## Assumptions & Known Constraints

1. **No test framework config yet** — `playwright.config.ts` and `vitest.config.ts` do not exist before `sv create` runs. The unit tests run against the future project root (same worktree).
2. **Sequential execution** — subagent mode was not used (no parallel execution available in this context). Tests generated sequentially.
3. **Bun only** — all commands use `bun run *`. No `npm`/`yarn`/`pnpm`.
4. **Thai text rule** — no Thai text hardcoded in test files (per project memory rule: Rawinan handles all translations). Tests only assert that Paraglide locale attributes are set, never hardcode Thai strings.
5. **Story 1.1 scope** — tests do not create `src/lib/server/`, `src/lib/components/`, etc. Those are established by later stories.
6. **P3 scenario excluded** — `1.1-UNIT-005` (HMR 1s response) is marked as manual/informational in the test design and is not automated here.

---

## Next Steps for Dev Agent

1. **Pick up the story:** `bmad-dev-story` with story file `_bmad-output/implementation-artifacts/1-1-scaffold-the-project.md`
2. **Activate tests task-by-task** using the guide above — confirm RED before implementing, GREEN after
3. **After Story 1.1 is done:** run `bmad-testarch-automate` to generate the full automated test suite for CI (Story 1.8 concern)
4. **After Epic 1 is complete:** run `bmad-testarch-nfr-assess` with CI evidence to produce the first NFR pass/fail assessment

---

## Completion Summary

- **Story:** 1.1 — Scaffold the Project
- **TDD Phase:** RED
- **Total Tests Generated:** 17 (all `test.skip()`)
  - Unit tests: 13 (in `tests/unit/scaffold.spec.ts`)
  - E2E tests: 4 (in `tests/e2e/scaffold-smoke.spec.ts`)
- **Priority breakdown:** P1: 14, P2: 3
- **Acceptance criteria covered:** 6/6 (100%)
- **Fixtures created:** 1 stub (full fixtures in Story 1.8)
- **Mock requirements:** 0
- **data-testid requirements:** 0

**Generated by:** BMad TEA Agent — ATDD Module
**Workflow:** `bmad-testarch-atdd`
**Version:** 4.0 (BMad v6)
