import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  empreinte,
  nettoyerBasesWorker,
  preparerModele,
} from '../../../scripts/lib/bases-worker.mjs';
import { exigerBaseTest } from '../../../scripts/lib/garde-base-test.mjs';
import { migrate, MIGRATIONS_DIR } from '../src/db/migrate.js';

// Base par worker (D-196 (2), (4)) : modèle construit ou réutilisé selon l'empreinte des migrations,
// bases de worker supprimées au démarrage et à la fin.
export async function setup(): Promise<() => Promise<void>> {
  const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const maintenance = exigerBaseTest(process.env); // garde-fou avant toute connexion (D-193)
  await nettoyerBasesWorker(maintenance);
  await preparerModele(maintenance, {
    empreinte: empreinte(MIGRATIONS_DIR),
    migrer: async (url) => {
      const pool = new pg.Pool({ connectionString: url });
      try {
        await migrate(pool);
      } finally {
        await pool.end();
      }
    },
  });
  return async () => {
    await nettoyerBasesWorker(maintenance);
  };
}
