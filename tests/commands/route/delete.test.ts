import { it, describe, expect, vi } from 'vitest';
import { handleDeleteRoute } from '../../../src/commands/route/delete.js';
import { validDomain, validName } from '../../../src/commands/utils.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';
import logger from '../../../src/libs/logger.js';
import api from '../../../src/libs/api.js';

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
      routeName: 'test2',
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "
      🎉  SUCCESS  Delete route success!",
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('should handle routes does not exist', async () => {
    await handleDeleteRoute({
      routeName: 'noExist',
      _: [],
      $0: ''
    });
    expect(logger.error).toBeCalledWith(
      'No route found! Please check the route name.'
    );
  });

  it('should handle delete routes fail', async () => {
    vi.mocked(api.deleteRoutineRoute).mockResolvedValue({
      statusCode: 500
    } as any);

    await handleDeleteRoute({
      routeName: 'test2',
      _: [],
      $0: ''
    });
    expect(logger.error).toBeCalledWith('Delete route fail!');
  });
});
