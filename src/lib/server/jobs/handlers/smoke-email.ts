// Handler for smoke-email queue
// Sends a hardcoded smoke test email via mailer — dev-only verification
// IMPORTANT: No $app/* or $env/dynamic imports — use relative paths
import * as v from 'valibot';
import { sendMail } from '../../email/mailer.js';
import { getSmokeEmailTemplate } from '../../email/templates/smoke.js';
import { SmokeEmailPayload } from '../queues.js';

// Minimal job shape — compatible with pg-boss Job<T> and unit test stubs
interface JobLike {
	id: string;
	name: string;
	data: unknown;
}

// pg-boss v12 WorkHandler receives an array of jobs; accepts single job for testability
export async function smokeEmailHandler(jobOrJobs: JobLike | JobLike[]): Promise<void> {
	const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];
	for (const job of jobs) {
		const result = v.safeParse(SmokeEmailPayload, job.data);
		if (!result.success) {
			throw new Error(`Invalid smoke-email payload: ${JSON.stringify(v.flatten(result.issues))}`);
		}

		const { to, requestedAt } = result.output;
		const { subject, text, html } = getSmokeEmailTemplate(requestedAt);

		await sendMail({ to, subject, text, html });
	}
}
