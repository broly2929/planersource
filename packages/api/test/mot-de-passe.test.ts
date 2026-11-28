// Lot mot-de-passe (D-254), SPEC §8 « Changement de mot de passe » : MDP-1 à MDP-5.
import argon2 from 'argon2';
import { describe, expect, it } from 'vitest';
import { MOT_DE_PASSE, login, refusSansEffet, releve, seedUser, useTestApp } from './helpers.js';

const NOUVEAU = 'nouveau-mot-de-passe-654';

describe('Changement de mot de passe (D-254)', () => {
  const ctx = useTestApp();

  const en = (cookie: string | undefined) => ({ cookie: cookie ?? '' });
  const connecte = async (email: string) => {
    const r = await login(ctx.app, email);
    expect(r.status).toBe(200);
    return en(r.cookie);
  };
  const changer = (headers: { cookie: string }, payload: Record<string, unknown> | null) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/auth/mot-de-passe',
      headers,
      ...(payload ? { payload } : {}),
    });
  const marquer = (email: string, valeur: boolean) =>
    ctx.pool.query('UPDATE utilisateur SET doit_changer_mot_de_passe = $2 WHERE email = $1', [
      email,
      valeur,
    ]);
  const drapeau = async (email: string) =>
    (
      await ctx.pool.query<{ d: boolean }>(
        'SELECT doit_changer_mot_de_passe AS d FROM utilisateur WHERE email = $1',
        [email],
      )
    ).rows[0]?.d;

  it('MDP-1-r1 : défaut faux ; POST et PATCH par l’administrateur ; refus pour un non-administrateur, base inchangée', async () => {
    await seedUser(ctx.pool, { email: 'admin@mdp.test', role: 'administrateur' });
    await seedUser(ctx.pool, { email: 'ress@mdp.test', role: 'ressource' });
    expect(await drapeau('admin@mdp.test')).toBe(false);
    expect(await drapeau('ress@mdp.test')).toBe(false);

    const admin = await connecte('admin@mdp.test');
    const cree = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers: admin,
      payload: {
        nom: 'Nouveau',
        email: 'nouveau@mdp.test',
        mot_de_passe: 'mot-de-passe-x',
        role: 'ressource',
        doit_changer_mot_de_passe: true,
      },
    });
    expect(cree.statusCode).toBe(201);
    expect(cree.json().doit_changer_mot_de_passe).toBe(true);
    expect(await drapeau('nouveau@mdp.test')).toBe(true);

    const defaut = await ctx.app.inject({
      method: 'POST',
      url: '/api/utilisateurs',
      headers: admin,
      payload: {
        nom: 'Defaut',
        email: 'defaut@mdp.test',
        mot_de_passe: 'mot-de-passe-x',
        role: 'ressource',
      },
    });
    expect(defaut.json().doit_changer_mot_de_passe).toBe(false);

    const id = (cree.json() as { id: number }).id;
    const patch = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/utilisateurs/${id}`,
      headers: admin,
      payload: { doit_changer_mot_de_passe: false },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().doit_changer_mot_de_passe).toBe(false);
    // Fixer un mot de passe ne coche pas la case.
    const mdp = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/utilisateurs/${id}`,
      headers: admin,
      payload: { mot_de_passe: 'autre-mot-de-passe' },
    });
    expect(mdp.json().doit_changer_mot_de_passe).toBe(false);
    const lu = await ctx.app.inject({ method: 'GET', url: '/api/utilisateurs', headers: admin });
    expect(
      (lu.json() as { email: string; doit_changer_mot_de_passe: boolean }[]).every(
        (u) => typeof u.doit_changer_mot_de_passe === 'boolean',
      ),
    ).toBe(true);
    const moi = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: admin });
    expect(moi.json().doit_changer_mot_de_passe).toBe(false);

    const ress = await connecte('ress@mdp.test');
    await refusSansEffet(ctx, ['utilisateur'], 403, () =>
      ctx.app.inject({
        method: 'POST',
        url: '/api/utilisateurs',
        headers: ress,
        payload: {
          nom: 'X',
          email: 'x@mdp.test',
          mot_de_passe: 'x',
          role: 'ressource',
          doit_changer_mot_de_passe: true,
        },
      }),
    );
    await refusSansEffet(ctx, ['utilisateur'], 403, () =>
      ctx.app.inject({
        method: 'PATCH',
        url: `/api/utilisateurs/${id}`,
        headers: ress,
        payload: { doit_changer_mot_de_passe: true },
      }),
    );
  });

  it('MDP-2 : case vraie → 403 sur toute route sauf les exemptées, session ouverte comprise ; 401 avant 403', async () => {
    await seedUser(ctx.pool, { email: 'admin@mdp.test', role: 'administrateur' });
    const session = await connecte('admin@mdp.test'); // ouverte avant le changement de la case
    await marquer('admin@mdp.test', true);
    const attendu = { erreur: 'Changement de mot de passe requis' };
    for (const [methode, url] of [
      ['GET', '/api/utilisateurs'],
      ['GET', '/api/projets'],
      ['POST', '/api/projets'],
      ['POST', '/api/utilisateurs'],
    ] as const) {
      const res = await ctx.app.inject({ method: methode, url, headers: session, payload: {} });
      expect(res.statusCode, `${methode} ${url}`).toBe(403);
      expect(res.json()).toEqual(attendu);
    }
    const me = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: session });
    expect(me.statusCode).toBe(200);
    expect(me.json().doit_changer_mot_de_passe).toBe(true);
    const version = await ctx.app.inject({ method: 'GET', url: '/api/version' });
    expect(version.statusCode).toBe(200);
    // Sans session : 401, avant le 403.
    const sans = await ctx.app.inject({ method: 'GET', url: '/api/projets' });
    expect(sans.statusCode).toBe(401);
    // Une nouvelle connexion est possible, et reste limitée.
    const neuve = await connecte('admin@mdp.test');
    expect(
      (await ctx.app.inject({ method: 'GET', url: '/api/projets', headers: neuve })).statusCode,
    ).toBe(403);
    const logout = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: session,
    });
    expect(logout.statusCode).toBe(204);
    // Changement exempté.
    const ok = await changer(neuve, { actuel: MOT_DE_PASSE, nouveau: NOUVEAU });
    expect(ok.statusCode).toBe(204);
    expect(
      (await ctx.app.inject({ method: 'GET', url: '/api/projets', headers: neuve })).statusCode,
    ).toBe(200);
  });

  it('MDP-3 : succès 204, nouveau mot de passe, ancien refusé, case à faux, autres sessions fermées, session courante valide', async () => {
    await seedUser(ctx.pool, { email: 'u@mdp.test', role: 'ressource' });
    await marquer('u@mdp.test', true);
    const courante = await connecte('u@mdp.test');
    const autre = await connecte('u@mdp.test');
    const avant = await releve(ctx, 'utilisateur');
    const res = await changer(courante, { actuel: MOT_DE_PASSE, nouveau: NOUVEAU });
    expect(res.statusCode).toBe(204);
    expect(await releve(ctx, 'utilisateur')).not.toEqual(avant);
    expect(await drapeau('u@mdp.test')).toBe(false);
    const hash = (
      await ctx.pool.query<{ h: string }>(
        'SELECT mot_de_passe_hash AS h FROM utilisateur WHERE email = $1',
        ['u@mdp.test'],
      )
    ).rows[0]!.h;
    expect(await argon2.verify(hash, NOUVEAU)).toBe(true);
    expect((await login(ctx.app, 'u@mdp.test', NOUVEAU)).status).toBe(200);
    expect((await login(ctx.app, 'u@mdp.test', MOT_DE_PASSE)).status).toBe(401);
    expect(
      (await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: courante })).statusCode,
    ).toBe(200);
    expect(
      (await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: autre })).statusCode,
    ).toBe(401);
  });

  it('MDP-4 : refus dans l’ordre (401, corps invalide, nouveau vide, actuel incorrect, identique), base inchangée', async () => {
    await seedUser(ctx.pool, { email: 'u@mdp.test', role: 'ressource' });
    const s = await connecte('u@mdp.test');
    const tables = ['utilisateur', 'session'];
    await refusSansEffet(ctx, tables, 401, () =>
      ctx.app.inject({
        method: 'POST',
        url: '/api/auth/mot-de-passe',
        payload: { actuel: MOT_DE_PASSE, nouveau: NOUVEAU },
      }),
    );
    // 401 avant la validation du corps.
    await refusSansEffet(ctx, tables, 401, () =>
      ctx.app.inject({ method: 'POST', url: '/api/auth/mot-de-passe', payload: {} }),
    );
    for (const corps of [{}, { actuel: MOT_DE_PASSE }, { actuel: 1, nouveau: 'a' }, null]) {
      await refusSansEffet(ctx, tables, 400, () => changer(s, corps));
    }
    const vide = await changer(s, { actuel: MOT_DE_PASSE, nouveau: '' });
    expect(vide.statusCode).toBe(400);
    expect(vide.json().erreur).not.toBe('Mot de passe actuel incorrect');
    await refusSansEffet(ctx, tables, 400, () => changer(s, { actuel: MOT_DE_PASSE, nouveau: '' }));
    // Corps invalide avant « actuel incorrect » : nouveau vide, actuel faux.
    await refusSansEffet(ctx, tables, 400, () => changer(s, { actuel: 'faux', nouveau: '' }));
    const faux = await changer(s, { actuel: 'faux', nouveau: NOUVEAU });
    expect(faux.statusCode).toBe(400);
    expect(faux.json()).toEqual({ erreur: 'Mot de passe actuel incorrect' });
    await refusSansEffet(ctx, tables, 400, () => changer(s, { actuel: 'faux', nouveau: NOUVEAU }));
    // Actuel incorrect avant « identique » : actuel faux, nouveau identique à l'actuel faux.
    await refusSansEffet(ctx, tables, 400, () => changer(s, { actuel: 'faux', nouveau: 'faux' }));
    const meme = await changer(s, { actuel: MOT_DE_PASSE, nouveau: MOT_DE_PASSE });
    expect(meme.statusCode).toBe(400);
    expect(meme.json()).toEqual({
      erreur: "Le nouveau mot de passe doit être différent de l'actuel",
    });
    await refusSansEffet(ctx, tables, 400, () =>
      changer(s, { actuel: MOT_DE_PASSE, nouveau: MOT_DE_PASSE }),
    );
    expect((await login(ctx.app, 'u@mdp.test', MOT_DE_PASSE)).status).toBe(200);
  });

  it('MDP-5 : compte admin/admin, le signal « mot de passe d’origine » tombe après le changement', async () => {
    await ctx.pool.query(
      `INSERT INTO utilisateur (nom, login, mot_de_passe_hash, role, est_ressource, capacite, actif)
       VALUES ('Admin', 'admin', $1, 'administrateur', false, 1, true)`,
      [await argon2.hash('admin')],
    );
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant: 'admin', mot_de_passe: 'admin' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().mot_de_passe_origine).toBe(true);
    const c = r.cookies.find((x) => x.name === 'session')!;
    const headers = en(`${c.name}=${c.value}`);
    const me = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers });
    expect(me.json().mot_de_passe_origine).toBe(true);
    expect((await changer(headers, { actuel: 'admin', nouveau: NOUVEAU })).statusCode).toBe(204);
    const apres = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers });
    expect(apres.statusCode).toBe(200);
    expect(apres.json().mot_de_passe_origine).toBe(false);
    const neuf = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant: 'admin', mot_de_passe: NOUVEAU },
    });
    expect(neuf.json().mot_de_passe_origine).toBe(false);
  });
});
