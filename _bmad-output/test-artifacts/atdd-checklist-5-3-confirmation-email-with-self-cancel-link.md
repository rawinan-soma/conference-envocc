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
storyId: '5.3'
storyKey: 5-3-confirmation-email-with-self-cancel-link
storyFile: _bmad-output/implementation-artifacts/5-3-confirmation-email-with-self-cancel-link.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-5-3-confirmation-email-with-self-cancel-link.md
generatedTestFiles:
  - tests/integration/registrations.test.ts (appended Story 5.3 section — 5.3-INT-001+002 [active], 5.3-INT-003 [P1 skip], 5.3-INT-004 [P2 skip], 5.3-INT-005 [P2 skip])
inputDocuments:
  - _bmad-output/implementation-artifacts/5-3-confirmation-email-with-self-cancel-link.md
  - _bmad/tea/config.yaml
  - tests/integration/registrations.test.ts
  - tests/integration/bookings.test.ts
  - _bmad-output/test-artifacts/test-design/test-design-epic-5.md
  - _bmad-output/test-artifacts/atdd-checklist-4-6-booking-confirmation-email.md
---

# ATDD Checklist: Story 5.3 — Confirmation Email with Self-Cancel Link

**Date:** 2026-06-16
**Author:** TEA Agent (bmad-testarch-atdd)
**Story:** 5.3 — Confirmation Email with Self-Cancel Link
**Status:** RED PHASE — 5.3-INT-001+002 (combined P0 test) is active; 5.3-INT-003 (P1), 5.3-INT-004 (P2), 5.3-INT-005 (P2) are test.skip()

---

## TDD Red Phase Summary

All acceptance test scaffolds generated and appended to `tests/integration/registrations.test.ts` (Story 5.3 section after Story 5.2 tests).

Story 5.3 follows the **exact same email/pg-boss pattern as Story 4.6** (booking confirmation email). The canonical 4.6-INT-002 raw SQL INSERT pattern is mirrored for 5.3-INT-001+002: a direct `INSERT INTO pgboss.job` proves the singletonKey format (`registration-confirm-${registrationId}`) and the cancel link URL shape in the payload — without requiring the route action to be wired or a live pg-boss worker.

`5.3-INT-001+002` (combined P0 test) is active (non-skip). It will fail in RED phase until the pgboss schema exists (created by `boss.start()` in the describe-level `beforeAll`). Once the pg-boss schema is available, this test will pass as a raw-SQL schema proof. The upgrade path (driving the actual POST `/r/[token]` register action) is documented in the test body.

`5.3-INT-003` (P1 — Thai RFC 2047 encoding via Mailpit), `5.3-INT-004` (P2 — idempotency), and `5.3-INT-005` (P2 — DLQ on SMTP failure) are `test.skip()`.

| Metric | Value |
|--------|-------|
| Total new tests | 4 describes / 5 test scenarios |
| P0 tests active | 1 (5.3-INT-001+002 combined — raw SQL proof) |
| P1 tests skipped | 1 (5.3-INT-003 — Mailpit Thai encoding) |
| P2 tests skipped | 2 (5.3-INT-004 idempotency, 5.3-INT-005 DLQ) |
| Execution mode | SEQUENTIAL (AI generation — integration-tier only; no E2E per story comment) |

---

## Generated Test Files

| File | Status | Notes |
|------|--------|-------|
| `tests/integration/registrations.test.ts` | APPENDED | +4 describe blocks: `5.3-INT-001+002` (active P0), `5.3-INT-003` (P1 skip), `5.3-INT-004` (P2 skip), `5.3-INT-005` (P2 skip) |

---

## Step 1: Preflight & Context

### Stack Detection

- **Frontend indicators:** `package.json` (SvelteKit, Vite), `playwright.config.ts`
- **Backend indicators:** `drizzle.config.ts`, `pg-boss`, database migrations
- **Detected stack:** `fullstack`

### Prerequisites Check

- Story 5.3 has clear acceptance criteria: AC-1 through AC-6 well-defined
- `playwright.config.ts` exists (E2E capable — but story specifies no E2E scenarios for 5.3)
- Integration test framework: Vitest with `pg` pool and Testcontainers
- Development environment: available

### Key Artifacts Loaded

- Story file: `5-3-confirmation-email-with-self-cancel-link.md` — canonical ATDD spec in Task 4
- Existing pattern: `tests/integration/bookings.test.ts` — 4.6-INT-002 (raw SQL pg-boss proof)
- Existing test file: `tests/integration/registrations.test.ts` — Stories 5.1 and 5.2 tests
- Test design: `test-design-epic-5.md` — 5.3-INT-001/002/003/004/005 canonical IDs

---

## Step 2: Generation Mode

**Mode selected: AI Generation (Sequential)**

Rationale:
- Story 5.3 specifies integration-tier tests only (no E2E scenarios per the story comment block)
- All scenarios are backend/service-layer: pg-boss job assertion, payload shape, idempotency, DLQ
- The story's Task 4 ATDD spec provides exact test code patterns (mirrors 4.6 pattern)
- No browser recording needed

---

## Step 3: Test Strategy

### Acceptance Criteria → Test Scenario Mapping

| AC | Description | Scenario | Level | Priority |
|----|-------------|----------|-------|----------|
| AC-1 | `createRegistration` → `enqueueJob` fires after DB transaction commits | 5.3-INT-001+002 (raw SQL proof; upgrade to route action after wiring) | Integration | P0 |
| AC-2 | Email payload contains cancel link `${origin}/r/${eventToken}/cancel?token=${cancelTokenPlain}` | 5.3-INT-001+002 (textBody + htmlBody assertions) | Integration | P0 |
| AC-3 | Email never sent synchronously — HTTP response not blocked by SMTP | 5.3-INT-001+002 (pg-boss job row proves async path) | Integration | P0 |
| AC-4 | `singletonKey: 'registration-confirm-${registrationId}'` deduplicates | 5.3-INT-004 (test.skip — P2) | Integration | P2 |
| AC-5 / NFR-006 | Thai encoding correct (RFC 2047) verified via Mailpit | 5.3-INT-003 (test.skip — P1) | Integration | P1 |
| AC-6 | All UI strings via Paraglide — English in en.json, empty in th.json | Covered by unit test `registration-confirmation.test.ts` (Task 1.4 in story) | Unit | — |

### No E2E Tests

Per the story's comment block (lines after Task 4): "No E2E test stubs for Story 5.3. The epic-5 test design does not include any 5.3-E2E-* scenarios. Email delivery is integration-tier: the Mailpit assertion (5.3-INT-003) and pg-boss job proof (5.3-INT-001/002) cover all required AC coverage."

### Red Phase Design

All P0 tests are designed to:
1. **PASS in RED phase** (after `boss.start()` creates pgboss schema) — the raw SQL INSERT is a schema contract proof
2. **Require upgrade** to drive the actual route action once implementation is complete
3. **Fail** before pgboss schema exists (INSERT into non-existent table)

---

## Acceptance Criteria Coverage

| AC | Description | Test(s) | Priority |
|----|-------------|---------|----------|
| AC-1 | Confirmation email enqueued after registration (not synchronous; after DB transaction commits) | 5.3-INT-001+002 (partial — raw SQL proof; upgrade to drive route action for full AC-1 proof) | P0 |
| AC-2 | Email delivered with cancel link URL shape `/r/${eventToken}/cancel?token=${cancelTokenPlain}` | 5.3-INT-001+002 (textBody + htmlBody assertions) | P0 |
| AC-3 | Email never sent synchronously; pg-boss job row exists before worker processes it | 5.3-INT-001+002 (raw SQL proves job exists; state='created' means unprocessed) | P0 |
| AC-4 | Idempotency: `singletonKey = 'registration-confirm-${registrationId}'`; duplicate enqueue → one job | 5.3-INT-004 (test.skip) | P2 |
| AC-5 / NFR-006 | Thai encoding correct (RFC 2047) in subject and body | 5.3-INT-003 (test.skip — Mailpit required) | P1 |
| AC-6 | All UI strings via Paraglide; no Thai text in code or mocks | Unit test in `registration-confirmation.test.ts` (Task 1.4) | Unit |

---

## Test Scenarios

### P0 (Critical — Active)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 5.3-INT-001+002 | pg-boss job for send-email exists with `singletonKey = registration-confirm-{registrationId}`; payload textBody/htmlBody contain cancel link URL pattern | `registrations.test.ts` | ACTIVE (red until pgboss schema exists; fails on raw INSERT otherwise passes as schema proof) |

### P1 (Important — Skipped)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 5.3-INT-003 | Thai email subject and body encode correctly (RFC 2047) via Mailpit API | `registrations.test.ts` | test.skip() — activate when MAILPIT_URL set |

### P2 (Secondary — Skipped)

| Scenario ID | Description | File | Status |
|-------------|-------------|------|--------|
| 5.3-INT-004 | Duplicate enqueue with same `singletonKey` produces only one pgboss.job row (pg-boss deduplication) | `registrations.test.ts` | test.skip() — activate during implementation |
| 5.3-INT-005 | SMTP failure during send → job lands in pg-boss DLQ with state='failed' | `registrations.test.ts` | test.skip() — activate when SMTP mock + worker integration available |

---

## Risk Mitigations Covered

| Risk | Mitigation Test |
|------|----------------|
| R-009 (email sent synchronously, blocks HTTP response) | 5.3-INT-001+002 — pg-boss job existence proves async delivery path; HTTP response not blocked |
| R-009 (email not enqueued at all) | 5.3-INT-001+002 — singletonKey and payload assertions prove enqueue occurred with correct data |
| R-002 (cancel link missing or malformed) | 5.3-INT-001+002 — `toContain('/r/${eventToken}/cancel?token=')` in both textBody and htmlBody |
| NFR-006 (Thai encoding broken) | 5.3-INT-003 (test.skip) — Mailpit raw headers checked for RFC 2047 encoding |

---

## Architecture Notes

### 4.6 Pattern Mirror

Story 5.3 is a near-exact twin of Story 4.6 (booking confirmation email). The same test pattern is used:

- **Raw SQL INSERT** into `pgboss.job` (bypasses boss lifecycle; proves schema contract)
- **`boss.start()`** in `beforeAll` creates the pgboss schema (tables and queues)
- **`boss.stop()`** in `afterAll` cleans up; DELETE removes test rows
- **`singletonKey`** format: `registration-confirm-${registrationId}` (vs `booking-confirm-${bookingId}` for 4.6)

### Cancel Link URL Contract

The cancel link URL shape is: `${origin}/r/${eventToken}/cancel?token=${cancelTokenPlain}`

- `origin` = `event.url.origin` from SvelteKit action
- `eventToken` = `event.params.token` (event's public registration token)
- `cancelTokenPlain` = 64-char hex from `createRegistration` return value

Story 5.4 is the consumer of this contract. This URL shape is fixed.

### Existing Imports

The following imports already exist in `registrations.test.ts` and are reused by the 5.3 tests:
- `import { randomBytes } from 'node:crypto'` — used for `cancelTokenPlain`
- `import { uuidv7 } from 'uuidv7'` — used for `testRegistrationId`
- `import { randomUUID } from 'node:crypto'` — used for `testEventToken`
- `let pool: pg.Pool` — shared across all describes in the file

---

## Activation Guide

### Phase 1 — pgboss schema available (prerequisites run)

```bash
bun run test:integration
# 5.3-INT-001+002: PASS (pgboss.job table exists, raw INSERT succeeds, row + payload assertions pass)
# 5.3-INT-003: SKIP (expected — Mailpit not configured)
# 5.3-INT-004: SKIP (expected)
# 5.3-INT-005: SKIP (expected)
```

### Phase 2 — Route action wired (Story 5.3 Tasks 3.1–3.7 complete)

Upgrade `5.3-INT-001+002` to drive the actual POST `/r/[token]?/register` action:

1. Remove the raw SQL INSERT block.
2. Seed a full booking with `registrationEnabled=true` and known `registrationToken`.
3. POST to the register action via `fetch` with a valid form payload.
4. Assert the pg-boss job row appears in `pgboss.job` (no raw INSERT — the route action must call `enqueueJob`).
5. This upgrades the test from "key format proof" to "AC-1 + AC-3 route integration proof."

### Phase 3 — Mailpit accessible (optional, for Thai encoding)

Remove `test.skip(` from `5.3-INT-003` when:
- `MAILPIT_URL` environment variable is set.
- Mailpit container is reachable from the Vitest integration process.

---

## Quality Gate Checklist (pre-story-done)

- [ ] `bun run check` — TypeScript zero errors
- [ ] `bun run lint` — ESLint zero warnings
- [ ] `bun run test:unit` — `registration-confirmation.test.ts` unit tests pass
- [ ] `bun run test:integration` — `5.3-INT-001+002` green; `5.3-INT-003/004/005` skip (expected)
- [ ] `messages/en.json` has 6 new `reg_email_*` keys with English values
- [ ] `messages/th.json` has same 6 keys with empty string `""` values (no Thai text)
- [ ] `src/lib/server/email/templates/registration-confirmation.ts` created (mirrors `booking-confirmation.ts`)
- [ ] `src/lib/server/email/templates/registration-confirmation.test.ts` unit test created
- [ ] `+page.server.ts` register action: captures `{ registrationId, cancelToken }`, builds `cancelLink`, enqueues job after `createRegistration` returns
- [ ] No inline `mailer.sendMail` call in route file (AC-3)
- [ ] `cancelToken` NOT returned to client (only used for email link — AC-3 / security)
- [ ] `return { form, success: true }` preserved (existing page depends on `data.success === true`)

---

## Notes

- **No Thai text in code**: All test assertions use English mock data. Thai translations are Rawinan's responsibility.
- **No credential literals**: SMTP credentials come from environment variables only.
- **Boss lifecycle per describe block**: The `beforeAll`/`afterAll` boss start/stop is scoped to the `'Story 5.3 — Confirmation Email Enqueued...'` describe block. It does not conflict with the 4.6 boss lifecycle in `bookings.test.ts` (separate file).
- **Singleton key cleanup**: The `afterAll` DELETE removes only `registration-confirm-%` keys, preventing stale conflicts on re-runs.
- **Combined test (5.3-INT-001+002)**: Per the story's ATDD spec (Task 4.2), INT-001 and INT-002 are combined in one test body for efficiency — the same raw SQL INSERT proves both the singletonKey format (INT-001) and the cancel link in the payload (INT-002).
