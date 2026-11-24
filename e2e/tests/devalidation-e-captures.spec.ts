// Captures de DEV-E (E2E-416, relecture d'apparence), sans assertion fonctionnelle : e2e/captures/
// validation-devalider-{confirmation,succes}-{1440,1024}.png. Monde de lot4c.spec.ts, administrateur.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { cheminCapture } from './captures.js';
import { H14, agirApi, remettreAdminSeul4b } from './lot4b-helpers.js';
import {
  boutonDe,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
  statutOk,
} from './lot4c-helpers.js';

const LARGEURS = [1440, 1024];

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({ path: cheminCapture(`validation-devalider-${nom}-${largeur}.png`) });
  }
}

test('E2E-416 : captures de « Dévalider » (sans assertion fonctionnelle)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await page.clock.setFixedTime(H14);
  await loginAsAdmin(page);
  await agirApi(page.request, id, 'valider');
  await ouvrirValidation(page);
  const alice = ligneValidation(page, 'Alice 4B');
  await boutonDe(alice, 'Dévalider la feuille de Alice 4B').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await photographier(page, 'confirmation');
  await boutonDe(page.getByRole('dialog'), 'Dévalider').click();
  await expect(statutOk(page, 'Feuille dévalidée.')).toBeVisible();
  await photographier(page, 'succes');
});
