import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Sortie } from '../src/index.js';
import { act, activite, ALICE, ass, at, BOB, dep, entree, J, tache, trav } from './helpers.js';

interface Attendu {
  jours: Record<number, number>;
  debut: number | null;
  fin: number | null;
  drapeaux: string[];
}

/** Jours posés, charges par jour, dates de début et de fin, liste exacte des drapeaux. */
function verifie(s: Sortie, id: number, a: Attendu): void {
  expect(trav(s, id)).toEqual(at(a.jours));
  const act = activite(s, id);
  expect(act.debut).toBe(a.debut === null ? null : J(a.debut));
  expect(act.fin).toBe(a.fin === null ? null : J(a.fin));
  expect(act.drapeaux).toEqual(a.drapeaux);
}

const START = (id: number, jours: number, debut: number, over = {}) =>
  tache(id, ALICE, jours, { mode: 'START', debutValide: J(debut), ...over });
const STARR = (id: number, jours: number, debut: number, over = {}) =>
  tache(id, ALICE, jours, { mode: 'STARR', debutValide: J(debut), ...over });
const ALAP = (id: number, jours: number, fin: number | null, over = {}, a = {}) =>
  tache(
    id,
    ALICE,
    jours,
    { mode: 'ALAP', ...(fin === null ? {} : { finValide: J(fin) }), ...over },
    a,
  );
const ALICE_LE_06 = [{ ressourceId: ALICE, jour: J(6), charge: 100 }];

describe('SPEC §5.6 START', () => {
  it('START-1 : début validé mer 06/01, Alice 2 j : 06 et 07/01', () => {
    const s = calculer(entree({ taches: [START(1, 2, 6)] }));
    verifie(s, 1, { jours: { 6: 100, 7: 100 }, debut: 6, fin: 7, drapeaux: [] });
  });

  it('START-2 : début validé 06/01, Alice 2 j, prédécesseur FD finissant le ven 08/01 : 11 et 12/01', () => {
    const s = calculer(
      entree({ taches: [START(1, 2, 6), tache(2, BOB, 5)], dependances: [dep(2, 1)] }),
    );
    verifie(s, 2, {
      jours: { 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 },
      debut: 4,
      fin: 8,
      drapeaux: [],
    });
    verifie(s, 1, { jours: { 11: 100, 12: 100 }, debut: 11, fin: 12, drapeaux: [] });
  });

  it('START-3 : début validé sam 09/01, Alice 1 j : 11/01', () => {
    const s = calculer(entree({ taches: [START(1, 1, 9)] }));
    verifie(s, 1, { jours: { 11: 100 }, debut: 11, fin: 11, drapeaux: [] });
  });

  it('START-4 : barre sans assignation : début validé 06/01 → barre le 06/01 ; sam 09/01 → 11/01 ; charge 0', () => {
    const a = calculer(
      entree({ taches: [tache(1, null, 0, { mode: 'START', debutValide: J(6) })] }),
    );
    verifie(a, 1, { jours: {}, debut: 6, fin: 6, drapeaux: [] });
    expect(activite(a, 1).charge).toBe(0);
    const b = calculer(
      entree({ taches: [tache(1, null, 0, { mode: 'START', debutValide: J(9) })] }),
    );
    verifie(b, 1, { jours: {}, debut: 11, fin: 11, drapeaux: [] });
  });

  it('START-5 : travail réel avant le début validé : les dates débutent au réel', () => {
    const s = calculer(
      entree({
        taches: [
          tache(
            1,
            ALICE,
            2,
            { mode: 'START', debutValide: J(6) },
            { chargeReelle: 100, resteAFaire: 100 },
          ),
        ],
        travailReel: [{ assignationId: 1, jour: J(4), charge: 100 }],
      }),
    );
    verifie(s, 1, { jours: { 6: 100 }, debut: 4, fin: 6, drapeaux: [] });
  });

  it('START-6 : D0 = 11/01, début validé 06/01 : pose dès le 11/01', () => {
    const s = calculer(entree({ d0: J(11), taches: [START(1, 1, 6)] }));
    verifie(s, 1, { jours: { 11: 100 }, debut: 11, fin: 11, drapeaux: [] });
  });

  it('START-7 : enfant d’un parent successeur FD : la contrainte héritée repousse le début', () => {
    const s = calculer(
      entree({
        elements: [act(3, { rang: 3 })],
        taches: [START(1, 2, 6, { parentId: 3, rang: 1 }), tache(2, BOB, 5)],
        dependances: [dep(2, 3)],
      }),
    );
    verifie(s, 1, { jours: { 11: 100, 12: 100 }, debut: 11, fin: 12, drapeaux: [] });
    expect(activite(s, 3)).toMatchObject({ debut: J(11), fin: J(12), drapeaux: [] });
  });
});

describe('SPEC §5.6 STARR', () => {
  const x = () => tache(1, ALICE, 5);

  it('STARR-1 : X ASAP WBS 1 Alice 5 j ; Y STARR WBS 2 début validé 06/01 Alice 2 j : Y les 06 et 07/01 ; X les 04, 05, 08, 11 et 12/01', () => {
    const s = calculer(entree({ taches: [x(), STARR(2, 2, 6)] }));
    verifie(s, 2, { jours: { 6: 100, 7: 100 }, debut: 6, fin: 7, drapeaux: [] });
    verifie(s, 1, {
      jours: { 4: 100, 5: 100, 8: 100, 11: 100, 12: 100 },
      debut: 4,
      fin: 12,
      drapeaux: [],
    });
  });

  it('STARR-2 : comme STARR-1 mais Y en mode START : X du 04 au 08/01 ; Y les 11 et 12/01', () => {
    const s = calculer(entree({ taches: [x(), START(2, 2, 6)] }));
    verifie(s, 1, {
      jours: { 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 },
      debut: 4,
      fin: 8,
      drapeaux: [],
    });
    verifie(s, 2, { jours: { 11: 100, 12: 100 }, debut: 11, fin: 12, drapeaux: [] });
  });

  it('STARR-3 : Y STARR début validé 06/01 Alice 2 j, travail externe d’Alice 1 j le 06/01 : Y les 07 et 08/01, drapeau debut_non_respecte', () => {
    const s = calculer(entree({ taches: [STARR(1, 2, 6)], travailExterne: ALICE_LE_06 }));
    verifie(s, 1, {
      jours: { 7: 100, 8: 100 },
      debut: 7,
      fin: 8,
      drapeaux: ['debut_non_respecte'],
    });
  });

  it('STARR-4 : STARR avec FD finissant le 08/01 : 11 et 12/01, drapeau debut_non_respecte, pas de dependance_non_respectee', () => {
    const s = calculer(
      entree({ taches: [STARR(1, 2, 6), tache(2, BOB, 5)], dependances: [dep(2, 1)] }),
    );
    verifie(s, 1, {
      jours: { 11: 100, 12: 100 },
      debut: 11,
      fin: 12,
      drapeaux: ['debut_non_respecte'],
    });
  });

  it('STARR-5 : deux STARR (validés 05 et 06/01, Alice 2 j chacun) : 05 et 06/01, puis 07 et 08/01 avec drapeau', () => {
    const s = calculer(entree({ taches: [STARR(1, 2, 6), STARR(2, 2, 5)] }));
    verifie(s, 2, { jours: { 5: 100, 6: 100 }, debut: 5, fin: 6, drapeaux: [] });
    verifie(s, 1, {
      jours: { 7: 100, 8: 100 },
      debut: 7,
      fin: 8,
      drapeaux: ['debut_non_respecte'],
    });
  });

  it('STARR-6 : STARR-1 : aucun drapeau sur Y ni sur X', () => {
    const s = calculer(entree({ taches: [x(), STARR(2, 2, 6)] }));
    expect(activite(s, 1).drapeaux).toEqual([]);
    expect(activite(s, 2).drapeaux).toEqual([]);
  });

  it('STARR-7 : STARR sans assignation, début validé 06/01 : barre le 06/01, aucun drapeau', () => {
    const s = calculer(
      entree({ taches: [tache(1, null, 0, { mode: 'STARR', debutValide: J(6) })] }),
    );
    verifie(s, 1, { jours: {}, debut: 6, fin: 6, drapeaux: [] });
  });

  it('STARR-8 : D0 = 11/01, début validé 06/01 : pose dès le 11/01, drapeau debut_non_respecte', () => {
    const s = calculer(entree({ d0: J(11), taches: [STARR(1, 2, 6)] }));
    verifie(s, 1, {
      jours: { 11: 100, 12: 100 },
      debut: 11,
      fin: 12,
      drapeaux: ['debut_non_respecte'],
    });
  });
});

describe('SPEC §5.6 ALAP', () => {
  const P = () => tache(2, BOB, 5);

  it('ALAP-1 : fin validée ven 15/01, Alice 3 j : 13, 14 et 15/01', () => {
    const s = calculer(entree({ taches: [ALAP(1, 3, 15)] }));
    verifie(s, 1, { jours: { 13: 100, 14: 100, 15: 100 }, debut: 13, fin: 15, drapeaux: [] });
  });

  it('ALAP-2 : fin validée 15/01, Alice 3 j, taux 50 % : 0,5 j/jour les 08, 11, 12, 13, 14 et 15/01', () => {
    const s = calculer(entree({ taches: [ALAP(1, 3, 15, {}, { taux: 5000 })] }));
    verifie(s, 1, {
      jours: { 8: 50, 11: 50, 12: 50, 13: 50, 14: 50, 15: 50 },
      debut: 8,
      fin: 15,
      drapeaux: [],
    });
  });

  it('ALAP-3 : fin validée mer 06/01, Alice 5 j : repli ASAP du 04 au 08/01, drapeau retard', () => {
    const s = calculer(entree({ taches: [ALAP(1, 5, 6)] }));
    verifie(s, 1, {
      jours: { 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 },
      debut: 4,
      fin: 8,
      drapeaux: ['retard'],
    });
  });

  it('ALAP-4 : pas de fin validée, Alice 2 j : 04 et 05/01', () => {
    const s = calculer(entree({ taches: [ALAP(1, 2, null)] }));
    verifie(s, 1, { jours: { 4: 100, 5: 100 }, debut: 4, fin: 5, drapeaux: [] });
  });

  it('ALAP-5 : FD finissant le 08/01, fin validée 15/01, Alice 3 j : 13, 14 et 15/01', () => {
    const s = calculer(entree({ taches: [ALAP(1, 3, 15), P()], dependances: [dep(2, 1)] }));
    verifie(s, 1, { jours: { 13: 100, 14: 100, 15: 100 }, debut: 13, fin: 15, drapeaux: [] });
  });

  it('ALAP-6 : ALAP-5 avec fin validée 12/01 : repli ASAP 11, 12 et 13/01, drapeau retard', () => {
    const s = calculer(entree({ taches: [ALAP(1, 3, 12), P()], dependances: [dep(2, 1)] }));
    verifie(s, 1, {
      jours: { 11: 100, 12: 100, 13: 100 },
      debut: 11,
      fin: 13,
      drapeaux: ['retard'],
    });
  });

  it('ALAP-7 : FF délai 0 sur P finissant le 08/01, fin validée 15/01, Alice 2 j : 07 et 08/01, sans retard', () => {
    const s = calculer(
      entree({ taches: [ALAP(1, 2, 15), P()], dependances: [dep(2, 1, 'FF', 0)] }),
    );
    verifie(s, 1, { jours: { 7: 100, 8: 100 }, debut: 7, fin: 8, drapeaux: [] });
  });

  it('ALAP-8 : même FF, fin validée 06/01 : 07 et 08/01, drapeau retard', () => {
    const s = calculer(entree({ taches: [ALAP(1, 2, 6), P()], dependances: [dep(2, 1, 'FF', 0)] }));
    verifie(s, 1, { jours: { 7: 100, 8: 100 }, debut: 7, fin: 8, drapeaux: ['retard'] });
  });

  it('ALAP-9 : sans assignation, durée 3, fin validée 15/01 : barre du 13 au 15/01', () => {
    const s = calculer(
      entree({ taches: [tache(1, null, 0, { mode: 'ALAP', finValide: J(15), dureeValidee: 3 })] }),
    );
    verifie(s, 1, { jours: {}, debut: 13, fin: 15, drapeaux: [] });
  });

  it('ALAP-10 : sans assignation, durée 5, fin validée 06/01 : barre du 04 au 08/01, drapeau retard', () => {
    const s = calculer(
      entree({ taches: [tache(1, null, 0, { mode: 'ALAP', finValide: J(6), dureeValidee: 5 })] }),
    );
    verifie(s, 1, { jours: {}, debut: 4, fin: 8, drapeaux: ['retard'] });
  });

  it('ALAP-11 : ALAP WBS 1 (fin validée 08/01, Alice 3 j), ASAP WBS 2 (Alice 5 j) : ALAP les 06, 07 et 08/01 ; ASAP les 04, 05, 11, 12 et 13/01', () => {
    const s = calculer(entree({ taches: [ALAP(1, 3, 8), tache(2, ALICE, 5)] }));
    verifie(s, 1, { jours: { 6: 100, 7: 100, 8: 100 }, debut: 6, fin: 8, drapeaux: [] });
    verifie(s, 2, {
      jours: { 4: 100, 5: 100, 11: 100, 12: 100, 13: 100 },
      debut: 4,
      fin: 13,
      drapeaux: [],
    });
  });

  it('ALAP-12 : D0 = 11/01, 1 j réel le 04/01, reste 2 j, fin validée 15/01 : posé les 14 et 15/01 ; dates du 04 au 15/01', () => {
    const s = calculer(
      entree({
        d0: J(11),
        taches: [ALAP(1, 3, 15, {}, { chargeReelle: 100, resteAFaire: 200 })],
        travailReel: [{ assignationId: 1, jour: J(4), charge: 100 }],
      }),
    );
    verifie(s, 1, { jours: { 14: 100, 15: 100 }, debut: 4, fin: 15, drapeaux: [] });
  });
});

describe('Compléments (D-047 Q5, Q6, Q8)', () => {
  it('STARR-9 : STARR, début validé sam 09/01, Alice 1 j : 11/01, drapeau debut_non_respecte', () => {
    const s = calculer(entree({ taches: [STARR(1, 1, 9)] }));
    verifie(s, 1, { jours: { 11: 100 }, debut: 11, fin: 11, drapeaux: ['debut_non_respecte'] });
  });

  it('ALAP-13 : ALAP, fin validée 15/01, début validé 14/01, Alice 3 j : 13, 14 et 15/01, aucun drapeau', () => {
    const s = calculer(entree({ taches: [ALAP(1, 3, 15, { debutValide: J(14) })] }));
    verifie(s, 1, { jours: { 13: 100, 14: 100, 15: 100 }, debut: 13, fin: 15, drapeaux: [] });
  });

  it('ALAP-14 : ALAP, fin validée 08/01, Alice 2 j et Bob 2 j, travail externe d’Alice les 05 à 08/01 : repli global, Alice 04 et 11/01, Bob 04 et 05/01, drapeau retard', () => {
    const s = calculer(
      entree({
        taches: [ALAP(1, 2, 8)],
        assignations: [ass(2, 1, BOB, 2)],
        travailExterne: [5, 6, 7, 8].map((j) => ({ ressourceId: ALICE, jour: J(j), charge: 100 })),
      }),
    );
    expect(trav(s, 1)).toEqual(at({ 4: 100, 11: 100 }));
    expect(trav(s, 2)).toEqual(at({ 4: 100, 5: 100 }));
    expect(activite(s, 1)).toMatchObject({ debut: J(4), fin: J(11), drapeaux: ['retard'] });
  });

  it('ALAP-15 : ALAP, fin validée sam 16/01, Alice 3 j : 13, 14 et 15/01, aucun drapeau', () => {
    const s = calculer(entree({ taches: [ALAP(1, 3, 16)] }));
    verifie(s, 1, { jours: { 13: 100, 14: 100, 15: 100 }, debut: 13, fin: 15, drapeaux: [] });
  });
});

describe('Drapeaux et parents (SPEC §5.6, §5.9)', () => {
  it('DRAP-1 : enfant STARR en retard sous un parent : drapeau sur l’enfant, drapeaux vides sur le parent', () => {
    const s = calculer(
      entree({
        elements: [act(3, { rang: 3 })],
        taches: [STARR(1, 2, 6, { parentId: 3, rang: 1 })],
        travailExterne: ALICE_LE_06,
      }),
    );
    verifie(s, 1, {
      jours: { 7: 100, 8: 100 },
      debut: 7,
      fin: 8,
      drapeaux: ['debut_non_respecte'],
    });
    expect(activite(s, 3)).toMatchObject({ debut: J(7), fin: J(8), drapeaux: [] });
  });

  it('DRAP-2 : parent START sans début validé, parent ALAP avec fin validée : ignorés, aucune erreur', () => {
    const s = calculer(
      entree({
        elements: [
          act(3, { rang: 3, mode: 'START' }),
          act(4, { rang: 4, mode: 'ALAP', finValide: J(5) }),
        ],
        taches: [
          tache(1, ALICE, 1, { parentId: 3, rang: 1 }),
          tache(2, ALICE, 3, { parentId: 4, rang: 1 }),
        ],
      }),
    );
    verifie(s, 1, { jours: { 4: 100 }, debut: 4, fin: 4, drapeaux: [] });
    verifie(s, 2, { jours: { 5: 100, 6: 100, 7: 100 }, debut: 5, fin: 7, drapeaux: [] });
    expect(activite(s, 3)).toMatchObject({ debut: J(4), fin: J(4), drapeaux: [] });
    expect(activite(s, 4)).toMatchObject({ debut: J(5), fin: J(7), drapeaux: [] });
  });

  it('DRAP-3 : ASAP avec fin validée dépassée : pas de retard', () => {
    const s = calculer(entree({ taches: [tache(1, ALICE, 5, { finValide: J(5) })] }));
    verifie(s, 1, {
      jours: { 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 },
      debut: 4,
      fin: 8,
      drapeaux: [],
    });
  });

  it('DRAP-4 : activité close en START : rien posé, dates null, aucun drapeau', () => {
    const s = calculer(entree({ taches: [START(1, 2, 6, { close: true })] }));
    verifie(s, 1, { jours: {}, debut: null, fin: null, drapeaux: [] });
  });
});
