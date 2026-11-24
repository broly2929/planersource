// Captures de la confirmation à la fermeture d'un dialogue (E2E-456, D-188), sans assertion fonctionnelle :
// e2e/captures/garde-dialogue-{1440,1024}.png. Dialogue « Nouvel utilisateur » modifié, Échap.
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { cheminCapture } from './captures.js';
import { allerA } from './lot3c-helpers.js';
import { H14, remettreAdminSeul4b } from './lot4b-helpers.js';
import { confirmation } from './garde-dialogue-helpers.js';
import { saisirParGeste } from './stabilite-helpers.js';

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

test('E2E-456-r1 : captures de la confirmation à la fermeture (sans assertion fonctionnelle)', async ({
  page,
}) => {
  await page.clock.setFixedTime(H14);
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  await saisirParGeste(
    page.getByRole('dialog').getByLabel('Nom'),
    'Utilisateur en cours de saisie',
  );
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
  for (const largeur of [1440, 1024]) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.screenshot({ path: cheminCapture(`garde-dialogue-${largeur}.png`) });
  }
});
