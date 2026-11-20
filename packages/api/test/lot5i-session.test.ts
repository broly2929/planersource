// Lot 5i, indicateur « mot de passe d'origine » de la session (D-138 (2)) : INST-8, INST-9, INST-11.
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';
import type { SessionsOrigine } from '../src/auth/session.js';
import { MOT_DE_PASSE, resetDb, seedUser, testConfig, testDbUrl, useTestApp } from './helpers.js';

describe('Session : mot de passe d’origine (D-138 (2))', () => {
  const ctx = useTestApp();

  async function sessionDe(identifiant: string, motDePasse: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant, mot_de_passe: motDePasse },
    });
    expect(res.statusCode).toBe(200);
    const c = res.cookies.find((x) => x.name === 'session')!;
    const cookie = `${c.name}=${c.value}`;
    const me = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    return { connexion: res, me, cookie };
  }

  function sansHash(corps: string): void {
    expect(corps).not.toContain('mot_de_passe_hash');
    expect(corps).not.toContain('$argon2');
  }

  it('INST-8 : admin / admin → vrai ; après changement par lui-même → faux', async () => {
    const { rows } = await ctx.pool.query<{ id: number }>(
      `INSERT INTO utilisateur (nom, login, email, mot_de_passe_hash, role, actif)
       VALUES ('Administrateur', 'admin', NULL, $1, 'administrateur', true) RETURNING id`,
      [await hashPassword('admin')],
    );
    const id = rows[0]!.id;

    const avant = await sessionDe('admin', 'admin');
    expect(avant.connexion.json().mot_de_passe_origine).toBe(true);
    expect(avant.me.json().mot_de_passe_origine).toBe(true);
    sansHash(avant.connexion.body);
    sansHash(avant.me.body);

    const patch = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/utilisateurs/${id}`,
      headers: { cookie: avant.cookie },
      payload: { mot_de_passe: 'nouveau-mot-de-passe' },
    });
    expect(patch.statusCode).toBe(200);

    const apres = await sessionDe('admin', 'nouveau-mot-de-passe');
    expect(apres.connexion.json().mot_de_passe_origine).toBe(false);
    expect(apres.me.json().mot_de_passe_origine).toBe(false);
    sansHash(apres.connexion.body);
    sansHash(apres.me.body);
  });

  it('INST-9 : autre utilisateur → faux', async () => {
    await seedUser(ctx.pool, { email: 'admin2@example.test', role: 'administrateur' });
    const { connexion, me } = await sessionDe('admin2@example.test', MOT_DE_PASSE);
    expect(connexion.json().mot_de_passe_origine).toBe(false);
    expect(me.json().mot_de_passe_origine).toBe(false);
  });
});

describe('Indicateur en mémoire : retrait (D-138 (2), précision)', () => {
  const pool = { courant: null as pg.Pool | null };
  let app: FastifyInstance;
  let origine: SessionsOrigine;

  beforeAll(() => {
    pool.courant = new pg.Pool({ connectionString: testDbUrl() });
  });
  beforeEach(async () => {
    await resetDb(pool.courant!);
    origine = new Set();
    app = buildApp({ pool: pool.courant!, config: testConfig(), sessionsOrigine: origine });
    await app.ready();
    await pool.courant!.query(
      `INSERT INTO utilisateur (nom, login, email, mot_de_passe_hash, role, actif)
       VALUES ('Administrateur', 'admin', NULL, $1, 'administrateur', true)`,
      [await hashPassword('admin')],
    );
  });
  afterEach(async () => {
    await app.close();
  });
  afterAll(async () => {
    await pool.courant!.end();
  });

  async function connecter(identifiant: string, motDePasse: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant, mot_de_passe: motDePasse },
    });
    expect(res.statusCode).toBe(200);
    const c = res.cookies.find((x) => x.name === 'session')!;
    return `${c.name}=${c.value}`;
  }

  async function sessions(): Promise<string[]> {
    const { rows } = await pool.courant!.query<{ ligne: string }>(
      'SELECT row_to_json(s)::text AS ligne FROM session s ORDER BY id',
    );
    return rows.map((r) => r.ligne);
  }

  async function vieillir(): Promise<void> {
    await pool.courant!.query(
      "UPDATE session SET cree_le = now() - interval '13 hours' WHERE utilisateur_id = (SELECT id FROM utilisateur WHERE login = 'admin')",
    );
  }

  it('INST-11 : déconnexion → entrée absente', async () => {
    const cookie = await connecter('admin', 'admin');
    expect(origine.size).toBe(1);
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
    expect(res.statusCode).toBe(204);
    expect(origine.size).toBe(0);
  });

  it('INST-11 : expiration, GET /api/auth/me → 401, entrée absente, table session inchangée', async () => {
    const cookie = await connecter('admin', 'admin');
    await vieillir();
    expect(origine.size).toBe(1);
    const avant = await sessions();
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
    expect(origine.size).toBe(0);
    expect(await sessions()).toEqual(avant);
  });

  it('INST-11 : expiration, purge à la connexion d’un autre utilisateur → entrée absente', async () => {
    await connecter('admin', 'admin');
    await vieillir();
    expect(origine.size).toBe(1);
    await seedUser(pool.courant!, { email: 'autre@example.test', role: 'administrateur' });
    await connecter('autre@example.test', MOT_DE_PASSE);
    expect(origine.size).toBe(0);
    const { rows } = await pool.courant!.query(
      "SELECT 1 FROM session s JOIN utilisateur u ON u.id = s.utilisateur_id WHERE u.login = 'admin'",
    );
    expect(rows).toHaveLength(0);
  });
});
