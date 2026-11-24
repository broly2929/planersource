// Captures de la retouche de la Feuille de temps (E2E-436, D-186), sans assertion fonctionnelle :
// e2e/captures/retouche-feuille-{choix,feuille}-{1440,1024}-{avant,apres}.png. La phase est donnée par
// CAPTURE_PHASE (« avant » avant le code, « apres » par défaut). Monde d'AUT-E, administrateur non ressource.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { cheminCapture } from './captures.js';
import {
  EMAIL_ALICE,
  H14,
  S,
  imputerApi,
  jS,
  remettreAdminSeul4b,
  sessionDe,
} from './lot4b-helpers.js';
import { adresseAutrui, listeRessource, mondeAutrui } from './autrui-e-helpers.js';

const LARGEURS = [1440, 1024];
const PHASE = process.env.CAPTURE_PHASE === 'avant' ? 'avant' : 'apres';

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({
      path: cheminCapture(`retouche-feuille-${nom}-${largeur}-${PHASE}.png`),
    });
  }
}

test('E2E-436 : captures de la retouche de la Feuille de temps (sans assertion fonctionnelle)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await mondeAutrui(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await page.clock.setFixedTime(H14);
  await loginAsAdmin(page);
  await page.goto(adresseAutrui(S));
  await expect(listeRessource(page)).toBeVisible();
  await photographier(page, 'choix');
  await listeRessource(page).selectOption({ label: 'Alice 4B' });
  await expect(page.getByRole('heading', { name: 'Feuille de temps de Alice 4B' })).toBeVisible();
  await photographier(page, 'feuille');
});
