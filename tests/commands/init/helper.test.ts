import { execSync } from 'child_process';

import { confirm as clackConfirm, isCancel, log, outro } from '@clack/prompts';
import fs from 'fs-extra';
import { it, describe, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  applyFileEdits,
  buildProject,
  checkAndUpdatePackage,
  configCategory,
  configLanguage,
  configProjectName,
  configTemplate,
  deployProject,
  getAllFrameworkConfig,
  getFrameworkConfig,
  getGitVersion,
  getInitParamsFromArgv,
  getTemplateInstances,
  initGit,
  initializeProject,
  installDependencies,
  installESACli,
  isGitInstalled,
  prepareTemplateItems,
  preInstallDependencies,
  transferTemplatesToSelectItem,
  updateConfigFile
} from '../../../src/commands/init/helper.js';
import { commitAndDeployVersion } from '../../../src/commands/common/utils.js';
import { execCommand } from '../../../src/utils/command.js';
import {
  generateConfigFile,
  getCliConfig,
  getProjectConfig,
  getTemplatesConfig,
  updateProjectConfigFile
} from '../../../src/utils/fileUtils/index.js';
import promptParameter from '../../../src/utils/prompt.js';

const templateMocks = vi.hoisted(() => ({
  constructor: vi.fn()
}));

vi.mock('child_process');
vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  log: {
    step: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  },
  outro: vi.fn()
}));
vi.mock('fs-extra', () => ({
  default: {
    removeSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    copy: vi.fn(),
    ensureDirSync: vi.fn(),
    writeFileSync: vi.fn()
  },
  removeSync: vi.fn(),
  readdirSync: vi.fn(),
  copy: vi.fn()
}));
vi.mock('haikunator', () => ({
  default: class MockHaikunator {
    haikunate() {
      return 'quiet-wave';
    }
  }
}));
vi.mock('../../../src/utils/command.js', () => ({
  execCommand: vi.fn(),
  execWithLoginShell: vi.fn()
}));
vi.mock('../../../src/utils/prompt.js', () => ({
  default: vi.fn()
}));
vi.mock('../../../src/commands/common/utils.js', () => ({
  commitAndDeployVersion: vi.fn()
}));
vi.mock('../../../src/libs/templates/index.js', () => ({
  default: class MockTemplate {
    path: string;
    title: string;

    constructor(templatePath: string, title: string) {
      templateMocks.constructor(templatePath, title);
      this.path = templatePath;
      this.title = title;
    }
  }
}));
vi.mock('../../../src/libs/logger.js', () => {
  const ora = {
    text: '',
    start: vi.fn(),
    stop: vi.fn(),
    fail: vi.fn()
  };
  return {
    default: {
      log: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      block: vi.fn(),
      tree: vi.fn(),
      startSubStep: vi.fn(),
      endSubStep: vi.fn(),
      notInProject: vi.fn(),
      ora,
      stopSpinner: vi.fn(),
      divider: vi.fn()
    }
  };
});
vi.mock('../../../src/i18n/index.js', () => ({
  default: (key: string, params?: any) => ({
    d: (defaultValue: string) => defaultValue
  })
}));
vi.mock('../../../src/utils/fileUtils/base.js', () => ({
  getDirName: () => '/test/dir',
  getRoot: () => '/test/root'
}));
vi.mock('../../../src/utils/fileUtils/index.js', () => ({
  getProjectConfig: vi.fn(),
  getProjectConfigPath: vi.fn(),
  getCliConfig: vi.fn(),
  getTemplatesConfig: vi.fn(),
  templateHubPath: '/tmp',
  generateConfigFile: vi.fn(),
  updateProjectConfigFile: vi.fn()
}));

const mockExecSync = vi.mocked(execSync);
const mockClackConfirm = vi.mocked(clackConfirm);
const mockExecCommand = vi.mocked(execCommand);
const mockPromptParameter = vi.mocked(promptParameter);
const mockFs = vi.mocked(fs);
const mockGetProjectConfig = vi.mocked(getProjectConfig);
const mockGenerateConfigFile = vi.mocked(generateConfigFile);
const mockUpdateProjectConfigFile = vi.mocked(updateProjectConfigFile);
const mockCommitAndDeployVersion = vi.mocked(commitAndDeployVersion);

const frameworkConfig = {
  react: {
    label: 'React',
    command: 'npm create vite',
    useGit: true,
    language: {
      typescript: '-- --template react-ts',
      javascript: '-- --template react'
    },
    assets: {
      directory: './dist',
      notFoundStrategy: 'singlePageApplication'
    },
    fileEdits: [
      {
        match: 'next.config.ts',
        matchType: 'exact',
        action: 'overwrite',
        content: 'exact content'
      },
      {
        match: '*.config.js',
        matchType: 'glob',
        action: 'overwrite',
        content: 'glob content',
        when: { language: 'typescript' }
      },
      {
        match: 'route-[0-9]+\\.ts',
        matchType: 'regex',
        action: 'overwrite',
        content: 'regex content'
      }
    ]
  },
  astro: {
    label: 'Astro',
    command: 'npm create astro',
    useGit: false,
    assets: {
      directory: './out'
    }
  }
};

function mockFrameworkConfig() {
  mockFs.readFileSync.mockReturnValue(JSON.stringify(frameworkConfig));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockExecSync.mockReset();
  mockExecCommand.mockReset();
  mockPromptParameter.mockReset();
  mockClackConfirm.mockReset();
  mockFs.existsSync.mockReset();
  mockFs.readdirSync.mockReset();
  mockFs.statSync.mockReset();
  mockFs.readFileSync.mockReset();
  mockFs.copy.mockReset();
  mockFs.ensureDirSync.mockReset();
  mockFs.writeFileSync.mockReset();
  templateMocks.constructor.mockReset();
  mockGetProjectConfig.mockReset();
  mockGenerateConfigFile.mockReset();
  mockUpdateProjectConfigFile.mockReset();
  mockCommitAndDeployVersion.mockReset();
  vi.mocked(getCliConfig).mockReset();
  vi.mocked(getTemplatesConfig).mockReset();
  vi.mocked(isCancel).mockReset();
  vi.mocked(isCancel).mockReturnValue(false);
  mockFrameworkConfig();
  mockFs.existsSync.mockReturnValue(false);
  mockFs.readdirSync.mockReturnValue([]);
  mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
  mockFs.copy.mockResolvedValue(undefined);
  mockFs.ensureDirSync.mockReturnValue(undefined);
  mockFs.writeFileSync.mockReturnValue(undefined);
  mockExecCommand.mockResolvedValue({
    success: true,
    stdout: 'git version 2.40.0'
  } as any);
  mockPromptParameter.mockResolvedValue(undefined as never);
  mockGetProjectConfig.mockReturnValue({ name: 'template-project' } as any);
  mockGenerateConfigFile.mockResolvedValue(undefined);
  mockUpdateProjectConfigFile.mockResolvedValue(undefined);
  mockCommitAndDeployVersion.mockResolvedValue(true);
  vi.mocked(getCliConfig).mockReturnValue({ lang: 'en' } as any);
  vi.mocked(getTemplatesConfig).mockReturnValue([]);
});

afterEach(() => {
  if (vi.isMockFunction(process.cwd)) {
    vi.mocked(process.cwd).mockRestore();
  }
  vi.clearAllMocks();
});

describe('checkAndUpdatePackage', () => {
  it('should update package when current version is different from latest version and user confirms', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('test-package@1.0.0'))
      .mockReturnValueOnce(Buffer.from('2.0.0'));

    mockClackConfirm.mockResolvedValue(true);
    mockExecSync.mockReturnValueOnce(Buffer.from(''));

    await checkAndUpdatePackage(packageName);

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm list ${packageName}`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm view ${packageName} version`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockClackConfirm).toHaveBeenCalled();

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm install ${packageName}@latest`,
      expect.objectContaining({
        cwd: expect.any(String),
        stdio: 'inherit'
      })
    );
  });

  it('should not update package when current version is same as latest version', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('test-package@1.0.0'))
      .mockReturnValueOnce(Buffer.from('1.0.0'));

    await checkAndUpdatePackage(packageName);

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm list ${packageName}`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm view ${packageName} version`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockClackConfirm).not.toHaveBeenCalled();
  });

  it('should not update package when user declines the update', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('test-package@1.0.0'))
      .mockReturnValueOnce(Buffer.from('2.0.0'));

    mockClackConfirm.mockResolvedValue(false);

    await checkAndUpdatePackage(packageName);

    expect(mockClackConfirm).toHaveBeenCalled();

    expect(mockExecSync).not.toHaveBeenCalledWith(
      `npm install ${packageName}@latest`,
      expect.any(Object)
    );
  });

  it('should handle npm list error and reinstall package', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockImplementationOnce(() => {
        throw new Error('Package not found');
      })
      .mockReturnValueOnce(Buffer.from(''));

    await checkAndUpdatePackage(packageName);

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm install ${packageName}@latest`,
      expect.objectContaining({
        cwd: expect.any(String),
        stdio: 'inherit'
      })
    );

    expect(mockClackConfirm).not.toHaveBeenCalled();
  });

  it('should handle general errors gracefully', async () => {
    const packageName = 'test-package';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecSync.mockImplementation(() => {
      throw new Error('Network error');
    });

    await checkAndUpdatePackage(packageName);

    const logger = (await import('../../../src/libs/logger.js')).default;
    expect(logger.ora.fail).toHaveBeenCalledWith(
      expect.stringContaining(
        'An error occurred while checking and updating the package'
      )
    );

    consoleSpy.mockRestore();
  });

  it('should handle version parsing when npm list output format is different', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('└── test-package@1.0.0'))
      .mockReturnValueOnce(Buffer.from('2.0.0'));

    mockClackConfirm.mockResolvedValue(true);
    mockExecSync.mockReturnValueOnce(Buffer.from(''));

    await checkAndUpdatePackage(packageName);

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm list ${packageName}`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm view ${packageName} version`,
      expect.objectContaining({ cwd: expect.any(String) })
    );
  });

  it('should handle empty version string from npm list', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('test-package'))
      .mockReturnValueOnce(Buffer.from('2.0.0'));

    mockClackConfirm.mockResolvedValue(true);
    mockExecSync.mockReturnValueOnce(Buffer.from(''));

    await checkAndUpdatePackage(packageName);

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm list ${packageName}`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm view ${packageName} version`,
      expect.objectContaining({ cwd: expect.any(String) })
    );
  });

  it('should handle error when npm list error', async () => {
    const packageName = 'test-package';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecSync.mockImplementation(() => {
      throw new Error('Network error');
    });

    await checkAndUpdatePackage(packageName);

    const logger = (await import('../../../src/libs/logger.js')).default;
    expect(logger.ora.fail).toHaveBeenCalledWith(
      expect.stringContaining(
        'An error occurred while checking and updating the package'
      )
    );

    consoleSpy.mockRestore();
  });
});

describe('init helper parameter flow', () => {
  it('should build init params from yes mode and explicit argv overrides', () => {
    const params = getInitParamsFromArgv({
      yes: true,
      name: 'custom-name',
      git: false,
      deploy: false,
      'install-esa-cli': true,
      _: [],
      $0: ''
    });

    expect(params).toEqual({
      name: 'custom-name',
      git: false,
      deploy: false,
      template: 'Hello World',
      framework: undefined,
      language: undefined,
      yes: true,
      installEsaCli: true
    });
  });

  it('should prefer template category over framework argv', () => {
    const params = getInitParamsFromArgv({
      template: 'Hello World',
      framework: 'react',
      language: 'typescript',
      _: [],
      $0: ''
    });

    expect(params).toMatchObject({
      name: '',
      template: 'Hello World',
      framework: undefined,
      language: undefined,
      category: 'template'
    });
  });

  it('should keep an existing project name without prompting', async () => {
    const params = { name: 'configured-name' };

    await configProjectName(params);

    expect(promptParameter).not.toHaveBeenCalled();
    expect(log.step).toHaveBeenCalledWith(
      'Project name configured configured-name'
    );
  });

  it('should use generated default name when prompt returns an empty name', async () => {
    const params = { name: '' };
    mockPromptParameter.mockResolvedValue('');

    await configProjectName(params);

    expect(params.name).toBe('quiet-wave');
  });

  it('should prompt for init category when it is not configured', async () => {
    const params = { name: 'demo' };
    mockPromptParameter.mockResolvedValue('framework');

    await configCategory(params);

    expect(params.category).toBe('framework');
  });

  it('should prompt and store template selection for template category', async () => {
    const params = { name: 'demo', category: 'template' } as any;
    mockPromptParameter.mockResolvedValue('/templates/hello-world');

    await configTemplate(params);

    expect(params.template).toBe('/templates/hello-world');
  });

  it('should prompt framework selection from framework config', async () => {
    const params = { name: 'demo', category: 'framework' } as any;
    mockPromptParameter.mockResolvedValue('react');

    await configTemplate(params);

    expect(params.framework).toBe('react');
    expect(promptParameter).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'select',
        label: 'Framework'
      })
    );
  });

  it('should prompt language only for frameworks with language choices', async () => {
    const params = { name: 'demo', framework: 'react' } as any;
    mockPromptParameter.mockResolvedValue('javascript');

    await configLanguage(params);

    expect(params.language).toBe('javascript');
  });

  it('should skip language prompt when framework is missing', async () => {
    const params = { name: 'demo' };

    await configLanguage(params);

    expect(promptParameter).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(
      'Framework config not configured, language skipped'
    );
  });
});

describe('template and framework config helpers', () => {
  it('should read one framework config and all framework config', () => {
    expect(getFrameworkConfig('react')).toEqual(frameworkConfig.react);
    expect(getAllFrameworkConfig()).toEqual(frameworkConfig);
  });

  it('should create template instances from valid template directories', () => {
    mockFs.readdirSync.mockReturnValue([
      'hello',
      '.git',
      'node_modules',
      'plain-file'
    ] as any);
    mockFs.statSync.mockImplementation((itemPath: any) => ({
      isDirectory: () => !String(itemPath).includes('plain-file')
    }));
    mockGetProjectConfig.mockImplementation((projectPath: any) => ({
      name: String(projectPath).endsWith('/hello') ? 'Hello World' : 'Ignored'
    }) as any);

    expect(getTemplateInstances('/templates')).toEqual([
      { path: '/templates/hello', title: 'Hello World' }
    ]);
    expect(templateMocks.constructor).toHaveBeenCalledWith(
      '/templates/hello',
      'Hello World'
    );
  });

  it('should transfer template manifest config to select items', () => {
    const result = transferTemplatesToSelectItem(
      [
        {
          Title_EN: 'Hello World',
          Title_ZH: '你好世界',
          Desc_EN: 'Starter',
          Desc_ZH: '入门',
          URL: '',
          children: [
            {
              Title_EN: 'Child',
              Title_ZH: '子项',
              Desc_EN: 'Child starter',
              Desc_ZH: '子入门',
              URL: '',
              children: []
            }
          ]
        }
      ],
      [
        { title: 'Hello World', path: '/templates/hello' },
        { title: 'Child', path: '/templates/child' }
      ] as any,
      'zh'
    );

    expect(result).toEqual([
      {
        label: '你好世界',
        value: '/templates/hello',
        hint: '入门',
        children: [
          {
            label: '子项',
            value: '/templates/child',
            hint: '子入门',
            children: []
          }
        ]
      }
    ]);
  });

  it('should prepare template items using cli language preference', () => {
    vi.mocked(getCliConfig).mockReturnValue({ lang: 'en' } as any);
    vi.mocked(getTemplatesConfig).mockReturnValue([
      {
        Title_EN: 'Hello World',
        Title_ZH: '你好世界',
        Desc_EN: 'Starter',
        Desc_ZH: '入门',
        URL: '',
        children: []
      }
    ] as any);
    mockFs.readdirSync.mockReturnValue(['hello'] as any);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockGetProjectConfig.mockReturnValue({ name: 'Hello World' } as any);

    expect(prepareTemplateItems()).toEqual([
      {
        label: 'Hello World',
        value: '/tmp/hello',
        hint: 'Starter',
        children: []
      }
    ]);
  });
});

describe('project creation helpers', () => {
  it('should install and build template dependencies when package.json has build script', async () => {
    mockFs.existsSync.mockImplementation((target: any) =>
      String(target).endsWith('package.json') || String(target).endsWith('dist')
    );
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockFs.readFileSync.mockImplementation((target: any) => {
      if (String(target).endsWith('package.json')) {
        return JSON.stringify({ scripts: { build: 'vite build' } });
      }
      return JSON.stringify(frameworkConfig);
    });
    mockGetProjectConfig.mockReturnValue({ name: 'demo' } as any);

    await preInstallDependencies('/workspace/demo');

    expect(mockExecSync).toHaveBeenCalledWith('npm install', {
      stdio: 'inherit',
      cwd: '/workspace/demo'
    });
    expect(mockExecSync).toHaveBeenCalledWith('npm run build', {
      stdio: 'inherit',
      cwd: '/workspace/demo'
    });
    expect(mockUpdateProjectConfigFile).toHaveBeenCalledWith(
      { assets: { directory: 'dist' } },
      '/workspace/demo'
    );
  });

  it('should skip dependency installation when package.json is missing', async () => {
    mockFs.existsSync.mockReturnValue(false);

    await preInstallDependencies('/workspace/demo');

    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('should initialize a template project and update copied project config', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    mockFs.existsSync.mockReturnValue(false);
    const projectConfig = { name: 'template-name', entry: 'index.ts' };
    mockGetProjectConfig.mockReturnValue(projectConfig as any);

    const result = await initializeProject('/templates/hello', 'demo');

    expect(result).toEqual({
      template: { path: '/templates/hello', title: 'demo' },
      targetPath: '/workspace/demo'
    });
    expect(mockFs.copy).toHaveBeenCalledWith(
      '/templates/hello',
      '/workspace/demo'
    );
    expect(mockUpdateProjectConfigFile).toHaveBeenCalledWith(
      { name: 'demo', entry: 'index.ts' },
      '/workspace/demo'
    );
  });

  it('should return null when selected template has no project config', async () => {
    mockGetProjectConfig.mockReturnValue(null);

    await expect(initializeProject('/templates/empty', 'demo')).resolves.toBe(
      null
    );

    const logger = (await import('../../../src/libs/logger.js')).default;
    expect(logger.notInProject).toHaveBeenCalled();
  });

  it('should return null when target directory already exists', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    mockGetProjectConfig.mockReturnValue({ name: 'template' } as any);
    mockFs.existsSync.mockReturnValue(true);

    await expect(initializeProject('/templates/hello', 'demo')).resolves.toBe(
      null
    );

    expect(mockFs.copy).not.toHaveBeenCalled();
  });
});

describe('post scaffold helpers', () => {
  it('should skip dependency install for template projects', async () => {
    await installDependencies({ name: 'demo', template: 'Hello World' });

    expect(execCommand).not.toHaveBeenCalled();
  });

  it('should install dependencies for framework projects', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');

    await installDependencies({ name: 'demo', framework: 'react' });

    expect(execCommand).toHaveBeenCalledWith(
      ['npm', 'install'],
      expect.objectContaining({
        cwd: '/workspace/demo',
        startText: 'Installing dependencies'
      })
    );
  });

  it('should apply exact, glob, regex, and create-if-missing file edits', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    mockFs.readdirSync.mockReturnValue([
      'vite.config.js',
      'route-1.ts',
      'ignored.txt'
    ] as any);
    mockFs.existsSync.mockImplementation((target: any) => {
      const value = String(target);
      return (
        value.endsWith('vite.config.js') ||
        value.endsWith('route-1.ts')
      );
    });

    await expect(
      applyFileEdits({
        name: 'demo',
        framework: 'react',
        language: 'typescript'
      })
    ).resolves.toBe(true);

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      '/workspace/demo/next.config.ts',
      'exact content',
      'utf-8'
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      '/workspace/demo/vite.config.js',
      'glob content',
      'utf-8'
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      '/workspace/demo/route-1.ts',
      'regex content',
      'utf-8'
    );
  });

  it('should prompt before installing esa-cli when flag is not provided', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    mockPromptParameter.mockResolvedValue(true);
    const params = { name: 'demo' };

    await installESACli(params);

    expect(params).toEqual({ name: 'demo', installEsaCli: true });
    expect(execCommand).toHaveBeenCalledWith(
      ['npm', 'install', '-D', 'esa-cli'],
      expect.objectContaining({
        cwd: '/workspace/demo',
        startText: 'Installing ESA CLI'
      })
    );
  });

  it('should skip installing esa-cli when disabled', async () => {
    await installESACli({ name: 'demo', installEsaCli: false });

    expect(execCommand).not.toHaveBeenCalled();
  });

  it('should generate framework config file with assets config', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');

    await updateConfigFile({ name: 'demo', framework: 'react' });

    expect(mockGenerateConfigFile).toHaveBeenCalledWith(
      'demo',
      { assets: { directory: './dist' } },
      '/workspace/demo',
      'jsonc',
      'singlePageApplication'
    );
  });

  it('should skip config generation for template projects', async () => {
    await updateConfigFile({ name: 'demo', template: 'Hello World' });

    expect(mockGenerateConfigFile).not.toHaveBeenCalled();
  });
});

describe('git, build, and deploy helpers', () => {
  it('should parse git version', async () => {
    mockExecCommand.mockResolvedValue({
      success: true,
      stdout: 'git version 2.40.0'
    } as any);

    await expect(getGitVersion()).resolves.toBe('2.40.0');
  });

  it('should return null when git version command fails', async () => {
    mockExecCommand.mockRejectedValue(new Error('missing git'));

    await expect(getGitVersion()).resolves.toBeNull();
    expect(log.error).toHaveBeenCalledWith('Failed to get Git version');
  });

  it('should check git installation with one git version command', async () => {
    await expect(isGitInstalled()).resolves.toBe(true);

    expect(mockExecCommand).toHaveBeenCalledTimes(1);
    expect(mockExecCommand).toHaveBeenCalledWith(
      ['git', '--version'],
      expect.objectContaining({ captureOutput: true })
    );
  });

  it('should skip git init when framework config disables git', async () => {
    await expect(
      initGit({ name: 'demo', framework: 'astro', git: true })
    ).resolves.toBe(true);

    expect(log.step).toHaveBeenCalledWith('Git skipped');
    expect(mockExecCommand).not.toHaveBeenCalled();
  });

  it('should initialize git and write a default gitignore', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    mockFs.existsSync.mockReturnValue(false);

    await expect(
      initGit({ name: 'demo', framework: 'react', git: true })
    ).resolves.toBe(true);

    expect(mockExecCommand).toHaveBeenCalledWith(
      ['git', 'init'],
      expect.objectContaining({ cwd: '/workspace/demo' })
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      '/workspace/demo/.gitignore',
      expect.stringContaining('node_modules/'),
      'utf-8'
    );
  });

  it('should skip build for template projects', async () => {
    await buildProject({ name: 'demo', template: 'Hello World' });

    expect(execCommand).not.toHaveBeenCalled();
  });

  it('should build framework projects', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');

    await buildProject({ name: 'demo', framework: 'react' });

    expect(execCommand).toHaveBeenCalledWith(
      ['npm', 'run', 'build'],
      expect.objectContaining({
        cwd: '/workspace/demo',
        startText: 'Building project'
      })
    );
  });

  it('should skip deploy when deploy flag is false', async () => {
    await deployProject({ name: 'demo', deploy: false });

    expect(log.step).toHaveBeenCalledWith('Deploy project skipped');
    expect(commitAndDeployVersion).not.toHaveBeenCalled();
  });

  it('should deploy initialized project to all environments', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');

    await deployProject({ name: 'demo', deploy: true });

    expect(mockCommitAndDeployVersion).toHaveBeenCalledWith(
      'demo',
      undefined,
      undefined,
      'Init project',
      '/workspace/demo',
      'all'
    );
  });
});
