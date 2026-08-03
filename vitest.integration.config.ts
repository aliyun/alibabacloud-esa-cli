/**
 * Vitest config for API integration tests.
 *
 * Requires real ESA credentials and network access.
 *
 * Usage:
 *   ESA_CLI_BIN=v2/bin/esa.mjs npx vitest run --config vitest.integration.config.ts
 *
 * Credentials are read from tests/integration/credentials.ts
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    // Integration tests are sequential — avoid concurrent API calls
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});
