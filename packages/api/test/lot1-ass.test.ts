import { describe, expect, it } from 'vitest';
import { refusSansEffet, useTestApp } from './helpers.js';
import { appel, corps, creerActeur, liste } from './lot1-helpers.js';
import {
  compter,
  creerActivite,
  creerAssignation,
  creerJalon,
  creerMonde,
  url,
  verifierRefus,
} from './lot1-t2-helpers.js';

const TABLES_ASS = ['assignation'];

describe('Assignations (lot 1, T2)', () => {
  const ctx = useTestApp();

  it('ASS-1 : création : taux 100 par défaut, charge réelle 0', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const res = await appel(ctx, m.chef).post(url.assignationsActivite(a.id), {
      ressource_id: m.alice.id,
      charge_assignee: 3,
    });
    expect(res.statusCode).toBe(201);
    expect(corps(res)).toMatchObject({
      activite_id: a.id,
      ressource_id: m.alice.id,
      taux: 100,
      charge_assignee: 3,
      charge_reelle: 0,
    });
  });

  it('ASS-2 : ressource non affectée au projet → 422', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    const res = await appel(ctx, m.chef).post(url.assignationsActivite(a.id), {
      ressource_id: carole.id,
      charge_assignee: 1,
    });
    expect(res.statusCode).toBe(422);
    expect(await compter(ctx, 'assignation')).toBe(0);
  });

  it('ASS-3 : assignation sur une activité parente → 422', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.chef, m.projet.id);
    await creerActivite(ctx, m.chef, m.projet.id, { parent_id: parent.id });
    const res = await appel(ctx, m.chef).post(url.assignationsActivite(parent.id), {
      ressource_id: m.alice.id,
      charge_assignee: 1,
    });
    expect(res.statusCode).toBe(422);
    expect(await compter(ctx, 'assignation')).toBe(0);
  });

  it('ASS-4 : ajouter un enfant sous une activité assignée → 422', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    await creerAssignation(ctx, m.chef, a.id, m.alice.id);
    const api = appel(ctx, m.chef);
    expect(
      (await api.post(url.activites(m.projet.id), { nom: 'Enfant', parent_id: a.id })).statusCode,
    ).toBe(422);
    expect(
      (await api.post(url.jalons(m.projet.id), { nom: 'Jalon enfant', parent_id: a.id }))
        .statusCode,
    ).toBe(422);
    expect(await compter(ctx, 'element')).toBe(1);
  });

  it('ASS-5 : assignation sur un jalon → 422', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const res = await appel(ctx, m.chef).post(url.assignationsActivite(j.id), {
      ressource_id: m.alice.id,
      charge_assignee: 1,
    });
    expect(res.statusCode).toBe(422);
    expect(await compter(ctx, 'assignation')).toBe(0);
  });

  it('ASS-6 : charge 0,25 stockée et renvoyée exactement', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const res = await appel(ctx, m.chef).post(url.assignationsActivite(a.id), {
      ressource_id: m.alice.id,
      charge_assignee: 0.25,
    });
    expect(res.statusCode).toBe(201);
    expect(corps(res).charge_assignee).toBe(0.25);
    const lecture = liste(await appel(ctx, m.chef).get(url.assignationsProjet(m.projet.id)));
    expect(lecture[0]!.charge_assignee).toBe(0.25);
    const { rows } = await ctx.pool.query<{ charge_assignee: string }>(
      'SELECT charge_assignee::text FROM assignation',
    );
    expect(rows[0]!.charge_assignee).toBe('0.25');
  });

  it('ASS-7 : modification de la charge assignée et du taux', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 3 });
    const res = await appel(ctx, m.chef).patch(url.assignation(s.id), {
      charge_assignee: 5,
      taux: 50,
    });
    expect(res.statusCode).toBe(200);
    expect(corps(res)).toMatchObject({ charge_assignee: 5, taux: 50 });
    const lecture = liste(await appel(ctx, m.chef).get(url.assignationsProjet(m.projet.id)));
    expect(lecture[0]).toMatchObject({ charge_assignee: 5, taux: 50 });
  });

  it('ASS-8 : la charge réelle n’est pas modifiable par l’API', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const api = appel(ctx, m.chef);
    const creation = await api.post(url.assignationsActivite(a.id), {
      ressource_id: m.alice.id,
      charge_assignee: 2,
      charge_reelle: 1,
    });
    expect(creation.statusCode).toBe(400);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 2 });
    const modif = await api.patch(url.assignation(s.id), { charge_reelle: 1 });
    expect(modif.statusCode).toBe(400);
    const { rows } = await ctx.pool.query<{ charge_reelle: number }>(
      'SELECT charge_reelle::float8 AS charge_reelle FROM assignation',
    );
    expect(rows).toEqual([{ charge_reelle: 0 }]);
  });

  it('ASS-9-r1 : écriture chef et administrateur ; chef d’un autre projet → 404 ; ressource affectée → 404 ; sans session → 401', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const parChef = await appel(ctx, m.chef).post(url.assignationsActivite(a.id), {
      ressource_id: m.alice.id,
      charge_assignee: 1,
    });
    expect(parChef.statusCode).toBe(201);
    const parAdmin = await appel(ctx, m.admin).post(url.assignationsActivite(a.id), {
      ressource_id: m.bob.id,
      charge_assignee: 1,
    });
    expect(parAdmin.statusCode).toBe(201);
    const id = (corps(parChef) as { id: number }).id;
    expect((await appel(ctx, m.chef).patch(url.assignation(id), { taux: 80 })).statusCode).toBe(
      200,
    );
    expect((await appel(ctx, m.admin).patch(url.assignation(id), { taux: 70 })).statusCode).toBe(
      200,
    );
    await verifierRefus(ctx, m, [
      {
        methode: 'POST',
        adresse: url.assignationsActivite(a.id),
        corps: { ressource_id: m.alice.id, charge_assignee: 1 },
      },
      { methode: 'PATCH', adresse: url.assignation(id), corps: { taux: 10 } },
      { methode: 'DELETE', adresse: url.assignation(id) },
    ]);
    expect(await compter(ctx, 'assignation')).toBe(2);
  });

  it('ASS-10-r1 : la ressource affectée ne lit plus les assignations du projet (404)', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.bob.id);
    expect(s.id).toBeGreaterThan(0);
    // Révision 6b (D-031, D-148 (2)) : la ressource affectée ne voit plus le projet → 404.
    expect((await appel(ctx, m.alice).get(url.assignationsProjet(m.projet.id))).statusCode).toBe(
      404,
    );
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    expect((await appel(ctx, carole).get(url.assignationsProjet(m.projet.id))).statusCode).toBe(
      404,
    );
  });

  it('ASS-11 : deuxième assignation de la même ressource à la même activité → 409', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const existante = await creerAssignation(ctx, m.chef, a.id, m.alice.id);
    const res = await appel(ctx, m.chef).post(url.assignationsActivite(a.id), {
      ressource_id: m.alice.id,
      charge_assignee: 2,
    });
    expect(res.statusCode).toBe(409);
    expect(await compter(ctx, 'assignation')).toBe(1);
    expect(liste(await appel(ctx, m.chef).get(url.assignationsProjet(m.projet.id)))).toEqual([
      existante,
    ]);
  });

  it('ASS-12-r1 : taux d’assignation hors de ]0 ; 100] → 400', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id);
    const api = appel(ctx, m.chef);
    for (const taux of [0, -5, 100.01, 101]) {
      await refusSansEffet(
        ctx,
        TABLES_ASS,
        400,
        () =>
          api.post(url.assignationsActivite(a.id), {
            ressource_id: m.bob.id,
            charge_assignee: 1,
            taux,
          }),
        `POST ${taux}`,
      );
      await refusSansEffet(
        ctx,
        TABLES_ASS,
        400,
        () => api.patch(url.assignation(s.id), { taux }),
        `PATCH ${taux}`,
      );
    }
    expect(await compter(ctx, 'assignation')).toBe(1);
    expect((await api.patch(url.assignation(s.id), { taux: 100 })).statusCode).toBe(200);
  });

  it('ASS-13 : reste à faire initial égal à la charge assignée', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 1.5 });
    expect(s.reste_a_faire).toBe(1.5);
  });

  it('ASS-14-r1 : charge avec plus de 2 décimales → 400', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const api = appel(ctx, m.chef);
    await refusSansEffet(ctx, TABLES_ASS, 400, () =>
      api.post(url.assignationsActivite(a.id), {
        ressource_id: m.alice.id,
        charge_assignee: 0.255,
      }),
    );
    expect(await compter(ctx, 'assignation')).toBe(0);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 2 });
    await refusSansEffet(ctx, TABLES_ASS, 400, () =>
      api.patch(url.assignation(s.id), { charge_assignee: 0.255 }),
    );
    expect(
      corps(await api.patch(url.assignation(s.id), { charge_assignee: 0.25 })).charge_assignee,
    ).toBe(0.25);
  });

  it('ASS-15 : supprimer une assignation : charge réelle > 0 → 409 ; sinon supprimée', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const avecReel = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 2 });
    const sansReel = await creerAssignation(ctx, m.chef, a.id, m.bob.id, { charge_assignee: 2 });
    await ctx.pool.query('UPDATE assignation SET charge_reelle = 0.5 WHERE id = $1', [avecReel.id]);
    const api = appel(ctx, m.chef);
    expect((await api.delete(url.assignation(avecReel.id))).statusCode).toBe(409);
    expect(await compter(ctx, 'assignation')).toBe(2);
    expect((await api.delete(url.assignation(sansReel.id))).statusCode).toBe(204);
    const { rows } = await ctx.pool.query<{ id: number }>('SELECT id FROM assignation');
    expect(rows).toEqual([{ id: avecReel.id }]);
  });

  it('ASS-16-r1 : charge négative → 400', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const api = appel(ctx, m.chef);
    await refusSansEffet(ctx, TABLES_ASS, 400, () =>
      api.post(url.assignationsActivite(a.id), { ressource_id: m.alice.id, charge_assignee: -1 }),
    );
    expect(await compter(ctx, 'assignation')).toBe(0);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 2 });
    await refusSansEffet(ctx, TABLES_ASS, 400, () =>
      api.patch(url.assignation(s.id), { charge_assignee: -0.5 }),
    );
  });

  it('ASS-17 : tant que la charge réelle vaut 0, modifier la charge assignée recale le reste à faire', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, { charge_assignee: 3 });
    const api = appel(ctx, m.chef);
    const recale = await api.patch(url.assignation(s.id), { charge_assignee: 4 });
    expect(corps(recale)).toMatchObject({ charge_assignee: 4, charge_reelle: 0, reste_a_faire: 4 });
    // charge réelle > 0 : le reste à faire n'est plus recalé
    await ctx.pool.query(
      'UPDATE assignation SET charge_reelle = 1, reste_a_faire = 3 WHERE id = $1',
      [s.id],
    );
    const fige = await api.patch(url.assignation(s.id), { charge_assignee: 6 });
    expect(corps(fige)).toMatchObject({ charge_assignee: 6, charge_reelle: 1, reste_a_faire: 3 });
  });

  it('AFF-6 : supprimer l’affectation d’une ressource assignée → 409', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id);
    const { rows } = await ctx.pool.query<{ id: number }>(
      'SELECT id FROM affectation_projet WHERE projet_id = $1 AND ressource_id = $2',
      [m.projet.id, m.alice.id],
    );
    const affectationId = rows[0]!.id;
    const api = appel(ctx, m.chef);
    expect((await api.delete(url.affectation(affectationId))).statusCode).toBe(409);
    // rien n'est supprimé : l'affectation et l'assignation existent encore
    expect(await compter(ctx, 'affectation_projet')).toBe(2);
    expect(await compter(ctx, 'assignation')).toBe(1);
    // l'assignation supprimée, l'affectation se supprime
    expect((await api.delete(url.assignation(s.id))).statusCode).toBe(204);
    expect((await api.delete(url.affectation(affectationId))).statusCode).toBe(204);
    expect(await compter(ctx, 'affectation_projet')).toBe(1);
  });
});
