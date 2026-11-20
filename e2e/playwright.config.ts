import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const testDb = process.env.TEST_DATABASE_URL ?? '';
const apiEnv = {
  DATABASE_URL: testDb,
  SESSION_SECRET: 'secret-e2e-au-moins-32-caracteres-aleatoires',
  NODE_ENV: 'development',
  DEV_ADMIN: '0',
  INITIAL_ADMIN: '0',
  PORT: '3000',
};

export default defineConfig({
  testDir: 'tests',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 3000 },
  use: { baseURL: 'http://localhost:5173', actionTimeout: 3000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node e2e/prepare-db.mjs && npm run start -w @planersource/api',
      cwd: '..',
      port: 3000,
      env: apiEnv,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -w @planersource/web',
      cwd: '..',
      port: 5173,
      reuseExistingServer: false,
    },
  ],
});
