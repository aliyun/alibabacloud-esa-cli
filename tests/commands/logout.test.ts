import { describe, expect, beforeEach, it, vi } from 'vitest';

import { handleLogout } from '../../src/commands/logout.js';
import * as fileUtils from '../../src/utils/fileUtils/index.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';

vi.mock('inquirer');

describe('logout command', () => {
  let std = mockConsoleMethods();
  beforeEach(() => {
    vi.clearAllMocks();
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
});
