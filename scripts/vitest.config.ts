import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'scripts',
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60000,
  },
});
