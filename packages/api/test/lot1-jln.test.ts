import type { LightMyRequestResponse } from 'fastify';
import { describe, expect, it } from 'vitest';
import { refusSansEffet, useTestApp } from './helpers.js';
import { appel, corps, creerActeur, liste } from './lot1-helpers.js';
import {
  compter,
  creerActivite,
  creerDependance,
  creerJalon,
  creerMonde,
  url,
  verifierRefus,
} from './lot1-t2-helpers.js';

const TABLES_JLN = ['element', 'jalon', 'dependance'];

describe('Jalons (lot 1, T2)', () => {
  const ctx = useTestApp();

  it('JLN-1 : création d’un jalon flottant', async () => {
    const m = await creerMonde(ctx);
    const res = await appel(ctx, m.chef).post(url.jalons(m.projet.id), { nom: 'Livraison' });
    expect(res.statusCode).toBe(201);
    expect(corps(res)).toMatchObject({
      projet_id: m.projet.id,
      nom: 'Livraison',
      type: 'flottant',
      date_validee: null,
      date_planifiee: null,
      parent_id: null,
    });
  });

  it('JLN-2 : jalon fixe sans date validée → 422', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.chef);
    const res = await api.post(url.jalons(m.projet.id), { nom: 'Fixe', type: 'fixe' });
    expect(res.statusCode).toBe(422);
    expect(liste(await api.get(url.jalons(m.projet.id)))).toHaveLength(0);
  });

  it('JLN-3 : jalon fixe avec date validée créé', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id, {
      type: 'fixe',
      date_validee: '2027-01-06',
    });
    expect(j).toMatchObject({ type: 'fixe', date_validee: '2027-01-06' });
  });

  it('JLN-4 : jalon créé sous une activité du projet', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const j = await creerJalon(ctx, m.chef, m.projet.id, { parent_id: a.id });
    expect(j.parent_id).toBe(a.id);
    const etranger = await creerActivite(ctx, m.admin, m.autre.id);
    const res = await appel(ctx, m.admin).post(url.jalons(m.projet.id), {
      nom: 'Autre projet',
      parent_id: etranger.id,
    });
    expect(res.statusCode).toBe(422);
    expect(liste(await appel(ctx, m.admin).get(url.jalons(m.projet.id)))).toHaveLength(1);
    // a, j et l'activité de l'autre projet ; le refus ne crée rien
    expect(await compter(ctx, 'element')).toBe(3);
  });

  it('JLN-5 : passer un jalon en fixe sans date → 422', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const api = appel(ctx, m.chef);
    expect((await api.patch(url.jalon(j.id), { type: 'fixe' })).statusCode).toBe(422);
    const { rows } = await ctx.pool.query<{ type: string }>(
      'SELECT type FROM jalon WHERE id = $1',
      [j.id],
    );
    expect(rows[0]!.type).toBe('flottant');
    const ok = await api.patch(url.jalon(j.id), { type: 'fixe', date_validee: '2027-01-06' });
    expect(ok.statusCode).toBe(200);
    expect(corps(ok)).toMatchObject({ type: 'fixe', date_validee: '2027-01-06' });
  });

  it('JLN-6-r2 : chef de projet et administrateur écrivent ; chef d’un autre projet → 403 ; ressource affectée → 404', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.admin, m.projet.id);
    expect(
      (await appel(ctx, m.chef).post(url.jalons(m.projet.id), { nom: 'Par le chef' })).statusCode,
    ).toBe(201);
    expect((await appel(ctx, m.chef).patch(url.jalon(j.id), { nom: 'Chef' })).statusCode).toBe(200);
    expect((await appel(ctx, m.admin).patch(url.jalon(j.id), { nom: 'Admin' })).statusCode).toBe(
      200,
    );
    await verifierRefus(ctx, m, [
      { methode: 'POST', adresse: url.jalons(m.projet.id), corps: { nom: 'Z' } },
      { methode: 'PATCH', adresse: url.jalon(j.id), corps: { nom: 'Pirate' } },
      { methode: 'DELETE', adresse: url.jalon(j.id) },
    ]);
    expect(liste(await appel(ctx, m.admin).get(url.jalons(m.projet.id)))).toHaveLength(2);
  });

  it('JLN-7-r1 : la ressource affectée ne lit plus les jalons de son projet (404)', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    expect(j.id).toBeGreaterThan(0);
    // Révision 6b (D-031, D-148 (2)) : la ressource affectée ne voit plus le projet → 404.
    expect((await appel(ctx, m.alice).get(url.jalons(m.projet.id))).statusCode).toBe(404);
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    expect((await appel(ctx, carole).get(url.jalons(m.projet.id))).statusCode).toBe(404);
  });

  it('JLN-8-r1 : routes jalons sans session → 401', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const api = appel(ctx);
    const refus = (requete: () => Promise<LightMyRequestResponse>) =>
      refusSansEffet(ctx, TABLES_JLN, 401, requete);
    await refus(() => api.get(url.jalons(m.projet.id)));
    await refus(() => api.post(url.jalons(m.projet.id), { nom: 'X' }));
    await refus(() => api.patch(url.jalon(j.id), { nom: 'X' }));
    await refus(() => api.delete(url.jalon(j.id)));
  });

  it('JLN-9 : un jalon ne peut pas être parent → 422', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const api = appel(ctx, m.chef);
    const activite = await api.post(url.activites(m.projet.id), { nom: 'Fille', parent_id: j.id });
    expect(activite.statusCode).toBe(422);
    const jalon = await api.post(url.jalons(m.projet.id), { nom: 'Fils', parent_id: j.id });
    expect(jalon.statusCode).toBe(422);
    expect(await compter(ctx, 'element')).toBe(1);
  });

  it('JLN-10 : jalon flottant : date validée facultative', async () => {
    const m = await creerMonde(ctx);
    const sans = await creerJalon(ctx, m.chef, m.projet.id, { type: 'flottant' });
    expect(sans.date_validee).toBeNull();
    const avec = await creerJalon(ctx, m.chef, m.projet.id, {
      type: 'flottant',
      date_validee: '2027-01-08',
    });
    expect(avec).toMatchObject({ type: 'flottant', date_validee: '2027-01-08' });
  });

  it('JLN-11 : supprimer un jalon supprime ses dépendances', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    await creerDependance(ctx, m.chef, m.projet.id, a.id, j.id);
    await creerDependance(ctx, m.chef, m.projet.id, j.id, b.id);
    await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    expect(await compter(ctx, 'dependance')).toBe(3);
    expect((await appel(ctx, m.chef).delete(url.jalon(j.id))).statusCode).toBe(204);
    expect(await compter(ctx, 'jalon')).toBe(0);
    expect(await compter(ctx, 'element')).toBe(2);
    // seules les dépendances du jalon disparaissent
    expect(await compter(ctx, 'dependance')).toBe(1);
    const { rows } = await ctx.pool.query<{ predecesseur_id: number; successeur_id: number }>(
      'SELECT predecesseur_id, successeur_id FROM dependance',
    );
    expect(rows).toEqual([{ predecesseur_id: a.id, successeur_id: b.id }]);
  });
});
