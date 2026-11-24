import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Normalisation du nom de lot (D-194 (5)) : minuscules, espaces retirés, avant toute comparaison.
const lib = () => import('../lib/journal-suites.mjs');
const ligne = (o: object) => `${JSON.stringify(o)}\n`;
const debut = (lot: string) => ({
  evenement: 'debut',
  lot,
  date: '2026-11-23T10:00:00.000Z',
  commit: 'abc1234',
});
const nouveau = (contenu: string) => {
  const chemin = join(mkdtempSync(join(tmpdir(), 'sui10-')), 'journal.jsonl');
  writeFileSync(chemin, contenu);
  return chemin;
};
const runnerVert = { vitest: async () => ({ code: 0 }), e2e: async () => ({ code: 0 }) };

describe('SUI-10 lot7 puis Lot7', () => {
  it.each(['Lot7', 'LOT7', 'lot 7', ' Lot 7 '])(
    '« %s » après « lot7 » : refus sans justification, journal inchangé',
    async (nom) => {
      const { verifierLot, executerSuite } = await lib();
      const contenu = ligne(debut('lot7'));
      const chemin = nouveau(contenu);
      expect(() => verifierLot(chemin, nom)).toThrow(/lot7/);
      await expect(
        executerSuite({
          chemin,
          lot: nom,
          commit: 'def5678',
          arbrePropre: true,
          runner: runnerVert,
        }),
      ).rejects.toThrow();
      expect(readFileSync(chemin, 'utf8')).toBe(contenu);
    },
  );
  it('avec une justification, la seconde suite est autorisée', async () => {
    const { verifierLot } = await lib();
    expect(() => verifierLot(nouveau(ligne(debut('lot7'))), 'Lot7', 'CI corrigée')).not.toThrow();
  });
  it('un autre lot n’est pas touché', async () => {
    const { verifierLot } = await lib();
    expect(() => verifierLot(nouveau(ligne(debut('lot7'))), 'lot8')).not.toThrow();
  });
});

describe('SUI-11 le nom est écrit normalisé', () => {
  it('lignes debut et fin portent « lot7 » ; lignesDuLot ignore casse et espaces, même pour d’anciennes lignes', async () => {
    const { executerSuite, lireJournal, lignesDuLot } = await lib();
    const ancienne = ligne(debut('Optimisation Tests'));
    const chemin = nouveau(ancienne);
    await executerSuite({
      chemin,
      lot: ' Lot 7 ',
      commit: 'abc1234',
      arbrePropre: true,
      runner: runnerVert,
    });
    const evenements = lireJournal(chemin).slice(1);
    expect(evenements.map((e) => e.lot)).toEqual(['lot7', 'lot7']);
    expect(lignesDuLot(chemin, 'LOT7')).toHaveLength(2);
    expect(lignesDuLot(chemin, 'optimisation tests')).toEqual([ancienne.trim()]);
  });
});
