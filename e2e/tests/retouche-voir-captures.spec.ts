// Captures du dialogue « Voir » (E2E-438, D-186), sans assertion fonctionnelle : e2e/captures/
// retouche-voir-{1440,1024}-{avant,apres}.png. Phase donnée par CAPTURE_PHASE (« avant » ou « apres » par défaut).
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { cheminCapture } from './captures.js';
import { H14, remettreAdminSeul4b } from './lot4b-helpers.js';
import {
  boutonDe,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
} from './lot4c-helpers.js';

const PHASE = process.env.CAPTURE_PHASE === 'avant' ? 'avant' : 'apres';

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

test('E2E-438 : captures du dialogue « Voir » (sans assertion fonctionnelle)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  await page.clock.setFixedTime(H14);
  await loginAsAdmin(page);
  for (const largeur of [1440, 1024]) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await ouvrirValidation(page);
    await boutonDe(ligneValidation(page, 'Alice 4B'), 'Voir la feuille de Alice 4B').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: cheminCapture(`retouche-voir-${largeur}-${PHASE}.png`) });
    await page.keyboard.press('Escape');
  }
});
