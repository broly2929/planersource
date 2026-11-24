import { existsSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exigerBaseTest } from '../lib/garde-base-test.mjs';
import { ecouteur, RACINE, url } from './outillage-helpers.js';

// Base par worker de vitest (D-196). Import dynamique : les tests échouent pour leur propre raison
// tant que le module n'existe pas.
const bw = () => import('../lib/bases-worker.mjs');
const MESSAGE = /Garde-fou base de test/;
const FAMILLE = 'essaibpw';

const envRacine = join(RACINE, '.env');
if (existsSync(envRacine)) process.loadEnvFile(envRacine);

describe('BPW-1 noms dérivés', () => {
  it('modèle et worker depuis la base de maintenance', async () => {
    const { nomsBases } = await bw();
    const n = nomsBases('postgres://u:secret@hote:5433/planersource_test?sslmode=disable', {
      worker: '2',
    });
    expect(n.modele.nom).toBe('planersource_vitest_modele_test');
    expect(n.worker?.nom).toBe('planersource_vitest_w2_test');
    expect(n.modele.url).toBe(
      'postgres://u:secret@hote:5433/planersource_vitest_modele_test?sslmode=disable',
    );
    expect(n.worker?.url).toBe(
      'postgres://u:secret@hote:5433/planersource_vitest_w2_test?sslmode=disable',
    );
  });
  it('famille donnée, sans worker', async () => {
    const { nomsBases } = await bw();
    const n = nomsBases('postgres://u:p@h:5432/x_test', { famille: 'autre' });
    expect(n.modele.nom).toBe('x_autre_modele_test');
    expect(n.worker).toBeUndefined();
  });
});

describe('BPW-2 refus des noms hors règle', () => {
  const base = 'postgres://u:p@h:5432/planersource_test';
  it('base de maintenance hors règle : message du garde-fou', async () => {
    const { nomsBases } = await bw();
    expect(() => nomsBases('postgres://u:p@h:5432/planersource', { worker: '1' })).toThrow(MESSAGE);
  });
  it('nom dérivé de plus de 63 octets', async () => {
    const { nomsBases } = await bw();
    const long = `postgres://u:p@h:5432/${'a'.repeat(45)}_test`;
    expect(() => nomsBases(long, { worker: '1' })).toThrow(/63 octets/);
  });
  it.each(['Planer_test', 'plan-er_test', 'plan%22er_test'])(
    'caractère hors [a-z0-9_] : %s',
    async (nom) => {
      const { nomsBases } = await bw();
      expect(() => nomsBases(`postgres://u:p@h:5432/${nom}`, { worker: '1' })).toThrow(
        /\[a-z0-9_\]/,
      );
    },
  );
  it.each([undefined, '', '0', '-1', '1.5', 'x', '2x'])('worker invalide : %s', async (w) => {
    const { nomsBases } = await bw();
    expect(() => nomsBases(base, { worker: w as string })).toThrow(/worker/);
  });
});

describe('BPW-3 empreinte', () => {
  const dossier = (fichiers: Record<string, string>) => {
    const d = mkdtempSync(join(tmpdir(), 'bpw3-'));
    for (const [n, c] of Object.entries(fichiers)) writeFileSync(join(d, n), c);
    return d;
  };
  it('mêmes fichiers : même empreinte ; contenu, ajout, renommage : différente', async () => {
    const { empreinte } = await bw();
    const a = dossier({ '001_a.sql': 'select 1;', '002_b.sql': 'select 2;' });
    const b = dossier({ '002_b.sql': 'select 2;', '001_a.sql': 'select 1;' });
    const e = empreinte(a);
    expect(e).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinte(b)).toBe(e);
    writeFileSync(join(b, '002_b.sql'), 'select 3;');
    expect(empreinte(b)).not.toBe(e);
    writeFileSync(join(b, '002_b.sql'), 'select 2;');
    expect(empreinte(b)).toBe(e);
    writeFileSync(join(b, '003_c.sql'), '');
    expect(empreinte(b)).not.toBe(e);
    const c = dossier({ '001_a.sql': 'select 1;', '002_b.sql': 'select 2;' });
    renameSync(join(c, '002_b.sql'), join(c, '002_c.sql'));
    expect(empreinte(c)).not.toBe(e);
  });
});

describe('Bases réelles (BPW-4 à BPW-7)', () => {
  const maintenance = exigerBaseTest(process.env);
  let admin: pg.Client;
  const ouvertes: string[] = [];
  const connecter = async (u: string) => {
    ouvertes.push(u);
    const c = new pg.Client({ connectionString: u });
    await c.connect();
    return c;
  };
  const migrer = async (u: string) => {
    ouvertes.push(u);
    const c = new pg.Client({ connectionString: u });
    await c.connect();
    await c.query('CREATE TABLE essai_bpw (id serial PRIMARY KEY, texte text NOT NULL)');
    await c.end();
  };
  const bases = async () =>
    (
      await admin.query<{ datname: string }>(
        'SELECT datname FROM pg_database WHERE datname LIKE $1 ORDER BY 1',
        [`%\\_${FAMILLE}%`],
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

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: maintenance });
    await admin.connect();
    await purger();
  });
  afterAll(async () => {
    await purger();
    await admin.end();
  });

  it('BPW-4 modèle construit, réutilisé, reconstruit si l’empreinte change', async () => {
    const { preparerModele, nomsBases } = await bw();
    const { modele } = nomsBases(maintenance, { famille: FAMILLE });
    const opts = { famille: FAMILLE, empreinte: 'e1', migrer, connecter };
    expect(await preparerModele(maintenance, opts)).toBe('construit');
    const commentaire = async () =>
      (
        await admin.query<{ c: string | null }>(
          "SELECT shobj_description(oid, 'pg_database') AS c FROM pg_database WHERE datname = $1",
          [modele.nom],
        )
      ).rows[0]?.c;
    expect(await commentaire()).toBe('empreinte:e1');
    await surBase(modele.url, (c) => c.query("INSERT INTO essai_bpw (texte) VALUES ('témoin')"));
    expect(await preparerModele(maintenance, opts)).toBe('reutilise');
    const temoin = () =>
      surBase(modele.url, async (c) => (await c.query('SELECT texte FROM essai_bpw')).rowCount);
    expect(await temoin()).toBe(1);
    expect(await preparerModele(maintenance, { ...opts, empreinte: 'e2' })).toBe('construit');
    expect(await commentaire()).toBe('empreinte:e2');
    expect(await temoin()).toBe(0);
  });

  it('BPW-5 base du worker créée depuis le modèle, gardée au second appel', async () => {
    const { preparerModele, creerBaseWorker, nomsBases } = await bw();
    await preparerModele(maintenance, { famille: FAMILLE, empreinte: 'e5', migrer, connecter });
    const { modele, worker } = nomsBases(maintenance, { famille: FAMILLE, worker: '3' });
    await surBase(modele.url, (c) => c.query("INSERT INTO essai_bpw (texte) VALUES ('modèle')"));
    const u = await creerBaseWorker(maintenance, { famille: FAMILLE, worker: '3', connecter });
    expect(u).toBe(worker!.url);
    const textes = () =>
      surBase(u, async (c) =>
        (await c.query<{ texte: string }>('SELECT texte FROM essai_bpw ORDER BY id')).rows.map(
          (r) => r.texte,
        ),
      );
    expect(await textes()).toEqual(['modèle']);
    await surBase(u, (c) => c.query("INSERT INTO essai_bpw (texte) VALUES ('worker')"));
    expect(await creerBaseWorker(maintenance, { famille: FAMILLE, worker: '3', connecter })).toBe(
      u,
    );
    expect(await textes()).toEqual(['modèle', 'worker']);
  });

  it('BPW-6 nettoyage des bases de worker de la famille seulement', async () => {
    const { preparerModele, creerBaseWorker, nettoyerBasesWorker, nomsBases } = await bw();
    const autre = `${FAMILLE}x`;
    await preparerModele(maintenance, { famille: FAMILLE, empreinte: 'e6', migrer, connecter });
    await preparerModele(maintenance, { famille: autre, empreinte: 'e6', migrer, connecter });
    for (const w of ['1', '2']) {
      await creerBaseWorker(maintenance, { famille: FAMILLE, worker: w, connecter });
    }
    await creerBaseWorker(maintenance, { famille: autre, worker: '1', connecter });
    await nettoyerBasesWorker(maintenance, { famille: FAMILLE, connecter });
    const restantes = await bases();
    expect(restantes).toContain(nomsBases(maintenance, { famille: FAMILLE }).modele.nom);
    expect(restantes).toContain(nomsBases(maintenance, { famille: autre }).modele.nom);
    expect(restantes).toContain(
      nomsBases(maintenance, { famille: autre, worker: '1' }).worker!.nom,
    );
    expect(restantes.filter((n) => n.includes(`_${FAMILLE}_w`))).toEqual([]);
    const nomMaintenance = new URL(maintenance).pathname.slice(1);
    const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      nomMaintenance,
    ]);
    expect(existe.rowCount).toBe(1);
  });

  it('BPW-7-r1 toute URL ouverte désigne une base qui finit par _test (relevé dans le test lui-même)', async () => {
    const { preparerModele, creerBaseWorker, nettoyerBasesWorker } = await bw();
    const famille = `${FAMILLE}7`;
    const relevees: string[] = [];
    const releve = (u: string) => relevees.push(u);
    const connecter7 = async (u: string) => {
      releve(u);
      const c = new pg.Client({ connectionString: u });
      await c.connect();
      return c;
    };
    const migrer7 = async (u: string) => {
      releve(u);
      const c = new pg.Client({ connectionString: u });
      await c.connect();
      await c.query('CREATE TABLE essai_bpw (id serial PRIMARY KEY, texte text NOT NULL)');
      await c.end();
    };
    await preparerModele(maintenance, {
      famille,
      empreinte: 'e7',
      migrer: migrer7,
      connecter: connecter7,
    });
    await creerBaseWorker(maintenance, { famille, worker: '1', connecter: connecter7 });
    await nettoyerBasesWorker(maintenance, { famille, connecter: connecter7 });
    expect(relevees.length).toBeGreaterThan(0);
    const noms = relevees.map((u) => decodeURIComponent(new URL(u).pathname.slice(1)));
    expect(noms.filter((n) => !n.endsWith('_test') || n === '_test')).toEqual([]);
    expect(noms).not.toContain('postgres');
    expect(noms).not.toContain('template1');
  });
});

describe('BPW-7 base de maintenance hors règle : refus avant toute connexion', () => {
  it.each(['preparerModele', 'creerBaseWorker', 'nettoyerBasesWorker'] as const)(
    '%s',
    async (fonction) => {
      const m = await bw();
      const e = await ecouteur();
      try {
        const u = url(e.port, 'planersource');
        const opts = { famille: FAMILLE, worker: '1', empreinte: 'x', migrer: async () => {} };
        await expect(m[fonction](u, opts)).rejects.toThrow(MESSAGE);
        expect(e.connexions()).toBe(0);
      } finally {
        await e.fermer();
      }
    },
  );
});
