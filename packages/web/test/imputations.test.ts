import { describe, expect, it } from 'vitest';
import {
  CHARGE_INVALIDE,
  RESTE_INVALIDE,
  analyserCharge,
  analyserReste,
  aujourdhuiLocal,
  decalerSemaine,
  formaterJours,
  joursSemaine,
  libelleJour,
  libelleSemaine,
  libelleStatut,
  lignesModifiees,
  lundiDe,
  messageRefusFeuille,
  saisieInitiale,
  saisieValide,
  semaineAffichee,
  totauxJours,
  type JourFeuille,
  type LigneFeuille,
  type Saisie,
} from '../src/imputations/logique.js';

/*
 * Lot 4b (D-120, SPEC §7 « Écran Feuille de temps ») : logique pure de l'écran. Signatures :
 *   lundiDe(jour) → lundi de la semaine ISO du jour (AAAA-MM-JJ)
 *   semaineAffichee(param | null, aujourdhui) → { semaine, corrigee } : param valide (lundi, année 2000
 *     à 2099, AAAA-MM-JJ) gardé ; sinon lundi de la semaine d'aujourd'hui et corrigee = true
 *   decalerSemaine(lundi, delta) ; joursSemaine(lundi) → 7 jours ; libelleSemaine(lundi) ; libelleJour(jour)
 *   formaterJours(n) → virgule décimale
 *   analyserCharge(texte), analyserReste(texte) → { ok: true, valeur } | { ok: false, message }
 *   saisieInitiale(lignes, jours) → Saisie = { [assignation_id]: { charges: { [jour]: texte }, reste: texte } }
 *   totauxJours(saisie, jours) → [{ jour, total, depassement }] (valeurs invalides comptées 0)
 *   lignesModifiees(lignes, saisie) → lignes du PUT (seules les modifiées, jamais `modifiable: false`)
 *   saisieValide(saisie) ; messageRefusFeuille(statut, code) ; libelleStatut(statut) ; aujourdhuiLocal(date)
 */

const S = '2027-01-11';
const JOURS = [
  '2027-01-11',
  '2027-01-12',
  '2027-01-13',
  '2027-01-14',
  '2027-01-15',
  '2027-01-16',
  '2027-01-17',
];

function ligne(id: number, partiel: Partial<LigneFeuille> = {}): LigneFeuille {
  return {
    assignation_id: id,
    projet_id: 1,
    projet_code: 'P',
    activite_id: 10 + id,
    activite_nom: `Tâche ${id}`,
    wbs: String(id),
    assignee: 5,
    reel_cumule: 1,
    reste: 4,
    modifiable: true,
    imputations: [],
    ...partiel,
  };
}

const jours = (capacites: number[]): JourFeuille[] =>
  JOURS.map((jour, i) => ({ jour, capacite: capacites[i]!, total: 0, depassement: false }));

describe('Semaine (D-120 (4), (5), (6))', () => {
  it('FTE-1 : lundiDe : lundi de la semaine ISO, y compris dimanche et changement d’année', () => {
    expect(lundiDe('2027-01-11')).toBe('2027-01-11');
    expect(lundiDe('2027-01-13')).toBe('2027-01-11');
    expect(lundiDe('2027-01-17')).toBe('2027-01-11');
    expect(lundiDe('2027-01-01')).toBe('2026-12-28');
  });

  it('FTE-2 : semaineAffichee : lundi valide gardé ; absente ou invalide → lundi courant, corrigée', () => {
    expect(semaineAffichee('2027-01-11', '2027-01-13')).toEqual({ semaine: S, corrigee: false });
    expect(semaineAffichee('2026-12-28', '2027-01-13')).toEqual({
      semaine: '2026-12-28',
      corrigee: false,
    });
    for (const p of [
      null,
      '',
      '2027-01-12',
      'abc',
      '2027-02-30',
      '2027-1-11',
      '1999-12-27',
      '2100-01-04',
    ]) {
      expect(semaineAffichee(p, '2027-01-13'), String(p)).toEqual({ semaine: S, corrigee: true });
    }
  });

  it('FTE-3 : decalerSemaine : ±1 semaine, changement d’année', () => {
    expect(decalerSemaine(S, 1)).toBe('2027-01-18');
    expect(decalerSemaine(S, -1)).toBe('2027-01-04');
    expect(decalerSemaine('2026-12-28', 1)).toBe('2027-01-04');
    expect(decalerSemaine('2027-01-04', -1)).toBe('2026-12-28');
  });

  it('FTE-4 : joursSemaine : sept jours du lundi au dimanche, changement de mois', () => {
    expect(joursSemaine(S)).toEqual(JOURS);
    expect(joursSemaine('2027-03-29')).toEqual([
      '2027-03-29',
      '2027-03-30',
      '2027-03-31',
      '2027-04-01',
      '2027-04-02',
      '2027-04-03',
      '2027-04-04',
    ]);
  });

  it('FTE-5 : libelleSemaine : « Semaine du JJ/MM/AAAA au JJ/MM/AAAA »', () => {
    expect(libelleSemaine(S)).toBe('Semaine du 11/01/2027 au 17/01/2027');
    expect(libelleSemaine('2026-12-28')).toBe('Semaine du 28/12/2026 au 03/01/2027');
  });

  it('FTE-6 : libelleJour : « lun. 11/01 » … « dim. 17/01 »', () => {
    expect(JOURS.map(libelleJour)).toEqual([
      'lun. 11/01',
      'mar. 12/01',
      'mer. 13/01',
      'jeu. 14/01',
      'ven. 15/01',
      'sam. 16/01',
      'dim. 17/01',
    ]);
  });

  it('FTE-7 : aujourdhuiLocal : date locale du navigateur au format AAAA-MM-JJ', () => {
    expect(aujourdhuiLocal(new Date(2027, 0, 13, 23, 30))).toBe('2027-01-13');
    expect(aujourdhuiLocal(new Date(2027, 0, 4, 0, 5))).toBe('2027-01-04');
  });
});

describe('Analyse de la saisie (D-120 (7))', () => {
  it('FTE-8 : formaterJours : virgule décimale', () => {
    expect(formaterJours(0.5)).toBe('0,5');
    expect(formaterJours(1)).toBe('1');
    expect(formaterJours(1.25)).toBe('1,25');
    expect(formaterJours(0)).toBe('0');
  });

  it('FTE-9 : analyserCharge : vide = 0, virgule ou point, 0 à 10, 2 décimales', () => {
    const cas: [string, number][] = [
      ['', 0],
      ['  ', 0],
      ['0', 0],
      ['0,5', 0.5],
      ['1.25', 1.25],
      [' 2 ', 2],
      ['10', 10],
      ['0,50', 0.5],
    ];
    for (const [texte, valeur] of cas) {
      expect(analyserCharge(texte), texte).toEqual({ ok: true, valeur });
    }
  });

  it('FTE-10 : analyserCharge : non numérique, négative, plus de 2 décimales, > 10 → invalide avec message', () => {
    expect(CHARGE_INVALIDE).toBe(
      'Saisir un nombre de jours entre 0 et 10, avec 2 décimales au plus.',
    );
    for (const texte of [
      'abc',
      '-1',
      '-0,5',
      '0,123',
      '10,01',
      '11',
      '1,2,3',
      '1e1',
      '0x1',
      ',5',
    ]) {
      expect(analyserCharge(texte), texte).toEqual({ ok: false, message: CHARGE_INVALIDE });
    }
  });

  it('FTE-11 : analyserReste : ≥ 0, 2 décimales, sans borne haute ; invalide avec message', () => {
    expect(analyserReste('')).toEqual({ ok: true, valeur: 0 });
    expect(analyserReste('12,5')).toEqual({ ok: true, valeur: 12.5 });
    expect(analyserReste('15')).toEqual({ ok: true, valeur: 15 });
    expect(RESTE_INVALIDE).toBe(
      'Saisir un nombre de jours positif ou nul, avec 2 décimales au plus.',
    );
    for (const texte of ['x', '-1', '1,234']) {
      expect(analyserReste(texte), texte).toEqual({ ok: false, message: RESTE_INVALIDE });
    }
  });

  it('FTE-12 : saisieInitiale : charges formatées (vide sans imputation), reste formaté', () => {
    const lignes = [
      ligne(1, {
        reste: 4.5,
        imputations: [
          { jour: '2027-01-11', charge: 0.5 },
          { jour: '2027-01-13', charge: 1 },
        ],
      }),
      ligne(2, { reste: 0 }),
    ];
    expect(saisieInitiale(lignes, JOURS)).toEqual({
      1: {
        charges: {
          '2027-01-11': '0,5',
          '2027-01-12': '',
          '2027-01-13': '1',
          '2027-01-14': '',
          '2027-01-15': '',
          '2027-01-16': '',
          '2027-01-17': '',
        },
        reste: '4,5',
      },
      2: { charges: Object.fromEntries(JOURS.map((j) => [j, ''])), reste: '0' },
    });
  });

  it('FTE-13 : saisieValide : faux dès qu’une charge ou un reste est invalide', () => {
    const lignes = [ligne(1), ligne(2)];
    const s = saisieInitiale(lignes, JOURS);
    expect(saisieValide(s)).toBe(true);
    s[1]!.charges['2027-01-12'] = '11';
    expect(saisieValide(s)).toBe(false);
    s[1]!.charges['2027-01-12'] = '1';
    s[2]!.reste = '-1';
    expect(saisieValide(s)).toBe(false);
  });
});

describe('Totaux et dépassement (D-120 (8))', () => {
  it('FTE-14 : totauxJours : somme des lignes au centième, dépassement si total > capacité, invalide = 0', () => {
    const lignes = [ligne(1), ligne(2), ligne(3, { modifiable: false })];
    const s: Saisie = saisieInitiale(lignes, JOURS);
    s[1]!.charges['2027-01-11'] = '0,1';
    s[2]!.charges['2027-01-11'] = '0.2';
    s[1]!.charges['2027-01-12'] = '0,75';
    s[3]!.charges['2027-01-12'] = '0,5';
    s[1]!.charges['2027-01-13'] = 'abc';
    s[2]!.charges['2027-01-13'] = '1';
    s[1]!.charges['2027-01-16'] = '0,5';
    expect(totauxJours(s, jours([1, 1, 1, 1, 1, 0, 0]))).toEqual([
      { jour: '2027-01-11', total: 0.3, depassement: false },
      { jour: '2027-01-12', total: 1.25, depassement: true },
      { jour: '2027-01-13', total: 1, depassement: false },
      { jour: '2027-01-14', total: 0, depassement: false },
      { jour: '2027-01-15', total: 0, depassement: false },
      { jour: '2027-01-16', total: 0.5, depassement: true },
      { jour: '2027-01-17', total: 0, depassement: false },
    ]);
  });
});

describe('Lignes modifiées (D-120 (7), (9))', () => {
  const lignes = [
    ligne(1, {
      reste: 4,
      imputations: [
        { jour: '2027-01-11', charge: 0.5 },
        { jour: '2027-01-12', charge: 1 },
      ],
    }),
    ligne(2, { reste: 3 }),
    ligne(3, { modifiable: false, imputations: [{ jour: '2027-01-11', charge: 1 }] }),
  ];

  it('FTE-15 : rien de modifié → [] ; même valeur autrement écrite (« 0,50 », « 1.0 ») → []', () => {
    const s = saisieInitiale(lignes, JOURS);
    expect(lignesModifiees(lignes, s)).toEqual([]);
    s[1]!.charges['2027-01-11'] = '0,50';
    s[1]!.charges['2027-01-12'] = '1.0';
    s[2]!.reste = '3,00';
    expect(lignesModifiees(lignes, s)).toEqual([]);
  });

  it('FTE-16 : charge modifiée → la ligne seule, imputations > 0 triées par jour, sans reste', () => {
    const s = saisieInitiale(lignes, JOURS);
    s[1]!.charges['2027-01-13'] = '0,25';
    s[1]!.charges['2027-01-11'] = '';
    expect(lignesModifiees(lignes, s)).toEqual([
      {
        assignation_id: 1,
        imputations: [
          { jour: '2027-01-12', charge: 1 },
          { jour: '2027-01-13', charge: 0.25 },
        ],
      },
    ]);
  });

  it('FTE-17 : reste modifié → reste envoyé avec les imputations actuelles ; tout effacé → imputations [] ; ligne non modifiable jamais envoyée', () => {
    const s = saisieInitiale(lignes, JOURS);
    s[2]!.reste = '2,5';
    s[1]!.charges['2027-01-11'] = '0';
    s[1]!.charges['2027-01-12'] = '';
    s[3]!.charges['2027-01-11'] = '2';
    expect(lignesModifiees(lignes, s)).toEqual([
      { assignation_id: 1, imputations: [] },
      { assignation_id: 2, imputations: [], reste: 2.5 },
    ]);
  });
});

describe('Textes (D-120 (5), (9), (10))', () => {
  it('FTE-18 : libelleStatut', () => {
    expect(libelleStatut('brouillon')).toBe('Brouillon');
    expect(libelleStatut('soumise')).toBe('Soumise');
    expect(libelleStatut('validee')).toBe('Validée');
    expect(libelleStatut('rejetee')).toBe('Rejetée');
  });

  it('FTE-19 : messageRefusFeuille : textes de D-120 par statut et code', () => {
    expect(messageRefusFeuille(400, undefined)).toBe('Données invalides.');
    expect(messageRefusFeuille(422, 'assignation_invalide')).toBe(
      'Cette ligne n’est plus disponible.',
    );
    expect(messageRefusFeuille(422, 'ligne_fermee')).toBe(
      'Cette activité ou ce projet est clos : la ligne n’est plus modifiable.',
    );
    expect(messageRefusFeuille(422, 'jour_futur')).toBe('Impossible d’imputer un jour futur.');
    expect(messageRefusFeuille(422, 'feuille_verrouillee')).toBe(
      'La feuille est soumise ou validée : elle n’est plus modifiable.',
    );
    expect(messageRefusFeuille(422, 'feuille_vide')).toBe('Aucune imputation : rien à soumettre.');
    expect(messageRefusFeuille(422, 'deja_validee')).toBe('La feuille est déjà validée en partie.');
    expect(messageRefusFeuille(500, undefined)).toBe(
      'Action impossible pour le moment. Réessayez.',
    );
    expect(messageRefusFeuille(422, 'code_inconnu')).toBe(
      'Action impossible pour le moment. Réessayez.',
    );
  });
});
