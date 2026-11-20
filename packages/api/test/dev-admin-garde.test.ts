import { describe, expect, it } from 'vitest';
import { createAdmin } from '../src/auth/create-admin.js';
import { useTestApp } from './helpers.js';

describe('create-admin garde ses règles (D-071)', () => {
  const ctx = useTestApp();
  const compte = async () =>
    Number((await ctx.pool.query('SELECT count(*) AS n FROM utilisateur')).rows[0].n);

  it('DEV-7 : « admin » refusé comme email, rien n’est créé', async () => {
    await expect(
      createAdmin(ctx.pool, { nom: 'X', email: 'admin', motDePasse: 'motdepasse-valide' }),
    ).rejects.toThrow();
    expect(await compte()).toBe(0);
  });

  it('DEV-8-r1 : mot de passe vide refusé, rien n’est créé', async () => {
    await expect(
      createAdmin(ctx.pool, { nom: 'X', email: 'x@example.test', motDePasse: '' }),
    ).rejects.toThrow();
    expect(await compte()).toBe(0);
  });
});
