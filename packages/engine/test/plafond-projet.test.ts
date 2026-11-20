import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Calendrier, Projet, Saisie, Sortie } from '../src/index.js';
import { activite, ALICE, at, BOB, entree, J, LUN_VEN, projet, tache, trav } from './helpers.js';

/** Plafond de projet (SPEC §4, 5.7, D-062). Alice affectée à 50 % au projet P sauf mention (SPEC 5.7). */
const P50 = (id = 1, over: Partial<Projet> = {}): Projet =>
  projet(id, {
    affectations: [
      { ressourceId: ALICE, taux: 5000 },
      { ressourceId: BOB, taux: 10000 },
    ],
    ...over,
  });

function pose(s: Sortie, assignationId: number, jours: Record<number, number>): void {
  expect(trav(s, assignationId)).toEqual(at(jours));
}

function surchargeNulle(s: Sortie, assignationId: number): void {
  for (const t of s.travail.filter((x) => x.assignationId === assignationId)) {
    expect(t.surcharge).toBe(0);
  }
}

function dates(s: Sortie, id: number, debut: number, fin: number, drapeaux?: string[]): void {
  const a = activite(s, id);
  expect(a.debut).toBe(J(debut));
  expect(a.fin).toBe(J(fin));
  if (drapeaux) expect(a.drapeaux).toEqual(drapeaux);
}

const demi = (assignationId: number, jour: number, d: Saisie['demiJournee']): Saisie => ({
  assignationId,
  jour: J(jour),
  demiJournee: d,
  charge: 50,
});
const journee = (assignationId: number, jour: number): Saisie[] => [
  demi(assignationId, jour, 'matin'),
  demi(assignationId, jour, 'apres_midi'),
];

describe('plafond de projet (SPEC §4, 5.7, D-062)', () => {
  it('PROJ-1 : Alice à 50 %, ASAP Alice 5 j : 1 j les 04 et 05/01, 0,5 j le 06/01, 1 j les 11 et 12/01, 0,5 j le 13/01', () => {
    const s = calculer(entree({ projets: [P50()], taches: [tache(1, ALICE, 5)] }));
    pose(s, 1, { 4: 100, 5: 100, 6: 50, 11: 100, 12: 100, 13: 50 });
  });

  it('PROJ-2 : A puis B (WBS 1 et 2), ASAP Alice 2 j chacune : A les 04 et 05/01 ; B 0,5 j le 06/01, 1 j le 11/01, 0,5 j le 12/01', () => {
    const s = calculer(
      entree({ projets: [P50()], taches: [tache(1, ALICE, 2), tache(2, ALICE, 2)] }),
    );
    pose(s, 1, { 4: 100, 5: 100 });
    pose(s, 2, { 6: 50, 11: 100, 12: 50 });
  });

  it('PROJ-3 : P à 50 % (A, Alice 3 j) et Q priorité 600, Alice à 100 % (B, Alice 3 j) : A 1 j les 04 et 05/01, 0,5 j les 06 et 11/01 ; B 0,5 j le 06/01, 1 j les 07 et 08/01, 0,5 j le 11/01', () => {
    const s = calculer(
      entree({
        projets: [P50(1), projet(2, { priorite: 600 })],
        taches: [tache(1, ALICE, 3, { projetId: 1 }), tache(2, ALICE, 3, { projetId: 2 })],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 6: 50, 11: 50 });
    pose(s, 2, { 6: 50, 7: 100, 8: 100, 11: 50 });
  });

  it('PROJ-4 : P à 50 % (A, Alice 1 j), sous-projet P1 à 100 % (C, Alice 3 j, priorité d’activité 600) : A le 04/01 ; C 1 j le 05/01, 0,5 j le 06/01, 1 j le 11/01, 0,5 j le 12/01', () => {
    const s = calculer(
      entree({
        projets: [P50(1), projet(2, { parentId: 1 })],
        taches: [
          tache(1, ALICE, 1, { projetId: 1 }),
          tache(2, ALICE, 3, { projetId: 2, priorite: 600 }),
        ],
      }),
    );
    pose(s, 1, { 4: 100 });
    pose(s, 2, { 5: 100, 6: 50, 11: 100, 12: 50 });
  });

  it('PROJ-5 : mercredi 06/01 férié au calendrier d’Alice, ASAP Alice 3 j : 1 j les 04, 05 et 11/01', () => {
    const ferie: Calendrier = { id: 2, joursTravailles: [1, 2, 3, 4, 5], feries: [J(6)] };
    const s = calculer(
      entree({
        calendriers: [LUN_VEN, ferie],
        ressources: [
          { id: ALICE, capacite: 100, calendrierId: 2 },
          { id: BOB, capacite: 100, calendrierId: 1 },
        ],
        projets: [P50()],
        taches: [tache(1, ALICE, 3)],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 11: 100 });
  });

  it('PROJ-6 : Y (WBS 1) DDUR durée 3, début validé 04/01, Alice 3 j ; B (WBS 2) ASAP Alice 1 j : Y 1 j par jour du 04 au 06/01, aucun drapeau ; B le 11/01', () => {
    const s = calculer(
      entree({
        projets: [P50()],
        taches: [
          tache(1, ALICE, 3, { mode: 'DDUR', dureeValidee: 3, debutValide: J(4) }),
          tache(2, ALICE, 1),
        ],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 6: 100 });
    surchargeNulle(s, 1);
    expect(activite(s, 1).drapeaux).toEqual([]);
    pose(s, 2, { 11: 100 });
  });

  it('PROJ-7 : M MAN, saisies Alice 1 j les 04, 05 et 06/01 ; B ASAP Alice 1 j : M posé, aucune surcharge ; B le 11/01', () => {
    const s = calculer(
      entree({
        projets: [P50()],
        taches: [tache(1, ALICE, 3, { mode: 'MAN' }), tache(2, ALICE, 1)],
        saisies: [4, 5, 6].flatMap((j) => journee(1, j)),
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 6: 100 });
    surchargeNulle(s, 1);
    expect(activite(s, 1).drapeaux).toEqual([]);
    pose(s, 2, { 11: 100 });
  });

  it('PROJ-8 : ALAP fin validée 15/01, Alice 3 j : 0,5 j le 08/01, 0,5 j le 13/01, 1 j les 14 et 15/01', () => {
    const s = calculer(
      entree({
        projets: [P50()],
        taches: [tache(1, ALICE, 3, { mode: 'ALAP', finValide: J(15) })],
      }),
    );
    pose(s, 1, { 8: 50, 13: 50, 14: 100, 15: 100 });
  });

  it('PROJ-9 : seul le sous-projet P1 est dans l’entrée (parent absent), Alice à 100 % : C ASAP Alice 3 j : du 04 au 06/01', () => {
    const s = calculer(
      entree({
        projets: [projet(10, { parentId: 99 })],
        taches: [tache(1, ALICE, 3, { projetId: 10 })],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 6: 100 });
    dates(s, 1, 4, 6);
  });

  it('PROJ-10 : assignation à 60 %, ASAP Alice 4 j : 0,6 j par jour du 04 au 07/01, 0,1 j le 08/01, 0,6 j les 11 et 12/01, 0,3 j le 13/01', () => {
    const s = calculer(
      entree({ projets: [P50()], taches: [tache(1, ALICE, 4, {}, { taux: 6000 })] }),
    );
    pose(s, 1, { 4: 60, 5: 60, 6: 60, 7: 60, 8: 10, 11: 60, 12: 60, 13: 30 });
  });

  it('PROJ-11 : D0 = mercredi 06/01, ASAP Alice 3 j : 1 j les 06 et 07/01, 0,5 j le 08/01, 0,5 j le 11/01', () => {
    const s = calculer(entree({ d0: J(6), projets: [P50()], taches: [tache(1, ALICE, 3)] }));
    pose(s, 1, { 6: 100, 7: 100, 8: 50, 11: 50 });
  });

  it('PROJ-12 : FDUR durée 5, début validé 04/01, Alice 4 j : 0,8 j les 04, 05 et 06/01, 0,1 j le 07/01, reliquat 1 j le 11/01 et 0,5 j le 12/01 ; fin le 12/01, retard', () => {
    const s = calculer(
      entree({
        projets: [P50()],
        taches: [tache(1, ALICE, 4, { mode: 'FDUR', dureeValidee: 5, debutValide: J(4) })],
      }),
    );
    pose(s, 1, { 4: 80, 5: 80, 6: 80, 7: 10, 11: 100, 12: 50 });
    dates(s, 1, 4, 12, ['retard']);
  });

  it('PROJ-13 : REGUL fenêtre 04–08/01, Alice 3 j : 0,6 j du 04 au 07/01, 0,1 j le 08/01, reliquat 0,5 j le 11/01 ; fin le 11/01, retard', () => {
    const s = calculer(
      entree({
        projets: [P50()],
        taches: [tache(1, ALICE, 3, { mode: 'REGUL', debutValide: J(4), finValide: J(8) })],
      }),
    );
    pose(s, 1, { 4: 60, 5: 60, 6: 60, 7: 60, 8: 10, 11: 50 });
    dates(s, 1, 4, 11, ['retard']);
  });

  it('PROJ-14 : D0 = mercredi 06/01, A : Alice assigné 4 j, réel 1 j le 04/01 et 1 j le 05/01, reste 2 j : 0,5 j le 06/01, 1 j le 11/01, 0,5 j le 12/01', () => {
    const s = calculer(
      entree({
        d0: J(6),
        projets: [P50()],
        taches: [tache(1, ALICE, 4, {}, { chargeReelle: 200, resteAFaire: 200 })],
        travailReel: [
          { assignationId: 1, jour: J(4), charge: 100 },
          { assignationId: 1, jour: J(5), charge: 100 },
        ],
      }),
    );
    pose(s, 1, { 6: 50, 11: 100, 12: 50 });
  });
});
