import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';

export const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url).pathname;

export interface MigrateResult {
  /** Versions appliquées pendant cet appel. */
  applied: number[];
}

interface Migration {
  version: number;
  nom: string;
  file: string;
}

function listMigrations(dir: string): Migration[] {
  return readdirSync(dir)
    .flatMap((file) => {
      const m = /^(\d+)_(.+)\.sql$/.exec(file);
      return m ? [{ version: Number(m[1]), nom: m[2]!, file: join(dir, file) }] : [];
    })
    .sort((a, b) => a.version - b.version);
}

/**
 * Applique les migrations manquantes, chacune dans sa propre transaction.
 * Refuse de démarrer si la base est plus récente que l'application.
 */
export async function migrate(pool: pg.Pool, dir: string = MIGRATIONS_DIR): Promise<MigrateResult> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_version (
       version integer PRIMARY KEY,
       nom text NOT NULL,
       applique_le timestamptz NOT NULL DEFAULT now())`,
  );
  const done = await pool.query<{ version: number }>('SELECT version FROM schema_version');
  const appliedVersions = new Set(done.rows.map((r) => r.version));
  const migrations = listMigrations(dir);
  const latest = migrations.at(-1)?.version ?? 0;
  const dbVersion = Math.max(0, ...appliedVersions);
  if (dbVersion > latest) {
    throw new Error(
      `La base (version ${dbVersion}) est plus récente que l'application (version ${latest}) : démarrage refusé.`,
    );
  }

  const applied: number[] = [];
  for (const m of migrations) {
    if (appliedVersions.has(m.version)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(readFileSync(m.file, 'utf8'));
      await client.query('INSERT INTO schema_version (version, nom) VALUES ($1, $2)', [
        m.version,
        m.nom,
      ]);
      await client.query('COMMIT');
      applied.push(m.version);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return { applied };
}
