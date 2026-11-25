import { champsDuMode, type ChampsDuMode } from './champsActivite';

/** Élément du planning d'un projet (GET /api/projets/:id/planning). */
export interface LigneArbo {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  wbs: string;
  nom: string;
}
export interface OptionListe {
  value: string;
  label: string;
}

export const LIBELLE_RACINE = 'Aucune (racine)';

/** Descendants d'un élément, à tous les niveaux. */
export function descendantsDe(lignes: LigneArbo[], id: number): Set<number> {
  const trouves = new Set<number>();
  let ajoute = true;
  while (ajoute) {
    ajoute = false;
    for (const l of lignes) {
      if (
        l.parent_id !== null &&
        (l.parent_id === id || trouves.has(l.parent_id)) &&
        !trouves.has(l.id)
      ) {
        trouves.add(l.id);
        ajoute = true;
      }
    }
  }
  return trouves;
}

/** Ancêtres d'un élément, jusqu'à la racine. */
export function ancetresDe(lignes: LigneArbo[], id: number): Set<number> {
  const trouves = new Set<number>();
  let courant = lignes.find((l) => l.id === id)?.parent_id ?? null;
  while (courant !== null && !trouves.has(courant)) {
    trouves.add(courant);
    courant = lignes.find((l) => l.id === courant)?.parent_id ?? null;
  }
  return trouves;
}

const libelle = (l: LigneArbo): string => `${l.wbs} ${l.nom}`;

/** Liste « Activité parente » (SPEC §6 « Saisie des activités » 1) ; `id` null à la création. */
export function optionsParent(lignes: LigneArbo[], id: number | null): OptionListe[] {
  const exclus = id === null ? new Set<number>() : descendantsDe(lignes, id);
  return [
    { value: '', label: LIBELLE_RACINE },
    ...lignes
      .filter((l) => l.type === 'activite' && l.id !== id && !exclus.has(l.id))
      .map((l) => ({ value: String(l.id), label: libelle(l) })),
  ];
}

/** Vrai si le parent choisi (valeur de la liste, '' = racine) diffère du parent initial. */
export const parentChange = (initial: number | null, choisi: string): boolean =>
  (choisi === '' ? null : Number(choisi)) !== initial;

/** Éléments proposés pour une dépendance : sans l'activité, ses ancêtres ni ses descendants (SPEC §3). */
export function candidatsDependance(lignes: LigneArbo[], id: number): OptionListe[] {
  const exclus = new Set([id, ...ancetresDe(lignes, id), ...descendantsDe(lignes, id)]);
  return lignes
    .filter((l) => !exclus.has(l.id))
    .map((l) => ({ value: String(l.id), label: libelle(l) }));
}

/** Champs de planification d'une activité : une activité parente n'en porte aucun (SPEC §6 « Saisie » 3). */
export function champsActivite(mode: string, estParent: boolean): ChampsDuMode & { mode: boolean } {
  if (estParent) return { mode: false, debut: false, fin: false, duree: false, aideDuree: false };
  return { mode: true, ...champsDuMode(mode) };
}
