import { it, describe, expect, vi } from 'vitest';
import { handleDeleteRoute } from '../../../src/commands/route/delete.js';
import { validDomain, validName } from '../../../src/commands/utils.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';
import logger from '../../../src/libs/logger.js';

describe('handle delete routes', () => {
  let std = mockConsoleMethods();
  vi.spyOn(logger, 'error').mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle delete routes success', async () => {
    vi.mocked(validDomain).mockReturnValue(true);
    vi.mocked(validName).mockResolvedValue(true);

    await handleDeleteRoute({
      route: 'test.com/1',
      _: [],
      $0: ''
    });
    expect(std.out).toBeCalledWith(
      expect.stringContaining('Delete route success')
    );
  });

  it('should handle routes does not exist', async () => {
    await handleDeleteRoute({
      route: 'test2.com/1',
      _: [],
      $0: ''
    });
    expect(logger.error).toBeCalledWith('Route not exist!');
  });

  it('should handle delete routes fail', async () => {
    vi.mocked(
      (await ApiService.getInstance()).deleteRoutineRelatedRoute
    ).mockResolvedValue({
      data: {
        Status: 'Error'
      }
    } as any);
    await handleDeleteRoute({
      route: 'test.com/1',
      _: [],
      $0: ''
    });
    expect(logger.error).toBeCalledWith('Delete route fail!');
  });
});
