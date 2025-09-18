import { spawn } from 'child_process';

import { cancel, spinner } from '@clack/prompts';
import chalk from 'chalk';

export interface ExecCommandOptions {
  startText?: string;
  doneText?: string | ((output: string) => string);
  silent?: boolean; // Do not display subprocess output
  captureOutput?: boolean; // Capture output and return
  useSpinner?: boolean; // Whether to show progress bar
  realtimeOutput?: boolean; // Whether to display output in real-time
  interactive?: boolean; // Interactive: inherit parent process stdio, allow direct input/output in terminal
  env?: NodeJS.ProcessEnv; // Environment variables
  cwd?: string; // Working directory
  transformOutput?: (output: string) => string; // Output transformation
  fallbackOutput?: (error: unknown) => string; // Fallback output on error
  errorMessage?: string; // Prompt message when cancelled
}

/**
 * Execute a shell command with rich options (spinner, capture, env, cwd).
 */
export const execCommand = async (
  command: string[],
  options: ExecCommandOptions = {}
): Promise<{ success: boolean; stdout: string; stderr: string }> => {
  const {
    startText,
    doneText,
    silent = false,
    captureOutput = false,
    useSpinner = true,
    realtimeOutput = false,
    interactive = false,
    env,
    cwd,
    transformOutput,
    fallbackOutput,
    errorMessage
  } = options;

  // Determine stdio mode based on options
  // If realtimeOutput is true, we need to pipe to capture and display output in real-time
  // If spinner is used without realtimeOutput, pipe to avoid TTY contention
  // If silent is true, pipe to suppress output
  // If captureOutput is true, pipe to capture output
  // If interactive is true, always inherit stdio so prompts can be shown and accept input
  const shouldPipe =
    !interactive && (realtimeOutput || useSpinner || silent || captureOutput);
  const stdio: 'inherit' | 'pipe' = interactive
    ? 'inherit'
    : shouldPipe
      ? 'pipe'
      : 'inherit';

  // start
  const startMsg = startText || `Running: ${command.join(' ')}`;
  const s = spinner();

  // When realtimeOutput is enabled, don't use spinner as it conflicts with real-time output
  if (useSpinner && !realtimeOutput && !interactive) {
    s.start(startMsg);
  } else if (!silent) {
    if (interactive) {
      console.log(chalk.gray('│'));
      console.log(chalk.gray('├  ') + startMsg);
    } else {
      console.log(startMsg);
    }
  }

  try {
    let stdout = '';
    let stderr = '';

    // Use spawn for string[] commands to avoid shell quoting issues
    const program = command[0];
    const args = command.slice(1);

    await new Promise<void>((resolve, reject) => {
      const child = spawn(program, args, {
        stdio,
        cwd,
        env: { ...process.env, ...env },
        shell: false
      });

      if (stdio === 'pipe') {
        child.stdout?.on('data', (chunk) => {
          const chunkStr = String(chunk);
          stdout += chunkStr;

          // Real-time output: display immediately if enabled and not silent
          if (realtimeOutput && !silent) {
            process.stdout.write(chunkStr);
          }
        });
        child.stderr?.on('data', (chunk) => {
          const chunkStr = String(chunk);
          stderr += chunkStr;

          // Real-time output: display immediately if enabled and not silent
          if (realtimeOutput && !silent) {
            process.stderr.write(chunkStr);
          }
        });
      }

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code && code !== 0) {
          reject({ stdout, stderr, message: `Exit code ${code}` });
        } else {
          resolve();
        }
      });
    });

    // Preserve original output for optional mirroring
    const bufferedStdout = stdout;
    const bufferedStderr = stderr;

    if (transformOutput) {
      stdout = transformOutput(stdout);
    }

    const endMsg =
      typeof doneText === 'function' ? doneText(stdout) : doneText || 'Done';

    if (useSpinner && !realtimeOutput && !interactive) {
      s.stop(endMsg);
    } else if (!silent) {
      if (interactive) {
        console.log(chalk.gray('├  ') + endMsg);
      } else {
        console.log(endMsg);
      }
    }

    // If spinner was used and user expects output (silent=false, captureOutput=false),
    // and realtimeOutput is not enabled, print the buffered child output now to avoid interfering with spinner rendering.
    if (
      useSpinner &&
      !silent &&
      !captureOutput &&
      !realtimeOutput &&
      !interactive
    ) {
      if (bufferedStdout) process.stdout.write(bufferedStdout);
      if (bufferedStderr) process.stderr.write(bufferedStderr);
    }

    return { success: true, stdout, stderr };
  } catch (err: unknown) {
    const e = err as { stdout?: unknown; stderr?: unknown; message?: string };
    const stdout: string = e?.stdout ? String(e.stdout) : '';
    const stderr: string = e?.stderr ? String(e.stderr) : e?.message || '';
    const msg =
      (fallbackOutput && fallbackOutput(err)) ||
      (stderr ? `Command failed: ${stdout}` : 'Command failed');

    if (useSpinner && !realtimeOutput && !interactive) s.stop(msg);
    else if (!silent) console.error(msg);

    // Mirror buffered outputs on failure when spinner is used and not silent and realtimeOutput is not enabled
    if (
      useSpinner &&
      !silent &&
      !captureOutput &&
      !realtimeOutput &&
      !interactive
    ) {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
    }
    if (errorMessage) {
      cancel(errorMessage);
    }
    return { success: false, stdout, stderr };
  }
};

export default execCommand;
