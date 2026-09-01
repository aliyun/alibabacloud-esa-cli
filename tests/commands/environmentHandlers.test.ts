import { Readable } from 'node:stream';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveRoutineEnvironmentContext: vi.fn(),
  listAllRoutineEnvironmentVariables: vi.fn(),
  parseEnvironmentVariableAssignment: vi.fn(),
  parseEnvironmentVariableFile: vi.fn(),
  setRoutineEnvironmentVariableValues: vi.fn(),
  deleteRoutineEnvironmentVariableKeys: vi.fn(),
  validateEnvironmentVariableKey: vi.fn(),
  promptParameter: vi.fn(),
  logger: {
    error: vi.fn(),
    log: vi.fn(),
    table: vi.fn()
  }
}));

vi.mock('../../src/commands/env/utils.js', () => ({
  addRoutineEnvironmentOptions: vi.fn((yargs) => yargs),
  MAX_ENVIRONMENT_VARIABLE_VALUE_LENGTH: 200,
  resolveRoutineEnvironmentContext: mocks.resolveRoutineEnvironmentContext,
  listAllRoutineEnvironmentVariables: mocks.listAllRoutineEnvironmentVariables,
  parseEnvironmentVariableAssignment: mocks.parseEnvironmentVariableAssignment,
  parseEnvironmentVariableFile: mocks.parseEnvironmentVariableFile,
  setRoutineEnvironmentVariableValues:
    mocks.setRoutineEnvironmentVariableValues,
  deleteRoutineEnvironmentVariableKeys:
    mocks.deleteRoutineEnvironmentVariableKeys,
  validateEnvironmentVariableKey: mocks.validateEnvironmentVariableKey
}));
vi.mock('../../src/libs/logger.js', () => ({ default: mocks.logger }));
vi.mock('../../src/utils/prompt.js', () => ({
  default: mocks.promptParameter
}));

import { handleDeleteEnvironmentVariable } from '../../src/commands/env/delete.js';
import { handleListEnvironmentVariables } from '../../src/commands/env/list.js';
import { handleSetEnvironmentVariable } from '../../src/commands/env/set.js';
import { handleBulkSecrets } from '../../src/commands/secret/bulk.js';
import {
  handlePutSecret,
  readSecretFromStream
} from '../../src/commands/secret/put.js';

describe('environment and secret command handlers', () => {
  const context = { name: 'my-routine', environment: 'production' as const };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveRoutineEnvironmentContext.mockResolvedValue(context);
    mocks.setRoutineEnvironmentVariableValues.mockResolvedValue(true);
    mocks.deleteRoutineEnvironmentVariableKeys.mockResolvedValue(true);
    mocks.validateEnvironmentVariableKey.mockReturnValue(null);
    mocks.promptParameter.mockResolvedValue('top-secret-token');
    mocks.parseEnvironmentVariableAssignment.mockImplementation(
      (assignment: string) => {
        const separatorIndex = assignment.indexOf('=');
        return {
          key: assignment.slice(0, separatorIndex),
          value: assignment.slice(separatorIndex + 1)
        };
      }
    );
  });

  it('masks secret_text values in env list output', async () => {
    mocks.listAllRoutineEnvironmentVariables.mockResolvedValue({
      LOG_LEVEL: {
        Type: 'plain_text',
        Value: 'info',
        UpdatedAt: '2026-08-28T01:00:00Z'
      },
      API_TOKEN: {
        Type: 'secret_text',
        Value: 'server-returned-secret',
        UpdatedAt: '2026-08-28T02:00:00Z'
      }
    });

    await expect(
      handleListEnvironmentVariables({ environment: 'production' })
    ).resolves.toBe(true);

    expect(mocks.logger.table).toHaveBeenCalledOnce();
    const [, rows] = mocks.logger.table.mock.calls[0];
    expect(rows).toContainEqual([
      'API_TOKEN',
      'secret_text',
      '********',
      '2026-08-28T02:00:00Z'
    ]);
    expect(rows).toContainEqual([
      'LOG_LEVEL',
      'plain_text',
      'info',
      '2026-08-28T01:00:00Z'
    ]);
    expect(JSON.stringify(mocks.logger.table.mock.calls)).not.toContain(
      'server-returned-secret'
    );
  });

  it('sends env set values as plain_text', async () => {
    await expect(
      handleSetEnvironmentVariable({
        assignment: 'LOG_LEVEL=info',
        environment: 'production'
      })
    ).resolves.toBe(true);

    expect(mocks.setRoutineEnvironmentVariableValues).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ LOG_LEVEL: 'info' }),
      'plain_text'
    );
  });

  it('sends the requested key from env delete', async () => {
    await expect(
      handleDeleteEnvironmentVariable({
        key: 'LOG_LEVEL',
        environment: 'production'
      })
    ).resolves.toBe(true);

    expect(mocks.deleteRoutineEnvironmentVariableKeys).toHaveBeenCalledWith(
      context,
      ['LOG_LEVEL']
    );
  });

  it('sends secret put values as secret_text without logging the value', async () => {
    const secretValue = 'top-secret-token';
    mocks.promptParameter.mockResolvedValue(secretValue);

    await expect(
      handlePutSecret({ key: 'API_TOKEN', environment: 'production' })
    ).resolves.toBe(true);

    expect(mocks.setRoutineEnvironmentVariableValues).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ API_TOKEN: secretValue }),
      'secret_text'
    );
    expect(mocks.promptParameter).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'password' })
    );
    expect(serializedLoggerCalls()).not.toContain(secretValue);
  });

  it('reads a piped secret and removes only its final line ending', async () => {
    await expect(
      readSecretFromStream(Readable.from(['line-one\nline-two\r\n']))
    ).resolves.toBe('line-one\nline-two');
  });

  it('parses a secret bulk file and sends every value as secret_text', async () => {
    const secrets = {
      API_TOKEN: 'bulk-secret-token',
      SIGNING_KEY: 'bulk-signing-key'
    };
    mocks.parseEnvironmentVariableFile.mockResolvedValue(secrets);

    await expect(
      handleBulkSecrets({
        file: '.env.production',
        environment: 'production'
      })
    ).resolves.toBe(true);

    expect(mocks.parseEnvironmentVariableFile).toHaveBeenCalledWith(
      '.env.production'
    );
    expect(mocks.setRoutineEnvironmentVariableValues).toHaveBeenCalledWith(
      context,
      secrets,
      'secret_text'
    );
    expect(serializedLoggerCalls()).not.toContain('bulk-secret-token');
    expect(serializedLoggerCalls()).not.toContain('bulk-signing-key');
  });

  function serializedLoggerCalls(): string {
    return JSON.stringify(
      Object.values(mocks.logger).flatMap((method) => method.mock.calls)
    );
  }
});
