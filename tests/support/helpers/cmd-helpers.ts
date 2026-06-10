/**
 * Shared shell command helpers for unit and infrastructure tests.
 *
 * Extracted from scaffold.spec.ts and i18n-setup.spec.ts to avoid duplication.
 * Any improvement here applies to all test files that import from this module.
 */

import { execSync } from 'child_process';

/**
 * Run a shell command synchronously and return { stdout, stderr, exitCode }.
 * Never throws — caller asserts on exitCode / stdout.
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
