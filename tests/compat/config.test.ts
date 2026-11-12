import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  realpathSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import toml from '@iarna/toml';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  fixtureKey,
  fixtureSecret,
  startCloudFixture
} from '../fixtures/cloud';
import { runCliProcess } from '../support/cli-process';
import { runCli, CLI_BIN } from './helper';

const FULL_CONFIG = {
  name: 'compat-test-project',
  description: 'Configuration contract test',
  entry: 'src/index.ts',
  assets: {
    directory: './public',
    notFoundStrategy: 'singlePageApplication'
  },
  dev: {
    port: 19341,
    inspectPort: 9345,
    minify: false,
    localUpstream: 'https://example.com/api'
  }
};
const CLI_CONFIG = {
  auth: {
    accessKeyId: fixtureKey,
    accessKeySecret: fixtureSecret,
    securityToken: 'fixture-security-token'
  },
  endpoint: 'esa.cn-hangzhou.aliyuncs.com',
  lang: 'en'
};

let workspace: string;
let projectDir: string;
let home: string;
beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'esa-config-contract-'));
  projectDir = join(workspace, 'project');
  home = join(workspace, 'home');
  mkdirSync(projectDir);
  mkdirSync(join(home, '.esa-logs'), { recursive: true });
});
afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function writeCredentials() {
  const directory = join(home, '.esa', 'config');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'default.toml'), toml.stringify(CLI_CONFIG));
}

async function readConfig(cwd = projectDir) {
  const result = await runCliProcess({
    bin: resolve('tests/fixtures/read-config.mjs'),
    args: [CLI_BIN],
    cwd,
    env: { HOME: home },
    nodeArgs: ['--require', resolve('tests/fixtures/offline-http.cjs')]
  });
  expect(result.timedOut).toBe(false);
  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout);
}

// Each case loads the compiled readers in a fresh process; no source mocks.
describe('project configuration from the built CLI', () => {
  it('reads every configured JSONC value and uses the configured dev port', async () => {
    writeFileSync(join(projectDir, 'esa.jsonc'), JSON.stringify(FULL_CONFIG));
    const config = await readConfig();
    expect(config.project).toEqual(FULL_CONFIG);
    expect(config.devUrl).toBe('http://localhost:19341');
  });

  it('reads JSONC comments without corrupting URLs inside strings', async () => {
    writeFileSync(
      join(projectDir, 'esa.jsonc'),
      `{
        // Project configuration
        "name": "comment-project",
        "entry": "src/index.ts",
        /* Local upstream */
        "dev": { "port": 19342, "localUpstream": "https://example.com/api" }
      }`
    );
    const config = await readConfig();
    expect(config.project).toEqual({
      name: 'comment-project',
      entry: 'src/index.ts',
      dev: { port: 19342, localUpstream: 'https://example.com/api' }
    });
    expect(config.devUrl).toBe('http://localhost:19342');
  });

  it('reads JSONC trailing commas without losing nested values', async () => {
    writeFileSync(
      join(projectDir, 'esa.jsonc'),
      `{
        "name": "trailing-comma-project",
        "entry": "src/index.ts",
        "dev": { "port": 19343, "minify": false, },
      }`
    );
    const config = await readConfig();
    expect(config.project).toEqual({
      name: 'trailing-comma-project',
      entry: 'src/index.ts',
      dev: { port: 19343, minify: false }
    });
    expect(config.devUrl).toBe('http://localhost:19343');
  });

  it('reads every configured TOML value', async () => {
    writeFileSync(join(projectDir, 'esa.toml'), toml.stringify(FULL_CONFIG));
    const config = await readConfig();
    expect(config.project).toEqual(FULL_CONFIG);
    expect(config.devUrl).toBe('http://localhost:19341');
  });

  it('reads nested TOML tables with the correct value types', async () => {
    writeFileSync(
      join(projectDir, 'esa.toml'),
      `name = "nested-toml-project"
entry = "src/index.ts"
[dev]
port = 19344
minify = false
[assets]
directory = "./public"
notFoundStrategy = "singlePageApplication"
`
    );
    const config = await readConfig();
    expect(config.project).toEqual({
      name: 'nested-toml-project',
      entry: 'src/index.ts',
      dev: { port: 19344, minify: false },
      assets: {
        directory: './public',
        notFoundStrategy: 'singlePageApplication'
      }
    });
    expect(config.devUrl).toBe('http://localhost:19344');
  });

  it('uses JSONC values and path when a conflicting TOML file also exists', async () => {
    writeFileSync(join(projectDir, 'esa.jsonc'), JSON.stringify(FULL_CONFIG));
    writeFileSync(
      join(projectDir, 'esa.toml'),
      toml.stringify({ name: 'wrong-toml-project', dev: { port: 19345 } })
    );
    const config = await readConfig();
    expect(config.project).toEqual(FULL_CONFIG);
    expect(config.devUrl).toBe('http://localhost:19341');
    expect(realpathSync(config.projectPath)).toBe(
      realpathSync(join(projectDir, 'esa.jsonc'))
    );
  });

  it('loads the parent project config when invoked from a nested directory', async () => {
    writeFileSync(join(projectDir, 'esa.jsonc'), JSON.stringify(FULL_CONFIG));
    const nested = join(projectDir, 'src', 'nested');
    mkdirSync(nested, { recursive: true });
    const config = await readConfig(nested);
    expect(config.project).toEqual(FULL_CONFIG);
    expect(config.devUrl).toBe('http://localhost:19341');
    expect(realpathSync(config.projectPath)).toBe(
      realpathSync(join(projectDir, 'esa.jsonc'))
    );
  });

  it('returns no project config and the default dev port when no file exists', async () => {
    const config = await readConfig();
    expect(config.project).toBeNull();
    expect(config.devUrl).toBe('http://localhost:18080');
  });

  it('passes the selected project name to the API when the CLI lists domains', async () => {
    writeFileSync(join(projectDir, 'esa.jsonc'), JSON.stringify(FULL_CONFIG));
    writeFileSync(
      join(projectDir, 'esa.toml'),
      toml.stringify({ name: 'wrong-toml-project' })
    );
    writeCredentials();
    const domain = 'config-contract.example.com';
    const cloud = await startCloudFixture({
      project: { name: FULL_CONFIG.name, domain },
      purchased: false
    });
    try {
      const result = await runCli(['domain', 'list'], {
        cwd: projectDir,
        env: { HOME: home, ESA_TEST_FIXTURE_PORT: cloud.port }
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(domain);
      expect(cloud.calls.slice(0, 2)).toEqual([
        'GetSubscriptionPlan',
        'GetErService'
      ]);
      expect(cloud.requests).toContainEqual({
        action: 'GetRoutine',
        projectName: FULL_CONFIG.name
      });
      expect(cloud.requests).toContainEqual({
        action: 'ListRoutineRelatedRecords',
        projectName: FULL_CONFIG.name
      });
    } finally {
      await cloud.close();
    }
  });
});

describe('CLI credentials configuration', () => {
  it('loads credentials, STS token and endpoint from the isolated HOME', async () => {
    writeCredentials();
    const config = await readConfig();
    expect(config.cli).toEqual(CLI_CONFIG);
    expect(config.api).toEqual({
      auth: CLI_CONFIG.auth,
      endpoint: CLI_CONFIG.endpoint
    });
  });

  it('uses empty API credentials when the credentials file is missing', async () => {
    const config = await readConfig();
    expect(config.cli).toBeNull();
    expect(config.api).toEqual({
      auth: { accessKeyId: '', accessKeySecret: '' },
      endpoint: 'esa.cn-hangzhou.aliyuncs.com'
    });
  });
});
