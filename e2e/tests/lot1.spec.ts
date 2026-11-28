import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { ouvrirCalendriers } from './lot3c-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';

/*
 * Contrat d'interface du lot 1 (écrans) — libellés accessibles attendus :
 *
 * Navigation (barre latérale) : liens « Calendriers », « Projets » (et « Utilisateurs » pour
 * l'administrateur), bouton « Se déconnecter ». Chaque écran a un titre de niveau 1 de même nom.
 *
 * Calendriers : bouton « Nouveau calendrier » → dialogue : champ « Nom », cases à cocher
 *   « Lundi » … « Dimanche » (lundi à vendredi cochées par défaut), bouton « Créer ». Une ligne
 *   de tableau par calendrier, son nom est un lien vers le détail (titre = nom du calendrier :
 *   cases « Lundi » … « Dimanche » en lecture, section « Jours fériés », tableau Date | Libellé).
 *   Bouton « Ajouter un jour férié » → dialogue : champs « Date », « Libellé », bouton « Ajouter ».
 *   Les dates sont affichées au format AAAA-MM-JJ.
 *
 * Projets : bouton « Nouveau projet » (administrateur et chef) → dialogue : champs « Code »,
 *   « Nom », liste « Chef de projet » (options = noms des chefs et administrateurs actifs),
 *   champ « Pas avant le » (D-078), bouton « Créer ». Tableau : Code | Nom | Chef de projet | Début
 *   (début calculé, « — » avant calcul).
 *   Le nom est un lien vers l'écran du projet : titre de niveau 1 = nom du projet, bouton
 *   « Modifier le projet » (dialogue : champ « Nom », bouton « Enregistrer »), onglets (role tab)
 *   « Planning », « Affectations » et « Historique » (« Historique » : administrateur et chef
 *   seulement ; absent pour une ressource).
 *
 * Onglet « Affectations » : tableau Ressource | Taux (%) ; bouton « Affecter une ressource »
 *   (dialogue : liste « Ressource » (ressources actives), champ « Taux (%) » (100 par défaut),
 *   bouton « Affecter »).
 *
 * Onglet « Planning » : tableau Numéro WBS | Nom | Type | Ressources, ligne par élément dans
 *   l'ordre WBS (numéros « 1 », « 1.1 »…). Boutons « Nouvelle activité » et « Nouveau jalon »
 *   (dialogue : champ « Nom », bouton « Créer »). Boutons de ligne : « Ajouter une sous-activité à
 *   <nom> » (dialogue : « Nom », « Créer »), « Assigner une ressource à <nom> » (dialogue : liste
 *   « Ressource » (ressources affectées au projet et pas encore assignées), champ « Charge
 *   assignée (jours) », champ « Taux (%) », bouton « Assigner »). La colonne « Ressources » d'une
 *   ligne contient le nom des ressources assignées.
 *   Région « Dépendances » (titre de niveau 2 du même nom) : bouton « Nouvelle dépendance »
 *   (dialogue : listes « Prédécesseur » et « Successeur » (options = noms des éléments), liste
 *   « Type » (FD, DD, FF ; FD par défaut), champ « Délai (j) » (0 par défaut), bouton
 *   « Créer »). Tableau Prédécesseur | Successeur | Type | Délai.
 *   Aucun bouton d'écriture pour une ressource : ni « Nouvelle activité », « Nouveau jalon »,
 *   « Nouvelle dépendance », « Affecter une ressource », « Modifier le projet », ni bouton
 *   « Ajouter… », « Assigner… », « Modifier… » ou « Supprimer… » sur les lignes.
 *
 * Onglet « Historique » : tableau avec les en-têtes de colonne Date | Utilisateur | Entité |
 *   Opération | Champ | Ancienne valeur | Nouvelle valeur ; opérations « création », « modification »,
 *   « suppression » ; entités « projet », « activité », « jalon », « dépendance », « assignation »,
 *   « affectation » ; plus récent en premier.
 */

test('E2E-5-r1 : l’administrateur crée un calendrier avec un jour férié', async ({ page }) => {
  await loginAsAdmin(page);
  // Révision -r1 (D-031, D-165 (3)) : onglet Calendriers de l'écran Utilisateurs.
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill('Atelier E2E5');
  await expect(dialog.getByRole('checkbox', { name: 'Lundi' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Samedi' })).not.toBeChecked();
  await dialog.getByRole('checkbox', { name: 'Vendredi' }).uncheck();
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Atelier E2E5/ })).toBeVisible();
  await page.getByRole('link', { name: 'Atelier E2E5' }).click();
  await expect(page.getByRole('heading', { name: 'Atelier E2E5', level: 1 })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Jeudi' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Vendredi' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Ajouter un jour férié' }).click();
  const ferie = page.getByRole('dialog');
  await ferie.getByLabel('Date').fill('2027-05-01');
  await ferie.getByLabel('Libellé').fill('Fête du travail');
  await ferie.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByRole('row', { name: /2027-05-01.*Fête du travail/ })).toBeVisible();
});

test('E2E-6-r1 : l’administrateur crée un projet (code, chef, début)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef E2E6', 'chef-e2e6@example.test', 'chef_de_projet');
  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Projets' }).click();
  await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('E2E-6');
  await dialog.getByLabel('Nom').fill('Projet E2E6');
  await dialog.getByLabel('Chef de projet').selectOption({ label: 'Chef E2E6' });
  await dialog.getByLabel('Pas avant le').fill('2027-01-04');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /E2E-6.*Projet E2E6.*Chef E2E6/ })).toBeVisible();
  await page.getByRole('link', { name: 'Projet E2E6' }).click();
  await expect(page.getByRole('heading', { name: 'Projet E2E6', level: 1 })).toBeVisible();
});

test('E2E-7 : un chef affecte une ressource, crée une activité puis une sous-activité', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E7', 'chef-e2e7@example.test', 'chef_de_projet');
  await api.utilisateur('Alice E2E7', 'alice-e2e7@example.test', 'ressource', true);
  await api.projet('E2E-7', 'Projet E2E7', chef.id);
  await connecterAvec(page, 'chef-e2e7@example.test');
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('link', { name: 'Projet E2E7' }).click();
  await expect(page.getByRole('heading', { name: 'Projet E2E7', level: 1 })).toBeVisible();
  // affectation
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  const affectation = page.getByRole('dialog');
  await affectation.getByLabel('Ressource').selectOption({ label: 'Alice E2E7' });
  await affectation.getByLabel('Taux (%)').fill('50');
  await affectation.getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Alice E2E7.*50/ })).toBeVisible();
  // activité puis sous-activité
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Terrassement E2E7');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /1 Terrassement E2E7/ })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter une sous-activité à Terrassement E2E7' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Fondations E2E7');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /1\.1 Fondations E2E7/ })).toBeVisible();
});

test('E2E-8-r1 : un chef crée un jalon et une dépendance FD', async ({ page, request }) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E8', 'chef-e2e8@example.test', 'chef_de_projet');
  const projet = await api.projet('E2E-8', 'Projet E2E8', chef.id);
  await api.activite(projet.id, 'Analyse E2E8');
  await connecterAvec(page, 'chef-e2e8@example.test');
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('link', { name: 'Projet E2E8' }).click();
  await page.getByRole('button', { name: 'Nouveau jalon' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Livraison E2E8');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Livraison E2E8/ })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle dépendance' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Prédécesseur').selectOption({ label: 'Analyse E2E8' });
  await dialog.getByLabel('Successeur').selectOption({ label: 'Livraison E2E8' });
  await expect(dialog.getByLabel('Type')).toHaveValue('FD');
  await expect(dialog.getByLabel('Délai (j)')).toHaveValue('0');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Dépendances' })
      .getByRole('row', { name: /Analyse E2E8.*Livraison E2E8.*FD.*0/ }),
  ).toBeVisible();
});

test('E2E-9-r1 : un chef assigne une ressource ; une ressource non affectée n’est pas proposée', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E9', 'chef-e2e9@example.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice E2E9', 'alice-e2e9@example.test', 'ressource', true);
  await api.utilisateur('Bob E2E9', 'bob-e2e9@example.test', 'ressource', true);
  const projet = await api.projet('E2E-9', 'Projet E2E9', chef.id);
  await api.affectation(projet.id, alice.id);
  await api.activite(projet.id, 'Maçonnerie E2E9');
  await connecterAvec(page, 'chef-e2e9@example.test');
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('link', { name: 'Projet E2E9' }).click();
  await page.getByRole('button', { name: 'Assigner une ressource à Maçonnerie E2E9' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('option', { name: 'Alice E2E9' })).toHaveCount(1);
  await expect(dialog.getByRole('option', { name: 'Bob E2E9' })).toHaveCount(0);
  await dialog.getByLabel('Ressource').selectOption({ label: 'Alice E2E9' });
  await dialog.getByLabel('Charge assignée (j)').fill('2');
  await dialog.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Maçonnerie E2E9.*Alice E2E9/ })).toBeVisible();
});

test('E2E-10-r2 : un chef de projet affecté au projet d’un autre chef consulte le planning sans bouton d’écriture', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E10', 'chef-e2e10@example.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice E2E10', 'alice-e2e10@example.test', 'ressource', true);
  const projet = await api.projet('E2E-10', 'Projet E2E10', chef.id);
  await api.projet('E2E-10B', 'Autre projet E2E10', chef.id);
  await api.affectation(projet.id, alice.id);
  await api.activite(projet.id, 'Lecture E2E10');
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, projet.id, 'E2E10'));
  await page.getByRole('link', { name: 'Projets' }).click();
  // Révision D-265 (4) : les projets d'un autre chef sont présents, en lecture seule.
  await expect(page.getByRole('row', { name: /Autre projet E2E10/ })).toHaveCount(1);
  await page.getByRole('link', { name: 'Projet E2E10', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projet E2E10', level: 1 })).toBeVisible();
  await expect(page.getByRole('row', { name: /Lecture E2E10/ })).toBeVisible();
  const ecriture =
    /Nouvelle activité|Nouveau jalon|Nouvelle dépendance|Affecter|Modifier|Ajouter|Assigner|Supprimer/;
  await expect(page.getByRole('button', { name: ecriture })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Historique' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await expect(page.getByRole('row', { name: /Alice E2E10/ })).toBeVisible();
  await expect(page.getByRole('button', { name: ecriture })).toHaveCount(0);
});

test('E2E-11 : l’historique d’un projet est visible après une modification', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E11', 'chef-e2e11@example.test', 'chef_de_projet');
  await api.projet('E2E-11', 'Ancien nom E2E11', chef.id);
  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('link', { name: 'Ancien nom E2E11' }).click();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Nouveau nom E2E11');
  await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { name: 'Nouveau nom E2E11', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Historique' }).click();
  for (const colonne of [
    'Date',
    'Utilisateur',
    'Entité',
    'Opération',
    'Champ',
    'Ancienne valeur',
    'Nouvelle valeur',
  ]) {
    await expect(page.getByRole('columnheader', { name: colonne })).toBeVisible();
  }
  await expect(
    page.getByRole('row', {
      name: /Admin E2E.*projet.*modification.*nom.*Ancien nom E2E11.*Nouveau nom E2E11/,
    }),
  ).toBeVisible();
});
