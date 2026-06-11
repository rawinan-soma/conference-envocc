---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-quality-evaluation
  - step-03f-aggregate-scores
  - step-04-generate-report
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-11'
workflowType: 'testarch-test-review'
storyId: '1.9'
storyKey: '1-9-walking-skeleton-vertical-slice'
inputDocuments:
  - _bmad-output/test-artifacts/atdd-checklist-1-9-walking-skeleton-vertical-slice.md
  - _bmad-output/planning-artifacts/epics.md
  - tests/e2e/walking-skeleton.spec.ts
  - tests/integration/walking-skeleton.test.ts
  - src/routes/skeleton/+page.svelte
  - src/routes/skeleton/+page.server.ts
  - src/lib/paraglide/messages/_index.js
  - _bmad/tea/config.yaml
---

# Test Quality Review: Story 1.9 — Walking-skeleton Vertical Slice

**Quality Score**: 84/100 (B — Good)
**Review Date**: 2026-06-11
**Review Scope**: suite — `tests/e2e/walking-skeleton.spec.ts` + `tests/integration/walking-skeleton.test.ts`
**Reviewer**: TEA Agent (Master Test Architect)

---

> Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Approve with Comments (one fix applied during review)

### Key Strengths

✅ All integration tests use `finally` blocks for cleanup — DB connections and test data always released, even after expected exceptions
✅ Deterministic sentinel room UUIDs (e.g. `'00000000-1909-0001-0000-000000000001'`) prevent accidental collision with production data
✅ RED-phase skip discipline is rigorous — `test.skip(true, reason)` at describe-level prevents any partial activation of skipped blocks
✅ Excellent assertion messages — every `expect()` includes a failure message explaining what should be true and which AC it covers
✅ INT-003 correctly handles Postgres aborted-transaction state by using `pool.query` (fresh connection) for final cleanup, not the aborted `client`
✅ E2E tests use `page.waitForLoadState('networkidle')` consistently — no arbitrary hard waits in activated tests
✅ Paraglide keys (`skeleton_title`, `skeleton_description`, `skeleton_insert_label`, `skeleton_job_label`) are compiled and present in `src/lib/paraglide/messages/`

### Key Weaknesses

❌ **FIXED**: Activated test `1.9-E2E-TITLE` used `page.locator('h3').first()` but `CardTitle` renders a `<div>` — selector would silently find nothing and test would pass vacuously or error. Fixed: changed to `[data-testid="skeleton-heading"]` + added `data-testid` to `+page.svelte` CardTitle.
❌ Activated tests use non-canonical IDs (`1.9-E2E-TITLE`, `1.9-E2E-A11Y`) outside the ATDD checklist tracking scheme. These should be considered temporary smoke gates — not replacements for `1.9-E2E-001`/`1.9-E2E-004`.
❌ `1.9-E2E-A11Y` (active) is a near-duplicate of `1.9-E2E-004` (skipped). When `1.9-E2E-004` is activated, `1.9-E2E-A11Y` should be removed to prevent duplicate axe-core runs.

### Summary

The test suite for Story 1.9 is a well-structured ATDD RED-phase scaffold for a full-stack vertical slice. The integration tests demonstrate sophisticated Postgres transaction patterns (BEGIN/COMMIT/ROLLBACK with proper cleanup) and the E2E tests correctly cover the browser-layer AC requirements. One critical defect was found and fixed during this review: the activated `1.9-E2E-TITLE` test used a fragile `h3.first()` selector against a component that renders a `<div>`. The fix adds `data-testid="skeleton-heading"` to the `CardTitle` in `+page.svelte` and updates the test selector — aligning with the ATDD checklist's recommendation for this attribute. All other issues are low-risk concerns for the activation phase.

---

## Quality Criteria Assessment

| Criterion                            | Status        | Violations | Notes |
| ------------------------------------ | ------------- | ---------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS       | 0          | Comments document AC mapping per test |
| Test IDs                             | ⚠️ WARN       | 2          | Activated tests use `1.9-E2E-TITLE`/`A11Y` outside canonical `1.9-E2E-*` scheme |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS       | 0          | All tests have `[P0]`/`[P1]` prefix |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS       | 0          | No `waitForTimeout` in activated tests; polling loop in skipped INT-002 is appropriate for Mailpit |
| Determinism (no conditionals)        | ✅ PASS       | 0          | `Date.now()` in skipped P3 benchmark test is acceptable |
| Isolation (cleanup, no shared state) | ✅ PASS       | 0          | `finally` blocks with pool.query fresh-connection cleanup |
| Fixture Patterns                     | ✅ PASS       | 0          | `beforeAll`/`afterAll` at module level for pg.Pool lifecycle |
| Data Factories                       | ✅ PASS       | 0          | Sentinel UUIDs used (not random); no faker needed for raw SQL tests |
| Network-First Pattern                | ✅ PASS       | 0          | `waitForLoadState('networkidle')` used in all E2E tests |
| Explicit Assertions                  | ✅ PASS       | 0          | All `expect()` have descriptive failure messages; no assertions hidden in helpers |
| Test Length (≤300 lines)             | ⚠️ WARN       | 2 files    | E2E: 409 lines, INT: 398 lines (acceptable for 10+5 test multi-scenario RED scaffold) |
| Test Duration (≤1.5 min)             | ✅ PASS       | 0          | INT-002 has 10s Mailpit poll ceiling; E2E-003 has 10s timeout — both within 1.5 min |
| Flakiness Patterns                   | ✅ PASS       | 0          | Selector fixed (was brittle `h3.first()`); remaining selectors use `data-testid` or role-based |

**Total Violations**: 0 Critical (pre-fix: 1), 0 High, 3 Medium, 2 Low

---

## Quality Score Breakdown

```
Starting Score:          100

Dimension Evaluation (weighted):
  Determinism:    90/100 × 0.30 = 27.0
  Isolation:      85/100 × 0.30 = 25.5
  Maintainability:72/100 × 0.25 = 18.0
  Performance:    87/100 × 0.15 = 13.1
                               --------
Overall Score:   84/100 (post-fix, defect resolved during review)
Grade:           B (Good)
```

---

## Critical Issues (Must Fix)

### 1. ~~`h3.first()` selector used against a `<div>`-rendering CardTitle~~ — FIXED during review

**Severity**: HIGH (applied fix — no action needed)
**Location**: `tests/e2e/walking-skeleton.spec.ts:56` (original) → fixed
**Criterion**: Selector Resilience

**Issue Description**:
The activated test `1.9-E2E-TITLE` used `page.locator('h3').first().textContent()` to read the skeleton page heading. The shadcn-svelte `CardTitle` component renders a `<div data-slot="card-title">`, not an `<h3>`. The selector would either find a different `<h3>` on the page (silent wrong assertion) or return `null` (vacuous pass via `toContain` on null), making the test unreliable.

**Original code** (before fix):
```typescript
// ❌ Bad — CardTitle renders <div>, not <h3>
const titleText = await page.locator('h3').first().textContent();
expect(titleText, '...').toContain('Walking Skeleton');
```

**Fix applied**:
```typescript
// ✅ Good — resilient data-testid selector
const titleLocator = page.locator('[data-testid="skeleton-heading"]');
await expect(titleLocator, 'Skeleton page must render a [data-testid="skeleton-heading"] element').toBeVisible();
const titleText = await titleLocator.textContent();
expect(titleText, 'Skeleton page must contain "Walking Skeleton" heading from m.skeleton_title()').toContain('Walking Skeleton');
```

Also added `data-testid="skeleton-heading"` to `CardTitle` in `src/routes/skeleton/+page.svelte`:
```svelte
<CardHeader><CardTitle data-testid="skeleton-heading">{m.skeleton_title()}</CardTitle></CardHeader>
```

---

## Recommendations (Should Fix)

### 1. Remove `1.9-E2E-A11Y` when `1.9-E2E-004` is activated

**Severity**: P2 (Medium)
**Location**: `tests/e2e/walking-skeleton.spec.ts:63-90` (A11Y) and lines `236-258` (E2E-004)
**Criterion**: Duplicate coverage guard (test-levels-framework.md)

**Issue Description**:
`1.9-E2E-A11Y` (currently active) and `1.9-E2E-004` (RED-phase skip) both run axe-core against `/skeleton` with nearly identical tag scopes. The A11Y test uses 4 WCAG tags (`wcag2a, wcag2aa, wcag21a, wcag21aa`); E2E-004 uses `['wcag2aa']` only. Once E2E-004 is activated as part of the "Full Stack Verification" task:

- Remove `1.9-E2E-A11Y` (it was a temporary smoke gate)
- E2E-004 uses the broader tag set — or standardize to match the a11y-smoke.spec.ts pattern

**Priority**: Address during "Task: Full Stack Verification" when E2E-004 is activated.

---

### 2. Non-canonical test IDs for activated tests

**Severity**: P2 (Medium)
**Location**: `tests/e2e/walking-skeleton.spec.ts:49, 63`
**Criterion**: Test IDs — traceability

**Issue Description**:
`1.9-E2E-TITLE` and `1.9-E2E-A11Y` are outside the canonical ATDD tracking scheme (`1.9-E2E-001` through `1.9-E2E-008`). These tests were added as implementation-phase smoke gates but are not tracked in the ATDD checklist. This makes it harder to trace CI failures back to story ACs.

**Recommended approach** when fully activating the story:
- Either rename `1.9-E2E-TITLE` to align with `1.9-E2E-001` (the canonical title/render test) once that test is activated
- Or document them explicitly in the ATDD checklist as additional smoke gates

**Priority**: P2 — does not block CI but affects traceability.

---

### 3. `1.9-E2E-001` asserts `html[lang="th"]` — locale may be `en` in dev

**Severity**: P2 (Medium, for activation)
**Location**: `tests/e2e/walking-skeleton.spec.ts:118`
**Criterion**: Determinism

**Issue Description**:
`1.9-E2E-001` (currently skipped) asserts `htmlLang === 'th'`. In a local dev environment, the Paraglide middleware sets the locale from the `Accept-Language` request header, which defaults to `en` in Playwright. This assertion will fail unless the test explicitly sets the locale header or uses a Thai-locale baseURL.

**Recommended fix** (for activation):
```typescript
// Option A: Force Thai locale via Accept-Language header
await page.setExtraHTTPHeaders({ 'Accept-Language': 'th' });
await page.goto('/skeleton');

// Option B: Assert lang is set (any valid locale) — consistent with 1.8-INT-003
const htmlLang = await page.locator('html').getAttribute('lang');
expect(htmlLang, 'lang must be a valid BCP 47 tag').toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
```

The comment in the test says "expected 'th'" — this is the production requirement. Choose Option A when activating if Thai locale is set via default Accept-Language in the running stack.

---

### 4. INT-002 polling uses raw pg-boss SQL insert — clarify activation note

**Severity**: P3 (Low)
**Location**: `tests/integration/walking-skeleton.test.ts:186-196`
**Criterion**: Maintainability

**Issue Description**:
INT-002 uses a raw `INSERT INTO pgboss.job` SQL as a fallback because `enqueueJob` may not be exported when the test is first activated. The comment correctly instructs developers to "replace with `enqueueJob()`" during activation. However, the fallback SQL uses a now-dated pg-boss v8 column set (missing `origin`, `expirein` typed as `interval` string). If pg-boss upgrades between now and activation, the fallback SQL may fail.

**Recommended**: When activating INT-002, replace the raw SQL with `enqueueJob()` immediately — the fallback is only for the initial compile check. Add a `// TODO: remove raw SQL — replace with enqueueJob() on activation` comment to make this mandatory.

---

## Best Practices Found

### 1. `finally`-block cleanup with fresh pool connections

**Location**: `tests/integration/walking-skeleton.test.ts:140-149, 275-281`
**Pattern**: Isolated cleanup via separate pool connection

```typescript
// ✅ Excellent: finally block ensures cleanup even after transaction errors
} finally {
    await client.query(`DELETE FROM bookings WHERE room_id = $1`, [testRoomId]).catch(() => {});
    await client.query(`DELETE FROM audit_log WHERE entity_id = $1`, [testRoomId]).catch(() => {});
    client.release();
}
// For INT-003: uses pool.query (fresh connection) when client is in aborted state
await pool.query(`DELETE FROM bookings WHERE room_id = $1`, [testRoomId]).catch(() => {});
```

This correctly handles the case where the client connection is in an aborted transaction state after an expected Postgres error (23P01) — the pool.query creates a fresh connection for cleanup.

---

### 2. Descriptive assertion failure messages for infrastructure tests

**Location**: All integration tests

```typescript
// ✅ Excellent: actionable failure messages
expect(
    result.rows.length,
    'No EXCLUDE constraint found on bookings table after Story 1.9 migration — ' +
    'a migration may have accidentally dropped the constraint (AC-3: build-gate)'
).toBeGreaterThan(0);
```

Every `expect()` call includes a message that:
- States what was expected and why
- References the AC or PR that covers the behavior
- Provides a debugging hint

---

### 3. Sentinel UUIDs for test data isolation

**Location**: `tests/integration/walking-skeleton.test.ts` (all 5 tests)

```typescript
// ✅ Excellent: deterministic sentinel UUIDs prevent cross-test conflicts
const testRoomId = '00000000-1909-0001-0000-000000000001'; // 1.9-INT-001 sentinel
const testRoomId = '00000000-1909-0003-0000-000000000001'; // 1.9-INT-003 sentinel
const testRoomId = '00000000-1909-0004-0000-000000000001'; // 1.9-INT-004 sentinel
```

Each test uses a unique, story-namespaced sentinel UUID. This:
- Is fully deterministic (no `faker.uuid()` needed here)
- Makes DB state debuggable (can filter by `room_id = '00000000-1909-*'`)
- Prevents cross-test data contamination
- Avoids EXCLUDE constraint conflicts between tests (different room UUIDs)

---

## Test File Analysis

### `tests/e2e/walking-skeleton.spec.ts`

- **File Size**: 415 lines (post-fix), ~11 KB
- **Test Framework**: Playwright
- **Language**: TypeScript
- **Describe Blocks**: 6 (`test.describe`)
- **Test Cases**: 10 (2 activated, 8 RED-phase skipped)
- **Fixtures Used**: `page` (Playwright built-in), `AxeBuilder` (@axe-core/playwright)
- **Data Factories**: None (probe-style route testing, no data setup needed)

**Test Scope:**

| Test ID | Priority | Status |
|---------|----------|--------|
| 1.9-E2E-TITLE | P0 | Active ✅ |
| 1.9-E2E-A11Y | P1 | Active ✅ |
| 1.9-E2E-001 | P0 | RED (skipped) |
| 1.9-E2E-002 | P0 | RED (skipped) |
| 1.9-E2E-003 | P0 | RED (skipped) |
| 1.9-E2E-004 | P1 | RED (skipped) |
| 1.9-E2E-005 | P1 | RED (skipped) |
| 1.9-E2E-006 | P1 | RED (skipped) |
| 1.9-E2E-007 | P2 | RED (skipped) |
| 1.9-E2E-008 | P3 | RED (skipped) |

### `tests/integration/walking-skeleton.test.ts`

- **File Size**: 398 lines, ~15 KB
- **Test Framework**: Vitest
- **Language**: TypeScript
- **Describe Blocks**: 5 (one per scenario)
- **Test Cases**: 5 (all RED-phase skipped)
- **Fixtures Used**: `pg.Pool` (module-level), `beforeAll`/`afterAll` for pool lifecycle
- **Data Factories**: None (raw SQL with sentinel UUIDs)

**Test Scope:**

| Test ID | Priority | Status |
|---------|----------|--------|
| 1.9-INT-001 | P0 | RED (skipped) |
| 1.9-INT-002 | P0 | RED (skipped) |
| 1.9-INT-003 | P0 | RED (skipped) |
| 1.9-INT-004 | P1 | RED (skipped) |
| 1.9-INT-005 | P1 | RED (skipped) |

---

## Context and Integration

### Related Artifacts

- **ATDD Checklist**: [`_bmad-output/test-artifacts/atdd-checklist-1-9-walking-skeleton-vertical-slice.md`](../atdd-checklist-1-9-walking-skeleton-vertical-slice.md)
- **Story**: Epic 1, Story 1.9 — Walking-skeleton Vertical Slice (GH Issue #9)
- **Implementation**: `src/routes/skeleton/+page.svelte` + `+page.server.ts` (present and implemented)
- **Paraglide keys**: `skeleton_title`, `skeleton_description`, `skeleton_insert_label`, `skeleton_job_label` — all compiled ✅
- **svelte-check**: 0 errors, 0 warnings ✅

### Paraglide Type Issue — Final Verdict

**The IDE TypeScript errors were FALSE POSITIVES.** All four keys (`skeleton_title`, `skeleton_description`, `skeleton_insert_label`, `skeleton_job_label`) are present in:
- `messages/en.json` and `messages/th.json`
- Compiled into `src/lib/paraglide/messages/` (separate `.js` files + `_index.js` re-exports)

`npm run check` (svelte-check) confirms: **0 errors, 0 warnings**. The IDE was likely showing stale cache errors before the Paraglide runtime was regenerated. The runtime was already up to date.

---

## Fixes Applied During This Review

| File | Change | Reason |
|------|--------|--------|
| `src/routes/skeleton/+page.svelte` | Added `data-testid="skeleton-heading"` to `CardTitle` | Enable resilient selector in E2E test; aligns with ATDD checklist spec |
| `tests/e2e/walking-skeleton.spec.ts` | Replaced `page.locator('h3').first()` with `page.locator('[data-testid="skeleton-heading"]')` + `await expect(locator).toBeVisible()` assertion | CardTitle renders `<div>`, not `<h3>` — old selector was silently broken |

`npm run check` confirms 0 errors after both changes.

---

## Next Steps

### Immediate Actions (Applied — No Further Action Required)

1. ~~**Fix `h3.first()` selector**~~ — ✅ Done during this review

### Follow-up Actions (For Activation Tasks)

1. **Remove `1.9-E2E-A11Y`** when activating `1.9-E2E-004` ("Full Stack Verification" task)
   - Priority: P2
   - Target: Story 1.9 green-phase activation

2. **Force Thai locale** in `1.9-E2E-001` when activating
   - Priority: P2
   - Solution: `await page.setExtraHTTPHeaders({ 'Accept-Language': 'th' })` before `page.goto`

3. **Replace raw pg-boss SQL** in `1.9-INT-002` with `enqueueJob()` when activating
   - Priority: P1 (must do before activation)
   - Target: "Implement Skeleton Form Action" task

### Re-Review Needed?

✅ No re-review needed — the one HIGH-severity defect was fixed during this review. Remaining items are P2/P3 follow-ups for the activation phase.

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
The Story 1.9 test suite is well-constructed for a RED-phase ATDD scaffold. The one real defect (broken `h3.first()` selector in the activated smoke test) was identified and fixed during this review — the test now uses a resilient `data-testid` selector that matches the actual rendered DOM. The remaining findings are low-risk activation-phase notes, not blockers.

The activated tests (`1.9-E2E-TITLE` and `1.9-E2E-A11Y`) provide meaningful CI coverage of the implemented skeleton route: heading text content and zero WCAG violations. The integration tests are thorough RED-phase scaffolds that will provide strong guardrails when activated.

> Test quality is Good (84/100). The critical selector defect was resolved. Follow-up items (A11Y duplication, locale forcing, pg-boss SQL replacement) are activation-phase tasks, not merge blockers.

---

## Review Metadata

**Generated By**: BMad TEA Agent (Master Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-1-9-walking-skeleton-vertical-slice-20260611
**Timestamp**: 2026-06-11
**Version**: 1.0
**Story**: 1.9 — Walking-skeleton Vertical Slice
**Epic**: 1 — Foundation & Walking Skeleton
