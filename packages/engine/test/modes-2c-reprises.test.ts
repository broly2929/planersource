import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Sortie } from '../src/index.js';
import { activite, ALICE, at, BOB, dep, entree, J, projet, tache, trav } from './helpers.js';

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

function dates(s: Sortie, id: number, debut: number, fin: number, drapeaux: string[]): void {
  const a = activite(s, id);
  expect(a.debut).toBe(J(debut));
  expect(a.fin).toBe(J(fin));
  expect(a.drapeaux).toEqual(drapeaux);
}

const FDUR = (id: number, jours: number, duree: number, over = {}, a = {}) =>
  tache(id, ALICE, jours, { mode: 'FDUR', dureeValidee: duree, ...over }, a);
const DDUR = (id: number, jours: number, duree: number, over = {}, a = {}) =>
  tache(id, ALICE, jours, { mode: 'DDUR', dureeValidee: duree, ...over }, a);

const reel04 = [{ assignationId: 1, jour: J(4), charge: 100 }];
const AVEC = { chargeReelle: 100, resteAFaire: 400 };

describe('SPEC §5.6 : cibles bornées par le début au plus tôt (2c-R, D-050)', () => {
  it('FDUR-18 : réel le 04/01, prédécesseur FD finissant le 06/01 : cibles les 07 et 08/01 seulement', () => {
    const s = calculer(
      entree({
        d0: J(6),
        taches: [FDUR(1, 5, 5, {}, AVEC), tache(2, BOB, 1)],
        dependances: [dep(2, 1)],
        travailReel: reel04,
      }),
    );
    pose(s, 1, { 7: 100, 8: 100, 11: 100, 12: 100 });
    dates(s, 1, 4, 12, ['retard']);
  });

  it('FDUR-19 : réel le 04/01, début validé 08/01 : 1 j les 08, 11, 12 et 13/01', () => {
    const s = calculer(
      entree({
        d0: J(6),
        taches: [FDUR(1, 5, 5, { debutValide: J(8) }, AVEC)],
        travailReel: reel04,
      }),
    );
    pose(s, 1, { 8: 100, 11: 100, 12: 100, 13: 100 });
    dates(s, 1, 4, 13, ['retard']);
  });

  it('DDUR-16 : données de FDUR-18 en DDUR : 2 j les 07 et 08/01, surcharge 1 j par jour', () => {
    const s = calculer(
      entree({
        d0: J(6),
        taches: [DDUR(1, 5, 5, {}, AVEC), tache(2, BOB, 1)],
        dependances: [dep(2, 1)],
        travailReel: reel04,
      }),
    );
    pose(s, 1, { 7: 200, 8: 200 }, { 7: 100, 8: 100 });
    dates(s, 1, 4, 8, ['surcharge']);
  });
});

describe('SPEC §5.6 : fenêtre vide et reste non posé (2d-0, D-051)', () => {
  // réel le 04/01, D0 = 05/01, prédécesseur FD (Bob 2 j, 05 et 06/01) : début au plus tôt le 07/01,
  // fenêtre 04–05/01 : aucun jour de fenêtre ne reçoit de cible
  const vide = (mode: 'FDUR' | 'DDUR') =>
    entree({
      d0: J(5),
      taches: [
        tache(1, ALICE, 3, { mode, dureeValidee: 2 }, { chargeReelle: 100, resteAFaire: 200 }),
        tache(2, BOB, 2),
      ],
      dependances: [dep(2, 1)],
      travailReel: reel04,
    });

  it('FDUR-20 : fenêtre vide : Alice 1 j les 07 et 08/01 ; dates du 04 au 08/01 ; retard', () => {
    const s = calculer(vide('FDUR'));
    pose(s, 1, { 7: 100, 8: 100 });
    dates(s, 1, 4, 8, ['retard']);
  });

  it('DDUR-17 : données de FDUR-20 : Alice 1 j les 07 et 08/01, aucune surcharge ; retard', () => {
    const s = calculer(vide('DDUR'));
    pose(s, 1, { 7: 100, 8: 100 });
    dates(s, 1, 4, 8, ['retard']);
  });

  it('FDUR-21 : durée 2, Alice non affectée : rien posé, avertissement reste_non_pose, barre du 04 au 05/01, aucun drapeau', () => {
    const s = calculer(
      entree({
        projets: [projet(1, { affectations: [{ ressourceId: BOB, taux: 10000 }] })],
        taches: [FDUR(1, 2, 2)],
      }),
    );
    pose(s, 1, {});
    dates(s, 1, 4, 5, []);
    expect(s.avertissements).toEqual([{ code: 'reste_non_pose', assignationId: 1, reste: 200 }]);
  });
});
