import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface Ecouteur {
  port: number;
  connexions: () => number;
  fermer: () => Promise<void>;
}

/** Serveur TCP local qui compte les connexions : prouve qu'aucune connexion n'a été tentée. */
export async function ecouteur(): Promise<Ecouteur> {
  let n = 0;
  const serveur: Server = createServer((s) => {
    n += 1;
    s.destroy();
  });
  await new Promise<void>((ok) => serveur.listen(0, '127.0.0.1', ok));
  const adresse = serveur.address();
  const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
  return {
    port,
    connexions: () => n,
    fermer: () => new Promise<void>((ok) => serveur.close(() => ok())),
  };
}

export function url(port: number, base: string): string {
  return `postgres://planer:mot-de-passe-secret@127.0.0.1:${port}/${base}`;
}

export interface Resultat {
  code: number;
  sortie: string;
}

/** Lance une commande avec un environnement maîtrisé (sans VITEST*, sans les variables de base). */
export function lancer(
  commande: string,
  args: string[],
  opts: { cwd?: string; env?: Record<string, string> } = {},
): Promise<Resultat> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || k.startsWith('VITEST') || k === 'DATABASE_URL') continue;
    if (k === 'TEST_DATABASE_URL') continue;
    env[k] = v;
  }
  Object.assign(env, opts.env ?? {});
  return new Promise((ok) => {
    execFile(
      commande,
      args,
      { cwd: opts.cwd ?? RACINE, env, encoding: 'utf8', timeout: 55000 },
      (err, stdout, stderr) => {
        const code = err ? (typeof err.code === 'number' ? err.code : 1) : 0;
        ok({ code, sortie: `${stdout}${stderr}` });
      },
    );
  });
}

/** Environnement qui désigne la base de test d'un lancement (le nom de la variable reste ici, GBT-9). */
export function baseDeTest(valeur: string): Record<string, string> {
  return { TEST_DATABASE_URL: valeur };
}
