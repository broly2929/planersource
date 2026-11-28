// Lot securite (D-272) : corrections de l'audit (docs/securite.md). SECT-4, SECT-5 : SEC-1.
import { describe, expect, it } from 'vitest';
import { creerAdminInitial } from '../src/auth/dev-admin.js';
import { releve, useTestApp } from './helpers.js';

const journal = { warn: () => undefined };

describe('Compte initial : changement de mot de passe imposé (SEC-1, SPEC §8 point 7)', () => {
  const ctx = useTestApp();

  const doitChanger = async () =>
    (
      await ctx.pool.query<{ d: boolean }>(
        "SELECT doit_changer_mot_de_passe AS d FROM utilisateur WHERE login = 'admin'",
      )
    ).rows.map((r) => r.d);

  it('SECT-4-r1 : hors développement, base vide → admin à changer ; tout refusé avant le changement ; accès après (CPI-1)', async () => {
    const r = await creerAdminInitial(ctx.pool, { nodeEnv: 'production' }, journal);
    expect(r.created).toBe(true);
    expect(await doitChanger()).toEqual([true]);

    const connexion = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant: 'admin', mot_de_passe: 'admin' },
    });
    expect(connexion.statusCode).toBe(200);
    expect(connexion.json().doit_changer_mot_de_passe).toBe(true);
    const c = connexion.cookies.find((x) => x.name === 'session')!;
    const cookie = `${c.name}=${c.value}`;

    const avant = await releve(ctx, 'utilisateur');
    const refus = await ctx.app.inject({
      method: 'GET',
      url: '/api/utilisateurs',
      headers: { cookie },
    });
    expect(refus.statusCode).toBe(403);
    expect(refus.json()).toEqual({ erreur: 'Changement de mot de passe requis' });
    expect(await releve(ctx, 'utilisateur')).toEqual(avant);

    const identique = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/mot-de-passe',
      headers: { cookie },
      payload: { actuel: 'admin', nouveau: 'admin' },
    });
    expect(identique.statusCode).toBe(400);
    expect(await doitChanger()).toEqual([true]);
    expect(await releve(ctx, 'utilisateur')).toEqual(avant);

    const change = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/mot-de-passe',
      headers: { cookie },
      payload: { actuel: 'admin', nouveau: 'Autre-mot-de-passe-1' },
    });
    expect(change.statusCode).toBe(204);
    const acces = await ctx.app.inject({
      method: 'GET',
      url: '/api/utilisateurs',
      headers: { cookie },
    });
    expect(acces.statusCode).toBe(200);
    expect(await doitChanger()).toEqual([false]);
  });

  it('SECT-5 : développement, base vide → admin créé sans changement imposé (CPI-2, D-071)', async () => {
    const r = await creerAdminInitial(ctx.pool, { nodeEnv: 'development' }, journal);
    expect(r.created).toBe(true);
    expect(await doitChanger()).toEqual([false]);
  });
});
