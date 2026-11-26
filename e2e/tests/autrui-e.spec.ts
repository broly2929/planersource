// AUT-E (D-181 (5), (6), SPEC §7 « Saisie pour autrui par l'administrateur ») : écran Feuille de temps pour
// autrui. E2E-417 à E2E-430. Base « administrateur seul » remise à zéro avant et après chaque test, horloge
// du navigateur figée au mercredi 14/01/2026. Données préparées par l'API (mondeAutrui), actions testées à
// l'écran. Tout refus : base relue par l'API (session d'Alice). Contrat : autrui-e-helpers.ts.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import {
  EMAIL_ALICE,
  EMAIL_CHEF_P,
  H14,
  S,
  agirApi,
  alerte,
  bouton,
  caseCharge,
  ecouterEcritures,
  imputationsDe,
  imputerApi,
  jS,
  lireFeuilleApi,
  remettreAdminSeul4b,
  sessionDe,
  statutFeuille,
} from './lot4b-helpers.js';
import {
  adresseValidation,
  boutonDe,
  ligneValidation,
  ouvrirValidationParMenu,
  statutOk,
} from './lot4c-helpers.js';
import {
  EMAIL_ADMIN_RESSOURCE,
  MESSAGE_CHOIX,
  VERROUILLEE,
  adresseAutrui,
  compterRequetesFeuilles,
  listeRessource,
  mondeAutrui,
  optionsRessource,
  titreFeuilleDe,
} from './autrui-e-helpers.js';

const A = '1 Tâche A';
const LUN = 'lun. 12/01';
const MAR = 'mar. 13/01';
const ENREGISTREE = 'Feuille enregistrée.';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });
const titre = (page: Page) =>
  page.getByRole('heading', { name: 'Feuille de temps', level: 1, exact: true });
const confirmation = (page: Page) =>
  page.getByRole('dialog', { name: 'Abandonner les modifications ?', exact: true });

/** L'administrateur (non ressource) ouvre « Imputations » par le menu. */
async function ouvrirParMenu(page: Page): Promise<void> {
  await loginAsAdmin(page);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page.getByText(MESSAGE_CHOIX, { exact: true })).toBeVisible();
}

/** L'administrateur ouvre directement la feuille d'Alice. */
async function ouvrirAlice(page: Page, aliceId: number): Promise<void> {
  await loginAsAdmin(page);
  await page.goto(adresseAutrui(S, aliceId));
  await expect(titreFeuilleDe(page, 'Alice 4B')).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toBeVisible();
}

test('E2E-417 : liste « Ressource » de l’administrateur : ressources actives triées par nom ; inactif et non-ressources absents', async ({
  page,
  request,
}) => {
  await mondeAutrui(request);
  await ouvrirParMenu(page);
  await expect(listeRessource(page)).toBeVisible();
  const options = await optionsRessource(page);
  expect(options.map((o) => o.texte)).toEqual([
    'Admin Ressource AUT',
    'Alice 4B',
    'Bob 4B',
    'Zoé 4B',
  ]);
});

test('E2E-418 : liste « Ressource » absente pour une ressource ; titre et tableau visibles', async ({
  page,
  request,
}) => {
  await mondeAutrui(request);
  await connecterAvec(page, EMAIL_ALICE);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(titre(page)).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toBeVisible();
  await expect(listeRessource(page)).toHaveCount(0);
});

test('E2E-419 : administrateur non ressource : message « Choisissez une ressource. », aucune requête vers /api/feuilles ; le choix d’Alice en émet une', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await loginAsAdmin(page);
  const requetes = compterRequetesFeuilles(page);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page.getByText(MESSAGE_CHOIX, { exact: true })).toBeVisible();
  await expect(titre(page)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(requetes.n()).toBe(0);

  await listeRessource(page).selectOption(String(m.alice.id));
  await expect(caseCharge(page, A, LUN)).toBeVisible();
  expect(requetes.n()).toBeGreaterThan(0);
  await expect(page.getByText(MESSAGE_CHOIX, { exact: true })).toHaveCount(0);
});

test('E2E-420 : administrateur ressource : lui-même sélectionné, titre inchangé, feuille chargée', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await connecterAvec(page, EMAIL_ADMIN_RESSOURCE);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(titre(page)).toBeVisible();
  await expect(listeRessource(page)).toHaveValue(String(m.adminRessource.id));
  await expect(statutFeuille(page)).toHaveText('Brouillon');
  await expect(page.getByText(MESSAGE_CHOIX, { exact: true })).toHaveCount(0);
});

test('E2E-421 : choisir Alice : adresse avec `ressource`, titre « Feuille de temps de Alice 4B »', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await ouvrirParMenu(page);
  await listeRessource(page).selectOption({ label: 'Alice 4B' });
  await expect(page).toHaveURL(adresseAutrui(S, m.alice.id));
  await expect(titreFeuilleDe(page, 'Alice 4B')).toBeVisible();
  await expect(listeRessource(page)).toHaveValue(String(m.alice.id));
  await expect(caseCharge(page, A, LUN)).toBeVisible();
});

test('E2E-422 : adresse avec `ressource=<id d’Alice>` ouverte directement : Alice sélectionnée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await mondeAutrui(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 0.5 }] },
  ]);
  await ouvrirAlice(page, m.alice.id);
  await expect(listeRessource(page)).toHaveValue(String(m.alice.id));
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
});

test('E2E-423 : `ressource` inconnue, non ressource ou inactive : paramètre retiré, adresse corrigée sans rechargement', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await loginAsAdmin(page);
  let chargements = 0;
  page.on('load', () => chargements++);
  for (const param of ['999999', 'abc', String(m.chefP.id), String(m.inactif.id)]) {
    const avant = chargements;
    await page.goto(adresseAutrui(S, param));
    await expect(page).toHaveURL(adresseAutrui(S));
    await expect(page.getByText(MESSAGE_CHOIX, { exact: true })).toBeVisible();
    expect(chargements - avant, `rechargements pour ${param}`).toBe(1);
  }
  // Contrôle positif : une ressource valide est gardée.
  await page.goto(adresseAutrui(S, m.alice.id));
  await expect(page).toHaveURL(adresseAutrui(S, m.alice.id));
  await expect(titreFeuilleDe(page, 'Alice 4B')).toBeVisible();
});

test('E2E-424 : pour Alice, saisie et « Enregistrer » : « Feuille enregistrée. », imputation en base au nom d’Alice', async ({
  page,
  request,
  playwright,
}) => {
  const m = await mondeAutrui(request);
  await ouvrirAlice(page, m.alice.id);
  await caseCharge(page, A, LUN).fill('0,5');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(imputationsDe(f, 'Tâche A')).toEqual([{ jour: jS(12), charge: 0.5 }]);
  expect(f.feuille.statut).toBe('brouillon');
});

test('E2E-425 : pour Alice, « Soumettre » (« Soumise ») puis « Rappeler » (« Brouillon »), statuts en base', async ({
  page,
  request,
  playwright,
}) => {
  const m = await mondeAutrui(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await ouvrirAlice(page, m.alice.id);
  await caseCharge(page, A, LUN).fill('0,5');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  await bouton(page, 'Soumettre').click();
  await expect(statutFeuille(page)).toHaveText('Soumise');
  expect((await lireFeuilleApi(alice, S)).feuille.statut).toBe('soumise');
  await bouton(page, 'Rappeler').click();
  await expect(statutFeuille(page)).toHaveText('Brouillon');
  expect((await lireFeuilleApi(alice, S)).feuille.statut).toBe('brouillon');
});

test('E2E-426 : pour Alice, feuille soumise par l’API après le chargement : refus `feuille_verrouillee`, saisie gardée, base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await mondeAutrui(request);
  const alice = await sessionDe(playwright, EMAIL_ALICE);
  await ouvrirAlice(page, m.alice.id);
  const f0 = await imputerApi(alice, S, [
    { assignation_id: m.sa.id, imputations: [{ jour: jS(12), charge: 1 }] },
  ]);
  await agirApi(alice, f0.feuille.id!, 'soumettre');
  await caseCharge(page, A, MAR).fill('0,5');
  await bouton(page, 'Enregistrer').click();
  await expect(alerte(page, VERROUILLEE)).toBeVisible();
  await expect(caseCharge(page, A, MAR)).toHaveValue('0,5');
  const f = await lireFeuilleApi(alice, S);
  expect(f.feuille.statut).toBe('soumise');
  expect(imputationsDe(f, 'Tâche A')).toEqual([{ jour: jS(12), charge: 1 }]);
});

test('E2E-427 : case modifiée, changement de ressource : une confirmation ; « Annuler » garde tout, « Abandonner » change sans rien envoyer', async ({
  page,
  request,
  playwright,
}) => {
  const m = await mondeAutrui(request);
  await ouvrirAlice(page, m.alice.id);
  const ecritures = ecouterEcritures(page);
  await caseCharge(page, A, LUN).fill('1');
  await listeRessource(page).selectOption({ label: 'Bob 4B' });
  await expect(confirmation(page)).toHaveCount(1);
  await expect(
    confirmation(page).getByText('Les modifications non enregistrées seront perdues.'),
  ).toBeVisible();
  await confirmation(page).getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(adresseAutrui(S, m.alice.id));
  await expect(listeRessource(page)).toHaveValue(String(m.alice.id));
  await expect(caseCharge(page, A, LUN)).toHaveValue('1');

  await listeRessource(page).selectOption({ label: 'Bob 4B' });
  await expect(confirmation(page)).toHaveCount(1);
  await confirmation(page).getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(page).toHaveURL(adresseAutrui(S, m.bob.id));
  await expect(titreFeuilleDe(page, 'Bob 4B')).toBeVisible();
  await expect(confirmation(page)).toHaveCount(0);
  expect(ecritures).toHaveLength(0);
  const f = await lireFeuilleApi(await sessionDe(playwright, EMAIL_ALICE), S);
  expect(f.feuille.id).toBeNull();
});

test('E2E-428 : sans modification, ou après un enregistrement réussi, le changement de ressource ne demande rien', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await ouvrirAlice(page, m.alice.id);
  await listeRessource(page).selectOption({ label: 'Bob 4B' });
  await expect(titreFeuilleDe(page, 'Bob 4B')).toBeVisible();
  await listeRessource(page).selectOption({ label: 'Alice 4B' });
  await expect(titreFeuilleDe(page, 'Alice 4B')).toBeVisible();
  await caseCharge(page, A, LUN).fill('1');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  await listeRessource(page).selectOption({ label: 'Bob 4B' });
  await expect(titreFeuilleDe(page, 'Bob 4B')).toBeVisible();
  await expect(confirmation(page)).toHaveCount(0);
});

test('E2E-429-r1 : parcours IHM : l’administrateur saisit et soumet pour Alice, le chef valide, Alice voit « Validée » avec la charge', async ({
  page,
  request,
}) => {
  await mondeAutrui(request);
  await ouvrirParMenu(page);
  await listeRessource(page).selectOption({ label: 'Alice 4B' });
  await caseCharge(page, A, LUN).fill('0,5');
  await bouton(page, 'Enregistrer').click();
  await expect(page.getByRole('status').filter({ hasText: ENREGISTREE })).toBeVisible();
  await bouton(page, 'Soumettre').click();
  await expect(statutFeuille(page)).toHaveText('Soumise');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidationParMenu(page);
  await expect(page).toHaveURL(adresseValidation(S));
  const ligne = ligneValidation(page, 'Alice 4B');
  await expect(ligne.getByText('Soumise', { exact: true })).toBeVisible();
  await boutonDe(ligne, 'Valider la feuille de Alice 4B').click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await connecterAvec(page, EMAIL_ALICE);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(statutFeuille(page)).toHaveText('Validée');
  await expect(caseCharge(page, A, LUN)).toHaveValue('0,5');
  await expect(caseCharge(page, A, LUN)).toBeDisabled();
});

test('E2E-430 : ressource non administrateur : paramètre `ressource` retiré sans rechargement, sa propre feuille, aucune requête avec `ressource_id`', async ({
  page,
  request,
}) => {
  const m = await mondeAutrui(request);
  await connecterAvec(page, EMAIL_ALICE);
  const urls: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/feuilles')) urls.push(req.url());
  });
  let chargements = 0;
  page.on('load', () => chargements++);
  await page.goto(adresseAutrui(S, m.bob.id));
  await expect(page).toHaveURL(adresseAutrui(S));
  expect(chargements).toBe(1);
  await expect(titre(page)).toBeVisible();
  await expect(caseCharge(page, A, LUN)).toBeVisible();
  expect(urls.length).toBeGreaterThan(0);
  expect(urls.filter((u) => u.includes('ressource_id'))).toEqual([]);
});
