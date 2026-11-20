/** Plafond journalier d'une assignation : plancher(capacité × taux ÷ 10000), en centièmes. */
export function plafondAssignation(capacite: number, taux: number): number {
  return Math.floor((capacite * taux) / 10000);
}

/** Cible du jour : reste ÷ jours restants, arrondie au centième le plus proche, la moitié vers le haut (SPEC 5.4). */
export function cibleDuJour(reste: number, joursRestants: number): number {
  return Math.floor((2 * reste + joursRestants) / (2 * joursRestants));
}
