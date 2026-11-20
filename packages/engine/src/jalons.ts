import { decaler, ouvreCourantOuSuivant } from './calendrier.js';
import type { CalendrierCompile } from './calendrier.js';
import type { Contrainte } from './dependances.js';
import { joursDepuis } from './dates.js';
import type { Jalon } from './types.js';

/** Jour exigé par une dépendance : FD et FF = fin de P + n ; DD = début de P + n. */
function exigence(cal: CalendrierCompile, c: Contrainte): number {
  return decaler(cal, c.type === 'DD' ? c.debutP : c.finP, c.delai);
}

/**
 * Jalon fixe : sa date validée, en retard si une dépendance exige une date postérieure.
 * Jalon flottant : maximum du plancher, de la date validée (pas avant) et des exigences, ramené
 * au jour ouvré courant ou suivant.
 */
export function dateJalon(
  cal: CalendrierCompile,
  jalon: Jalon,
  plancher: number,
  contraintes: readonly Contrainte[],
): { date: number; retard: boolean } {
  const exigences = contraintes.map((c) => exigence(cal, c));
  if (jalon.nature === 'fixe' && jalon.dateValidee !== undefined) {
    const date = joursDepuis(jalon.dateValidee);
    return { date, retard: exigences.some((e) => e > date) };
  }
  const validee = jalon.dateValidee === undefined ? plancher : joursDepuis(jalon.dateValidee);
  return {
    date: ouvreCourantOuSuivant(cal, Math.max(plancher, validee, ...exigences)),
    retard: false,
  };
}
