import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ecouteur, lancer, RACINE, url } from './outillage-helpers.js';

// Point d'entrée unique de la suite complète et journal (D-193 (4), (5)).
// Import dynamique : les tests d'intégration échouent pour leur propre raison tant que le code manque.
const journalLib = () => import('../lib/journal-suites.mjs');
const JOURNAL_REEL = resolve(RACINE, 'docs/journal-suites.jsonl');

function nouveauJournal(contenu?: string): string {
  const chemin = join(mkdtempSync(join(tmpdir(), 'sui-')), 'journal.jsonl');
  if (contenu !== undefined) writeFileSync(chemin, contenu);
  return chemin;
}
const ligne = (o: object) => `${JSON.stringify(o)}\n`;
const debut = (lot: string) => ({
  evenement: 'debut',
  lot,
  date: '2026-11-23T10:00:00.000Z',
  commit: 'abc1234',
});

function runnerDe(codes: { vitest?: number; e2e?: number }, appels: string[] = []) {
  return {
    vitest: async () => {
      appels.push('vitest');
      return { code: codes.vitest ?? 0 };
    },
    e2e: async () => {
      appels.push('e2e');
      return { code: codes.e2e ?? 0 };
    },
  };
}

describe('SUI-1 lot absent du journal', () => {
  it('journal absent : autorisé sans justification', async () => {
    const { verifierLot } = await journalLib();
    expect(() => verifierLot(nouveauJournal(), 'lot-a')).not.toThrow();
  });
  it('journal sans ce lot : autorisé', async () => {
    const { verifierLot } = await journalLib();
    expect(() => verifierLot(nouveauJournal(ligne(debut('autre'))), 'lot-a')).not.toThrow();
  });
});

describe('SUI-2 lot déjà présent sans justification', () => {
  it.each([undefined, '', '   '])('justification %j : refus, journal inchangé', async (j) => {
    const { verifierLot, executerSuite } = await journalLib();
    const contenu = ligne(debut('lot-a'));
    const chemin = nouveauJournal(contenu);
    let message = '';
    try {
      verifierLot(chemin, 'lot-a', j);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('lot-a');
    expect(message).toContain('abc1234');
    const appels: string[] = [];
    await expect(
      executerSuite({
        chemin,
        lot: 'lot-a',
        ...(j === undefined ? {} : { justification: j }),
        commit: 'def5678',
        arbrePropre: true,
        runner: runnerDe({}, appels),
      }),
    ).rejects.toThrow();
    expect(appels).toEqual([]);
    expect(readFileSync(chemin, 'utf8')).toBe(contenu);
  });
});

describe('SUI-3 lot déjà présent avec justification', () => {
  it('autorisée, justification écrite dans la ligne debut', async () => {
    const { executerSuite, lireJournal } = await journalLib();
    const chemin = nouveauJournal(ligne(debut('lot-a')));
    await executerSuite({
      chemin,
      lot: 'lot-a',
      justification: 'échec de la CI corrigé, suite relancée',
      commit: 'def5678',
      arbrePropre: true,
      runner: runnerDe({}),
    });
    const debuts = lireJournal(chemin).filter((e) => e.evenement === 'debut');
    expect(debuts).toHaveLength(2);
    expect(debuts[1]?.justification).toBe('échec de la CI corrigé, suite relancée');
  });
});

describe('SUI-4 journal en ajout seulement', () => {
  it('conserve les octets existants et ajoute une ligne terminée par un saut de ligne', async () => {
    const { ajouterEvenement } = await journalLib();
    const avant = ligne(debut('x')) + ligne(debut('y'));
    const chemin = nouveauJournal(avant);
    ajouterEvenement(chemin, { evenement: 'fin', lot: 'y' });
    const apres = readFileSync(chemin, 'utf8');
    expect(apres.startsWith(avant)).toBe(true);
    const ajout = apres.slice(avant.length);
    expect(ajout.endsWith('\n')).toBe(true);
    expect(ajout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(ajout)).toEqual({ evenement: 'fin', lot: 'y' });
  });
  it('crée le fichier absent', async () => {
    const { ajouterEvenement } = await journalLib();
    const chemin = nouveauJournal();
    ajouterEvenement(chemin, { evenement: 'debut', lot: 'x' });
    expect(readFileSync(chemin, 'utf8')).toBe('{"evenement":"debut","lot":"x"}\n');
  });
});

describe('SUI-5 exécution et journalisation', () => {
  const lire = async (chemin: string) => (await journalLib()).lireJournal(chemin);

  it('vert et vert : debut avant les suites, fin après', async () => {
    const { executerSuite } = await journalLib();
    const chemin = nouveauJournal();
    const appels: string[] = [];
    const r = await executerSuite({
      chemin,
      lot: 'lot-a',
      commit: 'abc1234',
      arbrePropre: true,
      runner: runnerDe({}, appels),
    });
    expect(r).toEqual({ code: 0, resultat: 'vert' });
    expect(appels).toEqual(['vitest', 'e2e']);
    const [d, f] = await lire(chemin);
    expect(d).toMatchObject({ evenement: 'debut', lot: 'lot-a', commit: 'abc1234' });
    expect(new Date(d!.date).toString()).not.toBe('Invalid Date');
    expect(f).toMatchObject({
      evenement: 'fin',
      lot: 'lot-a',
      commit: 'abc1234',
      resultat: 'vert',
    });
    expect(f!.vitest).toMatchObject({ statut: 'vert' });
    expect(f!.e2e).toMatchObject({ statut: 'vert' });
    expect(typeof f!.vitest!.duree_s).toBe('number');
    expect(typeof f!.e2e!.duree_s).toBe('number');
  });
  it('vitest rouge : e2e non lancés, résultat « échec vitest », code non nul', async () => {
    const { executerSuite } = await journalLib();
    const chemin = nouveauJournal();
    const appels: string[] = [];
    const r = await executerSuite({
      chemin,
      lot: 'lot-a',
      commit: 'abc1234',
      arbrePropre: true,
      runner: runnerDe({ vitest: 1 }, appels),
    });
    expect(r.code).not.toBe(0);
    expect(r.resultat).toBe('échec vitest');
    expect(appels).toEqual(['vitest']);
    const f = (await lire(chemin))[1]!;
    expect(f.vitest).toMatchObject({ statut: 'rouge' });
    expect(f.e2e).toMatchObject({ statut: 'non lancé' });
    expect(f.resultat).toBe('échec vitest');
  });
  it('e2e rouges : résultat « échec e2e »', async () => {
    const { executerSuite } = await journalLib();
    const chemin = nouveauJournal();
    const r = await executerSuite({
      chemin,
      lot: 'lot-a',
      commit: 'abc1234',
      arbrePropre: true,
      runner: runnerDe({ e2e: 1 }),
    });
    expect(r).toMatchObject({ resultat: 'échec e2e' });
    expect(r.code).not.toBe(0);
  });
  it('suite interrompue : fin « interrompu », la ligne debut reste', async () => {
    const { executerSuite } = await journalLib();
    const chemin = nouveauJournal();
    const r = await executerSuite({
      chemin,
      lot: 'lot-a',
      commit: 'abc1234',
      arbrePropre: false,
      runner: {
        vitest: async () => {
          throw new Error('processus tué');
        },
        e2e: async () => ({ code: 0 }),
      },
    });
    expect(r.code).not.toBe(0);
    const evenements = await lire(chemin);
    expect(evenements.map((e) => e.evenement)).toEqual(['debut', 'fin']);
    expect(evenements[1]?.resultat).toBe('interrompu');
  });
});

describe('SUI-6 lignes d’un lot', () => {
  it('lignesDuLot renvoie les lignes du lot, dans l’ordre', async () => {
    const { lignesDuLot } = await journalLib();
    const a1 = ligne(debut('lot-a'));
    const b = ligne(debut('lot-b'));
    const a2 = ligne({ evenement: 'fin', lot: 'lot-a', resultat: 'vert' });
    const chemin = nouveauJournal(a1 + b + a2);
    expect(lignesDuLot(chemin, 'lot-a')).toEqual([a1.trim(), a2.trim()]);
    expect(lignesDuLot(chemin, 'absent')).toEqual([]);
  });
  it('--lister d’un lot absent : « aucune suite complète », code 0', async () => {
    const r = await lancer('node', [
      'scripts/suite-complete.mjs',
      '--lister',
      'lot-inexistant-sui6',
    ]);
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('aucune suite complète');
  });
});

describe('SUI-7 le point d’entrée refuse avant de lancer quoi que ce soit', () => {
  const lecture = () => (existsSync(JOURNAL_REEL) ? readFileSync(JOURNAL_REEL, 'utf8') : null);

  it('sans --lot : code 2, journal inchangé', async () => {
    const avant = lecture();
    const r = await lancer('node', ['scripts/suite-complete.mjs']);
    expect(r.code).toBe(2);
    expect(r.sortie).toMatch(/--lot/);
    expect(lecture()).toBe(avant);
  });
  it('base de dev : code non nul, journal inchangé, 0 connexion', async () => {
    const e = await ecouteur();
    try {
      const avant = lecture();
      const r = await lancer('node', ['scripts/suite-complete.mjs', '--lot', 'lot-sui7'], {
        env: { TEST_DATABASE_URL: url(e.port, 'planersource') },
      });
      expect(r.code).not.toBe(0);
      expect(r.sortie).toMatch(/Garde-fou base de test/);
      expect(lecture()).toBe(avant);
      expect(e.connexions()).toBe(0);
    } finally {
      await e.fermer();
    }
  });
});

describe('SUI-8 la règle de process est écrite', () => {
  const texte = (f: string) => readFileSync(resolve(RACINE, f), 'utf8');
  it.each([
    'CLAUDE.md',
    '.claude/agents/reviewer.md',
    '.claude/agents/debugger.md',
    '.claude/agents/ui-designer.md',
  ])('%s cite npm run suite-complete', (f) => {
    expect(texte(f)).toContain('npm run suite-complete');
  });
  it('docs/tests.md porte la section de la règle, qui cite npm run suite-complete', () => {
    const t = texte('docs/tests.md');
    const i = t.indexOf('## Règle de la suite complète (D-193)');
    expect(i).toBeGreaterThan(-1);
    expect(t.slice(i)).toContain('npm run suite-complete');
  });
  it('le relecteur ne lance jamais la suite complète', () => {
    expect(texte('.claude/agents/reviewer.md')).toContain('ne lance jamais la suite complète');
  });
});

describe('SUI-9 scripts npm', () => {
  const scripts = JSON.parse(readFileSync(resolve(RACINE, 'package.json'), 'utf8'))
    .scripts as Record<string, string>;
  it('suite-complete et avec-base-test pointent vers leurs scripts', () => {
    expect(scripts['suite-complete']).toBe('node scripts/suite-complete.mjs');
    expect(scripts['avec-base-test']).toBe('node scripts/garde-base-test.mjs exec --');
  });
});
