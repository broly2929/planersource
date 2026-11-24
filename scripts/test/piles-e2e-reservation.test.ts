import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exigerBaseTest } from '../lib/garde-base-test.mjs';
import { RACINE } from './outillage-helpers.js';

// E2P-10 (D-199 (14)) : réservation du registre avant la préparation, arrêt en mode propriétaire.
const pe = () => import('../lib/piles-e2e.mjs');
const FAMILLE = 'essaie2pr';
const MODULE = pathToFileURL(join(RACINE, 'scripts/lib/piles-e2e.mjs')).href;

const envRacine = join(RACINE, '.env');
if (existsSync(envRacine)) process.loadEnvFile(envRacine);

describe('E2P-10 réservation du registre au démarrage', () => {
  const maintenance = exigerBaseTest(process.env);
  let admin: pg.Client;
  let premier: ChildProcess | undefined;
  const base = `planersource_${FAMILLE}_w1_test`;
  const bases = async () =>
    (
      await admin.query<{ datname: string }>('SELECT datname FROM pg_database WHERE datname = $1', [
        base,
      ])
    ).rows.length;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: maintenance });
    await admin.connect();
  });
  afterAll(async () => {
    if (premier?.pid) premier.kill('SIGKILL');
    await admin.query(`DROP DATABASE IF EXISTS ${base} WITH (FORCE)`);
    await admin.query(`DROP DATABASE IF EXISTS planersource_${FAMILLE}m_modele_test WITH (FORCE)`);
    await admin.end();
  });

  it('un premier lanceur en préparation réserve le registre ; un second démarrage est refusé, rien du premier n’est touché', async () => {
    const { nettoyerPiles, arreterPiles } = await pe();
    const { preparerModele } = await import('../lib/bases-worker.mjs');
    await preparerModele(maintenance, {
      famille: `${FAMILLE}m`,
      empreinte: 'e2p-10',
      migrer: async () => {},
    });
    const d = mkdtempSync(join(tmpdir(), 'e2p10-'));
    const registre = join(d, 'registre.json');
    const script = join(d, 'premier.mjs');
    writeFileSync(
      script,
      [
        `import { reserverRegistre, recreerBaseWorker } from ${JSON.stringify(MODULE)};`,
        `reserverRegistre(${JSON.stringify(registre)});`,
        `await recreerBaseWorker(${JSON.stringify(maintenance)}, { famille: '${FAMILLE}', familleModele: '${FAMILLE}m', n: 1 });`,
        `console.log('en preparation');`,
        `setInterval(() => {}, 1000);`,
      ].join('\n'),
    );
    premier = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'inherit'] });
    const pret = await new Promise<boolean>((ok) => {
      premier!.stdout!.on(
        'data',
        (b: Buffer) => b.toString().includes('en preparation') && ok(true),
      );
      premier!.on('exit', () => ok(false));
    });
    expect(pret).toBe(true);
    const avant = readFileSync(registre, 'utf8');
    expect(JSON.parse(avant).lanceur.pid).toBe(premier.pid);

    await expect(
      nettoyerPiles({ registre, urlMaintenance: maintenance, famille: FAMILLE, ports: [] }),
    ).rejects.toThrow(String(premier.pid));
    await arreterPiles({
      registre,
      urlMaintenance: maintenance,
      famille: FAMILLE,
      proprietaire: true,
    });
    expect(await bases()).toBe(1);
    expect(readFileSync(registre, 'utf8')).toBe(avant);
  }, 30000);

  it('réservation exclusive : un registre déjà présent est un refus', async () => {
    const { reserverRegistre } = await pe();
    const registre = join(mkdtempSync(join(tmpdir(), 'e2p10b-')), 'registre.json');
    reserverRegistre(registre);
    expect(JSON.parse(readFileSync(registre, 'utf8')).lanceur.pid).toBe(process.pid);
    expect(() => reserverRegistre(registre)).toThrow(/registre/);
  });

  it('global-setup réserve après nettoyerPiles et avant preparerModele, et arrête en mode propriétaire', () => {
    const t = readFileSync(join(RACINE, 'e2e/global-setup.ts'), 'utf8');
    const corps = t.slice(t.indexOf('export default async function globalSetup'));
    const iN = corps.indexOf('await nettoyerPiles(');
    const iR = corps.indexOf('reserverRegistre(');
    const iP = corps.indexOf('await preparerModele(');
    expect(iN).toBeGreaterThan(-1);
    expect(iR).toBeGreaterThan(iN);
    expect(iP).toBeGreaterThan(iR);
    expect(corps).toMatch(/arreterPiles\(\{[^}]*proprietaire: true/);
  });
});
