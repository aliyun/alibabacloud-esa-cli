import { defineConfig } from 'vitest/config';

// Unit tests only. Contract / E2E / integration tests spawn the built CLI as a
// child process and are driven by their own configs:
//   vitest.compat.config.ts, vitest.e2e.v1.config.ts, vitest.integration.config.ts
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,ts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      'tests/compat/**',
      'tests/e2e/**',
      'tests/integration/**'
    ],
    globals: true,
    coverage: {
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 31,
        branches: 27,
        functions: 23,
        lines: 31
      }
    },

    environment: 'node',
    setupFiles: ['./tests/setupTest.ts']
  }
});
