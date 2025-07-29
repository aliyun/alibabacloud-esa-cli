import { vi, expect } from 'vitest';
import { handleCommit } from '../../src/commands/commit/index.js';
// import prodBuild from '../../src/commands/commit/prodBuild.js';
import {
  checkDirectory,
  checkIsLoginSuccess
} from '../../src/commands/utils.js';
import { ApiService } from '../../src/libs/apiService.js';

import { mockConsoleMethods } from '../helper/mockConsole.js';
import { getProjectConfig } from '../../src/utils/fileUtils/index.js';
import * as descriptionInput from '../../src/components/descriptionInput.js';
vi.mock('../../src/commands/commit/prodBuild.js');
describe('handleCommit', () => {
  const std = mockConsoleMethods();

  it('should return early if directory check fails', async () => {
    vi.mocked(checkDirectory).mockReturnValue(false);
    await handleCommit({
      _: [],
      $0: ''
    });

    expect(checkDirectory).toHaveBeenCalled();
    expect(std.out).not.toHaveBeenCalled();
  });

  it('should return early if project config is not found', async () => {
    vi.mocked(checkDirectory).mockReturnValue(true);
    vi.mocked(getProjectConfig).mockReturnValue(null);
    await handleCommit({
      _: [],
      $0: ''
    });

    expect(checkDirectory).toBeCalled();
    expect(getProjectConfig).toBeCalled();
    expect(checkIsLoginSuccess).not.toBeCalled();
  });

  it('should return early if login check fails', async () => {
    vi.mocked(checkDirectory).mockReturnValue(true);
    vi.mocked(getProjectConfig).mockResolvedValue({ name: 'test' });
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(false);

    await handleCommit({
      _: [],
      $0: ''
    });

    expect(checkDirectory).toBeCalled();
    expect(getProjectConfig).toBeCalled();
    expect(checkIsLoginSuccess).toBeCalled();
  });

  it('should handle commit success', async () => {
    vi.mocked(checkDirectory).mockReturnValue(true);
    vi.mocked(getProjectConfig).mockResolvedValue({ name: 'test' });
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(true);
    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'des test'
    );

    await handleCommit({
      _: [],
      $0: ''
    });

    expect(checkDirectory).toBeCalled();
    expect(getProjectConfig).toBeCalled();
    expect(checkIsLoginSuccess).toBeCalled();
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "🔄 Routine exists, updating the code",
          ],
          [
            "
      🎉  SUCCESS  Code uploaded successfully.",
          ],
          [
            "
      🎉  SUCCESS  Generate code version success!",
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
        ],
      }
    `);
  });
});
