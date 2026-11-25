// Retours du déploiement 1 (D-227 (A)) : CAC-1 à CAC-5, en-têtes de cache du web servi par l'API.
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

describe('Cache du navigateur pour le web servi par l’API (D-227 (A))', () => {
  const ctx = useTestApp();
  let dossierWeb: string;
  let app: FastifyInstance;

  beforeAll(() => {
    dossierWeb = mkdtempSync(join(tmpdir(), 'planersource-cache-'));
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
    await app.close();
  });

  it('CAC-1 : GET / → no-cache, ETag, index.html', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['etag']).toBeTruthy();
    expect(res.body).toBe(INDEX);
  });

  it('CAC-2 : GET /projets/1 → no-cache, ETag, index.html', async () => {
    const res = await app.inject({ method: 'GET', url: '/projets/1' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['etag']).toBeTruthy();
    expect(res.body).toBe(INDEX);
  });

  it('CAC-3 : GET /assets/app.js → public, max-age=31536000, immutable', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/app.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.body).toBe(SCRIPT);
  });

  it('CAC-4 : GET /assets/absent.js → 404, sans repli ni immutable', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/absent.js' });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('index de test');
    expect(String(res.headers['cache-control'] ?? '')).not.toContain('immutable');
  });

  it('CAC-5 : réponses /api sans les en-têtes de cache du web', async () => {
    const inconnue = await app.inject({ method: 'GET', url: '/api/inconnue' });
    expect(inconnue.statusCode).toBe(404);
    expect(inconnue.headers['cache-control']).toBeUndefined();
    const sante = await app.inject({ method: 'GET', url: '/api/health' });
    const cc = String(sante.headers['cache-control'] ?? '');
    expect(cc).not.toContain('no-cache');
    expect(cc).not.toContain('immutable');
  });
});
