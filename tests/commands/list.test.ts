import { describe, expect, it, vi } from 'vitest';
import {
  displayRoutineList,
  handleList
} from '../../src/commands/routine/list.js';
import {
  EdgeFunctionItem,
  GetRoutineUserInfoRes
} from '../../src/libs/interface.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';
import { ApiService } from '../../src/libs/apiService.js';

describe('displayRoutineList', () => {
  let std = mockConsoleMethods();

  it('should display routine list in a table', () => {
    const versionList = [
      {
        RoutineName: 'routine1',
        CreateTime: '2022-01-01',
        Description: 'SGVsbG8gd29ybGQ='
      },
      {
        RoutineName: 'routine2',
        CreateTime: '2022-01-02',
        Description: 'VGhpcyBpcyBhIHN0cmluZw=='
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
      [90m│[39m routine1           [90m│[39m 2022/01/01 00:00:00     [90m│[39m Hello world                  [90m│[39m
      [90m├────────────────────[39m[90m┼─────────────────────────[39m[90m┼──────────────────────────────┤[39m
      [90m│[39m routine2           [90m│[39m 2022/01/02 00:00:00     [90m│[39m This is a string             [90m│[39m
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
    const mockRes: GetRoutineUserInfoRes = {
      Routines: [
        {
          RoutineName: 'routine1',
          Description: 'SGVsbG8gd29ybGQ=',
          CreateTime: '2022-01-01'
        },
        {
          RoutineName: 'routine2',
          Description: 'VGhpcyBpcyBhIHN0cmluZw==',
          CreateTime: '2022-01-02'
        }
      ],
      Subdomains: ['subdomain1', 'subdomain2']
    };
    vi.mocked(
      (await ApiService.getInstance()).getRoutineUserInfo
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
      [90m│[39m routine1           [90m│[39m 2022/01/01 00:00:00     [90m│[39m Hello world                  [90m│[39m
      [90m├────────────────────[39m[90m┼─────────────────────────[39m[90m┼──────────────────────────────┤[39m
      [90m│[39m routine2           [90m│[39m 2022/01/02 00:00:00     [90m│[39m This is a string             [90m│[39m
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
