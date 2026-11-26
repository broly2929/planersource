// Lot correctif-garde-focus (D-250) : un focus réel pendant la fenêtre du focus automatique d'ouverture de Radix
// prend la référence de la garde (D-188). Minuteries simulées : horloge installée avant le chargement, arrêtée
// avant l'ouverture du dialogue (D-250 (4)) ; la minuterie de `focusAuto` ne s'écoule qu'à `runFor`.
// Base « administrateur seul » avant et après chaque test.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { H14, remettreAdminSeul4b } from './lot4b-helpers.js';
import { ouvrirEquipes, remettreAdminSeul6a } from './lot6a-helpers.js';
import { confirmation, dialogueNomme } from './garde-dialogue-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
  await page.clock.install({ time: H14 });
  await page.setViewportSize({ width: 1440, height: 800 });
});
test.afterEach(async () => {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
});

/** Écran Équipes chargé, horloge arrêtée, puis ouverture de « Nouvelle équipe » sans faire avancer l'horloge. */
async function ouvrirNouvelleEquipeHorlogeArretee(page: Page): Promise<Locator> {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  const bouton = page.getByRole('button', { name: 'Nouvelle équipe' });
  await expect(bouton).toBeVisible();
  const maintenant = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(maintenant + 1000);
  await bouton.click();
  const dialogue = dialogueNomme(page, 'Nouvelle équipe');
  await expect(dialogue).toBeVisible();
  return dialogue;
}

const annuler = (dialogue: Locator) =>
  dialogue.getByRole('button', { name: 'Annuler', exact: true });

test('E2E-674 : horloge arrêtée, `fill` de « Nom » puis « Annuler » : confirmation, dialogue ouvert, saisie conservée', async ({
  page,
}) => {
  const dialogue = await ouvrirNouvelleEquipeHorlogeArretee(page);
  await dialogue.getByLabel('Nom').fill('Équipe G674');
  await annuler(dialogue).click();
  await expect(confirmation(page)).toBeVisible();
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByLabel('Nom')).toHaveValue('Équipe G674');
});

test('E2E-675 : horloge arrêtée, focus automatique seul puis « Annuler » : fermeture sans confirmation', async ({
  page,
}) => {
  const dialogue = await ouvrirNouvelleEquipeHorlogeArretee(page);
  await annuler(dialogue).click();
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);
});

test('E2E-676 : minuterie écoulée, saisie au clavier dans « Nom » puis « Annuler » : confirmation, dialogue ouvert', async ({
  page,
}) => {
  const dialogue = await ouvrirNouvelleEquipeHorlogeArretee(page);
  await page.clock.runFor(100);
  await dialogue.getByLabel('Nom').pressSequentially('Équipe G676');
  await annuler(dialogue).click();
  await expect(confirmation(page)).toBeVisible();
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByLabel('Nom')).toHaveValue('Équipe G676');
});
