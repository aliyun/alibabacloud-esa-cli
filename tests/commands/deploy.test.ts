import { it, describe, expect, vi, afterEach, beforeEach } from 'vitest';

import * as commonUtils from '../../src/commands/common/utils.js';
import { handleDeploy } from '../../src/commands/deploy/index.js';
import * as fileUtils from '../../src/utils/fileUtils/index.js';

vi.mock('../../src/commands/common/utils.js');
vi.mock('../../src/utils/fileUtils/index.js', () => ({
  getProjectConfig: vi.fn(),
  getProjectConfigPath: vi.fn().mockReturnValue('/tmp/esa.jsonc'),
  projectConfigPath: '/tmp/esa.jsonc',
  cliConfigPath: '/tmp/config.toml',
  getCliConfig: vi.fn(),
  getCliConfigPath: vi.fn(),
  getTemplatesConfig: vi.fn(),
  templateHubPath: '/tmp',
  updateProjectConfigFile: vi.fn(),
  updateCliConfigFile: vi.fn(),
  generateConfigFile: vi.fn(),
  generateDefaultConfig: vi.fn()
}));
vi.mock('../../src/utils/fileUtils/base.js', () => ({
  getRoot: vi.fn().mockReturnValue('/test/root'),
  getDirName: vi.fn().mockReturnValue('/test/dir')
}));
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn()
}));
vi.mock('../../src/i18n/index.js', () => ({
  default: (key: string) => ({ d: (v: string) => v })
}));
vi.mock('../../src/libs/logger.js', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    startSubStep: vi.fn(),
    endSubStep: vi.fn()
  }
}));

async function callHandleDeploy(argv: any) {
  try {
    await handleDeploy(argv);
  } catch (e: any) {
    if (e?.message?.includes('process.exit')) return;
    throw e;
  }
}

describe('handleDeploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle deploy with default parameters', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({ _: [], $0: '' });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      '',
      '/test/root',
      'all',
      undefined,
      undefined,
      false
    );
    expect(commonUtils.displayDeploySuccess).toHaveBeenCalled();
  });

  it('should handle deploy with custom entry file', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project'
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({ entry: 'custom.js', _: [], $0: '' });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      undefined,
      'custom.js',
      undefined,
      '',
      '/test/root',
      'all',
      undefined,
      undefined,
      false
    );
  });

  it('should handle deploy with custom project name', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project'
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({ name: 'custom-name', _: [], $0: '' });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      'custom-name',
      undefined,
      undefined,
      '',
      '/test/root',
      'all',
      undefined,
      undefined,
      false
    );
    expect(commonUtils.displayDeploySuccess).toHaveBeenCalledWith(
      'custom-name',
      true,
      true
    );
  });

  it('should handle deploy with assets option', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project'
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({ assets: 'custom-assets', _: [], $0: '' });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      undefined,
      undefined,
      'custom-assets',
      '',
      '/test/root',
      'all',
      undefined,
      undefined,
      false
    );
  });

  it('should handle deploy with description', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project'
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({ description: 'Test deployment', _: [], $0: '' });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      'Test deployment',
      '/test/root',
      'all',
      undefined,
      undefined,
      false
    );
  });

  it('should handle deploy with environment option', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project'
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({ environment: 'staging', _: [], $0: '' });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      '',
      '/test/root',
      'staging',
      undefined,
      undefined,
      false
    );
  });

  it('should handle deploy with minify option', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project'
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({ minify: true, _: [], $0: '' });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      '',
      '/test/root',
      'all',
      true,
      undefined,
      false
    );
  });

  it('should handle deploy with version option', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project'
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({ version: 'v1.0.0', _: [], $0: '' });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      '',
      '/test/root',
      'all',
      undefined,
      'v1.0.0',
      false
    );
  });

  it('should handle deploy with all options', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(true);
    vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
      name: 'test-project'
    } as any);
    vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();

    await callHandleDeploy({
      entry: 'custom.js',
      name: 'custom-name',
      assets: 'custom-assets',
      description: 'Full deployment test',
      environment: 'production',
      minify: true,
      version: 'v2.0.0',
      _: [],
      $0: ''
    });

    expect(commonUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      'custom-name',
      'custom.js',
      'custom-assets',
      'Full deployment test',
      '/test/root',
      'production',
      true,
      'v2.0.0',
      false
    );
  });

  it('should not display success message if deployment fails', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(false);

    await callHandleDeploy({ _: [], $0: '' });

    expect(commonUtils.displayDeploySuccess).not.toHaveBeenCalled();
  });
});
