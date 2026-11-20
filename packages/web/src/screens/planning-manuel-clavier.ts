/** Clavier de la grille du Planning manuel (lot 3g, D-114 (6)) : fonctions pures. */

export type Demi = 'matin' | 'apres_midi';
export type Touche = 'droite' | 'gauche' | 'haut' | 'bas' | 'debut' | 'fin';

/** Case de la grille : ligne 0 = première ressource, jour de 1 à nbJours. */
export interface CaseGrille {
  ligne: number;
  jour: number;
  demi: Demi;
}

const TOUCHES: Record<string, Touche> = {
  ArrowRight: 'droite',
  ArrowLeft: 'gauche',
  ArrowUp: 'haut',
  ArrowDown: 'bas',
  Home: 'debut',
  End: 'fin',
};

/** Touche de la grille pour un `KeyboardEvent.key` ; null si elle est sans effet. */
export const toucheGrille = (key: string): Touche | null => TOUCHES[key] ?? null;

/** Case atteinte depuis `c` par `touche`, sans bouclage (aux bornes la case ne change pas). */
export function caseSuivante(
  c: CaseGrille,
  touche: Touche,
  nbLignes: number,
  nbJours: number,
): CaseGrille {
  // Position de demi-case dans la ligne : 0 à 2 * nbJours - 1.
  const rang = (c.jour - 1) * 2 + (c.demi === 'matin' ? 0 : 1);
  const vers = (r: number): CaseGrille => {
    const borne = Math.min(Math.max(r, 0), nbJours * 2 - 1);
    return {
      ligne: c.ligne,
      jour: Math.floor(borne / 2) + 1,
      demi: borne % 2 === 0 ? 'matin' : 'apres_midi',
    };
  };
  switch (touche) {
    case 'droite':
      return vers(rang + 1);
    case 'gauche':
      return vers(rang - 1);
    case 'debut':
      return vers(0);
    case 'fin':
      return vers(nbJours * 2 - 1);
    case 'haut':
      return { ...c, ligne: Math.max(c.ligne - 1, 0) };
    case 'bas':
      return { ...c, ligne: Math.min(c.ligne + 1, nbLignes - 1) };
  }
}
