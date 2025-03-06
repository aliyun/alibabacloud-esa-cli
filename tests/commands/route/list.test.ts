import { it, describe, expect, vi } from 'vitest';
import { handleListRoutes } from '../../../src/commands/route/list.js';
import { validDomain, validName } from '../../../src/commands/utils.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';
import logger from '../../../src/libs/logger.js';

describe('handle list related routes', () => {
  let std = mockConsoleMethods();
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle displaying related routes success', async () => {
    await handleListRoutes();
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "📃 Related routes:",
          ],
          [
            "[90m┌──────────────────────────────[39m[90m┬──────────────────────────────┐[39m
      [90m│[39m[31m Route                        [39m[90m│[39m[31m Site                         [39m[90m│[39m
      [90m├──────────────────────────────[39m[90m┼──────────────────────────────┤[39m
      [90m│[39m test.com/1                   [90m│[39m test.com                     [90m│[39m
      [90m├──────────────────────────────[39m[90m┼──────────────────────────────┤[39m
      [90m│[39m test.com/2                   [90m│[39m test.com                     [90m│[39m
      [90m└──────────────────────────────[39m[90m┴──────────────────────────────┘[39m",
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('should handle no related routes found', async () => {
    vi.mocked((await ApiService.getInstance()).getRoutine).mockResolvedValue({
      data: {
        RelatedRoutes: []
      }
    } as any);
    await handleListRoutes();
    expect(logger.warn).toBeCalledWith('🙅 No related routes found');
  });
});
