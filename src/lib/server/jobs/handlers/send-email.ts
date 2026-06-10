// Handler for send-email queue
// Validates payload with Valibot before calling mailer
// IMPORTANT: No $app/* or $env/dynamic imports — use relative paths
import * as v from 'valibot';
import { sendMail } from '../../email/mailer.js';
import { SendEmailPayload } from '../queues.js';

// Minimal job shape — compatible with pg-boss Job<T> and unit test stubs
interface JobLike {
	id: string;
	name: string;
	data: unknown;
}

// pg-boss v12 WorkHandler receives an array of jobs; accepts single job for testability
export async function sendEmailHandler(jobOrJobs: JobLike | JobLike[]): Promise<void> {
	const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];
	for (const job of jobs) {
		const result = v.safeParse(SendEmailPayload, job.data);
		if (!result.success) {
			throw new Error(`Invalid send-email payload: ${JSON.stringify(v.flatten(result.issues))}`);
		}

		const { to, subject, textBody, htmlBody } = result.output;

		await sendMail({ to, subject, text: textBody, html: htmlBody });
	}
}
