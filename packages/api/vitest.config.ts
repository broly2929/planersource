import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api',
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // Une base par worker (D-196) : fichiers en parallèle ; nombre de workers à la racine.
    testTimeout: 20000,
  },
});
