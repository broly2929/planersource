// Lot recette-auto (D-204), compte chefb : lignes 97, 103, 104, 107 de docs/recette.md. E2E-493 à E2E-496.
// Valeurs attendues recopiées de la colonne Attendu ; données créées par l'API.
import { expect, test } from '@playwright/test';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { EMAIL_ALICE, EMAIL_CHEF_P, H14, S, SP, agirApi, sessionDe } from './lot4b-helpers.js';
import {
  EMAIL_BOB,
  EMAIL_CHEF_Q,
  ligneValidation,
  ouvrirValidation,
  soumettreAlice,
  imputerEtSoumettre,
  tableauValidation,
} from './lot4c-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';
import { JOUR_SP, monde4c, soumettreSemaine } from './recette-auto-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

test('E2E-493-r2 : ligne 97 : menu du chef de projet ressource, liste complète ; arrivée sur « / »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef B', 'chefb-493@recette.test', 'chef_de_projet', true);
  await connecterAvec(page, 'chefb-493@recette.test');
  await expect(page).toHaveURL('/');
  const liste = (await nav(page).getByRole('link').allTextContents()).map((t) => t.trim());
  expect(liste).toEqual(['Mes tâches', 'Accueil', 'Projets', 'Pilotage', 'Imputations']);
});

async function mondeValidation(request: Parameters<typeof monde4c>[0]) {
  const m = await monde4c(request);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  return { m, bob };
}

test('E2E-494 : ligne 103 : chef de Q, semaine courante, seule Alice « Soumise » (P · Non autorisé, Q · Validé), Bob absent', async ({
  page,
  request,
  playwright,
}) => {
  const { m, bob } = await mondeValidation(request);
  const { id } = await soumettreAlice(playwright, m);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_Q), id, 'valider');
  await imputerEtSoumettre(playwright, bob.email, bob.assignation);
  await connecterAvec(page, EMAIL_CHEF_Q);
  await ouvrirValidation(page, S);
  await expect(tableauValidation(page).locator('tbody tr')).toHaveCount(1);
  const alice = ligneValidation(page, 'Alice 4B');
  await expect(alice.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(alice.getByText('P4B · Non autorisé', { exact: true })).toBeVisible();
  await expect(alice.getByText('Q4B · Validé', { exact: true })).toBeVisible();
  await expect(ligneValidation(page, 'Bob 4B')).toHaveCount(0);
});

test('E2E-495 : ligne 104 : chef de Q, semaine précédente, seule Alice « Rejetée », Bob absent', async ({
  page,
  request,
  playwright,
}) => {
  const { m, bob } = await mondeValidation(request);
  const idBob = await soumettreSemaine(playwright, bob.email, SP, bob.assignation, JOUR_SP);
  const idAlice = await soumettreSemaine(playwright, EMAIL_ALICE, SP, [m.sa.id, m.sb.id], JOUR_SP);
  const chefP = await sessionDe(playwright, EMAIL_CHEF_P);
  await agirApi(chefP, idBob, 'valider');
  await agirApi(chefP, idAlice, 'rejeter', { commentaire: 'Imputations du jeudi à revoir' });
  await connecterAvec(page, EMAIL_CHEF_Q);
  await ouvrirValidation(page, SP);
  await expect(tableauValidation(page).locator('tbody tr')).toHaveCount(1);
  await expect(
    ligneValidation(page, 'Alice 4B').getByText('Rejetée', { exact: true }),
  ).toBeVisible();
  await expect(ligneValidation(page, 'Bob 4B')).toHaveCount(0);
});

test('E2E-496 : ligne 107 : chef ressource sans assignation, /imputations : « Aucune activité à imputer cette semaine. »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef B', 'chefb-496@recette.test', 'chef_de_projet', true);
  await connecterAvec(page, 'chefb-496@recette.test');
  await page.goto('/imputations');
  await expect(page.getByText('Aucune activité à imputer cette semaine.')).toBeVisible();
});
