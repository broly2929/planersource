import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import {
  ALICE,
  at,
  BOB,
  dep,
  entree,
  J,
  LUN_VEN,
  MAR_SAM,
  projet,
  tache,
  trav,
} from './helpers.js';

describe('calendriers (SPEC §4)', () => {
  it('CALM-1 : férié 06/01 sauté ; calendrier mar–sam : posé le 05/01, samedi 09/01 ouvré', () => {
    const ferie = calculer(
      entree({
        calendriers: [{ ...LUN_VEN, feries: [J(6)] }],
        taches: [tache(1, ALICE, 3)],
      }),
    );
    expect(trav(ferie, 1)).toEqual(at({ 4: 100, 5: 100, 7: 100 }));

    const marSam = (jours: number) =>
      entree({
        calendriers: [LUN_VEN, MAR_SAM],
        ressources: [
          { id: ALICE, capacite: 100, calendrierId: 2 },
          { id: BOB, capacite: 100, calendrierId: 1 },
        ],
        taches: [tache(1, ALICE, jours)],
      });
    expect(trav(calculer(marSam(1)), 1)).toEqual(at({ 5: 100 }));
    expect(trav(calculer(marSam(6)), 1)).toEqual(
      at({ 5: 100, 6: 100, 7: 100, 8: 100, 9: 100, 12: 100 }),
    );
  });

  it('CALM-2 : FD délai +2, 0, −1 ; les délais suivent le calendrier par défaut même si Bob est sur mar–sam', () => {
    const ab = (delai: number, joursB: number, bobMarSam = false) =>
      entree({
        calendriers: [LUN_VEN, MAR_SAM],
        ressources: [
          { id: ALICE, capacite: 100, calendrierId: 1 },
          { id: BOB, capacite: 100, calendrierId: bobMarSam ? 2 : 1 },
        ],
        taches: [tache(1, ALICE, 3), tache(2, BOB, joursB)],
        dependances: [dep(1, 2, 'FD', delai)],
      });
    expect(trav(calculer(ab(2, 2)), 2)).toEqual(at({ 11: 100, 12: 100 }));
    expect(trav(calculer(ab(0, 2)), 2)).toEqual(at({ 7: 100, 8: 100 }));
    expect(trav(calculer(ab(-1, 1)), 2)).toEqual(at({ 6: 100 }));
    // délai 2 selon le calendrier par défaut : début au plus tôt le 11/01 (lundi, non ouvré pour Bob) → 12 et 13/01
    expect(trav(calculer(ab(2, 2, true)), 2)).toEqual(at({ 12: 100, 13: 100 }));
  });
});

describe('disponibilité (SPEC §4)', () => {
  const dispo = (externe: number) =>
    entree({
      taches: [
        tache(1, ALICE, 1),
        tache(2, ALICE, 0.5, { close: false }, { chargeReelle: 50, resteAFaire: 0 }),
      ],
      travailReel: [{ assignationId: 2, jour: J(4), charge: 50 }],
      travailExterne: [{ ressourceId: ALICE, jour: J(4), charge: externe }],
    });

  it('DISPO-1 : externe 0,30 + réel 0,50 le 04/01 : 0,20 puis 0,80 ; externe 1,20 : disponibilité 0, rien le 04/01', () => {
    expect(trav(calculer(dispo(30)), 1)).toEqual(at({ 4: 20, 5: 80 }));
    expect(trav(calculer(dispo(120)), 1)).toEqual(at({ 5: 100 }));
  });

  it('DISPO-2 : Alice lun–ven, Bob mar–sam, projet et D0 le sam 09/01 : Bob le 09/01, Alice le 11/01', () => {
    const s = calculer(
      entree({
        d0: J(9),
        calendriers: [LUN_VEN, MAR_SAM],
        ressources: [
          { id: ALICE, capacite: 100, calendrierId: 1 },
          { id: BOB, capacite: 100, calendrierId: 2 },
        ],
        projets: [projet(1, { debut: J(9) })],
        taches: [tache(1, ALICE, 1), tache(2, BOB, 1)],
      }),
    );
    expect(trav(s, 1)).toEqual(at({ 11: 100 }));
    expect(trav(s, 2)).toEqual(at({ 9: 100 }));
  });

  it("DISPO-3 : affectation d'Alice du 06/01 au 08/01, activité 5 j : 06, 07 et 08/01 seulement ; reste 2 j non posé, avertissement", () => {
    const s = calculer(
      entree({
        projets: [
          projet(1, {
            affectations: [
              { ressourceId: ALICE, taux: 10000, debut: J(6), fin: J(8) },
              { ressourceId: BOB, taux: 10000 },
            ],
          }),
        ],
        taches: [tache(1, ALICE, 5)],
      }),
    );
    expect(trav(s, 1)).toEqual(at({ 6: 100, 7: 100, 8: 100 }));
    expect(s.avertissements).toEqual([{ code: 'reste_non_pose', assignationId: 1, reste: 200 }]);
  });
});
