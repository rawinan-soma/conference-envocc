// IMPORTANT: Use process.env directly — do NOT use SvelteKit's dynamic env modules.
// This file is imported by src/worker.ts (outside SvelteKit runtime)
import * as v from 'valibot';

const EnvSchema = v.object({
	DATABASE_URL: v.pipe(v.string(), v.minLength(1)),
	SMTP_HOST: v.pipe(v.string(), v.minLength(1)),
	SMTP_PORT: v.pipe(v.string(), v.transform(Number), v.number()),
	SMTP_FROM: v.pipe(v.string(), v.email()),
	SMTP_DISPLAY_NAME: v.pipe(v.string(), v.minLength(1)), // FR-083: sender = org name
	SMTP_USER: v.optional(v.string()),
	SMTP_PASS: v.optional(v.string()),
	SMTP_SECURE: v.optional(v.string(), 'false')
});

const result = v.safeParse(EnvSchema, process.env);
if (!result.success) {
	console.error('Missing or invalid environment variables:', v.flatten(result.issues));
	process.exit(1);
}

export const env = result.output;
