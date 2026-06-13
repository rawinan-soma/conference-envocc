-- Migration: 0007_room_blocks
-- Story 3.4: Block time slots
-- Requires btree_gist (already enabled in 0000_init.sql)
--
-- Creates room_blocks table for storing admin-created time blocks on rooms.
-- The EXCLUDE constraint prevents overlapping blocks for the same room (AC-4).
-- ON DELETE CASCADE: removing a room also removes all its blocks.

CREATE TABLE "room_blocks" (
  "id" TEXT PRIMARY KEY,
  "room_id" TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  "during" tstzrange NOT NULL,
  "reason" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GiST index for overlap queries (supports the overlap check in block-slot-service)
CREATE INDEX idx_room_blocks_room_during ON room_blocks USING gist (room_id, during);

-- EXCLUDE constraint: no overlapping blocks for same room (AC-4, Risk R-003)
-- Catches error code 23P01 (exclusion_violation) at the service layer → HTTP 422
ALTER TABLE "room_blocks"
  ADD CONSTRAINT "room_blocks_no_overlap"
  EXCLUDE USING gist (
    room_id WITH =,
    during WITH &&
  );
