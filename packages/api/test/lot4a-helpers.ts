import type { LightMyRequestResponse } from 'fastify';
import { expect } from 'vitest';
import { type TestCtx } from './helpers.js';
import { appel, type Acteur, type Corps } from './lot1-helpers.js';

/**
 * Lot 4a : imputations, feuilles de temps et validation (SPEC §7 « API et règles (lot 4a, D-118) »).
 * Jeu de données de SPEC 5.5 (Alice et Bob, capacité 1, lundi à vendredi) ; semaines du 04/01 et du
 * 11/01/2027.
 */
export const S1 = '2027-01-04';
export const S2 = '2027-01-11';

/** Jours de janvier 2027 : j(11) = '2027-01-11'. */
export const j = (n: number): string => `2027-01-${String(n).padStart(2, '0')}`;

export interface Imputation {
  jour: string;
  charge: number;
}

export interface LigneEnvoyee {
  assignation_id: number;
  imputations: Imputation[];
  reste?: number;
}

export interface LigneFeuille {
  assignation_id: number;
  projet_id: number;
  projet_code: string;
  activite_id: number;
  activite_nom: string;
  wbs: string;
  assignee: number;
  reel_cumule: number;
  reste: number;
  modifiable: boolean;
  imputations: Imputation[];
}

export interface JourFeuille {
  jour: string;
  capacite: number;
  total: number;
  depassement: boolean;
}

export interface Validation {
  projet_id: number;
  validateur_id: number;
  date: string;
}

export interface Feuille {
  feuille: {
    id: number | null;
    ressource_id: number;
    semaine: string;
    statut: 'brouillon' | 'soumise' | 'validee' | 'rejetee';
    commentaire: string | null;
    validations: Validation[];
  };
  lignes: LigneFeuille[];
  jours: JourFeuille[];
}

function envoyer(
  ctx: TestCtx,
  qui: Acteur | undefined,
  methode: 'GET' | 'PUT' | 'POST',
  adresse: string,
  payload?: unknown,
): Promise<LightMyRequestResponse> {
  return ctx.app.inject({
    method: methode,
    url: adresse,
    ...(payload === undefined ? {} : { payload: payload as Corps }),
    headers: qui ? { cookie: qui.cookie } : {},
  });
}

export const urlFeuilles = (semaine?: string, ressourceId?: number | string): string => {
  const p: string[] = [];
  if (semaine !== undefined) p.push(`semaine=${semaine}`);
  if (ressourceId !== undefined) p.push(`ressource_id=${ressourceId}`);
  return `/api/feuilles${p.length ? `?${p.join('&')}` : ''}`;
};

/** GET /api/feuilles?semaine=…[&ressource_id=…] */
export const lireFeuilleBrute = (
  ctx: TestCtx,
  qui: Acteur | undefined,
  semaine?: string,
  ressourceId?: number | string,
) => envoyer(ctx, qui, 'GET', urlFeuilles(semaine, ressourceId));

/** GET attendu en 200. */
export async function lireFeuille(
  ctx: TestCtx,
  qui: Acteur,
  semaine: string,
  ressourceId?: number,
): Promise<Feuille> {
  const res = await lireFeuilleBrute(ctx, qui, semaine, ressourceId);
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Feuille;
}

/** PUT /api/feuilles?semaine=… avec le corps donné tel quel. */
export const ecrireFeuille = (
  ctx: TestCtx,
  qui: Acteur | undefined,
  semaine: string | undefined,
  corps: unknown,
) => envoyer(ctx, qui, 'PUT', urlFeuilles(semaine), corps);

/** PUT attendu en 200 ; renvoie la feuille (même forme que le GET). */
export async function imputer(
  ctx: TestCtx,
  qui: Acteur,
  semaine: string,
  lignes: LigneEnvoyee[],
): Promise<Feuille> {
  const res = await ecrireFeuille(ctx, qui, semaine, { lignes });
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Feuille;
}

/** POST /api/feuilles/:id/{soumettre|rappeler|valider|rejeter}. */
export const action = (
  ctx: TestCtx,
  qui: Acteur | undefined,
  feuilleId: number | string,
  verbe: 'soumettre' | 'rappeler' | 'valider' | 'rejeter',
  corps: Corps = {},
) => envoyer(ctx, qui, 'POST', `/api/feuilles/${feuilleId}/${verbe}`, corps);

/** Action attendue en 200. */
export async function agir(
  ctx: TestCtx,
  qui: Acteur,
  feuilleId: number,
  verbe: 'soumettre' | 'rappeler' | 'valider' | 'rejeter',
  corps: Corps = {},
): Promise<void> {
  const res = await action(ctx, qui, feuilleId, verbe, corps);
  expect(res.statusCode, `${verbe} : ${res.body}`).toBe(200);
}

/** GET /api/validations?semaine=… */
export const lireValidations = (ctx: TestCtx, qui: Acteur | undefined, semaine?: string) =>
  envoyer(ctx, qui, 'GET', `/api/validations${semaine === undefined ? '' : `?semaine=${semaine}`}`);

/** Identifiant de la feuille d'une ressource pour une semaine (lu en base), null si absente. */
export async function idFeuille(
  ctx: TestCtx,
  ressourceId: number,
  lundi: string,
): Promise<number | null> {
  const { rows } = await ctx.pool.query<{ id: number }>(
    'SELECT id FROM feuille_temps WHERE ressource_id = $1 AND lundi = $2',
    [ressourceId, lundi],
  );
  return rows[0]?.id ?? null;
}

/** Imputations en base, triées (assignation, jour). */
export async function imputationsEnBase(
  ctx: TestCtx,
): Promise<{ assignation_id: number; jour: string; charge: number }[]> {
  const { rows } = await ctx.pool.query<{ assignation_id: number; jour: string; charge: number }>(
    `SELECT assignation_id, jour::text AS jour, charge FROM imputation
      ORDER BY assignation_id, jour`,
  );
  return rows;
}

/** Charges de l'assignation en base. */
export async function chargesAssignation(
  ctx: TestCtx,
  id: number,
): Promise<{ charge_assignee: number; charge_reelle: number; reste_a_faire: number }> {
  const { rows } = await ctx.pool.query<{
    charge_assignee: number;
    charge_reelle: number;
    reste_a_faire: number;
  }>('SELECT charge_assignee, charge_reelle, reste_a_faire FROM assignation WHERE id = $1', [id]);
  return rows[0]!;
}

/** Entrées d'historique d'une assignation (champ, auteur, valeurs), dans l'ordre d'écriture. */
export async function historiqueAssignation(
  ctx: TestCtx,
  id: number,
): Promise<
  {
    operation: string;
    champ: string | null;
    utilisateur_id: number;
    ancienne_valeur: unknown;
    nouvelle_valeur: unknown;
  }[]
> {
  const { rows } = await ctx.pool.query(
    `SELECT operation, champ, utilisateur_id, ancienne_valeur, nouvelle_valeur FROM historique
      WHERE entite = 'assignation' AND entite_id = $1 ORDER BY id`,
    [id],
  );
  return rows as never;
}

/** Statut de la feuille en base. */
export async function statutFeuille(ctx: TestCtx, id: number): Promise<string> {
  const { rows } = await ctx.pool.query<{ statut: string }>(
    'SELECT statut FROM feuille_temps WHERE id = $1',
    [id],
  );
  return rows[0]!.statut;
}

/** Ferme une ligne pour le test : activité close (PATCH par l'API). */
export async function clore(ctx: TestCtx, par: Acteur, activiteId: number): Promise<void> {
  const res = await appel(ctx, par).patch(`/api/activites/${activiteId}`, { close: true });
  expect(res.statusCode, res.body).toBe(200);
}
