import { spawnSync } from 'node:child_process';
import { E2E_ADMIN } from './tests/credentials.js';

// Crée l'administrateur de test via la commande officielle (après démarrage de l'API).
export default function globalSetup(): void {
  const r = spawnSync(
    'npm',
    ['run', 'create-admin', '--', '--email', E2E_ADMIN.email, '--nom', 'Admin E2E'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
        SESSION_SECRET: 'secret-e2e-au-moins-32-caracteres-aleatoires',
        ADMIN_PASSWORD: E2E_ADMIN.motDePasse,
      },
    },
  );
  if (r.status !== 0) console.warn(`create-admin : code ${r.status}\n${r.stdout}${r.stderr}`);
}
