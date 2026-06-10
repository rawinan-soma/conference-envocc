/**
 * Shared shell command helper for unit/structural tests.
 *
 * Extracted from design-system.spec.ts and scaffold.spec.ts to eliminate
 * duplication (test-review finding: P3 maintainability).
 */

import { execSync } from 'child_process';

/**
 * Run a shell command synchronously and return stdout, stderr, and exitCode.
 * Never throws — callers assert on exitCode or stdout content.
 *
 * @param cmd - Shell command to execute
 * @param cwd - Working directory (defaults to process.cwd())
 */
export function runCmd(
	cmd: string,
	cwd = process.cwd()
): { stdout: string; stderr: string; exitCode: number } {
	try {
		const stdout = execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' });
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
