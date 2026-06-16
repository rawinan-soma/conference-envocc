---
baseline_commit: 362d34e
---

# Story 5.6: Registration Open/Close Rules

**Status:** `done`
**Epic:** 5 — External Registration & Headcount
**GH Issue:** #34
**Previous Story:** 5.2 — Submit a Registration (5.3–5.5 are independent; this builds on 5.2 + 4.4)
**Next Story:** 5.7 — Catering Aggregation

## Story

As the system,
I want registration to honor closing rules,
So that it opens and closes correctly.

## Acceptance Criteria

1. **Auto-close on date (AC-1 / FR-033):** When a booking has `registrationClosesAt` set, a pg-boss job on the `close-registration` queue runs at or after that time and sets `registration_enabled = false` on the booking. The job is scheduled at booking creation and re-scheduled at booking update (if `registrationClosesAt` is non-null). Multiple jobs may exist per booking after repeated edits; all converge correctly — the handler's two guards (enabled-check and time-check) ensure only the right job actually closes registration.

2. **Manual close by organizer (AC-2 / FR-034b):** An authenticated booking owner can close registration immediately via a "Close registration" button on `/bookings/[id]`. The action sets `registration_enabled = false`, writes an audit log entry, and reloads the page showing the updated state (button hidden after close).

3. **Closed-state message shown (AC-3 / FR-046):** The public `/r/[token]` page already shows the `reg_page_closed_title` / `reg_page_closed_message` when `registration_enabled = false` (implemented by Story 5.1). This story closes the flag — no changes to the public page are needed.

4. **No capacity cap (AC-4 / FR-032):** Registration is never blocked by a count guard. Do NOT add any `COUNT(registrations)` limit. This is the explicit no-op check enforced by R-012.

5. **Job idempotency (AC-5 / R-004 MITIGATE):** The close-registration handler re-reads both `registrationEnabled` (no-ops if already `false` — double-fire safe) and `registrationClosesAt` (no-ops if null or in the future — stale job safe). Multiple jobs per booking may exist after repeated edits; all converge correctly via these two guards. `5.6-INT-002` validates the `registrationEnabled` guard end-to-end.

6. **Worker import boundary (AC-6 / R-011 DOCUMENT):** The `close-registration` handler and any module it imports at the worker process level must NOT import `$app/*` or `$env/dynamic`. Relative imports only (`../../db/index.js` style). `5.6-INT-005` enforces this.

7. **All UI strings via Paraglide (AC-7):** English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text in code or mocks.

## Tasks / Subtasks

- [x] Task 1: Add `CLOSE_REGISTRATION` queue constant and Valibot payload schema (AC: 1, 5)
  - [x] 1.1: In `src/lib/server/jobs/queues.ts`, add `CLOSE_REGISTRATION: 'close-registration'` to the `QUEUE` object
  - [x] 1.2: Add Valibot schema: `export const CloseRegistrationPayload = v.object({ bookingId: v.pipe(v.string(), v.minLength(1)) });`
  - [x] 1.3: Add type alias: `export type CloseRegistrationPayload = v.InferOutput<typeof CloseRegistrationPayload>;`

- [x] Task 2: Create the `close-registration` job handler (AC: 1, 5, 6)
  - [x] 2.1: Create `src/lib/server/jobs/handlers/close-registration.ts` — follow `send-email.ts` pattern exactly (see Handler Spec in Dev Notes)
  - [x] 2.2: Use the `JobLike` interface (same as `send-email.ts`): `interface JobLike { id: string; name: string; data: unknown; }`
  - [x] 2.3: Validate payload with `v.safeParse(CloseRegistrationPayload, job.data)` — throw on parse failure
  - [x] 2.4: Inside the handler, use relative imports only: import `db` from `'../../db/index.js'` and `bookings` schema from `'../../db/schema/bookings.js'` — NO `$lib` alias, NO `$app/*`, NO `$env/dynamic`
  - [x] 2.5: Idempotency guard: select `booking.registrationEnabled` AND `booking.registrationClosesAt` inside the transaction. Apply two guards in order: (a) If `registrationEnabled` is already `false`, return without error (double-fire safe, satisfies R-004 MITIGATE and `5.6-INT-002`). (b) If `registrationClosesAt` is null OR is in the future (`!registrationClosesAt || registrationClosesAt > new Date()`), return without error — null means the close date was removed (don't close), future means the date was extended (a later job will close at the right time).
  - [x] 2.6: If `registration_enabled = true`, run `UPDATE bookings SET registration_enabled = false, updated_at = now() WHERE id = bookingId` inside `db` (or a direct pg query)
  - [x] 2.7: Write audit log via relative import of `writeAuditLog` from `'../../services/audit.js'` — use `actorId: null` (system action); `entity: 'booking'`; `action: 'close-registration'`; `diff: { bookingId }`

- [x] Task 3: Register the handler in `src/worker.ts` (AC: 1, 6)
  - [x] 3.1: Import `closeRegistrationHandler` from `'./lib/server/jobs/handlers/close-registration.js'`
  - [x] 3.2: After `boss.createQueue(QUEUE.SEND_EMAIL)`, add `await boss.createQueue(QUEUE.CLOSE_REGISTRATION);` — use the default `standard` policy (no options), consistent with SMOKE_EMAIL and SEND_EMAIL queues.
  - [x] 3.3: After `boss.work(QUEUE.SEND_EMAIL, ...)`, add `await boss.work(QUEUE.CLOSE_REGISTRATION, closeRegistrationHandler as any);`

- [x] Task 4: Schedule auto-close job at booking creation (AC: 1, 5)
  - [x] 4.1: In `src/lib/server/services/booking-service.ts`, after the existing `writeAuditLog` call in `createBooking()`, add scheduling logic:
    - If `booking.registrationClosesAt != null`, call `enqueueJob(QUEUE.CLOSE_REGISTRATION, payload, { startAfter: booking.registrationClosesAt, singletonKey: 'close-registration:' + booking.id })`
    - `enqueueJob` is in `src/lib/server/jobs/index.ts` (already used in the codebase — import via `'../jobs/index.js'`)
  - [x] 4.2: `startAfter` accepts a `Date` object — use `booking.registrationClosesAt` directly (it is a `Date | null` from Drizzle's `timestamp({ withTimezone: true })`)
  - [x] 4.3: Do NOT call `enqueueJob` inside the transaction callback — pg-boss `send()` is outside the DB transaction; call it after `db.transaction()` resolves

- [x] Task 5: Re-schedule auto-close job at booking update (AC: 1, 5)
  - [x] 5.1: In `updateBooking()` in `booking-service.ts`, after the existing `writeAuditLog` call, add the same scheduling logic as Task 4
  - [x] 5.2: If `booking.registrationClosesAt` is not null: call `enqueueJob` with the same `singletonKey` (metadata only — default `standard` policy does NOT deduplicate on `singletonKey` alone). Multiple jobs may exist per booking; each converges correctly via the handler's two guards. When the closing date moves earlier on edit, the new earlier-firing job is inserted successfully; it fires first, and the handler closes at the new time. When the closing date moves later, the earlier job fires but the time guard no-ops (date is now in the future); the later job fires and closes correctly.
  - [x] 5.3: If `registrationClosesAt` was removed (is null on the updated booking): do NOT call `enqueueJob`. Any previously-enqueued job will fire eventually; the handler's time guard (`!booking.registrationClosesAt → return`) will no-op safely.
  - [x] 5.4: Import needed: `import { enqueueJob, QUEUE } from '../jobs/index.js';` — add at top of `booking-service.ts` if not already present

- [x] Task 6: Add `closeRegistration` form action to `/bookings/[id]/+page.server.ts` (AC: 2)
  - [x] 6.1: Add a `closeRegistration` action to the existing `actions` export
  - [x] 6.2: Call `requireUser(event)` and `assertOwner(event, booking.organizerId)` — same guard pattern as the `cancel` action
  - [x] 6.3: Fetch the booking by id (same `getBookingById(id)` call as in `cancel`)
  - [x] 6.4: Return early (no-op) if booking is already `registration_enabled = false` — makes the action idempotent
  - [x] 6.5: Run `db.transaction(async (tx) => { UPDATE bookings SET registration_enabled = false, updated_at = now() WHERE id; writeAuditLog(tx, { actorId: user.id, entity: 'booking', action: 'close-registration', diff: { bookingId: id } }); })` — keep it in one transaction
  - [x] 6.6: After transaction commits, redirect 303 to `/bookings/${id}` (same pattern as `cancel`)
  - [x] 6.7: Add `import { db } from '$lib/server/db/index.js';` and `import { bookings } from '$lib/server/db/schema/bookings.js';` if not already imported; also `import { eq, sql } from 'drizzle-orm';`

- [x] Task 7: Update `/bookings/[id]/+page.svelte` — add "Close registration" button (AC: 2, 7)
  - [x] 7.1: Add `let showCloseRegistrationModal = $state(false);` alongside the existing `showCancelModal` state
  - [x] 7.2: Inside the actions `<div class="mt-6 flex flex-wrap gap-3">`, after the Duplicate button and before/after the Cancel button, add a "Close registration" button — only visible when `data.booking.registrationEnabled === true` AND `data.booking.status === 'active'`
  - [x] 7.3: Button style: use destructive-adjacent styling (amber/warning tone is acceptable, or use the same destructive style as Cancel — match the existing design system; use `border-destructive` class if no dedicated amber exists)
  - [x] 7.4: On click: set `showCloseRegistrationModal = true`
  - [x] 7.5: Add a confirmation modal (same pattern as the cancel modal `dialog` at bottom of file) with:
    - `aria-labelledby="close-reg-dialog-title"`
    - Title: `{m.booking_close_registration_confirm_title()}`
    - Body: `{m.booking_close_registration_confirm_body()}`
    - Dismiss button: `onclick={() => (showCloseRegistrationModal = false)}` using `{m.room_cancel_button()}` (same cross-namespace reuse as cancel modal)
    - Confirm `<form method="POST" action="?/closeRegistration">` with submit button using `{m.booking_close_registration_confirm_action()}`
  - [x] 7.6: Svelte 5 runes only — `$state`, `$derived`, `$props()`; no Svelte 4 reactive declarations

- [x] Task 8: Add Paraglide i18n keys (AC: 7)
  - [x] 8.1: Add to `messages/en.json` (see i18n Keys in Dev Notes for English values)
  - [x] 8.2: Add same keys to `messages/th.json` with empty string `""` — Rawinan handles Thai translation

- [x] Task 9: ATDD — activate and add integration test stubs (AC: 1, 2, 4, 5, 6)
  - [x] 9.1: Append to `tests/integration/registrations.test.ts` (DO NOT create a new file — append only)
  - [x] 9.2: P0 tests (ACTIVATE — no `.skip`):
    - `5.6-INT-001`: Auto-close handler sets `registration_enabled = false` when `registrationClosesAt` is in the past
    - `5.6-INT-002`: Auto-close handler is idempotent — re-run on already-closed booking → no error, no change (MANDATORY PR gate per test-design)
  - [x] 9.3: P1 tests (`test.skip`):
    - `5.6-INT-003`: Worker restart does not re-close already-closed registration
    - `5.6-INT-004`: Manual close action (`closeRegistration`) sets `registration_enabled = false` immediately
  - [x] 9.4: P2 tests (`test.skip`):
    - `5.6-INT-005`: Auto-close handler file has no `$app/*` or `$env/dynamic` imports (lint/AST scan)
  - [x] 9.5: Use the auto-close time-travel pattern: update `registration_closes_at = NOW() - interval '1 second'` via raw SQL in the fixture, then invoke the handler directly with a stub job — do NOT sleep

### Review Findings

Code review (Step 5, 2026-06-16) — 3 review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor found no blocking AC violations; all 7 ACs satisfied. 2 patches applied, 5 deferred, 5 dismissed as spec-intentional/noise.

Patches applied (fixed in commit eac2418):

- [x] [Review][Patch] Idempotency guard not concurrency-safe — added `.for('update')` row lock to handler re-read [`src/lib/server/jobs/handlers/close-registration.ts`:43]
- [x] [Review][Patch] snake_case transaction-result locals renamed to camelCase [`src/lib/server/services/booking-service.ts`:118,263]

Deferred (real but out-of-scope or pre-existing pattern — see deferred-work.md):

- [x] [Review][Defer] Post-commit `enqueueJob` failure has no compensation — committed booking left without auto-close job [`src/lib/server/services/booking-service.ts`:200,259] — deferred, architectural follow-up not addressed by spec
- [x] [Review][Defer] Manual `closeRegistration` action re-reads outside its transaction and UPDATEs unconditionally (TOCTOU); also no `status` guard so a cancelled booking is closable via direct POST [`src/routes/(app)/bookings/[id]/+page.server.ts`:95] — deferred, action is verbatim spec code; status guard is a behavior deviation
- [x] [Review][Defer] Handler batch loop has no per-job try/catch — one poison job fails the whole pg-boss batch [`src/lib/server/jobs/handlers/close-registration.ts`:61] — deferred, matches send-email.ts pattern
- [x] [Review][Defer] Time guard uses worker process clock (`new Date()`) vs DB-persisted timestamp — clock-skew/early-delivery no-op may leave registration open [`src/lib/server/jobs/handlers/close-registration.ts`:43] — deferred, defensive only
- [x] [Review][Defer] Confirm modal uses `<dialog open>` (no focus trap / Esc / inert backdrop) instead of `showModal()` [`src/routes/(app)/bookings/[id]/+page.svelte`:393] — deferred, matches existing cancel-modal pattern

Dismissed (spec-intentional or project rule):

- Stale auto-close jobs accumulate / `singletonKey` is metadata only — spec **requires** multiple jobs to coexist for date-moved-earlier convergence (R-004 strategy); changing queue policy would break documented logic.
- Empty Thai strings render blank labels — project rule, Rawinan owns all Thai translation.
- `updateBooking` re-open scenario — re-open is explicitly out of scope per spec.
- Test files beyond spec's listed file set (bookings.test.ts, booking-token.test.ts) — disclosed/justified pg-boss lifecycle regression fix.
- AC-4 has no dedicated 5.6 test — "do-not-add" criterion verifiable by the diff itself; covered by Story 5.2's existing test.

## Dev Notes

### Scope Boundaries — Critical

**DO implement:**
- `CLOSE_REGISTRATION` queue constant + Valibot payload in `src/lib/server/jobs/queues.ts`
- `src/lib/server/jobs/handlers/close-registration.ts` — handler with idempotency guard
- `src/worker.ts` — register close-registration queue + handler
- `createBooking` + `updateBooking` in `booking-service.ts` — schedule/reschedule close-registration job after transaction commits
- `closeRegistration` form action in `src/routes/(app)/bookings/[id]/+page.server.ts`
- "Close registration" button + confirm modal in `src/routes/(app)/bookings/[id]/+page.svelte`
- Paraglide i18n keys for the new UI elements
- ATDD test stubs in `tests/integration/registrations.test.ts`

**DO NOT implement:**
- Confirmation email for auto-close — not in scope for this story
- Re-open registration — not in epic AC; explicitly out of scope
- Any `COUNT(registrations)` cap or capacity guard — FR-032 explicitly forbids this
- Changes to `/r/[token]/+page.svelte` — FR-046 (closed message) is already live from Story 5.1
- New DB migration — no schema changes needed; `registration_enabled` and `registration_closes_at` columns already exist on `bookings` table (Story 4.4)
- E2E test stubs — test-design epic-5 has no 5.6 E2E scenarios; integration-only

### Handler Spec — `src/lib/server/jobs/handlers/close-registration.ts`

CRITICAL: No `$lib` alias, no `$app/*`, no `$env/dynamic`. Relative imports only (same as `send-email.ts`).

```typescript
// Handler for close-registration queue
// Closes registration on a booking when the closing date is reached.
// IMPORTANT: No $app/* or $env/dynamic imports — use relative paths
import * as v from 'valibot';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { bookings } from '../../db/schema/bookings.js';
import { writeAuditLog } from '../../services/audit.js';
import { CloseRegistrationPayload } from '../queues.js';

interface JobLike {
  id: string;
  name: string;
  data: unknown;
}

export async function closeRegistrationHandler(jobOrJobs: JobLike | JobLike[]): Promise<void> {
  const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];
  for (const job of jobs) {
    const result = v.safeParse(CloseRegistrationPayload, job.data);
    if (!result.success) {
      throw new Error(`Invalid close-registration payload: ${JSON.stringify(v.flatten(result.issues))}`);
    }
    const { bookingId } = result.output;

    await db.transaction(async (tx) => {
      // R-004 MITIGATE: idempotency guard — re-read the booking inside the transaction
      const [booking] = await tx
        .select({
          id: bookings.id,
          registrationEnabled: bookings.registrationEnabled,
          registrationClosesAt: bookings.registrationClosesAt
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!booking) {
        // Booking deleted — silently skip
        return;
      }
      if (!booking.registrationEnabled) {
        // Already closed — no-op (R-004 MITIGATE: double-fire safe)
        return;
      }
      // Time guard: close only when registrationClosesAt is set AND is in the past.
      // Two stale-job scenarios this handles:
      //   (a) registrationClosesAt was removed (set to null after this job was enqueued)
      //       → !booking.registrationClosesAt is true → no-op (removal means "don't auto-close")
      //   (b) registrationClosesAt was pushed to the future (date extended after enqueue)
      //       → booking.registrationClosesAt > new Date() → no-op (a later job will fire correctly)
      if (!booking.registrationClosesAt || booking.registrationClosesAt > new Date()) {
        // Stale or cancelled close job — no-op
        return;
      }

      await tx
        .update(bookings)
        .set({ registrationEnabled: false, updatedAt: sql`now()` })
        .where(eq(bookings.id, bookingId));

      await writeAuditLog(tx, {
        actorId: null, // system-triggered job
        entity: 'booking',
        action: 'close-registration',
        diff: { bookingId }
      });
    });
  }
}
```

**Why no `$lib` alias in the handler:** The worker is a standalone Bun process (`bun run src/worker.ts`), NOT the SvelteKit dev server. Vite's `$lib` alias is a build-time SvelteKit feature unavailable in a raw Bun execution. Any import using `$lib` or `$app/*` or `$env/dynamic` will throw `MODULE_NOT_FOUND` at runtime. Risk R-011 (score=3, DOCUMENT) acknowledges this boundary. Test `5.6-INT-005` enforces it at lint/CI time.

**Why `db` from a relative path works:** `src/lib/server/db/index.ts` uses `env.DATABASE_URL` (from `../env.js`), which uses `process.env` directly — no SvelteKit magic. This is safe to import in worker context. `src/worker.ts` already validates env at startup via `import './lib/server/env.js'`.

### Scheduling Spec — where to call `enqueueJob`

**In `createBooking()` (after `db.transaction()` resolves):**

```typescript
// After: return db.transaction(async (tx) => { ... });
// Change the structure to:
const booking = await db.transaction(async (tx) => { ... });

// Schedule auto-close AFTER the transaction commits (not inside it)
if (booking.registrationClosesAt) {
  await enqueueJob(
    QUEUE.CLOSE_REGISTRATION,
    { bookingId: booking.id } satisfies CloseRegistrationPayload,
    {
      startAfter: booking.registrationClosesAt, // Date object from Drizzle
      singletonKey: `close-registration:${booking.id}`
    }
  );
}

return booking;
```

Same pattern for `updateBooking()`.

**Import additions needed in `booking-service.ts`:**
```typescript
import { enqueueJob, QUEUE } from '../jobs/index.js';
import type { CloseRegistrationPayload } from '../jobs/queues.js';
```

**Note on `createBooking` current structure:** `createBooking()` currently wraps everything in `return db.transaction(async (tx) => { ... })` — the outer function body ends with just the transaction call. You need to extract the booking result from the transaction first (assign to a `const booking`), schedule the job after, then `return booking`. Do NOT put the `enqueueJob` call inside the transaction callback.

**`startAfter` semantics:** `startAfter` is a `Date` object. Drizzle returns `registrationClosesAt` as `Date | null` from the `timestamp({ withTimezone: true })` column. Pass it directly. pg-boss will deliver the job at or after that date — the handler's idempotency guard handles the rare case of double-delivery.

**`singletonKey` and multiple jobs (important — read before implementing):** The `close-registration` queue uses the default `standard` policy. Under `standard` policy, `singletonKey` is stored as metadata but does NOT create a unique index — multiple jobs with the same `singletonKey` can coexist in the queue. This is intentional: correctness comes entirely from the handler's two guards, not from dedup on insert:
- On `createBooking`: job A inserted at `registrationClosesAt = T1`.
- On `updateBooking` (date pushed later to T2 > T1): job B inserted at T2. Job A fires at T1; time guard sees `closesAt = T2 > now()` → no-op. Job B fires at T2 → closes. Correct.
- On `updateBooking` (date moved earlier to T2 < T1): job B inserted at T2. Job B fires first at T2; time guard sees `closesAt = T2 ≤ now()` → closes. Job A fires at T1; `registrationEnabled` guard sees `false` → no-op. Correct.
- On `updateBooking` (date removed, `registrationClosesAt = null`): do NOT enqueue. Any pending jobs fire; time guard sees `!registrationClosesAt` → no-op. Correct.
- Double-fire after worker restart: `registrationEnabled` guard no-ops. Correct.

This is R-004's full mitigation: idempotency in the handler (enabled guard + time guard). The handler handles all cases without requiring policy-based dedup.

### Manual Close Action Spec

**File:** `src/routes/(app)/bookings/[id]/+page.server.ts`

```typescript
closeRegistration: async (event) => {
  const user = requireUser(event);
  const { id } = event.params;

  const booking = await getBookingById(id);
  if (!booking) {
    error(404, 'Booking not found');
  }

  assertOwner(event, booking.organizerId);

  // Idempotent: no-op if already closed
  if (!booking.registrationEnabled) {
    redirect(303, `/bookings/${id}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({ registrationEnabled: false, updatedAt: sql`now()` })
      .where(eq(bookings.id, id));

    await writeAuditLog(tx, {
      actorId: user.id,
      entity: 'booking',
      action: 'close-registration',
      diff: { bookingId: id }
    });
  });

  redirect(303, `/bookings/${id}`);
}
```

Import additions needed in `+page.server.ts`:
- `import { db } from '$lib/server/db/index.js';`
- `import { bookings } from '$lib/server/db/schema/bookings.js';`
- `import { writeAuditLog } from '$lib/server/services/audit.js';`
- `import { eq, sql } from 'drizzle-orm';`

(`getBookingById` is already imported from `booking-service.ts`; `requireUser`, `assertOwner`, `error`, `redirect` already imported)

### i18n Keys

Add to `messages/en.json`:
```json
"booking_close_registration_button": "Close registration",
"booking_close_registration_confirm_title": "Close registration?",
"booking_close_registration_confirm_body": "This will immediately prevent new attendees from registering. Already registered attendees are not affected.",
"booking_close_registration_confirm_action": "Yes, close registration"
```

Add same keys to `messages/th.json` with empty string `""` for each — Rawinan handles Thai translation.

### Test Spec — Integration Tests

**File:** `tests/integration/registrations.test.ts` (append only — do NOT create a new file)

**Time-travel pattern for auto-close tests** (from test-design Appendix A):
```typescript
// Instead of sleeping: update registration_closes_at to the past in the fixture
await client.query(
  `UPDATE bookings SET registration_closes_at = NOW() - interval '1 second' WHERE id = $1`,
  [bookingId]
);
// Then invoke the handler directly with a stub job:
const { closeRegistrationHandler } = await import('../../src/lib/server/jobs/handlers/close-registration.js');
await closeRegistrationHandler({ id: 'test-job-id', name: 'close-registration', data: { bookingId } });
// Assert:
const { rows } = await client.query('SELECT registration_enabled FROM bookings WHERE id = $1', [bookingId]);
expect(rows[0].registration_enabled).toBe(false);
```

**`5.6-INT-001` (P0 — ACTIVATE, no `.skip`):**
- Seed booking with `registrationEnabled: true` and `registrationClosesAt: new Date(Date.now() - 1000)` (or set via SQL)
- Invoke `closeRegistrationHandler` directly
- Assert `registration_enabled = false` in DB
- Assert audit log row exists with `action = 'close-registration'`

**`5.6-INT-002` (P0 — ACTIVATE, no `.skip`) — MANDATORY PR GATE:**
- Seed booking with `registrationEnabled: false` (already closed)
- Invoke `closeRegistrationHandler` directly
- Assert no error thrown
- Assert `registration_enabled` still `false`
- Assert no duplicate audit log row inserted
- This is the R-004 MITIGATE gate test; `5.6-INT-002` is listed in the Mandatory PR gate in test-design

**`5.6-INT-003` (P1 — `test.skip`):**
- Worker restart idempotency; complex Testcontainers scenario; scaffold the test title and structure but `.skip` it

**`5.6-INT-004` (P1 — `test.skip`):**
- Direct action call sets `registration_enabled=false`; scaffold but `.skip`

**`5.6-INT-005` (P2 — `test.skip`):**
- Lint/AST scan of `close-registration.ts` for forbidden imports; scaffold but `.skip`

### R-004 Risk Mitigation — Double-fire Prevention

R-004 (BUS, score=6): Auto-close pg-boss job double-fires after worker restart.

**Mitigation strategy (implemented in this story):**
1. Handler re-reads `registrationEnabled` from DB inside a transaction; if already `false`, returns without error (double-fire safe — satisfies R-004 MITIGATE).
2. Handler re-reads `registrationClosesAt`; if it is `null` or in the future, returns without error (stale-job safe — handles: close date removed, or date extended after job was enqueued). Condition: `!booking.registrationClosesAt || booking.registrationClosesAt > new Date()`.
3. Multiple jobs per booking may coexist in the queue (standard policy, no dedup by `singletonKey`). This is intentional — all converge via the handler guards. No `ON CONFLICT DO NOTHING` surprise; edits to the closing date always enqueue a fresh job with the correct `startAfter`.
4. `5.6-INT-002` validates the idempotency path end-to-end (enabled guard).

**R-011 DOCUMENT (score=3):** Handler cannot import `$lib/*`, `$app/*`, `$env/dynamic`. Document this boundary in the handler file header (see Handler Spec above). `5.6-INT-005` (lint) is a P2 scaffold.

### Project Structure Notes

- No new DB migration needed — `registration_enabled` (boolean, notNull, default false) and `registration_closes_at` (timestamp with timezone, nullable) already exist on the `bookings` table from Story 4.4
- New file: `src/lib/server/jobs/handlers/close-registration.ts`
- Modified files: `src/lib/server/jobs/queues.ts`, `src/worker.ts`, `src/lib/server/services/booking-service.ts`, `src/routes/(app)/bookings/[id]/+page.server.ts`, `src/routes/(app)/bookings/[id]/+page.svelte`, `messages/en.json`, `messages/th.json`, `tests/integration/registrations.test.ts`

### Existing Patterns to Follow

- **Handler pattern:** `src/lib/server/jobs/handlers/send-email.ts` — `JobLike` interface, `Array.isArray(jobOrJobs)` normalization, Valibot `safeParse`, throw on invalid payload
- **Worker registration:** `src/worker.ts` lines 18–27 — `createQueue` then `work` then `as any` cast for WorkHandler type
- **Audit log pattern:** `writeAuditLog(tx, { actorId, entity, action, diff })` — same pattern used in `booking-service.ts` and `registration-service.ts`
- **`enqueueJob` signature:** `enqueueJob<T>(queue: string, data: T, options: SendOptions & { singletonKey?: string; key?: string })` in `src/lib/server/jobs/index.ts`
- **Cancel action pattern:** `src/routes/(app)/bookings/[id]/+page.server.ts` `cancel` action — exact same guard + redirect pattern for `closeRegistration`
- **Cancel modal pattern:** `src/routes/(app)/bookings/[id]/+page.svelte` lines 238–273 — copy this dialog structure for the close-registration confirm modal
- **Svelte 5 runes:** `$state()`, `$derived`, `$derived.by()`, `$props()` — no Svelte 4 `$:` reactive statements or `let` two-way bindings

### References

- `src/lib/server/jobs/queues.ts` — current queue constants and payload schemas
- `src/lib/server/jobs/index.ts` — `enqueueJob` helper and `SendOptions` type
- `src/lib/server/jobs/handlers/send-email.ts` — handler pattern (JobLike, array normalization, Valibot)
- `src/worker.ts` — queue registration and handler wiring pattern
- `src/lib/server/services/booking-service.ts` — `createBooking`, `updateBooking`, `cancelBooking` — audit log + transaction pattern
- `src/lib/server/db/schema/bookings.ts` — `registrationEnabled`, `registrationClosesAt` fields
- `src/routes/(app)/bookings/[id]/+page.server.ts` — `cancel` action pattern for `closeRegistration`
- `src/routes/(app)/bookings/[id]/+page.svelte` — cancel modal pattern for close-registration modal
- `tests/integration/registrations.test.ts` — existing test file to append to; seed helpers `seedBookingWithToken`, `seedRegistrant`
- `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` — full 5.6 test spec (5.6-INT-001..005, priorities, R-004 mitigation)
- [Source: epics.md#Story 5.6] FR-032, FR-033, FR-034b, FR-046
- [Source: architecture.md §Communication Patterns] queue naming: kebab-case, verb-led
- [Source: test-design-epic-5.md §Risk Register] R-004 (score=6), R-011 (score=3)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 9 tasks and subtasks implemented and verified. P0 tests 5.6-INT-001 and 5.6-INT-002 PASS.
- `close-registration.ts` handler uses relative imports only (R-011 DOCUMENT: no `$lib`, `$app/*`, `$env/dynamic`).
- Two idempotency guards in handler: (a) `registrationEnabled=false` → no-op (R-004 MITIGATE); (b) `registrationClosesAt` null or future → no-op (stale-job safe). Both guards tested by 5.6-INT-001/002.
- `enqueueJob` is called AFTER `db.transaction()` resolves in both `createBooking` and `updateBooking` — NOT inside the transaction callback (pg-boss uses its own connection).
- `singletonKey` under `standard` policy is metadata only; correctness comes from the two handler guards, not dedup. Multiple jobs per booking can coexist safely.
- Regression fix: bookings.test.ts and booking-token.test.ts file-level `beforeAll` now start pg-boss and create the CLOSE_REGISTRATION queue. This is needed because IT-001/003/004 and 4.4-INT-002 call `createBooking` with `registrationClosesAt` set, which triggers `enqueueJob`. Without pg-boss started, `enqueueJob` fails.
- `+page.svelte` was fully rewritten after a git stash conflict (story-5.8 stash) corrupted the file. All functionality preserved and verified clean.
- Paraglide messages compiled after adding 4 new keys: `npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`. TypeScript check: 0 errors, 0 warnings.
- Thai values intentionally left as `""` in `messages/th.json` — Rawinan handles all Thai translation.

### File List

- `src/lib/server/jobs/queues.ts` (modified)
- `src/lib/server/jobs/handlers/close-registration.ts` (new)
- `src/worker.ts` (modified)
- `src/lib/server/services/booking-service.ts` (modified)
- `src/routes/(app)/bookings/[id]/+page.server.ts` (modified)
- `src/routes/(app)/bookings/[id]/+page.svelte` (modified)
- `messages/en.json` (modified)
- `messages/th.json` (modified)
- `tests/integration/registrations.test.ts` (pre-committed as ATDD scaffolds at 016011f)
- `tests/integration/bookings.test.ts` (modified — regression fix: pg-boss lifecycle)
- `tests/integration/booking-token.test.ts` (modified — regression fix: pg-boss lifecycle)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-16 | 1.0 | Initial implementation: all 9 tasks complete; P0 tests pass; regressions fixed | claude-sonnet-4-6 |
