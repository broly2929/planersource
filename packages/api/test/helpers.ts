import argon2 from 'argon2';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, expect } from 'vitest';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { migrate } from '../src/db/migrate.js';

export const MOT_DE_PASSE = 'motdepasse-de-test';

export function testDbUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  return url;
}

export function testConfig(nodeEnv = 'development'): Config {
  return {
    databaseUrl: testDbUrl(),
    port: 0,
    sessionSecret: 'secret-de-test-au-moins-32-caracteres!!',
    nodeEnv,
  };
}

/** Remet la base de test à zéro, puis (par défaut) applique les migrations. */
export async function resetDb(pool: pg.Pool, opts: { migrate?: boolean } = {}): Promise<void> {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');
  if (opts.migrate ?? true) await migrate(pool);
}

export type Role = 'administrateur' | 'chef_de_projet' | 'ressource';

export interface SeedUser {
  nom?: string;
  email: string;
  role?: Role;
  actif?: boolean;
}

let hashEnCache: Promise<string> | undefined;

/** Hachage du mot de passe de test, calculé une seule fois par processus. */
function hashDeTest(): Promise<string> {
  hashEnCache ??= argon2.hash(MOT_DE_PASSE);
  return hashEnCache;
}

export async function seedUser(pool: pg.Pool, u: SeedUser): Promise<number> {
  const hash = await hashDeTest();
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
     VALUES ($1, $2, $3, $4, false, 1, $5) RETURNING id`,
    [u.nom ?? 'Test', u.email, hash, u.role ?? 'ressource', u.actif ?? true],
  );
  return rows[0]!.id;
}

export interface TestCtx {
  pool: pg.Pool;
  app: FastifyInstance;
}

/** Une base remise à zéro et une application neuve avant chaque test (horloge optionnelle). */
export function useTestApp(horloge?: () => string): TestCtx {
  const ctx = {} as TestCtx;
  beforeAll(() => {
    ctx.pool = new pg.Pool({ connectionString: testDbUrl() });
  });
  beforeEach(async () => {
    await resetDb(ctx.pool);
    ctx.app = buildApp({
      pool: ctx.pool,
      config: testConfig(),
      ...(horloge ? { aujourdhui: horloge } : {}),
    });
    await ctx.app.ready();
  });
  afterEach(async () => {
    await ctx.app.close();
  });
  afterAll(async () => {
    await ctx.pool.end();
  });
  return ctx;
}

export const SESSION_COOKIE = 'session';

export async function login(
  app: FastifyInstance,
  email: string,
  motDePasse = MOT_DE_PASSE,
): Promise<{ status: number; cookie: string | undefined; value: string | undefined }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, mot_de_passe: motDePasse },
  });
  const c = res.cookies.find((x) => x.name === SESSION_COOKIE);
  return {
    status: res.statusCode,
    cookie: c ? `${c.name}=${c.value}` : undefined,
    value: c?.value,
  };
}

/** Relevé d'une table : une chaîne par ligne (toutes les colonnes), triée (D-142 (2)). */
export async function releve(ctx: TestCtx, table: string): Promise<string[]> {
  const { rows } = await ctx.pool.query<{ ligne: string }>(
    `SELECT t::text AS ligne FROM ${table} t ORDER BY 1`,
  );
  return rows.map((r) => r.ligne);
}

/**
 * Envoie une requête qui doit être refusée : relève les tables avant, vérifie le code, relit les
 * tables après et exige des lignes et des valeurs identiques (D-142 (2)).
 */
export async function refusSansEffet(
  ctx: TestCtx,
  tables: string[],
  statut: number,
  requete: () => Promise<LightMyRequestResponse>,
  libelle = '',
): Promise<void> {
  const avant = await Promise.all(tables.map((t) => releve(ctx, t)));
  const res = await requete();
  expect(res.statusCode, libelle).toBe(statut);
  const apres = await Promise.all(tables.map((t) => releve(ctx, t)));
  tables.forEach((t, i) => {
    expect(apres[i], `table ${t} inchangée ${libelle}`.trim()).toEqual(avant[i]);
  });
}
