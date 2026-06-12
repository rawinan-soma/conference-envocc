-- Migration: 0004_user_profiles
-- Story 2.3: Self-service profile
--
-- Creates user_profiles table to store app-owned profile fields for each authenticated user.
-- Email is sourced from OIDC claim and stored read-only; all other fields are user-entered.
--
-- Column naming convention note:
--   This table uses camelCase column names (userId, firstName, lastName, createdAt, updatedAt)
--   to match the convention established by Better Auth tables (users, sessions, accounts, verifications)
--   in migration 0002_better_auth.sql. This deviates from the general snake_case architecture
--   guideline but follows the precedent set by the Better Auth Drizzle adapter convention.

CREATE TABLE "user_profiles" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "organization" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
