// Lot onglets (D-247 ; SPEC « Écrans Projets et Imputations : onglets Modèles et Validation ») :
// E2E-666 à E2E-673. « Modèles » devient un onglet de l'écran Projets, « Validation » un onglet de l'écran
// Imputations ; entrées de menu « Modèles » et « Validation » supprimées ; anciennes adresses redirigées
// sans entrée d'historique. Base « administrateur seul » (feuilles comprises) avant et après chaque test,
// horloge du navigateur figée au mercredi 14/01/2026 (semaine S = 2026-01-12).
// Contrat des écrans (phase verte) : onglets `role="tab"` « Projets » et « Modèles » (adresse
// /projets?onglet=modeles), « Feuille de temps » et « Validation » (adresse
// /imputations?onglet=validation&semaine=AAAA-MM-JJ) ; la liste d'onglets (`role="tablist"`) n'existe que
// s'il y a au moins deux onglets disponibles ; l'entrée « Projets » du menu est `aria-current="page"` sur
// /projets?onglet=modeles.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import {
  EMAIL_ALICE,
  EMAIL_CHEF_P,
  H14,
  S,
  bouton,
  caseCharge,
  monde4b,
  remettreAdminSeul4b,
  statutFeuille,
  tableauFeuille,
} from './lot4b-helpers.js';
import { boutonDe, ligneValidation, statutOk, tableauValidation } from './lot4c-helpers.js';
import { remettreAdminSeul6b, nav } from './lot6b-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

/** Chemin et paramètres de l'adresse courante. */
const adresse = (page: Page): string => {
  const u = new URL(page.url());
  return u.pathname + u.search;
};
const onglet = (page: Page, nom: string) => page.getByRole('tab', { name: nom, exact: true });
const listeOnglets = (page: Page) => page.getByRole('tablist');
const lienMenu = (page: Page, nom: string) =>
  nav(page).getByRole('link', { name: nom, exact: true });

/** Page d'un second utilisateur, dans un contexte neuf à l'horloge figée. */
async function pageDe(browser: Browser, email: string): Promise<Page> {
  const contexte = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contexte.newPage();
  await page.clock.setFixedTime(H14);
  await connecterAvec(page, email);
  return page;
}

test('E2E-666 : onglets Projets et Modèles, menu sans « Modèles » ni « Validation », création et lecture', async ({
  page,
  browser,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 666', 'chef-666@onglets.test', 'chef_de_projet');

  await loginAsAdmin(page);
  await expect(lienMenu(page, 'Projets')).toBeVisible();
  await expect(lienMenu(page, 'Modèles')).toHaveCount(0);
  await expect(lienMenu(page, 'Validation')).toHaveCount(0);
  await lienMenu(page, 'Projets').click();
  await expect(onglet(page, 'Projets')).toHaveAttribute('aria-selected', 'true');
  await expect(onglet(page, 'Modèles')).toHaveAttribute('aria-selected', 'false');
  await onglet(page, 'Modèles').click();
  await expect(onglet(page, 'Modèles')).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => adresse(page)).toBe('/projets?onglet=modeles');

  // Création à l'écran, dans l'onglet Modèles ; effet dans la liste.
  await page.getByRole('button', { name: 'Nouveau modèle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('M-666');
  await dialog.getByLabel('Nom').fill('Modèle 666');
  await dialog.getByLabel('Date de début').fill('2027-01-04');
  await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.getByRole('row', { name: /Modèle 666/ })).toBeVisible();

  // Adresse directe, valeur invalide.
  await page.goto('/projets?onglet=modeles');
  await expect(onglet(page, 'Modèles')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('row', { name: /Modèle 666/ })).toBeVisible();
  await page.goto('/projets?onglet=bidon');
  await expect(onglet(page, 'Projets')).toHaveAttribute('aria-selected', 'true');

  // Chef de projet : même menu, liste en lecture, sans bouton de création.
  const chef = await pageDe(browser, 'chef-666@onglets.test');
  await expect(lienMenu(chef, 'Modèles')).toHaveCount(0);
  await expect(lienMenu(chef, 'Validation')).toHaveCount(0);
  await lienMenu(chef, 'Projets').click();
  await expect(onglet(chef, 'Projets')).toHaveAttribute('aria-selected', 'true');
  await onglet(chef, 'Modèles').click();
  await expect.poll(() => adresse(chef)).toBe('/projets?onglet=modeles');
  await expect(chef.getByRole('row', { name: /Modèle 666/ })).toBeVisible();
  await expect(chef.getByRole('button', { name: 'Nouveau modèle' })).toHaveCount(0);
  await chef.context().close();
});

test('E2E-667 : /modeles redirigé vers /projets?onglet=modeles sans entrée d’historique', async ({
  page,
  browser,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 667', 'chef-667@onglets.test', 'chef_de_projet');
  await api.utilisateur('Alice 667', 'alice-667@onglets.test', 'ressource', true);

  await loginAsAdmin(page);
  await page.goto('/modeles');
  await expect.poll(() => adresse(page)).toBe('/projets?onglet=modeles');
  await expect(onglet(page, 'Modèles')).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await expect.poll(() => adresse(page)).toBe('/');

  const chef = await pageDe(browser, 'chef-667@onglets.test');
  await chef.goto('/modeles');
  await expect.poll(() => adresse(chef)).toBe('/projets?onglet=modeles');
  await expect(onglet(chef, 'Modèles')).toHaveAttribute('aria-selected', 'true');
  await chef.goBack();
  await expect.poll(() => adresse(chef)).toBe('/');
  await chef.context().close();

  const ressource = await pageDe(browser, 'alice-667@onglets.test');
  await ressource.goto('/modeles');
  await expect.poll(() => adresse(ressource)).toBe('/mes-taches');
  await ressource.context().close();
});

test('E2E-668 : administrateur, onglets Feuille de temps et Validation, `semaine` conservée', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto(`/imputations?semaine=${S}`);
  await expect(onglet(page, 'Feuille de temps')).toHaveAttribute('aria-selected', 'true');
  await expect(onglet(page, 'Validation')).toBeVisible();
  await onglet(page, 'Validation').click();
  await expect(onglet(page, 'Validation')).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => adresse(page)).toBe(`/imputations?onglet=validation&semaine=${S}`);
  await expect(
    tableauValidation(page).or(page.getByText('Aucune feuille de temps pour cette semaine.')),
  ).toBeVisible();
  await page.reload();
  await expect(onglet(page, 'Validation')).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => adresse(page)).toBe(`/imputations?onglet=validation&semaine=${S}`);
  await onglet(page, 'Feuille de temps').click();
  await expect(onglet(page, 'Feuille de temps')).toHaveAttribute('aria-selected', 'true');
  expect(new URL(page.url()).searchParams.get('semaine')).toBe(S);
  expect(new URL(page.url()).searchParams.get('onglet')).not.toBe('validation');
});

test('E2E-669-r1 : parcours à l’écran, la ressource soumet, le chef non ressource valide depuis Imputations', async ({
  page,
  browser,
  request,
}) => {
  await monde4b(request, { avecB: false });
  const ACTIVITE = '1 Tâche A';

  // La ressource saisit et soumet sa feuille, à l'écran.
  await connecterAvec(page, EMAIL_ALICE);
  await lienMenu(page, 'Imputations').click();
  await expect(tableauFeuille(page)).toBeVisible();
  await caseCharge(page, ACTIVITE, 'lun. 12/01').fill('0,5');
  await bouton(page, 'Enregistrer').click();
  await expect(statutOk(page, 'Feuille enregistrée.')).toBeVisible();
  await bouton(page, 'Soumettre').click();
  await expect(statutFeuille(page)).toHaveText('Soumise');

  // Le chef de projet non ressource : entrée « Imputations », validation directe, aucune liste d'onglets.
  const chef = await pageDe(browser, EMAIL_CHEF_P);
  await lienMenu(chef, 'Imputations').click();
  await expect(tableauValidation(chef)).toBeVisible();
  // révision D-276 (5) a) : onglets « Validation » (par défaut) et « Absences »
  await expect(chef.getByRole('tab')).toHaveText(['Validation', 'Absences']);
  await expect(onglet(chef, 'Validation')).toHaveAttribute('aria-selected', 'true');
  const ligne = ligneValidation(chef, 'Alice 4B');
  await expect(ligne.getByText('Soumise', { exact: true })).toBeVisible();
  await boutonDe(ligne, 'Valider la feuille de Alice 4B').click();
  await boutonDe(chef.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(chef, 'Feuille validée.')).toBeVisible();
  await expect(ligne.getByText('Validée', { exact: true })).toBeVisible();
  await chef.context().close();

  // La ressource voit sa feuille « Validée ».
  await page.reload();
  await expect(statutFeuille(page)).toHaveText('Validée');
  await expect(caseCharge(page, ACTIVITE, 'lun. 12/01')).toBeDisabled();
});

test('E2E-670 : chef de projet ressource, les deux onglets', async ({ browser, request }) => {
  const api = await preparer(request);
  await api.utilisateur('Chef R 670', 'chef-r-670@onglets.test', 'chef_de_projet', true);
  const chef = await pageDe(browser, 'chef-r-670@onglets.test');
  await lienMenu(chef, 'Imputations').click();
  await expect(listeOnglets(chef)).toBeVisible();
  await expect(onglet(chef, 'Feuille de temps')).toHaveAttribute('aria-selected', 'true');
  await expect(onglet(chef, 'Validation')).toBeVisible();
  await onglet(chef, 'Validation').click();
  await expect(onglet(chef, 'Validation')).toHaveAttribute('aria-selected', 'true');
  await expect(
    tableauValidation(chef).or(chef.getByText('Aucune feuille de temps pour cette semaine.')),
  ).toBeVisible();
  await chef.context().close();
});

test('E2E-671-r1 : rôle ressource, onglets Feuille de temps et Absences (D-276), pas de Validation, `?onglet=validation` ignoré', async ({
  browser,
  request,
}) => {
  await monde4b(request, { avecB: false });
  const alice = await pageDe(browser, EMAIL_ALICE);
  await lienMenu(alice, 'Imputations').click();
  await expect(tableauFeuille(alice)).toBeVisible();
  // révision D-276 (5) a) : onglet « Absences » en plus, jamais « Validation »
  await expect(alice.getByRole('tab')).toHaveText(['Feuille de temps', 'Absences']);
  await alice.goto(`/imputations?onglet=validation&semaine=${S}`);
  await expect(tableauFeuille(alice)).toBeVisible();
  await expect(alice.getByRole('tab')).toHaveText(['Feuille de temps', 'Absences']);
  await expect(tableauValidation(alice)).toHaveCount(0);
  await expect(alice.getByText(/Validation|Feuilles de temps à valider/)).toHaveCount(0);
  await alice.context().close();
});

test('E2E-672 : /validation?semaine=X redirigé vers /imputations?onglet=validation&semaine=X', async ({
  page,
  browser,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 672', 'chef-672@onglets.test', 'chef_de_projet');
  await api.utilisateur('Alice 672', 'alice-672@onglets.test', 'ressource', true);
  const cible = `/imputations?onglet=validation&semaine=${S}`;

  await loginAsAdmin(page);
  await page.goto(`/validation?semaine=${S}`);
  await expect.poll(() => adresse(page)).toBe(cible);
  await expect(onglet(page, 'Validation')).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await expect.poll(() => adresse(page)).toBe('/');

  const chef = await pageDe(browser, 'chef-672@onglets.test');
  await chef.goto(`/validation?semaine=${S}`);
  await expect.poll(() => adresse(chef)).toBe(cible);
  await expect(
    tableauValidation(chef).or(chef.getByText('Aucune feuille de temps pour cette semaine.')),
  ).toBeVisible();
  await chef.goBack();
  await expect.poll(() => adresse(chef)).toBe('/');
  await chef.context().close();

  const ressource = await pageDe(browser, 'alice-672@onglets.test');
  await ressource.goto(`/validation?semaine=${S}`);
  await expect.poll(() => adresse(ressource)).toBe('/mes-taches');
  await ressource.context().close();
});

test('E2E-673 : après suppression d’un modèle depuis sa fiche, onglet Modèles et entrée « Projets » active', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const modele = await api.modele('M-673', 'Modèle 673');
  await loginAsAdmin(page);
  await page.goto(`/projets/${modele.id}`);
  await page.getByRole('button', { name: 'Supprimer le projet' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect.poll(() => adresse(page)).toBe('/projets?onglet=modeles');
  await expect(onglet(page, 'Modèles')).toHaveAttribute('aria-selected', 'true');
  await expect(lienMenu(page, 'Projets')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('row', { name: /Modèle 673/ })).toHaveCount(0);
});
