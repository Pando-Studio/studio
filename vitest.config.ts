import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts'],
    exclude: ['__tests__/**/*.integration.test.ts'],
    setupFiles: ['./__tests__/setup.ts'],
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/lib/db': path.resolve(__dirname, 'lib/db'),
    },
  },
});
