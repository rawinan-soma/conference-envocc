/**
 * Re-export from the canonical run-cmd module.
 *
 * This file exists for backward compatibility with imports that use
 * '../support/helpers/cmd-helpers'. New code should import directly from
 * '../support/helpers/run-cmd'.
 */
export { runCmd, type CmdResult } from './run-cmd.js';
