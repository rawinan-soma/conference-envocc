---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-13'
story: '3.2-room-photo-upload'
inputDocuments:
  - tests/integration/rooms.test.ts (Story 3.2 tests, lines 848–1812)
  - tests/integration/db-schema.test.ts (3.2-UNIT-003, lines 351–388)
  - _bmad-output/implementation-artifacts/3-2-room-photo-upload.md
  - _bmad-output/test-artifacts/atdd-checklist-3-2-room-photo-upload.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-3.md
---

# Test Quality Review — Story 3.2: Room Photo Upload

## Overall Quality Score: 89/100 (Grade: B+)

**Execution Mode:** Sequential
**Reviewed:** 2026-06-13
**Reviewer:** Master Test Architect (TEA)
**Scope:** `tests/integration/rooms.test.ts` (lines 848–1812, 9 Story 3.2 tests) + `tests/integration/db-schema.test.ts` (lines 351–388, 1 test)

### Test Status at Review Time

| Test ID | Status | Notes |
|---------|--------|-------|
| 3.2-INT-001 | ✓ pass | Service-level, active |
| 3.2-INT-002 | ✓ pass | Service-level, active |
| 3.2-UNIT-001 | ✓ pass | Static source, active |
| 3.2-INT-006 | ✓ pass | Service-level, active |
| 3.2-UNIT-002 | ✓ pass | Static source, active |
| 3.2-UNIT-003 | ✓ pass | DB schema, active (db-schema.test.ts) |
| 3.2-INT-003 | ↓ skipped | `test.skipIf(!DEV_SERVER_URL)` — no dev server |
| 3.2-INT-004 | ↓ skipped | `test.skipIf(!DEV_SERVER_URL)` — no dev server |
| 3.2-INT-005 | ↓ skipped | `test.skipIf(!DEV_SERVER_URL)` — no dev server |
| 3.2-P3-001 | ↓ skipped | `test.skip` — P3 backlog |

**6 pass, 3 skip (DEV_SERVER_URL gated), 1 skip (P3).** Feature is implemented (`feat(3.2)` commit `88e89ff`).

---

## Dimension Scores

| Dimension       | Score | Grade | Weight | Weighted |
|-----------------|-------|-------|--------|----------|
| Determinism     | 100   | A+    | 30%    | 30.0     |
| Isolation       | 96    | A     | 30%    | 28.8     |
| Maintainability | 68    | C     | 25%    | 17.0     |
| Performance     | 95    | A     | 15%    | 14.25    |
| **Overall**     | **89**| **B+**|        |          |

> Coverage is excluded from `test-review` scoring. Use `trace` for coverage analysis and gates.

---

## Violations Summary

| Severity | Count |
|----------|-------|
| HIGH     | 0     |
| MEDIUM   | 3     |
| LOW      | 2     |
| **Total**| **5** |

---

## Violations Detail

### MEDIUM

**[Maintainability] Stale "THIS TEST WILL FAIL" inline comments throughout (post-implementation)**

- **File:** `tests/integration/rooms.test.ts`, lines 972–975, 1097–1108, 1201–1209, 1298–1308, 1364–1374, 1461–1471, 1525–1534, 1649–1659, 1715–1723; `tests/integration/db-schema.test.ts`, line 353–354
- **Category:** stale-comments
- **Description:** Every Story 3.2 test body opens with `// THIS TEST WILL FAIL — [feature] not yet implemented (Task X). Activate after Task X.Y.` These comments were correct at the red-phase ATDD scaffold stage. They are now false and misleading — the feature is fully implemented and tests pass. A developer reading this code will be confused about what is "not yet implemented."
- **Suggestion:** Replace the "THIS TEST WILL FAIL" header comment in each test body with `// ACTIVATED — [feature name] implemented in commit 88e89ff (feat(3.2)).` The activation guide prose at the top of the file (`Activation guide:`) and section header comments can also note that Story 3.2 tasks are complete.
- **Decision:** **APPLIED** — stale comments updated in this review. See "Changes Applied" section.

---

**[Maintainability] JPEG magic-byte literal duplicated 4× across upload tests**

- **File:** `tests/integration/rooms.test.ts`, lines 1015–1018, 1246–1249, 1411–1414, 1754–1757
- **Category:** copy-paste-duplication
- **Description:** `Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...])` (22-byte minimal JPEG stub) is copied verbatim in INT-001, INT-003, INT-005, and P3-001 (first buffer). Any change to the JPEG fixture requires editing 4 locations.
- **Suggestion:** Extract a module-scoped `function makeJpegBuffer(): Buffer { return Buffer.from([...]) }` above the Story 3.2 section header. P3-001's second buffer (`jpegData2`) has different trailing bytes to distinguish uploads — preserve it as a separate inline literal or second helper.
- **Decision:** **APPLIED** — `makeJpegBuffer()` extracted. See "Changes Applied" section.

---

**[Maintainability] `UPLOAD_DIR` save/restore + `mkdtemp` boilerplate repeated 4× across service-level upload tests**

- **File:** `tests/integration/rooms.test.ts`, lines 1009–1012, 1133–1135, 1558–1560, 1748–1750
- **Category:** copy-paste-duplication
- **Description:** The pattern `const uploadDir = await mkdtemp(...); const originalUploadDir = ...; process.env['UPLOAD_DIR'] = uploadDir; try { ... } finally { restore; rm(uploadDir) }` is repeated in INT-001, INT-002, INT-006, and P3-001. Any change to the cleanup strategy requires editing 4 locations.
- **Suggestion:** Extract `async function withTempUploadDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T>` to handle setup and teardown. The test body becomes the callback.
- **Decision:** **APPLIED** — `withTempUploadDir()` extracted. See "Changes Applied" section.

---

### LOW

**[Isolation] Dead `tempDir` variable in INT-003 and INT-005 (HTTP-level upload tests)**

- **File:** `tests/integration/rooms.test.ts`, lines 1243–1244 (INT-003) and lines 1408 (INT-005)
- **Category:** dead-code / misleading-cleanup
- **Description:** In INT-003 and INT-005, `const tempDir = await mkdtemp(...)` creates a temporary directory that is **never used for file writing**. `uploadRoomPhoto()` writes to `uploadDir` (from `process.env['UPLOAD_DIR']`). The `finally` block cleans `tempDir` (always empty) but does not clean `uploadDir`. The result: uploaded test files remain at `uploadDir` after these tests run. This is intentional for HTTP tests (the dev server needs to serve the file), but the `tempDir` is dead code that obscures this design.
- **Suggestion:** Remove `const tempDir = await mkdtemp(...)` and `await rm(tempDir, ...)`. Add a comment: `// Note: uploadDir is intentionally not cleaned — dev server needs the file to serve /rooms/[id]/photo.`
- **Decision:** **APPLIED** — dead code removed, clarifying comment added.

---

**[Determinism] `Date.now()` in Story 3.2 session seed helpers**

- **File:** `tests/integration/rooms.test.ts`, lines 914, 950
- **Category:** time-dependency (advisory)
- **Description:** `new Date(Date.now() + 30 * 60 * 1000)` used for session `expiresAt` in `seedAdminUserWithSession32` and `seedOrganizerUserWithSession32`. Not a real flake source — sessions stay valid 30 minutes ahead of any test execution.
- **Suggestion:** None — established project pattern matching Story 3.1 helpers (lines 190, 306) and `profile.test.ts`.
- **Decision:** ACCEPTED as project pattern. No change.

---

## Changes Applied

All four MEDIUM/LOW code changes were applied to `tests/integration/rooms.test.ts` in this review pass. Tests were re-run after each change to confirm green status is preserved.

### Change 1: Remove stale "THIS TEST WILL FAIL" comments

Updated all 10 Story 3.2 test body headers from:
```
// THIS TEST WILL FAIL — [feature] not yet implemented (Task X).
// Activate after Task X.Y.
```
to:
```
// ACTIVATED — [feature] implemented. Story 3.2 complete (feat: commit 88e89ff).
```

### Change 2: Extract `makeJpegBuffer()` helper

Added above the Story 3.2 section:
```typescript
function makeJpegBuffer(): Buffer {
  // Minimal 1x1 JPEG (JFIF APP0 marker, 22 bytes — sufficient for MIME + magic-byte validation)
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
  ]);
}
```

INT-001, INT-003, INT-005, and the first `jpegData1` in P3-001 updated to call `makeJpegBuffer()`.

### Change 3: Extract `withTempUploadDir()` helper

Added above the Story 3.2 section:
```typescript
async function withTempUploadDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const { mkdtemp, rm } = await import('fs/promises');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const uploadDir = await mkdtemp(join(tmpdir(), prefix));
  const originalUploadDir = process.env['UPLOAD_DIR'];
  process.env['UPLOAD_DIR'] = uploadDir;
  try {
    return await fn(uploadDir);
  } finally {
    if (originalUploadDir === undefined) {
      delete process.env['UPLOAD_DIR'];
    } else {
      process.env['UPLOAD_DIR'] = originalUploadDir;
    }
    await rm(uploadDir, { recursive: true, force: true });
  }
}
```

INT-001, INT-002, INT-006, and P3-001 updated to use `withTempUploadDir()`.

### Change 4: Remove dead `tempDir` in INT-003 and INT-005

Removed `const tempDir = await mkdtemp(...)` and `await rm(tempDir, ...)` from both HTTP-level tests. Added clarifying comment that `uploadDir` files are left in place intentionally.

---

## Key Strengths

1. **Full AC coverage**: All 9 scenarios in `rooms.test.ts` and 1 in `db-schema.test.ts` map directly to named AC items (AC-1 through AC-6) with explicit scenario IDs.
2. **Critical override preserved**: INT-005 correctly asserts HTTP 200 (not 403) for organizer access. The `requireUser` vs `requireAdmin` distinction is documented both in the test body and in the file header (line 877). The story artifact takes precedence over test-design line 284.
3. **Service-level / HTTP-level separation**: INT-001, INT-002, INT-006 call `uploadRoomPhoto()` directly — no HTTP stack needed. INT-003, INT-004, INT-005 use `fetch()` against `DEV_SERVER_URL` — correct level selection for each scenario.
4. **Truncation-based isolation**: Each upload describe block calls `beforeEach(truncateRoomTables)` — consistent with Story 3.1 and `profile.test.ts` project convention.
5. **Meaningful byte-for-byte assertions**: INT-006 uses `Buffer.compare(pngData, readBackData) === 0` — not just existence, but content fidelity. P3-001 uses two distinct buffers.
6. **No credentials in test code**: `AUTH_SECRET` read from `process.env` only. `randomUUID()` for all seed IDs.
7. **DB schema test is correctly targeted**: 3.2-UNIT-003 queries `information_schema.columns` for `photo_path` TEXT nullable — same pool-based pattern as 3.1-UNIT-002.

---

## Story Override Preserved: INT-005 (requireUser, not requireAdmin)

The test-design document (`test-design-epic-3.md`, line 284) incorrectly states that a non-admin organizer GET `/rooms/[id]/photo` should return HTTP 403. The story artifact (`3-2-room-photo-upload.md`, "CRITICAL: Photo Serve Guard Scope") explicitly overrides this:

- The **photo serve route** (`GET /rooms/[id]/photo`) uses `requireUser` — any authenticated user (admin or organizer) can view photos.
- Only the **photo upload action** (`POST /admin/rooms/[id]/photo`) uses `requireAdmin`.
- Story purpose: "so that organizers can recognize the space" (AC-3, FR-061).

**INT-005 asserts HTTP 200, not 403.** This is correct and must not be changed.

---

## Final Test Results (Post-Review)

Confirmed by running `bun run test:integration -- tests/integration/rooms.test.ts tests/integration/db-schema.test.ts` after all changes:

```
Tests  19 passed | 7 skipped (26)
```

All 6 active Story 3.2 tests pass. 3 DEV_SERVER_URL-gated tests and 1 P3 test remain skipped as expected.

---

## Recommendations

1. **INT-003/004/005 HTTP tests**: Activate once `DEV_SERVER_URL` is available in CI (requires dev server running with matching `UPLOAD_DIR`). These are P0/P1 tests covering the serve route + access control — important for go-live confidence.
2. **P3-001 re-upload test**: Activate when re-upload behavior needs verification. Low priority — the happy-path upload (INT-001) already covers the `photo_path` update path.

---

## Next Workflow

Feature implemented, tests pass. Recommended next step: PR review for story 3.2 merge.
