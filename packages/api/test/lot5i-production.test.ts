// Lot 5i, mode production (D-138 (1)) : INST-1 à INST-4.
// L'API sert un dossier web compilé (ici un dossier de test) et renvoie index.html hors /api.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { useTestApp, testConfig } from './helpers.js';

const INDEX =
  '<!doctype html><html><head><title>Planersource</title></head><body>index de test</body></html>';
const SCRIPT = 'console.log("app de test");\n';

describe('Mode production : web compilé servi par l’API (D-138 (1))', () => {
  const ctx = useTestApp();
  let dossierWeb: string;
  let app: FastifyInstance;

  beforeAll(() => {
    dossierWeb = mkdtempSync(join(tmpdir(), 'planersource-web-'));
    writeFileSync(join(dossierWeb, 'index.html'), INDEX);
    mkdirSync(join(dossierWeb, 'assets'));
    writeFileSync(join(dossierWeb, 'assets', 'app.js'), SCRIPT);
  });

  afterAll(() => {
    rmSync(dossierWeb, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Variable intermédiaire : l'option `dossierWeb` n'existe pas encore dans AppDeps (phase rouge).
    const deps = { pool: ctx.pool, config: testConfig('production'), dossierWeb };
    app = buildApp(deps);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('INST-1 : GET / → 200, text/html, index.html', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.body).toBe(INDEX);
  });

  it('INST-2 : GET /projets/12 → 200, text/html, index.html', async () => {
    const res = await app.inject({ method: 'GET', url: '/projets/12' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.body).toBe(INDEX);
  });

  it('INST-3 : GET /api/inconnue → 404 JSON, jamais index.html', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/inconnue' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.body).not.toContain('index de test');
    expect(() => res.json()).not.toThrow();
  });

  it('INST-4 : GET /assets/app.js → 200, type JavaScript, le fichier', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/app.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^(text|application)\/javascript/);
    expect(res.body).toBe(SCRIPT);
  });
});
