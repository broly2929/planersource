import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import { act, activite, ALICE, at, dep, entree, J, projet, tache, trav } from './helpers.js';

describe('départage (SPEC §5.2)', () => {
  it('TRI-1 : (a) priorité projet, (b) priorité activité, (c) ordre WBS', () => {
    // (a) P1 priorité 100, P2 priorité 500 ; l'activité de P1 porte l'id le plus grand
    const a = calculer(
      entree({
        projets: [projet(1, { priorite: 100 }), projet(2, { priorite: 500 })],
        taches: [tache(1, ALICE, 1, { projetId: 2 }), tache(2, ALICE, 1, { projetId: 1 })],
      }),
    );
    expect(trav(a, 2)).toEqual(at({ 4: 100 }));
    expect(trav(a, 1)).toEqual(at({ 5: 100 }));

    // (b) priorité d'activité 100 avant 500
    const b = calculer(
      entree({
        taches: [tache(1, ALICE, 1, { priorite: 500 }), tache(2, ALICE, 1, { priorite: 100 })],
      }),
    );
    expect(trav(b, 2)).toEqual(at({ 4: 100 }));
    expect(trav(b, 1)).toEqual(at({ 5: 100 }));

    // (c) WBS : parent 1 (enfants 1.1 = id 3, 1.2 = id 4), activité 2
    const c = calculer(
      entree({
        elements: [act(1, { rang: 1 })],
        taches: [
          tache(2, ALICE, 1, { rang: 2 }),
          tache(3, ALICE, 1, { parentId: 1, rang: 1 }),
          tache(4, ALICE, 1, { parentId: 1, rang: 2 }),
        ],
      }),
    );
    expect(trav(c, 3)).toEqual(at({ 4: 100 }));
    expect(trav(c, 4)).toEqual(at({ 5: 100 }));
    expect(trav(c, 2)).toEqual(at({ 6: 100 }));
  });

  it('TRI-2 : A priorité 900 → B priorité 100 en FD, C indépendant priorité 500 : C le 04/01, A le 05/01, B le 06/01', () => {
    const s = calculer(
      entree({
        taches: [
          tache(1, ALICE, 1, { priorite: 900 }),
          tache(2, ALICE, 1, { priorite: 100 }),
          tache(3, ALICE, 1, { priorite: 500 }),
        ],
        dependances: [dep(1, 2)],
      }),
    );
    expect(trav(s, 3)).toEqual(at({ 4: 100 }));
    expect(trav(s, 1)).toEqual(at({ 5: 100 }));
    expect(trav(s, 2)).toEqual(at({ 6: 100 }));
  });
});

describe('règle de remplissage (SPEC §5.4)', () => {
  it('REMP-1 : travail externe 0,50 chaque jour : activité Alice 5 j à 0,50 j/jour du 04 au 15/01 (10 jours ouvrés)', () => {
    const externe = Array.from({ length: 26 }, (_, i) => ({
      ressourceId: ALICE,
      jour: J(4 + i),
      charge: 50,
    }));
    const s = calculer(entree({ taches: [tache(1, ALICE, 5)], travailExterne: externe }));
    expect(trav(s, 1)).toEqual(
      at({ 4: 50, 5: 50, 6: 50, 7: 50, 8: 50, 11: 50, 12: 50, 13: 50, 14: 50, 15: 50 }),
    );
  });

  it("REMP-2 : capacité Alice 1,50, taux d'assignation 3333, charge 1 j : 0,49 le 04, 0,49 le 05, 0,02 le 06/01", () => {
    const s = calculer(
      entree({
        ressources: [
          { id: ALICE, capacite: 150, calendrierId: 1 },
          { id: 2, capacite: 100, calendrierId: 1 },
        ],
        taches: [tache(1, ALICE, 1, {}, { taux: 3333 })],
      }),
    );
    expect(trav(s, 1)).toEqual(at({ 4: 49, 5: 49, 6: 2 }));
  });

  it('REMP-3 : 3,5 j taux 100 % : 1, 1, 1, 0,5 les 04, 05, 06, 07/01', () => {
    expect(trav(calculer(entree({ taches: [tache(1, ALICE, 3.5)] })), 1)).toEqual(
      at({ 4: 100, 5: 100, 6: 100, 7: 50 }),
    );
  });

  it('REMP-4 : D0 sam 09/01 : début 11/01 ; D0 04/01 et début de projet 06/01 : début 06/01', () => {
    const a = calculer(entree({ d0: J(9), taches: [tache(1, ALICE, 1)] }));
    expect(activite(a, 1).debut).toBe(J(11));
    const b = calculer(
      entree({ projets: [projet(1, { debut: J(6) })], taches: [tache(1, ALICE, 1)] }),
    );
    expect(activite(b, 1).debut).toBe(J(6));
  });

  it('REMP-5 : imputations 1 j les 04 et 05/01, D0 06/01, reste 3 j : travail posé les 06, 07, 08/01 ; dates 04 → 08/01 ; reel 200 ; reste 300', () => {
    const s = calculer(
      entree({
        d0: J(6),
        taches: [tache(1, ALICE, 5, {}, { chargeReelle: 200, resteAFaire: 300 })],
        travailReel: [
          { assignationId: 1, jour: J(4), charge: 100 },
          { assignationId: 1, jour: J(5), charge: 100 },
        ],
      }),
    );
    expect(trav(s, 1)).toEqual(at({ 6: 100, 7: 100, 8: 100 }));
    expect(activite(s, 1)).toMatchObject({ debut: J(4), fin: J(8), reel: 200, reste: 300 });
  });

  it("REMP-6 : sans assignation, durée validée 3 : barre 04 → 06/01, charge 0 ; assignation de charge 0, reste 0, sans réel : barre d'1 jour le 04/01", () => {
    const a = calculer(entree({ taches: [tache(1, null, 0, { dureeValidee: 3 })] }));
    expect(activite(a, 1)).toMatchObject({ debut: J(4), fin: J(6), charge: 0 });
    const b = calculer(entree({ taches: [tache(1, ALICE, 0)] }));
    expect(activite(b, 1)).toMatchObject({ debut: J(4), fin: J(4), charge: 0 });
    expect(b.travail).toEqual([]);
  });
});
