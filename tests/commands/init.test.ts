// init.test.js
import { it, describe, expect, vi } from 'vitest';
import { handleInit } from '../../src/commands/init/index.js';
import * as selectInput from '../../src/components/selectInput.js';
import * as descriptionInput from '../../src/components/descriptionInput.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';
import fs from 'fs';

vi.mock('child_process');
vi.mock('fs/promises', () => ({
  rename: vi.fn()
}));

describe('handleInit', () => {
  let std = mockConsoleMethods();
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('clones the repository and updates project config --install git', async () => {
    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue('test');

    vi.spyOn(selectInput, 'default').mockImplementationOnce(
      ({ items, handleSelect }) => {
        handleSelect(items[0]);
        return () => {};
      }
    );

    vi.spyOn(selectInput, 'default').mockImplementationOnce(
      ({ items, handleSelect }) => {
        handleSelect(items[0]);
        return () => {};
      }
    );

    vi.spyOn(fs, 'readdirSync').mockReturnValue(['test' as any]);

    await handleInit({
      _: [],
      $0: ''
    });
    expect(std.out).matchSnapshot();
  });

  it('clones the repository and updates project config -- uninstall git', async () => {
    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue('test');

    vi.spyOn(selectInput, 'default').mockImplementationOnce(
      ({ items, handleSelect }) => {
        handleSelect(items[1]);
        return () => {};
      }
    );

    vi.spyOn(selectInput, 'default').mockImplementationOnce(
      ({ items, handleSelect }) => {
        handleSelect(items[0]);
        return () => {};
      }
    );

    await handleInit({
      _: [],
      $0: ''
    });
    expect(std.out).matchSnapshot();
  });
});
