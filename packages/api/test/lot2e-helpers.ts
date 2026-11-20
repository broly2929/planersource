import type { LightMyRequestResponse } from 'fastify';
import { expect } from 'vitest';
import type { TestCtx } from './helpers.js';
import { type Acteur, type Corps } from './lot1-helpers.js';
import { type Objet } from './lot1-t2-helpers.js';
import { tache } from './lot2a-helpers.js';

/** Mois de la plupart des scénarios (D0 = lundi 04/01/2027). */
export const JANV = '2027-01';

export type DemiJournee = 'matin' | 'apres_midi';

export interface Saisie {
  assignation_id: number;
  jour: string;
  demi_journee: DemiJournee;
}

export const matin = (assignationId: number, jour: string): Saisie => ({
  assignation_id: assignationId,
  jour,
  demi_journee: 'matin',
});

export const apresMidi = (assignationId: number, jour: string): Saisie => ({
  assignation_id: assignationId,
  jour,
  demi_journee: 'apres_midi',
});

/** Une journée entière : matin puis après-midi (1 j). */
export const journee = (assignationId: number, jour: string): Saisie[] => [
  matin(assignationId, jour),
  apresMidi(assignationId, jour),
];

export const urlSaisies = (activiteId: number, mois?: string): string =>
  `/api/activites/${activiteId}/saisies${mois === undefined ? '' : `?mois=${mois}`}`;

function envoyer(
  ctx: TestCtx,
  qui: Acteur | undefined,
  methode: 'GET' | 'PUT',
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

/** GET /api/activites/:id/saisies?mois=… */
export const lireSaisies = (
  ctx: TestCtx,
  qui: Acteur | undefined,
  activiteId: number,
  mois?: string,
) => envoyer(ctx, qui, 'GET', urlSaisies(activiteId, mois));

/** PUT /api/activites/:id/saisies?mois=… avec le corps donné tel quel. */
export const ecrireSaisies = (
  ctx: TestCtx,
  qui: Acteur | undefined,
  activiteId: number,
  mois: string | undefined,
  corps: unknown,
) => envoyer(ctx, qui, 'PUT', urlSaisies(activiteId, mois), corps);

/** PUT attendu en 200 : remplace les saisies du mois par `saisies`. */
export async function poser(
  ctx: TestCtx,
  par: Acteur,
  activiteId: number,
  mois: string,
  saisies: Saisie[],
): Promise<void> {
  const res = await ecrireSaisies(ctx, par, activiteId, mois, { saisies });
  expect(res.statusCode, `PUT saisies ${mois} : ${res.body}`).toBe(200);
}

/** Toutes les saisies de la base : assignation, jour, matin avant après-midi. */
export async function saisiesEnBase(ctx: TestCtx): Promise<Saisie[]> {
  const { rows } = await ctx.pool.query<Saisie>(
    `SELECT assignation_id, jour::text AS jour, demi_journee FROM saisie_manuelle
      ORDER BY assignation_id, jour, (demi_journee = 'apres_midi')`,
  );
  return rows;
}

/** Entrées de l'historique, dans l'ordre. */
export async function historique(ctx: TestCtx): Promise<string[]> {
  const { rows } = await ctx.pool.query<{ l: string }>(
    'SELECT h::text AS l FROM historique h ORDER BY id',
  );
  return rows.map((r) => r.l);
}

/** Activité MAN (créée par l'API) assignée à `ressourceId` pour `jours` jours. */
export const activiteMan = (
  ctx: TestCtx,
  par: Acteur,
  projetId: number,
  ressourceId: number,
  jours = 1,
  champs: Corps = {},
): Promise<{ activite: Objet; assignation: Objet }> =>
  tache(ctx, par, projetId, ressourceId, jours, { mode: 'MAN', ...champs });
