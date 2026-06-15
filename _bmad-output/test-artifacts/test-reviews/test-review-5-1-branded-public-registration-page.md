---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-15'
story: '5.1-branded-public-registration-page'
inputDocuments:
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
  - _bmad-output/test-artifacts/atdd-checklist-5-1-branded-public-registration-page.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-5.md
---

# Test Quality Review — Story 5.1: Branded Public Registration Page

## Overall Quality Score: 90/100 (Grade: A-)

**Execution Mode:** Sequential
**Analysis Mode:** Static (no live test run — integration tests require Testcontainers/Postgres)
**Reviewed:** 2026-06-15
**Reviewer:** Master Test Architect (TEA)
**Scope:**
- `tests/integration/registrations.test.ts` — 5 scenarios: `5.1-INT-001` [P0 active], `5.1-INT-IDOR-001` [P0 active, R-001 BLOCK], `5.1-INT-002` [P0 active], `5.1-INT-003` [P2 skip], `5.1-INT-004` [P2 skip]
- `tests/e2e/registrations.spec.ts` — 4 scenarios: `5.1-E2E-001` [P1 skip], `5.1-E2E-002` [P1 skip], `5.1-E2E-A11Y-001` [P1 skip], `5.1-E2E-A11Y-002` [P1 skip]

---

## Dimension Scores

| Dimension       | Score | Grade | Weight | Weighted |
|-----------------|-------|-------|--------|----------|
| Determinism     | 95    | A     | 30%    | 28.5     |
| Isolation       | 85    | B     | 30%    | 25.5     |
| Maintainability | 88    | B+    | 25%    | 22.0     |
| Performance     | 95    | A     | 15%    | 14.25    |
| **Overall**     | **90**| **A-**|        |          |

---

## Executive Summary

**Overall Assessment:** Pass — One Critical Finding Fixed

**Recommendation:** Approve — one CRITICAL security testing gap in the R-001 BLOCK test fixed; no other blocker findings; E2E scaffolds are correctly deferred.

### Key Strengths

- `randomUUID()` from `node:crypto` used throughout — no `Math.random()`, no `Date.now()`, no wall-clock non-determinism
- All P0 active tests follow the TDD red-phase pattern correctly: dynamic imports inside test body prevent collection-level failures when the target function does not exist
- R-001 BLOCK scenario (`5.1-INT-IDOR-001`) seeds two complete owner sets and verifies cross-token isolation — correct security test structure
- `ON CONFLICT ... DO NOTHING` in all seed SQL prevents constraint errors on repeated local runs without Testcontainers restart
- `registrationToken` data minimization assertion in INT-001 correctly verifies that the query result does not expose the token itself
- E2E `test.skip` discipline correctly applied per ATDD strategy; activation guide comments are thorough and accurate
- `AxeBuilder.withTags(['wcag2a', 'wcag2aa'])` in A11Y scaffolds is the correct axe-core pattern for WCAG 2.1 AA (NFR-007)
- No Thai text hardcoded in any test or mock data — project convention respected
- No credential literals in any file — tokens are `randomUUID()`-prefixed per-run values

### Key Weaknesses

- **CRITICAL (FIXED): `5.1-INT-IDOR-001` IDOR assertions wrapped in unconditional `if (result !== null)`** — `tokenB` is a valid seeded token and must resolve to `bookingB`. The original `if (result !== null) { ... }` guard meant that if the implementation returned `null` for all tokens (a catastrophic bug), zero assertions executed and the R-001 BLOCK test silently passed. Fixed in this review by adding `expect(result).not.toBeNull()` before the conditional, and adding a positive ownership assertion `expect(result.eventName).toBe(eventNameB)`.
- **LOW: Inline seed helpers duplicate project pattern** — `seedUser`, `seedUserProfile`, `seedRoom`, `seedBookingWithToken` are defined inline in the 490-line integration test file rather than imported from `tests/support/fixtures/pg-factory.ts`. This matches the project convention in `bookings.test.ts` (which also inlines its helpers), so no fix is applied here — but the duplication should be addressed when `pg-factory.ts` is extended in a future story.
- **LOW: No explicit DELETE cleanup after seeding** — mitigated by `ON CONFLICT DO NOTHING` + unique UUID-prefixed IDs per run; project-wide convention established in `bookings.test.ts`. No fix applied.

### Summary

The IDOR test for R-001 (score=9 BLOCK) contained a silent-pass gap in its most critical assertion path. A `tokenB` lookup with the faulty `if (result !== null) { ... }` guard would have passed with zero assertions if the implementation had a bug returning null. This is fixed. All other findings are LOW and consistent with project-wide conventions. The story's test scaffolds correctly cover AC-1 through AC-4 at integration level, with E2E tests properly deferred for activation during implementation.

---

## Quality Criteria Assessment

| Criterion                            | Status       | Violations | Notes |
| ------------------------------------ | ------------ | ---------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS       | 0          | Strategy comments describe preconditions, action, and assertion clearly |
| Test IDs                             | ✅ PASS       | 0          | `5.1-INT-001`, `5.1-INT-IDOR-001`, `5.1-INT-002`, `5.1-INT-003`, `5.1-INT-004`, `5.1-E2E-001`, `5.1-E2E-002`, `5.1-E2E-A11Y-001`, `5.1-E2E-A11Y-002` all present |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS       | 0          | `[P0]`, `[P1]`, `[P2]` in all test names |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS       | 0          | No `sleep` or `waitForTimeout` in any test (active or skipped) |
| Determinism (no conditionals)        | ✅ FIXED      | 1          | IDOR test `if (result !== null)` guard replaced with `expect(result).not.toBeNull()` + positive ownership assertion |
| Isolation (cleanup, no shared state) | ⚠️ LOW       | 1          | No explicit DELETE after seeding; mitigated by unique UUID prefixes + ON CONFLICT DO NOTHING — consistent with project convention |
| Fixture Patterns                     | ✅ PASS       | 0          | `seedUser(client, 'int-001')`, `seedBookingWithToken(...)` with per-scenario prefixes — parallel-safe |
| Data Factories                       | ⚠️ LOW       | 1          | Inline seed helpers duplicate `pg-factory.ts` patterns; consistent with `bookings.test.ts` convention — no fix applied |
| Explicit Assertions                  | ✅ FIXED      | 1          | IDOR test now asserts `result` not null AND positive ownership (`eventNameB`) before negative leakage checks |
| Test Efficacy (AC coverage)          | ✅ PASS       | 0          | AC-1 (INT-001), R-001 IDOR (INT-IDOR-001), AC-2 closed flag (INT-002), AC-4 null agenda (INT-003 skip), AC-3 non-existent token (INT-004 skip) |
| Test Length (≤300 lines)             | ⚠️ LOW       | 1          | `registrations.test.ts` is 490 lines — exceeds 300-line threshold; seed helpers are inline rather than imported |
| Test Duration (≤1.5 min)            | ✅ PASS       | 0          | Direct SQL seeding via `pg.Pool` client, single function call per test — fast |
| Stale Comments                       | ✅ PASS       | 0          | ATDD activation comments are accurate; red-phase commentary matches implementation status |

**Total Violations:** 0 Critical, 0 High, 3 Low (1 fixed, 2 documented)

---

## Quality Score Breakdown

Weighted dimension model:

```
Dimension         Raw Score  Weight  Weighted
-----------       ---------  ------  --------
Determinism           95      30%      28.5
  (+) randomUUID() from node:crypto throughout — no Math.random()
  (+) Dynamic imports inside test bodies prevent collection-level failures in red phase
  (+) Date literals for slots (2026-09-01, 2026-09-02) are far-future — no CI clock drift risk
  (-5) IDOR test originally had if(result !== null) guard with zero assertions on null — FIXED

Isolation             85      30%      25.5
  (+) Unique UUID-prefixed tokens per test run prevent cross-test token collisions
  (+) ON CONFLICT DO NOTHING guards against constraint errors on repeated runs
  (-10) No explicit DELETE after seeding (acceptable per project convention with Testcontainers,
        but local dev without container restart accumulates test rows)
  (-5) Inline seed helpers inside test file reduce reuse and increase risk of seed divergence

Maintainability       88      25%      22.0
  (+) Scenario IDs present in all test names; AC references accurate in comments
  (+) Red-phase TDD pattern clearly documented with activation guide
  (+) Data minimization assertion (registrationToken not exposed) is well-commented
  (-7) File is 490 lines — exceeds 300-line threshold; seed helpers are inline
  (-5) Seed helpers duplicate pg-factory.ts patterns (project-wide issue, noted for future)

Performance           95      15%      14.25
  (+) Direct pg.Pool client for seeding — no HTTP round-trips
  (+) Single function call per P0 test — minimal overhead
  (+) Pool created once in beforeAll, reused across all tests
  (-5) Client acquire/release per test (acceptable but could be batched in beforeAll)
                                     --------
Overall Score:                         90.25 → 90/100
Grade:                                 A-
```

---

## Findings Applied

### F-1. IDOR Assertions in `5.1-INT-IDOR-001` Wrapped in Silent-Pass Guard (FIXED)

**Severity:** CRITICAL
**Status:** FIXED
**Criterion:** Explicit Assertions / Determinism
**Location:** `tests/integration/registrations.test.ts` — `5.1-INT-IDOR-001` describe block

**Issue:**
The R-001 BLOCK test (score=9) — the mandatory IDOR gate for this story — called `getBookingByRegistrationToken(tokenB)` and then wrapped ALL assertions inside `if (result !== null) { ... }`. The comment stated "must return null" but `tokenB` is a valid, seeded token for `bookingB`. The WHERE clause `registration_token = tokenB` should return `bookingB`'s row, not `null`.

The danger: if the implementation had a bug returning `null` for any token (a catastrophic IDOR bypass), the test would silently pass with zero assertions executed. Vitest counts a test with zero assertions as passing by default. This meant the R-001 BLOCK test — the story's only mandatory security gate — would green-light a broken implementation.

Additionally, the test lacked a positive ownership assertion: even after the fix, if the implementation returned some other booking's data (not bookingB), the negative `.not.toBe(eventNameA)` checks might still pass if the returned record happened to have a different event name.

**Fix Applied:**
Three changes were made to the IDOR assertion block:

1. Added `expect(result, '...').not.toBeNull()` before the conditional — ensures the test fails if the implementation returns null for a valid token.
2. Replaced `if (result !== null) { ... }` with `if (!result) return; // type narrowing only` — the guard is now for TypeScript narrowing only, not a pass-through for zero assertions.
3. Added a positive ownership assertion: `expect(result.eventName, 'IDOR: tokenB must return eventNameB (positive ownership check)').toBe(eventNameB)` — confirms the WHERE clause returned the correct booking, not just any non-null row.

The negative leak checks (`not.toBe(eventNameA)`, `not.toBe('OwnerA')`, `not.toBe('Secret')`) are retained unconditionally. The test remains in the TDD red phase — it will still fail until `getBookingByRegistrationToken` is implemented.

---

## Activation Notes (E2E Tests — For Future Activation Phase)

### 5.1-E2E-001 and 5.1-E2E-002: Replace Placeholder Tokens Before Activation

**Location:** `tests/e2e/registrations.spec.ts` lines 55–61
**Issue:** `OPEN_BOOKING_SLUG` and `CLOSED_BOOKING_SLUG` are placeholder values. The tests are correctly `.skip` until seed wiring is implemented.
**Recommended Fix at Activation:** Replace with booking slugs seeded via Playwright global setup or a dev-bypass endpoint. See the activation guide comment at the top of the file.

### 5.1-E2E-001: Logo Selector May Need Refinement

**Location:** `tests/e2e/registrations.spec.ts` line 94
**Issue:** `img[alt*="logo" i], img[alt*="organization" i]` is a CSS attribute selector that may match unintended images if the page has multiple images. Per the knowledge base selector hierarchy, `data-testid` is preferred.
**Recommended Fix at Activation:** Add `data-testid="org-logo"` to the logo `<img>` element in the Svelte template and update the selector to `page.getByTestId('org-logo')`.

### 5.1-E2E-A11Y-001 and 5.1-E2E-A11Y-002: Ready for Activation

**Location:** `tests/e2e/registrations.spec.ts` lines 168–213
**Assessment:** `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()` is the correct axe-core pattern for NFR-007 WCAG 2.1 AA compliance. No changes needed before activation other than replacing placeholder tokens and removing `test.skip`.

---

## Best Practices Found

1. **Dynamic import inside test body for red-phase TDD:** All three P0 active tests use `await import('../../src/lib/server/db/queries/bookings.js')` inside the test function body rather than at the module level. This prevents collection-level failures when the target function does not exist — Vitest only loads the import when the test body runs, so skipped tests are not affected.

2. **Data minimization assertion:** INT-001 correctly verifies `expect((result as Record<string, unknown>)['registrationToken']).toBeUndefined()` — the query result must not expose the token that was used for lookup. This matches the security requirement that the page template must not render the token.

3. **Two-owner seed structure for IDOR proof:** The IDOR test seeds two complete owner sets (userA+profileA+roomA+bookingA+tokenA; userB+profileB+roomB+bookingB+tokenB) with distinct identifiers. This is the correct two-user pattern from `tests/support/helpers/idor-template.ts` and proves isolation at the DB query layer, not just application layer.

4. **`ON CONFLICT DO NOTHING` in all seed SQL:** Prevents constraint errors on `id` columns when tests are re-run against a non-fresh database (e.g., local dev without Testcontainers restart).

5. **No Thai text in tests or mock data:** `'ATDD Test Event 5.1-INT-001'`, `'OwnerA'`, `'OwnerB'`, etc. are English-only. All Thai string assertions are deferred to Rawinan per project constraint.

---

## Changes Applied

| Change | File | Description |
|--------|------|-------------|
| Modified | `tests/integration/registrations.test.ts` | Fixed `5.1-INT-IDOR-001`: replaced `if (result !== null) { ... }` silent-pass guard with `expect(result).not.toBeNull()`, added positive ownership assertion `expect(result.eventName).toBe(eventNameB)`, converted conditional to type-narrowing-only guard |

**Verification:** `bunx prettier --write tests/integration/registrations.test.ts && bun run lint` — passes cleanly. Static analysis only (no live test run — requires Testcontainers/Postgres).
