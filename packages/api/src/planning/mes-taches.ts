import type { Db } from '../db/erreurs.js';
import { lirePlanning } from './elements.js';

/** Mes tâches (lot 6b, D-148 (3), (10)) : lecture seule des assignations ouvertes d'un utilisateur. */
export interface MaTache {
  assignation_id: number;
  projet: { code: string; nom: string };
  activite: { nom: string; wbs: string };
  charge_assignee: number;
  charge_reelle: number;
  reste_a_faire: number;
  debut_planifie: string | null;
  fin_planifiee: string | null;
}

export interface Ligne {
  assignation_id: number;
  projet_id: number;
  activite_id: number;
  code: string;
  projet_nom: string;
  activite_nom: string;
  charge_assignee: number;
  charge_reelle: number;
  reste_a_faire: number;
  debut_planifie: string | null;
  fin_planifiee: string | null;
  drapeaux: string[];
}

/** Numéro WBS et rang dans l'ordre WBS d'une ligne retenue. */
export type InfoWbs = (r: Ligne) => { wbs: string; ordre: number };

/** Ordre des dates planifiées : null en dernier. */
export function comparerDates(x: string | null, y: string | null): number {
  if (x === y) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x < y ? -1 : 1;
}

/** Ordre « projet lisible » : code sans casse, puis projet, puis rang WBS. */
export function comparerProjetWbs(x: Ligne, y: Ligne, info: InfoWbs): number {
  const cx = x.code.toLowerCase();
  const cy = y.code.toLowerCase();
  if (cx !== cy) return cx < cy ? -1 : 1;
  if (x.projet_id !== y.projet_id) return x.projet_id - y.projet_id;
  return info(x).ordre - info(y).ordre;
}

/**
 * Assignations de l'utilisateur sur des activités ouvertes de projets ordinaires ouverts ; sont exclues
 * celles dont une activité ancêtre est close ou dont le projet a un projet ancêtre clos (D-148 (10)).
 * Tri : début planifié (null en dernier), code du projet sans tenir compte de la casse, numéro WBS.
 */
export async function lireLignesRetenues(
  db: Db,
  utilisateurId: number,
): Promise<{ rows: Ligne[]; info: InfoWbs }> {
  const { rows } = await db.query<Ligne>(
    `SELECT s.id AS assignation_id, p.id AS projet_id, a.id AS activite_id, p.code,
            p.nom AS projet_nom, e.nom AS activite_nom, s.charge_assignee, s.charge_reelle,
            s.reste_a_faire, a.debut_planifie, a.fin_planifiee, a.drapeaux
       FROM assignation s
       JOIN activite a ON a.id = s.activite_id
       JOIN element e ON e.id = a.id
       JOIN projet p ON p.id = e.projet_id
      WHERE s.ressource_id = $1 AND NOT a.close AND NOT p.est_modele
        AND NOT EXISTS (
          WITH RECURSIVE chaine (id, parent_id, clos) AS (
            SELECT id, parent_id, clos FROM projet WHERE id = p.id
            UNION ALL
            SELECT q.id, q.parent_id, q.clos FROM projet q JOIN chaine c ON q.id = c.parent_id)
          SELECT 1 FROM chaine WHERE clos)
        AND NOT EXISTS (
          WITH RECURSIVE ancetres (id, parent_id) AS (
            SELECT id, parent_id FROM element WHERE id = e.parent_id
            UNION ALL
            SELECT x.id, x.parent_id FROM element x JOIN ancetres c ON x.id = c.parent_id)
          SELECT 1 FROM ancetres JOIN activite ac ON ac.id = ancetres.id WHERE ac.close)`,
    [utilisateurId],
  );
  // Numéro WBS et rang dans l'ordre WBS, par projet (même calcul que le planning).
  const wbs = new Map<number, Map<number, { wbs: string; ordre: number }>>();
  for (const projetId of new Set(rows.map((r) => r.projet_id))) {
    const planning = await lirePlanning(db, projetId, false);
    wbs.set(projetId, new Map(planning.map((l, i) => [l.id, { wbs: l.wbs, ordre: i }])));
  }
  const info: InfoWbs = (r) => wbs.get(r.projet_id)!.get(r.activite_id)!;
  return { rows, info };
}

/** Mes tâches : lignes retenues, triées début planifié (null en dernier), code du projet, WBS. */
export async function lireMesTaches(db: Db, utilisateurId: number): Promise<MaTache[]> {
  const { rows, info } = await lireLignesRetenues(db, utilisateurId);
  rows.sort(
    (x, y) => comparerDates(x.debut_planifie, y.debut_planifie) || comparerProjetWbs(x, y, info),
  );
  return rows.map((r) => ({
    assignation_id: r.assignation_id,
    projet: { code: r.code, nom: r.projet_nom },
    activite: { nom: r.activite_nom, wbs: info(r).wbs },
    charge_assignee: r.charge_assignee,
    charge_reelle: r.charge_reelle,
    reste_a_faire: r.reste_a_faire,
    debut_planifie: r.debut_planifie,
    fin_planifiee: r.fin_planifiee,
  }));
}
