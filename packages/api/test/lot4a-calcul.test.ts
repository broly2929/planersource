import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel } from './lot1-helpers.js';
import {
  calculer,
  creerMonde,
  datesActivite,
  etatDes,
  jours,
  tache,
  travail,
} from './lot2a-helpers.js';
import { agir, clore, idFeuille, imputer, j, S1 } from './lot4a-helpers.js';

/**
 * Lot 4a : le calcul lit le travail réel (SPEC §4 Disponibilité, §5.1, §5.4, §7 « Le travail réel
 * saisi est pris en compte au calcul suivant », D-118 (10)). Jeu de données de SPEC 5.5. Les
 * imputations sont saisies par le PUT de la feuille ; date du jour du serveur : vendredi 08/01/2027.
 */
const AUJOURDHUI = '2027-01-08';

const poses = (t: { jour: string; charge: number }[]) => t.map((x) => [x.jour, x.charge]);

async function calcul(
  ctx: TestCtx,
  qui: Parameters<typeof calculer>[1],
  projets: number[],
  d0: string,
) {
  const res = await calculer(ctx, qui, { projets, d0 });
  expect(res.statusCode, res.body).toBe(200);
}

/**
 * CALR-2 et CALR-5 : B (Alice 1 j, 1 j imputé le lundi 04/01, reste 0) et A (WBS 1, Alice 2 j, ASAP).
 */
async function reelLeJourD0(ctx: TestCtx) {
  const m = await creerMonde(ctx);
  const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 2, { nom: 'A' });
  const b = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'B' });
  await imputer(ctx, m.alice, S1, [
    { assignation_id: b.assignation.id, imputations: [{ jour: j(4), charge: 1 }] },
  ]);
  return { m, a, b };
}

describe('Calcul avec le travail réel (lot 4a)', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('CALR-1 : PROJ-14 par la feuille (D0 06/01, Alice à 50 %, A 4 j, 1 j imputé les 04 et 05/01) : 0,5 j le 06/01, 1 j le 11/01, 0,5 j le 12/01 ; dates de A du 04/01 (réel compris) au 12/01', async () => {
    const m = await creerMonde(ctx);
    await ctx.pool.query(
      'UPDATE affectation_projet SET taux = 50 WHERE projet_id = $1 AND ressource_id = $2',
      [m.projet.id, m.alice.id],
    );
    const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 4);
    await imputer(ctx, m.alice, S1, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(4), charge: 1 },
          { jour: j(5), charge: 1 },
        ],
      },
    ]);
    await calcul(ctx, m.chef, [m.projet.id], '2027-01-06');
    expect(poses(await travail(ctx, a.assignation.id))).toEqual([
      [j(6), 0.5],
      [j(11), 1],
      [j(12), 0.5],
    ]);
    expect(await datesActivite(ctx, a.activite.id)).toMatchObject({
      debut_planifie: j(4),
      fin_planifiee: j(12),
    });
  });

  it('CALR-2 : 1 j imputé le jour D0 (04/01) sur B consomme la disponibilité d’Alice : A (2 j, ASAP) posée les 05 et 06/01 ; B sans travail planifié, dates 04/01', async () => {
    const { m, a, b } = await reelLeJourD0(ctx);
    await calcul(ctx, m.chef, [m.projet.id], '2027-01-04');
    expect(poses(await travail(ctx, a.assignation.id))).toEqual([
      [j(5), 1],
      [j(6), 1],
    ]);
    expect(await travail(ctx, b.assignation.id)).toEqual([]);
    expect(await datesActivite(ctx, b.activite.id)).toMatchObject({
      debut_planifie: j(4),
      fin_planifiee: j(4),
    });
  });

  it('CALR-3 : imputation d’un projet non sélectionné (Q, 1 j le 04/01) : consommée comme travail externe ; A de P (2 j) posée les 05 et 06/01 ; Q inchangé', async () => {
    const m = await creerMonde(ctx);
    await affecter(ctx, m.autre.id, m.alice.id);
    const c = await tache(ctx, m.autreChef, m.autre.id, m.alice.id, 1);
    const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 2);
    await imputer(ctx, m.alice, S1, [
      { assignation_id: c.assignation.id, imputations: [{ jour: j(4), charge: 1 }] },
    ]);
    const avantQ = await etatDes(ctx, [m.autre.id]);
    await calcul(ctx, m.chef, [m.projet.id], '2027-01-04');
    expect(poses(await travail(ctx, a.assignation.id))).toEqual([
      [j(5), 1],
      [j(6), 1],
    ]);
    expect(await etatDes(ctx, [m.autre.id])).toEqual(avantQ);
  });

  it('CALR-4 : activité close à travail réel (1 j le 04/01, 0,5 j le 06/01), calcul D0 11/01 : aucun travail posé, dates = bornes du réel (04/01 au 06/01)', async () => {
    const m = await creerMonde(ctx);
    const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 5);
    await imputer(ctx, m.alice, S1, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(4), charge: 1 },
          { jour: j(6), charge: 0.5 },
        ],
      },
    ]);
    await clore(ctx, m.chef, a.activite.id);
    await calcul(ctx, m.chef, [m.projet.id], '2027-01-11');
    expect(await travail(ctx, a.assignation.id)).toEqual([]);
    expect(await datesActivite(ctx, a.activite.id)).toMatchObject({
      debut_planifie: j(4),
      fin_planifiee: j(6),
    });
  });

  it('CALR-5 : quel que soit le statut de la feuille : CALR-2 avec la feuille validée donne le même résultat', async () => {
    const { m, a } = await reelLeJourD0(ctx);
    const id = (await idFeuille(ctx, m.alice.id, S1))!;
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.chef, id, 'valider');
    await calcul(ctx, m.chef, [m.projet.id], '2027-01-04');
    expect(poses(await travail(ctx, a.assignation.id))).toEqual(jours(5, 6).map((d) => [d, 1]));
  });

  it('CALR-6 : le Gantt lit le réel saisi : A (4 j), 2 j imputés → charge_reelle 2, reste 2, avancement 50', async () => {
    const m = await creerMonde(ctx);
    const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 4);
    await imputer(ctx, m.alice, S1, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(4), charge: 1 },
          { jour: j(5), charge: 1 },
        ],
      },
    ]);
    const res = await appel(ctx, m.chef).get(`/api/projets/${m.projet.id}/gantt`);
    expect(res.statusCode, res.body).toBe(200);
    const e = (res.json() as { elements: { id: number }[] }).elements.find(
      (x) => x.id === a.activite.id,
    );
    expect(e).toMatchObject({ charge_reelle: 2, reste_a_faire: 2, avancement: 50 });
  });
});
