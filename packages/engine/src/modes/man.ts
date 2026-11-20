import { joursDepuis } from '../dates.js';
import type { Disponibilites } from '../disponibilite.js';
import type { Pose } from '../remplissage.js';
import type { Saisie } from '../types.js';

/** Saisies sommées par assignation puis par jour (demi-journées additionnées), jours croissants. */
export function saisiesParJour(saisies: readonly Saisie[]): Map<number, Map<number, number>> {
  const parAssignation = new Map<number, Map<number, number>>();
  for (const s of [...saisies].sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0))) {
    const jours = parAssignation.get(s.assignationId) ?? new Map<number, number>();
    const jour = joursDepuis(s.jour);
    jours.set(jour, (jours.get(jour) ?? 0) + s.charge);
    parAssignation.set(s.assignationId, jours);
  }
  return parAssignation;
}

/** Reste à faire d'une assignation MAN : somme de ses saisies à partir de D0 (SPEC 5.6, D-056 Q3). */
export function resteMan(jours: ReadonlyMap<number, number> | undefined, d0: number): number {
  let reste = 0;
  for (const [jour, charge] of jours ?? []) if (jour >= d0) reste += charge;
  return reste;
}

/**
 * Recopie des saisies d'une assignation MAN à partir de D0 (SPEC 5.6, D-056 Q1 et Q6) : la charge est
 * posée telle quelle ; la surcharge est la part au-delà de la disponibilité du jour (jour chômé ou hors
 * affectation : disponibilité 0) ; taux et plafond d'assignation ignorés. Ne consomme rien.
 */
export function posesMan(
  dispo: Disponibilites,
  ressourceId: number,
  projetId: number,
  jours: ReadonlyMap<number, number> | undefined,
  d0: number,
): Pose[] {
  const poses: Pose[] = [];
  for (const [jour, charge] of jours ?? []) {
    if (jour < d0) continue;
    const libre = dispo.disponible(ressourceId, projetId, jour);
    poses.push({ jour, charge, surcharge: Math.max(0, charge - libre) });
  }
  return poses;
}
