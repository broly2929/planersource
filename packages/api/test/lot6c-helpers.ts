import { expect } from 'vitest';
import type { TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  liste,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import { url, type Monde, type Objet } from './lot1-t2-helpers.js';
import { empreinte } from './lot2a-helpers.js';

/** Clés de 6c (D-149 (4)) portées par les éléments ; `projet.totaux` s'y ajoute côté projet. */
export const CLES_ACTIVITE = ['charge_vendue', 'marge'] as const;
export const CLES_JALON = ['date_client', 'ecart_client', 'engagement_depasse'] as const;
export const CLES_6C = [...CLES_ACTIVITE, ...CLES_JALON] as const;

export const REFUS_PLANNING = 'Règle de planning non respectée';

export const urlGantt = (projetId: number) => `/api/projets/${projetId}/gantt`;

export interface Gantt {
  projet: Corps & { totaux?: Corps };
  elements: (Corps & { id: number })[];
  dependances: Corps[];
  sous_projets: Corps[];
}

export async function lireGantt(ctx: TestCtx, par: Acteur, projetId: number): Promise<Gantt> {
  const res = await appel(ctx, par).get(urlGantt(projetId));
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Gantt;
}

export async function lirePlanning(ctx: TestCtx, par: Acteur, projetId: number): Promise<Objet[]> {
  const res = await appel(ctx, par).get(url.planning(projetId));
  expect(res.statusCode, res.body).toBe(200);
  return liste(res) as Objet[];
}

export const element = <T extends { id: number }>(liste: T[], id: number): T => {
  const e = liste.find((x) => x.id === id);
  expect(e, `élément ${id} absent`).toBeDefined();
  return e!;
};

/** Chef de projet `est_ressource` affecté au projet d'un autre chef : lit sans écrire (D-148 (9)). */
export async function chefLecteur(ctx: TestCtx, m: Monde): Promise<Acteur> {
  const lecteur = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
  await affecter(ctx, m.projet.id, lecteur.id);
  return lecteur;
}

/** La date planifiée d'un jalon est une colonne du moteur : posée par SQL comme le réel. */
export async function poserDatePlanifiee(
  ctx: TestCtx,
  jalonId: number,
  date: string,
): Promise<void> {
  await ctx.pool.query('UPDATE jalon SET date_planifiee = $2 WHERE id = $1', [jalonId, date]);
}

/** Requête refusée : statut (et corps exact si `code`), base identique (historique compris). */
export async function refuse(
  ctx: TestCtx,
  envoyer: () => ReturnType<ReturnType<typeof appel>['post']>,
  statut: number,
  code?: string,
): Promise<void> {
  const avant = await empreinte(ctx);
  const res = await envoyer();
  expect(res.statusCode, res.body).toBe(statut);
  if (code) expect(res.json()).toEqual({ erreur: REFUS_PLANNING, code });
  expect(await empreinte(ctx), 'base modifiée par un refus').toEqual(avant);
}

/** Valeur lue en base : `SELECT <colonne> FROM <table> WHERE id = $1`. */
export async function colonne(
  ctx: TestCtx,
  table: 'activite' | 'jalon',
  nom: 'charge_vendue' | 'date_client',
  id: number,
): Promise<unknown> {
  const sql =
    nom === 'date_client'
      ? `SELECT date_client::text AS v FROM ${table} WHERE id = $1`
      : `SELECT charge_vendue::float8 AS v FROM ${table} WHERE id = $1`;
  const { rows } = await ctx.pool.query<{ v: unknown }>(sql, [id]);
  return rows[0]!.v;
}

export { corps };
