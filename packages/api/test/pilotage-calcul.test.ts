import { describe, expect, it } from 'vitest';
import { coutsMensuels, sommeMensuelle, totalMensuel } from '../src/planning/couts-mensuels.js';
import type { PeriodeTaux } from '../src/planning/couts.js';
import { MOIS, mensuel, total } from './pilotage-helpers.js';

/**
 * Calcul mensuel des coûts, fonctions pures (SPEC §12.5 points 2 et 6, D-243) : PIL-1 à PIL-5.
 * Valeurs recopiées des cas PIL-A à PIL-E de la SPEC ; aucune base, aucune horloge.
 */

const ALICE: PeriodeTaux[] = [
  { debut: '2027-01-01', fin: '2027-01-31', montant: 600 },
  { debut: '2027-02-01', fin: null, montant: 700 },
];
const CAROL: PeriodeTaux[] = [{ debut: '2027-03-01', fin: '2027-03-31', montant: 500 }];
const BOB: PeriodeTaux[] = [];

describe('Calcul mensuel des coûts (fonctions pures)', () => {
  it('PIL-1 : PIL-A, Alice, deux imputations et un planifié', () => {
    const mois = coutsMensuels({
      taux: ALICE,
      mois: MOIS,
      imputations: [
        { jour: '2027-01-29', charge: 1 },
        { jour: '2027-02-01', charge: 1 },
      ],
      planifies: [{ jour: '2027-02-15', charge: 0.5 }],
    });
    expect(mois).toEqual(mensuel({ '2027-01': [600, 0, 600], '2027-02': [700, 350, 1050] }));
    expect(totalMensuel(mois)).toEqual(total(1300, 350, 1650));
  });

  it('PIL-2 : PIL-B, Alice, 0,25 j planifié le 05/01 → janvier : coût 150', () => {
    const mois = coutsMensuels({
      taux: ALICE,
      mois: MOIS,
      imputations: [],
      planifies: [{ jour: '2027-01-05', charge: 0.25 }],
    });
    expect(mois).toEqual(mensuel({ '2027-01': [0, 150, 150] }));
  });

  it('PIL-3 : PIL-C, Bob sans aucune période → coûts 0 partout, sans marque', () => {
    const mois = coutsMensuels({
      taux: BOB,
      mois: MOIS,
      imputations: [{ jour: '2027-01-11', charge: 1 }],
      planifies: [{ jour: '2027-03-10', charge: 2 }],
    });
    expect(mois).toEqual(mensuel());
    expect(totalMensuel(mois)).toEqual(total(0, 0, 0, false));
  });

  it('PIL-4 : PIL-D, Carol → mars 500 ; avril 0 et taux manquant ; total en taux manquant', () => {
    const mois = coutsMensuels({
      taux: CAROL,
      mois: MOIS,
      imputations: [],
      planifies: [
        { jour: '2027-03-15', charge: 1 },
        { jour: '2027-04-02', charge: 1 },
      ],
    });
    expect(mois).toEqual(mensuel({ '2027-03': [0, 500, 500], '2027-04': [0, 0, 0, true] }));
    expect(totalMensuel(mois)).toEqual(total(0, 500, 500, true));
  });

  it('PIL-5 : agrégats, ligne de projet = somme des ressources, taux manquant = OU, total général', () => {
    const alice = coutsMensuels({
      taux: ALICE,
      mois: MOIS,
      imputations: [
        { jour: '2027-01-29', charge: 1 },
        { jour: '2027-02-01', charge: 1 },
      ],
      planifies: [
        { jour: '2027-02-15', charge: 0.5 },
        { jour: '2027-01-05', charge: 0.25 },
      ],
    });
    const bob = coutsMensuels({
      taux: BOB,
      mois: MOIS,
      imputations: [{ jour: '2027-01-11', charge: 1 }],
      planifies: [{ jour: '2027-03-10', charge: 2 }],
    });
    const carol = coutsMensuels({
      taux: CAROL,
      mois: MOIS,
      imputations: [],
      planifies: [
        { jour: '2027-03-15', charge: 1 },
        { jour: '2027-04-02', charge: 1 },
      ],
    });
    const p1 = sommeMensuelle([alice, bob, carol]);
    expect(p1).toEqual(
      mensuel({
        '2027-01': [600, 150, 750],
        '2027-02': [700, 350, 1050],
        '2027-03': [0, 500, 500],
        '2027-04': [0, 0, 0, true],
      }),
    );
    expect(totalMensuel(p1)).toEqual(total(1300, 1000, 2300, true));

    const aliceP11 = coutsMensuels({
      taux: ALICE,
      mois: MOIS,
      imputations: [],
      planifies: [{ jour: '2027-01-04', charge: 1 }],
    });
    expect(aliceP11).toEqual(mensuel({ '2027-01': [0, 600, 600] }));
    const general = sommeMensuelle([p1, aliceP11]);
    expect(general).toEqual(
      mensuel({
        '2027-01': [600, 750, 1350],
        '2027-02': [700, 350, 1050],
        '2027-03': [0, 500, 500],
        '2027-04': [0, 0, 0, true],
      }),
    );
    expect(totalMensuel(general)).toEqual(total(1300, 1600, 2900, true));
  });
});
