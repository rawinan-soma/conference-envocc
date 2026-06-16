/**
 * Registration confirmation email template — Story 5.3
 *
 * Renders subject + text + html using pre-compiled Paraglide messages.
 * Import: uses $lib alias (safe here — this file is only called from the
 * web process, never imported by worker.ts which requires relative paths).
 *
 * IMPORTANT: All user-supplied strings (firstName, lastName, eventName, cancelLink)
 * must be HTML-escaped before inserting into the html body. Use escapeHtml() helper.
 *
 * Locale: always pass { locale: 'th' } — emails are always Thai regardless
 * of the registrant's UI locale (NFR-006).
 *
 * Message source keys are in messages/en.json (English) + messages/th.json
 * (empty strings — Rawinan fills Thai translations).
 *
 * Cancel link URL shape (Story 5.4 contract):
 *   ${origin}/r/${eventToken}/cancel?token=${cancelTokenPlain}
 *   where cancelTokenPlain is the 64-char hex from createRegistration.
 * Do NOT change this URL shape — Story 5.4 consumes it.
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

export interface RegistrationConfirmationData {
	firstName: string;
	lastName: string;
	eventName: string;
	cancelLink: string; // absolute URL — pre-formatted by calling action
}

export function getRegistrationConfirmationTemplate(data: RegistrationConfirmationData): {
	subject: string;
	text: string;
	html: string;
} {
	const locale = { locale: 'th' } as const;

	const subject = m.reg_email_subject({ eventName: data.eventName }, locale);

	const text = [
		m.reg_email_greeting({ firstName: data.firstName, lastName: data.lastName }, locale),
		'',
		m.reg_email_event_label({}, locale) + ' ' + data.eventName,
		'',
		m.reg_email_cancel_link_label({}, locale),
		data.cancelLink,
		'',
		m.reg_email_footer({}, locale)
	].join('\n');

	const safeEventName = escapeHtml(data.eventName);
	const safeCancelLink = escapeHtml(data.cancelLink);
	const safeGreeting = escapeHtml(
		m.reg_email_greeting({ firstName: data.firstName, lastName: data.lastName }, locale)
	);
	const safeEventLabel = escapeHtml(m.reg_email_event_label({}, locale));
	const safeCancelLinkLabel = escapeHtml(m.reg_email_cancel_link_label({}, locale));
	const safeCancelLinkText = escapeHtml(m.reg_email_cancel_link_text({}, locale));
	const safeFooter = escapeHtml(m.reg_email_footer({}, locale));

	const html = `<p>${safeGreeting}</p>
<p><strong>${safeEventLabel}</strong> ${safeEventName}</p>
<p>${safeCancelLinkLabel} <a href="${safeCancelLink}">${safeCancelLinkText}</a></p>
<p>${safeFooter}</p>`;

	return { subject, text, html };
}
