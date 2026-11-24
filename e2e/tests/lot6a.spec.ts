// Lot 6a (D-147, SPEC « Équipes (lot 6a, D-147) ») : écran Équipes et champ « Équipe » de l'écran Utilisateurs.
// E2E-335 à E2E-345. Base « administrateur seul » équipes comprises avant et après chaque test. Données
// préparées par l'API, sauf les tests « par l'écran ». Refus : relevé SQL des tables equipe et utilisateur
// identique avant et après.
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, connecterAvec, preparer } from './lot1-helpers.js';
import { allerA, NOM_ADMIN, ouvrirCalendriers } from './lot3c-helpers.js';
import {
  cellule,
  choix,
  creerEquipeParEcran,
  equipeApi,
  equipeDe,
  equipesEnBase,
  espionner,
  ligneEquipe,
  nav,
  options,
  ouvrirEquipes,
  releve6a,
  remettreAdminSeul6a,
  tableauEquipes,
  utilisateurApi,
} from './lot6a-helpers.js';
import { fermerEnAbandonnant } from './garde-dialogue-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6a();
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul6a);

const DOUBLON = 'Cette équipe existe déjà.';
const UTILISEE = "Cette équipe a des membres : retirez-les d'abord.";
const INCONNUE = "Cette équipe n'existe plus.";

test('E2E-335-r1 : plus d’entrée « Équipes » ni « Calendriers » pour l’administrateur ; onglet Équipes et tableau', async ({
  page,
}) => {
  await loginAsAdmin(page);
  // Révision -r1 (D-031, D-165 (3)) : plus d'entrées de menu ; onglet Équipes de l'écran Utilisateurs.
  for (const lien of ['Équipes', 'Calendriers']) {
    await expect(nav(page).getByRole('link', { name: lien, exact: true }), lien).toHaveCount(0);
  }
  await ouvrirEquipes(page);
  await expect(page).toHaveURL('/utilisateurs?onglet=equipes');
  await expect(page.getByRole('button', { name: 'Nouvelle équipe' })).toBeVisible();
  await creerEquipeParEcran(page, 'Atelier 6a');
  expect(
    (await tableauEquipes(page).getByRole('columnheader').allTextContents()).map((t) => t.trim()),
  ).toEqual(['Nom', 'Membres', 'Actions']);
});

test('E2E-336-r1 : entrées « Équipes » et « Calendriers » absentes pour le chef de projet et la ressource', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef 6a', 'chef-6a@lot6a.test', 'chef_de_projet');
  await api.utilisateur('Ressource 6a', 'ressource-6a@lot6a.test', 'ressource', true);
  await connecterAvec(page, 'chef-6a@lot6a.test');
  await expect(nav(page).getByRole('link', { name: 'Projets', exact: true })).toBeVisible();
  // Révision -r1 (D-031, D-165 (3)) : « Calendriers » aussi.
  await expect(nav(page).getByRole('link', { name: 'Équipes', exact: true })).toHaveCount(0);
  await expect(nav(page).getByRole('link', { name: 'Calendriers', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');
  await connecterAvec(page, 'ressource-6a@lot6a.test');
  await expect(nav(page).getByRole('link', { name: 'Imputations', exact: true })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Équipes', exact: true })).toHaveCount(0);
  await expect(nav(page).getByRole('link', { name: 'Calendriers', exact: true })).toHaveCount(0);
});

test('E2E-337-r1 : créer une équipe par l’écran, Membres 0, relue en base et après rechargement', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await creerEquipeParEcran(page, 'Atelier 6a');
  expect((await equipesEnBase()).map((e) => e.nom)).toEqual(['Atelier 6a']);
  await expect(await cellule(tableauEquipes(page), 'Atelier 6a', 'Membres')).toHaveText('0');
  await page.reload();
  await expect(ligneEquipe(page, 'Atelier 6a')).toBeVisible();
});

test('E2E-338-r1 : renommer une équipe par l’écran', async ({ page, request }) => {
  const id = await equipeApi(request, 'Atelier 6a');
  await utilisateurApi(request, 'Membre 338', 'membre-338@lot6a.test', id);
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Renommer Atelier 6a' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Nom')).toHaveValue('Atelier 6a');
  await dialog.getByLabel('Nom').fill('Bureau 6a');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(ligneEquipe(page, 'Bureau 6a')).toBeVisible();
  await expect(ligneEquipe(page, 'Atelier 6a')).toHaveCount(0);
  await expect(await cellule(tableauEquipes(page), 'Bureau 6a', 'Membres')).toHaveText('1');
  expect(await equipesEnBase()).toEqual([{ id, nom: 'Bureau 6a' }]);
});

test('E2E-339-r1 : supprimer une équipe par l’écran, avec confirmation', async ({
  page,
  request,
}) => {
  await equipeApi(request, 'Atelier 6a');
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Supprimer Atelier 6a' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Supprimer Atelier 6a ?');
  await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(ligneEquipe(page, 'Atelier 6a')).toHaveCount(0);
  expect(await equipesEnBase()).toEqual([]);
});

test('E2E-340-r2 : refus doublon à la création et au renommage, dialogue ouvert, base inchangée', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await creerEquipeParEcran(page, 'Atelier 6a');
  await creerEquipeParEcran(page, 'Bureau 6a');
  const avant = await releve6a();

  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill('atelier 6A');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(dialog.getByText(DOUBLON)).toBeVisible();
  expect(await releve6a()).toEqual(avant);
  await fermerEnAbandonnant(page, dialog);

  await page.getByRole('button', { name: 'Renommer Bureau 6a' }).click();
  await dialog.getByLabel('Nom').fill('ATELIER 6A');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByText(DOUBLON)).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(await releve6a()).toEqual(avant);
});

test('E2E-341-r1 : refus d’une équipe utilisée, confirmation ouverte, base inchangée ; réussite après retrait', async ({
  page,
  request,
}) => {
  const id = await equipeApi(request, 'Atelier 6a');
  const membre = await utilisateurApi(request, 'Membre 341', 'membre-341@lot6a.test', id);
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await expect(await cellule(tableauEquipes(page), 'Atelier 6a', 'Membres')).toHaveText('1');
  const avant = await releve6a();
  await page.getByRole('button', { name: 'Supprimer Atelier 6a' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(dialog.getByText(UTILISEE)).toBeVisible();
  await expect(dialog).toContainText('Supprimer Atelier 6a ?');
  expect(await releve6a()).toEqual(avant);
  await dialog.getByRole('button', { name: 'Annuler' }).click();

  const r = await request.patch(`/api/utilisateurs/${membre}`, { data: { equipe_id: null } });
  expect(r.ok()).toBeTruthy();
  await page.reload();
  await page.getByRole('button', { name: 'Supprimer Atelier 6a' }).click();
  await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await equipesEnBase()).toEqual([]);
});

test('E2E-342 : écran Utilisateurs, création : liste « Équipe », corps envoyé, colonne « Équipe »', async ({
  page,
  request,
}) => {
  await equipeApi(request, 'bravo');
  await equipeApi(request, 'Alpha');
  const bravo = (await equipesEnBase()).find((e) => e.nom === 'bravo')!.id;
  await equipeApi(request, 'Charlie');
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  const posts = await espionner(page, '**/api/utilisateurs', 'POST');

  const creer = async (nom: string, email: string, equipe?: string) => {
    await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nom').fill(nom);
    await dialog.getByLabel('Email').fill(email);
    await dialog.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
    const liste = dialog.getByLabel('Équipe', { exact: true });
    expect(await options(liste)).toEqual(['Aucune', 'Alpha', 'bravo', 'Charlie']);
    expect(await choix(liste)).toBe('Aucune');
    if (equipe) await liste.selectOption({ label: equipe });
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(dialog).toHaveCount(0);
  };

  await creer('Sans équipe 342', 'sans-342@lot6a.test');
  expect(posts).toHaveLength(1);
  expect(posts[0]).not.toHaveProperty('equipe_id');
  const tableau = page.getByRole('table', { name: 'Liste des utilisateurs' });
  await expect(await cellule(tableau, 'Sans équipe 342', 'Équipe')).toHaveText('—');
  expect(await equipeDe('Sans équipe 342')).toBeNull();

  await creer('Avec équipe 342', 'avec-342@lot6a.test', 'bravo');
  expect(posts).toHaveLength(2);
  expect(posts[1]).toMatchObject({ equipe_id: bravo });
  await expect(await cellule(tableau, 'Avec équipe 342', 'Équipe')).toHaveText('bravo');
  expect(await equipeDe('Avec équipe 342')).toBe(bravo);
});

test('E2E-343-r2 : écran Utilisateurs, modification : corps du PATCH, colonne, effet dans l’onglet Équipes', async ({
  page,
  request,
}) => {
  const alpha = await equipeApi(request, 'Alpha');
  const bravo = await equipeApi(request, 'bravo');
  await utilisateurApi(request, 'Membre 343', 'membre-343@lot6a.test', alpha);
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  const patchs = await espionner(page, '**/api/utilisateurs/*', 'PATCH');
  const tableau = page.getByRole('table', { name: 'Liste des utilisateurs' });
  const dialog = page.getByRole('dialog');
  const ouvrir = async () => {
    await page.getByRole('button', { name: 'Modifier Membre 343' }).click();
    return dialog.getByLabel('Équipe', { exact: true });
  };

  let liste = await ouvrir();
  expect(await choix(liste)).toBe('Alpha');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toHaveCount(0);
  expect(patchs).toEqual([{}]);

  liste = await ouvrir();
  await liste.selectOption({ label: 'bravo' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toHaveCount(0);
  expect(patchs[1]).toEqual({ equipe_id: bravo });
  await expect(await cellule(tableau, 'Membre 343', 'Équipe')).toHaveText('bravo');
  expect(await equipeDe('Membre 343')).toBe(bravo);

  await ouvrirEquipes(page);
  await expect(await cellule(tableauEquipes(page), 'bravo', 'Membres')).toHaveText('1');
  await expect(await cellule(tableauEquipes(page), 'Alpha', 'Membres')).toHaveText('0');
  await allerA(page, 'Utilisateurs');

  liste = await ouvrir();
  expect(await choix(liste)).toBe('bravo');
  await liste.selectOption({ label: 'Aucune' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toHaveCount(0);
  expect(patchs[2]).toEqual({ equipe_id: null });
  await expect(await cellule(tableau, 'Membre 343', 'Équipe')).toHaveText('—');
  expect(await equipeDe('Membre 343')).toBeNull();
  await ouvrirEquipes(page);
  await expect(await cellule(tableauEquipes(page), 'bravo', 'Membres')).toHaveText('0');
});

test('E2E-344 : refus 422 « Équipe inconnue » en modification et en création, dialogue ouvert', async ({
  page,
  request,
}) => {
  const alpha = await equipeApi(request, 'Alpha');
  const bravo = await equipeApi(request, 'bravo');
  await utilisateurApi(request, 'Membre 344', 'membre-344@lot6a.test', alpha);
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  const avant = await releve6a();
  const dialog = page.getByRole('dialog');

  await page.getByRole('button', { name: 'Modifier Membre 344' }).click();
  const supprimee = await request.delete(`/api/equipes/${bravo}`);
  expect(supprimee.status()).toBe(204);
  const apresSuppression = await releve6a();
  await dialog.getByLabel('Équipe', { exact: true }).selectOption({ label: 'bravo' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByText(INCONNUE)).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(await releve6a()).toEqual(apresSuppression);
  expect(await equipeDe('Membre 344')).toBe(alpha);
  await dialog.getByRole('button', { name: 'Annuler' }).click();

  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  await dialog.getByLabel('Nom').fill('Nouveau 344');
  await dialog.getByLabel('Email').fill('nouveau-344@lot6a.test');
  await dialog.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  await dialog.getByLabel('Équipe', { exact: true }).selectOption({ label: 'bravo' });
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(dialog.getByText(INCONNUE)).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(await releve6a()).toEqual(apresSuppression);
  expect(avant).not.toEqual(apresSuppression);
});

test('E2E-345-r1 : parcours complet à l’écran avec une équipe, de l’administrateur seul à l’assignation', async ({
  page,
}) => {
  const RESSOURCE = 'Ressource 6A';
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 6A');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 6A/ })).toBeVisible();

  await ouvrirEquipes(page);
  await creerEquipeParEcran(page, 'Équipe 6a');

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const utilisateur = page.getByRole('dialog');
  await utilisateur.getByLabel('Nom').fill(RESSOURCE);
  await utilisateur.getByLabel('Email').fill('ressource-6a@lot6a.test');
  await utilisateur.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  await utilisateur.getByLabel('Calendrier').selectOption({ label: 'Cal 6A' });
  await utilisateur.getByLabel('Équipe', { exact: true }).selectOption({ label: 'Équipe 6a' });
  await utilisateur.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await expect(
    await cellule(page.getByRole('table', { name: 'Liste des utilisateurs' }), RESSOURCE, 'Équipe'),
  ).toHaveText('Équipe 6a');

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('6A');
  await projet.getByLabel('Nom').fill('Projet 6A');
  await projet.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await projet.getByLabel('Pas avant le').fill('2027-01-04');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet 6A/ })).toBeVisible();
  await page.getByRole('link', { name: 'Projet 6A' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 6A', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page.getByRole('dialog').getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 6A');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 6A/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 6A' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Tâche 6A.*${RESSOURCE}`) })).toBeVisible();

  await ouvrirEquipes(page);
  await expect(await cellule(tableauEquipes(page), 'Équipe 6a', 'Membres')).toHaveText('1');
  await allerA(page, 'Utilisateurs');
  await expect(
    await cellule(page.getByRole('table', { name: 'Liste des utilisateurs' }), RESSOURCE, 'Équipe'),
  ).toHaveText('Équipe 6a');
});
