import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import {
  act,
  activite,
  ALICE,
  at,
  BOB,
  dep,
  entree,
  J,
  jal,
  jalon,
  projet,
  tache,
  trav,
} from './helpers.js';

describe('dépendances (SPEC §5.3)', () => {
  it('DEPM-1 : FD délai −1 : B le 06/01 ; borné par D0 : A (1 j, 04/01), B FD délai −3 : B le 04/01', () => {
    const a = calculer(
      entree({
        taches: [tache(1, ALICE, 3), tache(2, BOB, 1)],
        dependances: [dep(1, 2, 'FD', -1)],
      }),
    );
    expect(trav(a, 2)).toEqual(at({ 6: 100 }));
    const b = calculer(
      entree({
        taches: [tache(1, ALICE, 1), tache(2, BOB, 1)],
        dependances: [dep(1, 2, 'FD', -3)],
      }),
    );
    expect(trav(b, 2)).toEqual(at({ 4: 100 }));
  });

  it('DEPM-2 : A (Alice 1 j, 04/01), B (Bob 3 j) FF délai 0 : ne tient pas avant, B les 04, 05, 06/01, aucun drapeau', () => {
    const s = calculer(
      entree({ taches: [tache(1, ALICE, 1), tache(2, BOB, 3)], dependances: [dep(1, 2, 'FF')] }),
    );
    expect(trav(s, 2)).toEqual(at({ 4: 100, 5: 100, 6: 100 }));
    expect(activite(s, 2).drapeaux).toEqual([]);
    expect(activite(s, 1).drapeaux).toEqual([]);
  });

  it('DEPM-3 : A1 (Alice 1 j, fin 04/01) et A2 (Bob 3 j, fin 06/01) tous deux FD vers C (Alice 1 j) : C le 07/01', () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 1), tache(2, BOB, 3), tache(3, ALICE, 1)],
        dependances: [dep(1, 3), dep(2, 3)],
      }),
    );
    expect(trav(s, 3)).toEqual(at({ 7: 100 }));
  });

  it('DEPM-4 : parent A (A1 Alice 2 j, A2 Bob 3 j) puis B (Alice 1 j) en FD depuis A : B le 07/01', () => {
    const s = calculer(
      entree({
        elements: [act(1)],
        taches: [
          tache(2, ALICE, 2, { parentId: 1, rang: 1 }),
          tache(3, BOB, 3, { parentId: 1, rang: 2 }),
          tache(4, ALICE, 1, { rang: 2 }),
        ],
        dependances: [dep(1, 4)],
      }),
    );
    expect(trav(s, 4)).toEqual(at({ 7: 100 }));
  });

  it('DEPM-5 : P (Alice 2 j, 04–05) puis parent S (S1, S2 Bob 1 j, S1 rang 1) en FD depuis P : S1 le 06/01, S2 le 07/01', () => {
    const s = calculer(
      entree({
        elements: [act(2, { rang: 2 })],
        taches: [
          tache(1, ALICE, 2, { rang: 1 }),
          tache(3, BOB, 1, { parentId: 2, rang: 1 }),
          tache(4, BOB, 1, { parentId: 2, rang: 2 }),
        ],
        dependances: [dep(1, 2)],
      }),
    );
    expect(trav(s, 3)).toEqual(at({ 6: 100 }));
    expect(trav(s, 4)).toEqual(at({ 7: 100 }));
  });

  it('DEPM-7 : A (Alice 5 j, 04–08/01), B sans assignation de durée validée 2, FF délai 0 depuis A : B 07 → 08/01, charge 0, aucun travail pour B, drapeaux []', () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 5), tache(2, null, 0, { dureeValidee: 2 })],
        dependances: [dep(1, 2, 'FF')],
      }),
    );
    expect(activite(s, 2)).toMatchObject({ debut: J(7), fin: J(8), charge: 0, drapeaux: [] });
    expect(trav(s, 2)).toEqual({});
  });

  it('DEPM-6 : A (Alice 3 j) → jalon flottant FD → B (Bob 1 j) FD délai 0 depuis le jalon : jalon le 06/01, B le 07/01', () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 3), tache(3, BOB, 1)],
        elements: [jal(2)],
        dependances: [dep(1, 2), dep(2, 3)],
      }),
    );
    expect(jalon(s, 2).date).toBe(J(6));
    expect(trav(s, 3)).toEqual(at({ 7: 100 }));
  });
});

describe('jalons (SPEC §5.3)', () => {
  it('JALM-1 : flottant sans prédécesseur : D0 04/01, début projet 06/01 → 06/01 ; D0 sam 09/01 → 11/01', () => {
    const a = calculer(entree({ projets: [projet(1, { debut: J(6) })], elements: [jal(1)] }));
    expect(jalon(a, 1).date).toBe(J(6));
    const b = calculer(entree({ d0: J(9), elements: [jal(1)] }));
    expect(jalon(b, 1).date).toBe(J(11));
  });

  it('JALM-2 : A (Alice 3 j) → flottant FD délai 1 : 07/01', () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 3)],
        elements: [jal(2)],
        dependances: [dep(1, 2, 'FD', 1)],
      }),
    );
    expect(jalon(s, 2).date).toBe(J(7));
  });

  it('JALM-3 : A (Alice 2 j, 04–05) → jalon fixe validé 06/01 en FD : 06/01, drapeaux [] ; jalon fixe validé 06/01 sans prédécesseur : 06/01, drapeaux []', () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 2)],
        elements: [jal(2, { nature: 'fixe', dateValidee: J(6) })],
        dependances: [dep(1, 2)],
      }),
    );
    expect(jalon(s, 2)).toMatchObject({ date: J(6), drapeaux: [] });
    const seul = calculer(entree({ elements: [jal(1, { nature: 'fixe', dateValidee: J(6) })] }));
    expect(jalon(seul, 1)).toMatchObject({ date: J(6), drapeaux: [] });
  });

  it('JALM-4 : A (Alice 3 j, 04–06) : flottant DD délai 1 : 05/01 ; FF délai 0 : 06/01 ; date validée 11/01 avec FD : 11/01', () => {
    const avec = (type: 'FD' | 'DD' | 'FF', delai: number, j = jal(2)) =>
      calculer(
        entree({
          taches: [tache(1, ALICE, 3)],
          elements: [j],
          dependances: [dep(1, 2, type, delai)],
        }),
      );
    expect(jalon(avec('DD', 1), 2).date).toBe(J(5));
    expect(jalon(avec('FF', 0), 2).date).toBe(J(6));
    expect(jalon(avec('FD', 0, jal(2, { dateValidee: J(11) })), 2).date).toBe(J(11));
  });
});
