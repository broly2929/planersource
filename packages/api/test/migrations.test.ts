import { copyFileSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, migrate } from '../src/db/migrate.js';
import { resetDb, testDbUrl, useTestApp } from './helpers.js';
import { appel, corps } from './lot1-helpers.js';
import { creerDependance, creerActivite, url } from './lot1-t2-helpers.js';
import { creerMonde, empreinte } from './lot2a-helpers.js';

function migrationsDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'ps-migrations-'));
  for (const [name, sql] of Object.entries(files)) writeFileSync(join(dir, name), sql);
  return dir;
}

/** Versions des fichiers NNN_nom.sql du dépôt, triées. */
function versionsDepot(): number[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((n) => /^\d{3}_.+\.sql$/.test(n))
    .map((n) => Number(n.slice(0, 3)))
    .sort((a, b) => a - b);
}

const OK = {
  '001_a.sql': 'CREATE TABLE a (x integer);',
  '002_b.sql': 'CREATE TABLE b (x integer);',
};

describe('Schéma et migrations', () => {
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

  /** Versions enregistrées ; liste vide si schema_version n'existe pas. */
  async function versions(): Promise<number[]> {
    const t = await pool.query("SELECT to_regclass('schema_version') AS t");
    if (t.rows[0]?.t === null) return [];
    const { rows } = await pool.query<{ version: number }>(
      'SELECT version FROM schema_version ORDER BY version',
    );
    return rows.map((r) => r.version);
  }

  it('MIG-1 : sur base vide, applique les migrations et renseigne schema_version', async () => {
    const res = await migrate(pool, migrationsDir(OK));
    expect(res.applied).toEqual([1, 2]);
    expect(await versions()).toEqual([1, 2]);

    await resetDb(pool, { migrate: false });
    await migrate(pool); // migrations réelles du dépôt
    const { rows } = await pool.query("SELECT to_regclass('schema_version') AS t");
    expect(rows[0]?.t).not.toBeNull();
  });

  it('MIG-2 : base plus récente que l’application → refus, message explicite', async () => {
    await pool.query(
      `CREATE TABLE schema_version (
         version integer PRIMARY KEY, nom text NOT NULL,
         applique_le timestamptz NOT NULL DEFAULT now())`,
    );
    await pool.query("INSERT INTO schema_version (version, nom) VALUES (5, 'future')");
    await expect(migrate(pool, migrationsDir(OK))).rejects.toThrow(/plus récente/);
  });

  it('MIG-3 : deuxième démarrage → aucune migration rejouée', async () => {
    const dir = migrationsDir(OK);
    expect((await migrate(pool, dir)).applied).toEqual([1, 2]);
    const avant = await pool.query('SELECT version, applique_le FROM schema_version ORDER BY 1');
    expect((await migrate(pool, dir)).applied).toEqual([]);
    const apres = await pool.query('SELECT version, applique_le FROM schema_version ORDER BY 1');
    expect(apres.rows).toEqual(avant.rows);
  });

  it('MIG-4 : migration en échec → annulée en entier, schema_version inchangé', async () => {
    // Cas 1 : une seule migration, en échec → table absente, aucune version enregistrée.
    const seule = migrationsDir({ '001_ko.sql': 'CREATE TABLE b (x integer); SELECT pas_du_sql;' });
    await expect(migrate(pool, seule)).rejects.toThrow();
    expect((await pool.query("SELECT to_regclass('b') AS t")).rows[0]?.t).toBeNull();
    expect(await versions()).toEqual([]);

    // Cas 2 : 001 valide puis 002 en échec → 001 reste appliquée, 002 annulée.
    await resetDb(pool, { migrate: false });
    const deux = migrationsDir({
      '001_a.sql': 'CREATE TABLE a (x integer);',
      '002_ko.sql': 'CREATE TABLE b (x integer); SELECT pas_du_sql;',
    });
    await expect(migrate(pool, deux)).rejects.toThrow();
    expect(await versions()).toEqual([1]);
    expect((await pool.query("SELECT to_regclass('a') AS t")).rows[0]?.t).not.toBeNull();
    expect((await pool.query("SELECT to_regclass('b') AS t")).rows[0]?.t).toBeNull();
  });

  it('MIG-5-r2 : migration 008 : travail_planifie (contraintes, cascades), drapeaux de jalon, dates planifiées de projet', async () => {
    await migrate(pool);
    expect(await versions()).toEqual(versionsDepot());

    const un = async (sql: string, params: unknown[] = []): Promise<number> =>
      Number(((await pool.query<{ id: number }>(sql, params)).rows[0] as { id: number }).id);
    const chef = await un(
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
       VALUES ('Chef', 'chef@example.test', 'x', 'chef_de_projet', true, 1, true) RETURNING id`,
    );
    const projet = await un(
      `INSERT INTO projet (code, nom, chef_id, date_debut)
       VALUES ('P', 'P', $1, '2027-01-04') RETURNING id`,
      [chef],
    );
    await pool.query('INSERT INTO affectation_projet (projet_id, ressource_id) VALUES ($1, $2)', [
      projet,
      chef,
    ]);
    const assigner = async (): Promise<number> => {
      const element = await un(
        `INSERT INTO element (projet_id, type, rang, nom)
         VALUES ($1, 'activite', (SELECT count(*) + 1 FROM element), 'A') RETURNING id`,
        [projet],
      );
      await pool.query('INSERT INTO activite (id) VALUES ($1)', [element]);
      return un(
        `INSERT INTO assignation (activite_id, projet_id, ressource_id, charge_assignee, reste_a_faire)
         VALUES ($1, $2, $3, 1, 1) RETURNING id`,
        [element, projet, chef],
      );
    };
    const a1 = await assigner();
    const ajouter = (assignation: number, jour: string, charge: number) =>
      pool.query(
        'INSERT INTO travail_planifie (assignation_id, jour, charge) VALUES ($1, $2, $3)',
        [assignation, jour, charge],
      );

    await expect(ajouter(a1, '2027-01-04', 0)).rejects.toThrow();
    await expect(ajouter(a1, '2027-01-04', -1)).rejects.toThrow();
    await ajouter(a1, '2027-01-04', 1);
    await expect(ajouter(a1, '2027-01-04', 1)).rejects.toThrow();
    await expect(ajouter(999999, '2027-01-05', 1)).rejects.toThrow();
    const { rows } = await pool.query('SELECT surcharge FROM travail_planifie');
    expect(rows).toEqual([{ surcharge: false }]);

    await ajouter(a1, '2027-01-05', 1);
    await pool.query('DELETE FROM assignation WHERE id = $1', [a1]);
    expect((await pool.query('SELECT 1 FROM travail_planifie')).rows).toHaveLength(0);

    const a2 = await assigner();
    await ajouter(a2, '2027-01-04', 1);
    await pool.query('DELETE FROM projet WHERE id = $1', [projet]);
    expect((await pool.query('SELECT 1 FROM travail_planifie')).rows).toHaveLength(0);

    const p2 = await un(
      `INSERT INTO projet (code, nom, chef_id, date_debut)
       VALUES ('Q', 'Q', $1, '2027-01-04') RETURNING id`,
      [chef],
    );
    const jalon = await un(
      `INSERT INTO element (projet_id, type, rang, nom) VALUES ($1, 'jalon', 1, 'J') RETURNING id`,
      [p2],
    );
    await pool.query('INSERT INTO jalon (id) VALUES ($1)', [jalon]);
    expect((await pool.query('SELECT drapeaux FROM jalon WHERE id = $1', [jalon])).rows).toEqual([
      { drapeaux: [] },
    ]);
    expect(
      (await pool.query('SELECT debut_planifie, fin_planifiee FROM projet WHERE id = $1', [p2]))
        .rows,
    ).toEqual([{ debut_planifie: null, fin_planifiee: null }]);
  });

  it('MIG-6-r1 : la migration 009 ajoute dependance.drapeaux (text[] NOT NULL, défaut {}), vide sur les lignes existantes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-migrations-008-'));
    for (const f of readdirSync(MIGRATIONS_DIR).filter((n) => Number(n.slice(0, 3)) <= 8)) {
      copyFileSync(join(MIGRATIONS_DIR, f), join(dir, f));
    }
    expect((await migrate(pool, dir)).applied).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const un = async (sql: string, params: unknown[] = []): Promise<number> =>
      Number(((await pool.query<{ id: number }>(sql, params)).rows[0] as { id: number }).id);
    const chef = await un(
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
       VALUES ('Chef', 'chef@example.test', 'x', 'chef_de_projet', true, 1, true) RETURNING id`,
    );
    const projet = await un(
      `INSERT INTO projet (code, nom, chef_id, date_debut)
       VALUES ('P', 'P', $1, '2027-01-04') RETURNING id`,
      [chef],
    );
    const activite = async (rang: number): Promise<number> => {
      const id = await un(
        `INSERT INTO element (projet_id, type, rang, nom) VALUES ($1, 'activite', $2, 'A') RETURNING id`,
        [projet, rang],
      );
      await pool.query('INSERT INTO activite (id) VALUES ($1)', [id]);
      return id;
    };
    const a = await activite(1);
    const b = await activite(2);
    await pool.query(
      'INSERT INTO dependance (projet_id, predecesseur_id, successeur_id) VALUES ($1, $2, $3)',
      [projet, a, b],
    );
    expect((await migrate(pool)).applied).toEqual(versionsDepot().filter((v) => v > 8));
    expect(await versions()).toEqual(versionsDepot());
    const col = await pool.query(
      `SELECT data_type, udt_name, is_nullable, column_default FROM information_schema.columns
        WHERE table_name = 'dependance' AND column_name = 'drapeaux'`,
    );
    expect(col.rows).toEqual([
      {
        data_type: 'ARRAY',
        udt_name: '_text',
        is_nullable: 'NO',
        column_default: "'{}'::text[]",
      },
    ]);
    expect((await pool.query('SELECT drapeaux FROM dependance')).rows).toEqual([{ drapeaux: [] }]);
  });
});

describe('Dépendances : la colonne drapeaux n’est ni saisie, ni historisée, ni copiée (MIG-6)', () => {
  const ctx = useTestApp();

  async function deuxActivites() {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id);
    const b = await creerActivite(ctx, m.admin, m.projet.id);
    return { m, a, b };
  }

  it('MIG-6 : POST et PATCH d’une dépendance avec drapeaux → 400, base inchangée', async () => {
    const { m, a, b } = await deuxActivites();
    const dep = await creerDependance(ctx, m.admin, m.projet.id, a.id, b.id);
    const avant = await empreinte(ctx);
    const api = appel(ctx, m.admin);
    const post = await api.post(url.dependances(m.projet.id), {
      predecesseur_id: b.id,
      successeur_id: a.id,
      drapeaux: ['dependance_non_respectee'],
    });
    expect(post.statusCode).toBe(400);
    const patch = await api.patch(url.dependance(dep.id), { delai: 3, drapeaux: [] });
    expect(patch.statusCode).toBe(400);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('MIG-6 : création, modification et suppression d’une dépendance : aucune trace de drapeaux dans l’historique', async () => {
    const { m, a, b } = await deuxActivites();
    const dep = await creerDependance(ctx, m.admin, m.projet.id, a.id, b.id);
    await ctx.pool.query("UPDATE dependance SET drapeaux = '{dependance_non_respectee}'");
    const api = appel(ctx, m.admin);
    expect((await api.patch(url.dependance(dep.id), { delai: 2 })).statusCode).toBe(200);
    expect((await api.delete(url.dependance(dep.id))).statusCode).toBe(204);
    const { rows } = await ctx.pool.query<{ l: string; operation: string }>(
      "SELECT h::text AS l, operation FROM historique h WHERE entite = 'dependance' ORDER BY id",
    );
    expect(rows.map((r) => r.operation)).toEqual(['creation', 'modification', 'suppression']);
    for (const { l } of rows) {
      expect(l).not.toContain('drapeaux');
      expect(l).not.toContain('dependance_non_respectee');
    }
  });

  it('MIG-6 : copie d’un projet dont une dépendance est marquée : drapeaux vide dans la copie, source inchangée', async () => {
    const { m, a, b } = await deuxActivites();
    const dep = await creerDependance(ctx, m.admin, m.projet.id, a.id, b.id);
    await ctx.pool.query("UPDATE dependance SET drapeaux = '{dependance_non_respectee}'");
    const res = await appel(ctx, m.admin).post(`/api/projets/${m.projet.id}/copie`, {
      nom: 'Copie',
      code: 'CIBLE',
      date_debut: '2027-02-01',
    });
    expect(res.statusCode, res.body).toBe(201);
    const copie = (corps(res) as { id: number }).id;
    const { rows } = await ctx.pool.query<{ projet_id: number; drapeaux: string[] }>(
      'SELECT projet_id, drapeaux FROM dependance ORDER BY projet_id',
    );
    expect(rows).toEqual([
      { projet_id: m.projet.id, drapeaux: ['dependance_non_respectee'] },
      { projet_id: copie, drapeaux: [] },
    ]);
    expect(dep.id).toBeGreaterThan(0);
  });
});

describe('Migration 010 : saisie_manuelle (lot 2e-I, D-058)', () => {
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

  const un = async (sql: string, params: unknown[] = []): Promise<number> =>
    Number(((await pool.query<{ id: number }>(sql, params)).rows[0] as { id: number }).id);

  it('MIG-7 : table saisie_manuelle, contraintes (demi-journée invalide, doublon, assignation inexistante), cascade à la suppression de l’assignation et du projet', async () => {
    await migrate(pool);
    const colonnes = await pool.query<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_name = 'saisie_manuelle' ORDER BY column_name`,
    );
    expect(colonnes.rows).toEqual([
      { column_name: 'assignation_id', is_nullable: 'NO' },
      { column_name: 'demi_journee', is_nullable: 'NO' },
      { column_name: 'id', is_nullable: 'NO' },
      { column_name: 'jour', is_nullable: 'NO' },
    ]);

    const chef = await un(
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
       VALUES ('Chef', 'chef@example.test', 'x', 'chef_de_projet', true, 1, true) RETURNING id`,
    );
    const projet = await un(
      `INSERT INTO projet (code, nom, chef_id, date_debut)
       VALUES ('P', 'P', $1, '2027-01-04') RETURNING id`,
      [chef],
    );
    await pool.query('INSERT INTO affectation_projet (projet_id, ressource_id) VALUES ($1, $2)', [
      projet,
      chef,
    ]);
    let rang = 0;
    const assigner = async (): Promise<number> => {
      rang += 1;
      const element = await un(
        `INSERT INTO element (projet_id, type, rang, nom)
         VALUES ($1, 'activite', $2, 'A') RETURNING id`,
        [projet, rang],
      );
      await pool.query("INSERT INTO activite (id, mode) VALUES ($1, 'MAN')", [element]);
      return un(
        `INSERT INTO assignation (activite_id, projet_id, ressource_id, charge_assignee, reste_a_faire)
         VALUES ($1, $2, $3, 1, 1) RETURNING id`,
        [element, projet, chef],
      );
    };
    const a1 = await assigner();
    const a2 = await assigner();
    const saisir = (assignation: number, jour: string, demi: string) =>
      pool.query(
        'INSERT INTO saisie_manuelle (assignation_id, jour, demi_journee) VALUES ($1, $2, $3)',
        [assignation, jour, demi],
      );
    const nombre = async (): Promise<number> =>
      (await pool.query('SELECT 1 FROM saisie_manuelle')).rows.length;

    await expect(saisir(a1, '2027-01-04', 'midi')).rejects.toThrow();
    await expect(saisir(a1, '2027-01-04', 'Matin')).rejects.toThrow();
    await expect(saisir(999999, '2027-01-04', 'matin')).rejects.toThrow();
    expect(await nombre()).toBe(0);

    await saisir(a1, '2027-01-04', 'matin');
    await expect(saisir(a1, '2027-01-04', 'matin')).rejects.toThrow();
    expect(await nombre()).toBe(1);
    await saisir(a1, '2027-01-04', 'apres_midi');
    await saisir(a1, '2027-01-05', 'matin');
    await saisir(a2, '2027-01-04', 'matin');
    expect(await nombre()).toBe(4);

    await pool.query('DELETE FROM assignation WHERE id = $1', [a1]);
    expect((await pool.query('SELECT assignation_id FROM saisie_manuelle')).rows).toEqual([
      { assignation_id: a2 },
    ]);
    await pool.query('DELETE FROM projet WHERE id = $1', [projet]);
    expect(await nombre()).toBe(0);
  });
});
