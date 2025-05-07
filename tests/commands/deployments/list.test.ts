import { it, describe, expect, vi } from 'vitest';
import { handleListDeployments } from '../../../src/commands/deployments/list.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';

describe('handle display deployments', () => {
  let std = mockConsoleMethods();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle display deployments success', async () => {
    await handleListDeployments({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "Staging",
          ],
          [
            "Staging IP: 0.0.0.0",
          ],
          [
            "[90m┌─────────[39m[90m┬───────────────────┐[39m
      [90m│[39m Version [90m│[39m productionVersion [90m│[39m
      [90m└─────────[39m[90m┴───────────────────┘[39m",
          ],
          [
            "
      ",
          ],
          [
            "
      ",
          ],
          [
            "Production ●",
          ],
          [
            "[90m┌─────────[39m[90m┬────────────────┐[39m
      [90m│[39m Version [90m│[39m stagingVersion [90m│[39m
      [90m└─────────[39m[90m┴────────────────┘[39m",
          ],
          [
            "
      ",
          ],
          [
            "
      ",
          ],
          [
            "Canary ",
          ],
          [
            "[90m┌─────────[39m[90m┬──┐[39m
      [90m│[39m Version [90m│[39m  [90m│[39m
      [90m└─────────[39m[90m┴──┘[39m",
          ],
          [
            "
      ",
          ],
          [
            "You can visit: undefined",
          ],
          [
            "
      ",
          ],
          [
            "Active Staging",
          ],
          [
            "Active Production",
          ],
          [
            "[90m┌──────────────────────────────[39m[90m┬─────────────────────────[39m[90m┬───────────────┐[39m
      [90m│[39m[31m Version                      [39m[90m│[39m[31m Created                 [39m[90m│[39m[31m Description   [39m[90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m unstable                     [90m│[39m 2021/01/01 00:00:00     [90m│[39m               [90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m v1                           [90m│[39m 2021/01/01 00:00:00     [90m│[39m               [90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m v2                           [90m│[39m 2021/01/01 00:00:00     [90m│[39m               [90m│[39m
      [90m└──────────────────────────────[39m[90m┴─────────────────────────[39m[90m┴───────────────┘[39m",
          ],
          [
            "
      ",
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

  it('should handle display deployments -- show env ip error', async () => {
    vi.mocked(
      (await ApiService.getInstance()).getRoutineStagingEnvIp
    ).mockResolvedValue({} as any);
    await handleListDeployments({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "Staging",
          ],
          [
            "[90m┌─────────[39m[90m┬───────────────────┐[39m
      [90m│[39m Version [90m│[39m productionVersion [90m│[39m
      [90m└─────────[39m[90m┴───────────────────┘[39m",
          ],
          [
            "
      ",
          ],
          [
            "
      ",
          ],
          [
            "Production ●",
          ],
          [
            "[90m┌─────────[39m[90m┬────────────────┐[39m
      [90m│[39m Version [90m│[39m stagingVersion [90m│[39m
      [90m└─────────[39m[90m┴────────────────┘[39m",
          ],
          [
            "
      ",
          ],
          [
            "
      ",
          ],
          [
            "Canary ",
          ],
          [
            "[90m┌─────────[39m[90m┬──┐[39m
      [90m│[39m Version [90m│[39m  [90m│[39m
      [90m└─────────[39m[90m┴──┘[39m",
          ],
          [
            "
      ",
          ],
          [
            "You can visit: undefined",
          ],
          [
            "
      ",
          ],
          [
            "Active Staging",
          ],
          [
            "Active Production",
          ],
          [
            "[90m┌──────────────────────────────[39m[90m┬─────────────────────────[39m[90m┬───────────────┐[39m
      [90m│[39m[31m Version                      [39m[90m│[39m[31m Created                 [39m[90m│[39m[31m Description   [39m[90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m unstable                     [90m│[39m 2021/01/01 00:00:00     [90m│[39m               [90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m v1                           [90m│[39m 2021/01/01 00:00:00     [90m│[39m               [90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m v2                           [90m│[39m 2021/01/01 00:00:00     [90m│[39m               [90m│[39m
      [90m└──────────────────────────────[39m[90m┴─────────────────────────[39m[90m┴───────────────┘[39m",
          ],
          [
            "
      ",
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
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });
});
