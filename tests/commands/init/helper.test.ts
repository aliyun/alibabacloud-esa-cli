import { execSync } from 'child_process';

import inquirer from 'inquirer';
import { it, describe, expect, vi, beforeEach, afterEach } from 'vitest';

import { checkAndUpdatePackage } from '../../../src/commands/init/helper.js';
import t from '../../../src/i18n/index.js';
import logger from '../../../src/libs/logger.js';

vi.mock('child_process');
vi.mock('inquirer');
vi.mock('../../../src/libs/logger.js');
vi.mock('../../../src/i18n/index.js');

const mockExecSync = vi.mocked(execSync);
const mockInquirerPrompt = vi.mocked(inquirer.prompt);
const mockLogger = vi.mocked(logger);
const mockT = vi.mocked(t);

describe('checkAndUpdatePackage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger.log = vi.fn();
    mockLogger.success = vi.fn();
    mockLogger.error = vi.fn();

    mockT.mockImplementation((key: string, params?: any) => {
      const translations: Record<string, string> = {
        display_current_esa_template_version: 'Current esa-template version:',
        display_latest_esa_template_version: 'Latest esa-template version:',
        is_update_to_latest_version:
          'Do you want to update templates to latest version?',
        updated_esa_template_to_latest_version: `${params?.packageName || 'package'} updated successfully`,
        esa_template_is_latest_version: `${params?.packageName || 'package'} is latest.`
      };
      return { d: (defaultValue: string) => translations[key] || defaultValue };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update package when current version is different from latest version and user confirms', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('test-package@1.0.0')) // npm list
      .mockReturnValueOnce(Buffer.from('2.0.0')); // npm view version

    mockInquirerPrompt.mockResolvedValue({ isUpdate: true });

    await checkAndUpdatePackage(packageName);

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm list ${packageName}`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm view ${packageName} version`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockInquirerPrompt).toHaveBeenCalledWith({
      type: 'confirm',
      name: 'isUpdate',
      message: expect.any(String)
    });

    expect(mockExecSync).toHaveBeenCalledWith(
      `rm -rf node_modules/${packageName}`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `rm -rf package-lock.json`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm install ${packageName}@latest`,
      expect.objectContaining({
        cwd: expect.any(String),
        stdio: 'inherit'
      })
    );

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('updated successfully')
    );
  });

  it('should not update package when current version is same as latest version', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('test-package@1.0.0')) // npm list
      .mockReturnValueOnce(Buffer.from('1.0.0')); // npm view version

    await checkAndUpdatePackage(packageName);

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm list ${packageName}`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm view ${packageName} version`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockInquirerPrompt).not.toHaveBeenCalled();

    expect(mockExecSync).not.toHaveBeenCalledWith(
      `rm -rf node_modules/${packageName}`,
      expect.any(Object)
    );

    expect(mockExecSync).not.toHaveBeenCalledWith(
      `npm install ${packageName}@latest`,
      expect.any(Object)
    );

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('is latest')
    );
  });

  it('should not update package when user declines the update', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('test-package@1.0.0')) // npm list
      .mockReturnValueOnce(Buffer.from('2.0.0')); // npm view version

    mockInquirerPrompt.mockResolvedValue({ isUpdate: false });

    await checkAndUpdatePackage(packageName);

    expect(mockInquirerPrompt).toHaveBeenCalledWith({
      type: 'confirm',
      name: 'isUpdate',
      message: expect.any(String)
    });

    expect(mockExecSync).not.toHaveBeenCalledWith(
      `rm -rf node_modules/${packageName}`,
      expect.any(Object)
    );

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
      .mockReturnValueOnce(Buffer.from('2.0.0')); // npm view version

    await checkAndUpdatePackage(packageName);

    expect(mockExecSync).toHaveBeenCalledWith(
      `rm -rf node_modules/${packageName}`,
      expect.objectContaining({ cwd: expect.any(String) })
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      `npm install ${packageName}@latest`,
      expect.objectContaining({
        cwd: expect.any(String),
        stdio: 'inherit'
      })
    );

    expect(mockInquirerPrompt).not.toHaveBeenCalled();
  });

  it('should handle general errors gracefully', async () => {
    const packageName = 'test-package';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecSync.mockImplementation(() => {
      throw new Error('Network error');
    });

    await checkAndUpdatePackage(packageName);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error: An error occurred while checking and updating the package, skipping template update'
    );

    consoleSpy.mockRestore();
  });

  it('should handle version parsing when npm list output format is different', async () => {
    const packageName = 'test-package';

    mockExecSync
      .mockReturnValueOnce(Buffer.from('└── test-package@1.0.0')) // npm list with tree format
      .mockReturnValueOnce(Buffer.from('2.0.0')); // npm view version

    mockInquirerPrompt.mockResolvedValue({ isUpdate: true });

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
      .mockReturnValueOnce(Buffer.from('test-package')) // npm list without version
      .mockReturnValueOnce(Buffer.from('2.0.0')); // npm view version

    mockInquirerPrompt.mockResolvedValue({ isUpdate: true });

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

    mockExecSync.mockImplementation(() => {
      throw new Error('Network error');
    });

    await checkAndUpdatePackage(packageName);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error: An error occurred while checking and updating the package, skipping template update'
    );
  });
});
