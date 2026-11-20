import { describe, expect, it } from 'vitest';
import { horizonDe } from '../src/planning/calcul.js';
import { useTestApp } from './helpers.js';
import { affecter, appel, corps, creerProjet } from './lot1-helpers.js';
import { creerActivite, creerDependance, creerJalon } from './lot1-t2-helpers.js';
import {
  calculer,
  creerMonde,
  datesActivite,
  datesProjet,
  empreinte,
  etatDes,
  jours,
  tache,
  travail,
} from './lot2a-helpers.js';

const D0 = '2027-01-04';
const calcul = { d0: D0 };

/** Un refus : statut attendu et empreinte de la base identique. */
async function refus(
  ctx: Parameters<typeof empreinte>[0],
  envoi: () => Promise<{ statusCode: number }>,
  statut: number,
): Promise<void> {
  const avant = await empreinte(ctx);
  expect((await envoi()).statusCode).toBe(statut);
  expect(await empreinte(ctx)).toEqual(avant);
}

describe('Calcul : POST /api/calcul (lot 2a-I, D-044)', () => {
  const ctx = useTestApp();

  it('CALC-1 : ASAP-1 en base, Alice 5 j, calcul par l’administrateur → travail, dates de l’activité et du projet', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await tache(ctx, m.admin, m.projet.id, m.alice.id, 5);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(corps(res)).toMatchObject({ d0: D0, projets: [m.projet.id], lignes: 5 });
    expect(await travail(ctx, assignation.id)).toEqual(
      jours(4, 5, 6, 7, 8).map((jour) => ({ jour, charge: 1, surcharge: false })),
    );
    expect(await datesActivite(ctx, activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-08',
      drapeaux: [],
    });
    expect(await datesProjet(ctx, m.projet.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-08',
    });
  });

  it('CALC-2 : le chef de P calcule P avec un sous-projet S (même chef) : S est calculé', async () => {
    const m = await creerMonde(ctx);
    const s = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    await affecter(ctx, s.id, m.alice.id);
    const { assignation } = await tache(ctx, m.admin, s.id, m.alice.id, 2);
    const res = await calculer(ctx, m.chef, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect((corps(res).projets as number[]).slice().sort()).toEqual([m.projet.id, s.id].sort());
    expect(await travail(ctx, assignation.id)).toHaveLength(2);
  });

  it('CALC-3 : Chef B calcule P de Chef A (illisible pour lui) → 404, base inchangée', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await refus(ctx, () => calculer(ctx, m.autreChef, { projets: [m.projet.id], ...calcul }), 404);
    // témoin : la route existe, le chef de P calcule P
    expect((await calculer(ctx, m.chef, { projets: [m.projet.id], ...calcul })).statusCode).toBe(
      200,
    );
  });

  it('CALC-4 : Alice (rôle ressource) → 403, base inchangée', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await refus(ctx, () => calculer(ctx, m.alice, { projets: [m.projet.id], ...calcul }), 403);
  });

  it('CALC-5 : sans session → 401, base inchangée', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await refus(ctx, () => calculer(ctx, undefined, { projets: [m.projet.id], ...calcul }), 401);
  });

  it.each([
    ['{}', {}],
    ['projets vide', { projets: [] }],
    ['projets non tableau', { projets: '1' }],
    ['projets non entier', { projets: [1.5] }],
    ['projets à 0', { projets: [0] }],
    ['d0 mal formé', { projets: [1], d0: '2027-13-40' }],
    ['clé inconnue', { projets: [1], x: 1 }],
  ])('CALC-6 : corps invalide (%s) → 400, base inchangée', async (_nom, corpsInvalide) => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await refus(ctx, () => calculer(ctx, m.admin, corpsInvalide), 400);
  });

  it('CALC-7 : deux calculs consécutifs donnent le même état, sans doublon', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 5);
    await tache(ctx, m.admin, m.projet.id, m.bob.id, 3);
    const corpsCalcul = { projets: [m.projet.id], ...calcul };
    expect((await calculer(ctx, m.admin, corpsCalcul)).statusCode).toBe(200);
    const premier = await etatDes(ctx, [m.projet.id]);
    expect(premier.travail).toHaveLength(8);
    expect((await calculer(ctx, m.admin, corpsCalcul)).statusCode).toBe(200);
    expect(await etatDes(ctx, [m.projet.id])).toEqual(premier);
  });

  it('CALC-8 : le travail de P2 (non sélectionné) est consommé et inchangé ; Alice 2 j de P1 posés les 07 et 08/01', async () => {
    const m = await creerMonde(ctx);
    await affecter(ctx, m.autre.id, m.alice.id);
    const p2 = await tache(ctx, m.admin, m.autre.id, m.alice.id, 3);
    expect((await calculer(ctx, m.admin, { projets: [m.autre.id], ...calcul })).statusCode).toBe(
      200,
    );
    expect(await travail(ctx, p2.assignation.id)).toHaveLength(3);
    const avant = await etatDes(ctx, [m.autre.id]);
    const p1 = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const res = await calculer(ctx, m.chef, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect((await travail(ctx, p1.assignation.id)).map((t) => t.jour)).toEqual(jours(7, 8));
    expect((await travail(ctx, p2.assignation.id)).map((t) => t.jour)).toEqual(jours(4, 5, 6));
    expect(await etatDes(ctx, [m.autre.id])).toEqual(avant);
  });

  it('CALC-9-r3 : activité MAN assignée dans P, sans saisie → 200 ; aucun travail, dates et drapeaux vides', async () => {
    const m = await creerMonde(ctx);
    const { activite, assignation } = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2, {
      mode: 'MAN',
    });
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, assignation.id)).toEqual([]);
    expect(await datesActivite(ctx, activite.id)).toEqual({
      debut_planifie: null,
      fin_planifiee: null,
      drapeaux: [],
    });
  });

  it('CALC-10 : après un calcul, la table historique est identique à l’avant', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 5);
    const lire = async () =>
      (await ctx.pool.query('SELECT h::text FROM historique h ORDER BY id')).rows;
    const avant = await lire();
    expect(avant.length).toBeGreaterThan(0);
    expect((await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul })).statusCode).toBe(
      200,
    );
    expect(await lire()).toEqual(avant);
  });

  it('CALC-11 : parent X (A1 Alice 2 j, A2 Bob 3 j) et jalon fixe J validé 05/01 en FD depuis X : X 04 → 06/01, J le 05/01 en retard, projet 04 → 06/01', async () => {
    const m = await creerMonde(ctx);
    const x = await creerActivite(ctx, m.admin, m.projet.id);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2, { parent_id: x.id });
    await tache(ctx, m.admin, m.projet.id, m.bob.id, 3, { parent_id: x.id });
    const j = await creerJalon(ctx, m.admin, m.projet.id, {
      type: 'fixe',
      date_validee: '2027-01-05',
    });
    await creerDependance(ctx, m.admin, m.projet.id, x.id, j.id, { type: 'FD' });
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await datesActivite(ctx, x.id)).toMatchObject({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-06',
    });
    const { rows } = await ctx.pool.query(
      'SELECT date_planifiee, drapeaux FROM jalon WHERE id = $1',
      [j.id],
    );
    expect(rows[0]).toEqual({ date_planifiee: '2027-01-05', drapeaux: ['retard'] });
    expect(await datesProjet(ctx, m.projet.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-06',
    });
  });

  it('CALC-12 : échec de l’UPDATE de projet (trigger de test) → 500, la purge est annulée, base inchangée', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    expect((await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul })).statusCode).toBe(
      200,
    );
    await ctx.pool.query(
      `CREATE FUNCTION test_echec() RETURNS trigger AS $$
       BEGIN RAISE EXCEPTION 'échec de test'; END; $$ LANGUAGE plpgsql`,
    );
    await ctx.pool.query(
      `CREATE TRIGGER test_echec BEFORE UPDATE ON projet
         FOR EACH ROW EXECUTE FUNCTION test_echec()`,
    );
    await refus(ctx, () => calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul }), 500);
  });

  it('CALC-13 : deux calculs simultanés sur deux projets, ressource commune : somme par jour ≤ 1,00, 10 jours posés', async () => {
    const m = await creerMonde(ctx);
    await affecter(ctx, m.autre.id, m.alice.id);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 5);
    await tache(ctx, m.admin, m.autre.id, m.alice.id, 5);
    const reponses = await Promise.all([
      calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul }),
      calculer(ctx, m.admin, { projets: [m.autre.id], ...calcul }),
    ]);
    expect(reponses.map((r) => r.statusCode)).toEqual([200, 200]);
    const { rows } = await ctx.pool.query<{ jour: string; somme: number }>(
      `SELECT t.jour::text AS jour, sum(t.charge) AS somme FROM travail_planifie t
        JOIN assignation s ON s.id = t.assignation_id WHERE s.ressource_id = $1
        GROUP BY t.jour ORDER BY t.jour`,
      [m.alice.id],
    );
    expect(rows.every((r) => r.somme <= 1)).toBe(true);
    expect(rows.reduce((total, r) => total + r.somme, 0)).toBe(10);
    expect(rows).toHaveLength(10);
  });

  it('CALC-14 : Chef B affecté comme ressource à P de Chef A (lecture seule) → 403, base inchangée', async () => {
    const m = await creerMonde(ctx);
    await ctx.pool.query('UPDATE utilisateur SET est_ressource = true WHERE id = $1', [
      m.autreChef.id,
    ]);
    await affecter(ctx, m.projet.id, m.autreChef.id);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await refus(ctx, () => calculer(ctx, m.autreChef, { projets: [m.projet.id], ...calcul }), 403);
  });

  it('CALC-16 : projet clos ignoré (motif clos), son travail est conservé et consommé ; un sous-projet clos n’est pas calculé', async () => {
    const m = await creerMonde(ctx);
    await affecter(ctx, m.autre.id, m.alice.id);
    const p2 = await tache(ctx, m.admin, m.autre.id, m.alice.id, 3);
    expect((await calculer(ctx, m.admin, { projets: [m.autre.id], ...calcul })).statusCode).toBe(
      200,
    );
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [m.autre.id]);
    const sousClos = await creerProjet(ctx, m.admin, {
      chef_id: m.chef.id,
      parent_id: m.projet.id,
    });
    await affecter(ctx, sousClos.id, m.alice.id);
    const s = await tache(ctx, m.admin, sousClos.id, m.alice.id, 1);
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [sousClos.id]);
    const p1 = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const avant = await etatDes(ctx, [m.autre.id]);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id, m.autre.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(corps(res).ignores).toEqual([{ id: m.autre.id, motif: 'clos' }]);
    expect(corps(res).projets).toEqual([m.projet.id]);
    expect(await etatDes(ctx, [m.autre.id])).toEqual(avant);
    expect((await travail(ctx, p2.assignation.id)).map((t) => t.jour)).toEqual(jours(4, 5, 6));
    expect((await travail(ctx, p1.assignation.id)).map((t) => t.jour)).toEqual(jours(7, 8));
    expect(await travail(ctx, s.assignation.id)).toEqual([]);
  });

  it('CALC-17 : Alice affectée à P du 06 au 08/01, activité 5 j : 3 lignes, avertissement reste_non_pose (reste 2), non persisté', async () => {
    const m = await creerMonde(ctx);
    await ctx.pool.query(
      `UPDATE affectation_projet SET date_debut = '2027-01-06', date_fin = '2027-01-08'
        WHERE projet_id = $1 AND ressource_id = $2`,
      [m.projet.id, m.alice.id],
    );
    const { assignation } = await tache(ctx, m.admin, m.projet.id, m.alice.id, 5);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect((await travail(ctx, assignation.id)).map((t) => t.jour)).toEqual(jours(6, 7, 8));
    expect(corps(res).avertissements).toEqual([
      { code: 'reste_non_pose', assignation_id: assignation.id, reste: 2 },
    ]);
    expect(JSON.stringify(await empreinte(ctx))).not.toContain('reste_non_pose');
  });

  it('CALC-18 : sélection du sous-projet S (parent R hors sélection) et de T → 200, R et ses données intacts', async () => {
    const m = await creerMonde(ctx);
    await affecter(ctx, m.autre.id, m.bob.id);
    const r = await creerProjet(ctx, m.admin, { chef_id: m.chef.id });
    await affecter(ctx, r.id, m.alice.id);
    await tache(ctx, m.admin, r.id, m.alice.id, 2);
    const s = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: r.id });
    await affecter(ctx, s.id, m.alice.id);
    await tache(ctx, m.admin, s.id, m.alice.id, 1);
    await tache(ctx, m.admin, m.autre.id, m.bob.id, 1);
    const avant = await etatDes(ctx, [r.id]);
    const res = await calculer(ctx, m.admin, { projets: [s.id, m.autre.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect((corps(res).projets as number[]).slice().sort()).toEqual([s.id, m.autre.id].sort());
    expect(await etatDes(ctx, [r.id])).toEqual(avant);
  });

  it('CALC-19 : REMP-2 en base (capacité 1,5, taux 33,33, charge 1) : 0,49, 0,49, 0,02 les 04, 05, 06/01', async () => {
    const m = await creerMonde(ctx);
    await ctx.pool.query('UPDATE utilisateur SET capacite = 1.5 WHERE id = $1', [m.alice.id]);
    const { assignation } = await tache(
      ctx,
      m.admin,
      m.projet.id,
      m.alice.id,
      1,
      {},
      { taux: 33.33 },
    );
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, assignation.id)).toEqual([
      { jour: '2027-01-04', charge: 0.49, surcharge: false },
      { jour: '2027-01-05', charge: 0.49, surcharge: false },
      { jour: '2027-01-06', charge: 0.02, surcharge: false },
    ]);
  });

  it('CALC-20 : projet inconnu dans la sélection → 404, base inchangée', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await refus(
      ctx,
      () => calculer(ctx, m.admin, { projets: [m.projet.id, 999999], ...calcul }),
      404,
    );
    // témoin : la route existe, la sélection sans le projet inconnu est calculée
    expect((await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul })).statusCode).toBe(
      200,
    );
  });

  it('MOD-1 : modèle M dans la sélection avec P → 200, M ignoré (motif modele), aucun travail pour M, M inchangé', async () => {
    const m = await creerMonde(ctx);
    const res0 = await appel(ctx, m.admin).post('/api/modeles', {
      code: 'MODELE-1',
      nom: 'Modèle 1',
      date_debut: '2027-01-04',
    });
    expect(res0.statusCode).toBe(201);
    const modele = corps(res0) as { id: number };
    await affecter(ctx, modele.id, m.alice.id);
    const tm = await tache(ctx, m.admin, modele.id, m.alice.id, 3);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const avant = await etatDes(ctx, [modele.id]);
    const res = await calculer(ctx, m.admin, { projets: [modele.id, m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(corps(res).ignores).toEqual([{ id: modele.id, motif: 'modele' }]);
    expect(corps(res).projets).toEqual([m.projet.id]);
    expect(await travail(ctx, tm.assignation.id)).toEqual([]);
    expect(await etatDes(ctx, [modele.id])).toEqual(avant);
  });

  it('CALC-21 : ressource désactivée ayant une assignation dans P : 200, son travail est posé', async () => {
    const m = await creerMonde(ctx);
    const { assignation } = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = $1', [m.alice.id]);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect((await travail(ctx, assignation.id)).map((t) => t.jour)).toEqual(jours(4, 5));
  });

  it('CALC-22 : Alice sur un calendrier mar–sam, 06/01 férié, activité 3 j : travail les 05, 07 et 08/01', async () => {
    const m = await creerMonde(ctx);
    const { rows } = await ctx.pool.query<{ id: number }>(
      "INSERT INTO calendrier (nom, jours_travailles) VALUES ('Mar–sam', '{2,3,4,5,6}') RETURNING id",
    );
    const calendrier = rows[0]!.id;
    await ctx.pool.query(
      "INSERT INTO calendrier_ferie (calendrier_id, jour, libelle) VALUES ($1, '2027-01-06', '')",
      [calendrier],
    );
    await ctx.pool.query('UPDATE utilisateur SET calendrier_id = $1 WHERE id = $2', [
      calendrier,
      m.alice.id,
    ]);
    const { assignation } = await tache(ctx, m.admin, m.projet.id, m.alice.id, 3);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect((await travail(ctx, assignation.id)).map((t) => t.jour)).toEqual(jours(5, 7, 8));
  });

  it('CALC-23 : sélection réduite à un modèle → 200, projets [], ignores [modele], base inchangée', async () => {
    const m = await creerMonde(ctx);
    const res0 = await appel(ctx, m.admin).post('/api/modeles', {
      code: 'MODELE-2',
      nom: 'Modèle 2',
      date_debut: '2027-01-04',
    });
    const modele = corps(res0) as { id: number };
    await affecter(ctx, modele.id, m.alice.id);
    await tache(ctx, m.admin, modele.id, m.alice.id, 3);
    const avant = await empreinte(ctx);
    const res = await calculer(ctx, m.admin, { projets: [modele.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(corps(res)).toMatchObject({
      projets: [],
      ignores: [{ id: modele.id, motif: 'modele' }],
      lignes: 0,
    });
    expect(await empreinte(ctx)).toEqual(avant);
  });
});

describe('Calcul : date du jour (lot 2a-I, D-044)', () => {
  const ctx = useTestApp(() => D0);

  it('CALC-15 : d0 omis avec une horloge injectée à 2027-01-04 → travail posé dès le 04/01, d0 de la réponse = 2027-01-04', async () => {
    const m = await creerMonde(ctx);
    const { assignation } = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id] });
    expect(res.statusCode).toBe(200);
    expect(corps(res).d0).toBe(D0);
    expect((await travail(ctx, assignation.id)).map((t) => t.jour)).toEqual(jours(4, 5));
  });

  it('CALC-15 : horizonDe(D0) = D0 + 3 ans ; le 29 février devient le 28 février', () => {
    expect(horizonDe('2027-01-04')).toBe('2030-01-04');
    expect(horizonDe('2028-02-29')).toBe('2031-02-28');
  });
});
