-- Migration: 0011_cancel_token_hash_unique
-- Story 5.4: Self-Cancel a Registration — schema hardening
--
-- Adds a partial UNIQUE index on registrations.cancel_token_hash:
--   - Enforces at DB level that no two ACTIVE (non-cancelled) registrations share a hash
--   - Partial (WHERE IS NOT NULL) so cancelled rows (hash = NULL) are exempt from uniqueness
--   - Guards against the cancellation logic assuming uniqueness without DB enforcement:
--     if two rows somehow shared a hash, LIMIT 1 would silently pick an arbitrary row

CREATE UNIQUE INDEX "registrations_cancel_token_hash_unique"
  ON "registrations" ("cancel_token_hash")
  WHERE "cancel_token_hash" IS NOT NULL;
