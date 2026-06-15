---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-15'
storyId: '4.8'
storyKey: 4-8-organizer-dashboard
storyFile: _bmad-output/implementation-artifacts/4-8-organizer-dashboard.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-4-8-organizer-dashboard.md
generatedTestFiles:
  - tests/integration/bookings.test.ts
  - tests/e2e/bookings.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/4-8-organizer-dashboard.md
  - tests/integration/bookings.test.ts
  - tests/e2e/bookings.spec.ts
  - playwright.config.ts
  - _bmad/tea/config.yaml
---

# ATDD Checklist — Story 4.8: Organizer Dashboard

## Step 1: Preflight & Context

### Stack Detection

- **Detected stack:** `fullstack`
- **Indicators:** `playwright.config.ts` (frontend E2E), `package.json` (SvelteKit/Vite/Bun), Vitest
  integration tests with PostgreSQL (Testcontainers)
- **Test framework:** Vitest (integration) + Playwright (E2E)

### Prerequisites

- [x] Story approved with clear acceptance criteria (11 ACs)
- [x] `playwright.config.ts` present
- [x] Vitest integration test infra in `tests/integration/`
- [x] Development environment available

### Story Context

**Story 4.8: Organizer Dashboard**

- **AC-1 (FR-050):** Dashboard loads my upcoming non-cancelled bookings only; IDOR boundary enforced in DB query
- **AC-2 (FR-051):** Each card shows event name, room name, date/time (Bangkok TZ), registrant count placeholder "—"
- **AC-3 (FR-052):** Copy-link button present when `registrationEnabled`; toast on success
- **AC-4 (UXD-020):** Empty state with calm message + CTA to /calendar
- **AC-5 (UXD-020):** Skeleton loading while data loads
- **AC-6 (NFR-003):** Dashboard load ≤ 3s; `organizer_id` index may be needed
- **AC-7:** All UI strings via Paraglide; English in en.json; empty "" in th.json
- **AC-8:** Sign-in sheet PDF deferred to Epic 5
- **AC-9:** Registrant count real data deferred to Story 5.8 (show "—" placeholder only)
- **AC-10:** Catering summary deferred to Epic 5
- **AC-11:** `/dashboard` route fixes profile-complete → /dashboard redirect from Story 2.3

### Framework Config

- `tea_use_playwright_utils: true`
- `tea_use_pactjs_utils: false`
- `tea_browser_automation: auto`
- `tea_execution_mode: auto`
- `risk_threshold: p1`

---

## Step 2: Generation Mode

**Mode selected:** AI Generation

**Rationale:** Acceptance criteria are clear and well-specified. Story 4.8 introduces a new
`/dashboard` route and `getUpcomingBookingsByOrganizer` query — standard CRUD/query patterns
suitable for AI generation. The integration scenarios (scoping, exclusion filters) are backend DB
test patterns; the E2E scenarios (card rendering, empty state, a11y) are standard UI navigation
patterns. No complex UI interactions requiring live browser recording.

---

## Step 3: Test Strategy

### AC → Test Level Mapping

| AC | Test ID | Level | Priority | Description |
|----|---------|-------|----------|-------------|
| AC-1, FR-050, IDOR | 4.8-INT-001 | Integration (DB) | P0 | `getUpcomingBookingsByOrganizer` returns only requesting organizer's bookings; IDOR boundary |
| AC-1, status filter | 4.8-INT-002 | Integration (DB) | P1 | Cancelled bookings excluded from query |
| AC-1, time filter | 4.8-INT-003 | Integration (DB) | P1 | Past bookings excluded (`upper(during) < now()`) |
| AC-2, FR-051 | 4.8-E2E-001 | E2E | P1 | Dashboard card shows event name, room, date/time, "—" placeholder |
| AC-4, UXD-020 | 4.8-E2E-002 | E2E | P1 | Empty state with CTA when no upcoming bookings |
| NFR-007, AC-3 | 4.8-A11Y-001 | E2E (axe-core) | P2 | /dashboard passes WCAG 2.1 AA |

### Test Level Rationale

- **Integration (DB-level):** The core business invariants of AC-1 — scoping to the organizer,
  excluding cancelled, excluding past — are best verified at the query layer. E2E cannot reliably
  verify IDOR at the SQL level. These three integration tests exercise
  `getUpcomingBookingsByOrganizer` directly against a real Postgres instance.

- **E2E:** Booking card content (AC-2), empty state (AC-4), and a11y (NFR-007) require
  rendering the `/dashboard` route in a browser. These are left as `test.skip()` because they
  require the full route + component implementation.

- **Not tested at E2E level (deferred/out-of-scope):**
  - AC-3 (copy-link toast): covered by the existing copy-link pattern in `/bookings/[id]/+page.svelte`;
    a separate dedicated E2E for toast behaviour is not required at this story.
  - AC-5 (skeleton): UX behaviour; not a functional correctness concern.
  - AC-6 (NFR-003 perf): load time is not verifiable in Playwright without lighthouse.
  - AC-8/9/10 (deferred): not implemented in this story.

### TDD Red Phase Contract

All 3 integration tests are marked `test.skip(` — they will fail until
`getUpcomingBookingsByOrganizer` is implemented in `src/lib/server/db/queries/bookings.ts`.

All 3 E2E tests are marked `test.skip(` — they will fail until the `/dashboard` route and
`BookingCard` component are implemented.

**Activation order (per story task):**

1. Task 1.1 (`getUpcomingBookingsByOrganizer` exported): activate 4.8-INT-001 → verify FAIL → implement → PASS
2. After INT-001 green: activate 4.8-INT-002 and 4.8-INT-003 → verify FAIL → already handled by same implementation → PASS
3. Task 2.2 (`+page.svelte` done): activate 4.8-E2E-002 (empty state — simpler) → verify FAIL → implement → PASS
4. Task 3.1 (`BookingCard.svelte` done): activate 4.8-E2E-001 → verify FAIL → implement → PASS
5. After E2E-001 green: activate 4.8-A11Y-001 → fix any a11y violations found

---

## Step 4: Generated Test Scaffolds

### Integration Tests (added to `tests/integration/bookings.test.ts`)

**4.8-INT-001** `[P0]` — `getUpcomingBookingsByOrganizer` scoping + IDOR boundary
- Seeds orgA and orgB with distinct upcoming active bookings for the same room
- Calls `getUpcomingBookingsByOrganizer(orgA)` and asserts:
  - orgA's booking IS present
  - orgB's booking is NOT present (IDOR)
  - Each row includes `roomName` (JOIN verification)

**4.8-INT-002** `[P1]` — cancelled bookings excluded
- Seeds one active + one cancelled upcoming booking for the same organizer
- Asserts active booking present, cancelled booking absent

**4.8-INT-003** `[P1]` — past bookings excluded
- Seeds one past (2020-01-01) + one future (2027-03-10) active booking for the same organizer
- Asserts future booking present, past booking absent

### E2E Tests (added to `tests/e2e/bookings.spec.ts`)

**4.8-E2E-001** `[P1]` — Dashboard card content
- Seeds a booking via `/bookings/new` form, navigates to `/dashboard`
- Asserts: heading "My Bookings" visible, event name visible, room name visible,
  registrant count placeholder "—" visible

**4.8-E2E-002** `[P1]` — Empty state
- Navigates to `/dashboard` without any upcoming bookings
- Asserts: "No upcoming bookings" message visible, "Book a room" CTA visible and pointing to `/calendar`

**4.8-A11Y-001** `[P2]` — WCAG 2.1 AA axe-core scan
- Navigates to `/dashboard`, runs `AxeBuilder` scan
- Asserts zero violations

---

## Step 5: Validation

### Checklist

- [x] Prerequisites satisfied (story has clear ACs, test framework present)
- [x] All new tests marked `test.skip()` (TDD red phase)
- [x] No Thai text in test code or mocks
- [x] No credentials or secrets in test code
- [x] Test IDs follow repo convention (e.g. `4.8-INT-001`, `4.8-E2E-001`, `4.8-A11Y-001`)
- [x] Tests added to existing files (no new test files created)
- [x] Seed data uses future dates far from CI clock drift risk
- [x] IDOR test (INT-001) explicitly verifies cross-organizer isolation
- [x] Story metadata captured in frontmatter
- [x] Input documents listed

### Key Risks & Assumptions

- **Isolation in E2E-002:** The dev bypass organizer may have bookings from other tests.
  During activation, the developer should ensure no future active bookings exist for that
  organizer, or add a before-hook to cancel/delete them.
- **Seed room for E2E-001:** Uses the dev bypass seed room ID
  (`dev-bypass-room-00000000-0000-0000-0000-000000000001`); `?seedRoom=true` is passed in
  `loginViaDevBypass`. The `SEED_ROOM_NAME` constant in E2E-001 must be updated to match
  the actual room name during activation.
- **INT-001 ordering assertion:** The ordering check is kept minimal (non-empty result iteration)
  since verifying strict `lower(during) ASC` order with only one booking per organizer does not
  exercise the ORDER BY. Add a multi-booking ordering test if needed in a later refinement.
- **A11Y-001 copy-link button:** The `booking_copy_link_aria` i18n key provides the accessible
  label; this is not explicitly asserted in A11Y-001 (axe-core catches missing accessible names
  automatically as a WCAG 2.4.6 / 4.1.2 violation).

### Next Recommended Workflow

Run `/bmad-dev-story 4.8-organizer-dashboard` to begin implementation.
After implementation, run `/bmad-testarch-automate 4.8-organizer-dashboard` to activate
the `test.skip()` scaffolds task-by-task.
