// IMPORTANT: Use process.env directly — do NOT use SvelteKit's dynamic env modules.
// This file is imported by src/worker.ts (outside SvelteKit runtime)
import * as v from 'valibot';

const EnvSchema = v.object({
	DATABASE_URL: v.pipe(v.string(), v.minLength(1)),

	// Auth — Better Auth + Authentik OIDC (Story 2.1)
	// Required at runtime; optional at build time (CI uses GH Secrets).
	// NEVER hardcode values here — see project memory: zero credential literals.
	AUTH_SECRET: v.optional(v.pipe(v.string(), v.minLength(32))),
	AUTHENTIK_CLIENT_ID: v.optional(v.pipe(v.string(), v.minLength(1))),
	AUTHENTIK_CLIENT_SECRET: v.optional(v.pipe(v.string(), v.minLength(1))),
	AUTHENTIK_ISSUER: v.optional(v.pipe(v.string(), v.minLength(1))),

	SMTP_HOST: v.optional(v.pipe(v.string(), v.minLength(1))),
	SMTP_PORT: v.optional(
		v.pipe(
			v.string(),
			v.regex(/^\d+$/, 'SMTP_PORT must be a positive integer'),
			v.transform(Number),
			v.integer(),
			v.minValue(1),
			v.maxValue(65535)
		)
	),
	SMTP_FROM: v.optional(v.pipe(v.string(), v.email())),
	SMTP_DISPLAY_NAME: v.optional(v.pipe(v.string(), v.minLength(1))), // FR-083: sender = org name
	SMTP_USER: v.optional(v.string()),
	SMTP_PASS: v.optional(v.string()),
	SMTP_SECURE: v.optional(v.string(), 'false'),
	HOST: v.optional(v.string(), '0.0.0.0'),
	PORT: v.optional(v.string(), '3000')
});

export function validateEnv(record: Record<string, string | undefined>): void {
	const result = v.safeParse(EnvSchema, record);
	if (!result.success) {
		const issues = v.flatten(result.issues);
		// List the specific missing/invalid field names in the message for clarity
		const fields = Object.keys(issues.nested ?? {}).join(', ');
		const summary = fields || JSON.stringify(issues.root ?? issues);
		console.error(`[startup] Missing or invalid environment variables: ${summary}`);
		process.exit(1);
	}
}

// Auto-validate on import (for worker.ts path — reads process.env)
validateEnv(process.env as Record<string, string | undefined>);

export const env = v.parse(EnvSchema, process.env);
