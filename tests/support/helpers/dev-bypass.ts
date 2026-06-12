/**
 * Dev Bypass Test Helper — Story 2.2: Local Dev Auth Bypass
 *
 * Reusable helper that calls POST /auth/dev-bypass and returns the session
 * cookie string. Used by integration tests and future story tests that need
 * an authenticated session without a live Authentik instance.
 *
 * Prerequisites:
 *   - AUTH_DEV_BYPASS=true must be set in the server environment
 *   - NODE_ENV must NOT be 'production'
 *   - The dev bypass route must be registered at /auth/dev-bypass
 *
 * Usage:
 *   const cookie = await getDevBypassCookie(devServerUrl);
 *   const res = await fetch(`${devServerUrl}/dashboard`, {
 *     headers: { Cookie: cookie },
 *     redirect: 'manual',
 *   });
 *
 * Note: No Thai text hardcoded — per project rule: Rawinan handles all Thai translations.
 */

/**
 * Call POST /auth/dev-bypass and return the raw Set-Cookie header value.
 *
 * @param devServerUrl - Base URL of the SvelteKit dev server (e.g. 'http://localhost:3000')
 * @returns The raw Set-Cookie header string (e.g. 'better-auth.session_token=...; Path=/; ...')
 * @throws If the bypass returns a non-OK status or no Set-Cookie header is present
 */
export async function getDevBypassCookie(devServerUrl: string): Promise<string> {
	const response = await fetch(`${devServerUrl}/auth/dev-bypass`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		redirect: 'manual'
	});

	if (!response.ok) {
		throw new Error(
			`Dev bypass failed: HTTP ${response.status} — ${await response.text().catch(() => '(no body)')}`
		);
	}

	const setCookie = response.headers.get('set-cookie');
	if (!setCookie) {
		throw new Error(
			'Dev bypass: no Set-Cookie header in response — bypass route may not be setting the session cookie'
		);
	}

	return setCookie;
}

/**
 * Extract just the cookie name=value pair from a raw Set-Cookie header string.
 *
 * Raw Set-Cookie: 'better-auth.session_token=abc123; Path=/; HttpOnly; SameSite=Lax'
 * Returns:        'better-auth.session_token=abc123'
 *
 * Useful when you need to pass a clean Cookie header without directives.
 *
 * @param rawSetCookie - The raw Set-Cookie header value
 * @returns The name=value portion only
 */
export function extractCookiePair(rawSetCookie: string): string {
	return rawSetCookie.split(';')[0]?.trim() ?? rawSetCookie;
}
