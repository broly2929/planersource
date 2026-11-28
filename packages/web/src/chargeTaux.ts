import { ApiError } from './api';
import { messageErreur } from './screens/projet/commun';

/** Charge depuis le taux (D-276, SPEC §4 « Absences et charge depuis le taux », point 15). */
export const CASE_CHARGE_TAUX = 'Charge depuis le taux';
export const AIDE_CHARGE_TAUX =
  'Recalculée à chaque calcul : taux × capacité × jours ouvrés restants, absences déduites.';
export const AIDE_CHARGE = 'Effet sur le planning : oui.';

/** Texte d'un refus du dialogue d'assignation : codes de la charge depuis le taux, sinon texte commun. */
export function texteRefusAssignation(err: unknown): string {
  if (err instanceof ApiError && err.status === 422) {
    if (err.code === 'mode_incompatible') return "L'activité n'est pas en mode régulier.";
    if (err.code === 'charge_calculee') return 'La charge est calculée depuis le taux.';
  }
  return messageErreur(err);
}
