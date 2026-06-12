---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-13'
story: '3.2-room-photo-upload'
inputDocuments:
  - tests/integration/rooms.test.ts (Story 3.2 stubs, lines 848–1812)
  - tests/integration/db-schema.test.ts (3.2-UNIT-003, lines 351–388)
  - _bmad-output/implementation-artifacts/3-2-room-photo-upload.md
  - _bmad-output/test-artifacts/atdd-checklist-3-2-room-photo-upload.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-3.md
---

# Test Quality Review — Story 3.2: Room Photo Upload

## Overall Quality Score: 91/100 (Grade: A)

**Execution Mode:** Sequential
**Reviewed:** 2026-06-13
**Reviewer:** Master Test Architect (TEA)
**Scope:** `tests/integration/rooms.test.ts` (lines 848–1812, 10 Story 3.2 stubs) + `tests/integration/db-schema.test.ts` (lines 351–388, 1 stub)

---

## Dimension Scores

| Dimension       | Score | Grade | Weight | Weighted |
|-----------------|-------|-------|--------|----------|
| Determinism     | 100   | A+    | 30%    | 30.0     |
| Isolation       | 96    | A     | 30%    | 28.8     |
| Maintainability | 72    | C     | 25%    | 18.0     |
| Performance     | 95    | A     | 15%    | 14.25    |
| **Overall**     | **91**| **A** |        |          |

> Coverage is excluded from `test-review` scoring. Use `trace` for coverage analysis and gates.

---

## Violations Summary

| Severity | Count |
|----------|-------|
| HIGH     | 0     |
| MEDIUM   | 2     |
| LOW      | 2     |
| **Total**| **4** |

---

## Violations Detail

### MEDIUM

**[Maintainability] JPEG magic-byte literal duplicated 4× across test stubs**

- **File:** `tests/integration/rooms.test.ts`, lines 1016, 1246–1248, 1411–1413, 1754–1756
- **Category:** copy-paste-duplication
- **Description:** `Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...])` (22-byte JPEG stub) is copied verbatim in INT-001, INT-003, INT-005, and P3-001 (first buffer). Any change to the JPEG fixture (e.g., adding valid JFIF length bytes) requires editing 4 locations.
- **Suggestion:** Extract a module-scoped `function makeJpegBuffer(): Buffer { return Buffer.from([...]) }` above the Story 3.2 section header. Each call site becomes a one-liner with no behavioral change. P3-001's second (`jpegData2`) uses different trailing bytes to distinguish uploads — preserve that distinct buffer.
- **Decision:** Recommended extraction in next dev pass. Not applied to this review to avoid touching verified-green (skip) test scaffolds. Implementation risk is negligible — mechanical renaming — but leaves the fix to the developer for when they activate INT-001.

---

**[Maintainability] `UPLOAD_DIR` save/restore + temp-dir boilerplate repeated 4× across upload stubs**

- **File:** `tests/integration/rooms.test.ts`, lines 1009–1012, 1133–1135, 1558–1560, 1748–1750
- **Category:** copy-paste-duplication
- **Description:** The pattern `const uploadDir = await mkdtemp(...); const originalUploadDir = process.env['UPLOAD_DIR']; process.env['UPLOAD_DIR'] = uploadDir; try { ... } finally { restore; rm(uploadDir) }` is repeated in INT-001, INT-002, INT-006, and P3-001. Any change to the cleanup strategy (e.g., using `using` declarations when Node supports them) requires editing 4 locations.
- **Suggestion:** Extract a helper function `async function withTempUploadDir<T>(fn: (dir: string) => Promise<T>): Promise<T>` that handles setup and teardown, with the test body passed as a callback. Behavioral parity is guaranteed; the tests become shorter and more readable.
- **Decision:** Recommended extraction in next dev pass. Not applied to this review — same reasoning as above.

---

### LOW

**[Isolation] Dead `tempDir` variable in INT-003 and INT-005 (HTTP-level upload tests)**

- **File:** `tests/integration/rooms.test.ts`, lines 1243–1244 and 1408
- **Category:** dead-code / misleading-cleanup
- **Description:** In INT-003 and INT-005, `const tempDir = await mkdtemp(...)` creates a temporary directory that is **never used for writing**. The `uploadRoomPhoto()` call writes to `uploadDir` (from `process.env['UPLOAD_DIR']`), but the `finally` block cleans `tempDir` (always empty) and does not clean `uploadDir`. The practical consequence: after the test runs, the uploaded file remains at `uploadDir` (which is either the dev server's configured path or `os.tmpdir()/tea-atdd-3.2-serve`). This is harmless in HTTP-level tests (where the dev server needs to serve the file), but `tempDir` is a dead variable that creates confusion about what is being cleaned up.
- **Suggestion:** Remove `const tempDir = await mkdtemp(...)` and `await rm(tempDir, ...)` from INT-003 and INT-005. Add a comment explaining that `uploadDir` is intentionally not cleaned (the dev server needs the file to serve it). The files in `uploadDir` are ephemeral test artifacts in the dev server's UPLOAD_DIR — a developer running these tests should be aware they leave files behind.
- **Decision:** Note for developer during Task 5 activation. Not applied to this review — the fix removes no behavioral assertions and the dead code causes no test failures or incorrect results.

---

**[Determinism] `Date.now()` in Story 3.2 session seed helpers**

- **File:** `tests/integration/rooms.test.ts`, lines 914, 950
- **Category:** time-dependency (advisory)
- **Description:** `new Date(Date.now() + 30 * 60 * 1000)` used for session `expiresAt` in `seedAdminUserWithSession32` and `seedOrganizerUserWithSession32`. Not a real flake source — sessions stay valid 30 minutes ahead of any test execution window.
- **Suggestion:** None — this is the established project pattern. Matches `seedAdminUser` / `seedOrganizerUser` helpers from Story 3.1 (lines 190, 306) and `profile.test.ts`.
- **Decision:** ACCEPTED as project pattern.

---

## Key Strengths

1. **Full AC coverage**: All 9 scenarios in `rooms.test.ts` and 1 in `db-schema.test.ts` map directly to named AC items (AC-1 through AC-6) with explicit scenario IDs. No gap between ATDD checklist and actual tests.
2. **Critical override preserved**: INT-005 correctly asserts HTTP 200 (not 403) for organizer access. The `requireUser` vs `requireAdmin` distinction is documented both in the test body and in the file header (line 877). The story artifact takes precedence over test-design line 284.
3. **Proper skip strategy**: Service-level tests use `test.skip()` (no runtime dependency). HTTP-level tests use `test.skipIf(!process.env['DEV_SERVER_URL'])` — CI-safe without a running dev server.
4. **Service-level / HTTP-level separation**: INT-001, INT-002, INT-006 call `uploadRoomPhoto()` directly — no HTTP stack needed. INT-003, INT-004, INT-005 use `fetch()` against `DEV_SERVER_URL` — correct level selection for each scenario.
5. **Proper env mutation isolation**: Every service-level upload test saves and restores `process.env['UPLOAD_DIR']` in a `finally` block. No cross-test env contamination.
6. **Truncation-based isolation**: Each upload describe block calls `beforeEach(truncateRoomTables)` — same pattern as Story 3.1 and `profile.test.ts`. Consistent with established project-wide convention.
7. **Meaningful byte-for-byte assertions**: INT-006 uses `Buffer.compare(pngData, readBackData) === 0` — not just existence, but content fidelity. P3-001 uses two distinct buffers to verify replacement semantics unambiguously.
8. **No credentials in test code**: `AUTH_SECRET` read from `process.env` only. `randomUUID()` for all seed IDs — no hardcoded user IDs or session tokens.
9. **DB schema test is correctly targeted**: 3.2-UNIT-003 in `db-schema.test.ts` queries `information_schema.columns` for `photo_path` TEXT nullable — same pool-based pattern as 3.1-UNIT-002. No ORM import needed.
10. **Story 3.1 tests are untouched**: All Story 3.2 stubs are appended after the Story 3.1 active tests at line 848. No Story 3.1 test behavior was modified.

---

## Story Override Preserved: INT-005 (requireUser, not requireAdmin)

The test-design document (`test-design-epic-3.md`, line 284) incorrectly states that a non-admin organizer GET `/rooms/[id]/photo` should return HTTP 403. The story artifact (`3-2-room-photo-upload.md`, "CRITICAL: Photo Serve Guard Scope") explicitly overrides this:

- The **photo serve route** (`GET /rooms/[id]/photo`) uses `requireUser` — any authenticated user (admin or organizer) can view photos.
- Only the **photo upload action** (`POST /admin/rooms/[id]/photo`) uses `requireAdmin`.
- Story purpose: "so that organizers can recognize the space" (AC-3, FR-061).

**INT-005 asserts HTTP 200, not 403.** This is correct and must not be changed. Any implementation that returns 403 for an authenticated organizer on the serve route is a bug.

---

## Recommendations

1. **INT-003 / INT-005 dead `tempDir`**: Before activating Task 5 tests, remove the unused `mkdtemp` / `rm(tempDir)` pair from both tests and add a comment explaining that `uploadDir` files are left in place intentionally (the dev server needs them to serve the photo). See LOW violation above.
2. **JPEG buffer extraction**: When activating INT-001 (Task 3), extract `makeJpegBuffer()` as a module-scoped helper. This is a 5-minute refactor that eliminates the 4× duplication before more tests are activated.
3. **`withTempUploadDir` helper**: After all service-level upload tests are activated and green, extract the UPLOAD_DIR save/restore boilerplate to a helper. Keep it in-file — no shared test-support module needed.
4. **Activation order reminder** (from ATDD checklist):
   - Task 1 → activate `3.2-UNIT-003` in `db-schema.test.ts`
   - Task 2 → activate `3.2-UNIT-002`
   - Task 3 → activate `3.2-INT-001`, `3.2-INT-002`, `3.2-INT-006`
   - Task 4 → activate `3.2-INT-004`, `3.2-UNIT-001`
   - Task 5 → activate `3.2-INT-003`, `3.2-INT-005` (requires `DEV_SERVER_URL`)

---

## No Code Changes Applied

All violations in this review are recommendations. No changes were applied to `rooms.test.ts` or `db-schema.test.ts`:

- The MEDIUM violations (JPEG buffer duplication, UPLOAD_DIR boilerplate) are mechanical refactors with no behavioral impact, recommended for the developer to apply during green-phase activation.
- The LOW violations (dead `tempDir`, `Date.now()` advisory) are non-blocking and documented as developer notes.
- The story overrides (INT-005 = 200, INT-002 service-level) are verified correct and must not be modified.

The test scaffolds are **production-ready** for red-phase ATDD use. CI remains green (all 10 new stubs are skipped).

---

## Next Workflow

Tests are ready for green-phase implementation. Recommended next step: `bmad-dev-story 3.2` — activate tests task-by-task per the activation order above (TDD red → green → refactor cycle).
