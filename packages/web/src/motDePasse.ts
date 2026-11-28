/** Longueur minimale d'un nouveau mot de passe (SPEC §8, D-274) : 12 points de code, sans retrait d'espaces. */
export const LONGUEUR_MIN_MOT_DE_PASSE = 12;
export const AIDE_LONGUEUR = '12 caractères au moins';
export const MESSAGE_LONGUEUR = 'Le mot de passe doit contenir au moins 12 caractères.';

/** Validation locale (rien n'est envoyé) : message si le mot de passe est trop court, sinon null. */
export const validerLongueur = (motDePasse: string): string | null =>
  [...motDePasse].length < LONGUEUR_MIN_MOT_DE_PASSE ? MESSAGE_LONGUEUR : null;
