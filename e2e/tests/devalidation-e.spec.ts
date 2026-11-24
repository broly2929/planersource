// DEV-E (D-176, SPEC §7 « Dévalidation » points 2 et 3) : bouton « Dévalider » de l'écran Validation.
// E2E-409 à E2E-415. Base « administrateur seul » remise à zéro avant et après chaque test, horloge du
// navigateur figée au mercredi 14/01/2026. Données préparées par l'API (monde4c) ; les actions testées se
// font à l'écran. Refus et annulations vérifiés par relecture SQL. Contrat des sélecteurs : en-tête de
// devalidation-e-helpers.ts et de lot4c-helpers.ts.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import {
  EMAIL_ALICE,
  EMAIL_CHEF_P,
  S,
  adresseFeuille,
  agirApi,
  bouton,
  caseCharge,
  remettreAdminSeul4b,
  H14,
  sessionDe,
  statutFeuille,
} from './lot4b-helpers.js';
import {
  EMAIL_BOB,
  EMAIL_CARLA,
  EMAIL_CHEF_Q,
  EMAIL_DINA,
  attendreAlerteAuDessus,
  boutonDe,
  compter,
  etatFeuille,
  imputerEtSoumettre,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
  statutOk,
} from './lot4c-helpers.js';
import {
  DEVALIDER,
  REFUS_RIEN,
  REFUS_STATUT,
  TEXTE_CONFIRMATION,
  devaliderApi,
  nomsDesActions,
  ouvrirConfirmationDevalider,
} from './devalidation-e-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul4b);

const VOIR = 'Voir la feuille de Alice 4B';
const VALIDER = 'Valider la feuille de Alice 4B';
const REJETER = 'Rejeter la feuille de Alice 4B';
const LUN = 'lun. 12/01';

const deconnecter = async (page: Page) => {
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');
};

test('E2E-409 : ordre des actions Voir, Valider, Rejeter, Dévalider (administrateur)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  const carla = await m.ressourceSurP('Carla 4B', EMAIL_CARLA, 'Tâche D');
  const idCarla = await imputerEtSoumettre(playwright, carla.email, carla.assignation);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_P), id, 'valider'); // Alice : P validé, Q à valider
  await loginAsAdmin(page);
  await agirApi(page.request, idCarla, 'valider'); // Carla : validée
  await ouvrirValidation(page);

  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B · Validé', { exact: true })).toBeVisible();
  expect(await nomsDesActions(alice)).toEqual([VOIR, VALIDER, REJETER, DEVALIDER]);

  const ligneCarla = ligneValidation(page, 'Carla 4B');
  await expect(ligneCarla.getByText('Validée', { exact: true })).toBeVisible();
  expect(await nomsDesActions(ligneCarla)).toEqual([
    'Voir la feuille de Carla 4B',
    'Dévalider la feuille de Carla 4B',
  ]);
});

test('E2E-410 : pas de « Dévalider » : soumise sans validation, brouillon, rejetée ; projets validés non autorisés', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  const dina = await m.ressourceSurP('Dina 4B', EMAIL_DINA, 'Tâche E');
  await imputerEtSoumettre(playwright, bob.email, bob.assignation, { soumettre: false });
  const idDina = await imputerEtSoumettre(playwright, dina.email, dina.assignation);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_P), idDina, 'rejeter', {
    commentaire: 'À revoir',
  });
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  for (const nom of ['Alice 4B', 'Bob 4B', 'Dina 4B']) {
    const l = ligneValidation(page, nom);
    await expect(boutonDe(l, `Voir la feuille de ${nom}`), nom).toBeVisible();
    await expect(boutonDe(l, `Dévalider la feuille de ${nom}`), nom).toHaveCount(0);
  }
  await deconnecter(page);

  // Seul Q est validé (par son chef) : le chef de P ne peut rien dévalider.
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_Q), id, 'valider');
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Q4B · Validé', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, VALIDER)).toBeVisible();
  await expect(boutonDe(alice, DEVALIDER)).toHaveCount(0);
  await deconnecter(page);

  // Contrôle : le chef de Q, qui a validé Q, peut dévalider.
  await connecterAvec(page, EMAIL_CHEF_Q);
  await ouvrirValidation(page);
  await expect(boutonDe(ligneValidation(page, 'Alice 4B'), DEVALIDER)).toBeVisible();
});

test('E2E-411 : confirmation de « Dévalider » : titre, texte, bouton ; « Annuler » n’écrit rien', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await loginAsAdmin(page);
  await agirApi(page.request, id, 'valider');
  const avant = await etatFeuille(id);
  expect(avant.statut).toBe('validee');
  await ouvrirValidation(page);
  const n = compter(page);

  const alice = ligneValidation(page, 'Alice 4B');
  const dialogue = await ouvrirConfirmationDevalider(
    page,
    alice,
    DEVALIDER,
    'Dévalider la feuille de Alice 4B pour P4B, Q4B ?',
  );
  await expect(dialogue.getByText(TEXTE_CONFIRMATION, { exact: true })).toBeVisible();
  await expect(boutonDe(dialogue, 'Dévalider')).toBeVisible();
  await boutonDe(dialogue, 'Annuler').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(n.ecritures).toBe(0);
  expect(await etatFeuille(id)).toEqual(avant);
  await expect(alice.getByText('Validée', { exact: true })).toBeVisible();
});

test('E2E-412 : « Dévalider » (chef de P) : « Feuille dévalidée. », liste relue, validation de Q conservée, focus sur « Voir »', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_Q), id, 'valider');
  await connecterAvec(page, EMAIL_CHEF_P);
  await agirApi(page.request, id, 'valider');
  expect((await etatFeuille(id)).statut).toBe('validee');
  await ouvrirValidation(page);
  const n = compter(page);
  const alice = ligneValidation(page, 'Alice 4B');

  const dialogue = await ouvrirConfirmationDevalider(
    page,
    alice,
    DEVALIDER,
    'Dévalider la feuille de Alice 4B pour P4B ?',
  );
  const lecturesAvant = n.lectures;
  await boutonDe(dialogue, 'Dévalider').click();
  await expect(statutOk(page, 'Feuille dévalidée.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(alice.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B · À valider', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · Validé', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, DEVALIDER)).toHaveCount(0);
  await expect(boutonDe(alice, VOIR)).toBeFocused();
  const etat = await etatFeuille(id);
  expect(etat.statut).toBe('soumise');
  expect(etat.validations).toEqual([{ projet: 'Q4B', validateur: 'Chef Q 4B' }]);
});

test('E2E-413 : refus rien_a_devalider (dévalidation faite entre-temps) : dialogue fermé, alerte au-dessus du tableau, liste relue, effacée à l’action suivante', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  const chefP = await sessionDe(playwright, EMAIL_CHEF_P);
  await agirApi(chefP, id, 'valider');
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const n = compter(page);
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('P4B · Validé', { exact: true })).toBeVisible();
  const dialogue = await ouvrirConfirmationDevalider(
    page,
    alice,
    DEVALIDER,
    'Dévalider la feuille de Alice 4B pour P4B ?',
  );

  await devaliderApi(chefP, id); // entre-temps
  const lecturesAvant = n.lectures;
  await boutonDe(dialogue, 'Dévalider').click();
  await attendreAlerteAuDessus(page, REFUS_RIEN);
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(statutOk(page, 'Feuille dévalidée.')).toHaveCount(0);
  await expect(alice.getByText('P4B · À valider', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, DEVALIDER)).toHaveCount(0);
  await expect(boutonDe(alice, VOIR)).toBeFocused();
  expect(await etatFeuille(id)).toEqual({ statut: 'soumise', commentaire: null, validations: [] });

  // Effacée à l'action suivante.
  await boutonDe(alice, VOIR).click();
  await expect(page.getByRole('alert').filter({ hasText: REFUS_RIEN })).toHaveCount(0);
});

test('E2E-414 : refus statut_invalide (feuille rejetée entre-temps) : dialogue fermé, alerte au-dessus du tableau, liste relue, base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  const chefP = await sessionDe(playwright, EMAIL_CHEF_P);
  await agirApi(chefP, id, 'valider');
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const n = compter(page);
  const alice = ligneValidation(page, 'Alice 4B');
  const dialogue = await ouvrirConfirmationDevalider(
    page,
    alice,
    DEVALIDER,
    'Dévalider la feuille de Alice 4B pour P4B ?',
  );

  await agirApi(chefP, id, 'rejeter', { commentaire: 'Écart' }); // entre-temps
  const lecturesAvant = n.lectures;
  await boutonDe(dialogue, 'Dévalider').click();
  await attendreAlerteAuDessus(page, REFUS_STATUT);
  await expect.poll(() => n.lectures).toBeGreaterThan(lecturesAvant);
  await expect(statutOk(page, 'Feuille dévalidée.')).toHaveCount(0);
  await expect(alice.getByText('Rejetée', { exact: true })).toBeVisible();
  await expect(boutonDe(alice, VOIR)).toBeFocused();
  expect(await etatFeuille(id)).toEqual({
    statut: 'rejetee',
    commentaire: 'Écart',
    validations: [],
  });
});

test('E2E-415 : parcours IHM : deux chefs valident, le premier dévalide, le second garde sa validation ; la ressource rappelle, corrige, soumet de nouveau', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  const { id } = await soumettreAlice(playwright, m);
  const validerParChef = async (email: string, codes: string) => {
    await connecterAvec(page, email);
    await ouvrirValidation(page);
    const l = ligneValidation(page, 'Alice 4B');
    await boutonDe(l, VALIDER).click();
    await expect(
      page.getByRole('dialog', { name: `Valider la feuille de Alice 4B pour ${codes} ?` }),
    ).toBeVisible();
    await boutonDe(page.getByRole('dialog'), 'Valider').click();
    await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
    await deconnecter(page);
  };
  await validerParChef(EMAIL_CHEF_P, 'P4B');
  await validerParChef(EMAIL_CHEF_Q, 'Q4B');
  expect((await etatFeuille(id)).statut).toBe('validee');

  // Le chef de P dévalide ; le chef de Q garde sa validation.
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page);
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Validée', { exact: true })).toBeVisible();
  await boutonDe(alice, DEVALIDER).click();
  await boutonDe(page.getByRole('dialog'), 'Dévalider').click();
  await expect(statutOk(page, 'Feuille dévalidée.')).toBeVisible();
  await expect(alice.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B · À valider', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · Validé', { exact: true })).toBeVisible();
  await deconnecter(page);

  await connecterAvec(page, EMAIL_CHEF_Q);
  await ouvrirValidation(page);
  const aliceQ = ligneValidation(page, 'Alice 4B');
  await expect(aliceQ.getByText('Q4B · Validé', { exact: true })).toBeVisible();
  await expect(aliceQ.getByText('P4B · Non autorisé', { exact: true })).toBeVisible();
  await expect(boutonDe(aliceQ, DEVALIDER)).toBeVisible();
  await deconnecter(page);

  // La ressource voit « Soumise ».
  await connecterAvec(page, EMAIL_ALICE);
  await page.goto(adresseFeuille(S));
  await expect(statutFeuille(page)).toHaveText('Soumise');
  await deconnecter(page);

  // Le chef de Q dévalide à son tour.
  await connecterAvec(page, EMAIL_CHEF_Q);
  await ouvrirValidation(page);
  const aliceQ2 = ligneValidation(page, 'Alice 4B');
  await boutonDe(aliceQ2, DEVALIDER).click();
  await boutonDe(page.getByRole('dialog'), 'Dévalider').click();
  await expect(statutOk(page, 'Feuille dévalidée.')).toBeVisible();
  await expect(aliceQ2.getByText('Q4B · À valider', { exact: true })).toBeVisible();
  await deconnecter(page);
  expect(await etatFeuille(id)).toEqual({ statut: 'soumise', commentaire: null, validations: [] });

  // La ressource rappelle, corrige, enregistre et soumet de nouveau.
  await connecterAvec(page, EMAIL_ALICE);
  await page.goto(adresseFeuille(S));
  await bouton(page, 'Rappeler').click();
  await expect(statutFeuille(page)).toHaveText('Brouillon');
  const c = caseCharge(page, '1 Tâche A', LUN);
  await expect(c).toBeEnabled();
  await c.fill('1');
  await bouton(page, 'Enregistrer').click();
  await expect(statutOk(page, 'Feuille enregistrée.')).toBeVisible();
  await bouton(page, 'Soumettre').click();
  await expect(statutFeuille(page)).toHaveText('Soumise');
  expect((await etatFeuille(id)).statut).toBe('soumise');
});
