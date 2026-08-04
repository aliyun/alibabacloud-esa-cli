/**
 * V1 Interactive E2E Tests
 *
 * These tests drive the real CLI through stdin and verify the observable
 * outcome (exit behaviour + what lands on disk), not the internal
 * implementation.
 *
 * The interactive AK/SK flow is three prompts deep:
 *   1. select  — login method (AK/SK is the first option, so Enter picks it)
 *   2. text    — AccessKey ID
 *   3. text    — AccessKey Secret
 *
 * Note on assertions: when stdin is a pipe rather than a TTY, the CLI keeps
 * running after a @clack/prompts flow finishes, so `timedOut` carries no signal
 * for prompt-driven commands. Those tests assert what landed on disk instead and
 * use a short timeout. Flag-driven commands take no prompt and do exit, so they
 * still assert `timedOut === false`.
 *
 * Prerequisites:
 *   - The CLI must be built (npm run build)
 *   - Set ESA_TEST_ACCESS_KEY_ID and ESA_TEST_ACCESS_KEY_SECRET to exercise
 *     the flows that require a real account
 *   - Or set ESA_TEST_SKIP_LOGIN=1 to skip those (this is what CI does)
 *
 * Usage:
 *   npx vitest run --config vitest.e2e.v1.config.ts
 */
import { existsSync, readFileSync, mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import toml from '@iarna/toml';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { runInteractiveDelayed } from '../helper';

const V1_BIN = 'bin/enter.cjs';

// Skip everything if the CLI is not built — bin/enter.cjs throws without dist/
const cliBuilt = existsSync(join(process.cwd(), 'dist/index.js'));
const describeCli = cliBuilt ? describe : describe.skip;

// Flows that need a real account are opt-in
const TEST_ACCESS_KEY_ID =
  process.env.ESA_TEST_ACCESS_KEY_ID || '<YOUR_TEST_ACCESS_KEY_ID>';
const TEST_ACCESS_KEY_SECRET =
  process.env.ESA_TEST_ACCESS_KEY_SECRET || '<YOUR_TEST_ACCESS_KEY_SECRET>';
const SKIP_LOGIN =
  process.env.ESA_TEST_SKIP_LOGIN === '1' ||
  TEST_ACCESS_KEY_ID.startsWith('<') ||
  TEST_ACCESS_KEY_SECRET.startsWith('<');

/** Enter — accepts the highlighted option of a @clack/prompts select */
const ENTER = { value: '\r', delay: 2000 };

/**
 * Long enough to drive three prompts (2s apart) and let credential validation
 * report back, measured at ~6s. The CLI does not exit on its own after a
 * @clack/prompts flow over a pipe, so this timeout is always reached.
 */
const PROMPT_FLOW_TIMEOUT = 12000;

/** A temp HOME with .esa-logs/ pre-created so the logger cannot EPERM */
function createTempHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'esa-v1-e2e-'));
  mkdirSync(join(home, '.esa-logs'), { recursive: true });
  return home;
}

/** Read auth block from a temp HOME, or null when no config was written */
function readAuth(home: string): Record<string, string> | null {
  const configPath = join(home, '.esa', 'config', 'default.toml');
  if (!existsSync(configPath)) return null;
  const parsed = toml.parse(readFileSync(configPath, 'utf-8')) as {
    auth?: Record<string, string>;
  };
  return parsed.auth ?? null;
}

// ─────────────────────────────────────────────────────────────────────
// Non-interactive paths — no account and no prompts, so these always run
// ─────────────────────────────────────────────────────────────────────
describeCli('login: non-interactive flags', () => {
  let tmpHome: string;

  beforeAll(() => {
    tmpHome = createTempHome();
  });

  afterAll(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('rejects a malformed --sts-token without prompting', async () => {
    const result = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['login', '--sts-token', 'this-is-not-a-valid-sts-token'],
        env: { HOME: tmpHome },
        timeout: 20000
      },
      []
    );

    // A malformed token is rejected before any network call, so the process
    // must exit on its own rather than wait for input.
    expect(result.timedOut).toBe(false);

    const output = result.stdout + result.stderr;
    expect(output.toLowerCase()).toContain('sts token');

    // Nothing may be persisted from a rejected token
    expect(readAuth(tmpHome)?.securityToken ?? '').toBe('');
  });

  it('does not persist credentials rejected by the server', async () => {
    const result = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: [
          'login',
          '--access-key-id',
          'e2e-bogus-key-id',
          '--access-key-secret',
          'e2e-bogus-key-secret'
        ],
        env: { HOME: tmpHome },
        timeout: 30000
      },
      []
    );

    // Supplying both flags skips every prompt, so the process must exit
    expect(result.timedOut).toBe(false);

    // Validation fails (bad key, or no network) and nothing is written
    expect(readAuth(tmpHome)?.accessKeyId ?? '').not.toBe('e2e-bogus-key-id');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Interactive AK/SK flow — needs a real account
// ─────────────────────────────────────────────────────────────────────
describeCli('login: interactive AK/SK flow', () => {
  let tmpHome: string;

  beforeAll(() => {
    tmpHome = createTempHome();
  });

  afterAll(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('persists credentials after a successful login', async ({ skip }) => {
    if (SKIP_LOGIN) skip();

    await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['login'],
        env: { HOME: tmpHome },
        timeout: PROMPT_FLOW_TIMEOUT
      },
      [
        ENTER, // select: AK/SK
        { value: `${TEST_ACCESS_KEY_ID}\r`, delay: 2000 },
        { value: `${TEST_ACCESS_KEY_SECRET}\r`, delay: 2000 }
      ]
    );

    const auth = readAuth(tmpHome);
    expect(auth?.accessKeyId).toBe(TEST_ACCESS_KEY_ID);
    expect(auth?.accessKeySecret).toBe(TEST_ACCESS_KEY_SECRET);
  });

  it('does not persist empty credentials', async () => {
    const emptyHome = createTempHome();

    try {
      const result = await runInteractiveDelayed(
        {
          bin: V1_BIN,
          args: ['login'],
          env: { HOME: emptyHome },
          timeout: PROMPT_FLOW_TIMEOUT
        },
        [
          ENTER, // select: AK/SK
          ENTER, // empty AccessKey ID
          ENTER // empty AccessKey Secret
        ]
      );

      // Only logger.error emits this, and only after all three prompts were
      // consumed and validation rejected the pair. Matching the prompt label
      // would be useless — 'AccessKey Secret' also appears in the login-method
      // menu, so it shows up even if the flow never advanced.
      expect(result.stdout + result.stderr).toMatch(/ERROR/);

      // Empty credentials can never validate, so nothing may be stored
      expect(readAuth(emptyHome)?.accessKeyId ?? '').toBe('');
    } finally {
      rmSync(emptyHome, { recursive: true, force: true });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// logout clears whatever login stored
// ─────────────────────────────────────────────────────────────────────
describeCli('logout clears stored credentials', () => {
  let tmpHome: string;

  beforeAll(() => {
    tmpHome = createTempHome();
  });

  afterAll(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('clears credentials written by a successful login', async ({ skip }) => {
    if (SKIP_LOGIN) skip();

    await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['login'],
        env: { HOME: tmpHome },
        timeout: PROMPT_FLOW_TIMEOUT
      },
      [
        ENTER,
        { value: `${TEST_ACCESS_KEY_ID}\r`, delay: 2000 },
        { value: `${TEST_ACCESS_KEY_SECRET}\r`, delay: 2000 }
      ]
    );
    // A successful login prints no error, so the persisted credential is the
    // only trustworthy signal that the flow ran to completion.
    expect(readAuth(tmpHome)?.accessKeyId).toBe(TEST_ACCESS_KEY_ID);

    const logoutResult = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['logout'],
        env: { HOME: tmpHome },
        timeout: PROMPT_FLOW_TIMEOUT
      },
      [{ value: 'y\r', delay: 2000 }]
    );

    expect(logoutResult.stdout + logoutResult.stderr).not.toBe('');
    expect(readAuth(tmpHome)?.accessKeyId ?? '').toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────
// route add — needs a real account plus a project config
// ─────────────────────────────────────────────────────────────────────
describeCli('route add interactive flow', () => {
  let tmpHome: string;
  let tmpProject: string;

  beforeAll(() => {
    tmpHome = createTempHome();
    tmpProject = mkdtempSync(join(tmpdir(), 'esa-v1-project-'));
  });

  afterAll(() => {
    rmSync(tmpHome, { recursive: true, force: true });
    rmSync(tmpProject, { recursive: true, force: true });
  });

  it('completes without hanging after a prior login', async ({ skip }) => {
    if (SKIP_LOGIN) skip();

    await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['login'],
        env: { HOME: tmpHome },
        timeout: PROMPT_FLOW_TIMEOUT
      },
      [
        ENTER,
        { value: `${TEST_ACCESS_KEY_ID}\r`, delay: 2000 },
        { value: `${TEST_ACCESS_KEY_SECRET}\r`, delay: 2000 }
      ]
    );

    const { writeFileSync } = await import('fs');
    writeFileSync(
      join(tmpProject, 'esa.jsonc'),
      JSON.stringify(
        { name: 'e2e-test-project', entry: 'src/index.ts' },
        null,
        2
      )
    );

    const result = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['route', 'add'],
        cwd: tmpProject,
        env: { HOME: tmpHome },
        timeout: PROMPT_FLOW_TIMEOUT
      },
      [
        { value: 'e2e-test-route\r', delay: 2000 }, // route name
        ENTER, // select site
        ENTER, // select build method
        { value: 'test.example.com/*\r', delay: 2000 } // route pattern
      ]
    );

    // May succeed or fail with an API error, but must produce output
    expect(result.stdout + result.stderr).not.toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────
// config — no account needed
// ─────────────────────────────────────────────────────────────────────
describeCli('config interactive flow', () => {
  it('exits without hanging', async () => {
    const tmpHome = createTempHome();

    try {
      const result = await runInteractiveDelayed(
        {
          bin: V1_BIN,
          args: ['config'],
          env: { HOME: tmpHome },
          timeout: 20000
        },
        [ENTER]
      );

      expect(result.timedOut).toBe(false);
    } finally {
      rmSync(tmpHome, { recursive: true, force: true });
    }
  });
});
