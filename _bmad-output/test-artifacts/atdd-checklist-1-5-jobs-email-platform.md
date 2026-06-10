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
storyId: '1.5'
storyKey: '1-5-jobs-email-platform'
storyFile: '_bmad-output/implementation-artifacts/1-5-jobs-email-platform.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-5-jobs-email-platform.md'
generatedTestFiles:
  - src/lib/server/jobs/queues.test.ts
  - src/lib/server/email/mailer.test.ts
  - src/lib/server/jobs/handlers/smoke-email.test.ts
  - src/worker.integration.test.ts
  - tests/unit/jobs-email-platform.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/1-5-jobs-email-platform.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-1.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad/tea/config.yaml
tddPhase: RED
---

# ATDD Checklist — Story 1.5: Jobs & Email Platform

**Date:** 2026-06-10
**Story ID:** 1.5
**Story Key:** 1-5-jobs-email-platform
**TDD Phase:** RED (all tests skipped — implementation pending)
**Workflow:** bmad-testarch-atdd
**Execution Mode:** SEQUENTIAL (unit → integration)
**Stack:** fullstack (detected: SvelteKit + Bun; no UI surface for this story — unit/integration tests only)

---

## Story Summary

> As a developer, I want a pg-boss worker process and a nodemailer transport (Mailpit in dev), so that later epics can enqueue durable jobs and send email reliably.

**Note:** This is a pure infrastructure story with no UI surface. All tests are Vitest unit and integration tests. No Playwright/E2E tests are generated for this story (story dev notes explicitly state this).

---

## TDD Red Phase — Current Status

All scaffolds are generated with `test.skip()`.

| File | Tests | Priority Coverage | Status |
|------|-------|-------------------|--------|
| `src/lib/server/jobs/queues.test.ts` | 17 | P1×15, P2×2 | RED (skipped) |
| `src/lib/server/email/mailer.test.ts` | 7 | P1×5, P2×2 | RED (skipped) |
| `src/lib/server/jobs/handlers/smoke-email.test.ts` | 6 | P1×5, P2×1 | RED (skipped) |
| `src/worker.integration.test.ts` | 4 | P1×4 | RED (skipped, Story 1.8) |
| `tests/unit/jobs-email-platform.spec.ts` | 44 | P1×40, P2×4 | RED (skipped) |
| **Total** | **78** | **P1×69, P2×9** | **RED** |

---

## Step 1: Preflight & Context

### Stack Detection

- **Project manifests found:** `package.json` (SvelteKit, Vite, Playwright), `playwright.config.ts`
- **Detected stack:** `fullstack`
- **Test surface for this story:** backend only (no UI added in Story 1.5)
- **Test framework:** Vitest (unit/integration); Playwright config exists but not used for this story
- **Mode:** AI generation (no recording needed — no browser interactions)

### Prerequisites Check

- [x] Story approved with clear acceptance criteria (6 ACs)
- [x] `playwright.config.ts` exists (fullstack prerequisite)
- [x] `vite.config.ts` with Vitest config (`test.projects` array) exists
- [x] `bun run test` script wired (`vitest --run`)
- [x] Story file: `_bmad-output/implementation-artifacts/1-5-jobs-email-platform.md`

### TEA Config

- `tea_use_playwright_utils`: true (not relevant for this story — no E2E tests)
- `tea_use_pactjs_utils`: false
- `tea_pact_mcp`: none
- `tea_browser_automation`: auto
- `tea_execution_mode`: auto → resolved to sequential (no subagents launched)
- `test_stack_type`: auto → fullstack

---

## Step 2: Generation Mode

**Mode selected: AI generation**

Rationale: All acceptance criteria for Story 1.5 are backend-only (job queue setup, email transport, env validation, ESLint rule, Mailpit compose service). No UI surface exists in this story. AI generation from acceptance criteria and dev notes is appropriate.

---

## Step 3: Test Strategy

### Acceptance Criteria → Test Scenario Mapping

| AC | Description | Test Level | Priority | Test IDs |
|----|-------------|------------|----------|----------|
| AC-1 | Worker starts and pg-boss polls without errors | Unit (file existence) + Integration | P1 | 1.5-UNIT-007, 1.5-UNIT-008, 1.5-INT-001 |
| AC-2 | smoke-email job enqueued → handler picks up → email in Mailpit | Unit (queues, mailer, handler) + Integration | P1 | 1.5-UNIT-002..005, 1.5-INT-002 |
| AC-3 | Idempotency key prevents duplicate emails | Integration | P1 | 1.5-INT-003 |
| AC-4 | Transport error → pg-boss dead-letter (state=failed) | Unit (error propagation) + Integration | P1 | 1.5-UNIT-006, 1.5-INT-004 |
| AC-5 | ESLint blocks `$app/*` and `$env/dynamic*` imports in server/worker files | Unit (file content) | P1 | 1.5-UNIT-009, 1.5-UNIT-009d |
| AC-6 | Missing env vars → fail-fast process.exit(1) before pg-boss connects | Unit (file content + schema) | P1 | 1.5-UNIT-010, 1.5-UNIT-012 |

### Test Level Distribution

- **Unit (pure):** 74 tests across 4 files — Valibot schemas, nodemailer stub, handler spy, ESLint rule, env validation, file existence, quality gates
- **Integration:** 4 tests in `src/worker.integration.test.ts` — all `test.skip()` until Story 1.8 wires real Postgres + Mailpit

### Out of Scope

- No Playwright E2E tests (no UI surface in Story 1.5)
- No Pact contract tests (`tea_use_pactjs_utils: false`)
- No `send-email` handler unit tests (Story 1.5 only scaffolds the handler; full send-email tests belong with the feature story that uses it)

---

## Step 4: Test Generation

### Generated Files

#### 1. `src/lib/server/jobs/queues.test.ts` (17 tests)

Tests for the `QUEUE` constants object and Valibot payload schemas.

**Scenarios:**
- `1.5-UNIT-001` — QUEUE.SMOKE_EMAIL = "smoke-email" (kebab-case, verb-led)
- `1.5-UNIT-001b` — QUEUE.SEND_EMAIL = "send-email"
- `1.5-UNIT-001c` — all QUEUE values match kebab-case pattern
- `1.5-UNIT-002` — SmokeEmailPayload: valid payload accepted
- `1.5-UNIT-002b` — SmokeEmailPayload: rejects invalid email
- `1.5-UNIT-002c` — SmokeEmailPayload: rejects missing `to`
- `1.5-UNIT-002d` — SmokeEmailPayload: rejects missing `requestedAt`
- `1.5-UNIT-002e` — SmokeEmailPayload: rejects null
- `1.5-UNIT-003` — SendEmailPayload: valid full payload accepted
- `1.5-UNIT-003b` — SendEmailPayload: optional htmlBody accepted absent
- `1.5-UNIT-003c` — SendEmailPayload: rejects invalid email
- `1.5-UNIT-003d` — SendEmailPayload: rejects empty subject
- `1.5-UNIT-003e` — SendEmailPayload: rejects empty textBody
- `1.5-UNIT-003f` — SendEmailPayload: rejects missing fields
- `1.5-UNIT-003g` — SendEmailPayload: unknown fields handled gracefully

**Fixture strategy:** Dynamic `import('./queues.js')` with `.catch()` for red-phase (module not yet present). Inline valibot import.

#### 2. `src/lib/server/email/mailer.test.ts` (7 tests)

Tests for `sendMail()` using a stubbed nodemailer transport. Verifies FR-083 sender display name rule.

**Scenarios:**
- `1.5-UNIT-004` — sendMail sets correct `from` field (includes SMTP_DISPLAY_NAME and SMTP_FROM)
- `1.5-UNIT-004b` — sendMail passes `to` field through
- `1.5-UNIT-004c` — sendMail passes `subject` field through
- `1.5-UNIT-004d` — sendMail passes `text` field through
- `1.5-UNIT-004e` — sendMail passes optional `html` field through
- `1.5-UNIT-004f` — sendMail returns transport result
- `1.5-UNIT-004g` — sendMail does not send html when omitted

**Fixture strategy:** `vi.mock('nodemailer')` with `sendMailMock` spy. `vi.mock('../env.js')` with hardcoded test env values.

#### 3. `src/lib/server/jobs/handlers/smoke-email.test.ts` (6 tests)

Tests for the `smokeEmailHandler` function using a spied `sendMail`.

**Scenarios:**
- `1.5-UNIT-005` — handler calls sendMail exactly once
- `1.5-UNIT-005b` — handler passes `to` address to sendMail
- `1.5-UNIT-005c` — handler sends non-empty subject
- `1.5-UNIT-005d` — handler sends non-empty text body
- `1.5-UNIT-005e` — handler does not call sendMail more than once
- `1.5-UNIT-006` — handler propagates errors (enables pg-boss dead-letter)

**Fixture strategy:** `vi.mock('../../email/mailer.js')` with `sendMailSpy`. Minimal pg-boss job stub typed inline. `vi.mock('../../env.js')`.

#### 4. `src/worker.integration.test.ts` (4 tests)

Integration tests requiring real Postgres + Mailpit. All wrapped in `test.skip()`.

**Scenarios:**
- `1.5-INT-001` — Worker starts and pg-boss begins polling without errors
- `1.5-INT-002` — Enqueue smoke-email → handler fires → sendMail invoked with correct args
- `1.5-INT-003` — Idempotency: same key enqueued twice → only one email
- `1.5-INT-004` — Dead-letter: failed handler causes job to land in pgboss.job with state=failed

**Activation note:** These tests require Story 1.8 (Test Harness & CI) to provide real Postgres and Mailpit in the CI environment.

#### 5. `tests/unit/jobs-email-platform.spec.ts` (44 tests)

Quality gates, cross-cutting concerns, file existence, and package.json validation.

**Scenario groups:**
- `1.5-UNIT-007` series — Required files exist (worker.ts, env.ts, boss.ts, queues.ts, index.ts, mailer.ts, handlers)
- `1.5-UNIT-008` series — package.json scripts and dependencies (worker script, pg-boss, nodemailer, valibot; NOT @types/pg-boss)
- `1.5-UNIT-009` series — ESLint no-restricted-imports rule present and correct
- `1.5-UNIT-010` series — .env.example has SMTP vars (SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_DISPLAY_NAME)
- `1.5-UNIT-011` series — compose.yaml has mailpit service (image, SMTP port 1025, web UI port 8025)
- `1.5-UNIT-012` series — env.ts Valibot fail-fast pattern (exports env, uses v.safeParse, calls process.exit(1))
- `1.5-UNIT-013` series — Quality gates: lint, check, format all exit 0

---

## Step 5: Validation

### TDD Red Phase Compliance

- [x] All 78 tests use `test.skip()` — none will run in CI until developer activates
- [x] All tests assert EXPECTED behavior (not placeholder `expect(true).toBe(true)`)
- [x] Tests are realistic: real email addresses, real pg-boss job structure, real Valibot schema patterns
- [x] Error scenarios included for AC-4 (dead-letter) and schema boundary tests
- [x] Integration tests explicitly deferred to Story 1.8

### Acceptance Criteria Coverage

| AC | P1 Tests | P2 Tests | Integration | Coverage |
|----|----------|----------|-------------|----------|
| AC-1 (worker polls) | 8 | 0 | 1 | Full |
| AC-2 (smoke-email works) | 12 | 1 | 1 | Full |
| AC-3 (idempotency) | 0 | 0 | 1 | Integration only |
| AC-4 (dead-letter) | 1 | 0 | 1 | Unit + Integration |
| AC-5 (ESLint rule) | 4 | 0 | 0 | Full |
| AC-6 (env fail-fast) | 8 | 0 | 0 | Full |
| Quality gates (Task 11) | 3 | 0 | 0 | Gates |

### Architecture Compliance Tests

- `1.5-UNIT-009c` — env.ts does NOT import `$env/dynamic/private` (uses `process.env`)
- `1.5-UNIT-009d` — worker.ts does NOT import `$app/*` or `$env/dynamic*`
- `1.5-UNIT-008e` — `@types/pg-boss` NOT installed (pg-boss ships its own types)
- `1.5-UNIT-009` — ESLint rule configured for `src/worker.ts` and `src/lib/server/**/*.ts`

### Known Risks / Assumptions

1. **Integration test timing:** pg-boss polling interval can be 1–3s. `waitFor()` helper uses 250ms polling with 10s timeout (30s for dead-letter). May need tuning in Story 1.8.
2. **pg-boss `getJobs()` API:** The dead-letter test (`1.5-INT-004`) uses `boss.getJobs()` which may have a different API in pg-boss v10. Verify in Story 1.8.
3. **Valibot v1 API:** Tests use `v.safeParse()` which is the correct v1 API. The implementation must use `v.object()`, `v.pipe()`, `v.safeParse()`, `v.flatten()` from valibot v1.
4. **smoke-email handler signature:** The handler is expected to accept a pg-boss job object and return `Promise<void>`. The handler signature test uses `MinimalJob<T>` stub — verify against actual pg-boss `Job<T>` type when implementing.

---

## Completion Summary

**Test files generated:** 5
**Total tests:** 78 (all skipped — TDD red phase)
**Priority breakdown:** P1×69, P2×9
**Next workflow:** `bmad-agent-dev` → Story 1.5 implementation

**Activation order for TDD red-green cycle:**

1. Task 1 (install deps) → activate `1.5-UNIT-008b/c/d/e`
2. Task 2 (jobs module) → activate `1.5-UNIT-001*`, `1.5-UNIT-002*`, `1.5-UNIT-003*`, `1.5-UNIT-007c/d/e`
3. Task 3 (email module) → activate `1.5-UNIT-004*`, `1.5-UNIT-007f`
4. Task 4 (env.ts) → activate `1.5-UNIT-012*`, `1.5-UNIT-009c`, `1.5-UNIT-007b`
5. Task 5 (worker.ts) → activate `1.5-UNIT-007a`, `1.5-UNIT-009d`, `1.5-UNIT-007g/h`
6. Task 6 (worker script) → activate `1.5-UNIT-008`
7. Task 7 (.env.example) → activate `1.5-UNIT-010*`
8. Task 8 (ESLint rule) → activate `1.5-UNIT-009*`
9. Task 9 (compose.yaml) → activate `1.5-UNIT-011*`
10. Task 11 (quality gates) → activate `1.5-UNIT-013*`
11. Story 1.8 (CI services) → activate all `1.5-INT-*`
