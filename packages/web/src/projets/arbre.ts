// Arborescence de l'écran Projets (REX-2, R2-C, D-079). Fonctions pures, sans accès réseau.

export interface ProjetArbre {
  id: number;
  code: string;
  nom: string;
  parent_id: number | null;
  peut_ecrire: boolean;
  est_modele: boolean;
}

export interface ElementArbre {
  id: number;
  type: string;
  wbs: string;
  nom: string;
}

export type LigneArbre<P extends ProjetArbre = ProjetArbre, E extends ElementArbre = ElementArbre> =
  | { type: 'projet'; projet: P; profondeur: number }
  | { type: 'element'; element: E; profondeur: number };

const parCode = (a: { code: string }, b: { code: string }) =>
  a.code.toLowerCase().localeCompare(b.code.toLowerCase());

/** Racines : sans parent, ou dont le parent n'est pas dans la liste visible. Triées par code, sans casse. */
export function racines<P extends ProjetArbre>(projets: P[]): P[] {
  const ids = new Set(projets.map((p) => p.id));
  return projets.filter((p) => p.parent_id === null || !ids.has(p.parent_id)).sort(parCode);
}

/** Sous-projets directs d'un projet, triés par code sans tenir compte de la casse. */
export function sousProjets<P extends ProjetArbre>(projets: P[], parentId: number): P[] {
  return projets.filter((p) => p.parent_id === parentId).sort(parCode);
}

/**
 * Lignes visibles de l'arbre. Sous un projet déplié : ses éléments (ordre reçu, ordre WBS), puis ses
 * sous-projets. Profondeur d'un élément : celle du projet plus le nombre de niveaux de son WBS.
 */
export function aplatir<P extends ProjetArbre, E extends ElementArbre>(
  projets: P[],
  ouverts: Set<number>,
  elements: Map<number, E[]>,
): LigneArbre<P, E>[] {
  const lignes: LigneArbre<P, E>[] = [];
  const visiter = (p: P, profondeur: number) => {
    lignes.push({ type: 'projet', projet: p, profondeur });
    if (!ouverts.has(p.id)) return;
    for (const element of elements.get(p.id) ?? []) {
      lignes.push({
        type: 'element',
        element,
        profondeur: profondeur + element.wbs.split('.').length,
      });
    }
    for (const sous of sousProjets(projets, p.id)) visiter(sous, profondeur + 1);
  };
  for (const r of racines(projets)) visiter(r, 0);
  return lignes;
}

/** Identifiants d'un projet et de tous ses descendants. */
function descendance(projets: ProjetArbre[], id: number): Set<number> {
  const ensemble = new Set([id]);
  let ajoute = true;
  while (ajoute) {
    ajoute = false;
    for (const p of projets) {
      if (p.parent_id !== null && ensemble.has(p.parent_id) && !ensemble.has(p.id)) {
        ensemble.add(p.id);
        ajoute = true;
      }
    }
  }
  return ensemble;
}

/** Options de « Projet parent » : projets ordinaires où l'on écrit, par code ; sans le projet ni ses descendants. */
export function optionsProjetParent(
  projets: ProjetArbre[],
  modifieId?: number,
): { value: string; label: string }[] {
  const exclus = modifieId === undefined ? new Set<number>() : descendance(projets, modifieId);
  return projets
    .filter((p) => !p.est_modele && p.peut_ecrire && !exclus.has(p.id))
    .sort(parCode)
    .map((p) => ({ value: String(p.id), label: `${p.code} — ${p.nom}` }));
}

export const PAS_INDENTATION = 4;
// Bouton de dépliage (size-8) + gap-2 = 10 pas : les lignes sans chevron s'alignent sur le nom du projet.
export const PAS_CHEVRON = 10;
export const indentation = (profondeur: number, sansChevron = false) => ({
  paddingLeft: `calc(var(--spacing) * ${PAS_INDENTATION * profondeur + (sansChevron ? PAS_CHEVRON : 0)})`,
});
