import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Entree, Projet, Ressource, Saisie, Sortie } from '../src/index.js';
import { activite, ALICE, at, BOB, entree, J, projet, tache, trav } from './helpers.js';

/**
 * Absences (SPEC §4, « Absences et charge depuis le taux (absences, D-276) », cas ABM-1 à ABM-12).
 * Jeu de §5.5 : D0 = lundi 04/01/2027, lundi à vendredi, Alice et Bob capacité 1, affectés à 100 %.
 */
type Portion = 'journee' | 'matin' | 'apres_midi';
type AbsenceJour = { jour: string; portion: Portion };

/** Ressources du jeu, avec les absences d'Alice et de Bob (jour par jour). */
function ressources(alice: AbsenceJour[] = [], bob: AbsenceJour[] = []): Ressource[] {
  return [
    { id: ALICE, capacite: 100, calendrierId: 1, absences: alice },
    { id: BOB, capacite: 100, calendrierId: 1, absences: bob },
  ] as unknown as Ressource[];
}
const abs = (n: number, portion: Portion = 'journee'): AbsenceJour => ({ jour: J(n), portion });

const P50 = (): Projet =>
  projet(1, {
    affectations: [
      { ressourceId: ALICE, taux: 5000 },
      { ressourceId: BOB, taux: 10000 },
    ],
  });

function pose(s: Sortie, assignationId: number, jours: Record<number, number>): void {
  expect(trav(s, assignationId)).toEqual(at(jours));
}

describe('absences : effet sur le moteur (SPEC §4 D-276, ABM-n)', () => {
  it('ABM-1 : Alice absente le 06/01 (journée), ASAP 3 j : 1 j les 04, 05 et 07/01', () => {
    const s = calculer(entree({ ressources: ressources([abs(6)]), taches: [tache(1, ALICE, 3)] }));
    pose(s, 1, { 4: 100, 5: 100, 7: 100 });
  });

  it('ABM-2 : Alice à 50 %, absente le 06/01, ASAP 3 j : 1 j les 04, 05 et 11/01', () => {
    const s = calculer(
      entree({ projets: [P50()], ressources: ressources([abs(6)]), taches: [tache(1, ALICE, 3)] }),
    );
    pose(s, 1, { 4: 100, 5: 100, 11: 100 });
  });

  it('ABM-3 : Alice absente le matin du 05/01, ASAP 3 j : 1 j le 04, 0,5 j le 05, 1 j le 06, 0,5 j le 07/01', () => {
    const s = calculer(
      entree({ ressources: ressources([abs(5, 'matin')]), taches: [tache(1, ALICE, 3)] }),
    );
    pose(s, 1, { 4: 100, 5: 50, 6: 100, 7: 50 });
  });

  it('ABM-4 : Alice à 50 %, absente l’après-midi du 05/01, ASAP 5 j : plafond 2,25 j la première semaine', () => {
    const s = calculer(
      entree({
        projets: [P50()],
        ressources: ressources([abs(5, 'apres_midi')]),
        taches: [tache(1, ALICE, 5)],
      }),
    );
    pose(s, 1, { 4: 100, 5: 50, 6: 75, 11: 100, 12: 100, 13: 50, 18: 25 });
  });

  it('ABM-5 : REGUL 04–08/01, Alice 4 j, absente le 06/01 : 1 j les 04, 05, 07 et 08/01, aucun drapeau', () => {
    const s = calculer(
      entree({
        ressources: ressources([abs(6)]),
        taches: [tache(1, ALICE, 4, { mode: 'REGUL', debutValide: J(4), finValide: J(8) })],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 7: 100, 8: 100 });
    const a = activite(s, 1);
    expect([a.debut, a.fin, a.drapeaux]).toEqual([J(4), J(8), []]);
  });

  it('ABM-6 : assignation à 50 %, Alice absente le matin du 05/01, ASAP 2 j : 0,5 j les 04, 06, 07 ; 0,25 j les 05 et 08/01', () => {
    const s = calculer(
      entree({
        ressources: ressources([abs(5, 'matin')]),
        taches: [tache(1, ALICE, 2, {}, { taux: 5000 })],
      }),
    );
    pose(s, 1, { 4: 50, 5: 25, 6: 50, 7: 50, 8: 25 });
  });

  it('ABM-7 : matin et après-midi du 06/01 = journée : 1 j les 04, 05 et 07/01', () => {
    const s = calculer(
      entree({
        ressources: ressources([abs(6, 'matin'), abs(6, 'apres_midi')]),
        taches: [tache(1, ALICE, 3)],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 7: 100 });
  });

  it('ABM-8 : MAN, saisie Alice 1 j le 06/01, Alice absente ce jour : posée, 1 j en surcharge, drapeau', () => {
    const saisies: Saisie[] = [
      { assignationId: 1, jour: J(6), demiJournee: 'matin', charge: 50 },
      { assignationId: 1, jour: J(6), demiJournee: 'apres_midi', charge: 50 },
    ];
    const s = calculer(
      entree({
        ressources: ressources([abs(6)]),
        taches: [tache(1, ALICE, 1, { mode: 'MAN' })],
        saisies,
      }),
    );
    expect(s.travail).toEqual([{ assignationId: 1, jour: J(6), charge: 100, surcharge: 100 }]);
    expect(activite(s, 1).drapeaux).toEqual(['surcharge']);
  });

  it('ABM-9 : DDUR durée 5, Alice 5 j, absente le 06/01 : 1,25 j les 04, 05, 07 et 08/01, dont 0,25 j en surcharge', () => {
    const s = calculer(
      entree({
        ressources: ressources([abs(6)]),
        taches: [tache(1, ALICE, 5, { mode: 'DDUR', dureeValidee: 5 })],
      }),
    );
    expect(s.travail.map((t) => [t.jour, t.charge, t.surcharge])).toEqual([
      [J(4), 125, 25],
      [J(5), 125, 25],
      [J(7), 125, 25],
      [J(8), 125, 25],
    ]);
  });

  it('ABM-10 : Bob absent le 05/01, ASAP Alice 2 j : Alice les 04 et 05/01', () => {
    const s = calculer(
      entree({ ressources: ressources([], [abs(5)]), taches: [tache(1, ALICE, 2)] }),
    );
    pose(s, 1, { 4: 100, 5: 100 });
  });

  it('ABM-11 : listes d’absences vides : sortie identique sur ASAP-1, REGUL-1 et PROJ-1', () => {
    const cas: Entree[] = [
      entree({ taches: [tache(1, ALICE, 5)] }),
      entree({
        taches: [tache(1, ALICE, 5, { mode: 'REGUL', debutValide: J(4), finValide: J(15) })],
      }),
      entree({ projets: [P50()], taches: [tache(1, ALICE, 5)] }),
    ];
    for (const e of cas) {
      expect(calculer({ ...e, ressources: ressources() })).toEqual(calculer(e));
    }
  });

  it('ABM-12 : demi-journée un samedi, Alice à 50 %, ASAP 5 j : comme PROJ-1', () => {
    const s = calculer(
      entree({
        projets: [P50()],
        ressources: ressources([abs(9, 'matin')]),
        taches: [tache(1, ALICE, 5)],
      }),
    );
    pose(s, 1, { 4: 100, 5: 100, 6: 50, 11: 100, 12: 100, 13: 50 });
  });
});
