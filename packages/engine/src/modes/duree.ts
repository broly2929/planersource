import { decaler, estOuvre, ouvreCourantOuSuivant } from '../calendrier.js';
import type { CalendrierCompile } from '../calendrier.js';
import { positionBarre } from '../dependances.js';

/** Fenêtre d'un mode à durée (FDUR, DDUR), en jours depuis 1970. */
export interface Fenetre {
  debut: number;
  fin: number;
}

/**
 * Fenêtre de `n` jours ouvrés du calendrier par défaut : calée sur la fin cible FF, avec repli au début
 * au plus tôt. Si du travail réel précède le début au plus tôt, elle part du premier jour réel (SPEC 5.6).
 */
export function fenetreDuree(
  cal: CalendrierCompile,
  debutPlusTot: number,
  n: number,
  cibleFF: number | null,
  premierReel: number | null,
): Fenetre {
  if (premierReel !== null && premierReel < debutPlusTot) {
    const debut = ouvreCourantOuSuivant(cal, premierReel);
    return { debut, fin: decaler(cal, debut, n - 1) };
  }
  return positionBarre(cal, debutPlusTot, n, cibleFF);
}

/** Jours ouvrés du calendrier par défaut dans [debut, fin]. */
export function joursDeFenetre(cal: CalendrierCompile, debut: number, fin: number): number[] {
  const jours: number[] = [];
  for (let j = debut; j <= fin; j += 1) if (estOuvre(cal, j)) jours.push(j);
  return jours;
}

/** `retard` : fin planifiée postérieure à la fin de la fenêtre ; `surcharge` : un jour au moins en surcharge (SPEC 5.9). */
export function drapeauxDuree(dernier: number, fenetre: Fenetre, surcharge: boolean): string[] {
  return [...(dernier > fenetre.fin ? ['retard'] : []), ...(surcharge ? ['surcharge'] : [])];
}
