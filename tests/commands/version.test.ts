import { describe, expect, it, vi } from 'vitest';
import { handleCheckVersion } from '../../src/utils/checkVersion.js';
import { promises as fs } from 'fs';
import { mockConsoleMethods } from '../helper/mockConsole.js';

describe('handleCheckVersion', () => {
  let mockReadFile: any;
  let std = mockConsoleMethods();
  beforeEach(() => {
    mockReadFile = vi
      .spyOn(fs, 'readFile')
      .mockResolvedValue('{"version": "1.0.0"}');
  });

  it('should log the current version', async () => {
    await handleCheckVersion();
    expect(mockReadFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
    expect(std.out).toHaveBeenCalledWith('v1.0.0');
    expect(std.err).not.toHaveBeenCalled();
  });

  it('should log an error if reading the version fails', async () => {
    const error = new Error('Failed to read file');
    mockReadFile.mockRejectedValue(error);
    await handleCheckVersion();
    expect(mockReadFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
    expect(std.out).not.toHaveBeenCalled();
    expect(std.err).toHaveBeenCalledWith('Error reading version', error);
  });
});
