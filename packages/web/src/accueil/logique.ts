// Règles pures de l'Accueil (G2, D-080, D-081). Sans accès réseau.
import { joursConnus } from '../gantt/plage';
import type { EntreeAnnuaire } from '../annuaire';
import { VIDE, nomBarre } from '../gantt/libelles';
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

/** Ligne du planning d'une ressource (D-157 (2)) ; `projet` et `activite` null : ligne masquée. */
export interface LigneRessource {
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

/** Ressource choisie dans l'adresse `?ressource=<id>` ; invalide ou absente de la liste : `null`, corrigée. */
export function parametresRessource(
  search: URLSearchParams,
  ids: number[],
): { ressource: number | null; corrige: boolean } {
  const brut = search.get('ressource');
  if (brut === null) return { ressource: null, corrige: false };
  const id = /^[1-9]\d{0,9}$/.test(brut) ? Number(brut) : null;
  if (id !== null && ids.includes(id)) return { ressource: id, corrige: false };
  return { ressource: null, corrige: true };
}

/** Recherche d'adresse avec la ressource choisie (ou sans) ; les autres paramètres sont gardés. */
export function rechercheRessource(search: URLSearchParams, id: number | null): string {
  const p = new URLSearchParams(search);
  if (id === null) p.delete('ressource');
  else p.set('ressource', String(id));
  const texte = p.toString();
  return texte === '' ? '' : `?${texte}`;
}

/** Options de « Planning de » : utilisateurs actifs et ressources, nom sans casse, puis identifiant. */
export function optionsRessources(annuaire: EntreeAnnuaire[]): { id: number; nom: string }[] {
  return annuaire
    .filter((u) => u.actif && u.est_ressource)
    .map((u) => ({ id: u.id, nom: u.nom }))
    .sort((a, b) => {
      const x = a.nom.toLowerCase();
      const y = b.nom.toLowerCase();
      return x < y ? -1 : x > y ? 1 : a.id - b.id;
    });
}

export const celluleProjet = (l: LigneRessource): string => l.projet?.code ?? 'Autre projet';

export const celluleActivite = (l: LigneRessource): string =>
  l.activite ? `${l.activite.wbs} ${l.activite.nom}` : VIDE;

/** Nom de la ligne pour la barre : « <code> · <wbs> <nom> » ou « Autre projet ». */
export const nomLigneRessource = (l: LigneRessource): string =>
  l.projet && l.activite ? `${l.projet.code} · ${celluleActivite(l)}` : 'Autre projet';

/** Nom accessible de la barre : « <code> · <wbs> <nom>, du … au …, drapeaux » ou « Autre projet, du … au … ». */
export const nomBarreRessource = (l: LigneRessource): string =>
  nomBarre(nomLigneRessource(l), l.debut_planifie ?? '', l.fin_planifiee ?? '', l.drapeaux);
