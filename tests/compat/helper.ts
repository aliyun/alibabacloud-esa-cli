/**
 * Shared helper for CLI contract tests.
 *
 * Runs the CLI as a child process and returns stdout/stderr/exitCode.
 * The CLI binary path defaults to bin/enter.cjs, or can be overridden
 * via the ESA_CLI_BIN env var.
 */
import { spawn } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { resolve, join } from 'path';

/** Path to the CLI binary being tested */
export const CLI_BIN = process.env.ESA_CLI_BIN
  ? resolve(process.cwd(), process.env.ESA_CLI_BIN)
  : resolve(process.cwd(), 'bin/enter.cjs');

/**
 * The CLI shell (bin/enter.cjs) throws when dist/index.js is absent, which
 * would surface as ~150 unrelated assertion failures. Callers use this to skip
 * the suite with a clear reason instead.
 */
export const isCliBuilt = existsSync(resolve(process.cwd(), 'dist/index.js'));

export const NOT_BUILT_REASON =
  'CLI is not built — run `npm run build` before the contract tests.';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Ensure a writable HOME directory exists with .esa-logs/ pre-created.
 * The CLI logger (winston-daily-rotate-file) writes to ~/.esa-logs/ at
 * module load time. If the directory is missing or not writable, the
 * process crashes with EPERM.
 *
 * `USERPROFILE` is set alongside `HOME` because Node's os.homedir() reads
 * USERPROFILE on Windows, so setting HOME alone would not isolate the run.
 *
 * If `env.HOME` is already set, use that (caller manages it).
 * Otherwise, create a temp HOME for the duration of this call.
 */
function ensureSafeHome(env?: Record<string, string>): {
  env: Record<string, string>;
  cleanup?: () => void;
} {
  if (env?.HOME) {
    return { env: { USERPROFILE: env.HOME, ...env } };
  }

  const tmpHome = mkdtempSync(join(tmpdir(), 'esa-test-home-'));
  mkdirSync(join(tmpHome, '.esa-logs'), { recursive: true });
  return {
    env: { ...env, HOME: tmpHome, USERPROFILE: tmpHome },
    cleanup: () => rmSync(tmpHome, { recursive: true, force: true })
  };
}

/**
 * Run the CLI with given arguments and return the result.
 *
 * @example
 * const result = await runCli(['--version']);
 * expect(result.exitCode).toBe(0);
 * expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
 */
export async function runCli(
  args: string[] = [],
  options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<CliResult> {
  const { env: safeEnv, cleanup } = ensureSafeHome(options.env);

  return new Promise((resolvePromise, reject) => {
    const child = spawn('node', [CLI_BIN, ...args], {
      cwd: options.cwd,
      env: { ...process.env, ...safeEnv },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      cleanup?.();
      reject(err);
    });

    child.on('close', (code) => {
      cleanup?.();
      resolvePromise({ stdout, stderr, exitCode: code });
    });
  });
}
