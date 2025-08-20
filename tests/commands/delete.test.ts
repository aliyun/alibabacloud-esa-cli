import { describe, expect, it, vi } from 'vitest';

import {
  deleteRoutineFromUserAccount,
  handleDelete
} from '../../src/commands/routine/delete.js';
import {
  checkDirectory,
  checkIsLoginSuccess
} from '../../src/commands/utils.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';

vi.mock('../../src/commands/routine/delete.js', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../src/commands/routine/delete.js')
    >();
  return {
    ...actual,
    deleteRoutineFromUserAccount: vi.fn()
  };
});

vi.mock('../../src/commands/utils.js');

describe('handleDelete', () => {
  let std = mockConsoleMethods();
  it('should return early if login check fails', async () => {
    vi.mocked(checkDirectory).mockReturnValue(true);
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(false);
    await handleDelete({
      _: [],
      $0: ''
    });

    expect(checkIsLoginSuccess).toHaveBeenCalled();
    expect(deleteRoutineFromUserAccount).not.toHaveBeenCalled();
  });

  it('should call deleteRoutineFromUserAccount for each routine name', async () => {
    vi.mocked(checkDirectory).mockReturnValue(true);
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(true);
    await handleDelete({
      routineName: 'routine1',
      _: [],
      $0: ''
    });
    expect(checkIsLoginSuccess).toHaveBeenCalled();
    expect(std.out).toBeCalledWith(expect.stringContaining('Delete success!'));
  });
});
