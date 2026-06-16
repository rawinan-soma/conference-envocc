---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
lastStep: step-04-generate-tests
lastSaved: '2026-06-16'
storyId: '5.8'
storyKey: 5-8-registrant-list-dashboard-headcount
storyFile: _bmad-output/implementation-artifacts/5-8-registrant-list-dashboard-headcount.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-5-8-registrant-list-dashboard-headcount.md
generatedTestFiles:
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/5-8-registrant-list-dashboard-headcount.md
  - _bmad/tea/config.yaml
  - playwright.config.ts
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
  - tests/support/fixtures/pg-factory.ts
  - tests/support/helpers/idor-template.ts
  - tests/support/helpers/dev-bypass.ts
---

# ATDD Checklist — Story 5.8: Registrant List & Dashboard Headcount

## Step 1: Preflight & Context

### Stack Detection

- **Detected stack:** `fullstack`
  - Frontend indicators: `package.json` with SvelteKit, `playwright.config.ts`, `vite.config.ts`
  - Backend indicators: Postgres/Drizzle ORM, node server-side code in `src/lib/server/`

### Prerequisites

- [x] Story 5.8 approved with clear acceptance criteria (7 ACs + IDOR mandatory gate)
- [x] `playwright.config.ts` present (E2E framework)
- [x] Vitest integration project configured (integration framework)
- [x] Existing test patterns in `tests/integration/registrations.test.ts` and `tests/e2e/registrations.spec.ts`
- [x] `tests/support/helpers/idor-template.ts` — `testOwnershipEnforcement()` available

### Story Context

- **Story:** 5.8 Registrant List & Dashboard Headcount
- **Epic:** 5 — External Registration & Headcount
- **GH Issue:** #36
- **Key ACs:**
  - AC-1: `/bookings/[id]/registrants` route — list with name, org, email, status badge
  - AC-2: Status badge — Registered (green-100/green-700) vs Cancelled (cream-200/ink-2); text label required (WCAG)
  - AC-3 (R-007 MITIGATE): IDOR ownership guard — non-owner gets 403; admin sees all; unauth redirects to /login
  - AC-4: Empty state message when no registrants
  - AC-5 (FR-052): Dashboard headcount = count of `status='registered'` via subquery
  - AC-6: Headcount excludes `status='cancelled'` registrants
  - AC-7: All UI strings via Paraglide (English in `messages/en.json`; empty `""` in `messages/th.json`)
- **Critical risk:** R-007 MITIGATE — `5.8-INT-IDOR-001` is a MANDATORY gate test (same tier as 5.1-INT-IDOR-001 and 5.2-INT-CLOSED-001)

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
| AC-3 (R-007 MITIGATE) | Non-owner gets 403/404 on registrant list | Integration (HTTP) | P0 | ACTIVE |
| AC-1, AC-3 | Registrant list returns both Registered and Cancelled rows | Integration (DB) | P0 | ACTIVE |
| AC-5, AC-6 | Dashboard headcount = registered count (cancelled excluded) | Integration (DB) | P0 | ACTIVE |
| AC-3 (admin) | Admin user can see registrant list for any event | Integration (HTTP) | P2 | test.skip |
| AC-1, AC-2 | Organizer sees table with status badges (Registered/Cancelled) | E2E | P1 | test.skip |
| AC-5 | Dashboard card shows live headcount after new registration | E2E | P1 | test.skip |

### Test Level Rationale

- **Integration P0 (DB-level):** `5.8-INT-001` and `5.8-INT-002` call query functions directly — no HTTP server needed; fast and stable; perfect for data-correctness and count assertions.
- **Integration P0 (HTTP-level):** `5.8-INT-IDOR-001` requires a live HTTP request with non-owner session — uses `testOwnershipEnforcement()` from `idor-template.ts`; needs `DEV_SERVER_URL`.
- **Integration P2 (HTTP-level skip):** `5.8-INT-003` — admin cross-event access; same HTTP pattern as IDOR-001 but lower priority.
- **E2E P1 (skip):** `5.8-E2E-001` and `5.8-E2E-002` — Playwright visual verification of badge rendering and dashboard card update; activate during implementation.

### Red Phase Compliance

- P0 ACTIVE tests import not-yet-existing functions (`getRegistrantsByBookingId`, `getUpcomingBookingsByOrganizer` with `registrantCount`) and will FAIL until Tasks 1 and 2 are implemented — confirming TDD red phase.
- P0 HTTP IDOR test requires `DEV_SERVER_URL` and the new `/bookings/[id]/registrants` route — guarded via `test.skipIf(!process.env['DEV_SERVER_URL'])` so it only activates when a server is available.
- All P1/P2 tests use `test.skip` — scaffolded but will not execute until manually activated.

---

## Step 4: Generated Test Scaffolds

### Integration Tests Appended

**File:** `tests/integration/registrations.test.ts`

Tests appended in the Story 5.8 section:

| Test ID | Description | Priority | Status |
|---------|-------------|----------|--------|
| `5.8-INT-IDOR-001` | Registrant list IDOR — non-owner gets 403/404 | P0 | ACTIVE (skipIf no server) |
| `5.8-INT-001` | Registrant list shows correct statuses (Registered/Cancelled) | P0 | ACTIVE |
| `5.8-INT-002` | Dashboard headcount = registered count only (excludes cancelled) | P0 | ACTIVE |
| `5.8-INT-003` | Admin sees registrant list for event they do not own | P2 | test.skip |

### E2E Tests Appended

**File:** `tests/e2e/registrations.spec.ts`

Tests appended in the Story 5.8 section:

| Test ID | Description | Priority | Status |
|---------|-------------|----------|--------|
| `5.8-E2E-001` | Organizer sees registrant list with status badges | P1 | test.skip |
| `5.8-E2E-002` | Dashboard card shows live headcount after a new registration | P1 | test.skip |

### PR Gate Tests (Must Pass Before Merge)

The following P0 tests must pass before PR merge (no `.skip`):

- `5.8-INT-IDOR-001` — R-007 MITIGATE (mandatory, same tier as `5.1-INT-IDOR-001` and `5.2-INT-CLOSED-001`)
- `5.8-INT-001` — registrant list statuses correct
- `5.8-INT-002` — headcount excludes cancelled

---

## TDD Red Phase Status

```
TDD RED PHASE: Test Scaffolds Generated

Activated tests will FAIL until implementation is complete:
- 5.8-INT-IDOR-001: needs /bookings/[id]/registrants route + owner-or-admin guard
- 5.8-INT-001: needs getRegistrantsByBookingId() in registrations.ts
- 5.8-INT-002: needs registrantCount field in getUpcomingBookingsByOrganizer()

Scaffolded (skipped) tests stay skipped until developer activates:
- 5.8-INT-003: admin cross-event access
- 5.8-E2E-001: Playwright badge rendering
- 5.8-E2E-002: Playwright dashboard headcount

This is INTENTIONAL (TDD red phase).
```
