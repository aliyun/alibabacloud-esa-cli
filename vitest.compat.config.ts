/**
 * Vitest config for CLI contract tests.
 *
 * Usage:
 *   npx vitest run --config vitest.compat.config.ts
 *
 * Or with a custom binary:
 *   ESA_CLI_BIN=path/to/binary npx vitest run --config vitest.compat.config.ts
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/compat/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000
  }
});
