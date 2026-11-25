// Lot couts, tranche 2 (D-229) : calcul des coûts, fonctions pures. COUT-1 à COUT-7.
// Valeurs attendues recopiées du tableau de SPEC §12.3.
import { describe, expect, it } from 'vitest';
import { coutsActivites, type LigneAssignation, type PeriodeTaux } from '../src/planning/couts.js';

const ALICE: PeriodeTaux[] = [
  { debut: '2027-01-01', fin: '2027-01-31', montant: 600 },
  { debut: '2027-02-01', fin: null, montant: 700 },
];
const BOB: PeriodeTaux[] = [];
const CAROL: PeriodeTaux[] = [{ debut: '2027-03-01', fin: '2027-03-31', montant: 500 }];

const ligne = (
  activite_id: number,
  taux: PeriodeTaux[],
  charge_assignee: number,
  reste_a_faire: number,
  imputations: { jour: string; charge: number }[] = [],
): LigneAssignation => ({ activite_id, taux, charge_assignee, reste_a_faire, imputations });

const racine = new Map<number, number | null>([[1, null]]);

describe('Lot couts-2 : calcul des coûts (SPEC §12.3)', () => {
  it('COUT-1 : Alice 5 j, aucune imputation, reste 5 j, jour 15/01/2027', () => {
    const r = coutsActivites([ligne(1, ALICE, 5, 5)], racine, '2027-01-15');
    expect(r.activites.get(1)).toEqual({
      planifie: 3000,
      impute: 0,
      reel: 3000,
      taux_manquant: false,
    });
  });

  it('COUT-2 : Alice 5 j, imputations 31/01 et 01/02, reste 3 j, jour 02/02/2027', () => {
    const r = coutsActivites(
      [
        ligne(1, ALICE, 5, 3, [
          { jour: '2027-01-31', charge: 1 },
          { jour: '2027-02-01', charge: 1 },
        ]),
      ],
      racine,
      '2027-02-02',
    );
    expect(r.activites.get(1)).toEqual({
      planifie: 3500,
      impute: 1300,
      reel: 3400,
      taux_manquant: false,
    });
  });

  it('COUT-3 : Alice 0,5 j, reste 0,5 j, jour 15/01/2027', () => {
    const r = coutsActivites([ligne(1, ALICE, 0.5, 0.5)], racine, '2027-01-15');
    expect(r.activites.get(1)).toEqual({
      planifie: 300,
      impute: 0,
      reel: 300,
      taux_manquant: false,
    });
  });

  it('COUT-4 : Bob 4 j sans taux, imputation 10/01, reste 3 j, jour 15/01/2027', () => {
    const r = coutsActivites(
      [ligne(1, BOB, 4, 3, [{ jour: '2027-01-10', charge: 1 }])],
      racine,
      '2027-01-15',
    );
    expect(r.activites.get(1)).toEqual({
      planifie: 0,
      impute: 0,
      reel: 0,
      taux_manquant: false,
    });
  });

  it('COUT-5 : Carol 2 j, imputation 15/03, reste 1 j, jour 02/04/2027', () => {
    const r = coutsActivites(
      [ligne(1, CAROL, 2, 1, [{ jour: '2027-03-15', charge: 1 }])],
      racine,
      '2027-04-02',
    );
    expect(r.activites.get(1)).toEqual({
      planifie: 0,
      impute: 500,
      reel: 500,
      taux_manquant: true,
    });
  });

  it('COUT-6 : parent P (1), F1 (Alice 5 j), F2 (Carol 2 j), jour 15/01/2027', () => {
    const parents = new Map<number, number | null>([
      [1, null],
      [2, 1],
      [3, 1],
    ]);
    const r = coutsActivites([ligne(2, ALICE, 5, 5), ligne(3, CAROL, 2, 2)], parents, '2027-01-15');
    expect(r.activites.get(2)).toEqual({
      planifie: 3000,
      impute: 0,
      reel: 3000,
      taux_manquant: false,
    });
    expect(r.activites.get(3)).toEqual({
      planifie: 0,
      impute: 0,
      reel: 0,
      taux_manquant: true,
    });
    const attendu = { planifie: 3000, impute: 0, reel: 3000, taux_manquant: true };
    expect(r.activites.get(1)).toEqual(attendu);
    expect(r.projet).toEqual(attendu);
  });

  it('COUT-7 : Alice 2 j (reste 2) et Bob 3 j (reste 3) sur une activité, jour 15/01/2027', () => {
    const r = coutsActivites([ligne(1, ALICE, 2, 2), ligne(1, BOB, 3, 3)], racine, '2027-01-15');
    expect(r.activites.get(1)).toEqual({
      planifie: 1200,
      impute: 0,
      reel: 1200,
      taux_manquant: false,
    });
  });
});
