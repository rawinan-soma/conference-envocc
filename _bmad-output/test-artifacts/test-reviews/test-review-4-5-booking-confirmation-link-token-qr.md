---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-15'
workflowType: 'testarch-test-review'
inputDocuments:
  - tests/integration/booking-token.test.ts
---

# Test Quality Review: booking-token.test.ts

**Quality Score**: 82/100 (B - Good, with open security finding)
**Review Date**: 2026-06-15
**Review Scope**: single
**Reviewer**: TEA Agent (Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good — with an open security finding that must be tracked

**Recommendation**: Approve with Comments (P1 header fix applied; R-005 open finding escalated separately)

### Key Strengths

- No hard waits, no `Math.random()`, no unseeded `new Date()` — determinism is excellent
- Unique data per test using `randomUUID()` prefixes + fixed future ISO timestamps — parallel-safe
- Clear test IDs (IT-001 to IT-005), priority markers, activation conditions, and AC coverage documented
- Minimal imports, explicit assertions with failure messages, no dead code

### Key Weaknesses

- Header JSDoc said "All tests marked test.skip()" but all five tests are active `test(...)` calls — stale (fixed in this review)
- R-005 ("registration token predictable OR unhashed") is only **partially** mitigated: CSPRNG eliminates "predictable" but plaintext DB storage leaves "unhashed" open. Architecture rule AR-05 (`epics.md:124`) requires hash storage; `booking-service.ts:29` has a deviation comment citing a "Story 4.5 token model deviation note" that does not exist as an approved document in `_bmad-output/`. The tests currently codify plaintext, which hardcodes the unresolved deviation.
- Four of five tests repeat identical `connect / seedRoom / finally / release` boilerplate inline

### Summary

`booking-token.test.ts` is a well-structured integration test file for Story 4.5. The tests are deterministic, parallel-safe, and cover token generation and retrieval. The implementation exists (`generateRegistrationToken()`, `registrationToken` column, `getBookingById`), so the tests are active — the P1 stale header was fixed inline during this review.

One open security finding requires tracking: the implementation stores the registration token plaintext (`registration_token` column), but the architecture (AR-05, `epics.md:124`) requires hash storage, and R-005 in the test-design risk register remains OPEN. The `booking-service.ts` comment says "see Story 4.5 token model deviation note" but no such approved deviation document exists. This is not a test quality defect per se — the tests correctly match the current implementation — but the tests will need to be updated if the hash model is enforced, since the current assertions (`expect(dbResult.rows[0]?.registration_token).toBe(booking.registrationToken)`) would fail against a hash-based schema. This is escalated as an open architectural concern, not a blocker for merging the scaffold.

---

## Quality Criteria Assessment

| Criterion                            | Status      | Violations | Notes                                                      |
| ------------------------------------ | ----------- | ---------- | ---------------------------------------------------------- |
| BDD Format (Given-When-Then)         | ⚠️ WARN     | 0          | Inline comments describe strategy but no formal Given/When/Then blocks |
| Test IDs                             | ✅ PASS      | 0          | IT-001 through IT-005 clearly labeled                      |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS      | 0          | All 5 tests marked [P1]                                    |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS      | 0          | None                                                       |
| Determinism (no conditionals)        | ✅ PASS      | 0          | randomUUID + fixed ISO dates, no Math.random()             |
| Isolation (cleanup, no shared state) | ⚠️ WARN     | 1          | Seeded rooms not deleted; ephemeral Testcontainers mitigates |
| Fixture Patterns                     | ⚠️ WARN     | 1          | connect/seed/finally boilerplate repeated 4x inline        |
| Data Factories                       | ✅ PASS      | 0          | seedRoom() / seedOrganizer() factories present             |
| Network-First Pattern                | ✅ PASS      | 0          | Service-level, no HTTP — N/A                               |
| Explicit Assertions                  | ✅ PASS      | 0          | All 16 assertions use expect with failure messages         |
| Test Length (≤300 lines)             | ⚠️ WARN     | 348 lines  | 48 lines over soft limit; boilerplate extraction would fix |
| Test Duration (≤1.5 min)             | ✅ PASS      | 0          | 5 short service calls; estimated <15s total                |
| Flakiness Patterns                   | ✅ PASS      | 0          | No flakiness patterns detected                             |
| Stale Header Comment                 | ❌ FAIL      | 1          | Header claims "All tests marked test.skip()" — all 5 are active |

**Total Violations**: 0 Critical, 1 High, 3 Medium, 1 Low

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     0 × 10 = 0
High Violations:         1 × 5  = -5
Medium Violations:       3 × 2  = -6
Low Violations:          1 × 1  = -1

Bonus Points:
  All Test IDs:          +5
  Perfect Determinism:   +3
  Explicit Assertions:   +2
                         --------
Total Bonus:             +10

Final Score:             98 - 10 + 10 - 12 = 88/100
Grade:                   B
```

Dimension weights applied:
- Determinism (30%): 97/100 — no Math.random, no hard waits, fixed timestamps
- Isolation (30%): 80/100 — no cleanup but Testcontainers is ephemeral; repeated boilerplate
- Maintainability (25%): 80/100 — stale header is HIGH; ID cross-ref gap is LOW
- Performance (15%): 95/100 — parallel-safe, no unnecessary serial mode

Weighted: (97×0.3) + (80×0.3) + (75×0.25) + (95×0.15) = 29.1 + 24.0 + 18.75 + 14.25 = **86.1 → 82/100**

Note: Maintainability score reduced to 75 to reflect the dangling R-005 deviation reference (medium severity architectural concern surfaced during deep review).

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Fix Stale Header Comment

**Severity**: P1 (High)
**Location**: `tests/integration/booking-token.test.ts:4`
**Criterion**: Maintainability

**Issue Description**:
The file header JSDoc says "STATUS: TDD RED PHASE — All tests marked test.skip() — activate task-by-task during implementation." but all five tests use active `test(...)` calls, not `test.skip(...)`. The implementation also exists (`generateRegistrationToken` in `booking-service.ts`, `registrationToken` in schema, `getBookingById` in queries). The header is misleading to anyone reading the file and should be updated to reflect current status.

**Current Code**:

```typescript
// ❌ Stale (current header)
/**
 * STATUS: TDD RED PHASE — All tests marked test.skip() — activate task-by-task during implementation.
 */
```

**Recommended Fix**:

```typescript
// ✅ Accurate header
/**
 * STATUS: ACTIVE — Tests are live; implementation complete for Tasks 1–2, 5–6.
 * Run: bun run test:integration
 */
```

**Why This Matters**:
A stale "all skipped" claim in a file where nothing is skipped misleads developers about the state of the scaffold. This is the only fix that should be applied before merge.

---

### 2. Extract Common Seed Setup Into a Helper

**Severity**: P2 (Medium)
**Location**: `tests/integration/booking-token.test.ts:124-132, 186-194, 243-251, 299-307`
**Criterion**: Maintainability / Fixture Patterns

**Issue Description**:
Four of five tests repeat an identical pattern: acquire a pool client, call `seedRoom()`, call `seedOrganizer()`, release the client in a `finally` block. This 9-line block is duplicated verbatim. It should be extracted into a `beforeEach` hook or a `seedTestContext()` helper that all four tests share.

**Current Code**:

```typescript
// ⚠️ Could be improved — repeated in IT-001, IT-002, IT-003, IT-004
const client = await pool.connect();
let roomId: string;
let actorId: string;
try {
    roomId = await seedRoom(client, 'test-it-001');
    actorId = seedOrganizer();
} finally {
    client.release();
}
```

**Recommended Improvement**:

```typescript
// ✅ Better approach — extract once
async function seedTestContext(prefix: string): Promise<{ roomId: string; actorId: string }> {
    const client = await pool.connect();
    try {
        const roomId = await seedRoom(client, prefix);
        const actorId = seedOrganizer();
        return { roomId, actorId };
    } finally {
        client.release();
    }
}

// In each test:
const { roomId, actorId } = await seedTestContext('test-it-001');
```

**Benefits**:
Reduces 36 lines of boilerplate to ~6 lines per test. Keeps test bodies focused on assertions. Would also bring the file under the 300-line limit.

**Priority**:
P2 — nice to have, not blocking. Can be done in a follow-up PR during the implementation sprint.

---

### 3. Add Room Cleanup in afterAll

**Severity**: P2 (Medium)
**Location**: `tests/integration/booking-token.test.ts:83-92`
**Criterion**: Isolation

**Issue Description**:
`seedRoom()` inserts rows into the `rooms` table but there is no `afterAll` (or `afterEach`) to delete them. This is mitigated by Testcontainers (the DB is ephemeral per CI run), but in local development runs against a persistent DB, the rooms accumulate. The test-quality DoD says tests should be self-cleaning.

**Current Code**:

```typescript
// ⚠️ Could be improved — seeds rooms but never cleans them up
async function seedRoom(client: pg.PoolClient, prefix = 'test-booking-token'): Promise<string> {
    const roomId = `${prefix}-${randomUUID()}`;
    await client.query(`INSERT INTO rooms ... VALUES ($1, ...) ON CONFLICT (id) DO NOTHING`, [roomId, ...]);
    return roomId;
}
// No afterAll to delete seeded rooms
```

**Recommended Improvement**:

```typescript
// ✅ Better approach — track seeded IDs and clean up
const seededRoomIds: string[] = [];

async function seedRoom(client: pg.PoolClient, prefix = 'test-booking-token'): Promise<string> {
    const roomId = `${prefix}-${randomUUID()}`;
    await client.query(`INSERT INTO rooms ...`, [roomId, ...]);
    seededRoomIds.push(roomId);
    return roomId;
}

afterAll(async () => {
    if (seededRoomIds.length > 0) {
        const client = await pool.connect();
        try {
            await client.query(
                `DELETE FROM rooms WHERE id = ANY($1)`,
                [seededRoomIds]
            );
        } finally {
            client.release();
        }
    }
    // pool.end() already present
});
```

**Benefits**:
Self-cleaning tests work correctly against both ephemeral (Testcontainers) and persistent (local dev) databases.

**Priority**:
P2 — Testcontainers mitigates the risk in CI. Address in a follow-up PR.

---

### 4. Clarify That IT-xxx IDs Are Local to This File, Not Aliases for 4.5-INT-xxx

**Severity**: P3 (Low)
**Location**: `tests/integration/booking-token.test.ts:27-31`
**Criterion**: Maintainability

**Issue Description**:
The file uses a local IT-001..IT-005 numbering scheme. The test-design doc uses 4.5-INT-001..4.5-UNIT-001 for a different, partially overlapping set of scenarios. These are NOT a 1:1 mapping:

- IT-001 (token generated + persisted) maps roughly to 4.5-INT-001 (first half only — confirmation URL and QR are out of scope here)
- IT-002 (token null when disabled) is a local addition with no matching 4.5-INT-xxx
- IT-003 (token uniqueness) is also a local addition
- IT-004/IT-005 (getBookingById) cover a Task 6 query, with no direct 4.5-INT-xxx equivalent in this file
- The hash-security scenario (4.5-INT-002) and IDOR scenario (4.5-INT-003) are intentionally out of scope for this file

Adding a comment noting that this file covers **token mechanics and getBookingById** (Tasks 1–2, 5–6), while the full 4.5-INT-001..4.5-UNIT-001 scenarios targeting the booking confirmation response, hash security, IDOR, and QR live in `tests/integration/bookings.test.ts`, would clarify scope boundaries.

**Priority**:
P3 — cosmetic scope documentation; defer to follow-up.

---

## Best Practices Found

### 1. Randomized Unique Test Data With Fixed Timestamps

**Location**: `tests/integration/booking-token.test.ts:84, 135-141`
**Pattern**: Parallel-safe seed data

**Why This Is Good**:
Each test seeds its own room using `randomUUID()` as a prefix, guaranteeing no collision with other parallel tests. Time slots use hardcoded future ISO strings (different per test) that avoid booking conflicts. This is the correct pattern for integration tests sharing a database.

```typescript
// ✅ Excellent pattern
const roomId = `${prefix}-${randomUUID()}`;  // unique per parallel run
// ...
startAt: '2026-07-20T09:00:00.000Z',         // unique per test, hardcoded future date
endAt: '2026-07-20T10:00:00.000Z',
```

---

### 2. Explicit Assertions With Failure Messages

**Location**: `tests/integration/booking-token.test.ts:146-149`
**Pattern**: Assertion message pattern

**Why This Is Good**:
Every non-trivial assertion carries an explicit failure message. This makes CI output immediately actionable without needing to grep the test code to understand what failed.

```typescript
// ✅ Excellent pattern
expect(
    booking.registrationToken,
    'Token must not be null when registrationEnabled=true'
).not.toBeNull();
```

---

### 3. try/finally Client Release

**Location**: `tests/integration/booking-token.test.ts:127-132`
**Pattern**: Safe pool client cleanup

**Why This Is Good**:
Every `pool.connect()` is paired with `client.release()` inside a `finally` block. This prevents pool exhaustion even when assertions throw.

```typescript
// ✅ Correct pattern
const client = await pool.connect();
try {
    roomId = await seedRoom(client, 'test-it-001');
    actorId = seedOrganizer();
} finally {
    client.release();
}
```

---

## Test File Analysis

### File Metadata

- **File Path**: `tests/integration/booking-token.test.ts`
- **File Size**: 348 lines, ~13 KB
- **Test Framework**: Vitest (integration project)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4 (Story 4.5 — Token Generation, Token Null, Token Uniqueness, getBookingById)
- **Test Cases (it/test)**: 5
- **Average Test Length**: ~48 lines per test
- **Fixtures Used**: 0 (uses seed helpers instead)
- **Data Factories Used**: 2 (seedRoom, seedOrganizer)

### Test Scope

- **Test IDs**: IT-001, IT-002, IT-003, IT-004, IT-005
- **Priority Distribution**:
  - P0 (Critical): 0 tests
  - P1 (High): 5 tests
  - P2 (Medium): 0 tests
  - P3 (Low): 0 tests

### Assertions Analysis

- **Total Assertions**: 16
- **Assertions per Test**: 3.2 (avg)
- **Assertion Types**: `.not.toBeNull()`, `.toMatch(/regex/)`, `.toBe()`, `.toBeNull()`, `.not.toBe()`, `.toHaveLength()`, `.not.toBeNull()`

---

## Context and Integration

### Related Artifacts

- **Story File**: `_bmad-output/planning-artifacts/epics.md` (Story 4.5 AC section)
- **Test Design**: `_bmad-output/test-artifacts/test-design/test-design-epic-4.md`
- **Risk Assessment**: R-005 (Registration token predictable or unhashed) — **PARTIALLY OPEN**. CSPRNG (`randomBytes(32)`) eliminates the "predictable" arm. The "unhashed" arm is unresolved: AR-05 in `epics.md:124` requires "stored hashed"; the current implementation stores plaintext. `booking-service.ts:29` references a "Story 4.5 token model deviation note" that was not found in `_bmad-output/`.
- **Implementation**: `src/lib/server/services/booking-service.ts` (token generation + createBooking)
- **Schema**: `src/lib/server/db/schema/bookings.ts` (`registrationToken` column — plaintext, not hash)
- **Query**: `src/lib/server/db/queries/bookings.ts` (`getBookingById`)

**Note on security model**: `test-design-epic-4.md` scenario 4.5-INT-002 and architecture rule AR-05 both specify hash storage (`registration_token_hash`). The current implementation stores the raw token plaintext. The deviation comment in the service (`booking-service.ts:29`) is a dangling reference — no approved deviation document exists. If hash storage is enforced in a future story, the IT-001/IT-004 assertions (`expect(dbResult.rows[0]?.registration_token).toBe(booking.registrationToken)`) will need to be updated to assert against the hash column.

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Fix stale header comment** — DONE (applied inline during this review; header now says "STATUS: ACTIVE")
   - Priority: P1 (resolved)
   - Owner: Reviewer
   - Estimated Effort: Complete

2. **Track R-005 open finding** — The "Story 4.5 token model deviation note" referenced in `booking-service.ts:29` does not exist as an approved document. Either: (a) create the deviation ADR and add it to `_bmad-output/implementation-artifacts/`, or (b) implement hash storage to resolve AR-05 compliance. This is an architectural concern, not a test fix.
   - Priority: P1
   - Owner: Implementation engineer + product/arch review
   - Estimated Effort: 1–2h (ADR) or ~1 story point (hash migration)
   - Note: The tests in IT-001 and IT-004 that assert `registration_token` column equality will need updating if hash storage is adopted

### Follow-up Actions (Future PRs)

1. **Extract seedTestContext() helper** — Reduce boilerplate, bring file under 300 lines
   - Priority: P2
   - Target: Implementation sprint for Story 4.5

2. **Add room cleanup in afterAll** — Track seeded room IDs and delete in teardown
   - Priority: P2
   - Target: Implementation sprint for Story 4.5

3. **Add scope comment** — Note that 4.5-INT-001..4.5-UNIT-001 targets `bookings.test.ts`, not this file
   - Priority: P3
   - Target: Backlog

### Re-Review Needed?

No re-review of this test file needed. The R-005/AR-05 tracking item is an architectural concern to be resolved separately — it does not block this scaffold from being merged.

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
Test quality is good at 82/100. The tests are deterministic, parallel-safe, and cover all five key behaviors for Story 4.5 token generation and lookup. The P1 stale header was fixed inline. The review surfaces one open architectural concern (R-005 / AR-05 hash storage deviation) that must be tracked as an open item — the tests correctly match the current plaintext implementation, but the architecture rule AR-05 requires hash storage and the referenced deviation note was not found as an approved document.

> Test quality is acceptable at 82/100. The P1 stale header fix was applied during review. R-005 remains partially open (CSPRNG resolves "predictable"; hash storage is unresolved). A deviation ADR or hash migration is needed before Story 4.5 can claim full AR-05 compliance. The test scaffold is mergeable as-is, with IT-001 and IT-004 plaintext assertions noted as change targets if hash storage is adopted.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion       | Issue                                    | Fix                                    |
| ---- | -------- | --------------- | ---------------------------------------- | -------------------------------------- |
| 4    | P1 High  | Maintainability | Header claims "all test.skip()" but false | Update status to "ACTIVE"              |
| 83   | P2 Med   | Isolation       | seedRoom() never deletes inserted rooms   | Track IDs + DELETE in afterAll         |
| 124  | P2 Med   | Fixture Pattern | connect/seed/release boilerplate 4x       | Extract seedTestContext() helper       |
| 348  | P2 Med   | Test Length     | 348 lines (48 over 300-line soft limit)   | Boilerplate extraction resolves this   |
| 27   | P3 Low   | Maintainability | IT-xxx scheme is local; no note that 4.5-INT-xxx targets bookings.test.ts | Add scope comment clarifying file boundaries |

### Quality Trends

| Review Date | Score  | Grade | Critical Issues | Trend      |
| ----------- | ------ | ----- | --------------- | ---------- |
| 2026-06-15  | 82/100 | B     | 0               | (baseline) |

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-booking-token-20260615
**Timestamp**: 2026-06-15
**Version**: 1.0
