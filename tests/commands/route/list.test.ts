import { it, describe, expect, vi } from 'vitest';

import { handleListRoutes } from '../../../src/commands/route/list.js';
import api from '../../../src/libs/api.js';
import logger from '../../../src/libs/logger.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';

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
            "┌────────────────────┬────────────────┬──────────┐
      │ Route Name         │ Route          │ Site     │
      ├────────────────────┼────────────────┼──────────┤
      │ test2              │ abc.msy.asia/* │ msy.asia │
      └────────────────────┴────────────────┴──────────┘",
          ],
          [
            "📃 Related custom mode routes:",
          ],
          [
            "┌────────────────────┬─────────────────────────────────────────────────────────────────┬──────────┐
      │ Route Name         │ Rule                                                            │ Site     │
      ├────────────────────┼─────────────────────────────────────────────────────────────────┼──────────┤
      │ test3              │ (http.host eq "test.msy.asia" and http.request.uri.path eq "/") │ msy.asia │
      └────────────────────┴─────────────────────────────────────────────────────────────────┴──────────┘",
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
