/**
 * Shared fixture context for Story 1.7 Docker & Deployment skeleton tests.
 *
 * TDD RED PHASE: This file provides minimal type stubs and helpers for the
 * red-phase test scaffolds. Full fixture implementations will be added in
 * Story 1.8 (Test Harness & CI).
 *
 * No `test.extend()` patterns yet — Story 1.7 tests are unit/integration tests
 * that invoke Docker CLI commands and do not require Playwright page fixtures.
 */

import { execSync, spawnSync } from 'child_process';
import path from 'path';

// ---------------------------------------------------------------------------
// Project root (resolved relative to the tests/support/fixtures/ directory)
// ---------------------------------------------------------------------------

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');

// ---------------------------------------------------------------------------
// Required infrastructure files (checked by 1.7-UNIT-PREFLIGHT-001)
// ---------------------------------------------------------------------------

export const REQUIRED_DOCKER_FILES: string[] = [
	'Dockerfile',
	'Dockerfile.worker',
	'.dockerignore',
	'docker-compose.prod.yml',
	'nginx/conf.d/app.conf',
	'compose.yaml',
	'src/lib/server/env.ts'
];

// ---------------------------------------------------------------------------
// Compose / Docker constants
// ---------------------------------------------------------------------------

/** Production compose file (separate from dev compose.yaml) */
export const PROD_COMPOSE_FILE = 'docker-compose.prod.yml';

/** Web Docker image tag used for local build tests */
export const WEB_IMAGE_NAME = 'conference-envocc-web:test';

/** Worker Docker image tag used for local build tests */
export const WORKER_IMAGE_NAME = 'conference-envocc-worker:test';

/** nginx host port (from docker-compose.prod.yml ports "80:80") */
export const NGINX_PORT = 80;

/** Health check path — the SvelteKit app serves at / by default.
 *  Story 1.9 may add a dedicated /health endpoint; use / for now. */
export const NGINX_HEALTH_PATH = '/';

// ---------------------------------------------------------------------------
// Helper: Run a shell command synchronously
// ---------------------------------------------------------------------------

export interface CmdResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

/**
 * Run a shell command synchronously and return { stdout, stderr, exitCode }.
 * Never throws — caller asserts on exitCode.
 */
export function runCmd(cmd: string, cwd: string = PROJECT_ROOT): CmdResult {
	try {
		const stdout = execSync(cmd, {
			cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
			encoding: 'utf-8',
			timeout: 120_000
		});
		return { stdout: stdout.toString(), stderr: '', exitCode: 0 };
	} catch (err: unknown) {
		const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
		return {
			stdout: e.stdout?.toString() ?? '',
			stderr: e.stderr?.toString() ?? '',
			exitCode: e.status ?? 1
		};
	}
}

// ---------------------------------------------------------------------------
// Helper: Wait for a URL to return a specific status code
// ---------------------------------------------------------------------------

export interface WaitForUrlOptions {
	timeoutMs: number;
	intervalMs: number;
	expectedStatus?: number;
}

export interface WaitForUrlResult {
	statusCode: number;
	timedOut: boolean;
}

/**
 * Poll a URL until it returns the expected HTTP status code or timeout expires.
 * Uses curl to avoid adding fetch/axios dependencies to test infrastructure.
 */
export async function waitForUrl(
	url: string,
	options: WaitForUrlOptions
): Promise<WaitForUrlResult> {
	const { timeoutMs, intervalMs, expectedStatus = 200 } = options;
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		const result = spawnSync(
			'curl',
			['-si', '--max-time', '5', '--output', '/dev/null', '--write-out', '%{http_code}', url],
			{ encoding: 'utf-8', timeout: 10_000 }
		);

		const statusCode = parseInt(result.stdout?.trim() ?? '0', 10);
		if (statusCode === expectedStatus) {
			return { statusCode, timedOut: false };
		}

		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	return { statusCode: 0, timedOut: true };
}
