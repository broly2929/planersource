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
  projetSortie,
  tache,
  trav,
} from './helpers.js';

describe('agrégation (SPEC §5.8)', () => {
  it('AGR-1 : parent X contenant le parent Y (A Alice 2 j, B Bob 3 j) et le jalon J enfant de X en FD délai 1 depuis B : J le 07/01, Y 04 → 06/01, X 04 → 07/01', () => {
    const s = calculer(
      entree({
        elements: [
          act(1, { rang: 1 }),
          act(2, { parentId: 1, rang: 1 }),
          jal(3, { parentId: 1, rang: 2 }),
        ],
        taches: [
          tache(4, ALICE, 2, { parentId: 2, rang: 1 }),
          tache(5, BOB, 3, { parentId: 2, rang: 2 }),
        ],
        dependances: [dep(5, 3, 'FD', 1)],
      }),
    );
    expect(activite(s, 2)).toMatchObject({
      debut: J(4),
      fin: J(6),
      charge: 500,
      reel: 0,
      reste: 500,
    });
    expect(activite(s, 1)).toMatchObject({ debut: J(4), fin: J(7), charge: 500 });
    expect(jalon(s, 3).date).toBe(J(7));
  });

  it('AGR-2 : projet racine R (A Alice 2 j) et sous-projet S (C Bob 3 j) : R 04 → 06/01 charge 500 ; S 04 → 06/01 charge 300', () => {
    const s = calculer(
      entree({
        projets: [projet(1), projet(2, { parentId: 1 })],
        taches: [tache(1, ALICE, 2), tache(2, BOB, 3, { projetId: 2 })],
      }),
    );
    expect(projetSortie(s, 1)).toMatchObject({ debut: J(4), fin: J(6), charge: 500 });
    expect(projetSortie(s, 2)).toMatchObject({ debut: J(4), fin: J(6), charge: 300 });
  });

  it('AGR-3 : réel 200 + reste 300 → avancement 4000 ; réel 0 et reste 0 → null', () => {
    const a = calculer(
      entree({
        d0: J(6),
        taches: [tache(1, ALICE, 5, {}, { chargeReelle: 200, resteAFaire: 300 })],
        travailReel: [
          { assignationId: 1, jour: J(4), charge: 100 },
          { assignationId: 1, jour: J(5), charge: 100 },
        ],
      }),
    );
    expect(projetSortie(a, 1).avancement).toBe(4000);
    const b = calculer(entree({ taches: [tache(1, ALICE, 0)] }));
    expect(projetSortie(b, 1).avancement).toBeNull();
  });
});

describe('activité close (SPEC §5.1)', () => {
  it("CLOS-1 : activité close (Alice, reste 3 j) et activité ASAP Alice 1 j : rien posé pour la close, dates null, reste 0 ; l'autre le 04/01", () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 3, { close: true }), tache(2, ALICE, 1)],
      }),
    );
    expect(trav(s, 1)).toEqual({});
    expect(activite(s, 1)).toMatchObject({ debut: null, fin: null, reste: 0 });
    expect(trav(s, 2)).toEqual(at({ 4: 100 }));
  });
});
