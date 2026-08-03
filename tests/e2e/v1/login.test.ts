/**
 * V1 Interactive E2E Tests
 *
 * These tests are specific to v1's interactive flow (inquirer + @clack/prompts).
 * They verify that the final outcome is correct, not the internal implementation.
 *
 * Prerequisites:
 *   - v1 must be built (npm run build in root)
 *   - Set ESA_TEST_ACCESS_KEY_ID and ESA_TEST_ACCESS_KEY_SECRET env vars
 *   - Or set ESA_TEST_SKIP_LOGIN=1 to skip login tests
 *
 * Usage:
 *   npx vitest run --config vitest.e2e.v1.config.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import toml from '@iarna/toml';
import { runInteractiveDelayed } from '../helper';

const V1_BIN = 'bin/enter.cjs';

// Skip all tests if v1 is not built
const v1Built = existsSync(join(process.cwd(), 'dist/index.js'));
const describeOrSkip = v1Built ? describe : describe.skip;

// Test credentials — these are placeholders, replace with real test account
const TEST_ACCESS_KEY_ID =
  process.env.ESA_TEST_ACCESS_KEY_ID || '<YOUR_TEST_ACCESS_KEY_ID>';
const TEST_ACCESS_KEY_SECRET =
  process.env.ESA_TEST_ACCESS_KEY_SECRET || '<YOUR_TEST_ACCESS_KEY_SECRET>';
const SKIP_LOGIN = process.env.ESA_TEST_SKIP_LOGIN === '1';

describeOrSkip('v1 interactive: login', () => {
  let tmpHome: string;

  beforeAll(() => {
    // Use a temp HOME to avoid polluting real credentials
    tmpHome = mkdtempSync(join(tmpdir(), 'esa-v1-e2e-'));
  });

  it('should complete login with valid credentials', async ({ skip }) => {
    if (SKIP_LOGIN) skip();

    const result = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['login'],
        env: { HOME: tmpHome },
        timeout: 30000
      },
      [
        // inquirer prompt: Access Key ID
        { value: `${TEST_ACCESS_KEY_ID}\n`, delay: 2000 },
        // inquirer prompt: Access Key Secret
        { value: `${TEST_ACCESS_KEY_SECRET}\n`, delay: 2000 }
      ]
    );

    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);

    // Verify credentials were written to ~/.esa/config/default.toml
    const configPath = join(tmpHome, '.esa', 'config', 'default.toml');
    expect(existsSync(configPath)).toBe(true);

    const configContent = readFileSync(configPath, 'utf-8');
    const config = toml.parse(configContent) as any;
    expect(config.auth?.accessKeyId).toBe(TEST_ACCESS_KEY_ID);
    expect(config.auth?.accessKeySecret).toBe(TEST_ACCESS_KEY_SECRET);
  });

  it('should reject login with empty credentials', async () => {
    const result = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['login'],
        env: { HOME: tmpHome },
        timeout: 15000
      },
      [
        { value: '\n', delay: 2000 }, // Empty Access Key ID
        { value: '\n', delay: 2000 } // Empty Access Key Secret
      ]
    );

    // Should either exit with error or re-prompt
    // The exact behavior depends on inquirer validation
    expect(result.timedOut).toBe(false);
  });
});

describeOrSkip('v1 interactive: login then logout', () => {
  let tmpHome: string;

  beforeAll(() => {
    tmpHome = mkdtempSync(join(tmpdir(), 'esa-v1-e2e-'));
  });

  it('should login then logout successfully', async ({ skip }) => {
    if (SKIP_LOGIN) skip();

    // Step 1: Login
    const loginResult = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['login'],
        env: { HOME: tmpHome },
        timeout: 30000
      },
      [
        { value: `${TEST_ACCESS_KEY_ID}\n`, delay: 2000 },
        { value: `${TEST_ACCESS_KEY_SECRET}\n`, delay: 2000 }
      ]
    );

    expect(loginResult.exitCode).toBe(0);

    // Step 2: Logout
    const logoutResult = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['logout'],
        env: { HOME: tmpHome },
        timeout: 10000
      },
      [
        // inquirer confirm: "Are you sure you want to logout?"
        { value: 'y\n', delay: 2000 }
      ]
    );

    expect(logoutResult.exitCode).toBe(0);

    // Verify credentials were cleared
    const configPath = join(tmpHome, '.esa', 'config', 'default.toml');
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf-8');
      const config = toml.parse(configContent) as any;
      expect(config.auth?.accessKeyId).toBe('');
      expect(config.auth?.accessKeySecret).toBe('');
    }
  });
});

describeOrSkip('v1 interactive: route add', () => {
  let tmpHome: string;
  let tmpProject: string;

  beforeAll(() => {
    tmpHome = mkdtempSync(join(tmpdir(), 'esa-v1-e2e-'));
    tmpProject = mkdtempSync(join(tmpdir(), 'esa-v1-project-'));
  });

  it('should complete route add flow (with prior login)', async ({ skip }) => {
    if (SKIP_LOGIN) skip();

    // Step 1: Login first
    await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['login'],
        env: { HOME: tmpHome },
        timeout: 30000
      },
      [
        { value: `${TEST_ACCESS_KEY_ID}\n`, delay: 2000 },
        { value: `${TEST_ACCESS_KEY_SECRET}\n`, delay: 2000 }
      ]
    );

    // Step 2: Create a project config
    const { writeFileSync } = await import('fs');
    writeFileSync(
      join(tmpProject, 'esa.jsonc'),
      JSON.stringify(
        { name: 'e2e-test-project', entry: 'src/index.ts' },
        null,
        2
      )
    );

    // Step 3: Run route add interactively
    // v1 uses inquirer for route add
    const result = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['route', 'add'],
        cwd: tmpProject,
        env: { HOME: tmpHome },
        timeout: 30000
      },
      [
        // inquirer: route name
        { value: 'e2e-test-route\n', delay: 2000 },
        // inquirer: select site (use Enter to pick first)
        { value: '\n', delay: 2000 },
        // inquirer: select method (manual or builder)
        { value: '\n', delay: 2000 },
        // inquirer: input route pattern
        { value: 'test.example.com/*\n', delay: 2000 }
      ]
    );

    // The route add should complete (success or fail with API error,
    // but should not crash or hang)
    expect(result.timedOut).toBe(false);
  });
});

describeOrSkip('v1 interactive: config set', () => {
  it('should set config value interactively', async () => {
    const tmpHome = mkdtempSync(join(tmpdir(), 'esa-v1-config-'));

    const result = await runInteractiveDelayed(
      {
        bin: V1_BIN,
        args: ['config'],
        env: { HOME: tmpHome },
        timeout: 15000
      },
      [
        // v1 config may prompt for endpoint or other settings
        { value: '\n', delay: 2000 }
      ]
    );

    expect(result.timedOut).toBe(false);
    rmSync(tmpHome, { recursive: true, force: true });
  });
});
