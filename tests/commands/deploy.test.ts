import { it, describe, expect, vi, afterEach, beforeEach } from 'vitest';
import yargs from 'yargs/yargs';

import * as commonUtils from '../../src/commands/common/utils.js';
import deploy, { handleDeploy } from '../../src/commands/deploy/index.js';
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
    endSubStep: vi.fn(),
    block: vi.fn(),
    stopSpinner: vi.fn(),
    getOutputStream: vi.fn().mockReturnValue('stdout'),
    setOutputStream: vi.fn()
  }
}));

const successfulDeploy = (app = 'test-project') => ({
  success: true,
  app,
  deployments: []
});

async function callHandleDeploy(argv: any) {
  await handleDeploy(argv);
}

describe('handleDeploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.clearAllMocks();
  });

  it('should handle deploy with default parameters', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
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
      'production',
      undefined,
      undefined,
      false
    );
    expect(commonUtils.displayDeploySuccess).toHaveBeenCalled();
  });

  it('should handle deploy with custom entry file', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
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
      'production',
      undefined,
      undefined,
      false
    );
  });

  it('should handle deploy with custom project name', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy('custom-name')
    );
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
      'production',
      undefined,
      undefined,
      false
    );
    expect(commonUtils.displayDeploySuccess).toHaveBeenCalledWith(
      'custom-name',
      true,
      true,
      true
    );
  });

  it('should handle deploy with assets option', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
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
      'production',
      undefined,
      undefined,
      false
    );
  });

  it('should handle deploy with description', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
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
      'production',
      undefined,
      undefined,
      false
    );
  });

  it('should handle deploy with environment option', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
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
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
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
      'production',
      true,
      undefined,
      false
    );
  });

  it('should handle deploy with version option', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
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
      'production',
      undefined,
      'v1.0.0',
      false
    );
  });

  it('should handle deploy with all options', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy('custom-name')
    );
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
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue({
      success: false,
      app: '',
      deployments: []
    });

    await callHandleDeploy({ _: [], $0: '' });

    expect(commonUtils.displayDeploySuccess).not.toHaveBeenCalled();
  });

  it('should emit one machine-readable JSON document in json output mode', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue({
      success: true,
      app: 'test-project',
      deployments: [
        {
          environment: 'staging',
          deploymentId: 'deployment-staging',
          codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
        }
      ]
    } as any);
    vi.mocked(commonUtils.getDeployPreviewUrl).mockResolvedValue(
      'https://test-project.example.com'
    );
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    await callHandleDeploy({ output: 'json', _: [], $0: '' });

    expect(commonUtils.displayDeploySuccess).not.toHaveBeenCalled();
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(stdoutSpy.mock.calls[0][0]))).toEqual({
      schemaVersion: 1,
      app: 'test-project',
      url: 'https://test-project.example.com',
      deployments: [
        {
          environment: 'staging',
          deploymentId: 'deployment-staging',
          codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
        }
      ]
    });
    stdoutSpy.mockRestore();
  });

  it('should keep url nullable without changing deploy success', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
    vi.mocked(commonUtils.getDeployPreviewUrl).mockResolvedValue(null);
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    const result = await handleDeploy({ output: 'json', _: [], $0: '' });

    expect(result.success).toBe(true);
    expect(JSON.parse(String(stdoutSpy.mock.calls[0][0])).url).toBeNull();
    stdoutSpy.mockRestore();
  });

  it('should emit an empty deployment result when json deployment fails', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue({
      success: false,
      app: 'test-project',
      deployments: []
    });
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    const result = await handleDeploy({ output: 'json', _: [], $0: '' });

    expect(result.success).toBe(false);
    expect(JSON.parse(String(stdoutSpy.mock.calls[0][0]))).toEqual({
      schemaVersion: 1,
      app: 'test-project',
      url: null,
      deployments: []
    });
    stdoutSpy.mockRestore();
  });

  it('should expose accepted environments when json deployment is partial', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue({
      success: false,
      app: 'test-project',
      deployments: [
        {
          environment: 'staging',
          deploymentId: 'deployment-staging',
          codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
        }
      ]
    });
    vi.mocked(commonUtils.getDeployPreviewUrl).mockResolvedValue(null);
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    const result = await handleDeploy({ output: 'json', _: [], $0: '' });

    expect(result.success).toBe(false);
    expect(JSON.parse(String(stdoutSpy.mock.calls[0][0])).deployments).toEqual([
      {
        environment: 'staging',
        deploymentId: 'deployment-staging',
        codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
      }
    ]);
    stdoutSpy.mockRestore();
  });

  it.each([
    {
      label: 'text output',
      argv: { _: [], $0: '' },
      setup: () => {
        vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
          successfulDeploy()
        );
        vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();
      }
    },
    {
      label: 'json output',
      argv: { output: 'json', _: [], $0: '' },
      setup: () => {
        vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
          successfulDeploy()
        );
        vi.mocked(commonUtils.getDeployPreviewUrl).mockResolvedValue(null);
      }
    },
    {
      label: 'versions output',
      argv: { versions: ['v1:100'], _: [], $0: '' },
      setup: () => {
        vi.mocked(commonUtils.deployWithVersionPercentages).mockResolvedValue(
          successfulDeploy()
        );
        vi.mocked(commonUtils.displayDeploySuccess).mockResolvedValue();
      }
    }
  ])(
    'should exit zero after a successful $label deploy',
    async ({ argv, setup }) => {
      setup();
      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((
        _chunk: unknown,
        callback?: () => void
      ) => {
        callback?.();
        return true;
      }) as typeof process.stdout.write);
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((
        _chunk: unknown,
        callback?: () => void
      ) => {
        callback?.();
        return true;
      }) as typeof process.stderr.write);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      await (deploy.handler as (argv: any) => Promise<void>)(argv);

      expect(exitSpy).toHaveBeenCalledOnce();
      expect(exitSpy).toHaveBeenCalledWith(0);
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
      exitSpy.mockRestore();
    }
  );

  it('should wait for JSON stdout and stderr to flush before exiting', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
    vi.mocked(commonUtils.getDeployPreviewUrl).mockResolvedValue(null);
    const flushCallbacks: Array<() => void> = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((
      _chunk: unknown,
      callback?: () => void
    ) => {
      if (callback) flushCallbacks.push(callback);
      return true;
    }) as typeof process.stdout.write);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((
      _chunk: unknown,
      callback?: () => void
    ) => {
      if (callback) flushCallbacks.push(callback);
      return true;
    }) as typeof process.stderr.write);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    const execution = (deploy.handler as (argv: any) => Promise<void>)({
      output: 'json',
      _: [],
      $0: ''
    });
    await vi.waitFor(() => expect(flushCallbacks).toHaveLength(2));

    expect(exitSpy).not.toHaveBeenCalled();
    flushCallbacks.forEach((callback) => callback());
    await execution;

    expect(exitSpy).toHaveBeenCalledWith(0);
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should exit one at the command boundary when deployment fails', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue({
      success: false,
      app: 'test-project',
      deployments: []
    });
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((
      _chunk: unknown,
      callback?: () => void
    ) => {
      callback?.();
      return true;
    }) as typeof process.stdout.write);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((
      _chunk: unknown,
      callback?: () => void
    ) => {
      callback?.();
      return true;
    }) as typeof process.stderr.write);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await (deploy.handler as (argv: any) => Promise<void>)({ _: [], $0: '' });

    expect(exitSpy).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(1);
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should report an unexpected deploy error and exit one', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockRejectedValue(
      new Error('deploy exploded')
    );
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((
      _chunk: unknown,
      callback?: () => void
    ) => {
      callback?.();
      return true;
    }) as typeof process.stdout.write);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((
      _chunk: unknown,
      callback?: () => void
    ) => {
      callback?.();
      return true;
    }) as typeof process.stderr.write);
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await (deploy.handler as (argv: any) => Promise<void>)({ _: [], $0: '' });

    expect(consoleErrorSpy).toHaveBeenCalledWith('deploy exploded');
    expect(exitSpy).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(1);
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });
  it('should deploy weighted versions to production by default', async () => {
    vi.mocked(commonUtils.deployWithVersionPercentages).mockResolvedValue(
      successfulDeploy()
    );

    await callHandleDeploy({
      versions: ['v1:80,v2:20'],
      _: [],
      $0: ''
    });

    expect(commonUtils.deployWithVersionPercentages).toHaveBeenCalledWith(
      undefined,
      ['v1:80,v2:20'],
      'production',
      '/test/root'
    );
    expect(commonUtils.commitAndDeployVersion).not.toHaveBeenCalled();
  });

  it('should keep an explicit staging target for weighted versions', async () => {
    vi.mocked(commonUtils.deployWithVersionPercentages).mockResolvedValue(
      successfulDeploy()
    );

    await callHandleDeploy({
      versions: ['v1:100'],
      environment: 'staging',
      _: [],
      $0: ''
    });

    expect(commonUtils.deployWithVersionPercentages).toHaveBeenCalledWith(
      undefined,
      ['v1:100'],
      'staging',
      '/test/root'
    );
  });

  it.each([
    { name: 'a new version', args: [], weighted: false },
    { name: 'an existing version', args: ['--version', 'v1'], weighted: false },
    {
      name: 'weighted versions',
      args: ['--versions', 'v1:80,v2:20'],
      weighted: true
    }
  ])(
    'should honor --no-preview when deploying $name',
    async ({ args, weighted }) => {
      vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
        successfulDeploy()
      );
      vi.mocked(commonUtils.deployWithVersionPercentages).mockResolvedValue(
        successfulDeploy()
      );
      vi.mocked(fileUtils.getProjectConfig).mockReturnValue({
        name: 'test-project'
      } as any);

      const argv = await yargs()
        .version(false)
        .strict()
        .exitProcess(false)
        .command({ ...deploy, handler: () => {} })
        .parseAsync(['deploy', ...args, '--no-preview']);
      await callHandleDeploy(argv);

      if (weighted) {
        expect(commonUtils.deployWithVersionPercentages).toHaveBeenCalledWith(
          undefined,
          ['v1:80,v2:20'],
          'production',
          '/test/root'
        );
        expect(commonUtils.commitAndDeployVersion).not.toHaveBeenCalled();
      } else {
        expect(commonUtils.displayDeploySuccess).toHaveBeenCalledWith(
          'test-project',
          true,
          true,
          false
        );
        expect(commonUtils.commitAndDeployVersion).toHaveBeenCalled();
      }
    }
  );

  it('does not fetch a preview URL in JSON mode with --no-preview', async () => {
    vi.mocked(commonUtils.commitAndDeployVersion).mockResolvedValue(
      successfulDeploy()
    );
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      await handleDeploy({ output: 'json', preview: false, _: [], $0: '' });
      expect(commonUtils.getDeployPreviewUrl).not.toHaveBeenCalled();
      expect(JSON.parse(String(stdout.mock.calls[0][0])).url).toBeNull();
    } finally {
      stdout.mockRestore();
    }
  });
});
