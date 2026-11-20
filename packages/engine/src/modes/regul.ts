import { ouvreCourantOuPrecedent, ouvreCourantOuSuivant } from '../calendrier.js';
import type { CalendrierCompile } from '../calendrier.js';
import { joursDepuis } from '../dates.js';
import type { Activite } from '../types.js';

/** Fenêtre REGUL (SPEC 5.6, D-051 Q4) : du maximum de `plancher` (D0, début du projet) et du début validé à la fin validée. */
export interface FenetreRegul {
  debut: number;
  fin: number;
}

/** Dates validées garanties par la validation de l'entrée (ERR-9). */
export function fenetreRegul(act: Activite, plancher: number): FenetreRegul {
  const debut = act.debutValide === undefined ? plancher : joursDepuis(act.debutValide);
  const fin = act.finValide === undefined ? debut : joursDepuis(act.finValide);
  return { debut: Math.max(plancher, debut), fin };
}

/** Tous les jours de la fenêtre, sans filtre : chaque ressource n'en garde que ses jours ouvrés (D-051 Q5). */
export function joursRegul(f: FenetreRegul): number[] {
  const jours: number[] = [];
  for (let j = f.debut; j <= f.fin; j += 1) jours.push(j);
  return jours;
}

/**
 * Sans assignation (D-051 Q9) : jours ouvrés du calendrier par défaut, du début de fenêtre à la fin validée ;
 * fenêtre écoulée ou sans jour ouvré : un jour au début de fenêtre.
 */
export function barreRegul(
  cal: CalendrierCompile,
  f: FenetreRegul,
): { debut: number; fin: number } {
  const debut = ouvreCourantOuSuivant(cal, f.debut);
  const fin = ouvreCourantOuPrecedent(cal, f.fin);
  return fin < debut ? { debut, fin: debut } : { debut, fin };
}

/** `retard` : fin planifiée postérieure à la fin validée (SPEC 5.9, D-051 Q8). */
export function drapeauxRegul(dernier: number, f: FenetreRegul): string[] {
  return dernier > f.fin ? ['retard'] : [];
}
