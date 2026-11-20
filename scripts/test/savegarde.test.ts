import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const BACKUP = new URL('../backup.sh', import.meta.url).pathname;
const RESTORE = new URL('../restore.sh', import.meta.url).pathname;
const ROOT_ENV = new URL('../../.env', import.meta.url).pathname;
if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV);

const TEST_URL = process.env.TEST_DATABASE_URL ?? '';
const withDb = (url: string, name: string) => {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
};
// Le test crée et supprime ses propres bases ; il n'ouvre jamais planersource_test ni planersource.
const SOURCE_DB = 'planersource_backup_test';
const TARGET_DB = 'planersource_restore_test';

// Garde-fou : ne jamais toucher une base dont le nom ne finit pas par _test.
if (!TEST_URL || !new URL(TEST_URL).pathname.slice(1).endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
}
for (const name of [SOURCE_DB, TARGET_DB]) {
  if (!name.endsWith('_test')) throw new Error(`Base refusée : ${name}`);
}
const ADMIN_URL = withDb(TEST_URL, 'postgres');
const SOURCE_URL = withDb(TEST_URL, SOURCE_DB);
const TARGET_URL = withDb(TEST_URL, TARGET_DB);

function sh(cmd: string, args: string[], env: Record<string, string> = {}, input = '') {
  const r = spawnSync(cmd, args, { encoding: 'utf8', input, env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '' };
}

describe('Sauvegarde et restauration', () => {
  let admin: pg.Client;
  let source: pg.Pool;
  let target: pg.Pool;
  const dir = mkdtempSync(join(tmpdir(), 'ps-backup-'));

  async function recreateTarget() {
    await target?.end().catch(() => undefined);
    await admin.query(`DROP DATABASE IF EXISTS ${TARGET_DB}`);
    await admin.query(`CREATE DATABASE ${TARGET_DB}`);
    target = new pg.Pool({ connectionString: TARGET_URL });
  }

  /** Base source : schema_version (sauf si `sansVersion`) et deux « utilisateurs ». */
  async function seedSource(sansVersion = false) {
    await source.query('DROP SCHEMA public CASCADE');
    await source.query('CREATE SCHEMA public');
    if (!sansVersion) {
      await source.query('CREATE TABLE schema_version (version integer PRIMARY KEY)');
      await source.query('INSERT INTO schema_version VALUES (1)');
    }
    await source.query('CREATE TABLE utilisateur (id serial PRIMARY KEY, email text NOT NULL)');
    await source.query(
      "INSERT INTO utilisateur (email) VALUES ('a@example.test'), ('b@example.test')",
    );
  }

  const dump = (file: string) => sh('pg_dump', ['-Fc', '-f', file, SOURCE_URL]);
  const tables = async (p: pg.Pool) =>
    (await p.query("SELECT 1 FROM pg_tables WHERE schemaname = 'public'")).rowCount;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${SOURCE_DB}`);
    await admin.query(`CREATE DATABASE ${SOURCE_DB}`);
    source = new pg.Pool({ connectionString: SOURCE_URL });
  });
  // DROP et CREATE DATABASE lents sur la suite complète : délai du hook à 30 s (SAV-2, SAV-3, D-127 (1)).
  beforeEach(async () => {
    await seedSource();
    await recreateTarget();
  }, 30_000);
  afterAll(async () => {
    await target?.end();
    await source.end();
    await admin.query(`DROP DATABASE IF EXISTS ${SOURCE_DB}`);
    await admin.query(`DROP DATABASE IF EXISTS ${TARGET_DB}`);
    await admin.end();
  });

  it('SAV-1 : backup.sh produit un fichier horodaté au format personnalisé', () => {
    const r = sh('bash', [BACKUP], { DATABASE_URL: SOURCE_URL, BACKUP_DIR: dir });
    expect(r.code, r.err).toBe(0);
    const file = r.out.trim().split('\n').pop() ?? '';
    expect(file).not.toBe('');
    expect(existsSync(file)).toBe(true);
    expect(basename(file)).toMatch(/^planersource-\d{8}-\d{6}\.dump$/);
    expect(readFileSync(file).subarray(0, 5).toString()).toBe('PGDMP');
  });

  it('SAV-2 : restore.sh sans confirmation → rien n’est restauré', async () => {
    const file = join(dir, 'sav2.dump');
    expect(dump(file).code).toBe(0);
    const r = sh('bash', [RESTORE, file], { DATABASE_URL: TARGET_URL }, '');
    expect(r.code).not.toBe(0);
    expect(await tables(target)).toBe(0);
  });

  it('SAV-3 : restore.sh sur une base non vide → refus', async () => {
    const file = join(dir, 'sav3.dump');
    expect(dump(file).code).toBe(0);
    await target.query('CREATE TABLE existant (x integer)');
    const r = sh('bash', [RESTORE, file], { DATABASE_URL: TARGET_URL }, 'oui\n');
    expect(r.code).not.toBe(0);
    expect(await tables(target)).toBe(1);
  });

  it('SAV-4 : backup puis restore dans une base vide → mêmes utilisateurs', async () => {
    const b = sh('bash', [BACKUP], { DATABASE_URL: SOURCE_URL, BACKUP_DIR: dir });
    expect(b.code, b.err).toBe(0);
    const file = b.out.trim().split('\n').pop() ?? '';
    expect(existsSync(file)).toBe(true);
    const r = sh('bash', [RESTORE, file], { DATABASE_URL: TARGET_URL }, 'oui\n');
    expect(r.code, r.err).toBe(0);
    const { rows } = await target.query('SELECT email FROM utilisateur ORDER BY email');
    expect(rows.map((x) => x.email)).toEqual(['a@example.test', 'b@example.test']);
  });

  it('SAV-5 : fichier sans table schema_version → refus', async () => {
    await seedSource(true);
    const file = join(dir, 'sav5.dump');
    expect(dump(file).code).toBe(0);
    const r = sh('bash', [RESTORE, file], { DATABASE_URL: TARGET_URL }, 'oui\n');
    expect(r.code).not.toBe(0);
    expect(r.err).toContain('schema_version');
    expect(await tables(target)).toBe(0);
  });
});
