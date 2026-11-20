import { joursDepuis } from '../dates.js';
import type { Activite } from '../types.js';
import { plancherStart } from './start.js';

/** STARR : même plancher que START. */
export const plancherStarr = plancherStart;

/** Clé de tri de la passe B : STARR d'abord, par début validé croissant (SPEC 5.2). */
export function cleStarr(e: { type: string; mode?: string; debutValide?: string }): {
  starr: boolean;
  debutValide: number;
} {
  const starr = e.type === 'activite' && e.mode === 'STARR';
  return {
    starr,
    debutValide: starr && e.debutValide !== undefined ? joursDepuis(e.debutValide) : 0,
  };
}

/** `debut_non_respecte` : premier jour portant du travail postérieur au début validé, comparaison littérale. */
export function drapeauxStarr(premier: number, act: Activite): string[] {
  return act.debutValide !== undefined && premier > joursDepuis(act.debutValide)
    ? ['debut_non_respecte']
    : [];
}
