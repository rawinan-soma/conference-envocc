# ADR 4.5: Event registration token stored plaintext (deviation from AR-05)

**Status:** Accepted
**Date:** 2026-06-15
**Story:** 4.5 — Booking Confirmation — Registration Link & QR (GH #25)
**Supersedes/relates to:** AR-05 (External token model) — `architecture.md:225`, `epics.md:124`
**Risk register:** R-005 (test-design-epic-4) — closes the actionable arm

---

## Context

AR-05 states external tokens are "opaque CSPRNG, **stored hashed**, IDOR-isolated,
single-use cancel, expiring." AR-05 lumps together two distinct tokens:

1. The **event registration token** — one per event, encodes the public
   registration link `/r/{token}`, printed on a shareable QR code.
2. The **self-cancel token** — one per registration record, single-use,
   email-delivered, verified server-side and never redisplayed.

Story 4.5 implements (1). It stores the registration token **plaintext** in
`bookings.registration_token` (TEXT, partial UNIQUE index), which deviates from
the literal "stored hashed" wording of AR-05.

## Decision

Store the event registration token **plaintext**. Do not hash it.

## Rationale — why hashing is rejected (not merely deferred)

Hashing is a **one-way** function: the original token cannot be recovered from a
hash. The event registration token must be **redisplayable on every visit**:

- `epics.md:664` (Story 4.5 AC, the more-specific governing requirement) mandates
  a **"persisted, resolvable"** registration token and link shown on the
  confirmation screen.
- **FR-038** — the QR (which encodes the literal `/r/{token}` URL) must be
  re-renderable and re-downloadable at `/bookings/[id]` on any visit.
- **FR-031 / FR-052** (Story 4.8) — the dashboard shows the registration link
  with one-click copy, requiring the token to be retrieved for display.

A hash-only column cannot satisfy any of these — the confirmation page would work
only once (before a reload), and the QR could never be regenerated. Hashing is
therefore **cryptographically incompatible** with a binding AC in the same
planning docs, not just harder to implement. This is a doc-vs-doc conflict
(general AR-05 vs story-specific epics AC); the more-specific story AC governs.

The event registration token is **not a secret to verify** — it is public by
design, printed on a QR and shared with attendees. The hash requirement in AR-05
protects single-use cancel-style tokens against DB-read disclosure enabling
forgery; that threat model does not apply to a link meant to be broadcast.

## Security properties retained

- **256-bit entropy** — `crypto.randomBytes(32).toString('hex')` (64-char hex).
  Brute-forcing the token space is infeasible.
- **IDOR isolation** — `assertOwner` guards both `/bookings/[id]` and
  `/bookings/[id]/qr`; only the booking's organizer can retrieve the link/QR from
  the app UI (`+page.server.ts`, `qr/+server.ts`).
- **Never logged** — the audit-log diff records `'[generated]'`, never the token
  value (`booking-service.ts`).
- **DB-level uniqueness** — partial UNIQUE index
  `bookings_registration_token_unique ... WHERE registration_token IS NOT NULL`.

## Alternatives considered

- **Hash storage (AR-05 literal):** rejected — incompatible with the resolvable
  AC (see Rationale).
- **Reversible encryption-at-rest:** preserves both redisplay and at-rest
  confidentiality, but requires a managed encryption key (new secret + key-rotation
  infra), interacts with the UNIQUE index and Epic 5's `/r/[token]` lookup path,
  and buys no benefit against the actual threat model (the token is broadcast
  publicly anyway). **Deferred** as the stronger option to revisit if the threat
  model changes — see Revisit.

## Scope — what still hashes

The **self-cancel token** (Epic 5, per-registration, single-use, email-delivered,
never redisplayed) remains **hashed** per AR-05. This ADR narrows the deviation to
the event registration token only.

## Revisit

Re-evaluate at **Epic 5** when `/r/[token]` resolution and the self-cancel token
are implemented. If a future requirement makes at-rest confidentiality of the
event token material, adopt the reversible-encryption alternative above.

## Consequences

- IT-001 / IT-004 assert `registration_token` equals the plaintext token. If hash
  or encryption storage is later adopted, those assertions must change.
- The schema/migration comments and `booking-service.ts` now reference this ADR
  instead of a non-existent "deviation note".
