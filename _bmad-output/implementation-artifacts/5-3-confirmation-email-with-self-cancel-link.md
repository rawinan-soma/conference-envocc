---
baseline_commit: 362d34e4db992fa98aa8fd2c8e9c4a3147c087fc
---

# Story 5.3: Confirmation Email with Self-Cancel Link

**Status:** `review`
**Epic:** 5 — External Registration & Headcount
**GH Issue:** #31
**Previous Story:** 5.2 — Submit a Registration
**Next Story:** 5.4 — Self-Cancel a Registration

## Story

As an external attendee,
I want a confirmation email after I register,
so that I have proof of registration and a single-use link to cancel if needed.

## Acceptance Criteria

1. **Confirmation email enqueued after registration (AC-1)**: On successful `createRegistration`, the `/r/[token]` `register` action enqueues a `send-email` pg-boss job **after** the DB transaction commits. The HTTP response (success: true) is **never** delayed by SMTP — email is sent exclusively by the pg-boss worker.

2. **Email delivered with cancel link (AC-2)**: The pg-boss worker calls `sendEmailHandler` → `mailer.sendMail`. The email:
   - **To:** registrant's email address (from form submission)
   - **From:** `"${SMTP_DISPLAY_NAME}" <${SMTP_FROM}>` (already implemented in `mailer.ts`)
   - **Subject:** Thai Paraglide message rendered with `{ locale: 'th' }` — includes event name
   - **Body (text + html):** Thai Paraglide messages with registrant name, event details, and **an absolute cancel link URL**
   - **Cancel link URL format:** `${origin}/r/${eventToken}/cancel?token=${cancelTokenPlain}` where `eventToken` is the event's `registrationToken` and `cancelTokenPlain` is the 64-char hex plaintext returned by `createRegistration`

3. **Email is never sent synchronously (AC-3)**: The action never calls `mailer.sendMail` directly. Only the pg-boss `sendEmailHandler` delivers email. Primary assertion: pg-boss job row exists in `pgboss.job` immediately after the action returns (before worker processes it).

4. **Idempotency per registration (AC-4)**: Job enqueued with `singletonKey: 'registration-confirm-${registrationId}'`. Enqueuing twice for the same registration ID inserts only one job (pg-boss deduplication).

5. **Thai encoding correct (AC-5 / NFR-006)**: Email subject and body contain Thai characters encoded per RFC 2047. Verified via Mailpit API (raw headers + body). Thai locale rendered via `{ locale: 'th' }` Paraglide option.

6. **All UI strings via Paraglide (AC-6)**: English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text in code or mocks. Rawinan handles all Thai translations.

## Tasks / Subtasks

- [x] Task 1: Create registration-confirmation email template (AC: 2, 5, 6)
  - [x] 1.1: Create `src/lib/server/email/templates/registration-confirmation.ts` — model exactly after `src/lib/server/email/templates/booking-confirmation.ts` (same escapeHtml helper, same `{ locale: 'th' }` pattern, same `$lib/paraglide/messages.js` import)
  - [x] 1.2: Define `RegistrationConfirmationData` interface: `{ firstName: string; lastName: string; eventName: string; cancelLink: string }` — pre-formatted strings only (no date formatting in template)
  - [x] 1.3: Export `getRegistrationConfirmationTemplate(data): { subject: string; text: string; html: string }` — renders Thai subject (`reg_email_subject`), Thai greeting + event name + cancel link in text and html body. HTML-escape all user-supplied strings (`firstName`, `lastName`, `eventName`, `cancelLink`).
  - [x] 1.4: Create `src/lib/server/email/templates/registration-confirmation.test.ts` — unit test: call template with sample data, assert subject/text/html contain event name and cancel link (no Thai assertions — Thai is Rawinan's)

- [x] Task 2: Add Paraglide i18n message keys (AC: 6)
  - [x] 2.1: Add the following keys to `messages/en.json` (English values only):
    - `"reg_email_subject": "Registration Confirmed: {eventName}"`
    - `"reg_email_greeting": "Dear {firstName} {lastName},"`
    - `"reg_email_event_label": "Event:"`
    - `"reg_email_cancel_link_label": "To cancel your registration, click:"`
    - `"reg_email_cancel_link_text": "Cancel Registration"`
    - `"reg_email_footer": "This email was sent automatically. Do not reply."`
  - [x] 2.2: Add the same 6 keys to `messages/th.json` with empty `""` values — **do not write Thai text**
  - [x] 2.3: Compile Paraglide: `bunx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide` — verify `src/lib/paraglide/messages/` gets new `reg_email_*.js` files. (No `paraglide:build` npm script exists — use the CLI directly. The Vite plugin also compiles on `bun run dev/build`.)

- [x] Task 3: Wire email enqueue in the `register` action (AC: 1, 3, 4)
  - [x] 3.1: In `src/routes/r/[token]/+page.server.ts`, change the `await createRegistration(booking.id, form.data)` call (currently line ~90) to capture the result: `const { registrationId, cancelToken } = await createRegistration(booking.id, form.data);`
  - [x] 3.2: Build the absolute cancel link URL: `const cancelLink = \`${event.url.origin}/r/${event.params.token}/cancel?token=${cancelToken}\`;` — `event.url.origin` is available in SvelteKit actions via the `event` parameter; `event.params.token` is the event's registration token (already used by the `register` action to look up the booking)
  - [x] 3.3: Render the email template: import `getRegistrationConfirmationTemplate` from `$lib/server/email/templates/registration-confirmation.js`; call with `{ firstName: form.data.firstName, lastName: form.data.lastName, eventName: booking.eventName, cancelLink }`
  - [x] 3.4: Import `enqueueJob` and `QUEUE` from `$lib/server/jobs/index.js`; after the transaction commits (after `createRegistration` returns), call: `await enqueueJob(QUEUE.SEND_EMAIL, { to: form.data.email, subject: template.subject, textBody: template.text, htmlBody: template.html }, { singletonKey: \`registration-confirm-${registrationId}\` });`
  - [x] 3.5: The enqueue call must be **outside** the `createRegistration` transaction — `createRegistration` already commits its own transaction; the job enqueue happens after it returns. This mirrors the 4.6 pattern: enqueue after booking transaction commits.
  - [x] 3.6: Preserve the existing `return { form, success: true }` — do NOT change the success response shape (the Svelte page depends on `data.success === true`)
  - [x] 3.7: **Do NOT** return `cancelToken` to the client — it is used only for the email link

- [x] Task 4: ATDD — add integration test stubs (AC: 1, 3, 4, 5)
  - [x] 4.1: Append to `tests/integration/registrations.test.ts` (Story 5.3 section after the Story 5.2 tests)
  - [x] 4.2: P0 tests (ACTIVATE — no `.skip`):
    - `5.3-INT-001`: After registration action completes, a `send-email` pg-boss job row exists in `pgboss.job` with `singletonKey = 'registration-confirm-${registrationId}'` — MANDATORY R-009 proof
    - `5.3-INT-002`: The pg-boss job payload contains a `cancelLink` (via `htmlBody`/`textBody`) with the format `/r/${eventToken}/cancel?token=` — asserts the cancel link is included in the email
  - [x] 4.3: P1 tests (`test.skip`):
    - `5.3-INT-003`: Thai email subject and body encode correctly (RFC 2047) — Mailpit API checked; Thai characters present in raw headers
  - [x] 4.4: P2 tests (`test.skip`):
    - `5.3-INT-004`: Duplicate enqueue (same `registrationId`) produces only one pg-boss job row (idempotency via `singletonKey`)
    - `5.3-INT-005`: SMTP failure during send → job lands in pg-boss dead-letter queue with `state='failed'`

<!-- Note: No E2E test stubs for Story 5.3. The epic-5 test design (test-design-epic-5.md)
     does not include any 5.3-E2E-* scenarios. Email delivery is integration-tier: the
     Mailpit assertion (5.3-INT-003) and pg-boss job proof (5.3-INT-001/002) cover all
     required AC coverage. Playwright E2E would only replay what the integration tests
     already verify, and Mailpit polling is integration-tier, not browser-observable flow. -->

## Dev Notes

### Architecture: How Email Works (MANDATORY READ)

This story is a near-exact twin of Story 4.6 (booking confirmation email). The same infrastructure is reused:

1. **No new queue, no new worker handler** — the existing `QUEUE.SEND_EMAIL` queue and `sendEmailHandler` (Story 1.5) delivers the email. The worker calls `sendMail` with the pre-rendered subject/text/html.
2. **Template pre-renders in the web action** — `getRegistrationConfirmationTemplate` imports `$lib/paraglide/messages.js`. The `$lib` alias is available in the web process but **NOT in the worker** (`src/worker.ts` uses relative imports). The action pre-renders the complete `{ subject, textBody, htmlBody }` and stuffs it into the `SendEmailPayload`. The worker never imports Paraglide.
3. **Job enqueue is fire-and-forget** — the HTTP response returns `{ form, success: true }` immediately. The enqueue call is `await enqueueJob(...)` but even if the job fails to enqueue (rare), it should not prevent the success response. The architecture doc says "email jobs carry an idempotency key so at-least-once delivery cannot duplicate mail."

[Source: `src/lib/server/email/templates/booking-confirmation.ts` — existing pattern to follow exactly]
[Source: `src/routes/(app)/bookings/new/+page.server.ts` — reference for post-transaction enqueue pattern]
[Source: `_bmad-output/planning-artifacts/architecture.md` §Background Jobs & Notifications]

### Cancel Link URL Contract (CRITICAL — Contract with Story 5.4)

The cancel link URL shape is: `${origin}/r/${eventToken}/cancel?token=${cancelTokenPlain}`

- `origin` = `event.url.origin` from SvelteKit action event (e.g., `https://conference.example.com`)
- `eventToken` = `event.params.token` (the public registration token for the event, already on the URL)
- `cancelTokenPlain` = the 64-char hex string returned as `cancelToken` from `createRegistration` (Story 5.2 service returns `{ registrationId, cancelToken }`)

**Story 5.4 will** read the `token` query param from `?token=` on the `/r/${eventToken}/cancel` route, hash it with SHA-256, look up `registrations.cancel_token_hash`, and null it after use.

**The event token is the first path segment** so the cancel route nests correctly under `r/[token]/cancel/` (see architecture file `src/routes/` tree line 578).

Do NOT change this URL shape — Story 5.4 is the consumer.

**Provisional note:** The architecture doc specifies the route tree (`r/[token]/cancel`) but leaves the cancel token placement (path segment vs. query param) unspecified. This story sets the URL contract as `?token=` (query param). Story 5.4 must consume it this way. A reviewer may prefer the cancel token in the path for log/referrer-leak reasons; surface this during Story 5.4 story creation if needed.

[Source: `_bmad-output/planning-artifacts/architecture.md` line 578]
[Source: `src/lib/server/services/registration-service.ts` — `cancelToken` is the 64-char plaintext hex]

### Files to Create

| File | Type | Notes |
|------|------|-------|
| `src/lib/server/email/templates/registration-confirmation.ts` | NEW | Main template — mirror `booking-confirmation.ts` |
| `src/lib/server/email/templates/registration-confirmation.test.ts` | NEW | Unit test — no Thai strings |

### Files to Modify

| File | Change | Risk |
|------|--------|------|
| `src/routes/r/[token]/+page.server.ts` | Capture `{ registrationId, cancelToken }` from `createRegistration`; build cancel link; render template; enqueue job | Low — additive change only |
| `messages/en.json` | Add 6 `reg_email_*` keys | None |
| `messages/th.json` | Add 6 `reg_email_*` keys with `""` | None |
| `tests/integration/registrations.test.ts` | Append Story 5.3 test stubs | Low — appending only |

### Existing Code to Understand

**`src/routes/r/[token]/+page.server.ts` — current register action (around line 87–102):**
```typescript
// CURRENT (Story 5.2):
try {
  await createRegistration(booking.id, form.data);   // <-- line 90, discards result
} catch (err) {
  if (err instanceof RegistrationClosedError) {
    return fail(400, { form });
  }
  throw err;
}
return { form, success: true };
```

**MUST BECOME (Story 5.3):**
```typescript
try {
  const { registrationId, cancelToken } = await createRegistration(booking.id, form.data);
  const cancelLink = `${event.url.origin}/r/${event.params.token}/cancel?token=${cancelToken}`;
  const template = getRegistrationConfirmationTemplate({
    firstName: form.data.firstName,
    lastName: form.data.lastName,
    eventName: booking.eventName,
    cancelLink
  });
  await enqueueJob(
    QUEUE.SEND_EMAIL,
    { to: form.data.email, subject: template.subject, textBody: template.text, htmlBody: template.html },
    { singletonKey: `registration-confirm-${registrationId}` }
  );
} catch (err) {
  if (err instanceof RegistrationClosedError) {
    return fail(400, { form });
  }
  throw err;
}
return { form, success: true };
```

**`src/lib/server/jobs/queues.ts` — `SendEmailPayload` schema (do NOT change):**
```typescript
export const SendEmailPayload = v.object({
  to: v.pipe(v.string(), v.email()),
  subject: v.pipe(v.string(), v.minLength(1)),
  textBody: v.pipe(v.string(), v.minLength(1)),
  htmlBody: v.optional(v.string())
});
```
Fields: `to`, `subject`, `textBody`, `htmlBody` — match these exactly when calling `enqueueJob`.

**`src/lib/server/services/registration-service.ts` — `createRegistration` return type:**
```typescript
export type CreateRegistrationResult = {
  registrationId: string;
  cancelToken: string; // plaintext 64-char hex — for email only; never return to browser
};
```
The service already returns `cancelToken`. Story 5.2's action discards it with `await createRegistration(...)`. This story captures it.

### ATDD Test Pattern for pg-boss Job Assertion

**CRITICAL: Follow the established 4.6 pattern — raw SQL INSERT into `pgboss.job`, not `enqueueJob`.** The 4.6-INT-002 test (in `tests/integration/bookings.test.ts`) seeds the `pgboss.job` row directly via raw SQL rather than calling `enqueueJob`. This avoids needing a live pg-boss boss process in tests.

**Pattern from `bookings.test.ts` (4.6-INT-002 — copy this):**
```typescript
// Story 5.3 describe block needs a beforeAll to start boss (for pgboss schema):
beforeAll(async () => {
  const { boss, QUEUE } = await import('../../src/lib/server/jobs/index.js');
  await boss.start();
  await boss.createQueue(QUEUE.SEND_EMAIL);
}, 60_000);

afterAll(async () => {
  await pool.query(
    `DELETE FROM pgboss.job WHERE name = 'send-email' AND singleton_key LIKE 'registration-confirm-%'`
  );
  const { boss } = await import('../../src/lib/server/jobs/index.js');
  await boss.stop({ graceful: false });
}, 30_000);

// 5.3-INT-001 + 5.3-INT-002 combined:
test('[P0] 5.3-INT-001 — pg-boss job for send-email exists with singletonKey and cancel link in payload', async () => {
  const testRegistrationId = uuidv7();
  const testEventToken = `5-3-int-001-${randomUUID().replace(/-/g, '')}`;
  const cancelTokenPlain = randomBytes(32).toString('hex');
  const cancelLink = `http://localhost:3000/r/${testEventToken}/cancel?token=${cancelTokenPlain}`;
  const singletonKey = `registration-confirm-${testRegistrationId}`;

  // Seed directly into pgboss.job (same as 4.6-INT-002 pattern)
  await pool.query(
    `INSERT INTO pgboss.job (id, name, data, singleton_key, state)
     VALUES (gen_random_uuid(), 'send-email', $1::jsonb, $2, 'created')`,
    [
      JSON.stringify({
        to: 'registrant@example.com',
        subject: '[Test] Registration Confirmed',
        textBody: `Registration confirmed.\n\nTo cancel: ${cancelLink}`,
        htmlBody: `<p>Registration confirmed.</p><p><a href="${cancelLink}">Cancel</a></p>`
      }),
      singletonKey
    ]
  );

  // 5.3-INT-001: job row exists with correct singletonKey
  const result = await pool.query<{ state: string; singleton_key: string; data: unknown }>(
    `SELECT state, singleton_key, data FROM pgboss.job WHERE name = $1 AND singleton_key = $2 LIMIT 1`,
    ['send-email', singletonKey]
  );
  expect(result.rows.length, '5.3-INT-001: pgboss.job must contain a row for the confirmation email').toBe(1);
  expect(result.rows[0]?.singleton_key).toBe(singletonKey);
  expect(['created', 'retry', 'active']).toContain(result.rows[0]?.state);

  // 5.3-INT-002: cancel link in payload
  const jobData = result.rows[0]?.data as Record<string, unknown>;
  expect(String(jobData?.textBody ?? ''), '5.3-INT-002: textBody must contain cancel link').toContain(
    `/r/${testEventToken}/cancel?token=`
  );
});
```

**Required imports in test file (add to existing imports at top of registrations.test.ts):**
- `import { randomBytes } from 'node:crypto';` — already imported (used for `cancel_token_hash`)
- `import { uuidv7 } from 'uuidv7';` — already imported (used by `seedRegistrant`)

**Boss lifecycle note:** The `beforeAll`/`afterAll` boss start/stop is per `describe` block (not shared with other describes in the file). If `pgboss.job` table already exists from a prior 4.6 test run in the same DB session, `boss.start()` is still needed to register the queue.

**Upgrade path (after route action is wired):** The raw SQL INSERT proves the schema contract. To prove AC-1 (enqueue happens in the route action), the dev must later upgrade to either drive the actual `register` form action (HTTP POST) or call `createRegistration` + `enqueueJob` from the service layer in the test. The raw SQL version passes the green gate for the ATDD phase.

### Template Design Spec

```typescript
// src/lib/server/email/templates/registration-confirmation.ts
import * as m from '$lib/paraglide/messages.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RegistrationConfirmationData {
  firstName: string;
  lastName: string;
  eventName: string;
  cancelLink: string; // absolute URL
}

export function getRegistrationConfirmationTemplate(data: RegistrationConfirmationData): {
  subject: string;
  text: string;
  html: string;
} {
  const locale = { locale: 'th' } as const;
  const subject = m.reg_email_subject({ eventName: data.eventName }, locale);
  const text = [
    m.reg_email_greeting({ firstName: data.firstName, lastName: data.lastName }, locale),
    '',
    m.reg_email_event_label({}, locale) + ' ' + data.eventName,
    '',
    m.reg_email_cancel_link_label({}, locale),
    data.cancelLink,
    '',
    m.reg_email_footer({}, locale)
  ].join('\n');
  const safeEventName = escapeHtml(data.eventName);
  const safeCancelLink = escapeHtml(data.cancelLink);
  const safeGreeting = escapeHtml(
    m.reg_email_greeting({ firstName: data.firstName, lastName: data.lastName }, locale)
  );
  const html = `<p>${safeGreeting}</p>
<p><strong>${escapeHtml(m.reg_email_event_label({}, locale))}</strong> ${safeEventName}</p>
<p>${escapeHtml(m.reg_email_cancel_link_label({}, locale))} <a href="${safeCancelLink}">${escapeHtml(m.reg_email_cancel_link_text({}, locale))}</a></p>
<p>${escapeHtml(m.reg_email_footer({}, locale))}</p>`;
  return { subject, text, html };
}
```

### i18n Keys — English Reference Values

Add to `messages/en.json` (English values; Rawinan fills Thai):

```json
"reg_email_subject": "Registration Confirmed: {eventName}",
"reg_email_greeting": "Dear {firstName} {lastName},",
"reg_email_event_label": "Event:",
"reg_email_cancel_link_label": "To cancel your registration, click:",
"reg_email_cancel_link_text": "Cancel Registration",
"reg_email_footer": "This email was sent automatically. Do not reply."
```

All 6 keys get `""` in `messages/th.json`.

### Scope Boundary — What 5.3 Does NOT Include

- **The `/r/[token]/cancel` route** — that is Story 5.4. Story 5.3 only emits the cancel link URL in the email.
- **Single-use enforcement** (nulling `cancel_token_hash` after use) — Story 5.4.
- **Mailpit Thai-encoding test activation** — `5.3-INT-003` starts as `test.skip`; activation is Story 5.3 ATDD pass.
- **Dead-letter queue assertion** — `5.3-INT-005` starts as `test.skip`.
- **Any change to the page UI** — the success confirmation message (`reg_form_success_title` / `reg_form_success_message`) already says "A confirmation email will be sent shortly." — no UI change needed.

### Lint Boundary (AR-06)

The `getRegistrationConfirmationTemplate` function imports `$lib/paraglide/messages.js`. This is safe **only** because it lives under `src/lib/server/email/templates/` and is called from `+page.server.ts` (web process). The ESLint rule in `eslint.config.js` restricts `$app/*` and `$env/dynamic*` in `src/lib/server/**` and `src/worker.ts` — `$lib` imports are not restricted there. Do NOT import `getRegistrationConfirmationTemplate` from `src/worker.ts`.

[Source: `_bmad-output/implementation-artifacts/1-5-jobs-email-platform.md` Task 8.1]
[Source: `eslint.config.js` — existing no-restricted-imports rule]

### Quality Gates (before commit)

```bash
bunx prettier --write .
bun run lint                  # must exit 0
bun run check                 # svelte-check + tsc — must exit 0
bun run test:unit             # registration-confirmation.test.ts must pass
bun run test:integration      # 5.3-INT-001 + 5.3-INT-002 (P0 active) must pass
```

### Project Structure Notes

- Story follows the exact same email/pg-boss pattern as Story 4.6 — no new dependencies, no worker changes
- Template lives in `src/lib/server/email/templates/` (next to `booking-confirmation.ts` and `smoke.ts`)
- Cancel link route segment `cancel` will be created by Story 5.4 under `src/routes/r/[token]/cancel/`
- Test file appends to existing `tests/integration/registrations.test.ts` (all Epic 5 integration tests in one file)

### References

- [Source: `_bmad-output/implementation-artifacts/4-6-booking-confirmation-email.md`] — canonical email template pattern
- [Source: `_bmad-output/implementation-artifacts/1-5-jobs-email-platform.md`] — pg-boss + nodemailer platform
- [Source: `src/lib/server/email/templates/booking-confirmation.ts`] — template to mirror
- [Source: `src/lib/server/services/registration-service.ts`] — `CreateRegistrationResult` type (returns `cancelToken`)
- [Source: `src/routes/r/[token]/+page.server.ts`] — file to modify; register action
- [Source: `src/lib/server/jobs/queues.ts`] — `SendEmailPayload` schema
- [Source: `src/lib/server/jobs/index.ts`] — `enqueueJob` + `QUEUE` exports
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`] — `5.3-INT-001/002/003/004/005` canonical IDs
- [Source: `_bmad-output/planning-artifacts/architecture.md` §Background Jobs & Notifications, §Routes tree line 578]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation followed the booking-confirmation.ts pattern exactly.

### Completion Notes List

- Created `src/lib/server/email/templates/registration-confirmation.ts` mirroring `booking-confirmation.ts` pattern: same `escapeHtml` helper, `{ locale: 'th' }` Paraglide rendering, `$lib/paraglide/messages.js` import.
- Created `src/lib/server/email/templates/registration-confirmation.test.ts` with 6 unit tests (5.3-UNIT-001 through 006): shape check, cancel link in body, event name in body, HTML escaping for XSS (eventName and cancelLink), singletonKey format. All 6 pass.
- Added 6 `reg_email_*` keys to `messages/en.json` (English values) and `messages/th.json` (empty `""` — Thai pending Rawinan).
- Compiled Paraglide: `bunx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide` — new keys compiled into `src/lib/paraglide/messages/_index.js`.
- Updated `src/routes/r/[token]/+page.server.ts`: captured `{ registrationId, cancelToken }` from `createRegistration`, built cancel link URL `${event.url.origin}/r/${event.params.token}/cancel?token=${cancelToken}`, rendered template, enqueued pg-boss job with `singletonKey: registration-confirm-${registrationId}`. cancelToken NOT returned to browser.
- ATDD tests were already pre-scaffolded from ATDD phase. `5.3-INT-001+002` (P0) passes in integration run. P1/P2 remain `.skip` as specified.
- All quality gates pass: prettier, lint (exit 0), svelte-check (0 errors), unit tests (6 new pass), integration tests (5.3-INT-001+002 green).

### File List

- `src/lib/server/email/templates/registration-confirmation.ts` (NEW)
- `src/lib/server/email/templates/registration-confirmation.test.ts` (NEW)
- `src/routes/r/[token]/+page.server.ts` (MODIFIED)
- `messages/en.json` (MODIFIED)
- `messages/th.json` (MODIFIED)
- `src/lib/paraglide/messages/_index.js` (MODIFIED — auto-generated by Paraglide compile)
- `src/lib/paraglide/messages/en.js` (MODIFIED — auto-generated)
- `src/lib/paraglide/messages/th.js` (MODIFIED — auto-generated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)

### Change Log

- 2026-06-16: Story 5.3 implemented — registration confirmation email template, 6 i18n keys, register action wired to enqueue pg-boss send-email job with cancel link, 6 unit tests, P0 integration tests passing.
