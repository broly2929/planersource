// Captures du lot 4b (E2E-245, relecture d'apparence), sans assertion fonctionnelle : e2e/captures/
// feuille-temps-{brouillon,soumise,rejetee,depassement,invalide}-{1440,1024}.png. Monde de lot4b.spec.ts,
// horloge du navigateur au mercredi 14/01/2026 ; la ligne de B est imputée le lundi et le mardi.
import { expect, test, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { cheminCapture } from './captures.js';
import {
  EMAIL_ALICE,
  H14,
  S,
  adresseFeuille,
  agirApi,
  caseCharge,
  imputerApi,
  jS,
  monde4b,
  remettreAdminSeul4b,
  sessionDe,
} from './lot4b-helpers.js';

const LARGEURS = [1440, 1024];

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({ path: cheminCapture(`feuille-temps-${nom}-${largeur}.png`) });
  }
}

test('E2E-245 : captures de l’écran Feuille de temps (sans assertion fonctionnelle)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4b(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await page.clock.setFixedTime(H14);
  await connecterAvec(page, EMAIL_ALICE);

  await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
    {
      assignation_id: m.sb.id,
      imputations: [
        { jour: jS(12), charge: 0.25 },
        { jour: jS(13), charge: 1 },
      ],
    },
  ]);
  await page.goto(adresseFeuille(S));
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  await photographier(page, 'brouillon');

  // Dépassement : lundi 0,5 + 0,25 + 0,5 = 1,25 > 1.
  await caseCharge(page, '1 Tâche A', 'lun. 12/01').fill('1');
  await photographier(page, 'depassement');

  // Valeurs invalides.
  await caseCharge(page, '1 Tâche A', 'mar. 13/01').fill('abc');
  await caseCharge(page, '1 Tâche B', 'mer. 14/01').fill('11');
  await photographier(page, 'invalide');

  // Soumise, puis rejetée.
  await page.goto(adresseFeuille(S));
  const id = (await alice.get(`/api/feuilles?semaine=${S}`).then((r) => r.json())).feuille
    .id as number;
  await agirApi(alice, id, 'soumettre');
  await page.reload();
  await expect(page.locator('[data-statut-feuille="soumise"]')).toBeVisible();
  await photographier(page, 'soumise');

  await agirApi(request, id, 'rejeter', { commentaire: 'Charge du mardi à revoir' });
  await page.reload();
  await expect(page.locator('[data-statut-feuille="rejetee"]')).toBeVisible();
  await photographier(page, 'rejetee');
});
