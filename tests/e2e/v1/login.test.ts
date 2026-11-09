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
import { basename, join } from 'node:path';
import toml from '@iarna/toml';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  fixtureKey,
  fixtureSecret,
  fixtureToken,
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
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'esa offline e2e ')));
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

type Command = (
  args: string[],
  exitCode?: number,
  inputs?: Parameters<typeof runInteractiveDelayed>[1]
) => Promise<string>;

async function withProject(
  run: (project: {
    name: string;
    home: string;
    cwd: string;
    command: Command;
  }) => Promise<void>
) {
  const home = testHome();
  const name = `fixture-${basename(home).slice(-6).toLowerCase()}`;
  const cwd = join(home, 'project with spaces');
  try {
    mkdirSync(cwd);
    mkdirSync(join(home, '.esa', 'config'), { recursive: true });
    writeFileSync(
      join(home, '.esa', 'config', 'default.toml'),
      toml.stringify({
        auth: { accessKeyId: fixtureKey, accessKeySecret: fixtureSecret },
        lang: 'en'
      }),
      { mode: 0o600 }
    );
    writeFileSync(join(cwd, 'esa.jsonc'), JSON.stringify({ name }));
    cloud.addProject(name);
    const command: Command = async (args, exitCode = 0, inputs = []) => {
      const result = await runInteractiveDelayed(
        { bin, args, cwd, env: env(home) },
        inputs
      );
      expect(result.timedOut).toBe(false);
      expect(result.exitCode, `${args[0]} ${args[1]} exit code`).toBe(exitCode);
      return stripAnsi(result.stdout + result.stderr);
    };
    await run({ name, home, cwd, command });
  } finally {
    cloud.removeProject(name);
    rmSync(home, { recursive: true, force: true });
  }
}

describe('offline CLI login and configuration', () => {
  it.each([
    ['comma-separated', `${fixtureKey},${fixtureSecret},${fixtureToken}`],
    [
      'JSON',
      JSON.stringify({
        AccessKeyId: fixtureKey,
        AccessKeySecret: fixtureSecret,
        SecurityToken: fixtureToken
      })
    ]
  ])(
    'persists valid %s STS credentials and forwards the token without displaying secrets',
    async (_format, token) => {
      const home = testHome();
      const before = cloud.requestDetails.length;
      try {
        const result = await runInteractiveDelayed({
          bin,
          args: ['login', '--sts-token', token],
          env: env(home)
        });
        expect(result.timedOut).toBe(false);
        expect(result.exitCode).toBe(0);
        const output = stripAnsi(result.stdout + result.stderr);
        expect(output).toContain('Login success');
        expect(output).toContain('STS');
        expect(output).not.toContain(fixtureSecret);
        expect(output).not.toContain(fixtureToken);
        expect(auth(home)).toEqual({
          accessKeyId: fixtureKey,
          accessKeySecret: fixtureSecret,
          securityToken: fixtureToken
        });
        const requests = cloud.requestDetails.slice(before);
        expect(requests.length).toBeGreaterThan(0);
        expect(
          requests.every(
            (request) =>
              request.action === 'GetErService' &&
              request.securityToken === fixtureToken
          )
        ).toBe(true);
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    }
  );

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
      expect(result.exitCode).toBe(1);
      expect(stripAnsi(result.stdout + result.stderr).toLowerCase()).toContain(
        'sts token'
      );
      expect(auth(home)).toEqual({});
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
      expect(result.exitCode).toBe(1);
      expect(stripAnsi(result.stdout + result.stderr)).toContain(
        'Fixture rejected credentials'
      );
      expect(auth(home)).toEqual({});
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
        { bin, args: ['login'], env: env(home), timeout: 20000 },
        [
          { value: '\r', waitFor: 'Choose login method' },
          { value: `${fixtureKey}\r`, waitFor: 'AccessKey ID:' },
          { value: `${fixtureSecret}\r`, waitFor: 'AccessKey Secret:' }
        ]
      );
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.stdout + result.stderr)).toContain(
        'Login success'
      );
      expect(stripAnsi(result.stdout + result.stderr)).not.toContain(
        fixtureSecret
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
        { bin, args: ['login'], env: env(home), timeout: 20000 },
        [
          { value: '\r', waitFor: 'Choose login method' },
          { value: '\r', waitFor: 'AccessKey ID:' },
          { value: '\r', waitFor: 'AccessKey Secret:' }
        ]
      );
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(stripAnsi(result.stdout + result.stderr)).toMatch(
        /[◇o]\s+AccessKey Secret/
      );
      expect(stripAnsi(result.stdout + result.stderr)).not.toContain(
        'Login success'
      );
      expect(auth(home)).toEqual({});
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
        [{ value: '\u0003', waitFor: 'Choose login method' }]
      );
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.stdout + result.stderr)).toMatch(
        /[■x]\s+Choose login method/
      );
      expect(stripAnsi(result.stdout + result.stderr)).not.toContain(
        'Login success'
      );
      expect(auth(home)).toEqual({});
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
      const editor = join(home, 'editor fixture.cjs');
      writeFileSync(
        editor,
        `#!/usr/bin/env node\nrequire('fs').writeFileSync(${JSON.stringify(marker)}, JSON.stringify(process.argv.slice(2)));\n`,
        { mode: 0o755 }
      );
      const launcher =
        process.platform === 'win32' ? join(home, 'editor.cmd') : editor;
      if (process.platform === 'win32')
        writeFileSync(launcher, `@"${process.execPath}" "${editor}" %*\r\n`);
      const result = await runInteractiveDelayed({
        bin,
        args: ['config', '--local'],
        cwd: home,
        env: { ...env(home), EDITOR: launcher }
      });
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      const argumentsReceived = JSON.parse(readFileSync(marker, 'utf8'));
      expect(argumentsReceived).toEqual([config]);
      expect(realpathSync(argumentsReceived[0])).toBe(realpathSync(config));
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('rejects dev outside a project before downloading or starting a runtime', async () => {
    const home = testHome();
    const before = cloud.calls.length;
    try {
      const result = await runInteractiveDelayed({
        bin,
        args: ['dev'],
        cwd: home,
        env: env(home)
      });
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(stripAnsi(result.stdout + result.stderr)).toContain('ESA project');
      expect(cloud.calls.length).toBe(before);
      expect(existsSync(join(home, '.ew2'))).toBe(false);
      expect(existsSync(join(home, '.deno'))).toBe(false);
      expect(existsSync(join(home, 'esa.jsonc'))).toBe(false);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('offline CLI runtime environment variables and secrets', () => {
  it('sets, reads and deletes plaintext variables without crossing project or environment boundaries', async () => {
    await withProject(async ({ name, command }) => {
      const staging = 'stage & mode=on +中文';
      const production = 'prod=off & + safe';
      const before = cloud.requestDetails.length;
      expect(
        await command([
          'env',
          'set',
          `APP_MODE=${staging}`,
          '--environment',
          'staging'
        ])
      ).toContain('Set 1 environment variable');
      expect(
        await command([
          'env',
          'set',
          `APP_MODE=${production}`,
          '--environment',
          'production'
        ])
      ).toContain('Set 1 environment variable');
      const stageList = await command([
        'env',
        'list',
        '--environment',
        'staging'
      ]);
      expect(stageList).toContain(staging);
      expect(stageList).not.toContain(production);
      const prodList = await command([
        'env',
        'list',
        '--environment',
        'production'
      ]);
      expect(prodList).toContain(production);
      expect(prodList).not.toContain(staging);
      expect(
        await command(['env', 'delete', 'APP_MODE', '--environment', 'staging'])
      ).toContain('Deleted 1 environment variable');
      expect(
        await command(['env', 'list', '--environment', 'staging'])
      ).toContain('No environment variables found');
      expect(cloud.variables(name, 'staging')).toEqual({});
      expect(cloud.variables(name, 'production')).toEqual({
        APP_MODE: { Type: 'plain_text', Value: production }
      });
      const other = `${name}-other`;
      cloud.addProject(other);
      try {
        expect(
          await command([
            'env',
            'list',
            '--name',
            other,
            '--environment',
            'production'
          ])
        ).toContain('No environment variables found');
      } finally {
        cloud.removeProject(other);
      }
      const updates = cloud.requestDetails
        .slice(before)
        .filter(
          (request) => request.action === 'SetRoutineEnvironmentVariables'
        );
      expect(updates).toHaveLength(2);
      expect(
        updates.map((request) => ({
          Name: request.body.Name,
          Env: request.body.Env
        }))
      ).toEqual([
        { Name: name, Env: 'staging' },
        { Name: name, Env: 'production' }
      ]);
      expect(
        updates.map((request) => ({
          name: request.projectName,
          env: request.environment,
          method: request.method,
          variables: JSON.parse(request.body.EnvironmentVariables)
        }))
      ).toEqual([
        {
          name,
          env: 'staging',
          method: 'POST',
          variables: { APP_MODE: { Type: 'plain_text', Value: staging } }
        },
        {
          name,
          env: 'production',
          method: 'POST',
          variables: { APP_MODE: { Type: 'plain_text', Value: production } }
        }
      ]);
      const deletion = cloud.requestDetails
        .slice(before)
        .find(
          (request) => request.action === 'DeleteRoutineEnvironmentVariables'
        );
      expect(deletion?.body).toEqual({
        Name: name,
        Env: 'staging',
        EnvironmentVariableKeys: JSON.stringify(['APP_MODE'])
      });
    });
  }, 60000);

  it('reads a secret from stdin, masks list output and deletes only its target environment', async () => {
    await withProject(async ({ name, command }) => {
      const secret = 'stdin-secret & token=one+two';
      const productionSecret = 'production-secret & keep=unchanged';
      const output = await command(
        ['secret', 'put', 'API_TOKEN', '--stdin', '--environment', 'staging'],
        0,
        [{ value: `${secret}\r\n`, delay: 0 }]
      );
      expect(output).toContain('Set 1 secret');
      expect(output).not.toContain(secret);
      expect(cloud.variables(name, 'staging')).toEqual({
        API_TOKEN: { Type: 'secret_text', Value: secret }
      });
      const productionOutput = await command(
        [
          'secret',
          'put',
          'API_TOKEN',
          '--stdin',
          '--environment',
          'production'
        ],
        0,
        [{ value: `${productionSecret}\r\n`, delay: 0 }]
      );
      expect(productionOutput).toContain('Set 1 secret');
      expect(productionOutput).not.toContain(secret);
      expect(productionOutput).not.toContain(productionSecret);
      const listed = await command(['env', 'list', '--environment', 'staging']);
      expect(listed).toContain('API_TOKEN');
      expect(listed).toContain('secret_text');
      expect(listed).toContain('********');
      expect(listed).not.toContain(secret);
      expect(listed).not.toContain(productionSecret);
      expect(
        await command([
          'env',
          'delete',
          'API_TOKEN',
          '--environment',
          'staging'
        ])
      ).toContain('Deleted 1 environment variable');
      expect(cloud.variables(name, 'staging')).toEqual({});
      expect(cloud.variables(name, 'production')).toEqual({
        API_TOKEN: { Type: 'secret_text', Value: productionSecret }
      });
      const productionList = await command([
        'env',
        'list',
        '--environment',
        'production'
      ]);
      expect(productionList).toContain('API_TOKEN');
      expect(productionList).toContain('secret_text');
      expect(productionList).toContain('********');
      expect(productionList).not.toContain(secret);
      expect(productionList).not.toContain(productionSecret);
    });
  }, 60000);

  it('submits the password prompt without echoing the secret', async () => {
    await withProject(async ({ name, command }) => {
      const secret = 'interactive-secret-value';
      const output = await command(
        ['secret', 'put', 'PROMPT_TOKEN', '--environment', 'staging'],
        0,
        [{ value: `${secret}\r`, waitFor: 'Enter secret value' }]
      );
      expect(output).toContain('Set 1 secret');
      expect(output).not.toContain(secret);
      expect(cloud.variables(name, 'staging')).toEqual({
        PROMPT_TOKEN: { Type: 'secret_text', Value: secret }
      });
    });
  });

  it('bulk imports a dotenv file with spaces and special characters as masked production secrets', async () => {
    await withProject(async ({ name, cwd, command }) => {
      const file = join(cwd, 'secrets with spaces.env');
      const first = 'bulk-secret-one';
      const second = 'two & plus+=value';
      writeFileSync(
        file,
        `# fixture secrets\nBULK_TOKEN="${first}"\nexport BULK_OTHER='${second}'\n`,
        { mode: 0o600 }
      );
      const before = cloud.requestDetails.length;
      const output = await command([
        'secret',
        'bulk',
        file,
        '--environment',
        'production'
      ]);
      expect(output).toContain('Set 2 secrets');
      expect(output).not.toContain(first);
      expect(output).not.toContain(second);
      expect(cloud.variables(name, 'production')).toEqual({
        BULK_TOKEN: { Type: 'secret_text', Value: first },
        BULK_OTHER: { Type: 'secret_text', Value: second }
      });
      const listed = await command([
        'env',
        'list',
        '--environment',
        'production'
      ]);
      expect(listed).toContain('BULK_TOKEN');
      expect(listed).toContain('BULK_OTHER');
      expect(listed.match(/\*{8}/g)).toHaveLength(2);
      expect(listed).not.toContain(first);
      expect(listed).not.toContain(second);
      expect(
        await command(['env', 'list', '--environment', 'staging'])
      ).toContain('No environment variables found');
      const update = cloud.requestDetails
        .slice(before)
        .find((request) => request.action === 'SetRoutineEnvironmentVariables');
      expect(update).toMatchObject({
        projectName: name,
        environment: 'production',
        method: 'POST'
      });
      expect(JSON.parse(update!.body.EnvironmentVariables)).toEqual(
        cloud.variables(name, 'production')
      );
    });
  }, 60000);

  it('rejects malformed or empty dotenv secrets without any variable mutation', async () => {
    await withProject(async ({ name, cwd, command }) => {
      const file = join(cwd, 'invalid secrets.env');
      const before = cloud.calls.length;
      for (const contents of [
        'VALID=must-not-be-saved\nmalformed line\n',
        'VALID=must-not-be-saved\nEMPTY=\n'
      ]) {
        writeFileSync(file, contents, { mode: 0o600 });
        const output = await command(
          ['secret', 'bulk', file, '--environment', 'staging'],
          1
        );
        expect(output).not.toContain('Set 2 secrets');
        expect(output).not.toContain('must-not-be-saved');
      }
      expect(cloud.calls.slice(before)).not.toContain(
        'SetRoutineEnvironmentVariables'
      );
      expect(cloud.variables(name, 'staging')).toEqual({});
      expect(cloud.variables(name, 'production')).toEqual({});
    });
  }, 60000);

  it('returns failure when the API rejects a write or does not confirm a deletion', async () => {
    await withProject(async ({ name, command }) => {
      cloud.rejectAction('SetRoutineEnvironmentVariables');
      try {
        const output = await command(
          [
            'env',
            'set',
            'FAILED=never-persist-this',
            '--environment',
            'staging'
          ],
          1
        );
        expect(output).toContain('Failed to set environment variables');
        expect(output).not.toContain('Set 1 environment variable');
        expect(output).not.toContain('never-persist-this');
        expect(cloud.variables(name, 'staging')).toEqual({});
      } finally {
        cloud.rejectAction('SetRoutineEnvironmentVariables', false);
      }
      const output = await command(
        ['env', 'delete', 'MISSING', '--environment', 'staging'],
        1
      );
      expect(output).toContain('Failed to delete: MISSING');
      expect(output).not.toContain('Deleted 1 environment variable');
      expect(cloud.variables(name, 'staging')).toEqual({});
    });
  }, 60000);
});
