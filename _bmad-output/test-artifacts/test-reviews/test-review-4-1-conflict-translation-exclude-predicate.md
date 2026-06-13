---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-13'
story: '4.1-conflict-translation-exclude-predicate'
inputDocuments:
  - tests/integration/bookings.test.ts
  - tests/integration/db-schema.test.ts
  - src/lib/server/services/booking-service.ts
  - drizzle/0000_init.sql
  - messages/en.json
  - messages/th.json
  - _bmad-output/test-artifacts/atdd-checklist-4-1-conflict-translation-exclude-predicate.md
  - _bmad-output/implementation-artifacts/4-1-conflict-translation-exclude-predicate.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-4.md
---

# Test Quality Review — Story 4.1: Conflict Translation & EXCLUDE Predicate

## Overall Quality Score: 91/100 (Grade: A)

**Execution Mode:** Sequential
**Reviewed:** 2026-06-13
**Reviewer:** Master Test Architect (TEA)
**Scope:**
- `tests/integration/bookings.test.ts` (NEW — 589 lines, 7 test scenarios: 4.1-CONC-001, INT-001 through INT-006)
- `tests/integration/db-schema.test.ts` (APPENDED — 4.1-UNIT-001, lines 459–513)

---

## Dimension Scores

| Dimension       | Score | Grade | Weight | Weighted |
|-----------------|-------|-------|--------|----------|
| Determinism     | 97    | A     | 30%    | 29.1     |
| Isolation       | 88    | B+    | 30%    | 26.4     |
| Maintainability | 92    | A     | 25%    | 23.0     |
| Performance     | 90    | A     | 15%    | 13.5     |
| **Overall**     | **91**| **A** |        |          |

> Coverage is excluded from `test-review` scoring. Use `trace` for coverage analysis and gates.

---

## Violations Summary

| Severity | Count |
|----------|-------|
| HIGH     | 0     |
| MEDIUM   | 0     |
| LOW      | 2     |
| **Total**| **2** |

---

## Violations Detail

### LOW — ACCEPTED (no code change applied)

**[Isolation] Service-layer tests commit rows without explicit teardown**

- **File:** `tests/integration/bookings.test.ts`, all INT-00x tests
- **Category:** missing-cleanup (advisory)
- **Description:** Tests `4.1-INT-001` through `4.1-INT-006` call `createBooking()` which commits rows to the `bookings` table. There is no `afterEach`/`afterAll` teardown for those rows. Isolation is provided by UUID-based room IDs (`seedRoom()` generates `${prefix}-${randomUUID()}` per test), so rows from different test runs do not collide. Within Testcontainers, each CI run starts a fresh database — cross-run bleed is not possible. The pattern is consistent with the established Testcontainers-first isolation contract used throughout the project (see `rooms.test.ts`).
- **Decision:** ACCEPTED — UUID-keyed isolation is correct and sufficient. No change applied. Advisory note: if `bookings.test.ts` is ever run against a persistent (non-Testcontainers) DB, adding `TRUNCATE bookings CASCADE` in `afterAll()` would harden isolation further.

### LOW — ACCEPTED (no code change applied)

**[Determinism] Fixed future timestamps will become past dates after July 2026**

- **File:** `tests/integration/bookings.test.ts`, all INT-00x and CONC-001 tests
- **Category:** time-dependency (advisory)
- **Description:** All date strings use fixed ISO 8601 values in July/August 2026 (e.g., `'2026-07-15 09:00:00+00'` in CONC-001, `'2026-07-16T09:00:00.000Z'` in INT-001). After those dates pass, inserts will carry past timestamps. PostgreSQL `tstzrange` and GiST EXCLUDE operate identically on past vs. future timestamps — the tests remain functionally correct. There is no time-dependent assertion (no `CURRENT_TIMESTAMP` comparison, no TTL check). Risk is conceptual only.
- **Decision:** ACCEPTED — not a correctness risk. Consistent with the approach used in Story 3.4. No change applied.

---

## Key Strengths

1. **AR-11 mandatory test is correct and robust**: `4.1-CONC-001` uses N=5 direct `pg.Pool` connections (not the service layer) to test the GiST EXCLUDE constraint in isolation. The concurrent-wins assertion (`committed.length === 1`) and the row-count final verification (`COUNT(*) = 1`) together prove the constraint eliminates double-booking. The `40P01` (deadlock) acceptance alongside `23P01` is a well-documented, architecturally justified choice: AR-11 states "assert the rest raise 23P01 **or are rolled back**" — a deadlock victim IS rolled back by Postgres.

2. **Cause-chain awareness built into the test design**: `4.1-INT-001` and `4.1-INT-003` assert `thrown instanceof ConflictError` using the dynamically imported class itself (not a string name check). This correctly validates the identity of the thrown type through the cause-chain remapping in `booking-service.ts`.

3. **Paraglide key tested by name, not message string**: `4.1-INT-005` asserts `conflictErr.key === 'booking_conflict_error'` and also reads `messages/en.json` at runtime to verify the key has a non-empty value. This two-part assertion (key identity + i18n file presence) is exactly what AC-4 requires. No Thai text is hardcoded.

4. **DB schema static assertion with Postgres normalization awareness**: `4.1-UNIT-001` uses `pg_get_constraintdef()` which normalizes `!=` → `<>` and may add `::text` cast and double parentheses. The regex `/WHERE\s*\(*\s*status\s*<>\s*'cancelled'/i` correctly handles all known Postgres representations without over-fitting to one normalization form.

5. **Dynamic import pattern prevents scaffold-time compilation failure**: All service-layer tests use `await import('../../src/lib/server/services/booking-service.js')` inside the test body. This means `bookings.test.ts` compiles and reports `test.skip()` even before `booking-service.ts` exists — a correct implementation of the ATDD red-phase discipline.

6. **EXCLUDE vs. pre-check architecture is enforced by the tests**: `4.1-INT-001` and `4.1-INT-003` test against a service that has NO app-level pre-check. The skip comment on `4.1-INT-003` explicitly documents: "The EXCLUDE constraint is the sole conflict authority — a pre-check reintroduces the TOCTOU race CONC-001 exists to close." This coupling of test rationale to the architectural mandate is excellent.

7. **Half-open range semantics verified by `4.1-INT-004`**: The back-to-back booking test (`10:00–11:00` + `11:00–12:00`) directly proves `tstzrange '[)'` semantics are correct. This would catch any regression to `[]` (closed) range type which would incorrectly block adjacent bookings.

8. **Activation schedule respected**: Only `4.1-CONC-001`, `4.1-INT-001`, and `4.1-UNIT-001` are active (`test()`). All other tests correctly remain `test.skip()` per the ATDD activation schedule in the story. No scope creep.

9. **Excellent test naming and documentation**: Every test body has a multi-line comment explaining: the activation trigger, the AC being tested, the test strategy, and cross-references to architecture decisions. The header JSDoc block maps all 7 scenarios to their ACs and priorities. Maintainability is high.

---

## Architecture Notes

**CONC-001 accepts `40P01` alongside `23P01` — correct and required:**
Under concurrent GiST EXCLUDE with N=5 parallel transactions, Postgres may emit `40P01` (deadlock_detected) rather than `23P01` (exclusion_violation) for some losers. This is a known PostgreSQL behaviour for GiST index-based exclusion under high concurrency. The set `legitimateCodes = new Set(['23P01', '40P01'])` is the architecturally correct choice. Tightening it back to only `23P01` would reintroduce CI flakiness without adding diagnostic value.

**UNIT-001 regex handles all Postgres normalization forms:**
`pg_get_constraintdef()` for `WHERE (status != 'cancelled')` returns strings like:
- `WHERE ((status <> 'cancelled'::text))` (Postgres 14+)
- `WHERE (status <> 'cancelled')` (older)

The regex `/WHERE\s*\(*\s*status\s*<>\s*'cancelled'/i` matches both. Do NOT tighten it to require `::text` — that would break on older Postgres versions.

**`seedOrganizer()` returns `randomUUID()` without a DB insert — intentional:**
`audit_log.actor_id` is defined as `TEXT NOT NULL` with no FK constraint in `drizzle/0000_init.sql`. The actor identity is a plain-text label at this layer. The `// eslint-disable-next-line @typescript-eslint/no-unused-vars` comment on the `_client` parameter is the correct suppression for the API-compatibility parameter.

**`4.1-INT-002` INSERT + UPDATE not in a transaction — intentional self-verification:**
The test inserts a booking via raw SQL then updates its status to `cancelled` using two sequential queries (no explicit `BEGIN/COMMIT`). Each statement commits independently (autocommit). This is safe because: (1) the test is single-connection for the setup steps; (2) the second query targets the exact row by `room_id` + `during`; (3) the test is self-verifying — if the UPDATE missed the row, the subsequent `createBooking()` call would raise `ConflictError` and the test would fail with a clear message.

---

## Fixes Applied

| Fix | File | Change |
|-----|------|--------|
| None | — | No code changes required. All violations are LOW-severity and accepted. |

---

## Recommendations

1. No HIGH or MEDIUM violations — the test suite is production-quality and all P0 AC scenarios are covered.
2. If `bookings.test.ts` is ever run against a persistent shared database (not Testcontainers), add `TRUNCATE bookings CASCADE` to `afterAll()` for defence-in-depth isolation. Not required for current CI setup.
3. After July 2026, migrate hardcoded timestamps to relative offsets if audit-log diff content becomes a concern in downstream assertions. No functional impact before then.
4. Story 4.2+ should verify that `truncateRoomTables()` in `rooms.test.ts` includes `'bookings'` — the bookings table has no FK to rooms (`TEXT NOT NULL`, no `REFERENCES`), so it is NOT cleaned up by `TRUNCATE rooms CASCADE`. (Noted here as cross-story advisory; the Story 4.1 test file is self-contained and unaffected.)

---

## Next Workflow

Tests reviewed. No code changes applied. Suite is ready for CI gate validation. All P0 tests (`4.1-CONC-001`, `4.1-INT-001`, `4.1-UNIT-001`) are active and cover the non-negotiable AR-11 mandate and core AC-1/AC-3 requirements. Remaining P0/P1/P2 tests remain `test.skip()` pending implementation task activation.
