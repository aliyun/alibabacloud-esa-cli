import { execSync } from 'child_process';

import { confirm as clackConfirm, isCancel } from '@clack/prompts';
import fs from 'fs-extra';
import { it, describe, expect, vi, beforeEach, afterEach } from 'vitest';

import { checkAndUpdatePackage } from '../../../src/commands/init/helper.js';

vi.mock('child_process');
vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false)
}));
vi.mock('fs-extra', () => ({
  default: {
    removeSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    copy: vi.fn()
  },
  removeSync: vi.fn(),
  readdirSync: vi.fn(),
  copy: vi.fn()
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
  getDirName: vi.fn().mockReturnValue('/test/dir'),
  getRoot: vi.fn().mockReturnValue('/test/root')
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

describe('checkAndUpdatePackage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
