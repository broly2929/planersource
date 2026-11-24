// Aides de synchronisation des e2e sur un état observable (lot robustesse-tests, D-197). STB-1, STB-2.
// Base « administrateur seul » avant et après chaque test.
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { H14, remettreAdminSeul4b } from './lot4b-helpers.js';
import { ouvrirEquipes, remettreAdminSeul6a } from './lot6a-helpers.js';
import { confirmation, dialogueNomme, rester } from './garde-dialogue-helpers.js';
import { cliquerDansConfirmation, saisirParGeste } from './stabilite-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 800 });
});
test.afterEach(async () => {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
});

test('STB-1 : saisirParGeste : le champ est focalisé par un clic réel, puis porte la valeur saisie', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialogue = dialogueNomme(page, 'Nouvelle équipe');
  const nom = dialogue.getByLabel('Nom');
  await saisirParGeste(nom, 'Équipe STB1');
  await expect(nom).toBeFocused();
  await expect(nom).toHaveValue('Équipe STB1');
  // La saisie est un geste réel : Échap ouvre la confirmation, focus sur « Annuler ».
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
});

test('STB-2 : cliquerDansConfirmation : attend la confirmation visible et le focus sur « Annuler » avant le clic ; « Abandonner » ferme le dialogue', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialogue = dialogueNomme(page, 'Nouvelle équipe');
  await saisirParGeste(dialogue.getByLabel('Nom'), 'Équipe STB2');
  await page.keyboard.press('Escape');
  await cliquerDansConfirmation(
    confirmation(page),
    confirmation(page).getByRole('button', { name: 'Abandonner', exact: true }),
    rester(page),
  );
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toHaveCount(0);
});
