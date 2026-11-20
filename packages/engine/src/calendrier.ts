import type { Calendrier } from './types.js';
import { joursDepuis, jourSemaine } from './dates.js';

export interface CalendrierCompile {
  readonly jours: ReadonlySet<number>;
  readonly feries: ReadonlySet<number>;
}

export function compilerCalendrier(c: Calendrier): CalendrierCompile {
  return { jours: new Set(c.joursTravailles), feries: new Set(c.feries.map(joursDepuis)) };
}

export function estOuvre(c: CalendrierCompile, d: number): boolean {
  return c.jours.has(jourSemaine(d)) && !c.feries.has(d);
}

/** Jour ouvré suivant strictement `d`. */
export function ouvreSuivant(c: CalendrierCompile, d: number): number {
  let j = d + 1;
  while (!estOuvre(c, j)) j += 1;
  return j;
}

/** `d` s'il est ouvré, sinon le jour ouvré suivant. */
export function ouvreCourantOuSuivant(c: CalendrierCompile, d: number): number {
  return estOuvre(c, d) ? d : ouvreSuivant(c, d);
}

/** Jour ouvré précédent strictement `d`. */
export function ouvrePrecedent(c: CalendrierCompile, d: number): number {
  let j = d - 1;
  while (!estOuvre(c, j)) j -= 1;
  return j;
}

/** Décale de `n` jours ouvrés (négatif : vers l'arrière) ; n = 0 laisse `d` inchangé. */
export function decaler(c: CalendrierCompile, d: number, n: number): number {
  let j = d;
  for (let i = 0; i < n; i += 1) j = ouvreSuivant(c, j);
  for (let i = 0; i > n; i -= 1) j = ouvrePrecedent(c, j);
  return j;
}

/** `d` s'il est ouvré, sinon le jour ouvré précédent. */
export function ouvreCourantOuPrecedent(c: CalendrierCompile, d: number): number {
  return estOuvre(c, d) ? d : ouvrePrecedent(c, d);
}
