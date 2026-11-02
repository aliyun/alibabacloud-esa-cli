import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import toml from '@iarna/toml';
import { expect } from 'vitest';
import {
  cloudApi,
  recordResource,
  deleteTestProject
} from '../../scripts/release/cloud-client.mjs';
import { runCliProcess } from '../support/cli-process';
import { CREDENTIALS } from './credentials';

export { cloudApi };
export const CLI_BIN = resolve(process.env.ESA_CLI_BIN || 'bin/enter.cjs');
export const stripAnsi = (value: string) =>
  value.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '');

export async function withProject(
  run: (project: {
    name: string;
    cwd: string;
    env: Record<string, string>;
  }) => Promise<void>
) {
  if (!CREDENTIALS) throw new Error('Integration credentials are required');
  const name = `esa-ci-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  const cwd = mkdtempSync(join(tmpdir(), 'esa-real-api-'));
  const home = join(cwd, 'home');
  mkdirSync(join(home, '.esa', 'config'), { recursive: true });
  mkdirSync(join(home, '.esa-logs'), { recursive: true });
  writeFileSync(
    join(home, '.esa', 'config', 'default.toml'),
    toml.stringify({
      auth: {
        accessKeyId: CREDENTIALS.accessKeyId,
        accessKeySecret: CREDENTIALS.accessKeySecret,
        ...(CREDENTIALS.securityToken
          ? { securityToken: CREDENTIALS.securityToken }
          : {})
      },
      endpoint: CREDENTIALS.endpoint,
      lang: 'en'
    })
  );
  writeFileSync(
    join(cwd, 'esa.jsonc'),
    JSON.stringify({ name, entry: 'index.js', siteId: CREDENTIALS.siteId })
  );
  const errors: unknown[] = [];
  let created = false;
  try {
    // Write the journal before creation so an interrupted request is recoverable.
    recordResource(name);
    const result = await cloudApi('CreateRoutine', {
      Name: name,
      Description: 'Temporary CLI release test',
      HasAssets: true
    });
    expect(result.Status).toBe('OK');
    created = true;
    await run({
      name,
      cwd,
      env: { HOME: home, CUSTOM_ENDPOINT: CREDENTIALS.endpoint }
    });
  } catch (error) {
    errors.push(error);
  } finally {
    if (created) {
      try {
        await deleteTestProject(name);
      } catch (error) {
        errors.push(error);
      }
    }
    rmSync(cwd, { recursive: true, force: true });
  }
  if (errors.length)
    throw new AggregateError(
      errors,
      `Integration failed for ${name}; see errors and resource journal`
    );
}

export async function cli(
  args: string[],
  project: { cwd: string; env: Record<string, string> },
  timeout = 45000
) {
  const result = await runCliProcess({
    bin: CLI_BIN,
    args,
    ...project,
    timeout
  });
  expect(result.timedOut, `Timed out running ${args[0]}`).toBe(false);
  // Do not print the full output: a deploy command can include a temporary access token.
  expect(result.exitCode, `CLI ${args[0]} exited unsuccessfully`).toBe(0);
  return stripAnsi(result.stdout + result.stderr);
}
