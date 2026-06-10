// nodemailer transporter — Mailpit dev / org SMTP prod
// IMPORTANT: Use relative import — $lib alias not available in worker process
import nodemailer from 'nodemailer';
import { env } from '../env.js';

const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_SECURE === 'true',
	auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined
});

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
	return transporter.sendMail({
		from: `"${env.SMTP_DISPLAY_NAME}" <${env.SMTP_FROM}>`, // FR-083: sender display name = org name
		...opts
	});
}
