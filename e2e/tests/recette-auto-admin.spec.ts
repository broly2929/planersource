// Lot recette-auto (D-204), compte admin : lignes 1, 23, 30, 31, 34, 42, 43, 45, 56 de docs/recette.md.
// E2E-468 à E2E-476. Valeurs attendues recopiées de la colonne Attendu ; données créées par l'API.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { preparer } from './lot1-helpers.js';
import { activiteAvec, calculer } from './lot3b-helpers.js';
import { ouvrirCalendriers } from './lot3c-helpers.js';
import { EMAIL_ALICE, H14, S, SP, agirApi, sessionDe } from './lot4b-helpers.js';
import {
  EMAIL_BOB,
  EMAIL_CHEF_Q,
  boutonDe,
  ligneValidation,
  ouvrirValidation,
  soumettreAlice,
  tableauValidation,
  imputerEtSoumettre,
  VIDE_SEMAINE,
} from './lot4c-helpers.js';
import { equipeApi, nav, utilisateurApi } from './lot6a-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';
import { JOUR_SP, calendrierPropre, monde4c, soumettreSemaine } from './recette-auto-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

const tableauPlan = (page: Page) => page.getByRole('table', { name: 'Plan de charge' });
const lignesPlan = (page: Page) => tableauPlan(page).locator('tbody tr');
const titreDe = (cellule: Locator): Promise<string | null> =>
  cellule.evaluate((el) => {
    for (const e of [el, ...Array.from(el.querySelectorAll('[title]'))]) {
      const t = e.getAttribute('title');
      if (t) return t;
    }
    return null;
  });

test('E2E-468 : ligne 1 : menu de l’administrateur non ressource, liste complète', async ({
  page,
}) => {
  await loginAsAdmin(page);
  const noms = (await nav(page).getByRole('link').allTextContents()).map((t) => t.trim());
  expect(noms).toEqual([
    'Accueil',
    'Projets',
    'Plan de charge',
    'Imputations',
    'Validation',
    'Modèles',
    'Utilisateurs',
  ]);
  for (const absent of ['Équipes', 'Calendriers', 'Mes tâches']) expect(noms).not.toContain(absent);
});

test('E2E-469 : ligne 23 : onglet Calendriers, « Calendrier par défaut » avec 0 jour férié, lien vers le détail', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  const tableau = page.getByRole('table', { name: 'Liste des calendriers' });
  const ligne = tableau.locator('tbody tr').filter({ hasText: 'Calendrier par défaut' });
  await expect(ligne).toHaveCount(1);
  await expect(ligne.locator('td').last()).toHaveText('0');
  const lien = ligne.getByRole('link', { name: 'Calendrier par défaut' });
  await expect(lien).toHaveAttribute('href', /^\/calendriers\/\d+$/);
  await lien.click();
  await expect(page).toHaveURL(/\/calendriers\/\d+$/);
});

test('E2E-470 : ligne 30 : « Plan de charge » après « Projets », 12 colonnes MM/AAAA depuis le mois courant, ressources repliées', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Alice', 'alice-470@recette.test', 'ressource', true);
  await api.utilisateur('Bob', 'bob-470@recette.test', 'ressource', true);
  await api.utilisateur('Chef B', 'chefb-470@recette.test', 'chef_de_projet', true);
  await loginAsAdmin(page);
  const noms = (await nav(page).getByRole('link').allTextContents()).map((t) => t.trim());
  expect(noms.indexOf('Plan de charge')).toBe(noms.indexOf('Projets') + 1);
  await nav(page).getByRole('link', { name: 'Plan de charge', exact: true }).click();
  await expect(tableauPlan(page)).toBeVisible();
  const entetes = (await tableauPlan(page).getByRole('columnheader').allTextContents()).map((t) =>
    t.trim(),
  );
  expect(entetes).toEqual([
    'Ressource',
    ...['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(
      (m) => `${m}/2026`,
    ),
  ]);
  await expect(lignesPlan(page)).toHaveCount(3);
  for (const nom of ['Alice', 'Bob', 'Chef B']) {
    await expect(page.getByRole('button', { name: `Déplier ${nom}` })).toBeVisible();
  }
});

test('E2E-471 : ligne 31 : title de la cellule du mois, « Charge 10 j, disponible 21 j, écart 11 j »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 471', 'chef-471@recette.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice', 'alice-471@recette.test', 'ressource', true);
  await calendrierPropre(request, api, alice.id, 'Cal 471');
  const p = await api.projet('R471', 'Projet 471', chef.id);
  await api.affectation(p.id, alice.id);
  const a = await activiteAvec(request, p.id, 'Tâche 471');
  await api.assignation(a.id, alice.id, 10);
  await calculer(request, [p.id]);
  await loginAsAdmin(page);
  await page.goto('/plan-de-charge?debut=2027-01');
  const cellule = lignesPlan(page).filter({ hasText: 'Alice' }).locator('th, td').nth(1);
  await expect(cellule).toContainText('10');
  expect(await titreDe(cellule)).toBe('Charge 10 j, disponible 21 j, écart 11 j');
});

test('E2E-472 : ligne 34 : liste « Équipe » sur « Sans équipe » sans ressource sans équipe, « Aucune ressource. »', async ({
  page,
  request,
}) => {
  await preparer(request);
  const equipe = await equipeApi(request, 'Équipe 472');
  await utilisateurApi(request, 'Alice', 'alice-472@recette.test', equipe);
  await loginAsAdmin(page);
  await page.goto('/plan-de-charge?debut=2027-01');
  await expect(lignesPlan(page)).toHaveCount(1);
  await page.getByLabel('Équipe', { exact: true }).selectOption({ label: 'Sans équipe' });
  await expect(page.getByText('Aucune ressource.')).toBeVisible();
  await expect(tableauPlan(page)).toHaveCount(0);
});

/** Monde de validation : P4B (chef P), Q4B (chef Q), Alice sur P4B et Q4B, Bob sur P4B. */
async function mondeValidation(request: Parameters<typeof monde4c>[0]) {
  const m = await monde4c(request);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  return { m, bob };
}

test('E2E-473 : ligne 42 : administrateur, semaine courante, Alice « Soumise » (P · À valider, Q · Validé), Bob « Soumise » (P · À valider)', async ({
  page,
  request,
  playwright,
}) => {
  const { m, bob } = await mondeValidation(request);
  const { id } = await soumettreAlice(playwright, m);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_Q), id, 'valider');
  await imputerEtSoumettre(playwright, bob.email, bob.assignation);
  await loginAsAdmin(page);
  await ouvrirValidation(page, S);
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B · À valider', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · Validé', { exact: true })).toBeVisible();
  const ligneBob = ligneValidation(page, 'Bob 4B');
  await expect(ligneBob.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(ligneBob.getByText('P4B · À valider', { exact: true })).toBeVisible();
});

test('E2E-474 : ligne 43 : administrateur, semaine précédente, Bob « Validée » (P · Validé), Alice « Rejetée » (P et Q sans suffixe)', async ({
  page,
  request,
  playwright,
}) => {
  const { m, bob } = await mondeValidation(request);
  const idBob = await soumettreSemaine(playwright, bob.email, SP, bob.assignation, JOUR_SP);
  const idAlice = await soumettreSemaine(playwright, EMAIL_ALICE, SP, [m.sa.id, m.sb.id], JOUR_SP);
  await agirApi(request, idBob, 'valider');
  await agirApi(request, idAlice, 'rejeter', { commentaire: 'Imputations du jeudi à revoir' });
  await loginAsAdmin(page);
  await ouvrirValidation(page, SP);
  const ligneBob = ligneValidation(page, 'Bob 4B');
  await expect(ligneBob.getByText('Validée', { exact: true })).toBeVisible();
  await expect(ligneBob.getByText('P4B · Validé', { exact: true })).toBeVisible();
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Rejetée', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B', { exact: true })).toBeVisible();
  await expect(alice.getByText(/ · /)).toHaveCount(0);
});

test('E2E-475 : ligne 45 : administrateur, « Voir la feuille de Alice » rejetée, dialogue en lecture seule avec le commentaire de rejet', async ({
  page,
  request,
  playwright,
}) => {
  const { m } = await mondeValidation(request);
  const idAlice = await soumettreSemaine(playwright, EMAIL_ALICE, SP, [m.sa.id, m.sb.id], JOUR_SP);
  await agirApi(request, idAlice, 'rejeter', { commentaire: 'Imputations du jeudi à revoir' });
  await loginAsAdmin(page);
  await ouvrirValidation(page, SP);
  await boutonDe(ligneValidation(page, 'Alice 4B'), 'Voir la feuille de Alice 4B').click();
  const dialogue = page.getByRole('dialog');
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toContainText('Imputations du jeudi à revoir');
  const champs = dialogue.getByRole('textbox');
  for (let i = 0; i < (await champs.count()); i++) await expect(champs.nth(i)).toBeDisabled();
  await expect(dialogue.getByRole('button', { name: 'Enregistrer', exact: true })).toHaveCount(0);
});

test('E2E-476 : ligne 56 : administrateur, semaine sans feuille, « Aucune feuille de temps pour cette semaine. »', async ({
  page,
  request,
}) => {
  await mondeValidation(request);
  await loginAsAdmin(page);
  await ouvrirValidation(page, '2025-12-29');
  await expect(page.getByText(VIDE_SEMAINE, { exact: true })).toBeVisible();
  await expect(tableauValidation(page)).toHaveCount(0);
});
