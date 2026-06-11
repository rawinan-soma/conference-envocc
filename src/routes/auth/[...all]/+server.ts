/**
 * Better Auth request handler — Story 2.1
 *
 * This route catches ALL requests under /auth/** and delegates to Better Auth.
 * Handles (Better Auth basePath is set to /auth in src/lib/server/auth/index.ts):
 *   - /auth/sign-in/oauth2 — PKCE flow initiation
 *   - /auth/oauth2/callback/authentik — OIDC callback (session creation)
 *   - /auth/sign-out — session destruction
 *   - All other Better Auth endpoints
 *
 * Public route: must NOT be guarded (allow-listed in handleAuthGuard in hooks.server.ts).
 */
import { auth } from '$lib/server/auth';

export const GET = auth.handler;
export const POST = auth.handler;
