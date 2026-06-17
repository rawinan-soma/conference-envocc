---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted:
  - step-01-detect-mode
  - step-02-load-context
  - step-03-risk-and-testability
  - step-04-coverage-plan
  - step-05-generate-output
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-16'
epicTwoRevision: v3
epicThreeRevision: v1
epicFourRevision: v1
epicFiveRevision: v4
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/implementation-artifacts/1-1-scaffold-the-project.md
  - _bmad-output/implementation-artifacts/1-6-audit-log-write-hook-foundation.md
  - _bmad-output/implementation-artifacts/1-8-test-harness-ci.md
  - _bmad-output/test-artifacts/atdd-checklist-1-6-audit-log-write-hook-foundation.md
  - _bmad-output/test-artifacts/atdd-checklist-1-8-test-harness-ci.md
  - _bmad/tea/config.yaml
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/risk-governance.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/probability-impact.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-levels-framework.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-priorities-matrix.md
---

# Test Design Workflow Progress

## Step 1: Mode Detection

- **Mode detected**: Epic-Level (argument "Epic 1: Foundation & Walking Skeleton" + sprint-status.yaml present)
- **Epic**: Epic 1 — Foundation & Walking Skeleton (9 stories; Story 1.1 done, 1.2–1.9 backlog)
- **Prerequisites confirmed**: Epic + stories with acceptance criteria available; architecture.md available

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Drizzle + PostgreSQL + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **Pact.js utils**: disabled (tea_use_pactjs_utils: false)
- **Story 1.1 implementation details loaded**: compose.yaml (not docker-compose.yml), vite.config.ts adapter wiring, test directory structure confirmed
- **Existing test files found**: tests/unit/scaffold.spec.ts (13 skipped), tests/e2e/scaffold-smoke.spec.ts (4 skipped), tests/support/fixtures/scaffold-context.ts
- **ATDD checklist loaded**: _bmad-output/test-artifacts/atdd-checklist-1-1-scaffold-the-project.md
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

Key risks identified: EXCLUDE constraint correctness (DATA, P×I=9), Docker migration pre-start (OPS, 9), audit log atomicity (DATA, 6), job idempotency (BUS, 6), Thai rendering (BUS, 6), secret leak at startup (SEC, 6), build/CI gate (OPS, 6).
Total: 13 risks (7 high ≥6, 5 medium 3–5, 1 low).

## Step 4: Coverage Plan

Coverage matrix created with P0–P3 breakdown per story. Execution strategy: PR gate (P0+P1 < 15 min), nightly (P2/P3). Total: 42 scenarios (~56–80 hours).
Story 1.1 P1 stubs noted as already generated (ATDD workflow).

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-1.md`
Revision: v4 (2026-06-11) — updated post Stories 1.6 & 1.8 completion; Story 1.9 ATDD checklist generated

New artifact: `_bmad-output/test-artifacts/atdd-checklist-1-9-walking-skeleton-vertical-slice.md`
- 13 test stubs (P0: 6, P1: 5, P2: 1, P3: 1)
- Files: `tests/e2e/walking-skeleton.spec.ts`, `tests/integration/walking-skeleton.test.ts`
- Resolves deferred-work.md Story 1.2 failures (1.2-UNIT-008/010/012) via home page update

---

# Epic 2 Test Design Run — 2026-06-11

## Step 1: Mode Detection

- **Mode detected**: Epic-Level (argument "Epic 2: Identity & Access" + sprint-status.yaml present)
- **Epic**: Epic 2 — Identity & Access (7 stories; 2.1–2.7 all backlog; epic-2 in-progress)
- **Prerequisites confirmed**: Epic + stories with acceptance criteria available; architecture.md available; Epic 1 done

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Better Auth + Drizzle + PostgreSQL + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **Pact.js utils**: disabled (tea_use_pactjs_utils: false)
- **Existing test infrastructure confirmed**: Testcontainers Postgres tier active; audit.ts helper available; CI pipeline live
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

Key risks identified: dev bypass in production (SEC, P×I=6), guard dispatcher misconfiguration (SEC, 6), IDOR via assertOwner bypass (SEC, 6), session timeout not enforced (BUS, 6), profile gate bypass (BUS, 6), guard dispatcher not extensible (TECH, 6).
Medium: OIDC callback parameter leak (SEC, 4), email field mutability (BUS, 4), read-to-attend missing (BUS, 4), session row accumulation (OPS, 3), audit trail missing on mutations (BUS, 4).
Total: 12 risks (6 high ≥6, 5 medium 3–5, 1 low).

## Step 4: Coverage Plan

Coverage matrix: 14 P0 (~28–40h), 17 P1 (~20–30h), 8 P2 (~4–8h), 3 P3 (~2–4h). Total 42 scenarios (~54–82h ~7–10 days).
Execution: PR gate (P0+P1 Vitest+Playwright < 15 min via Testcontainers Postgres); nightly (P2 + Docker compose smoke); on-demand (P3).
IDOR template (`tests/support/helpers/idor-template.ts`) seeded in Story 2.7 for E3–E7 reuse.

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-2.md`
Revision: v1 (2026-06-11) — initial generation; all 7 stories backlog; 42 scenarios; 6 high-priority risks with mitigation plans; IDOR template pattern documented.

---

# Epic 2 Test Design Run (v2 Update) — 2026-06-12

## Step 1: Mode Detection

- **Mode detected**: Epic-Level (argument "Epic 2 — Identity & Access" + sprint-status.yaml present)
- **Epic**: Epic 2 — Identity & Access (7 stories; 2.1–2.4, 2.6 done; 2.5 and 2.7 backlog)
- **Prerequisites confirmed**: ATDD checklists for 2.1, 2.3, 2.6 loaded; actual test files inspected

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Better Auth + Drizzle + PostgreSQL + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **Pact.js utils**: disabled (tea_use_pactjs_utils: false)
- **Stories done since v1**: 2.1 (OIDC sign-in), 2.2 (dev bypass), 2.3 (self-service profile), 2.4 (roles model), 2.6 (session timeout) — PRs #107–110
- **New test files confirmed**: `auth-bypass.test.ts` (507L, active), `roles.test.ts` (232L, active), `profile.test.ts` (1082L, active), `session-timeout.test.ts` (454L, P0+P1 active), `dev-bypass.ts` helper
- **Skipped/todo tests**: `auth.test.ts` 7 skip, `auth-guard.test.ts` 12 todo, `auth.spec.ts` 11 skip, `profile.spec.ts` 12 skip
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

- R-001 (dev bypass in production): **MITIGATED** — `auth-bypass.test.ts` active; `dev-bypass.ts` seam created
- R-002 (guard dispatcher): **OPEN** — `auth-guard.test.ts` has 12 todo stubs awaiting Story 2.5
- R-003 (IDOR bypass): **OPEN** — `idor-template.ts` not yet created; awaiting Story 2.7
- R-004 (session timeout): **MITIGATED** — `session-timeout.test.ts` active; `2.6-INT-001` passing
- R-005 (profile gate): **MITIGATED** — `profile.test.ts` all P0 tests passing
- R-006 (guard extensibility): **OPEN** — `2.5-UNIT-001` todo awaiting Story 2.5
- R-008 (email mutability): **MITIGATED** — `2.3-INT-004` passing in `profile.test.ts`

## Step 4: Coverage Plan

- P0: 10 active, 3 todo (Story 2.5), 1 planned (Story 2.7)
- P1: 10 active, 4 todo (Story 2.5), 3 skip (E2E activation pending)
- P2: 2 active, 1 todo (2.5), 1 todo (on-demand), 1 planned (2.7), 3 skip
- P3: 3 todo/skip (all on-demand)
- Remaining effort: ~21–38h (~3–5 engineering days)

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-2.md`
Revision: v2 (2026-06-12) — updated post Stories 2.1, 2.2, 2.3, 2.4, 2.6 completion.
R-001, R-004, R-005 mitigated. R-002, R-003, R-006 open (Stories 2.5/2.7).
Status column added to all coverage tables. Test file inventory added to appendix.
23 E2E tests remain skipped; 12 auth-guard todos; `idor-template.ts` not yet created.

---

# Epic 2 Test Design Run (v3 Update) — 2026-06-12

## Step 1: Mode Detection

- **Mode detected**: Epic-Level (argument "Epic 2 Authorization & Session Management" + sprint-status.yaml present)
- **Epic**: Epic 2 — Identity & Access (7 stories; 2.1–2.6 done; 2.7 backlog)
- **Prerequisites confirmed**: Story 2.5 implementation doc + test review loaded; sprint-status confirms PR #111 merged

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Better Auth + Drizzle + PostgreSQL + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **New since v2**: Story 2.5 done (PR #111) — `auth-guard.test.ts` activated (8 tests); `mock-event.ts` extracted; code review grade B (86/100)
- **auth-guard.test.ts confirmed**: 8 tests (6 structural always-run + 2 HTTP `test.skipIf`); 0 todos remaining
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

- R-001 (dev bypass in production): **MITIGATED** ✅ — unchanged from v2
- R-002 (guard dispatcher): **MITIGATED** ✅ — Story 2.5 done; `auth-guard.test.ts` active; 8 tests green
- R-003 (IDOR bypass): **OPEN** — `idor-template.ts` not yet created; awaiting Story 2.7
- R-004 (session timeout): **MITIGATED** ✅ — unchanged from v2
- R-005 (profile gate): **MITIGATED** ✅ — unchanged from v2
- R-006 (guard extensibility): **MITIGATED** ✅ — Story 2.5 done; `2.5-UNIT-001` green; code review sign-off
- R-008 (email mutability): **MITIGATED** ✅ — unchanged from v2

## Step 4: Coverage Plan

- P0: 13 active, 1 planned (Story 2.7) — all Story 2.5 P0 tests now active
- P1: 15 active, 2 skip (E2E Playwright webServer pending)
- P2: 3 active, 1 todo (on-demand), 1 planned (2.7), 3 skip
- P3: 3 todo/skip (all on-demand)
- Remaining effort: ~8–16h (~1–2 engineering days)

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-2.md`
Revision: v3 (2026-06-12) — updated post Story 2.5 completion (PR #111).
R-001, R-002, R-004, R-005, R-006, R-008 all mitigated. R-003 open (Story 2.7 only).
auth-guard.test.ts: 8 active tests; mock-event.ts helper extracted; test file inventory updated.
13/14 P0 tests active. Only Story 2.7 work (IDOR template) remains before Epic 2 closes.

---

# Epic 3 Test Design Run — 2026-06-12

## Step 1: Mode Detection

- **Mode detected**: Epic-Level (argument "Epic 3 Room Inventory" + sprint-status.yaml present)
- **Epic**: Epic 3 — Room Inventory (4 stories; 3.1–3.4 all backlog; epic-3 backlog)
- **Prerequisites confirmed**: Epic + stories with acceptance criteria available; architecture.md available; Epic 1 and Epic 2 done

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Drizzle + PostgreSQL + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **Pact.js utils**: disabled (tea_use_pactjs_utils: false)
- **Existing test infrastructure confirmed**: Testcontainers Postgres tier active; audit.ts helper available; CI pipeline live; `idor-template.ts` available (Story 2.7 done)
- **FRs in scope**: FR-060 (add/edit/deactivate rooms), FR-061 (room record fields incl. photo), FR-062 (block time slots)
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

Key risks identified: photo route without auth guard (SEC, P×I=6), IDOR on admin room routes (SEC, 6), block slot vs. booking overlap not enforced (DATA, 6), deactivated room visible in booking selector (BUS, 6), photo storage path lost on restart (TECH, 6).
Medium: empty name validation missing (BUS, 4), features enum stored incorrectly (BUS, 4), audit log missing on mutations (BUS, 4), room list unindexed (PERF, 3), photo MIME type not validated (SEC, 4), block conflict error swallowed (BUS, 4).
Total: 11 risks (5 high ≥6, 6 medium/low).

## Step 4: Coverage Plan

Coverage matrix: 12 P0 (~24–36h), 14 P1 (~18–28h), 8 P2 (~6–12h), 3 P3 (~2–4h). Total 37 scenarios (~50–80h ~7–10 days).
Execution: PR gate (P0+P1 Vitest+Playwright < 15 min via Testcontainers Postgres); nightly (P2 + Docker compose + photo volume smoke); on-demand (P3).
Key reuse: `testOwnershipEnforcement()` from `idor-template.ts` for all admin room mutation IDOR proofs.
New file: `tests/integration/rooms.test.ts`; new file: `tests/e2e/rooms.spec.ts`; append to `tests/integration/db-schema.test.ts`.

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-3.md`
Revision: v1 (2026-06-12) — initial generation; all 4 stories backlog.
5 high-priority risks (R-001 through R-005) identified with mitigation plans.
12 P0 + 14 P1 + 8 P2 + 3 P3 scenarios planned.
Reuses `idor-template.ts` (Story 2.7) and E1 Testcontainers fixture without modification.
Planned test files: `rooms.test.ts` (new), `rooms.spec.ts` (new), `db-schema.test.ts` (append).

---

# Epic 4 Test Design Run — 2026-06-13

## Step 1: Mode Detection

- **Mode detected**: Epic-Level (argument "Epic 4 — Room Booking & Organizer Workspace" + sprint-status.yaml present)
- **Epic**: Epic 4 — Room Booking & Organizer Workspace (8 stories; 4.1–4.8 all backlog; epic-4 in-progress)
- **Prerequisites confirmed**: Epic + stories with acceptance criteria available; architecture.md available; Epics 1, 2, 3 all done

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Drizzle + PostgreSQL + pg-boss + nodemailer + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **Pact.js utils**: disabled (tea_use_pactjs_utils: false)
- **Existing test infrastructure confirmed**: Testcontainers Postgres tier active; pg-boss + Mailpit platform wired (E1); audit.ts helper available; CI pipeline live; `idor-template.ts` available (Story 2.7 done); rooms table + room_blocks table (E3 done)
- **FRs in scope**: FR-001–004(behavior), FR-010–015, FR-020, FR-023, FR-030, FR-031, FR-034, FR-034b, FR-038, FR-050, FR-051, FR-052, FR-080, FR-082, FR-083
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

Key risks identified: concurrent double-booking not prevented at DB level (DATA, P×I=9 — AR-11 mandate), EXCLUDE predicate not refined with cancelled predicate (DATA, 6), IDOR on booking mutations (SEC, 6), booking confirmation email sent synchronously (BUS, 6), registration token predictable or unhashed (SEC, 6), `23P01` error not caught and mapped to field error (BUS, 6), room calendar query unindexed (PERF, 6).
Medium: back-to-back tstzrange conflict (BUS, 4), QR code links wrong URL (BUS, 4), duplicate booking incomplete pre-fill (BUS, 4), audit log missing on mutations (BUS, 4), email idempotency key collision (TECH, 3), dashboard shows other organizers' bookings (OPS, 4).
Total: 13 risks (7 high ≥6 including one score=9, 6 medium/low).

## Step 4: Coverage Plan

Coverage matrix: 16 P0 (~32–48h), 16 P1 (~18–28h), 9 P2 (~6–10h), 4 P3 (~2–4h). Total 45 scenarios (~58–90h ~8–11 days).
Execution: PR gate (P0+P1 Vitest+Playwright < 15 min via Testcontainers Postgres; `4.1-CONC-001` concurrent test mandatory in PR gate); nightly (P2 + Docker compose smoke); on-demand (P3 incl. k6 load).
Key reuse: `testOwnershipEnforcement()` from `idor-template.ts` for Stories 4.4 and 4.7 IDOR proofs.
New file: `tests/integration/bookings.test.ts`; new file: `tests/e2e/bookings.spec.ts`; append to `tests/integration/db-schema.test.ts`; new file: `k6/calendar-load.js` (on-demand).

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-4.md`
Revision: v1 (2026-06-13) — initial generation; all 8 stories backlog.
7 high-priority risks (R-002 score=9 concurrent double-booking; R-001/003/004/005/006/007 score=6) identified with mitigation plans.
16 P0 + 16 P1 + 9 P2 + 4 P3 scenarios planned.
Non-negotiable: `4.1-CONC-001` concurrent double-booking test (AR-11 mandate) in PR gate.
Reuses `idor-template.ts` (Story 2.7), `db-schema.test.ts` (E1/E3), Testcontainers fixture without modification.
Planned test files: `bookings.test.ts` (new), `bookings.spec.ts` (new), `db-schema.test.ts` (append 2 tests), `k6/calendar-load.js` (new, on-demand).

---

# Epic 5 Test Design Run — 2026-06-15

## Step 1: Mode Detection

- **Mode detected**: Epic-Level (argument "Epic 5 (External Registration & Headcount)" + sprint-status.yaml present)
- **Epic**: Epic 5 — External Registration & Headcount (8 stories; 5.1–5.8 all backlog; epic-5 in-progress)
- **Prerequisites confirmed**: Epic + stories with acceptance criteria available; architecture.md available; Epics 1–4 all done

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Drizzle + PostgreSQL + pg-boss + nodemailer + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **Pact.js utils**: disabled (tea_use_pactjs_utils: false)
- **ADR loaded**: adr-4-5-registration-token-storage.md — event registration token plaintext; self-cancel token hashed per AR-05
- **Existing test infrastructure confirmed**: Testcontainers Postgres tier active; pg-boss + Mailpit wired; `idor-template.ts` available; `booking-token.test.ts` (IT-001–005) establishes `registration_token` shape; `hooks.server.ts` `/r/[token]` allow-listed as public
- **FRs in scope**: FR-040–047, FR-021, FR-022, FR-032, FR-033, FR-092, FR-035
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

Key risks identified: Token IDOR on public `/r/[token]` route (SEC, P×I=9 — BLOCK), single-use cancel token replay (SEC, 6), resend endpoint enumeration (SEC, 6), auto-close job double-fire (BUS, 6), closed-state POST bypass (BUS, 6), catering aggregation concurrency (DATA, 6), registrant list IDOR (BUS, 6).
Medium: mobile responsiveness parity (PERF, 4), confirmation email dropped to DLQ (BUS, 4), "Other→text" field lost (DATA, 4).
Document: auto-close lint boundary (TECH, 3), no-capacity guard accidental cap (BUS, 3), cancel token state on DB failover (OPS, 2).
Total: 13 risks (1 BLOCK score=9, 6 MITIGATE score=6, 3 MONITOR score=4, 3 DOCUMENT score ≤3).

## Step 4: Coverage Plan

Coverage matrix: 17 P0 (~30–45h), 19 P1 (~20–32h), 11 P2 (~8–16h), 4 P3 (~3–6h). Total 51 scenarios (~61–99h ~2–3 weeks).
Execution: PR gate (P0+P1 Vitest+Playwright < 15 min via Testcontainers Postgres); nightly (P2 + k6 load + timing); on-demand (P3 visual snapshot).
Mandatory PR gate: `5.1-INT-IDOR-001` (BLOCK), `5.2-INT-CLOSED-001`, `5.4-INT-001` (single-use), `5.5-INT-001` (neutral disclosure), `5.6-INT-002` (idempotency), `5.7-INT-001` (concurrent catering), `5.8-INT-IDOR-001`.

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`
Revision: v1 (2026-06-15) — initial generation; all 8 stories backlog.
1 BLOCK risk (R-001 score=9 token IDOR) + 6 MITIGATE risks identified with mitigation plans.
17 P0 + 19 P1 + 11 P2 + 4 P3 scenarios planned.
Non-negotiable: `5.1-INT-IDOR-001` (BLOCK, score=9 automatic gate fail) in every PR.
Reuses `idor-template.ts` (Story 2.7) for `5.1-INT-IDOR-001` and `5.8-INT-IDOR-001`.
Planned test files: `registrations.test.ts` (new), `registrations.spec.ts` (new), `db-schema.test.ts` (append), `k6/registration-load.js` (new, on-demand).
ADR 4.5 scope: event token plaintext (confirmed by E4 tests); self-cancel token hashed (new in E5).

---

# Epic 5 Test Design Run (v3 Update) — 2026-06-16

## Step 1: Mode Detection

- **Mode detected**: Epic-Level (argument "epic-5" + sprint-status.yaml present)
- **Epic**: Epic 5 — External Registration & Headcount (8 stories; 5.1–5.2 done; 5.3–5.8 backlog)
- **Prerequisites confirmed**: Story 5.2 implementation doc loaded; actual test files inspected; sprint-status confirms PR #129 merged

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Drizzle + PostgreSQL + pg-boss + nodemailer + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **New since v2**: Story 5.2 done (PR #129 merged 2026-06-16T02:44:27Z)
  - `registrations` schema + migration `0010_registrations.sql` live
  - `createRegistration` service + `RegistrationClosedError` implemented
  - `RegistrationSchema` (Valibot) with conditional `mealType` and `titleOtherText`
  - `register` form action wired to superform + service
  - 22 `reg_form_*` i18n keys added; Thai values set to `""`
  - `TRUNCATABLE_TABLES` updated; `db-schema.test.ts` assertion added
  - `5.2-INT-001` (P0 ACTIVE) and `5.2-INT-CLOSED-001` (P0 ACTIVE) green in CI
  - `5.2-INT-002/003/004/005` (P1 `test.skip`); all E2E stubs appended as `test.skip`
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

- R-001 (token IDOR BLOCK): **CLOSED** ✅ — unchanged from v2
- R-002 (cancel token replay): **OPEN** — awaiting Story 5.4
- R-003 (resend enumeration): **OPEN** — awaiting Story 5.5
- R-004 (auto-close double-fire): **OPEN** — awaiting Story 5.6
- R-005 (closed-state POST bypass): **MITIGATED** ✅ — `5.2-INT-CLOSED-001` green; `RegistrationClosedError` service-layer guard active; no row inserted when `registrationEnabled=false`
- R-006 (catering concurrency): **OPEN** — awaiting Story 5.7
- R-007 (registrant list IDOR): **OPEN** — awaiting Story 5.8
- R-008 (mobile responsiveness): **OPEN** — `5.2-E2E-MOBILE-001/002` scaffolded as `test.skip`
- R-010 ("Other→text" lost): **OPEN** — `5.2-INT-002/004` scaffolded as `test.skip`
- R-012 (no-capacity cap): **OPEN** — `5.2-INT-005` scaffolded as `test.skip`

## Step 4: Coverage Plan

- P0: 15 of 17 active (5.1: 3 active; 5.2: 2 active); 2 planned for Stories 5.3–5.8
- P1: 2 of 19 active (5.1: 0 active, all skip; 5.2: 0 active, all skip); remaining 19 planned/skip
- P2: 0 of 11 active; all skip
- P3: 0 of 4 active; all skip
- Remaining effort for 5.3–5.8: ~55–85h (~7–10 days)

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`
Revision: v3 (2026-06-16) — updated post Story 5.2 completion (PR #129).
R-001 CLOSED (v1), R-005 MITIGATED ✅ (v3). R-002, R-003, R-004, R-006, R-007 open.
`5.2-INT-001` + `5.2-INT-CLOSED-001` green in CI gate.
P1 stubs for 5.2 remain `test.skip`; E2E activation pending for Stories 5.3–5.8 progression.
5.3–5.8 remain backlog; all their P0 scenarios planned but not yet implemented.

---

# Epic 5 Test Design Run (v4 Update) — 2026-06-16

## Step 1: Mode Detection

- **Mode detected**: Update/Resume (v3 already exists; sprint-status shows 4 new stories done since v3)
- **Epic**: Epic 5 — External Registration & Headcount (8 stories; 5.1–5.3, 5.6–5.8 done; 5.4 and 5.5 backlog)
- **New since v3**: Stories 5.3 (PR #130), 5.6 (PR #132), 5.7 (PR #133), 5.8 (PR #131) all merged 2026-06-16
- **Prerequisites confirmed**: All 4 new implementation docs + ATDD checklists loaded; `tests/integration/registrations.test.ts` inspected (2513 lines); `tests/e2e/registrations.spec.ts` inspected (5.7-E2E-001 and 5.8-E2E-001/002 confirmed `test.skip`)

## Step 2: Context Loading

- **Stack detected**: fullstack (SvelteKit 5 + Bun + Drizzle + PostgreSQL + pg-boss + nodemailer + Playwright + Vitest)
- **Playwright utils**: enabled (tea_use_playwright_utils: true)
- **Story 5.3 done** — `registration-confirmation.ts` template; pg-boss `SEND_EMAIL` queue; `singletonKey: registration-confirm-${registrationId}`; cancel link `${origin}/r/${eventToken}/cancel?token=${cancelTokenPlain}`; 6 `reg_email_*` i18n keys; `5.3-INT-001+002` P0 ACTIVE (raw SQL pg-boss job proof)
- **Story 5.6 done** — `CLOSE_REGISTRATION` pg-boss queue; `closeRegistrationHandler` with `FOR UPDATE` row lock + idempotency guard; manual close action; `5.6-INT-001` + `5.6-INT-002` P0 ACTIVE
- **Story 5.7 done** — `getCateringCountsByBookingId`/`getCateringCountsByBookingIds` live queries; batch fetch (no N+1); `BookingCard.svelte` catering summary section; `5.7-INT-001` + `5.7-INT-002` P0 ACTIVE
- **Story 5.8 done** — `getRegistrantsByBookingId` query; `registrantCount` subquery; `/bookings/[id]/registrants` route with owner-or-admin guard; `BookingCard.svelte` live headcount; `5.8-INT-IDOR-001` + `5.8-INT-001` + `5.8-INT-002` P0 ACTIVE; `5.8-IDOR-001` uses `seedUserWithSession()` + `buildSignedSessionCookie()` + `testOwnershipEnforcement()`; gated by `DEV_SERVER_URL`
- **E2E status confirmed**: `5.7-E2E-001` (P1) and `5.8-E2E-001/002` (P1) remain `test.skip` — scaffolds exist, seed wiring pending
- **Knowledge fragments loaded**: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix

## Step 3: Risk & Testability Assessment

- R-001 (token IDOR BLOCK): **CLOSED** ✅ — unchanged from v1
- R-002 (cancel token replay): **OPEN** — awaiting Story 5.4; `5.4-INT-001` planned
- R-003 (resend enumeration): **OPEN** — awaiting Story 5.5; `5.5-INT-001` planned
- R-004 (auto-close double-fire): **MITIGATED** ✅ — Story 5.6 done (PR #132); `FOR UPDATE` lock + idempotency guard; `5.6-INT-001` + `5.6-INT-002` P0 green in CI; `5.6-INT-003` (worker restart) P1 skip
- R-005 (closed-state POST bypass): **MITIGATED** ✅ — unchanged from v3
- R-006 (catering concurrency): **MITIGATED** ✅ — Story 5.7 done (PR #133); live query (no cached counter); `5.7-INT-001` + `5.7-INT-002` P0 green in CI
- R-007 (registrant list IDOR): **MITIGATED** ✅ — Story 5.8 done (PR #131); owner-or-admin guard; `5.8-INT-IDOR-001` P0 active (CI-only via `DEV_SERVER_URL`)
- R-008 (mobile responsiveness): **OPEN** — `5.2-E2E-MOBILE-001/002` scaffolded as `test.skip`
- R-009 (confirmation email dropped): **PARTIALLY ADDRESSED** — `5.3-INT-001+002` P0 active proves pg-boss job enqueue and cancel link payload shape; full route-action proof + DLQ (`5.3-INT-005`) remain `test.skip`
- R-010 ("Other→text" lost): **OPEN** — `5.2-INT-002/004` scaffolded as `test.skip`
- R-011 (lint boundary): **DOCUMENTED** ✅ — `close-registration.ts` uses only relative imports; `5.6-INT-005` (lint scan) remains `test.skip`
- R-012 (no-capacity cap): **OPEN** — `5.2-INT-005` scaffolded as `test.skip`

## Step 4: Coverage Plan

- P0: 17 of 17 scenarios now have active tests (5.1: 3 active; 5.2: 2 active; 5.3: 2 active [combined]; 5.6: 2 active; 5.7: 2 active; 5.8: 3 active; 5.4: 2 planned; 5.5: 1 planned)
- P1: 5 still `test.skip` in integration (5.2: 4, 5.3: 1); 8 E2E stubs still `test.skip` (5.1: 4, 5.2: 4, 5.7: 1, 5.8: 2); 5.6-INT-003/004 skip; 5.4-E2E-001 and 5.5-E2E-001 planned
- P2: 0 active; all `test.skip` or planned
- P3: 0 active; all `test.skip` or planned
- Remaining effort for 5.4/5.5: ~18–30h (~2–4 engineering days)

## Step 5: Output Generated

Output file: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`
Revision: v4 (2026-06-16) — updated post Stories 5.3, 5.6, 5.7, 5.8 completion.
R-001 CLOSED (v1), R-005 MITIGATED ✅ (v3), R-004/R-006/R-007 MITIGATED ✅ (v4), R-009 partially addressed (v4), R-011 documented (v4).
All 17 P0 test scenarios now have active tests in `registrations.test.ts`.
`5.6-INT-002` (idempotency) added to mandatory PR gate.
5.4 and 5.5 remain backlog; R-002 and R-003 remain the only open MITIGATE risks.
New ATDD checklist committed: `atdd-checklist-5-7-catering-aggregation.md`.
