import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

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
  inputs?: { value: string; delay?: number }[];
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
    let timedOut = false;
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
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.stdin.on('error', () => {
      /* The CLI can exit before delayed input. */
    });
    let delay = 0;
    const inputs = options.inputs ?? [];
    for (const [index, input] of inputs.entries()) {
      delay += input.delay ?? 1000;
      timers.push(
        setTimeout(() => {
          if (!child.stdin.destroyed) {
            // Deliver EOF after the final answer so a pipe-backed prompt can exit.
            if (index === inputs.length - 1) child.stdin.end(input.value);
            else child.stdin.write(input.value);
          }
        }, delay)
      );
    }
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
      done({ stdout, stderr, exitCode, timedOut });
    });
  });
}
