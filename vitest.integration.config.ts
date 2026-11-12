/**
 * Vitest config for API integration tests.
 *
 * Requires real ESA credentials and network access.
 *
 * Usage:
 *   npm run test:integration:v1
 *
 * Credentials are read from tests/integration/credentials.ts
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 180000,
    hookTimeout: 60000,
    fileParallelism: false,
    // Integration tests are sequential — avoid concurrent API calls
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});
