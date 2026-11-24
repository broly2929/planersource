import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exigerBaseTest } from '../lib/garde-base-test.mjs';
import { ecouteur, lancer, RACINE, url } from './outillage-helpers.js';

// e2e en parallèle, une pile par worker (D-199) : E2P-1 à E2P-5, E2P-7, E2P-8.
// Import dynamique : chaque test échoue pour sa propre raison tant que le module manque.
const pe = () => import('../lib/piles-e2e.mjs');
const MESSAGE = /Garde-fou base de test/;
const FAMILLE = 'essaie2p';
const MODULE = pathToFileURL(join(RACINE, 'scripts/lib/piles-e2e.mjs')).href;

const envRacine = join(RACINE, '.env');
if (existsSync(envRacine)) process.loadEnvFile(envRacine);

const vivant = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const attendre = async (f: () => boolean, ms = 5000) => {
  const fin = Date.now() + ms;
  while (!f() && Date.now() < fin) await new Promise((ok) => setTimeout(ok, 50));
  return f();
};
const portOccupe = (port: number) =>
  new Promise<boolean>((ok) => {
    const s = createServer();
    s.once('error', () => ok(true));
    s.listen(port, () => s.close(() => ok(false)));
  });
const dossier = () => mkdtempSync(join(tmpdir(), 'e2p-'));

describe('E2P-1 noms et ports', () => {
  const m = 'postgres://u:p@localhost:5432/planersource_test';
  it('worker 1 : base, modèle, ports', async () => {
    const { pileDuWorker } = await pe();
    const p = pileDuWorker(m, 1);
    expect(p.base.nom).toBe('planersource_e2e_w1_test');
    expect(p.modele.nom).toBe('planersource_vitest_modele_test');
    expect(p.portApi).toBe(3301);
    expect(p.portWeb).toBe(5301);
    expect(p.urlWeb).toBe('http://localhost:5301');
    expect(p.urlApi).toBe('http://localhost:3301');
    expect(new URL(p.base.url).pathname).toBe('/planersource_e2e_w1_test');
  });
  it.each([0, -1, 1.5, Number.NaN])('worker %s refusé', async (n) => {
    const { pileDuWorker } = await pe();
    expect(() => pileDuWorker(m, n)).toThrow(/worker/);
  });
  it('de 1 à 64 workers, jamais 3000 ni 5173', async () => {
    const { pileDuWorker } = await pe();
    for (let n = 1; n <= 64; n++) {
      const p = pileDuWorker(m, n);
      expect([3000, 5173]).not.toContain(p.portApi);
      expect([3000, 5173]).not.toContain(p.portWeb);
    }
  });
  it('base de maintenance hors règle : message du garde-fou', async () => {
    const { pileDuWorker } = await pe();
    expect(() => pileDuWorker('postgres://u:p@localhost:5432/planersource', 1)).toThrow(MESSAGE);
  });
});

describe('Bases et processus réels (E2P-2 à E2P-4, E2P-8)', () => {
  const maintenance = exigerBaseTest(process.env);
  let admin: pg.Client;
  const enfants: ChildProcess[] = [];
  const bases = async () =>
    (
      await admin.query<{ datname: string }>(
        'SELECT datname FROM pg_database WHERE datname LIKE $1 ORDER BY 1',
        [`%\\_${FAMILLE}\\_%`],
      )
    ).rows.map((r) => r.datname);
  const surBase = async <T>(u: string, f: (c: pg.Client) => Promise<T>) => {
    const c = new pg.Client({ connectionString: u });
    await c.connect();
    try {
      return await f(c);
    } finally {
      await c.end();
    }
  };
  const purger = async () => {
    for (const n of await bases()) await admin.query(`DROP DATABASE IF EXISTS ${n} WITH (FORCE)`);
  };
  /** Groupe de processus détaché (`sleep`), marqué ou non comme processus d'une pile. */
  const groupe = (marqueur?: { nom: string; valeur: string }) => {
    const env = { ...process.env } as Record<string, string>;
    if (marqueur) env[marqueur.nom] = marqueur.valeur;
    const c = spawn('sleep', ['60'], { detached: true, stdio: 'ignore', env });
    enfants.push(c);
    return c.pid!;
  };

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: maintenance });
    await admin.connect();
    await purger();
  });
  afterAll(async () => {
    for (const c of enfants) if (c.pid && vivant(c.pid)) process.kill(c.pid, 'SIGKILL');
    await purger();
    await admin.end();
  });

  it('E2P-2 base du worker recréée neuve depuis le modèle', async () => {
    const { recreerBaseWorker, pileDuWorker } = await pe();
    const { preparerModele } = await import('../lib/bases-worker.mjs');
    await preparerModele(maintenance, {
      famille: `${FAMILLE}m`,
      empreinte: 'e2p-2',
      migrer: (u) =>
        surBase(u, async (c) => {
          await c.query('CREATE TABLE temoin (texte text)');
          await c.query("INSERT INTO temoin VALUES ('modele')");
        }),
    });
    const opts = { famille: FAMILLE, familleModele: `${FAMILLE}m` };
    const u1 = await recreerBaseWorker(maintenance, { ...opts, n: 2 });
    expect(u1).toBe(pileDuWorker(maintenance, 2, opts).base.url);
    await surBase(u1, (c) => c.query("INSERT INTO temoin VALUES ('execution precedente')"));
    const u2 = await recreerBaseWorker(maintenance, { ...opts, n: 2 });
    const lignes = await surBase(u2, (c) => c.query('SELECT texte FROM temoin ORDER BY 1'));
    expect(lignes.rows.map((r) => r.texte)).toEqual(['modele']);
  });

  it('E2P-3 lanceur vivant : refus ; lanceur mort : groupes marqués arrêtés, bases supprimées, registre effacé', async () => {
    const { MARQUEUR, debutProcessus, ecrireRegistre, nettoyerPiles, recreerBaseWorker } =
      await pe();
    const registre = join(dossier(), 'registre.json');
    const lanceur = spawn('sleep', ['60'], { stdio: 'ignore' });
    enfants.push(lanceur);
    const marque = groupe({ nom: MARQUEUR, valeur: registre });
    await recreerBaseWorker(maintenance, { famille: FAMILLE, familleModele: `${FAMILLE}m`, n: 1 });
    const contenu = {
      lanceur: { pid: lanceur.pid!, debut: debutProcessus(lanceur.pid!) },
      processus: [{ nom: 'api-w1', pgid: marque, port: 38101 }],
    };
    ecrireRegistre(registre, contenu);
    const avant = readFileSync(registre, 'utf8');
    const opts = { registre, urlMaintenance: maintenance, famille: FAMILLE, ports: [38101] };

    await expect(nettoyerPiles(opts)).rejects.toThrow(String(lanceur.pid));
    expect(vivant(marque)).toBe(true);
    expect(readFileSync(registre, 'utf8')).toBe(avant);
    expect(await bases()).toContain(`planersource_${FAMILLE}_w1_test`);

    lanceur.kill('SIGKILL');
    expect(await attendre(() => !vivant(lanceur.pid!))).toBe(true);
    await nettoyerPiles(opts);
    expect(await attendre(() => !vivant(marque))).toBe(true);
    expect(await bases()).not.toContain(`planersource_${FAMILLE}_w1_test`);
    expect(existsSync(registre)).toBe(false);
  });

  it('E2P-4 pid sans marqueur : non arrêté', async () => {
    const { ecrireRegistre, nettoyerPiles } = await pe();
    const registre = join(dossier(), 'registre.json');
    const etranger = groupe();
    ecrireRegistre(registre, {
      lanceur: { pid: 999999999, debut: '0' },
      processus: [{ nom: 'api-w1', pgid: etranger, port: 38102 }],
    });
    await nettoyerPiles({ registre, urlMaintenance: maintenance, famille: FAMILLE, ports: [] });
    expect(vivant(etranger)).toBe(true);
    process.kill(-etranger, 'SIGKILL');
  });

  it('E2P-8 lanceur tué par SIGKILL : le nettoyage suivant arrête les orphelins, supprime les bases, libère les ports', async () => {
    const { nettoyerPiles } = await pe();
    const d = dossier();
    const registre = join(d, 'registre.json');
    const port = 38103;
    const script = join(d, 'lanceur.mjs');
    writeFileSync(
      script,
      [
        `import { lancerProcessus, recreerBaseWorker, attendrePort } from ${JSON.stringify(MODULE)};`,
        `await recreerBaseWorker(${JSON.stringify(maintenance)}, { famille: '${FAMILLE}', familleModele: '${FAMILLE}m', n: 3 });`,
        `lancerProcessus({ registre: ${JSON.stringify(registre)}, nom: 'api-w3', port: ${port}, commande: process.execPath,`,
        `  args: ['-e', "require('node:net').createServer().listen(${port}); setInterval(() => {}, 1000)"], cwd: ${JSON.stringify(d)}, env: process.env });`,
        `await attendrePort(${port}, 10000);`,
        `console.log('pret');`,
        `setInterval(() => {}, 1000);`,
      ].join('\n'),
    );
    const l = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'inherit'] });
    enfants.push(l);
    const pret = await new Promise<boolean>((ok) => {
      l.stdout!.on('data', (b: Buffer) => b.toString().includes('pret') && ok(true));
      l.on('exit', () => ok(false));
    });
    expect(pret).toBe(true);
    l.kill('SIGKILL');
    expect(await attendre(() => !vivant(l.pid!))).toBe(true);
    expect(await portOccupe(port)).toBe(true); // orphelin toujours là
    await nettoyerPiles({ registre, urlMaintenance: maintenance, famille: FAMILLE, ports: [port] });
    expect(await portOccupe(port)).toBe(false);
    expect(await bases()).not.toContain(`planersource_${FAMILLE}_w3_test`);
    expect(existsSync(registre)).toBe(false);
  }, 30000);
});

describe('E2P-5 configuration Playwright évaluée dans un worker', () => {
  const lire = (env: Record<string, string>) =>
    lancer(
      join(RACINE, 'node_modules/.bin/tsx'),
      [
        '-e',
        [
          '(async () => {',
          "  const c = (await import('./playwright.config.ts')).default;",
          "  const { ETAT_ADMIN } = await import('./etat-session.ts');",
          '  console.log(JSON.stringify({ db: process.env.TEST_DATABASE_URL, baseURL: c.use?.baseURL, etat: ETAT_ADMIN }));',
          '})();',
        ].join('\n'),
      ],
      { cwd: join(RACINE, 'e2e'), env },
    );

  it('worker d’index 1 : base w2, front 5302, état admin-w2.json, aucune connexion', async () => {
    const e = await ecouteur();
    try {
      const m = url(e.port, 'planersource_test');
      const r = await lire({ TEST_DATABASE_URL: m, TEST_PARALLEL_INDEX: '1' });
      expect(r.code, r.sortie).toBe(0);
      const o = JSON.parse(r.sortie.trim().split('\n').at(-1)!);
      expect(new URL(o.db).pathname).toBe('/planersource_e2e_w2_test');
      expect(o.baseURL).toBe('http://localhost:5302');
      expect(o.etat).toBe(join(RACINE, 'e2e/.auth/admin-w2.json'));
      expect(e.connexions()).toBe(0);
      expect(await portOccupe(5302)).toBe(false);
      expect(await portOccupe(3302)).toBe(false);
    } finally {
      await e.fermer();
    }
  });
  it('hors worker : TEST_DATABASE_URL inchangée', async () => {
    const e = await ecouteur();
    try {
      const m = url(e.port, 'planersource_test');
      const r = await lire({ TEST_DATABASE_URL: m });
      expect(r.code, r.sortie).toBe(0);
      expect(JSON.parse(r.sortie.trim().split('\n').at(-1)!).db).toBe(m);
      expect(e.connexions()).toBe(0);
    } finally {
      await e.fermer();
    }
  });
});

describe('E2P-7 bout en bout, deux workers', () => {
  it('code 0, puis aucune base e2e, ports libres, registre effacé', async () => {
    const maintenance = exigerBaseTest(process.env);
    const r = await lancer(
      join(RACINE, 'node_modules/.bin/playwright'),
      ['test', 'tests/pile-worker.spec.ts', '--workers=2', '--reporter=line'],
      { cwd: join(RACINE, 'e2e'), env: { TEST_DATABASE_URL: maintenance } },
    );
    expect(r.code, r.sortie).toBe(0);
    const c = new pg.Client({ connectionString: maintenance });
    await c.connect();
    try {
      const b = await c.query("SELECT datname FROM pg_database WHERE datname LIKE '%\\_e2e\\_w%'");
      expect(b.rows).toEqual([]);
    } finally {
      await c.end();
    }
    for (const p of [3301, 3302, 5301, 5302]) expect(await portOccupe(p), `port ${p}`).toBe(false);
    expect(existsSync(join(RACINE, 'e2e/.piles/registre.json'))).toBe(false);
  }, 120000);
});
