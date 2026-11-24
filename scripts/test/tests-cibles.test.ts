import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { baseDeTest, ecouteur, lancer, RACINE, url } from './outillage-helpers.js';

// Sélection des tests pendant le développement (D-194 (1), (2), (3)). Import dynamique : les tests
// d'intégration échouent pour leur propre raison tant que le module n'existe pas.
const lib = () => import('../lib/tests-cibles.mjs');
const JOURNAL = resolve(RACINE, 'docs/journal-suites.jsonl');
const DOMAINES = resolve(RACINE, 'e2e/domaines.json');
const BASE_VALIDE = 'postgres://u:p@127.0.0.1:1/ciblage_test';
const journal = () => (existsSync(JOURNAL) ? readFileSync(JOURNAL, 'utf8') : null);
const defs = { d1: ['a.spec.ts', 'b.spec.ts'], d2: ['b.spec.ts', 'c.spec.ts'], d3: ['z.spec.ts'] };

describe('TC-1 sélection par commit', () => {
  it('une spec modifiée est retenue avec sa raison', async () => {
    const { selectionnerE2e } = await lib();
    expect(
      selectionnerE2e({ depuis: 'abc1234', definitions: defs, specsChangees: ['a.spec.ts'] }),
    ).toEqual([{ spec: 'a.spec.ts', raisons: ['modifiée depuis abc1234'] }]);
  });
  it('aucune spec modifiée, aucun domaine : sélection vide', async () => {
    const { selectionnerE2e } = await lib();
    expect(selectionnerE2e({ depuis: 'abc1234', definitions: defs, specsChangees: [] })).toEqual(
      [],
    );
  });
});

describe('TC-2 sélection par domaine', () => {
  it('les specs du domaine sont retenues avec leur raison', async () => {
    const { selectionnerE2e } = await lib();
    expect(selectionnerE2e({ domaines: ['d1'], definitions: defs })).toEqual([
      { spec: 'a.spec.ts', raisons: ['domaine d1'] },
      { spec: 'b.spec.ts', raisons: ['domaine d1'] },
    ]);
  });
});

describe('TC-3 union sans doublon', () => {
  it('modifiée et dans un domaine, ou dans deux domaines : une seule entrée, toutes les raisons, triée', async () => {
    const { selectionnerE2e } = await lib();
    expect(
      selectionnerE2e({
        depuis: 'abc1234',
        domaines: ['d1', 'd2'],
        definitions: defs,
        specsChangees: ['b.spec.ts', 'y.spec.ts'],
      }),
    ).toEqual([
      { spec: 'a.spec.ts', raisons: ['domaine d1'] },
      { spec: 'b.spec.ts', raisons: ['modifiée depuis abc1234', 'domaine d1', 'domaine d2'] },
      { spec: 'c.spec.ts', raisons: ['domaine d2'] },
      { spec: 'y.spec.ts', raisons: ['modifiée depuis abc1234'] },
    ]);
  });
});

describe('TC-4 domaine inconnu', () => {
  it('erreur explicite : domaine nommé, domaines connus listés', async () => {
    const { selectionnerE2e, DomaineInconnu } = await lib();
    let erreur: unknown;
    try {
      selectionnerE2e({ domaines: ['d1', 'nexistepas'], definitions: defs });
    } catch (e) {
      erreur = e;
    }
    expect(erreur).toBeInstanceOf(DomaineInconnu);
    const message = (erreur as Error).message;
    expect(message).toContain('nexistepas');
    for (const d of Object.keys(defs)) expect(message).toContain(d);
  });
  it('en ligne de commande : code 1, message, rien n’est lancé, journal inchangé', async () => {
    const avant = journal();
    const r = await lancer('node', ['scripts/tests-cibles.mjs', '--domaine', 'nexistepas'], {
      env: baseDeTest(BASE_VALIDE),
    });
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('nexistepas');
    expect(r.sortie).not.toMatch(/Running \d+ tests?|RUN\s+v/);
    expect(journal()).toBe(avant);
  });
});

describe('TC-5 et TC-6 e2e/domaines.json', () => {
  const specs = readdirSync(resolve(RACINE, 'e2e/tests')).filter((f) => f.endsWith('.spec.ts'));
  const lire = (): Record<string, string[]> => {
    expect(existsSync(DOMAINES), 'e2e/domaines.json absent').toBe(true);
    return JSON.parse(readFileSync(DOMAINES, 'utf8'));
  };

  it('TC-5 toute spec appartient à au moins un domaine', () => {
    const classees = new Set(Object.values(lire()).flat());
    expect(specs.filter((s) => !classees.has(s))).toEqual([]);
  });
  it('TC-6 aucune spec inexistante, aucun domaine vide, aucun doublon dans un domaine', () => {
    const d = lire();
    const inexistantes = Object.values(d)
      .flat()
      .filter((s) => !specs.includes(s));
    expect([...new Set(inexistantes)]).toEqual([]);
    expect(Object.entries(d).filter(([, l]) => l.length === 0)).toEqual([]);
    expect(Object.entries(d).filter(([, l]) => new Set(l).size !== l.length)).toEqual([]);
    expect(Object.keys(d).filter((n) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n))).toEqual([]);
  });
});

describe('TC-7 commandes construites', () => {
  const sel = [
    { spec: 'a.spec.ts', raisons: ['domaine d1'] },
    { spec: 'b.spec.ts', raisons: ['domaine d1'] },
  ];
  it('Playwright : une cible tests/<spec> par spec, dans le dossier e2e', async () => {
    const { construireCommandes } = await lib();
    const c = construireCommandes({ selection: sel, racine: '/r' });
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ commande: 'npx', cwd: '/r/e2e' });
    expect(c[0]!.args).toEqual(['playwright', 'test', 'tests/a.spec.ts', 'tests/b.spec.ts']);
  });
  it('aucune spec : pas de commande Playwright', async () => {
    const { construireCommandes } = await lib();
    expect(construireCommandes({ selection: [], racine: '/r' })).toEqual([]);
  });
  it('vitest --changed seulement avec --depuis, avant Playwright', async () => {
    const { construireCommandes } = await lib();
    const c = construireCommandes({ selection: sel, depuis: 'abc1234', racine: '/r' });
    expect(c.map((x) => x.args.slice(0, 2))).toEqual([
      ['vitest', 'run'],
      ['playwright', 'test'],
    ]);
    expect(c[0]!.args).toEqual(['vitest', 'run', '--changed', 'abc1234']);
    expect(c[0]!.cwd).toBe('/r');
  });
});

describe('TC-8 --lister', () => {
  it('--lister --domaine dialogues : specs du domaine et raison, code 0, journal inchangé', async () => {
    const avant = journal();
    const r = await lancer(
      'node',
      ['scripts/tests-cibles.mjs', '--lister', '--domaine', 'dialogues'],
      {
        env: baseDeTest(BASE_VALIDE),
      },
    );
    expect(r.code).toBe(0);
    for (const s of ['garde-dialogue.spec.ts', 'garde-dialogue-focus.spec.ts', 'sortie.spec.ts']) {
      expect(r.sortie).toMatch(new RegExp(`${s.replace(/\./g, '\\.')}.*domaine dialogues`));
    }
    expect(r.sortie).not.toMatch(/Running \d+ tests?|RUN\s+v/);
    expect(journal()).toBe(avant);
  });
});

describe('TC-9 usage et garde-fou', () => {
  it('sans --depuis ni --domaine : code 2', async () => {
    const r = await lancer('node', ['scripts/tests-cibles.mjs'], { env: baseDeTest(BASE_VALIDE) });
    expect(r.code).toBe(2);
    expect(r.sortie).toMatch(/--depuis/);
  });
  it('base de dev : code non nul, message du garde-fou, 0 connexion, journal inchangé', async () => {
    const e = await ecouteur();
    try {
      const avant = journal();
      const r = await lancer(
        'node',
        ['scripts/tests-cibles.mjs', '--lister', '--domaine', 'dialogues'],
        {
          env: baseDeTest(url(e.port, 'planersource')),
        },
      );
      expect(r.code).not.toBe(0);
      expect(r.sortie).toMatch(/Garde-fou base de test/);
      expect(e.connexions()).toBe(0);
      expect(journal()).toBe(avant);
    } finally {
      await e.fermer();
    }
  });
});

describe('TC-10 --only-changed de Playwright (dépôt temporaire)', () => {
  const dossier = mkdtempSync(join(RACINE, 'e2e', '.tmp-tc10-'));
  afterAll(() => rmSync(dossier, { recursive: true, force: true }));

  it('spec modifiée et spec qui importe un helper modifié retenues, spec non touchée absente', async () => {
    const { specsChangeesPlaywright } = await lib();
    const git = (...args: string[]) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@exemple.test', ...args], {
        cwd: dossier,
        encoding: 'utf8',
      }).trim();
    mkdirSync(join(dossier, 'tests'));
    writeFileSync(
      join(dossier, 'playwright.config.ts'),
      "import { defineConfig } from '@playwright/test';\nexport default defineConfig({ testDir: 'tests' });\n",
    );
    writeFileSync(join(dossier, 'tests/helper.ts'), 'export const valeur = 1;\n');
    const corps = (importe: boolean) =>
      `import { test } from '@playwright/test';\n${importe ? "import { valeur } from './helper.js';\n" : ''}test('t', () => {${importe ? ' void valeur;' : ''} });\n`;
    writeFileSync(join(dossier, 'tests/a.spec.ts'), corps(true));
    writeFileSync(join(dossier, 'tests/b.spec.ts'), corps(false));
    writeFileSync(join(dossier, 'tests/c.spec.ts'), corps(false));
    git('init', '-q');
    git('add', '.');
    git('commit', '-q', '-m', 'initial');
    const depuis = git('rev-parse', 'HEAD');
    writeFileSync(join(dossier, 'tests/helper.ts'), 'export const valeur = 2;\n');
    writeFileSync(join(dossier, 'tests/b.spec.ts'), corps(false) + '// modifiée\n');
    git('add', '.');
    git('commit', '-q', '-m', 'modifs');
    expect(specsChangeesPlaywright({ depuis, racineE2e: dossier }).sort()).toEqual([
      'a.spec.ts',
      'b.spec.ts',
    ]);
  });
});

describe('TC-11 lecture de vitest list', () => {
  it('« [projet] chemin » donne les chemins, lignes étrangères ignorées', async () => {
    const { lireListeVitest } = await lib();
    const sortie = [
      '[api] packages/api/test/auth.test.ts',
      '',
      ' RUN  v5.1.0 /home/x',
      '[scripts] scripts/test/ci.test.ts',
      'avertissement quelconque',
    ].join('\n');
    expect(lireListeVitest(sortie)).toEqual([
      'packages/api/test/auth.test.ts',
      'scripts/test/ci.test.ts',
    ]);
    expect(lireListeVitest('')).toEqual([]);
  });
});

describe('TC-12 la règle est écrite', () => {
  const texte = (f: string) => readFileSync(resolve(RACINE, f), 'utf8');
  it.each([
    'CLAUDE.md',
    '.claude/agents/reviewer.md',
    '.claude/agents/debugger.md',
    '.claude/agents/ui-designer.md',
  ])('%s cite npm run tests-cibles', (f) => {
    expect(texte(f)).toContain('npm run tests-cibles');
  });
  it('docs/tests.md : la règle dit que l’ouverture d’un lot déclare ses domaines', () => {
    const t = texte('docs/tests.md');
    const i = t.indexOf('## Règle de la suite complète (D-193)');
    expect(i).toBeGreaterThan(-1);
    const fin = t.indexOf('\n## ', i + 1);
    const regle = t.slice(i, fin === -1 ? undefined : fin);
    expect(regle).toContain('npm run tests-cibles');
    expect(regle).toContain('déclare ses domaines');
  });
});

describe('TC-13 script npm', () => {
  it('tests-cibles pointe vers son script', () => {
    const scripts = JSON.parse(readFileSync(resolve(RACINE, 'package.json'), 'utf8'))
      .scripts as Record<string, string>;
    expect(scripts['tests-cibles']).toBe('node scripts/tests-cibles.mjs');
  });
});
