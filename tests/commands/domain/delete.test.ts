import { describe, expect, it, vi } from 'vitest';

import { handleDeleteDomain } from '../../../src/commands/domain/delete.js';
import logger from '../../../src/libs/logger.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';

describe('handleDeleteDomain', () => {
  const std = mockConsoleMethods();

  vi.spyOn(logger, 'error').mockImplementation(() => {});
  it('should delete domains successfully', async () => {
    await handleDeleteDomain({
      domain: 'test.com',
      _: [],
      $0: ''
    });

    expect(std.out).toBeCalledWith(
      expect.stringContaining('Delete domain success')
    );
  });

  it('should handle non-existent domains', async () => {
    await handleDeleteDomain({
      domain: 'nonexistent.com',
      _: [],
      $0: ''
    });
    expect(logger.error).toBeCalledWith(`Domain doesn't exist`);
  });
});
