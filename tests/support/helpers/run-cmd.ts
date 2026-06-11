/**
 * Shared shell command helper for unit/structural tests.
 *
 * Single canonical location — import from here everywhere.
 * Previously duplicated in tests/support/run-cmd.ts (legacy, deleted),
 * tests/support/helpers/cmd-helpers.ts (re-exports this), and
 * tests/support/fixtures/docker-context.ts (inline copy removed).
 */

import { execSync } from 'child_process';

export interface CmdResult {
	/** Captured stdout from the process */
	stdout: string;
	/** Captured stderr from the process */
	stderr: string;
	/** Process exit code (0 = success) */
	exitCode: number;
}

/**
 * Run a shell command synchronously and return { stdout, stderr, exitCode }.
 * Never throws — callers assert on exitCode or stdout content.
 *
 * @param cmd  - Shell command to execute
 * @param cwd  - Working directory (defaults to process.cwd())
 * @param timeout - Timeout in milliseconds (defaults to 120_000)
 */
export function runCmd(cmd: string, cwd = process.cwd(), timeout = 120_000): CmdResult {
	try {
		const stdout = execSync(cmd, {
			cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
			encoding: 'utf-8',
			timeout
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
