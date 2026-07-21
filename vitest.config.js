import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,ts,jsx,tsx}'],
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
