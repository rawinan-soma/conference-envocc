---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-generate-tests', 'step-04-validate-and-save']
lastStep: 'step-04-validate-and-save'
lastSaved: '2026-06-16'
storyId: '5.6'
storyKey: '5-6-registration-open-close-rules'
storyFile: '_bmad-output/implementation-artifacts/5-6-registration-open-close-rules.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-5-6-registration-open-close-rules.md'
generatedTestFiles:
  - tests/integration/registrations.test.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/5-6-registration-open-close-rules.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-5.md
  - _bmad/tea/config.yaml
  - src/lib/server/jobs/handlers/send-email.ts
  - src/lib/server/jobs/queues.ts
  - tests/integration/registrations.test.ts
---

# ATDD Checklist — Story 5.6: Registration Open/Close Rules

## Step 1: Preflight & Context

### Stack Detection
- **Detected stack:** `fullstack`
- Indicators: `playwright.config.ts` (frontend/E2E), `package.json` with SvelteKit, Vitest integration tests, `pyproject.toml` absent, `go.mod` absent

### Prerequisites Check
- [x] Story approved with clear acceptance criteria (AC-1 through AC-7 defined)
- [x] `playwright.config.ts` exists (E2E framework)
- [x] Vitest integration test config exists (`vitest.config.ts`)
- [x] Development environment available

### Story Context Loaded
- **Story:** 5.6 — Registration Open/Close Rules
- **Epic:** 5 — External Registration & Headcount
- **GH Issue:** #34
- **Key ACs tested:**
  - AC-1 (FR-033): Auto-close pg-boss job closes registration when `registrationClosesAt` reached
  - AC-5 (R-004 MITIGATE): Handler is idempotent — double-fire safe (enabled-check guard)
  - AC-2 (FR-034b) [P1]: Manual close action sets `registration_enabled=false`
  - AC-6 (R-011 DOCUMENT) [P2]: Handler has no `$app/*` or `$env/dynamic` imports

### TEA Config Flags
- `tea_use_playwright_utils`: true
- `tea_browser_automation`: auto
- `test_stack_type`: auto → fullstack

---

## Step 2: Generation Mode

**Mode selected:** Append to existing file (Task 9 spec mandates append-only to `tests/integration/registrations.test.ts`)

**Target file:** `tests/integration/registrations.test.ts`

**Pattern:** Direct pg.Pool queries + handler dynamic import (same as existing 5.1 and 5.2 scaffolds)

---

## Step 3: Generated Tests

### Test Scenarios

| Test ID | Priority | Status | AC Coverage | Description |
|---------|----------|--------|-------------|-------------|
| 5.6-INT-001 | P0 | ACTIVE (red) | AC-1, FR-033 | Auto-close handler sets `registration_enabled=false` when `registrationClosesAt` is in the past |
| 5.6-INT-002 | P0 | ACTIVE (red) | AC-5, R-004 MITIGATE | Handler idempotent — re-run on already-closed booking no-op, no error, no duplicate audit row — MANDATORY PR GATE |
| 5.6-INT-003 | P1 | SKIPPED | AC-5, R-004 | Worker restart does not re-close already-closed registration (Testcontainers) |
| 5.6-INT-004 | P1 | SKIPPED | AC-2, FR-034b | Manual close action sets `registration_enabled=false` immediately |
| 5.6-INT-005 | P2 | SKIPPED | AC-6, R-011 | Handler file has no `$app/*` or `$env/dynamic` imports (lint/AST scan) |

### Key Design Decisions

1. **Time-travel pattern** (per test-design Appendix A): No `sleep()` calls. Instead, SQL UPDATE sets `registration_closes_at = NOW() - interval '1 second'` in the fixture, then the handler is invoked directly with a stub job. This makes tests deterministic and fast.

2. **Direct handler invocation**: Both P0 tests import `closeRegistrationHandler` dynamically and call it with a `JobLike` stub object `{ id, name, data: { bookingId } }`. No running pg-boss worker needed.

3. **Seed helper added**: `seedBookingForCloseTest()` — a local helper that seeds a booking row without requiring `registrationClosesAt` in the INSERT (that column is updated separately via SQL UPDATE to support the time-travel pattern).

4. **5.6-INT-002 assertion uses `.resolves.toBeUndefined()`** — more precise than `.not.toThrow()` since the handler should return `void` (undefined) on idempotent no-op.

5. **Audit log assertion in 5.6-INT-002**: Asserts `COUNT = 0` (not merely "no new row"), because the booking was seeded as already-closed and the handler must not write any audit row when it no-ops.

### AC-4 (FR-032) — No Capacity Cap
Not explicitly tested in 5.6 (as per story spec). Already covered by `5.2-INT-005` which seeds 99 registrations and verifies the 100th succeeds. No new test needed here.

### AC-3 (FR-046) — Closed-State Message
Not tested in 5.6 (per story scope: Story 5.1 already implements and tests this). No new test needed.

### AC-7 — Paraglide i18n Keys
Not integration-tested directly (UI string assertions are an E2E concern). The story has no 5.6 E2E scenarios per test-design.

---

## Step 4: Checklist

### Red-Phase Verification
- [x] P0 tests are ACTIVE (no `.skip`)
- [x] P0 tests WILL FAIL until implementation is complete (they import `close-registration.js` which does not exist yet)
- [x] P1 tests use `test.skip` with activation comment
- [x] P2 tests use `test.skip` with activation comment
- [x] No Thai text in any test or mock data
- [x] All string assertions use English mock data
- [x] No credential literals in test code
- [x] Tests appended to existing file (not a new file)
- [x] Seed helpers follow same pattern as existing 5.1/5.2 helpers (pg.PoolClient, randomUUID)
- [x] `randomUUID()` used for token uniqueness (collision-safe between test runs)
- [x] `pool.connect()` / `client.release()` in try/finally (same as existing tests)
- [x] Dynamic imports used for not-yet-implemented modules (handler, queues)
- [x] `5.6-INT-002` is the MANDATORY PR gate for R-004 (score=6) mitigation

### Mandatory PR Gate Compliance
Per test-design §Mandatory in every PR gate:
- `5.6-INT-002` (idempotency / R-004 MITIGATE) — ACTIVE, no `.skip`
