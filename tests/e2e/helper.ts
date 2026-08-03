/**
 * Shared helper for interactive E2E tests.
 *
 * Spawns the CLI as a child process, sends keyboard input via stdin pipe,
 * and collects stdout. Each version (v1/v2) has its own test file that
 * uses this helper with different input sequences.
 */
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { resolve } from 'path';

export interface E2EOptions {
  /** CLI binary path (absolute or relative to cwd) */
  bin: string;
  /** CLI arguments */
  args: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in ms (default 30s) */
  timeout?: number;
}

export interface E2EResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  /** True if the process timed out and was killed */
  timedOut: boolean;
}

/**
 * Run the CLI interactively, sending a sequence of inputs via stdin.
 *
 * @param inputs Array of strings to send to stdin. Each string is sent
 *               as a single write. Use '\n' for Enter, '\x1b[B' for down arrow,
 *               '\r' for Enter (some libraries prefer \r over \n).
 *
 * @example
 * // Send "my-project\n" then press Enter again
 * const result = await runInteractive({
 *   bin: 'v1/bin/enter.cjs',
 *   args: ['login'],
 *   inputs: ['my-access-key-id\n', 'my-access-key-secret\n'],
 * });
 */
export function runInteractive(
  options: E2EOptions,
  inputs: string[] = []
): Promise<E2EResult> {
  const { bin, args, cwd, env, timeout = 30000 } = options;
  const resolvedBin = resolve(process.cwd(), bin);

  return new Promise((resolvePromise) => {
    const child: ChildProcessWithoutNullStreams = spawn(
      'node',
      [resolvedBin, ...args],
      {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let inputIndex = 0;

    child.stdout.on('data', (data) => {
      stdout += data.toString();

      // Auto-send next input when we see a prompt
      // This is a simple heuristic — when output arrives, send the next queued input
      if (inputIndex < inputs.length) {
        const input = inputs[inputIndex];
        child.stdin.write(input);
        inputIndex++;
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Send initial input after a short delay (let the prompt render)
    if (inputs.length > 0) {
      setTimeout(() => {
        if (inputIndex === 0 && inputs.length > 0) {
          child.stdin.write(inputs[0]);
          inputIndex = 1;
        }
      }, 500);
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) {
          child.kill('SIGKILL');
        }
      }, 5000);
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({
        stdout,
        stderr,
        exitCode: code,
        timedOut
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      stderr += `\nProcess error: ${err.message}`;
      resolvePromise({
        stdout,
        stderr,
        exitCode: -1,
        timedOut: false
      });
    });
  });
}

/**
 * Send input with a delay between each input.
 * Useful for interactive prompts that need time to render.
 */
export async function runInteractiveDelayed(
  options: E2EOptions,
  inputs: { value: string; delay?: number }[] = []
): Promise<E2EResult> {
  const { bin, args, cwd, env, timeout = 30000 } = options;
  const resolvedBin = resolve(process.cwd(), bin);

  return new Promise((resolvePromise) => {
    const child: ChildProcessWithoutNullStreams = spawn(
      'node',
      [resolvedBin, ...args],
      {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Send inputs with delays
    let totalDelay = 0;
    for (const input of inputs) {
      totalDelay += input.delay ?? 1000;
      setTimeout(() => {
        child.stdin.write(input.value);
      }, totalDelay);
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) {
          child.kill('SIGKILL');
        }
      }, 5000);
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({
        stdout,
        stderr,
        exitCode: code,
        timedOut
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      stderr += `\nProcess error: ${err.message}`;
      resolvePromise({
        stdout,
        stderr,
        exitCode: -1,
        timedOut: false
      });
    });
  });
}
