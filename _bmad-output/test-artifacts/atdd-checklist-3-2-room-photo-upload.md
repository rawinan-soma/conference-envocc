---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-13'
storyId: '3.2'
storyKey: 3-2-room-photo-upload
storyFile: _bmad-output/implementation-artifacts/3-2-room-photo-upload.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-3-2-room-photo-upload.md
generatedTestFiles:
  - tests/integration/rooms.test.ts
  - tests/integration/db-schema.test.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/3-2-room-photo-upload.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-3.md
  - _bmad/tea/config.yaml
  - tests/integration/rooms.test.ts
  - tests/integration/db-schema.test.ts
---

# ATDD Checklist — Story 3.2: Room Photo Upload

**Story:** 3.2 — Room Photo Upload  
**Date:** 2026-06-13  
**TDD Phase:** RED (all new tests skipped until implementation)  
**Stack:** fullstack (SvelteKit + Vitest + Testcontainers)

---

## Step 1: Preflight & Context Summary

### Stack Detection

`fullstack` — `package.json` with SvelteKit + Vite, `playwright.config.ts`, and backend services all present.

### Prerequisites Satisfied

- Story 3.2 status: `ready-for-dev` with clear acceptance criteria ✅
- `playwright.config.ts` present ✅
- `tests/integration/rooms.test.ts` exists (Story 3.1 pattern established) ✅
- `tests/integration/db-schema.test.ts` exists ✅
- Test framework config: Vitest integration + pg Testcontainers ✅

### Story Context

- **Story:** As an admin, I want to attach an optional photo to a room so that organizers can recognize the space.
- **Key files to create/modify:** `uploadRoomPhoto()` in room-service.ts, `photo_path` migration, photo serve route (`+server.ts`), admin upload action, routeGuard entry.
- **CRITICAL override:** `3.2-INT-005` MUST assert HTTP 200 (not 403) for organizer photo access. The test-design document (line 284) has this wrong; the story's "CRITICAL: Photo Serve Guard Scope" section is authoritative — serve route uses `requireUser`, not `requireAdmin`.

### TEA Config

- `tea_use_playwright_utils`: true (loaded but HTTP-level tests use raw `fetch`)
- `tea_use_pactjs_utils`: false
- `tea_browser_automation`: auto
- `tea_execution_mode`: auto → resolved to `sequential` (this agent)
- `test_stack_type`: auto → detected `fullstack`

---

## Step 2: Generation Mode

**Mode:** AI generation (sequential). All acceptance criteria are clear service/HTTP contracts. No E2E scenarios for Story 3.2 — this story adds no new UI pages that require browser recording for test scaffolding (photo upload form is a simple HTML form; tests are at service and HTTP integration level).

---

## Step 3: Test Strategy

### Acceptance Criteria → Test Scenarios Mapping

| AC | Scenario(s) | Level | Priority |
|----|-------------|-------|----------|
| AC-1: Upload → file stored, photo_path saved, audit_log written (same transaction) | 3.2-INT-001 | Integration/Service | P0 |
| AC-2: Non-image MIME or oversized → reject, no file written, row unchanged | 3.2-INT-002 | Integration/Service | P1 |
| AC-3: Authenticated user (admin or organizer) GET photo → 200 + Content-Type: image/* | 3.2-INT-003 (admin), 3.2-INT-005 (organizer) | Integration/HTTP | P1 |
| AC-4: Unauthenticated GET photo → 302/403 | 3.2-INT-004 | Integration/HTTP | P0 |
| AC-5: Empty state (no photo) — photo upload form loads, no error | Covered by existing 3.1 tests (room without photo_path); no additional stub needed |
| AC-6: UPLOAD_DIR from env var only (12-factor) | 3.2-UNIT-001 (source), 3.2-UNIT-002 (compose) | Static/Unit | P1, P2 |
| AC-1 (schema) | 3.2-UNIT-003 (photo_path column exists) | Integration/DB | P1 |
| R-005: volume persistence | 3.2-INT-006, 3.2-UNIT-002 | Integration/Static | P2 |
| P3 re-upload | 3.2-P3-001 | Integration/Service | P3 |

### Test Level Selection

- **Service-level (no HTTP, no DEV_SERVER_URL):** INT-001, INT-002, INT-006 — `uploadRoomPhoto()` called directly
- **HTTP-level (`test.skipIf(!DEV_SERVER_URL)`):** INT-003, INT-004, INT-005 — `fetch()` against dev server
- **Static source inspection:** UNIT-001 (room-service.ts), UNIT-002 (compose.yaml)
- **DB schema assertion:** UNIT-003 (appended to db-schema.test.ts)

### Red Phase Compliance

All new tests are marked `test.skip()` or `test.skipIf(!DEV_SERVER_URL)`. None will pass until the feature is implemented. CI will remain green because all new tests are skipped.

---

## Step 4: Generated Test Files

### File 1: `tests/integration/rooms.test.ts` (appended)

10 new Story 3.2 test stubs added after the existing Story 3.1 tests:

| Test ID | Priority | Level | Status |
|---------|----------|-------|--------|
| 3.2-INT-001 | P0 | Service | `test.skip()` |
| 3.2-INT-004 | P0 | HTTP | `test.skipIf(!DEV_SERVER_URL)` |
| 3.2-INT-002 | P1 | Service | `test.skip()` |
| 3.2-INT-003 | P1 | HTTP | `test.skipIf(!DEV_SERVER_URL)` |
| 3.2-INT-005 | P1 | HTTP | `test.skipIf(!DEV_SERVER_URL)` |
| 3.2-UNIT-001 | P1 | Static | `test.skip()` |
| 3.2-INT-006 | P2 | Service | `test.skip()` |
| 3.2-UNIT-002 | P2 | Static | `test.skip()` |
| 3.2-P3-001 | P3 | Service | `test.skip()` |

Also includes two new seed helper functions (Story 3.2 variants):
- `seedAdminUserWithSession32()` — admin user + signed session cookie for HTTP tests
- `seedOrganizerUserWithSession32()` — organizer user + signed session cookie for HTTP tests

### File 2: `tests/integration/db-schema.test.ts` (appended)

1 new Story 3.2 test stub added:

| Test ID | Priority | Level | Status |
|---------|----------|-------|--------|
| 3.2-UNIT-003 | P1 | DB Schema | `test.skip()` |

---

## Step 5: Validation

### Checklist

- [x] Prerequisites satisfied (story approved, framework configured, dev env available)
- [x] Story key derived: `3-2-room-photo-upload`
- [x] Story file tracked: `_bmad-output/implementation-artifacts/3-2-room-photo-upload.md`
- [x] All tests marked `test.skip()` or `test.skipIf(!DEV_SERVER_URL)` (TDD red phase)
- [x] No active passing tests generated
- [x] All tests assert EXPECTED behavior (not placeholder `expect(true).toBe(true)`)
- [x] Test IDs match test-design-epic-3.md entries
- [x] AC coverage: AC-1 through AC-6 covered by at least one test scenario
- [x] Priority tags [P0]–[P3] present on all tests
- [x] INT-005 correctly asserts HTTP 200 (NOT 403) — story overrides test-design line 284
- [x] INT-002 is service-level (asserts throws), not an HTTP 422 test
- [x] Activation order documented in file header comments
- [x] No Thai text literals in test code
- [x] No credential literals in test code (AUTH_SECRET read from env)
- [x] Seed helpers use randomUUID() for uniqueness, no fixed credentials
- [x] HTTP-level tests use `test.skipIf(!process.env['DEV_SERVER_URL'])` (CI-safe)
- [x] Temp directories cleaned up in `finally` blocks
- [x] `prettier --write` applied, lint passes (zero errors)
- [x] Files appended to existing test files (no new test files created)

### Test Count Summary

| File | Story 3.1 Tests | Story 3.2 Tests | Total |
|------|-----------------|-----------------|-------|
| `tests/integration/rooms.test.ts` | 9 (active + skipIf) | 9 new stubs | 18 |
| `tests/integration/db-schema.test.ts` | 4 (active) | 1 new stub | 5 |
| **Total** | | **10 new stubs** | |

### Key Risks / Assumptions

1. **INT-005 (200 not 403):** Story dev notes explicitly override test-design. The serve route uses `requireUser`; organizers can view photos. Any implementation that returns 403 for organizers is a bug.
2. **UPLOAD_DIR env var required at runtime:** `uploadRoomPhoto()` must throw a clear error if `UPLOAD_DIR` is not set (story Task 3.2 spec). UNIT-001 asserts the source uses `process.env['UPLOAD_DIR']`.
3. **File-before-DB ordering:** Story spec says write file BEFORE the DB transaction. If DB fails, orphan file is harmless. If file write fails, no DB change. INT-001 doesn't test this ordering explicitly — it tests the outcome (both file and DB record exist). The P3 re-upload test implicitly exercises atomicity.
4. **DEV_SERVER_URL requirement for HTTP tests:** INT-003, INT-004, INT-005 need a running dev server with the same `UPLOAD_DIR` as the test process uses for uploads. The dev notes acknowledge this setup dependency.

### Activation Order (for Developer Reference)

```
Task 1  → activate 3.2-UNIT-003 in tests/integration/db-schema.test.ts
Task 2  → activate 3.2-UNIT-002 in tests/integration/rooms.test.ts
Task 3  → activate 3.2-INT-001, 3.2-INT-002, 3.2-INT-006 in tests/integration/rooms.test.ts
Task 4  → activate 3.2-INT-004, 3.2-UNIT-001 in tests/integration/rooms.test.ts
Task 5  → activate 3.2-INT-003, 3.2-INT-005 in tests/integration/rooms.test.ts (DEV_SERVER_URL)
```

### Next Recommended Workflow

`bmad-dev-story` — story 3.2 is ready for implementation. All ATDD scaffolds are in place. Developer activates tests one batch at a time per the activation order above (TDD red → green → refactor cycle).
