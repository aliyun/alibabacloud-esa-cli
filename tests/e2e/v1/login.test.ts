import {
  existsSync,
  realpathSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import toml from '@iarna/toml';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  fixtureKey,
  fixtureSecret,
  startCloudFixture
} from '../../fixtures/cloud';
import { runInteractiveDelayed, stripAnsi } from '../helper';

const bin = 'bin/enter.cjs';
if (!existsSync('dist/index.js'))
  throw new Error('Build the CLI before running E2E tests');
let cloud: Awaited<ReturnType<typeof startCloudFixture>>;
beforeAll(async () => {
  cloud = await startCloudFixture();
});
afterAll(async () => {
  await cloud?.close();
});

function testHome() {
  const home = mkdtempSync(join(tmpdir(), 'esa-offline-e2e-'));
  mkdirSync(join(home, '.esa-logs'), { recursive: true });
  return home;
}
function auth(home: string): Record<string, string> {
  const file = join(home, '.esa', 'config', 'default.toml');
  return existsSync(file)
    ? ((toml.parse(readFileSync(file, 'utf8')).auth ?? {}) as Record<
        string,
        string
      >)
    : {};
}
function env(home: string) {
  return { HOME: home, ESA_TEST_FIXTURE_PORT: cloud.port };
}

describe('offline CLI login and configuration', () => {
  it('rejects malformed STS without making an API request', async () => {
    const home = testHome();
    const before = cloud.calls.length;
    try {
      const result = await runInteractiveDelayed({
        bin,
        args: ['login', '--sts-token', 'invalid'],
        env: env(home)
      });
      expect(result.timedOut).toBe(false);
      expect(stripAnsi(result.stdout + result.stderr).toLowerCase()).toContain(
        'sts token'
      );
      expect(auth(home).securityToken ?? '').toBe('');
      expect(cloud.calls.length).toBe(before);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('does not persist credentials explicitly rejected by the API', async () => {
    const home = testHome();
    const before = cloud.calls.length;
    try {
      const result = await runInteractiveDelayed({
        bin,
        args: ['login', '--ak', 'invalid-key', '--sk', 'invalid-secret'],
        env: env(home)
      });
      expect(result.timedOut).toBe(false);
      expect(stripAnsi(result.stdout + result.stderr)).toContain(
        'Fixture rejected credentials'
      );
      expect(auth(home).accessKeyId ?? '').toBe('');
      expect(cloud.calls.slice(before)).toContain('GetErService');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('persists successful flag login and clears it on logout', async () => {
    const home = testHome();
    try {
      const login = await runInteractiveDelayed({
        bin,
        args: ['login', '--ak', fixtureKey, '--sk', fixtureSecret],
        env: env(home)
      });
      expect(login.timedOut).toBe(false);
      expect(login.exitCode).toBe(0);
      expect(auth(home)).toMatchObject({
        accessKeyId: fixtureKey,
        accessKeySecret: fixtureSecret
      });
      const logout = await runInteractiveDelayed({
        bin,
        args: ['logout'],
        env: env(home)
      });
      expect(logout.timedOut).toBe(false);
      expect(logout.exitCode).toBe(0);
      expect(stripAnsi(logout.stdout + logout.stderr)).toContain(
        'Logout successfully'
      );
      expect(auth(home).accessKeyId ?? '').toBe('');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('persists the credentials submitted through all interactive prompts', async () => {
    const home = testHome();
    try {
      const result = await runInteractiveDelayed(
        { bin, args: ['login'], env: env(home), timeout: 9000 },
        [
          { value: '\r', delay: 1500 },
          { value: `${fixtureKey}\r`, delay: 1500 },
          { value: `${fixtureSecret}\r`, delay: 1500 }
        ]
      );
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.stdout + result.stderr)).toContain(
        'Login success'
      );
      expect(auth(home)).toMatchObject({
        accessKeyId: fixtureKey,
        accessKeySecret: fixtureSecret
      });
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('does not persist empty interactive credentials', async () => {
    const home = testHome();
    const before = cloud.calls.length;
    try {
      const result = await runInteractiveDelayed(
        { bin, args: ['login'], env: env(home), timeout: 9000 },
        [
          { value: '\r', delay: 1500 },
          { value: '\r', delay: 1500 },
          { value: '\r', delay: 1500 }
        ]
      );
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(stripAnsi(result.stdout + result.stderr)).toMatch(
        /◇\s+AccessKey Secret/
      );
      expect(stripAnsi(result.stdout + result.stderr)).not.toContain(
        'Login success'
      );
      expect(auth(home).accessKeyId ?? '').toBe('');
      expect(cloud.calls.length).toBe(before);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('cancels login without saving credentials or calling the API', async () => {
    const home = testHome();
    const before = cloud.calls.length;
    try {
      const result = await runInteractiveDelayed(
        { bin, args: ['login'], env: env(home) },
        [{ value: '\u0003', delay: 1500 }]
      );
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.stdout + result.stderr)).toMatch(
        /■\s+Choose login method/
      );
      expect(stripAnsi(result.stdout + result.stderr)).not.toContain(
        'Login success'
      );
      expect(auth(home).accessKeyId ?? '').toBe('');
      expect(cloud.calls.length).toBe(before);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('opens the actual local config file through the configured editor', async () => {
    const home = testHome();
    try {
      const config = join(home, 'esa.jsonc');
      const marker = join(home, 'editor-argument.txt');
      writeFileSync(
        config,
        JSON.stringify({ name: 'fixture-project', entry: 'index.js' })
      );
      const editor = join(home, 'editor.cjs');
      writeFileSync(
        editor,
        `#!/usr/bin/env node\nrequire('fs').writeFileSync(${JSON.stringify(marker)}, process.argv[2]);\n`,
        { mode: 0o755 }
      );
      const result = await runInteractiveDelayed({
        bin,
        args: ['config', '--local'],
        cwd: home,
        env: { ...env(home), EDITOR: editor }
      });
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(realpathSync(readFileSync(marker, 'utf8'))).toBe(
        realpathSync(config)
      );
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
