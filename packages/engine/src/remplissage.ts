import { cibleDuJour, plafondAssignation } from './charge.js';
import { semaineDe } from './disponibilite.js';
import type { Disponibilites } from './disponibilite.js';

export interface Pose {
  jour: number;
  charge: number;
  /** part de `charge` au-delà de la disponibilité */
  surcharge: number;
}

/** Charge déjà posée par le remplissage en cours dans la semaine de `jour` (pas encore décomptée). */
function poseDansSemaine(poses: readonly Pose[], jour: number): number {
  const semaine = semaineDe(jour);
  return poses.reduce((t, p) => (semaineDe(p.jour) === semaine ? t + p.charge : t), 0);
}

export interface ResultatRemplissage {
  poses: Pose[];
  reste: number;
}

/** Remplit jour après jour à partir de `debut` jusqu'à `horizon` (ASAP, SPEC 5.4). Ne consomme rien. */
export function remplirAvant(
  dispo: Disponibilites,
  ressourceId: number,
  projetId: number,
  taux: number,
  reste: number,
  debut: number,
  horizon: number,
  deja: readonly Pose[] = [],
): ResultatRemplissage {
  const plafond = plafondAssignation(dispo.capacite(ressourceId), taux);
  const poses: Pose[] = [];
  let restant = reste;
  for (let jour = debut; restant > 0 && jour <= horizon; jour += 1) {
    const posable = dispo.posable(
      ressourceId,
      projetId,
      jour,
      poseDansSemaine(poses, jour) + poseDansSemaine(deja, jour),
    );
    const charge = Math.min(restant, posable, plafond);
    if (charge > 0) {
      poses.push({ jour, charge, surcharge: 0 });
      restant -= charge;
    }
  }
  return { poses, reste: restant };
}

/**
 * Remplissage à rebours de `fin` vers `debut` (FF). Renvoie null si tout le reste ne tient pas :
 * l'appelant se replie alors sur le remplissage au plus tôt. Ne consomme rien.
 */
export function remplirArriere(
  dispo: Disponibilites,
  ressourceId: number,
  projetId: number,
  taux: number,
  reste: number,
  debut: number,
  fin: number,
): Pose[] | null {
  const plafond = plafondAssignation(dispo.capacite(ressourceId), taux);
  const poses: Pose[] = [];
  let restant = reste;
  for (let jour = fin; restant > 0 && jour >= debut; jour -= 1) {
    const posable = dispo.posable(ressourceId, projetId, jour, poseDansSemaine(poses, jour));
    const charge = Math.min(restant, posable, plafond);
    if (charge > 0) {
      poses.push({ jour, charge, surcharge: 0 });
      restant -= charge;
    }
  }
  return restant === 0 ? poses : null;
}

/**
 * Remplissage d'une fenêtre (FDUR, DDUR, REGUL ; SPEC 5.4 et 5.6) : chaque jour de `jours`, cible =
 * reste ÷ jours ouvrés restants de la ressource dans `jours`.
 * - `ignorerCapacite` faux (FDUR, REGUL) : la cible est plafonnée par la disponibilité et le plafond
 *   d'assignation ; sans jour ouvré de la ressource, rien n'est posé.
 * - `ignorerCapacite` vrai (DDUR) : la cible est posée telle quelle, la part au-delà de la disponibilité
 *   est la surcharge ; sans jour ouvré de la ressource, tous les jours de `jours` sont gardés.
 * Le reste non posé est rendu à l'appelant. Ne consomme rien.
 */
export function remplirFenetre(
  dispo: Disponibilites,
  ressourceId: number,
  projetId: number,
  taux: number,
  reste: number,
  joursFenetre: readonly number[],
  ignorerCapacite: boolean,
): ResultatRemplissage {
  // la cible se répartit sur les seuls jours ouvrés de la ressource ; sans aucun, DDUR garde tous les jours
  const siens = joursFenetre.filter((j) => dispo.estOuvre(ressourceId, j));
  const jours = siens.length === 0 && ignorerCapacite ? joursFenetre : siens;
  const plafond = plafondAssignation(dispo.capacite(ressourceId), taux);
  const poses: Pose[] = [];
  let restant = reste;
  jours.forEach((jour, i) => {
    const cible = Math.min(cibleDuJour(restant, jours.length - i), restant);
    const libre = dispo.disponible(ressourceId, projetId, jour);
    const charge = ignorerCapacite
      ? cible
      : Math.min(
          cible,
          dispo.posable(ressourceId, projetId, jour, poseDansSemaine(poses, jour)),
          plafond,
        );
    if (charge > 0) {
      poses.push({ jour, charge, surcharge: Math.max(0, charge - libre) });
      restant -= charge;
    }
  });
  return { poses, reste: restant };
}

/** Fenêtre puis reliquat en ASAP à partir de `debutReliquat` (FDUR, DDUR ; REGUL au lot 2d). Ne consomme rien. */
export function remplirFenetreEtReliquat(
  dispo: Disponibilites,
  ressourceId: number,
  projetId: number,
  taux: number,
  reste: number,
  jours: readonly number[],
  ignorerCapacite: boolean,
  debutReliquat: number,
  horizon: number,
): ResultatRemplissage {
  const fenetre = remplirFenetre(dispo, ressourceId, projetId, taux, reste, jours, ignorerCapacite);
  const suite = remplirAvant(
    dispo,
    ressourceId,
    projetId,
    taux,
    fenetre.reste,
    debutReliquat,
    horizon,
    fenetre.poses,
  );
  return { poses: [...fenetre.poses, ...suite.poses], reste: suite.reste };
}
