import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Calendrier, Entree, Sortie } from '../src/index.js';
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

const DNR = 'dependance_non_respectee';

/** Sortie `dependances` (lot 2d) : déclarée par le seul test tant que le type du moteur ne la porte pas. */
interface SortieDependance {
  predecesseurId: number;
  successeurId: number;
  drapeaux: string[];
}
const dependances = (s: Sortie): SortieDependance[] =>
  (s as unknown as { dependances: SortieDependance[] }).dependances;

function pose(s: Sortie, assignationId: number, jours: Record<number, number>): void {
  expect(trav(s, assignationId)).toEqual(at(jours));
}

function dates(s: Sortie, id: number, debut: number, fin: number, drapeaux: string[]): void {
  const a = activite(s, id);
  expect(a.debut).toBe(J(debut));
  expect(a.fin).toBe(J(fin));
  expect(a.drapeaux).toEqual(drapeaux);
}

/** Même charge chaque jour de la liste. */
const chaque = (jours: number[], charge: number): Record<number, number> =>
  Object.fromEntries(jours.map((j) => [j, charge]));

const REG = (
  id: number,
  ressource: number | null,
  jours: number,
  debut: number,
  fin: number,
  over = {},
  a = {},
) =>
  tache(
    id,
    ressource,
    jours,
    { mode: 'REGUL', debutValide: J(debut), finValide: J(fin), ...over },
    a,
  );

const ALICE_MAR_SAM: Partial<Entree> = {
  calendriers: [LUN_VEN, MAR_SAM],
  ressources: [
    { id: ALICE, capacite: 100, calendrierId: 2 },
    { id: BOB, capacite: 100, calendrierId: 1 },
  ],
};
const SAM_DIM: Calendrier = { id: 3, joursTravailles: [6, 7], feries: [] };
const ALICE_SAM_DIM: Partial<Entree> = {
  calendriers: [LUN_VEN, SAM_DIM],
  ressources: [
    { id: ALICE, capacite: 100, calendrierId: 3 },
    { id: BOB, capacite: 100, calendrierId: 1 },
  ],
};

const DIX_JOURS = [4, 5, 6, 7, 8, 11, 12, 13, 14, 15];
const CINQ_JOURS = [4, 5, 6, 7, 8];

describe('SPEC §5.6 REGUL : cas de la spec', () => {
  it('REGUL-1 : fenêtre 04–15/01, Alice 5 j : 0,5 j par jour sur les 10 jours ouvrés', () => {
    const s = calculer(entree({ taches: [REG(1, ALICE, 5, 4, 15)] }));
    pose(s, 1, chaque(DIX_JOURS, 50));
    dates(s, 1, 4, 15, []);
  });

  it('REGUL-2 : REGUL-1 et une activité ASAP (Alice 5 j) : l’ASAP reçoit 0,5 j par jour du 04 au 15/01', () => {
    const s = calculer(entree({ taches: [REG(1, ALICE, 5, 4, 15), tache(2, ALICE, 5)] }));
    pose(s, 1, chaque(DIX_JOURS, 50));
    pose(s, 2, chaque(DIX_JOURS, 50));
    dates(s, 2, 4, 15, []);
  });

  it('REGUL-3 : fenêtre 04–06/01, Alice 5 j : 1 j par jour du 04 au 06/01, puis 07 et 08/01 ; retard', () => {
    const s = calculer(entree({ taches: [REG(1, ALICE, 5, 4, 6)] }));
    pose(s, 1, chaque(CINQ_JOURS, 100));
    dates(s, 1, 4, 8, ['retard']);
  });

  it('REGUL-4 : D0 = 11/01, fenêtre 04–15/01, assigné 10 j, réel 3 j avant D0, reste 7 j : 1 j du 11 au 15/01, puis 18 et 19/01 ; retard', () => {
    const s = calculer(
      entree({
        d0: J(11),
        taches: [REG(1, ALICE, 10, 4, 15, {}, { chargeReelle: 300, resteAFaire: 700 })],
        travailReel: [4, 5, 6].map((j) => ({ assignationId: 1, jour: J(j), charge: 100 })),
      }),
    );
    pose(s, 1, chaque([11, 12, 13, 14, 15, 18, 19], 100));
    dates(s, 1, 4, 19, ['retard']);
  });
});

describe('SPEC §5.2 et §5.6 REGUL : passe A (D-051 Q1 à Q3, Q13)', () => {
  it('REGUL-5 : le REGUL sort de l’ordre de la passe B ; S, T puis P ; drapeau sur R et sur P → R seulement', () => {
    const s = calculer(
      entree({
        taches: [
          tache(1, ALICE, 10, { priorite: 900 }),
          REG(2, BOB, 5, 4, 8),
          tache(3, ALICE, 1, { priorite: 100 }),
          tache(4, ALICE, 5, { priorite: 500 }),
        ],
        dependances: [dep(1, 2), dep(2, 3)],
      }),
    );
    pose(s, 2, chaque(CINQ_JOURS, 100));
    pose(s, 3, { 11: 100 });
    pose(s, 4, chaque(CINQ_JOURS, 100));
    pose(s, 1, chaque([12, 13, 14, 15, 18, 19, 20, 21, 22, 25], 100));
    dates(s, 2, 4, 8, [DNR]);
    dates(s, 3, 11, 11, []);
    dates(s, 4, 4, 8, []);
    dates(s, 1, 12, 25, []);
    expect(dependances(s)).toEqual([
      { predecesseurId: 1, successeurId: 2, drapeaux: [DNR] },
      { predecesseurId: 2, successeurId: 3, drapeaux: [] },
    ]);
  });

  it('REGUL-6 : le reliquat est posé en passe A : R du 04 au 08/01 avec retard, X les 11 et 12/01', () => {
    const s = calculer(entree({ taches: [tache(1, ALICE, 2), REG(2, ALICE, 5, 4, 6)] }));
    pose(s, 2, chaque(CINQ_JOURS, 100));
    dates(s, 2, 4, 8, ['retard']);
    pose(s, 1, { 11: 100, 12: 100 });
    dates(s, 1, 11, 12, []);
  });

  it('REGUL-7 : priorité projet puis activité en passe A : R2 0,6 j ; R1 0,4 j puis 1 j les 11, 12 et 13/01 ; retard', () => {
    const s = calculer(
      entree({
        taches: [
          REG(1, ALICE, 5, 4, 8, { priorite: 500 }),
          REG(2, ALICE, 3, 4, 8, { priorite: 100 }),
        ],
      }),
    );
    pose(s, 2, chaque(CINQ_JOURS, 60));
    dates(s, 2, 4, 8, []);
    pose(s, 1, { ...chaque(CINQ_JOURS, 40), 11: 100, 12: 100, 13: 100 });
    dates(s, 1, 4, 13, ['retard']);
  });

  it('REGUL-8 : REGUL clos : rien posé, dates vides ; parent REGUL : mode ignoré, drapeaux vides', () => {
    const close = calculer(entree({ taches: [REG(1, ALICE, 2, 4, 8, { close: true })] }));
    pose(close, 1, {});
    expect(activite(close, 1)).toMatchObject({ debut: null, fin: null, drapeaux: [] });
    const parent = calculer(
      entree({
        elements: [act(3, { mode: 'REGUL', debutValide: J(4), finValide: J(8) })],
        taches: [tache(4, ALICE, 1, { parentId: 3 })],
      }),
    );
    pose(parent, 4, { 4: 100 });
    dates(parent, 4, 4, 4, []);
    dates(parent, 3, 4, 4, []);
  });

  it('REGUL-20 : un REGUL prend la capacité d’un STARR : R du 04 au 08/01, Y les 11 et 12/01, debut_non_respecte', () => {
    const s = calculer(
      entree({
        taches: [REG(1, ALICE, 5, 4, 8), tache(2, ALICE, 2, { mode: 'STARR', debutValide: J(6) })],
      }),
    );
    pose(s, 1, chaque(CINQ_JOURS, 100));
    pose(s, 2, { 11: 100, 12: 100 });
    dates(s, 1, 4, 8, []);
    dates(s, 2, 11, 12, ['debut_non_respecte']);
  });
});

describe('SPEC §5.6 REGUL : fenêtre (D-051 Q4 à Q9, Q11)', () => {
  it('REGUL-9 : projet débutant le 11/01, fenêtre 04–15/01, Alice 5 j : 1 j par jour du 11 au 15/01', () => {
    const s = calculer(
      entree({ projets: [projet(1, { debut: J(11) })], taches: [REG(1, ALICE, 5, 4, 15)] }),
    );
    pose(s, 1, chaque([11, 12, 13, 14, 15], 100));
    dates(s, 1, 11, 15, []);
  });

  it('REGUL-10 : Alice en mar–sam, fenêtre 04–15/01, 4,5 j : 0,5 j les 05, 06, 07, 08, 09, 12, 13, 14 et 15/01 ; aucun drapeau', () => {
    const s = calculer(entree({ ...ALICE_MAR_SAM, taches: [REG(1, ALICE, 4.5, 4, 15)] }));
    pose(s, 1, chaque([5, 6, 7, 8, 9, 12, 13, 14, 15], 50));
    dates(s, 1, 5, 15, []);
  });

  it('REGUL-11 : début validé le samedi 09/01, fin 15/01, Alice 5 j : 1 j par jour du 11 au 15/01', () => {
    const s = calculer(entree({ taches: [REG(1, ALICE, 5, 9, 15)] }));
    pose(s, 1, chaque([11, 12, 13, 14, 15], 100));
    dates(s, 1, 11, 15, []);
  });

  it('REGUL-12 : Alice ne travaille que samedi et dimanche, fenêtre 04–08/01, 2 j : tout en reliquat, 1 j les 09 et 10/01 ; retard', () => {
    const s = calculer(entree({ ...ALICE_SAM_DIM, taches: [REG(1, ALICE, 2, 4, 8)] }));
    pose(s, 1, { 9: 100, 10: 100 });
    dates(s, 1, 9, 10, ['retard']);
  });

  it('REGUL-13 : D0 = 18/01, fenêtre 04–15/01, Alice 5 j : fenêtre écoulée, 1 j par jour du 18 au 22/01 ; retard', () => {
    const s = calculer(entree({ d0: J(18), taches: [REG(1, ALICE, 5, 4, 15)] }));
    pose(s, 1, chaque([18, 19, 20, 21, 22], 100));
    dates(s, 1, 18, 22, ['retard']);
  });

  it('REGUL-14 : réel les 07, 08 et 11/01 après la fin validée, reste nul, D0 = 12/01 : rien posé, dates du 07 au 11/01 ; retard', () => {
    const s = calculer(
      entree({
        d0: J(12),
        taches: [REG(1, ALICE, 3, 4, 8, {}, { chargeReelle: 300, resteAFaire: 0 })],
        travailReel: [7, 8, 11].map((j) => ({ assignationId: 1, jour: J(j), charge: 100 })),
      }),
    );
    pose(s, 1, {});
    dates(s, 1, 7, 11, ['retard']);
  });

  it('REGUL-15 : fenêtre 06–08/01, D0 = 07/01, réel le 05/01, reste 2 j : 1 j les 07 et 08/01, dates du 05 au 08/01 ; aucun drapeau', () => {
    const s = calculer(
      entree({
        d0: J(7),
        taches: [REG(1, ALICE, 3, 6, 8, {}, { chargeReelle: 100, resteAFaire: 200 })],
        travailReel: [{ assignationId: 1, jour: J(5), charge: 100 }],
      }),
    );
    pose(s, 1, { 7: 100, 8: 100 });
    dates(s, 1, 5, 8, []);
  });

  it('REGUL-16 : Alice en mar–sam, fenêtre 04–09/01, 6 j : 1 j du 05 au 09/01, puis 1 j le 12/01 ; retard', () => {
    const s = calculer(entree({ ...ALICE_MAR_SAM, taches: [REG(1, ALICE, 6, 4, 9)] }));
    pose(s, 1, chaque([5, 6, 7, 8, 9, 12], 100));
    dates(s, 1, 5, 12, ['retard']);
  });

  it('REGUL-17 : sans assignation, fenêtre 06–13/01 : barre du 06 au 13/01 ; fenêtre écoulée (D0 = 18/01) : barre le 18/01, retard', () => {
    const regul = tache(1, null, 0, { mode: 'REGUL', debutValide: J(6), finValide: J(13) });
    const s = calculer(entree({ taches: [regul] }));
    dates(s, 1, 6, 13, []);
    expect(activite(s, 1).charge).toBe(0);
    const ecoulee = calculer(entree({ d0: J(18), taches: [regul] }));
    dates(ecoulee, 1, 18, 18, ['retard']);
  });

  it('REGUL-18 : Alice affectée à partir du 11/01, fenêtre 04–15/01, 5 j : 1 j par jour du 11 au 15/01 ; aucun drapeau', () => {
    const s = calculer(
      entree({
        projets: [
          projet(1, {
            affectations: [
              { ressourceId: ALICE, taux: 10000, debut: J(11) },
              { ressourceId: BOB, taux: 10000 },
            ],
          }),
        ],
        taches: [REG(1, ALICE, 5, 4, 15)],
      }),
    );
    pose(s, 1, chaque([11, 12, 13, 14, 15], 100));
    dates(s, 1, 11, 15, []);
  });

  it('REGUL-19 : taux 50 %, fenêtre 04–08/01, Alice 5 j : 0,5 j du 04 au 08/01 puis du 11 au 15/01 ; retard', () => {
    const s = calculer(entree({ taches: [REG(1, ALICE, 5, 4, 8, {}, { taux: 5000 })] }));
    pose(s, 1, chaque(DIX_JOURS, 50));
    dates(s, 1, 4, 15, ['retard']);
  });

  it('REGUL-21 : fenêtre 04–08/01, Alice mar–sam 2 j et Bob lun–ven 2,5 j : chacun sur ses jours ouvrés ; aucun drapeau', () => {
    const s = calculer(
      entree({
        ...ALICE_MAR_SAM,
        elements: [act(1, { mode: 'REGUL', debutValide: J(4), finValide: J(8) })],
        assignations: [ass(1, 1, ALICE, 2), ass(2, 1, BOB, 2.5)],
      }),
    );
    pose(s, 1, chaque([5, 6, 7, 8], 50));
    pose(s, 2, chaque(CINQ_JOURS, 50));
    dates(s, 1, 4, 8, []);
  });
});

describe('SPEC §5.3 : dependance_non_respectee (D-051 Q12)', () => {
  it('REGUL-22 : sans assignation, début validé samedi 09/01, fin validée dimanche 10/01 : barre le 11/01, retard', () => {
    const regul = tache(1, null, 0, { mode: 'REGUL', debutValide: J(9), finValide: J(10) });
    const s = calculer(entree({ taches: [regul] }));
    dates(s, 1, 11, 11, ['retard']);
    expect(activite(s, 1).charge).toBe(0);
  });

  it('DNR-1 : FD, R commence le 05/01 avant le 07/01 : drapeau sur R et sur la dépendance', () => {
    const s = calculer(
      entree({ taches: [tache(1, ALICE, 3), REG(2, BOB, 2, 5, 8)], dependances: [dep(1, 2)] }),
    );
    pose(s, 2, chaque([5, 6, 7, 8], 50));
    dates(s, 1, 4, 6, []);
    dates(s, 2, 5, 8, [DNR]);
    expect(dependances(s)).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [DNR] }]);
  });

  it('DNR-2 : FD, R commence le jour ouvré suivant la fin de A : aucun drapeau', () => {
    const s = calculer(
      entree({ taches: [tache(1, ALICE, 1), REG(2, BOB, 2, 5, 8)], dependances: [dep(1, 2)] }),
    );
    pose(s, 2, chaque([5, 6, 7, 8], 50));
    dates(s, 2, 5, 8, []);
    expect(dependances(s)).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [] }]);
  });

  it('DNR-3 : DD délai 2, R commence le 05/01 avant le 06/01 : drapeau sur R et sur la dépendance', () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 3), REG(2, BOB, 2, 5, 8)],
        dependances: [dep(1, 2, 'DD', 2)],
      }),
    );
    dates(s, 2, 5, 8, [DNR]);
    expect(dependances(s)).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [DNR] }]);
  });

  it('DNR-4 : FF délai 0 : R finit le 07/01 avant la fin de A (08/01) : drapeau ; R finit le 08/01 : aucun', () => {
    const a = calculer(
      entree({
        taches: [tache(1, ALICE, 5), REG(2, BOB, 2, 4, 7)],
        dependances: [dep(1, 2, 'FF')],
      }),
    );
    pose(a, 2, chaque([4, 5, 6, 7], 50));
    dates(a, 2, 4, 7, [DNR]);
    expect(dependances(a)).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [DNR] }]);
    const b = calculer(
      entree({
        taches: [tache(1, ALICE, 5), REG(2, BOB, 2, 4, 8)],
        dependances: [dep(1, 2, 'FF')],
      }),
    );
    pose(b, 2, chaque(CINQ_JOURS, 40));
    dates(b, 2, 4, 8, []);
    expect(dependances(b)).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [] }]);
  });

  it('DNR-5 : prédécesseur parent (dates agrégées 04–08/01) ; successeur parent (enfant REGUL contrôlé, enfant ASAP décalé)', () => {
    const pred = calculer(
      entree({
        elements: [act(1)],
        taches: [
          tache(2, ALICE, 2, { parentId: 1 }),
          tache(3, ALICE, 3, { parentId: 1 }),
          REG(4, BOB, 2, 5, 8),
        ],
        dependances: [dep(1, 4)],
      }),
    );
    dates(pred, 1, 4, 8, []);
    pose(pred, 4, chaque([5, 6, 7, 8], 50));
    dates(pred, 4, 5, 8, [DNR]);
    expect(dependances(pred)).toEqual([{ predecesseurId: 1, successeurId: 4, drapeaux: [DNR] }]);
    const succ = calculer(
      entree({
        elements: [act(1)],
        taches: [
          REG(2, BOB, 2, 5, 8, { parentId: 1 }),
          tache(3, ALICE, 1, { parentId: 1 }),
          tache(4, ALICE, 3),
        ],
        dependances: [dep(4, 1)],
      }),
    );
    pose(succ, 4, chaque([4, 5, 6], 100));
    pose(succ, 3, { 7: 100 });
    dates(succ, 3, 7, 7, []);
    pose(succ, 2, chaque([5, 6, 7, 8], 50));
    dates(succ, 2, 5, 8, [DNR]);
    expect(activite(succ, 1).drapeaux).toEqual([]);
    expect(dependances(succ)).toEqual([{ predecesseurId: 4, successeurId: 1, drapeaux: [DNR] }]);
  });

  it('DNR-6 : REGUL vers REGUL, FD : R2 commence le 06/01 avant le 11/01 : drapeau sur R2 et sur la dépendance', () => {
    const s = calculer(
      entree({ taches: [REG(1, ALICE, 5, 4, 8), REG(2, BOB, 5, 6, 12)], dependances: [dep(1, 2)] }),
    );
    pose(s, 1, chaque(CINQ_JOURS, 100));
    pose(s, 2, chaque([6, 7, 8, 11, 12], 100));
    dates(s, 1, 4, 8, []);
    dates(s, 2, 6, 12, [DNR]);
    expect(dependances(s)).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [DNR] }]);
  });

  it('DNR-7 : successeur d’un REGUL traité normalement : S les 07 et 08/01, aucun drapeau', () => {
    const s = calculer(
      entree({ taches: [REG(1, ALICE, 3, 4, 6), tache(2, BOB, 2)], dependances: [dep(1, 2)] }),
    );
    pose(s, 1, chaque([4, 5, 6], 100));
    pose(s, 2, { 7: 100, 8: 100 });
    dates(s, 1, 4, 6, []);
    dates(s, 2, 7, 8, []);
    expect(dependances(s)).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [] }]);
  });
});
