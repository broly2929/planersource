import { describe, expect, it } from 'vitest';
import { createAdmin } from '../src/auth/create-admin.js';
import { MOT_DE_PASSE, login, seedUser, useTestApp, type TestCtx } from './helpers.js';

const get = (ctx: TestCtx, cookie: string) =>
  ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });

const patch = (ctx: TestCtx, cookie: string, id: number, payload: Record<string, unknown>) =>
  ctx.app.inject({
    method: 'PATCH',
    url: `/api/utilisateurs/${id}`,
    headers: { cookie },
    payload,
  });

async function etat(ctx: TestCtx, id: number) {
  const { rows } = await ctx.pool.query<{ role: string; actif: boolean }>(
    'SELECT role, actif FROM utilisateur WHERE id = $1',
    [id],
  );
  return rows[0];
}

describe('Durcissement du socle (lot 0bis)', () => {
  const ctx = useTestApp();

  async function deuxAdmins() {
    const a = await seedUser(ctx.pool, { email: 'a@example.test', role: 'administrateur' });
    const b = await seedUser(ctx.pool, { email: 'b@example.test', role: 'administrateur' });
    const ca = (await login(ctx.app, 'a@example.test')).cookie ?? '';
    const cb = (await login(ctx.app, 'b@example.test')).cookie ?? '';
    return { a, b, ca, cb };
  }

  it('USR-8 : un administrateur ne peut ni se désactiver ni changer son propre rôle → 409', async () => {
    const { a, ca } = await deuxAdmins();
    const desactiver = await patch(ctx, ca, a, { actif: false });
    expect(desactiver.statusCode).toBe(409);
    const retrograder = await patch(ctx, ca, a, { role: 'ressource' });
    expect(retrograder.statusCode).toBe(409);
    const combine = await patch(ctx, ca, a, { nom: 'Nouveau nom', role: 'chef_de_projet' });
    expect(combine.statusCode).toBe(409);
    expect(await etat(ctx, a)).toEqual({ role: 'administrateur', actif: true });
    const { rows } = await ctx.pool.query('SELECT nom FROM utilisateur WHERE id = $1', [a]);
    expect(rows[0].nom).toBe('Test');
  });

  it('USR-9 : désactiver ou rétrograder le dernier administrateur actif → 409', async () => {
    // Seul administrateur actif.
    const seul = await seedUser(ctx.pool, { email: 'seul@example.test', role: 'administrateur' });
    const cs = (await login(ctx.app, 'seul@example.test')).cookie ?? '';
    expect((await patch(ctx, cs, seul, { actif: false })).statusCode).toBe(409);
    expect((await patch(ctx, cs, seul, { role: 'ressource' })).statusCode).toBe(409);
    expect(await etat(ctx, seul)).toEqual({ role: 'administrateur', actif: true });
  });

  it('USR-9 : deux administrateurs qui se visent en même temps → il en reste un actif', async () => {
    const { a, b, ca, cb } = await deuxAdmins();
    const [r1, r2] = await Promise.all([
      patch(ctx, ca, b, { actif: false }),
      patch(ctx, cb, a, { role: 'ressource' }),
    ]);
    expect([r1.statusCode, r2.statusCode]).not.toEqual([200, 200]);
    const { rows } = await ctx.pool.query(
      "SELECT 1 FROM utilisateur WHERE role = 'administrateur' AND actif",
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('USR-10 : l’email est normalisé en minuscules à la création ; doublon de casse → 409', async () => {
    const a = await seedUser(ctx.pool, { email: 'admin@example.test', role: 'administrateur' });
    expect(a).toBeGreaterThan(0);
    const cookie = (await login(ctx.app, 'admin@example.test')).cookie ?? '';
    const payload = { nom: 'Bob', mot_de_passe: 'mot-de-passe-de-bob', role: 'ressource' };
    const first = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers: { cookie },
      payload: { ...payload, email: 'Bob@Example.test' },
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().email).toBe('bob@example.test');
    const second = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers: { cookie },
      payload: { ...payload, email: 'bob@example.test' },
    });
    expect(second.statusCode).toBe(409);
    const { rows } = await ctx.pool.query('SELECT email FROM utilisateur WHERE nom = $1', ['Bob']);
    expect(rows).toEqual([{ email: 'bob@example.test' }]);
  });

  it('USR-10 : l’email est normalisé en minuscules à la modification', async () => {
    const { b, ca } = await deuxAdmins();
    const res = await patch(ctx, ca, b, { email: 'Carl@Example.TEST' });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe('carl@example.test');
    const { rows } = await ctx.pool.query('SELECT email FROM utilisateur WHERE id = $1', [b]);
    expect(rows[0].email).toBe('carl@example.test');
  });

  it('USR-10 : la connexion ignore la casse de l’email', async () => {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    const res = await login(ctx.app, 'Alice@Example.TEST');
    expect(res.status).toBe(200);
  });

  it('USR-10 : create-admin normalise aussi l’email', async () => {
    await createAdmin(ctx.pool, {
      nom: 'Admin',
      email: 'Admin@Example.test',
      motDePasse: 'mot-de-passe-admin',
    });
    const { rows } = await ctx.pool.query('SELECT email FROM utilisateur');
    expect(rows).toEqual([{ email: 'admin@example.test' }]);
  });

  it('AUTH-9 : un changement de mot de passe par l’administrateur révoque les sessions de l’utilisateur', async () => {
    const { ca } = await deuxAdmins();
    const bob = await seedUser(ctx.pool, { email: 'bob@example.test' });
    const cb = (await login(ctx.app, 'bob@example.test')).cookie ?? '';
    expect((await get(ctx, cb)).statusCode).toBe(200);
    expect((await patch(ctx, ca, bob, { mot_de_passe: 'nouveau-mot-de-passe' })).statusCode).toBe(
      200,
    );
    expect((await get(ctx, cb)).statusCode).toBe(401);
    expect((await get(ctx, ca)).statusCode).toBe(200);
    const relogin = await login(ctx.app, 'bob@example.test', 'nouveau-mot-de-passe');
    expect(relogin.status).toBe(200);
  });

  it('AUTH-9 : un changement de rôle révoque les sessions de l’utilisateur', async () => {
    const { ca } = await deuxAdmins();
    const bob = await seedUser(ctx.pool, { email: 'bob@example.test', role: 'chef_de_projet' });
    const cb = (await login(ctx.app, 'bob@example.test')).cookie ?? '';
    expect((await get(ctx, cb)).statusCode).toBe(200);
    expect((await patch(ctx, ca, bob, { role: 'ressource' })).statusCode).toBe(200);
    expect((await get(ctx, cb)).statusCode).toBe(401);
    expect((await get(ctx, ca)).statusCode).toBe(200);
  });

  it('AUTH-10 : à la connexion, les sessions de plus de 12 h sont supprimées de la table', async () => {
    const alice = await seedUser(ctx.pool, { email: 'alice@example.test' });
    await ctx.pool.query(
      `INSERT INTO session (utilisateur_id, jeton_hash, cree_le) VALUES
         ($1, 'ancienne', now() - interval '13 hours'),
         ($1, 'recente', now() - interval '1 hour')`,
      [alice],
    );
    expect((await login(ctx.app, 'alice@example.test', MOT_DE_PASSE)).status).toBe(200);
    const { rows } = await ctx.pool.query<{ jeton_hash: string }>('SELECT jeton_hash FROM session');
    const hashes = rows.map((r) => r.jeton_hash);
    expect(hashes).not.toContain('ancienne');
    expect(hashes).toContain('recente');
    expect(hashes).toHaveLength(2);
  });

  it('USR-11 : createAdmin sur un email existant rejette avec un message contenant l’email ; rien n’est créé', async () => {
    const input = { nom: 'Admin', email: 'admin@example.test', motDePasse: 'mot-de-passe-admin' };
    await createAdmin(ctx.pool, input);
    await expect(createAdmin(ctx.pool, input)).rejects.toThrow(/déjà utilisé.*admin@example\.test/);
    const { rows } = await ctx.pool.query('SELECT 1 FROM utilisateur');
    expect(rows).toHaveLength(1);
  });
});
