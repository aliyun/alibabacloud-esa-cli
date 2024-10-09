import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fileUtils from '../../src/utils/fileUtils/index.js';
import inquirer from 'inquirer';
import { ApiService } from '../../src/libs/apiService.js';
import { handleLogin } from '../../src/commands/login/index.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';
import logger from '../../src/libs/logger.js';

vi.mock('inquirer');

describe('login command', () => {
  let std = mockConsoleMethods();
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});

  it('should prompt for user input if credentials are not found -- login success', async () => {
    vi.mocked(fileUtils.getCliConfig).mockResolvedValue({
      auth: {
        accessKeyId: '',
        accessKeySecret: ''
      },
      endpoint: ''
    });

    vi.mocked(inquirer.prompt).mockResolvedValue({
      accessKeyId: 'testKeyId',
      accessKeySecret: 'testKeySecret'
    });

    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await handleLogin();

    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('Logging in...')
    );
  });

  it('should prompt for user input if credentials are not found -- login failed', async () => {
    vi.mocked(fileUtils.getCliConfig).mockResolvedValue({
      auth: {
        accessKeyId: '',
        accessKeySecret: ''
      },
      endpoint: ''
    });

    vi.mocked(inquirer.prompt).mockResolvedValue({
      accessKeyId: 'testKeyId',
      accessKeySecret: 'testKeySecret'
    });

    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);
    vi.mocked((await ApiService.getInstance()).checkLogin).mockResolvedValue({
      success: false,
      message: 'Login failed due to invalid credentials'
    });

    await handleLogin();
    expect(logger.error).toBeCalledWith(
      'Login failed due to invalid credentials'
    );
  });

  it('should not prompt for user input if credentials are found --login success', async () => {
    vi.mocked(fileUtils.getCliConfig).mockReturnValue({
      auth: {
        accessKeyId: 'testKeyId',
        accessKeySecret: 'testKeySecret'
      },
      endpoint: ''
    });
    vi.mocked(inquirer.prompt).mockResolvedValue({
      accessKeyId: 'testKeyId',
      accessKeySecret: 'testKeySecret'
    });

    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);
    vi.mocked((await ApiService.getInstance()).checkLogin).mockResolvedValue({
      success: true,
      message: 'Login failed due to invalid credentials'
    });
    await handleLogin();
    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('Login success')
    );
    expect(logger.warn).toHaveBeenCalledWith('You are already logged in.');
  });

  it('should not prompt for user input if credentials are found --login fail', async () => {
    vi.mocked(fileUtils.getCliConfig).mockReturnValue({
      auth: {
        accessKeyId: 'testKeyId',
        accessKeySecret: 'testKeySecret'
      },
      endpoint: ''
    });
    vi.mocked(inquirer.prompt).mockResolvedValue({
      accessKeyId: 'testKeyId',
      accessKeySecret: 'testKeySecret'
    });

    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);
    vi.mocked((await ApiService.getInstance()).checkLogin).mockResolvedValue({
      success: false,
      message: 'Login failed due to invalid credentials'
    });
    await handleLogin();
    expect(logger.warn).toHaveBeenCalledWith('You are already logged in.');
    expect(logger.error).toBeCalledWith(
      'Login failed due to invalid credentials'
    );
  });
});
