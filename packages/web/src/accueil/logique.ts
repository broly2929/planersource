// Règles pures de l'Accueil (G2, D-080, D-081). Sans accès réseau.
import { joursConnus } from '../gantt/plage';
import type { ElementGantt } from '../gantt/GanttSvg';
import { aplatir, racines, type LigneArbre, type ProjetArbre } from '../projets/arbre';

export interface ProjetAccueil extends ProjetArbre {
  clos: boolean;
  date_debut: string;
  debut_planifie: string | null;
  fin_planifiee: string | null;
}

/** Projets ordinaires, sans les projets clos ni toute leur descendance (D-081), ordre d'entrée. */
export function projetsVisibles<P extends ProjetAccueil>(projets: P[]): P[] {
  const masques = new Set<number>(projets.filter((p) => p.clos).map((p) => p.id));
  let ajoute = true;
  while (ajoute) {
    ajoute = false;
    for (const p of projets) {
      if (p.parent_id !== null && masques.has(p.parent_id) && !masques.has(p.id)) {
        masques.add(p.id);
        ajoute = true;
      }
    }
  }
  return projets.filter((p) => !p.est_modele && !masques.has(p.id));
}

/** Racines affichées : projets visibles, puis racines et tri de D-079 (2). */
export function projetsAccueil<P extends ProjetAccueil>(projets: P[]): P[] {
  return racines(projetsVisibles(projets));
}

/** Lignes visibles de l'arbre de l'Accueil (D-079 (4)) sur les projets visibles (D-081). */
export function lignesAccueil<P extends ProjetAccueil, E extends ElementGantt>(
  projets: P[],
  ouverts: Set<number>,
  elements: Map<number, E[]>,
): LigneArbre<P, E>[] {
  return aplatir(projetsVisibles(projets), ouverts, elements);
}

/** Entrée de `calculerPlage` : plus petite date de début des projets affichés et leurs dates planifiées. */
export function joursAccueil(
  affiches: ProjetAccueil[],
  charges?: Map<number, ElementGantt[]>,
): {
  debutProjet: string | null;
  jours: string[];
} {
  const debuts = affiches.map((p) => p.date_debut).sort();
  const jours: string[] = [];
  for (const p of affiches) {
    if (p.debut_planifie) jours.push(p.debut_planifie);
    if (p.fin_planifiee) jours.push(p.fin_planifiee);
  }
  for (const elements of charges?.values() ?? []) {
    jours.push(...joursConnus(elements.map((element) => ({ genre: 'element' as const, element }))));
  }
  return { debutProjet: debuts[0] ?? null, jours };
}

/** Noms des éléments chargés, tous projets confondus (résolution des noms d'un refus de calcul, G4). */
export function nomsElementsCharges(charges: Map<number, ElementGantt[]>): Map<number, string> {
  const noms = new Map<number, string>();
  for (const elements of charges.values()) for (const e of elements) noms.set(e.id, e.nom);
  return noms;
}
