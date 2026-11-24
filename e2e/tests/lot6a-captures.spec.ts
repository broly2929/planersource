// Captures du lot 6a (E2E-346, relecture d'apparence), sans assertion fonctionnelle : e2e/captures/
// equipes-{liste,nouvelle,suppression,utilisateurs,utilisateur-creation}-{1440,1024}.png. Administrateur.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { cheminCapture } from './captures.js';
import { allerA, ouvrirEquipes } from './lot3c-helpers.js';
import { equipeApi, remettreAdminSeul6a, utilisateurApi } from './lot6a-helpers.js';
import { fermerEnAbandonnant } from './garde-dialogue-helpers.js';
import { cliquerDansConfirmation } from './stabilite-helpers.js';

const LARGEURS = [1440, 1024];

test.beforeEach(remettreAdminSeul6a);
test.afterEach(remettreAdminSeul6a);

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({ path: cheminCapture(`equipes-${nom}-${largeur}.png`) });
  }
}

test('E2E-346-r3 : captures des écrans Équipes et Utilisateurs (sans assertion fonctionnelle)', async ({
  page,
  request,
}) => {
  const atelier = await equipeApi(request, 'Atelier');
  await equipeApi(request, 'Bureau d’études');
  await equipeApi(request, 'Exploitation');
  await utilisateurApi(request, 'Alice 6a', 'alice-6a@lot6a.test', atelier);
  await utilisateurApi(request, 'Bob 6a', 'bob-6a@lot6a.test');
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await expect(page.getByRole('table', { name: 'Liste des équipes' })).toBeVisible();
  await photographier(page, 'liste');

  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('atelier');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await photographier(page, 'nouvelle');
  await fermerEnAbandonnant(page, page.getByRole('dialog'), 'echap');

  await page.getByRole('button', { name: 'Supprimer Atelier' }).click();
  await cliquerDansConfirmation(
    page.getByRole('dialog'),
    page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }),
  );
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await photographier(page, 'suppression');
  await page.keyboard.press('Escape');

  await allerA(page, 'Utilisateurs');
  await expect(page.getByRole('table', { name: 'Liste des utilisateurs' })).toBeVisible();
  await photographier(page, 'utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  await expect(page.getByRole('dialog').getByLabel('Équipe', { exact: true })).toBeVisible();
  await photographier(page, 'utilisateur-creation');
});
