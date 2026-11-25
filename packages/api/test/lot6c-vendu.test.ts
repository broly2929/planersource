// Lot 6c (D-149) : charge vendue. MIG-10, VND-1 à VND-9, MOT-1. Valeurs recopiées de D-149.
import { copyFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, migrate } from '../src/db/migrate.js';
import { resetDb, testDbUrl, useTestApp } from './helpers.js';
import { affecter, appel, corps, type Corps } from './lot1-helpers.js';
import {
  creerActivite,
  creerAssignation,
  creerJalon,
  creerMonde,
  url,
  type Objet,
} from './lot1-t2-helpers.js';
import { calculer } from './lot2a-helpers.js';
import { colonne, element, lireGantt, lirePlanning, refuse } from './lot6c-helpers.js';

describe('Lot 6c : migration 014 (D-149 (2))', () => {
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

  it('MIG-10-r1 : activite.charge_vendue numeric(10,2) et jalon.date_client date, nullables, null pour l’existant ; CHECK ≥ 0', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-migrations-013-'));
    for (const f of readdirSync(MIGRATIONS_DIR).filter((n) => Number(n.slice(0, 3)) <= 13)) {
      copyFileSync(join(MIGRATIONS_DIR, f), join(dir, f));
    }
    expect((await migrate(pool, dir)).applied).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    const { rows: u } = await pool.query<{ id: number }>(
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
       VALUES ('U', 'u@example.test', 'x', 'administrateur', false, 1, true) RETURNING id`,
    );
    const { rows: p } = await pool.query<{ id: number }>(
      `INSERT INTO projet (code, nom, chef_id, date_debut) VALUES ('M', 'M', $1, '2027-01-04') RETURNING id`,
      [u[0]!.id],
    );
    const { rows: ea } = await pool.query<{ id: number }>(
      `INSERT INTO element (projet_id, type, rang, nom) VALUES ($1, 'activite', 1, 'A') RETURNING id`,
      [p[0]!.id],
    );
    await pool.query(`INSERT INTO activite (id) VALUES ($1)`, [ea[0]!.id]);
    const { rows: ej } = await pool.query<{ id: number }>(
      `INSERT INTO element (projet_id, type, rang, nom) VALUES ($1, 'jalon', 2, 'J') RETURNING id`,
      [p[0]!.id],
    );
    await pool.query(`INSERT INTO jalon (id, type) VALUES ($1, 'flottant')`, [ej[0]!.id]);

    // MIG-10-r1 (D-031, D-226) : les migrations postérieures à 014 (015, lot couts) s'appliquent aussi.
    const versionsApres13 = readdirSync(MIGRATIONS_DIR)
      .filter((n) => /^\d{3}_.+\.sql$/.test(n))
      .map((n) => Number(n.slice(0, 3)))
      .filter((n) => n > 13)
      .sort((x, y) => x - y);
    expect(versionsApres13[0]).toBe(14);
    expect((await migrate(pool)).applied).toEqual(versionsApres13);
    const { rows: v } = await pool.query<{ version: number }>(
      'SELECT max(version) AS version FROM schema_version',
    );
    expect(v[0]!.version).toBe(versionsApres13.at(-1));

    const cols = await pool.query<{
      table_name: string;
      column_name: string;
      data_type: string;
      numeric_precision: number | null;
      numeric_scale: number | null;
      is_nullable: string;
    }>(
      `SELECT table_name, column_name, data_type, numeric_precision, numeric_scale, is_nullable
         FROM information_schema.columns
        WHERE (table_name = 'activite' AND column_name = 'charge_vendue')
           OR (table_name = 'jalon' AND column_name = 'date_client')
        ORDER BY table_name`,
    );
    expect(cols.rows).toEqual([
      {
        table_name: 'activite',
        column_name: 'charge_vendue',
        data_type: 'numeric',
        numeric_precision: 10,
        numeric_scale: 2,
        is_nullable: 'YES',
      },
      {
        table_name: 'jalon',
        column_name: 'date_client',
        data_type: 'date',
        numeric_precision: null,
        numeric_scale: null,
        is_nullable: 'YES',
      },
    ]);
    const anciens = await pool.query(
      `SELECT (SELECT charge_vendue FROM activite WHERE id = $1) AS a,
              (SELECT date_client FROM jalon WHERE id = $2) AS j`,
      [ea[0]!.id, ej[0]!.id],
    );
    expect(anciens.rows).toEqual([{ a: null, j: null }]);

    await expect(
      pool.query('UPDATE activite SET charge_vendue = -0.01 WHERE id = $1', [ea[0]!.id]),
    ).rejects.toThrow();
    await pool.query('UPDATE activite SET charge_vendue = 0 WHERE id = $1', [ea[0]!.id]);
    await pool.query('UPDATE activite SET charge_vendue = 999999.99 WHERE id = $1', [ea[0]!.id]);
    await pool.query(`UPDATE jalon SET date_client = '2027-01-20' WHERE id = $1`, [ej[0]!.id]);
  });
});

describe('Lot 6c : charge vendue (D-149 (3) à (5))', () => {
  const ctx = useTestApp();

  it('VND-1 : valeurs valides en POST et PATCH, relues en base ; absente = null', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.admin);
    const sans = await creerActivite(ctx, m.admin, m.projet.id);
    expect(sans.charge_vendue).toBeNull();
    for (const valeur of [0, 12.5, 999999.99, null]) {
      const cree = await api.post(url.activites(m.projet.id), {
        nom: `POST ${String(valeur)}`,
        charge_vendue: valeur,
      });
      expect(cree.statusCode, cree.body).toBe(201);
      expect(corps(cree).charge_vendue).toBe(valeur);
      expect(await colonne(ctx, 'activite', 'charge_vendue', corps(cree).id as number)).toBe(
        valeur,
      );
    }
    for (const valeur of [0, 12.5, 999999.99, null]) {
      const modif = await api.patch(url.activite(sans.id), { charge_vendue: valeur });
      expect(modif.statusCode, modif.body).toBe(200);
      expect(corps(modif).charge_vendue).toBe(valeur);
      expect(await colonne(ctx, 'activite', 'charge_vendue', sans.id)).toBe(valeur);
    }
  });

  it('VND-2 : valeurs invalides → 400, base inchangée (POST et PATCH)', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id);
    for (const valeur of [-1, -0.01, 1000000, 1.234, '12', 'abc', true, [], {}]) {
      const nom = JSON.stringify(valeur);
      await refuse(
        ctx,
        () =>
          appel(ctx, m.admin).post(url.activites(m.projet.id), { nom: 'X', charge_vendue: valeur }),
        400,
      );
      await refuse(
        ctx,
        () => appel(ctx, m.admin).patch(url.activite(a.id), { charge_vendue: valeur }),
        400,
      );
      expect(await colonne(ctx, 'activite', 'charge_vendue', a.id), nom).toBeNull();
    }
  });

  it('VND-11 : charge_vendue à plus de 2 décimales exactement → 400, base inchangée ; 2 décimales à écart de virgule flottante acceptées (D-154 (12))', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id);
    for (const valeur of [1.0000000001, 0.001, 12.505, 1e-10]) {
      const nom = JSON.stringify(valeur);
      await refuse(
        ctx,
        () =>
          appel(ctx, m.admin).post(url.activites(m.projet.id), { nom: 'X', charge_vendue: valeur }),
        400,
      );
      await refuse(
        ctx,
        () => appel(ctx, m.admin).patch(url.activite(a.id), { charge_vendue: valeur }),
        400,
      );
      expect(await colonne(ctx, 'activite', 'charge_vendue', a.id), nom).toBeNull();
    }
    for (const valeur of [0.29, 1.15, 4.35]) {
      const res = await appel(ctx, m.admin).patch(url.activite(a.id), { charge_vendue: valeur });
      expect(res.statusCode, `${valeur} ${res.body}`).toBe(200);
      expect(await colonne(ctx, 'activite', 'charge_vendue', a.id), String(valeur)).toBe(valeur);
    }
  });

  it('VND-3 : activité parente : 422 activite_parente pour une valeur non null, null accepté', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.admin, m.projet.id);
    await creerActivite(ctx, m.admin, m.projet.id, { parent_id: parent.id });
    await refuse(
      ctx,
      () => appel(ctx, m.admin).patch(url.activite(parent.id), { charge_vendue: 5 }),
      422,
      'activite_parente',
    );
    const ok = await appel(ctx, m.admin).patch(url.activite(parent.id), { charge_vendue: null });
    expect(ok.statusCode, ok.body).toBe(200);
  });

  it('VND-4 : sous une activité vendue : 422 parent_vendu (POST activité, POST jalon, déplacement) ; sous une activité non vendue : accepté', async () => {
    const m = await creerMonde(ctx);
    const vendue = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: 5 });
    const libre = await creerActivite(ctx, m.admin, m.projet.id);
    const source = await creerActivite(ctx, m.admin, m.projet.id);
    await refuse(
      ctx,
      () =>
        appel(ctx, m.admin).post(url.activites(m.projet.id), { nom: 'E', parent_id: vendue.id }),
      422,
      'parent_vendu',
    );
    await refuse(
      ctx,
      () => appel(ctx, m.admin).post(url.jalons(m.projet.id), { nom: 'J', parent_id: vendue.id }),
      422,
      'parent_vendu',
    );
    await refuse(
      ctx,
      () => appel(ctx, m.admin).post(url.deplacer(source.id), { parent_id: vendue.id }),
      422,
      'parent_vendu',
    );
    const sous = await appel(ctx, m.admin).post(url.activites(m.projet.id), {
      nom: 'E',
      parent_id: libre.id,
    });
    expect(sous.statusCode, sous.body).toBe(201);
    const deplace = await appel(ctx, m.admin).post(url.deplacer(source.id), {
      parent_id: libre.id,
    });
    expect(deplace.statusCode, deplace.body).toBe(200);
  });

  it('VND-5 : historique : création, modification, valeur inchangée sans entrée, remise à null', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: 8 });
    const lire = async () =>
      (
        (await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}/historique`)).json() as Corps[]
      ).filter(
        (e) => e.entite === 'activite' && e.entite_id === a.id && e.operation === 'modification',
      );
    const creation = (
      (await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}/historique`)).json() as Corps[]
    ).find((e) => e.entite === 'activite' && e.entite_id === a.id && e.operation === 'creation');
    expect(creation!.nouvelle_valeur).toMatchObject({ charge_vendue: 8 });

    await appel(ctx, m.admin).patch(url.activite(a.id), { charge_vendue: 10 });
    expect((await lire()).map((e) => [e.champ, e.ancienne_valeur, e.nouvelle_valeur])).toEqual([
      ['charge_vendue', 8, 10],
    ]);
    await appel(ctx, m.admin).patch(url.activite(a.id), { charge_vendue: 10 });
    expect(await lire()).toHaveLength(1);
    await appel(ctx, m.admin).patch(url.activite(a.id), { charge_vendue: null });
    const apres = await lire();
    expect(apres).toHaveLength(2);
    expect(apres.map((e) => [e.champ, e.ancienne_valeur, e.nouvelle_valeur])).toContainEqual([
      'charge_vendue',
      10,
      null,
    ]);
  });

  it('VND-6 : marge d’une feuille (gantt et planning) : 6, −1, null, 5', async () => {
    const m = await creerMonde(ctx);
    const cas: [number | null, number | null, number | null][] = [
      [10, 4, 6],
      [3, 4, -1],
      [null, 4, null],
      [5, null, 5],
    ];
    const ids: number[] = [];
    for (const [vendue, assignee] of cas) {
      const a = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: vendue });
      if (assignee !== null) {
        await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: assignee });
      }
      ids.push(a.id);
    }
    const g = await lireGantt(ctx, m.admin, m.projet.id);
    const p = await lirePlanning(ctx, m.admin, m.projet.id);
    cas.forEach(([vendue, , marge], i) => {
      for (const lu of [element(g.elements, ids[i]!), element(p, ids[i]!)]) {
        expect([lu.charge_vendue, lu.marge], `cas ${i}`).toEqual([vendue, marge]);
      }
    });
  });

  it('VND-7 : parent : somme des feuilles renseignées et de leurs marges ; null sans feuille renseignée ; imbrication', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.admin, m.projet.id);
    const f = async (vendue: number | null, assignee: number, pere: Objet) => {
      const a = await creerActivite(ctx, m.admin, m.projet.id, {
        parent_id: pere.id,
        charge_vendue: vendue,
      });
      await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: assignee });
      return a;
    };
    await f(10, 4, parent);
    await f(3, 4, parent);
    await f(null, 5, parent);
    const vide = await creerActivite(ctx, m.admin, m.projet.id);
    await f(null, 2, vide);
    const haut = await creerActivite(ctx, m.admin, m.projet.id);
    const milieu = await creerActivite(ctx, m.admin, m.projet.id, { parent_id: haut.id });
    await f(7, 2, milieu);
    await f(1, 3, haut);

    const g = await lireGantt(ctx, m.admin, m.projet.id);
    const p = await lirePlanning(ctx, m.admin, m.projet.id);
    for (const lu of [element(g.elements, parent.id), element(p, parent.id)]) {
      expect([lu.charge_vendue, lu.marge]).toEqual([13, 5]);
    }
    for (const lu of [element(g.elements, vide.id), element(p, vide.id)]) {
      expect([lu.charge_vendue, lu.marge]).toEqual([null, null]);
    }
    for (const lu of [element(g.elements, haut.id), element(p, haut.id)]) {
      expect([lu.charge_vendue, lu.marge]).toEqual([8, 3]);
    }
    for (const lu of [element(g.elements, milieu.id), element(p, milieu.id)]) {
      expect([lu.charge_vendue, lu.marge]).toEqual([7, 5]);
    }
  });

  it('VND-8-r2 : projet.totaux : feuilles du projet seul (close comprise), sous-projet exclu ; projet vide', async () => {
    const m = await creerMonde(ctx);
    const vide = await lireGantt(ctx, m.admin, m.projet.id);
    expect(vide.projet.totaux).toEqual({
      charge_vendue: null,
      charge_assignee: 0,
      marge: null,
      charge_reelle: 0,
      cout_planifie: 0,
      cout_impute: 0,
      cout_reel: 0,
      taux_manquant: false,
    });

    const a = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: 10 });
    const ass = await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: 4 });
    await ctx.pool.query(
      'UPDATE assignation SET charge_reelle = 1, reste_a_faire = 3 WHERE id = $1',
      [ass.id],
    );
    const b = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: 3 });
    await creerAssignation(ctx, m.admin, b.id, m.alice.id, { charge_assignee: 4 });
    const c = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: 2 });
    await creerAssignation(ctx, m.admin, c.id, m.alice.id, { charge_assignee: 1 });
    expect((await appel(ctx, m.admin).patch(url.activite(c.id), { close: true })).statusCode).toBe(
      200,
    );
    const sp = (
      await appel(ctx, m.admin).post('/api/projets', {
        code: 'SP6C',
        nom: 'Sous-projet',
        date_debut: '2027-01-04',
        chef_id: m.admin.id,
        parent_id: m.projet.id,
      })
    ).json() as { id: number };
    await affecter(ctx, sp.id, m.alice.id);
    const d = await creerActivite(ctx, m.admin, sp.id, { charge_vendue: 100 });
    await creerAssignation(ctx, m.admin, d.id, m.alice.id, { charge_assignee: 50 });

    const g = await lireGantt(ctx, m.admin, m.projet.id);
    expect(g.projet.totaux).toEqual({
      charge_vendue: 15,
      charge_assignee: 9,
      marge: 6,
      charge_reelle: 1,
      cout_planifie: 0,
      cout_impute: 0,
      cout_reel: 0,
      taux_manquant: false,
    });
  });

  it('VND-10-r1 : totaux avec une feuille non vendue assignée : { 10, 9, 6, 0 } (D-150 (2))', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: 10 });
    await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: 4 });
    const b = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: null });
    await creerAssignation(ctx, m.admin, b.id, m.alice.id, { charge_assignee: 5 });
    const g = await lireGantt(ctx, m.admin, m.projet.id);
    expect(g.projet.totaux).toEqual({
      charge_vendue: 10,
      charge_assignee: 9,
      marge: 6,
      charge_reelle: 0,
      cout_planifie: 0,
      cout_impute: 0,
      cout_reel: 0,
      taux_manquant: false,
    });
  });

  it('VND-9 : modèles : activité et jalon d’un modèle acceptent charge_vendue et date_client', async () => {
    const m = await creerMonde(ctx);
    const modele = corps(
      await appel(ctx, m.admin).post('/api/modeles', {
        code: 'MOD6C',
        nom: 'Modèle',
        date_debut: '2027-01-04',
      }),
    ) as Objet;
    const api = appel(ctx, m.admin);
    const a = await api.post(url.activites(modele.id), { nom: 'A', charge_vendue: 4 });
    expect(a.statusCode, a.body).toBe(201);
    expect(corps(a).charge_vendue).toBe(4);
    const pa = await api.patch(url.activite(corps(a).id as number), { charge_vendue: 6 });
    expect(pa.statusCode, pa.body).toBe(200);
    expect(corps(pa).charge_vendue).toBe(6);
    const j = await api.post(url.jalons(modele.id), { nom: 'J', date_client: '2027-02-01' });
    expect(j.statusCode, j.body).toBe(201);
    expect(corps(j).date_client).toBe('2027-02-01');
    const pj = await api.patch(url.jalon(corps(j).id as number), { date_client: null });
    expect(pj.statusCode, pj.body).toBe(200);
    expect(corps(pj).date_client).toBeNull();
  });

  it('MOT-1 : le moteur ignore la charge vendue et la date client (travail, dates et drapeaux identiques)', async () => {
    const m = await creerMonde(ctx);
    const monter = async (projetId: number, avec: boolean, ressourceId: number) => {
      const a = await creerActivite(ctx, m.admin, projetId, avec ? { charge_vendue: 99 } : {});
      const ass = await creerAssignation(ctx, m.admin, a.id, ressourceId, { charge_assignee: 3 });
      const j = await creerJalon(ctx, m.admin, projetId, avec ? { date_client: '2027-01-05' } : {});
      return { a, ass, j };
    };
    await affecter(ctx, m.autre.id, m.bob.id);
    const sans = await monter(m.projet.id, false, m.alice.id);
    const avec = await monter(m.autre.id, true, m.bob.id);
    const res = await calculer(ctx, m.admin, {
      projets: [m.projet.id, m.autre.id],
      d0: '2027-01-04',
    });
    expect(res.statusCode, res.body).toBe(200);
    const lire = async (idAss: number, idAct: number, idJal: number) => {
      const t = await ctx.pool.query(
        'SELECT jour::text AS jour, charge, surcharge FROM travail_planifie WHERE assignation_id = $1 ORDER BY jour',
        [idAss],
      );
      const d = await ctx.pool.query(
        `SELECT debut_planifie::text AS d, fin_planifiee::text AS f, drapeaux FROM activite WHERE id = $1`,
        [idAct],
      );
      const j = await ctx.pool.query('SELECT date_planifiee::text AS d FROM jalon WHERE id = $1', [
        idJal,
      ]);
      return { t: t.rows, d: d.rows, j: j.rows };
    };
    const un = await lire(sans.ass.id, sans.a.id, sans.j.id);
    const deux = await lire(avec.ass.id, avec.a.id, avec.j.id);
    expect(un.t.length).toBeGreaterThan(0);
    expect(deux).toEqual(un);
  });
});
