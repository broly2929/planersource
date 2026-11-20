import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Sortie } from '../src/index.js';
import { act, activite, ALICE, at, BOB, dep, entree, J, tache, trav } from './helpers.js';

const DNR = 'dependance_non_respectee';

function pose(s: Sortie, assignationId: number, jours: Record<number, number>): void {
  expect(trav(s, assignationId)).toEqual(at(jours));
}

function dates(s: Sortie, id: number, debut: number, fin: number, drapeaux: string[]): void {
  const a = activite(s, id);
  expect(a.debut).toBe(J(debut));
  expect(a.fin).toBe(J(fin));
  expect(a.drapeaux).toEqual(drapeaux);
}

const chaque = (jours: number[], charge: number): Record<number, number> =>
  Object.fromEntries(jours.map((j) => [j, charge]));

const REG = (id: number, ressource: number, jours: number, debut: number, fin: number) =>
  tache(id, ressource, jours, { mode: 'REGUL', debutValide: J(debut), finValide: J(fin) });

describe('Reprises du lot 2d (lot 2e-0, D-056 R1) : caractérisation', () => {
  it('DNR-8 : prédécesseur sans dates (activité close sans réel, parent sans feuille datée) : contrôle sauté, dépendance à drapeaux vides', () => {
    const a = calculer(
      entree({
        taches: [tache(1, ALICE, 3, { close: true }), REG(2, BOB, 2, 5, 8)],
        dependances: [dep(1, 2)],
      }),
    );
    expect(activite(a, 1).debut).toBeNull();
    expect(activite(a, 1).fin).toBeNull();
    pose(a, 2, chaque([5, 6, 7, 8], 50));
    dates(a, 2, 5, 8, []);
    expect(a.dependances).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [] }]);

    const b = calculer(
      entree({
        elements: [act(3)],
        taches: [tache(1, ALICE, 3, { parentId: 3, close: true }), REG(2, BOB, 2, 5, 8)],
        dependances: [dep(3, 2)],
      }),
    );
    expect(activite(b, 3).debut).toBeNull();
    expect(activite(b, 3).fin).toBeNull();
    pose(b, 2, chaque([5, 6, 7, 8], 50));
    dates(b, 2, 5, 8, []);
    expect(b.dependances).toEqual([{ predecesseurId: 3, successeurId: 2, drapeaux: [] }]);
  });

  it('DNR-9 : FD délai 1 (début exigé 08/01) : R commence le 07/01 : drapeau ; le 08/01 : aucun', () => {
    const a = calculer(
      entree({
        taches: [tache(1, ALICE, 3), REG(2, BOB, 2, 7, 8)],
        dependances: [dep(1, 2, 'FD', 1)],
      }),
    );
    pose(a, 1, chaque([4, 5, 6], 100));
    pose(a, 2, chaque([7, 8], 100));
    dates(a, 2, 7, 8, [DNR]);
    expect(a.dependances).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [DNR] }]);

    const b = calculer(
      entree({
        taches: [tache(1, ALICE, 3), REG(2, BOB, 2, 8, 11)],
        dependances: [dep(1, 2, 'FD', 1)],
      }),
    );
    pose(b, 2, chaque([8, 11], 100));
    dates(b, 2, 8, 11, []);
    expect(b.dependances).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [] }]);
  });

  it('DNR-10 : FF délai 2 (fin exigée 08/01) : R finit le 07/01 : drapeau ; le 08/01 : aucun', () => {
    const a = calculer(
      entree({
        taches: [tache(1, ALICE, 3), REG(2, BOB, 2, 4, 7)],
        dependances: [dep(1, 2, 'FF', 2)],
      }),
    );
    pose(a, 1, chaque([4, 5, 6], 100));
    pose(a, 2, chaque([4, 5, 6, 7], 50));
    dates(a, 2, 4, 7, [DNR]);
    expect(a.dependances).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [DNR] }]);

    const b = calculer(
      entree({
        taches: [tache(1, ALICE, 3), REG(2, BOB, 2, 4, 8)],
        dependances: [dep(1, 2, 'FF', 2)],
      }),
    );
    pose(b, 2, chaque([4, 5, 6, 7, 8], 40));
    dates(b, 2, 4, 8, []);
    expect(b.dependances).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [] }]);
  });
});
