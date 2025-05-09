import { it, describe, expect, vi } from 'vitest';
import * as descriptionInput from '../../../src/components/descriptionInput.js';
import { handlerAddRoute } from '../../../src/commands/route/add.js';
import logger from '../../../src/libs/logger.js';
import { Option } from './../../../src/components/filterSelector';

import { validDomain, validName } from '../../../src/commands/utils.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';
import * as Component from '../../../src/components/filterSelector.js';
import { mockInquirerPrompt } from '../helper.js';
import api from '../../../src/libs/api.js';

describe('handle add routes', () => {
  let std = mockConsoleMethods();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle adding route success', async () => {
    vi.mocked(validDomain).mockReturnValue(true);
    vi.mocked(validName).mockResolvedValue(true);
    mockInquirerPrompt([
      { routeName: 'test-template-1' },
      {
        routeSite: {
          name: 'test.site',
          value: 4589034801
        }
      },
      { inputRoute: 'kl.test.site/*' }
    ]);
    await handlerAddRoute({
      _: [],
      $0: ''
    });

    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            {
              "routeName": "test-template-1",
            },
          ],
          [
            {
              "routeSite": {
                "name": "test.site",
                "value": 4589034801,
              },
            },
          ],
          [
            {
              "inputRoute": "kl.test.site/*",
            },
          ],
          [
            "
      🎉  SUCCESS  Add route success!",
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

  it('should handle adding route fail', async () => {
    vi.mocked(validDomain).mockReturnValue(true);
    vi.mocked(validName).mockResolvedValue(true);
    mockInquirerPrompt([
      { routeName: 'test-template-1' },
      {
        routeSite: {
          name: 'test.site',
          value: 4589034801
        }
      },
      { inputRoute: 'kl.test.site/*' }
    ]);

    vi.mocked(
      (await ApiService.getInstance()).createRoutineRoute
    ).mockResolvedValue({
      statusCode: 500
    } as any);

    await handlerAddRoute({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            {
              "routeName": "test-template-1",
            },
          ],
          [
            {
              "routeSite": {
                "name": "test.site",
                "value": 4589034801,
              },
            },
          ],
          [
            {
              "inputRoute": "kl.test.site/*",
            },
          ],
          [
            "
      ❌  ERROR  Add route fail!",
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
});
