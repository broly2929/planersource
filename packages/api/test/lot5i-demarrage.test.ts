// Lot 5i, compte initial au démarrage (D-138 (2)) : INST-5 à INST-7.
// Démarrage réel du serveur en processus, comme DEV-10 (dev-demarrage.test.ts).
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { seedUser, testDbUrl, useTestApp } from './helpers.js';

const RACINE_API = fileURLToPath(new URL('..', import.meta.url));

async function portLibre(): Promise<number> {
  const s = net.createServer();
  s.listen(0);
  await once(s, 'listening');
  const { port } = s.address() as net.AddressInfo;
  s.close();
  await once(s, 'close');
  return port;
}

async function ecoute(port: number, fils: ChildProcess): Promise<void> {
  for (let i = 0; i < 150; i++) {
    if (fils.exitCode !== null) throw new Error(`le serveur s'est arrêté (${fils.exitCode})`);
    const ok = await new Promise<boolean>((resolve) => {
      const c = net.connect(port, '127.0.0.1');
      c.once('connect', () => (c.destroy(), resolve(true)));
      c.once('error', () => resolve(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("le serveur n'écoute pas");
}

describe('Compte initial au démarrage, production (D-138 (2))', () => {
  const ctx = useTestApp();
  let fils: ChildProcess | undefined;

  afterEach(async () => {
    if (fils && fils.exitCode === null) {
      fils.kill('SIGTERM');
      await once(fils, 'exit');
    }
  });

  async function demarrer(initialAdmin?: string): Promise<number> {
    const port = await portLibre();
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: testDbUrl(),
      SESSION_SECRET: 'secret-de-test-au-moins-32-caracteres!!',
      PORT: String(port),
      NODE_ENV: 'production',
      ENV_FILE: '/inexistant/.env',
    };
    delete env.DEV_ADMIN;
    if (initialAdmin === undefined) delete env.INITIAL_ADMIN;
    else env.INITIAL_ADMIN = initialAdmin;
    fils = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
      cwd: RACINE_API,
      env,
      stdio: 'ignore',
    });
    await ecoute(port, fils);
    return port;
  }

  const utilisateurs = async () =>
    (
      await ctx.pool.query(
        'SELECT id, nom, login, email, role, actif, mot_de_passe_hash FROM utilisateur ORDER BY id',
      )
    ).rows;

  const connexion = async (port: number) =>
    (
      await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifiant: 'admin', mot_de_passe: 'admin' }),
      })
    ).status;

  it('INST-5 : base vide → administrateur admin / admin créé, connexion 200', async () => {
    const port = await demarrer();
    const lignes = (
      await ctx.pool.query('SELECT nom, login, email, role, actif FROM utilisateur ORDER BY id')
    ).rows;
    expect(lignes).toEqual([
      { nom: 'Administrateur', login: 'admin', email: null, role: 'administrateur', actif: true },
    ]);
    expect(await connexion(port)).toBe(200);
  }, 40000);

  it('INST-6 : base non vide → aucune création, table inchangée, admin / admin refusé', async () => {
    await seedUser(ctx.pool, { email: 'chef@example.test', role: 'chef_de_projet' });
    const avant = await utilisateurs();
    const port = await demarrer();
    expect(await utilisateurs()).toEqual(avant);
    expect(await connexion(port)).toBe(401);
    expect(await utilisateurs()).toEqual(avant);
  }, 40000);

  it('INST-7 : INITIAL_ADMIN=0, base vide → aucune création', async () => {
    await demarrer('0');
    expect(await utilisateurs()).toEqual([]);
  }, 40000);
});
