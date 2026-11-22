import type { Db } from '../db/erreurs.js';
import { comparerDates, comparerProjetWbs, lireLignesRetenues, type Ligne } from './mes-taches.js';
import { projetsVisibles, type Acteur } from './projets.js';

/** Planning d'une ressource (lot 6e, D-157) : lecture seule, jamais de charge vendue. */
export interface LignePlanning {
  assignation_id: number;
  projet: { id: number; code: string; nom: string } | null;
  activite: { id: number; nom: string; wbs: string } | null;
  debut_planifie: string | null;
  fin_planifiee: string | null;
  charge_assignee: number;
  charge_reelle: number;
  reste_a_faire: number;
  drapeaux: string[];
}

export interface PlanningRessource {
  ressource: { id: number; nom: string; actif: boolean };
  lignes: LignePlanning[];
}

/** `null` si l'utilisateur n'existe pas. */
export async function lirePlanningRessource(
  db: Db,
  acteur: Acteur,
  ressourceId: number,
): Promise<PlanningRessource | null> {
  const { rows: u } = await db.query<{ id: number; nom: string; actif: boolean }>(
    'SELECT id, nom, actif FROM utilisateur WHERE id = $1',
    [ressourceId],
  );
  if (u.length === 0) return null;
  const { rows, info } = await lireLignesRetenues(db, ressourceId);
  const lisibles =
    acteur.role === 'administrateur'
      ? null
      : new Set((await projetsVisibles(db, acteur)).map((p) => p.id));
  const masquee = (r: Ligne) => lisibles !== null && !lisibles.has(r.projet_id);
  // Ordre total : date ; lignes lisibles (code, projet, rang WBS) avant les masquées (assignation_id).
  rows.sort((x, y) => {
    const d = comparerDates(x.debut_planifie, y.debut_planifie);
    if (d !== 0) return d;
    const mx = masquee(x);
    const my = masquee(y);
    if (mx !== my) return mx ? 1 : -1;
    if (mx) return x.assignation_id - y.assignation_id;
    return comparerProjetWbs(x, y, info);
  });
  return {
    ressource: u[0]!,
    lignes: rows.map((r) => {
      const cache = masquee(r);
      return {
        assignation_id: r.assignation_id,
        projet: cache ? null : { id: r.projet_id, code: r.code, nom: r.projet_nom },
        activite: cache ? null : { id: r.activite_id, nom: r.activite_nom, wbs: info(r).wbs },
        debut_planifie: r.debut_planifie,
        fin_planifiee: r.fin_planifiee,
        charge_assignee: r.charge_assignee,
        charge_reelle: r.charge_reelle,
        reste_a_faire: r.reste_a_faire,
        drapeaux: cache ? [] : r.drapeaux,
      };
    }),
  };
}
