// Aides de synchronisation des e2e sur un état observable, jamais sur un délai (lot robustesse-tests, D-197).
// Tests : stabilite-helpers.spec.ts (STB-1, STB-2).
import { expect, type Locator } from '@playwright/test';

/**
 * Saisie par un geste réel : clic dans le champ (le focus est observé), puis `fill`. `fill` seul n'est pas un
 * geste ; s'il arrive pendant le focus automatique d'ouverture d'un dialogue gardé, la référence de retour de
 * focus n'est pas prise (D-195 (2)).
 */
export async function saisirParGeste(champ: Locator, valeur: string): Promise<void> {
  await champ.click();
  await expect(champ).toBeFocused();
  await champ.fill(valeur);
}

/**
 * Clique `bouton` dans une confirmation une fois celle-ci visible et, si `focusInitial` est donné (le bouton
 * « Annuler » des confirmations à focus initial), une fois le focus posé dessus.
 */
export async function cliquerDansConfirmation(
  confirmation: Locator,
  bouton: Locator,
  focusInitial?: Locator,
): Promise<void> {
  await expect(confirmation).toBeVisible();
  if (focusInitial) await expect(focusInitial).toBeFocused();
  await bouton.click();
}
