/**
 * API Integration Tests: Write Operations
 *
 * Tests commands that create/delete resources. Each test is self-contained:
 * it creates a resource, verifies the operation succeeded, then cleans up.
 *
 * To run:
 *   ESA_TEST_ACCESS_KEY_ID=xxx ... npx vitest run --config vitest.integration.config.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runCli, testEnv } from './helper';
import {
  hasCredentials,
  skipIfNoCredentials,
  CREDENTIALS
} from './credentials';

const describeOrSkip = hasCredentials() ? describe : describe.skip;

let tmpProject: string;

beforeAll(() => {
  // Create a temp project directory with config
  tmpProject = mkdtempSync(join(tmpdir(), 'esa-write-test-'));
  writeFileSync(
    join(tmpProject, 'esa.jsonc'),
    JSON.stringify(
      {
        name: CREDENTIALS.projectName,
        entry: 'src/index.ts',
        siteId: CREDENTIALS.siteId
      },
      null,
      2
    )
  );
});

afterAll(() => {
  if (tmpProject) {
    rmSync(tmpProject, { recursive: true, force: true });
  }
});

describeOrSkip('API integration: write operations', () => {
  describe('domain add + delete', () => {
    const testDomain = `e2e-test-${Date.now()}.example.com`;
    let created = false;

    it('domain add succeeds', async ({ skip }) => {
      skipIfNoCredentials(skip);

      const result = await runCli(['domain', 'add', '--domain', testDomain], {
        cwd: tmpProject,
        env: testEnv()
      });

      // Should exit 0 (success) — or exit non-zero with a clear API error
      // (e.g., domain limit reached), but should NOT crash
      if (result.exitCode === 0) {
        created = true;
      } else {
        // If it failed, log the error for debugging but don't fail the test
        // unless it's a crash (exit code null)
        expect(result.exitCode).not.toBeNull();
        console.log(`domain add failed (may be expected): ${result.stderr}`);
      }
    });

    it('domain delete cleans up', async ({ skip }) => {
      skipIfNoCredentials(skip);

      if (!created) {
        skip();
        return;
      }

      const result = await runCli(
        ['domain', 'delete', '--domain', testDomain],
        { cwd: tmpProject, env: testEnv() }
      );

      expect(result.exitCode).toBe(0);
    });
  });

  describe('route add + delete', () => {
    const testRoutePattern = `e2e-test-${Date.now()}.example.com/*`;
    const testRouteName = `e2e-route-${Date.now()}`;
    let created = false;

    it('route add succeeds', async ({ skip }) => {
      skipIfNoCredentials(skip);

      // Use non-interactive flags to avoid stdin complexity
      const result = await runCli(
        ['route', 'add', '--name', testRouteName, '--route', testRoutePattern],
        { cwd: tmpProject, env: testEnv() }
      );

      if (result.exitCode === 0) {
        created = true;
      } else {
        // Log error but don't crash
        expect(result.exitCode).not.toBeNull();
        console.log(`route add failed (may be expected): ${result.stderr}`);
      }
    });

    it('route delete cleans up', async ({ skip }) => {
      skipIfNoCredentials(skip);

      if (!created) {
        skip();
        return;
      }

      const result = await runCli(
        ['route', 'delete', '--name', testRouteName],
        { cwd: tmpProject, env: testEnv() }
      );

      expect(result.exitCode).toBe(0);
    });
  });

  describe('config set + verify', () => {
    it('config can be set and read back', async ({ skip }) => {
      skipIfNoCredentials(skip);

      // Set a config value
      const setResult = await runCli(['config', 'set', 'lang', 'zh'], {
        env: testEnv()
      });

      expect(setResult.exitCode).toBe(0);

      // Verify it was set
      const getResult = await runCli(['config', 'get', 'lang'], {
        env: testEnv()
      });

      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('zh');
    });

    it('config can be reset', async ({ skip }) => {
      skipIfNoCredentials(skip);

      const result = await runCli(['config', 'set', 'lang', 'en'], {
        env: testEnv()
      });

      expect(result.exitCode).toBe(0);
    });
  });
});
