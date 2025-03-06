import { it, describe, expect, vi } from 'vitest';
import { handleAddDomain } from '../../../src/commands/domain/add.js';
import {
  checkDirectory,
  checkIsLoginSuccess,
  validDomain,
  validName
} from '../../../src/commands/utils.js';
import * as Util from '../../../src/commands/utils.js';
import { getProjectConfig } from '../../../src/utils/fileUtils/index.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';

describe('handleAddDomain', () => {
  let std = mockConsoleMethods();
  it('should handle adding a domain successful', async () => {
    vi.mocked(checkDirectory).mockReturnValue(true);
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(true);
    vi.mocked(getProjectConfig).mockReturnValue({
      name: 'test'
    });
    vi.mocked(validDomain).mockReturnValue(true);
    vi.mocked(validName).mockReturnValue(true);
    await handleAddDomain({
      domain: 'test.com',
      _: [],
      $0: ''
    });

    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "
      🎉  SUCCESS  Binding domain test.com to routine successfully",
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

  it('should handle adding a domain fail', async () => {
    vi.mocked(checkDirectory).mockReturnValue(true);
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(true);
    vi.mocked(getProjectConfig).mockReturnValue({
      name: 'test'
    });
    vi.mocked(validDomain).mockReturnValue(true);
    vi.mocked(validName).mockReturnValue(true);
    vi.spyOn(Util, 'bindRoutineWithDomain').mockImplementation(vi.fn());

    await handleAddDomain({
      domain: 'test.com',
      _: [],
      $0: ''
    });

    expect(std.out).toMatchInlineSnapshot(`[MockFunction log]`);
  });
});
