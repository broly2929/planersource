// Logique pure de l'écran Validation (lot 4c, D-135 et ses précisions). Aucune dépendance au DOM.
import type { Statut } from '../imputations/logique';

/** Projet d'une feuille dans GET /api/validations (SPEC §7 API 8). */
export interface ProjetValidation {
  projet_id: number;
  projet_code: string;
  valide: boolean;
  peut_valider: boolean;
}

export interface FeuilleValidation {
  feuille_id: number;
  ressource_id: number;
  ressource_nom: string;
  statut: Statut;
  projets: ProjetValidation[];
}

export const COMMENTAIRE_MAX = 500;
export const AUCUNE_IMPUTATION = 'Aucune imputation';

export interface BadgeProjet {
  texte: string;
  statut: 'success' | 'info' | 'neutre';
}

/** Badge d'un projet selon sa validation, le droit de l'utilisateur et le statut de la feuille (D-135 (b)). */
export function badgeProjet(p: ProjetValidation, statutFeuille: Statut): BadgeProjet {
  if (p.valide) return { texte: `${p.projet_code} · Validé`, statut: 'success' };
  if (!p.peut_valider) return { texte: `${p.projet_code} · Non autorisé`, statut: 'neutre' };
  if (statutFeuille === 'soumise') return { texte: `${p.projet_code} · À valider`, statut: 'info' };
  return { texte: p.projet_code, statut: 'neutre' };
}

export const badgesProjets = (f: FeuilleValidation): BadgeProjet[] =>
  f.projets.map((p) => badgeProjet(p, f.statut));

/** « Valider » : feuille soumise avec au moins un projet à valider par l'utilisateur. */
export const peutValider = (f: FeuilleValidation): boolean =>
  f.statut === 'soumise' && f.projets.some((p) => p.peut_valider && !p.valide);

/** « Rejeter » : feuille soumise avec au moins un projet sur lequel l'utilisateur peut agir. */
export const peutRejeter = (f: FeuilleValidation): boolean =>
  f.statut === 'soumise' && f.projets.some((p) => p.peut_valider);

/** « Dévalider » : feuille soumise ou validée avec au moins un projet validé sur lequel l'utilisateur peut agir (D-176). */
export const peutDevalider = (f: FeuilleValidation): boolean =>
  (f.statut === 'soumise' || f.statut === 'validee') &&
  f.projets.some((p) => p.valide && p.peut_valider);

export const codesDevalidables = (f: FeuilleValidation): string[] =>
  f.projets.filter((p) => p.valide && p.peut_valider).map((p) => p.projet_code);

export const codesValidables = (f: FeuilleValidation): string[] =>
  f.projets.filter((p) => p.peut_valider && !p.valide).map((p) => p.projet_code);

/** Commentaire de rejet : 1 à 500 caractères après retrait des espaces de bord. */
export function analyserCommentaire(texte: string): {
  ok: boolean;
  valeur: string;
  longueur: number;
} {
  const valeur = texte.trim();
  const longueur = valeur.length;
  return { ok: longueur >= 1 && longueur <= COMMENTAIRE_MAX, valeur, longueur };
}

export function messageRefusValidation(status: number, code?: string): string {
  if (status === 422 && code === 'statut_invalide') return 'La feuille a changé de statut.';
  if (status === 422 && code === 'rien_a_devalider')
    return 'La feuille n’a plus de validation à retirer.';
  if (status === 403) return 'Vous n’avez pas le droit d’agir sur cette feuille.';
  if (status === 404) return 'Feuille introuvable.';
  if (status === 400) return 'Données invalides.';
  return 'Une erreur est survenue.';
}

export type ActionOrigine = 'valider' | 'rejeter' | 'devalider';

export type CibleFocus =
  { genre: 'bouton'; action: ActionOrigine } | { genre: 'voir' } | { genre: 'tableau' };

/**
 * Où rendre le focus une fois la liste relue (D-145 (2)) : le bouton d'origine s'il existe encore, sinon
 * « Voir » de la même feuille, sinon le tableau.
 */
export function cibleFocus(
  origine: { feuilleId: number; action: ActionOrigine },
  feuilles: FeuilleValidation[],
): CibleFocus {
  const f = feuilles.find((x) => x.feuille_id === origine.feuilleId);
  if (!f) return { genre: 'tableau' };
  const present =
    origine.action === 'valider'
      ? peutValider(f)
      : origine.action === 'rejeter'
        ? peutRejeter(f)
        : peutDevalider(f);
  return present ? { genre: 'bouton', action: origine.action } : { genre: 'voir' };
}

/** La liste est relue après un refus qui prouve qu'elle est périmée. */
export const relireListe = (status: number, code?: string): boolean =>
  (status === 422 && (code === 'statut_invalide' || code === 'rien_a_devalider')) || status === 404;
