-- Migration 0010: registrations table — Story 5.2
-- Creates the registrations table linked to bookings.

CREATE TABLE IF NOT EXISTS "registrations" (
  "id" text PRIMARY KEY NOT NULL,
  "booking_id" text NOT NULL,
  "title" text NOT NULL,
  "title_other_text" text,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "organization" text NOT NULL,
  "email" text NOT NULL,
  "meal_type" text,
  "meal_type_other_text" text,
  "cancel_token_hash" text,
  "status" text DEFAULT 'registered' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_booking_id_bookings_id_fk"
  FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registrations_booking_id" ON "registrations" ("booking_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registrations_cancel_token_hash" ON "registrations" ("cancel_token_hash");
