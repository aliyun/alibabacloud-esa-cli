import { vi, expect, describe, it, afterEach } from 'vitest';

import { handleCommit } from '../../src/commands/commit/index.js';
import * as commonUtils from '../../src/commands/common/utils.js';
import * as promptModule from '../../src/utils/prompt.js';

vi.mock('../../src/commands/common/utils.js');
vi.mock('../../src/utils/prompt.js');
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn()
}));
vi.mock('../../src/libs/logger.js', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    startSubStep: vi.fn(),
    endSubStep: vi.fn()
  }
}));

describe('handleCommit', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return early if project validation fails', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue(null);

    const result = await handleCommit({
      _: [],
      $0: ''
    });

    expect(result).toBe(false);
    expect(commonUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      undefined
    );
    expect(commonUtils.generateCodeVersion).not.toHaveBeenCalled();
  });

  it('should handle commit with default parameters', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: { name: 'test-project', entry: 'index.js', assets: { directory: 'assets' } },
      projectName: 'test-project'
    });

    vi.mocked(promptModule.default).mockResolvedValue('Test description');
    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: true,
      res: { data: { CodeVersion: 'v1' } } as any
    });

    const result = await handleCommit({
      _: [],
      $0: ''
    });

    expect(result).toBe(true);
    expect(commonUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      undefined
    );
    expect(promptModule.default).toHaveBeenCalled();
    expect(commonUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Test description',
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      'production'
    );
  });

  it('should handle commit with custom project name', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: { name: 'test-project', entry: 'index.js', assets: { directory: 'assets' } },
      projectName: 'custom-name'
    });

    vi.mocked(promptModule.default).mockResolvedValue('Test description');
    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: true,
      res: { data: { CodeVersion: 'v1' } } as any
    });

    await handleCommit({
      name: 'custom-name',
      _: [],
      $0: ''
    });

    expect(commonUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      'custom-name'
    );
    expect(commonUtils.generateCodeVersion).toHaveBeenCalledWith(
      'custom-name',
      'Test description',
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      'production'
    );
  });

  it('should handle commit with custom entry file', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: { name: 'test-project', entry: 'index.js', assets: { directory: 'assets' } },
      projectName: 'test-project'
    });

    vi.mocked(promptModule.default).mockResolvedValue('Test description');
    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: true,
      res: { data: { CodeVersion: 'v1' } } as any
    });

    await handleCommit({
      entry: 'custom.js',
      _: [],
      $0: ''
    });

    expect(commonUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Test description',
      'custom.js',
      undefined,
      undefined,
      undefined,
      false,
      'production'
    );
  });

  it('should handle commit with assets option', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: { name: 'test-project', entry: 'index.js', assets: { directory: 'assets' } },
      projectName: 'test-project'
    });

    vi.mocked(promptModule.default).mockResolvedValue('Test description');
    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: true,
      res: { data: { CodeVersion: 'v1' } } as any
    });

    await handleCommit({
      assets: 'custom-assets',
      _: [],
      $0: ''
    });

    expect(commonUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Test description',
      undefined,
      'custom-assets',
      undefined,
      undefined,
      false,
      'production'
    );
  });

  it('should handle commit with description option', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: { name: 'test-project', entry: 'index.js', assets: { directory: 'assets' } },
      projectName: 'test-project'
    });

    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: true,
      res: { data: { CodeVersion: 'v1' } } as any
    });

    await handleCommit({
      description: 'Custom description',
      _: [],
      $0: ''
    });

    expect(promptModule.default).not.toHaveBeenCalled();
    expect(commonUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Custom description',
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      'production'
    );
  });

  it('should handle commit with minify option', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: { name: 'test-project', entry: 'index.js', assets: { directory: 'assets' } },
      projectName: 'test-project'
    });

    vi.mocked(promptModule.default).mockResolvedValue('Test description');
    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: true,
      res: { data: { CodeVersion: 'v1' } } as any
    });

    await handleCommit({
      minify: true,
      _: [],
      $0: ''
    });

    expect(commonUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Test description',
      undefined,
      undefined,
      true,
      undefined,
      false,
      'production'
    );
  });

  it('should handle commit with all options', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: { name: 'test-project', entry: 'index.js', assets: { directory: 'assets' } },
      projectName: 'custom-name'
    });

    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: true,
      res: { data: { CodeVersion: 'v1' } } as any
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

    expect(commonUtils.validateAndInitializeProject).toHaveBeenCalledWith(
      'custom-name'
    );
    expect(promptModule.default).not.toHaveBeenCalled();
    expect(commonUtils.generateCodeVersion).toHaveBeenCalledWith(
      'custom-name',
      'Full commit test',
      'custom.js',
      'custom-assets',
      true,
      undefined,
      false,
      'production'
    );
  });

  it('should bind a commit to an explicit staging environment', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: {
        name: 'test-project',
        entry: 'index.js',
        assets: { directory: 'assets' }
      },
      projectName: 'test-project'
    });
    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: true,
      res: { data: { CodeVersion: 'v1' } } as any
    });

    await handleCommit({
      description: 'Staging commit',
      environment: 'staging',
      _: [],
      $0: ''
    });

    expect(commonUtils.generateCodeVersion).toHaveBeenCalledWith(
      'test-project',
      'Staging commit',
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      'staging'
    );
  });

  it('should return false when code version generation fails', async () => {
    vi.mocked(commonUtils.validateAndInitializeProject).mockResolvedValue({
      projectConfig: { name: 'test-project', entry: 'index.js', assets: { directory: 'assets' } },
      projectName: 'test-project'
    });
    vi.mocked(commonUtils.generateCodeVersion).mockResolvedValue({
      isSuccess: false,
      res: null
    });

    const result = await handleCommit({
      description: 'Bad commit',
      _: [],
      $0: ''
    });

    expect(result).toBe(false);
  });
});
