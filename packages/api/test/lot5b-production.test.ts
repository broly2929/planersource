// Lot 5b, mode production (D-140 (5) (b) et (c)) : INST-14, INST-15.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { MOT_DE_PASSE, login, seedUser, testConfig, useTestApp } from './helpers.js';

const INDEX =
  '<!doctype html><html><head><title>Planersource</title></head><body>index de test</body></html>';
const SCRIPT = 'console.log("app de test");\n';

describe('Mode production : chemins statiques (D-140 (5))', () => {
  const ctx = useTestApp();
  let dossierWeb: string;
  let app: FastifyInstance;

  beforeAll(() => {
    dossierWeb = mkdtempSync(join(tmpdir(), 'planersource-web-5b-'));
    writeFileSync(join(dossierWeb, 'index.html'), INDEX);
    mkdirSync(join(dossierWeb, 'assets'));
    writeFileSync(join(dossierWeb, 'assets', 'app.js'), SCRIPT);
  });

  afterAll(() => {
    rmSync(dossierWeb, { recursive: true, force: true });
  });

  beforeEach(async () => {
    app = buildApp({ pool: ctx.pool, config: testConfig('production'), dossierWeb });
    await app.ready();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('INST-14 : /assets/absent.js → 404, jamais index.html ; témoin : /projets/12 → index.html', async () => {
    const absent = await app.inject({ method: 'GET', url: '/assets/absent.js' });
    expect(absent.statusCode).toBe(404);
    expect(absent.body).not.toBe(INDEX);
    expect(absent.body).not.toContain('index de test');
    // Sans extension (sirv replie sur index.html) : même refus.
    for (const adresse of ['/assets/absent', '/assets/sous/absent']) {
      const res = await app.inject({ method: 'GET', url: adresse });
      expect(res.statusCode, adresse).toBe(404);
      expect(res.body, adresse).not.toContain('index de test');
    }

    const route = await app.inject({ method: 'GET', url: '/projets/12' });
    expect(route.statusCode).toBe(200);
    expect(route.body).toBe(INDEX);
  });

  it('INST-15 : avec cookie de session, aucun fichier statique ni index.html ne touche la base', async () => {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    const { cookie } = await login(app, 'alice@example.test', MOT_DE_PASSE);
    expect(cookie).toBeDefined();
    const espion = vi.spyOn(ctx.pool, 'query');

    for (const adresse of ['/projets/12', '/assets/app.js']) {
      const res = await app.inject({ method: 'GET', url: adresse, headers: { cookie: cookie! } });
      expect(res.statusCode, adresse).toBe(200);
    }
    expect(espion).toHaveBeenCalledTimes(0);

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookie! },
    });
    expect(me.statusCode).toBe(200);
    expect(espion.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
