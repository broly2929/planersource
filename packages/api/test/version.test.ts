// Lot version (D-231, SPEC §13) : VER-1 à VER-7.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { releve, testConfig, useTestApp } from './helpers.js';

const RACINE = resolve(import.meta.dirname, '../../..');
const lire = (f: string): string => readFileSync(resolve(RACINE, f), 'utf8');
const VERSION = (JSON.parse(lire('package.json')) as { version: string }).version;

describe('Version de l’application (D-231)', () => {
  const ctx = useTestApp();
  let app: FastifyInstance | undefined;
  const commitInitial = process.env['COMMIT'];

  async function demarrer(commit?: string): Promise<FastifyInstance> {
    if (commit === undefined) delete process.env['COMMIT'];
    else process.env['COMMIT'] = commit;
    app = buildApp({ pool: ctx.pool, config: testConfig() });
    await app.ready();
    return app;
  }

  beforeEach(() => {
    app = undefined;
  });
  afterEach(async () => {
    await app?.close();
    if (commitInitial === undefined) delete process.env['COMMIT'];
    else process.env['COMMIT'] = commitInitial;
  });

  it('VER-1 : GET /api/version sans session → version du package.json racine, commit de COMMIT', async () => {
    const a = await demarrer('abc1234');
    const res = await a.inject({ method: 'GET', url: '/api/version' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ version: VERSION, commit: 'abc1234' });
  });

  it('VER-2 : sans COMMIT → commit « inconnu »', async () => {
    const a = await demarrer();
    const res = await a.inject({ method: 'GET', url: '/api/version' });
    expect(res.json()).toEqual({ version: VERSION, commit: 'inconnu' });
  });

  it('VER-3 : en-tête X-PlanerSource-Version sur une réponse 200', async () => {
    const a = await demarrer('abc1234');
    const res = await a.inject({ method: 'GET', url: '/api/version' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-planersource-version']).toBe(VERSION);
  });

  it('VER-4 : en-tête sur une réponse 401 ; base inchangée', async () => {
    const a = await demarrer('abc1234');
    const avant = await releve(ctx, 'utilisateur');
    const res = await a.inject({ method: 'GET', url: '/api/projets' });
    expect(res.statusCode).toBe(401);
    expect(res.headers['x-planersource-version']).toBe(VERSION);
    expect(await releve(ctx, 'utilisateur')).toEqual(avant);
  });

  it('VER-5 : en-tête sur une réponse 404 d’une route /api inconnue', async () => {
    const a = await demarrer('abc1234');
    const res = await a.inject({ method: 'GET', url: '/api/inconnue' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['x-planersource-version']).toBe(VERSION);
  });

  it('VER-6 : version X.Y.Z, identique dans package.json et package-lock.json', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Number(VERSION.split('.')[0])).toBeGreaterThanOrEqual(1); // départ 1.0.0 (§13 point 1)
    const lock = JSON.parse(lire('package-lock.json')) as {
      version: string;
      packages: Record<string, { version?: string }>;
    };
    expect(lock.version).toBe(VERSION);
    expect(lock.packages['']?.version).toBe(VERSION);
  });

  it('VER-7 : Dockerfile et docker-compose.yml transmettent COMMIT', () => {
    const dockerfile = lire('Dockerfile');
    expect(dockerfile.match(/^ARG COMMIT=inconnu$/gm)?.length).toBe(2);
    expect(dockerfile).toMatch(/^ENV COMMIT=\$COMMIT$/m);
    const compose = lire('docker-compose.yml');
    expect(compose).toMatch(/args:\s*\n\s*COMMIT: \$\{COMMIT:-inconnu\}/);
  });
});
