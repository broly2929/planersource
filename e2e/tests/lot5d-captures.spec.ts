// Captures du lot 5d (E2E-334, relecture d'apparence), sans assertion fonctionnelle : e2e/captures/
// validation-alerte-{1440,1024}.png et feuille-codes-{1440,1024}.png. Monde de lot4c.spec.ts avec deux projets à
// codes longs (11 et 30 caractères), horloge du navigateur au mercredi 14/01/2026.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { cheminCapture } from './captures.js';
import { connecterAvec } from './lot1-helpers.js';
import {
  EMAIL_ALICE,
  H14,
  S,
  adresseFeuille,
  agirApi,
  imputerApi,
  jS,
  remettreAdminSeul4b,
  sessionDe,
  tableauFeuille,
} from './lot4b-helpers.js';
import {
  boutonDe,
  intercepter,
  ligneValidation,
  monde4c,
  ouvrirValidation,
} from './lot4c-helpers.js';

const LARGEURS = [1440, 1024];

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({ path: cheminCapture(`${nom}-${largeur}.png`) });
  }
}

test('E2E-334 : captures de 5d (sans assertion fonctionnelle)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const ids: number[] = [];
  for (const code of ['PRJ-1234567', `DEMO-${'A'.repeat(25)}`]) {
    const p = await m.api.projet(code, `Projet ${code}`, m.chefP.id);
    await m.api.affectation(p.id, m.alice.id);
    const a = await m.api.activite(p.id, `Tâche ${code.slice(0, 4)}`);
    ids.push((await m.api.assignation(a.id, m.alice.id, 1)).id);
  }
  const ctx = await sessionDe(playwright, EMAIL_ALICE);
  const f = await imputerApi(ctx, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 1 }] },
    { assignation_id: m.sb.id, imputations: [{ jour: jS(13), charge: 1 }] },
    ...ids.map((id) => ({ assignation_id: id, imputations: [{ jour: jS(12), charge: 1 }] })),
  ]);
  await agirApi(ctx, f.feuille.id!, 'soumettre');

  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 700 });
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  await intercepter(page, 'valider', 422, 'statut_invalide');
  await boutonDe(ligneValidation(page, 'Alice 4B'), 'Valider la feuille de Alice 4B').click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(page.getByRole('alert')).toBeVisible();
  await photographier(page, 'validation-alerte');

  await page.context().clearCookies();
  await connecterAvec(page, EMAIL_ALICE);
  await page.goto(adresseFeuille(S));
  await expect(tableauFeuille(page)).toBeVisible();
  await photographier(page, 'feuille-codes');
});
