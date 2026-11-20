// Captures du lot 4c (E2E-320, relecture d'apparence), sans assertion fonctionnelle : e2e/captures/
// validation-{liste,voir,valider,rejeter}-{1440,1024}.png. Monde de lot4c.spec.ts, administrateur, horloge du
// navigateur au mercredi 14/01/2026.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { cheminCapture } from './captures.js';
import { H14, agirApi, remettreAdminSeul4b } from './lot4b-helpers.js';
import {
  EMAIL_BOB,
  EMAIL_CARLA,
  EMAIL_DINA,
  boutonDe,
  imputerEtSoumettre,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
} from './lot4c-helpers.js';

const LARGEURS = [1440, 1024];

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({ path: cheminCapture(`validation-${nom}-${largeur}.png`) });
  }
}

test('E2E-320 : captures de l’écran Validation (sans assertion fonctionnelle)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  const carla = await m.ressourceSurP('Carla 4B', EMAIL_CARLA, 'Tâche D');
  const dina = await m.ressourceSurP('Dina 4B', EMAIL_DINA, 'Tâche E');
  await imputerEtSoumettre(playwright, bob.email, bob.assignation, { soumettre: false });
  const idCarla = await imputerEtSoumettre(playwright, carla.email, carla.assignation);
  const idDina = await imputerEtSoumettre(playwright, dina.email, dina.assignation);
  await page.clock.setFixedTime(H14);
  await loginAsAdmin(page);
  await agirApi(page.request, idCarla, 'valider');
  await agirApi(page.request, idDina, 'rejeter', { commentaire: 'À revoir' });
  await ouvrirValidation(page);
  await expect(page.getByRole('table', { name: 'Feuilles de temps à valider' })).toBeVisible();
  await photographier(page, 'liste');

  const alice = ligneValidation(page, 'Alice 4B');
  await boutonDe(alice, 'Voir la feuille de Alice 4B').click();
  await expect(page.getByRole('dialog').getByRole('table')).toBeVisible();
  await photographier(page, 'voir');
  await page.keyboard.press('Escape');

  await boutonDe(alice, 'Valider la feuille de Alice 4B').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await photographier(page, 'valider');
  await boutonDe(page.getByRole('dialog'), 'Annuler').click();

  await boutonDe(alice, 'Rejeter la feuille de Alice 4B').click();
  await page.getByRole('dialog').getByLabel('Commentaire').fill('Écart sur mardi : à corriger.');
  await photographier(page, 'rejeter');
});
