---
baseline_commit: bfeac77
---

# Story 3.2: Room Photo Upload

Status: ready-for-dev

## Story

As an admin,
I want to attach an optional photo to a room,
so that organizers can recognize the space.

## Acceptance Criteria

1. **Given** an existing room and I am an admin, **When** I upload an image file (JPEG/PNG/WebP, ≤10MB) via the room edit page, **Then** the file is stored on the on-prem volume at a path derived from `UPLOAD_DIR`, the path is saved in the `photo_path` column of the rooms row, and an `audit_log` entry (entity=`room`, action=`upload_photo`, actor_id, diff containing the new path) is written in the same transaction.
2. **Given** a file upload with a non-image MIME type (e.g., `.txt`, `.pdf`, `.php`) or a file exceeding the size limit, **When** I submit the upload form, **Then** the server returns HTTP 422, no file is written to disk, and the rooms row is unchanged.
3. **Given** an authenticated internal user (admin or organizer), **When** they GET `/rooms/[id]/photo`, **Then** the server streams the image with the correct `Content-Type: image/*` header and HTTP 200.
4. **Given** an unauthenticated request, **When** they GET `/rooms/[id]/photo`, **Then** the server returns a redirect to `/login` (302) or 403 — the photo route must be in `routeGuards`.
5. **Given** a room with no photo, **When** the room edit page is loaded, **Then** the photo upload form is shown with an empty state; no error occurs.
6. **Given** the upload implementation, **When** `UPLOAD_DIR` is set via env var, **Then** the upload directory is resolved exclusively from that env var (never a hardcoded path), consistent with the 12-factor config pattern used throughout the project.

## Tasks / Subtasks

- [ ] Task 1: Add `photo_path` column to rooms schema + migration (AC: 1, 5)
  - [ ] 1.1 Add `photoPath: text('photo_path')` (nullable, no default) to `src/lib/server/db/schema/rooms.ts`. Export updated `Room` and `NewRoom` types.
  - [ ] 1.2 Run `bun run db:generate` to attempt migration generation. **Note:** `bun run db:generate` failed in Story 3.1 due to ESM/CJS incompatibility with `uuidv7` — hand-write `drizzle/0006_room_photo_path.sql` (single `ALTER TABLE rooms ADD COLUMN photo_path TEXT;`) and add the journal entry to `drizzle/meta/_journal.json` following the same hand-written pattern as `drizzle/0005_rooms.sql`. Apply migration via `bun run db:migrate`.
  - [ ] 1.3 Activate `3.2-UNIT-003` in `tests/integration/db-schema.test.ts` (assert `photo_path` column exists in `rooms`). Run `bun run test:integration` — expect FAIL. Apply migration — expect PASS.

- [ ] Task 2: Add `UPLOAD_DIR` and `PHOTO_MAX_BYTES` env vars to `env.ts` (AC: 2, 6)
  - [ ] 2.1 In `src/lib/server/env.ts`, add to `EnvSchema`:
    - `UPLOAD_DIR: v.optional(v.pipe(v.string(), v.minLength(1)))` — path to the volume mount (required at runtime; optional at build).
    - `PHOTO_MAX_BYTES: v.optional(v.pipe(v.string(), v.regex(/^\d+$/), v.transform(Number), v.integer(), v.minValue(1)), String(10 * 1024 * 1024))` — defaults to 10 485 760 (10MB).
  - [ ] 2.2 Add both variables to `.env.example` with comments explaining their purpose (no credential values).
  - [ ] 2.3 Add `UPLOAD_DIR=./uploads` to `compose.yaml` environment section for the web service; add a named volume `uploads:` and mount it at the `UPLOAD_DIR` path in the web service. This ensures the volume persists across restarts (R-005 mitigation).

- [ ] Task 3: Add `uploadRoomPhoto` to `room-service.ts` (AC: 1, 2, 5)
  - [ ] 3.1 Activate `3.2-INT-001`, `3.2-INT-002`, `3.2-INT-006` in `tests/integration/rooms.test.ts`. Run `bun run test:integration` — expect FAIL.
    - **`3.2-INT-002`** is a **service-level** test: call `uploadRoomPhoto()` with a non-image MIME type and assert it **throws** a typed validation error; also assert no file was written to `UPLOAD_DIR`. Do **not** assert HTTP 422 here — 422 is the HTTP layer mapping in the form action (Task 6). A service-level test cannot produce a 422.
  - [ ] 3.2 In `src/lib/server/services/room-service.ts`, add:
    ```ts
    export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

    export async function uploadRoomPhoto(
      actorId: string,
      roomId: string,
      file: { data: Buffer; mimeType: string; size: number }
    ): Promise<Room>
    ```
    Implementation:
    - Resolve `uploadDir` from `process.env['UPLOAD_DIR']` (throw a clear error if not set at runtime so the error is visible before any FS operation).
    - Validate MIME type against `ALLOWED_PHOTO_MIME_TYPES` — throw a typed validation error if rejected.
    - Validate size ≤ `Number(process.env['PHOTO_MAX_BYTES'] ?? String(10 * 1024 * 1024))` — throw typed validation error if exceeded.
    - Generate a unique filename: `${uuidv7()}-${roomId}.${extension}` (derive extension from MIME type using a local map: `jpeg→jpg`, `png→png`, `webp→webp`).
    - Ensure the upload directory exists: `await fs.promises.mkdir(uploadDir, { recursive: true })`.
    - Write the file to `path.join(uploadDir, filename)` using `fs.promises.writeFile` (Node.js `fs/promises`). **Write the file BEFORE the DB transaction** — if the DB transaction fails, the orphan file is harmless (overwritten on retry). If the file write fails, no DB change occurs. This ordering avoids a DB-committed path pointing to a missing file.
    - Wrap DB update + `writeAuditLog` in `db.transaction()`:
      - `UPDATE rooms SET photo_path = $path, updated_at = NOW() WHERE id = $roomId RETURNING *`
      - `writeAuditLog(tx, { actorId, entity: 'room', action: 'upload_photo', diff: { photoPath: filename } })`
    - Return the updated `Room` row.
  - [ ] 3.3 Run `bun run test:integration` — `3.2-INT-001`, `3.2-INT-002`, `3.2-INT-006` must pass (green).

- [ ] Task 4: Register photo serve route in `routeGuards` (AC: 3, 4)
  - [ ] 4.1 Activate `3.2-INT-004`, `3.2-UNIT-001` in `tests/integration/rooms.test.ts`. Run `bun run test:integration` — expect FAIL.
  - [ ] 4.2 In `src/hooks.server.ts`, push a new entry to `routeGuards` after the existing admin guard:
    ```ts
    {
      // Photo serving route requires authentication (any internal user — organizers need
      // to see room photos when browsing the calendar). Upload is admin-only (enforced
      // per-route in the admin route handler). See Story 3.2 AC-3 / AC-4.
      pattern: /^\/rooms\/[^/]+\/photo(?:\/|$)/,
      guard: (event) => { requireUser(event); }
    }
    ```
  - [ ] 4.3 Run `bun run test:integration` — `3.2-INT-004` (unauthenticated → 302/403) and `3.2-UNIT-001` (guard registered in routeGuards) must pass.

- [ ] Task 5: Create photo serve route `+server.ts` (AC: 3, 4)
  - [ ] 5.1 Create `src/routes/(app)/rooms/[id]/photo/+server.ts`:
    - Export a `GET` handler.
    - Call `requireUser(event)` (belt-and-suspenders; the routeGuard already enforces this, but belt-and-suspenders is the established project pattern — see `+page.server.ts` files in admin routes).
    - Load the room via `getRoomById(event.params.id)` — if null or `photoPath` is null, return `error(404, 'No photo')`.
    - Resolve the full path: `path.join(process.env['UPLOAD_DIR']!, room.photoPath)`.
    - Read the file with `fs.promises.readFile`; if `ENOENT`, return `error(404, 'Photo not found')`.
    - Derive `Content-Type` from the file extension (`.jpg`→`image/jpeg`, `.png`→`image/png`, `.webp`→`image/webp`).
    - Return `new Response(fileBuffer, { headers: { 'Content-Type': contentType } })`.
  - [ ] 5.2 Write and activate `3.2-INT-003` and `3.2-INT-005` stubs in `tests/integration/rooms.test.ts`. Run HTTP-level tests with `DEV_SERVER_URL` set — both must pass.
    - **`3.2-INT-003`**: authenticated admin GET `/rooms/[id]/photo` → 200, `Content-Type: image/*`. (Positive case, P1.)
    - **`3.2-INT-005`**: authenticated organizer (non-admin) GET `/rooms/[id]/photo` → **200**, `Content-Type: image/*`. **IMPORTANT:** The test-design document (line 284) incorrectly defines this as "non-admin organizer → 403." The serve route uses `requireUser` (not `requireAdmin`) — organizers must be able to view room photos. This test **asserts 200**, not 403. See "CRITICAL: Photo Serve Guard Scope" in Dev Notes. This overrides the test-design wording.

- [ ] Task 6: Create admin photo upload action (AC: 1, 2)
  - [ ] 6.1 Create `src/routes/(app)/admin/rooms/[id]/photo/+page.server.ts`:
    - Export a `load` function that calls `requireAdmin(event)` and returns the room.
    - Export an `actions` object with an `upload` action:
      - Call `requireAdmin(event)` to get the user actor.
      - Parse `event.request.formData()` and extract the `photo` file field. SvelteKit's `request.formData()` returns Web API `FormData`; file fields are `File` objects (Web API `File extends Blob`), not Node.js `Buffer`. Use `const file = formData.get('photo') as File | null`.
      - If no file or file.size === 0, return `fail(422, { error: 'No file provided' })`.
      - Read the file as a Buffer: `Buffer.from(await file.arrayBuffer())`.
      - Call `uploadRoomPhoto(user.id, event.params.id, { data: buffer, mimeType: file.type, size: file.size })`.
      - On typed validation error (MIME or size), return `fail(422, { error: message })`.
      - On success, `redirect(302, '/admin/rooms')`.
  - [ ] 6.2 Create `src/routes/(app)/admin/rooms/[id]/photo/+page.svelte` — minimal upload form:
    - `<form method="POST" action="?/upload" enctype="multipart/form-data">`
    - `<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />`
    - Show current photo (if `room.photoPath`) as `<img src="/rooms/{id}/photo" alt="..." />`
    - All button/label strings via Paraglide `m.*()` keys (add keys to `messages/en.json` and `messages/th.json`; **no hardcoded Thai text** — Rawinan handles translations).
    - Add a photo upload link/button on `src/routes/(app)/admin/rooms/+page.svelte` (room list) and/or `src/routes/(app)/admin/rooms/[id]/edit/+page.svelte` (edit form) pointing to `/admin/rooms/[id]/photo`.

- [ ] Task 7: Quality gates (AC: all)
  - [ ] 7.1 Run `bunx prettier --write . && bun run lint` — zero errors.
  - [ ] 7.2 Run `bun run check` — zero new TypeScript errors (baseline is 46 pre-existing errors from Story 3.1; same count expected).
  - [ ] 7.3 Run `bun run test:integration` — all Story 3.2 service-level + static tests pass; no regressions (Story 3.1 tests remain green).
  - [ ] 7.4 Run `bun run build` — build must succeed.

## Dev Notes

### Architecture Requirements

- **Schema pattern:** Follow `rooms.ts` (Story 3.1) — `photoPath: text('photo_path')` nullable column, no migration auto-generation (use hand-written SQL per Debug Log entry 1 from Story 3.1).
- **Migration pattern:** Hand-write `drizzle/0006_room_photo_path.sql` and update `drizzle/meta/_journal.json`. See `drizzle/0005_rooms.sql` as the exact template.
- **Service pattern:** Follow `room-service.ts` (Story 3.1) — use `db.transaction()`, call `writeAuditLog()` inside the transaction. Resolve `UPLOAD_DIR` from `process.env` (not from SvelteKit's `$env/dynamic/private`) because the service is in `lib/server/services/` and must stay portable.
- **Env var pattern:** Follow `src/lib/server/env.ts` exactly — add `UPLOAD_DIR` and `PHOTO_MAX_BYTES` to `EnvSchema` using `v.optional(...)` (required at runtime, optional at build time). `validateEnv` is called at module-load time — missing `UPLOAD_DIR` at runtime will `process.exit(1)` (acceptable; it's a required config for this feature).
- **Route guard pattern:** Push one entry to `routeGuards` in `hooks.server.ts` for `/^\/rooms\/[^/]+\/photo(?:\/|$)/` using `requireUser` (NOT `requireAdmin` — organizers must view photos). Upload is guarded by `requireAdmin` per-route (consistent with admin room list/edit patterns). **CRITICAL: Photo serve is `requireUser`, not `requireAdmin`.** The story's "so that organizers can recognize the space" purpose requires organizer access.
- **Serve route pattern:** `+server.ts` under `src/routes/(app)/rooms/[id]/photo/` — follows the `(downloads)/+server.ts` pattern in the architecture file system tree (architecture.md line 584–597). Stream file from volume. Do NOT serve from the `static/` directory (no access control there).
- **Belt-and-suspenders guard:** Admin routes in Story 3.1 call `requireAdmin(event)` both in `routeGuards` AND per-route in `+page.server.ts`. Follow the same double-guard pattern in the photo upload action and serve route.
- **No Thai text:** All user-facing strings flow through Paraglide `m.*()` keys. Add new keys to `messages/en.json` and `messages/th.json` (English placeholder values). Rawinan handles Thai translations.
- **MIME validation:** Server-side only — check `file.type` (the MIME type the browser sends) AND derive a content-type from the stored file extension when serving. Never rely on file extension alone for security.
- **File naming:** Use `uuidv7()` for uniqueness and time-orderability. Filename format: `{uuidv7()}-{roomId}.{ext}`. This prevents enumeration and ensures uniqueness even for concurrent uploads.
- **Audit log:** `entity = 'room'`, `action = 'upload_photo'`, `diff = { photoPath: filename }`. Written in the same `db.transaction()` as the `UPDATE rooms` — atomic (AC-1).

### CRITICAL: Photo Serve Guard Scope

The test-design document (line 284, `3.2-INT-005`) describes "non-admin organizer → 403" for the photo route. **This is incorrect** and contradicts:
- The story's "so that organizers can recognize the space" purpose
- Risk R-001 mitigation (line 169): "authenticated admin GET → 200" is the positive case, but `requireUser` is the guard
- The PRD FR-061: photo is displayed to organizers selecting rooms

**Correct implementation:**
- `GET /rooms/[id]/photo` — `requireUser` (any authenticated internal user → 200)
- `POST /admin/rooms/[id]/photo` (upload action) — `requireAdmin` (admin only → 403 for organizers)
- `GET /rooms/[id]/photo` unauthenticated — 302→/login (R-001 satisfied by `requireUser`)

### Test Activation Order (ATDD)

1. Task 1: activate `3.2-UNIT-003` in `tests/integration/db-schema.test.ts` (photo_path column)
2. Task 3: activate `3.2-INT-001`, `3.2-INT-002`, `3.2-INT-006` in `tests/integration/rooms.test.ts`
3. Task 4: activate `3.2-INT-004`, `3.2-UNIT-001` in `tests/integration/rooms.test.ts`
4. Task 5: activate `3.2-INT-003`, `3.2-INT-005` via HTTP with `DEV_SERVER_URL` set

**Note on test stubs:** `tests/integration/rooms.test.ts` currently contains only Story 3.1 tests (P0/P1). Story 3.2 tests (`3.2-INT-001` through `3.2-UNIT-001`) do **not yet exist** — they must be written as new `test.skip()` stubs (ATDD red-phase pattern) following the exact structure of the 3.1 tests in that file. Write all stubs as `test.skip(...)` first, then activate one batch at a time per the activation order above. Similarly, `3.2-UNIT-003` must be added as a new `test.skip()` to `tests/integration/db-schema.test.ts`.

**Note on `3.2-UNIT-002`** (P2): `compose.yaml` volume mount assertion — static test confirming `UPLOAD_DIR` env var in compose.yaml resolves to the declared volume mount point. Write in `tests/integration/rooms.test.ts` as a static source read + assertion. Activation order: after Task 2.

### Unknown Thresholds (Resolved)

- **Max file size:** 10MB default (10 × 1024 × 1024 bytes), env-configurable via `PHOTO_MAX_BYTES`.
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`. Validated server-side against file.type header. `.jpg` extension maps to `image/jpeg` on serve.

### Key Files

**New Files:**
- `drizzle/0006_room_photo_path.sql` — ADD COLUMN photo_path migration
- `src/routes/(app)/rooms/[id]/photo/+server.ts` — authenticated photo serve endpoint
- `src/routes/(app)/admin/rooms/[id]/photo/+page.server.ts` — admin upload action
- `src/routes/(app)/admin/rooms/[id]/photo/+page.svelte` — upload UI

**Modified Files:**
- `src/lib/server/db/schema/rooms.ts` — add `photoPath` nullable column
- `drizzle/meta/_journal.json` — add journal entry for migration 0006
- `src/lib/server/services/room-service.ts` — add `uploadRoomPhoto` function
- `src/lib/server/env.ts` — add `UPLOAD_DIR`, `PHOTO_MAX_BYTES` to EnvSchema
- `src/hooks.server.ts` — push photo serve guard to routeGuards
- `compose.yaml` — add UPLOAD_DIR env var, uploads volume + mount
- `.env.example` — document UPLOAD_DIR and PHOTO_MAX_BYTES
- `messages/en.json` — add `room_photo_*` message keys
- `messages/th.json` — same keys (English placeholder; Rawinan handles Thai)
- `src/routes/(app)/admin/rooms/+page.svelte` — add photo upload link per room row
- `src/routes/(app)/admin/rooms/[id]/edit/+page.svelte` — add photo upload link/section

### Previous Story Learnings (Story 3.1 — Critical)

1. **drizzle-kit ESM failure:** `bun run db:generate` silently fails (ESM/CJS incompatibility with `uuidv7`). **Always hand-write migrations** for this project. Template: `drizzle/0005_rooms.sql` + `drizzle/meta/_journal.json`.
2. **`bun install` required in worktree:** After creating the worktree, run `bun install` before running tests — the root `node_modules` doesn't include production deps in the worktree context.
3. **OrbStack/Docker required for Testcontainers:** `bun run test:integration` requires Docker running via OrbStack. Start before running tests.
4. **`is_admin` vs `isAdmin` in seeds:** DB column is snake_case `is_admin`; Drizzle model is camelCase `isAdmin`. Test seed helpers use raw SQL — use `is_admin` in INSERT statements.
5. **HTTP-level tests require `DEV_SERVER_URL`:** Tests for HTTP responses (302, 403, 422) use `test.skipIf(!process.env['DEV_SERVER_URL'])`. Service-level tests don't need the flag.
6. **Lint errors pre-commit:** Run `bunx prettier --write . && bun run lint` before every commit. Story 3.1 had 6 lint errors caught at Task 6 — run earlier in the cycle.
7. **`resolve()` on hrefs:** SvelteKit requires `resolve()` + `Pathname` type import for typed navigation. Missing in Story 3.1, caught in lint. Apply from the start.
8. **Paraglide keys:** Add new string keys to BOTH `messages/en.json` AND `messages/th.json`. Run `bunx paraglide-js compile` after adding keys (output is git-ignored, regenerated on build).
9. **`test.skipIf` for HTTP tests:** HTTP-level tests MUST use `test.skipIf(!process.env['DEV_SERVER_URL'])` so they don't break CI runs without a dev server.
10. **No `TypeVar` casting needed for `features`:** The `RoomInputBroad` type was introduced to handle `as const` arrays in tests. If a similar issue arises for `photoPath`, handle at the type level.

### References

- [Architecture: Room photos] `_bmad-output/planning-artifacts/architecture.md` line 277–278: "stored on the on-prem filesystem/object store (path/key in DB); served via an app route with access control."
- [Architecture: Downloads pattern] `_bmad-output/planning-artifacts/architecture.md` lines 584–597: `+server.ts` under `(downloads)` for auth-checked file endpoints.
- [Architecture: 12-factor config] `_bmad-output/planning-artifacts/architecture.md` line 299: env vars / secrets for all config.
- [Epic 3 Story 3.2] `_bmad-output/planning-artifacts/epics.md` line 540–553.
- [Test Design: Epic 3] `_bmad-output/test-artifacts/test-design/test-design-epic-3.md` — R-001 (photo access), R-005 (storage persistence), R-010 (MIME validation); P0 tests 3.2-INT-001/004; P1 tests 3.2-INT-002/003/005/UNIT-001; P2 tests 3.2-INT-006/UNIT-002.
- [FR-061] `_bmad-output/planning-artifacts/epics.md` line 74: Room record includes photo (optional).
- [Story 3.1 Dev Notes] `_bmad-output/implementation-artifacts/3-1-create-and-edit-rooms.md` — Debug Log (migrations, bun install, OrbStack, lint).
- [Existing: room-service.ts] `src/lib/server/services/room-service.ts` — extend, do not replace.
- [Existing: rooms.ts schema] `src/lib/server/db/schema/rooms.ts` — add column only.
- [Existing: env.ts] `src/lib/server/env.ts` — add UPLOAD_DIR/PHOTO_MAX_BYTES to EnvSchema.
- [Existing: hooks.server.ts] `src/hooks.server.ts` — push guard to `routeGuards` array.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
