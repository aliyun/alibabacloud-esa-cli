import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  fixtureKey,
  fixtureSecret,
  fixtureToken,
  startCloudFixture
} from '../../fixtures/cloud';
import { runCliProcess } from '../../support/cli-process';

let cloud: Awaited<ReturnType<typeof startCloudFixture>>;
beforeAll(async () => {
  cloud = await startCloudFixture();
});
afterAll(async () => cloud?.close());

async function withProject(
  run: (project: {
    cwd: string;
    name: string;
    command: (args: string[]) => ReturnType<typeof runCliProcess>;
  }) => Promise<void>
) {
  const home = mkdtempSync(join(tmpdir(), 'esa-json-'));
  const cwd = join(home, 'project with spaces');
  const name = 'json-contract-app';
  mkdirSync(join(cwd, 'dist'), { recursive: true });
  writeFileSync(join(cwd, 'dist', 'index.html'), '<h1>JSON deploy</h1>');
  writeFileSync(
    join(cwd, 'esa.jsonc'),
    JSON.stringify({ $schema: 'https://esa-cli.schema.json', name })
  );
  cloud.addProject(name);
  const command = (args: string[]) =>
    runCliProcess({
      bin: 'bin/enter.cjs',
      args: [...args, '--skip-update-check'],
      cwd,
      env: { HOME: home, ESA_TEST_FIXTURE_PORT: cloud.port },
      nodeArgs: ['--require', resolve('tests/fixtures/offline-http.cjs')]
    });
  try {
    const login = await command([
      'login',
      '--sts-token',
      JSON.stringify({
        AccessKeyId: fixtureKey,
        AccessKeySecret: fixtureSecret,
        SecurityToken: fixtureToken
      })
    ]);
    expect(login.exitCode).toBe(0);
    await run({ cwd, name, command });
  } finally {
    cloud.removeProject(name);
    cloud.rejectAction('CreateRoutineCodeDeployment', false);
    rmSync(home, { recursive: true, force: true });
  }
}

describe('offline deploy JSON process contract', () => {
  it('accepts the backend command, uploads assets and returns a token-free production result', async () => {
    await withProject(async ({ name, command }) => {
      const before = cloud.requestDetails.length;
      const result = await command([
        'deploy',
        `--name=${name}`,
        '--assets=./dist',
        '--output=json'
      ]);
      expect(result.timedOut).toBe(false);
      expect(result.exitCode, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        schemaVersion: 1,
        app: name,
        url: `https://${name}.fixture.test`,
        deployments: [
          {
            environment: 'production',
            deploymentId: 'deployment-production',
            codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
          }
        ]
      });
      expect(result.stderr).toContain('Generating code version');
      const requests = cloud.requestDetails.slice(before);
      expect(
        requests.find(
          ({ action }) => action === 'CreateRoutineWithAssetsCodeVersion'
        )?.body.DeployEnv
      ).toBe('production');
      expect(
        requests
          .filter(({ action }) => action === 'CreateRoutineCodeDeployment')
          .map(({ environment }) => environment)
      ).toEqual(['production']);
      expect(
        requests.every(({ securityToken }) => securityToken === fixtureToken)
      ).toBe(true);
      expect(cloud.calls).not.toContain('GetRoutineAccessToken');
      expect(result.stdout + result.stderr).not.toContain(fixtureSecret);
      expect(result.stdout + result.stderr).not.toContain(fixtureToken);
    });
  });

  it('preserves staging and suppresses the preview URL with --no-preview', async () => {
    await withProject(async ({ command }) => {
      const result = await command([
        'deploy',
        '--assets=./dist',
        '--environment=staging',
        '--output=json',
        '--no-preview'
      ]);
      expect(result.exitCode, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        url: null,
        deployments: [
          {
            environment: 'staging',
            codeVersions: [{ codeVersion: 'staging-v1' }]
          }
        ]
      });
    });
  });

  it('returns the weighted deployment details', async () => {
    await withProject(async ({ command }) => {
      const result = await command([
        'deploy',
        '--versions=v1:80,v2:20',
        '--output=json'
      ]);
      expect(result.exitCode, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout).deployments).toEqual([
        {
          environment: 'production',
          deploymentId: 'deployment-production',
          codeVersions: [
            { codeVersion: 'v1', percentage: 80 },
            { codeVersion: 'v2', percentage: 20 }
          ]
        }
      ]);
    });
  });

  it('returns exit 1 and valid JSON when the deployment API rejects the request', async () => {
    await withProject(async ({ command }) => {
      cloud.rejectAction('CreateRoutineCodeDeployment');
      const result = await command(['deploy', '--version=v1', '--output=json']);
      expect(result.exitCode).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        url: null,
        deployments: []
      });
      expect(result.stderr).toContain(
        'Fixture rejected CreateRoutineCodeDeployment'
      );
    });
  });

  it('rejects a version bound to another environment before publishing', async () => {
    await withProject(async ({ command }) => {
      const before = cloud.calls.length;
      const result = await command([
        'deploy',
        '--version=staging-v1',
        '--output=json'
      ]);
      expect(result.exitCode).toBe(1);
      expect(JSON.parse(result.stdout).deployments).toEqual([]);
      expect(result.stderr).toContain('cannot be deployed to production');
      expect(cloud.calls.slice(before)).not.toContain(
        'CreateRoutineCodeDeployment'
      );
    });
  });

  it('reports invalid project config to stderr with exit 1', async () => {
    await withProject(async ({ cwd, command }) => {
      writeFileSync(join(cwd, 'esa.jsonc'), '{"name":');
      const result = await command(['deploy', '--output=json']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Error parsing config file');
    });
  });

  it('flushes JSON and exits even with an unrelated active handle', async () => {
    const result = await runCliProcess({
      bin: 'bin/enter.cjs',
      args: [
        'deploy',
        '--versions=v1:80',
        '--output=json',
        '--skip-update-check'
      ],
      nodeArgs: ['--require', resolve('tests/fixtures/keepProcessAlive.cjs')],
      timeout: 5000
    });
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({
      schemaVersion: 1,
      app: '',
      url: null,
      deployments: []
    });
  });
});
