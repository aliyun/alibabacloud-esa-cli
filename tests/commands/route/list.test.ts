import { it, describe, expect, vi } from 'vitest';
import { handleListRoutes } from '../../../src/commands/route/list.js';
import { validDomain, validName } from '../../../src/commands/utils.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';
import logger from '../../../src/libs/logger.js';
import api from '../../../src/libs/api.js';

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
            "📃 Related simple mode routes:",
          ],
          [
            "[90m┌────────────────────[39m[90m┬────────────────[39m[90m┬──────────┐[39m
      [90m│[39m[31m Route Name         [39m[90m│[39m[31m Route          [39m[90m│[39m[31m Site     [39m[90m│[39m
      [90m├────────────────────[39m[90m┼────────────────[39m[90m┼──────────┤[39m
      [90m│[39m test2              [90m│[39m abc.msy.asia/* [90m│[39m msy.asia [90m│[39m
      [90m└────────────────────[39m[90m┴────────────────[39m[90m┴──────────┘[39m",
          ],
          [
            "📃 Related custom mode routes:",
          ],
          [
            "[90m┌────────────────────[39m[90m┬─────────────────────────────────────────────────────────────────[39m[90m┬──────────┐[39m
      [90m│[39m[31m Route Name         [39m[90m│[39m[31m Rule                                                            [39m[90m│[39m[31m Site     [39m[90m│[39m
      [90m├────────────────────[39m[90m┼─────────────────────────────────────────────────────────────────[39m[90m┼──────────┤[39m
      [90m│[39m test3              [90m│[39m (http.host eq "test.msy.asia" and http.request.uri.path eq "/") [90m│[39m msy.asia [90m│[39m
      [90m└────────────────────[39m[90m┴─────────────────────────────────────────────────────────────────[39m[90m┴──────────┘[39m",
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
    vi.mocked(api.listRoutineRoutes).mockResolvedValue({
      body: {
        configs: []
      }
    } as any);
    await handleListRoutes();
    expect(logger.warn).toBeCalledWith('🙅 No related routes found');
  });
});
