import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createAdmin } from '../src/auth/create-admin.js';
import {
  SESSION_COOKIE,
  MOT_DE_PASSE,
  login,
  seedUser,
  testConfig,
  useTestApp,
} from './helpers.js';

describe('Authentification', () => {
  const ctx = useTestApp();

  it('AUTH-1 : email et mot de passe valides → 200 et cookie de session', async () => {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alice@example.test', mot_de_passe: MOT_DE_PASSE },
    });
    expect(res.statusCode).toBe(200);
    const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.secure).toBeFalsy();

    const prod = buildApp({ pool: ctx.pool, config: testConfig('production') });
    const resProd = await prod.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alice@example.test', mot_de_passe: MOT_DE_PASSE },
    });
    expect(resProd.cookies.find((c) => c.name === SESSION_COOKIE)?.secure).toBe(true);
    await prod.close();
  });

  it('AUTH-2 : mot de passe faux → 401, aucun cookie', async () => {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alice@example.test', mot_de_passe: 'faux' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.cookies).toHaveLength(0);
  });

  it('AUTH-3 : utilisateur inactif → 401', async () => {
    await seedUser(ctx.pool, { email: 'inactif@example.test', actif: false });
    const res = await login(ctx.app, 'inactif@example.test');
    expect(res.status).toBe(401);
    expect(res.cookie).toBeUndefined();
  });

  it('AUTH-4 : route protégée sans session → 401', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('AUTH-5 : déconnexion → la session ne fonctionne plus', async () => {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    const { cookie } = await login(ctx.app, 'alice@example.test');
    const headers = { cookie: cookie ?? '' };
    expect((await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers })).statusCode).toBe(
      200,
    );
    const out = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout', headers });
    expect(out.statusCode).toBe(204);
    const after = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers });
    expect(after.statusCode).toBe(401);
  });

  it('AUTH-6 : mot de passe stocké haché en argon2, jamais en clair', async () => {
    const motDePasse = 'un-mot-de-passe-secret';
    const { created } = await createAdmin(ctx.pool, {
      nom: 'Admin',
      email: 'admin@example.test',
      motDePasse,
    });
    expect(created).toBe(true);
    const { rows } = await ctx.pool.query<{ mot_de_passe_hash: string }>(
      'SELECT mot_de_passe_hash FROM utilisateur WHERE email = $1',
      ['admin@example.test'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.mot_de_passe_hash).toMatch(/^\$argon2/);
    expect(rows[0]?.mot_de_passe_hash).not.toContain(motDePasse);
  });

  it('AUTH-7 : session de plus de 12 h → 401', async () => {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    const { cookie } = await login(ctx.app, 'alice@example.test');
    const headers = { cookie: cookie ?? '' };
    expect((await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers })).statusCode).toBe(
      200,
    );
    await ctx.pool.query("UPDATE session SET cree_le = now() - interval '13 hours'");
    const res = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers });
    expect(res.statusCode).toBe(401);
  });

  it('AUTH-8 : le jeton de session est stocké haché en base (SHA-256 hexadécimal)', async () => {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    const { status, value } = await login(ctx.app, 'alice@example.test');
    expect(status).toBe(200);
    expect(value).toBeDefined();
    const jeton = (value ?? '').split('.')[0] ?? '';
    expect(jeton.length).toBeGreaterThan(0);
    const { rows } = await ctx.pool.query<{ jeton_hash: string }>('SELECT * FROM session');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.jeton_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(jeton);
  });
});
