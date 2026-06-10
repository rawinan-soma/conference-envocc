---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-quality-evaluation
  - step-03f-aggregate-scores
  - step-04-generate-report
lastStep: step-04-generate-report
lastSaved: '2026-06-10'
storyId: '1.4'
storyKey: '1-4-internationalization-setup'
reviewScope: suite
inputDocuments:
  - _bmad-output/implementation-artifacts/1-4-internationalization-setup.md
  - _bmad-output/test-artifacts/atdd-checklist-1-4-internationalization-setup.md
  - _bmad/tea/config.yaml
executionMode: sequential
---

# Test Quality Review — Story 1.4: Internationalization Setup

**Date:** 2026-06-10
**Story:** 1.4 — Internationalization Setup
**TDD Phase:** GREEN (all 11 unit tests passing; 5 E2E tests remain skipped — dev server required)
**Reviewer:** BMad Test Architect (bmad-testarch-test-review)
**Review Scope:** Suite (all test files in `tests/` for Story 1.4)

---

## Overall Quality Score

| Dimension | Score | Grade | Weight | Weighted |
|-----------|-------|-------|--------|---------|
| Determinism | 98/100 | A | 30% | 29.4 |
| Isolation | 95/100 | A | 30% | 28.5 |
| Maintainability | 75/100 | C | 25% | 18.75 |
| Performance | 82/100 | B | 15% | 12.3 |
| **Overall** | **89/100** | **B** | — | — |

> **Note:** Coverage scoring is excluded from `test-review`. Use `trace` for coverage analysis and gates.

---

## Files Reviewed

| File | Lines | Framework | Tests | Status |
|------|-------|-----------|-------|--------|
| `tests/unit/i18n-setup.spec.ts` | 350 | Vitest | 11 (all active, all passing) | GREEN |
| `tests/e2e/i18n-setup.spec.ts` | 152 | Playwright | 5 (all skip — dev server required) | RED (expected) |

**Test Run Result (observed):** `bunx vitest run tests/unit/i18n-setup.spec.ts` → 11/11 passed in 6.7s

---

## Executive Summary

**Overall Assessment:** Good

**Recommendation:** Approve with Comments

### Key Strengths

- Excellent determinism — no random/time dependencies, no `Math.random()`, no `Date.now()` without mocking, no `waitForTimeout()` anywhere
- Strong isolation — no shared mutable state, no test-order dependencies, correct `try/finally` cleanup for the ESLint fixture test
- Well-structured BDD test names with explicit scenario IDs (`1.4-UNIT-XXX`) and priority markers (`[P1]`, `[P2]`) aligned with the ATDD checklist
- Inline assertion messages are excellent throughout — every `expect()` call has a descriptive custom message, making failure output immediately actionable
- All acceptance criteria (AC-1 through AC-6) are covered by at least one test

### Key Weaknesses

- `tests/unit/i18n-setup.spec.ts` is 350 lines — exceeds the 300-line quality DoD limit
- `runCmd()` helper is duplicated verbatim from `tests/unit/scaffold.spec.ts` — DRY violation
- Three "quality gate" tests (UNIT-003 `bun run build`, UNIT-005 `bun run lint`, UNIT-010 `bun run check`) run inside the unit test suite; they are slow by nature and should be separated for CI pipeline optimization

### Summary

The Story 1.4 test suite is solid and the implementation is complete (all 11 unit tests green). The quality scores on determinism and isolation are near-perfect, reflecting careful ATDD discipline. The only notable issue is structural: the single `i18n-setup.spec.ts` file is 350 lines, triggering the quality DoD limit of 300, and the `runCmd` helper has been copied from `scaffold.spec.ts` rather than extracted to a shared helper module.

These findings are actionable and low-risk to fix. The recommendation is **Approve with Comments** — the tests are production-quality, passing, and well-structured. The refactoring (extract helper, split file) can be applied in this PR or as a follow-up.

---

## Quality Criteria Assessment

| Criterion | Status | Violations | Notes |
|-----------|--------|------------|-------|
| BDD Format (Given-When-Then) | ✅ PASS | 0 | All tests have structured scenario descriptions with activation guides |
| Test IDs | ✅ PASS | 0 | All 11 unit tests have IDs `1.4-UNIT-001..011` matching ATDD checklist |
| Priority Markers (P1/P2) | ✅ PASS | 0 | All tests prefixed with `[P1]` or `[P2]` |
| Hard Waits (sleep, waitForTimeout) | ✅ PASS | 0 | No hard waits anywhere in unit or E2E files |
| Determinism (no conditionals) | ✅ PASS | 1 LOW | 1 LOW advisory: build process test is slow but deterministic |
| Isolation (cleanup, no shared state) | ✅ PASS | 1 LOW | 1 LOW: ESLint fixture filename not worker-unique (safe currently) |
| Fixture Patterns | ✅ PASS | 0 | N/A for infrastructure tests; `try/finally` cleanup is correct |
| Data Factories | ✅ PASS | 0 | N/A — no domain data, tests verify config files and processes |
| Network-First Pattern | ✅ PASS | 0 | E2E: `Accept-Language` header set before `page.goto()` — correct order |
| Explicit Assertions | ✅ PASS | 0 | Every `expect()` has a descriptive custom message |
| Test Length (≤300 lines) | ❌ FAIL | 350 lines | `i18n-setup.spec.ts` exceeds 300-line limit |
| Test Duration (≤1.5 min) | ⚠️ WARN | 3 slow tests | UNIT-003/005/010 are quality-gate tests (build/lint/check) — inherently slow |
| Flakiness Patterns | ✅ PASS | 0 | No flaky patterns detected |

**Total Violations:** 0 Critical, 1 High, 2 Medium, 3 Low

---

## Quality Score Breakdown

```
Starting Score:          100

Dimension Scores (weighted):
  Determinism:     98/100 × 30% = 29.4
  Isolation:       95/100 × 30% = 28.5
  Maintainability: 75/100 × 25% = 18.75
  Performance:     82/100 × 15% = 12.3
                                  ------
Overall Score:           89/100
Grade:                   B
```

---

## Critical Issues (Must Fix)

No P0 critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Extract `runCmd` to Shared Helper — DRY Violation

**Severity:** P1 (High)
**Location:** `tests/unit/i18n-setup.spec.ts:35` and `tests/unit/scaffold.spec.ts:20`
**Criterion:** Maintainability — duplicate code

**Issue Description:**
The `runCmd()` helper function is duplicated verbatim between `i18n-setup.spec.ts` (lines 35–48) and `scaffold.spec.ts` (lines 20–33). Any bug fix or improvement to the function must be applied in two places, which is error-prone.

**Current Code (both files):**
```typescript
// ❌ Duplicated in i18n-setup.spec.ts AND scaffold.spec.ts
function runCmd(
  cmd: string,
  cwd = process.cwd()
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' });
    return { stdout: stdout.toString(), stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    return {
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
      exitCode: e.status ?? 1
    };
  }
}
```

**Recommended Fix:**
```typescript
// ✅ tests/support/helpers/cmd-helpers.ts (new shared file)
import { execSync } from 'child_process';

export function runCmd(
  cmd: string,
  cwd = process.cwd()
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' });
    return { stdout: stdout.toString(), stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    return {
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
      exitCode: e.status ?? 1
    };
  }
}

// ✅ In i18n-setup.spec.ts and scaffold.spec.ts — replace local definition with:
import { runCmd } from '../support/helpers/cmd-helpers';
```

**Benefits:** Single source of truth; any future improvements (e.g., timeout support, better error messages) apply to both test files automatically.

**Priority:** P1 — should be fixed in this PR to avoid the pattern spreading to future story test files.

---

### 2. Split `i18n-setup.spec.ts` — File Exceeds 300-Line Quality DoD Limit

**Severity:** P1 (High)
**Location:** `tests/unit/i18n-setup.spec.ts:1` (350 lines)
**Criterion:** Test Length ≤300 lines

**Issue Description:**
The file contains 11 tests across two logical concerns: (a) infrastructure/config verification (UNIT-007..011) and (b) message-key and ESLint-guard verification (UNIT-001..006). Keeping them in one 350-line file makes it harder to navigate and harder to run targeted subsets during development.

**Current Structure:**
```
tests/unit/i18n-setup.spec.ts (350 lines — 11 tests, 1 describe block)
  ├── UNIT-001: messages/en.json canonical keys
  ├── UNIT-002: messages/th.json mirrors en.json
  ├── UNIT-003: bun run build compiles Paraglide
  ├── UNIT-004: ESLint fires on hardcoded strings
  ├── UNIT-005: bun run lint exits 0
  ├── UNIT-006: +page.svelte imports m and uses m.home_title()
  ├── UNIT-007: project.inlang/settings.json config
  ├── UNIT-008: src/app.html Paraglide placeholders
  ├── UNIT-009: src/hooks.server.ts paraglideMiddleware
  ├── UNIT-010: bun run check exits 0
  └── UNIT-011: vite.config.ts paraglideVitePlugin
```

**Recommended Split:**
```
tests/unit/i18n-messages.spec.ts (~150 lines — 6 tests)
  ├── UNIT-001: messages/en.json canonical keys
  ├── UNIT-002: messages/th.json mirrors en.json (no Thai text)
  ├── UNIT-003: bun run build compiles Paraglide
  ├── UNIT-004: ESLint fires on hardcoded strings
  ├── UNIT-005: bun run lint exits 0
  └── UNIT-006: +page.svelte uses m.home_title()

tests/unit/i18n-config.spec.ts (~130 lines — 5 tests)
  ├── UNIT-007: project.inlang/settings.json config
  ├── UNIT-008: src/app.html Paraglide placeholders
  ├── UNIT-009: src/hooks.server.ts paraglideMiddleware
  ├── UNIT-010: bun run check exits 0
  └── UNIT-011: vite.config.ts paraglideVitePlugin
```

**Benefits:** Both files stay well under 300 lines; each has a clear single concern. Developers working on message keys can run `bunx vitest run tests/unit/i18n-messages.spec.ts` without also running the config checks.

**Priority:** P1 — Quality DoD requires files ≤300 lines.

---

### 3. Group Quality-Gate Tests Separately from Fast Unit Tests (CI Optimization)

**Severity:** P2 (Medium)
**Location:** `tests/unit/i18n-setup.spec.ts:152` (UNIT-003), `:109` (UNIT-005), `:261` (UNIT-010)
**Criterion:** Test Duration ≤1.5 min

**Issue Description:**
UNIT-003 (`bun run build`), UNIT-005 (`bun run lint`), and UNIT-010 (`bun run check`) are quality-gate process tests, not fast unit tests. They run external processes that scan or compile the entire codebase. While the total observed run time of 6.7s is under 1.5 min, these tests will grow slower as the codebase grows. They also have a different failure mode: they fail when infrastructure/tooling breaks, not when business logic breaks.

**Recommendation:**
Add a `@quality-gate` comment or a Vitest `tags` annotation to these tests, and configure CI to run them in a separate job after the fast unit tests.

```typescript
// ✅ Option A: Use Vitest test.concurrent grouping to isolate slow tests
// In vitest.config.ts, add a separate project for quality-gate tests:
// { name: 'quality-gates', include: ['tests/unit/**/*.spec.ts'], 
//   exclude: [...], testTimeout: 120000 }

// ✅ Option B: Extract quality-gate tests to tests/quality-gates/
// tests/quality-gates/build-check.spec.ts (UNIT-003, UNIT-005, UNIT-010)
// Run separately: bunx vitest run tests/quality-gates/
```

**Benefits:** Fast unit tests (UNIT-001, 002, 006, 007, 008, 009, 011) run in milliseconds and provide immediate developer feedback. Quality-gate tests run in CI after fast tests pass.

**Priority:** P2 — Not urgent now (6.7s total is fine), but worth addressing before Story 1.8 (CI setup).

---

### 4. Make ESLint Fixture Filename Worker-Unique

**Severity:** P3 (Low)
**Location:** `tests/unit/i18n-setup.spec.ts:163`
**Criterion:** Isolation — parallel-run safety

**Issue Description:**
UNIT-004 creates `tests/support/fixtures/__hardcoded-string-fixture.svelte` with a hardcoded filename. If Vitest is run with `--pool=threads` and multiple workers execute this test concurrently, two workers could race on the same filename.

**Current Code:**
```typescript
const fixtureFile = path.join(fixtureDir, '__hardcoded-string-fixture.svelte');
```

**Recommended Fix:**
```typescript
// ✅ Worker-unique filename using process.pid
const fixtureFile = path.join(fixtureDir, `__hardcoded-string-fixture-${process.pid}.svelte`);
```

**Priority:** P3 (Low) — Currently safe because Vitest runs unit tests in the same process by default. Address before enabling parallel workers.

---

## Best Practices Found

### 1. Excellent Inline Assertion Messages

**Location:** `tests/unit/i18n-setup.spec.ts` throughout
**Pattern:** Every `expect()` call has a descriptive second argument

**Why This Is Good:**
When a test fails, the error message immediately tells the developer what was wrong and why it matters — without needing to read the test code:

```typescript
// ✅ Excellent — failure message is immediately actionable
expect(
  thValuesStr,
  'messages/th.json must NOT contain Thai characters — use English placeholders; Rawinan provides translations'
).not.toMatch(/[฀-๿]/);

expect(
  content,
  '+page.svelte must import * as m from $lib/paraglide/messages'
).toMatch(
  /import\s+\*\s+as\s+m\s+from\s+['"](?:\$lib\/paraglide\/messages|\.\..*\/paraglide\/messages)['"]/
);
```

**Use as Reference:** This pattern should be used in all future story test files. It makes CI failures self-documenting.

---

### 2. Correct `try/finally` Fixture Cleanup in UNIT-004

**Location:** `tests/unit/i18n-setup.spec.ts:163–183`
**Pattern:** Write fixture → run test → cleanup in `finally`

**Why This Is Good:**
The ESLint fixture file is guaranteed to be deleted even if the assertion throws:

```typescript
// ✅ Correct cleanup discipline
mkdirSync(fixtureDir, { recursive: true });
writeFileSync(fixtureFile, hardcodedContent, 'utf-8');

try {
  const result = runCmd(`bunx eslint "${fixtureFile}"`, PROJECT_ROOT);
  expect(result.exitCode, '...').not.toBe(0);
} finally {
  if (existsSync(fixtureFile)) {
    unlinkSync(fixtureFile);
  }
}
```

**Use as Reference:** Any test that creates temporary files should follow this exact pattern.

---

### 3. Thai Language Rule Enforcement via Test

**Location:** `tests/unit/i18n-setup.spec.ts:93`
**Pattern:** Encoding assertion to prevent Thai characters in code

**Why This Is Good:**
The test enforces the critical project rule that no Thai text appears in `messages/th.json` — all values must be English placeholders until Rawinan provides translations:

```typescript
// ✅ Enforces architecture rule programmatically
const thValuesStr = JSON.stringify(thMessages);
expect(
  thValuesStr,
  'messages/th.json must NOT contain Thai characters — use English placeholders; Rawinan provides translations'
).not.toMatch(/[฀-๿]/);
```

This transforms a human convention into a machine-enforced constraint. Every future developer is protected from accidentally writing Thai text in code.

---

## Test File Analysis

### `tests/unit/i18n-setup.spec.ts`

- **File Path:** `tests/unit/i18n-setup.spec.ts`
- **File Size:** 350 lines (**exceeds 300-line limit**)
- **Test Framework:** Vitest
- **Language:** TypeScript

**Test Structure:**
- Describe Blocks: 1 (`Story 1.4 — Internationalization Setup (ATDD Red Phase)`)
- Test Cases: 11 (all active, all passing)
- Average Test Length: ~25 lines per test
- Fixtures Used: 0 (infrastructure test — uses `execSync` and `fs` directly)
- Data Factories: N/A

**Test Scope:**
- Test IDs: `1.4-UNIT-001` through `1.4-UNIT-011`
- Priority Distribution: P1: 9 tests, P2: 2 tests (UNIT-007, UNIT-008)

**Assertions Analysis:**
- Total Assertions: ~35
- Assertions per Test: ~3 (avg)
- Assertion Types: `toBe`, `toBeTruthy`, `toHaveProperty`, `not.toHaveProperty`, `toEqual`, `toContain`, `not.toMatch`, `toMatch`, `toBeVisible` (E2E)

---

### `tests/e2e/i18n-setup.spec.ts`

- **File Path:** `tests/e2e/i18n-setup.spec.ts`
- **File Size:** 152 lines (within limit)
- **Test Framework:** Playwright
- **Language:** TypeScript

**Test Structure:**
- Describe Blocks: 1
- Test Cases: 5 (all `test.skip()` — require running dev server)
- Average Test Length: ~25 lines per test

**Test Scope:**
- Test IDs: `1.4-E2E-001` through `1.4-E2E-005`
- Priority Distribution: P1: 4 tests, P2: 1 test (E2E-005)
- Note: E2E tests correctly skipped in unit test phase — will be activated in E2E test phase

---

## Context and Integration

### Related Artifacts

- **Story File:** [`_bmad-output/implementation-artifacts/1-4-internationalization-setup.md`](_bmad-output/implementation-artifacts/1-4-internationalization-setup.md)
- **ATDD Checklist:** [`_bmad-output/test-artifacts/atdd-checklist-1-4-internationalization-setup.md`](_bmad-output/test-artifacts/atdd-checklist-1-4-internationalization-setup.md)
- **Test Design:** [`_bmad-output/test-artifacts/test-design/test-design-epic-1.md`](_bmad-output/test-artifacts/test-design/test-design-epic-1.md)

**AC Coverage Verified:**
| AC | Covered By | Status |
|----|-----------|--------|
| AC-1: Paraglide compiles to `src/lib/paraglide/` | UNIT-003, UNIT-011 | ✅ Passing |
| AC-2: `m.home_title()` renders correctly | UNIT-006, E2E-001, E2E-004 | ✅ Unit passing, E2E skipped |
| AC-3: ESLint fires on hardcoded strings | UNIT-004 | ✅ Passing |
| AC-4: ESLint exits 0 with `m.*()` | UNIT-005 | ✅ Passing |
| AC-5: Accept-Language: th → html attrs | UNIT-008, UNIT-009, E2E-002, E2E-003 | ✅ Unit passing, E2E skipped |
| AC-6: Home page renders English source string | UNIT-006, E2E-001 | ✅ Unit passing, E2E skipped |

---

## Next Steps

### Immediate Actions (Apply in This PR)

1. **Extract `runCmd` to `tests/support/helpers/cmd-helpers.ts`**
   - Priority: P1
   - Effort: ~10 minutes
   - Update both `i18n-setup.spec.ts` and `scaffold.spec.ts` to import from shared helper

2. **Split `i18n-setup.spec.ts` into `i18n-messages.spec.ts` + `i18n-config.spec.ts`**
   - Priority: P1
   - Effort: ~20 minutes
   - Both files stay under 200 lines; all 11 tests remain active and passing

### Follow-up Actions (Story 1.8 — CI Setup)

1. **Separate quality-gate tests from fast unit tests in CI pipeline**
   - Priority: P2
   - Target: Story 1.8 (Test Harness & CI)

2. **Make ESLint fixture filename worker-unique**
   - Priority: P3
   - Target: Story 1.8 (when parallel workers are configured)

### Re-Review Needed?

After applying the immediate actions (extract helper + split file), a re-review is not required — these are structural refactors that do not change test logic or assertions.

---

## Decision

**Recommendation:** Approve with Comments

**Rationale:**
The Story 1.4 test suite is well-designed and currently green (11/11 unit tests passing). The tests enforce all acceptance criteria, follow ATDD discipline, use excellent inline assertion messages, and have no determinism or isolation issues. The 2 immediate action items (extract helper, split file) are straightforward structural improvements that comply with the quality DoD's 300-line limit. They should be applied before or alongside this PR.

> Test quality is good at 89/100. The structural improvements (extracting the shared `runCmd` helper and splitting the 350-line file into two focused files) should be applied in this PR to maintain quality DoD compliance. All 11 unit tests pass and cover AC-1 through AC-6.

---

## Appendix

### Violation Summary by Location

| File | Line | Severity | Criterion | Issue | Fix |
|------|------|----------|-----------|-------|-----|
| `i18n-setup.spec.ts` | 1 | HIGH | Test Length | 350 lines exceeds 300-line limit | Split into 2 files |
| `i18n-setup.spec.ts` | 35 | MEDIUM | Maintainability | `runCmd` duplicated from `scaffold.spec.ts` | Extract to `cmd-helpers.ts` |
| `i18n-setup.spec.ts` | 152 | MEDIUM | Performance | `bun run build` in unit test suite | Group as quality-gate test |
| `i18n-setup.spec.ts` | 163 | LOW | Isolation | Fixture filename not worker-unique | Append `process.pid` |
| `i18n-setup.spec.ts` | 109 | LOW | Performance | `bun run lint` in unit test suite | Group as quality-gate test |
| `i18n-setup.spec.ts` | 261 | LOW | Performance | `bun run check` in unit test suite | Group as quality-gate test |

### Related Reviews

| File | Score | Grade | Critical | Status |
|------|-------|-------|----------|--------|
| `tests/unit/scaffold.spec.ts` | 93/100 | A | 0 | Approved (Story 1.1 review) |
| `tests/unit/i18n-setup.spec.ts` | 89/100 | B | 0 | Approved with Comments |
| `tests/e2e/i18n-setup.spec.ts` | N/A | — | — | RED (skipped, expected) |

---

## Review Metadata

**Generated By:** BMad Test Architect (bmad-testarch-test-review)
**Workflow:** testarch-test-review
**Review ID:** test-review-1-4-internationalization-setup-20260610
**Timestamp:** 2026-06-10
**Story:** 1.4 — Internationalization Setup
