-- Migration 0000: Initial schema
-- Story 1.3/1.8: Bookings table with EXCLUDE constraint (AR-02)
--
-- Architecture AR-02:
--  - btree_gist extension required for EXCLUDE USING gist on non-gist types (text, tstzrange)
--  - EXCLUDE constraint: (room_id WITH =, during WITH &&) WHERE (status != 'cancelled')
--  - Half-open ranges [start, end) — use tstzrange(start, end, '[)') on insert
--  - Active-only predicate: cancelled bookings do not block overlapping active bookings

-- Enable btree_gist extension (required for EXCLUDE with mixed types)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create bookings table
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" serial PRIMARY KEY,
  "room_id" text NOT NULL,
  "during" tstzrange NOT NULL,
  "status" text NOT NULL DEFAULT 'active'
);

-- Add EXCLUDE constraint (AR-02): prevents overlapping active bookings for same room
-- Half-open [) ranges: 10:00–11:00 and 11:00–12:00 are adjacent (no conflict)
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    room_id WITH =,
    during WITH &&
  )
  WHERE (status != 'cancelled');
