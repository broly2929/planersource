// Lot 6a (D-147 (2)) : migration 013. MIG-9. Valeurs recopiées de D-147 (2).
import { copyFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, migrate } from '../src/db/migrate.js';
import { resetDb, testDbUrl } from './helpers.js';

describe('Lot 6a : migration 013 (D-147 (2))', () => {
  let pool: pg.Pool;
  beforeAll(() => {
    pool = new pg.Pool({ connectionString: testDbUrl() });
  });
  beforeEach(async () => {
    await resetDb(pool, { migrate: false });
  });
  afterAll(async () => {
    await pool.end();
  });

  it('MIG-9 : table equipe, utilisateur.equipe_id nul, unicité sans casse, longueur 1 à 100, clé étrangère', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-migrations-012-'));
    for (const f of readdirSync(MIGRATIONS_DIR).filter((n) => Number(n.slice(0, 3)) <= 12)) {
      copyFileSync(join(MIGRATIONS_DIR, f), join(dir, f));
    }
    expect((await migrate(pool, dir)).applied).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const email of ['a@example.test', 'b@example.test']) {
      await pool.query(
        `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
         VALUES ('U', $1, 'x', 'ressource', false, 1, true)`,
        [email],
      );
    }

    const versionsApres12 = readdirSync(MIGRATIONS_DIR)
      .filter((n) => /^\d{3}_.+\.sql$/.test(n))
      .map((n) => Number(n.slice(0, 3)))
      .filter((v) => v > 12)
      .sort((a, b) => a - b);
    expect((await migrate(pool)).applied).toEqual(versionsApres12);
    expect(versionsApres12[0]).toBe(13);
    const versions = (
      await pool.query<{ version: number }>('SELECT version FROM schema_version ORDER BY version')
    ).rows.map((r) => r.version);
    expect(versions).toEqual(
      readdirSync(MIGRATIONS_DIR)
        .filter((n) => /^\d{3}_.+\.sql$/.test(n))
        .map((n) => Number(n.slice(0, 3)))
        .sort((a, b) => a - b),
    );

    const cols = await pool.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'equipe' ORDER BY column_name",
    );
    expect(cols.rows.map((c) => c.column_name)).toEqual(['id', 'nom']);
    const anciens = await pool.query<{ equipe_id: number | null }>(
      'SELECT equipe_id FROM utilisateur ORDER BY id',
    );
    expect(anciens.rows).toEqual([{ equipe_id: null }, { equipe_id: null }]);

    const creer = (nom: string) => pool.query('INSERT INTO equipe (nom) VALUES ($1)', [nom]);
    await creer('Atelier');
    await expect(creer('ATELIER')).rejects.toThrow();
    await expect(creer('')).rejects.toThrow();
    await expect(creer('x'.repeat(101))).rejects.toThrow();
    await creer('x'.repeat(100));
    expect((await pool.query('SELECT count(*)::int AS n FROM equipe')).rows[0].n).toBe(2);

    await expect(pool.query('UPDATE utilisateur SET equipe_id = 99999')).rejects.toThrow();
    const { rows } = await pool.query<{ id: number }>(
      "SELECT id FROM equipe WHERE nom = 'Atelier'",
    );
    await pool.query('UPDATE utilisateur SET equipe_id = $1 WHERE email = $2', [
      rows[0]!.id,
      'a@example.test',
    ]);
    await expect(pool.query('DELETE FROM equipe WHERE id = $1', [rows[0]!.id])).rejects.toThrow();
    expect((await pool.query('SELECT count(*)::int AS n FROM equipe')).rows[0].n).toBe(2);
  });
});
