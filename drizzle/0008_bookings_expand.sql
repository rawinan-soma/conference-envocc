-- Migration: 0008_bookings_expand
-- Story 4.4: Create a Booking (Conflict-Free)
--
-- Expands the bookings table:
--   1. Migrates PK from serial (integer) to TEXT (UUID v7, application-generated)
--   2. Adds organizer_id, event_name (NOT NULL) columns
--   3. Adds optional columns: agenda, catering_enabled, registration_enabled, registration_closes_at
--   4. Adds audit timestamps: created_at, updated_at
--
-- IMPORTANT: The bookings_no_overlap EXCLUDE constraint (0000_init.sql) operates on
-- (room_id, during) — neither column changes — so it survives the PK change intact.
--
-- NOTE: Application generates UUID v7 via $defaultFn(() => uuidv7()) in the Drizzle schema.
-- gen_random_uuid() is used here only to back-fill existing seed rows with a UUID value.

-- Step 1: Add new UUID v7 id column
ALTER TABLE "bookings" ADD COLUMN "id_new" TEXT;

-- Populate existing rows (use gen_random_uuid() as fallback for seed data)
UPDATE "bookings" SET "id_new" = gen_random_uuid()::text WHERE "id_new" IS NULL;

-- Drop old PK constraint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_pkey";

-- Drop old id column (was serial / generated always as identity)
ALTER TABLE "bookings" DROP COLUMN "id";

-- Rename new column
ALTER TABLE "bookings" RENAME COLUMN "id_new" TO "id";

-- Add PK
ALTER TABLE "bookings" ADD PRIMARY KEY ("id");

-- NOT NULL constraint
ALTER TABLE "bookings" ALTER COLUMN "id" SET NOT NULL;

-- Step 2: Add organizer_id (FK to Better Auth user — stored as text)
ALTER TABLE "bookings" ADD COLUMN "organizer_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "bookings" ALTER COLUMN "organizer_id" DROP DEFAULT;

-- Step 3: Add event_name
ALTER TABLE "bookings" ADD COLUMN "event_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "bookings" ALTER COLUMN "event_name" DROP DEFAULT;

-- Step 4: Add optional columns
ALTER TABLE "bookings" ADD COLUMN "agenda" TEXT;
ALTER TABLE "bookings" ADD COLUMN "catering_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN "registration_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN "registration_closes_at" TIMESTAMPTZ;

-- Step 5: Add audit timestamps
ALTER TABLE "bookings" ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "bookings" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
