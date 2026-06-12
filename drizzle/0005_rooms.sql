-- Migration: 0005_rooms
-- Story 3.1: Create and edit rooms
--
-- Creates rooms table to store bookable conference rooms managed by admins.
-- Features is a text array (NOT NULL, default {}) validated at the service layer
-- to the allowed enum values: 'projector', 'whiteboard', 'vc', 'tv'.
-- is_active is a soft-delete flag — false hides the room from the bookable calendar.
--
-- Column naming convention note:
--   Snake_case is used here (is_active, created_at, updated_at) per standard SQL convention.
--   The Drizzle schema maps these to camelCase (isActive, createdAt, updatedAt) via the
--   explicit column name arguments in the pgTable definition.

CREATE TABLE "rooms" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "floor" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "features" TEXT[] NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index for active rooms — used by the room-list query in the booking selector (E4).
-- Risk R-009: Without this index, a sequential scan on a large rooms table risks NFR-003 < 3s.
CREATE INDEX idx_rooms_is_active ON rooms (id) WHERE is_active = true;
