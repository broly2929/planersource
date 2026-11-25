// Saisie des activités (D-222) : SAA-1 à SAA-4 (SPEC §6 « Saisie des activités » 1 à 3).
import { describe, expect, it } from 'vitest';
import {
  candidatsDependance,
  champsActivite,
  optionsParent,
  parentChange,
} from '../src/saisieActivites';

type L = {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  wbs: string;
  nom: string;
};
// 1 A ; 1.1 A1 ; 1.1.1 A1a ; 2 B ; 2.1 B1 ; jalon 2.2 J ; jalon 3 M
const lignes: L[] = [
  { id: 1, type: 'activite', parent_id: null, wbs: '1', nom: 'A' },
  { id: 2, type: 'activite', parent_id: 1, wbs: '1.1', nom: 'A1' },
  { id: 3, type: 'activite', parent_id: 2, wbs: '1.1.1', nom: 'A1a' },
  { id: 4, type: 'activite', parent_id: null, wbs: '2', nom: 'B' },
  { id: 5, type: 'activite', parent_id: 4, wbs: '2.1', nom: 'B1' },
  { id: 6, type: 'jalon', parent_id: 4, wbs: '2.2', nom: 'J' },
  { id: 7, type: 'jalon', parent_id: null, wbs: '3', nom: 'M' },
];

describe('SAA-1 : optionsParent', () => {
  it('création : « Aucune (racine) » puis les activités en ordre WBS, jalons exclus', () => {
    expect(optionsParent(lignes, null)).toEqual([
      { value: '', label: 'Aucune (racine)' },
      { value: '1', label: '1 A' },
      { value: '2', label: '1.1 A1' },
      { value: '3', label: '1.1.1 A1a' },
      { value: '4', label: '2 B' },
      { value: '5', label: '2.1 B1' },
    ]);
  });
  it('modification : sans l’élément ni ses descendants', () => {
    expect(optionsParent(lignes, 2).map((o) => o.label)).toEqual([
      'Aucune (racine)',
      '1 A',
      '2 B',
      '2.1 B1',
    ]);
    expect(optionsParent(lignes, 1).map((o) => o.label)).toEqual([
      'Aucune (racine)',
      '2 B',
      '2.1 B1',
    ]);
  });
  it('jalon : toutes les activités', () => {
    expect(optionsParent(lignes, 6)).toHaveLength(6);
  });
});

describe('SAA-2 : parentChange', () => {
  it('vrai si le parent diffère de l’initial, racine = null', () => {
    expect(parentChange(1, '1')).toBe(false);
    expect(parentChange(1, '4')).toBe(true);
    expect(parentChange(1, '')).toBe(true);
    expect(parentChange(null, '')).toBe(false);
    expect(parentChange(null, '4')).toBe(true);
  });
});

describe('SAA-3 : candidatsDependance', () => {
  it('activités et jalons, sauf l’activité, ses ancêtres et ses descendants', () => {
    expect(candidatsDependance(lignes, 2).map((o) => o.label)).toEqual([
      '2 B',
      '2.1 B1',
      '2.2 J',
      '3 M',
    ]);
    expect(candidatsDependance(lignes, 1).map((o) => o.label)).toEqual([
      '2 B',
      '2.1 B1',
      '2.2 J',
      '3 M',
    ]);
    expect(candidatsDependance(lignes, 2)[0]).toEqual({ value: '4', label: '2 B' });
  });
});

describe('SAA-4 : champsActivite', () => {
  it('activité parente : ni mode, ni dates validées, ni durée, quel que soit le mode', () => {
    for (const mode of ['ASAP', 'START', 'REGUL', 'ALAP', 'FDUR', 'MAN']) {
      expect(champsActivite(mode, true)).toEqual({
        mode: false,
        debut: false,
        fin: false,
        duree: false,
        aideDuree: false,
      });
    }
  });
  it('feuille : le mode et la table de D-220', () => {
    expect(champsActivite('REGUL', false)).toEqual({
      mode: true,
      debut: true,
      fin: true,
      duree: false,
      aideDuree: false,
    });
    expect(champsActivite('ASAP', false)).toMatchObject({
      mode: true,
      duree: true,
      aideDuree: true,
    });
  });
});
