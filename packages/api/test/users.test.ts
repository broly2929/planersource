import { describe, expect, it } from 'vitest';
import { createAdmin } from '../src/auth/create-admin.js';
import { login, seedUser, useTestApp, type Role } from './helpers.js';

describe('Utilisateurs et rôles', () => {
  const ctx = useTestApp();

  async function asRole(role: Role): Promise<{ cookie: string }> {
    const email = `${role}@example.test`;
    await seedUser(ctx.pool, { email, role });
    const { cookie } = await login(ctx.app, email);
    return { cookie: cookie ?? '' };
  }

  const nouveau = {
    nom: 'Bob',
    email: 'bob@example.test',
    mot_de_passe: 'mot-de-passe-de-bob',
    role: 'ressource',
  };

  it('USR-1 : l’administrateur crée, modifie, désactive et liste les utilisateurs', async () => {
    const headers = await asRole('administrateur');
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers,
      payload: nouveau,
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;

    const modified = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/utilisateurs/${id}`,
      headers,
      payload: { nom: 'Bob Martin' },
    });
    expect(modified.statusCode).toBe(200);
    expect(modified.json().nom).toBe('Bob Martin');

    const deactivated = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/utilisateurs/${id}`,
      headers,
      payload: { actif: false },
    });
    expect(deactivated.statusCode).toBe(200);
    expect(deactivated.json().actif).toBe(false);

    const list = await ctx.app.inject({ method: 'GET', url: '/api/utilisateurs', headers });
    expect(list.statusCode).toBe(200);
    const bob = list.json().find((u: { id: number }) => u.id === id);
    expect(bob).toMatchObject({ email: 'bob@example.test', nom: 'Bob Martin', actif: false });
  });

  it('USR-2 : chef de projet et ressource → 403 sur ces routes', async () => {
    for (const role of ['chef_de_projet', 'ressource'] as const) {
      const headers = await asRole(role);
      const calls = [
        { method: 'GET', url: '/api/utilisateurs' },
        { method: 'POST', url: '/api/utilisateurs', payload: nouveau },
        { method: 'PATCH', url: '/api/utilisateurs/1', payload: { nom: 'X' } },
      ] as const;
      for (const call of calls) {
        const res = await ctx.app.inject({ ...call, headers });
        expect(res.statusCode, `${role} ${call.method} ${call.url}`).toBe(403);
      }
    }
  });

  it('USR-3 : email déjà utilisé → erreur, rien n’est créé', async () => {
    const headers = await asRole('administrateur');
    const first = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers,
      payload: nouveau,
    });
    expect(first.statusCode).toBe(201);
    const second = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers,
      payload: { ...nouveau, nom: 'Autre Bob' },
    });
    expect(second.statusCode).toBe(409);
    const { rows } = await ctx.pool.query('SELECT nom FROM utilisateur WHERE email = $1', [
      nouveau.email,
    ]);
    expect(rows).toHaveLength(1);
  });

  it('USR-4 : valeurs par défaut : capacité 1, actif', async () => {
    const headers = await asRole('administrateur');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers,
      payload: nouveau,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().capacite).toBe(1);
    expect(res.json().actif).toBe(true);
  });

  // USR-5-r1 (D-031, tag tests-lot5i-r2) : seul le booléen « mot_de_passe_origine » (D-138 (2)) est admis.
  it('USR-5-r1 : le mot de passe haché n’apparaît dans aucune réponse de l’API', async () => {
    const headers = await asRole('administrateur');
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers,
      payload: nouveau,
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const responses = [
      created,
      await ctx.app.inject({ method: 'GET', url: '/api/utilisateurs', headers }),
      await ctx.app.inject({
        method: 'PATCH',
        url: `/api/utilisateurs/${id}`,
        headers,
        payload: { nom: 'Bob 2' },
      }),
      await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers }),
    ];
    for (const res of responses) {
      expect(res.statusCode).toBeLessThan(300);
      const corps = res.body.replace(/"mot_de_passe_origine":(true|false)/g, '');
      expect(corps).not.toMatch(/argon2|mot_de_passe/);
    }
  });

  it('USR-7 : GET, POST et PATCH sur /api/utilisateurs sans session → 401', async () => {
    const calls = [
      { method: 'GET', url: '/api/utilisateurs' },
      { method: 'POST', url: '/api/utilisateurs', payload: nouveau },
      { method: 'PATCH', url: '/api/utilisateurs/1', payload: { nom: 'X' } },
    ] as const;
    for (const call of calls) {
      const res = await ctx.app.inject(call);
      expect(res.statusCode, `${call.method} ${call.url}`).toBe(401);
    }
  });

  it('USR-6 : create-admin crée un administrateur actif ; même email → erreur, rien n’est créé', async () => {
    const input = { nom: 'Admin', email: 'admin@example.test', motDePasse: 'mot-de-passe-admin' };
    expect((await createAdmin(ctx.pool, input)).created).toBe(true);
    const { rows } = await ctx.pool.query<{ role: string; actif: boolean }>(
      'SELECT role, actif FROM utilisateur WHERE email = $1',
      [input.email],
    );
    expect(rows).toEqual([{ role: 'administrateur', actif: true }]);

    await expect(createAdmin(ctx.pool, input)).rejects.toThrow();
    const count = await ctx.pool.query('SELECT 1 FROM utilisateur WHERE email = $1', [input.email]);
    expect(count.rowCount).toBe(1);
  });
});
