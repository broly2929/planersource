import { formaterNombre } from '../gantt/libelles';

export interface ProjetCalcul {
  id: number;
  code: string;
  nom: string;
  parent_id: number | null;
  est_modele: boolean;
  clos: boolean;
  peut_ecrire: boolean;
}

const ouvertEcriture = (p: ProjetCalcul) => p.peut_ecrire && !p.est_modele && !p.clos;

/** Projets proposés (D-114 (8), « racines d'écriture ») : inscriptibles, ni modèle ni clos, dont le parent est absent, en lecture seule ou clos ; triés par code. */
export function projetsListes<T extends ProjetCalcul>(projets: T[]): T[] {
  const parId = new Map(projets.map((p) => [p.id, p]));
  return projets
    .filter((p) => {
      if (!ouvertEcriture(p)) return false;
      const parent = p.parent_id === null ? undefined : parId.get(p.parent_id);
      return !parent || !ouvertEcriture(parent);
    })
    .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

/** Racine d'écriture : remontée par parent_id tant que le parent est connu, inscriptible, ni modèle ni clos. */
export function racineDe(projets: ProjetCalcul[], id: number): number {
  const parId = new Map(projets.map((p) => [p.id, p]));
  let courant = id;
  const vus = new Set<number>();
  for (;;) {
    vus.add(courant);
    const parent = parId.get(courant)?.parent_id;
    const p = parent == null ? undefined : parId.get(parent);
    if (!p || !ouvertEcriture(p) || vus.has(p.id)) return courant;
    courant = p.id;
  }
}

/** Cases cochées à l'ouverture : tous les projets proposés (`'tous'`) ou les racines des projets précochés. */
export function casesInitiales(projets: ProjetCalcul[], precoches: number[] | 'tous'): Set<number> {
  const listes = projetsListes(projets);
  if (precoches === 'tous') return new Set(listes.map((p) => p.id));
  const racines = new Set(precoches.map((id) => racineDe(projets, id)));
  return new Set(listes.filter((p) => racines.has(p.id)).map((p) => p.id));
}

export const libelleProjet = (p: { code: string; nom: string }): string => `${p.code} — ${p.nom}`;

const GENERIQUE = 'Calcul impossible pour le moment. Réessayez.';

export function messageRefus(
  erreur: { status: number; code?: string; ids?: number[] },
  noms: Map<number, string>,
): string {
  if (erreur.status === 409) return 'Un calcul est déjà en cours. Réessayez dans un instant.';
  if (erreur.status === 422 && erreur.ids) {
    const liste = erreur.ids.map((id) => noms.get(id) ?? `élément ${id}`).join(', ');
    if (erreur.code === 'cycle_dependances') {
      return `Calcul impossible : cycle de dépendances entre ${liste}.`;
    }
    if (erreur.code === 'entree_invalide') {
      return `Calcul impossible : données incomplètes sur ${liste}.`;
    }
  }
  return GENERIQUE;
}

export function lignesAvertissements(
  avertissements: { code: string; assignation_id: number; reste: number }[],
  noms: Map<number, { activite: string; ressource: string }>,
): string[] {
  return avertissements
    .filter((a) => a.code === 'reste_non_pose')
    .map((a) => {
      const n = noms.get(a.assignation_id);
      const sujet = n ? `${n.activite} — ${n.ressource}` : `assignation ${a.assignation_id}`;
      return `${sujet} : ${formaterNombre(a.reste)} j non posé`;
    });
}
