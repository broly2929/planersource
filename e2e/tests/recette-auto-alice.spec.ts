// Lot recette-auto (D-204), compte alice : lignes 125, 139, 145, 146, 147, 149 de docs/recette.md.
// E2E-497 à E2E-502. Valeurs attendues recopiées de la colonne Attendu ; données créées par l'API ;
// semaine S du 12/01/2026 au 18/01/2026, horloge du navigateur au mercredi 14/01/2026.
import { expect, test, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import {
  EMAIL_ALICE,
  H14,
  S,
  SP,
  adresseFeuille,
  bouton,
  caseCharge,
  jS,
  imputerApi,
  monde4b,
  sessionDe,
  statutFeuille,
  ecouterEcritures,
} from './lot4b-helpers.js';
import { LIBELLE_S } from './lot4c-helpers.js';
import { confirmation, quitter, rester } from './garde-dialogue-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';
import { remettreAdminSeul4b } from './lot4b-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

const LUN = 'lun. 12/01';
const A = '1 Tâche A';

/** Alice a imputé 0,5 le lundi sur « Tâche A » (brouillon), puis ouvre sa feuille par le menu. */
async function ouvrirFeuilleAlice(
  page: Page,
  request: Parameters<typeof monde4b>[0],
  playwright: Parameters<typeof sessionDe>[0],
): Promise<void> {
  const m = await monde4b(request);
  const ctx = await sessionDe(playwright, EMAIL_ALICE);
  await imputerApi(ctx, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await connecterAvec(page, EMAIL_ALICE);
  await expect(page).toHaveURL('/mes-taches');
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
}

test('E2E-497 : ligne 125 : titre, semaine, statut « Brouillon », lundi 0,5 sur la tâche, cases des jours postérieurs au jour du navigateur désactivées', async ({
  page,
  request,
  playwright,
}) => {
  await ouvrirFeuilleAlice(page, request, playwright);
  await expect(page.getByText(LIBELLE_S, { exact: true })).toBeVisible();
  await expect(statutFeuille(page)).toHaveText('Brouillon');
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
  for (const jour of ['jeu. 15/01', 'ven. 16/01']) {
    await expect(caseCharge(page, A, jour), jour).toBeDisabled();
  }
  await expect(caseCharge(page, A, 'mer. 14/01')).toBeEnabled();
});

test('E2E-498 : ligne 139 : case modifiée (0,5 → 1), entrée de menu « Mes tâches » : une seule confirmation, texte, bouton « Abandonner »', async ({
  page,
  request,
  playwright,
}) => {
  await ouvrirFeuilleAlice(page, request, playwright);
  await caseCharge(page, A, LUN).fill('1');
  await page.locator('h1').click();
  await nav(page).getByRole('link', { name: 'Mes tâches', exact: true }).click();
  await expect(confirmation(page)).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(confirmation(page)).toContainText(
    'Les modifications non enregistrées seront perdues.',
  );
  await expect(quitter(page)).toBeVisible();
});

test('E2E-499 : ligne 145 : case modifiée, « Semaine précédente » : une seule confirmation ; « Annuler » garde la semaine, l’adresse et la saisie', async ({
  page,
  request,
  playwright,
}) => {
  await ouvrirFeuilleAlice(page, request, playwright);
  await caseCharge(page, A, LUN).fill('1');
  await page.locator('h1').click();
  await bouton(page, 'Semaine précédente').click();
  await expect(confirmation(page)).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await rester(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(page.getByText(LIBELLE_S, { exact: true })).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');
});

test('E2E-500 : ligne 146 : aucune modification, « Semaine précédente » : aucune confirmation', async ({
  page,
  request,
  playwright,
}) => {
  await ouvrirFeuilleAlice(page, request, playwright);
  await bouton(page, 'Semaine précédente').click();
  await expect(page).toHaveURL(adresseFeuille(SP));
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('E2E-501 : ligne 147 : case modifiée, « Enregistrer » (« Feuille enregistrée. »), puis « Semaine précédente » : aucune confirmation', async ({
  page,
  request,
  playwright,
}) => {
  await ouvrirFeuilleAlice(page, request, playwright);
  const ecritures = ecouterEcritures(page);
  await caseCharge(page, A, LUN).fill('1');
  await page.locator('h1').click();
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: 'Feuille enregistrée.' })).toBeVisible();
  expect(ecritures.filter((e) => e.methode === 'PUT')).toHaveLength(1);
  await bouton(page, 'Semaine précédente').click();
  await expect(page).toHaveURL(adresseFeuille(SP));
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('E2E-502 : ligne 149 : case modifiée, fermeture de l’onglet : message du navigateur (beforeunload)', async ({
  page,
  request,
  playwright,
}) => {
  await ouvrirFeuilleAlice(page, request, playwright);
  await caseCharge(page, A, LUN).fill('1');
  await page.locator('h1').click();
  const attente = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  const dialogue = await attente;
  expect(dialogue.type()).toBe('beforeunload');
  await dialogue.dismiss();
});
