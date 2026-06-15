---
baseline_commit: 157943a59d467107455cc7b901d7fe3d176dfbee
---

# Story 5.2: Submit a Registration

**Status:** `ready-for-dev`
**Epic:** 5 — External Registration & Headcount
**GH Issue:** #30
**Previous Story:** 5.1 — Branded Public Registration Page
**Next Story:** 5.3 — Confirmation Email with Self-Cancel Link

## Story

As an external attendee,
I want to fill and submit the registration form,
So that I am registered for the event.

## Acceptance Criteria

1. **Registration form fields rendered (AC-1)**: When `registrationEnabled = true`, the `/r/[token]` page renders a registration form with: salutation title (Mr / Mrs / Ms / Other), free-text field when "Other" is selected, first name, last name, organization, and email address. All fields are required except `titleOtherText` (which becomes required only when title = "Other").

2. **Meal type shown when catering enabled (AC-2)**: When `cateringEnabled = true`, a meal type selector (Normal / Vegetarian / Muslim / Other) and a free-text "Other" field (required when meal = "Other") appear on the form. When `cateringEnabled = false`, the meal selector is not rendered; no meal field is submitted.

3. **Registrant record created on submit (AC-3)**: A valid form submission creates a row in the `registrations` table (`bookingId`, `title`, `titleOtherText`, `firstName`, `lastName`, `organization`, `email`, `mealType`, `mealTypeOtherText`, `cancelTokenHash`, `status='registered'`). An audit log entry is written inside the same transaction (`entity='registration'`, `action='create'`, `actorId=null` — unauthenticated).

4. **On-screen confirmation (AC-4)**: After successful submission the page shows a success confirmation message (no redirect). The form is no longer visible.

5. **Mobile-responsive in ≤ 2 minutes (AC-5 / NFR-004)**: The form is fully usable at 375 × 667px (no horizontal scroll) and 1280 × 800px without any degradation. An external attendee can complete registration in under 2 minutes.

6. **Server-side closed guard (AC-6 / R-005 MITIGATE)**: The `register` form action checks `registrationEnabled` before inserting any record. If `registrationEnabled = false`, the action returns 400 (fail). This guard is enforced even when the UI correctly hides the form, because direct POST bypass is a tested attack vector (`5.2-INT-CLOSED-001`).

7. **All UI strings via Paraglide (AC-7)**: English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text in code or mocks.

## Tasks / Subtasks

- [ ] Task 1: Create `registrations` Drizzle schema and migration (AC: 3)
  - [ ] 1.1: Create `src/lib/server/db/schema/registrations.ts` — see Schema Spec in Dev Notes
  - [ ] 1.2: Create `drizzle/0010_registrations.sql` — see Migration Spec in Dev Notes
  - [ ] 1.3: Add `export * from './registrations.js';` to `src/lib/server/db/schema/index.ts`
  - [ ] 1.4: Add `'registrations'` to `TRUNCATABLE_TABLES` in `tests/support/fixtures/pg-factory.ts` — **before** `'bookings'` (FK child before parent)
  - [ ] 1.5: Add schema assertion to `tests/integration/db-schema.test.ts` — assert all columns exist in `registrations` table

- [ ] Task 2: Create Valibot RegistrationSchema (AC: 1, 2)
  - [ ] 2.1: Create `src/lib/schemas/registration.ts` — see Schema Spec in Dev Notes
  - [ ] 2.2: Conditional meal type: `mealType` required when `cateringEnabled=true`, absent when `false`; uses `v.forward` with `v.literal('')` pattern (see `src/lib/schemas/booking.ts` for established pattern)
  - [ ] 2.3: Conditional title other text: `titleOtherText` required when `title='Other'`; uses same cross-field pattern

- [ ] Task 3: Create `createRegistrant` query and `createRegistration` service (AC: 3)
  - [ ] 3.1: Create `src/lib/server/db/queries/registrations.ts` — `createRegistrant(tx, data)` — inserts into `registrations` table inside a transaction
  - [ ] 3.2: Create `src/lib/server/services/registration-service.ts` — `createRegistration(bookingId, input)` — wraps everything in `db.transaction()`: check `registrationEnabled`, generate 32-byte CSPRNG cancel token, compute sha256 hash, call `createRegistrant(tx, ...)`, call `writeAuditLog(tx, ...)`, return plain token (for Story 5.3)
  - [ ] 3.3: Cancel token: `crypto.randomBytes(32)` → hex plaintext (never stored); `sha256(plaintext)` → stored as `cancelTokenHash` (AR-05)
  - [ ] 3.4: `actorId: null` in audit log (unauthenticated external registrant)

- [ ] Task 4: Add `register` form action to `src/routes/r/[token]/+page.server.ts` (AC: 3, 4, 6)
  - [ ] 4.1: Add `export const actions: Actions = { register: async (event) => { ... } }` — see Action Spec in Dev Notes
  - [ ] 4.2: Load `cateringEnabled` and `registrationEnabled` in the existing `load` function and return them to the page (they are already available on the `RegistrationPageRow` from `getBookingByRegistrationToken`)
  - [ ] 4.3: In the `register` action: re-query `getBookingByRegistrationToken(params.token)` → 404 if missing; check `registrationEnabled === false` → `fail(400, { form })` (R-005 MITIGATE mandatory guard)
  - [ ] 4.4: Validate with `superValidate(event.request, valibot(RegistrationSchema))`; `if (!form.valid) return fail(422, { form })`
  - [ ] 4.5: Call `createRegistration(booking.id, form.data)` → on success, return `{ form, success: true }`
  - [ ] 4.6: Also initialize the superform in `load` so the Svelte page has a `form` prop: `const form = await superValidate(valibot(RegistrationSchema))`
  - [ ] 4.7: Import `booking.id` from the query result — it is needed as `bookingId` when calling `createRegistration`

- [ ] Task 5: Update `src/routes/r/[token]/+page.svelte` — add form fields (AC: 1, 2, 4, 5, 7)
  - [ ] 5.1: Import `enhance` from `$app/forms` and `superForm` from `sveltekit-superforms`; wire form to `data.form`
  - [ ] 5.2: Replace the `<!-- Registration form placeholder: Story 5.2 will add form fields here -->` comment with the actual form (see UI Spec in Dev Notes)
  - [ ] 5.3: Salutation title `<select>` (Mr / Mrs / Ms / Other); show free-text `<input>` for "Other" only when title = "Other" (use `$derived` rune or reactive `$form.title === 'Other'`)
  - [ ] 5.4: Required text inputs: firstName, lastName, organization, email
  - [ ] 5.5: Conditional meal type selector (rendered only when `data.cateringEnabled`): Normal / Vegetarian / Muslim / Other; show free-text for Other
  - [ ] 5.6: On `data.success === true`, hide form and show confirmation message (Paraglide key `reg_form_success_title`, `reg_form_success_message`)
  - [ ] 5.7: Svelte 5 runes — use `$derived`, `$state` (via superForm), and `$props()` patterns only; no Svelte 4 reactive declarations

- [ ] Task 6: Add Paraglide message keys (AC: 7)
  - [ ] 6.1: Add all new `reg_form_*` keys to `messages/en.json` (English values) — see i18n Keys section in Dev Notes
  - [ ] 6.2: Add same keys to `messages/th.json` with empty string `""` — no Thai text in code; Rawinan handles translation
  - [ ] 6.3: Run `bun run paraglide:build` if `messages.js` needs refresh after adding keys

- [ ] Task 7: ATDD — add integration test stubs (AC: 3, 6)
  - [ ] 7.1: Append to `tests/integration/registrations.test.ts` — P0 tests must be activated (no `.skip`); P1 tests start as `test.skip`
  - [ ] 7.2: Add seed helper `seedRegistrant(client, opts)` to the test file — see Test Spec in Dev Notes
  - [ ] 7.3: P0 tests (ACTIVATE — no `.skip`):
    - `5.2-INT-001`: Valid form creates registrant row in DB (assert all columns)
    - `5.2-INT-CLOSED-001`: Direct POST when `registrationEnabled=false` returns 400 — MANDATORY R-005 MITIGATE gate test
  - [ ] 7.4: P1 tests (`test.skip`):
    - `5.2-INT-002`: `title='Other'` → `title_other_text` stored and retrieved correctly
    - `5.2-INT-003`: Meal type required when catering enabled; absent when disabled
    - `5.2-INT-004`: `mealType='Other'` → `meal_other_text` stored correctly
    - `5.2-INT-005`: 100th registration succeeds — no capacity cap (R-012)

- [ ] Task 8: ATDD — add E2E test stubs (AC: 1, 2, 4, 5)
  - [ ] 8.1: Append to `tests/e2e/registrations.spec.ts` — all E2E stubs are `test.skip`
  - [ ] 8.2: P1 stubs (all `test.skip`):
    - `5.2-E2E-001`: Full registration form submit (desktop) — confirmation shown [P1]
    - `5.2-E2E-MOBILE-001`: Form fully usable at 375 × 667px — no horizontal scroll [P1] (NFR-004)
    - `5.2-E2E-MOBILE-002`: Form fully usable at 1280 × 800px (desktop parity) [P1] (NFR-004)
  - [ ] 8.3: P2 stubs (all `test.skip`):
    - `5.2-E2E-003`: Form validation — missing required fields shows inline error [P2]
    - `5.2-E2E-004`: Loading state — submit button disabled during submission [P2]
  - [ ] 8.4: P3 stubs (all `test.skip`):
    - `5.2-E2E-005`: Registration completes in ≤ 2 minutes end-to-end [P3]
    - `5.2-LOAD-001`: k6 50 concurrent registrations complete without error [P3]

## Dev Notes

### Scope Boundaries — Critical

**DO implement:**
- `registrations` Drizzle schema (`src/lib/server/db/schema/registrations.ts`) + migration `drizzle/0010_registrations.sql`
- `src/lib/schemas/registration.ts` — Valibot RegistrationSchema
- `src/lib/server/db/queries/registrations.ts` — `createRegistrant(tx, data)` query
- `src/lib/server/services/registration-service.ts` — `createRegistration(bookingId, input)` service
- `register` form action in `src/routes/r/[token]/+page.server.ts`
- Form fields + success state in `src/routes/r/[token]/+page.svelte`
- Paraglide `reg_form_*` i18n keys (English + empty Thai)
- `cancelTokenHash` column (sha256 of 32-byte CSPRNG) — required for Story 5.3 email to include cancel link
- Audit log entry for every registration creation
- ATDD test stubs in `tests/integration/registrations.test.ts` and `tests/e2e/registrations.spec.ts`

**DO NOT implement (scoped to later stories):**
- Confirmation email with cancel link — Story 5.3 (Story 5.2 returns the plaintext cancel token from `createRegistration` but does NOT enqueue email or expose the token on the page)
- Self-cancel flow — Story 5.4
- Resend flow — Story 5.5
- Auto-close date logic (`registrationClosesAt` evaluation) — Story 5.6
- Catering aggregation — Story 5.7
- Registrant list — Story 5.8
- No capacity cap: do NOT add any `COUNT(registrations)` guard (R-012 explicitly forbids this)

**Closed-state check is ONLY `registrationEnabled === false`**: do NOT evaluate `registrationClosesAt` date — that is Story 5.6 scope.

### Schema Spec for `registrations` table

**File:** `src/lib/server/db/schema/registrations.ts`

```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const registrations = pgTable('registrations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  bookingId: text('booking_id').notNull(),     // FK → bookings.id (enforced in SQL migration)
  title: text('title').notNull(),               // 'Mr' | 'Mrs' | 'Ms' | 'Other'
  titleOtherText: text('title_other_text'),     // nullable; required when title='Other'
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  organization: text('organization').notNull(),
  email: text('email').notNull(),
  mealType: text('meal_type'),                  // nullable when cateringEnabled=false
  mealTypeOtherText: text('meal_type_other_text'), // nullable; required when mealType='Other'
  cancelTokenHash: text('cancel_token_hash').notNull(), // sha256 hex of 32-byte CSPRNG (AR-05)
  status: text('status').notNull().default('registered'), // 'registered' | 'cancelled'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Registration = typeof registrations.$inferSelect;
export type RegistrationInsert = typeof registrations.$inferInsert;
```

**Column naming convention:** snake_case DB column names → camelCase Drizzle field names (same as `bookings.ts`). The `user_profiles` table is the only exception with camelCase column names in the DB.

### Migration Spec for `drizzle/0010_registrations.sql`

```sql
-- Migration 0010: registrations table — Story 5.2
-- Creates the registrations table linked to bookings.

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_other_text TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  email TEXT NOT NULL,
  meal_type TEXT,
  meal_type_other_text TEXT,
  cancel_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for registrant lookup by booking (for headcount in Stories 5.7, 5.8)
CREATE INDEX IF NOT EXISTS idx_registrations_booking_id
  ON registrations(booking_id);

-- Index for cancel token lookup (Story 5.4: self-cancel flow)
-- cancel_token_hash is not unique — hash collisions are astronomically rare
-- but single-use enforcement is handled in application code (Story 5.4)
CREATE INDEX IF NOT EXISTS idx_registrations_cancel_token_hash
  ON registrations(cancel_token_hash);
```

**Filename:** `drizzle/0010_registrations.sql` — the next migration after `0009_booking_registration_token.sql`.

### RegistrationSchema Spec (`src/lib/schemas/registration.ts`)

```ts
import * as v from 'valibot';

// title and mealType option constants (for both schema and form)
export const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Other'] as const;
export const MEAL_OPTIONS = ['Normal', 'Vegetarian', 'Muslim', 'Other'] as const;

export const RegistrationSchema = v.pipe(
  v.object({
    title: v.pipe(v.string(), v.minLength(1, 'Title is required.')),
    // titleOtherText: accept '' when title != 'Other'; cross-field check enforces required when title='Other'
    titleOtherText: v.optional(v.string()),
    firstName: v.pipe(v.string(), v.trim(), v.minLength(1, 'First name is required.')),
    lastName: v.pipe(v.string(), v.trim(), v.minLength(1, 'Last name is required.')),
    organization: v.pipe(v.string(), v.trim(), v.minLength(1, 'Organization is required.')),
    email: v.pipe(v.string(), v.email('A valid email address is required.')),
    // cateringEnabled is a hidden field so the server action knows whether to validate mealType.
    // It is re-checked against the DB record inside the action — this is defence-in-depth only.
    cateringEnabled: v.boolean(),
    // mealType: accept '' (empty string from hidden/unfilled select) as absent value,
    // same as BookingSchema's registrationClosesAt pattern.
    mealType: v.optional(
      v.union([v.literal(''), v.pipe(v.string(), v.minLength(1))])
    ),
    mealTypeOtherText: v.optional(v.string()),
  }),
  // Cross-field: titleOtherText required when title = 'Other'
  v.forward(
    v.check(
      (d) => d.title !== 'Other' || (!!d.titleOtherText && d.titleOtherText.trim().length > 0),
      'Please specify your title.'
    ),
    ['titleOtherText']
  ),
  // Cross-field: mealType required when cateringEnabled = true
  v.forward(
    v.check(
      (d) => !d.cateringEnabled || (!!d.mealType && d.mealType !== ''),
      'Meal preference is required.'
    ),
    ['mealType']
  ),
  // Cross-field: mealTypeOtherText required when mealType = 'Other'
  v.forward(
    v.check(
      (d) => d.mealType !== 'Other' || (!!d.mealTypeOtherText && d.mealTypeOtherText.trim().length > 0),
      'Please specify your meal preference.'
    ),
    ['mealTypeOtherText']
  )
);

export type RegistrationInput = v.InferOutput<typeof RegistrationSchema>;
```

**Critical:** The `v.literal('')` pattern for optional selects/inputs is the established codebase convention from `src/lib/schemas/booking.ts:44–49`. Always use it for conditional fields — without it, a hidden field submitting an empty string fails the cross-field check and causes a spurious validation error.

### Cancel Token Security (AR-05)

From ADR 4.5: `registration_token` is plaintext (public). The `cancel_token_hash` column is hashed per AR-05.

```ts
import { createHash, randomBytes } from 'node:crypto';

// Generate 32-byte CSPRNG cancel token (256-bit entropy)
const cancelTokenPlain = randomBytes(32).toString('hex'); // 64-char hex
const cancelTokenHash = createHash('sha256').update(cancelTokenPlain).digest('hex');

// cancelTokenPlain → passed to Story 5.3 email service (NOT stored, NOT returned to page)
// cancelTokenHash → stored in registrations.cancel_token_hash
```

**Rule:** `cancelTokenHash` is stored; `cancelTokenPlain` is returned from `createRegistration()` for Story 5.3 to include in the confirmation email. The plain token is NEVER stored, NEVER returned to the browser. Story 5.4 will handle single-use enforcement.

### `createRegistration` Service Spec

**File:** `src/lib/server/services/registration-service.ts`

```ts
import { createHash, randomBytes } from 'node:crypto';
import { db } from '$lib/server/db/index.js';
import { getBookingByRegistrationToken } from '$lib/server/db/queries/bookings.js';
import { createRegistrant } from '$lib/server/db/queries/registrations.js';
import { writeAuditLog } from '$lib/server/services/audit.js';
import type { RegistrationInput } from '$lib/schemas/registration.js';

/**
 * Result of a successful registration.
 * cancelToken is the PLAINTEXT 64-char hex — pass to confirmation email service (Story 5.3).
 * Never store or return cancelToken to the browser.
 */
export type CreateRegistrationResult = {
  registrationId: string;
  cancelToken: string; // plaintext — for Story 5.3 email only
};

/**
 * Creates a registration record inside a db.transaction().
 * Also writes an audit log entry.
 *
 * @param bookingId - The booking's primary key (from getBookingByRegistrationToken)
 * @param input - Validated RegistrationInput from superforms + valibot
 * @returns registrationId and plaintext cancelToken (for Story 5.3 email)
 */
export async function createRegistration(
  bookingId: string,
  input: RegistrationInput
): Promise<CreateRegistrationResult> {
  const cancelTokenPlain = randomBytes(32).toString('hex');
  const cancelTokenHash = createHash('sha256').update(cancelTokenPlain).digest('hex');

  const result = await db.transaction(async (tx) => {
    const registration = await createRegistrant(tx, {
      bookingId,
      title: input.title,
      titleOtherText: input.titleOtherText ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      organization: input.organization,
      email: input.email,
      mealType: input.mealType && input.mealType !== '' ? input.mealType : null,
      mealTypeOtherText: input.mealTypeOtherText ?? null,
      cancelTokenHash,
      status: 'registered'
    });

    await writeAuditLog(tx, {
      actorId: null, // unauthenticated external registrant
      entity: 'registration',
      action: 'create',
      diff: {
        registrationId: registration.id,
        bookingId,
        email: input.email,
        title: input.title
      }
    });

    return registration;
  });

  return {
    registrationId: result.id,
    cancelToken: cancelTokenPlain
  };
}
```

### `register` Action Spec (`+page.server.ts`)

The existing `load` function must be extended to also return `cateringEnabled`, `bookingId`, and a superform `form` prop. The `register` action must re-query the DB (never trust form data for `registrationEnabled`).

```ts
// Extended load return (add to existing load):
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { RegistrationSchema } from '$lib/schemas/registration.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
  const booking = await getBookingByRegistrationToken(params.token);
  if (!booking) { error(404, 'Event not found'); }

  const form = await superValidate(valibot(RegistrationSchema));

  // ... existing date/time parsing ...

  return {
    // ... existing fields ...
    cateringEnabled: booking.cateringEnabled, // NEW — needed for conditional meal type field
    bookingId: booking.id,                    // NEW — needed in action (but load already has it)
    form                                       // NEW — superform initial state
  };
};

export const actions: Actions = {
  register: async (event) => {
    const { params } = event;

    // Re-query booking — NEVER trust cateringEnabled/registrationEnabled from form data
    const booking = await getBookingByRegistrationToken(params.token);
    if (!booking) { error(404, 'Event not found'); }

    // R-005 MITIGATE: server-side closed guard — mandatory (closes 5.2-INT-CLOSED-001)
    if (!booking.registrationEnabled) {
      const form = await superValidate(event.request, valibot(RegistrationSchema));
      return fail(400, { form });
    }

    const form = await superValidate(event.request, valibot(RegistrationSchema));
    if (!form.valid) {
      return fail(422, { form });
    }

    await createRegistration(booking.id, form.data);

    // Story 5.3 will receive cancelToken and enqueue confirmation email.
    // For Story 5.2 scope: return success flag only.
    return { form, success: true };
  }
};
```

**Important note on `fail(400, ...)` + form ordering:** When checking `registrationEnabled` before validating the form body, the body stream must still be consumed to avoid leaking the request body. Consume it before `fail()`: `await event.request.formData()` or call `superValidate` first. Safest pattern: always call `superValidate` first, then check `registrationEnabled`.

Corrected pattern:
```ts
register: async (event) => {
  // Parse form first (consumes body stream) — then check closed state
  const form = await superValidate(event.request, valibot(RegistrationSchema));

  const booking = await getBookingByRegistrationToken(event.params.token);
  if (!booking) { error(404, 'Event not found'); }

  // R-005 guard: check after parsing form (body already consumed)
  if (!booking.registrationEnabled) {
    return fail(400, { form });
  }

  if (!form.valid) {
    return fail(422, { form });
  }

  await createRegistration(booking.id, form.data);
  return { form, success: true };
}
```

### Svelte Page Spec (`+page.svelte`)

The file currently (Story 5.1) ends with:
```svelte
<!-- Registration form placeholder: Story 5.2 will add form fields here -->
<!-- DO NOT add form fields in Story 5.1 scope -->
```

Replace that comment block with the registration form. Use Svelte 5 runes and superForm:

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageData } from './$types.js';

  const { data }: { data: PageData } = $props();

  const { form, errors, enhance, submitting } = superForm(data.form, {
    dataType: 'form', // standard form submission (not JSON)
  });
</script>
```

Success state (replace form on success — `data.success` is set by the action):
```svelte
{#if data.success}
  <div role="status" aria-live="polite">
    <h3>{m.reg_form_success_title()}</h3>
    <p>{m.reg_form_success_message()}</p>
  </div>
{:else}
  <form method="POST" action="?/register" use:enhance>
    <!-- hidden field for cateringEnabled (server schema validation cross-check) -->
    <input type="hidden" name="cateringEnabled" value={data.cateringEnabled ? 'true' : 'false'} />

    <!-- Title selector -->
    <label for="title">{m.reg_form_title_label()}</label>
    <select id="title" name="title" bind:value={$form.title} required>
      <option value="">{m.reg_form_title_placeholder()}</option>
      <option value="Mr">{m.reg_form_title_mr()}</option>
      <option value="Mrs">{m.reg_form_title_mrs()}</option>
      <option value="Ms">{m.reg_form_title_ms()}</option>
      <option value="Other">{m.reg_form_title_other()}</option>
    </select>
    {#if $errors.title}<span class="text-destructive">{$errors.title}</span>{/if}

    <!-- Title Other free text (conditional) -->
    {#if $form.title === 'Other'}
      <label for="titleOtherText">{m.reg_form_title_other_label()}</label>
      <input id="titleOtherText" name="titleOtherText" type="text" bind:value={$form.titleOtherText} />
      {#if $errors.titleOtherText}<span class="text-destructive">{$errors.titleOtherText}</span>{/if}
    {/if}

    <!-- First name / Last name / Organization / Email -->
    <!-- ... standard text inputs ... -->

    <!-- Conditional meal type (only when cateringEnabled) -->
    {#if data.cateringEnabled}
      <label for="mealType">{m.reg_form_meal_label()}</label>
      <select id="mealType" name="mealType" bind:value={$form.mealType}>
        <option value="">{m.reg_form_meal_placeholder()}</option>
        <option value="Normal">{m.reg_form_meal_normal()}</option>
        <option value="Vegetarian">{m.reg_form_meal_vegetarian()}</option>
        <option value="Muslim">{m.reg_form_meal_muslim()}</option>
        <option value="Other">{m.reg_form_meal_other()}</option>
      </select>
      {#if $form.mealType === 'Other'}
        <input name="mealTypeOtherText" type="text" bind:value={$form.mealTypeOtherText} />
      {/if}
    {/if}

    <button type="submit" disabled={$submitting}>
      {$submitting ? m.reg_form_submitting_button() : m.reg_form_submit_button()}
    </button>
  </form>
{/if}
```

**Important:** `data.success` is in the action response — for it to be reactive after submission, superform's `enhance` must handle it. Since the action returns `{ form, success: true }` (not a redirect), superForm keeps the form data and you can check the page's `data` or use a `$page.status` check. Pattern: use `onResult` callback in `superForm(...)`:
```ts
const { form, errors, enhance, submitting } = superForm(data.form, {
  onResult({ result }) {
    if (result.type === 'success') {
      successState = true;
    }
  }
});
let successState = $state(false);
```
Then render `{#if successState}` success block instead of the form.

### i18n Keys for Story 5.2

Add to `messages/en.json` (English values) and `messages/th.json` (empty strings `""`):

```json
"reg_form_title_label": "Salutation",
"reg_form_title_placeholder": "Select title",
"reg_form_title_mr": "Mr",
"reg_form_title_mrs": "Mrs",
"reg_form_title_ms": "Ms",
"reg_form_title_other": "Other",
"reg_form_title_other_label": "Please specify",
"reg_form_first_name_label": "First name",
"reg_form_last_name_label": "Last name",
"reg_form_organization_label": "Organization",
"reg_form_email_label": "Email address",
"reg_form_meal_label": "Meal preference",
"reg_form_meal_placeholder": "Select meal preference",
"reg_form_meal_normal": "Normal",
"reg_form_meal_vegetarian": "Vegetarian",
"reg_form_meal_muslim": "Muslim",
"reg_form_meal_other": "Other",
"reg_form_meal_other_label": "Please specify",
"reg_form_submit_button": "Register",
"reg_form_submitting_button": "Registering...",
"reg_form_success_title": "Registration Complete",
"reg_form_success_message": "You have been registered for this event. A confirmation email will be sent shortly."
```

**Total new keys: 22.** Existing `reg_page_*` keys (8 from Story 5.1) remain unchanged.

### Integration Test Spec (`tests/integration/registrations.test.ts`)

**ADD to existing file** — do not replace existing Story 5.1 tests. Append after the last existing test block.

New seed helper:
```ts
/**
 * Seeds a registration record linked to bookingId.
 * Generates a dummy cancel_token_hash for the test row.
 */
async function seedRegistrant(
  client: pg.PoolClient,
  opts: {
    bookingId: string;
    email?: string;
    title?: string;
    mealType?: string | null;
    status?: string;
  }
): Promise<string> {
  const registrationId = uuidv7(); // or randomUUID()
  const cancelTokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
  await client.query(
    `INSERT INTO registrations (id, booking_id, title, first_name, last_name, organization, email, meal_type, cancel_token_hash, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Test', 'Registrant', 'Test Org', $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      registrationId,
      opts.bookingId,
      opts.title ?? 'Mr',
      opts.email ?? `registrant-${registrationId}@example.com`,
      opts.mealType ?? null,
      cancelTokenHash,
      opts.status ?? 'registered'
    ]
  );
  return registrationId;
}
```

**5.2-INT-001 (P0 — ACTIVATE):** Valid form creates registrant DB row
```ts
// Strategy:
// 1. Seed user + profile + room + booking (registrationEnabled=true)
// 2. Dynamic import createRegistration
// 3. Call createRegistration(booking.id, validInput)
// 4. Assert registrations row exists with all expected columns
// 5. Assert audit_log row exists with entity='registration', action='create'
```

**5.2-INT-CLOSED-001 (P0 — ACTIVATE):** Direct POST when closed returns 400
```ts
// Strategy: Use fetch() directly to the /r/[token]?/register action endpoint
// with registrationEnabled=false. This bypasses the UI and tests the server guard.
// Assert: response.status === 400 (or redirect to closed-state page).
// This test requires a running dev server OR uses the SvelteKit test adapter.
// Implementation note: if no test adapter is available, test the service layer directly:
//   Seed booking with registrationEnabled=false
//   Ensure the action guard logic is tested by calling getBookingByRegistrationToken
//   and asserting the result.registrationEnabled === false before the insert
//   (document in test why direct HTTP is deferred to E2E)
```

### E2E Test Spec (`tests/e2e/registrations.spec.ts`)

**ADD to existing file** — do not replace Story 5.1 E2E tests. Append after the last existing `test.describe` block.

All 5.2 E2E tests use `test.skip`. Include mobile viewport tests per NFR-004:
```ts
// 5.2-E2E-MOBILE-001 viewport setup:
await page.setViewportSize({ width: 375, height: 667 });
// Assert no horizontal scrollbar: page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

// 5.2-E2E-MOBILE-002 viewport setup:
await page.setViewportSize({ width: 1280, height: 800 });
```

### `pg-factory.ts` TRUNCATABLE_TABLES Update

In `tests/support/fixtures/pg-factory.ts`, add `'registrations'` before `'bookings'`:

```ts
const TRUNCATABLE_TABLES = [
  'sessions',
  'accounts',
  'verifications',
  'user_profiles',
  'users',
  'registrations', // NEW — child of bookings (FK: booking_id → bookings.id)
  'bookings',
  'audit_log'
] as const;
```

**Order matters:** `registrations` must come before `bookings` because `registrations.booking_id` FK references `bookings.id`. Truncating `bookings` first would violate the FK constraint (even with CASCADE, the order ensures correctness if CASCADE is not set on TRUNCATE).

### `db-schema.test.ts` Assertion

Append to `tests/integration/db-schema.test.ts`:

```ts
describe('Story 5.2 — registrations table schema', () => {
  test('[P0] 5.2-SCHEMA-001 — registrations table has all required columns', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'registrations'
      ORDER BY ordinal_position
    `);
    const columns = result.rows.map((r: { column_name: string }) => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('booking_id');
    expect(columns).toContain('title');
    expect(columns).toContain('title_other_text');
    expect(columns).toContain('first_name');
    expect(columns).toContain('last_name');
    expect(columns).toContain('organization');
    expect(columns).toContain('email');
    expect(columns).toContain('meal_type');
    expect(columns).toContain('meal_type_other_text');
    expect(columns).toContain('cancel_token_hash');
    expect(columns).toContain('status');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });
});
```

### Existing Patterns to Follow

**Drizzle schema:** `src/lib/server/db/schema/bookings.ts` — `pgTable`, `text`, `timestamp`, `uuidv7()`, `.notNull()`, `.default()`
**Valibot schema:** `src/lib/schemas/booking.ts` — `v.pipe`, `v.object`, `v.check`, `v.forward`, `v.literal('')`, cross-field validation
**Superforms action:** `src/routes/(app)/bookings/new/+page.server.ts` — `superValidate`, `fail(422, { form })`, `setError(form, '', key)`, `redirect(303, url)`
**Audit log:** `src/lib/server/services/audit.ts` — `writeAuditLog(tx, { actorId: null, entity, action, diff })` — called INSIDE `db.transaction()`
**Query pattern:** `src/lib/server/db/queries/bookings.ts` — `getUpcomingBookingsByOrganizer` for `db.select()` pattern; `getBookingByRegistrationToken` for null-on-miss pattern
**uuidv7:** `import { uuidv7 } from 'uuidv7';` in schema; `$defaultFn(() => uuidv7())` for PK
**Superform in page.svelte:** `import { superForm } from 'sveltekit-superforms';` — `const { form, errors, enhance, submitting } = superForm(data.form);`

### Auth Guard — No Changes Needed

The `/r/[token]` route is public and already allow-listed. Do NOT add `requireUser` to the `register` action. The route handles unauthenticated external registrants.

`cancelToken` / `actorId: null` in audit log is the correct pattern for unauthenticated mutations.

### Pre-commit Gate

Before every commit:

```bash
bunx prettier --write . && bun run lint
```

### TRUNCATABLE_TABLES Position Note

The `rooms` table is NOT in `TRUNCATABLE_TABLES` currently (rooms are seeded as test data and not truncated between tests). Registrations FK → bookings (not rooms). No change needed for rooms.

### Security Notes

- `cancelTokenHash` column uses sha256. Bcrypt is NOT used here (sha256 is acceptable for 256-bit random tokens per AR-05 analysis). Story 5.4 will implement single-use enforcement.
- `cateringEnabled` submitted in hidden form field is re-checked against the DB record inside `createRegistration`. The DB value (`booking.cateringEnabled`) takes precedence over the hidden field value for actual meal validation.
- The `register` action must NOT trust the `cateringEnabled` hidden field for the closed-guard check. Always re-query `getBookingByRegistrationToken` in the action.

### References

- Story 5.1 file: `_bmad-output/implementation-artifacts/5-1-branded-public-registration-page.md` — baseline, existing patterns
- Epics file: `_bmad-output/planning-artifacts/epics.md` — Story 5.2 ACs (lines 734–747)
- Test design: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` — P0/P1/P2/P3 scenarios for 5.2
- ADR 4.5: `_bmad-output/implementation-artifacts/adr-4-5-registration-token-storage.md` — token storage decision
- Bookings schema: `src/lib/server/db/schema/bookings.ts`
- Profiles schema: `src/lib/server/db/schema/profiles.ts`
- Schema index: `src/lib/server/db/schema/index.ts`
- Registration page load: `src/routes/r/[token]/+page.server.ts`
- Registration page Svelte: `src/routes/r/[token]/+page.svelte`
- Booking Valibot schema (pattern): `src/lib/schemas/booking.ts`
- Booking action (pattern): `src/routes/(app)/bookings/new/+page.server.ts`
- Audit service: `src/lib/server/services/audit.ts`
- pg-factory: `tests/support/fixtures/pg-factory.ts`
- Integration tests (existing): `tests/integration/registrations.test.ts`
- E2E tests (existing): `tests/e2e/registrations.spec.ts`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_(to be filled during implementation)_

### Completion Notes List

_(to be filled during implementation)_

### File List

**New files:**
- `drizzle/0010_registrations.sql`
- `src/lib/server/db/schema/registrations.ts`
- `src/lib/schemas/registration.ts`
- `src/lib/server/db/queries/registrations.ts`
- `src/lib/server/services/registration-service.ts`

**Updated files:**
- `src/lib/server/db/schema/index.ts` — add `export * from './registrations.js'`
- `src/routes/r/[token]/+page.server.ts` — extend load (cateringEnabled, bookingId, form) + add `register` action
- `src/routes/r/[token]/+page.svelte` — replace form placeholder with real form + success state
- `messages/en.json` — add 22 new `reg_form_*` keys
- `messages/th.json` — add 22 new `reg_form_*` keys (empty strings)
- `src/lib/paraglide/messages/` — regenerated (build artifact)
- `tests/integration/registrations.test.ts` — append 5.2 P0 tests + P1 stubs
- `tests/e2e/registrations.spec.ts` — append 5.2 E2E stubs (all `.skip`)
- `tests/support/fixtures/pg-factory.ts` — add `'registrations'` to TRUNCATABLE_TABLES
- `tests/integration/db-schema.test.ts` — append registrations schema assertion

### Change Log

- 2026-06-15: Story 5.2 created — submit a registration (form fields, server action, registrations table, cancel token hash, audit log)
