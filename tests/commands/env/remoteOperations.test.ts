import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteRoutineEnvironmentVariableKeys,
  listAllRoutineEnvironmentVariables,
  MAX_ENVIRONMENT_VARIABLES,
  setRoutineEnvironmentVariableValues
} from '../../../src/commands/env/utils.js';
import { ApiService } from '../../../src/libs/apiService.js';
import logger from '../../../src/libs/logger.js';

vi.mock('../../../src/libs/apiService.js');
vi.mock('../../../src/libs/logger.js', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    warn: vi.fn()
  }
}));

describe('remote environment variable operations', () => {
  const context = { name: 'my-routine', environment: 'production' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges every page returned by the list API', async () => {
    const listRoutineEnvironmentVariables = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          EnvironmentVariables: {
            FIRST: { Type: 'plain_text', Value: 'one' }
          },
          TotalCount: 2
        }
      })
      .mockResolvedValueOnce({
        data: {
          EnvironmentVariables: {
            SECOND: { Type: 'secret_text' }
          },
          TotalCount: 2
        }
      });
    (ApiService.getInstance as any).mockResolvedValue({
      listRoutineEnvironmentVariables
    });

    await expect(
      listAllRoutineEnvironmentVariables(context)
    ).resolves.toMatchObject({
      FIRST: { Type: 'plain_text', Value: 'one' },
      SECOND: { Type: 'secret_text' }
    });
    expect(listRoutineEnvironmentVariables).toHaveBeenCalledTimes(2);
  });

  it('rejects an update that would exceed the merged 50-key limit', async () => {
    const currentVariables = Object.fromEntries(
      Array.from({ length: MAX_ENVIRONMENT_VARIABLES }, (_, index) => [
        `KEY_${index}`,
        { Type: 'plain_text', Value: 'value' }
      ])
    );
    const setRoutineEnvironmentVariables = vi.fn();
    (ApiService.getInstance as any).mockResolvedValue({
      listRoutineEnvironmentVariables: vi.fn().mockResolvedValue({
        data: {
          EnvironmentVariables: currentVariables,
          TotalCount: MAX_ENVIRONMENT_VARIABLES
        }
      }),
      setRoutineEnvironmentVariables
    });

    await expect(
      setRoutineEnvironmentVariableValues(
        context,
        { ONE_TOO_MANY: 'value' },
        'plain_text'
      )
    ).resolves.toBe(false);
    expect(setRoutineEnvironmentVariables).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('50 variable limit')
    );
  });

  it('reports partial SetKeys without logging any values', async () => {
    const setRoutineEnvironmentVariables = vi.fn().mockResolvedValue({
      data: { SetKeys: ['FIRST'] }
    });
    (ApiService.getInstance as any).mockResolvedValue({
      listRoutineEnvironmentVariables: vi.fn().mockResolvedValue({
        data: { EnvironmentVariables: {}, TotalCount: 0 }
      }),
      setRoutineEnvironmentVariables
    });

    await expect(
      setRoutineEnvironmentVariableValues(
        context,
        { FIRST: 'value-one', SECOND: 'value-two' },
        'secret_text'
      )
    ).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('Set 1 key.');
    expect(logger.error).toHaveBeenCalledWith('Failed to set: SECOND.');
    expect(serializedLoggerCalls()).not.toContain('value-one');
    expect(serializedLoggerCalls()).not.toContain('value-two');
  });

  it('reports partial DeletedKeys and FailedKeys', async () => {
    (ApiService.getInstance as any).mockResolvedValue({
      deleteRoutineEnvironmentVariables: vi.fn().mockResolvedValue({
        data: { DeletedKeys: ['FIRST'], FailedKeys: ['SECOND'] }
      })
    });

    await expect(
      deleteRoutineEnvironmentVariableKeys(context, ['FIRST', 'SECOND'])
    ).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('Deleted 1 key.');
    expect(logger.error).toHaveBeenCalledWith('Failed to delete: SECOND.');
  });

  function serializedLoggerCalls(): string {
    return JSON.stringify([
      ...vi.mocked(logger.error).mock.calls,
      ...vi.mocked(logger.success).mock.calls,
      ...vi.mocked(logger.warn).mock.calls
    ]);
  }
});
