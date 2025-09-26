import { describe, expect, it, vi } from 'vitest';

import {
  displayRoutineList,
  handleList
} from '../../src/commands/routine/list.js';
import { ApiService } from '../../src/libs/apiService.js';
import {
  EdgeFunctionItem,
  ListUserRoutinesRes
} from '../../src/libs/interface.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';

describe('displayRoutineList', () => {
  let std = mockConsoleMethods();

  it('should display routine list in a table', () => {
    const versionList = [
      {
        RoutineName: 'routine1',
        CreateTime: '2022-01-01',
        Description: 'hello world'
      },
      {
        RoutineName: 'routine2',
        CreateTime: '2022-01-02',
        Description: 'test'
      }
    ];

    displayRoutineList(versionList);

    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "[90m┌────────────────────[39m[90m┬─────────────────────────[39m[90m┬──────────────────────────────┐[39m
      [90m│[39m[31m Name               [39m[90m│[39m[31m Created                 [39m[90m│[39m[31m Description                  [39m[90m│[39m
      [90m├────────────────────[39m[90m┼─────────────────────────[39m[90m┼──────────────────────────────┤[39m
      [90m│[39m routine1           [90m│[39m 2022/01/01 00:00:00     [90m│[39m hello world                  [90m│[39m
      [90m├────────────────────[39m[90m┼─────────────────────────[39m[90m┼──────────────────────────────┤[39m
      [90m│[39m routine2           [90m│[39m 2022/01/02 00:00:00     [90m│[39m test                         [90m│[39m
      [90m└────────────────────[39m[90m┴─────────────────────────[39m[90m┴──────────────────────────────┘[39m",
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

  it('should display empty table if versionList is empty', () => {
    const versionList: EdgeFunctionItem[] = [];

    displayRoutineList(versionList);

    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "[90m┌────────────────────[39m[90m┬─────────────────────────[39m[90m┬──────────────────────────────┐[39m
      [90m│[39m[31m Name               [39m[90m│[39m[31m Created                 [39m[90m│[39m[31m Description                  [39m[90m│[39m
      [90m└────────────────────[39m[90m┴─────────────────────────[39m[90m┴──────────────────────────────┘[39m",
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

  it('should display a routine list by calling getRoutineUserInfo', async () => {
    const mockRes: ListUserRoutinesRes = {
      code: '200',
      body: {
        RequestId: '123',
        PageNumber: 1,
        PageSize: 10,
        TotalCount: 2,
        UsedRoutineNumber: 1,
        QuotaRoutineNumber: 10,
        Routines: [
          {
            RoutineName: 'routine1',
            Description: 'hello world',
            CreateTime: '2022-01-01'
          },
          {
            RoutineName: 'routine2',
            Description: 'hello',
            CreateTime: '2022-01-02'
          }
        ]
      }
    };

    vi.mocked(
      (await ApiService.getInstance()).listUserRoutines
    ).mockResolvedValue(mockRes);
    await handleList({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "📃 List all of routine:",
          ],
          [
            "[90m┌────────────────────[39m[90m┬─────────────────────────[39m[90m┬──────────────────────────────┐[39m
      [90m│[39m[31m Name               [39m[90m│[39m[31m Created                 [39m[90m│[39m[31m Description                  [39m[90m│[39m
      [90m├────────────────────[39m[90m┼─────────────────────────[39m[90m┼──────────────────────────────┤[39m
      [90m│[39m routine1           [90m│[39m 2022/01/01 00:00:00     [90m│[39m hello world                  [90m│[39m
      [90m├────────────────────[39m[90m┼─────────────────────────[39m[90m┼──────────────────────────────┤[39m
      [90m│[39m routine2           [90m│[39m 2022/01/02 00:00:00     [90m│[39m hello                        [90m│[39m
      [90m└────────────────────[39m[90m┴─────────────────────────[39m[90m┴──────────────────────────────┘[39m",
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
});
