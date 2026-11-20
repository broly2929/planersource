// Lot 5b, connexion (D-140 (2) et (3)) : AUTH-13 à AUTH-15.
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { verifyPassword } from '../src/auth/password.js';
import { loadConfig, type Config } from '../src/config.js';
import { nouveauLimiteur } from './lot5b-helpers.js';
import { MOT_DE_PASSE, seedUser, testConfig, useTestApp } from './helpers.js';

const QUINZE_MIN = 15 * 60 * 1000;

describe('Connexion : temps constant et limitation (D-140 (2), (3))', () => {
  const ctx = useTestApp();
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const a of apps.splice(0)) await a.close();
  });

  async function monter(extra: Record<string, unknown> = {}, config: object = testConfig()) {
    const appels: string[] = [];
    const deps = {
      pool: ctx.pool,
      config: config as Config,
      verifierMotDePasse: (hash: string, mdp: string) => {
        appels.push(hash);
        return verifyPassword(hash, mdp);
      },
      ...extra,
    };
    const app = buildApp(deps);
    apps.push(app);
    await app.ready();
    return { app, appels };
  }

  const tenter = (
    app: FastifyInstance,
    identifiant: string,
    motDePasse: string,
    entetes: Record<string, string> = {},
  ) =>
    app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant, mot_de_passe: motDePasse },
      headers: entetes,
    });

  const nbSessions = async () =>
    Number((await ctx.pool.query<{ n: string }>('SELECT count(*) AS n FROM session')).rows[0]!.n);

  it('AUTH-13 : identifiant inconnu, utilisateur inactif, mauvais mot de passe → 1 vérification chacun, 401 identiques', async () => {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    await seedUser(ctx.pool, { email: 'inactif@example.test', actif: false });
    const { app, appels } = await monter();

    const inconnu = await tenter(app, 'personne@example.test', MOT_DE_PASSE);
    expect(inconnu.statusCode).toBe(401);
    expect(appels).toHaveLength(1);
    expect(appels[0]).toMatch(/^\$argon2/);

    const inactif = await tenter(app, 'inactif@example.test', MOT_DE_PASSE);
    expect(inactif.statusCode).toBe(401);
    expect(appels).toHaveLength(2);

    const faux = await tenter(app, 'alice@example.test', 'mauvais');
    expect(faux.statusCode).toBe(401);
    expect(appels).toHaveLength(3);

    expect(inconnu.body).toBe(inactif.body);
    expect(inconnu.body).toBe(faux.body);
    expect(await nbSessions()).toBe(0);
  });

  describe('AUTH-14 : limitation des tentatives', () => {
    it('AUTH-14 : 5 échecs → 6e avec le bon mot de passe en 429 ; autre compte libre ; +15 min → libre', async () => {
      await seedUser(ctx.pool, { email: 'alice@example.test' });
      await seedUser(ctx.pool, { email: 'bob@example.test' });
      let t = 5_000_000;
      const limiteurConnexion = await nouveauLimiteur(() => t);
      const { app, appels } = await monter({ limiteurConnexion });

      for (let i = 0; i < 5; i += 1) {
        expect((await tenter(app, 'alice@example.test', 'faux')).statusCode).toBe(401);
      }
      const sessions = await nbSessions();
      const verifs = appels.length;
      const refus = await tenter(app, 'alice@example.test', MOT_DE_PASSE);
      expect(refus.statusCode).toBe(429);
      expect(refus.json()).toEqual({ erreur: 'Trop de tentatives' });
      expect(Number(refus.headers['retry-after'])).toBeGreaterThan(0);
      expect(refus.cookies).toHaveLength(0);
      expect(await nbSessions()).toBe(sessions);
      expect(appels).toHaveLength(verifs);

      expect((await tenter(app, 'bob@example.test', MOT_DE_PASSE)).statusCode).toBe(200);

      t += QUINZE_MIN;
      expect((await tenter(app, 'alice@example.test', MOT_DE_PASSE)).statusCode).toBe(200);
    });

    it('AUTH-14 : un identifiant inconnu est compté comme les autres', async () => {
      const limiteurConnexion = await nouveauLimiteur(() => 0);
      const { app } = await monter({ limiteurConnexion });
      for (let i = 0; i < 5; i += 1) {
        expect((await tenter(app, 'inconnu', 'x')).statusCode).toBe(401);
      }
      expect((await tenter(app, 'inconnu', 'x')).statusCode).toBe(429);
    });

    it('AUTH-14 : un corps invalide n’est pas compté', async () => {
      await seedUser(ctx.pool, { email: 'alice@example.test' });
      const limiteurConnexion = await nouveauLimiteur(() => 0);
      const { app } = await monter({ limiteurConnexion });
      for (let i = 0; i < 6; i += 1) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { identifiant: 'alice@example.test' },
        });
        expect(res.statusCode).toBe(401);
      }
      expect((await tenter(app, 'alice@example.test', MOT_DE_PASSE)).statusCode).toBe(200);
    });

    it('AUTH-14 : un succès remet à zéro la clé', async () => {
      await seedUser(ctx.pool, { email: 'alice@example.test' });
      const limiteurConnexion = await nouveauLimiteur(() => 0);
      const { app } = await monter({ limiteurConnexion });
      for (let i = 0; i < 4; i += 1) await tenter(app, 'alice@example.test', 'faux');
      expect((await tenter(app, 'alice@example.test', MOT_DE_PASSE)).statusCode).toBe(200);
      for (let i = 0; i < 4; i += 1) await tenter(app, 'alice@example.test', 'faux');
      expect((await tenter(app, 'alice@example.test', MOT_DE_PASSE)).statusCode).toBe(200);
    });

    it('AUTH-14 : limiteur par défaut de buildApp (horloge réelle)', async () => {
      await seedUser(ctx.pool, { email: 'alice@example.test' });
      const { app } = await monter();
      for (let i = 0; i < 5; i += 1) await tenter(app, 'alice@example.test', 'faux');
      const sessions = await nbSessions();
      const refus = await tenter(app, 'alice@example.test', MOT_DE_PASSE);
      expect(refus.statusCode).toBe(429);
      expect(await nbSessions()).toBe(sessions);
    });
  });

  describe('AUTH-15 : adresse IP et TRUST_PROXY', () => {
    it('AUTH-15 : trustProxy → X-Forwarded-For distingue les clients', async () => {
      await seedUser(ctx.pool, { email: 'alice@example.test' });
      const { app } = await monter({}, { ...testConfig(), trustProxy: true });
      const depuis = (ip: string, mdp: string) =>
        tenter(app, 'alice@example.test', mdp, { 'x-forwarded-for': ip });
      for (let i = 0; i < 5; i += 1) expect((await depuis('1.2.3.4', 'faux')).statusCode).toBe(401);
      expect((await depuis('1.2.3.4', MOT_DE_PASSE)).statusCode).toBe(429);
      expect((await depuis('5.6.7.8', MOT_DE_PASSE)).statusCode).toBe(200);
    });

    it('AUTH-15 : sans trustProxy, X-Forwarded-For est ignoré', async () => {
      await seedUser(ctx.pool, { email: 'alice@example.test' });
      const { app } = await monter();
      const depuis = (ip: string, mdp: string) =>
        tenter(app, 'alice@example.test', mdp, { 'x-forwarded-for': ip });
      for (let i = 0; i < 5; i += 1) expect((await depuis('1.2.3.4', 'faux')).statusCode).toBe(401);
      expect((await depuis('5.6.7.8', MOT_DE_PASSE)).statusCode).toBe(429);
    });

    it('AUTH-15 : loadConfig lit TRUST_PROXY', () => {
      const base = { DATABASE_URL: 'postgres://x/y', SESSION_SECRET: 'secret' };
      const lire = (env: Record<string, string>) =>
        (loadConfig({ ...base, ...env }) as unknown as { trustProxy?: boolean }).trustProxy;
      expect(lire({ TRUST_PROXY: '1' })).toBe(true);
      expect(lire({})).toBe(false);
      expect(lire({ TRUST_PROXY: '0' })).toBe(false);
      expect(lire({ TRUST_PROXY: 'oui' })).toBe(false);
    });
  });
});
