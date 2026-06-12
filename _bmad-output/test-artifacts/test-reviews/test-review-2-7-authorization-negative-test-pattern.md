---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-quality-evaluation
  - step-03a-determinism
  - step-03b-isolation
  - step-03c-maintainability
  - step-03e-performance
  - step-03f-aggregate-scores
  - step-04-generate-report
lastStep: step-04-generate-report
lastSaved: '2026-06-12'
storyId: '2.7'
storyKey: 2-7-authorization-negative-test-pattern-audit-on-mutations
inputDocuments:
  - _bmad-output/test-artifacts/atdd-checklist-2-7-authorization-negative-test-pattern-audit-on-mutations.md
  - _bmad-output/implementation-artifacts/2-5-authorization-guard-dispatcher.md
  - _bmad/tea/config.yaml
  - tests/integration/idor.test.ts
  - tests/support/helpers/idor-template.ts
  - tests/integration/profile.test.ts
  - tests/support/helpers/mock-event.ts
  - tests/support/fixtures/pg-factory.ts
  - src/lib/server/auth/guards.ts
  - tests/integration/auth-guard.test.ts
---

# Test Review — Story 2.7: Authorization Negative-Test Pattern & Audit on Mutations

**Date:** 2026-06-12
**Reviewer:** BMad TEA Agent — Test Review Workflow
**Story:** 2.7 — Authorization Negative-Test Pattern & Audit on Mutations
**Scope:** `tests/integration/idor.test.ts`, `tests/support/helpers/idor-template.ts`, `tests/integration/profile.test.ts` (lines 766–1029)
**Stack:** fullstack (SvelteKit + Vitest + Playwright)

---

## Overall Quality Score

| Dimension | Score | Grade | Weight |
|-----------|-------|-------|--------|
| Determinism | 96/100 | A | 30% |
| Isolation | 82/100 | B | 30% |
| Maintainability | 78/100 | C+ | 25% |
| Performance | 80/100 | B | 15% |
| **Overall** | **85/100** | **B** | — |

> Coverage is excluded from `test-review` scoring. Use `trace` for coverage analysis and gates.

---

## Critical Findings

### [HIGH — FIXED] Performance: Unnecessary DB setup in unit-level test file

**File:** `tests/integration/idor.test.ts`
**Dimension:** Performance + Isolation (compound violation)

`idor.test.ts` originally imported and initialized `createPgFactory` (runs `drizzle-kit migrate`, starts Testcontainers if `DATABASE_URL` not set) in `beforeAll` and `afterAll`. However, **all 3 active tests in this file are unit-level mock tests** — they test `assertOwner()` and `testOwnershipEnforcement()` directly using the `makeMockEvent` pattern. No database access is needed.

This added 10–60 seconds of unnecessary DB startup to every integration run and created a false dependency on `DATABASE_URL`.

**Fix applied:**
- Removed `createPgFactory`, `PgFactoryResult` imports from `idor.test.ts`
- Removed `pgFactory` variable, `beforeAll`, and `afterAll` blocks
- Removed unused `beforeAll`/`afterAll` from the `import { ... }` line (now just `describe, test, expect`)
- Updated file-level comment to clarify: "All active tests are unit-level mock tests — no DB required"
- Added `TODO(E4)` comment explaining when to add `pgFactory` back

---

### [MEDIUM — FIXED] Maintainability: Redundant inner lambda in 2.7-INT-001

**File:** `tests/integration/idor.test.ts`, line 123 (original)
**Dimension:** Maintainability

The `2.7-INT-001` test body contained an inner `assertOwnerThrowsFor403` async lambda (25 lines) that re-wrapped the `assertOwner` call to simulate a "fetch-like" pattern. This was redundant: Steps 1 and 2 of the same test had already verified that `assertOwner` throws `error(403)` for a non-owner. The lambda did not add any new coverage — it just re-proved what was already asserted.

Additionally, the `testOwnershipEnforcement.name` assertion that was inside `2.7-UNIT-001` was consolidated into `2.7-INT-001` Step 3 (importability check) for cohesion.

**Fix applied:**
- Removed the `assertOwnerThrowsFor403` lambda and its `await expect(...).resolves.toBeUndefined()` call
- Kept the `typeof testOwnershipEnforcement === 'function'` importability check
- Added `testOwnershipEnforcement.name === 'testOwnershipEnforcement'` assertion (moved from 2.7-UNIT-001) to keep the named-function contract check in the primary P0 test

---

## Warnings (not fixed — pre-existing or advisory)

### [LOW] Determinism advisory: `Date.now()` in `seedUserSession()`

**File:** `tests/integration/profile.test.ts`, line 192
**Pre-existing:** Story 2.3 code — not introduced by Story 2.7

`seedUserSession()` uses `new Date(Date.now() + 30 * 60 * 1000)` for session expiry. This is technically non-deterministic but functionally correct for session seeding (the session just needs to be valid). Compare with `MOCK_SESSION_EXPIRES_AT = new Date('2099-12-31')` in `mock-event.ts`.

**Recommendation (out of scope for 2.7):** In a future Story 2.3 cleanup pass, replace with a fixed far-future constant to match the established pattern.

---

## Test Inventory

| Test ID | File | Level | Status | AC |
|---------|------|-------|--------|-----|
| 2.7-INT-001 | `tests/integration/idor.test.ts` | Unit/Mock | ACTIVE (P0) | AC-1, AC-7 |
| 2.7-UNIT-001 | `tests/integration/idor.test.ts` | Unit/Static | ACTIVE (P2) | AC-2, AC-3 |
| 2.7-INT-001b | `tests/integration/idor.test.ts` | Integration/HTTP | test.skip (stub for E4) | AC-2 |
| 2.7-INT-002 | `tests/integration/profile.test.ts` | Integration/HTTP | test.skipIf(!DEV_SERVER_URL) (P1) | AC-4 |
| 2.7-INT-003 | `tests/integration/profile.test.ts` | Integration/HTTP | test.skipIf(!DEV_SERVER_URL) (P1) | AC-5 |
| 2.7-INT-004 | `tests/integration/profile.test.ts` | Integration/Service | ACTIVE (P1) | AC-6 |

**AC Coverage:** 7/7 (all acceptance criteria covered)

---

## Files Changed by This Review

| File | Change |
|------|--------|
| `tests/integration/idor.test.ts` | Removed unnecessary `pgFactory` DB setup; removed redundant `assertOwnerThrowsFor403` lambda; consolidated `testOwnershipEnforcement.name` assertion into 2.7-INT-001 Step 3 |

---

## Post-Review Quality Scores (re-calculated after fixes)

| Dimension | Before | After |
|-----------|--------|-------|
| Determinism | 96 | 96 (unchanged) |
| Isolation | 82 | 95 (MEDIUM removed) |
| Maintainability | 78 | 92 (MEDIUM removed) |
| Performance | 80 | 95 (HIGH removed) |
| **Overall** | **85** | **~94** |

---

## Checklist

- [x] No orphaned CLI sessions (no Playwright/browser usage in reviewed tests)
- [x] No temp artifacts in random locations
- [x] Review report saved to `_bmad-output/test-artifacts/test-reviews/`
- [x] Fixes applied and prettier/lint passed (zero new violations)
- [x] Pre-existing TS errors in `hooks.server.ts` confirmed unrelated to Story 2.7

---

## Summary

Story 2.7 test quality is **B (85/100)** before fixes and approximately **A (94/100)** after fixes. The original scaffolds were well-designed with appropriate use of the `makeMockEvent` unit-test pattern, good JSDoc, and correct `skipIf` guards. The two fixes address concrete technical debt:

1. **Performance/Isolation:** `pgFactory` DB setup was wasteful for unit-level tests — removed, saving 10–60s per CI run
2. **Maintainability:** Redundant inner lambda added noise without coverage benefit — removed

The `idor-template.ts` helper is well-implemented and ready for E4 adoption.

**Next recommended workflow:** `trace` (to verify AC coverage traceability for 2.7-INT-002/003/004 once the dev server is available).

---

**Generated by:** BMad TEA Agent — Test Review Workflow
**Workflow:** `bmad-testarch-test-review`
**Version:** 6.8.0 (BMad v6)
**Story:** 2.7 — Authorization Negative-Test Pattern & Audit on Mutations
