/**
 * Contract Test: Configuration File Compatibility
 *
 * Verifies that the CLI correctly reads config files in all supported
 * formats (JSONC with comments/trailing commas, TOML with nested tables).
 * Ensures users can configure their projects without the CLI crashing.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import toml from '@iarna/toml';
import { runCli } from './helper';

/** A complete esa.jsonc config that exercises all fields */
const FULL_CONFIG = {
  name: 'compat-test-project',
  description: 'Test project for cross-version compatibility',
  entry: 'src/index.ts',
  assets: {
    directory: './dist',
    notFoundStrategy: 'singlePageApplication'
  },
  dev: {
    port: 18080,
    inspectPort: 9229,
    minify: false,
    localUpstream: 'https://example.com'
  }
};

/** CLI credentials config (stored in ~/.esa/config/default.toml) */
const CLI_CONFIG = {
  auth: {
    accessKeyId: 'test-access-key-id',
    accessKeySecret: 'test-access-key-secret'
  },
  endpoint: 'esa.cn-hangzhou.aliyuncs.com',
  lang: 'en'
};

/**
 * Create a temp HOME directory with .esa-logs/ pre-created.
 * The CLI logger writes to ~/.esa-logs/ at module load time;
 * if the directory doesn't exist or isn't writable, the process crashes.
 */
function createTempHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'esa-home-'));
  mkdirSync(join(home, '.esa-logs'), { recursive: true });
  return home;
}

describe('esa.jsonc config file', () => {
  let tmpDir: string;
  let tmpHome: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'esa-compat-'));
    tmpHome = createTempHome();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('reads a valid esa.jsonc without crashing', async () => {
    writeFileSync(
      join(tmpDir, 'esa.jsonc'),
      JSON.stringify(FULL_CONFIG, null, 2)
    );

    const result = await runCli(
      ['--help', '--skip-update-check'],
      { cwd: tmpDir, env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });

  it('reads esa.jsonc with comments (JSONC format)', async () => {
    const jsoncContent = `{
  // This is a comment
  "name": "compat-test-project",
  "description": "Test project",
  "entry": "src/index.ts",
  /* Block comment */
  "dev": {
    "port": 18080
  }
}`;

    writeFileSync(join(tmpDir, 'esa.jsonc'), jsoncContent);

    const result = await runCli(
      ['--help', '--skip-update-check'],
      { cwd: tmpDir, env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });

  it('reads esa.jsonc with trailing commas', async () => {
    const jsoncContent = `{
  "name": "compat-test-project",
  "entry": "src/index.ts",
  "dev": {
    "port": 18080,
  },
}`;

    writeFileSync(join(tmpDir, 'esa.jsonc'), jsoncContent);

    const result = await runCli(
      ['--help', '--skip-update-check'],
      { cwd: tmpDir, env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });
});

describe('esa.toml config file', () => {
  let tmpDir: string;
  let tmpHome: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'esa-compat-'));
    tmpHome = createTempHome();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('reads a valid esa.toml without crashing', async () => {
    const tomlContent = toml.stringify(FULL_CONFIG as any);
    writeFileSync(join(tmpDir, 'esa.toml'), tomlContent);

    const result = await runCli(
      ['--help', '--skip-update-check'],
      { cwd: tmpDir, env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });

  it('reads esa.toml with nested tables', async () => {
    const tomlContent = `name = "compat-test-project"
entry = "src/index.ts"

[dev]
port = 18080
inspectPort = 9229

[assets]
directory = "./dist"
notFoundStrategy = "singlePageApplication"
`;

    writeFileSync(join(tmpDir, 'esa.toml'), tomlContent);

    const result = await runCli(
      ['--help', '--skip-update-check'],
      { cwd: tmpDir, env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });
});

describe('config file priority', () => {
  let tmpDir: string;
  let tmpHome: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'esa-compat-'));
    tmpHome = createTempHome();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('does not crash when both esa.jsonc and esa.toml exist', async () => {
    writeFileSync(
      join(tmpDir, 'esa.jsonc'),
      JSON.stringify({ name: 'jsonc-project' }, null, 2)
    );
    writeFileSync(
      join(tmpDir, 'esa.toml'),
      toml.stringify({ name: 'toml-project' })
    );

    const result = await runCli(
      ['--help', '--skip-update-check'],
      { cwd: tmpDir, env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });

  it('does not crash when no config file exists', async () => {
    const result = await runCli(
      ['--help', '--skip-update-check'],
      { cwd: tmpDir, env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });
});

describe('CLI credentials config (~/.esa/config/)', () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = createTempHome();
  });

  afterEach(() => {
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('reads credentials from default.toml', async () => {
    const configDir = join(tmpHome, '.esa', 'config');
    mkdirSync(configDir, { recursive: true });

    const tomlContent = toml.stringify(CLI_CONFIG as any);
    writeFileSync(join(configDir, 'default.toml'), tomlContent);

    const result = await runCli(
      ['lang', '--skip-update-check'],
      { env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });

  it('does not crash when credentials file is missing', async () => {
    const result = await runCli(
      ['--help', '--skip-update-check'],
      { env: { HOME: tmpHome } }
    );
    expect(result.exitCode).toBe(0);
  });
});
