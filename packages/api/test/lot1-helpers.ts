import type { LightMyRequestResponse } from 'fastify';
import { expect } from 'vitest';
import { login, seedUser, type Role, type TestCtx } from './helpers.js';

export type Corps = Record<string, unknown>;

export interface Acteur {
  id: number;
  email: string;
  cookie: string;
}

/** Crée un utilisateur (ressource ou non) et ouvre sa session. */
export async function creerActeur(
  ctx: TestCtx,
  email: string,
  role: Role,
  estRessource = false,
): Promise<Acteur> {
  const id = await seedUser(ctx.pool, { email, role });
  if (estRessource) {
    await ctx.pool.query('UPDATE utilisateur SET est_ressource = true WHERE id = $1', [id]);
  }
  const { cookie } = await login(ctx.app, email);
  return { id, email, cookie: cookie ?? '' };
}

/** Appels HTTP de l'API, avec le cookie d'un acteur ou sans session. */
export function appel(ctx: TestCtx, acteur?: Acteur) {
  const call = (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    payload?: Corps,
  ): Promise<LightMyRequestResponse> =>
    ctx.app.inject({
      method,
      url,
      ...(payload ? { payload } : {}),
      headers: acteur ? { cookie: acteur.cookie } : {},
    });
  return {
    get: (url: string) => call('GET', url),
    post: (url: string, payload?: Corps) => call('POST', url, payload ?? {}),
    patch: (url: string, payload: Corps) => call('PATCH', url, payload),
    delete: (url: string) => call('DELETE', url),
  };
}

export const corps = (res: LightMyRequestResponse): Corps => res.json() as Corps;
export const liste = (res: LightMyRequestResponse): Corps[] => res.json() as Corps[];

let compteur = 0;

/** Crée un projet par l'API (201 attendu) et renvoie sa représentation. */
export async function creerProjet(
  ctx: TestCtx,
  par: Acteur,
  champs: Corps = {},
): Promise<Corps & { id: number }> {
  compteur += 1;
  const res = await appel(ctx, par).post('/api/projets', {
    code: `P${compteur}`,
    nom: `Projet ${compteur}`,
    date_debut: '2027-01-04',
    chef_id: par.id,
    ...champs,
  });
  expect(res.statusCode).toBe(201);
  return corps(res) as Corps & { id: number };
}

/** Crée un calendrier par l'API (201 attendu). */
export async function creerCalendrier(
  ctx: TestCtx,
  par: Acteur,
  champs: Corps = {},
): Promise<Corps & { id: number }> {
  compteur += 1;
  const res = await appel(ctx, par).post('/api/calendriers', {
    nom: `Calendrier ${compteur}`,
    ...champs,
  });
  expect(res.statusCode).toBe(201);
  return corps(res) as Corps & { id: number };
}

/** Affecte une ressource à un projet directement en base (indépendant des routes d'affectation). */
export async function affecter(
  ctx: TestCtx,
  projetId: number,
  ressourceId: number,
  taux = 100,
): Promise<void> {
  await ctx.pool.query(
    'INSERT INTO affectation_projet (projet_id, ressource_id, taux) VALUES ($1, $2, $3)',
    [projetId, ressourceId, taux],
  );
}
