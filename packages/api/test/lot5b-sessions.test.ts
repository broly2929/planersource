// Lot 5b, retrait de l'indicateur « mot de passe d'origine » à la suppression des sessions
// par PATCH /api/utilisateurs/:id (D-140 (5) (d)) : INST-16.
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';
import type { SessionsOrigine } from '../src/auth/session.js';
import { MOT_DE_PASSE, login, seedUser, testConfig, useTestApp } from './helpers.js';

describe('Sessions : indicateur retiré à la suppression des sessions (D-140 (5) (d))', () => {
  const ctx = useTestApp();
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  async function preparer() {
    const origine: SessionsOrigine = new Set();
    app = buildApp({ pool: ctx.pool, config: testConfig(), sessionsOrigine: origine });
    await app.ready();
    const { rows } = await ctx.pool.query<{ id: number }>(
      `INSERT INTO utilisateur (nom, login, email, mot_de_passe_hash, role, actif)
       VALUES ('Administrateur', 'admin', NULL, $1, 'administrateur', true) RETURNING id`,
      [await hashPassword('admin')],
    );
    const idAdmin = rows[0]!.id;
    await seedUser(ctx.pool, { email: 'autre@example.test', role: 'administrateur' });
    const co = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant: 'admin', mot_de_passe: 'admin' },
    });
    expect(co.statusCode).toBe(200);
    expect(origine.size).toBe(1);
    const autre = await login(app, 'autre@example.test', MOT_DE_PASSE);
    expect(autre.status).toBe(200);
    return { origine, idAdmin, cookieAutre: autre.cookie! };
  }

  async function patcher(idAdmin: number, cookie: string, payload: Record<string, unknown>) {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/utilisateurs/${idAdmin}`,
      headers: { cookie },
      payload,
    });
    expect(res.statusCode).toBe(200);
  }

  async function sessionsDeAdmin(): Promise<number> {
    const { rows } = await ctx.pool.query(
      "SELECT 1 FROM session s JOIN utilisateur u ON u.id = s.utilisateur_id WHERE u.login = 'admin'",
    );
    return rows.length;
  }

  it('INST-16 : changement de mot de passe par un autre administrateur → ensemble vide', async () => {
    const { origine, idAdmin, cookieAutre } = await preparer();
    await patcher(idAdmin, cookieAutre, { mot_de_passe: 'nouveau-mot-de-passe' });
    expect(await sessionsDeAdmin()).toBe(0);
    expect(origine.size).toBe(0);
  });

  it('INST-16 : changement de rôle → ensemble vide', async () => {
    const { origine, idAdmin, cookieAutre } = await preparer();
    await patcher(idAdmin, cookieAutre, { role: 'chef_de_projet' });
    expect(await sessionsDeAdmin()).toBe(0);
    expect(origine.size).toBe(0);
  });

  it('INST-16 : désactivation → ensemble vide', async () => {
    const { origine, idAdmin, cookieAutre } = await preparer();
    await patcher(idAdmin, cookieAutre, { actif: false });
    expect(await sessionsDeAdmin()).toBe(0);
    expect(origine.size).toBe(0);
  });
});
