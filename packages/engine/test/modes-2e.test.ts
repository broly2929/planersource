import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Saisie, Sortie } from '../src/index.js';
import {
  activite,
  ALICE,
  ass,
  assignationsSortie,
  at,
  BOB,
  dep,
  entree,
  J,
  projet,
  resteAssignation,
  tache,
  trav,
} from './helpers.js';

const DNR = 'dependance_non_respectee';

/** Saisie d'une demi-journée (0,5 j) de janvier 2027. */
const demi = (assignationId: number, jour: number, d: Saisie['demiJournee']): Saisie => ({
  assignationId,
  jour: J(jour),
  demiJournee: d,
  charge: 50,
});

/** Journée entière : matin et après-midi. */
const journee = (assignationId: number, jour: number): Saisie[] => [
  demi(assignationId, jour, 'matin'),
  demi(assignationId, jour, 'apres_midi'),
];

const MAN = (id: number, ressource: number, jours = 1, over = {}, a = {}) =>
  tache(id, ressource, jours, { mode: 'MAN', ...over }, a);

function pose(s: Sortie, assignationId: number, jours: Record<number, number>): void {
  expect(trav(s, assignationId)).toEqual(at(jours));
}

/** Surcharge posée d'une assignation : jour → surcharge. */
function surcharge(s: Sortie, assignationId: number, jours: Record<number, number>): void {
  expect(
    Object.fromEntries(
      s.travail.filter((t) => t.assignationId === assignationId).map((t) => [t.jour, t.surcharge]),
    ),
  ).toEqual(at(jours));
}

function dates(s: Sortie, id: number, debut: number, fin: number, drapeaux: string[]): void {
  const a = activite(s, id);
  expect(a.debut).toBe(J(debut));
  expect(a.fin).toBe(J(fin));
  expect(a.drapeaux).toEqual(drapeaux);
}

function sansDates(s: Sortie, id: number): void {
  const a = activite(s, id);
  expect(a.debut).toBeNull();
  expect(a.fin).toBeNull();
  expect(a.drapeaux).toEqual([]);
}

describe('SPEC §5.6 : MAN, cas de la spec', () => {
  it('MAN-1 : saisies Alice matin et après-midi du 05/01 sur M ; ASAP Alice 2 j : ASAP les 04 et 06/01', () => {
    const s = calculer(
      entree({ taches: [MAN(1, ALICE), tache(2, ALICE, 2)], saisies: journee(1, 5) }),
    );
    pose(s, 1, { 5: 100 });
    pose(s, 2, { 4: 100, 6: 100 });
  });

  it('MAN-2 : Alice 1 j le 05/01 sur deux activités MAN : les deux conservées, 1 j en surcharge (sur la seconde dans l’ordre WBS)', () => {
    const s = calculer(
      entree({
        taches: [MAN(1, ALICE), MAN(2, ALICE)],
        saisies: [...journee(1, 5), ...journee(2, 5)],
      }),
    );
    pose(s, 1, { 5: 100 });
    pose(s, 2, { 5: 100 });
    surcharge(s, 1, { 5: 0 });
    surcharge(s, 2, { 5: 100 });
    dates(s, 1, 5, 5, []);
    dates(s, 2, 5, 5, ['surcharge']);
  });

  it('MAN-3 : recalcul lancé deux fois : saisies inchangées, résultat identique', () => {
    const e = entree({
      taches: [MAN(1, ALICE), tache(2, ALICE, 2)],
      saisies: [...journee(1, 5), demi(1, 6, 'matin')],
    });
    const copie = structuredClone(e);
    const s1 = calculer(e);
    const s2 = calculer(e);
    expect(s2).toEqual(s1);
    expect(e.saisies).toEqual(copie.saisies);
    pose(s1, 1, { 5: 100, 6: 50 });
  });
});

describe('SPEC §5.6 : MAN, précisions du lot 2e (D-056)', () => {
  it('MAN-4 : D0 = 11/01, saisies le 05 et le 12/01 : posé le 12/01 seul, reste 1 j, dates du 05 au 12/01 ; ASAP les 11 et 13/01', () => {
    const s = calculer(
      entree({
        d0: J(11),
        taches: [MAN(1, ALICE, 2), tache(2, ALICE, 2)],
        saisies: [...journee(1, 5), ...journee(1, 12)],
      }),
    );
    pose(s, 1, { 12: 100 });
    expect(activite(s, 1).reste).toBe(100);
    expect(resteAssignation(s, 1)).toBe(100);
    dates(s, 1, 5, 12, []);
    pose(s, 2, { 11: 100, 13: 100 });
  });

  it('MAN-5 : saisie le samedi 09/01 : posée, 1 j en surcharge, drapeau surcharge, dates du 09 au 09/01', () => {
    const s = calculer(entree({ taches: [MAN(1, ALICE)], saisies: journee(1, 9) }));
    pose(s, 1, { 9: 100 });
    surcharge(s, 1, { 9: 100 });
    dates(s, 1, 9, 9, ['surcharge']);
  });

  it('MAN-6 : Alice affectée à partir du 11/01, saisie le 05/01 matin : 0,5 j en surcharge, drapeau surcharge', () => {
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
        taches: [MAN(1, ALICE)],
        saisies: [demi(1, 5, 'matin')],
      }),
    );
    pose(s, 1, { 5: 50 });
    surcharge(s, 1, { 5: 50 });
    dates(s, 1, 5, 5, ['surcharge']);
  });

  it('MAN-7 : saisie le 05/01 matin ; ASAP Alice 2 j : 1 j le 04, 0,5 j le 05, 0,5 j le 06/01 ; aucune surcharge', () => {
    const s = calculer(
      entree({ taches: [MAN(1, ALICE), tache(2, ALICE, 2)], saisies: [demi(1, 5, 'matin')] }),
    );
    pose(s, 1, { 5: 50 });
    pose(s, 2, { 4: 100, 5: 50, 6: 50 });
    expect(s.travail.every((t) => t.surcharge === 0)).toBe(true);
  });

  it('MAN-8 : assignation à 50 %, saisie 1 j le 05/01 : posée, aucune surcharge', () => {
    const s = calculer(
      entree({ taches: [MAN(1, ALICE, 1, {}, { taux: 5000 })], saisies: journee(1, 5) }),
    );
    pose(s, 1, { 5: 100 });
    surcharge(s, 1, { 5: 0 });
    dates(s, 1, 5, 5, []);
  });

  it('MAN-9 : M1 (priorité 500) et M2 (priorité 100), 1 j le 05/01 chacune : M2 sans surcharge ; M1 1 j en surcharge', () => {
    const s = calculer(
      entree({
        taches: [MAN(1, ALICE, 1, { priorite: 500 }), MAN(2, ALICE, 1, { priorite: 100 })],
        saisies: [...journee(1, 5), ...journee(2, 5)],
      }),
    );
    surcharge(s, 2, { 5: 0 });
    surcharge(s, 1, { 5: 100 });
    dates(s, 2, 5, 5, []);
    dates(s, 1, 5, 5, ['surcharge']);
  });

  it('MAN-10 : sans saisie, fin validée le 01/01 : rien posé, dates vides, aucun drapeau, reste 0 ; prédécesseur FD : dépendance à drapeaux vides', () => {
    const seul = calculer(entree({ taches: [MAN(1, ALICE, 2, { finValide: J(1) })] }));
    pose(seul, 1, {});
    sansDates(seul, 1);
    expect(activite(seul, 1).reste).toBe(0);
    expect(resteAssignation(seul, 1)).toBe(0);

    const avecPred = calculer(
      entree({
        taches: [MAN(1, ALICE, 2, { finValide: J(1) }), tache(2, BOB, 3)],
        dependances: [dep(2, 1)],
      }),
    );
    pose(avecPred, 1, {});
    sansDates(avecPred, 1);
    expect(activite(avecPred, 1).reste).toBe(0);
    expect(resteAssignation(avecPred, 1)).toBe(0);
    expect(avecPred.dependances).toEqual([{ predecesseurId: 2, successeurId: 1, drapeaux: [] }]);
  });

  it('MAN-11 : A (Alice 3 j, 04–06/01) → M (MAN, Bob), FD : saisie le 05/01 : drapeau sur M et la dépendance ; le 07/01 : aucun', () => {
    const a = calculer(
      entree({
        taches: [tache(1, ALICE, 3), MAN(2, BOB)],
        dependances: [dep(1, 2)],
        saisies: journee(2, 5),
      }),
    );
    pose(a, 2, { 5: 100 });
    dates(a, 2, 5, 5, [DNR]);
    dates(a, 1, 4, 6, []);
    expect(a.dependances).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [DNR] }]);

    const b = calculer(
      entree({
        taches: [tache(1, ALICE, 3), MAN(2, BOB)],
        dependances: [dep(1, 2)],
        saisies: journee(2, 7),
      }),
    );
    pose(b, 2, { 7: 100 });
    dates(b, 2, 7, 7, []);
    expect(b.dependances).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [] }]);
  });

  it('MAN-12 : M (saisie Alice 1 j le 06/01) → S (ASAP, Bob 1 j), FD : S le 07/01', () => {
    const s = calculer(
      entree({
        taches: [MAN(1, ALICE), tache(2, BOB, 1)],
        dependances: [dep(1, 2)],
        saisies: journee(1, 6),
      }),
    );
    pose(s, 1, { 6: 100 });
    pose(s, 2, { 7: 100 });
    dates(s, 2, 7, 7, []);
    expect(s.dependances).toEqual([{ predecesseurId: 1, successeurId: 2, drapeaux: [] }]);
  });

  it('MAN-13 : M (Alice 1 j le 04/01) et R (REGUL 04–08/01, Alice 4 j) : R 1 j du 05 au 08/01, aucun drapeau', () => {
    const s = calculer(
      entree({
        taches: [
          MAN(1, ALICE),
          tache(2, ALICE, 4, { mode: 'REGUL', debutValide: J(4), finValide: J(8) }),
        ],
        saisies: journee(1, 4),
      }),
    );
    pose(s, 1, { 4: 100 });
    pose(s, 2, { 5: 100, 6: 100, 7: 100, 8: 100 });
    dates(s, 2, 5, 8, []);
  });

  it('MAN-14 : M close, saisie le 04/01 ; ASAP Alice 1 j : rien posé pour M, dates vides ; ASAP le 04/01', () => {
    const s = calculer(
      entree({
        taches: [MAN(1, ALICE, 1, { close: true }), tache(2, ALICE, 1)],
        saisies: journee(1, 4),
      }),
    );
    pose(s, 1, {});
    sansDates(s, 1);
    pose(s, 2, { 4: 100 });
  });

  it('MAN-15 : STARR-3 avec une vraie saisie (Alice 1 j le 06/01 sur une activité MAN) : Y les 07 et 08/01, drapeau debut_non_respecte', () => {
    const s = calculer(
      entree({
        taches: [tache(1, ALICE, 2, { mode: 'STARR', debutValide: J(6) }), MAN(2, ALICE)],
        saisies: journee(2, 6),
      }),
    );
    pose(s, 1, { 7: 100, 8: 100 });
    expect(activite(s, 1).drapeaux).toEqual(['debut_non_respecte']);
  });

  it('MAN-16 : DDUR-3 avec une vraie saisie (Alice 1 j le 13/01 sur une activité MAN) : 1 j par jour du 11 au 15/01, le 13/01 en surcharge (1 j)', () => {
    const s = calculer(
      entree({
        taches: [
          tache(1, ALICE, 5, { mode: 'DDUR', dureeValidee: 5, debutValide: J(11) }),
          MAN(2, ALICE),
        ],
        saisies: journee(2, 13),
      }),
    );
    pose(s, 1, { 11: 100, 12: 100, 13: 100, 14: 100, 15: 100 });
    surcharge(s, 1, { 11: 0, 12: 0, 13: 100, 14: 0, 15: 0 });
  });

  it('MAN-17 : M avec deux assignations, Alice 1 j le 05/01, Bob le 06/01 matin : reste Alice 1 j, Bob 0,5 j, activité 1,5 j ; dates du 05 au 06/01', () => {
    const s = calculer(
      entree({
        taches: [MAN(1, ALICE, 1)],
        assignations: [ass(2, 1, BOB, 1)],
        saisies: [...journee(1, 5), demi(2, 6, 'matin')],
      }),
    );
    pose(s, 1, { 5: 100 });
    pose(s, 2, { 6: 50 });
    expect(resteAssignation(s, 1)).toBe(100);
    expect(resteAssignation(s, 2)).toBe(50);
    expect(activite(s, 1).reste).toBe(150);
    dates(s, 1, 5, 6, []);
  });

  it('SAS-1 : sortie assignations : une entrée par assignation, triée par id ; ASAP : reste d’entrée ; close : 0 ; MAN : saisies à partir de D0', () => {
    const s = calculer(
      entree({
        taches: [MAN(3, ALICE, 4), tache(1, ALICE, 2), tache(2, BOB, 1, { close: true })],
        saisies: [demi(3, 5, 'matin')],
      }),
    );
    expect(assignationsSortie(s)).toEqual([
      { id: 1, reste: 200 },
      { id: 2, reste: 0 },
      { id: 3, reste: 50 },
    ]);
  });
});
