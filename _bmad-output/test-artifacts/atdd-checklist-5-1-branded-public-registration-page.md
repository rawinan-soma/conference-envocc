---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
lastStep: step-04-generate-tests
lastSaved: 2026-06-15
storyId: "5.1"
storyKey: 5-1-branded-public-registration-page
storyFile: _bmad-output/implementation-artifacts/5-1-branded-public-registration-page.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-5-1-branded-public-registration-page.md
generatedTestFiles:
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/5-1-branded-public-registration-page.md
  - _bmad/tea/config.yaml
  - tests/support/fixtures/pg-factory.ts
  - tests/support/helpers/idor-template.ts
  - src/lib/server/db/schema/bookings.ts
  - src/lib/server/db/schema/profiles.ts
  - src/lib/server/db/schema/rooms.ts
  - drizzle/0002_better_auth.sql
  - drizzle/0004_user_profiles.sql
---

# ATDD Checklist — Story 5.1: Branded Public Registration Page

## Step 1: Preflight & Context

### Stack Detection
- **Detected stack:** `fullstack` (SvelteKit frontend + PostgreSQL backend)
- **Frontend indicators:** `package.json` with SvelteKit/Svelte, `playwright.config.ts`, `vite.config.ts`
- **Backend indicators:** Drizzle ORM, PostgreSQL Testcontainers integration tests

### Prerequisites
- [x] Story approved with clear acceptance criteria (6 ACs covering FR-040, R-001, NFR-007)
- [x] `playwright.config.ts` present (E2E framework configured)
- [x] Vitest `integration` project configured in `vitest.config.ts`
- [x] `tests/support/fixtures/pg-factory.ts` — Testcontainers pg pool available
- [x] `tests/support/helpers/idor-template.ts` — IDOR enforcement helper available

### Story Context
- **Story:** 5.1 — Branded Public Registration Page (read-only display)
- **Epic:** 5 — External Registration & Headcount
- **GH Issue:** #29
- **Security:** R-001 (BLOCK, score=9) — IDOR guard via `WHERE registration_token = token`

### TEA Config
- `tea_use_playwright_utils`: true
- `tea_use_pactjs_utils`: false
- `tea_browser_automation`: auto (→ CLI/AI generation)
- `tea_execution_mode`: auto (→ sequential generation used here)

---

## Step 2: Generation Mode

**Selected mode:** AI Generation (sequential)

**Rationale:** Acceptance criteria are clear and enumerated in Tasks 4 & 5. No complex UI interactions requiring recording. The story is read-only display (no form submit in scope) — AI generation from the detailed story spec is sufficient.

---

## Step 3: Test Strategy

### AC → Scenario Mapping

| AC | Scenario ID | Level | Priority | Status |
|----|------------|-------|----------|--------|
| AC-1 (FR-040) | 5.1-INT-001 | Integration | P0 | ACTIVE (red) |
| AC-3 (R-001) | 5.1-INT-IDOR-001 | Integration | P0 | ACTIVE (red) — MANDATORY BLOCK |
| AC-2 | 5.1-INT-002 | Integration | P0 | ACTIVE (red) |
| AC-4 | 5.1-INT-003 | Integration | P2 | `test.skip` |
| AC-3 | 5.1-INT-004 | Integration | P2 | `test.skip` |
| AC-1 | 5.1-E2E-001 | E2E | P1 | `test.skip` |
| AC-2 | 5.1-E2E-002 | E2E | P1 | `test.skip` |
| AC-5 (NFR-007) | 5.1-E2E-A11Y-001 | E2E | P1 | `test.skip` |
| AC-5 (NFR-007) | 5.1-E2E-A11Y-002 | E2E | P1 | `test.skip` |

### Test Level Rationale

- **Integration tests (P0 ACTIVE):** Query layer validation. `getBookingByRegistrationToken` is the core new function — test it directly at DB level. IDOR is a security requirement (R-001 BLOCK) and must be proven at query level before E2E.
- **E2E tests (P1 SKIPPED):** Require dev server + seed wiring. The public `/r/[token]` route needs full stack (route + page + i18n). Skipped per repo convention until seed tokens are wired in global setup.

### Red Phase Compliance

- P0 integration tests are ACTIVE (no `.skip`) — they will fail until `getBookingByRegistrationToken` is implemented (TDD red phase).
- All E2E tests are `test.skip` per repo convention (require dev server + seed wiring).
- P2 integration tests are `test.skip` — activate as implementation progresses.

---

## Step 4: Generated Test Files

### Integration Tests: `tests/integration/registrations.test.ts`

| Scenario ID | Description | Priority | Status |
|------------|-------------|----------|--------|
| 5.1-INT-001 | Valid token returns full event data (eventName, roomName, agenda, contactName, contactPhone) | P0 | ACTIVE |
| 5.1-INT-IDOR-001 | Cross-token lookup: tokenB cannot retrieve bookingA data — R-001 BLOCK | P0 | ACTIVE |
| 5.1-INT-002 | registrationEnabled=false → closed flag returned, event info still present | P0 | ACTIVE |
| 5.1-INT-003 | agenda=null fixture — query result has agenda=null | P2 | `test.skip` |
| 5.1-INT-004 | Non-existent/malformed token → query returns null (no throw) | P2 | `test.skip` |

**Seed strategy:**
- Each test seeds: `users` → `user_profiles` → `rooms` → `bookings` via raw SQL (pg pool)
- Dynamic import of `getBookingByRegistrationToken` inside each test body (function not yet implemented)
- Dynamic import scopes red-failure to the test body — prevents collection-level failures for skipped tests

**IDOR proof (5.1-INT-IDOR-001):**
- Seeds two complete owner sets (userA+profileA+roomA+bookingA with tokenA; userB+profileB+roomB+bookingB with tokenB)
- Calls `getBookingByRegistrationToken(tokenB)` and asserts no field from bookingA leaks
- Closes R-001 (IDOR, score=9) — MANDATORY per story spec

### E2E Tests: `tests/e2e/registrations.spec.ts`

| Scenario ID | Description | Priority | Status |
|------------|-------------|----------|--------|
| 5.1-E2E-001 | Open page renders event name, room, date/time (no auth redirect) | P1 | `test.skip` |
| 5.1-E2E-002 | Closed page shows "Registration Closed" message; form inputs not rendered | P1 | `test.skip` |
| 5.1-E2E-A11Y-001 | axe-core WCAG 2.1 AA zero violations on open-state `/r/[token]` | P1 | `test.skip` |
| 5.1-E2E-A11Y-002 | axe-core WCAG 2.1 AA zero violations on closed-state `/r/[token]` | P1 | `test.skip` |

**Notes:**
- `SEED_TOKEN` and `SEED_CLOSED_TOKEN` are placeholder constants — replace with real tokens once seed wiring is done
- `AxeBuilder` from `@axe-core/playwright` used for NFR-007 compliance checks
- All E2E tests verify no redirect to `/login` (route is public, no auth guard)

---

## ATDD Red Phase Summary

```
TDD RED PHASE: Test Scaffolds Generated

Integration:
  - 5.1-INT-001     [P0] ACTIVE  — will fail (getBookingByRegistrationToken not yet implemented)
  - 5.1-INT-IDOR-001 [P0] ACTIVE — will fail (same) — MANDATORY R-001 BLOCK
  - 5.1-INT-002     [P0] ACTIVE  — will fail (same)
  - 5.1-INT-003     [P2] SKIP
  - 5.1-INT-004     [P2] SKIP

E2E:
  - 5.1-E2E-001      [P1] SKIP
  - 5.1-E2E-002      [P1] SKIP
  - 5.1-E2E-A11Y-001 [P1] SKIP
  - 5.1-E2E-A11Y-002 [P1] SKIP

All tests assert EXPECTED behavior.
P0 active tests FAIL until getBookingByRegistrationToken is implemented (Task 1).
This is INTENTIONAL (TDD red phase).
```
