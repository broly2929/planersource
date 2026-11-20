import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { testDbUrl, useTestApp } from './helpers.js';

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

describe('Démarrage réel du serveur (D-071)', () => {
  const ctx = useTestApp();
  let fils: ChildProcess | undefined;

  afterEach(async () => {
    if (fils && fils.exitCode === null) {
      fils.kill('SIGTERM');
      await once(fils, 'exit');
    }
  });

  async function demarrer(nodeEnv: string | undefined, initialAdmin?: string): Promise<void> {
    const port = await portLibre();
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: testDbUrl(),
      SESSION_SECRET: 'secret-de-test-au-moins-32-caracteres!!',
      PORT: String(port),
      ENV_FILE: '/inexistant/.env',
    };
    delete env.DEV_ADMIN;
    delete env.INITIAL_ADMIN;
    if (initialAdmin !== undefined) env.INITIAL_ADMIN = initialAdmin;
    if (nodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = nodeEnv;
    fils = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
      cwd: RACINE_API,
      env,
      stdio: 'ignore',
    });
    await ecoute(port, fils);
  }

  const emails = async () =>
    (await ctx.pool.query<{ email: string }>('SELECT email FROM utilisateur')).rows.map(
      (r) => r.email,
    );

  // Révision D-031 de DEV-10 (D-138 (2)) : le compte initial est créé quel que soit NODE_ENV.
  it('DEV-10-r1 : NODE_ENV absente, INITIAL_ADMIN=0, base vide → aucun utilisateur créé', async () => {
    await demarrer(undefined, '0');
    expect(await emails()).toEqual([]);
  }, 40000);

  it('DEV-11-r1 : NODE_ENV=development, base vide → admin créé', async () => {
    await demarrer('development');
    const logins = (
      await ctx.pool.query<{ login: string }>('SELECT login FROM utilisateur')
    ).rows.map((r) => r.login);
    expect(logins).toEqual(['admin']);
  }, 40000);
});
