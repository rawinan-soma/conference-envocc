---
title: "Sprint Change Proposal — Internal First-Login Onboarding"
project: conference-envocc
author: Rawinan
date: 2026-06-10
scope: Minor
status: approved
---

# Sprint Change Proposal
## Internal user first-login onboarding (personnel registration)

### Section 1 — Issue Summary

A requirement surfaced during sprint execution that had not been explicitly captured:
on **first login via Authentik OIDC**, an internal user must register their personnel
data into the application database. The **email is taken from the SSO identity provider**;
the user supplies **phone number, first name, and last name** through a profile form.

**Discovery:** Raised by Rawinan while reviewing what to build next, before Epic 2 work
began. No code was affected (Epic 2 is entirely `backlog`; only Story 1.1 is `done`).

**Issue type:** New requirement / clarification of an existing deferred decision —
**not** a strategic pivot or failed approach.

### Section 2 — Impact Analysis

The requirement was already largely covered by the existing plan, and the one open
decision it touched (OQ-3) had already been resolved toward self-service profiles.

| Artifact | Already present | Gap closed by this change |
|---|---|---|
| PRD `FR-090`, `FR-095` | Internal IdP auth + profile (title, name, phone, email, org); OQ-3 deferred | Resolved OQ-3 in PRD; split `name` → first/last; email locked read-only from IdP |
| Architecture (OQ-3) | RESOLVED self-service; email "pre-populated but editable" | Email now **read-only from the OIDC claim**; name split first/last |
| Epic 2 / Story 2.3 | First-login forced profile completion; phone capture; app-owned persistence | AC now specifies email read-only from OIDC + first/last name |

- **Epic impact:** Epic 2 (Identity & Access) only — scope refined, not restructured.
- **Story impact:** Story 2.3 (Self-service profile) acceptance criteria updated. Stories
  2.1 (OIDC sign-in) and 2.4–2.7 unaffected.
- **Architecture impact:** One note updated (OQ-3 profile sourcing). No component, data-flow,
  or technology change — the profile schema was already "sized for FR-101 prefill."
- **No rollback, no MVP scope change, no resequencing.** No completed work is affected.

### Section 3 — Recommended Approach

**Option 1 — Direct Adjustment** *(selected)*. Refine the existing PRD requirement,
architecture note, and Story 2.3 acceptance criteria in place.

- Effort: **Low** · Risk: **Low** · Timeline impact: **None** (Epic 2 not yet started).
- Rollback (Option 2) and MVP Review (Option 3) evaluated and rejected as not applicable —
  nothing is built to roll back and the MVP scope is unchanged.

### Section 4 — Detailed Change Proposals (applied)

1. **PRD `FR-095`** — split `name` into **first name + last name**; added a
   "Profile population (resolves OQ-3)" paragraph: self-service screen on first login,
   email sourced **read-only** from the OIDC claim, all other fields user-entered/app-owned.
2. **Architecture — OQ-3 profile sourcing note** — email changed from
   "pre-populated but editable" to **"taken from the OIDC `email` claim and stored
   read-only"**; profile fields list updated to first/last name.
3. **Epic 2 / Story 2.3 acceptance criteria** — email **pre-filled read-only from the
   Authentik OIDC claim**; user submits title, **first name, last name**, phone, organization.
4. **Epic 2 "Includes" summary line** — schema descriptor updated to
   `(title/first-name/last-name/phone/email-from-OIDC/org)`.

**Open decisions resolved (2026-06-10):** email = read-only from OIDC; name = split first/last.

### Section 5 — Implementation Handoff

- **Scope classification:** **Minor** — direct implementation by the Developer agent; no
  backlog reorganization or replan required.
- **sprint-status.yaml:** No structural change (no epics/stories added, removed, or
  renumbered). Story `2-3-self-service-profile` remains `backlog` with refined criteria.
- **Handoff:** When Epic 2 is reached, run **Create Story (`bmad-create-story create`)**
  for `2-3-self-service-profile` — it will now carry the first-login + read-only-email +
  first/last-name criteria into the story file for **Dev Story (`bmad-dev-story`)**.

**Success criteria:** On first login, a new internal user is forced to a profile form with
email pre-filled read-only from Authentik; they enter phone + first name + last name (+ title,
organization); the record persists to the app DB and is editable later (except email); the
user cannot reach the app until required fields are complete.
