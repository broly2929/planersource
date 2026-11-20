import type { Dependance, Entree } from './types.js';

/** Lecture d'une clé qui doit exister (entrée validée). */
export function requis<K, V>(m: ReadonlyMap<K, V>, cle: K): V {
  const v = m.get(cle);
  if (v === undefined) throw new Error(`clé absente : ${String(cle)}`);
  return v;
}

export interface Arbre {
  enfants: ReadonlyMap<number, number[]>;
  parents: ReadonlyMap<number, number | null>;
  /** éléments sans enfant, dans l'ordre de l'entrée */
  feuilles: number[];
  /** `id` s'il est une feuille, sinon ses descendants qui sont des feuilles */
  feuillesDe(id: number): number[];
  descendants(id: number): number[];
  /** parent, grand-parent, … */
  ancetres(id: number): number[];
}

export function construireArbre(elements: Entree['elements']): Arbre {
  const enfants = new Map<number, number[]>();
  const parents = new Map<number, number | null>();
  for (const e of elements) {
    parents.set(e.id, e.parentId);
    if (e.parentId !== null) enfants.set(e.parentId, [...(enfants.get(e.parentId) ?? []), e.id]);
  }
  const descendants = (id: number): number[] =>
    (enfants.get(id) ?? []).flatMap((c) => [c, ...descendants(c)]);
  const feuillesDe = (id: number): number[] =>
    enfants.has(id) ? descendants(id).filter((d) => !enfants.has(d)) : [id];
  const ancetres = (id: number): number[] => {
    const p = parents.get(id) ?? null;
    return p === null ? [] : [p, ...ancetres(p)];
  };
  return {
    enfants,
    parents,
    feuilles: elements.filter((e) => !enfants.has(e.id)).map((e) => e.id),
    feuillesDe,
    descendants,
    ancetres,
  };
}

/**
 * Arêtes pour la détection des cycles : un parent dépend de ses descendants (enfant → parent) ;
 * une dépendance P → S vaut aussi pour chaque descendant de S.
 */
export function aretesDeCycle(
  elements: Entree['elements'],
  dependances: readonly Dependance[],
  arbre: Arbre,
): Map<number, number[]> {
  const a = new Map<number, number[]>();
  const ajouter = (de: number, vers: number): void => {
    a.set(de, [...(a.get(de) ?? []), vers]);
  };
  for (const e of elements) if (e.parentId !== null) ajouter(e.id, e.parentId);
  for (const d of dependances) {
    ajouter(d.predecesseurId, d.successeurId);
    for (const x of arbre.descendants(d.successeurId)) ajouter(d.predecesseurId, x);
  }
  return a;
}

/** Ids des nœuds qui appartiennent à une composante fortement connexe de taille ≥ 2 ou à une boucle sur soi. */
export function idsEnCycle(
  noeuds: readonly number[],
  succ: ReadonlyMap<number, number[]>,
): number[] {
  const index = new Map<number, number>();
  const bas = new Map<number, number>();
  const pile: number[] = [];
  const surPile = new Set<number>();
  const enCycle = new Set<number>();
  let compteur = 0;
  const visiter = (v: number): void => {
    index.set(v, compteur);
    bas.set(v, compteur);
    compteur += 1;
    pile.push(v);
    surPile.add(v);
    for (const w of succ.get(v) ?? []) {
      if (!index.has(w)) {
        visiter(w);
        bas.set(v, Math.min(requis(bas, v), requis(bas, w)));
      } else if (surPile.has(w)) {
        bas.set(v, Math.min(requis(bas, v), requis(index, w)));
      }
    }
    if (requis(bas, v) === requis(index, v)) {
      const composante: number[] = [];
      let w: number;
      do {
        w = pile.pop() as number;
        surPile.delete(w);
        composante.push(w);
      } while (w !== v);
      const boucle = composante.length === 1 && (succ.get(v) ?? []).includes(v);
      if (composante.length >= 2 || boucle) for (const x of composante) enCycle.add(x);
    }
  };
  for (const n of noeuds) if (!index.has(n)) visiter(n);
  return [...enCycle].sort((x, y) => x - y);
}
