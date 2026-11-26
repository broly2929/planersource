import type { Db } from '../db/erreurs.js';
import { lireTauxRessources, resoudreTaux } from './taux.js';

/**
 * Coûts d'un projet (SPEC §12.3, D-229) : calculés à la lecture, jamais stockés. Les fonctions de calcul
 * sont pures : la date du jour est un paramètre, aucune horloge.
 */

export interface PeriodeTaux {
  debut: string;
  /** null = période ouverte. */
  fin: string | null;
  montant: number;
}

export interface Imputation {
  jour: string;
  charge: number;
}

/** Une assignation (feuille) avec les taux de sa ressource et ses imputations. */
export interface LigneAssignation {
  activite_id: number;
  /** Taux propres. */
  taux: PeriodeTaux[];
  /** Taux de l'équipe actuelle (§12.6 point 3). */
  taux_equipe?: PeriodeTaux[];
  charge_assignee: number;
  reste_a_faire: number;
  imputations: Imputation[];
}

export interface Cout {
  planifie: number;
  impute: number;
  reel: number;
  taux_manquant: boolean;
}

const arrondi = (n: number): number => Math.round(n * 100) / 100;

const AUCUN: Cout = { planifie: 0, impute: 0, reel: 0, taux_manquant: false };

/** Coût d'une assignation (§12.3 points 2, 3, 6). */
export function coutAssignation(l: LigneAssignation, jour: string): Cout {
  const equipe = l.taux_equipe ?? [];
  // Ressource sans aucune période, propre ou d'équipe : coût 0, sans avertissement (§12.3 point 8).
  if (l.taux.length + equipe.length === 0) return { ...AUCUN };
  let manquant = false;
  const part = (charge: number, date: string): number => {
    if (charge <= 0) return 0;
    const resolu = resoudreTaux(l.taux, equipe, date);
    if (!resolu) {
      manquant = true;
      return 0;
    }
    return arrondi(charge * resolu.montant);
  };
  const planifie = part(l.charge_assignee, jour);
  const impute = arrondi(l.imputations.reduce((s, i) => s + part(i.charge, i.jour), 0));
  const reel = arrondi(impute + part(l.reste_a_faire, jour));
  return { planifie, impute, reel, taux_manquant: manquant };
}

function somme(a: Cout, b: Cout): Cout {
  return {
    planifie: arrondi(a.planifie + b.planifie),
    impute: arrondi(a.impute + b.impute),
    reel: arrondi(a.reel + b.reel),
    taux_manquant: a.taux_manquant || b.taux_manquant,
  };
}

/**
 * Coûts de chaque activité (feuille = somme de ses assignations, parent = somme de ses descendants) et du
 * projet (somme de toutes les feuilles, §12.3 point 4). `parents` associe chaque activité à son parent.
 */
export function coutsActivites(
  lignes: LigneAssignation[],
  parents: Map<number, number | null>,
  jour: string,
): { activites: Map<number, Cout>; projet: Cout } {
  const activites = new Map<number, Cout>([...parents.keys()].map((id) => [id, { ...AUCUN }]));
  let projet: Cout = { ...AUCUN };
  for (const l of lignes) {
    const c = coutAssignation(l, jour);
    projet = somme(projet, c);
    const vus = new Set<number>();
    for (
      let id: number | null | undefined = l.activite_id;
      id !== null && id !== undefined && !vus.has(id);
      id = parents.get(id)
    ) {
      vus.add(id);
      activites.set(id, somme(activites.get(id) ?? AUCUN, c));
    }
  }
  return { activites, projet };
}

/** Coûts du projet à la date du jour : lecture des assignations, taux et imputations. */
export async function lireCouts(db: Db, projetId: number, jour: string) {
  const { rows: assignations } = await db.query<{
    id: number;
    activite_id: number;
    ressource_id: number;
    charge_assignee: number;
    reste_a_faire: number;
  }>(
    `SELECT id, activite_id, ressource_id, charge_assignee, reste_a_faire
       FROM assignation WHERE projet_id = $1 ORDER BY id`,
    [projetId],
  );
  const taux = await lireTauxRessources(db, [...new Set(assignations.map((s) => s.ressource_id))]);
  const { rows: imputations } = await db.query<Imputation & { assignation_id: number }>(
    `SELECT i.assignation_id, i.jour::text AS jour, i.charge
       FROM imputation i JOIN assignation s ON s.id = i.assignation_id
      WHERE s.projet_id = $1`,
    [projetId],
  );
  const { rows: elements } = await db.query<{ id: number; parent_id: number | null }>(
    `SELECT id, parent_id FROM element WHERE projet_id = $1 AND type = 'activite'`,
    [projetId],
  );
  const parents = new Map(elements.map((e) => [e.id, e.parent_id]));
  const lignes: LigneAssignation[] = assignations.map((s) => ({
    activite_id: s.activite_id,
    charge_assignee: s.charge_assignee,
    reste_a_faire: s.reste_a_faire,
    taux: taux.get(s.ressource_id)?.propres ?? [],
    taux_equipe: taux.get(s.ressource_id)?.equipe ?? [],
    imputations: imputations.filter((i) => i.assignation_id === s.id),
  }));
  return coutsActivites(lignes, parents, jour);
}

/** Clés de coût d'une activité ou du projet, pour qui écrit sur le projet. */
export const champsCout = (c: Cout) => ({
  cout_planifie: c.planifie,
  cout_impute: c.impute,
  cout_reel: c.reel,
  taux_manquant: c.taux_manquant,
});
