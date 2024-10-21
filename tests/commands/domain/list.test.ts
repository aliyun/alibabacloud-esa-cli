import { handleListDomains } from '../../../src/commands/domain/list.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';

describe('handleDeleteDomain', () => {
  const std = mockConsoleMethods();

  // it('should list domains successfully', async () => {
  //   await handleListDomains({
  //     _: [],
  //     $0: ''
  //   });
  //   expect(std.out).matchSnapshot();
  //   expect(std.out).toBeCalledWith(expect.stringContaining(`test.com`));
  //   expect(std.out).toBeCalledWith(expect.stringContaining(`test2.com`));
  // });

  it('should handle non-existent domains found', async () => {
    vi.mocked((await ApiService.getInstance()).getRoutine).mockResolvedValue({
      data: {
        RelatedRecords: []
      }
    } as any);
    await handleListDomains({
      _: [],
      $0: ''
    });
    expect(std.out).toBeCalledWith('🙅 No related domains found');
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "🙅 No related domains found",
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
});
