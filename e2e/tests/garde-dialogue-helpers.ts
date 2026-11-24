// Aides de la confirmation à la fermeture des dialogues-formulaires (D-188). Contrat de phase verte : la
// confirmation est le dialogue nommé « Abandonner les modifications ? » (boutons « Annuler » = rester,
// « Abandonner » = quitter), empilé au-dessus du dialogue de formulaire ; les déclencheurs sont Échap, le clic
// hors du dialogue, le bouton « Annuler » du formulaire et la croix « Fermer ».
import { expect, type Locator, type Page } from '@playwright/test';

export const TITRE_CONFIRMATION = 'Abandonner les modifications ?';

export const confirmation = (page: Page) =>
  page.getByRole('dialog', { name: TITRE_CONFIRMATION, exact: true });
export const rester = (page: Page) =>
  confirmation(page).getByRole('button', { name: 'Annuler', exact: true });
export const quitter = (page: Page) =>
  confirmation(page).getByRole('button', { name: 'Abandonner', exact: true });
/** `includeHidden` : le dialogue recouvert par la confirmation est masqué aux technologies d'assistance (aria-hidden de Radix). */
export const dialogueNomme = (page: Page, nom: string) =>
  page.getByRole('dialog', { name: nom, exact: true, includeHidden: true });

export type Declencheur = 'echap' | 'dehors' | 'annuler' | 'croix';

/** Ferme le dialogue `dialogue` par le déclencheur demandé (focus et clic dans la page). */
export async function declencher(page: Page, dialogue: Locator, d: Declencheur): Promise<void> {
  if (d === 'echap') await page.keyboard.press('Escape');
  else if (d === 'dehors') await page.mouse.click(4, 4);
  else if (d === 'annuler')
    await dialogue.getByRole('button', { name: 'Annuler', exact: true }).click();
  else await dialogue.getByRole('button', { name: 'Fermer', exact: true }).click();
}

/**
 * Parcours commun d'un champ : `modifier` change la valeur, `restaurer` la remet ; Échap : confirmation après
 * modification (dialogue toujours ouvert), puis « Annuler » (rester) ; après restauration, aucune confirmation
 * et fermeture directe.
 */
export async function verifierGardeChamp(
  page: Page,
  dialogue: Locator,
  modifier: () => Promise<unknown>,
  restaurer: () => Promise<unknown>,
): Promise<void> {
  await modifier();
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  await expect(dialogue).toBeVisible();
  await rester(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toBeVisible();
  await restaurer();
  await page.keyboard.press('Escape');
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);
}

/**
 * Ferme un dialogue dont le formulaire est modifié (saisie gardée après un refus de l'API, par exemple) :
 * le déclencheur ouvre la confirmation (D-188), « Abandonner » ferme le dialogue sans envoi.
 */
export async function fermerEnAbandonnant(
  page: Page,
  dialogue: Locator,
  d: Declencheur = 'annuler',
): Promise<void> {
  await declencher(page, dialogue, d);
  await expect(confirmation(page)).toBeVisible();
  await quitter(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toHaveCount(0);
}
