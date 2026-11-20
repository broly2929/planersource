import type { LightMyRequestResponse } from 'fastify';
import { type TestCtx } from './helpers.js';
import { appel, type Acteur, type Corps } from './lot1-helpers.js';
import { attendreRepos, creerActivite, creerAssignation, type Objet } from './lot1-t2-helpers.js';

export { creerMonde, type Monde } from './lot1-t2-helpers.js';

/**
 * Empreinte de la base : pour chaque table sauf `session` et `schema_version`, le contenu trié et
 * sérialisé (une ligne = le texte de l'enregistrement, toutes colonnes comprises). Elle couvre donc
 * travail_planifie, les colonnes planifiées de activite, jalon et projet, et historique.
 */
export async function empreinte(ctx: TestCtx): Promise<Record<string, string[]>> {
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

/** POST /api/calcul. */
export function calculer(
  ctx: TestCtx,
  qui: Acteur | undefined,
  corps: Corps,
): Promise<LightMyRequestResponse> {
  return appel(ctx, qui).post('/api/calcul', corps);
}

/** Activité ASAP (créée par l'API) assignée à `ressourceId` pour `jours` jours. */
export async function tache(
  ctx: TestCtx,
  par: Acteur,
  projetId: number,
  ressourceId: number,
  jours: number,
  champsActivite: Corps = {},
  champsAssignation: Corps = {},
): Promise<{ activite: Objet; assignation: Objet }> {
  const activite = await creerActivite(ctx, par, projetId, champsActivite);
  const assignation = await creerAssignation(ctx, par, activite.id, ressourceId, {
    charge_assignee: jours,
    ...champsAssignation,
  });
  return { activite, assignation };
}

export interface LigneTravail {
  jour: string;
  charge: number;
  surcharge: boolean;
}

/** Travail planifié d'une assignation, trié par jour. */
export async function travail(ctx: TestCtx, assignationId: number): Promise<LigneTravail[]> {
  const { rows } = await ctx.pool.query<LigneTravail>(
    `SELECT jour::text AS jour, charge, surcharge FROM travail_planifie
      WHERE assignation_id = $1 ORDER BY jour`,
    [assignationId],
  );
  return rows;
}

/** Jours de janvier 2027 (numéros) → dates complètes. */
export const jours = (...n: number[]): string[] =>
  n.map((j) => `2027-01-${String(j).padStart(2, '0')}`);

export interface DatesPlanifiees {
  debut_planifie: string | null;
  fin_planifiee: string | null;
}

export async function datesActivite(ctx: TestCtx, id: number) {
  const { rows } = await ctx.pool.query<DatesPlanifiees & { drapeaux: string[] }>(
    'SELECT debut_planifie, fin_planifiee, drapeaux FROM activite WHERE id = $1',
    [id],
  );
  return rows[0]!;
}

export async function datesProjet(ctx: TestCtx, id: number) {
  const { rows } = await ctx.pool.query<DatesPlanifiees>(
    'SELECT debut_planifie, fin_planifiee FROM projet WHERE id = $1',
    [id],
  );
  return rows[0]!;
}

/** Tout ce que la base garde des projets donnés : projet, éléments, activités, jalons, assignations, travail. */
export async function etatDes(
  ctx: TestCtx,
  projetIds: number[],
): Promise<Record<string, string[]>> {
  await attendreRepos(ctx);
  const lire = async (sql: string) =>
    (await ctx.pool.query<{ l: string }>(sql, [projetIds])).rows.map((r) => r.l);
  return {
    projet: await lire('SELECT p::text AS l FROM projet p WHERE id = ANY($1) ORDER BY id'),
    element: await lire('SELECT e::text AS l FROM element e WHERE projet_id = ANY($1) ORDER BY id'),
    activite: await lire(
      `SELECT a::text AS l FROM activite a JOIN element e ON e.id = a.id
        WHERE e.projet_id = ANY($1) ORDER BY a.id`,
    ),
    jalon: await lire(
      `SELECT j::text AS l FROM jalon j JOIN element e ON e.id = j.id
        WHERE e.projet_id = ANY($1) ORDER BY j.id`,
    ),
    assignation: await lire(
      'SELECT s::text AS l FROM assignation s WHERE projet_id = ANY($1) ORDER BY id',
    ),
    travail: await lire(
      `SELECT t::text AS l FROM travail_planifie t JOIN assignation s ON s.id = t.assignation_id
        WHERE s.projet_id = ANY($1) ORDER BY 1`,
    ),
  };
}
