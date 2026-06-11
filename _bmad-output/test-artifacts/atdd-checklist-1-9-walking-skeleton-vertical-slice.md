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
storyId: '1.9'
storyKey: '1-9-walking-skeleton-vertical-slice'
storyFile: '_bmad-output/planning-artifacts/epics.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-9-walking-skeleton-vertical-slice.md'
generatedTestFiles:
  - tests/e2e/walking-skeleton.spec.ts
  - tests/integration/walking-skeleton.test.ts
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-1.md
  - _bmad-output/implementation-artifacts/1-6-audit-log-write-hook-foundation.md
  - _bmad-output/implementation-artifacts/1-8-test-harness-ci.md
  - _bmad-output/implementation-artifacts/deferred-work.md
  - _bmad/tea/config.yaml
tddPhase: RED
---

# ATDD Checklist — Story 1.9: Walking-skeleton Vertical Slice

**Date:** 2026-06-11
**Story ID:** 1.9
**Story Key:** 1-9-walking-skeleton-vertical-slice
**TDD Phase:** RED (all test stubs skipped — implementation pending)
**Workflow:** bmad-testarch-atdd
**Execution Mode:** SEQUENTIAL (Integration → E2E — no pure-unit surface; this is a full-stack slice story)

---

## Story Summary

> As a developer, I want one route that threads every foundation layer end-to-end, so that the foundations are proven, not assumed.

**GH Issue:** #9

**Acceptance Criteria (from epics.md):**

1. **Given** the running stack (web + worker + Postgres + Mailpit, in Docker),
   **When** the skeleton route is exercised,
   **Then** it renders a themed page with a Thai Paraglide string, writes a row guarded by the EXCLUDE constraint, and enqueues a job that the worker turns into a Mailpit email.

2. **And** an integration test inserting two overlapping rows fails loudly with `23P01`.

3. **And** the slice fails the build if the EXCLUDE constraint is misconfigured.

**Scope note:** This story is the convergence point for all Epic 1 foundations. It introduces:
- A skeleton SvelteKit route (`/skeleton` or `/`) with a form that exercises all layers
- The route wires: DB write (guarded by EXCLUDE) + `writeAuditLog` call + `enqueueJob` (smoke-email) in one transaction
- No new infrastructure — everything consumed from Stories 1.2–1.8
- Resolves deferred-work.md item: home page (`+page.svelte`) gets a Button component and Thai typography, fixing pre-existing `1.2-UNIT-008/010/012` failures

---

## TDD Red Phase — Current Status

All scaffolds are generated with `test.skip()`.

| File | Tests | Priority Coverage | Status |
|------|-------|------------------|--------|
| `tests/e2e/walking-skeleton.spec.ts` | 8 | P0: 3, P1: 3, P2: 1, P3: 1 | RED (skipped) |
| `tests/integration/walking-skeleton.test.ts` | 5 | P0: 3, P1: 2 | RED (skipped — requires Docker stack) |
| **Total** | **13** | **P0: 6, P1: 5, P2: 1, P3: 1** | **All skipped** |

---

## Acceptance Criteria Coverage

| AC | Description | Test IDs | Level | Status |
|----|-------------|----------|-------|--------|
| AC-1a | Skeleton route renders themed page with Thai Paraglide string | `1.9-E2E-001` | E2E (Playwright) | RED |
| AC-1b | Route write inserts DB row guarded by EXCLUDE constraint | `1.9-INT-001` | Integration (Postgres) | RED |
| AC-1c | Route enqueues job → worker → Mailpit email delivered | `1.9-INT-002` | Integration (Docker stack) | RED |
| AC-2 | Integration test: overlapping insert fails with `23P01` | `1.9-INT-003` | Integration (Postgres) | RED |
| AC-3 | Build fails if EXCLUDE constraint is misconfigured | `1.9-INT-004` (build-gate variation of 1.3-INT-001) | Integration CI | RED |
| Deferred-1.2 | Home page renders shadcn Button component | `1.9-E2E-005` | E2E | RED |
| Deferred-1.2 | Home page body text has Thai line-height ≥1.65 | `1.9-E2E-006` (ties to 1.2-COMP-002) | E2E | RED |

---

## Test File Details

### `tests/e2e/walking-skeleton.spec.ts`

**Purpose:** Playwright-driven verification that the vertical slice end-to-end works through the browser against the full Docker Compose stack (or dev server for lighter tests).

**Stack context:**
- Uses `docker-compose.prod.yml` for full-stack tests (web + worker + Postgres + Mailpit)
- For dev-server tests, uses `compose.yaml` (db + mailpit) + `bun run dev`
- Mailpit API at `http://localhost:8025/api/v1/messages` for email assertions
- Base URL: `process.env.CI ? 'http://localhost:3000' : 'http://localhost:5173'`

| Test ID | Description | Priority | Notes |
|---------|-------------|----------|-------|
| [P0] 1.9-E2E-001 | Skeleton route: page renders with `lang="th"` and a Paraglide-rendered Thai string visible (not a raw key) | P0 | Playwright: `page.goto('/skeleton')` or `/`; assert `html[lang="th"]` and `page.locator('[data-testid="skeleton-heading"]')` text is not `"home_title"` |
| [P0] 1.9-E2E-002 | Skeleton route: page is themed (Forest & Copper palette CSS variable present on body) | P0 | Assert `--color-primary` or `--green-500` CSS var is set; uses shadcn theme wiring from Story 1.2 |
| [P0] 1.9-E2E-003 | Skeleton route: submitting the form triggers job that delivers email to Mailpit | P0 | POST to skeleton action; poll `GET /api/v1/messages` until email arrives (10s timeout); assert `messages.length >= 1` |
| [P1] 1.9-E2E-004 | axe-core runs on skeleton page: zero WCAG 2.1 AA violations | P1 | `AxeBuilder({ page }).withTags(['wcag2aa']).analyze()`; `violations.length === 0` |
| [P1] 1.9-E2E-005 | Home page (`/`) renders a shadcn Button component (resolves deferred 1.2-UNIT-008) | P1 | `page.locator('button')` is visible; button has correct Forest & Copper background class |
| [P1] 1.9-E2E-006 | Home page body text has computed `line-height ≥ 1.65` and `font-size ≥ 14px` (resolves deferred 1.2-COMP-002) | P1 | Playwright `page.evaluate` on `document.body`; assert `parseFloat(lineHeight) >= 1.65 * parseFloat(fontSize)` |
| [P2] 1.9-E2E-007 | Skeleton route displays toast or success indicator after form submit | P2 | UX smoke — assert success state pattern from UX-DR8; element with role `status` visible |
| [P3] 1.9-E2E-008 | Skeleton route responds within 2s under single-user load (informational baseline) | P3 | `performance.now()` around `page.goto`; no SLA yet — informational only per test design |

**File path:** `tests/e2e/walking-skeleton.spec.ts`

**Activate when:** Skeleton route is implemented in `src/routes/skeleton/+page.svelte` (or `/`) and form action wires DB + audit + job.

---

### `tests/integration/walking-skeleton.test.ts`

**Purpose:** Vitest integration-tier tests that verify the vertical slice at the service/DB layer, independent of the browser. Runs in the `integration` Vitest project (real Postgres required — Testcontainers locally, CI Postgres service in GitHub Actions).

**Stack context:**
- Uses `pg-factory.ts` fixture (Story 1.8) for DB access
- Uses Mailpit API assertions for email delivery (`MAILPIT_URL=http://localhost:8025`)
- Imports `db` from `src/lib/server/db/index.ts` and `writeAuditLog` from `src/lib/server/services/audit.ts`
- Imports `enqueueJob` and worker start from `src/lib/server/jobs/`

| Test ID | Description | Priority | Notes |
|---------|-------------|----------|-------|
| [P0] 1.9-INT-001 | Skeleton service: DB write + `writeAuditLog` in one transaction — both rows committed atomically | P0 | `db.transaction(tx => { insert(bookings...) + writeAuditLog(tx, ...) })`; assert both rows present after commit; uses real Postgres via pg-factory |
| [P0] 1.9-INT-002 | Skeleton service: `enqueueJob` → worker → Mailpit receives email within 10s | P0 | Enqueue smoke job; poll `GET http://localhost:8025/api/v1/messages`; assert `count >= 1`; ties to R-005 scenario `1.5-INT-001` (cross-verification in running stack) |
| [P0] 1.9-INT-003 | Overlap rejection in vertical slice context: inserting two overlapping `tstzrange` rows raises `23P01` | P0 | Inserts two overlapping ranges for same `room_id` in `bookings`; assert PostgreSQL error code `23P01`; confirms constraint is live in the running Postgres (not just migration SQL) |
| [P1] 1.9-INT-004 | DB write + audit + job in single transaction: transaction rollback leaves no DB row AND no audit row | P1 | Wrap DB insert + `writeAuditLog` + throw in a transaction; assert zero rows in both `bookings` and `audit_log` after rollback |
| [P1] 1.9-INT-005 | EXCLUDE constraint remains active after Story 1.9 migration (constraint-exists re-assertion in full stack) | P1 | Query `information_schema.table_constraints WHERE constraint_type='EXCLUDE' AND table_name='bookings'`; assert count >= 1; confirms no migration in Story 1.9 accidentally dropped the constraint |

**File path:** `tests/integration/walking-skeleton.test.ts`

**Activate when:** `src/lib/server/db/index.ts`, `src/lib/server/services/audit.ts`, and `src/lib/server/jobs/` are all wired in the skeleton route/service.

---

## Activation Guide (Task-by-Task)

During implementation of each task, activate the corresponding tests in TDD fashion:

### Task: Implement Skeleton Route (`src/routes/skeleton/+page.svelte` + `+page.server.ts`)

1. Remove `test.skip(` → `test(` in `tests/e2e/walking-skeleton.spec.ts` for `1.9-E2E-001`, `1.9-E2E-002`
2. Run: `bun run test:e2e -- --grep "1.9-E2E-001|1.9-E2E-002"` — verify tests FAIL first (RED)
3. Implement route with Thai Paraglide heading, Forest & Copper theme classes applied, `data-testid="skeleton-heading"` on the heading element
4. Run again — verify tests PASS (GREEN)

### Task: Implement Skeleton Form Action (DB write + audit + job)

1. Remove `test.skip(` for `1.9-INT-001`, `1.9-INT-002`, `1.9-INT-003` in `walking-skeleton.test.ts`
2. Run: `bun run test:integration -- --reporter=verbose` — verify FAIL (RED)
3. Implement `+page.server.ts` actions: `db.transaction(tx => insert + writeAuditLog + enqueueJob)`
4. Run again — verify PASS (GREEN)
5. Activate `1.9-E2E-003` (form submit → Mailpit) and verify E2E

### Task: Fix Deferred Story 1.2 Home Page (Button + Thai Typography)

1. Remove `test.skip(` for `1.9-E2E-005`, `1.9-E2E-006` in `walking-skeleton.spec.ts`
2. These also correspond to `1.2-UNIT-008`, `1.2-UNIT-010`, `1.2-UNIT-012` in `tests/unit/design-system.spec.ts` — activate those too
3. Add shadcn Button component + Thai body class to `src/routes/+page.svelte`
4. Run: `bun run test:e2e && bun run test` — verify GREEN

### Task: Full Stack Verification (Docker Compose)

1. Activate `1.9-INT-004`, `1.9-INT-005`, `1.9-E2E-004` (axe-core), `1.9-E2E-007`
2. Run: `docker compose -f docker-compose.prod.yml up -d` (cold start)
3. Run integration and E2E suites against running stack
4. Verify all P0 and P1 tests GREEN
5. Confirm CI pipeline (`bun run test:ci`) exits 0

---

## Implementation Guidance

### What Story 1.9 Must Wire Together

The skeleton route is the integration proof — it must be a **minimal but real** vertical slice:

```
Browser → SvelteKit route → +page.server.ts action
  └─ db.transaction(tx => {
       INSERT INTO bookings (...) -- guarded by EXCLUDE
       writeAuditLog(tx, { actorId: null, entity: 'booking', action: 'create' })
     })
  └─ enqueueJob(QUEUE.SMOKE_EMAIL, { to: 'skeleton@test.local', subject: '...' })
  └─ render: themed page + Thai Paraglide string + success indicator
```

The route does NOT need to be a production-quality booking form — it is a skeleton demonstrating that all layers are wired.

### Key File Locations

New files to create:

```
src/routes/
└── skeleton/                        # NEW — or add to root +page.svelte
    ├── +page.svelte                 # Themed page with Thai Paraglide heading + form
    └── +page.server.ts              # Form action: DB write + audit + enqueueJob

tests/
├── e2e/
│   └── walking-skeleton.spec.ts    # NEW — Playwright E2E tests (this story)
└── integration/
    └── walking-skeleton.test.ts    # NEW — Vitest integration tests (this story)
```

Existing files to update:

```
src/routes/
└── +page.svelte                     # UPDATE — add shadcn Button + Thai body class
                                     # (resolves deferred-work.md 1.2 failures)
```

### Important Constraints from Prior Stories

- **Thai strings in messages files:** Use `m.home_title()` and `m.app_name()` (already defined in `messages/en.json`) — do NOT hardcode Thai text. Add new keys to `messages/en.json` for skeleton-specific strings (e.g. `m.skeleton_heading()`, `m.skeleton_submit()`). Per project rule: Rawinan handles all Thai translations — English source only in code.
- **Relative imports:** All `src/lib/server/` imports must use relative paths + `.js` extension (established in Stories 1.5/1.6).
- **DB insert shape:** The `bookings` table currently has `room_id`, `during` (tstzrange), `status` columns per Story 1.8's schema.ts. The skeleton insert can use a hardcoded test `room_id` UUID and a non-overlapping time range.
- **Audit log actor:** Use `null` as `actorId` for the skeleton (no auth in Epic 1 — auth is Epic 2). This is the "system" action pattern.
- **enqueueJob idempotency key:** Pass a deterministic key (e.g. `skeleton-${Date.now()}`) to prevent double-delivery on form re-submit.
- **Paraglide middleware:** `src/hooks.server.ts` uses `paraglideMiddleware` with `transformPageChunk` replacing `%paraglide.lang%` — assert `html[lang="th"]` in E2E tests.

### EXCLUDE Constraint — Build-Gate Assertion (AC-3)

AC-3 requires "the slice fails the build if the EXCLUDE constraint is misconfigured." This is satisfied by:

1. `tests/integration/db-schema.test.ts` `1.3-INT-001` (already in Story 1.8) runs in CI and fails the `test-integration` job if the constraint is missing.
2. Story 1.9's `1.9-INT-005` re-asserts the same in the walking-skeleton integration suite — a belt-and-suspenders check confirming no Story 1.9 migration accidentally dropped the constraint.
3. No separate build step is needed — failing `test-integration` in CI achieves AC-3.

### Deferred Work Items Resolved By This Story

From `_bmad-output/implementation-artifacts/deferred-work.md`:

- **`1.2-UNIT-008`** — `+page.svelte` must render a shadcn Button component → add Button to `+page.svelte`
- **`1.2-UNIT-010`** — `+page.svelte` must apply Noto Sans Thai font class → add `font-sans` or `font-noto-sans-thai` class to body element in `+layout.svelte` or `+page.svelte`
- **`1.2-UNIT-012`** — `bun run lint` subprocess call inside test subprocess/worktree quirk — verify lint passes standalone (`bun run lint` from project root exits 0)

### Mailpit API Shape (for integration tests)

```typescript
// Poll Mailpit inbox
const res = await fetch('http://localhost:8025/api/v1/messages');
const data = await res.json();
// data.messages is an array; data.total is the count
expect(data.total).toBeGreaterThan(0);
```

### Test Patterns to Follow (from prior stories)

- Integration tests: use `describe` + individual `test()` (not `test.skip()`); real Postgres via `testcontainers-context.ts` / CI Postgres service
- E2E tests: follow `tests/e2e/thai-render-smoke.spec.ts` pattern for page navigation + assertions
- Timeout: `testTimeout: 30_000` is already set for integration project (Story 1.8)
- axe-core: `AxeBuilder({ page }).withTags(['wcag2aa']).analyze()` — do NOT use `disableRules`

---

## Quality Gates Before Story 1.9 Done

- [ ] All 6 P0 tests pass (zero failures): `1.9-E2E-001`, `1.9-E2E-002`, `1.9-E2E-003`, `1.9-INT-001`, `1.9-INT-002`, `1.9-INT-003`
- [ ] All 5 P1 tests pass (zero failures): `1.9-E2E-004`, `1.9-E2E-005`, `1.9-E2E-006`, `1.9-INT-004`, `1.9-INT-005`
- [ ] Pre-existing Story 1.2 failures resolved: `1.2-UNIT-008`, `1.2-UNIT-010`, `1.2-UNIT-012` GREEN
- [ ] `bun run test` (unit + server project) exits 0 (no pre-existing failures remain)
- [ ] `bun run test:integration` exits 0 (with Postgres running)
- [ ] `bun run test:e2e` exits 0 (with dev server or Docker stack running)
- [ ] `bun run lint && bun run check` exits 0 (no type errors, no hardcoded strings)
- [ ] Epic 1 exit criteria all green (see test-design-epic-1.md §Exit Criteria)

---

## ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-9-walking-skeleton-vertical-slice.md`
- **E2E tests:** `tests/e2e/walking-skeleton.spec.ts`
- **Integration tests:** `tests/integration/walking-skeleton.test.ts`

---

## Next Steps After Story 1.9 Done

1. Run `/bmad-testarch-nfr-assess` with evidence (CI run log, axe-core report, Docker logs, Mailpit inbox assertion) to produce Epic 1's first formal NFR assessment.
2. Mark `epic-1-retrospective` as done in sprint-status.yaml.
3. Proceed to Epic 2: Identity & Access.

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
**Epic:** 1 — Foundation & Walking Skeleton
**Story:** 1.9 — Walking-skeleton Vertical Slice
**Mode:** Story-Level ATDD Checklist (generated from Epic-Level test design v4)
