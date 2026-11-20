import {
  decaler,
  ouvreCourantOuPrecedent,
  ouvreCourantOuSuivant,
  ouvreSuivant,
} from './calendrier.js';
import type { CalendrierCompile } from './calendrier.js';

export interface Contrainte {
  type: 'FD' | 'DD' | 'FF';
  delai: number;
  debutP: number;
  finP: number;
}

/** Début au plus tôt d'une activité : maximum du plancher (D0, début du projet) et des contraintes FD et DD. */
export function debutPlusTot(
  cal: CalendrierCompile,
  plancher: number,
  contraintes: readonly Contrainte[],
): number {
  let debut = plancher;
  for (const c of contraintes) {
    if (c.type === 'FD') debut = Math.max(debut, decaler(cal, ouvreSuivant(cal, c.finP), c.delai));
    else if (c.type === 'DD') debut = Math.max(debut, decaler(cal, c.debutP, c.delai));
  }
  return debut;
}

/** Fin cible d'une activité : maximum de (fin de P + n) pour les dépendances FF ; null sans FF. */
export function finCible(
  cal: CalendrierCompile,
  contraintes: readonly Contrainte[],
): number | null {
  let cible: number | null = null;
  for (const c of contraintes) {
    if (c.type === 'FF') {
      const f = decaler(cal, c.finP, c.delai);
      cible = cible === null ? f : Math.max(cible, f);
    }
  }
  return cible;
}

/**
 * Barre de `duree` jours ouvrés. Avec une fin cible, elle y finit si son début reste ≥ au début
 * au plus tôt ; sinon elle commence au premier jour ouvré à partir de ce début.
 */
export function positionBarre(
  cal: CalendrierCompile,
  debutPlusTotJour: number,
  duree: number,
  cible: number | null,
): { debut: number; fin: number } {
  if (cible !== null) {
    const fin = ouvreCourantOuPrecedent(cal, cible);
    const debut = decaler(cal, fin, -(duree - 1));
    if (debut >= debutPlusTotJour) return { debut, fin };
  }
  const debut = ouvreCourantOuSuivant(cal, debutPlusTotJour);
  return { debut, fin: decaler(cal, debut, duree - 1) };
}

/**
 * Contrôle d'une dépendance vers une feuille à dates imposées (SPEC 5.3), sur le calendrier par défaut :
 * FD et DD comparent le début de S au début au plus tôt exigé, FF la fin de S à la fin exigée.
 */
export function dependanceRespectee(
  cal: CalendrierCompile,
  c: Contrainte,
  debutS: number,
  finS: number,
): boolean {
  if (c.type === 'FF') return finS >= decaler(cal, c.finP, c.delai);
  return debutS >= debutPlusTot(cal, Number.NEGATIVE_INFINITY, [c]);
}
