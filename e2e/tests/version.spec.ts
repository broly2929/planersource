// Lot version (D-231 ; SPEC §13) : E2E-636 à E2E-640. Pied de la barre latérale, bandeau « Nouvelle version
// disponible », « Recharger » et garde D-172. Base « administrateur seul » avant et après chaque test.
// Contrat des écrans (phase verte) :
//   - pied de la barre latérale (balise <aside>) : texte « v<version> · <commit> » pour tous les rôles ;
//   - bandeau non bloquant en haut de page : texte « Nouvelle version disponible » et bouton « Recharger » ;
//   - « Recharger » passe par la garde D-172 (confirmation « Abandonner les modifications ? »).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { loginAsAdmin } from './helpers.js';
import {
  EMAIL_ALICE,
  H14,
  S,
  adresseFeuille,
  caseCharge,
  monde4b,
  remettreAdminSeul4b,
} from './lot4b-helpers.js';
import { nav } from './lot6b-helpers.js';
import { cliquerDansConfirmation } from './stabilite-helpers.js';

const VERSION = (
  JSON.parse(readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8')) as {
    version: string;
  }
).version;
const PIED = new RegExp(`^v${VERSION.replaceAll('.', '\\.')} · \\S+$`);

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

const pied = (page: Page) => page.locator('aside').getByText(PIED);
const bandeau = (page: Page) => page.getByText('Nouvelle version disponible', { exact: true });
const recharger = (page: Page) => page.getByRole('button', { name: 'Recharger', exact: true });

/** Toute réponse /api porte l'en-tête de version `valeur` ; `null` retire l'en-tête. */
async function fausseVersion(page: Page, valeur: string | null): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const reponse = await route.fetch();
    const headers = { ...reponse.headers() };
    delete headers['x-planersource-version'];
    if (valeur !== null) headers['x-planersource-version'] = valeur;
    await route.fulfill({ response: reponse, headers });
  });
}

test('E2E-636 : pied de la barre latérale de l’administrateur : « v<version> · <commit> »', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await expect(pied(page)).toBeVisible();
  await expect(pied(page)).toHaveText(PIED);
});

test('E2E-637 : pied de la barre latérale d’une ressource (vue restreinte) : même texte', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Rita Ressource', 'rita-ver@example.test', 'ressource', true);
  await connecterAvec(page, 'rita-ver@example.test');
  await expect(pied(page)).toBeVisible();
  await expect(pied(page)).toHaveText(PIED);
});

test('E2E-638 : version identique : aucun bandeau', async ({ page }) => {
  await fausseVersion(page, VERSION);
  await loginAsAdmin(page);
  await expect(pied(page)).toBeVisible();
  await expect(bandeau(page)).toHaveCount(0);
  await expect(recharger(page)).toHaveCount(0);
});

test('E2E-639 : en-tête différent : bandeau ; « Recharger » recharge ; en-tête absent : pas de bandeau', async ({
  page,
}) => {
  await fausseVersion(page, '9.9.9');
  await loginAsAdmin(page);
  await expect(bandeau(page)).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { marque?: number }).marque = 1;
  });
  await page.unroute('**/api/**');
  await recharger(page).click();
  await expect(bandeau(page)).toHaveCount(0);
  await expect(pied(page)).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { marque?: number }).marque),
  ).toBeUndefined();

  await page.unroute('**/api/**').catch(() => undefined);
  await fausseVersion(page, null);
  await page.reload();
  await expect(pied(page)).toBeVisible();
  await expect(bandeau(page)).toHaveCount(0);
});

test('E2E-640 : « Recharger » avec modifications non enregistrées : confirmation D-172 ; « Annuler » garde la saisie, « Abandonner » recharge', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await page.clock.setFixedTime(H14);
  await fausseVersion(page, '9.9.9');
  await connecterAvec(page, EMAIL_ALICE);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page).toHaveURL(adresseFeuille(S));
  const A = '1 Tâche A';
  const LUN = 'lun. 12/01';
  await caseCharge(page, A, LUN).fill('1');
  await expect(bandeau(page)).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { marque?: number }).marque = 1;
  });
  const confirmation = page.getByRole('dialog', { name: 'Abandonner les modifications ?' });
  await recharger(page).click();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');
  expect(await page.evaluate(() => (window as unknown as { marque?: number }).marque)).toBe(1);

  await page.unroute('**/api/**');
  await recharger(page).click();
  await cliquerDansConfirmation(
    confirmation,
    confirmation.getByRole('button', { name: 'Abandonner', exact: true }),
    confirmation.getByRole('button', { name: 'Annuler', exact: true }),
  );
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { marque?: number }).marque),
  ).toBeUndefined();
});
