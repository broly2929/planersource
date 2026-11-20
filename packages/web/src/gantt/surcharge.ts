import { HAUTEUR_BARRE, HAUTEUR_LIGNE, PX_PAR_JOUR, positionJour, type Zoom } from './echelle';
import { formaterDate } from './libelles';

/** Jours en surcharge du Gantt du projet (lot 3g, D-114 (4), (5)). */

/** Ligne de GET /api/projets/:id/travail. */
export interface LigneTravail {
  element_id: number;
  assignation_id: number;
  ressource_id: number;
  jour: string;
  charge: number;
  surcharge: boolean;
}

/** Jours à surcharge vraie par élément (union des assignations, sans doublon, triés) ; élément sans jour rouge absent. */
export function joursSurcharge(lignes: LigneTravail[]): Map<number, string[]> {
  const jours = new Map<number, Set<string>>();
  for (const l of lignes) {
    if (!l.surcharge) continue;
    const ensemble = jours.get(l.element_id) ?? new Set<string>();
    ensemble.add(l.jour);
    jours.set(l.element_id, ensemble);
  }
  return new Map([...jours].map(([id, ens]) => [id, [...ens].sort()]));
}

/** Rectangle (px) d'un jour rouge : x du jour, largeur d'un jour, y et hauteur de la barre de la ligne. */
export function rectSurcharge(origine: string, jour: string, zoom: Zoom, indexLigne: number) {
  return {
    x: positionJour(origine, jour, zoom),
    y: indexLigne * HAUTEUR_LIGNE + (HAUTEUR_LIGNE - HAUTEUR_BARRE) / 2,
    largeur: PX_PAR_JOUR[zoom],
    hauteur: HAUTEUR_BARRE,
  };
}

const MAX_ANNONCE = 5;

/** Suffixe de l'annonce de la barre active ; '' sans jour ; au-delà de 5 jours : « et N autre(s) ». */
export function texteSurcharge(jours: string[]): string {
  if (jours.length === 0) return '';
  const listes = jours.slice(0, MAX_ANNONCE).map(formaterDate).join(', ');
  const reste = jours.length - MAX_ANNONCE;
  const suite = reste <= 0 ? '' : reste === 1 ? ' et 1 autre' : ` et ${reste} autres`;
  return `, jours en surcharge : ${listes}${suite}`;
}
