/**
 * Vitest config for v1 interactive E2E tests.
 *
 * Usage:
 *   npx vitest run --config vitest.e2e.v1.config.ts
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/v1/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
