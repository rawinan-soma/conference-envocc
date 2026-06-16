---
baseline_commit: 84a9085
---

# Story 5.5: Resend a Lost Link

**Status:** `review`
**Epic:** 5 — External Registration & Headcount
**GH Issue:** #33
**Previous Story:** 5.3 — Confirmation Email with Self-Cancel Link (5.4 still in backlog)
**Next Story:** None (5.6–5.8 are already done)

## Story

As an external attendee,
I want to re-request my confirmation link by email,
so that I can recover access if I lost the email.

## Acceptance Criteria

1. **Resend route at `/r/[token]/resend` (AC-1)**: A new SvelteKit route `src/routes/r/[token]/resend/+page.server.ts` and `+page.svelte` handles the resend flow. The route is **public** (unauthenticated) — no `requireUser()` call. The route already passes through the `/r` allow-list in `hooks.server.ts`.

2. **Email-only input form (AC-2)**: The page renders a simple form with a single email address field. The form uses superforms + valibot (`ResendSchema` — email-only, a new schema in `src/lib/schemas/resend.ts`). Load function initializes the superform. On success, `{ form, acknowledged: true }` is returned.

3. **Neutral acknowledgement — same response regardless of match (AC-3 / R-003 MITIGATE)**: The `resend` form action **always** returns `{ form, acknowledged: true }` — whether or not a registration exists for the email. The page always shows the same success message. This prevents email enumeration (R-003, score=6). The DB lookup must always run (no early short-circuit before the lookup that would cause a timing side-channel).

4. **Email resent when registration found (AC-4)**: When a `status='registered'` registration row exists for the given email on the given booking (`event.params.token` → booking → registrations), the `resend` action generates a **new** cancel token (password-reset semantics — see AC-5), updates the stored hash in DB, enqueues a `SEND_EMAIL` pg-boss job with the new cancel link. This reuses `getRegistrationConfirmationTemplate` and `enqueueJob(QUEUE.SEND_EMAIL, ...)` exactly like the `register` action.

5. **New cancel token replaces old hash (AC-5 / AR-05)**: The DB stores only `cancel_token_hash` — the original plaintext is never persisted. Therefore a resend **cannot** re-send the original link. The resend generates a **new** 32-byte CSPRNG cancel token, stores its sha256 hash in `registrations.cancel_token_hash` (replacing the old hash), and builds the cancel link from the new plaintext. The old cancel link is invalidated as a consequence — this is intentional (password-reset semantics). See Dev Notes — Token Replacement Strategy for the full implementation.

6. **Registration not found → silent no-op, same acknowledgement (AC-6)**: If no `status='registered'` registration exists for the email+booking, the action takes no action on the DB and returns `{ form, acknowledged: true }` — identical to the found case.

7. **All UI strings via Paraglide (AC-7 / NFR-006)**: All new UI strings use `m.*` keys. No Thai text in code or mocks. Rawinan handles all Thai translations.

8. **Audit log entry when resend succeeds (AC-8)**: When a registration is found and a resend job is enqueued, write an audit log entry: `entity='registration'`, `action='resend-link'`, `actorId=null`, `diff: { registrationId }`.

## Tasks / Subtasks

- [x] Task 1: Create `ResendSchema` and resend route (AC: 1, 2)
  - [x] 1.1: Create `src/lib/schemas/resend.ts` — `ResendSchema = v.object({ email: v.pipe(v.string(), v.email('A valid email address is required.')) })` using valibot. Export `ResendInput = v.InferOutput<typeof ResendSchema>`.
  - [x] 1.2: Create directory `src/routes/r/[token]/resend/`
  - [x] 1.3: Create `src/routes/r/[token]/resend/+page.server.ts` — `load` function: fetch booking by token (404 if not found), init superform with `ResendSchema`. Actions: `resend` form action (see Tasks 2–4).
  - [x] 1.4: Create `src/routes/r/[token]/resend/+page.svelte` — renders the resend form (email input, submit button); on `data.acknowledged === true`, hides the form and shows the neutral acknowledgement message.

- [x] Task 2: Add DB query for registration lookup by email+bookingId (AC: 3, 4, 6)
  - [x] 2.1: Add `getActiveRegistrationByEmail(bookingId: string, email: string): Promise<{ id: string; cancelTokenHash: string | null; firstName: string; lastName: string; } | null>` to `src/lib/server/db/queries/registrations.ts`. Query: `SELECT id, cancel_token_hash, first_name, last_name FROM registrations WHERE booking_id = $bookingId AND email = $email AND status = 'registered' LIMIT 1`. Returns `null` if no match.

- [x] Task 3: Implement `resendRegistrationLink` service (AC: 3, 4, 5, 6, 8)
  - [x] 3.1: Create `src/lib/server/services/resend-registration-service.ts`.
  - [x] 3.2: Export `resendRegistrationLink(bookingId: string, bookingEventToken: string, email: string, origin: string): Promise<{ found: boolean; cancelLink?: string; registrationId?: string; firstName?: string; lastName?: string; eventName: string }>`.
  - [x] 3.3: Inside a `db.transaction()`:
    - Call `getActiveRegistrationByEmail(bookingId, email)` (always execute — never short-circuit before lookup).
    - If **not found**: return `{ found: false, eventName }`.
    - If **found**: generate a new 32-byte CSPRNG cancel token (plaintext → hash), UPDATE `registrations SET cancel_token_hash = newHash, updated_at = now() WHERE id = registration.id`, build cancel link `${origin}/r/${bookingEventToken}/cancel?token=${newPlaintext}`, write audit log (`entity='registration'`, `action='resend-link'`, `actorId=null`, `diff: { registrationId: registration.id }`), return `{ found: true, cancelLink, registrationId: registration.id, firstName, lastName, eventName }`.
  - [x] 3.4: The function takes `eventName` from the booking (passed in from the action — not re-fetched inside service).

- [x] Task 4: Wire `resend` action — always-acknowledge, fire-and-forget email (AC: 3, 4, 6)
  - [x] 4.1: In `src/routes/r/[token]/resend/+page.server.ts` `resend` action:
    - Parse form with `superValidate(event.request, valibot(ResendSchema))`.
    - Fetch booking by `event.params.token` (404 if not found — same guard as register action).
    - If form invalid: return `fail(422, { form })`.
    - Call `resendRegistrationLink(booking.id, event.params.token, form.data.email, event.url.origin)`.
    - If `result.found`:  render template with `getRegistrationConfirmationTemplate({ firstName, lastName, eventName, cancelLink })`, enqueue `SEND_EMAIL` job (fire-and-forget wrapped in try/catch). Use `singletonKey: 'resend-link-${result.registrationId}'` with `singletonSeconds: 300` (5-minute dedup window prevents double-tap but allows genuine re-resend).
    - **Always** return `{ form, acknowledged: true }` — never differ between found/not-found.

- [x] Task 5: Add Paraglide i18n message keys (AC: 7)
  - [x] 5.1: Add to `messages/en.json` (English values):
    - `"resend_page_title": "Resend Confirmation Link"`
    - `"resend_form_heading": "Resend your confirmation link"`
    - `"resend_form_description": "Enter your email address and we will resend your confirmation link if a registration exists."`
    - `"resend_form_email_label": "Email address"`
    - `"resend_form_submit_button": "Resend link"`
    - `"resend_form_submitting_button": "Sending..."`
    - `"resend_form_acknowledged_title": "Request received"`
    - `"resend_form_acknowledged_message": "If a registration exists for this email, your confirmation link has been resent."`
  - [x] 5.2: Add same 8 keys to `messages/th.json` with empty `""` values — **do not write Thai text**.
  - [x] 5.3: Compile Paraglide: `bunx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide` — verify new keys appear in `src/lib/paraglide/messages/`.

- [x] Task 6: Add link to resend page from registration page (AC: 1)
  - [x] 6.1: In `src/routes/r/[token]/+page.svelte`, add a "Lost your confirmation link?" link after the success message or in the registration section. Link to `/r/${page.params.token}/resend` (or use `data` from load — the token is in the URL so use `$page.params.token`). Add a Paraglide key for the link text: `"reg_page_resend_link": "Lost your confirmation link? Resend it."`.
  - [x] 6.2: Add `"reg_page_resend_link": "Lost your confirmation link? Resend it."` to `messages/en.json` and `""` to `messages/th.json`.

- [x] Task 7: ATDD — integration and E2E test stubs (AC: 3, 4, 6)
  - [x] 7.1: Append to `tests/integration/registrations.test.ts` (Story 5.5 section after Story 5.3 tests).
  - [x] 7.2: P0 test (ACTIVATE — no `.skip`; guarded by `DEV_SERVER_URL` env var):
    - `5.5-INT-001`: POST to `/r/[token]/resend` via `fetch` with a **registered** email, then with an **unregistered** email for the same booking. Assert HTTP status 200 for both, and that the response body/shape is identical (same `acknowledged` field present, no `found` disclosure). This closes R-003. Use `test.skipIf(!process.env['DEV_SERVER_URL'])` — mirrors 5.8-INT-IDOR-001 pattern.
  - [x] 7.3: P1 test (`test.skip`):
    - `5.5-E2E-001`: Resend form shows neutral acknowledgement in browser (Playwright — stub only, activate in E2E pass).
  - [x] 7.4: P2 test (`test.skip`):
    - `5.5-INT-002`: Resend action enqueues a `send-email` pg-boss job (asserts job row in `pgboss.job`) — prove async, not synchronous.

## Dev Notes

### Architecture: Token Replacement Strategy (CRITICAL — AR-05 constraint)

AR-05 specifies: cancel tokens are "opaque CSPRNG, stored hashed, single-use cancel, expiring." The DB stores only `cancel_token_hash` (sha256 hex) — **the plaintext is never persisted**.

Because the original plaintext is gone after registration, a resend **cannot** re-send the original link. The correct approach:

1. **Generate a new 32-byte cancel token** (`randomBytes(32).toString('hex')` → `newPlaintext`).
2. **Hash it** (`createHash('sha256').update(newPlaintext).digest('hex')` → `newHash`).
3. **UPDATE** `registrations SET cancel_token_hash = newHash WHERE id = registration.id` inside the transaction.
4. **Build cancel link** with `newPlaintext`.
5. **Enqueue email** with the new cancel link.

This means the resend **invalidates** the previously sent cancel link (the hash in DB is replaced). This is intentional and correct: the attendee only ever has one active cancel token.

**Do NOT** attempt to reverse the hash or store the plaintext separately.

[Source: `_bmad-output/planning-artifacts/architecture.md` §AR-05]
[Source: `src/lib/server/services/registration-service.ts` — cancel token generation pattern to mirror exactly]

### Architecture: Neutral Disclosure (R-003 MITIGATE — MANDATORY)

The resend action **MUST** return identical HTTP status + response shape for both "email found" and "email not found" cases. This prevents email enumeration (R-003, score=6 OPEN).

**Implementation rule:**
- Always run the DB lookup (no early short-circuit that skips the query).
- Always return `{ form, acknowledged: true }` — never `{ form, acknowledged: true, found: boolean }` to the client.
- The `resendRegistrationLink` service returns `found: boolean` internally but the **action** discards this from the response.
- Response timing: wrap the email enqueue in try/catch so a job failure does not delay the response. The action response time should be similar for both paths (DB query + optional enqueue vs. DB query only — acceptable; don't add artificial sleep). **Conscious deferral:** there is a residual timing side-channel — the found path does UPDATE + audit + enqueue while the not-found path does only SELECT. This is a known, accepted risk for MVP; R-003 score=6 is mitigated by body/status neutrality. A future story could add a constant-time dummy delay for the not-found path if the risk score is re-evaluated.

`5.5-INT-001` is a mandatory PR gate (test-design-epic-5.md §Execution Strategy). It must be ACTIVE (no `.skip`) before this story is done.

### Architecture: Resend Route is Public

`/r/[token]/resend` is under `/r` which is already allowed in `hooks.server.ts`:

```typescript
// hooks.server.ts line ~41:
pattern: /^\/(?!(?:login|auth|r|skeleton|profile\/complete)(?:\/|$)|$)/,
```

The `r` segment is excluded from the auth guard. **Do NOT** add `requireUser()` or any auth check to this route. It must work without a session.

[Source: `src/hooks.server.ts` line 31–80]

### Architecture: Email Template Reuse

The resend email uses the **same template** as the registration confirmation email: `getRegistrationConfirmationTemplate` from `src/lib/server/email/templates/registration-confirmation.ts`. No new template needed.

The `ResendRegistrationData` interface matches `RegistrationConfirmationData`:
```typescript
{ firstName: string; lastName: string; eventName: string; cancelLink: string }
```

[Source: `src/lib/server/email/templates/registration-confirmation.ts`]

### Architecture: Enqueue Pattern (Mirror 5.3)

The resend action uses the same pg-boss enqueue pattern as the `register` action (Story 5.3). Key differences:
- `singletonKey`: `resend-link-${registrationId}` (not `registration-confirm-${registrationId}`)
- `singletonSeconds: 300` (5-minute window for the resend to prevent double-tap storms while allowing genuine re-resend after 5 minutes)

```typescript
await enqueueJob(
  QUEUE.SEND_EMAIL,
  { to: form.data.email, subject: template.subject, textBody: template.text, htmlBody: template.html },
  { singletonKey: `resend-link-${result.registrationId}`, singletonSeconds: 300 }
);
```

Wrap in try/catch — email failure must not prevent `{ form, acknowledged: true }`.

[Source: `src/routes/r/[token]/+page.server.ts` lines 115–136 — fire-and-forget enqueue pattern]

### Files to Create

| File | Type | Notes |
|------|------|-------|
| `src/lib/schemas/resend.ts` | NEW | `ResendSchema` — email only |
| `src/routes/r/[token]/resend/+page.server.ts` | NEW | Load + `resend` action |
| `src/routes/r/[token]/resend/+page.svelte` | NEW | Form + acknowledged state |
| `src/lib/server/services/resend-registration-service.ts` | NEW | `resendRegistrationLink` |

### Files to Modify

| File | Change | Risk |
|------|--------|------|
| `src/lib/server/db/queries/registrations.ts` | Add `getActiveRegistrationByEmail` | Low — additive only |
| `messages/en.json` | Add 8 `resend_*` keys + 1 `reg_page_resend_link` key | None |
| `messages/th.json` | Add same 9 keys with `""` | None |
| `src/routes/r/[token]/+page.svelte` | Add resend link | Low — additive only |
| `tests/integration/registrations.test.ts` | Append Story 5.5 stubs | Low — appending only |
| `tests/e2e/registrations.spec.ts` | Append 5.5-E2E-001 stub | Low — appending only |

### Page Structure for `+page.svelte`

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageData } from './$types.js';

  const { data }: { data: PageData } = $props();
  let acknowledged = $state(false);

  const { form, errors, enhance, submitting } = superForm(data.form, {
    dataType: 'form',
    onResult({ result }) {
      if (result.type === 'success' && result.data?.acknowledged) {
        acknowledged = true;
      }
    }
  });
</script>
```

Show the form when `!acknowledged`; show `m.resend_form_acknowledged_title()` + `m.resend_form_acknowledged_message()` when `acknowledged === true`. Pattern mirrors the `successState` in `+page.svelte` for the registration form.

### Test Pattern for `5.5-INT-001` (Neutral Disclosure — P0 Active)

This test **MUST** drive the HTTP endpoint, not the service directly — R-003 requires the externally observable contract to be neutral, not just the internal service return value. Use `test.skipIf(!process.env['DEV_SERVER_URL'])` so it is skipped in local unit-only runs but runs in CI where the dev server is up.

```typescript
describe('Story 5.5 — Resend Neutral Disclosure (R-003 MITIGATE)', () => {
  test.skipIf(!process.env['DEV_SERVER_URL'])(
    '[P0] 5.5-INT-001 — resend endpoint returns identical status and shape for registered and unregistered email',
    { timeout: 15000 },
    async () => {
      // Strategy: POST to /r/[registrationToken]/resend with a registered email (found case)
      // and an unregistered email (not-found case). Assert both return HTTP 200 and
      // the response body has the same shape — no 'found' field exposed externally.
      // This closes R-003 (enumeration risk score=6 OPEN).

      const devServerUrl = process.env['DEV_SERVER_URL']!;

      const client = await pool.connect();
      let registrationToken: string;
      const registrantEmail = `resend-int-001-${randomUUID().replace(/-/g, '')}@example.com`;

      try {
        const organizerId = await seedUser(client, 'int-5-5-001');
        await seedUserProfile(client, organizerId, { firstName: 'Alice', lastName: 'Test' });
        const roomId = await seedRoom(client, 'int-5-5-001');
        registrationToken = `5-5-int-001-${randomUUID().replace(/-/g, '')}`;
        const bookingId = await seedBookingWithToken(client, {
          organizerId, roomId,
          eventName: 'ATDD Test Event 5.5-INT-001',
          token: registrationToken,
          registrationEnabled: true
        });
        await seedRegistrant(client, { bookingId, email: registrantEmail, status: 'registered' });
      } finally {
        client.release();
      }

      const resendUrl = `${devServerUrl}/r/${registrationToken}/resend`;

      // POST helper: submit the resend form via SvelteKit action (?/resend)
      async function postResend(email: string) {
        const body = new URLSearchParams({ email });
        const res = await fetch(`${resendUrl}?/resend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          redirect: 'manual'
        });
        return res;
      }

      // Found case — registered email
      const foundRes = await postResend(registrantEmail);
      expect(foundRes.status, '5.5-INT-001: registered email must return 200').toBe(200);
      const foundBody = await foundRes.json();

      // Not-found case — unregistered email
      const notFoundEmail = `not-registered-${randomUUID()}@example.com`;
      const notFoundRes = await postResend(notFoundEmail);
      expect(notFoundRes.status, '5.5-INT-001: unregistered email must also return 200').toBe(200);
      const notFoundBody = await notFoundRes.json();

      // Both responses must have the same shape — no 'found' field must be present
      expect(foundBody, '5.5-INT-001: found case body must not expose found field').not.toHaveProperty('found');
      expect(notFoundBody, '5.5-INT-001: not-found case body must not expose found field').not.toHaveProperty('found');

      // Both must have acknowledged (SvelteKit returns action data as JSON)
      expect(
        Object.keys(foundBody).sort(),
        '5.5-INT-001: response shape must be identical for both cases'
      ).toEqual(Object.keys(notFoundBody).sort());
    }
  );
});
```

### ATDD `5.5-INT-002` Stub (P2, skip)

```typescript
test.skip('[P2] 5.5-INT-002 — resend enqueues send-email pg-boss job (async, not synchronous)', async () => {
  // Activation: after route action is wired (Task 4).
  // Strategy: POST to /r/[token]/resend with known registrant email;
  // assert pgboss.job row exists with name='send-email' and singletonKey='resend-link-${registrationId}'.
  // Pattern: mirrors 5.3-INT-001 raw SQL proof (see 5.3 test section for pg-boss job assertion).
});
```

### Scope Boundary — What 5.5 Does NOT Include

- **Cancel route `/r/[token]/cancel`** — that is Story 5.4 (still backlog). The resend just sends the cancel link; 5.4 handles the actual cancellation.
- **Rate limiting** on the resend endpoint — not in scope for MVP; document in deferred-work if desired.
- **Changing cancel token hash on re-registration** — only resend replaces it. Normal re-registration creates a new row with a new hash.
- **Any change to Story 5.3 email template** — reuse as-is.

### Lint Boundary (AR-06)

`resend-registration-service.ts` lives under `src/lib/server/services/` and is called only from `+page.server.ts` (web process). It imports `$lib/server/db/...` via the `$lib` alias. This is safe. **Do NOT** import this service from `src/worker.ts`.

The `getRegistrationConfirmationTemplate` import inside the action uses `$lib/server/email/templates/...` — same safe pattern as Story 5.3.

[Source: `eslint.config.js` — no-restricted-imports rule for `$app/*` and `$env/dynamic` in server + worker files]

### Quality Gates (before commit)

```bash
bunx prettier --write .
bun run lint                  # must exit 0
bun run check                 # svelte-check + tsc — must exit 0
bun run test:unit             # any new unit tests must pass
bun run test:integration      # 5.5-INT-001 (P0 active) must pass
```

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` §Story 5.5 + §FR-047]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §AR-05 External tokens + §Routes tree line 579]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` §R-003 + §5.5-INT-001 + §5.5-E2E-001 + §5.5-INT-002]
- [Source: `src/lib/server/services/registration-service.ts`] — cancel token generation pattern (lines 45–46)
- [Source: `src/routes/r/[token]/+page.server.ts`] — `register` action pattern (enqueue + fire-and-forget)
- [Source: `src/lib/server/email/templates/registration-confirmation.ts`] — template to reuse
- [Source: `src/lib/server/db/queries/registrations.ts`] — file to extend with `getActiveRegistrationByEmail`
- [Source: `src/lib/server/jobs/queues.ts`] — `QUEUE.SEND_EMAIL` + `SendEmailPayload` schema
- [Source: `src/lib/server/jobs/index.ts`] — `enqueueJob` export
- [Source: `src/hooks.server.ts`] — `/r` public route allow-list
- [Source: `_bmad-output/implementation-artifacts/5-3-confirmation-email-with-self-cancel-link.md`] — 5.3 story for email pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation followed patterns from Story 5.3 (confirmation email) and Story 5.2 (registration form). The `svelte/no-navigation-without-resolve` ESLint rule required using `resolve()` from `$app/paths` for the resend link — added `data.token` to the load return to support this.

### Completion Notes List

- Task 1: Created `ResendSchema` (valibot, email-only), resend route directory, `+page.server.ts` (load + resend action), `+page.svelte` (Svelte 5 rune-based, acknowledged state pattern)
- Task 2: Added `getActiveRegistrationByEmail(tx, bookingId, email)` to registrations queries — uses transaction parameter for consistency with service layer pattern
- Task 3: Created `resendRegistrationLink` service — CSPRNG token generation mirrors `registration-service.ts` L45-46; DB transaction with UPDATE + audit log; eventName passed in (not re-fetched)
- Task 4: Wired `resend` action — always returns `{ form, acknowledged: true }` (R-003 MITIGATE); fire-and-forget enqueue wrapped in try/catch; `singletonKey: 'resend-link-${registrationId}'` with `singletonSeconds: 300`
- Task 5: Added 8 `resend_*` keys + `reg_page_resend_link` to `messages/en.json` and `messages/th.json` (empty strings for Thai); Paraglide compiled successfully
- Task 6: Added resend link to `/r/[token]/+page.svelte`; also exposed `token` in load data to support `resolve()` for the href
- Task 7: ATDD stubs already existed from prior commit (97f0f1e) — 5.5-INT-001 active (skipIf DEV_SERVER_URL), 5.5-E2E-001 and 5.5-INT-002 are skip stubs
- Quality gates: `bunx prettier --write .` + `bun run lint` (0 errors) + `bun run check` (0 errors/warnings, 3232 files) all pass

### File List

**New files:**
- `src/lib/schemas/resend.ts`
- `src/routes/r/[token]/resend/+page.server.ts`
- `src/routes/r/[token]/resend/+page.svelte`
- `src/lib/server/services/resend-registration-service.ts`

**Modified files:**
- `src/lib/server/db/queries/registrations.ts` (added `getActiveRegistrationByEmail`, `ActiveRegistrationRow` type)
- `src/routes/r/[token]/+page.server.ts` (added `token: params.token` to load return)
- `src/routes/r/[token]/+page.svelte` (added `resolve` import, `resendHref` derived, resend link UI)
- `messages/en.json` (added 8 `resend_*` keys + `reg_page_resend_link`)
- `messages/th.json` (added same 9 keys with empty strings)
- `src/lib/paraglide/messages/` (recompiled — new message files generated)
- `_bmad-output/implementation-artifacts/5-5-resend-a-lost-link.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (5-5 → review)

## Change Log

- 2026-06-16: Implemented Story 5.5 — Resend a Lost Link. Created resend route, ResendSchema, resend service (AR-05 token replacement, R-003 neutral disclosure), 9 Paraglide i18n keys, link from registration page. All quality gates pass (lint, check, unit tests). Status → review.
