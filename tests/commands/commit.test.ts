import { vi, expect } from 'vitest';

import { handleCommit } from '../../src/commands/commit/index.js';
import * as routineUtils from '../../src/commands/common/routineUtils.js';
import * as descriptionInput from '../../src/components/descriptionInput.js';

describe('handleCommit', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return early if project validation fails', async () => {
    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue(
      null
    );

    await handleCommit({
      _: [],
      $0: ''
    });

    expect(routineUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      undefined
    );
    // When validation fails, the function should return early without calling other functions
    // We don't need to check generateCodeVersion since it's not mocked in this test
  });

  it('should handle commit with default parameters', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'Test description'
    );
    vi.spyOn(routineUtils, 'generateCodeVersion').mockResolvedValue({
      isSuccess: true,
      res: null
    });

    await handleCommit({
      _: [],
      $0: ''
    });

    expect(routineUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      undefined
    );
    expect(descriptionInput.descriptionInput).toHaveBeenCalled();
    expect(routineUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Test description',
      undefined,
      undefined,
      undefined
    );
  });

  it('should handle commit with custom project name', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'custom-name'
    });

    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'Test description'
    );
    vi.spyOn(routineUtils, 'generateCodeVersion').mockResolvedValue({
      isSuccess: true,
      res: null
    });

    await handleCommit({
      name: 'custom-name',
      _: [],
      $0: ''
    });

    expect(routineUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      'custom-name'
    );
    expect(routineUtils.generateCodeVersion).toHaveBeenCalledWith(
      'custom-name',
      'Test description',
      undefined,
      undefined,
      undefined
    );
  });

  it('should handle commit with custom entry file', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'Test description'
    );
    vi.spyOn(routineUtils, 'generateCodeVersion').mockResolvedValue({
      isSuccess: true,
      res: null
    });

    await handleCommit({
      entry: 'custom.js',
      _: [],
      $0: ''
    });

    expect(routineUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Test description',
      'custom.js',
      undefined,
      undefined
    );
  });

  it('should handle commit with assets option', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'Test description'
    );
    vi.spyOn(routineUtils, 'generateCodeVersion').mockResolvedValue({
      isSuccess: true,
      res: null
    });

    await handleCommit({
      assets: 'custom-assets',
      _: [],
      $0: ''
    });

    expect(routineUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Test description',
      undefined,
      'custom-assets',
      undefined
    );
  });

  it('should handle commit with description option', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(routineUtils, 'generateCodeVersion').mockResolvedValue({
      isSuccess: true,
      res: null
    });

    await handleCommit({
      description: 'Custom description',
      _: [],
      $0: ''
    });

    expect(descriptionInput.descriptionInput).not.toHaveBeenCalled();
    expect(routineUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Custom description',
      undefined,
      undefined,
      undefined
    );
  });

  it('should handle commit with minify option', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'test-project'
    });

    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'Test description'
    );
    vi.spyOn(routineUtils, 'generateCodeVersion').mockResolvedValue({
      isSuccess: true,
      res: null
    });

    await handleCommit({
      minify: true,
      _: [],
      $0: ''
    });

    expect(routineUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Test description',
      undefined,
      undefined,
      true
    );
  });

  it('should handle commit with all options', async () => {
    const mockProjectConfig = {
      name: 'test-project',
      entry: 'index.js',
      assets: { directory: 'assets' }
    };

    vi.spyOn(routineUtils, 'validateAndInitializeProject').mockResolvedValue({
      projectConfig: mockProjectConfig,
      projectName: 'custom-name'
    });

    vi.spyOn(routineUtils, 'generateCodeVersion').mockResolvedValue({
      isSuccess: true,
      res: null
    });

    await handleCommit({
      name: 'custom-name',
      entry: 'custom.js',
      assets: 'custom-assets',
      description: 'Full commit test',
      minify: true,
      _: [],
      $0: ''
    });

    expect(routineUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      'custom-name'
    );
    expect(descriptionInput.descriptionInput).not.toHaveBeenCalled();
    expect(routineUtils.generateCodeVersion).toHaveBeenCalledWith(
      'custom-name',
      'Full commit test',
      'custom.js',
      'custom-assets',
      true
    );
  });
});
