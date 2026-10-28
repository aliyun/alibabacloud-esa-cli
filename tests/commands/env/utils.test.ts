import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  MAX_ENVIRONMENT_VARIABLES,
  parseEnvironmentVariableAssignment,
  parseEnvironmentVariableFile,
  validateEnvironmentVariableKey,
  validateEnvironmentVariables
} from '../../../src/commands/env/utils.js';

describe('environment variable utilities', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true }))
    );
  });

  describe('validation', () => {
    it('accepts supported keys and values', () => {
      expect(validateEnvironmentVariableKey('LOG_LEVEL_2')).toBeNull();
      expect(
        validateEnvironmentVariables({ LOG_LEVEL: 'info', EMPTY_VALUE: '' })
      ).toBeNull();
    });

    it.each(['HAS-DASH', 'HAS.DOT', 'HAS SPACE', '__proto__', 'constructor'])(
      'rejects the unsupported or reserved key %s',
      (key) => {
        expect(validateEnvironmentVariableKey(key)).not.toBeNull();
      }
    );

    it('rejects values longer than 200 characters', () => {
      expect(
        validateEnvironmentVariables({ TOO_LONG: 'x'.repeat(201) })
      ).toContain('exceeds 200 characters');
    });

    it('rejects more than 50 variables', () => {
      const variables = Object.fromEntries(
        Array.from({ length: MAX_ENVIRONMENT_VARIABLES + 1 }, (_, index) => [
          `KEY_${index}`,
          'value'
        ])
      );

      expect(validateEnvironmentVariables(variables)).toContain(
        `maximum of ${MAX_ENVIRONMENT_VARIABLES}`
      );
    });
  });

  describe('assignment parsing', () => {
    it('splits on only the first equals sign', () => {
      expect(
        parseEnvironmentVariableAssignment(
          'API_URL=https://example.test/path?token=a=b'
        )
      ).toEqual({
        key: 'API_URL',
        value: 'https://example.test/path?token=a=b'
      });
    });

    it('allows an explicitly empty value', () => {
      expect(parseEnvironmentVariableAssignment('OPTIONAL=')).toEqual({
        key: 'OPTIONAL',
        value: ''
      });
    });

    it.each(['LOG_LEVEL', '=info'])(
      'rejects an assignment without a non-empty key: %s',
      (assignment) => {
        expect(() => parseEnvironmentVariableAssignment(assignment)).toThrow(
          'KEY=VALUE'
        );
      }
    );
  });

  describe('bulk file parsing', () => {
    it('parses dotenv syntax and preserves literal variable references', async () => {
      const directory = await mkdtemp(
        path.join(os.tmpdir(), 'esa-cli-env-utils-')
      );
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, '.env.production');
      await writeFile(
        filePath,
        [
          '# production secrets',
          'API_TOKEN="a=b=c"',
          'EMPTY_VALUE=',
          'TOKEN_COPY=${API_TOKEN}',
          'MULTILINE="line one',
          'line two"'
        ].join('\n')
      );

      const variables = await parseEnvironmentVariableFile(filePath);

      expect(variables).toMatchObject({
        API_TOKEN: 'a=b=c',
        EMPTY_VALUE: '',
        TOKEN_COPY: '${API_TOKEN}',
        MULTILINE: 'line one\nline two'
      });
      expect(Object.getPrototypeOf(variables)).toBeNull();
    });

    it('rejects a missing bulk file', async () => {
      await expect(
        parseEnvironmentVariableFile(
          path.join(os.tmpdir(), 'esa-cli-missing-env-file')
        )
      ).rejects.toThrow();
    });

    it('rejects malformed lines instead of silently importing a subset', async () => {
      const directory = await mkdtemp(
        path.join(os.tmpdir(), 'esa-cli-env-utils-')
      );
      temporaryDirectories.push(directory);
      const filePath = path.join(directory, '.env.production');
      await writeFile(
        filePath,
        ['API_TOKEN=valid-secret', 'THIS LINE IS MALFORMED'].join('\n')
      );

      await expect(parseEnvironmentVariableFile(filePath)).rejects.toThrow(
        'Invalid dotenv syntax at line 2.'
      );
    });
  });
});
