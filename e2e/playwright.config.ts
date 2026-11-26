import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { exigerBaseTest } from '../scripts/lib/garde-base-test.mjs';
import { pileDuWorker } from '../scripts/lib/piles-e2e.mjs';
import { numeroWorker, URL_WEB } from './pile-worker.js';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Garde-fou unique (D-193) : refus avant tout démarrage. La base de TEST_DATABASE_URL est la base de
// maintenance ; elle est gardée dans PLANERSOURCE_E2E_MAINTENANCE avant que le worker ne la remplace.
if (!process.env.PLANERSOURCE_E2E_MAINTENANCE) {
  process.env.PLANERSOURCE_E2E_MAINTENANCE = exigerBaseTest(process.env);
}
const maintenance = exigerBaseTest(process.env, 'PLANERSOURCE_E2E_MAINTENANCE');

// Dans un worker (D-199 (3)) : specs et helpers visent la base de la pile du worker. Aucun effet de
// bord ici : l'évaluation sert aussi à `playwright test --list`.
const n = numeroWorker();
if (n !== undefined) process.env.TEST_DATABASE_URL = pileDuWorker(maintenance, n).base.url;

// D-262 (3) : délais plus larges sur la CI (runner plus lent), inchangés en local ; aucune relance.
const DELAI = process.env.CI ? 5000 : 3000;

export default defineConfig({
  testDir: 'tests',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 2,
  expect: { timeout: DELAI },
  use: { baseURL: URL_WEB, actionTimeout: DELAI },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
