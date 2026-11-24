// Confirmation en quittant avec des modifications non enregistrées (D-172, SPEC §7 4b (8) et
// « Écran Planning manuel »). E2E-400 à E2E-408. Base « administrateur seul » avant et après chaque test.
import { expect, test, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { libelleCase, lireSaisies, monde } from './lot2e-helpers.js';
import {
  EMAIL_ALICE,
  H14,
  S,
  adresseFeuille,
  bouton,
  caseCharge,
  lireFeuilleApi,
  monde4b,
  remettreAdminSeul4b,
  sessionDe,
  ecouterEcritures,
} from './lot4b-helpers.js';
import { nav } from './lot6b-helpers.js';
import { cliquerDansConfirmation } from './stabilite-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

const LUN = 'lun. 12/01';
const A = '1 Tâche A';
const confirmation = (page: Page) =>
  page.getByRole('dialog', { name: 'Abandonner les modifications ?' });
const annuler = (page: Page) =>
  confirmation(page).getByRole('button', { name: 'Annuler', exact: true });
const abandonner = (page: Page) =>
  confirmation(page).getByRole('button', { name: 'Abandonner', exact: true });
const menuMesTaches = (page: Page) =>
  nav(page).getByRole('link', { name: 'Mes tâches', exact: true });

/** Alice sur la feuille de la semaine courante, arrivée par « Mes tâches » (entrée d'historique). */
async function ouvrirFeuille(page: Page): Promise<void> {
  await connecterAvec(page, EMAIL_ALICE);
  await expect(page).toHaveURL('/mes-taches');
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
}

async function feuilleInexistante(
  playwright: Parameters<typeof sessionDe>[0],
  semaine = S,
): Promise<void> {
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), semaine);
  expect(f.feuille.id).toBeNull();
}

test('E2E-400-r1 : Feuille de temps, modification puis entrée de menu : confirmation ; « Annuler » reste, « Abandonner » part ; base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrirFeuille(page);
  const ecritures = ecouterEcritures(page);
  await caseCharge(page, A, LUN).fill('1');
  await menuMesTaches(page).click();
  await expect(confirmation(page)).toBeVisible();
  await annuler(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');

  await menuMesTaches(page).click();
  await cliquerDansConfirmation(confirmation(page), abandonner(page), annuler(page));
  await expect(page).toHaveURL('/mes-taches');
  expect(ecritures).toHaveLength(0);
  await feuilleInexistante(playwright);
});

test('E2E-401 : Feuille de temps, modification puis retour du navigateur : confirmation, adresse rétablie ; « Annuler » garde la saisie, « Abandonner » revient en arrière ; base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrirFeuille(page);
  await caseCharge(page, A, LUN).fill('1');
  await page.goBack();
  await expect(confirmation(page)).toBeVisible();
  await expect(page).toHaveURL(adresseFeuille(S));
  await annuler(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');

  await page.goBack();
  await expect(confirmation(page)).toBeVisible();
  await abandonner(page).click();
  await expect(page).toHaveURL('/mes-taches');
  await feuilleInexistante(playwright);
});

test('E2E-402-r1 : Feuille de temps, modification puis déconnexion : confirmation ; « Annuler » reste connecté, « Abandonner » va à /connexion ; base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrirFeuille(page);
  await caseCharge(page, A, LUN).fill('1');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(confirmation(page)).toBeVisible();
  await annuler(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await cliquerDansConfirmation(confirmation(page), abandonner(page), annuler(page));
  await expect(page).toHaveURL('/connexion');
  await feuilleInexistante(playwright);
});

test('E2E-403 : Feuille de temps, modification puis « Semaine suivante » : une seule confirmation', async ({
  page,
  request,
  playwright,
}) => {
  await monde4b(request);
  await ouvrirFeuille(page);
  await caseCharge(page, A, LUN).fill('1');
  await bouton(page, 'Semaine suivante').click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(confirmation(page)).toBeVisible();
  await annuler(page).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(adresseFeuille(S));

  await bouton(page, 'Semaine suivante').click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await abandonner(page).click();
  await expect(page).toHaveURL(adresseFeuille('2026-01-19'));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await feuilleInexistante(playwright);
});

test('E2E-404 : Feuille de temps, sans modification puis après un enregistrement réussi : l’entrée de menu ne demande rien', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await ouvrirFeuille(page);
  await menuMesTaches(page).click();
  await expect(page).toHaveURL('/mes-taches');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await caseCharge(page, A, LUN).fill('1');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: 'Feuille enregistrée.' })).toBeVisible();
  await menuMesTaches(page).click();
  await expect(page).toHaveURL('/mes-taches');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

const URL_PM = (m: { projet: { id: number }; man: { id: number } }, mois = '2027-01') =>
  `/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=${mois}`;

test('E2E-405-r1 : Planning manuel, case cochée puis « Retour au projet » : confirmation ; « Annuler » reste, « Abandonner » part ; aucune saisie en base', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E405');
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_PM(m));
  const c = page.getByRole('checkbox', { name: libelleCase(m.nomAlice, 5, 'janvier', 'matin') });
  await c.check();
  await page.getByRole('link', { name: 'Retour au projet' }).click();
  await expect(confirmation(page)).toBeVisible();
  await annuler(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(URL_PM(m));
  await expect(c).toBeChecked();

  await page.getByRole('link', { name: 'Retour au projet' }).click();
  await cliquerDansConfirmation(confirmation(page), abandonner(page), annuler(page));
  await expect(page).toHaveURL(new RegExp(`/projets/${m.projet.id}$`));
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual([]);
});

test('E2E-406-r1 : Planning manuel, case cochée puis « Mois suivant » : bouton actif, confirmation ; « Annuler » reste, « Abandonner » change de mois ; aucune saisie en base', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E406');
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_PM(m));
  const c = page.getByRole('checkbox', { name: libelleCase(m.nomAlice, 5, 'janvier', 'matin') });
  await c.check();
  const suivant = page.getByRole('button', { name: 'Mois suivant' });
  await expect(suivant).toBeEnabled();
  await suivant.click();
  await expect(confirmation(page)).toBeVisible();
  await annuler(page).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(/mois=2027-01/);
  await expect(c).toBeChecked();

  await suivant.click();
  await cliquerDansConfirmation(confirmation(page), abandonner(page), annuler(page));
  await expect(page).toHaveURL(/mois=2027-02/);
  await expect(
    page.getByRole('checkbox', {
      name: new RegExp(`^${m.nomAlice}, \\d+ février, `),
      checked: true,
    }),
  ).toHaveCount(0);
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual([]);
});

test('E2E-407 : Planning manuel, sans modification puis après « Enregistrer » : aucune confirmation', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E407');
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_PM(m));
  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await expect(page).toHaveURL(/mois=2027-02/);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Mois précédent' }).click();
  await page
    .getByRole('checkbox', { name: libelleCase(m.nomAlice, 5, 'janvier', 'matin') })
    .check();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('status').filter({ hasText: /enregistr/i })).toBeVisible();
  await page.getByRole('link', { name: 'Retour au projet' }).click();
  await expect(page).toHaveURL(new RegExp(`/projets/${m.projet.id}$`));
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('E2E-408 : rechargement avec une modification : dialogue beforeunload du navigateur ; aucun sans modification', async ({
  page,
  request,
}) => {
  await monde4b(request);
  const m = await monde(request, 'E2E408');
  const types: string[] = [];
  page.on('dialog', (d) => {
    types.push(d.type());
    void d.accept();
  });

  // Feuille de temps.
  await ouvrirFeuille(page);
  await page.reload();
  expect(types, 'sans modification').toEqual([]);
  await caseCharge(page, A, LUN).fill('1');
  await page.locator('h1').click();
  await page.reload();
  expect(types, 'Feuille de temps avec modification').toEqual(['beforeunload']);
  await expect(caseCharge(page, A, LUN)).toHaveValue('');
  await page.reload();
  expect(types, 'après rechargement').toEqual(['beforeunload']);

  // Planning manuel.
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_PM(m));
  const c = page.getByRole('checkbox', { name: libelleCase(m.nomAlice, 5, 'janvier', 'matin') });
  await c.check();
  await page.reload();
  expect(types, 'Planning manuel avec modification').toEqual(['beforeunload', 'beforeunload']);
  await c.check();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('status').filter({ hasText: /enregistr/i })).toBeVisible();
  await page.reload();
  expect(types, 'après enregistrement').toEqual(['beforeunload', 'beforeunload']);
});
