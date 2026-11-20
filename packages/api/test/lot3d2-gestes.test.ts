// Lot 3d-2, API des gestes (D-088 (3), D-093) : ACT-30, ACT-31, JLN-15, JLN-16, LIEN-18, LIEN-19,
// ASS-18 à ASS-20, GESTE-1 à GESTE-10. Rouges attendus : ACT-30, JLN-15, LIEN-18, ASS-18, ASS-20.
// Caractérisation (verts d'emblée) : ACT-31, JLN-16, LIEN-19, ASS-19, GESTE-1 à GESTE-10.
import type { LightMyRequestResponse } from 'fastify';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { testDbUrl, useTestApp } from './helpers.js';
import { appel, type Corps } from './lot1-helpers.js';
import {
  attendreRepos,
  creerActivite,
  creerAssignation,
  creerDependance,
  creerJalon,
  creerMonde,
  url,
  type Monde,
} from './lot1-t2-helpers.js';

const ctx = useTestApp();

/** Contenu de toutes les tables sauf `session` et `schema_version`, trié (historique compris). */
async function empreinte(): Promise<Record<string, string[]>> {
  await attendreRepos(ctx);
  const { rows: tables } = await ctx.pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT IN ('session', 'schema_version')
      ORDER BY tablename`,
  );
  const resultat: Record<string, string[]> = {};
  for (const { tablename } of tables) {
    const { rows } = await ctx.pool.query<{ ligne: string }>(
      `SELECT t::text AS ligne FROM "${tablename}" t ORDER BY 1`,
    );
    resultat[tablename] = rows.map((r) => r.ligne);
  }
  return resultat;
}

/** Une ligne relue en base, colonnes converties en texte (dates sans fuseau). */
async function ligne(sql: string, id: number): Promise<Record<string, string | null>> {
  const { rows } = await ctx.pool.query<Record<string, string | null>>(sql, [id]);
  expect(rows.length, `ligne ${id}`).toBe(1);
  return rows[0]!;
}

const lireActivite = (id: number) =>
  ligne(
    `SELECT mode, priorite::text, debut_valide::text, fin_valide::text, duree_validee::text
       FROM activite WHERE id = $1`,
    id,
  );
const lireJalon = (id: number) =>
  ligne(
    `SELECT e.nom, j.date_validee::text FROM jalon j JOIN element e ON e.id = j.id
      WHERE j.id = $1`,
    id,
  );
const lireDependance = (id: number) =>
  ligne('SELECT type, delai::text FROM dependance WHERE id = $1', id);
const lireAssignation = (id: number) =>
  ligne(
    `SELECT taux::float8::text AS taux, charge_assignee::float8::text AS charge_assignee,
            reste_a_faire::float8::text AS reste_a_faire
       FROM assignation WHERE id = $1`,
    id,
  );

interface Modif {
  ancienne_valeur: unknown;
  nouvelle_valeur: unknown;
}

/** Entrées de modification d'un champ, dans l'ordre d'écriture (id croissant). */
async function modifications(entite: string, id: number, champ: string): Promise<Modif[]> {
  const { rows } = await ctx.pool.query<Modif>(
    `SELECT ancienne_valeur, nouvelle_valeur FROM historique
      WHERE entite = $1 AND entite_id = $2 AND champ = $3 AND operation = 'modification'
      ORDER BY id`,
    [entite, id, champ],
  );
  return rows;
}

/**
 * Concurrence déterministe : la connexion du test tient la ligne (FOR UPDATE) ; les deux PATCH
 * sont lancés sans await ; sondage borné (5 s) jusqu'à ce que 2 sessions de la même base, hors la
 * connexion du test, attendent un verrou ; ROLLBACK, puis attente des deux réponses.
 */
async function deuxPatchsBloques(
  table: 'element' | 'dependance' | 'assignation',
  id: number,
  envoyer: [() => Promise<LightMyRequestResponse>, () => Promise<LightMyRequestResponse>],
): Promise<[LightMyRequestResponse, LightMyRequestResponse]> {
  const c = new pg.Client({ connectionString: testDbUrl() });
  await c.connect();
  try {
    await c.query('BEGIN');
    const tenue = await c.query(`SELECT id FROM ${table} WHERE id = $1 FOR UPDATE`, [id]);
    expect(tenue.rowCount, `ligne ${table} ${id} tenue`).toBe(1);
    const pid = Number(
      ((await c.query('SELECT pg_backend_pid() AS pid')).rows[0] as { pid: number }).pid,
    );
    const reponses = Promise.all([envoyer[0](), envoyer[1]()]);
    void reponses.catch(() => undefined);
    let enAttente = 0;
    const limite = Date.now() + 5000;
    while (enAttente < 2 && Date.now() < limite) {
      const { rows } = await ctx.pool.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> $1 AND wait_event_type = 'Lock'`,
        [pid],
      );
      enAttente = Number(rows[0]!.n);
      if (enAttente < 2) await new Promise((r) => setTimeout(r, 20));
    }
    expect(enAttente, '2 PATCH en attente du verrou de la connexion du test').toBe(2);
    await c.query('ROLLBACK');
    const [a, b] = await reponses;
    expect(a.statusCode, a.body).toBe(200);
    expect(b.statusCode, b.body).toBe(200);
    return [a, b];
  } finally {
    await c.end();
  }
}

const patch = (m: Monde, adresse: string, corps: Corps) => () =>
  appel(ctx, m.chef).patch(adresse, corps);

/** La seconde écriture (ordre de l'historique) a pour ancienne valeur la nouvelle de la première. */
async function verifierEnchainement(entite: string, id: number, champ: string, valeurs: unknown[]) {
  const entrees = await modifications(entite, id, champ);
  expect(entrees.length, `deux entrées ${champ}`).toBe(2);
  const [premiere, seconde] = entrees as [Modif, Modif];
  expect(valeurs).toContain(premiere.nouvelle_valeur);
  expect(valeurs).toContain(seconde.nouvelle_valeur);
  expect(seconde.ancienne_valeur).toEqual(premiere.nouvelle_valeur);
}

describe('3d-2 concurrence des PATCH (D-088 (3))', () => {
  it('ACT-30 : activité, champs distincts : les deux valeurs sont gardées', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, {
      mode: 'START',
      debut_valide: '2027-01-04',
    });
    await deuxPatchsBloques('element', a.id, [
      patch(m, url.activite(a.id), { debut_valide: '2027-01-11' }),
      patch(m, url.activite(a.id), { priorite: 700 }),
    ]);
    expect(await lireActivite(a.id)).toMatchObject({
      debut_valide: '2027-01-11',
      priorite: '700',
    });
  });

  it('ACT-31 : caractérisation, activité, même champ : historique enchaîné', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, {
      mode: 'START',
      debut_valide: '2027-01-04',
    });
    await deuxPatchsBloques('element', a.id, [
      patch(m, url.activite(a.id), { debut_valide: '2027-01-11' }),
      patch(m, url.activite(a.id), { debut_valide: '2027-01-18' }),
    ]);
    await verifierEnchainement('activite', a.id, 'debut_valide', ['2027-01-11', '2027-01-18']);
  });

  it('JLN-15 : jalon, champs distincts : les deux valeurs sont gardées', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    await deuxPatchsBloques('element', j.id, [
      patch(m, url.jalon(j.id), { date_validee: '2027-01-15' }),
      patch(m, url.jalon(j.id), { nom: 'Livraison' }),
    ]);
    expect(await lireJalon(j.id)).toEqual({ nom: 'Livraison', date_validee: '2027-01-15' });
  });

  it('JLN-16 : caractérisation, jalon, même champ : historique enchaîné', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    await deuxPatchsBloques('element', j.id, [
      patch(m, url.jalon(j.id), { date_validee: '2027-01-15' }),
      patch(m, url.jalon(j.id), { date_validee: '2027-01-22' }),
    ]);
    await verifierEnchainement('jalon', j.id, 'date_validee', ['2027-01-15', '2027-01-22']);
  });

  it('LIEN-18 : dépendance, champs distincts : les deux valeurs sont gardées', async () => {
    const m = await creerMonde(ctx);
    const x = await creerActivite(ctx, m.chef, m.projet.id);
    const y = await creerActivite(ctx, m.chef, m.projet.id);
    const d = await creerDependance(ctx, m.chef, m.projet.id, x.id, y.id, { type: 'FD', delai: 0 });
    await deuxPatchsBloques('dependance', d.id, [
      patch(m, url.dependance(d.id), { type: 'DD' }),
      patch(m, url.dependance(d.id), { delai: 2 }),
    ]);
    expect(await lireDependance(d.id)).toEqual({ type: 'DD', delai: '2' });
  });

  it('LIEN-19 : caractérisation, dépendance, même champ : historique enchaîné', async () => {
    const m = await creerMonde(ctx);
    const x = await creerActivite(ctx, m.chef, m.projet.id);
    const y = await creerActivite(ctx, m.chef, m.projet.id);
    const d = await creerDependance(ctx, m.chef, m.projet.id, x.id, y.id, { type: 'FD', delai: 0 });
    await deuxPatchsBloques('dependance', d.id, [
      patch(m, url.dependance(d.id), { delai: 2 }),
      patch(m, url.dependance(d.id), { delai: 5 }),
    ]);
    await verifierEnchainement('dependance', d.id, 'delai', [2, 5]);
  });

  async function assignation(m: Monde) {
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    return creerAssignation(ctx, m.chef, a.id, m.alice.id, { taux: 100, charge_assignee: 3 });
  }

  it('ASS-18 : assignation, champs distincts : les deux valeurs sont gardées', async () => {
    const m = await creerMonde(ctx);
    const s = await assignation(m);
    await deuxPatchsBloques('assignation', s.id, [
      patch(m, url.assignation(s.id), { taux: 50 }),
      patch(m, url.assignation(s.id), { charge_assignee: 4 }),
    ]);
    expect(await lireAssignation(s.id)).toMatchObject({ taux: '50', charge_assignee: '4' });
  });

  it('ASS-19 : caractérisation, assignation, même champ : historique enchaîné', async () => {
    const m = await creerMonde(ctx);
    const s = await assignation(m);
    await deuxPatchsBloques('assignation', s.id, [
      patch(m, url.assignation(s.id), { taux: 50 }),
      patch(m, url.assignation(s.id), { taux: 80 }),
    ]);
    await verifierEnchainement('assignation', s.id, 'taux', [50, 80]);
  });

  it('ASS-20 : charge réelle 0 : reste à faire = nouvelle charge, taux de A gardé', async () => {
    const m = await creerMonde(ctx);
    const s = await assignation(m);
    expect(
      (
        await ctx.pool.query('SELECT charge_reelle::float8 AS r FROM assignation WHERE id = $1', [
          s.id,
        ])
      ).rows[0],
    ).toEqual({ r: 0 });
    await deuxPatchsBloques('assignation', s.id, [
      patch(m, url.assignation(s.id), { taux: 50 }),
      patch(m, url.assignation(s.id), { charge_assignee: 4 }),
    ]);
    expect(await lireAssignation(s.id)).toEqual({
      taux: '50',
      charge_assignee: '4',
      reste_a_faire: '4',
    });
  });
});

describe('3d-2 caractérisation des gestes de SPEC §6', () => {
  async function geste(champsCreation: Corps, modif: Corps) {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, champsCreation);
    const avant = await lireActivite(a.id);
    const res = await appel(ctx, m.chef).patch(url.activite(a.id), modif);
    expect(res.statusCode, res.body).toBe(200);
    return { avant, apres: await lireActivite(a.id) };
  }

  for (const [id, mode] of [
    ['GESTE-1', 'START'],
    ['GESTE-2', 'STARR'],
  ] as const) {
    it(`${id} : glisser une barre ${mode} → début validé`, async () => {
      const { avant, apres } = await geste(
        { mode, debut_valide: '2027-01-04' },
        { debut_valide: '2027-01-11' },
      );
      expect(apres).toEqual({ ...avant, debut_valide: '2027-01-11' });
    });
  }

  for (const [id, mode] of [
    ['GESTE-3', 'FDUR'],
    ['GESTE-4', 'DDUR'],
  ] as const) {
    it(`${id} : glisser une barre ${mode} ou poignée gauche → début validé, durée inchangée`, async () => {
      const { avant, apres } = await geste(
        { mode, debut_valide: '2027-01-04', duree_validee: 5 },
        { debut_valide: '2027-01-11' },
      );
      expect(apres).toEqual({ ...avant, debut_valide: '2027-01-11', duree_validee: '5' });
    });
  }

  it('GESTE-5 : poignée droite ALAP → fin validée', async () => {
    const { avant, apres } = await geste(
      { mode: 'ALAP', fin_valide: '2027-01-15' },
      { fin_valide: '2027-01-22' },
    );
    expect(apres).toEqual({ ...avant, fin_valide: '2027-01-22' });
  });

  const regul = { mode: 'REGUL', debut_valide: '2027-01-04', fin_valide: '2027-01-15' };

  it('GESTE-6 : glisser une barre REGUL → début et fin validés ensemble', async () => {
    const { avant, apres } = await geste(regul, {
      debut_valide: '2027-01-11',
      fin_valide: '2027-01-22',
    });
    expect(apres).toEqual({ ...avant, debut_valide: '2027-01-11', fin_valide: '2027-01-22' });
  });

  it('GESTE-7 : poignée gauche REGUL → début validé seul', async () => {
    const { avant, apres } = await geste(regul, { debut_valide: '2027-01-06' });
    expect(apres).toEqual({ ...avant, debut_valide: '2027-01-06', fin_valide: '2027-01-15' });
  });

  it('GESTE-8 : poignée droite REGUL → fin validée seule', async () => {
    const { avant, apres } = await geste(regul, { fin_valide: '2027-01-20' });
    expect(apres).toEqual({ ...avant, debut_valide: '2027-01-04', fin_valide: '2027-01-20' });
  });

  for (const mode of ['FDUR', 'DDUR'] as const) {
    it(`GESTE-9 : poignée droite ${mode} → durée validée`, async () => {
      const { avant, apres } = await geste(
        { mode, debut_valide: '2027-01-04', duree_validee: 5 },
        { duree_validee: 3 },
      );
      expect(apres).toEqual({ ...avant, debut_valide: '2027-01-04', duree_validee: '3' });
    });
  }

  it('GESTE-10 : REGUL, fin antérieure au début → 422, base et historique inchangés', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, regul);
    const avant = await empreinte();
    const res = await appel(ctx, m.chef).patch(url.activite(a.id), {
      debut_valide: '2027-01-18',
      fin_valide: '2027-01-11',
    });
    expect(res.statusCode).toBe(422);
    const apres = await empreinte();
    expect(apres['historique']).toEqual(avant['historique']);
    expect(apres).toEqual(avant);
  });
});
