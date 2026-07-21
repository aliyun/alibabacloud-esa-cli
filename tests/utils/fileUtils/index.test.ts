import fs from 'fs';
import os from 'os';
import path from 'path';

import toml from '@iarna/toml';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

const mockLogger = {
  error: vi.fn(),
  pathEacces: vi.fn()
};

function makeTempDir(prefix = 'esa-cli-file-utils-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function loadFileUtils(options: { cwd?: string; home?: string } = {}) {
  const cwd = options.cwd ?? makeTempDir();
  const home = options.home ?? makeTempDir('esa-cli-home-');

  process.chdir(cwd);
  vi.resetModules();
  vi.doUnmock('../../../src/utils/fileUtils/index.js');
  vi.spyOn(os, 'homedir').mockReturnValue(home);
  vi.doMock('../../../src/libs/logger.js', () => ({
    default: mockLogger
  }));
  vi.doMock('../../../src/i18n/index.js', () => ({
    default: () => ({
      d: (defaultValue: string) => defaultValue
    })
  }));

  return await import('../../../src/utils/fileUtils/index.js');
}

afterEach(() => {
  process.chdir(originalCwd);
  delete process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  delete process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
  delete process.env.ALIBABA_CLOUD_SECURITY_TOKEN;
  vi.restoreAllMocks();
  vi.resetModules();
  mockLogger.error.mockClear();
  mockLogger.pathEacces.mockClear();

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('fileUtils config paths', () => {
  it('prefers esa.jsonc over esa.toml for project config paths', async () => {
    const projectRoot = makeTempDir();
    fs.writeFileSync(path.join(projectRoot, 'esa.toml'), 'name = "toml"\n');
    fs.writeFileSync(path.join(projectRoot, 'esa.jsonc'), '{"name":"jsonc"}');

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.getProjectConfigPath(projectRoot)).toBe(
      path.join(projectRoot, 'esa.jsonc')
    );
  });

  it('falls back to esa.jsonc when no project config exists', async () => {
    const projectRoot = makeTempDir();
    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.getProjectConfigPath(projectRoot)).toBe(
      path.join(projectRoot, 'esa.jsonc')
    );
  });

  it('prefers default.jsonc over default.toml for cli config paths', async () => {
    const projectRoot = makeTempDir();
    const home = makeTempDir('esa-cli-home-');
    const configDir = path.join(home, '.esa', 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'default.toml'), 'endpoint = "toml"');
    fs.writeFileSync(path.join(configDir, 'default.jsonc'), '{}');

    const fileUtils = await loadFileUtils({ cwd: projectRoot, home });

    expect(fileUtils.getCliConfigPath()).toBe(
      path.join(configDir, 'default.jsonc')
    );
  });
});

describe('fileUtils config readers and writers', () => {
  it('reads JSONC config with comments and trailing commas', async () => {
    const projectRoot = makeTempDir();
    const configPath = path.join(projectRoot, 'esa.jsonc');
    fs.writeFileSync(
      configPath,
      `{
        // project name
        "name": "jsonc-project",
        "dev": { "port": 18081, },
      }`
    );

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.readConfigFile(configPath)).toEqual({
      name: 'jsonc-project',
      dev: { port: 18081 }
    });
  });

  it('reads TOML config files', async () => {
    const projectRoot = makeTempDir();
    const configPath = path.join(projectRoot, 'esa.toml');
    fs.writeFileSync(
      configPath,
      'name = "toml-project"\nendpoint = "example.com"\n'
    );

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.readConfigFile(configPath)).toEqual({
      name: 'toml-project',
      endpoint: 'example.com'
    });
  });

  it('updates JSONC project config by preserving merged values', async () => {
    const projectRoot = makeTempDir();
    fs.writeFileSync(
      path.join(projectRoot, 'esa.jsonc'),
      `{
        "name": "old-name",
        "dev": { "port": 18080, },
      }`
    );

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    await fileUtils.updateProjectConfigFile(
      { name: 'new-name', endpoint: 'edge.example.com' },
      projectRoot
    );

    expect(
      JSON.parse(fs.readFileSync(path.join(projectRoot, 'esa.jsonc'), 'utf-8'))
    ).toEqual({
      name: 'new-name',
      dev: { port: 18080 },
      endpoint: 'edge.example.com'
    });
  });

  it('updates TOML project config', async () => {
    const projectRoot = makeTempDir();
    fs.writeFileSync(
      path.join(projectRoot, 'esa.toml'),
      'name = "old-name"\nendpoint = "old.example.com"\n'
    );

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    await fileUtils.updateProjectConfigFile(
      { endpoint: 'new.example.com' },
      projectRoot
    );

    expect(
      toml.parse(fs.readFileSync(path.join(projectRoot, 'esa.toml'), 'utf-8'))
    ).toEqual({
      name: 'old-name',
      endpoint: 'new.example.com'
    });
  });

  it('updates JSONC cli config under the mocked home directory', async () => {
    const projectRoot = makeTempDir();
    const home = makeTempDir('esa-cli-home-');
    const configDir = path.join(home, '.esa', 'config');
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, 'default.jsonc');
    fs.writeFileSync(
      configPath,
      `{
        "auth": { "accessKeyId": "old-id", },
      }`
    );

    const fileUtils = await loadFileUtils({ cwd: projectRoot, home });

    await fileUtils.updateCliConfigFile({
      endpoint: 'cli.example.com'
    });

    expect(JSON.parse(fs.readFileSync(configPath, 'utf-8'))).toEqual({
      auth: { accessKeyId: 'old-id' },
      endpoint: 'cli.example.com'
    });
  });

  it('returns null when config file is missing', async () => {
    const projectRoot = makeTempDir();
    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.readConfigFile(path.join(projectRoot, 'missing.toml'))).toBe(
      null
    );
  });
});

describe('fileUtils project helpers', () => {
  it('gets project config from jsonc before toml', async () => {
    const projectRoot = makeTempDir();
    fs.writeFileSync(path.join(projectRoot, 'esa.toml'), 'name = "toml"\n');
    fs.writeFileSync(path.join(projectRoot, 'esa.jsonc'), '{"name":"jsonc"}');

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.getProjectConfig(projectRoot)).toEqual({ name: 'jsonc' });
  });

  it('reads the generated edge routine file when it exists', async () => {
    const projectRoot = makeTempDir();
    const devDir = path.join(projectRoot, '.dev');
    fs.mkdirSync(devDir);
    fs.writeFileSync(path.join(devDir, 'pub.js'), 'export default {};');

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.readEdgeRoutineFile(projectRoot)).toBe(
      'export default {};'
    );
  });

  it('generates jsonc and toml project config files', async () => {
    const jsonProject = makeTempDir();
    const tomlProject = makeTempDir();

    const fileUtils = await loadFileUtils({ cwd: jsonProject });

    await fileUtils.generateConfigFile(
      'json-project',
      {
        dev: { entry: 'src/index.ts' },
        assets: { directory: 'dist' },
        port: 18082
      } as any,
      jsonProject,
      'jsonc',
      'SinglePageApplication'
    );
    await fileUtils.generateConfigFile(
      'toml-project',
      {
        dev: { entry: 'src/worker.ts' },
        assets: { directory: 'public' },
        port: 18083
      } as any,
      tomlProject,
      'toml',
      'RedirectToIndex'
    );

    expect(
      JSON.parse(fs.readFileSync(path.join(jsonProject, 'esa.jsonc'), 'utf-8'))
    ).toEqual({
      name: 'json-project',
      entry: 'src/index.ts',
      assets: {
        directory: 'dist',
        notFoundStrategy: 'SinglePageApplication'
      },
      dev: { port: 18082 }
    });
    expect(
      toml.parse(fs.readFileSync(path.join(tomlProject, 'esa.toml'), 'utf-8'))
    ).toEqual({
      name: 'toml-project',
      entry: 'src/worker.ts',
      assets: {
        directory: 'public',
        notFoundStrategy: 'RedirectToIndex'
      },
      dev: { port: 18083 }
    });
  });

  it('does not overwrite an existing generated config file', async () => {
    const projectRoot = makeTempDir();
    const configPath = path.join(projectRoot, 'esa.jsonc');
    fs.writeFileSync(configPath, '{"name":"existing"}');

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    await fileUtils.generateConfigFile('new-name', {}, projectRoot);

    expect(fs.readFileSync(configPath, 'utf-8')).toBe('{"name":"existing"}');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('esa.jsonc')
    );
  });
});

describe('fileUtils value helpers', () => {
  it('uses global, config, then default values in order', async () => {
    const fileUtils = await loadFileUtils();

    expect(fileUtils.getConfigValue('global', 'config', 'default')).toBe(
      'global'
    );
    expect(fileUtils.getConfigValue(undefined, 'config', 'default')).toBe(
      'config'
    );
    expect(fileUtils.getConfigValue(undefined, undefined, 'default')).toBe(
      'default'
    );
  });

  it('gets dev config from project config and global overrides', async () => {
    const projectRoot = makeTempDir();
    fs.writeFileSync(
      path.join(projectRoot, 'esa.jsonc'),
      '{"name":"project","dev":{"port":19090}}'
    );

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.getDevConf('port', 'dev', 18080)).toBe(19090);
    expect(fileUtils.getDevOpenBrowserUrl()).toBe('http://localhost:19090');

    (globalThis as any).port = 20000;
    expect(fileUtils.getDevConf('port', 'dev', 18080)).toBe(20000);
    delete (globalThis as any).port;
  });

  it('builds api config from environment credentials and project endpoint', async () => {
    const projectRoot = makeTempDir();
    fs.writeFileSync(
      path.join(projectRoot, 'esa.jsonc'),
      '{"name":"project","endpoint":"project.example.com"}'
    );
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID = 'env-id';
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET = 'env-secret';
    process.env.ALIBABA_CLOUD_SECURITY_TOKEN = 'env-token';

    const fileUtils = await loadFileUtils({ cwd: projectRoot });

    expect(fileUtils.getApiConfig()).toEqual({
      auth: {
        accessKeyId: 'env-id',
        accessKeySecret: 'env-secret',
        securityToken: 'env-token'
      },
      endpoint: 'project.example.com'
    });

    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
    delete process.env.ALIBABA_CLOUD_SECURITY_TOKEN;
  });

  it('builds api config by merging cli and project config', async () => {
    const projectRoot = makeTempDir();
    const home = makeTempDir('esa-cli-home-');
    const configDir = path.join(home, '.esa', 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'default.toml'),
      [
        'endpoint = "cli.example.com"',
        '[auth]',
        'accessKeyId = "cli-id"',
        'accessKeySecret = "cli-secret"'
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(projectRoot, 'esa.jsonc'),
      '{"name":"project","endpoint":"project.example.com"}'
    );

    const fileUtils = await loadFileUtils({ cwd: projectRoot, home });

    expect(fileUtils.getApiConfig()).toEqual({
      auth: {
        accessKeyId: 'cli-id',
        accessKeySecret: 'cli-secret',
        securityToken: undefined
      },
      endpoint: 'project.example.com'
    });
  });
});
