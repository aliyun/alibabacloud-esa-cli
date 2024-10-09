import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,ts,jsx,tsx}'],
    globals: true,
    coverage: {
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      threshold: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      }
    },

    environment: 'node',
    setupFiles: ['./tests/setupTest.ts']
  }
});
