/**
 * Booking confirmation email template — Story 4.6
 *
 * Renders subject + text + html using pre-compiled Paraglide messages.
 * Import: uses $lib alias (safe here — this file is only called from the
 * web process, never imported by worker.ts which requires relative paths).
 *
 * IMPORTANT: All user-supplied strings (eventName) must be HTML-escaped.
 * Use escapeHtml() (same helper as smoke.ts) before inserting into html body.
 *
 * Locale: always pass { locale: 'th' } — emails are always Thai regardless
 * of the organizer's UI locale (NFR-006).
 *
 * Message source keys are in messages/en.json (English) + messages/th.json
 * (empty strings — Rawinan fills Thai translations).
 */
import * as m from '$lib/paraglide/messages.js';

/** Escape special HTML characters to prevent markup injection. */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export interface BookingConfirmationData {
	eventName: string;
	roomName: string;
	startAt: string; // pre-formatted Asia/Bangkok display string
	endAt: string; // pre-formatted Asia/Bangkok display string
	organizerName: string;
}

export function getBookingConfirmationTemplate(data: BookingConfirmationData): {
	subject: string;
	text: string;
	html: string;
} {
	const locale = { locale: 'th' } as const;

	const subject = m.booking_confirmation_email_subject({ eventName: data.eventName }, locale);

	const text = [
		m.booking_confirmation_email_greeting({ name: data.organizerName }, locale),
		'',
		m.booking_confirmation_email_event_label({}, locale) + ' ' + data.eventName,
		m.booking_confirmation_email_room_label({}, locale) + ' ' + data.roomName,
		m.booking_confirmation_email_time_label({}, locale) + ' ' + data.startAt + ' – ' + data.endAt,
		'',
		m.booking_confirmation_email_footer({}, locale)
	].join('\n');

	const safeEventName = escapeHtml(data.eventName);
	const safeRoomName = escapeHtml(data.roomName);
	const safeStartAt = escapeHtml(data.startAt);
	const safeEndAt = escapeHtml(data.endAt);

	const html = `<p>${escapeHtml(m.booking_confirmation_email_greeting({ name: data.organizerName }, locale))}</p>
<ul>
  <li><strong>${escapeHtml(m.booking_confirmation_email_event_label({}, locale))}</strong> ${safeEventName}</li>
  <li><strong>${escapeHtml(m.booking_confirmation_email_room_label({}, locale))}</strong> ${safeRoomName}</li>
  <li><strong>${escapeHtml(m.booking_confirmation_email_time_label({}, locale))}</strong> ${safeStartAt} – ${safeEndAt}</li>
</ul>
<p>${escapeHtml(m.booking_confirmation_email_footer({}, locale))}</p>`;

	return { subject, text, html };
}
