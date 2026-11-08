import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

export interface CliInput {
  value: string;
  waitFor?: string | RegExp;
  delay?: number;
}

export function cliEnvironment(
  overrides: Record<string, string> = {}
): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      /^(ALIBABA_CLOUD_|ESA_ACCESS_|ESA_SECURITY_|ESA_TEST_)/.test(key) ||
      ['CUSTOM_ENDPOINT', 'NODE_OPTIONS', 'NODE_PATH'].includes(key)
    )
      delete env[key];
  }
  return {
    ...env,
    ESA_NO_UPDATE_CHECK: '1',
    ...overrides,
    ...(overrides.HOME ? { USERPROFILE: overrides.HOME } : {})
  };
}

export function runCliProcess(options: {
  bin: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  inputs?: CliInput[];
  nodeArgs?: string[];
}) {
  return new Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
  }>((done, reject) => {
    const child = spawn(
      process.execPath,
      [...(options.nodeArgs ?? []), resolve(options.bin), ...options.args],
      {
        cwd: options.cwd,
        env: cliEnvironment(options.env),
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: process.platform !== 'win32'
      }
    );
    let stdout = '';
    let stderr = '';
    let output = '';
    let timedOut = false;
    let inputIndex = 0;
    let promptStart = 0;
    let inputPending = false;
    const inputs = options.inputs ?? [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stop = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore'
        }).on('error', () => child.kill());
      } else {
        try {
          process.kill(-child.pid, signal);
        } catch {
          /* Process group has already exited. */
        }
      }
    };
    const advanceInput = () => {
      if (inputPending || timedOut || inputIndex === inputs.length) return;
      const input = inputs[inputIndex];
      const prompt = stripVTControlCharacters(output.slice(promptStart));
      if (typeof input.waitFor === 'string' && !prompt.includes(input.waitFor))
        return;
      if (input.waitFor instanceof RegExp) {
        input.waitFor.lastIndex = 0;
        if (!input.waitFor.test(prompt)) return;
      }
      inputPending = true;
      const send = () => {
        inputPending = false;
        if (timedOut || child.stdin.destroyed) return;
        // Only output produced after this answer may satisfy the next prompt.
        promptStart = output.length;
        inputIndex++;
        // Deliver EOF after the final answer so a pipe-backed prompt can exit.
        if (inputIndex === inputs.length) child.stdin.end(input.value);
        else child.stdin.write(input.value);
        advanceInput();
      };
      const delay = input.delay ?? (input.waitFor === undefined ? 1000 : 0);
      if (delay > 0) timers.push(setTimeout(send, delay));
      else send();
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      output += chunk;
      advanceInput();
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      output += chunk;
      advanceInput();
    });
    child.stdin.on('error', () => {
      /* A premature close is checked below; do not swallow a failed input. */
    });
    advanceInput();
    if (!inputs.length) child.stdin.end();
    timers.push(
      setTimeout(() => {
        timedOut = true;
        stop('SIGTERM');
        timers.push(setTimeout(() => stop('SIGKILL'), 1000));
      }, options.timeout ?? 25000)
    );
    child.once('error', (error) => {
      timers.forEach(clearTimeout);
      reject(error);
    });
    child.once('close', (exitCode) => {
      timers.forEach(clearTimeout);
      if (!timedOut && inputIndex !== inputs.length) {
        reject(
          new Error(
            `CLI exited before input ${inputIndex + 1}/${inputs.length}; expected prompt: ${String(inputs[inputIndex].waitFor ?? '(delayed input)')}`
          )
        );
        return;
      }
      done({ stdout, stderr, exitCode, timedOut });
    });
  });
}
