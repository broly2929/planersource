import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { affecter, appel, creerActeur, corps } from './lot1-helpers.js';
import { url } from './lot1-t2-helpers.js';
import {
  calculer,
  creerMonde,
  datesActivite,
  empreinte,
  jours,
  tache,
  travail,
  type Monde,
} from './lot2a-helpers.js';

const D0 = '2027-01-04';
const calcul = { d0: D0 };

const ligne = (jour: string, charge: number, surcharge = false) => ({ jour, charge, surcharge });

/** FDUR-2 (Alice), FDUR-3 (Bob) et DDUR-2 (Carole) dans le même projet, une ressource par scénario. */
async function monter(ctx: Parameters<typeof creerMonde>[0]) {
  const m: Monde = await creerMonde(ctx);
  const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
  await affecter(ctx, m.projet.id, carole.id);
  const p = m.projet.id;
  const fdur2 = await tache(ctx, m.admin, p, m.alice.id, 2, { mode: 'FDUR', duree_validee: 5 });
  const fdur3 = await tache(ctx, m.admin, p, m.bob.id, 3, { mode: 'FDUR', duree_validee: 2 });
  const ddur2 = await tache(ctx, m.admin, p, carole.id, 3, { mode: 'DDUR', duree_validee: 2 });
  return { m, fdur2, fdur3, ddur2 };
}

describe('Calcul : FDUR et DDUR en base (lot 2c-I)', () => {
  const ctx = useTestApp();

  it('CALC-27 : FDUR-2, FDUR-3 et DDUR-2 persistés ; un second calcul laisse la base identique', async () => {
    const s = await monter(ctx);
    const res = await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, s.fdur2.assignation.id)).toEqual(
      jours(4, 5, 6, 7, 8).map((j) => ligne(j, 0.4)),
    );
    expect(await datesActivite(ctx, s.fdur2.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-08',
      drapeaux: [],
    });
    expect(await travail(ctx, s.fdur3.assignation.id)).toEqual(
      jours(4, 5, 6).map((j) => ligne(j, 1)),
    );
    expect(await datesActivite(ctx, s.fdur3.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-06',
      drapeaux: ['retard'],
    });
    expect(await travail(ctx, s.ddur2.assignation.id)).toEqual(
      jours(4, 5).map((j) => ligne(j, 1.5, true)),
    );
    expect(await datesActivite(ctx, s.ddur2.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-05',
      drapeaux: ['surcharge'],
    });
    const avant = await empreinte(ctx);
    expect(
      (await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul })).statusCode,
    ).toBe(200);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('CALC-28 : DDUR-3 avec travail externe d’Alice 1 j le 13/01 : surcharge le 13/01 seulement', async () => {
    const m = await creerMonde(ctx);
    await affecter(ctx, m.autre.id, m.alice.id);
    const ext = await tache(ctx, m.admin, m.autre.id, m.alice.id, 1);
    await ctx.pool.query(
      'INSERT INTO travail_planifie (assignation_id, jour, charge) VALUES ($1, $2, $3)',
      [ext.assignation.id, '2027-01-13', 1],
    );
    const d = await tache(ctx, m.admin, m.projet.id, m.alice.id, 5, {
      mode: 'DDUR',
      duree_validee: 5,
      debut_valide: '2027-01-11',
    });
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, d.assignation.id)).toEqual(
      jours(11, 12, 13, 14, 15).map((j) => ligne(j, 1, j === '2027-01-13')),
    );
    expect(await datesActivite(ctx, d.activite.id)).toEqual({
      debut_planifie: '2027-01-11',
      fin_planifiee: '2027-01-15',
      drapeaux: ['surcharge'],
    });
    expect(await travail(ctx, ext.assignation.id)).toEqual([ligne('2027-01-13', 1)]);
  });

  it('CALC-29 : durée de FDUR-3 portée de 2 à 5 puis recalcul : 0,6 j du 04 au 08/01, retard retiré', async () => {
    const s = await monter(ctx);
    await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect((await datesActivite(ctx, s.fdur3.activite.id)).drapeaux).toEqual(['retard']);
    const maj = await appel(ctx, s.m.admin).patch(url.activite(s.fdur3.activite.id), {
      duree_validee: 5,
    });
    expect(maj.statusCode).toBe(200);
    expect(corps(maj)).toMatchObject({ duree_validee: 5 });
    const res = await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, s.fdur3.assignation.id)).toEqual(
      jours(4, 5, 6, 7, 8).map((j) => ligne(j, 0.6)),
    );
    expect(await datesActivite(ctx, s.fdur3.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-08',
      drapeaux: [],
    });
  });
});
