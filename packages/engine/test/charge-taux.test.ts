import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Assignation, Entree, Ressource, Sortie } from '../src/index.js';
import { activite, ALICE, at, BOB, cs, entree, J, tache, trav } from './helpers.js';

/**
 * Charge depuis le taux (SPEC §4, « Absences et charge depuis le taux (absences, D-276) », points 12 et 19,
 * cas CT-1 à CT-9). Jeu de §5.5 ; assignation REGUL d'Alice (id 1), champ vrai.
 */
const VRAI = { chargeDepuisTaux: true } as unknown as Partial<Assignation>;

type SortieCharge = { id: number; reste: number; charge?: number };
const sortieDe = (s: Sortie, id: number): SortieCharge =>
  (s.assignations as SortieCharge[]).find((a) => a.id === id)!;

function regul(
  debut: number,
  fin: number,
  jours: number,
  ass: Partial<Assignation> = {},
  over: Partial<Entree> = {},
): Entree {
  return entree({
    taches: [
      tache(
        1,
        ALICE,
        jours,
        { mode: 'REGUL', debutValide: J(debut), finValide: J(fin) },
        {
          ...VRAI,
          ...ass,
        },
      ),
    ],
    ...over,
  });
}

const ressources = (alice: Record<string, unknown> = {}): Ressource[] =>
  [
    { id: ALICE, capacite: 100, calendrierId: 1, ...alice },
    { id: BOB, capacite: 100, calendrierId: 1 },
  ] as unknown as Ressource[];

describe('charge depuis le taux (SPEC §4 D-276, CT-n)', () => {
  it('CT-1 : fenêtre 04–15/01, taux 50 %, charge d’entrée 2 j : charge 5 j, reste 5 j, 0,5 j/jour', () => {
    const s = calculer(regul(4, 15, 2, { taux: 5000 }));
    expect(sortieDe(s, 1)).toEqual({ id: 1, reste: cs(5), charge: cs(5) });
    expect(trav(s, 1)).toEqual(
      at({ 4: 50, 5: 50, 6: 50, 7: 50, 8: 50, 11: 50, 12: 50, 13: 50, 14: 50, 15: 50 }),
    );
    expect([activite(s, 1).charge, activite(s, 1).reste]).toEqual([cs(5), cs(5)]);
  });

  it('CT-2 : CT-1 et absences d’Alice le 07/01 (journée) et le matin du 12/01 : charge 4,25 j, reste 4,25 j', () => {
    const s = calculer(
      regul(
        4,
        15,
        2,
        { taux: 5000 },
        {
          ressources: ressources({
            absences: [
              { jour: J(7), portion: 'journee' },
              { jour: J(12), portion: 'matin' },
            ],
          }),
        },
      ),
    );
    expect(sortieDe(s, 1)).toEqual({ id: 1, reste: cs(4.25), charge: cs(4.25) });
  });

  it('CT-3 : D0 = 11/01, fenêtre 04–15/01, taux 100 %, réel 3 j, charge d’entrée 10 j : charge 8 j, reste 5 j', () => {
    const s = calculer(
      regul(
        4,
        15,
        10,
        { chargeReelle: cs(3), resteAFaire: cs(7) },
        {
          d0: J(11),
          travailReel: [4, 5, 6].map((n) => ({ assignationId: 1, jour: J(n), charge: 100 })),
        },
      ),
    );
    expect(sortieDe(s, 1)).toEqual({ id: 1, reste: cs(5), charge: cs(8) });
  });

  it('CT-4 : fenêtre 04–08/01, taux 100 %, 06/01 férié au calendrier d’Alice : charge 4 j', () => {
    const s = calculer(
      regul(
        4,
        8,
        1,
        {},
        {
          calendriers: [
            { id: 1, joursTravailles: [1, 2, 3, 4, 5], feries: [] },
            { id: 2, joursTravailles: [1, 2, 3, 4, 5], feries: [J(6)] },
          ],
          ressources: ressources({ calendrierId: 2 }),
        },
      ),
    );
    expect(sortieDe(s, 1).charge).toBe(cs(4));
  });

  it('CT-5 : fenêtre 04–08/01, taux 33,33 % : charge 1,66 j', () => {
    const s = calculer(regul(4, 8, 1, { taux: 3333 }));
    expect(sortieDe(s, 1).charge).toBe(cs(1.66));
  });

  it('CT-6 : D0 = 18/01, fenêtre 04–15/01, réel 2 j : charge 2 j, reste 0', () => {
    const s = calculer(
      regul(
        4,
        15,
        5,
        { chargeReelle: cs(2), resteAFaire: cs(3) },
        {
          d0: J(18),
          travailReel: [4, 5].map((n) => ({ assignationId: 1, jour: J(n), charge: 100 })),
        },
      ),
    );
    expect(sortieDe(s, 1)).toEqual({ id: 1, reste: 0, charge: cs(2) });
  });

  it('CT-7 : fenêtre 04–08/01, capacité 0,8, taux 50 % : charge 2 j', () => {
    const s = calculer(
      regul(4, 8, 1, { taux: 5000 }, { ressources: ressources({ capacite: 80 }) }),
    );
    expect(sortieDe(s, 1).charge).toBe(cs(2));
  });

  it('CT-8 : début validé 06/01, fin validée 15/01, taux 100 % : charge 8 j', () => {
    const s = calculer(regul(6, 15, 1));
    expect(sortieDe(s, 1).charge).toBe(cs(8));
  });

  it('CT-9 : champ vrai sur une ASAP et sur une REGUL close : ignoré, sortie identique, sans clé charge', () => {
    const sans = (e: Entree): Entree => ({
      ...e,
      assignations: e.assignations.map((a) => ({ ...a, chargeDepuisTaux: false })),
    });
    const asap = entree({ taches: [tache(1, ALICE, 3, {}, VRAI)] });
    const close = regul(4, 8, 2, {}, {});
    close.elements = close.elements.map((e) => ({ ...e, close: true }));
    for (const e of [asap, close]) {
      const s = calculer(e);
      expect(s).toEqual(calculer(sans(e)));
      expect(Object.keys(sortieDe(s, 1))).toEqual(['id', 'reste']);
    }
  });

  // CT-16 (D-278) : données de E2E-725.
  it('CT-16 : fenêtre 04–15/01, taux 50 %, charge d’entrée 1 j, Alice absente le 07/01 (journée) : charge 4,5 j, reste 4,5 j', () => {
    const s = calculer(
      regul(
        4,
        15,
        1,
        { taux: 5000 },
        { ressources: ressources({ absences: [{ jour: J(7), portion: 'journee' }] }) },
      ),
    );
    expect(sortieDe(s, 1)).toEqual({ id: 1, reste: cs(4.5), charge: cs(4.5) });
  });
});
