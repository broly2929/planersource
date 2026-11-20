import { describe, expect, it } from 'vitest';
import { creerAdminDeDeveloppement } from '../src/auth/dev-admin.js';
import { login, seedUser, useTestApp } from './helpers.js';

function journal() {
  const avertissements: string[] = [];
  return { avertissements, log: { warn: (m: string) => void avertissements.push(m) } };
}

describe('Compte de développement (D-071)', () => {
  const ctx = useTestApp();

  const utilisateurs = async () =>
    (
      await ctx.pool.query<{ nom: string; email: string; role: string; actif: boolean }>(
        'SELECT nom, email, role, actif FROM utilisateur ORDER BY id',
      )
    ).rows;

  it('DEV-1-r1 : development, base vide → administrateur actif créé, avertissement au journal', async () => {
    const j = journal();
    const r = await creerAdminDeDeveloppement(ctx.pool, { nodeEnv: 'development' }, j.log);
    expect(r.created).toBe(true);
    const lignes = (
      await ctx.pool.query<{
        nom: string;
        login: string;
        email: string | null;
        role: string;
        actif: boolean;
      }>('SELECT nom, login, email, role, actif FROM utilisateur ORDER BY id')
    ).rows;
    expect(lignes).toEqual([
      {
        nom: 'Administrateur',
        login: 'admin',
        email: null,
        role: 'administrateur',
        actif: true,
      },
    ]);
    expect(j.avertissements).toHaveLength(1);
  });

  it('DEV-2 : connexion admin / admin → 200, rôle administrateur', async () => {
    await creerAdminDeDeveloppement(ctx.pool, { nodeEnv: 'development' }, journal().log);
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin', mot_de_passe: 'admin' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe('administrateur');
  });

  it('DEV-3 : base non vide → aucune création, table inchangée', async () => {
    await seedUser(ctx.pool, { email: 'a@example.test', role: 'chef_de_projet' });
    const avant = await utilisateurs();
    const j = journal();
    const r = await creerAdminDeDeveloppement(ctx.pool, { nodeEnv: 'development' }, j.log);
    expect(r.created).toBe(false);
    expect(await utilisateurs()).toEqual(avant);
    expect(j.avertissements).toHaveLength(0);
    expect((await login(ctx.app, 'admin', 'admin')).status).toBe(401);
  });

  it.each(['test', 'production', undefined])(
    'DEV-4 : NODE_ENV = %s, base vide → aucune création',
    async (nodeEnv) => {
      const j = journal();
      const r = await creerAdminDeDeveloppement(ctx.pool, { nodeEnv }, j.log);
      expect(r.created).toBe(false);
      expect(await utilisateurs()).toEqual([]);
      expect(j.avertissements).toHaveLength(0);
    },
  );

  it('DEV-5 : second démarrage → un seul administrateur, un seul avertissement', async () => {
    const j = journal();
    await creerAdminDeDeveloppement(ctx.pool, { nodeEnv: 'development' }, j.log);
    const r = await creerAdminDeDeveloppement(ctx.pool, { nodeEnv: 'development' }, j.log);
    expect(r.created).toBe(false);
    expect(await utilisateurs()).toHaveLength(1);
    expect(j.avertissements).toHaveLength(1);
  });

  it('DEV-6 : development, base vide, DEV_ADMIN=0 → aucune création', async () => {
    const j = journal();
    const r = await creerAdminDeDeveloppement(
      ctx.pool,
      { nodeEnv: 'development', devAdmin: '0' },
      j.log,
    );
    expect(r.created).toBe(false);
    expect(await utilisateurs()).toEqual([]);
    expect(j.avertissements).toHaveLength(0);
  });
});
