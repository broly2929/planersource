// Retouches REX-6 (D-218 (4), (9)) : l'Accueil est déplié au chargement ; les révisions D-031 des e2e qui
// supposent l'Accueil replié partent de l'état replié obtenu par « Tout replier ».
import { expect, type Page } from '@playwright/test';

/** Replie tout l'Accueil (au moins un projet affiché) et attend l'état replié. */
export async function replierTout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Tout replier', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tout déplier', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Replier / })).toHaveCount(0);
}
