/** Annulation des gestes du Gantt du projet (REX-3b, D-127 (3) à (5), D-129 (2)) : pile bornée et requêtes inverses. */
import type { DatesContour } from '../screens/projet/contours';

/** Nombre maximal de gestes gardés : le 21e chasse le plus ancien. */
export const TAILLE_PILE = 20;

type Valeur = string | number | null;

/** Ce qu'il faut faire pour défaire un geste. */
export type Inverse =
  | {
      genre: 'barre';
      id: number;
      corps: Record<string, Valeur>;
      /** Contour de l'élément avant le geste (dates), ou null s'il n'y en avait pas. */
      contour: DatesContour | null;
    }
  | { genre: 'supprimer-lien'; id: number }
  | {
      genre: 'recreer-lien';
      projetId: number;
      /** Identifiant de la dépendance supprimée, remplacé dans la pile par celui de la recréée. */
      ancienId: number;
      corps: { predecesseur_id: number; successeur_id: number; type: string; delai: number };
    }
  | { genre: 'ligne'; id: number; parent_id: number | null; rang: number };

export interface RequeteInverse {
  methode: 'PATCH' | 'POST' | 'DELETE';
  chemin: string;
  corps?: Record<string, unknown>;
}

/** Barre : mêmes clés que le corps du geste, valeurs d'avant (null si absentes ou nulles). */
export function inverseBarre(
  avant: { id: number },
  corps: Record<string, unknown>,
  contour: DatesContour | null,
): Inverse {
  const inverse: Record<string, Valeur> = {};
  for (const cle of Object.keys(corps))
    inverse[cle] = ((avant as Record<string, unknown>)[cle] as Valeur | undefined) ?? null;
  return { genre: 'barre', id: avant.id, corps: inverse, contour };
}

export const inverseLienCree = (id: number): Inverse => ({ genre: 'supprimer-lien', id });

export function inverseLienSupprime(
  projetId: number,
  d: { id: number; predecesseur_id: number; successeur_id: number; type: string; delai: number },
): Inverse {
  return {
    genre: 'recreer-lien',
    projetId,
    ancienId: d.id,
    corps: {
      predecesseur_id: d.predecesseur_id,
      successeur_id: d.successeur_id,
      type: d.type,
      delai: d.delai,
    },
  };
}

export const inverseLigne = (l: {
  id: number;
  parent_id: number | null;
  rang: number;
}): Inverse => ({
  genre: 'ligne',
  id: l.id,
  parent_id: l.parent_id,
  rang: l.rang,
});

export function requeteInverse(inverse: Inverse): RequeteInverse {
  switch (inverse.genre) {
    case 'barre':
      return { methode: 'PATCH', chemin: `/api/activites/${inverse.id}`, corps: inverse.corps };
    case 'supprimer-lien':
      return { methode: 'DELETE', chemin: `/api/dependances/${inverse.id}` };
    case 'recreer-lien':
      return {
        methode: 'POST',
        chemin: `/api/projets/${inverse.projetId}/dependances`,
        corps: inverse.corps,
      };
    case 'ligne':
      return {
        methode: 'POST',
        chemin: `/api/elements/${inverse.id}/deplacer`,
        corps: { parent_id: inverse.parent_id, rang: inverse.rang },
      };
  }
}

export const vider = (): Inverse[] => [];

export const empiler = (pile: Inverse[], inverse: Inverse): Inverse[] =>
  [...pile, inverse].slice(-TAILLE_PILE);

export function depiler(pile: Inverse[]): { inverse: Inverse | null; pile: Inverse[] } {
  if (pile.length === 0) return { inverse: null, pile: [] };
  return { inverse: pile[pile.length - 1]!, pile: pile.slice(0, -1) };
}

/** Recalcul automatique (D-131) : les contours mémorisés sont périmés, les entrées « barre » n'en gardent aucun. */
export const sansContours = (pile: Inverse[]): Inverse[] =>
  pile.map((i) => (i.genre === 'barre' ? { ...i, contour: null } : i));

/** Lien recréé : son nouvel identifiant remplace l'ancien dans les inverses « supprimer le lien » de la pile. */
export const renumeroterLien = (pile: Inverse[], ancien: number, nouveau: number): Inverse[] =>
  pile.map((i) => (i.genre === 'supprimer-lien' && i.id === ancien ? { ...i, id: nouveau } : i));
