---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
lastStep: step-04-generate-tests
lastSaved: '2026-06-15'
storyId: '5.2'
storyKey: 5-2-submit-a-registration
storyFile: _bmad-output/implementation-artifacts/5-2-submit-a-registration.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-5-2-submit-a-registration.md
generatedTestFiles:
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/5-2-submit-a-registration.md
  - _bmad/tea/config.yaml
  - playwright.config.ts
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
  - tests/support/fixtures/pg-factory.ts
---

# ATDD Checklist — Story 5.2: Submit a Registration

## Step 1: Preflight & Context

### Stack Detection

- **Detected stack:** `fullstack`
  - Frontend indicators: `package.json` with SvelteKit, `playwright.config.ts`, `vite.config.ts`
  - Backend indicators: Postgres/Drizzle ORM, node server-side code in `src/lib/server/`

### Prerequisites

- [x] Story 5.2 approved with clear acceptance criteria (7 ACs + 1 mandatory guard test)
- [x] `playwright.config.ts` present (E2E framework)
- [x] Vitest integration project configured (integration framework)
- [x] Existing test patterns in `tests/integration/registrations.test.ts` and `tests/e2e/registrations.spec.ts`

### Story Context

- **Story:** 5.2 Submit a Registration
- **Epic:** 5 — External Registration & Headcount
- **Key ACs:** AC-1 (form fields), AC-2 (catering conditional), AC-3 (DB record + audit log), AC-4 (success confirmation), AC-5 (mobile responsive), AC-6 (server-side closed guard R-005 MITIGATE), AC-7 (Paraglide i18n)
- **Critical risk:** R-005 MITIGATE — `5.2-INT-CLOSED-001` is a MANDATORY gate test (direct POST bypass when `registrationEnabled=false`)

### Config Flags

- `tea_use_playwright_utils`: true
- `tea_use_pactjs_utils`: false
- `tea_browser_automation`: auto
- `test_stack_type`: auto → detected as `fullstack`

---

## Step 2: Generation Mode

**Mode selected:** AI Generation (sequential)

- Acceptance criteria are clear and fully specified in the story dev notes
- Story enumerates exact test IDs, priorities, and skip status — no UI recording needed
- Execution mode: `auto` → resolved to `sequential` (direct in-context generation)

---

## Step 3: Test Strategy

### AC-to-Test Mapping

| AC | Scenario | Level | Priority | Skip? |
|----|----------|-------|----------|-------|
| AC-3 | Valid form creates registrant DB row | Integration | P0 | ACTIVE |
| AC-6 (R-005 MITIGATE) | Direct POST when closed returns 400 | Integration | P0 | ACTIVE |
| AC-3 | `title='Other'` stored correctly | Integration | P1 | test.skip |
| AC-2 | Meal type required/absent per catering flag | Integration | P1 | test.skip |
| AC-2 | `mealType='Other'` stored correctly | Integration | P1 | test.skip |
| AC-3 (R-012) | 100th registration succeeds (no cap) | Integration | P1 | test.skip |
| AC-1,2,4 | Full registration form submit (desktop) | E2E | P1 | test.skip |
| AC-5 (NFR-004) | Form usable at 375×667px (no h-scroll) | E2E | P1 | test.skip |
| AC-5 (NFR-004) | Form usable at 1280×800px | E2E | P1 | test.skip |
| AC-1 | Missing required fields shows error | E2E | P2 | test.skip |
| AC-4 | Submit button disabled during submission | E2E | P2 | test.skip |
| AC-5 (NFR-004) | Registration completes in ≤2 minutes | E2E | P3 | test.skip |
| Performance | k6 50 concurrent registrations | Load | P3 | test.skip |

### TDD Red Phase Confirmation

- **P0 integration tests:** ACTIVE (no `.skip`) — will FAIL until `createRegistration` + `registration-service.ts` are implemented (dynamic import throws module-not-found)
- **All E2E tests:** `test.skip` — all P1/P2/P3
- **P1 integration tests:** `test.skip` — activate during implementation

---

## Step 4: Generated Test Files

### Integration Tests Appended To

**File:** `tests/integration/registrations.test.ts`

New additions (appended after existing Story 5.1 tests):
- `seedRegistrant` helper function
- `5.2-INT-001` [P0 ACTIVE] — Valid form creates registrant DB row
- `5.2-INT-CLOSED-001` [P0 ACTIVE] — `RegistrationClosedError` thrown when `registrationEnabled=false`
- `5.2-INT-002` [P1 skip] — `title='Other'` stored correctly
- `5.2-INT-003` [P1 skip] — Meal type conditional validation
- `5.2-INT-004` [P1 skip] — `mealType='Other'` stored correctly
- `5.2-INT-005` [P1 skip] — 100th registration succeeds (R-012)

### E2E Tests Appended To

**File:** `tests/e2e/registrations.spec.ts`

New additions (appended after existing Story 5.1 tests):
- `5.2-E2E-001` [P1 skip] — Full form submit desktop
- `5.2-E2E-MOBILE-001` [P1 skip] — 375×667px viewport
- `5.2-E2E-MOBILE-002` [P1 skip] — 1280×800px viewport
- `5.2-E2E-003` [P2 skip] — Validation errors
- `5.2-E2E-004` [P2 skip] — Loading state
- `5.2-E2E-005` [P3 skip] — ≤2 minutes completion
- `5.2-LOAD-001` [P3 skip] — k6 50 concurrent registrations

---

## TDD Red Phase Status

🔴 **RED PHASE** — All P0 integration tests ACTIVE and expected to FAIL until implementation.

All E2E scaffolds are `test.skip` (activate during implementation tasks).

**MANDATORY gate test:** `5.2-INT-CLOSED-001` must pass (green) before R-005 MITIGATE is considered closed.
