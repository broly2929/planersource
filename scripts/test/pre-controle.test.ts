import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RACINE } from './outillage-helpers.js';

// Pré-contrôle de la suite complète (D-198 (1)) : PRC-1 à PRC-5.
// Import dynamique : chaque test échoue pour sa propre raison tant que le code manque.
const journalLib = () => import('../lib/journal-suites.mjs');
const preControleLib = () => import('../lib/pre-controle.mjs');

function nouveauJournal(contenu?: string): string {
  const chemin = join(mkdtempSync(join(tmpdir(), 'prc-')), 'journal.jsonl');
  if (contenu !== undefined) writeFileSync(chemin, contenu);
  return chemin;
}
const lire = (chemin: string) => (existsSync(chemin) ? readFileSync(chemin, 'utf8') : '');

function runnerDe(codePreControle: number, appels: string[], chemin?: string) {
  return {
    preControle: async () => {
      appels.push(`preControle:${chemin ? lire(chemin).length : 0}`);
      return {
        code: codePreControle,
        sortie: 'TC-5 toute spec appartient à au moins un domaine : FAIL',
      };
    },
    vitest: async () => {
      appels.push('vitest');
      return { code: 0 };
    },
    e2e: async () => {
      appels.push('e2e');
      return { code: 0 };
    },
  };
}

describe('PRC-1 pré-contrôle rouge', () => {
  it('code 1, message, vitest et e2e non lancés, journal inchangé', async () => {
    const { executerSuite } = await journalLib();
    const avant = `${JSON.stringify({ evenement: 'debut', lot: 'autre', date: 'x', commit: 'a' })}\n`;
    const chemin = nouveauJournal(avant);
    const appels: string[] = [];
    const r = await executerSuite({
      chemin,
      lot: 'lot-a',
      commit: 'abc1234',
      arbrePropre: true,
      runner: runnerDe(1, appels),
    });
    expect(r.code).toBe(1);
    expect(r.resultat).toBe('pré-contrôle en échec');
    expect(String(r.message)).toMatch(/^Pré-contrôle en échec/);
    expect(appels).toEqual(['preControle:0']);
    expect(lire(chemin)).toBe(avant);
  });
});

describe('PRC-2 pré-contrôle vert', () => {
  it('lancé avant la ligne debut, puis vitest et e2e, debut et fin écrites', async () => {
    const { executerSuite, lireJournal } = await journalLib();
    const chemin = nouveauJournal();
    const appels: string[] = [];
    const r = await executerSuite({
      chemin,
      lot: 'lot-a',
      commit: 'abc1234',
      arbrePropre: true,
      runner: runnerDe(0, appels, chemin),
    });
    expect(r).toMatchObject({ code: 0, resultat: 'vert' });
    expect(appels).toEqual(['preControle:0', 'vitest', 'e2e']);
    expect(lireJournal(chemin).map((e) => e.evenement)).toEqual(['debut', 'fin']);
  });
});

describe('PRC-3 lot déjà présent sans justification', () => {
  it('refus avant le pré-contrôle, journal inchangé', async () => {
    const { executerSuite } = await journalLib();
    const avant = `${JSON.stringify({ evenement: 'debut', lot: 'lot-a', date: 'x', commit: 'a' })}\n`;
    const chemin = nouveauJournal(avant);
    const appels: string[] = [];
    await expect(
      executerSuite({
        chemin,
        lot: 'lot-a',
        commit: 'abc1234',
        arbrePropre: true,
        runner: runnerDe(0, appels),
      }),
    ).rejects.toThrow();
    expect(appels).toEqual([]);
    expect(lire(chemin)).toBe(avant);
  });
});

// PRC-4-r1 (D-198 (4), D-031) : E2P-9 ajouté à la liste attendue.
describe('PRC-4-r1 liste et commandes du pré-contrôle', () => {
  const attendus = [
    'TC-5',
    'TC-6',
    'TC-12',
    'TC-13',
    'GBT-9',
    'SUI-8',
    'PRT-1',
    'PUB-1',
    'PUB-2',
    'CI-1',
    'GDL-5',
    'GDL-6',
    'GDL-7',
    'E2P-9',
  ];
  it('la liste couvre les identifiants de D-198 (1) et (4)', async () => {
    const { PRE_CONTROLE } = await preControleLib();
    expect(PRE_CONTROLE.flatMap((e) => e.ids).sort()).toEqual([...attendus].sort());
  });
  it('chaque identifiant figure dans un describe ou un it de son fichier, qui existe', async () => {
    const { PRE_CONTROLE } = await preControleLib();
    const absents: string[] = [];
    for (const { fichier, ids } of PRE_CONTROLE) {
      const chemin = resolve(RACINE, fichier);
      if (!existsSync(chemin)) {
        absents.push(fichier);
        continue;
      }
      const texte = readFileSync(chemin, 'utf8');
      for (const id of ids) {
        const re = new RegExp(`(describe|it)(\\.each\\([^)]*\\))?\\(\\s*['"\`]${id}(?![0-9])`);
        if (!re.test(texte)) absents.push(`${fichier} : ${id}`);
      }
    }
    expect(absents).toEqual([]);
  });
  it('vitest run <fichiers> -t <motif>, puis playwright test --list dans e2e', async () => {
    const { PRE_CONTROLE, commandesPreControle, motifPreControle } = await preControleLib();
    const [v, p] = commandesPreControle(RACINE);
    expect(v!.args.slice(0, 2)).toEqual(['vitest', 'run']);
    for (const { fichier } of PRE_CONTROLE) expect(v!.args).toContain(fichier);
    expect(v!.args.at(-2)).toBe('-t');
    expect(v!.args.at(-1)).toBe(motifPreControle());
    expect(p!.args).toEqual(['playwright', 'test', '--list']);
    expect(p!.cwd).toBe(resolve(RACINE, 'e2e'));
  });
  it('le motif retient chaque identifiant et rejette TC-1, TC-50, GBT-1', async () => {
    const { motifPreControle } = await preControleLib();
    const re = new RegExp(motifPreControle());
    for (const nom of [
      'TC-5 et TC-6 e2e/domaines.json TC-5 toute spec',
      'GDL-5 : sansGarde réservé',
      'Workflow CI CI-1 : le workflow',
      'PUB-1 aucune référence PUB-2 aucun fichier',
      'TC-12 la règle est écrite CLAUDE.md cite',
    ])
      expect(re.test(nom), nom).toBe(true);
    for (const nom of ['TC-1 sélection par commit', 'TC-50 autre', 'GBT-1 une base', 'XTC-5'])
      expect(re.test(nom), nom).toBe(false);
  });
});

describe('PRC-5 le point d’entrée câble le pré-contrôle', () => {
  it('suite-complete.mjs importe commandesPreControle et passe preControle au runner', () => {
    const texte = readFileSync(resolve(RACINE, 'scripts/suite-complete.mjs'), 'utf8');
    expect(texte).toMatch(
      /import \{[^}]*commandesPreControle[^}]*\} from '\.\/lib\/pre-controle\.mjs'/,
    );
    expect(texte).toMatch(/preControle:/);
  });
});
