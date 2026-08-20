import { afterEach, describe, expect, it, vi } from 'vitest';

import logger from '../../src/libs/logger.js';

describe('logger output stream', () => {
  afterEach(() => {
    logger.setOutputStream('stdout');
    vi.restoreAllMocks();
  });

  it('routes human-readable output to stderr in structured mode', () => {
    const stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.setOutputStream('stderr');

    logger.log('progress');
    logger.error('failed');

    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalledTimes(2);
  });
});
