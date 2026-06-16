// Queue name constants + Valibot payload schemas
// Queue names are kebab-case, verb-led (per architecture.md §Communication Patterns)
import * as v from 'valibot';

export const QUEUE = {
	SMOKE_EMAIL: 'smoke-email',
	SEND_EMAIL: 'send-email',
	CLOSE_REGISTRATION: 'close-registration'
} as const;

export const SmokeEmailPayload = v.object({
	to: v.pipe(v.string(), v.email()),
	requestedAt: v.string() // ISO-8601
});

export const SendEmailPayload = v.object({
	to: v.pipe(v.string(), v.email()),
	subject: v.pipe(v.string(), v.minLength(1)),
	textBody: v.pipe(v.string(), v.minLength(1)),
	htmlBody: v.optional(v.string())
});

export const CloseRegistrationPayload = v.object({
	bookingId: v.pipe(v.string(), v.minLength(1))
});

export type SmokeEmailPayload = v.InferOutput<typeof SmokeEmailPayload>;
export type SendEmailPayload = v.InferOutput<typeof SendEmailPayload>;
export type CloseRegistrationPayload = v.InferOutput<typeof CloseRegistrationPayload>;
