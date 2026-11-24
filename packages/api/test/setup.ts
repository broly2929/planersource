import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { creerBaseWorker } from '../../../scripts/lib/bases-worker.mjs';
import { exigerBaseTest } from '../../../scripts/lib/garde-base-test.mjs';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Garde-fou unique (D-193) : refus avant toute connexion.
const maintenance = exigerBaseTest(process.env);

// Base du worker (D-196 (3)) : créée depuis le modèle au premier fichier du worker ; le processus de
// test travaille ensuite sur elle (testDbUrl(), pools, serveurs lancés par les tests).
const urlWorker = await creerBaseWorker(maintenance, {
  worker: process.env.VITEST_POOL_ID ?? '',
});
process.env.TEST_DATABASE_URL = exigerBaseTest({ TEST_DATABASE_URL: urlWorker });
