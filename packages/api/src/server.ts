import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { creerAdminInitial } from './auth/dev-admin.js';
import { avertissementsConfiguration, loadConfig } from './config.js';
import { migrate } from './db/migrate.js';
import { createPool } from './db/pool.js';
import { chargerEnv, ENV_RACINE } from './env.js';

chargerEnv(process.env.ENV_FILE ?? ENV_RACINE);

const config = loadConfig();
for (const message of avertissementsConfiguration(process.env))
  console.warn(`Avertissement : ${message}`);
const pool = createPool(config.databaseUrl);
await migrate(pool);
await creerAdminInitial(
  pool,
  {
    nodeEnv: process.env.NODE_ENV,
    devAdmin: process.env.DEV_ADMIN,
    initialAdmin: process.env.INITIAL_ADMIN,
  },
  console,
);
// Web compilé par `npm run build` (D-138 (1)) : servi s'il existe.
const dossierWeb = fileURLToPath(new URL('../../web/dist/', import.meta.url));
const app = buildApp({
  pool,
  config,
  ...(existsSync(`${dossierWeb}index.html`) ? { dossierWeb } : {}),
});
await app.listen({ port: config.port, host: '0.0.0.0' });
