import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  isCancel: vi.fn(),
  multiselect: vi.fn(),
  t: vi.fn(() => ({
    d: vi.fn((defaultValue: string) => defaultValue)
  }))
}));

vi.unmock('../../src/components/mutiSelectTable.js');

vi.mock('@clack/prompts', () => ({
  cancel: mocks.cancel,
  isCancel: mocks.isCancel,
  multiselect: mocks.multiselect
}));

vi.mock('../../src/i18n/index.js', () => ({
  default: mocks.t
}));

import { displayMultiSelectTable } from '../../src/components/mutiSelectTable.js';

describe('displayMultiSelectTable', () => {
  const exitError = new Error('process exited');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isCancel.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the selected labels', async () => {
    mocks.multiselect.mockResolvedValue(['one', 'two']);

    await expect(
      displayMultiSelectTable([{ label: 'one' }, { label: 'two' }])
    ).resolves.toEqual(['one', 'two']);

    expect(mocks.t).toHaveBeenCalledWith('deploy_select_table_tip');
    expect(mocks.multiselect).toHaveBeenCalledWith({
      message: 'Use arrow keys to move, space to select, and enter to submit.',
      options: [
        { label: 'one', value: 'one' },
        { label: 'two', value: 'two' }
      ],
      required: false
    });
  });

  it('cancels and exits when the prompt is cancelled', async () => {
    mocks.multiselect.mockResolvedValue(Symbol('cancel'));
    mocks.isCancel.mockReturnValue(true);
    const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw exitError;
    });

    await expect(displayMultiSelectTable([{ label: 'one' }])).rejects.toBe(
      exitError
    );

    expect(mocks.cancel).toHaveBeenCalledWith('Operation cancelled.');
    expect(processExit).toHaveBeenCalledWith(130);
  });
});
