// Lot 5b, avertissements de configuration au démarrage (D-140 (5) (a)) : INST-13.
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import * as configuration from '../src/config.js';
import { testDbUrl, useTestApp } from './helpers.js';

const RACINE_API = fileURLToPath(new URL('..', import.meta.url));
const SECRET_MODELE = 'changez-moi-au-moins-32-caracteres-aleatoires';
const BASE_MODELE = 'changezmoi';

const avertissements = (env: Record<string, string>): string[] =>
  (
    configuration as unknown as {
      avertissementsConfiguration: (e: NodeJS.ProcessEnv) => string[];
    }
  ).avertissementsConfiguration(env);

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

describe('Avertissements de configuration (D-140 (5) (a))', () => {
  useTestApp();
  let fils: ChildProcess | undefined;

  afterEach(async () => {
    if (fils && fils.exitCode === null && fils.signalCode === null) {
      fils.kill('SIGTERM');
      await once(fils, 'exit');
    }
    fils = undefined;
  });

  it('INST-13 : valeurs du modèle → 2 messages ; une seule → 1 ; valeurs changées → aucun', () => {
    const deux = avertissements({ SESSION_SECRET: SECRET_MODELE, POSTGRES_PASSWORD: BASE_MODELE });
    expect(deux).toHaveLength(2);
    expect(deux[0]).toContain('SESSION_SECRET');
    expect(deux[1]).toContain('POSTGRES_PASSWORD');
    expect(
      avertissements({ SESSION_SECRET: SECRET_MODELE, POSTGRES_PASSWORD: 'autre' }),
    ).toHaveLength(1);
    expect(
      avertissements({
        SESSION_SECRET: 'un-vrai-secret-aleatoire-de-32-car!!',
        POSTGRES_PASSWORD: 'x7k2',
      }),
    ).toEqual([]);
    expect(avertissements({})).toEqual([]);
  });

  it('INST-13-r1 : démarrage réel avec les valeurs du modèle → avertissements dans la sortie, serveur démarré', async () => {
    const port = await portLibre();
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: testDbUrl(),
      SESSION_SECRET: SECRET_MODELE,
      POSTGRES_PASSWORD: BASE_MODELE,
      PORT: String(port),
      NODE_ENV: 'production',
      INITIAL_ADMIN: '0',
      ENV_FILE: '/inexistant/.env',
    };
    delete env.DEV_ADMIN;
    fils = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
      cwd: RACINE_API,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let sortie = '';
    fils.stdout!.on('data', (d: Buffer) => (sortie += d.toString()));
    fils.stderr!.on('data', (d: Buffer) => (sortie += d.toString()));
    await ecoute(port, fils);
    expect(sortie).toContain('SESSION_SECRET');
    expect(sortie).toContain('POSTGRES_PASSWORD');
  }, 40000);
});
