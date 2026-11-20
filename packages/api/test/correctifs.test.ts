import { describe, expect, it } from 'vitest';
import { createAdmin } from '../src/auth/create-admin.js';
import { login, seedUser, useTestApp, type TestCtx } from './helpers.js';

const get = (ctx: TestCtx, cookie: string) =>
  ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });

const patch = (ctx: TestCtx, cookie: string, id: number, payload: Record<string, unknown>) =>
  ctx.app.inject({
    method: 'PATCH',
    url: `/api/utilisateurs/${id}`,
    headers: { cookie },
    payload,
  });

describe('Correctifs avant le lot 1', () => {
  const ctx = useTestApp();

  it('AUTH-11 : la désactivation d’un utilisateur supprime ses sessions ; réactivé ensuite, son ancien cookie reste refusé (401)', async () => {
    await seedUser(ctx.pool, { email: 'admin@example.test', role: 'administrateur' });
    const ca = (await login(ctx.app, 'admin@example.test')).cookie ?? '';
    const bob = await seedUser(ctx.pool, { email: 'bob@example.test' });
    const cb = (await login(ctx.app, 'bob@example.test')).cookie ?? '';
    expect((await get(ctx, cb)).statusCode).toBe(200);

    expect((await patch(ctx, ca, bob, { actif: false })).statusCode).toBe(200);
    const { rows } = await ctx.pool.query('SELECT 1 FROM session WHERE utilisateur_id = $1', [bob]);
    expect(rows).toHaveLength(0);

    expect((await patch(ctx, ca, bob, { actif: true })).statusCode).toBe(200);
    expect((await get(ctx, cb)).statusCode).toBe(401);
  });

  it('USR-12 : createAdmin avec un email mal formé → erreur, rien n’est créé', async () => {
    await expect(
      createAdmin(ctx.pool, {
        nom: 'Admin',
        email: 'pas-un-email',
        motDePasse: 'mot-de-passe-admin',
      }),
    ).rejects.toThrow();
    const { rows } = await ctx.pool.query('SELECT 1 FROM utilisateur');
    expect(rows).toHaveLength(0);
  });

  it('USR-13-r1 : createAdmin avec un mot de passe vide → erreur, rien n’est créé', async () => {
    await expect(
      createAdmin(ctx.pool, { nom: 'Admin', email: 'admin@example.test', motDePasse: '' }),
    ).rejects.toThrow();
    const { rows } = await ctx.pool.query('SELECT 1 FROM utilisateur');
    expect(rows).toHaveLength(0);
  });
});
