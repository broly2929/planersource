import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL est requis pour les tests de l’API');
const dbName = new URL(url).pathname.slice(1);
if (!dbName.endsWith('_test')) {
  throw new Error(`Base de test refusée : « ${dbName} » ne finit pas par _test`);
}
