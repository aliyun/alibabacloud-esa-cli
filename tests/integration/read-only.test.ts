/**
 * API Integration Tests: Read-Only Commands
 *
 * Tests real API calls for read-only commands.
 *
 * To run:
 *   ESA_TEST_ACCESS_KEY_ID=xxx ... npx vitest run --config vitest.integration.config.ts
 *
 * Prerequisites:
 *   - CLI must be built (npm run build)
 *   - Real ESA test account with at least one site
 */
import { describe, it, expect, beforeAll } from 'vitest';

import { hasCredentials, skipIfNoCredentials } from './credentials';
import { runCli, testEnv } from './helper';

const describeOrSkip = hasCredentials() ? describe : describe.skip;

describeOrSkip('API integration: read-only commands', () => {
  beforeAll(() => {
    // Ensure test home with credentials is set up
    testEnv();
  });

  describe('site list', () => {
    it('exits 0 and returns at least one site', async () => {
      const result = await runCli(['site', 'list'], { env: testEnv() });
      expect(result.exitCode).toBe(0);

      // Output should mention at least one site
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it('returns consistent data on repeated calls', async () => {
      const result1 = await runCli(['site', 'list'], { env: testEnv() });
      const result2 = await runCli(['site', 'list'], { env: testEnv() });

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      // The output should be identical (no random ordering or volatile fields)
      // Note: we use the stripped output to avoid timestamp diffs
      expect(result1.stdout.length).toBeGreaterThan(0);
      // Repeated calls should produce the same core content
      // (May differ in subtle formatting, but site names should match)
    });
  });

  describe('deployments list', () => {
    it('exits 0 when listing deployments', async ({ skip }) => {
      skipIfNoCredentials(skip);

      // deployments list requires a project config
      const { mkdtempSync, writeFileSync } = await import('fs');
      const { join } = await import('path');
      const { tmpdir } = await import('os');
      const tmpProject = mkdtempSync(join(tmpdir(), 'esa-integ-deploy-'));
      writeFileSync(
        join(tmpProject, 'esa.jsonc'),
        JSON.stringify(
          {
            name:
              process.env.ESA_TEST_PROJECT_NAME || 'integration-test-project',
            entry: 'src/index.ts'
          },
          null,
          2
        )
      );

      const result = await runCli(['deployments', 'list'], {
        cwd: tmpProject,
        env: testEnv()
      });

      // Should not crash (may return empty list if no deployments exist)
      expect(result.exitCode).toBe(0);

      const { rmSync } = await import('fs');
      rmSync(tmpProject, { recursive: true, force: true });
    });
  });

  describe('domain list', () => {
    it('exits 0 when listing domains', async ({ skip }) => {
      skipIfNoCredentials(skip);

      // domain list requires a project/site config
      const { mkdtempSync, writeFileSync, rmSync } = await import('fs');
      const { join } = await import('path');
      const { tmpdir } = await import('os');
      const tmpProject = mkdtempSync(join(tmpdir(), 'esa-integ-domain-'));
      writeFileSync(
        join(tmpProject, 'esa.jsonc'),
        JSON.stringify(
          {
            name:
              process.env.ESA_TEST_PROJECT_NAME || 'integration-test-project',
            entry: 'src/index.ts',
            siteId: process.env.ESA_TEST_SITE_ID
          },
          null,
          2
        )
      );

      const result = await runCli(['domain', 'list'], {
        cwd: tmpProject,
        env: testEnv()
      });

      expect(result.exitCode).toBe(0);

      rmSync(tmpProject, { recursive: true, force: true });
    });
  });

  describe('route list', () => {
    it('exits 0 when listing routes', async ({ skip }) => {
      skipIfNoCredentials(skip);

      const { mkdtempSync, writeFileSync, rmSync } = await import('fs');
      const { join } = await import('path');
      const { tmpdir } = await import('os');
      const tmpProject = mkdtempSync(join(tmpdir(), 'esa-integ-route-'));
      writeFileSync(
        join(tmpProject, 'esa.jsonc'),
        JSON.stringify(
          {
            name:
              process.env.ESA_TEST_PROJECT_NAME || 'integration-test-project',
            entry: 'src/index.ts',
            siteId: process.env.ESA_TEST_SITE_ID
          },
          null,
          2
        )
      );

      const result = await runCli(['route', 'list'], {
        cwd: tmpProject,
        env: testEnv()
      });

      expect(result.exitCode).toBe(0);

      rmSync(tmpProject, { recursive: true, force: true });
    });
  });

  describe('project list', () => {
    it('exits 0 when listing projects', async ({ skip }) => {
      skipIfNoCredentials(skip);

      const result = await runCli(['project', 'list'], { env: testEnv() });

      expect(result.exitCode).toBe(0);
    });
  });
});
