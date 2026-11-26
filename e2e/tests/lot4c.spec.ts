// Lot 4c (D-135, SPEC §7 « Écran Validation ») : écran Validation. E2E-299 à E2E-319.
// Base « administrateur seul » remise à zéro avant et après chaque test (feuilles comprises), horloge du
// navigateur figée au mercredi 14/01/2026 (date du serveur réelle, postérieure). Données préparées par
// l'API (monde4c), sauf E2E-317 et E2E-318 (tout à l'écran). Écritures et refus vérifiés par relecture SQL
// (`feuille_temps`, `validation_feuille`). Contrat des sélecteurs : en-tête de lot4c-helpers.ts.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { allerA, creerRessourceParEcran, ouvrirCalendriers } from './lot3c-helpers.js';
import {
  EMAIL_ALICE,
  EMAIL_CHEF_P,
  H14,
  S,
  SP,
  agirApi,
  bouton,
  caseCharge,
  jS,
  remettreAdminSeul4b,
  sessionDe,
  statutFeuille,
} from './lot4b-helpers.js';
import {
  EMAIL_BOB,
  EMAIL_CARLA,
  EMAIL_CHEF_Q,
  EMAIL_DINA,
  LIBELLE_S,
  VIDE_SEMAINE,
  adresseValidation,
  alerte,
  attendreAlerteAuDessus,
  boutonDe,
  compter,
  etatFeuille,
  feuilleVide,
  imputerEtSoumettre,
  intercepter,
  ligneValidation,
  monde4c,
  ouvrirValidationParMenu,
  ouvrirValidation,
  soumettreAlice,
  statutOk,
  tableauValidation,
} from './lot4c-helpers.js';
import { fermerEnAbandonnant } from './garde-dialogue-helpers.js';
import { saisirParGeste } from './stabilite-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });
const lienValidation = (page: Page) =>
  nav(page).getByRole('link', { name: 'Validation', exact: true });
const lienImputations = (page: Page) =>
  nav(page).getByRole('link', { name: 'Imputations', exact: true });
const VOIR = 'Voir la feuille de Alice 4B';
const VALIDER = 'Valider la feuille de Alice 4B';
const REJETER = 'Rejeter la feuille de Alice 4B';

test('E2E-299-r1 : entrée « Validation » pour l’administrateur et le chef (onglet d’Imputations), pas pour une ressource', async ({
  page,
  request,
}) => {
  // Révision D-031 (D-247) : plus d'entrée de menu « Validation » ; onglet de l'écran Imputations.
  await monde4c(request);
  await loginAsAdmin(page);
  await expect(lienValidation(page)).toHaveCount(0);
  await ouvrirValidationParMenu(page);
  await expect(page).toHaveURL(adresseValidation(S));
  await expect(lienImputations(page)).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  await connecterAvec(page, EMAIL_CHEF_P);
  await expect(lienValidation(page)).toHaveCount(0);
  await ouvrirValidationParMenu(page);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  await connecterAvec(page, EMAIL_ALICE);
  await expect(lienImputations(page)).toBeVisible();
  await expect(lienValidation(page)).toHaveCount(0);
  await lienImputations(page).click();
  await expect(page.getByRole('tab', { name: 'Validation', exact: true })).toHaveCount(0);
});

test('E2E-300 : adresse absente ou invalide → lundi courant, adresse corrigée sans rechargement ; lundi valide gardé', async ({
  page,
  request,
}) => {
  await monde4c(request);
  await connecterAvec(page, EMAIL_CHEF_P);
  let chargements = 0;
  page.on('load', () => chargements++);
  for (const param of [undefined, '2026-01-13', 'abc', '1999-12-27', '2100-01-04']) {
    const avant = chargements;
    await page.goto(adresseValidation(param));
    await expect(page).toHaveURL(adresseValidation(S));
    await expect(page.getByText(LIBELLE_S, { exact: true })).toBeVisible();
    expect(chargements - avant, `rechargements pour ${String(param)}`).toBe(1);
  }
  await page.goto(adresseValidation(SP));
  await expect(page).toHaveURL(adresseValidation(SP));
  await expect(
    page.getByText('Semaine du 05/01/2026 au 11/01/2026', { exact: true }),
  ).toBeVisible();
});

test('E2E-301 : navigation de semaine : boutons, libellé, liste de la semaine', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await expect(page.getByText(LIBELLE_S, { exact: true })).toBeVisible();
  await expect(ligneValidation(page, 'Alice 4B')).toBeVisible();

  await boutonDe(page, 'Semaine précédente').click();
  await expect(page).toHaveURL(adresseValidation(SP));
  await expect(
    page.getByText('Semaine du 05/01/2026 au 11/01/2026', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(VIDE_SEMAINE, { exact: true })).toBeVisible();

  await boutonDe(page, 'Semaine suivante').click();
  await expect(page).toHaveURL(adresseValidation(S));
  await expect(ligneValidation(page, 'Alice 4B')).toBeVisible();

  await boutonDe(page, 'Semaine suivante').click();
  await expect(page).toHaveURL(adresseValidation('2026-01-19'));
  await expect(
    page.getByText('Semaine du 19/01/2026 au 25/01/2026', { exact: true }),
  ).toBeVisible();
  await boutonDe(page, 'Cette semaine').click();
  await expect(page).toHaveURL(adresseValidation(S));
  await expect(ligneValidation(page, 'Alice 4B')).toBeVisible();
});

test('E2E-302 : tableau du chef de P : colonnes, ordre, badges « À valider » et « Non autorisé »', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  await imputerEtSoumettre(playwright, bob.email, bob.assignation, { soumettre: false });
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);

  const tableau = tableauValidation(page);
  await expect(tableau.getByRole('columnheader')).toHaveText([
    'Ressource',
    'Statut',
    'Projets',
    'Actions',
  ]);
  const lignes = tableau.locator('tbody tr');
  await expect(lignes).toHaveCount(2);
  await expect(lignes.nth(0)).toContainText('Alice 4B');
  await expect(lignes.nth(1)).toContainText('Bob 4B');

  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B · À valider', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · Non autorisé', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, VOIR)).toBeVisible();
  await expect(boutonDe(alice, VALIDER)).toBeVisible();
  await expect(boutonDe(alice, REJETER)).toBeVisible();

  const ligneBob = ligneValidation(page, 'Bob 4B');
  await expect(ligneBob.getByText('Brouillon', { exact: true })).toBeVisible();
  await expect(ligneBob.getByText('P4B', { exact: true })).toBeVisible();
  await expect(ligneBob.getByText('P4B · À valider', { exact: true })).toHaveCount(0);
});

test('E2E-303 : badge « Validé » : Q validé par son chef, vu par le chef de P', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_Q), id, 'valider');
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · Validé', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B · À valider', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, VALIDER)).toBeVisible();
});

test('E2E-304 : administrateur, quatre statuts : badges, « Voir » partout, « Valider » et « Rejeter » sur la soumise seule', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  const carla = await m.ressourceSurP('Carla 4B', EMAIL_CARLA, 'Tâche D');
  const dina = await m.ressourceSurP('Dina 4B', EMAIL_DINA, 'Tâche E');
  await imputerEtSoumettre(playwright, bob.email, bob.assignation, { soumettre: false });
  const idCarla = await imputerEtSoumettre(playwright, carla.email, carla.assignation);
  const idDina = await imputerEtSoumettre(playwright, dina.email, dina.assignation);
  await loginAsAdmin(page);
  const admin = page.request;
  await agirApi(admin, idCarla, 'valider');
  await agirApi(admin, idDina, 'rejeter', { commentaire: 'À revoir' });
  await ouvrirValidation(page);

  await expect(tableauValidation(page).locator('tbody tr')).toHaveCount(4);
  const attendu = [
    ['Alice 4B', 'Soumise', true],
    ['Bob 4B', 'Brouillon', false],
    ['Carla 4B', 'Validée', false],
    ['Dina 4B', 'Rejetée', false],
  ] as const;
  for (const [nom, statut, actions] of attendu) {
    const l = ligneValidation(page, nom);
    await expect(l.getByText(statut, { exact: true }), nom).toBeVisible();
    await expect(boutonDe(l, `Voir la feuille de ${nom}`), nom).toBeVisible();
    await expect(boutonDe(l, `Valider la feuille de ${nom}`), nom).toHaveCount(actions ? 1 : 0);
    await expect(boutonDe(l, `Rejeter la feuille de ${nom}`), nom).toHaveCount(actions ? 1 : 0);
  }
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('P4B · À valider', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · À valider', { exact: true })).toBeVisible();
  await expect(
    ligneValidation(page, 'Carla 4B').getByText('P4B · Validé', { exact: true }),
  ).toBeVisible();
  const ligneBob = ligneValidation(page, 'Bob 4B');
  await expect(ligneBob.getByText('P4B', { exact: true })).toBeVisible();
  await expect(ligneBob.getByText('P4B · À valider', { exact: true })).toHaveCount(0);
});

test('E2E-305 : « Aucune imputation » : listée pour l’administrateur, absente pour le chef', async ({
  page,
  request,
}) => {
  await monde4c(request);
  await feuilleVide(EMAIL_ALICE, S);
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Aucune imputation', { exact: true })).toBeVisible();
  await expect(alice.getByText('Brouillon', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, VOIR)).toBeVisible();
  await expect(boutonDe(alice, VALIDER)).toHaveCount(0);
  await expect(boutonDe(alice, REJETER)).toHaveCount(0);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await expect(page.getByText(VIDE_SEMAINE, { exact: true })).toBeVisible();
  await expect(ligneValidation(page, 'Alice 4B')).toHaveCount(0);
});

test('E2E-319-r1 : ressource sans rôle chef ni administrateur : /validation redirige vers /mes-taches, aucun appel à /api/validations', async ({
  page,
  request,
}) => {
  await monde4c(request);
  await connecterAvec(page, EMAIL_ALICE);
  const n = compter(page);
  await page.goto('/validation');
  // Révision 6b (D-031, D-148 (5)) : redirection au lieu du message « Accès réservé… ».
  await expect(page).toHaveURL('/mes-taches');
  await expect(tableauValidation(page)).toHaveCount(0);
  expect(n.lectures).toBe(0);
});

test('E2E-306 : liste vide : message, sans tableau', async ({ page, request }) => {
  await monde4c(request);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await expect(page.getByText(VIDE_SEMAINE, { exact: true })).toBeVisible();
  await expect(tableauValidation(page)).toHaveCount(0);
});

test('E2E-307 : « Voir » : lignes du chef seulement, lecture seule, total, dépassement, focus rendu', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const ecritures = compter(page);
  const voir = boutonDe(ligneValidation(page, 'Alice 4B'), VOIR);
  await voir.click();
  const dialogue = page.getByRole('dialog', {
    name: 'Feuille de Alice 4B, semaine du 12/01/2026 au 18/01/2026',
  });
  await expect(dialogue).toBeVisible();
  const tableau = dialogue.getByRole('table', { name: 'Imputations de la semaine', exact: true });
  await expect(tableau).toBeVisible();
  await expect(tableau.locator('tr[data-ligne-assignation]')).toHaveCount(1);
  await expect(tableau).toContainText('1 Tâche A');
  await expect(tableau).not.toContainText('Tâche B');
  await expect(dialogue.locator('input:not([disabled])')).toHaveCount(0);
  await expect(
    dialogue.getByRole('textbox', { name: '1 Tâche A, lun. 12/01', exact: true }),
  ).toHaveValue('1,5');
  await expect(dialogue.locator(`[data-total-jour="${jS(12)}"]`)).toContainText('1,5');
  await expect(dialogue.locator(`[data-depassement-jour="${jS(12)}"]`)).toContainText(
    'Dépassement',
  );
  await expect(dialogue.locator(`[data-depassement-jour="${jS(13)}"]`)).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(dialogue).toHaveCount(0);
  await expect(voir).toBeFocused();

  await voir.click();
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(voir).toBeFocused();
  expect(ecritures.ecritures).toBe(0);
});

test('E2E-308 : « Voir » d’une feuille rejetée : commentaire de rejet affiché', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_P), id, 'rejeter', {
    commentaire: 'Écart sur mardi',
  });
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await boutonDe(ligneValidation(page, 'Alice 4B'), VOIR).click();
  const dialogue = page.getByRole('dialog');
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByRole('table', { name: 'Imputations de la semaine' })).toBeVisible();
  await expect(dialogue).toContainText('Écart sur mardi');
});

test('E2E-309 : « Valider » (administrateur) : confirmation, annulation sans écriture, validation complète', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  const ecritures = compter(page);
  const alice = ligneValidation(page, 'Alice 4B');

  await boutonDe(alice, VALIDER).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toContainText('Valider la feuille de Alice 4B pour P4B, Q4B ?');
  await boutonDe(confirmation, 'Annuler').click();
  await expect(confirmation).toHaveCount(0);
  expect(ecritures.ecritures).toBe(0);
  expect(await etatFeuille(id)).toEqual({ statut: 'soumise', commentaire: null, validations: [] });

  await boutonDe(alice, VALIDER).click();
  const lecturesAvant = ecritures.lectures;
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(alice.getByText('Validée', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B · Validé', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · Validé', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, VALIDER)).toHaveCount(0);
  await expect(boutonDe(alice, REJETER)).toHaveCount(0);
  expect(ecritures.lectures).toBeGreaterThan(lecturesAvant);
  const etat = await etatFeuille(id);
  expect(etat.statut).toBe('validee');
  expect(etat.validations.map((v) => v.projet)).toEqual(['P4B', 'Q4B']);
});

test('E2E-310 : validation partielle (chef de P) : la feuille reste soumise', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const alice = ligneValidation(page, 'Alice 4B');
  await boutonDe(alice, VALIDER).click();
  await expect(page.getByRole('dialog')).toContainText('Valider la feuille de Alice 4B pour P4B ?');
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(alice.getByText('P4B · Validé', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · Non autorisé', { exact: true })).toBeVisible();
  await expect(alice.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, VALIDER)).toHaveCount(0);
  await expect(boutonDe(alice, REJETER)).toBeVisible();
  const etat = await etatFeuille(id);
  expect(etat.statut).toBe('soumise');
  expect(etat.validations).toEqual([{ projet: 'P4B', validateur: 'Chef P 4B' }]);
});

test('E2E-311-r2 : « Rejeter » : commentaire obligatoire, compteur, rejet, validations effacées', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_Q), id, 'valider');
  expect((await etatFeuille(id)).validations).toHaveLength(1);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const ecritures = compter(page);
  const alice = ligneValidation(page, 'Alice 4B');

  await boutonDe(alice, REJETER).click();
  const dialogue = page.getByRole('dialog');
  const champ = dialogue.getByLabel('Commentaire');
  const rejeter = boutonDe(dialogue, 'Rejeter');
  await expect(champ).toBeVisible();
  await expect(rejeter).toBeDisabled();
  await saisirParGeste(champ, '   ');
  await expect(rejeter).toBeDisabled();
  await champ.fill('a'.repeat(501));
  await expect(dialogue.getByText('501 / 500', { exact: true })).toBeVisible();
  await expect(rejeter).toBeDisabled();
  await champ.fill('a'.repeat(500));
  await expect(dialogue.getByText('500 / 500', { exact: true })).toBeVisible();
  await expect(rejeter).toBeEnabled();
  await champ.fill('  Écart sur mardi  ');
  await expect(dialogue.getByText('15 / 500', { exact: true })).toBeVisible();
  await expect(rejeter).toBeEnabled();

  await fermerEnAbandonnant(page, dialogue, 'croix');
  expect(ecritures.ecritures).toBe(0);
  expect((await etatFeuille(id)).statut).toBe('soumise');

  await boutonDe(alice, REJETER).click();
  await page.getByRole('dialog').getByLabel('Commentaire').fill('  Écart sur mardi  ');
  await boutonDe(page.getByRole('dialog'), 'Rejeter').click();
  await expect(statutOk(page, 'Feuille rejetée.')).toBeVisible();
  await expect(alice.getByText('Rejetée', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, VALIDER)).toHaveCount(0);
  await expect(boutonDe(alice, REJETER)).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual({
    statut: 'rejetee',
    commentaire: 'Écart sur mardi',
    validations: [],
  });
});

test('E2E-312-r1 : valider, 422 statut_invalide : dialogue fermé, alerte au-dessus du tableau, liste relue, base inchangée, focus', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const n = compter(page);
  await intercepter(page, 'valider', 422, 'statut_invalide');
  await boutonDe(ligneValidation(page, 'Alice 4B'), VALIDER).click();
  const lecturesAvant = n.lectures;
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await attendreAlerteAuDessus(page, 'La feuille a changé de statut.');
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(boutonDe(ligneValidation(page, 'Alice 4B'), VALIDER)).toBeFocused();
  await expect(statutOk(page, 'Feuille validée.')).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual({ statut: 'soumise', commentaire: null, validations: [] });
});

test('E2E-313 : valider, 403 : message, base inchangée', async ({ page, request, playwright }) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await intercepter(page, 'valider', 403);
  await boutonDe(ligneValidation(page, 'Alice 4B'), VALIDER).click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(alerte(page, 'Vous n’avez pas le droit d’agir sur cette feuille.')).toBeVisible();
  await expect(statutOk(page, 'Feuille validée.')).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual({ statut: 'soumise', commentaire: null, validations: [] });
});

test('E2E-314-r1 : rejeter, 404 : dialogue fermé, alerte au-dessus du tableau, liste relue, base inchangée, focus', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const n = compter(page);
  await intercepter(page, 'rejeter', 404);
  await boutonDe(ligneValidation(page, 'Alice 4B'), REJETER).click();
  await page.getByRole('dialog').getByLabel('Commentaire').fill('Écart');
  const lecturesAvant = n.lectures;
  await boutonDe(page.getByRole('dialog'), 'Rejeter').click();
  await attendreAlerteAuDessus(page, 'Feuille introuvable.');
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(boutonDe(ligneValidation(page, 'Alice 4B'), REJETER)).toBeFocused();
  await expect(statutOk(page, 'Feuille rejetée.')).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual({ statut: 'soumise', commentaire: null, validations: [] });
});

test('E2E-315 : rejeter, 400 : message, base inchangée', async ({ page, request, playwright }) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await intercepter(page, 'rejeter', 400);
  await boutonDe(ligneValidation(page, 'Alice 4B'), REJETER).click();
  await page.getByRole('dialog').getByLabel('Commentaire').fill('Écart');
  await boutonDe(page.getByRole('dialog'), 'Rejeter').click();
  await expect(alerte(page, 'Données invalides.')).toBeVisible();
  await expect(statutOk(page, 'Feuille rejetée.')).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual({ statut: 'soumise', commentaire: null, validations: [] });
});

test('E2E-316-r1 : valider, 500 : « Une erreur est survenue. », base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  await intercepter(page, 'valider', 500);
  await boutonDe(ligneValidation(page, 'Alice 4B'), VALIDER).click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(alerte(page, 'Une erreur est survenue.')).toBeVisible();
  await expect(statutOk(page, 'Feuille validée.')).toHaveCount(0);
  expect(await etatFeuille(id)).toEqual({ statut: 'soumise', commentaire: null, validations: [] });
});

// --- Parcours complets, tout à l'écran, base « administrateur seul » (D-135 (9)) ---

const CHEF = 'Chef 4C';
const RESSOURCE = 'Ressource 4C';
const EMAIL_CHEF = 'chef-4c@lot4c.test';
const EMAIL_RES = 'ressource-4c@lot4c.test';
const ACTIVITE = '1 Tâche 4C';
const LUN = 'lun. 12/01';

/** L'administrateur crée tout à l'écran ; la ressource saisit, enregistre et soumet. Finit déconnecté. */
async function parcoursJusquaSoumission(page: Page): Promise<void> {
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 4C');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 4C/ })).toBeVisible();
  await creerRessourceParEcran(page, RESSOURCE, EMAIL_RES, 'Cal 4C');

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const utilisateur = page.getByRole('dialog');
  await utilisateur.getByLabel('Nom').fill(CHEF);
  await utilisateur.getByLabel('Email').fill(EMAIL_CHEF);
  await utilisateur.getByLabel('Mot de passe', { exact: true }).fill('mot-de-passe-e2e-lot1');
  await utilisateur.getByLabel('Rôle').selectOption({ label: 'Chef de projet' });
  await utilisateur.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(CHEF) })).toBeVisible();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('4C');
  await projet.getByLabel('Nom').fill('Projet 4C');
  await projet.getByLabel('Chef de projet').selectOption({ label: CHEF });
  await projet.getByLabel('Pas avant le').fill('2026-01-05');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet 4C/ })).toBeVisible();
  await page.getByRole('link', { name: 'Projet 4C' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 4C', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page.getByRole('dialog').getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 4C');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 4C/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 4C' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await assignation.getByLabel('Charge assignée (j)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Tâche 4C.*${RESSOURCE}`) })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await connecterAvec(page, EMAIL_RES);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  await caseCharge(page, ACTIVITE, LUN).fill('0,5');
  await bouton(page, 'Enregistrer').click();
  await expect(statutOk(page, 'Feuille enregistrée.')).toBeVisible();
  await bouton(page, 'Soumettre').click();
  await expect(statutFeuille(page)).toHaveText('Soumise');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');
}

test('E2E-317-r2 : parcours complet à l’écran : saisie, soumission, validation par le chef, lecture seule chez la ressource', async ({
  page,
}) => {
  await parcoursJusquaSoumission(page);
  await connecterAvec(page, EMAIL_CHEF);
  await ouvrirValidationParMenu(page);
  await expect(page).toHaveURL(adresseValidation(S));
  const ligne = ligneValidation(page, RESSOURCE);
  await expect(ligne.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(ligne.getByText('4C · À valider', { exact: true })).toBeVisible();
  await boutonDe(ligne, `Valider la feuille de ${RESSOURCE}`).click();
  await expect(page.getByRole('dialog')).toContainText(
    `Valider la feuille de ${RESSOURCE} pour 4C ?`,
  );
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(ligne.getByText('Validée', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await connecterAvec(page, EMAIL_RES);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(statutFeuille(page)).toHaveText('Validée');
  await expect(caseCharge(page, ACTIVITE, LUN)).toBeDisabled();
  await expect(caseCharge(page, ACTIVITE, LUN)).toHaveValue('0,5');
  await expect(bouton(page, 'Enregistrer')).toHaveCount(0);
  await expect(bouton(page, 'Soumettre')).toHaveCount(0);
});

test('E2E-318-r2 : parcours complet à l’écran avec rejet : commentaire visible, saisie de nouveau possible', async ({
  page,
}) => {
  await parcoursJusquaSoumission(page);
  await connecterAvec(page, EMAIL_CHEF);
  await ouvrirValidationParMenu(page);
  const ligne = ligneValidation(page, RESSOURCE);
  await boutonDe(ligne, `Rejeter la feuille de ${RESSOURCE}`).click();
  await page.getByRole('dialog').getByLabel('Commentaire').fill('Imputation du lundi à revoir');
  await boutonDe(page.getByRole('dialog'), 'Rejeter').click();
  await expect(statutOk(page, 'Feuille rejetée.')).toBeVisible();
  await expect(ligne.getByText('Rejetée', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await connecterAvec(page, EMAIL_RES);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(statutFeuille(page)).toHaveText('Rejetée');
  await expect(alerte(page, 'Feuille rejetée : Imputation du lundi à revoir')).toBeVisible();
  const c = caseCharge(page, ACTIVITE, LUN);
  await expect(c).toBeEnabled();
  await c.fill('0,75');
  await bouton(page, 'Enregistrer').click();
  await expect(statutOk(page, 'Feuille enregistrée.')).toBeVisible();
  await expect(c).toHaveValue('0,75');
});
