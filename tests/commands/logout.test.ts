import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleLogout } from '../../src/commands/logout.js';
import * as fileUtils from '../../src/utils/fileUtils/index.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';

vi.mock('inquirer');

describe('logout command', () => {
  let std = mockConsoleMethods();
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ESA_ACCESS_KEY_ID;
    delete process.env.ESA_ACCESS_KEY_SECRET;
    delete process.env.ESA_SECURITY_TOKEN;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
    delete process.env.ALIBABA_CLOUD_SECURITY_TOKEN;
  });

  afterEach(() => {
    delete process.env.ESA_ACCESS_KEY_ID;
    delete process.env.ESA_ACCESS_KEY_SECRET;
    delete process.env.ESA_SECURITY_TOKEN;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
    delete process.env.ALIBABA_CLOUD_SECURITY_TOKEN;
  });

  it('should logout successfully', async () => {
    vi.mocked(fileUtils.getCliConfig).mockReturnValue({
      auth: {
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret'
      },
      endpoint: 'test-endpoint'
    });

    await handleLogout();

    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('Logout successfully')
    );

    expect(fileUtils.updateCliConfigFile).toHaveBeenCalledWith({
      auth: {
        accessKeyId: '',
        accessKeySecret: ''
      },
      endpoint: 'test-endpoint'
    });
  });

  it('should not logout if cliConfig is not available', async () => {
    vi.mocked(fileUtils.getCliConfig).mockReturnValue(null);

    await handleLogout();

    expect(std.out).not.toHaveBeenCalledWith(
      expect.stringContaining('Logout successfully')
    );
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
  });

  it('warns when environment credentials remain active after logout', async () => {
    process.env.ESA_ACCESS_KEY_ID = 'LTAIEnvironmentAccessKey1234';
    process.env.ESA_ACCESS_KEY_SECRET = 'environment-secret';
    vi.mocked(fileUtils.getCliConfig).mockReturnValue({
      auth: {
        accessKeyId: 'saved-access-key-id',
        accessKeySecret: 'saved-access-key-secret'
      }
    });

    await handleLogout();

    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('Environment credentials are still configured')
    );
  });

  it('warns for environment-only authentication without a saved config', async () => {
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID =
      'LTAIAlibabaEnvironmentAccessKey1234';
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET = 'alibaba-environment-secret';
    vi.mocked(fileUtils.getCliConfig).mockReturnValue(null);

    await handleLogout();

    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('Environment credentials are still configured')
    );
  });
});
