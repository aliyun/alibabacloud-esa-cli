// deploy.test.ts
import { it, describe, expect, vi } from 'vitest';

import * as routineUtils from '../../src/commands/common/routineUtils.js';
import { handleDeploy } from '../../src/commands/deploy/index.js';

describe('handleDeploy', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return early if project validation fails', async () => {
    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue(
      null
    );

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(routineUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      undefined
    );
    // When validation fails, the function should return early without calling other functions
    // We don't need to check commitAndDeployVersion since it's not mocked in this test
  });

  it('should handle deploy with default parameters', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(routineUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      undefined
    );
    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'index.js',
      'assets',
      '',
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(routineUtils.displayDeploySuccess).toHaveBeenCalledWith(
      'test-project',
      true,
      false
    );
  });

  it('should handle deploy with custom entry file', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      entry: 'custom.js',
      _: [],
      $0: ''
    });

    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'custom.js',
      'assets',
      '',
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('should handle deploy with custom project name', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'custom-name'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      name: 'custom-name',
      _: [],
      $0: ''
    });

    expect(routineUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      'custom-name'
    );
    expect(routineUtils.displayDeploySuccess).toHaveBeenCalledWith(
      'custom-name',
      true,
      false
    );
  });

  it('should handle deploy with assets option', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      assets: true,
      _: [],
      $0: ''
    });

    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'index.js',
      true,
      '',
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('should handle deploy with description', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      description: 'Test deployment',
      _: [],
      $0: ''
    });

    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'index.js',
      'assets',
      'Test deployment',
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('should handle deploy with environment option', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      environment: 'staging',
      _: [],
      $0: ''
    });

    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'index.js',
      'assets',
      '',
      undefined,
      'staging',
      undefined,
      undefined
    );
  });

  it('should handle deploy with minify option', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      minify: true,
      _: [],
      $0: ''
    });

    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'index.js',
      'assets',
      '',
      undefined,
      undefined,
      true,
      undefined
    );
  });

  it('should handle deploy with version option', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      version: 'v1.0.0',
      _: [],
      $0: ''
    });

    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'index.js',
      'assets',
      '',
      undefined,
      undefined,
      undefined,
      'v1.0.0'
    );
  });

  it('should handle deploy with all options', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      entry: 'custom.js',
      name: 'custom-name',
      assets: true,
      description: 'Full deployment test',
      environment: 'production',
      minify: true,
      version: 'v2.0.0',
      _: [],
      $0: ''
    });

    expect(routineUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      'custom-name'
    );
    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'custom.js',
      true,
      'Full deployment test',
      undefined,
      'production',
      true,
      'v2.0.0'
    );
  });

  it('should not display success message if deployment fails', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(false);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(routineUtils.displayDeploySuccess).not.toHaveBeenCalled();
  });

  it('should handle deploy with custom assets directory', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      assets: 'custom-assets',
      _: [],
      $0: ''
    });

    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'index.js',
      'custom-assets',
      '',
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('should handle deploy with empty assets from config', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: undefined
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'commitAndDeployVersion').mockResolvedValue(true);
    vi.spyOn(routineUtils, 'displayDeploySuccess').mockResolvedValue();

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(routineUtils.commitAndDeployVersion).toHaveBeenCalledWith(
      mockProjectConfig,
      'index.js',
      undefined,
      '',
      undefined,
      undefined,
      undefined,
      undefined
    );
  });
});
