---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-16'
storyId: '5.5'
storyKey: 5-5-resend-a-lost-link
storyFile: _bmad-output/implementation-artifacts/5-5-resend-a-lost-link.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-5-5-resend-a-lost-link.md
generatedTestFiles:
  - tests/integration/registrations.test.ts (appended Story 5.5 section — 5.5-INT-001 [P0 active, test.skipIf DEV_SERVER_URL], 5.5-INT-002 [P2 skip])
  - tests/e2e/registrations.spec.ts (appended Story 5.5 section — 5.5-E2E-001 [P1 skip])
inputDocuments:
  - _bmad-output/implementation-artifacts/5-5-resend-a-lost-link.md
  - _bmad/tea/config.yaml
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
  - _bmad-output/test-artifacts/test-design/test-design-epic-5.md
  - _bmad-output/test-artifacts/atdd-checklist-5-3-confirmation-email-with-self-cancel-link.md
---

# ATDD Checklist: Story 5.5 — Resend a Lost Link

**Date:** 2026-06-16
**Author:** TEA Agent (bmad-testarch-atdd)
**Story:** 5.5 — Resend a Lost Link
**Status:** RED PHASE — 5.5-INT-001 (P0) uses `test.skipIf(!DEV_SERVER_URL)` (runs in CI, skipped locally); 5.5-E2E-001 (P1) and 5.5-INT-002 (P2) are `test.skip()`

---

## TDD Red Phase Summary

All acceptance test scaffolds generated and appended to their respective test files.

Story 5.5 introduces a public resend-link route (`/r/[token]/resend`) with a critical security requirement: the endpoint must return identical HTTP status and response shape regardless of whether the submitted email matches a registration (R-003 — email enumeration, score=6 OPEN). The mandatory PR gate is `5.5-INT-001`, which drives the HTTP endpoint via `fetch` and compares both the status code and the response body shape between the found and not-found cases.

`5.5-INT-001` (P0) uses `test.skipIf(!process.env['DEV_SERVER_URL'])` — same pattern as `5.8-INT-IDOR-001` — so it is skipped in local unit-only runs but runs in CI where the dev server is available. It seeds a full booking + registrant and posts to the resend action with both a registered and an unregistered email, asserting identical status + body shape and the absence of a `found` field in either response.

`5.5-E2E-001` (P1) is a Playwright stub for browser-level neutral acknowledgement verification. `5.5-INT-002` (P2) is a pg-boss job assertion stub mirroring the 5.3 email-enqueue proof pattern.

| Metric | Value |
|--------|-------|
| Total new tests | 3 describes / 3 test scenarios |
| P0 tests active | 1 (5.5-INT-001 — test.skipIf DEV_SERVER_URL) |
| P1 tests skipped | 1 (5.5-E2E-001 — Playwright neutral acknowledgement) |
| P2 tests skipped | 1 (5.5-INT-002 — pg-boss job proof) |
| Execution mode | SEQUENTIAL (AI generation) |

---

## Generated Test Files

| File | Status | Notes |
|------|--------|-------|
| `tests/integration/registrations.test.ts` | APPENDED | +2 describe blocks: `5.5-INT-001` (P0 active, test.skipIf), `5.5-INT-002` (P2 skip) |
| `tests/e2e/registrations.spec.ts` | APPENDED | +1 describe block: `5.5-E2E-001` (P1 skip) |

---

## Step 1: Preflight & Context

### Stack Detection

- **Frontend indicators:** `package.json` (SvelteKit, Vite), `playwright.config.ts`
- **Backend indicators:** `drizzle.config.ts`, `pg-boss`, database migrations
- **Detected stack:** `fullstack`

### Prerequisites Check

- Story 5.5 has clear acceptance criteria: AC-1 through AC-8 well-defined
- `playwright.config.ts` exists (E2E capable — 5.5-E2E-001 added to registrations.spec.ts)
- Integration test framework: Vitest with `pg` pool and Testcontainers
- Development environment: available

### Key Artifacts Loaded

- Story file: `5-5-resend-a-lost-link.md` — canonical ATDD spec in Task 7 + Dev Notes
- Existing pattern: `tests/integration/registrations.test.ts` — Stories 5.1–5.3, 5.6–5.8 tests
- Existing E2E file: `tests/e2e/registrations.spec.ts` — Stories 5.1, 5.2, 5.7, 5.8 tests
- Test design: `test-design-epic-5.md` — 5.5-INT-001/002, 5.5-E2E-001 canonical IDs

### TEA Config Flags

- `tea_use_playwright_utils`: true
- `tea_browser_automation`: auto
- `test_stack_type`: auto → fullstack
- `risk_threshold`: p1

---

## Step 2: Generation Mode

**Mode selected: AI Generation (Sequential)**

Rationale:
- Story 5.5 Task 7 and Dev Notes provide verbatim test code for `5.5-INT-001` — this is transcription, not authoring
- The story specifies exact test IDs, skip levels, and patterns (test.skipIf for P0, test.skip for P1/P2)
- E2E stub mirrors the 5.8-E2E pattern already in registrations.spec.ts
- No browser recording needed at this stage — stub only

---

## Step 3: Test Strategy

### Acceptance Criteria → Test Scenario Mapping

| AC | Description | Scenario | Level | Priority |
|----|-------------|----------|-------|----------|
| AC-2 | Email-only form renders; superforms wired | 5.5-E2E-001 (test.skip — P1) | E2E | P1 |
| AC-3 | Always acknowledge — same response for found/not-found (R-003) | 5.5-INT-001 (test.skipIf DEV_SERVER_URL — P0) | Integration | P0 |
| AC-4 | Email resent when registration found — SEND_EMAIL job enqueued | 5.5-INT-002 (test.skip — P2) | Integration | P2 |
| AC-5 | New cancel token replaces old hash (AR-05) | Covered by 5.5-INT-001 (token replacement is internal; HTTP neutrality is the external proof) | Integration | P0 |
| AC-6 | Not-found → silent no-op, same acknowledgement | 5.5-INT-001 (not-found case asserts same status + shape) | Integration | P0 |
| AC-7 / NFR-006 | All UI strings via Paraglide; no Thai text in code | 5.5-E2E-001 (Paraglide key name assertions) | E2E | P1 |
| AC-8 | Audit log entry written on resend | Covered by service unit test (resend-registration-service.test.ts) | Unit | — |

### Red Phase Design

- `5.5-INT-001`: Drives the HTTP endpoint via `fetch`. Will FAIL until the resend route (Tasks 1–4) is implemented. `test.skipIf(!DEV_SERVER_URL)` ensures it never silently skips in CI.
- `5.5-E2E-001`: Playwright stub. `test.skip()` — activate after Tasks 1–5 complete.
- `5.5-INT-002`: pg-boss job assertion stub. `test.skip()` — activate after Task 4 wired; mirrors 5.3-INT-001+002 pattern.

---

## Acceptance Criteria Coverage

| AC | Description | Test(s) | Priority |
|----|-------------|---------|----------|
| AC-1 | Resend route at `/r/[token]/resend` — public, unauthenticated | 5.5-INT-001 (drives the route via fetch) | P0 |
| AC-2 | Email-only form renders; superforms + valibot wired | 5.5-E2E-001 (test.skip) | P1 |
| AC-3 | Always acknowledge — identical status + body for found/not-found | 5.5-INT-001 (R-003 proof) | P0 |
| AC-4 | SEND_EMAIL job enqueued when registration found | 5.5-INT-002 (test.skip) | P2 |
| AC-5 | New cancel token replaces old hash (password-reset semantics) | Internal to service; 5.5-INT-001 tests the observable contract | P0 |
| AC-6 | Not-found → silent no-op, same acknowledgement | 5.5-INT-001 (not-found case branch) | P0 |
| AC-7 / NFR-006 | Paraglide keys; no Thai text | 5.5-E2E-001 (test.skip; text assertions on English keys) | P1 |
| AC-8 | Audit log entry on resend | Service unit test (out of ATDD scope) | Unit |

---

## Test Scenarios

### P0 (Critical — Active)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 5.5-INT-001 | POST `/r/[token]/resend` with registered + unregistered email → both return HTTP 200, same body shape, no `found` field | `registrations.test.ts` | ACTIVE (test.skipIf — skipped locally, runs in CI; FAILS until route wired) |

### P1 (Important — Skipped)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 5.5-E2E-001 | Resend form renders email input; neutral acknowledgement shown after submit (same UI for registered + unregistered email) | `registrations.spec.ts` | test.skip() — activate after Tasks 1–5 |

### P2 (Secondary — Skipped)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 5.5-INT-002 | Resend action enqueues `send-email` pg-boss job (async proof); asserts `singleton_key = 'resend-link-${registrationId}'` | `registrations.test.ts` | test.skip() — activate after Task 4 wired |

---

## Risk Mitigations Covered

| Risk | Score | Mitigation Test |
|------|-------|----------------|
| R-003 (resend endpoint discloses whether email is registered — enumeration) | 6 OPEN → MITIGATE | 5.5-INT-001 — identical HTTP status + body shape for both cases; no `found` field in response |

---

## Architecture Notes

### R-003 MITIGATE — HTTP endpoint test (not service test)

`5.5-INT-001` explicitly tests the HTTP endpoint via `fetch`, not the `resendRegistrationLink` service directly. This is intentional: R-003 is an externally observable contract. The service returns `{ found: boolean }` internally, but the action must discard this. Testing the service would not close R-003 — only testing the endpoint's external response shape does.

### test.skipIf Pattern (mirrors 5.8-INT-IDOR-001)

`5.5-INT-001` uses `test.skipIf(!process.env['DEV_SERVER_URL'])` — identical to the pattern used for `5.8-INT-IDOR-001`. This ensures:
- Local runs (no `DEV_SERVER_URL`): test is skipped (not counted as failure)
- CI runs (`DEV_SERVER_URL` set to the running dev server): test executes and must pass

This is **not** `test.skip()`. Using `test.skip()` would silently disable the mandatory PR gate.

### Cancel Token Replacement (AC-5 / AR-05)

The resend generates a new 32-byte CSPRNG cancel token (replaces the stored hash). The old cancel link is invalidated. `5.5-INT-001` does not directly assert this (it tests the HTTP neutrality contract), but `5.5-INT-002` (once activated) can assert the updated `cancel_token_hash` in the DB row after a resend POST.

### Existing Helpers Reused

The following helpers already exist in `registrations.test.ts` and are reused by `5.5-INT-001`:
- `seedUser()`, `seedUserProfile()` — organizer seed
- `seedRoom()` — room seed
- `seedBookingWithToken()` — booking with known registration token
- `seedRegistrant()` — registrant with known email + status
- `import { randomUUID } from 'node:crypto'` — already imported at top of file
- `let pool: pg.Pool` — shared across all describes in the file

---

## Activation Guide

### Phase 1 — Story 5.5 Tasks 1–4 complete (route + service + action wired)

```bash
DEV_SERVER_URL=http://localhost:5173 bun run test:integration
# 5.5-INT-001: PASS (HTTP endpoint returns 200 + same shape for both cases)
# 5.5-INT-002: SKIP (expected)
```

### Phase 2 — E2E activation (Tasks 1–5 complete)

Remove `test.skip(` from `5.5-E2E-001` when:
- Route is implemented and accessible at `/r/[token]/resend`
- Paraglide keys compiled and available (`resend_form_heading`, `resend_form_acknowledged_title`, etc.)
- A seeded booking token is available for `RESEND_BOOKING_TOKEN_5_5`

```bash
bun run test:e2e -- --grep "5.5-E2E-001"
```

### Phase 3 — INT-002 activation (pg-boss proof)

Remove `test.skip(` from `5.5-INT-002` when route action is wired and pg-boss job proof is needed. Pattern: mirror `5.3-INT-001+002` (raw SQL proof or drive actual route action). Assert `singleton_key = 'resend-link-${registrationId}'` exists in `pgboss.job`.

---

## Quality Gate Checklist (pre-story-done)

- [ ] `bun run check` — TypeScript zero errors
- [ ] `bun run lint` — ESLint zero warnings
- [ ] `bun run test:unit` — any new unit tests pass
- [ ] `DEV_SERVER_URL=http://localhost:5173 bun run test:integration` — `5.5-INT-001` green (P0 gate); `5.5-INT-002` skip (expected)
- [ ] `messages/en.json` has 8 new `resend_*` keys + 1 `reg_page_resend_link` key with English values
- [ ] `messages/th.json` has same 9 keys with empty string `""` values (no Thai text)
- [ ] `src/lib/schemas/resend.ts` created — `ResendSchema` (email only, valibot)
- [ ] `src/routes/r/[token]/resend/+page.server.ts` created — load + resend action
- [ ] `src/routes/r/[token]/resend/+page.svelte` created — form + acknowledged state
- [ ] `src/lib/server/services/resend-registration-service.ts` created — `resendRegistrationLink`
- [ ] `src/lib/server/db/queries/registrations.ts` extended — `getActiveRegistrationByEmail`
- [ ] Resend action ALWAYS returns `{ form, acknowledged: true }` — never differs for found/not-found
- [ ] No `found` field in the action's return object (R-003 constraint)
- [ ] DB lookup always runs (no early short-circuit before the SELECT)
- [ ] Route is public — no `requireUser()` call

---

## Notes

- **No Thai text in code**: All test assertions use English mock data. Thai translations are Rawinan's responsibility.
- **No credential literals**: No secrets committed to tests.
- **P0 test is NOT test.skip**: `5.5-INT-001` uses `test.skipIf(!DEV_SERVER_URL)` — it is the mandatory R-003 PR gate and must run in CI.
- **R-003 is OPEN until 5.5 ships**: The `test-design-epic-5.md` marks R-003 as OPEN (score=6). `5.5-INT-001` closes it.
