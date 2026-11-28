// Lot 6a (D-147, SPEC « Équipes (lot 6a, D-147) ») : API des équipes et champ equipe_id des utilisateurs.
// EQP-1 à EQP-11, USR-26 à USR-30. Valeurs recopiées de SPEC et de D-147 (3), (4).
import { describe, expect, it } from 'vitest';
import { refusSansEffet, useTestApp, type TestCtx } from './helpers.js';
import { appel, corps, creerActeur, liste, type Acteur, type Corps } from './lot1-helpers.js';

const TABLES = ['equipe', 'utilisateur'];
const DOUBLON = { erreur: 'Équipe déjà existante' };
const UTILISEE = { erreur: 'Équipe utilisée : suppression refusée' };
const INCONNUE = { erreur: 'Équipe inconnue' };

async function admin(ctx: TestCtx): Promise<Acteur> {
  return creerActeur(ctx, 'admin@example.test', 'administrateur');
}

/** Crée une équipe par l'API (201 attendu). */
async function equipe(ctx: TestCtx, par: Acteur, nom: string): Promise<number> {
  const res = await appel(ctx, par).post('/api/equipes', { nom });
  expect(res.statusCode).toBe(201);
  return corps(res).id as number;
}

const noms = (res: { json: () => unknown }) => (res.json() as Corps[]).map((e) => e.nom);

describe('Équipes : lecture (D-147 (3))', () => {
  const ctx = useTestApp();

  it('EQP-1 : lecture par chaque rôle ; sans session 401, base inchangée', async () => {
    const a = await admin(ctx);
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    const res = await creerActeur(ctx, 'res@example.test', 'ressource', true);
    const id = await equipe(ctx, a, 'Atelier');
    for (const acteur of [a, chef, res]) {
      const r = await appel(ctx, acteur).get('/api/equipes');
      expect(r.statusCode).toBe(200);
      expect(liste(r)).toEqual([{ id, nom: 'Atelier' }]);
    }
    await refusSansEffet(ctx, TABLES, 401, () => appel(ctx).get('/api/equipes'));
  });

  it('EQP-2 : tri par nom sans tenir compte de la casse', async () => {
    const a = await admin(ctx);
    for (const nom of ['bravo', 'Alpha', 'Écho', 'alpha2', 'Charlie']) await equipe(ctx, a, nom);
    const r = await appel(ctx, a).get('/api/equipes');
    expect(noms(r)).toEqual(['Alpha', 'alpha2', 'bravo', 'Charlie', 'Écho']);
  });
});

describe('Équipes : écriture par l’administrateur (D-147 (3))', () => {
  const ctx = useTestApp();

  it('EQP-3 : création, nom sans espaces de bord, 100 caractères acceptés', async () => {
    const a = await admin(ctx);
    const r = await appel(ctx, a).post('/api/equipes', { nom: '  Atelier  ' });
    expect(r.statusCode).toBe(201);
    expect(corps(r)).toEqual({ id: expect.any(Number), nom: 'Atelier' });
    const long = 'x'.repeat(100);
    expect((await appel(ctx, a).post('/api/equipes', { nom: long })).statusCode).toBe(201);
    expect(noms(await appel(ctx, a).get('/api/equipes'))).toEqual(['Atelier', long]);
  });

  it('EQP-4 : renommage ; changement de casse de son propre nom accepté', async () => {
    const a = await admin(ctx);
    const id = await equipe(ctx, a, 'Atelier');
    const r = await appel(ctx, a).patch(`/api/equipes/${id}`, { nom: 'Bureau' });
    expect(r.statusCode).toBe(200);
    expect(corps(r)).toEqual({ id, nom: 'Bureau' });
    expect(liste(await appel(ctx, a).get('/api/equipes'))).toEqual([{ id, nom: 'Bureau' }]);
    const casse = await appel(ctx, a).patch(`/api/equipes/${id}`, { nom: 'BUREAU' });
    expect(casse.statusCode).toBe(200);
    expect(corps(casse)).toEqual({ id, nom: 'BUREAU' });
  });

  it('EQP-5 : suppression ; le nom peut être recréé', async () => {
    const a = await admin(ctx);
    const id = await equipe(ctx, a, 'Atelier');
    await equipe(ctx, a, 'Bureau');
    const r = await appel(ctx, a).delete(`/api/equipes/${id}`);
    expect(r.statusCode).toBe(204);
    expect(noms(await appel(ctx, a).get('/api/equipes'))).toEqual(['Bureau']);
    await equipe(ctx, a, 'Atelier');
    expect(noms(await appel(ctx, a).get('/api/equipes'))).toEqual(['Atelier', 'Bureau']);
  });
});

describe('Équipes : refus (D-147 (3))', () => {
  const ctx = useTestApp();

  it('EQP-6 : 403 pour le chef de projet et la ressource sur les trois routes d’écriture', async () => {
    const a = await admin(ctx);
    const id = await equipe(ctx, a, 'Atelier');
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    const res = await creerActeur(ctx, 'res@example.test', 'ressource', true);
    for (const acteur of [chef, res]) {
      const c = appel(ctx, acteur);
      await refusSansEffet(
        ctx,
        TABLES,
        403,
        () => c.post('/api/equipes', { nom: 'Autre' }),
        'POST',
      );
      await refusSansEffet(
        ctx,
        TABLES,
        403,
        () => c.patch(`/api/equipes/${id}`, { nom: 'Autre' }),
        'PATCH',
      );
      await refusSansEffet(ctx, TABLES, 403, () => c.delete(`/api/equipes/${id}`), 'DELETE');
    }
  });

  it('EQP-7 : 400 pour un nom vide, d’espaces, de 101 caractères, absent, non textuel, ou une clé inconnue', async () => {
    const a = await admin(ctx);
    const id = await equipe(ctx, a, 'Atelier');
    const c = appel(ctx, a);
    const invalides: Corps[] = [
      { nom: '' },
      { nom: '   ' },
      { nom: 'x'.repeat(101) },
      {},
      { nom: 5 },
      { nom: 'Autre', couleur: 'rouge' },
    ];
    for (const payload of invalides) {
      const lib = JSON.stringify(payload).slice(0, 40);
      await refusSansEffet(ctx, TABLES, 400, () => c.post('/api/equipes', payload), `POST ${lib}`);
      await refusSansEffet(
        ctx,
        TABLES,
        400,
        () => c.patch(`/api/equipes/${id}`, payload),
        `PATCH ${lib}`,
      );
    }
  });

  it('EQP-8 : 409 « Équipe déjà existante » pour un doublon de casse différente (POST et PATCH)', async () => {
    const a = await admin(ctx);
    await equipe(ctx, a, 'Atelier');
    const autre = await equipe(ctx, a, 'Bureau');
    const c = appel(ctx, a);
    await refusSansEffet(
      ctx,
      TABLES,
      409,
      () => c.post('/api/equipes', { nom: 'atelier' }),
      'POST',
    );
    expect(corps(await c.post('/api/equipes', { nom: 'ATELIER' }))).toEqual(DOUBLON);
    await refusSansEffet(
      ctx,
      TABLES,
      409,
      () => c.patch(`/api/equipes/${autre}`, { nom: 'ATELIER' }),
      'PATCH',
    );
    expect(corps(await c.patch(`/api/equipes/${autre}`, { nom: 'atelier' }))).toEqual(DOUBLON);
  });

  it('EQP-9 : 409 « Équipe utilisée » pour une équipe portée par un utilisateur inactif ou actif', async () => {
    const a = await admin(ctx);
    const id = await equipe(ctx, a, 'Atelier');
    const u1 = await creerActeur(ctx, 'u1@example.test', 'ressource', true);
    const u2 = await creerActeur(ctx, 'u2@example.test', 'ressource', true);
    const c = appel(ctx, a);
    await ctx.pool.query('UPDATE utilisateur SET equipe_id = $1, actif = false WHERE id = $2', [
      id,
      u1.id,
    ]);
    await refusSansEffet(ctx, TABLES, 409, () => c.delete(`/api/equipes/${id}`), 'inactif');
    expect(corps(await c.delete(`/api/equipes/${id}`))).toEqual(UTILISEE);
    await ctx.pool.query('UPDATE utilisateur SET equipe_id = $1 WHERE id = $2', [id, u2.id]);
    await refusSansEffet(ctx, TABLES, 409, () => c.delete(`/api/equipes/${id}`), 'actif');
    await ctx.pool.query('UPDATE utilisateur SET equipe_id = NULL');
    expect((await c.delete(`/api/equipes/${id}`)).statusCode).toBe(204);
  });

  it('EQP-10 : 404 pour une équipe inconnue ou un identifiant hors plage, mal formé ou nul', async () => {
    const a = await admin(ctx);
    await equipe(ctx, a, 'Atelier');
    const c = appel(ctx, a);
    for (const id of ['99999', '2147483648', '0', 'abc']) {
      await refusSansEffet(
        ctx,
        TABLES,
        404,
        () => c.patch(`/api/equipes/${id}`, { nom: 'Autre' }),
        `PATCH ${id}`,
      );
      await refusSansEffet(ctx, TABLES, 404, () => c.delete(`/api/equipes/${id}`), `DELETE ${id}`);
    }
  });

  it('EQP-11 : ordre des refus 401, 403, 404, 400, 409', async () => {
    const a = await admin(ctx);
    const id = await equipe(ctx, a, 'Atelier');
    await equipe(ctx, a, 'Bureau');
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    await refusSansEffet(ctx, TABLES, 401, () =>
      appel(ctx).patch('/api/equipes/99999', { nom: '' }),
    );
    await refusSansEffet(ctx, TABLES, 403, () =>
      appel(ctx, chef).patch('/api/equipes/99999', { nom: '' }),
    );
    await refusSansEffet(ctx, TABLES, 404, () =>
      appel(ctx, a).patch('/api/equipes/99999', { nom: '' }),
    );
    await refusSansEffet(ctx, TABLES, 400, () =>
      appel(ctx, a).patch(`/api/equipes/${id}`, { nom: 'Bureau', couleur: 'rouge' }),
    );
    await refusSansEffet(ctx, TABLES, 409, () =>
      appel(ctx, a).patch(`/api/equipes/${id}`, { nom: 'bureau' }),
    );
  });
});

describe('Utilisateurs : equipe_id (D-147 (4))', () => {
  const ctx = useTestApp();
  const nouveau = (extra: Corps = {}): Corps => ({
    nom: 'Nouveau',
    email: 'nouveau@example.test',
    mot_de_passe: 'mdp-de-test-12',
    role: 'ressource',
    est_ressource: true,
    ...extra,
  });
  const equipeDe = async (a: Acteur, id: unknown) =>
    (liste(await appel(ctx, a).get('/api/utilisateurs')).find((u) => u.id === id) as Corps)
      .equipe_id;

  it('USR-26-r1 : equipe_id à la création, null sans équipe, relu par GET /api/utilisateurs', async () => {
    const a = await admin(ctx);
    const e = await equipe(ctx, a, 'Atelier');
    const avec = await appel(ctx, a).post('/api/utilisateurs', nouveau({ equipe_id: e }));
    expect(avec.statusCode).toBe(201);
    expect(corps(avec).equipe_id).toBe(e);
    const sans = await appel(ctx, a).post(
      '/api/utilisateurs',
      nouveau({ nom: 'Sans', email: 'sans@example.test' }),
    );
    expect(sans.statusCode).toBe(201);
    expect(corps(sans).equipe_id).toBeNull();
    expect(await equipeDe(a, corps(avec).id)).toBe(e);
    expect(await equipeDe(a, corps(sans).id)).toBeNull();
  });

  it('USR-27-r1 : equipe_id modifié, retiré par null, inchangé sans la clé', async () => {
    const a = await admin(ctx);
    const e1 = await equipe(ctx, a, 'Atelier');
    const e2 = await equipe(ctx, a, 'Bureau');
    const u = corps(await appel(ctx, a).post('/api/utilisateurs', nouveau({ equipe_id: e1 })))
      .id as number;
    const c = appel(ctx, a);
    const r = await c.patch(`/api/utilisateurs/${u}`, { equipe_id: e2 });
    expect(r.statusCode).toBe(200);
    expect(corps(r).equipe_id).toBe(e2);
    expect(await equipeDe(a, u)).toBe(e2);
    expect((await c.patch(`/api/utilisateurs/${u}`, { nom: 'Renommé' })).statusCode).toBe(200);
    expect(await equipeDe(a, u)).toBe(e2);
    const retire = await c.patch(`/api/utilisateurs/${u}`, { equipe_id: null });
    expect(retire.statusCode).toBe(200);
    expect(corps(retire).equipe_id).toBeNull();
    expect(await equipeDe(a, u)).toBeNull();
  });

  it('USR-28-r1 : 422 « Équipe inconnue » distinct de « Calendrier inconnu » ; 400 pour un equipe_id invalide', async () => {
    const a = await admin(ctx);
    const u = corps(await appel(ctx, a).post('/api/utilisateurs', nouveau())).id as number;
    const c = appel(ctx, a);
    await refusSansEffet(
      ctx,
      TABLES,
      422,
      () =>
        c.post(
          '/api/utilisateurs',
          nouveau({ nom: 'Autre', email: 'autre@example.test', equipe_id: 99999 }),
        ),
      'POST équipe',
    );
    expect(
      corps(
        await c.post(
          '/api/utilisateurs',
          nouveau({ nom: 'A', email: 'a@example.test', equipe_id: 99999 }),
        ),
      ),
    ).toEqual(INCONNUE);
    await refusSansEffet(
      ctx,
      TABLES,
      422,
      () => c.patch(`/api/utilisateurs/${u}`, { equipe_id: 99999 }),
      'PATCH équipe',
    );
    expect(corps(await c.patch(`/api/utilisateurs/${u}`, { equipe_id: 99999 }))).toEqual(INCONNUE);
    await refusSansEffet(
      ctx,
      TABLES,
      422,
      () => c.patch(`/api/utilisateurs/${u}`, { calendrier_id: 99999 }),
      'PATCH calendrier',
    );
    expect(corps(await c.patch(`/api/utilisateurs/${u}`, { calendrier_id: 99999 }))).toEqual({
      erreur: 'Calendrier inconnu',
    });
    expect(
      corps(
        await c.post(
          '/api/utilisateurs',
          nouveau({ nom: 'B', email: 'b@example.test', calendrier_id: 99999 }),
        ),
      ),
    ).toEqual({ erreur: 'Calendrier inconnu' });
    for (const equipe_id of [0, -1, 2147483648, 1.5, 'abc']) {
      await refusSansEffet(
        ctx,
        TABLES,
        400,
        () => c.patch(`/api/utilisateurs/${u}`, { equipe_id }),
        `PATCH ${equipe_id}`,
      );
      await refusSansEffet(
        ctx,
        TABLES,
        400,
        () =>
          c.post('/api/utilisateurs', nouveau({ nom: 'C', email: 'c@example.test', equipe_id })),
        `POST ${equipe_id}`,
      );
    }
  });

  it('USR-29-r1 : l’annuaire ne contient ni equipe_id ni equipe', async () => {
    const a = await admin(ctx);
    const e = await equipe(ctx, a, 'Atelier');
    await appel(ctx, a).post('/api/utilisateurs', nouveau({ equipe_id: e }));
    const r = await appel(ctx, a).get('/api/annuaire');
    expect(r.statusCode).toBe(200);
    const entrees = liste(r);
    expect(entrees.length).toBeGreaterThan(1);
    for (const entree of entrees) {
      expect(Object.keys(entree).sort()).toEqual(['actif', 'est_ressource', 'id', 'nom', 'role']);
    }
  });

  it('USR-30 : GET /api/auth/me porte equipe_id', async () => {
    const a = await admin(ctx);
    expect(corps(await appel(ctx, a).get('/api/auth/me')).equipe_id).toBeNull();
    const e = await equipe(ctx, a, 'Atelier');
    await ctx.pool.query('UPDATE utilisateur SET equipe_id = $1 WHERE id = $2', [e, a.id]);
    expect(corps(await appel(ctx, a).get('/api/auth/me')).equipe_id).toBe(e);
  });
});
