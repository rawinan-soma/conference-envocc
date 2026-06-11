---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-10'
storyId: '1.6'
storyKey: '1-6-audit-log-write-hook-foundation'
storyFile: '_bmad-output/implementation-artifacts/1-6-audit-log-write-hook-foundation.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-6-audit-log-write-hook-foundation.md'
generatedTestFiles:
  - src/lib/server/db/schema/audit-log.test.ts
  - src/lib/server/services/audit.test.ts
  - src/lib/server/services/audit.integration.test.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/1-6-audit-log-write-hook-foundation.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-1.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad/tea/config.yaml
tddPhase: RED
---

# ATDD Checklist — Story 1.6: Audit-log write-hook foundation

**Date:** 2026-06-10
**Story ID:** 1.6
**Story Key:** 1-6-audit-log-write-hook-foundation
**TDD Phase:** RED (all tests skipped — implementation pending)
**Workflow:** bmad-testarch-atdd
**Execution Mode:** SEQUENTIAL (unit → integration)
**Stack:** fullstack (detected: SvelteKit + Bun; no UI surface for this story — unit/integration tests only)

---

## Story Summary

> As a developer, I want an `audit_log` table and a transactional audit-write helper, so that every later mutation can record actor/entity/action/diff in the same transaction.

**Note:** This is a pure server-side infrastructure story with no UI surface. All tests are Vitest unit and integration tests. No Playwright/E2E tests are generated for this story.

---

## TDD Red Phase — Current Status

All scaffolds are generated with `test.skip()`.

| File | Tests | Priority Coverage | Status |
|------|-------|-------------------|--------|
| `src/lib/server/db/schema/audit-log.test.ts` | 9 | P1×9 | RED (skipped) |
| `src/lib/server/services/audit.test.ts` | 7 | P1×6, P2×1 | RED (skipped) |
| `src/lib/server/services/audit.integration.test.ts` | 3 | P1×3 | RED (skipped, Story 1.8) |
| **Total** | **19** | **P1×18, P2×1** | **RED** |

---

## Acceptance Criteria Coverage

| AC | Description | Test IDs | Level | Status |
|----|-------------|----------|-------|--------|
| AC-1 | `audit_log` table exists with 6 correct columns after migration | 1.6-UNIT-001 through 1.6-UNIT-001i | Unit (schema shape) | RED |
| AC-2 | `writeAuditLog(tx, entry)` writes atomically in the same transaction | 1.6-UNIT-002, 1.6-INT-001 | Unit + Integration | RED |
| AC-3 | No `audit_log` row when transaction rolls back | 1.6-INT-002 | Integration | RED |
| AC-4 | Helper accepts correct types; rejects missing required fields at TS level | 1.6-UNIT-002 through 1.6-UNIT-003 | Unit | RED |
| AC-5 | `bun run lint`, `bun run check`, `bun run test` all exit 0 | Quality gate tests (activate last) | Unit | N/A (CI verified) |

---

## Test File Details

### `src/lib/server/db/schema/audit-log.test.ts`

**Covers:** AC-1 — schema shape verification via `getTableConfig` from `drizzle-orm/pg-core`

| Test ID | Description | Priority |
|---------|-------------|----------|
| [P1] 1.6-UNIT-001 | auditLog table name is "audit_log" | P1 |
| [P1] 1.6-UNIT-001b | auditLog table has exactly 6 columns | P1 |
| [P1] 1.6-UNIT-001c | id column is uuid and is the primary key | P1 |
| [P1] 1.6-UNIT-001d | created_at column is timestamptz, not null, has default | P1 |
| [P1] 1.6-UNIT-001e | actor_id column is text and nullable | P1 |
| [P1] 1.6-UNIT-001f | entity column is text and not null | P1 |
| [P1] 1.6-UNIT-001g | action column is text and not null | P1 |
| [P1] 1.6-UNIT-001h | diff column is jsonb and nullable | P1 |
| [P1] 1.6-UNIT-001i | AuditLogInsert type is exported from audit-log.ts | P1 |

**Activate when:** Task 2.1 complete (audit-log.ts created)

---

### `src/lib/server/services/audit.test.ts`

**Covers:** AC-2, AC-4 — `writeAuditLog` helper unit tests with mocked Drizzle transaction

| Test ID | Description | Priority |
|---------|-------------|----------|
| [P1] 1.6-UNIT-002 | writeAuditLog calls tx.insert(auditLog).values with correct args (actorId=user) | P1 |
| [P1] 1.6-UNIT-002b | writeAuditLog calls tx.insert with actorId=null (system action) | P1 |
| [P1] 1.6-UNIT-002c | writeAuditLog passes diff payload to tx.insert when provided | P1 |
| [P1] 1.6-UNIT-002d | writeAuditLog passes null diff when diff is omitted | P1 |
| [P1] 1.6-UNIT-002e | writeAuditLog returns Promise<void> (awaitable, no return value) | P1 |
| [P2] 1.6-UNIT-002f | writeAuditLog does not mutate the entry object | P2 |
| [P1] 1.6-UNIT-003 | audit.ts exports AuditLogEntry type (module-level existence check) | P1 |

**Strategy:** Mock `tx` object with `vi.fn()` spies — no real DB connection needed.
**Activate when:** Task 3 complete (audit.ts created with writeAuditLog)

---

### `src/lib/server/services/audit.integration.test.ts`

**Covers:** AC-2 (commit path), AC-3 (rollback path) — real Postgres required

| Test ID | Description | Priority |
|---------|-------------|----------|
| [P1] 1.6-INT-001 | writes audit_log row atomically in committed transaction (AC-2) | P1 |
| [P1] 1.6-INT-002 | no audit_log row persists when transaction rolls back (AC-3) | P1 |
| [P1] 1.6-INT-003 | writeAuditLog stores diff payload correctly in jsonb column (AC-2, AC-4) | P1 |

**Note:** Follows the `test.skip` pattern established in story 1.5. Activate in Story 1.8 when CI Postgres is wired.

---

## Activation Guide (Task-by-Task)

During implementation of each task, activate the corresponding tests:

### Task 2.1 — Create `audit-log.ts` schema
1. Remove `test.skip(` → `test(` in `src/lib/server/db/schema/audit-log.test.ts`
2. Run: `bun run test -- --run` — verify tests FAIL first (red)
3. Implement `src/lib/server/db/schema/audit-log.ts`
4. Run again — verify tests PASS (green)
5. Commit passing tests

### Task 3 — Create `audit.ts` service
1. Remove `test.skip(` → `test(` in `src/lib/server/services/audit.test.ts`
2. Run: `bun run test -- --run` — verify tests FAIL first (red)
3. Implement `src/lib/server/services/audit.ts` with `writeAuditLog`
4. Run again — verify tests PASS (green)
5. Commit passing tests

### Story 1.8+ — Integration tests
1. Remove `test.skip(` → `test(` in `src/lib/server/services/audit.integration.test.ts`
2. Ensure Postgres is running at `DATABASE_URL`
3. Run tests — verify FAIL then PASS

---

## Implementation Guidance

### Files to CREATE (this story only):

```
src/lib/server/
├── db/                              # NEW directory
│   ├── index.ts                     # Pool + drizzle() instance + DrizzleDb type
│   ├── schema.ts                    # Barrel re-export for drizzle-kit
│   └── schema/
│       ├── index.ts                 # Re-exports all per-domain schema modules
│       └── audit-log.ts             # auditLog table definition (tested by 1.6-UNIT-001*)
└── services/                        # NEW directory
    └── audit.ts                     # writeAuditLog helper (tested by 1.6-UNIT-002*)
```

### Key constraints from story notes:
- Use UUID v7 (`uuidv7()`) for `id` PK — NOT `crypto.randomUUID()` (v4)
- Use relative imports with `.js` extension throughout `src/lib/server/`
- `actor_id` is nullable text (no FK to users — users table doesn't exist yet)
- `diff` is jsonb, nullable — pass `null` when omitted (not `undefined`)
- Integration tests follow the `test.skip` pattern from story 1.5

---

## Next Steps

1. **Implement** the feature (Tasks 1–6 from story file)
2. **Activate tests** task-by-task as described above
3. **Run quality gates:** `bun run lint && bun run check && bun run test`
4. **After implementation:** run `/bmad-testarch-automate` to expand coverage

---

## ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-1-6-audit-log-write-hook-foundation.md`
- Unit tests: `src/lib/server/db/schema/audit-log.test.ts`
- Unit tests: `src/lib/server/services/audit.test.ts`
- Integration tests: `src/lib/server/services/audit.integration.test.ts`
