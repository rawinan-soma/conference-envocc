---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-12'
storyId: '2.7'
storyKey: 2-7-authorization-negative-test-pattern-audit-on-mutations
storyFile: >-
  _bmad-output/implementation-artifacts/2-7-authorization-negative-test-pattern-audit-on-mutations.md
atddChecklistPath: >-
  _bmad-output/test-artifacts/atdd-checklist-2-7-authorization-negative-test-pattern-audit-on-mutations.md
generatedTestFiles:
  - tests/support/helpers/idor-template.ts
  - tests/integration/idor.test.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/2-7-authorization-negative-test-pattern-audit-on-mutations.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-2.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad/tea/config.yaml
  - tests/integration/auth-guard.test.ts
  - tests/integration/profile.test.ts
  - tests/support/helpers/mock-event.ts
  - tests/support/helpers/dev-bypass.ts
  - tests/support/fixtures/pg-factory.ts
  - src/lib/server/auth/guards.ts
---

# ATDD Checklist: Story 2.7 — Authorization Negative-Test Pattern & Audit on Mutations

**Date:** 2026-06-12
**Author:** Rawinan (BMad TEA Agent)
**Story:** 2.7 — Authorization Negative-Test Pattern & Audit on Mutations
**Stack:** fullstack (SvelteKit + Vitest + Playwright)
**Generation Mode:** AI Generation (sequential)
**TDD Phase:** RED (scaffolds with `test.skip()`)

---

## TDD Red Phase Status

All tests are in red-phase scaffolds.

- API / Integration Tests: 3 tests in `tests/integration/idor.test.ts` (all `test.skip()`)
- Profile Audit Tests: 3 tests in `tests/integration/profile.test.ts` (updated from Story 2.3)
- Helper: `tests/support/helpers/idor-template.ts` (new — reusable IDOR template)

---

## Acceptance Criteria Coverage

| AC | Description | Test ID | Test Level | File | Status |
|----|-------------|---------|-----------|------|--------|
| AC-1 | Non-owner organizer denied when accessing owner-scoped resource; testOwnershipEnforcement correctly asserts | 2.7-INT-001 | Integration/Unit | `tests/integration/idor.test.ts` | RED (test.skip) |
| AC-2 | Forged/guessed resource ID → 403 or 404; template exercises GET and mutation paths | 2.7-UNIT-001, 2.7-INT-001b | Integration/Unit | `tests/integration/idor.test.ts` | RED (test.skip) |
| AC-3 | testOwnershipEnforcement at `tests/support/helpers/idor-template.ts`; importable by E3–E7 | 2.7-UNIT-001 | Unit/Static | `tests/integration/idor.test.ts` | RED (test.skip) |
| AC-4 | Profile create → audit_log row (entity=user_profile, action=create, actor_id, diff non-null) | 2.7-INT-002 | Integration/HTTP | `tests/integration/profile.test.ts` | RED (test.skipIf) |
| AC-5 | Profile update → audit_log row (action=update, diff with changed fields) | 2.7-INT-003 | Integration/HTTP | `tests/integration/profile.test.ts` | RED (test.skipIf) |
| AC-6 | Profile create rollback → no audit_log row written (atomic rollback guarantee) | 2.7-INT-004 | Integration/Service | `tests/integration/profile.test.ts` | RED (active test — service import) |
| AC-7 | At least one ownership-enforcement proof passes green using user_profiles resource | 2.7-INT-001 | Integration/Unit | `tests/integration/idor.test.ts` | RED (test.skip) |

---

## Generated Files

### NEW FILES (Story 2.7)

#### `tests/support/helpers/idor-template.ts`

Reusable IDOR ownership negative-test helper. Exports:
- `OwnershipTestConfig` interface
- `testOwnershipEnforcement(config: OwnershipTestConfig): Promise<void>` function

Usage: Import in E3–E7 integration tests to assert non-owner access is denied (403/404) without duplicating guard assertion logic.

Key design choices:
- `redirect: 'manual'` — captures raw HTTP status codes without following redirects
- `expectedDenialStatuses` defaults to `[403, 404]` — configurable for edge cases
- Throws descriptive error on unexpected success (e.g. 200 = IDOR bypass)
- JSDoc includes two-user seeding pattern note (dev bypass cannot produce two distinct users)

#### `tests/integration/idor.test.ts`

IDOR negative-test integration test file. Contains:

| Test ID | Priority | Title | Status |
|---------|----------|-------|--------|
| 2.7-INT-001 | P0 | testOwnershipEnforcement helper: assertOwner denies non-owner (unit-level mock) | `test.skip` |
| 2.7-UNIT-001 | P2 | testOwnershipEnforcement helper interface covers GET, PATCH, DELETE methods | `test.skip` |
| 2.7-INT-001b | P0 | HTTP-level ownership proof stub (future — E4 routes not yet created) | `test.skip` |

### MODIFIED FILES (Story 2.7 Task 3)

#### `tests/integration/profile.test.ts`

Three audit-log tests were already seeded in Story 2.3. Updated per Story 2.7 Task 3:

| Test ID | Change | Reason |
|---------|--------|--------|
| 2.7-INT-002 | Changed `test(` → `test.skipIf(!process.env['DEV_SERVER_URL'])(` | HTTP-based test; needs running dev server |
| 2.7-INT-003 | Changed `test(` → `test.skipIf(!process.env['DEV_SERVER_URL'])(` | HTTP-based test; needs running dev server |
| 2.7-INT-004 | Updated "THIS TEST WILL FAIL" comment to "ACTIVE — Story 2.7 done" | Direct service import; no dev server needed |

---

## Test Strategy

**Detected Stack:** fullstack (SvelteKit + Vitest + Playwright)
**Generation Mode:** AI Generation (sequential)

### Test Level Selection

Story 2.7 is primarily a test-infrastructure story. All source code (guards, audit, profile service) is already implemented from prior stories. Tests are:

1. **Unit/Integration (mock-level):** `2.7-INT-001` and `2.7-UNIT-001` — use `makeMockEvent` pattern to test `assertOwner` directly. No HTTP server needed. Consistent with `2.5-INT-003` in auth-guard.test.ts.

2. **Integration/HTTP (skipIf):** `2.7-INT-002` and `2.7-INT-003` — require `DEV_SERVER_URL`. Added `test.skipIf(!process.env['DEV_SERVER_URL'])` guards matching the auth-guard.test.ts pattern.

3. **Integration/Service (always-run):** `2.7-INT-004` — direct `createProfile` import; no HTTP. Runs in all CI environments.

### IDOR Template Design: Epic 2 Rationale

Epic 2 has no resource-ID-in-URL routes (`/profile` is per-session, not `/profile/:id`). The first owner-scoped-by-ID route is `/bookings/[id]` in Epic 4. For the Epic 2 proof, `2.7-INT-001` uses unit-level `assertOwner` mock — same approach as `2.5-INT-003`. The HTTP-level stub `2.7-INT-001b` is provided as a reference pattern for E4 implementors.

---

## Next Steps (Task-by-Task Activation)

During Story 2.7 implementation:

### Task 1: Activate `2.7-INT-001` in `tests/integration/idor.test.ts`

```bash
# In tests/integration/idor.test.ts, change:
test.skip('[P0] 2.7-INT-001 — ...', async () => {
# to:
test('[P0] 2.7-INT-001 — ...', async () => {
```

Run: `bun run test:integration -- --reporter=verbose`

Verify it FAILS first (red), then passes after Task 1 is implemented (the helper already exists, so activating the test should pass immediately).

### Task 2: Activate `2.7-UNIT-001` in `tests/integration/idor.test.ts`

```bash
# Change test.skip('[P2] 2.7-UNIT-001 ...' → test('[P2] 2.7-UNIT-001 ...'
```

### Task 3: Verify `2.7-INT-002/003/004` in `tests/integration/profile.test.ts`

```bash
# Run with DEV_SERVER_URL set:
DEV_SERVER_URL=http://localhost:3000 bun run test:integration -- --reporter=verbose

# 2.7-INT-002 and 2.7-INT-003 will run when DEV_SERVER_URL is set
# 2.7-INT-004 always runs (direct service import)
```

Verify all three pass green (profile service with audit wiring was implemented in Story 2.3).

### Task 4: Quality Gates

```bash
bunx prettier --write . && bun run lint   # zero errors
bun run check                             # zero TS errors (excluding pre-existing)
bun run test                              # all Story 2.7 tests pass
bun run build                             # clean build
```

---

## Risk Coverage

| Risk ID | Description | Test Coverage | Status |
|---------|-------------|---------------|--------|
| R-003 | IDOR negative-test template: `assertOwner` bypassable via forged/guessed IDs | `2.7-INT-001` (unit-level); `2.7-INT-001b` stub for E4+ HTTP-level | CLOSES R-003 |
| R-011 | Audit-log write missing on profile mutations | `2.7-INT-002/003/004` in `profile.test.ts` | CLOSES R-011 |

---

## Implementation Notes

### Files to Create (Story 2.7)

| File | Action | AC |
|------|--------|-----|
| `tests/support/helpers/idor-template.ts` | CREATED (red-phase) | AC-1, 2, 3, 7 |
| `tests/integration/idor.test.ts` | CREATED (red-phase) | AC-1, 2, 3, 7 |

### Files to Verify / Updated (Story 2.7 Task 3)

| File | Action | AC |
|------|--------|-----|
| `tests/integration/profile.test.ts` | UPDATED — `test.skipIf` + comment updates | AC-4, 5, 6 |

### Files NOT to Touch

| File | Reason |
|------|--------|
| `src/hooks.server.ts` | Already correct (Story 2.5) |
| `src/lib/server/auth/guards.ts` | Already correct |
| `src/lib/server/services/profile-service.ts` | Already implements audit wiring |
| `src/lib/server/services/audit.ts` | Already correct |

---

## ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-2-7-authorization-negative-test-pattern-audit-on-mutations.md`
- **IDOR Helper:** `tests/support/helpers/idor-template.ts`
- **IDOR Test:** `tests/integration/idor.test.ts`
- **Profile Audit Tests:** `tests/integration/profile.test.ts` (lines 769–1017)
- **Story File:** `_bmad-output/implementation-artifacts/2-7-authorization-negative-test-pattern-audit-on-mutations.md`

---

## Summary Statistics

- **Total red-phase tests generated:** 6
  - Integration/Unit (idor.test.ts): 3 (`test.skip()`)
  - Integration/HTTP (profile.test.ts): 2 (`test.skipIf()`)
  - Integration/Service (profile.test.ts): 1 (active test — always runs)
- **New helper created:** 1 (`idor-template.ts`)
- **Existing file updated:** 1 (`profile.test.ts`)
- **Acceptance criteria covered:** 7/7
- **Risk mitigations:** R-003 (IDOR template) + R-011 (audit trail) both closed by Story 2.7

---

**Generated by:** BMad TEA Agent — ATDD Workflow
**Workflow:** `bmad-testarch-atdd`
**Version:** 6.8.0 (BMad v6)
**Story:** 2.7 — Authorization Negative-Test Pattern & Audit on Mutations
**Mode:** Create (sequential)
**Phase:** RED — Test scaffolds generated, awaiting developer activation
