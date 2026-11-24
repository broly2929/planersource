// Lot recette-auto (D-204), compte chefa (retour) : lignes 156 à 160 de docs/recette.md. E2E-503 à E2E-507.
// Valeurs attendues recopiées de la colonne Attendu ; données créées par l'API ; chef de P, Bob « Validée ».
import { expect, test } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { EMAIL_CHEF_P, H14, SP, agirApi, sessionDe } from './lot4b-helpers.js';
import {
  EMAIL_BOB,
  boutonDe,
  etatFeuille,
  ligneValidation,
  ouvrirValidation,
  statutOk,
} from './lot4c-helpers.js';
import { nomsDesActions, ouvrirConfirmationDevalider } from './devalidation-e-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';
import { JOUR_SP, monde4c, soumettreSemaine } from './recette-auto-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

const DEVALIDER = 'Dévalider la feuille de Bob 4B';
const VALIDER = 'Valider la feuille de Bob 4B';
const VOIR = 'Voir la feuille de Bob 4B';
const TITRE = 'Dévalider la feuille de Bob 4B pour P4B ?';

/** Bob (sur P4B) soumet la semaine précédente, le chef de P valide ; le chef de P est connecté sur l'écran. */
async function monde(
  page: Parameters<typeof connecterAvec>[0],
  request: Parameters<typeof monde4c>[0],
  playwright: Parameters<typeof sessionDe>[0],
): Promise<number> {
  const m = await monde4c(request);
  const bob = await m.ressourceSurP('Bob 4B', EMAIL_BOB, 'Tâche C');
  const id = await soumettreSemaine(playwright, bob.email, SP, bob.assignation, JOUR_SP);
  await agirApi(await sessionDe(playwright, EMAIL_CHEF_P), id, 'valider');
  await connecterAvec(page, EMAIL_CHEF_P);
  await ouvrirValidation(page, SP);
  return id;
}

test('E2E-503 : ligne 156 : ligne de Bob « Validée » : badge « P · Validé », « Voir » et « Dévalider », ni « Valider » ni « Rejeter »', async ({
  page,
  request,
  playwright,
}) => {
  await monde(page, request, playwright);
  const l = ligneValidation(page, 'Bob 4B');
  await expect(l.getByText('Validée', { exact: true })).toBeVisible();
  await expect(l.getByText('P4B · Validé', { exact: true })).toBeVisible();
  await expect(boutonDe(l, VOIR)).toBeVisible();
  await expect(boutonDe(l, DEVALIDER)).toBeVisible();
  expect(await nomsDesActions(l)).toEqual([VOIR, DEVALIDER]);
  await expect(boutonDe(l, VALIDER)).toHaveCount(0);
  await expect(boutonDe(l, 'Rejeter la feuille de Bob 4B')).toHaveCount(0);
});

test('E2E-504 : ligne 157 : « Dévalider » : dialogue au titre exact, texte « La feuille repassera au statut Soumise. », boutons « Annuler » et « Dévalider »', async ({
  page,
  request,
  playwright,
}) => {
  await monde(page, request, playwright);
  const dialogue = await ouvrirConfirmationDevalider(
    page,
    ligneValidation(page, 'Bob 4B'),
    DEVALIDER,
    TITRE,
  );
  await expect(dialogue).toContainText('La feuille repassera au statut Soumise.');
  await expect(boutonDe(dialogue, 'Annuler')).toBeVisible();
  await expect(boutonDe(dialogue, 'Dévalider')).toBeVisible();
});

test('E2E-505 : ligne 158 : confirmation ouverte, « Annuler » : dialogue fermé, statut de Bob toujours « Validée », base inchangée', async ({
  page,
  request,
  playwright,
}) => {
  const id = await monde(page, request, playwright);
  const avant = await etatFeuille(id);
  const l = ligneValidation(page, 'Bob 4B');
  const dialogue = await ouvrirConfirmationDevalider(page, l, DEVALIDER, TITRE);
  await boutonDe(dialogue, 'Annuler').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(l.getByText('Validée', { exact: true })).toBeVisible();
  expect(await etatFeuille(id)).toEqual(avant);
  expect(avant.statut).toBe('validee');
});

test('E2E-506 : ligne 159 : « Dévalider » puis « Dévalider » : « Feuille dévalidée. », statut « Soumise », badge « P · À valider », focus sur « Voir »', async ({
  page,
  request,
  playwright,
}) => {
  const id = await monde(page, request, playwright);
  const l = ligneValidation(page, 'Bob 4B');
  const dialogue = await ouvrirConfirmationDevalider(page, l, DEVALIDER, TITRE);
  await boutonDe(dialogue, 'Dévalider').click();
  await expect(statutOk(page, 'Feuille dévalidée.')).toBeVisible();
  await expect(l.getByText('Soumise', { exact: true })).toBeVisible();
  await expect(l.getByText('P4B · À valider', { exact: true })).toBeVisible();
  await expect(boutonDe(l, VOIR)).toBeFocused();
  expect((await etatFeuille(id)).statut).toBe('soumise');
});

test('E2E-507 : ligne 160 : revalider (« Valider la feuille de Bob », « Valider ») : « Feuille validée. », statut « Validée », badge « P · Validé »', async ({
  page,
  request,
  playwright,
}) => {
  const id = await monde(page, request, playwright);
  const l = ligneValidation(page, 'Bob 4B');
  const dialogue = await ouvrirConfirmationDevalider(page, l, DEVALIDER, TITRE);
  await boutonDe(dialogue, 'Dévalider').click();
  await expect(l.getByText('Soumise', { exact: true })).toBeVisible();
  await boutonDe(l, VALIDER).click();
  await boutonDe(page.getByRole('dialog'), 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(l.getByText('Validée', { exact: true })).toBeVisible();
  await expect(l.getByText('P4B · Validé', { exact: true })).toBeVisible();
  expect((await etatFeuille(id)).statut).toBe('validee');
});
