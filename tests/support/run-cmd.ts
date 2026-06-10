/**
 * Shared shell command helper for spec files.
 *
 * Extracted from scaffold.spec.ts and jobs-email-platform.spec.ts to avoid duplication.
 * Import this instead of defining a local runCmd in each spec file.
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
 * Never throws — the caller asserts on exitCode / stdout.
 */
export function runCmd(cmd: string, cwd = process.cwd()): CmdResult {
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
