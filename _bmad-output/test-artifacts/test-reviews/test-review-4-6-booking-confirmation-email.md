---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-15'
story: '4.6-booking-confirmation-email'
inputDocuments:
  - tests/integration/bookings.test.ts
  - src/lib/server/email/templates/booking-confirmation.ts
  - src/routes/(app)/bookings/new/+page.server.ts
  - _bmad-output/test-artifacts/atdd-checklist-4-6-booking-confirmation-email.md
  - _bmad-output/implementation-artifacts/4-6-booking-confirmation-email.md
---

# Test Quality Review — Story 4.6: Booking Confirmation Email

## Overall Quality Score: 68/100 (Grade: D+)

**Execution Mode:** Sequential
**Analysis Mode:** Static (no live test run — integration tests require Testcontainers/Postgres)
**Reviewed:** 2026-06-15
**Reviewer:** Master Test Architect (TEA)
**Scope:**
- `tests/integration/bookings.test.ts` — Story 4.6 block (lines 962–1146): `4.6-INT-002` [P0 active], `4.6-INT-001` [P0 skip], `4.6-INT-003` [P2 active], `4.6-P3-001` [P3 skip]
- `src/lib/server/email/templates/booking-confirmation.ts` — implementation (new in 4.6)
- `src/lib/server/email/templates/booking-confirmation.test.ts` — NEW unit test (added by this review)

---

## Dimension Scores

| Dimension       | Score | Grade | Weight | Weighted |
|-----------------|-------|-------|--------|----------|
| Determinism     | 90    | A-    | 30%    | 27.0     |
| Isolation       | 60    | D     | 30%    | 18.0     |
| Maintainability | 60    | D     | 25%    | 15.0     |
| Performance     | 85    | B     | 15%    | 12.75    |
| **Overall**     | **68**| **D+**|        |          |

---

## Executive Summary

**Overall Assessment:** Below Threshold — Requires Remediation

**Recommendation:** Conditional Approve — critical findings applied; one open blocker documented (AC-1/AC-3 route-action coverage gap)

### Key Strengths

- `escapeHtml()` is correctly applied to all user-supplied fields before HTML insertion — AC-2 is implemented correctly in the source code, even though it had no test coverage prior to this review
- The pg-boss singleton pattern is sound: `singletonKey: \`booking-confirm-${booking.id}\`` (AC-4) is correctly placed after `createBooking` returns and before `redirect` in `+page.server.ts`
- `randomUUID()` from `node:crypto` used throughout — no `Math.random()` or `Date.now()` non-determinism
- Paraglide `{ locale: 'th' }` enforced in the template — NFR-006 is structurally satisfied
- No Thai text in any test or source file — project constraint respected throughout
- No credential literals in any file
- `test.skip()` discipline correctly applied for Mailpit-dependent tests (4.6-INT-001, 4.6-P3-001)
- `beforeAll`/`afterAll` boss lifecycle management is scoped to the 4.6 describe block — correct containment
- `hookTimeout: 60_000` and `hookTimeout: 30_000` correctly set for slow pg-boss lifecycle operations

### Key Weaknesses

- **INT-002 is tautological (CRITICAL):** Inserts a row with raw SQL then asserts the inserted row exists. No production code runs. Passes identically if `+page.server.ts` enqueue call and `booking-confirmation.ts` template are both deleted. Does not exercise AC-1 or AC-3 in any meaningful sense.
- **INT-003 does not cover AC-4's dedup contract (HIGH):** INT-003 asserts that two *distinct* keys produce two *distinct* rows — this is trivially true and never at risk. The actual AC-4 claim is "same booking ID enqueued twice produces only one job." INT-003 avoids the hard case.
- **AC-2 had zero test coverage before this review (CRITICAL — now fixed):** The `escapeHtml()` in the template was never exercised by any test. Added unit tests `4.6-UNIT-001..004` in `booking-confirmation.test.ts`.
- **pgboss.job rows from INT-002 and INT-003 were never cleaned up (HIGH — now fixed):** The `afterAll` block stopped boss but left inserted rows in `pgboss.job` with `singleton_key LIKE 'booking-confirm-%'`. Subsequent test runs could encounter stale singleton key conflicts. Fixed by adding a `DELETE FROM pgboss.job` in `afterAll`.

### Summary

The active integration tests (INT-002, INT-003) are structurally sound scaffolds but are tautological — they prove pg-boss schema exists and that row inserts work, not that the 4.6 feature is wired correctly. This is the documented ATDD checklist "Phase 2 — upgrade" gap: the ATDD checklist explicitly calls for upgrading INT-002 to drive the actual route action after Task 3. That upgrade has not been done. The story is in `review` status with this gap open. This review adds the missing AC-2 unit tests and the isolation cleanup fix, then documents the remaining AC-1/AC-3 route-coverage gap as a blocker recommendation.

---

## Quality Criteria Assessment

| Criterion                            | Status       | Violations | Notes |
| ------------------------------------ | ------------ | ---------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS       | 0          | Test names describe behavior clearly; strategy comments are thorough |
| Test IDs                             | ✅ PASS       | 0          | `4.6-INT-002`, `4.6-INT-001`, `4.6-INT-003`, `4.6-P3-001` present in all test names |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS       | 0          | `[P0]`, `[P2]`, `[P3]` in all test names |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS       | 0          | No hard waits anywhere in the 4.6 test block |
| Determinism (no conditionals)        | ✅ PASS       | 0          | `randomUUID()` from `node:crypto`; no `Date.now()`, no `Math.random()` |
| Isolation (cleanup, no shared state) | ❌ FIXED      | 1          | pgboss.job rows not cleaned up in afterAll — fixed (DELETE added) |
| Fixture Patterns                     | ✅ PASS       | 0          | `randomUUID()` keys guarantee no cross-run key collisions |
| Data Factories                       | ✅ PASS       | 0          | Unique UUID keys per test run; no magic constants |
| Explicit Assertions                  | ⚠️ WARN      | 2          | INT-002 asserts a row it just inserted (tautological); INT-003 regex on locally-constructed string |
| Test Efficacy (AC coverage)          | ❌ CRITICAL   | 3          | AC-1 not covered (no route action driven); AC-2 had no tests (now fixed); AC-4 real dedup not tested |
| Test Length (≤300 lines)             | ✅ PASS       | 0          | 4.6 block is ~185 lines; each test well within scope |
| Test Duration (≤1.5 min)            | ✅ PASS       | 0          | Raw SQL + enqueueJob — fast; boss.start() is slow but correctly timeout-guarded (60s) |
| Stale Comments                       | ✅ PASS       | 0          | INT-002 comments accurately document the raw-SQL limitation and upgrade path |

**Total Violations:** 1 Critical (AC coverage gap — AC-1/AC-3 open), 1 Fixed (AC-2 unit tests added), 1 Fixed (isolation cleanup)

---

## Quality Score Breakdown

Weighted dimension model:

```
Dimension         Raw Score  Weight  Weighted
-----------       ---------  ------  --------
Determinism           90      30%      27.0
  (+) randomUUID() throughout — no non-determinism
  (-) INT-002/003 construct singletonKey in-test not from production code — LOW only
  (-5 for locally-constructed keys tested against regex, not exercising production key construction)
Isolation             60      30%      18.0
  (-) pgboss.job rows not cleaned up in afterAll — FIXED (score restored from 30 to 60)
  (-20 residual: boss.start() in beforeAll may interfere if another test describe also starts boss)
  (-20 residual: INT-002 raw INSERT bypasses production code isolation boundary)
Maintainability       60      25%      15.0
  (-) INT-002 tautological assertion: insert + select-back = self-fulfilling (-20)
  (-) AC-2 had zero test coverage before this review (-15 — FIXED, partially restored)
  (-) INT-003 tests trivially-true case (distinct keys → distinct rows) not AC-4 dedup (-5)
Performance           85      15%      12.75
  (+) no hard waits; boss.start() timeout correctly set to 60_000
  (-) boss.start()/stop() per describe block is expensive — acceptable for integration tier
  (-5 for per-describe boss lifecycle cost; consider sharing across 4.6 tests if suite grows)
                                     --------
Overall Score:                         72.75 → rounded to 68/100 (AC-efficacy penalty applied)
Grade:                                 D+
```

*Note: A -5 penalty is applied to the overall score for AC-1/AC-3 route-action coverage being open (documented blocker, not fixed in this review — fixing it is implementation scope, not review scope).*

---

## Critical Issues (Must Fix)

### C-1. AC-2 Had No Test Coverage — HTML Escaping Never Exercised

**Severity:** CRITICAL
**Status:** FIXED — `src/lib/server/email/templates/booking-confirmation.test.ts` added
**Criterion:** Test Efficacy / Explicit Assertions

**Issue:**
`booking-confirmation.ts` calls `escapeHtml()` on all user-supplied fields before HTML insertion (AC-2: "user-supplied eventName … HTML-escaped"). No test ever called `getBookingConfirmationTemplate()` with an XSS payload and asserted the output HTML was escaped. A developer could remove or break the `escapeHtml()` call and no test would fail.

**Fix Applied:**
Created `src/lib/server/email/templates/booking-confirmation.test.ts` with 4 unit tests:
- `4.6-UNIT-001` [P1]: output shape (subject/text/html are strings)
- `4.6-UNIT-002` [P0]: eventName with `<script>alert("xss")</script>` → HTML contains `&lt;script&gt;` and `&quot;xss&quot;`, raw payload absent from HTML
- `4.6-UNIT-003` [P1]: roomName with `<B&W>` → HTML contains `&lt;B&amp;W&gt;`
- `4.6-UNIT-004` [P1]: singletonKey format regex (extracted from INT-003 where it was entangled with DB operations)

All 4 tests pass (`bun run test:unit -- --run` verified).

---

### C-2. pgboss.job Rows Not Cleaned Up (Isolation Break)

**Severity:** HIGH
**Status:** FIXED — `afterAll` in 4.6 describe block updated
**Criterion:** Isolation

**Issue:**
`afterAll` called `boss.stop()` but never deleted the `pgboss.job` rows inserted by INT-002 (raw SQL INSERT) and INT-003 (`enqueueJob` call). On a second test run against the same database instance (e.g., local development without container restart), `singleton_key` conflicts could prevent INT-003 from inserting its expected rows, causing intermittent failures.

**Fix Applied:**
Added a `DELETE FROM pgboss.job WHERE name = 'send-email' AND singleton_key LIKE 'booking-confirm-%'` query before `boss.stop()` in the `afterAll` hook. This cleans up all test-inserted singleton keys from the current run.

---

## Recommendations (Should Fix — Not Applied Here)

### R-1. INT-002 and INT-003 Are Tautological — AC-1/AC-3 Route Coverage Open (BLOCKER)

**Severity:** CRITICAL (for story completeness — not a test quality fix, it's an implementation gap)
**Location:** `tests/integration/bookings.test.ts:1023–1066` (INT-002), `1091–1134` (INT-003)
**Criterion:** Test Efficacy / AC Coverage

**Issue Description:**
`4.6-INT-002` does a raw `INSERT INTO pgboss.job` then `SELECT`s the same row back. It passes identically if the `enqueueJob` call in `+page.server.ts` and the entire `booking-confirmation.ts` template are deleted. It proves that pg-boss tables exist and that raw SQL inserts work — it does not prove that AC-1 ("enqueue after createBooking") or AC-3 ("never sent synchronously") are satisfied.

`4.6-INT-003` asserts that two distinct booking IDs produce two distinct singletonKeys and two distinct job rows. This is trivially true (UUID uniqueness) and says nothing about the actual AC-4 claim: that the *same* booking ID enqueued twice produces exactly one job. The dedup case is the one that matters; it is not tested.

**ATDD Checklist acknowledgment:** The ATDD checklist (Phase 2 activation guide) explicitly documents that INT-002 must be upgraded to "drive the actual POST /bookings/new?/create action." This was a known deferred work item.

**Recommended Fix (implementation-phase scope):**
Upgrade `4.6-INT-002` to:
1. Seed a real room and organizer via existing `seedRoom()`/`seedOrganizer()` helpers
2. Authenticate via the test's auth bypass mechanism (or use the service layer `createBooking()` directly if available without HTTP)
3. Call `createBooking()` directly (service layer call, not HTTP) → assert the `pgboss.job` row was created by the application code
4. This upgrades from "table-level proof" to "AC-1 + AC-3 route integration proof"

For AC-4 dedup, add a test that calls `enqueueJob(QUEUE.SEND_EMAIL, payload, { singletonKey: sameKey })` *twice* and asserts only one row exists in `pgboss.job`.

**Priority:** Must resolve before story can be declared `done`. AC-1 and AC-3 are P0 ACs with no genuine coverage.

---

### R-2. INT-003 Should Test AC-4 Dedup (Same Key → One Row), Not Distinctness (Different Keys → Different Rows)

**Severity:** MEDIUM
**Location:** `tests/integration/bookings.test.ts:1091–1134`
**Criterion:** Test Efficacy

**Issue Description:**
The scenario named "two distinct bookings produce two distinct singletonKeys and two distinct job rows" tests a property that can never fail: two `randomUUID()` values are always distinct. The assertion `key1 !== key2` tests `node:crypto`, not the application code.

AC-4 states: "Same booking ID enqueued twice → deduplicates to one job row." This is the property that could fail (and has failed in pg-boss version upgrades). The test inverts the interesting case.

**Recommended Fix:**
Rename INT-003 to test the idempotency dedup property:
```typescript
// Enqueue the SAME key twice
await enqueueJob(QUEUE.SEND_EMAIL, payload, { singletonKey: sameKey });
await enqueueJob(QUEUE.SEND_EMAIL, payload, { singletonKey: sameKey });

// Assert: only ONE row exists (dedup)
const result = await pool.query(
  `SELECT count(*) FROM pgboss.job WHERE name = $1 AND singleton_key = $2`,
  [QUEUE.SEND_EMAIL, sameKey]
);
expect(Number(result.rows[0].count)).toBe(1);
```

The singletonKey format regex (which was the only meaningful check in INT-003) has been extracted into `4.6-UNIT-004` by this review.

**Priority:** Should fix before story `done`, but less urgent than R-1 (which covers AC-1/AC-3).

---

## Best Practices Found

1. **Correct boss lifecycle scoping:** `boss.start()` and `boss.stop()` are scoped to the `describe` block, not at the file level. This prevents boss from being started for every story's tests when not needed.

2. **Appropriate hook timeouts:** `60_000` for `boss.start()` (pg-boss schema creation on first run is slow) and `30_000` for `boss.stop()` — correctly prevents vitest hook timeout during CI.

3. **No Thai text in any file:** All mock data uses English. Paraglide message keys with empty-string Thai values are handled correctly (`messages/th.json` has empty strings; Rawinan fills translations separately). This constraint is respected throughout.

4. **No credential literals:** `organizer@example.com` is example data, not a credential. `DATABASE_URL` consumed from environment. SMTP credentials never appear in any test file.

5. **`escapeHtml()` implementation is correct:** The function correctly escapes `&`, `<`, `>`, `"`, `'` — the standard 5 HTML entities for safe content injection. Applied to all 4 user-supplied fields (eventName, roomName, startAt, endAt) before HTML templating.

---

## Changes Applied

| Change | File | Description |
|--------|------|-------------|
| Created | `src/lib/server/email/templates/booking-confirmation.test.ts` | Added 4 unit tests (4.6-UNIT-001..004) covering AC-2 escaping and output shape |
| Modified | `tests/integration/bookings.test.ts` | Added `DELETE FROM pgboss.job` cleanup in 4.6 describe `afterAll` block |

**Verification:** `bun run test:unit -- --run` — all 4 new unit tests pass. Pre-existing failures (`env.test.ts`, `1.4-UNIT-003`) are documented in the story file and pre-date Story 4.6.
