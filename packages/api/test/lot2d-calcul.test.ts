import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { affecter, appel, creerActeur } from './lot1-helpers.js';
import { creerDependance, url, type Monde } from './lot1-t2-helpers.js';
import {
  calculer,
  creerMonde,
  datesActivite,
  empreinte,
  etatDes,
  jours,
  tache,
  travail,
} from './lot2a-helpers.js';

/**
 * Lot 2d-I : REGUL et drapeaux de dépendance persistés par POST /api/calcul (SPEC 5.3, 5.6, D-053).
 * Jeu de données de SPEC 5.5 ; une ressource distincte par scénario ; D0 = 04/01/2027.
 */
const D0 = '2027-01-04';
const calcul = { d0: D0 };
const DNR = 'dependance_non_respectee';
const DIX_JOURS = jours(4, 5, 6, 7, 8, 11, 12, 13, 14, 15);

const ligne = (jour: string, charge: number, surcharge = false) => ({ jour, charge, surcharge });
const regul = (debut: number, fin: number) => ({
  mode: 'REGUL',
  debut_valide: `2027-01-${String(debut).padStart(2, '0')}`,
  fin_valide: `2027-01-${String(fin).padStart(2, '0')}`,
});

async function drapeauxDependance(ctx: Parameters<typeof creerMonde>[0], id: number) {
  const { rows } = await ctx.pool.query<{ drapeaux: string[] }>(
    'SELECT drapeaux FROM dependance WHERE id = $1',
    [id],
  );
  return rows[0]!.drapeaux;
}

/** DNR-1 dans le projet : A (ASAP, 3 j, du 04 au 06/01) → R (REGUL 05–08/01, 2 j), FD délai 0. */
async function dnr1(
  ctx: Parameters<typeof creerMonde>[0],
  m: Monde,
  projetId: number,
  ressourceA: number,
  ressourceR: number,
) {
  const a = await tache(ctx, m.admin, projetId, ressourceA, 3);
  const r = await tache(ctx, m.admin, projetId, ressourceR, 2, regul(5, 8));
  const dependance = await creerDependance(ctx, m.admin, projetId, a.activite.id, r.activite.id);
  return { a, r, dependance };
}

/** REGUL-1, REGUL-2, REGUL-3 et DNR-1 dans le même projet. */
async function monter(ctx: Parameters<typeof creerMonde>[0]) {
  const m = await creerMonde(ctx);
  const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
  const dave = await creerActeur(ctx, 'dave@example.test', 'ressource', true);
  const eve = await creerActeur(ctx, 'eve@example.test', 'ressource', true);
  for (const r of [carole, dave, eve]) await affecter(ctx, m.projet.id, r.id);
  const p = m.projet.id;
  const regul1 = await tache(ctx, m.admin, p, m.alice.id, 5, regul(4, 15));
  const regul2 = await tache(ctx, m.admin, p, m.bob.id, 5, regul(4, 15));
  const asap2 = await tache(ctx, m.admin, p, m.bob.id, 5);
  const regul3 = await tache(ctx, m.admin, p, carole.id, 5, regul(4, 6));
  const d = await dnr1(ctx, m, p, dave.id, eve.id);
  return { m, regul1, regul2, asap2, regul3, ...d };
}

type Scene = Awaited<ReturnType<typeof monter>>;

async function verifierCalc30(ctx: Parameters<typeof creerMonde>[0], s: Scene) {
  expect(await travail(ctx, s.regul1.assignation.id)).toEqual(DIX_JOURS.map((j) => ligne(j, 0.5)));
  expect(await datesActivite(ctx, s.regul1.activite.id)).toEqual({
    debut_planifie: '2027-01-04',
    fin_planifiee: '2027-01-15',
    drapeaux: [],
  });
  expect(await travail(ctx, s.regul2.assignation.id)).toEqual(DIX_JOURS.map((j) => ligne(j, 0.5)));
  expect(await datesActivite(ctx, s.regul2.activite.id)).toEqual({
    debut_planifie: '2027-01-04',
    fin_planifiee: '2027-01-15',
    drapeaux: [],
  });
  expect(await travail(ctx, s.asap2.assignation.id)).toEqual(DIX_JOURS.map((j) => ligne(j, 0.5)));
  expect(await datesActivite(ctx, s.asap2.activite.id)).toEqual({
    debut_planifie: '2027-01-04',
    fin_planifiee: '2027-01-15',
    drapeaux: [],
  });
  expect(await travail(ctx, s.regul3.assignation.id)).toEqual(
    jours(4, 5, 6, 7, 8).map((j) => ligne(j, 1)),
  );
  expect(await datesActivite(ctx, s.regul3.activite.id)).toEqual({
    debut_planifie: '2027-01-04',
    fin_planifiee: '2027-01-08',
    drapeaux: ['retard'],
  });
  expect(await travail(ctx, s.a.assignation.id)).toEqual(jours(4, 5, 6).map((j) => ligne(j, 1)));
  expect(await datesActivite(ctx, s.a.activite.id)).toEqual({
    debut_planifie: '2027-01-04',
    fin_planifiee: '2027-01-06',
    drapeaux: [],
  });
  expect(await travail(ctx, s.r.assignation.id)).toEqual(
    jours(5, 6, 7, 8).map((j) => ligne(j, 0.5)),
  );
  expect(await datesActivite(ctx, s.r.activite.id)).toEqual({
    debut_planifie: '2027-01-05',
    fin_planifiee: '2027-01-08',
    drapeaux: [DNR],
  });
  expect(await drapeauxDependance(ctx, s.dependance.id)).toEqual([DNR]);
}

describe('Calcul : REGUL et drapeaux de dépendance en base (lot 2d-I)', () => {
  const ctx = useTestApp();

  it('CALC-30 : REGUL-1, REGUL-2, REGUL-3 et DNR-1 persistés, drapeaux de dépendance compris ; un second calcul laisse la base identique', async () => {
    const s = await monter(ctx);
    const res = await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    await verifierCalc30(ctx, s);
    const avant = await empreinte(ctx);
    expect(
      (await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul })).statusCode,
    ).toBe(200);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('CALC-31 : fin validée de REGUL-3 portée au 08/01 puis recalcul : 1 j du 04 au 08/01, retard retiré', async () => {
    const s = await monter(ctx);
    await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect((await datesActivite(ctx, s.regul3.activite.id)).drapeaux).toEqual(['retard']);
    const maj = await appel(ctx, s.m.admin).patch(url.activite(s.regul3.activite.id), {
      fin_valide: '2027-01-08',
    });
    expect(maj.statusCode).toBe(200);
    const res = await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, s.regul3.assignation.id)).toEqual(
      jours(4, 5, 6, 7, 8).map((j) => ligne(j, 1)),
    );
    expect(await datesActivite(ctx, s.regul3.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-08',
      drapeaux: [],
    });
    // DNR-1 est inchangé : son drapeau de dépendance est resté posé
    expect(await drapeauxDependance(ctx, s.dependance.id)).toEqual([DNR]);
  });

  it('CALC-32 : charge du prédécesseur de DNR-1 ramenée à 1 j puis recalcul : drapeau retiré de l’activité et de la dépendance', async () => {
    const s = await monter(ctx);
    await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect((await datesActivite(ctx, s.r.activite.id)).drapeaux).toEqual([DNR]);
    const maj = await appel(ctx, s.m.admin).patch(url.assignation(s.a.assignation.id), {
      charge_assignee: 1,
    });
    expect(maj.statusCode).toBe(200);
    const res = await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, s.a.assignation.id)).toEqual([ligne('2027-01-04', 1)]);
    expect((await datesActivite(ctx, s.r.activite.id)).drapeaux).toEqual([]);
    expect(await drapeauxDependance(ctx, s.dependance.id)).toEqual([]);
  });

  it('CALC-33 : REGUL-13 par l’API, d0 = 18/01 : 1 j par jour du 18 au 22/01, retard', async () => {
    const m = await creerMonde(ctx);
    const t = await tache(ctx, m.admin, m.projet.id, m.alice.id, 5, regul(4, 15));
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], d0: '2027-01-18' });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, t.assignation.id)).toEqual(
      jours(18, 19, 20, 21, 22).map((j) => ligne(j, 1)),
    );
    expect(await datesActivite(ctx, t.activite.id)).toEqual({
      debut_planifie: '2027-01-18',
      fin_planifiee: '2027-01-22',
      drapeaux: ['retard'],
    });
  });

  it('CALC-34 : un calcul de P seul laisse intacts l’activité et la dépendance de Q', async () => {
    const m = await creerMonde(ctx);
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    const dave = await creerActeur(ctx, 'dave@example.test', 'ressource', true);
    await affecter(ctx, m.autre.id, carole.id);
    await affecter(ctx, m.autre.id, dave.id);
    const p = await dnr1(ctx, m, m.projet.id, m.alice.id, m.bob.id);
    const q = await dnr1(ctx, m, m.autre.id, carole.id, dave.id);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id, m.autre.id], ...calcul });
    expect(res.statusCode).toBe(200);
    for (const x of [p, q]) {
      expect((await datesActivite(ctx, x.r.activite.id)).drapeaux).toEqual([DNR]);
      expect(await drapeauxDependance(ctx, x.dependance.id)).toEqual([DNR]);
    }
    for (const x of [p, q]) {
      const maj = await appel(ctx, m.admin).patch(url.assignation(x.a.assignation.id), {
        charge_assignee: 1,
      });
      expect(maj.statusCode).toBe(200);
    }
    const avantQ = await etatDes(ctx, [m.autre.id]);
    const dependancesQ = async () =>
      (
        await ctx.pool.query<{ l: string }>(
          'SELECT d::text AS l FROM dependance d WHERE projet_id = $1 ORDER BY id',
          [m.autre.id],
        )
      ).rows;
    const depAvantQ = await dependancesQ();
    const seul = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(seul.statusCode).toBe(200);
    expect((await datesActivite(ctx, p.r.activite.id)).drapeaux).toEqual([]);
    expect(await drapeauxDependance(ctx, p.dependance.id)).toEqual([]);
    expect((await datesActivite(ctx, q.r.activite.id)).drapeaux).toEqual([DNR]);
    expect(await drapeauxDependance(ctx, q.dependance.id)).toEqual([DNR]);
    expect(await etatDes(ctx, [m.autre.id])).toEqual(avantQ);
    expect(await dependancesQ()).toEqual(depAvantQ);
  });
});
