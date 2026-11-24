import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request, type FullConfig } from '@playwright/test';
import pg from 'pg';
import { empreinte, preparerModele } from '../scripts/lib/bases-worker.mjs';
import { exigerBaseTest } from '../scripts/lib/garde-base-test.mjs';
import {
  arreterPiles,
  attendrePort,
  lancerProcessus,
  nettoyerPiles,
  pileDuWorker,
  recreerBaseWorker,
  reserverRegistre,
  type Pile,
} from '../scripts/lib/piles-e2e.mjs';
import { migrate, MIGRATIONS_DIR } from '../packages/api/src/db/migrate.js';
import { etatAdmin } from './etat-session.js';
import { E2E_ADMIN } from './tests/credentials.js';

const racine = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const REGISTRE = racine('e2e/.piles/registre.json');
const DELAI_PORT = 60_000;
const ENV_API = {
  SESSION_SECRET: 'secret-e2e-au-moins-32-caracteres-aleatoires',
  NODE_ENV: 'development',
  DEV_ADMIN: '0',
  INITIAL_ADMIN: '0',
};

/** Lance une commande et attend sa fin ; erreur avec la sortie si le code n'est pas 0. */
function executer(commande: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  return new Promise<void>((ok, ko) => {
    const c = spawn(commande, args, { cwd, env });
    let sortie = '';
    c.stdout.on('data', (b: Buffer) => (sortie += b.toString()));
    c.stderr.on('data', (b: Buffer) => (sortie += b.toString()));
    c.on('error', ko);
    c.on('exit', (code) =>
      code === 0 ? ok() : ko(new Error(`${commande} ${args.join(' ')} : code ${code}\n${sortie}`)),
    );
  });
}

/** Pile du worker (D-199 (2)) : base neuve, administrateur, API, front, session partagée. */
async function demarrerPile(maintenance: string, p: Pile): Promise<void> {
  await recreerBaseWorker(maintenance, { n: p.n });
  const env = { ...process.env, ...ENV_API, DATABASE_URL: p.base.url };
  await executer(
    racine('node_modules/.bin/tsx'),
    ['src/cli/create-admin.ts', '--email', E2E_ADMIN.email, '--nom', 'Admin E2E'],
    racine('packages/api'),
    { ...env, ADMIN_PASSWORD: E2E_ADMIN.motDePasse },
  );
  const api = lancerProcessus({
    registre: REGISTRE,
    nom: `api-w${p.n}`,
    port: p.portApi,
    commande: racine('node_modules/.bin/tsx'),
    args: ['src/server.ts'],
    cwd: racine('packages/api'),
    env: { ...env, PORT: String(p.portApi) },
  });
  const web = lancerProcessus({
    registre: REGISTRE,
    nom: `web-w${p.n}`,
    port: p.portWeb,
    commande: racine('node_modules/.bin/vite'),
    args: [
      '--config',
      racine('e2e/vite-pile.config.ts'),
      '--port',
      String(p.portWeb),
      '--strictPort',
    ],
    cwd: racine('packages/web'),
    env: {
      ...process.env,
      VITE_API_URL: p.urlApi,
      PLANERSOURCE_VITE_CACHE: racine(`e2e/.piles/vite-w${p.n}`),
    },
  });
  for (const [enfant, port] of [
    [api, p.portApi],
    [web, p.portWeb],
  ] as const) {
    try {
      await attendrePort(port, DELAI_PORT);
    } catch (e) {
      throw new Error(`${(e as Error).message}\n${enfant.sortie()}`);
    }
  }
  await ouvrirSessionAdmin(p);
}

/** Session partagée de l'administrateur (D-194 (4), D-199 (5)) : ouverte par l'API du worker. */
async function ouvrirSessionAdmin(p: Pile): Promise<void> {
  const etat = etatAdmin(p.n);
  rmSync(etat, { force: true });
  const api = await request.newContext({ baseURL: p.urlWeb });
  try {
    await api.get('/'); // amorce le front (dépendances optimisées avant le premier test)
    const r = await api.post('/api/auth/login', {
      data: { email: E2E_ADMIN.email, mot_de_passe: E2E_ADMIN.motDePasse },
    });
    if (!r.ok()) {
      console.warn(
        `session partagée du worker ${p.n} : connexion refusée (${r.status()}), repli sur l'écran de connexion`,
      );
      return;
    }
    mkdirSync(dirname(etat), { recursive: true });
    await api.storageState({ path: etat });
  } finally {
    await api.dispose();
  }
}

// Piles par worker (D-199 (3), (6)) : nettoyage d'une exécution précédente, modèle de D-196, puis une
// pile par worker en parallèle. Le teardown rendu arrête les piles et supprime les bases.
export default async function globalSetup(config: FullConfig): Promise<() => Promise<void>> {
  const maintenance = exigerBaseTest(process.env, 'PLANERSOURCE_E2E_MAINTENANCE');
  const piles = Array.from({ length: config.workers }, (_, i) => pileDuWorker(maintenance, i + 1));
  await nettoyerPiles({
    registre: REGISTRE,
    urlMaintenance: maintenance,
    ports: piles.flatMap((p) => [p.portApi, p.portWeb]),
  });
  reserverRegistre(REGISTRE); // D-199 (14) : avant toute base, refus d'un démarrage concurrent
  const arreter = async () => {
    await arreterPiles({ registre: REGISTRE, urlMaintenance: maintenance, proprietaire: true });
  };
  try {
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
    await Promise.all(piles.map((p) => demarrerPile(maintenance, p)));
  } catch (e) {
    await arreter();
    throw e;
  }
  return arreter;
}
