-- Migration: 0009_booking_registration_token
-- Story 4.5: Booking Confirmation — Registration Link & QR
--
-- Adds the registration_token column to bookings:
--   - TEXT, nullable (null when registrationEnabled = false)
--   - UNIQUE index enforces one-token-per-booking at DB level
--   - Token value is a 64-char hex string (32 CSPRNG bytes via crypto.randomBytes(32))
--   - Accepted deviation from AR-05 hash-only: token must be redisplayable
--     (FR-038 re-download, FR-031/052 dashboard copy).
--     See _bmad-output/implementation-artifacts/adr-4-5-registration-token-storage.md

ALTER TABLE "bookings" ADD COLUMN "registration_token" TEXT;
CREATE UNIQUE INDEX "bookings_registration_token_unique" ON "bookings" ("registration_token") WHERE "registration_token" IS NOT NULL;
