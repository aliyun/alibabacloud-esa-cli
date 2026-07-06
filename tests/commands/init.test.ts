import { it, describe, expect, vi, afterEach, beforeEach } from 'vitest';

import { handleInit } from '../../src/commands/init/index.js';

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { step: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

vi.mock('../../src/i18n/index.js', () => ({
  default: (key: string) => ({ d: (v: string) => v })
}));

vi.mock('../../src/utils/prompt.js', () => ({
  default: vi.fn().mockResolvedValue(false),
  promptParameter: vi.fn().mockResolvedValue(false)
}));

vi.mock('../../src/commands/common/utils.js', () => ({
  displayDeploySuccess: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/libs/logger.js', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    startSubStep: vi.fn(),
    endSubStep: vi.fn()
  }
}));

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
  generateConfigFile: vi.fn()
}));

vi.mock('../../src/utils/fileUtils/base.js', () => ({
  getRoot: vi.fn().mockReturnValue('/test/root'),
  getDirName: vi.fn().mockReturnValue('/test/dir')
}));

vi.mock('../../src/commands/init/helper.js', () => ({
  checkAndUpdatePackage: vi.fn().mockResolvedValue(undefined),
  getInitParamsFromArgv: vi.fn().mockReturnValue({ name: 'test-project' }),
  configProjectName: vi.fn().mockResolvedValue(undefined),
  configCategory: vi.fn().mockResolvedValue(undefined),
  configTemplate: vi.fn().mockResolvedValue(undefined),
  configLanguage: vi.fn().mockResolvedValue(undefined),
  createProject: vi.fn().mockResolvedValue(undefined),
  installDependencies: vi.fn().mockResolvedValue(undefined),
  applyFileEdits: vi.fn().mockResolvedValue(true),
  installESACli: vi.fn().mockResolvedValue(undefined),
  updateConfigFile: vi.fn().mockResolvedValue(undefined),
  initGit: vi.fn().mockResolvedValue(true),
  buildProject: vi.fn().mockResolvedValue(undefined),
  deployProject: vi.fn().mockResolvedValue(undefined)
}));

describe('handleInit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call all init steps in order', async () => {
    const helper = await import('../../src/commands/init/helper.js');

    await handleInit({ _: [], $0: '' });

    expect(helper.checkAndUpdatePackage).toHaveBeenCalledWith('esa-template');
    expect(helper.getInitParamsFromArgv).toHaveBeenCalled();
    expect(helper.configProjectName).toHaveBeenCalled();
    expect(helper.configCategory).toHaveBeenCalled();
    expect(helper.configTemplate).toHaveBeenCalled();
    expect(helper.createProject).toHaveBeenCalled();
    expect(helper.applyFileEdits).toHaveBeenCalled();
    expect(helper.installESACli).toHaveBeenCalled();
    expect(helper.updateConfigFile).toHaveBeenCalled();
    expect(helper.initGit).toHaveBeenCalled();
  });

  it('should pass argv to getInitParamsFromArgv', async () => {
    const helper = await import('../../src/commands/init/helper.js');

    const argv = { name: 'my-project', _: [], $0: '' };
    await handleInit(argv);

    expect(helper.getInitParamsFromArgv).toHaveBeenCalledWith(argv);
  });

  it('should call configLanguage when category is framework', async () => {
    const helper = await import('../../src/commands/init/helper.js');
    vi.mocked(helper.getInitParamsFromArgv).mockReturnValue({
      name: 'test-project',
      category: 'framework'
    });

    await handleInit({ _: [], $0: '' });

    expect(helper.configLanguage).toHaveBeenCalled();
  });

  it('should not call configLanguage when category is template', async () => {
    const helper = await import('../../src/commands/init/helper.js');
    vi.mocked(helper.getInitParamsFromArgv).mockReturnValue({
      name: 'test-project',
      category: 'template'
    });

    await handleInit({ _: [], $0: '' });

    expect(helper.configLanguage).not.toHaveBeenCalled();
  });

  it('should prompt for deploy when deploy is not set', async () => {
    const helper = await import('../../src/commands/init/helper.js');
    const { promptParameter } = await import('../../src/utils/prompt.js');
    vi.mocked(helper.getInitParamsFromArgv).mockReturnValue({
      name: 'test-project'
    });
    vi.mocked(promptParameter).mockResolvedValue(false);

    await handleInit({ _: [], $0: '' });

    expect(promptParameter).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'confirm'
      })
    );
  });

  it('should call deployProject when deploy is true', async () => {
    const helper = await import('../../src/commands/init/helper.js');
    const { promptParameter } = await import('../../src/utils/prompt.js');
    vi.mocked(helper.getInitParamsFromArgv).mockReturnValue({
      name: 'test-project',
      deploy: true
    });

    await handleInit({ _: [], $0: '' });

    expect(promptParameter).not.toHaveBeenCalled();
    expect(helper.buildProject).toHaveBeenCalled();
    expect(helper.deployProject).toHaveBeenCalled();
  });

  it('should not prompt for deploy when deploy is false', async () => {
    const helper = await import('../../src/commands/init/helper.js');
    const { promptParameter } = await import('../../src/utils/prompt.js');
    vi.mocked(helper.getInitParamsFromArgv).mockReturnValue({
      name: 'test-project',
      deploy: false
    });

    await handleInit({ _: [], $0: '' });

    expect(promptParameter).not.toHaveBeenCalled();
    expect(helper.buildProject).not.toHaveBeenCalled();
    expect(helper.deployProject).not.toHaveBeenCalled();
  });

  it('should skip deploy steps when user declines deploy', async () => {
    const helper = await import('../../src/commands/init/helper.js');
    const { promptParameter } = await import('../../src/utils/prompt.js');
    vi.mocked(helper.getInitParamsFromArgv).mockReturnValue({
      name: 'test-project'
    });
    vi.mocked(promptParameter).mockResolvedValue(false);

    await handleInit({ _: [], $0: '' });

    expect(helper.buildProject).not.toHaveBeenCalled();
    expect(helper.deployProject).not.toHaveBeenCalled();
  });

  it('should call displayDeploySuccess after successful deploy', async () => {
    const helper = await import('../../src/commands/init/helper.js');
    const { displayDeploySuccess } = await import(
      '../../src/commands/common/utils.js'
    );
    vi.mocked(helper.getInitParamsFromArgv).mockReturnValue({
      name: 'my-app',
      deploy: true
    });

    await handleInit({ _: [], $0: '' });

    expect(displayDeploySuccess).toHaveBeenCalledWith('my-app', true, true);
  });
});
