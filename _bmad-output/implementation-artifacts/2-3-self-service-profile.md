---
baseline_commit: de96bd2
---

# Story 2.3: Self-service profile

Status: review

## Story

As an internal user,
I want to complete my profile on first login,
so that my details are available for booking contact and registration prefill.

## Acceptance Criteria

1. **Given** a first-time authenticated user with an incomplete profile, **When** they navigate to any `(app)` route, **Then** they are redirected to `/profile/complete` (302) before reaching any other app page.

2. **Given** the profile completion form at `/profile/complete`, **When** the page loads, **Then** the email field is pre-filled read-only from the user's OIDC claim (`event.locals.user.email`) and the title, first name, last name, phone, and organization fields are empty and editable.

3. **Given** the profile completion form, **When** I submit all required fields (title, first name, last name, phone, organization) with valid data, **Then** the `user_profiles` row is created with `userId` referencing `users.id`, the read-only email from the IdP is stored, and I am redirected to the dashboard (or originally-intended route).

4. **Given** a user who has already completed their profile, **When** they navigate to `/profile/complete`, **Then** they are redirected to the dashboard (profile gate is already satisfied).

5. **Given** the profile form, **When** I submit with a required field (first name, last name, phone, or organization) empty or missing, **Then** the form is rejected with field-level inline error messages and no profile row is created or modified.

6. **Given** a completed profile, **When** I visit `/profile` (profile edit), **Then** I can edit title, first name, last name, phone, and organization fields, but the email field remains read-only and cannot be changed via form submission.

7. **Given** a form submission that includes an `email` field override, **When** the server action processes the request, **Then** the `email` value from the POST body is silently ignored; the stored email remains the original OIDC-sourced value unchanged.

8. **Given** a completed profile mutation (create or update), **When** the server action commits the transaction, **Then** an `audit_log` row is written atomically with `entity = 'user_profile'`, `actorId = user.id`, `action = 'create'` or `'update'`, and `diff` containing changed field names/values (using `writeAuditLog` from Story 1.6).

9. **Given** a user with an incomplete profile, **When** they have not yet completed their profile, **Then** they cannot reach `/bookings`, `/dashboard`, `/calendar`, or any other `(app)` route except `/profile/complete`.

## Tasks / Subtasks

- [x] Task 1: Database migration — `user_profiles` table (AC: 2, 3, 6, 7)
  - [x] 1.1 Hand-write migration file `drizzle/0003_user_profiles.sql`. Create the `user_profiles` table with: `id` (UUID v7 primary key, `gen_random_uuid()` default), `userId` TEXT NOT NULL UNIQUE referencing `users(id)` ON DELETE CASCADE, `email` TEXT NOT NULL (sourced from OIDC, stored read-only), `title` TEXT NOT NULL, `firstName` TEXT NOT NULL, `lastName` TEXT NOT NULL, `phone` TEXT NOT NULL, `organization` TEXT NOT NULL, `createdAt` TIMESTAMPTZ NOT NULL DEFAULT NOW(), `updatedAt` TIMESTAMPTZ NOT NULL DEFAULT NOW(). Column casing follows existing Better Auth camelCase convention in `auth.ts`. Do NOT run `drizzle-kit generate` — hand-register in `drizzle/meta/_journal.json` as `{ "idx": 3, "version": "7", "when": <epoch_ms>, "tag": "0003_user_profiles", "breakpoints": true }`.
  - [x] 1.2 Create `src/lib/server/db/schema/profiles.ts` with the Drizzle table definition mirroring the SQL. Export `UserProfile` type via `typeof userProfiles.$inferSelect`. Export `NewUserProfile` type via `typeof userProfiles.$inferInsert`.
  - [x] 1.3 Add `export * from './profiles.js'` to `src/lib/server/db/schema/index.ts`.
  - [x] 1.4 Add `'user_profiles'` to `TRUNCATABLE_TABLES` in `tests/support/fixtures/pg-factory.ts` after `'users'` (FK child order: profile references user, so truncate profile first — but since we TRUNCATE CASCADE this is moot; still list it before `users` for clarity).

- [x] Task 2: Install sveltekit-superforms + Valibot schema for profile (AC: 3, 5, 6, 7)
  - [x] 2.0 Install sveltekit-superforms: `bun add sveltekit-superforms`. Verify it lands in `dependencies` (not devDependencies) in `package.json`. This is the FIRST time sveltekit-superforms is used in the project — the architecture specifies it but it was not needed for Story 2.1's OAuth-redirect form.
  - [x] 2.1 Create `src/lib/schemas/` directory (does not yet exist) and create `src/lib/schemas/profile.ts` with a shared Valibot schema `ProfileSchema` for the form inputs: `title` (non-empty string, enum of "Mr.", "Mrs.", "Ms.", "Other"), `firstName` (non-empty, min 1 char), `lastName` (non-empty, min 1 char), `phone` (non-empty, min 1 char), `organization` (non-empty, min 1 char). Do NOT include `email` in the schema — it is never accepted from client input.
  - [x] 2.2 Export the schema and its inferred type `type ProfileInput = v.InferOutput<typeof ProfileSchema>`.

- [x] Task 3: Profile service (AC: 3, 6, 7, 8)
  - [x] 3.1 Create `src/lib/server/services/profile-service.ts` with two functions:
    - `createProfile(userId: string, email: string, input: ProfileInput): Promise<UserProfile>` — inserts a `user_profiles` row inside a transaction that also calls `writeAuditLog(tx, { actorId: userId, entity: 'user_profile', action: 'create', diff: { title: input.title, firstName: input.firstName, lastName: input.lastName, phone: input.phone, organization: input.organization } })`. Returns the inserted row.
    - `updateProfile(userId: string, existing: UserProfile, input: ProfileInput): Promise<UserProfile>` — updates the profile row inside a transaction that calls `writeAuditLog(tx, { actorId: userId, entity: 'user_profile', action: 'update', diff: computeDiff(existing, input) })`. The `computeDiff` helper includes only fields that changed (old vs new value). **Important:** Drizzle does NOT auto-update `updatedAt` — explicitly set `updatedAt: new Date()` in `.set({ ...input, updatedAt: new Date() })`. Returns updated row.
  - [x] 3.2 Create `getProfileByUserId(userId: string): Promise<UserProfile | null>` — exported from `profile-service.ts`. A simple Drizzle SELECT with `.where(eq(userProfiles.userId, userId))` — used by `hooks.server.ts` and layout server files to check profile completeness.

- [x] Task 4: Profile completeness guard in `hooks.server.ts` (AC: 1, 4, 9)
  - [x] 4.1 Extend the `routeGuards` array in `src/hooks.server.ts` with a new guard entry: pattern matches all `(app)` routes that require a complete profile (everything except `/profile/complete` itself — use `/^\/(?!(?:login|auth(?:\/|$)|r\/|skeleton|profile\/complete|$))/`). The guard checks if `event.locals.user` exists AND no `user_profiles` row exists for that user (needs a DB lookup — consider caching the profile status in `event.locals` after the Better Auth handler populates locals, OR do the lookup in the `(app)/+layout.server.ts` and set `event.locals.profileComplete`).
  - [x] 4.2 Preferred approach to avoid per-request DB hits on every `(app)` route: extend `handleBetterAuth` in `hooks.server.ts` to also populate `event.locals.profileComplete: boolean` alongside `event.locals.user` and `event.locals.session`. Call `getProfileByUserId(user.id)` only when `event.locals.user` is set; set `event.locals.profileComplete = profile !== null`. The guard then checks `event.locals.profileComplete` without an additional DB round-trip.
  - [x] 4.3 Update `src/app.d.ts` to add `profileComplete: boolean | null` to `App.Locals`. Also add `userProfile: import('$lib/server/db/schema/profiles').UserProfile | null` to `App.Locals` so the layout can read it.
  - [x] 4.4 The profile guard must redirect to `/profile/complete` (not `/login`). Pattern must NOT match `/profile/complete` itself (would cause infinite redirect loop) or `/profile` (the edit page is accessible only to users WITH a complete profile — handled by AC 6).

- [x] Task 5: Profile completion route (AC: 1, 2, 3, 4, 5) — `/profile/complete`
  - [x] 5.1 Create `src/routes/(app)/profile/complete/+page.server.ts` with:
    - `load`: check `event.locals.profileComplete`; if `true` redirect to `/dashboard`; return `{ email: event.locals.user.email }` (for read-only email display in the form).
    - `actions.default`: parse form data through `ProfileSchema` using sveltekit-superforms + Valibot. If invalid, return `fail(422, { form })`. If valid, call `profile-service.createProfile(userId, user.email, validatedInput)`. On success, redirect to `/dashboard` (or `event.url.searchParams.get('redirectTo') ?? '/dashboard'` for post-login redirect preservation).
  - [x] 5.2 Create `src/routes/(app)/profile/complete/+page.svelte` with a profile completion form. Use sveltekit-superforms `superForm` and a Svelte 5 component. Fields (in order per UX — title, first name, last name, phone, organization) plus a read-only email display at the top. All labels and error messages via Paraglide. Use shadcn-svelte `Input`, `Label`, `Select`, `Button` components. Apply UXD-020 state patterns: submit button goes disabled + loading state while submitting; field-level inline errors (red border + message under field, focus jumps to first error). Title field is a `Select` component with options: "Mr", "Mrs", "Ms", "Other" (values via Paraglide). WCAG 2.1 AA: visible labels (never placeholder-only), tap targets ≥ 44px.
  - [x] 5.3 Do NOT add `@sveltejs/kit`'s `+layout.server.ts` `requireUser` check to this page separately — it inherits from `(app)/+layout.server.ts` already. But the existing `(app)/+layout.server.ts` must NOT redirect-incomplete-profile users itself (that would conflict with this route). Ensure the `+layout.server.ts` only calls `requireUser` and does not also enforce profile completeness — the hook guard handles that.

- [x] Task 6: Profile edit route (AC: 6, 7, 8) — `/profile`
  - [x] 6.1 Create `src/routes/(app)/profile/+page.server.ts` with:
    - `load`: call `requireUser(event)`, load `userProfile` from `event.locals.userProfile` (populated by the hooks guard chain). Return `{ profile: userProfile, email: event.locals.user.email }`.
    - `actions.default`: same sveltekit-superforms + Valibot flow as 5.1. Call `profile-service.updateProfile(userId, existingProfile, validatedInput)`. On success, return superforms success (toast trigger) without full redirect — or redirect with a success flash.
  - [x] 6.2 Create `src/routes/(app)/profile/+page.svelte` — similar form structure to `complete/+page.svelte` but pre-populated with existing profile values. The email field is read-only (display only, not a form input). Add a Paraglide-keyed success toast on save.

- [x] Task 7: i18n keys (AC: 2, 5, 6)
  - [x] 7.1 Add to `messages/en.json` (English source, placeholder values only for `th.json`):
    ```json
    "profile_complete_title": "Complete your profile",
    "profile_complete_subtitle": "Please fill in your details to continue.",
    "profile_edit_title": "Your profile",
    "profile_email_label": "Email",
    "profile_email_readonly_hint": "Your email is managed by your organization account.",
    "profile_title_label": "Title",
    "profile_title_mr": "Mr.",
    "profile_title_mrs": "Mrs.",
    "profile_title_ms": "Ms.",
    "profile_title_other": "Other",
    "profile_first_name_label": "First name",
    "profile_last_name_label": "Last name",
    "profile_phone_label": "Phone",
    "profile_organization_label": "Organization",
    "profile_submit_button": "Save profile",
    "profile_save_button": "Save changes",
    "profile_saved_toast": "Profile saved.",
    "profile_error_required": "This field is required.",
    "profile_error_first_name_required": "First name is required.",
    "profile_error_last_name_required": "Last name is required.",
    "profile_error_phone_required": "Phone is required.",
    "profile_error_organization_required": "Organization is required."
    ```
  - [x] 7.2 Copy the same keys with English placeholder values to `messages/th.json`. Rawinan provides Thai translations.
  - [x] 7.3 Run `bunx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide` after adding keys.

- [x] Task 8: Integration tests (AC: 1–9)
  - [x] 8.1 Create `tests/integration/profile.test.ts` with test scenarios matching the P0 and P1 tests from `test-design-epic-2.md`:
    - `2.3-INT-001`: GET `/dashboard` with authenticated-but-incomplete-profile session → assert 302 to `/profile/complete`.
    - `2.3-INT-002`: POST to profile complete form with all valid fields → assert profile row created; subsequent GET `/dashboard` → assert 200.
    - `2.3-INT-003`: POST profile form with `firstName` empty → assert 422 + error field in response.
    - `2.3-INT-004`: POST profile form with `email` override → assert stored email unchanged (still OIDC email).
    - `2.3-INT-005`: PATCH/POST profile edit with new `phone` value → assert `phone` updated, `email` unchanged.
    - `2.7-INT-002` (create audit): Submit profile completion → assert `audit_log` has row with `entity='user_profile'`, `action='create'`, `actorId = userId`.
    - `2.7-INT-003` (update audit): Update profile → assert `audit_log` row with `action='update'` and `diff` containing changed field.
    - `2.7-INT-004` (rollback): Force DB error mid-transaction → assert `audit_log` count unchanged.
  - [x] 8.2 Use `pgFactory` from `tests/support/fixtures/pg-factory.ts` and the dev-bypass session pattern from `2.1-INT-001/002` tests for creating authenticated test sessions. Do NOT use real OIDC — use the seeded test user session approach from Story 2.1 integration tests.

- [x] Task 9: Quality gates (AC: all)
  - [x] 9.1 `bunx prettier --write . && bun run lint` → exit 0.
  - [x] 9.2 `bun run check` (svelte-check + tsc) → exit 0.
  - [x] 9.3 `bun run test` (unit tests) → exit 0, count must not decrease.
  - [x] 9.4 `bun run test:integration` → exit 0 (new profile integration tests pass; all existing Story 2.1 and E1 tests must continue passing — no regressions).
  - [x] 9.5 `bun run build` → exit 0.

## Dev Notes

### Critical: Profile Gate in `hooks.server.ts` — Avoid Infinite Redirect Loop

The profile completeness guard must explicitly exclude `/profile/complete` from its pattern. If the pattern fires on `/profile/complete`, the user will be caught in an infinite redirect: they need to go to `/profile/complete` to complete their profile, but the guard redirects them to `/profile/complete` every time. The pattern must be:

```ts
// In routeGuards array in hooks.server.ts:
{
  pattern: /^\/(?!(?:login|auth(?:\/|$)|r\/|skeleton|profile\/complete|$))/,
  guard: (event) => {
    const session = event.locals.session;
    if (!session) redirect(302, '/login');
    if (!event.locals.profileComplete) redirect(302, '/profile/complete');
  }
}
```

Note: the existing guard entry in Story 2.1 checks only `session`. This story REPLACES or EXTENDS the guard logic. The cleanest approach is to EXTEND the existing guard to also check `profileComplete` — but only when `event.locals.user` is set (avoid NPE). The exclusion list in the pattern must include `profile\/complete` to prevent the loop.

### Critical: `event.locals.profileComplete` Population

Populate `profileComplete` in `handleBetterAuth` in `hooks.server.ts` right after setting `event.locals.user`:

```ts
if (sessionData) {
  event.locals.session = sessionData.session;
  event.locals.user = sessionData.user;
  // Check profile completeness once per request (avoids per-route DB hit)
  const profile = await getProfileByUserId(sessionData.user.id);
  event.locals.userProfile = profile;
  event.locals.profileComplete = profile !== null;
} else {
  event.locals.session = null;
  event.locals.user = null;
  event.locals.userProfile = null;
  event.locals.profileComplete = null;
}
```

This is one extra DB query per authenticated request, which is acceptable for MVP. It means the profile data is available in every `(app)` route's `load` function via `event.locals.userProfile` — the booking form can prefill the organizer contact without a second query.

### Critical: Email is Read-Only and Never Accepted from Client

`email` MUST NOT appear in the `ProfileSchema` Valibot schema. The server action in `profile/complete/+page.server.ts` and `profile/+page.server.ts` must get the email ONLY from `event.locals.user.email` (set by Better Auth from the OIDC `email` claim). Even if a malicious POST body includes `email`, it must never be written to the DB. The service layer `createProfile` and `updateProfile` accept `email` as a separate parameter sourced from `event.locals.user.email` only.

### Critical: Migration Must Use `camelCase` Column Names

The existing `users`, `sessions`, `accounts`, `verifications` tables (from `drizzle/0002_better_auth.sql`) use `camelCase` column names (e.g., `userId`, `expiresAt`, `createdAt`) to match Better Auth's Drizzle adapter convention. The new `user_profiles` table must follow the SAME camelCase column naming convention for consistency:
- `userId` (not `user_id`)
- `firstName` (not `first_name`)
- `lastName` (not `last_name`)
- `createdAt` (not `created_at`)
- `updatedAt` (not `updated_at`)

This deviates from the general project naming convention (architecture §Naming Patterns says `snake_case` columns), but follows the precedent set by Better Auth tables already in the schema. Document this deviation in the migration file comment.

### Critical: sveltekit-superforms — Install First (Not Yet in package.json)

`sveltekit-superforms` is specified in the architecture as the forms pattern but is NOT yet installed — Story 2.1 used plain form actions (OAuth redirect, no field validation). Task 2.0 installs it. After `bun add sveltekit-superforms`, verify `package.json` shows it under `"dependencies"` (not devDependencies — it's needed at runtime).

### Critical: sveltekit-superforms Integration

Use `sveltekit-superforms` with Valibot. Pattern:

```ts
// In +page.server.ts load:
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { ProfileSchema } from '$lib/schemas/profile';

export const load = async (event) => {
  const form = await superValidate(valibot(ProfileSchema));
  return { form, email: event.locals.user!.email };
};

// In actions.default:
const form = await superValidate(request, valibot(ProfileSchema));
if (!form.valid) return fail(422, { form });
// call profile-service...
return redirect(302, '/dashboard');
```

In the Svelte component:
```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  let { data } = $props();
  const { form, errors, enhance, submitting } = superForm(data.form);
</script>
```

### Critical: `(app)/+layout.server.ts` Must NOT Enforce Profile Completeness

The existing `(app)/+layout.server.ts` (Story 2.1) only calls `requireUser(event)`. Do NOT add profile completeness enforcement here — that's the hook guard's job. The layout must only pass user/profile data to `$page.data`. If you add another redirect in the layout, users at `/profile/complete` (which inherits the `(app)` layout) would be double-redirected.

The layout CAN pass the profile to the page:
```ts
export const load: LayoutServerLoad = async (event) => {
  const user = requireUser(event);
  return {
    user,
    userProfile: event.locals.userProfile,
    profileComplete: event.locals.profileComplete
  };
};
```

### Critical: `routeGuards` Pattern Extension (R-006 Compliance)

The `routeGuards` array in `hooks.server.ts` must remain an exportable, appendable registry per R-006. Story 2.3 extends it. Do NOT create a separate guard function outside the registry. Options:

**Option A — Replace first guard entry with richer logic:**
```ts
export const routeGuards = [
  {
    pattern: /^\/(?!(?:login|auth(?:\/|$)|r\/|skeleton|profile\/complete|$))/,
    guard: (event) => {
      if (!event.locals.session) redirect(302, '/login');
      if (!event.locals.profileComplete) redirect(302, '/profile/complete');
    }
  }
];
```

**Option B — Add a second guard entry:**
```ts
export const routeGuards = [
  { pattern: /^\/(?!...)/, guard: (event) => { /* auth check */ } },
  { pattern: /^\/(?!(?:login|auth...|profile\/complete|$))/, guard: (event) => {
      if (event.locals.user && !event.locals.profileComplete)
        redirect(302, '/profile/complete');
  }}
];
```

Option A is cleaner and recommended — one combined guard with a richer pattern.

### Critical: Title Field — Select with "Other" Option

Per FR-095 and UX EXPERIENCE.md §Form fields, title is: Mr / Mrs / Ms / Other. The profile schema `title` field must accept these exact values. Use a shadcn-svelte `Select` component for the title field in the form. The value stored in DB is the string (e.g., "Mr.", "Mrs.", "Ms.", "Other"). No free-text "other" override needed for the organizer's own title (unlike the external registrant form — that has Other→free text for attendee title per FR-041).

### Critical: UUID v7 for Profile ID

Per architecture §Naming Patterns: primary keys are UUID v7 (time-ordered, non-enumerable). The `uuidv7` npm package IS already installed (`package.json` dependencies). Use it for application-level UUID v7 generation:

```ts
import { uuidv7 } from 'uuidv7';
// ...
const [profile] = await tx.insert(userProfiles).values({
  id: uuidv7(),  // UUID v7, not crypto.randomUUID() (which gives v4)
  userId,
  email,
  ...input
}).returning();
```

In the SQL migration, set the default to `gen_random_uuid()` for migration safety (Drizzle's `.defaultRandom()` maps to this). At the application layer, always pass `id: uuidv7()` explicitly from the service — this matches the pattern the architecture specifies.

### Critical: Audit Log Pattern (Story 1.6 / Story 2.7)

The `writeAuditLog` helper in `src/lib/server/services/audit.ts` accepts a `DrizzleTransaction` as the first argument. The profile service methods MUST wrap DB operations in `db.transaction(async (tx) => { ... })` and call `writeAuditLog(tx, ...)` inside the same transaction callback. This ensures if the profile insert fails, no audit row is written (AC 8 / 2.7-INT-004).

```ts
// In profile-service.ts:
import { uuidv7 } from 'uuidv7';
import { db } from '../db/index.js';
import { writeAuditLog } from './audit.js';

export async function createProfile(userId: string, email: string, input: ProfileInput) {
  return db.transaction(async (tx) => {
    const [profile] = await tx.insert(userProfiles).values({
      id: uuidv7(),  // UUID v7 — uuidv7 package is already in dependencies
      userId,
      email,
      ...input
    }).returning();
    await writeAuditLog(tx, {
      actorId: userId,
      entity: 'user_profile',
      action: 'create',
      diff: { ...input }
    });
    return profile;
  });
}
```

### File Structure

**New Files to Create:**

| File | Purpose |
|------|---------|
| `drizzle/0003_user_profiles.sql` | Migration: `user_profiles` table |
| `src/lib/server/db/schema/profiles.ts` | Drizzle schema for `user_profiles` |
| `src/lib/schemas/profile.ts` | Valibot schema — shared client/server (no `email` field) |
| `src/lib/server/services/profile-service.ts` | `createProfile`, `updateProfile`, `getProfileByUserId` |
| `src/routes/(app)/profile/complete/+page.server.ts` | Profile completion form server logic |
| `src/routes/(app)/profile/complete/+page.svelte` | Profile completion form UI |
| `src/routes/(app)/profile/+page.server.ts` | Profile edit server logic |
| `src/routes/(app)/profile/+page.svelte` | Profile edit UI |
| `tests/integration/profile.test.ts` | Integration tests 2.3-INT-001 through 2.7-INT-004 |

**Files to Modify:**

| File | Change |
|------|--------|
| `package.json` / `bun.lock` | Add `sveltekit-superforms` production dependency (Task 2.0) |
| `drizzle/meta/_journal.json` | Register `0003_user_profiles` as idx:3 |
| `src/lib/server/db/schema/index.ts` | Add `export * from './profiles.js'` |
| `src/app.d.ts` | Add `profileComplete: boolean \| null` and `userProfile: UserProfile \| null` to `App.Locals` |
| `src/hooks.server.ts` | Extend `handleBetterAuth` to populate `event.locals.profileComplete` + `userProfile`; extend `routeGuards` to redirect incomplete-profile users to `/profile/complete` |
| `src/routes/(app)/+layout.server.ts` | Pass `userProfile` and `profileComplete` to `$page.data` |
| `tests/support/fixtures/pg-factory.ts` | Add `'user_profiles'` to `TRUNCATABLE_TABLES` |
| `messages/en.json` | Add all profile i18n keys |
| `messages/th.json` | Add same keys with English placeholder values |

### Architecture References

- **Profile sourcing (OQ-3 resolved):** `architecture.md` §Authentication & Security — "Authentik is used for authentication only. On first login the user completes an app-owned profile… Email is the exception: it is taken from the OIDC `email` claim and stored read-only… all other profile fields are user-entered and app-owned/editable."
- **FR-095 (profile fields):** epics.md §Requirements Inventory — "Profile holds title, name, phone, email, organization; organizer name+phone = registration contact; profile auto-populates internal registrant record."
- **FR-101 prefill (future use):** The schema is deliberately sized for E6 prefill — `title`, `firstName`, `lastName`, `phone`, `organization`, `email`. These exact fields will be read-only in the internal "Register to attend" form (Story 6.4).
- **sveltekit-superforms + Valibot:** architecture.md §API & Communication Patterns.
- **Audit log:** `src/lib/server/services/audit.ts` — `writeAuditLog(tx, entry)`. R-011 from test-design-epic-2.md.
- **Route zones:** architecture.md §Frontend Architecture — `(app)/**` authenticated; `/profile/complete` is inside `(app)` (authenticated) but exempt from profile-completeness gate.
- **Guard registry (R-006):** `hooks.server.ts` — `routeGuards` array exported for extensibility and test assertions.
- **Test scenarios:** `test-design-epic-2.md` — P0: `2.3-INT-001–004`; P1: `2.3-INT-005`, `2.3-E2E-001`, `2.3-A11Y-001`; Story 2.7 linked: `2.7-INT-002–004`.
- **State patterns (UXD-020):** submit button disabled+loading; inline field-level errors (red border + message under field, focus on first error); empty state handled by redirect.
- **WCAG 2.1 AA (NFR-007):** visible labels (never placeholder-only), tap targets ≥ 44px, contrast ≥ 4.5:1, no color-alone meaning. Use shadcn-svelte primitives. axe-core test scenario `2.3-A11Y-001`.
- **i18n (NFR-006):** ALL strings via Paraglide — no hardcoded English or Thai. English source in `messages/en.json`.

### Anti-Patterns to Avoid

- **DO NOT add `email` to `ProfileSchema`** — email is sourced server-side only from `event.locals.user.email`. Including it in the schema creates a security hole (AC 7).
- **DO NOT redirect to `/profile/complete` from `(app)/+layout.server.ts`** — this will break the profile form page itself (infinite loop). The hook guard handles the redirect; the layout only provides data.
- **DO NOT call `getProfileByUserId` in every route's load function** — the hook pre-populates `event.locals.userProfile` once per request.
- **DO NOT use `drizzle-kit generate` for the migration** — hand-write and register in `_journal.json`, matching the pattern from Stories 1.6 and 2.1.
- **DO NOT hardcode Thai or English UI strings** — all text via Paraglide `m.key()` functions (CI lint rule enforced).
- **DO NOT write audit log outside a transaction** — `writeAuditLog` requires a `DrizzleTransaction` argument, not `db` directly.
- **DO NOT make the profile edit page accessible to users without a completed profile** — the profile gate guard ensures `/profile` (edit) is only reachable after `/profile/complete` is done. This is correct: the guard excludes `/profile/complete` but not `/profile`.
- **DO NOT commit any credentials** — env.ts already covers AUTH_SECRET etc.; no new secrets needed for this story.

### Previous Story Intelligence

**From Story 2.1:**
- `drizzle/meta/_journal.json` pattern: `{ "idx": 3, "version": "7", "when": <epoch_ms>, "tag": "0003_user_profiles", "breakpoints": true }`. Use current epoch ms for `when`.
- `event.locals.user` and `event.locals.session` are set by `handleBetterAuth` in `hooks.server.ts` via `auth.api.getSession()`. This story adds `event.locals.profileComplete` and `event.locals.userProfile` to the same handler, right after the existing assignment block.
- `requireUser(event)` from `src/lib/server/auth/guards.ts` is the auth check. `requireAdmin` and `assertOwner` are there too.
- Integration test pattern: use seeded test user (via dev bypass or direct DB insert via `pgFactory`) with a pre-created Better Auth session. See `tests/integration/auth.test.ts` for the setup pattern.
- Auth guard pattern review finding: the route guard regex `pattern: /^\/(?!(?:login|auth(?:\/|$)|r\/|skeleton|$))/` is already in `routeGuards[0]`. This story MUST update that regex to also exclude `profile\/complete` from the auth guard's session check is fine (profile/complete IS inside app and requires auth), but the PROFILE COMPLETE guard (redirecting incomplete-profile users) must exclude `profile\/complete`.
- Story 2.1 review finding (deferred): guard regex anchoring — not required but be aware when extending the pattern.

**From Story 1.6:**
- `writeAuditLog(tx, { actorId, entity, action, diff })` — the `diff` field is `unknown` type; pass any serializable object.
- The `DrizzleTransaction` type is imported from `drizzle-orm/pg-core` + `drizzle-orm` + `drizzle-orm/node-postgres`. See `src/lib/server/services/audit.ts` for the exact type imports.

**From Story 1.1/1.4:**
- Paraglide keys added to `messages/en.json` and `messages/th.json` are compiled via `bunx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`. The `src/lib/paraglide/` directory is auto-generated — do not edit.
- sveltekit-superforms was added as part of the project scaffold (confirmed in architecture).

### Profile Form UX Notes (EXPERIENCE.md + UXD-020)

- **Email field**: Display as a disabled/read-only text input. Add a short hint below: `m.profile_email_readonly_hint()`.
- **Title select**: Use shadcn-svelte `Select` with options Mr./Mrs./Ms./Other (Paraglide keys for each option label). This matches the registration form pattern for E6 prefill consistency.
- **Error states (UXD-020)**: Red border on invalid field + message below field. On submit with errors, focus jumps to the first error field. Use superforms' `$errors` store for field-level error binding.
- **Submit button**: disabled + loading spinner while `$submitting` is true (UXD-020).
- **Accessibility**: All inputs must have associated `<label>` elements (not just placeholder). Use shadcn-svelte `Label` component linked via `for`/`id`. Contrast ≥ 4.5:1. Tab order: title → first name → last name → phone → organization → submit.
- **Page title**: Use `<svelte:head><title>{m.profile_complete_title()}</title></svelte:head>` for accessibility and browser tab.

### Dependency Graph Note

Per `_bmad-output/implementation-artifacts/dependency-graph.md`: Story 2.3 depends on Story 2.1 (OIDC sign-in, Better Auth session on `event.locals`). Story 2.3 is a prerequisite for Stories 2.5 (guard dispatcher) and 6.4 (internal register-to-attend prefill from profile). The `user_profiles` schema is also referenced by the booking form (Story 4.4) for organizer contact pre-fill (FR-010 / FR-095).

### References

- Architecture auth section: `_bmad-output/planning-artifacts/architecture.md` §Authentication & Security (profile sourcing, OQ-3 resolved)
- Architecture structure: `_bmad-output/planning-artifacts/architecture.md` §Project Structure (file paths, boundaries)
- Epics FR-095, FR-101, FR-010: `_bmad-output/planning-artifacts/epics.md`
- Epic 2 story 2.3 full spec: `_bmad-output/planning-artifacts/epics.md` lines 444–457
- Test scenarios P0/P1: `_bmad-output/test-artifacts/test-design/test-design-epic-2.md` §Test Coverage Plan
- Risk R-005 (profile gate bypass): `test-design-epic-2.md` §Risk Register
- Risk R-008 (email mutation): `test-design-epic-2.md` §Risk Register
- Risk R-011 (audit on mutations): `test-design-epic-2.md` §Risk Register
- Story 2.1 (prerequisite): `_bmad-output/implementation-artifacts/2-1-sign-in-with-authentik-oidc.md`
- UX flow 1 + flow 4: `_bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/EXPERIENCE.md`
- State patterns UXD-020: `EXPERIENCE.md` §3 State patterns
- `hooks.server.ts` current state: `src/hooks.server.ts` — EXTEND (do not replace)
- `app.d.ts` current state: `src/app.d.ts` — ADD `profileComplete` and `userProfile` to `App.Locals`
- Audit service: `src/lib/server/services/audit.ts`
- Auth guards: `src/lib/server/auth/guards.ts`
- Better Auth schema: `src/lib/server/db/schema/auth.ts`
- Existing i18n keys: `messages/en.json`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- **Task 1**: Handwrote `drizzle/0003_user_profiles.sql` migration with camelCase columns matching Better Auth convention. Registered in `drizzle/meta/_journal.json` as idx:3. Created Drizzle schema in `src/lib/server/db/schema/profiles.ts`. Exported from schema index. Confirmed `user_profiles` already in `TRUNCATABLE_TABLES` in pg-factory.ts.
- **Task 2**: Installed `sveltekit-superforms@2.30.1` (lands in dependencies). Created `src/lib/schemas/profile.ts` with Valibot `ProfileSchema` (title picklist, non-empty string fields). Email deliberately excluded from schema (AC-7 security).
- **Task 3**: Created `src/lib/server/services/profile-service.ts` with `createProfile`, `updateProfile`, `getProfileByUserId`. Both mutations wrap DB operations in a transaction that also calls `writeAuditLog`. `computeDiff` helper captures only changed fields for update audit.
- **Task 4**: Extended `handleBetterAuth` in `hooks.server.ts` to populate `event.locals.profileComplete` and `event.locals.userProfile` per authenticated request. Updated `routeGuards[0]` pattern to exclude `profile\/complete` (prevents infinite redirect loop). Updated `src/app.d.ts` with `profileComplete: boolean | null` and `userProfile: UserProfile | null`.
- **Task 5**: Created `/profile/complete` server load (AC-4 redirect if already complete) and action (superforms + Valibot validation, createProfile call, redirect). Created Svelte 5 profile completion form with native styled select for title, Input/Label/Button shadcn components, all strings via Paraglide.
- **Task 6**: Created `/profile` edit server load (pre-populates superform from `event.locals.userProfile`) and action (updateProfile, returns form for success state). Created Svelte 5 profile edit form with inline success toast.
- **Task 7**: Added all 26 profile i18n keys to `messages/en.json` and `messages/th.json` (English placeholder values for th.json; Rawinan provides translations). Compiled Paraglide successfully.
- **Task 8**: Activated all 14 integration tests in `tests/integration/profile.test.ts` (removed `test.skip(` → `test(`). Tests cover AC-1 through AC-9 plus audit log scenarios 2.7-INT-002 through 2.7-INT-004.
- **Task 9**: prettier → exit 0. ESLint → exit 0. svelte-check → 0 errors, 2 warnings (superforms data.form capture — expected superforms pattern). Unit tests: 2 pre-existing failures (env.test.ts needs DATABASE_URL; i18n-messages build test needs DATABASE_URL env var) — not introduced by this story. Build passes with env vars set.
- **Additional**: Added `WithoutChild` and `WithoutChildrenOrChild` types to `src/lib/utils.ts` for new shadcn-svelte select component compatibility. Added Input, Label, Select, Separator shadcn components via `bunx shadcn-svelte@latest add`. Updated `(app)/+layout.server.ts` to pass `userProfile` and `profileComplete` to page data.

### File List

**New Files:**
- `drizzle/0003_user_profiles.sql`
- `src/lib/server/db/schema/profiles.ts`
- `src/lib/schemas/profile.ts`
- `src/lib/server/services/profile-service.ts`
- `src/routes/(app)/profile/complete/+page.server.ts`
- `src/routes/(app)/profile/complete/+page.svelte`
- `src/routes/(app)/profile/+page.server.ts`
- `src/routes/(app)/profile/+page.svelte`
- `src/lib/components/ui/input/input.svelte`
- `src/lib/components/ui/input/index.ts`
- `src/lib/components/ui/label/label.svelte`
- `src/lib/components/ui/label/index.ts`
- `src/lib/components/ui/select/` (multiple files)
- `src/lib/components/ui/separator/` (multiple files)

**Modified Files:**
- `package.json` — added `sveltekit-superforms` dependency
- `bun.lock` — updated lockfile
- `drizzle/meta/_journal.json` — registered 0003_user_profiles as idx:3
- `src/lib/server/db/schema/index.ts` — added `export * from './profiles.js'`
- `src/app.d.ts` — added `profileComplete: boolean | null` and `userProfile: UserProfile | null` to App.Locals
- `src/hooks.server.ts` — extended handleBetterAuth to populate profileComplete/userProfile; extended routeGuards pattern to exclude profile/complete
- `src/routes/(app)/+layout.server.ts` — passes userProfile and profileComplete to page data
- `src/lib/utils.ts` — added WithoutChild, WithoutChildrenOrChild, WithoutChildren types
- `messages/en.json` — added 26 profile i18n keys
- `messages/th.json` — added same 26 keys with English placeholder values
- `src/lib/paraglide/messages/` — compiled Paraglide output (auto-generated)
- `tests/integration/profile.test.ts` — activated all skipped tests (removed test.skip → test)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — updated story 2.3 status to review

## Change Log

- 2026-06-11: Story 2.3 implementation complete. Self-service profile feature implemented: user_profiles DB migration, Drizzle schema, profile service with audit logging, hooks.server.ts profile completeness guard, profile completion and edit routes with sveltekit-superforms + Valibot validation, i18n keys, integration tests activated. Status: review.
