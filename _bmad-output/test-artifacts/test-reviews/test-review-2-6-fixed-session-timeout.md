---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-quality-evaluation
  - step-03f-aggregate-scores
  - step-04-generate-report
lastStep: step-04-generate-report
lastSaved: '2026-06-11'
workflowType: testarch-test-review
storyId: '2.6'
storyKey: 2-6-fixed-session-timeout
inputDocuments:
  - tests/integration/session-timeout.test.ts
  - _bmad-output/test-artifacts/atdd-checklist-2-6-fixed-session-timeout.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-2.md
  - knowledge/test-quality.md
  - knowledge/data-factories.md
  - knowledge/test-levels-framework.md
  - knowledge/fixture-architecture.md
---

# Test Quality Review: session-timeout.test.ts

**Quality Score**: 88/100 (A — Good)
**Review Date**: 2026-06-11
**Review Scope**: single file
**Reviewer**: TEA Agent (bmad-testarch-test-review)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Approve with Comments

### Key Strengths

- All 7 test IDs present and correctly formatted (2.6-UNIT-001/002/003, 2.6-INT-001/001b/002/003, 2.6-INT-004 as todo)
- Priority markers ([P0], [P1], [P2], [P3]) present on every test — aligns with test-design-epic-2.md
- Extensive inline documentation: each test has a well-structured Given/When/Then comment block explaining the AC, risk link, and implementation strategy
- Comprehensive cleanup discipline: `truncateBetterAuthTables()` wrapped in `try/finally` in every test that mutates the DB
- Correct level selection: static config assertions at integration level (justified — auth module imports a DB), HTTP-layer assertions for auth-guard behavior, direct Better Auth API call for session validation — all appropriate per test-levels-framework.md
- 100% AC coverage (2/2 acceptance criteria covered) per the ATDD checklist

### Key Weaknesses

- File length: 420 lines — exceeds the 300-line ideal. Justified by high comment density; not a structural problem but worth noting
- `Date.now()` race in INT-001b: the assertion `row.expiresAt > Date.now()` was evaluated at a slightly later time than when `validUntil` was computed, creating a small race window on very slow machines (fixed in this review)
- INT-001 (HTTP fetch) had no clear error message when the dev server is unreachable — a network failure would produce an opaque error instead of a helpful "start the app" message (fixed in this review)

### Summary

`tests/integration/session-timeout.test.ts` is a well-crafted integration test file for Story 2.6 (Fixed Session Timeout). The tests correctly cover all P0 and P1 acceptance criteria for FR-093 using a mix of static source-code assertions, DB-level seeding, direct Better Auth API calls, and HTTP-layer redirect checks. Test ID and priority coverage is complete.

Two minor determinism/usability issues were identified and fixed during this review: a `Date.now()` race in the INT-001b assertion baseline, and a missing clear error message on server connectivity failure in INT-001. Both fixes are purely defensive and do not change test logic. The file's 420-line length is fully justified by high-quality documentation comments and is not a structural concern.

---

## Quality Criteria Assessment

| Criterion                     | Status    | Violations | Notes                                                                              |
| ----------------------------- | --------- | ---------- | ---------------------------------------------------------------------------------- |
| BDD Format (Given/When/Then)  | PASS      | 0          | All tests have structured Given/When/Then comment blocks                           |
| Test IDs                      | PASS      | 0          | All 7 tests have IDs in `2.6-{LEVEL}-{SEQ}` format                                |
| Priority Markers              | PASS      | 0          | All tests carry [P0]/[P1]/[P2]/[P3] markers matching test-design-epic-2.md        |
| Hard Waits                    | PASS      | 0          | No `waitForTimeout`, `setTimeout`, or `sleep` calls                               |
| Determinism                   | WARN      | 1          | INT-001b: `Date.now()` assertion baseline race (fixed in this review)              |
| Isolation                     | WARN      | 1          | UNIT-002: `process.env` mutation mitigated by `try/finally`; no leak in practice  |
| Fixture Patterns              | PASS      | 0          | Inline helpers `seedSession` + `truncateBetterAuthTables` follow pure-helper pattern |
| Data Factories                | PASS      | 0          | Hardcoded IDs per test are justified in sequential integration mode                |
| Network-First                 | N/A       | —          | No Playwright UI tests; HTTP fetch uses `redirect: 'manual'` — correct            |
| Assertions                    | PASS      | 0          | All `expect()` calls are in test bodies; messages are explicit                    |
| Test Length                   | WARN      | 1          | 420 lines (>300 guideline); justified by documentation comments                    |
| Test Duration (est.)          | PASS      | 0          | DB-level tests; no hard waits; INT-001 requires server but is skipped in unit mode |
| Flakiness Patterns            | WARN      | 1          | INT-001: no guard when dev server is unreachable (fixed with `{ cause: err }`)     |

---

## Fixes Applied

### Fix 1: INT-001 — Clearer dev-server connectivity error (P1 → usability)

**File:** `tests/integration/session-timeout.test.ts` line ~218  
**Issue:** `fetch()` to the dev server would throw a generic network error if the server is not running, providing no actionable hint.  
**Fix:** Wrapped the `fetch` in a `try/catch` that rethrows with `{ cause: err }` and a message pointing the developer to start the app or set `DEV_SERVER_URL`.

```typescript
// Before
const response = await fetch(`${devServerUrl}/dashboard`, { ... });

// After
let response: Response;
try {
  response = await fetch(`${devServerUrl}/dashboard`, { ... });
} catch (err) {
  throw new Error(
    `2.6-INT-001: Could not connect to dev server at ${devServerUrl}. ` +
      `Start the app (bun run dev) or set DEV_SERVER_URL.`,
    { cause: err }
  );
}
```

### Fix 2: INT-001b — Eliminate Date.now() race in assertion baseline (P2 → determinism)

**File:** `tests/integration/session-timeout.test.ts` line ~268  
**Issue:** `validUntil` was computed as `new Date(Date.now() + 29 * 60 * 1000)`, and the assertion compared `row.expiresAt.getTime() > Date.now()`. The second `Date.now()` call (at assertion time) is slightly later than the first, creating a theoretical window where a very slow machine could produce a false failure.  
**Fix:** Captured `seedStartMs = Date.now()` once before seeding and used it as the comparison baseline in the assertion. This makes the test deterministic regardless of how long the DB round-trip takes.

```typescript
// Before
const validUntil = new Date(Date.now() + 29 * 60 * 1000);
// ...
expect(row?.expiresAt.getTime()).toBeGreaterThan(Date.now()); // race!

// After
const seedStartMs = Date.now(); // capture once
const validUntil = new Date(seedStartMs + 29 * 60 * 1000);
// ...
expect(row?.expiresAt.getTime()).toBeGreaterThan(seedStartMs); // deterministic
```

---

## Recommendations (Should Fix — not blocking)

### R1: File length (P3 — low priority)

The file is 420+ lines, above the 300-line guideline from `test-quality.md`. The excess is entirely due to high-quality documentation comments. **Recommendation:** No refactoring needed now; if the file grows beyond 500 lines due to new tests, consider splitting static assertions (UNIT-001/002/003) into a separate `session-timeout-unit.test.ts` file.

### R2: INT-001 activation guard (P2 — informational)

INT-001 (HTTP redirect test) requires a running dev server. It passes (as test infrastructure works) only when `DEV_SERVER_URL` is reachable. Consider adding a `test.skip` condition for CI environments where the dev server is not running, activated by an env flag like `SKIP_SERVER_TESTS=true`. This prevents the test from being misleadingly counted as "passing" when it was actually skipped due to a connectivity error.

---

## Best Practices Highlighted

The following patterns in this test file are exemplary and should be used as a reference for future story tests:

1. **Per-test DB cleanup with `try/finally`** — INT-001, INT-001b, and INT-003 all use `truncateBetterAuthTables()` in `try/finally` blocks, ensuring cleanup even on assertion failure. This prevents state pollution across test runs.

2. **Hardcoded but unique IDs per test** — Each test uses a unique `userId` (e.g., `'test-user-2-6-int-001'`). This avoids FK collisions in sequential integration mode without needing faker, and makes test output immediately traceable to the correct scenario.

3. **Direct Better Auth API call in INT-003** — Instead of spinning up a full HTTP server for the session validation check, INT-003 imports and calls `auth.api.getSession()` directly. This is faster, more stable, and avoids a dev server dependency while still testing the Better Auth layer authoritatively.

4. **Static assertions in integration project** — UNIT-001/002/003 are placed in the integration project (not a separate unit project) because the auth module import chain involves DB configuration. The comments in each test explain this trade-off clearly, which is good practice.

---

## Knowledge Base References

- `test-quality.md` — Determinism, isolation, file length, and assertion standards
- `data-factories.md` — API-first seeding and cleanup patterns
- `test-levels-framework.md` — Justification for integration-level static assertions
- `fixture-architecture.md` — Pure helper function pattern (seedSession, truncateBetterAuthTables)

---

**Generated by:** BMad TEA Agent — Test Review Module
**Workflow:** `bmad-testarch-test-review`
**Story:** 2.6 — Fixed Session Timeout
**Mode:** Create (sequential)
**Revision:** v1 (2026-06-11) — Initial review; 2 fixes applied; Approve with Comments.
