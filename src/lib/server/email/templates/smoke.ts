// Smoke test email template — dev-only, hardcoded (no Thai strings needed)

/** Escape special HTML characters so user-supplied strings cannot inject markup. */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function getSmokeEmailTemplate(requestedAt: string): {
	subject: string;
	text: string;
	html: string;
} {
	return {
		subject: '[Smoke Test] Jobs & Email Platform — Conference EnvOcc',
		text: `This is a smoke test email from the Conference EnvOcc worker process.\n\nRequested at: ${requestedAt}\n\nIf you received this, the pg-boss worker and Mailpit SMTP transport are working correctly.`,
		html: `<p>This is a smoke test email from the <strong>Conference EnvOcc</strong> worker process.</p>
<p>Requested at: <code>${escapeHtml(requestedAt)}</code></p>
<p>If you received this, the pg-boss worker and Mailpit SMTP transport are working correctly.</p>`
	};
}
