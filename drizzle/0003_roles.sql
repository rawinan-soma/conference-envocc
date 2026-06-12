-- Roles & Assignment Model — Story 2.4
-- Adds is_admin flag to users. Default false = organizer (no assignment needed).
-- Admin assignment UI is Epic 7 (Story 7.6).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false;
