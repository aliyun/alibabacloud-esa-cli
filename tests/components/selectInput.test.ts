import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  isCancel: vi.fn(),
  select: vi.fn()
}));

vi.mock('@clack/prompts', () => ({
  cancel: mocks.cancel,
  isCancel: mocks.isCancel,
  select: mocks.select
}));

import SelectItems, { SelectItem } from '../../src/components/selectInput.js';

describe('SelectItems', () => {
  const exitError = new Error('process exited');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isCancel.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes the selected item to the callback', async () => {
    const items: SelectItem[] = [
      { label: 'First', value: 'first' },
      { label: 'Second', value: 'second', key: '2' }
    ];
    const handleSelect = vi.fn().mockResolvedValue(undefined);
    mocks.select.mockResolvedValue('second');

    await expect(
      SelectItems({ items, handleSelect, message: 'Choose one' })
    ).resolves.toBeUndefined();

    expect(mocks.select).toHaveBeenCalledWith({
      message: 'Choose one',
      options: [
        { label: 'First', value: 'first' },
        { label: 'Second', value: 'second' }
      ]
    });
    expect(handleSelect).toHaveBeenCalledOnce();
    expect(handleSelect).toHaveBeenCalledWith(items[1]);
  });

  it('cancels and exits without invoking the callback', async () => {
    const handleSelect = vi.fn();
    mocks.select.mockResolvedValue(Symbol('cancel'));
    mocks.isCancel.mockReturnValue(true);
    const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw exitError;
    });

    await expect(
      SelectItems({
        items: [{ label: 'First', value: 'first' }],
        handleSelect
      })
    ).rejects.toBe(exitError);

    expect(mocks.cancel).toHaveBeenCalledWith('Operation cancelled.');
    expect(processExit).toHaveBeenCalledWith(130);
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
