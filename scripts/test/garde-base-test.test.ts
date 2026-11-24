import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ecouteur, lancer, RACINE, url } from './outillage-helpers.js';

// Garde-fou de base de test (D-193 (1), (2), (3)). Import dynamique : les tests d'intégration
// doivent échouer pour leur propre raison tant que le module n'existe pas.
const garde = () => import('../lib/garde-base-test.mjs');
const MESSAGE = /Garde-fou base de test/;

describe('GBT-1 une base qui finit par _test est acceptée', () => {
  it.each([
    'postgres://u:p@localhost:5432/planersource_test',
    'postgres://u:p@localhost:5432/planersource_backup_test',
    'postgres://u:p@localhost:5432/planersource_test?sslmode=disable',
    'postgres://u:p@localhost:5432/planersource%5Ftest',
  ])('%s', async (valeur) => {
    const { verifierBaseTest } = await garde();
    expect(verifierBaseTest(valeur)).toBe(valeur);
  });
});

describe('GBT-2 une base hors règle est refusée', () => {
  it.each([
    ['planersource', 'postgres://u:motdepasse-secret@h:5432/planersource'],
    ['planersource_demo', 'postgres://u:motdepasse-secret@h:5432/planersource_demo'],
    ['planersource_test_old', 'postgres://u:motdepasse-secret@h:5432/planersource_test_old'],
    ['test', 'postgres://u:motdepasse-secret@h:5432/test'],
    ['_test', 'postgres://u:motdepasse-secret@h:5432/_test'],
    ['suffixe en requête', 'postgres://u:motdepasse-secret@h:5432/planersource?x=_test'],
    ['chemin vide', 'postgres://u:motdepasse-secret@h:5432'],
  ])('%s', async (nom, valeur) => {
    const { verifierBaseTest } = await garde();
    let message = '';
    try {
      verifierBaseTest(valeur, 'MA_VARIABLE');
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(MESSAGE);
    expect(message).toContain('MA_VARIABLE');
    expect(message).not.toContain('motdepasse-secret');
    if (!nom.includes(' ') && nom !== 'chemin vide') expect(message).toContain(nom);
  });
});

describe('GBT-3 variable absente, vide ou illisible', () => {
  it.each([undefined, null, '', '   ', 'pas une url'])('%s', async (valeur) => {
    const { verifierBaseTest } = await garde();
    expect(() => verifierBaseTest(valeur as string | undefined, 'TEST_DATABASE_URL')).toThrow(
      MESSAGE,
    );
  });
  it('le message dit « absente ou vide » pour une variable manquante', async () => {
    const { verifierBaseTest } = await garde();
    expect(() => verifierBaseTest(undefined, 'TEST_DATABASE_URL')).toThrow(/absente ou vide/);
  });
});

describe('GBT-4 exigerBaseTest ne se replie jamais sur DATABASE_URL', () => {
  it('lit la variable nommée', async () => {
    const { exigerBaseTest } = await garde();
    const v = 'postgres://u:p@h:5432/x_test';
    expect(exigerBaseTest({ TEST_DATABASE_URL: v })).toBe(v);
    expect(exigerBaseTest({ AUTRE: v }, 'AUTRE')).toBe(v);
  });
  it('DATABASE_URL seule, même valide, est refusée', async () => {
    const { exigerBaseTest } = await garde();
    expect(() => exigerBaseTest({ DATABASE_URL: 'postgres://u:p@h:5432/x_test' })).toThrow(MESSAGE);
  });
});

describe('GBT-5 prepare-db refuse avant toute connexion', () => {
  it('base de dev : code non nul, message, 0 connexion', async () => {
    const e = await ecouteur();
    try {
      const r = await lancer('node', ['e2e/prepare-db.mjs'], {
        env: { DATABASE_URL: url(e.port, 'planersource') },
      });
      expect(r.code).not.toBe(0);
      expect(r.sortie).toMatch(MESSAGE);
      expect(e.connexions()).toBe(0);
    } finally {
      await e.fermer();
    }
  });
  it('variable absente : code non nul, message', async () => {
    const r = await lancer('node', ['e2e/prepare-db.mjs']);
    expect(r.code).not.toBe(0);
    expect(r.sortie).toMatch(MESSAGE);
  });
});

describe('GBT-6 la configuration Playwright refuse avant toute connexion', () => {
  it('base de dev : code non nul, message, 0 connexion', async () => {
    const e = await ecouteur();
    try {
      const r = await lancer('npx', ['playwright', 'test', '--list'], {
        cwd: resolve(RACINE, 'e2e'),
        env: { TEST_DATABASE_URL: url(e.port, 'planersource') },
      });
      expect(r.code).not.toBe(0);
      expect(r.sortie).toMatch(MESSAGE);
      expect(e.connexions()).toBe(0);
    } finally {
      await e.fermer();
    }
  });
  it('variable vide : code non nul, message', async () => {
    const r = await lancer('npx', ['playwright', 'test', '--list'], {
      cwd: resolve(RACINE, 'e2e'),
      env: { TEST_DATABASE_URL: '' },
    });
    expect(r.code).not.toBe(0);
    expect(r.sortie).toMatch(MESSAGE);
  });
});

describe('GBT-7 un test d’API refuse avant toute connexion', () => {
  it('base de dev : code non nul, message, 0 connexion', async () => {
    const e = await ecouteur();
    try {
      const r = await lancer(
        'npx',
        ['vitest', 'run', '--project', 'api', 'packages/api/test/auth.test.ts'],
        { env: { TEST_DATABASE_URL: url(e.port, 'planersource') } },
      );
      expect(r.code).not.toBe(0);
      expect(r.sortie).toMatch(MESSAGE);
      expect(e.connexions()).toBe(0);
    } finally {
      await e.fermer();
    }
  });
});

describe('GBT-8 avec-base-test', () => {
  const code = "require('fs').writeFileSync(process.argv[1], process.env.DATABASE_URL ?? '')";
  const lanceur = (temoin: string) => [
    'scripts/garde-base-test.mjs',
    'exec',
    '--',
    'node',
    '-e',
    code,
    temoin,
  ];

  it('base valide : la commande reçoit DATABASE_URL égale à la base de test', async () => {
    const e = await ecouteur();
    try {
      const temoin = join(mkdtempSync(join(tmpdir(), 'gbt8-')), 'temoin');
      const test = url(e.port, 'demo_test');
      const r = await lancer('node', lanceur(temoin), {
        env: { TEST_DATABASE_URL: test, DATABASE_URL: url(e.port, 'planersource') },
      });
      expect(r.code).toBe(0);
      expect(readFileSync(temoin, 'utf8')).toBe(test);
      expect(e.connexions()).toBe(0);
    } finally {
      await e.fermer();
    }
  });
  it.each([
    ['base de dev', (p: number) => url(p, 'planersource')],
    ['variable vide', () => ''],
  ])('%s : la commande n’est pas lancée', async (_nom, valeur) => {
    const e = await ecouteur();
    try {
      const temoin = join(mkdtempSync(join(tmpdir(), 'gbt8-')), 'temoin');
      const r = await lancer('node', lanceur(temoin), {
        env: { TEST_DATABASE_URL: valeur(e.port), DATABASE_URL: url(e.port, 'planersource') },
      });
      expect(r.code).not.toBe(0);
      expect(r.sortie).toMatch(MESSAGE);
      expect(existsSync(temoin)).toBe(false);
      expect(e.connexions()).toBe(0);
    } finally {
      await e.fermer();
    }
  });
});

describe('GBT-9 inventaire des fichiers qui lisent TEST_DATABASE_URL', () => {
  // Tests sous tag (D-031) : garde équivalente en ligne, liste figée (D-193 (2)).
  const HERITES = [
    'e2e/tests/accueil-g2.spec.ts',
    'e2e/tests/accueil-g3.spec.ts',
    'e2e/tests/lot3c-helpers.ts',
    'e2e/tests/lot4b-helpers.ts',
    'e2e/tests/lot4c-helpers.ts',
    'e2e/tests/lot5i.spec.ts',
    'e2e/tests/lot6a-helpers.ts',
    'e2e/tests/lot6b-helpers.ts',
    'e2e/tests/rex1.spec.ts',
    'e2e/tests/rex2.spec.ts',
    'e2e/tests/rex2b.spec.ts',
    'e2e/tests/rex2c.spec.ts',
    'e2e/tests/rex2d.spec.ts',
    'e2e/tests/rex3a-helpers.ts',
    'scripts/test/savegarde.test.ts',
  ];
  const EXCLUS = [
    'scripts/test/garde-base-test.test.ts',
    'scripts/test/suite-complete.test.ts',
    'scripts/test/outillage-helpers.ts',
    'scripts/lib/garde-base-test.mjs',
  ];
  const fichiers = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: RACINE,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((f) => /\.(ts|mts|mjs|js|sh)$/.test(f))
    .filter((f) => !f.startsWith('docs/') && !EXCLUS.includes(f))
    .filter((f) => existsSync(resolve(RACINE, f)));
  const lisent = fichiers.filter((f) =>
    readFileSync(resolve(RACINE, f), 'utf8').includes('TEST_DATABASE_URL'),
  );

  it('tout fichier hors liste héritée importe le garde-fou', () => {
    const sans = lisent.filter(
      (f) =>
        !HERITES.includes(f) &&
        !readFileSync(resolve(RACINE, f), 'utf8').includes('garde-base-test'),
    );
    expect(sans).toEqual([]);
  });
  it('un fichier hérité garde un endsWith("_test") en ligne et lit encore la variable', () => {
    const faux = HERITES.filter((f) => {
      if (!lisent.includes(f)) return true;
      return !/endsWith\(['"]_test['"]\)/.test(readFileSync(resolve(RACINE, f), 'utf8'));
    });
    expect(faux).toEqual([]);
  });
});
