/** Gestes à la souris sur les barres du Gantt (3d-3a, D-094) : gestes permis et corps du PATCH. */
import { ajouterJours, jourSemaine, joursEntre, type Zoom } from './echelle';

export type Geste = 'corps' | 'gauche' | 'droite';

export interface ElementGeste {
  type: 'activite' | 'jalon';
  mode?: string | undefined;
  est_parent?: boolean | undefined;
  close?: boolean | undefined;
  debut_valide?: string | null | undefined;
  fin_valide?: string | null | undefined;
  debut_planifie?: string | null | undefined;
  fin_planifiee?: string | null | undefined;
}

export interface CalendrierGeste {
  /** 1 = lundi … 7 = dimanche. */
  jours_travailles: number[];
  feries: { jour: string; libelle: string }[];
}

export interface PermisGestes {
  corps: boolean;
  gauche: boolean;
  droite: boolean;
}

const AUCUN: PermisGestes = { corps: false, gauche: false, droite: false };

/** Gestes permis sur une barre (D-094 (7), (8)). */
export function gestesPermis(element: ElementGeste, peutEcrire: boolean, zoom: Zoom): PermisGestes {
  if (!peutEcrire || zoom === 'mois') return AUCUN;
  if (element.type !== 'activite' || element.est_parent || element.close) return AUCUN;
  if (!element.debut_planifie || !element.fin_planifiee) return AUCUN;
  switch (element.mode) {
    case 'START':
    case 'STARR':
      return { corps: true, gauche: false, droite: false };
    case 'FDUR':
    case 'DDUR':
    case 'REGUL':
      return { corps: true, gauche: true, droite: true };
    case 'ALAP':
      return { corps: false, gauche: false, droite: true };
    default:
      return AUCUN;
  }
}

/** Nombre de jours travaillés du calendrier, fériés exclus, de `debut` à `fin` inclus. */
function joursTravailles(debut: string, fin: string, calendrier: CalendrierGeste): number {
  const feries = new Set(calendrier.feries.map((f) => f.jour));
  let n = 0;
  for (let i = 0, total = joursEntre(debut, fin); i <= total; i++) {
    const jour = ajouterJours(debut, i);
    if (calendrier.jours_travailles.includes(jourSemaine(jour) + 1) && !feries.has(jour)) n++;
  }
  return n;
}

/** Corps du PATCH d'un geste décalé de `decalage` jours, ou null (rien à envoyer) (D-094 (2) à (4)). */
export function corpsPatchGeste(
  element: ElementGeste,
  geste: Geste,
  decalage: number,
  calendrier: CalendrierGeste,
): Record<string, string | number> | null {
  const { debut_planifie: debut, fin_planifiee: fin, debut_valide: dv, fin_valide: fv } = element;
  if (decalage === 0 || !debut || !fin) return null;
  switch (element.mode) {
    case 'START':
    case 'STARR':
      return geste === 'corps' ? { debut_valide: ajouterJours(debut, decalage) } : null;
    case 'FDUR':
    case 'DDUR':
      if (geste === 'droite') {
        const duree = joursTravailles(debut, ajouterJours(fin, decalage), calendrier);
        return { duree_validee: Math.max(1, duree) };
      }
      return { debut_valide: ajouterJours(debut, decalage) };
    case 'ALAP':
      return geste === 'droite' ? { fin_valide: ajouterJours(fin, decalage) } : null;
    case 'REGUL': {
      if (geste === 'corps') {
        if (!dv || !fv) return null;
        return { debut_valide: ajouterJours(dv, decalage), fin_valide: ajouterJours(fv, decalage) };
      }
      if (geste === 'gauche') {
        const cible = ajouterJours(debut, decalage);
        return { debut_valide: fv && cible > fv ? fv : cible };
      }
      const cible = ajouterJours(fin, decalage);
      return { fin_valide: dv && cible < dv ? dv : cible };
    }
    default:
      return null;
  }
}

/**
 * Début et fin de la barre à la position du pointeur pour un décalage de `decalage` jours : le corps
 * décale la barre, FDUR et DDUR décalent aussi la barre depuis la poignée gauche (durée inchangée),
 * les autres poignées déplacent un seul bord, sans croiser l'autre.
 */
export function datesApresGeste(
  element: ElementGeste,
  geste: Geste,
  decalage: number,
): { debut: string; fin: string } | null {
  const { debut_planifie: debut, fin_planifiee: fin } = element;
  if (!debut || !fin) return null;
  const decalee = () => ({
    debut: ajouterJours(debut, decalage),
    fin: ajouterJours(fin, decalage),
  });
  if (geste === 'corps') return decalee();
  if (geste === 'gauche') {
    if (element.mode === 'FDUR' || element.mode === 'DDUR') return decalee();
    const nouveau = ajouterJours(debut, decalage);
    return { debut: nouveau > fin ? fin : nouveau, fin };
  }
  const nouveau = ajouterJours(fin, decalage);
  return { debut, fin: nouveau < debut ? debut : nouveau };
}
