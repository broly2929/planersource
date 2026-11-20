import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Sortie } from '../src/index.js';
import {
  act,
  activite,
  ALICE,
  ass,
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

/** Surcharge posée d'une assignation : jour → surcharge, jours sans surcharge omis. */
function surch(s: Sortie, assignationId: number): Record<string, number> {
  return Object.fromEntries(
    s.travail
      .filter((t) => t.assignationId === assignationId && t.surcharge > 0)
      .map((t) => [t.jour, t.surcharge]),
  );
}

/** Jours posés, charge et surcharge par jour d'une assignation. */
function pose(
  s: Sortie,
  assignationId: number,
  jours: Record<number, number>,
  surcharge: Record<number, number> = {},
): void {
  expect(trav(s, assignationId)).toEqual(at(jours));
  expect(surch(s, assignationId)).toEqual(at(surcharge));
}

/** Dates de début et de fin, liste exacte des drapeaux d'une activité. */
function dates(s: Sortie, id: number, debut: number, fin: number, drapeaux: string[]): void {
  const a = activite(s, id);
  expect(a.debut).toBe(J(debut));
  expect(a.fin).toBe(J(fin));
  expect(a.drapeaux).toEqual(drapeaux);
}

const FDUR = (
  id: number,
  ressource: number | null,
  jours: number,
  duree: number,
  over = {},
  a = {},
) => tache(id, ressource, jours, { mode: 'FDUR', dureeValidee: duree, ...over }, a);
const DDUR = (
  id: number,
  ressource: number | null,
  jours: number,
  duree: number,
  over = {},
  a = {},
) => tache(id, ressource, jours, { mode: 'DDUR', dureeValidee: duree, ...over }, a);

/** Alice sur le calendrier mar–sam, Bob sur lun–ven (le calendrier par défaut). */
const ALICE_MAR_SAM = {
  calendriers: [LUN_VEN, MAR_SAM],
  ressources: [
    { id: ALICE, capacite: 100, calendrierId: 2 },
    { id: BOB, capacite: 100, calendrierId: 1 },
  ],
};

/** Travail réel de 1 j par jour listé, sur l'assignation. */
const reel = (assignationId: number, jours: number[]) =>
  jours.map((j) => ({ assignationId, jour: J(j), charge: 100 }));

describe('SPEC §5.6 FDUR', () => {
  it('FDUR-1 : durée 5, aucune assignation : barre du 04 au 08/01, charge 0', () => {
    const s = calculer(entree({ taches: [FDUR(1, null, 0, 5)] }));
    pose(s, 1, {});
    dates(s, 1, 4, 8, []);
    expect(activite(s, 1).charge).toBe(0);
  });

  it('FDUR-2 : durée 5, Alice 2 j : 0,4 j/jour du 04 au 08/01', () => {
    const s = calculer(entree({ taches: [FDUR(1, ALICE, 2, 5)] }));
    pose(s, 1, { 4: 40, 5: 40, 6: 40, 7: 40, 8: 40 });
    dates(s, 1, 4, 8, []);
  });

  it('FDUR-3 : durée 2, Alice 3 j : 1 j les 04, 05 et 06/01 ; fin le 06/01, drapeau retard', () => {
    const s = calculer(entree({ taches: [FDUR(1, ALICE, 3, 2)] }));
    pose(s, 1, { 4: 100, 5: 100, 6: 100 });
    dates(s, 1, 4, 6, ['retard']);
  });

  it('FDUR-4 : durée 3, Alice 1 j : 0,33 le 04, 0,34 le 05, 0,33 le 06/01', () => {
    const s = calculer(entree({ taches: [FDUR(1, ALICE, 1, 3)] }));
    pose(s, 1, { 4: 33, 5: 34, 6: 33 });
    dates(s, 1, 4, 6, []);
  });

  it('FDUR-5 : durée 5, Alice 4 j, travail externe d’Alice 1 j le 05/01 : 0,8 le 04, 1 j les 06, 07 et 08, 0,2 le 11/01 ; retard', () => {
    const s = calculer(
      entree({
        taches: [FDUR(1, ALICE, 4, 5)],
        travailExterne: [{ ressourceId: ALICE, jour: J(5), charge: 100 }],
      }),
    );
    pose(s, 1, { 4: 80, 6: 100, 7: 100, 8: 100, 11: 20 });
    dates(s, 1, 4, 11, ['retard']);
  });

  it('FDUR-6 : durée 5, Alice assignée 5 j, réel 2 j les 04 et 05/01, reste 3 j, D0 = 06/01 : 1 j les 06, 07 et 08/01 ; dates du 04 au 08/01', () => {
    const s = calculer(
      entree({
        d0: J(6),
        taches: [FDUR(1, ALICE, 5, 5, {}, { chargeReelle: 200, resteAFaire: 300 })],
        travailReel: reel(1, [4, 5]),
      }),
    );
    pose(s, 1, { 6: 100, 7: 100, 8: 100 });
    dates(s, 1, 4, 8, []);
  });

  it('FDUR-7 : durée 2, Alice assignée 4 j, réel 1 j le 04/01, reste 3 j, D0 = 06/01 : fenêtre écoulée, ASAP les 06, 07 et 08/01 ; retard', () => {
    const s = calculer(
      entree({
        d0: J(6),
        taches: [FDUR(1, ALICE, 4, 2, {}, { chargeReelle: 100, resteAFaire: 300 })],
        travailReel: reel(1, [4]),
      }),
    );
    pose(s, 1, { 6: 100, 7: 100, 8: 100 });
    dates(s, 1, 4, 8, ['retard']);
  });

  it('FDUR-8 : prédécesseur FD (Bob 5 j) finissant le 08/01, durée 2, Alice 2 j : 1 j les 11 et 12/01', () => {
    const s = calculer(
      entree({ taches: [FDUR(1, ALICE, 2, 2), tache(2, BOB, 5)], dependances: [dep(2, 1)] }),
    );
    pose(s, 1, { 11: 100, 12: 100 });
    dates(s, 1, 11, 12, []);
  });

  it('FDUR-9 : début validé 06/01, durée 2, Alice 1 j : 0,5 j les 06 et 07/01', () => {
    const s = calculer(entree({ taches: [FDUR(1, ALICE, 1, 2, { debutValide: J(6) })] }));
    pose(s, 1, { 6: 50, 7: 50 });
    dates(s, 1, 6, 7, []);
  });

  it('FDUR-10 : FF délai 0 sur P (Bob 5 j) finissant le 08/01, durée 2, Alice 2 j : fenêtre calée, 1 j les 07 et 08/01', () => {
    const s = calculer(
      entree({
        taches: [FDUR(1, ALICE, 2, 2), tache(2, BOB, 5)],
        dependances: [dep(2, 1, 'FF')],
      }),
    );
    pose(s, 1, { 7: 100, 8: 100 });
    dates(s, 1, 7, 8, []);
  });

  it('FDUR-11 : FF sur P (Bob 1 j le 04/01), durée 3, Alice 3 j : repli, fenêtre 04–06/01, 1 j par jour', () => {
    const s = calculer(
      entree({
        taches: [FDUR(1, ALICE, 3, 3), tache(2, BOB, 1)],
        dependances: [dep(2, 1, 'FF')],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 6: 100 });
    dates(s, 1, 4, 6, []);
  });

  it('FDUR-12 : durée 2, Alice 2 j et Bob 3 j sur la même activité : reliquat par assignation, retard sur l’activité', () => {
    const s = calculer(
      entree({
        elements: [act(1, { mode: 'FDUR', dureeValidee: 2 })],
        assignations: [ass(1, 1, ALICE, 2), ass(2, 1, BOB, 3)],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100 });
    pose(s, 2, { 4: 100, 5: 100, 6: 100 });
    dates(s, 1, 4, 6, ['retard']);
  });

  it('FDUR-13 : Alice en mar–sam, durée 5, Alice 5 j : 1 j les 05, 06, 07, 08 et 09/01 ; retard', () => {
    const s = calculer(entree({ ...ALICE_MAR_SAM, taches: [FDUR(1, ALICE, 5, 5)] }));
    pose(s, 1, { 5: 100, 6: 100, 7: 100, 8: 100, 9: 100 });
    dates(s, 1, 5, 9, ['retard']);
  });

  it('FDUR-14 : activité close en FDUR : rien posé, aucun drapeau ; parent en FDUR : mode ignoré, drapeaux vides', () => {
    const close = calculer(entree({ taches: [FDUR(1, ALICE, 1, 2, { close: true })] }));
    pose(close, 1, {});
    expect(activite(close, 1)).toMatchObject({ debut: null, fin: null, drapeaux: [] });
    const parent = calculer(
      entree({
        elements: [act(1, { mode: 'FDUR', dureeValidee: 3 })],
        taches: [tache(2, ALICE, 1, { parentId: 1 })],
      }),
    );
    pose(parent, 2, { 4: 100 });
    dates(parent, 2, 4, 4, []);
    dates(parent, 1, 4, 4, []);
  });

  it('FDUR-15 : durée validée absente (défaut 1) : Alice 2 j → 1 j les 04 et 05/01, retard ; sans assignation → barre le 04/01', () => {
    const avec = calculer(entree({ taches: [tache(1, ALICE, 2, { mode: 'FDUR' })] }));
    pose(avec, 1, { 4: 100, 5: 100 });
    dates(avec, 1, 4, 5, ['retard']);
    const sans = calculer(entree({ taches: [tache(1, null, 0, { mode: 'FDUR' })] }));
    pose(sans, 1, {});
    dates(sans, 1, 4, 4, []);
  });

  it('FDUR-16 : taux 50 %, durée 2, Alice 2 j : 0,5 j les 04, 05, 06 et 07/01 ; retard', () => {
    const s = calculer(entree({ taches: [FDUR(1, ALICE, 2, 2, {}, { taux: 5000 })] }));
    pose(s, 1, { 4: 50, 5: 50, 6: 50, 7: 50 });
    dates(s, 1, 4, 7, ['retard']);
  });

  it('FDUR-17 : Alice en mar–sam, durée 1, Alice 1 j : aucun jour ouvré dans la fenêtre, 1 j le 05/01 ; retard', () => {
    const s = calculer(entree({ ...ALICE_MAR_SAM, taches: [FDUR(1, ALICE, 1, 1)] }));
    pose(s, 1, { 5: 100 });
    dates(s, 1, 5, 5, ['retard']);
  });
});

describe('SPEC §5.6 DDUR', () => {
  it('DDUR-1 : durée 5, Alice 2 j : 0,4 j/jour du 04 au 08/01, aucune surcharge', () => {
    const s = calculer(entree({ taches: [DDUR(1, ALICE, 2, 5)] }));
    pose(s, 1, { 4: 40, 5: 40, 6: 40, 7: 40, 8: 40 });
    dates(s, 1, 4, 8, []);
  });

  it('DDUR-2 : durée 2, Alice 3 j : 1,5 j les 04 et 05/01, dont 0,5 j/jour en surcharge ; fin le 05/01', () => {
    const s = calculer(entree({ taches: [DDUR(1, ALICE, 3, 2)] }));
    pose(s, 1, { 4: 150, 5: 150 }, { 4: 50, 5: 50 });
    dates(s, 1, 4, 5, ['surcharge']);
  });

  it('DDUR-3 : durée 5, début validé 11/01, Alice 5 j, travail externe d’Alice 1 j le 13/01 : 1 j/jour du 11 au 15/01 ; le 13/01 est en surcharge (1 j)', () => {
    const s = calculer(
      entree({
        taches: [DDUR(1, ALICE, 5, 5, { debutValide: J(11) })],
        travailExterne: [{ ressourceId: ALICE, jour: J(13), charge: 100 }],
      }),
    );
    pose(s, 1, { 11: 100, 12: 100, 13: 100, 14: 100, 15: 100 }, { 13: 100 });
    dates(s, 1, 11, 15, ['surcharge']);
  });

  it('DDUR-4 : durée 3, Alice 1 j : 0,33 / 0,34 / 0,33 les 04, 05 et 06/01, aucune surcharge', () => {
    const s = calculer(entree({ taches: [DDUR(1, ALICE, 1, 3)] }));
    pose(s, 1, { 4: 33, 5: 34, 6: 33 });
    dates(s, 1, 4, 6, []);
  });

  it('DDUR-5 : taux 50 %, durée 2, Alice 2 j : 1 j les 04 et 05/01, plafond d’assignation ignoré, aucune surcharge', () => {
    const s = calculer(entree({ taches: [DDUR(1, ALICE, 2, 2, {}, { taux: 5000 })] }));
    pose(s, 1, { 4: 100, 5: 100 });
    dates(s, 1, 4, 5, []);
  });

  it('DDUR-6 : DDUR WBS 1 (durée 2, Alice 3 j) puis ASAP WBS 2 (Alice 1 j) : l’ASAP le 06/01', () => {
    const s = calculer(entree({ taches: [DDUR(1, ALICE, 3, 2), tache(2, ALICE, 1)] }));
    pose(s, 1, { 4: 150, 5: 150 }, { 4: 50, 5: 50 });
    pose(s, 2, { 6: 100 });
    dates(s, 2, 6, 6, []);
  });

  it('DDUR-7 : ASAP WBS 1 (Alice 1 j) puis DDUR WBS 2 (durée 2, Alice 3 j) : surcharge 1,5 j le 04 et 0,5 j le 05/01', () => {
    const s = calculer(entree({ taches: [tache(1, ALICE, 1), DDUR(2, ALICE, 3, 2)] }));
    pose(s, 1, { 4: 100 });
    pose(s, 2, { 4: 150, 5: 150 }, { 4: 150, 5: 50 });
    dates(s, 2, 4, 5, ['surcharge']);
  });

  it('DDUR-8 : prédécesseur FD (Bob 5 j) finissant le 08/01, durée 2, Alice 3 j : 1,5 j les 11 et 12/01, surcharge 0,5 j par jour', () => {
    const s = calculer(
      entree({ taches: [DDUR(1, ALICE, 3, 2), tache(2, BOB, 5)], dependances: [dep(2, 1)] }),
    );
    pose(s, 1, { 11: 150, 12: 150 }, { 11: 50, 12: 50 });
    dates(s, 1, 11, 12, ['surcharge']);
  });

  it('DDUR-9 : Alice en mar–sam, durée 5, Alice 5 j : 1,25 j les 05, 06, 07 et 08/01, surcharge 0,25 j par jour', () => {
    const s = calculer(entree({ ...ALICE_MAR_SAM, taches: [DDUR(1, ALICE, 5, 5)] }));
    pose(s, 1, { 5: 125, 6: 125, 7: 125, 8: 125 }, { 5: 25, 6: 25, 7: 25, 8: 25 });
    dates(s, 1, 5, 8, ['surcharge']);
  });

  it('DDUR-10 : Alice affectée à partir du 06/01, durée 2, Alice 2 j : 1 j les 04 et 05/01, surcharge 1 j chacun', () => {
    const s = calculer(
      entree({
        projets: [
          projet(1, {
            affectations: [
              { ressourceId: ALICE, taux: 10000, debut: J(6) },
              { ressourceId: BOB, taux: 10000 },
            ],
          }),
        ],
        taches: [DDUR(1, ALICE, 2, 2)],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100 }, { 4: 100, 5: 100 });
    dates(s, 1, 4, 5, ['surcharge']);
  });

  it('DDUR-11 : durée 2, Alice 3 j et Bob 2 j sur la même activité : surcharge d’Alice seule, drapeau sur l’activité', () => {
    const s = calculer(
      entree({
        elements: [act(1, { mode: 'DDUR', dureeValidee: 2 })],
        assignations: [ass(1, 1, ALICE, 3), ass(2, 1, BOB, 2)],
      }),
    );
    pose(s, 1, { 4: 150, 5: 150 }, { 4: 50, 5: 50 });
    pose(s, 2, { 4: 100, 5: 100 });
    dates(s, 1, 4, 5, ['surcharge']);
  });

  it('DDUR-12 : Alice en mar–sam, durée 1, Alice 1 j : 1 j le 04/01, surcharge 1 j, drapeau surcharge, pas de retard', () => {
    const s = calculer(entree({ ...ALICE_MAR_SAM, taches: [DDUR(1, ALICE, 1, 1)] }));
    pose(s, 1, { 4: 100 }, { 4: 100 });
    dates(s, 1, 4, 4, ['surcharge']);
  });

  it('DDUR-13 : durée 5, réel 2 j les 04 et 05/01, reste 3 j, D0 = 06/01 : 1 j les 06, 07 et 08/01 ; dates du 04 au 08/01 ; aucun drapeau', () => {
    const s = calculer(
      entree({
        d0: J(6),
        taches: [DDUR(1, ALICE, 5, 5, {}, { chargeReelle: 200, resteAFaire: 300 })],
        travailReel: reel(1, [4, 5]),
      }),
    );
    pose(s, 1, { 6: 100, 7: 100, 8: 100 });
    dates(s, 1, 4, 8, []);
  });

  it('DDUR-14 : durée 2, réel 1 j le 04/01, reste 3 j, D0 = 06/01 : ASAP les 06, 07 et 08/01 ; retard ; aucune surcharge', () => {
    const s = calculer(
      entree({
        d0: J(6),
        taches: [DDUR(1, ALICE, 4, 2, {}, { chargeReelle: 100, resteAFaire: 300 })],
        travailReel: reel(1, [4]),
      }),
    );
    pose(s, 1, { 6: 100, 7: 100, 8: 100 });
    dates(s, 1, 4, 8, ['retard']);
  });

  it('DDUR-15 : durée 5, aucune assignation : barre du 04 au 08/01, charge 0', () => {
    const s = calculer(entree({ taches: [DDUR(1, null, 0, 5)] }));
    pose(s, 1, {});
    dates(s, 1, 4, 8, []);
    expect(activite(s, 1).charge).toBe(0);
  });
});
