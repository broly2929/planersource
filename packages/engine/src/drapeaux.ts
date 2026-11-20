/** Drapeaux d'un jalon : seul `retard` est calculé en 2a. */
export function drapeauxJalon(retard: boolean): string[] {
  return retard ? ['retard'] : [];
}
