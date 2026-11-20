// Lot correctif REX-2, tranche R2-A (D-076) : mot de passe sans contrainte de longueur.
import { describe, expect, it } from 'vitest';
import { createAdmin } from '../src/auth/create-admin.js';
import { login, seedUser, useTestApp, type TestCtx } from './helpers.js';

const compte = async (ctx: TestCtx) =>
  Number((await ctx.pool.query('SELECT count(*) AS n FROM utilisateur')).rows[0].n);

describe('REX-2 R2-A : mot de passe sans longueur minimale (D-076)', () => {
  const ctx = useTestApp();

  const admin = async () => {
    await seedUser(ctx.pool, { email: 'admin@example.test', role: 'administrateur' });
    return (await login(ctx.app, 'admin@example.test')).cookie ?? '';
  };
  const post = (cookie: string, payload: Record<string, unknown>) =>
    ctx.app.inject({ method: 'POST', url: '/api/utilisateurs', headers: { cookie }, payload });
  const patch = (cookie: string, id: number, payload: Record<string, unknown>) =>
    ctx.app.inject({
      method: 'PATCH',
      url: `/api/utilisateurs/${id}`,
      headers: { cookie },
      payload,
    });

  it('USR-14 : createAdmin avec le mot de passe « a » crée l’administrateur, qui se connecte avec « a »', async () => {
    await createAdmin(ctx.pool, { nom: 'Admin', email: 'a@example.test', motDePasse: 'a' });
    expect(await compte(ctx)).toBe(1);
    expect((await login(ctx.app, 'a@example.test', 'a')).status).toBe(200);
  });

  it('USR-15 : POST /api/utilisateurs avec mot_de_passe « a » → 201 ; connexion avec « a » → 200', async () => {
    const cookie = await admin();
    const res = await post(cookie, {
      nom: 'Court',
      email: 'court@example.test',
      mot_de_passe: 'a',
      role: 'ressource',
    });
    expect(res.statusCode).toBe(201);
    expect((await login(ctx.app, 'court@example.test', 'a')).status).toBe(200);
  });

  it('USR-16 : PATCH avec mot_de_passe « b » → 200 ; « b » connecte, l’ancien mot de passe → 401', async () => {
    const cookie = await admin();
    const id = await seedUser(ctx.pool, { email: 'bob@example.test' });
    const res = await patch(cookie, id, { mot_de_passe: 'b' });
    expect(res.statusCode).toBe(200);
    expect((await login(ctx.app, 'bob@example.test', 'b')).status).toBe(200);
    expect((await login(ctx.app, 'bob@example.test')).status).toBe(401);
  });

  it('USR-17 : mot de passe vide refusé (400) : POST ne crée rien, PATCH garde l’ancien mot de passe', async () => {
    const cookie = await admin();
    const id = await seedUser(ctx.pool, { email: 'bob@example.test' });
    const avant = await compte(ctx);

    const creation = await post(cookie, {
      nom: 'Vide',
      email: 'vide@example.test',
      mot_de_passe: '',
      role: 'ressource',
    });
    expect(creation.statusCode).toBe(400);
    expect(await compte(ctx)).toBe(avant);

    const modification = await patch(cookie, id, { mot_de_passe: '' });
    expect(modification.statusCode).toBe(400);
    expect((await login(ctx.app, 'bob@example.test')).status).toBe(200);
  });
});
