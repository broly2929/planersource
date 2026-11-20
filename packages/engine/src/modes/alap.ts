import { joursDepuis } from '../dates.js';
import type { Activite } from '../types.js';

/** Fin cible d'un ALAP : la FF prime, sinon la fin validée ; null sans l'une ni l'autre (ASAP). */
export function cibleAlap(act: Activite, cibleFF: number | null): number | null {
  if (cibleFF !== null) return cibleFF;
  return act.finValide === undefined ? null : joursDepuis(act.finValide);
}

/** `retard` : fin planifiée postérieure à la fin validée. */
export function drapeauxAlap(dernier: number, act: Activite): string[] {
  return act.finValide !== undefined && dernier > joursDepuis(act.finValide) ? ['retard'] : [];
}
