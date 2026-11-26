// Lot recette-auto (D-204), compte admin (retour) : lignes 170, 173, 174, 176 de docs/recette.md.
// E2E-508 à E2E-511. Valeurs attendues recopiées de la colonne Attendu ; données créées par l'API.
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, preparer } from './lot1-helpers.js';
import { allerA } from './lot3c-helpers.js';
import { H14, S, monde4b, remettreAdminSeul4b } from './lot4b-helpers.js';
import { adresseAutrui, listeRessource, mondeAutrui } from './autrui-e-helpers.js';
import {
  confirmation,
  declencher,
  dialogueNomme,
  fermerEnAbandonnant,
  type Declencheur,
} from './garde-dialogue-helpers.js';
import { saisirParGeste } from './stabilite-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

test('E2E-508 : ligne 170 : /imputations rechargée : liste « Ressource » présente dès l’affichage (désactivée, « Chargement… »), en-tête immobile au remplissage ; « Choisir… » grisée, non sélectionnable, en tête', async ({
  page,
  request,
}) => {
  await mondeAutrui(request);
  await loginAsAdmin(page);
  let liberer: () => void = () => undefined;
  const porte = new Promise<void>((resolve) => (liberer = resolve));
  await page.route('**/api/annuaire', async (route) => {
    await porte;
    await route.continue();
  });
  await page.goto(adresseAutrui(S));
  const entete = page.locator('main > header');
  await expect(listeRessource(page)).toBeVisible();
  await expect(listeRessource(page)).toBeDisabled();
  const options = listeRessource(page).locator('option');
  await expect(options).toHaveCount(1);
  await expect(options.first()).toHaveText('Chargement…');
  const avant = await entete.boundingBox();
  liberer();
  await expect(listeRessource(page)).toBeEnabled();
  const apres = await entete.boundingBox();
  expect(apres?.y, 'position de l’en-tête').toBe(avant?.y);
  expect(apres?.height, 'hauteur de l’en-tête').toBe(avant?.height);
  const premiere = options.first();
  await expect(premiere).toHaveText('Choisir…');
  await expect(premiere).toBeDisabled();
  expect(await options.count()).toBeGreaterThan(1);
  await expect(listeRessource(page)).toHaveValue('');
});

async function ouvrirNouvelUtilisateur(page: Page) {
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialogue = dialogueNomme(page, 'Nouvel utilisateur');
  await expect(dialogue).toBeVisible();
  return dialogue;
}

test('E2E-509 : ligne 173 : « Nouvel utilisateur » fermé sans saisie (Échap, croix, clic hors du dialogue, « Annuler »), puis saisie effacée : aucune confirmation', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  for (const d of ['echap', 'croix', 'dehors', 'annuler'] as Declencheur[]) {
    const dialogue = await ouvrirNouvelUtilisateur(page);
    await declencher(page, dialogue, d);
    await expect(dialogue, d).toHaveCount(0);
    await expect(confirmation(page), d).toHaveCount(0);
  }
  const dialogue = await ouvrirNouvelUtilisateur(page);
  const nom = dialogue.getByLabel('Nom');
  await saisirParGeste(nom, 'Nom saisi');
  await expect(nom).toHaveValue('Nom saisi');
  await nom.fill('');
  await page.keyboard.press('Escape');
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);
});

test('E2E-510-r1 : ligne 174 : « Nouvel utilisateur » : identifiant déjà utilisé, « Créer » (refus), puis « Annuler » : confirmation ; « Abandonner » ferme sans création', async ({
  page,
  request,
}) => {
  await preparer(request);
  const r = await request.post('/api/utilisateurs', {
    data: {
      nom: 'Bob',
      login: 'bob',
      mot_de_passe: MOT_DE_PASSE,
      role: 'ressource',
      est_ressource: true,
    },
  });
  expect(r.ok(), `POST bob : ${r.status()}`).toBeTruthy();
  const avant = ((await (await request.get('/api/utilisateurs')).json()) as unknown[]).length;
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  const dialogue = await ouvrirNouvelUtilisateur(page);
  await dialogue.getByLabel('Nom').fill('Autre Bob');
  await dialogue.getByLabel('Identifiant').fill('bob');
  await dialogue.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  await dialogue.getByRole('button', { name: 'Créer' }).click();
  await expect(dialogue.getByText('Cet identifiant est déjà utilisé.')).toBeVisible();
  await fermerEnAbandonnant(page, dialogue, 'annuler');
  const apres = ((await (await request.get('/api/utilisateurs')).json()) as unknown[]).length;
  expect(apres).toBe(avant);
});

test('E2E-511 : ligne 176 : « Modifier le projet » ouvert puis fermé sans toucher : aucune confirmation ; nom changé puis fermé : confirmation', async ({
  page,
  request,
}) => {
  const m = await monde4b(request);
  await loginAsAdmin(page);
  await page.goto(`/projets/${m.p.id}`);
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  const dialogue = dialogueNomme(page, 'Modifier le projet');
  await expect(dialogue.getByLabel('Code')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogue).toHaveCount(0);
  await expect(confirmation(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  await expect(dialogue.getByLabel('Code')).toBeVisible();
  await saisirParGeste(dialogue.getByLabel('Nom'), 'Projet P4B modifié');
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
});
