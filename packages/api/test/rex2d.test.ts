// Lot correctif REX-2, tranche R2-D (D-077) : identifiant de connexion, initiales, email facultatif.
// MIG-8, USR-18 à USR-25, AUTH-12. Valeurs recopiées de SPEC §2 et de la décision D-077.
import { copyFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdmin } from '../src/auth/create-admin.js';
import { MIGRATIONS_DIR, migrate } from '../src/db/migrate.js';
import {
  login,
  MOT_DE_PASSE,
  resetDb,
  seedUser,
  testDbUrl,
  useTestApp,
  type TestCtx,
} from './helpers.js';

interface LigneUtilisateur {
  login: string;
  email: string | null;
  initiales: string | null;
  nom: string;
}

/** État complet de la table utilisateur, pour prouver qu'un refus ne change rien. */
const etat = async (ctx: TestCtx) =>
  (await ctx.pool.query('SELECT * FROM utilisateur ORDER BY id')).rows;

/** Connexion par la clé `identifiant` (D-077 5), sans passer par le helper `login`. */
const connexion = (ctx: TestCtx, identifiant: string, motDePasse = MOT_DE_PASSE) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { identifiant, mot_de_passe: motDePasse },
  });

describe('REX-2 R2-D : migration 011 (D-077 4, 7)', () => {
  let pool: pg.Pool;
  beforeAll(() => {
    pool = new pg.Pool({ connectionString: testDbUrl() });
  });
  beforeEach(async () => {
    await resetDb(pool, { migrate: false });
  });
  afterAll(async () => {
    await pool.end();
  });

  it('MIG-8 : login = email des comptes existants, email « admin » vidé, initiales null ; défaut login = email ; refus sans login ni email et doublon à la casse près', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-migrations-010-'));
    for (const f of readdirSync(MIGRATIONS_DIR).filter((n) => Number(n.slice(0, 3)) <= 10)) {
      copyFileSync(join(MIGRATIONS_DIR, f), join(dir, f));
    }
    expect((await migrate(pool, dir)).applied).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const [nom, email] of [
      ['X', 'x@example.test'],
      ['Administrateur', 'admin'],
    ] as const) {
      await pool.query(
        `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
         VALUES ($1, $2, 'x', 'administrateur', false, 1, true)`,
        [nom, email],
      );
    }

    const versionsApres10 = readdirSync(MIGRATIONS_DIR)
      .filter((n) => /^\d{3}_.+\.sql$/.test(n))
      .map((n) => Number(n.slice(0, 3)))
      .filter((v) => v > 10)
      .sort((a, b) => a - b);
    expect((await migrate(pool)).applied).toEqual(versionsApres10);
    const lignes = (
      await pool.query<LigneUtilisateur>(
        'SELECT nom, login, email, initiales FROM utilisateur ORDER BY id',
      )
    ).rows;
    expect(lignes).toEqual([
      { nom: 'X', login: 'x@example.test', email: 'x@example.test', initiales: null },
      { nom: 'Administrateur', login: 'admin', email: null, initiales: null },
    ]);

    const inserer = (nom: string, login: string | null, email: string | null) =>
      login === null
        ? pool.query(
            `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
             VALUES ($1, $2, 'x', 'ressource', false, 1, true)`,
            [nom, email],
          )
        : pool.query(
            `INSERT INTO utilisateur (nom, login, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
             VALUES ($1, $2, $3, 'x', 'ressource', false, 1, true)`,
            [nom, login, email],
          );

    // insertion sans login : login = email
    await inserer('Y', null, 'y@example.test');
    expect((await pool.query("SELECT login FROM utilisateur WHERE nom = 'Y'")).rows[0].login).toBe(
      'y@example.test',
    );
    // sans login ni email : refusée
    await expect(inserer('Z', null, null)).rejects.toThrow();
    // deux logins égaux à la casse près : refusés
    await inserer('B1', 'bob', null);
    await expect(inserer('B2', 'BOB', null)).rejects.toThrow();
    expect(
      (
        await pool.query<{ n: string }>(
          "SELECT count(*) AS n FROM utilisateur WHERE nom IN ('Z','B2')",
        )
      ).rows[0]!.n,
    ).toBe('0');
  });
});

describe('REX-2 R2-D : utilisateurs, identifiant, initiales, email facultatif (D-077)', () => {
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
  const liste = async (cookie: string) =>
    (await ctx.app.inject({ method: 'GET', url: '/api/utilisateurs', headers: { cookie } })).json<
      Array<LigneUtilisateur & { id: number }>
    >();
  const base = { nom: 'Bob', mot_de_passe: 'a', role: 'ressource' };

  it('USR-18 : POST avec login « bob », sans email → 201, login « bob », email null ; connexion par identifiant → 200', async () => {
    const cookie = await admin();
    const res = await post(cookie, { ...base, login: 'bob' });
    expect(res.statusCode).toBe(201);
    expect(res.json().login).toBe('bob');
    expect(res.json().email).toBeNull();
    expect((await connexion(ctx, 'bob', 'a')).statusCode).toBe(200);
  });

  it('USR-19 : POST avec email seul → 201, login = email en minuscules', async () => {
    const cookie = await admin();
    const res = await post(cookie, { ...base, email: 'Bob@Example.Test' });
    expect(res.statusCode).toBe(201);
    expect(res.json().login).toBe('bob@example.test');
    expect(res.json().email).toBe('bob@example.test');
  });

  it('USR-20 : POST sans login ni email → 400 ; login vide → 400 ; rien n’est créé', async () => {
    const cookie = await admin();
    const avant = await etat(ctx);
    expect((await post(cookie, { ...base })).statusCode).toBe(400);
    expect((await post(cookie, { ...base, login: '' })).statusCode).toBe(400);
    expect(await etat(ctx)).toEqual(avant);
  });

  it('USR-21 : login normalisé ; doublon à la casse près → 409 « Identifiant déjà utilisé » ; email en double → 409 inchangé ; rien n’est créé', async () => {
    const cookie = await admin();
    const un = await post(cookie, { ...base, login: '  Bob  ', email: 'bob@example.test' });
    expect(un.statusCode).toBe(201);
    expect(un.json().login).toBe('bob');

    const avant = await etat(ctx);
    const doublonLogin = await post(cookie, { ...base, login: 'BOB' });
    expect(doublonLogin.statusCode).toBe(409);
    expect(doublonLogin.json()).toEqual({ erreur: 'Identifiant déjà utilisé' });
    const doublonEmail = await post(cookie, { ...base, login: 'autre', email: 'bob@example.test' });
    expect(doublonEmail.statusCode).toBe(409);
    expect(doublonEmail.json()).toEqual({ erreur: 'Email déjà utilisé' });
    expect(await etat(ctx)).toEqual(avant);
  });

  it('USR-22 : PATCH login, email null, doublon de login, email seul', async () => {
    const cookie = await admin();
    const bob = (await post(cookie, { ...base, login: 'bob', email: 'bob@example.test' })).json()
      .id as number;
    await post(cookie, { ...base, nom: 'Eve', login: 'eve' });

    const renomme = await patch(cookie, bob, { login: 'robert' });
    expect(renomme.statusCode).toBe(200);
    expect((await connexion(ctx, 'robert', 'a')).statusCode).toBe(200);
    expect((await connexion(ctx, 'bob', 'a')).statusCode).toBe(401);

    const sansEmail = await patch(cookie, bob, { email: null });
    expect(sansEmail.statusCode).toBe(200);
    expect(sansEmail.json().email).toBeNull();
    expect(sansEmail.json().login).toBe('robert');

    const avantVide = await etat(ctx);
    expect((await patch(cookie, bob, { login: '' })).statusCode).toBe(400);
    expect(await etat(ctx)).toEqual(avantVide);

    const avant = await etat(ctx);
    const doublon = await patch(cookie, bob, { login: 'eve' });
    expect(doublon.statusCode).toBe(409);
    expect(await etat(ctx)).toEqual(avant);

    const emailSeul = await patch(cookie, bob, { email: 'nouveau@example.test' });
    expect(emailSeul.statusCode).toBe(200);
    expect(emailSeul.json().email).toBe('nouveau@example.test');
    expect(emailSeul.json().login).toBe('robert');
  });

  it('USR-23 : initiales en POST et en PATCH relues par GET ; 5 caractères → 400 ; null → aucune', async () => {
    const cookie = await admin();
    const creation = await post(cookie, { ...base, login: 'bob', initiales: 'AB' });
    expect(creation.statusCode).toBe(201);
    const id = creation.json().id as number;
    const initiales = async () => (await liste(cookie)).find((u) => u.id === id)?.initiales;
    expect(await initiales()).toBe('AB');

    expect((await patch(cookie, id, { initiales: 'CD' })).statusCode).toBe(200);
    expect(await initiales()).toBe('CD');

    const avant = await etat(ctx);
    expect((await patch(cookie, id, { initiales: 'ABCDE' })).statusCode).toBe(400);
    expect((await post(cookie, { ...base, login: 'eve', initiales: 'ABCDE' })).statusCode).toBe(
      400,
    );
    expect(await etat(ctx)).toEqual(avant);

    expect((await patch(cookie, id, { initiales: null })).statusCode).toBe(200);
    expect(await initiales()).toBeNull();

    const rognees = await post(cookie, { ...base, login: 'zoe', initiales: '  ab  ' });
    expect(rognees.statusCode).toBe(201);
    const idZoe = rognees.json().id as number;
    expect((await liste(cookie)).find((u) => u.id === idZoe)?.initiales).toBe('ab');

    expect((await patch(cookie, idZoe, { initiales: '' })).statusCode).toBe(200);
    expect((await liste(cookie)).find((u) => u.id === idZoe)?.initiales).toBeNull();
  });

  // Entrée passée sans contrôle de type : le test ne dépend pas de la signature.
  const creerAdmin = (input: Record<string, unknown>) =>
    createAdmin(ctx.pool, input as unknown as Parameters<typeof createAdmin>[1]);

  it('USR-24 : createAdmin avec login seul ; avec email seul (login = email) ; sans les deux → erreur, rien n’est créé', async () => {
    await creerAdmin({ nom: 'A1', login: 'chef', motDePasse: 'a' });
    await creerAdmin({ nom: 'A2', email: 'a2@example.test', motDePasse: 'a' });
    const lignes = (
      await ctx.pool.query<LigneUtilisateur>(
        'SELECT nom, login, email FROM utilisateur ORDER BY id',
      )
    ).rows;
    expect(lignes).toEqual([
      { nom: 'A1', login: 'chef', email: null },
      { nom: 'A2', login: 'a2@example.test', email: 'a2@example.test' },
    ]);
    const avant = await etat(ctx);
    await expect(creerAdmin({ nom: 'A3', motDePasse: 'a' })).rejects.toThrow();
    expect(await etat(ctx)).toEqual(avant);
  });

  it('USR-25 : garde : l’annuaire ne contient ni login, ni initiales, ni email', async () => {
    const cookie = await admin();
    await post(cookie, { ...base, login: 'bob', email: 'bob@example.test', initiales: 'AB' });
    const res = await ctx.app.inject({ method: 'GET', url: '/api/annuaire', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    for (const e of res.json<Array<Record<string, unknown>>>()) {
      expect(Object.keys(e).sort()).toEqual(['actif', 'est_ressource', 'id', 'nom', 'role']);
    }
  });

  it('AUTH-12 : connexion par identifiant (casse et espaces ignorés), clé email synonyme, email ≠ login → 401, /me renvoie login et initiales', async () => {
    const cookie = await admin();
    await post(cookie, {
      ...base,
      login: 'bob',
      email: 'bob@example.test',
      initiales: 'AB',
    });
    expect((await connexion(ctx, 'bob', 'a')).statusCode).toBe(200);
    expect((await connexion(ctx, '  BoB ', 'a')).statusCode).toBe(200);
    const synonyme = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'bob', mot_de_passe: 'a' },
    });
    expect(synonyme.statusCode).toBe(200);
    const parEmail = await connexion(ctx, 'bob@example.test', 'a');
    expect(parEmail.statusCode).toBe(401);
    expect(parEmail.cookies.find((c) => c.name === 'session')).toBeUndefined();

    const session = (await connexion(ctx, 'bob', 'a')).cookies.find((c) => c.name === 'session');
    const me = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `session=${session?.value ?? ''}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().login).toBe('bob');
    expect(me.json().initiales).toBe('AB');
  });
});
