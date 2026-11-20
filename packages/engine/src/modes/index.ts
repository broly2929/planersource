import type { Activite } from '../types.js';
import { cibleAlap, drapeauxAlap } from './alap.js';
import { drapeauxStarr, plancherStarr } from './starr.js';
import { plancherStart } from './start.js';
import { drapeauxRegul, fenetreRegul } from './regul.js';
import type { FenetreRegul } from './regul.js';

export interface ParametresMode {
  /** plancher du début au plus tôt, avant les dépendances */
  plancher: number;
  /** fin cible du remplissage à rebours, null sans */
  cible: number | null;
  /** durée de la fenêtre (FDUR, DDUR) ; null pour les autres modes */
  duree: { n: number; ignorerCapacite: boolean } | null;
  /** fenêtre REGUL, bornée par deux dates ; null pour les autres modes */
  regul: FenetreRegul | null;
  /** drapeaux de l'activité, d'après ses premier et dernier jours */
  drapeaux: (premier: number, dernier: number) => string[];
}

/** Plancher, fin cible et drapeaux d'une feuille selon son mode. */
export function parametresDuMode(
  act: Activite,
  plancher: number,
  cibleFF: number | null,
): ParametresMode {
  switch (act.mode) {
    case 'START':
      return {
        plancher: plancherStart(plancher, act),
        cible: cibleFF,
        duree: null,
        regul: null,
        drapeaux: () => [],
      };
    case 'STARR':
      return {
        plancher: plancherStarr(plancher, act),
        cible: cibleFF,
        duree: null,
        regul: null,
        drapeaux: (premier) => drapeauxStarr(premier, act),
      };
    case 'ALAP':
      return {
        plancher,
        cible: cibleAlap(act, cibleFF),
        duree: null,
        regul: null,
        drapeaux: (_premier, dernier) => drapeauxAlap(dernier, act),
      };
    case 'FDUR':
    case 'DDUR':
      return {
        plancher: plancherStart(plancher, act),
        cible: cibleFF,
        duree: { n: act.dureeValidee ?? 1, ignorerCapacite: act.mode === 'DDUR' },
        regul: null,
        drapeaux: () => [],
      };
    case 'REGUL': {
      // les dépendances et la fin cible FF ne jouent aucun rôle (SPEC 5.6, D-051)
      const f = fenetreRegul(act, plancher);
      return {
        plancher: f.debut,
        cible: null,
        duree: null,
        regul: f,
        drapeaux: (_premier, dernier) => drapeauxRegul(dernier, f),
      };
    }
    default:
      return { plancher, cible: cibleFF, duree: null, regul: null, drapeaux: () => [] };
  }
}
