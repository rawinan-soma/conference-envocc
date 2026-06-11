CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" text,
	"entity" text NOT NULL,
	"action" text NOT NULL,
	"diff" jsonb
);
