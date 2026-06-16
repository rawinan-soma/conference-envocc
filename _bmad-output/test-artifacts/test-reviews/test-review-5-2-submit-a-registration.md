---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-15'
story: '5.2-submit-a-registration'
inputDocuments:
  - tests/integration/registrations.test.ts
  - tests/e2e/registrations.spec.ts
  - tests/integration/db-schema.test.ts
  - _bmad-output/test-artifacts/test-design/test-design-epic-5.md
  - _bmad-output/implementation-artifacts/5-2-submit-a-registration.md
---

# Test Quality Review — Story 5.2: Submit a Registration

## Overall Quality Score: 88/100 (Grade: B+)

**Execution Mode:** Sequential
**Analysis Mode:** Static (no live test run — integration tests require Testcontainers/Postgres)
**Reviewed:** 2026-06-15
**Reviewer:** Master Test Architect (TEA)
**Scope:**
- `tests/integration/registrations.test.ts` — Story 5.2 section (lines 503–1107): `5.2-INT-001` [P0 active], `5.2-INT-CLOSED-001` [P0 active, R-005 MITIGATE gate], `5.2-INT-002` [P1 skip], `5.2-INT-003` [P1 skip], `5.2-INT-004` [P1 skip], `5.2-INT-005` [P1 skip]
- `tests/e2e/registrations.spec.ts` — Story 5.2 section (lines 215–581): `5.2-E2E-001` [P1 skip], `5.2-E2E-MOBILE-001` [P1 skip], `5.2-E2E-MOBILE-002` [P1 skip], `5.2-E2E-CATERING-001` [P2 skip], `5.2-E2E-003` [P2 skip], `5.2-E2E-004` [P2 skip], `5.2-E2E-005` [P3 skip], `5.2-LOAD-001` [P3 skip]
- `tests/integration/db-schema.test.ts` — `5.2-SCHEMA-001` [P0 active] (lines 570–594)

---

## Dimension Scores

| Dimension       | Score | Grade | Weight | Weighted |
|-----------------|-------|-------|--------|----------|
| Determinism     | 92    | A-    | 30%    | 27.6     |
| Isolation       | 87    | B+    | 30%    | 26.1     |
| Maintainability | 83    | B     | 25%    | 20.75    |
| Performance     | 90    | A-    | 15%    | 13.5     |
| **Overall**     | **88**| **B+**|        |          |

---

## Executive Summary

**Overall Assessment:** Pass — No Changes Required

**Recommendation:** Approve — all P0 active tests are structurally sound, the R-005 MITIGATE security gate is correctly implemented, and all apparent non-determinism patterns are justified. E2E scaffolds are correctly deferred.

### Key Strengths

- `5.2-INT-CLOSED-001` (R-005 MITIGATE gate) correctly tests the service-layer closed guard with both a `rejects.toThrow(RegistrationClosedError)` assertion AND a count=0 DB verification — no silent-pass path exists
- `cancelToken` security separation is correct: `cancel_token_hash` stored in DB, plain token returned from service for Story 5.3 email use only; test asserts `hash != plain` explicitly
- The `setTimeout(500)` inside `page.route` in `5.2-E2E-004` is a **justified** delay that creates a reliable observation window for the in-flight loading state — correctly identified as deterministic design, not a flakiness risk
- `randomUUID()` from `node:crypto` and `uuidv7()` throughout — no `Math.random()`, no `Date.now()` in seed data
- All P0 tests use dynamic imports inside the test body, preventing collection-level failures while the implementation is incomplete (correct red-phase TDD pattern)
- `ON CONFLICT (id) DO NOTHING` guards in all integration test seed SQL prevent constraint errors on repeated local runs
- No Thai text hardcoded; no credential literals — project conventions respected throughout

### Key Weaknesses

- **LOW: File length (1107 lines)** — `registrations.test.ts` now contains both Story 5.1 (503 lines) and Story 5.2 (604 lines) sections. This exceeds the 300-line threshold but follows the established project convention of co-locating all registration tests in a single file. No fix applied.
- **LOW: Inline `seedRegistrant` helper** — the Story 5.2 `seedRegistrant` function is defined inline (lines 551–578) rather than imported from `tests/support/fixtures/pg-factory.ts`. Consistent with `seedUser`, `seedRoom`, and `seedBookingWithToken` which are also inline per Story 5.1 convention. No fix applied.
- **LOW: Dual sub-cases in `5.2-INT-003`** — the P1 scaffold test for meal-type conditional contains two logical sub-cases (catering ON and catering OFF) in a single `test.skip` block. When activated, a failure in sub-case A will mask sub-case B. This is acceptable at the ATDD scaffold stage; splitting is recommended at activation time.

### Summary

The Story 5.2 test scaffolds are high-quality. The two P0 active integration tests cover the critical path (AC-3 valid registration) and the R-005 MITIGATE gate (AC-6 closed guard) with thorough multi-assertion verification. The `setTimeout` pattern in `5.2-E2E-004` was initially flagged as a potential determinism risk but on closer analysis is a deliberate, correct pattern: the route handler delays the server response to create the observation window in which the loading state (`button[disabled]`) can be asserted deterministically. This is the textbook Playwright approach for testing in-flight UI states. All other findings are LOW-severity and consistent with established project conventions — no code changes are warranted.

---

## Quality Criteria Assessment

| Criterion                            | Status       | Violations | Notes |
| ------------------------------------ | ------------ | ---------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS       | 0          | Strategy comments describe preconditions, action, and assertion clearly in all active tests |
| Test IDs                             | ✅ PASS       | 0          | All 8 E2E scenarios and 6 integration scenarios have IDs matching test-design-epic-5.md |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS       | 0          | `[P0]`, `[P1]`, `[P2]`, `[P3]` in all test names; activation conditions documented |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS       | 0          | No `sleep` or `waitForTimeout` in any test; route-handler delay in E2E-004 is justified (see Findings) |
| Determinism (no conditionals)        | ✅ PASS       | 0          | `setTimeout` in page.route is a response-delay pattern, not a hard wait — justified for loading-state testing |
| Isolation (cleanup, no shared state) | ⚠️ LOW       | 1          | No explicit DELETE after seeding; mitigated by unique UUID-prefixed IDs + ON CONFLICT DO NOTHING — consistent with project convention |
| Fixture Patterns                     | ✅ PASS       | 0          | Per-scenario unique slugs: `5-2-int-001-{uuid}`, `5-2-int-closed-001-{uuid}` — parallel-safe |
| Data Factories                       | ⚠️ LOW       | 1          | `seedRegistrant` inline in test file; consistent with `seedUser`/`seedRoom` project convention |
| Network-First Pattern                | ✅ PASS       | 0          | `page.route()` registered before `submitBtn.click()` in E2E-004 — correct network-first ordering |
| Explicit Assertions                  | ✅ PASS       | 0          | All P0 tests assert: return values, DB row all columns, audit_log row; no zero-assertion paths |
| Test Length (≤300 lines)             | ⚠️ LOW       | 1          | `registrations.test.ts` is 1107 lines total (both stories); Story 5.2 section is 604 lines — exceeds threshold |
| Test Duration (≤1.5 min)            | ✅ PASS       | 0          | Direct `pg.Pool` client seeding; single service call per P0 test; fast per-test overhead |
| Flakiness Patterns                   | ✅ PASS       | 0          | No `Math.random()`, no wall-clock seeds; `page.route` delay is deterministic |

**Total Violations:** 0 Critical, 0 High, 3 Low (all documented, none fixed)

---

## Quality Score Breakdown

Weighted dimension model:

```
Dimension         Raw Score  Weight  Weighted
-----------       ---------  ------  --------
Determinism           92      30%      27.6
  (+) randomUUID() / uuidv7() throughout — no Math.random()
  (+) Dynamic imports inside test bodies prevent collection-level failures in red phase
  (+) page.route() delay in E2E-004 is a deliberate observation-window pattern — deterministic
  (+) Date literals in seed SQL (2026-09-01 etc.) are far-future — no CI clock drift risk
  (-5) cancelToken plaintext assertion (length=64) is a string-length check — minor; correct
  (-3) L1: Date.now() in E2E-005 — acceptable for P3 end-to-end timing NFR test

Isolation             87      30%      26.1
  (+) Unique UUID-prefixed slugs per test run prevent cross-test token collisions
  (+) ON CONFLICT DO NOTHING guards against constraint errors on repeated runs
  (+) Two separate pool clients (seed + verify) prevent connection state leakage
  (-10) No explicit DELETE after seeding (acceptable per project convention with Testcontainers;
        consistent with Story 5.1 and bookings.test.ts)
  (-3) seedRegistrant inline rather than shared fixture

Maintainability       83      25%      20.75
  (+) Scenario IDs present in all test names; AC and R-NNN references accurate in comments
  (+) Red-phase TDD pattern clearly documented with activation conditions per test
  (+) cancelToken security comment ("for Story 5.3 email only") correctly explains design intent
  (+) R-005 MITIGATE label in 5.2-INT-CLOSED-001 title — traces to risk register
  (-7) File is 1107 lines — combined stories 5.1+5.2 exceed 300-line threshold significantly
  (-5) 5.2-INT-003 dual sub-cases (A+B) in one test.skip block — harder to isolate on activation
  (-5) Inline seed helpers duplicate future pg-factory.ts patterns

Performance           90      15%      13.5
  (+) Direct pg.Pool client for seeding — no HTTP round-trips
  (+) Single function call per P0 test — minimal overhead
  (+) Pool created once in beforeAll (Story 5.1 block), reused for 5.2 tests
  (-5) 5.2-INT-005 (P1 skip) seeds 99 rows in a sequential loop — slow when activated
  (-5) Client acquire/release per test (acceptable; consistent with 5.1 pattern)
                                     --------
Overall Score:                         88.0/100
Grade:                                 B+
```

---

## Findings (All Documented — No Code Changes Applied)

### F-1. `setTimeout(500)` in `page.route` Handler — Justified Pattern

**Severity:** LOW (documented as acceptable)
**Status:** No change — deliberate design
**Criterion:** Determinism / Hard Waits
**Location:** `tests/e2e/registrations.spec.ts` lines 493–497

**Assessment:**
The `setTimeout(500)` appears inside a `page.route('**/r/*', ...)` handler, not as a bare `waitForTimeout()` call. Its role is to delay the server response by 500ms, creating a reliable observation window in which the submit button transitions to `disabled` state and the "Registering..." label appears. Without this delay, the server responds before the next assertion runs and the in-flight UI state is never observable.

This is the correct Playwright pattern for testing loading states triggered by form submissions — the delay is applied to the network response (making it deterministic), not to a UI poll. The assertion `await expect(submitBtn).toBeDisabled()` runs synchronously after `submitBtn.click()` before the delayed response completes.

The pattern is intentional and documented in the test comment: *"Delay response by 500ms to allow observing the loading state."* No change is applied.

**Note for Activation:** When `5.2-E2E-004` is activated, verify that 500ms is sufficient on CI (typical CI request latency may vary). If CI responses are fast, increase to 1000ms. The delay value should be documented with a `// CI-safe delay` comment.

---

### F-2. `5.2-INT-003` Dual Sub-Cases in Single `test.skip` Block — Noted for Activation

**Severity:** LOW (scaffold convention)
**Status:** No change — acceptable at ATDD scaffold stage
**Criterion:** Maintainability
**Location:** `tests/integration/registrations.test.ts` lines 860–968

**Assessment:**
`5.2-INT-003` tests two logical scenarios in one `test.skip` block: (A) `mealType='Normal'` stored when `cateringEnabled=true`, and (B) `mealType=null` when `cateringEnabled=false`. If Case A fails after activation, Case B never runs and the failure message is ambiguous.

At the ATDD scaffold stage this is acceptable — the spec stipulates the scenario as a unit. Splitting is recommended at activation time for clearer failure isolation.

**Recommended split at activation:**
```
5.2-INT-003-A — mealType='Normal' stored when cateringEnabled=true [P1]
5.2-INT-003-B — meal_type=null stored when cateringEnabled=false [P1]
```

---

### F-3. File Length (1107 Lines) — Acceptable Per Project Convention

**Severity:** LOW (threshold exceeded; convention-consistent)
**Status:** No change — consistent with `bookings.test.ts` pattern
**Criterion:** Maintainability / Test Length
**Location:** `tests/integration/registrations.test.ts` (entire file)

**Assessment:**
The file grew from 501 lines (Story 5.1) to 1107 lines (Stories 5.1 + 5.2 combined). The 300-line threshold from the test quality framework is exceeded, but the growth is intentional: all registration-domain integration tests co-locate in a single file per project convention (mirroring `tests/integration/bookings.test.ts`). The file structure is well-organized with clearly demarcated story sections and separator comments.

This should be revisited when Story 5.3 extends the file further. At that point, extracting per-story test files or moving seed helpers to `tests/support/fixtures/pg-factory.ts` would reduce per-file size.

---

## Best Practices Found

### 1. R-005 MITIGATE Gate: Dual Assertion Structure in `5.2-INT-CLOSED-001`

**Location:** `tests/integration/registrations.test.ts` lines 764–783
**Pattern:** Exception thrown + DB count=0 verification

The closed guard test uses two independent assertion paths:
1. `rejects.toThrow(RegistrationClosedError)` — verifies the correct exception type is thrown
2. `SELECT COUNT(*) ... WHERE booking_id = $1` expect count=0 — verifies no DB write occurred even if the exception was swallowed

This dual-assertion structure means the test catches both "exception not thrown" bugs AND "exception thrown but row still written" bugs (a transaction rollback failure). It is the correct pattern for MITIGATE-rated risk gates.

### 2. `cancelToken` Security Separation — Explicit Hash vs. Plain Assertion

**Location:** `tests/integration/registrations.test.ts` lines 687–693

```typescript
expect(regRow?.['cancel_token_hash'], '...').toBeTruthy();
expect(regRow?.['cancel_token_hash']).not.toBe(result.cancelToken); // hash != plain
```

The test explicitly asserts that the stored `cancel_token_hash` is NOT equal to the returned plaintext `cancelToken`. This is a security property test — it catches any implementation that accidentally stores the raw token instead of the hash. Well-constructed.

### 3. Dynamic Import for Red-Phase TDD

**Location:** `tests/integration/registrations.test.ts` lines 601–602, 728–729

All P0 active tests use `await import('../../src/lib/server/services/registration-service.js')` inside the test body rather than at module level. This prevents Vitest collection-level failures during the red phase when the module may not yet exist. Correct pattern carried forward from Story 5.1.

### 4. Network-First Ordering in `5.2-E2E-004`

**Location:** `tests/e2e/registrations.spec.ts` lines 493–504

`page.route()` is registered before `submitBtn.click()`, ensuring the intercept is in place before the navigation triggers the request. This is the correct network-first pattern from the TEA knowledge base (`network-first.md`) — the route handler cannot miss a request that fires before it is registered.

### 5. Per-Scenario UUID-Suffixed Slugs Prevent Cross-Test Collision

**Location:** `tests/integration/registrations.test.ts` lines 604, 731

```typescript
const regSlug = `5-2-int-001-${randomUUID().replace(/-/g, '')}`;
const regSlug = `5-2-int-closed-001-${randomUUID().replace(/-/g, '')}`;
```

Per-test unique slugs ensure the two P0 tests never conflict on `booking.registration_token`, even if Testcontainers is not used and rows persist between runs. The `ON CONFLICT (id) DO NOTHING` guards compound this safety.

---

## Activation Notes (E2E Tests — For Future Activation Phase)

### 5.2-E2E-001: Replace Placeholder Slug Before Activation

**Location:** `tests/e2e/registrations.spec.ts` lines 259, 266
**Constants:** `REG_OPEN_BOOKING_SLUG = 'placeholder-5-2-open-slug-replace-me'` and `REG_CATERING_BOOKING_SLUG = 'placeholder-5-2-catering-slug-replace-me'`
**Action:** Replace with real booking slugs seeded via Playwright global setup or a dev-bypass seed endpoint.

### 5.2-E2E-004: Verify Route Delay on CI

**Location:** `tests/e2e/registrations.spec.ts` lines 493–497
**Action at activation:** Confirm 500ms is sufficient on CI runners. If average CI Postgres response is under 100ms, the delay may need to increase to 1000ms. Add `// CI-safe delay — keeps button in disabled state long enough to assert` comment.

### 5.2-E2E-MOBILE-001 / 5.2-E2E-MOBILE-002: No Changes Needed

**Location:** `tests/e2e/registrations.spec.ts` lines 322–395
**Assessment:** `scrollWidth <= window.innerWidth` via `page.evaluate` is the correct mobile responsiveness pattern. Both viewport sizes (375×667 and 1280×800) match NFR-004 requirements. Ready for activation once slug constants are wired.

### 5.2-INT-003: Split Sub-Cases at Activation

**Location:** `tests/integration/registrations.test.ts` lines 860–968
**Action at activation:** Split into `5.2-INT-003-A` and `5.2-INT-003-B` for independent failure isolation.

---

## Changes Applied

No code changes were applied. All findings are documented-and-acceptable per engineering judgement:

| Finding | File | Decision |
|---------|------|----------|
| `setTimeout(500)` in page.route (E2E-004) | `tests/e2e/registrations.spec.ts:493` | **Justified** — deliberate response-delay for loading-state observability |
| Dual sub-cases in 5.2-INT-003 | `tests/integration/registrations.test.ts:860` | **Acceptable** — ATDD scaffold; split recommended at activation |
| File length 1107 lines | `tests/integration/registrations.test.ts` | **Acceptable** — co-location convention; review at Story 5.3 |
| Inline seedRegistrant helper | `tests/integration/registrations.test.ts:551` | **Acceptable** — consistent with inline seed convention in 5.1 |

---

## Context and Integration

### Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/5-2-submit-a-registration.md`
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`
  - Risk Register: 13 risks; R-005 MITIGATE (score=6, closed guard) covered by `5.2-INT-CLOSED-001`
  - R-001 BLOCK (score=9, IDOR) already gated by `5.1-INT-IDOR-001` (Story 5.1)
- **Schema Test:** `tests/integration/db-schema.test.ts:570` — `5.2-SCHEMA-001` asserts all 14 `registrations` table columns

---

## Knowledge Base References

- **test-quality.md** — Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **network-first.md** — Route intercept before navigate (race condition prevention)
- **data-factories.md** — Factory functions with overrides, API-first setup
- **test-levels-framework.md** — Integration vs. E2E appropriateness
- **test-priorities-matrix.md** — P0/P1/P2/P3 classification framework
- **ci-burn-in.md** — Flakiness detection patterns; `page.route` response delay distinguished from hard waits

---

## Decision

**Recommendation:** Approve

**Rationale:**
The Story 5.2 tests score 88/100 (B+). Both P0 active integration tests (`5.2-INT-001` and `5.2-INT-CLOSED-001`) are structurally correct with no silent-pass paths. The R-005 MITIGATE gate uses a dual-assertion structure (exception thrown + DB count=0) that catches all failure modes of the closed guard. The one pattern that appeared to be a determinism risk (`setTimeout(500)` in `page.route`) was confirmed on analysis to be a justified, correct Playwright loading-state testing pattern — not a flakiness risk.

> Test quality is good at 88/100. All P0 tests are production-ready. Low-severity findings are documented and deferred to activation time. No changes required before merge.

---

## Review Metadata

**Generated By:** BMad TEA Agent (Master Test Architect)
**Workflow:** testarch-test-review v4.0
**Review ID:** test-review-5-2-submit-a-registration-20260615
**Timestamp:** 2026-06-15
**Version:** 1.0
