import type { Entree } from './types.js';
import { requis } from './graphe.js';

export interface CleTri {
  /** mode STARR : traité avant les autres éléments prêts */
  starr: boolean;
  /** jour du début validé (STARR), sinon 0 */
  debutValide: number;
  prioriteProjet: number;
  prioriteActivite: number;
  /** rangs depuis la racine */
  chemin: number[];
  projetId: number;
  id: number;
}

export function cheminWbs(
  id: number,
  elements: ReadonlyMap<number, Entree['elements'][number]>,
): number[] {
  const e = requis(elements, id);
  return e.parentId === null ? [e.rang] : [...cheminWbs(e.parentId, elements), e.rang];
}

function comparerChemins(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const d = (a[i] as number) - (b[i] as number);
    if (d !== 0) return d;
  }
  return a.length - b.length;
}

/** STARR d'abord (début validé croissant), puis priorité projet, priorité activité, chemin WBS, id de projet, id d'élément. */
export function comparerCles(a: CleTri, b: CleTri): number {
  return (
    Number(b.starr) - Number(a.starr) ||
    (a.starr && b.starr ? a.debutValide - b.debutValide : 0) ||
    a.prioriteProjet - b.prioriteProjet ||
    a.prioriteActivite - b.prioriteActivite ||
    comparerChemins(a.chemin, b.chemin) ||
    a.projetId - b.projetId ||
    a.id - b.id
  );
}
