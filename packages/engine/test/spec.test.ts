import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import {
  activite,
  ALICE,
  at,
  BOB,
  dep,
  entree,
  erreur,
  J,
  jal,
  jalon,
  tache,
  trav,
} from './helpers.js';

describe('SPEC §5.6 ASAP', () => {
  it('ASAP-1 : Alice 5 j, taux 100 % : 1 j/jour du 04 au 08/01', () => {
    const s = calculer(entree({ taches: [tache(1, ALICE, 5)] }));
    expect(trav(s, 1)).toEqual(at({ 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 }));
  });

  it('ASAP-2 : Alice 3 j, taux 50 % : 0,5 j/jour les 04, 05, 06, 07, 08 et 11/01 ; fin le 11/01', () => {
    const s = calculer(entree({ taches: [tache(1, ALICE, 3, {}, { taux: 5000 })] }));
    expect(trav(s, 1)).toEqual(at({ 4: 50, 5: 50, 6: 50, 7: 50, 8: 50, 11: 50 }));
    expect(activite(s, 1).fin).toBe(J(11));
  });

  it('ASAP-3 : activité 1 (WBS 1, Alice 3 j), activité 2 (WBS 2, Alice 2 j) : 1 du 04 au 06/01, 2 les 07 et 08/01', () => {
    const s = calculer(entree({ taches: [tache(2, ALICE, 2), tache(1, ALICE, 3)] }));
    expect(trav(s, 1)).toEqual(at({ 4: 100, 5: 100, 6: 100 }));
    expect(trav(s, 2)).toEqual(at({ 7: 100, 8: 100 }));
    expect(s.travail.map((t) => [t.assignationId, t.jour])).toEqual([
      [1, J(4)],
      [1, J(5)],
      [1, J(6)],
      [2, J(7)],
      [2, J(8)],
    ]);
  });

  it('ASAP-4 : aucune assignation : barre le 04/01, charge 0', () => {
    const s = calculer(entree({ taches: [tache(1, null)] }));
    expect(activite(s, 1)).toMatchObject({ debut: J(4), fin: J(4), charge: 0 });
    expect(s.travail).toEqual([]);
  });
});

describe('SPEC §5.7 dépendances et jalons', () => {
  const ab = (type: 'FD' | 'DD' | 'FF', delai: number, jA = 3) =>
    entree({
      taches: [tache(1, ALICE, jA), tache(2, BOB, 2)],
      dependances: [dep(1, 2, type, delai)],
    });

  it('DEP-1 : A (Alice 3 j) → B (Bob 2 j), FD, délai 0 : A du 04 au 06/01 ; B les 07 et 08/01', () => {
    const s = calculer(ab('FD', 0));
    expect(trav(s, 1)).toEqual(at({ 4: 100, 5: 100, 6: 100 }));
    expect(trav(s, 2)).toEqual(at({ 7: 100, 8: 100 }));
  });

  it('DEP-2 : DEP-1 avec délai 2 : B les 11 et 12/01', () => {
    expect(trav(calculer(ab('FD', 2)), 2)).toEqual(at({ 11: 100, 12: 100 }));
  });

  it('DEP-3 : A (Alice 3 j) → B (Bob 2 j), DD, délai 1 : B les 05 et 06/01', () => {
    expect(trav(calculer(ab('DD', 1)), 2)).toEqual(at({ 5: 100, 6: 100 }));
  });

  it('DEP-4 : A (Alice 5 j) → B (Bob 2 j), FF, délai 0 : A du 04 au 08/01 ; B les 07 et 08/01', () => {
    const s = calculer(ab('FF', 0, 5));
    expect(trav(s, 1)).toEqual(at({ 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 }));
    expect(trav(s, 2)).toEqual(at({ 7: 100, 8: 100 }));
  });

  it('DEP-5 : A → B → A : erreur « cycle de dépendances », ids des éléments du cycle', () => {
    const e = erreur(
      entree({
        taches: [tache(1, ALICE, 1), tache(2, BOB, 1)],
        dependances: [dep(1, 2), dep(2, 1)],
      }),
    );
    expect(e.code).toBe('cycle_dependances');
    expect(e.ids).toEqual([1, 2]);
  });

  it('JAL-1 : A (Alice 3 j) → jalon flottant, FD : jalon le 06/01', () => {
    const s = calculer(
      entree({ taches: [tache(1, ALICE, 3)], elements: [jal(2)], dependances: [dep(1, 2)] }),
    );
    expect(jalon(s, 2).date).toBe(J(6));
  });

  it('JAL-2 : A (Alice 5 j) puis jalon fixe validé le 06/01 en FD : jalon le 06/01, drapeaux exactement [retard]', () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 5)],
        elements: [jal(2, { nature: 'fixe', dateValidee: J(6) })],
        dependances: [dep(1, 2)],
      }),
    );
    expect(jalon(s, 2)).toMatchObject({ date: J(6), drapeaux: ['retard'] });
  });
});
