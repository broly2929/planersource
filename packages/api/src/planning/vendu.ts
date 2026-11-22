import type { Db } from '../db/erreurs.js';
import type { Activite, Jalon } from './elements.js';

/** Charge vendue, marge et écart client (lot 6c, D-149 (4), (5)) : calculés à la lecture, jamais stockés. */

const JOUR = 86_400_000;

/** Jours calendaires entre deux dates AAAA-MM-JJ (entier signé), null si l'une manque. */
export function ecartClient(planifiee: string | null, client: string | null): number | null {
  if (planifiee === null || client === null) return null;
  return Math.round((Date.parse(planifiee) - Date.parse(client)) / JOUR);
}

export interface Vendu {
  charge_vendue: number | null;
  marge: number | null;
}

/**
 * Charge vendue et marge de chaque activité du projet qui en a une : feuille = sa valeur et
 * vendue − assignée ; parent = sommes des feuilles descendantes renseignées. Absent = null.
 */
export async function lireVendu(db: Db, projetId: number): Promise<Map<number, Vendu>> {
  const { rows } = await db.query<{ id: number; charge_vendue: number; marge: number }>(
    `WITH RECURSIVE lignee (racine, descendant) AS (
       SELECT id, id FROM element WHERE projet_id = $1 AND type = 'activite'
       UNION ALL
       SELECT l.racine, e.id FROM lignee l JOIN element e ON e.parent_id = l.descendant
     ), assigne AS (
       SELECT s.activite_id, sum(s.charge_assignee) AS charge FROM assignation s
        WHERE s.projet_id = $1 GROUP BY s.activite_id
     )
     SELECT l.racine AS id, sum(a.charge_vendue) AS charge_vendue,
            sum(a.charge_vendue - COALESCE(s.charge, 0)) AS marge
       FROM lignee l
       JOIN activite a ON a.id = l.descendant
       LEFT JOIN assigne s ON s.activite_id = l.descendant
      WHERE a.charge_vendue IS NOT NULL
      GROUP BY l.racine`,
    [projetId],
  );
  return new Map(rows.map((r) => [r.id, { charge_vendue: r.charge_vendue, marge: r.marge }]));
}

export const AUCUN: Vendu = { charge_vendue: null, marge: null };

/** Champs de 6c d'une activité, pour qui écrit sur le projet. */
export const champsActivite = (vendu: Map<number, Vendu>, id: number): Vendu =>
  vendu.get(id) ?? AUCUN;

/** Champs de 6c d'un jalon, pour qui écrit sur le projet. */
export function champsJalon(j: { date_planifiee: string | null; date_client: string | null }) {
  const ecart = ecartClient(j.date_planifiee, j.date_client);
  return {
    date_client: j.date_client,
    ecart_client: ecart,
    engagement_depasse: ecart !== null && ecart > 0,
  };
}

/** Activité telle que renvoyée par l'API : sans les champs de 6c si l'utilisateur n'écrit pas. */
export function vueActivite(
  a: Activite,
  vendu: Map<number, Vendu>,
  peutEcrire: boolean,
): Record<string, unknown> {
  const reste: Record<string, unknown> = { ...a };
  delete reste.charge_vendue;
  return peutEcrire ? { ...reste, ...champsActivite(vendu, a.id) } : reste;
}

/** Jalon tel que renvoyé par l'API : sans les champs de 6c si l'utilisateur n'écrit pas. */
export function vueJalon(j: Jalon, peutEcrire: boolean) {
  const reste: Record<string, unknown> = { ...j };
  delete reste.date_client;
  return peutEcrire ? { ...reste, ...champsJalon(j) } : reste;
}
