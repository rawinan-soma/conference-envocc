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
  - _bmad-output/implementation-artifacts/1-1-scaffold-the-project.md
  - _bmad-output/implementation-artifacts/1-6-audit-log-write-hook-foundation.md
  - _bmad-output/implementation-artifacts/1-8-test-harness-ci.md
  - _bmad-output/test-artifacts/atdd-checklist-1-6-audit-log-write-hook-foundation.md
  - _bmad-output/test-artifacts/atdd-checklist-1-8-test-harness-ci.md
  - _bmad/tea/config.yaml
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/risk-governance.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/probability-impact.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-levels-framework.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-priorities-matrix.md
---

# Test Design: Epic 1 — Foundation & Walking Skeleton

**Date:** 2026-06-11
**Author:** Rawinan
**Status:** Draft (v4 — updated post Stories 1.6 & 1.8 completion; Story 1.9 ATDD stubs added)
**Mode:** Epic-Level Test Design

---

## Executive Summary

**Scope:** Epic-level test design for Epic 1 — Foundation & Walking Skeleton

Epic 1 establishes the entire technical foundation: the SvelteKit + Bun scaffold, the PostgreSQL schema (critically including the `btree_gist` EXCLUDE constraint that underpins conflict-free booking), the audit log, the pg-boss job platform, Thai i18n, the Docker deployment skeleton, and the test harness/CI pipeline. This is not a user-facing epic — its deliverable is a *deployable, themed, Thai-capable shell* that proves every hard cross-cutting mechanism end-to-end through one vertical slice.

**Why this epic is high-stakes for testing:**
All later epics build on the foundations set here. A misconfigured EXCLUDE constraint, a missing migration step, or a broken Paraglide pipeline discovered in Epic 3 is far more expensive to fix than discovering it now. The goal of this test design is to ensure the walking skeleton *fails fast and loudly* if any foundation layer is misconfigured.

**Implementation Status Update (v4, 2026-06-11):**
Stories 1.1 through 1.8 are **done**. Story 1.9 is **backlog** (next up).

Key implementation nuances from done stories that affect test scenarios:

**Story 1.1 (Scaffold — done 2026-06-09):**
- Adapter wired in `vite.config.ts` (not `svelte.config.js`) — artifact location: `build/index.js`
- Dev compose file is `compose.yaml` (db + mailpit only — no web/worker services in dev compose)
- Test directory structure: `tests/unit/`, `tests/e2e/`, `tests/support/fixtures/` — all created
- Build warning `[UNRESOLVED_IMPORT] async_hooks` is expected and benign

**Story 1.2 (Design System — done):**
- Tailwind v4 CSS-only config (NO `tailwind.config.js`) — all theming inside `@theme {}` block in `src/app.css`
- Thai body line-height is `leading-[1.65]` (≥1.65, not 1.6) per DESIGN.md — **test scenario 1.2-COMP-002 threshold is ≥1.65**
- ATDD stubs generated: `tests/unit/design-system.spec.ts` (15 tests, RED), `tests/e2e/design-system-theme.spec.ts` (10 tests, RED)
- shadcn-svelte with Tailwind v4 uses hex values (not oklch) for the Forest & Copper palette

**Story 1.3 (Database migration + EXCLUDE constraint — done):**
- No implementation artifact file created; story marked done in sprint-status.yaml
- EXCLUDE constraint and schema splits confirmed done; btree_gist extension required

**Story 1.4 (Internationalization — done):**
- `eslint-plugin-no-hardcoded-strings` is the actual ESLint plugin used — **NOT** `svelte/no-raw-text` (that rule does not exist in eslint-plugin-svelte v3.19.0)
- Canonical message keys: `app_name` and `home_title` in `messages/en.json`; `messages/th.json` uses English placeholder values (not Thai — per project rule)
- ATDD stubs generated: `tests/unit/i18n-messages.spec.ts` (6 tests, GREEN), `tests/unit/i18n-config.spec.ts` (5 tests, GREEN), `tests/e2e/i18n-setup.spec.ts` (5 tests, skipped)
- `src/hooks.server.ts` uses `paraglideMiddleware` with `transformPageChunk` replacing `%paraglide.lang%` and `%paraglide.dir%`

**Story 1.5 (Jobs & Email — done):**
- `src/lib/server/env.ts` created with Valibot-based `validateEnv()` — validates DATABASE_URL, PORT, HOST at startup; `process.exit(1)` on failure
- `compose.yaml` (dev) updated to include `mailpit` service (SMTP 1025, web UI 8025)
- ESLint `no-restricted-imports` rule scoped to `src/worker.ts` + `src/lib/server/**/*.ts` — blocks `$app/*` and `$env/dynamic*`
- ATDD stubs generated: `src/lib/server/jobs/queues.test.ts` (17, RED), `src/lib/server/email/mailer.test.ts` (7, RED), `src/lib/server/jobs/handlers/smoke-email.test.ts` (6, RED), `src/worker.integration.test.ts` (4, RED — Story 1.8 gate), `tests/unit/jobs-email-platform.spec.ts` (44, RED)

**Story 1.7 (Docker — done):**
- **Production compose file is `docker-compose.prod.yml`** (not `docker-compose.yml` nor `compose.yaml`) — Docker smoke tests for R-002/R-006 must target `docker-compose.prod.yml`
- Web container command: `sh -c "bunx drizzle-kit migrate && bun run build/index.js"` — migration pre-start confirmed
- `src/lib/server/env.ts` with `validateEnv()` already exists from Story 1.5 — Story 1.7 extended it with HOST/PORT defaults
- ATDD stubs generated: `src/lib/server/env.test.ts` (6, RED), `tests/unit/docker-deployment.spec.ts` (16, RED), `tests/support/fixtures/docker-context.ts`

**Story 1.6 (Audit Log Write Hook — done 2026-06-10):**
- `src/lib/server/db/` module created: `schema/audit-log.ts`, `schema/index.ts`, `schema.ts` (barrel), `index.ts` (Pool + drizzle)
- `src/lib/server/services/audit.ts` with `writeAuditLog(tx, entry)` helper + `AuditLogEntry` type (relative imports throughout)
- Migration: `drizzle/0000_broken_masked_marvel.sql` — `CREATE TABLE "audit_log"` with 6 columns (id UUID v7 PK, created_at, actor_id nullable, entity, action, diff jsonb)
- `uuidv7@1.2.1` added as production dependency
- ATDD unit tests activated (16/16 pass); integration tests remain `test.skip` (activated in Story 1.8)
- **ATDD files:** `src/lib/server/db/schema/audit-log.test.ts` (9 unit, GREEN), `src/lib/server/services/audit.test.ts` (7 unit, GREEN), `src/lib/server/services/audit.integration.test.ts` (3 integration, activated by Story 1.8)
- Code review patch: removed unnecessary `as Record<string, unknown> | null` cast on `diff` parameter
- Pre-existing check/test failures from Story 1.7 hooks.server.ts `validateEnv` mismatch — resolved in Story 1.8

**Story 1.8 (Test Harness & CI — done 2026-06-10):**
- `src/lib/server/env.ts` refactored: `validateEnv(record)` now exported; SMTP vars optional; all 6 env tests GREEN; svelte-check passes 0 errors
- `@testcontainers/postgresql`, `testcontainers`, `@axe-core/playwright` added as dev deps
- Real-Postgres integration tier added: `integration` Vitest project in `vite.config.ts`; `tests/support/integration-setup.ts`, `tests/support/fixtures/pg-factory.ts`, `tests/support/fixtures/testcontainers-context.ts`
- `src/lib/server/db/schema.ts` (bookings + EXCLUDE), `src/lib/server/db/index.ts`, `drizzle/0000_init.sql` (hand-written migration with btree_gist + EXCLUDE) — Story 1.3 carry-forward completed here
- 4 integration tests in `src/worker.integration.test.ts` un-skipped and active
- `tests/integration/db-schema.test.ts` — 5 active tests (constraint-exists + conflict tests) — P0 gate
- `tests/e2e/a11y-smoke.spec.ts` (axe-core) + `tests/e2e/thai-render-smoke.spec.ts` (Thai font/locale) — activated
- `.github/workflows/ci.yml` created with 5 jobs: quality, test-unit, test-integration, test-e2e, build-images, vuln-scan
- `package.json` scripts: `test:integration`, `test:ci` added; `bun run test` scoped to `--project server` (no DB needed)
- All 23 Story 1.8 unit tests pass; 6 env tests pass
- Pre-existing Story 1.2 failures (`1.2-UNIT-008`, `1.2-UNIT-010`, `1.2-UNIT-012`) in `tests/unit/design-system.spec.ts` remain — awaiting Story 1.9 home-page fill (deferred-work.md)

**Risk Summary:**

- Total risks identified: 13
- High-priority risks (score ≥6): 7
- Critical categories: DATA, BUS, OPS, SEC, TECH

**Coverage Summary:**

- P0 scenarios: 14 (~28–38 hours)
- P1 scenarios: 16 (~20–28 hours)
- P2/P3 scenarios: 12 (~8–14 hours)
- **Total effort**: ~56–80 hours (~7–10 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Authentication / OIDC** | Epic 2 concern | Auth tested in Epic 2 test design |
| **Booking conflict UI flows** | Epic 4 concern | EXCLUDE constraint tested here at DB level only |
| **Email content / template rendering** | Only smoke delivery tested here | Full content tested in relevant later epics |
| **PDF / QR generation** | Epic 6/7 concern | Not set up in Epic 1 |
| **Performance / load testing** | No user load in foundation epic | Defer to Epic 4+ test design |
| **Accessibility full audit** | axe-core smoke is in scope; full audit is Epic 4+ | axe-core CI check validates baseline |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | DATA | `btree_gist` EXCLUDE constraint absent or misconfigured — overlapping bookings for same room accepted silently; every later booking write is unsafe | 3 | 3 | **9** | Dedicated integration test asserts `23P01` is raised on overlap insert; separate test asserts constraint exists in migrated schema; slice fails build if constraint missing | Dev / QA | Before Story 1.3 done |
| R-002 | OPS | `drizzle-kit migrate` not executed pre-start in Docker — app starts with stale or missing schema | 3 | 3 | **9** | Docker Compose spec test: `docker compose up`, assert web container healthy, assert migrations have run (query `information_schema.tables`) | Dev / Ops | Before Story 1.7 done |
| R-003 | DATA | Audit-log write not atomic with the change — a rolled-back business transaction may still write an audit row, or a committed change may lack an audit row | 2 | 3 | **6** | Integration test: invoke audit helper inside a transaction, roll back, assert zero audit rows written; then commit, assert one row | Dev / QA | Before Story 1.6 done |
| R-004 | BUS | Thai locale not active or Paraglide messages missing — user-facing strings render as keys or English in production locale | 2 | 3 | **6** | Integration + E2E test: request page with `lang=th`, assert rendered HTML contains Paraglide-rendered Thai string, not raw key; axe-core checks Thai line-height ≥1.65 (DESIGN.md value) | Dev / QA | Story 1.4 **done** |
| R-005 | BUS | pg-boss job processed but email never sent / lands in dead-letter unnoticed — foundation broken silently | 2 | 3 | **6** | Integration test: enqueue smoke job, poll worker, assert Mailpit inbox contains expected email within timeout; assert dead-letter count is zero | Dev / QA | Before Story 1.5 done |
| R-006 | SEC | Runtime secrets missing at startup — app starts with `undefined` env values, potentially exposing defaults or crashing unpredictably | 2 | 3 | **6** | E2E/Ops test: start Docker Compose with a missing required env var, assert app container exits with non-zero code and a clear error message (fail-fast) | Dev / Ops | Before Story 1.7 done |
| R-007 | OPS | `bun run build` / image build failure undetected — CI pipeline does not enforce build gate | 2 | 3 | **6** | CI job runs `bun run build` and Docker image build; build failure fails the PR gate | Dev / CI | Story 1.8 |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ---- | ------ | ----- | ---------- | ----- |
| R-008 | TECH | Drizzle schema not split into per-domain modules — violates architecture rule, creates future merge conflicts | 2 | 2 | 4 | Unit/static test: lint rule or test that imports verify no single `schema.ts` file; directory structure assertion | Dev |
| R-009 | BUS | Hardcoded UI strings bypass lint check — committing inline strings in `.svelte` files goes undetected | 2 | 2 | 4 | CI check: `bun run lint` with no-inline-strings rule; test: add a hardcoded string to a test file, assert lint fails | Dev / QA |
| R-010 | TECH | `svelte-check` / TypeScript errors suppressed or not run in CI — type regressions accumulate silently | 2 | 2 | 4 | CI gate runs `bun run check` (`svelte-check`); any type error fails the PR | Dev / CI |
| R-011 | OPS | nginx proxy headers (`X-Forwarded-*`) not propagated — IP-based rate-limiting, redirects, and session security broken in production | 2 | 2 | 4 | Integration test: assert response headers include `X-Forwarded-For` / `X-Forwarded-Proto` after request through nginx proxy | Dev / Ops |
| R-012 | BUS | pg-boss job handlers import `$app/*` or `$env/dynamic` — worker process crashes on startup | 2 | 2 | 4 | Lint rule + unit test: import graph check verifies no `$app/*` or `$env/dynamic` in worker handler modules | Dev |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Prob | Impact | Score | Action |
| ------- | -------- | ----------- | ---- | ------ | ----- | ------ |
| R-013 | BUS | Thai fonts render below 14px minimum on some viewport sizes — typography rule violated | 1 | 2 | 2 | Monitor — axe-core + visual snapshot catches gross violations; full typography audit deferred to Epic 4 |

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
| **Data Integrity** | EXCLUDE constraint must reject overlapping bookings (`23P01`); audit rows atomic with change | R-001, R-003 | Integration tests (Story 1.3, 1.6, 1.9) | Test pass report; constraint-exists assertion in CI |
| **Security (secrets)** | All runtime secrets validated at startup; missing secret = fast-fail exit (non-zero code) | R-006 | Docker compose test with missing env var | Container exit code log |
| **Reliability (jobs)** | Smoke job processed, email delivered; failed send → dead-letter (not lost) | R-005 | Integration test against Mailpit in Docker | Test pass report; Mailpit inbox assertion |
| **Maintainability** | ESLint + Prettier + svelte-check run clean; no hardcoded UI strings | R-009, R-010 | CI lint + typecheck gates | CI run log |
| **Accessibility (baseline)** | axe-core reports zero violations on rendered page | — | axe-core CI check (Story 1.8) | axe-core HTML report |
| **i18n / Thai** | Paraglide messages compile; Thai locale renders strings (line-height ≥1.65 per DESIGN.md `leading-[1.65]`, font-size ≥14px) | R-004 | Integration + visual snapshot (Story 1.4 done, Story 1.9) | Page HTML snapshot; visual diff |
| **Deployment** | `docker compose up` brings all services healthy; drizzle migrate runs pre-start | R-002, R-007 | Docker smoke test (Story 1.7) | Container health logs |

**Unknown thresholds:**
- No explicit p50/p95 response-time SLA defined for Epic 1 foundations (deferred to Epic 4). Mark UNKNOWN — performance baseline not required for this epic.
- No explicit uptime SLA for the walking skeleton (dev environment only at this stage). Mark UNKNOWN.

---

## Entry Criteria

- [ ] Story acceptance criteria agreed by Dev and QA
- [x] Local Docker Compose stack (PostgreSQL + Mailpit) reachable (`compose.yaml`) — mailpit added in Story 1.5
- [x] `bun install` succeeds (Story 1.1 **done** — 2026-06-09)
- [x] Test directory structure in place (`tests/unit/`, `tests/e2e/`, `tests/support/`) — Story 1.1 done
- [x] Design system tokens and Thai fonts wired (Story 1.2 **done**)
- [x] drizzle-kit configured and migrations run + EXCLUDE constraint live (Story 1.3 **done**)
- [x] Paraglide i18n configured, ESLint no-hardcoded-strings guard active (Story 1.4 **done**)
- [x] pg-boss worker process and nodemailer transport running; `src/lib/server/env.ts` present (Story 1.5 **done**)
- [x] Docker images (Dockerfile, Dockerfile.worker) build; `docker-compose.prod.yml` functional (Story 1.7 **done**)
- [x] Story 1.6 (audit log write hook) complete — `writeAuditLog` helper + `audit_log` migration live (done 2026-06-10)
- [x] Story 1.8 (test harness + CI) merged — real-Postgres integration tier, CI pipeline, axe-core (done 2026-06-10)
- [ ] Story 1.9 (walking skeleton vertical slice) complete before 1.9-INT-* tests can run

## Exit Criteria

- [ ] All P0 tests passing (zero failures)
- [ ] All P1 tests passing (zero failures, or each failure triaged with owner)
- [x] R-001 mitigation: EXCLUDE constraint test (`1.3-INT-001/002/003`) present in `tests/integration/db-schema.test.ts` (Story 1.8 done)
- [ ] R-001 verification: `1.3-INT-001/002/003` GREEN in CI (requires running integration tier)
- [ ] R-002 mitigation: migration pre-start Docker smoke test green
- [x] CI pipeline configured: lint + typecheck + Vitest + Playwright + build + image (Story 1.8 done — `.github/workflows/ci.yml`)
- [ ] CI pipeline green: first successful PR run (depends on Story 1.9 resolving pre-existing failures)
- [x] No high-risk items (score ≥6) remaining OPEN without mitigation plan (all R-001 through R-007 have plans or Complete status)
- [ ] Walking skeleton vertical slice (Story 1.9) passes end-to-end in Docker Compose
- [ ] Pre-existing Story 1.2 test failures (`1.2-UNIT-008/010/012`) resolved — home page needs Button + Thai typography classes (Story 1.9 scope)

---

## Risk Mitigation Plans

### R-001: EXCLUDE Constraint Absent or Misconfigured (Score: 9 — BLOCK)

**Mitigation Strategy:** Two mandatory integration tests:
1. **Constraint-exists test** — after `drizzle-kit migrate`, query `information_schema.table_constraints` for the EXCLUDE constraint name on `bookings`; fail if not present.
2. **Conflict-rejection test** — insert two overlapping `tstzrange` rows for the same `room_id`; assert PostgreSQL raises `SQLSTATE 23P01`; assert no second row was committed.

**Owner:** Dev lead (schema) + QA (test authoring)
**Timeline:** Merged with Story 1.3 implementation
**Status:** Planned
**Verification:** Both tests green in CI; build fails if constraint-exists test fails

---

### R-002: Migration Not Run Pre-Start (Score: 9 — BLOCK)

**Mitigation Strategy:** Docker smoke test (using `compose.yaml`):
1. Run `docker compose up -d` (cold start — no pre-existing volumes).
2. Poll until web container reports healthy.
3. Query `information_schema.tables` inside the running Postgres container — assert that `bookings`, `audit_log`, and Better Auth tables exist.
4. Assert app returns HTTP 200 on the health endpoint through nginx.

**Owner:** Dev / Ops
**Timeline:** Merged with Story 1.7
**Status:** Planned
**Verification:** Smoke test in CI; pipeline fails if migration assertion fails

---

### R-003: Audit-Log Not Atomic (Score: 6 — MITIGATE)

**Mitigation Strategy:** Integration tests at the DB/service layer (no UI):
1. Call audit helper inside an explicit transaction; roll back; assert `audit_log` count unchanged.
2. Call audit helper inside an explicit transaction; commit; assert `audit_log` has exactly one new row with correct actor/entity/action/diff fields.

**Owner:** Dev
**Timeline:** Merged with Story 1.6
**Status:** Complete (Story 1.6 done 2026-06-10)
**Verification:** 16 unit tests pass (`audit-log.test.ts`, `audit.test.ts`); integration tests activated in Story 1.8 (`audit.integration.test.ts`)

---

### R-004: Thai Locale Broken (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. Integration test: GET `/` with `Accept-Language: th`; assert response HTML contains at least one Paraglide-compiled string (`m.key()` output, not the raw key); `src/hooks.server.ts` `paraglideMiddleware` sets `lang`/`dir` attributes.
2. E2E (Playwright) smoke: render page, assert `lang="th"` on `<html>` tag; assert text is not the raw message key.
3. CSS computed-style test: assert Thai text element `line-height ≥ 1.65` (DESIGN.md `leading-[1.65]` class) and `font-size ≥ 14px`.
4. ESLint guard: `eslint-plugin-no-hardcoded-strings` (NOT `svelte/no-raw-text` — that rule does not exist in eslint-plugin-svelte v3.19.0) — lint test fires on inline strings; `bun run lint` exits 0 on clean codebase.
5. axe-core CI check (Story 1.8) will catch gross typography violations.

**Owner:** Dev (Paraglide config) + QA (test)
**Timeline:** Merged with Story 1.4 + Story 1.8
**Status:** Planned
**Verification:** Tests green in CI; axe-core zero violations

---

### R-005: Job/Email Platform Silent Failure (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. Integration test (against Mailpit API): enqueue the smoke job; poll recurse pattern until worker picks up job (max 10s); call Mailpit `/api/v1/messages`; assert at least one message with expected subject/sender.
2. Assert `pg_boss.dead_letter` has zero entries after the smoke run.

**Owner:** Dev
**Timeline:** Merged with Story 1.5
**Status:** Planned
**Verification:** Mailpit API assertion green in integration suite

---

### R-006: Missing Secrets at Startup (Score: 6 — MITIGATE)

**Mitigation Strategy:**
1. Docker test: launch `docker compose up web` with `DATABASE_URL` unset; assert container exits with non-zero code within 10s; assert stderr contains a meaningful error (not silent undefined).
2. Document in `compose.yaml` which env vars are required (fail-fast guard in app startup code).

**Owner:** Dev / Ops
**Timeline:** Merged with Story 1.7
**Status:** Planned
**Verification:** Docker exit-code assertion green in integration suite

---

### R-007: Build / Image Failure Undetected (Score: 6 — MITIGATE)

**Mitigation Strategy:** CI pipeline (Story 1.8) includes:
- `bun run build` as a required CI step
- `docker build` of web and worker images
- PR gate fails if either step fails

**Owner:** Dev / CI
**Timeline:** Story 1.8
**Status:** Complete (Story 1.8 done 2026-06-10)
**Verification:** `.github/workflows/ci.yml` live with `build-images` job; `bun run build` and Docker image build are PR gate steps

---

## Test Coverage Plan

> **Note:** P0/P1/P2/P3 labels denote **priority and risk level**, not execution timing. Execution timing (PR gate vs. nightly) is defined separately in the Execution Strategy section.

### Scenario ID Format

`1.{story}-{LEVEL}-{SEQ}` — e.g., `1.3-INT-001` = Epic 1, Story 3, Integration test, sequence 001.

### Done Stories — ATDD Stubs Generated (RED Phase)

**Story 1.1 (done):**
- `tests/unit/scaffold.spec.ts` — 13 unit tests; `tests/e2e/scaffold-smoke.spec.ts` — 4 E2E tests; `tests/support/fixtures/scaffold-context.ts`
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-1-scaffold-the-project.md`

**Story 1.2 (done):**
- `tests/unit/design-system.spec.ts` — 15 tests (P0: 8, P1: 5, P2: 2, all RED/skipped)
- `tests/e2e/design-system-theme.spec.ts` — 10 tests (P0: 6, P1: 4, all RED/skipped)
- `tests/support/fixtures/design-system-context.ts`
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-2-design-system-thai-typography.md`

**Story 1.4 (done):**
- `tests/unit/i18n-messages.spec.ts` — 6 tests (**GREEN — passing**)
- `tests/unit/i18n-config.spec.ts` — 5 tests (**GREEN — passing**)
- `tests/e2e/i18n-setup.spec.ts` — 5 tests (skipped — requires running dev server)
- `tests/support/helpers/cmd-helpers.ts` — shared helper
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-4-internationalization-setup.md`

**Story 1.5 (done):**
- `src/lib/server/jobs/queues.test.ts` — 17 tests (RED)
- `src/lib/server/email/mailer.test.ts` — 7 tests (RED)
- `src/lib/server/jobs/handlers/smoke-email.test.ts` — 6 tests (RED)
- `src/worker.integration.test.ts` — 4 tests (RED — gated on Story 1.8)
- `tests/unit/jobs-email-platform.spec.ts` — 44 tests (RED)
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-5-jobs-email-platform.md`

**Story 1.7 (done):**
- `src/lib/server/env.test.ts` — 6 tests (P0: 3, P1: 3, GREEN after Story 1.8 env.ts fix)
- `tests/unit/docker-deployment.spec.ts` — 16 tests (P0: 5, P1: 8, P2: 1, P3: 1, RED — requires Docker)
- `tests/support/fixtures/docker-context.ts`
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-7-docker-deployment-skeleton.md`

**Story 1.6 (done):**
- `src/lib/server/db/schema/audit-log.test.ts` — 9 unit tests (P1: 9, GREEN)
- `src/lib/server/services/audit.test.ts` — 7 unit tests (P1: 6, P2: 1, GREEN)
- `src/lib/server/services/audit.integration.test.ts` — 3 integration tests (P1: 3, activated in Story 1.8)
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-6-audit-log-write-hook-foundation.md`

**Story 1.8 (done):**
- `tests/unit/test-harness-ci.spec.ts` — 23 unit/static tests (P1: 18, P2: 2, GREEN — all 23 pass)
- `tests/integration/db-schema.test.ts` — 5 integration tests (P0: 3, P1: 2, active — require Postgres)
- `tests/e2e/a11y-smoke.spec.ts` — 2 E2E tests (axe-core, P1: 1, P2: 1, active)
- `tests/e2e/thai-render-smoke.spec.ts` — 4 E2E tests (P1: 3, P2: 1, active)
- `src/worker.integration.test.ts` — 4 integration tests (P1: 4, activated — un-skipped from Story 1.5)
- Infrastructure: `tests/support/fixtures/pg-factory.ts`, `tests/support/fixtures/testcontainers-context.ts`, `tests/support/integration-setup.ts`
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-1-8-test-harness-ci.md`

**Story 1.9 (backlog — ATDD stubs TBD):**
- ATDD checklist to generate: `_bmad-output/test-artifacts/atdd-checklist-1-9-walking-skeleton-vertical-slice.md`
- Expected test files (to be scaffolded): `tests/e2e/walking-skeleton.spec.ts`, `tests/integration/walking-skeleton.test.ts`
- Scenarios covered: 1.9-INT-001/002/003 (P0), 1.9-INT-004 (P3) — see P0/P3 tables below

**Total ATDD stubs generated across done stories:** ~200 tests (mix of GREEN unit tests, active integration tests, and RED skipped stubs)

---

---

### P0 (Critical)

**Criteria:** Blocks core journey + High risk (score ≥6) + No workaround

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | Notes |
| ----------- | ----- | -------------------- | ---------- | --------- | ----- |
| 1.3-INT-001 | 1.3 | `btree_gist` + EXCLUDE constraint exists in migrated schema | Integration | R-001 | Query `information_schema.table_constraints`; fail-fast gate |
| 1.3-INT-002 | 1.3 | Inserting two overlapping `tstzrange` rows for same room raises `23P01` | Integration | R-001 | Insert via raw SQL / Drizzle; assert PG error code |
| 1.3-INT-003 | 1.3 | Back-to-back non-overlapping ranges (10:00–11:00 / 11:00–12:00) do NOT raise conflict | Integration | R-001 | Half-open range semantics verification |
| 1.3-INT-004 | 1.3 | Schema split into per-domain modules (no single `schema.ts`) | Unit/Static | R-008 | Import-graph assertion or file-structure check |
| 1.6-INT-001 | 1.6 | Rolled-back transaction writes zero audit rows | Integration | R-003 | DB-level; rollback + count assertion |
| 1.6-INT-002 | 1.6 | Committed transaction writes exactly one audit row with correct fields | Integration | R-003 | Commit + schema assertion (timestamp, actor, entity, action, diff) |
| 1.5-INT-001 | 1.5 | Smoke job enqueued + worker processes it + Mailpit receives email | Integration | R-005 | Poll Mailpit API; 10s timeout; recurse pattern |
| 1.5-INT-002 | 1.5 | Dead-letter queue is empty after successful smoke job | Integration | R-005 | Query `pg_boss.dead_letter` |
| 1.7-INT-001 | 1.7 | `docker compose up` cold start: all services healthy, migrations applied | Integration/Ops | R-002 | `information_schema.tables` assertion inside container; uses `compose.yaml` |
| 1.7-INT-002 | 1.7 | App reachable through nginx; HTTP 200 on health endpoint | Integration/Ops | R-002 | curl through nginx port; assert status 200 |
| 1.7-INT-003 | 1.7 | Missing required env var causes web container to exit non-zero (fail-fast) | Integration/Ops | R-006 | Docker run without `DATABASE_URL`; assert exit code ≠ 0 |
| 1.9-INT-001 | 1.9 | Vertical slice: page renders themed page with Thai Paraglide string | E2E/Integration | R-004 | Playwright: assert `lang="th"` + Thai string visible |
| 1.9-INT-002 | 1.9 | Vertical slice: slice writes DB row and enqueues job that produces Mailpit email | E2E | R-001, R-005 | Full stack exercise through Docker Compose |
| 1.9-INT-003 | 1.9 | Conflict-rejection in vertical slice: overlapping insert fails `23P01` | Integration | R-001 | Confirms constraint is live in running Docker stack |

**Total P0:** 14 scenarios, ~28–38 hours

---

### P1 (High)

**Criteria:** Important foundation features + Medium risk (score 3–5) + Common workflows

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | Notes |
| ----------- | ----- | -------------------- | ---------- | --------- | ----- |
| 1.1-UNIT-001 | 1.1 | `bun install` succeeds and `bun run dev` serves (smoke) | Unit/Smoke | — | **ATDD stub generated** in `tests/unit/scaffold.spec.ts` |
| 1.1-UNIT-002 | 1.1 | `bun run build` produces Bun server bundle without errors | Unit/Build | R-007 | **ATDD stub generated**; build uses `vite.config.ts` + `svelte-adapter-bun` |
| 1.1-UNIT-003 | 1.1 | ESLint + Prettier + svelte-check run clean | Unit/Lint | R-010 | **ATDD stub generated** |
| 1.2-COMP-001 | 1.2 | shadcn-svelte component renders with Forest & Copper palette CSS vars applied | Component | — | Playwright component snapshot or visual check |
| 1.2-COMP-002 | 1.2 | Thai sample text renders at line-height ≥1.65 (`leading-[1.65]`) and font-size ≥14px | Component | R-004 | **ATDD stub in `tests/e2e/design-system-theme.spec.ts`**; Playwright + CSS computed style assertion |
| 1.4-UNIT-001 | 1.4 | Paraglide messages compile without errors | Unit | R-004 | `bun run build` includes Paraglide; assert no build errors |
| 1.4-UNIT-002 | 1.4 | Page renders Paraglide message via `m.key()` (not raw key string) | Integration | R-004 | GET page, assert rendered text ≠ raw key |
| 1.4-UNIT-003 | 1.4 | Hardcoded UI string in `.svelte` file fails lint check (`eslint-plugin-no-hardcoded-strings`) | Unit/Lint | R-009 | **ATDD stub in `tests/unit/i18n-messages.spec.ts`**; assert `bun run lint` exits non-zero (uses eslint-plugin-no-hardcoded-strings, NOT svelte/no-raw-text) |
| 1.5-INT-003 | 1.5 | Smoke job has idempotency key — re-enqueueing same key does not double-deliver | Integration | R-005 | Enqueue same idempotency key twice; assert Mailpit receives 1 email |
| 1.5-UNIT-001 | 1.5 | Job handler does not import `$app/*` or `$env/dynamic` | Unit/Static | R-012 | Import graph / AST check or grep assertion |
| 1.7-INT-004 | 1.7 | nginx propagates `X-Forwarded-For` and `X-Forwarded-Proto` headers | Integration | R-011 | curl request through nginx; assert headers in response |
| 1.7-INT-005 | 1.7 | Secrets load from env and are present in running container (non-sensitive check) | Integration | R-006 | Health endpoint returns DB-connected status |
| 1.8-INT-001 | 1.8 | CI runs lint + typecheck + Vitest + Playwright + build + image (all green) | Integration/CI | R-007, R-010 | CI pipeline definition + successful run |
| 1.8-INT-002 | 1.8 | axe-core check runs against rendered page and reports zero violations | Integration | — | Playwright + axe-core; zero-violation assertion |
| 1.8-INT-003 | 1.8 | Thai-render smoke: page with Thai content renders without font-substitution artifacts | Integration | R-004 | Playwright screenshot; no tofu boxes visible |
| 1.8-INT-004 | 1.8 | Dependency/vulnerability scanning runs in CI and gate fails on critical CVEs | CI | — | `bun audit` or equivalent; critical = fail |

**Total P1:** 16 scenarios, ~20–28 hours

---

### P2 (Medium)

**Criteria:** Secondary/edge-case coverage + Low risk (score 1–3)

| Scenario ID | Story | Acceptance Criterion | Test Level | Risk Link | Notes |
| ----------- | ----- | -------------------- | ---------- | --------- | ----- |
| 1.3-INT-005 | 1.3 | Cancelled booking row does not block a new overlapping booking (predicate-scoped constraint) | Integration | R-001 | Verify cancelled status excludes row from constraint scope |
| 1.5-INT-004 | 1.5 | Failed email send lands in dead-letter with visible status (SMTP unreachable) | Integration | R-005 | Mock SMTP unavailable; assert dead-letter row present |
| 1.6-INT-003 | 1.6 | Audit log row contains correct diff field (before/after values) | Integration | R-003 | Field-level diff assertion |
| 1.2-COMP-003 | 1.2 | Font tokens (Noto Serif Thai / Noto Sans Thai) loaded in rendered document | Component | R-004 | Playwright: `document.fonts` loaded assertion |
| 1.7-INT-006 | 1.7 | Worker container restarts cleanly after crash (pg-boss reconnects) | Integration/Ops | R-005 | `docker compose restart worker`; assert job processing resumes |
| 1.1-UNIT-004 | 1.1 | `svelte-adapter-bun` produces standalone server bundle (not node adapter) | Unit | — | Bundle output inspection under `.svelte-kit/adapter-bun/` |
| 1.5-INT-005 | 1.5 | pg-boss worker handles multiple concurrent jobs without duplicate delivery | Integration | R-005 | Enqueue 3 jobs simultaneously; assert 3 emails, no duplicates |

**Total P2:** 7 scenarios, ~5–8 hours

---

### P3 (Low) — Run on demand only

**Criteria:** Nice-to-have, exploratory, edge conditions

| Scenario ID | Story | Description | Test Level | Notes |
| ----------- | ----- | ----------- | ---------- | ----- |
| 1.2-COMP-004 | 1.2 | Visual snapshot baseline: shadcn button in Forest & Copper theme | Component | For future visual regression baseline |
| 1.7-INT-007 | 1.7 | Docker image size within reasonable bound (<500MB) | Ops | `docker image inspect`; informational |
| 1.9-INT-004 | 1.9 | Walking skeleton responds within 2s under single-user load (baseline) | E2E | No SLA set — informational only |
| 1.1-UNIT-005 | 1.1 | HMR (`bun run dev`) responds to file change within 1s | Manual/Smoke | Developer DX smoke — not automated; **ATDD stub noted as manual** |
| 1.4-UNIT-004 | 1.4 | Adding a new Paraglide locale compiles correctly | Unit | Future-readiness check |

**Total P3:** 5 scenarios, ~3–6 hours

---

## Execution Strategy

**Philosophy:** Run all functional tests on every PR if total wall-clock time is under 15 minutes (Playwright parallelizes well). Defer only tests that require expensive infrastructure (full Docker Compose cold-boot, visual snapshots, manual runs) to nightly.

### PR Gate (every PR — target < 15 min)

Run all P0 and P1 scenarios, plus lint/typecheck/build gates:

- Lint + typecheck + svelte-check (`bun run check`)
- Vitest unit + integration suite (P0 DB constraint tests, P0 audit-log tests, P1 unit tests)
- Playwright E2E suite (P0 walking-skeleton vertical slice, P1 component tests)
- `bun run build` + Docker image build

**Total: ~30 scenarios** — feasible in < 15 min with Playwright parallelization.

### Nightly

Scenarios with expensive setup or non-deterministic timing:

- P0 Docker Compose cold-start smoke (1.7-INT-001/002/003) — full `docker compose up` takes 2–3 min
- P2 edge-case scenarios (7 scenarios)
- Dependency / vulnerability scan (1.8-INT-004)

### On-Demand

- P3 scenarios (visual baselines, performance micro-benchmark, manual DX smoke)
- Full Docker image size assertion (1.7-INT-007)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Avg Hours/Test | Total Hours | Notes |
| -------- | ----- | -------------- | ----------- | ----- |
| P0 | 14 | 2.0–2.5 | 28–38 | DB/Docker integration setup heavy |
| P1 | 16 | 1.25–1.75 | 20–28 | Lint/CI steps lighter; component tests moderate; 3 ATDD stubs already generated (Story 1.1) |
| P2 | 7 | 0.75–1.25 | 5–8 | Edge cases; reuse P0/P1 fixtures |
| P3 | 5 | 0.5–1.0 | 3–6 | Visual baselines, manual |
| **Total** | **42** | — | **~56–80** | **~7–10 engineering days** |

**Savings from Story 1.1 completion:** ~3–4 hours of P1 test authoring offset by existing ATDD stubs in `tests/unit/scaffold.spec.ts` and `tests/e2e/scaffold-smoke.spec.ts`.

### Prerequisites

**Test Data / Fixtures:**
- `pgFactory` — Drizzle-backed fixture for seeding rooms + bookings rows (with auto-cleanup via transaction rollback or truncate)
- `dockerComposeFixture` — spins up Postgres + Mailpit for integration tier; tears down after suite; references `compose.yaml`
- `mailpitClient` — thin HTTP client wrapping Mailpit `/api/v1/messages` for inbox assertions
- `scaffold-context.ts` — already created at `tests/support/fixtures/scaffold-context.ts` (Story 1.1)

**Tooling:**
- Vitest (unit + integration) with Testcontainers or CI Postgres service for DB tests
- Playwright (E2E + component) with axe-core plugin
- Docker Compose CLI (called from test setup or CI shell steps; compose file: `compose.yaml`)
- `bun audit` or `npm audit` for dependency scanning

**Environment:**
- CI: Postgres service container (or Testcontainers) available; Docker daemon available for image build + compose tests
- Local: `docker compose up -d db mailpit` for integration suite isolation
- No external Authentik required for Epic 1 (auth is Epic 2)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (zero exceptions — any P0 failure blocks merge)
- **P1 pass rate:** ≥95% (each failure requires a triage comment with owner)
- **P2/P3 pass rate:** ≥90% (informational — failures do not block merge but are tracked)
- **High-risk mitigations (R-001 through R-007):** All must be status = Planned or Complete before Epic 1 is closed

### Coverage Targets

- **EXCLUDE constraint paths (critical):** 100% — all three branches (overlap rejected, back-to-back allowed, cancelled-excluded)
- **Audit log atomicity:** 100% — both commit and rollback paths tested
- **Job/email smoke:** 100% — delivery + dead-letter confirmed
- **Docker deployment smoke:** 100% — cold start, migration, nginx, fail-fast

### Non-Negotiable Requirements

- [ ] All P0 tests pass (zero failures) before Epic 1 is marked done
- [ ] R-001 (EXCLUDE constraint) — constraint-exists AND conflict-rejection tests both green
- [ ] R-002 (migration pre-start) — Docker smoke test green (`compose.yaml`)
- [ ] CI pipeline enforced: lint + typecheck + Vitest + Playwright + build + image all green on PR
- [ ] axe-core CI check reports zero violations
- [ ] No high-risk items (score ≥6) remaining OPEN without a mitigation plan

---

## Assumptions and Dependencies

### Assumptions

1. Story 1.1 (scaffold) is **done** — test infrastructure exists at `tests/unit/`, `tests/e2e/`, `tests/support/`. All other stories (1.2–1.9) are in `backlog` state; tests will be authored alongside implementation (TDD-friendly), not after.
2. A CI runner with Docker daemon access is available (required for Docker Compose smoke tests and image build gate).
3. Mailpit is available in the Docker Compose stack (`compose.yaml`) for email assertions (arch confirmed: Mailpit in dev).
4. The EXCLUDE constraint predicate (excludes `cancelled` bookings) is implemented exactly as described in architecture.md — if the predicate changes, R-001 test cases must be updated.
5. Paraglide source locale is `en`, production locale is `th`. No Thai text is hardcoded in code or mocks (per project memory rule — Rawinan handles all translations).
6. `bun audit` or equivalent provides dependency/CVE scanning output parseable in CI.
7. The compose file is `compose.yaml` (confirmed from Story 1.1) — all Docker test references must use this filename, not `docker-compose.yml`.
8. Build warning `[UNRESOLVED_IMPORT] async_hooks` is benign — Bun handles this at runtime. Tests must not flag this as a failure.
9. `svelte-adapter-bun` is wired via `vite.config.ts` (not a separate `svelte.config.js`) — build artifact output is under `.svelte-kit/adapter-bun/`.

### Dependencies

1. **Story 1.1 (scaffold)** — DONE. Test infrastructure exists.
2. **Story 1.3 (schema + constraint)** — DONE (completed as carry-forward in Story 1.8). EXCLUDE constraint live in `drizzle/0000_init.sql`.
3. **Story 1.6 (audit log)** — DONE. `writeAuditLog` helper and `audit_log` table live.
4. **Story 1.7 (Docker)** — DONE. `docker-compose.prod.yml` with web + worker + nginx + Postgres.
5. **Story 1.8 (test harness + CI)** — DONE. Integration tier, CI pipeline, axe-core, constraint tests in place.
6. **Story 1.9 (walking skeleton)** — BACKLOG. Integration tests `1.9-INT-001/002/003` depend on the route + full stack wiring.
7. **Mailpit** — email integration tests (R-005) require Mailpit service in compose stack (already in `compose.yaml`).

### Risks to Plan

- **Risk:** CI runner without Docker daemon access — Docker Compose smoke tests and image build gate cannot run.
  - **Impact:** R-002, R-006, R-007 mitigations cannot be verified in CI.
  - **Contingency:** Confirm CI runner capabilities before Story 1.8; if Docker unavailable, use Testcontainers-only approach for DB tests and defer image build gate to a dedicated CD pipeline.

- **Risk:** `bun audit` does not support structured output parseable for critical CVE gating.
  - **Impact:** R-008 dependency scan gate may not be automatable.
  - **Contingency:** Use `npm audit --json` via npm compatibility layer, or `trivy` container scanner instead.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **PostgreSQL EXCLUDE constraint** | All later booking writes (Epic 4) depend on this being correct | P0 constraint tests must remain green through all epics |
| **Audit log write hook** | Every mutation in Epic 3–7 will call this helper | P0 atomicity tests must remain green; any schema change to `audit_log` triggers re-run |
| **pg-boss worker** | Email sending (Epic 4–6), reminders (Epic 6), auto-close (Epic 5) | Smoke job test must remain green; new job handler additions inherit the no-`$app/*` import rule |
| **Paraglide i18n** | All user-facing pages and email templates across all epics | No-hardcoded-string lint rule must remain enforced; Thai locale test must remain green |
| **Docker Compose stack (`compose.yaml`)** | Developer setup + CI integration tests for all epics | Migration pre-start test must remain green; any `compose.yaml` change triggers Docker smoke re-run |
| **nginx proxy** | Session security (Better Auth cookie forwarding) — Critical for Epic 2 | `X-Forwarded-*` header test must remain green |

---

## Follow-on Workflows

- Run `*atdd` to generate failing P0 tests (acceptance-test-driven) for R-001 and R-003 before Story 1.3 / 1.6 implementation begins.
- Run `*automate` for P1 test generation once Story 1.2–1.5 scaffold is merged.
- After Epic 1 is complete, run `*nfr-assess` with evidence (CI report, axe-core report, Docker logs) to produce the first NFR PASS/CONCERNS/FAIL assessment.

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
- **Epics:** `_bmad-output/planning-artifacts/epics.md` (Epic 1, lines 265–407)
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md`
- **Sprint Status:** `_bmad-output/implementation-artifacts/sprint-status.yaml`
- **Story 1.1 (done):** `_bmad-output/implementation-artifacts/1-1-scaffold-the-project.md`
- **Story 1.6 (done):** `_bmad-output/implementation-artifacts/1-6-audit-log-write-hook-foundation.md`
- **Story 1.8 (done):** `_bmad-output/implementation-artifacts/1-8-test-harness-ci.md`
- **Deferred Work:** `_bmad-output/implementation-artifacts/deferred-work.md`
- **ATDD Checklist 1.1:** `_bmad-output/test-artifacts/atdd-checklist-1-1-scaffold-the-project.md`
- **ATDD Checklist 1.6:** `_bmad-output/test-artifacts/atdd-checklist-1-6-audit-log-write-hook-foundation.md`
- **ATDD Checklist 1.8:** `_bmad-output/test-artifacts/atdd-checklist-1-8-test-harness-ci.md`
- **ATDD Checklist 1.9:** `_bmad-output/test-artifacts/atdd-checklist-1-9-walking-skeleton-vertical-slice.md`

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
**Epic:** 1 — Foundation & Walking Skeleton
**Mode:** Epic-Level
**Revision:** v4 (2026-06-11) — Updated post Stories 1.6 & 1.8 completion; added Story 1.6/1.8 implementation nuances; updated entry/exit criteria and dependencies; marked R-003 and R-007 mitigations Complete; added Story 1.9 ATDD stub placeholder; all 8 done stories documented in ATDD Stubs section. ATDD checklist for Story 1.9 in `_bmad-output/test-artifacts/atdd-checklist-1-9-walking-skeleton-vertical-slice.md`.
