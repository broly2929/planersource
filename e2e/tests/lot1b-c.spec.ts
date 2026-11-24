import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { ouvrirCalendriers } from './lot3c-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';
import { fermerEnAbandonnant } from './garde-dialogue-helpers.js';
import { cliquerDansConfirmation } from './stabilite-helpers.js';

/*
 * Contrat d'interface du lot 1b-C (libellés accessibles exacts) :
 *
 * Règles communes :
 * - Boutons d'écriture d'un projet ou d'un modèle : seulement si peut_ecrire.
 * - Suppression : dialogue de confirmation, titre « Supprimer <nom> ? », boutons « Supprimer »
 *   et « Annuler ». Refus de l'API : message dans le dialogue, qui reste ouvert.
 * - Code déjà utilisé (409) : « Ce code est déjà utilisé. » dans les dialogues « Nouveau projet »,
 *   « Nouveau modèle » et de copie.
 * - Boutons de ligne : icône avec aria-label et title identiques.
 *
 * Copie :
 * - Écran « Projets », bouton de ligne « Copier <nom> » (si peut_ecrire).
 * - Écran « Modèles », bouton de ligne « Créer un projet depuis <nom> » (administrateur et chef
 *   de projet).
 * - Dialogue commun : champs « Nom » (prérempli « Copie de <nom> »), « Code » (vide), « Date de
 *   début » (date de début de la source) ; cases « Inclure les sous-projets » et « Copier les
 *   affectations et assignations » (cochées) ; case « Enregistrer comme modèle » (non cochée,
 *   administrateur seul, absente du dialogue ouvert depuis « Modèles ») ; bouton « Copier »
 *   depuis « Projets », « Créer » depuis « Modèles ».
 * - Après succès : navigation vers la fiche du projet ou du modèle créé.
 *
 * Planning (lignes) :
 * - « Modifier <nom> » → activité : champs « Nom », liste « Mode », champ « Priorité », « Début
 *   validé », « Fin validée », « Durée validée (jours ouvrés) », case « Close », bouton
 *   « Enregistrer ». Jalon : « Nom », liste « Type » (Flottant, Fixe), « Date validée »,
 *   « Enregistrer ».
 * - « Supprimer <nom> », « Monter <nom> », « Descendre <nom> » (rang ± 1 parmi les frères ; bouton
 *   désactivé en première ou dernière position).
 * - Colonne « Ressources », par ressource assignée : « Modifier l'assignation de <ressource> à
 *   <activité> » (champs « Charge assignée (jours) », « Taux (%) », « Enregistrer ») et « Retirer
 *   <ressource> de <activité> » (confirmation, bouton « Supprimer »).
 * - Dépendances : « Modifier la dépendance <prédécesseur> → <successeur> » (liste « Type », champ
 *   « Délai (jours ouvrés) », « Enregistrer ») et « Supprimer la dépendance <prédécesseur> →
 *   <successeur> ».
 *
 * Affectations : « Modifier l'affectation de <ressource> » (champs « Taux (%) », « Date de
 * début », « Date de fin », « Enregistrer ») et « Supprimer l'affectation de <ressource> ».
 * Colonnes ajoutées : Début, Fin.
 *
 * Fiche projet : bouton « Supprimer le projet » ; après succès, retour à la liste « Projets » (ou
 * « Modèles » pour un modèle).
 *
 * Calendriers (administrateur) : sur le détail, « Modifier le calendrier » (champ « Nom », cases
 * « Lundi » … « Dimanche », « Enregistrer »), « Supprimer le calendrier » (retour à la liste), et
 * par ligne de jour férié « Supprimer le jour férié <AAAA-MM-JJ> ».
 */

const BOUTONS_ECRITURE = /Copier|Modifier|Supprimer|Monter|Descendre|Retirer|Créer un projet/;
const BOUTONS_SANS_COPIE = /Copier|Modifier|Supprimer|Monter|Descendre|Retirer/;

async function ouvrirProjet(page: Page, nom: string): Promise<void> {
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('link', { name: nom, exact: true }).click();
  await expect(page.getByRole('heading', { name: nom, level: 1 })).toBeVisible();
}

test('E2E-14 : l’administrateur copie un projet depuis la liste, options par défaut', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E14', 'chef-e2e14@example.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice E2E14', 'alice-e2e14@example.test', 'ressource', true);
  const projet = await api.projet('P-E2E14', 'Projet E2E14', chef.id);
  await api.affectation(projet.id, alice.id);
  const activite = await api.activite(projet.id, 'Étude E2E14');
  await api.assignation(activite.id, alice.id, 2);

  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('button', { name: 'Copier Projet E2E14', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Nom')).toHaveValue('Copie de Projet E2E14');
  await expect(dialog.getByLabel('Code')).toHaveValue('');
  await expect(dialog.getByLabel('Date de début')).toHaveValue('2027-01-04');
  await expect(dialog.getByRole('checkbox', { name: 'Inclure les sous-projets' })).toBeChecked();
  await expect(
    dialog.getByRole('checkbox', { name: 'Copier les affectations et assignations' }),
  ).toBeChecked();
  await expect(
    dialog.getByRole('checkbox', { name: 'Enregistrer comme modèle' }),
  ).not.toBeChecked();
  await dialog.getByLabel('Code').fill('C-E2E14');
  await dialog.getByRole('button', { name: 'Copier', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Copie de Projet E2E14', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('row', { name: /1 Étude E2E14.*Alice E2E14/ })).toBeVisible();
  await page.getByRole('link', { name: 'Projets' }).click();
  await expect(page.getByRole('row', { name: /C-E2E14.*Copie de Projet E2E14/ })).toBeVisible();
});

test('E2E-15 : un chef crée un projet depuis un modèle', async ({ page, request }) => {
  const api = await preparer(request);
  await api.utilisateur('Chef E2E15', 'chef-e2e15@example.test', 'chef_de_projet');
  const modele = await api.modele('MOD-E2E15', 'Modèle E2E15');
  await api.activite(modele.id, 'Étude E2E15');

  await connecterAvec(page, 'chef-e2e15@example.test');
  await page.getByRole('link', { name: 'Modèles' }).click();
  await page
    .getByRole('button', { name: 'Créer un projet depuis Modèle E2E15', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('checkbox', { name: 'Enregistrer comme modèle' })).toHaveCount(0);
  await dialog.getByLabel('Code').fill('P-E2E15');
  await dialog.getByLabel('Nom').fill('Projet E2E15');
  await dialog.getByRole('button', { name: 'Créer', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Projet E2E15', level: 1 })).toBeVisible();
  await expect(page.getByRole('row', { name: /1 Étude E2E15/ })).toBeVisible();
  await page.getByRole('link', { name: 'Projets' }).click();
  await expect(page.getByRole('row', { name: /P-E2E15.*Projet E2E15/ })).toBeVisible();
  await page.getByRole('link', { name: 'Modèles' }).click();
  await expect(page.getByRole('heading', { name: 'Modèles', level: 1 })).toBeVisible();
  await expect(page.getByRole('row', { name: /P-E2E15/ })).toHaveCount(0);
});

test('E2E-16 : « Enregistrer comme modèle » (administrateur seul)', async ({
  page,
  request,
  browser,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E16', 'chef-e2e16@example.test', 'chef_de_projet');
  await api.projet('P-E2E16', 'Projet E2E16', chef.id);

  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('button', { name: 'Copier Projet E2E16', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('M-E2E16');
  await dialog.getByRole('checkbox', { name: 'Enregistrer comme modèle' }).check();
  await dialog.getByRole('button', { name: 'Copier', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Copie de Projet E2E16', level: 1 }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Modèles' }).click();
  await expect(page.getByRole('row', { name: /M-E2E16.*Copie de Projet E2E16/ })).toBeVisible();
  await page.getByRole('link', { name: 'Projets' }).click();
  await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible();
  await expect(page.getByRole('row', { name: /M-E2E16/ })).toHaveCount(0);

  const contexte = await browser.newContext();
  const pageChef = await contexte.newPage();
  await connecterAvec(pageChef, 'chef-e2e16@example.test');
  await pageChef.getByRole('link', { name: 'Projets' }).click();
  await pageChef.getByRole('button', { name: 'Copier Projet E2E16', exact: true }).click();
  const dialogChef = pageChef.getByRole('dialog');
  await expect(dialogChef.getByLabel('Nom')).toBeVisible();
  await expect(dialogChef.getByRole('checkbox', { name: 'Enregistrer comme modèle' })).toHaveCount(
    0,
  );
  await contexte.close();
});

test('E2E-17 : un chef modifie puis supprime une activité', async ({ page, request }) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E17', 'chef-e2e17@example.test', 'chef_de_projet');
  const projet = await api.projet('P-E2E17', 'Projet E2E17', chef.id);
  await api.activite(projet.id, 'Étude E2E17');

  await connecterAvec(page, 'chef-e2e17@example.test');
  await ouvrirProjet(page, 'Projet E2E17');
  await page.getByRole('button', { name: 'Modifier Étude E2E17', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill('Étude révisée E2E17');
  await dialog.getByLabel('Mode').selectOption('START');
  await dialog.getByLabel('Début validé').fill('2027-01-06');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('row', { name: /1 Étude révisée E2E17/ })).toBeVisible();

  await page.getByRole('button', { name: 'Modifier Étude révisée E2E17', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Nom')).toHaveValue('Étude révisée E2E17');
  await expect(dialog.getByLabel('Mode')).toHaveValue('START');
  await expect(dialog.getByLabel('Début validé')).toHaveValue('2027-01-06');
  await dialog.getByRole('button', { name: 'Annuler' }).click();

  await page.getByRole('button', { name: 'Supprimer Étude révisée E2E17', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Supprimer Étude révisée E2E17 ?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByRole('row', { name: /Étude révisée E2E17/ })).toHaveCount(0);
});

test('E2E-18-r1 : un chef modifie puis supprime un jalon et une dépendance', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E18', 'chef-e2e18@example.test', 'chef_de_projet');
  const projet = await api.projet('P-E2E18', 'Projet E2E18', chef.id);
  await api.jalon(projet.id, 'Jalon E2E18');
  const amont = await api.activite(projet.id, 'Amont E2E18');
  const aval = await api.activite(projet.id, 'Aval E2E18');
  await api.dependance(projet.id, amont.id, aval.id);

  await connecterAvec(page, 'chef-e2e18@example.test');
  await ouvrirProjet(page, 'Projet E2E18');

  await page.getByRole('button', { name: 'Modifier Jalon E2E18', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Type').selectOption({ label: 'Fixe' });
  await dialog.getByLabel('Date validée').fill('2027-02-01');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByRole('button', { name: 'Modifier Jalon E2E18', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('option', { name: 'Fixe' })).toHaveJSProperty('selected', true);
  await expect(dialog.getByLabel('Date validée')).toHaveValue('2027-02-01');
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  await page.getByRole('button', { name: 'Supprimer Jalon E2E18', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Supprimer Jalon E2E18 ?' });
  await confirmation.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByRole('row', { name: /Jalon E2E18/ })).toHaveCount(0);

  const dependances = page.getByRole('region', { name: 'Dépendances' });
  await dependances
    .getByRole('button', { name: 'Modifier la dépendance Amont E2E18 → Aval E2E18', exact: true })
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Type').selectOption('DD');
  await dialog.getByLabel('Délai (jours ouvrés)').fill('2');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    dependances.getByRole('row', { name: /Amont E2E18.*Aval E2E18.*DD.*2/ }),
  ).toBeVisible();

  await dependances
    .getByRole('button', {
      name: 'Supprimer la dépendance Amont E2E18 → Aval E2E18',
      exact: true,
    })
    .click();
  await cliquerDansConfirmation(
    page.getByRole('dialog'),
    page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }),
  );
  await expect(dependances.getByText('Aucune dépendance définie.')).toBeVisible();
});

test('E2E-19-r1 : un chef modifie une affectation et une assignation, retire l’assignation, supprime l’affectation', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E19', 'chef-e2e19@example.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice E2E19', 'alice-e2e19@example.test', 'ressource', true);
  const projet = await api.projet('P-E2E19', 'Projet E2E19', chef.id);
  await api.affectation(projet.id, alice.id);
  const activite = await api.activite(projet.id, 'Étude E2E19');
  await api.assignation(activite.id, alice.id, 2);

  await connecterAvec(page, 'chef-e2e19@example.test');
  await ouvrirProjet(page, 'Projet E2E19');

  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: "Modifier l'affectation de Alice E2E19" }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Taux (%)').fill('50');
  await dialog.getByLabel('Date de début').fill('2027-01-04');
  await dialog.getByLabel('Date de fin').fill('2027-03-31');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    page.getByRole('row', { name: /Alice E2E19.*50.*2027-01-04.*2027-03-31/ }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page
    .getByRole('button', { name: "Modifier l'assignation de Alice E2E19 à Étude E2E19" })
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Charge assignée (jours)').fill('3');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await page
    .getByRole('button', { name: "Modifier l'assignation de Alice E2E19 à Étude E2E19" })
    .click();
  await expect(page.getByRole('dialog').getByLabel('Charge assignée (jours)')).toHaveValue('3');
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();

  await page.getByRole('button', { name: 'Retirer Alice E2E19 de Étude E2E19' }).click();
  await cliquerDansConfirmation(
    page.getByRole('dialog'),
    page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }),
  );
  await expect(
    page.getByRole('button', { name: 'Retirer Alice E2E19 de Étude E2E19' }),
  ).toHaveCount(0);

  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: "Supprimer l'affectation de Alice E2E19" }).click();
  await cliquerDansConfirmation(
    page.getByRole('dialog'),
    page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }),
  );
  await expect(page.getByRole('row', { name: /Alice E2E19/ })).toHaveCount(0);
});

test('E2E-20 : Monter et Descendre réordonnent les frères, boutons désactivés aux extrémités', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E20', 'chef-e2e20@example.test', 'chef_de_projet');
  const projet = await api.projet('P-E2E20', 'Projet E2E20', chef.id);
  await api.activite(projet.id, 'Alpha E2E20');
  await api.activite(projet.id, 'Bravo E2E20');
  await api.activite(projet.id, 'Charlie E2E20');

  await connecterAvec(page, 'chef-e2e20@example.test');
  await ouvrirProjet(page, 'Projet E2E20');
  await expect(page.getByRole('button', { name: 'Monter Alpha E2E20' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Descendre Charlie E2E20' })).toBeDisabled();

  await page.getByRole('button', { name: 'Descendre Alpha E2E20' }).click();
  await expect(page.getByRole('row', { name: /^1 Bravo E2E20/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^2 Alpha E2E20/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^3 Charlie E2E20/ })).toBeVisible();

  await page.getByRole('button', { name: 'Monter Charlie E2E20' }).click();
  await expect(page.getByRole('row', { name: /^1 Bravo E2E20/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^2 Charlie E2E20/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^3 Alpha E2E20/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Monter Bravo E2E20' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Descendre Alpha E2E20' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Monter Alpha E2E20' })).toBeEnabled();
});

test('E2E-21-r2 : l’administrateur modifie un calendrier, supprime un jour férié puis le calendrier', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const calendrier = await api.calendrier('Cal E2E21');
  await api.ferie(calendrier.id, '2027-05-01', 'Fête E2E21');

  await loginAsAdmin(page);
  // Révision -r1 (D-031, D-165 (3), (3 bis)) : onglet Calendriers ; la suppression ramène à cet onglet.
  await ouvrirCalendriers(page);
  await page.getByRole('link', { name: 'Cal E2E21', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier le calendrier' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill('Cal révisé E2E21');
  await dialog.getByRole('checkbox', { name: 'Samedi' }).check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { name: 'Cal révisé E2E21', level: 1 })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Samedi' })).toBeChecked();

  await expect(page.getByRole('row', { name: /2027-05-01.*Fête E2E21/ })).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer le jour férié 2027-05-01' }).click();
  await cliquerDansConfirmation(
    page.getByRole('dialog'),
    page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }),
  );
  await expect(page.getByRole('row', { name: /2027-05-01/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Supprimer le calendrier' }).click();
  await cliquerDansConfirmation(
    page.getByRole('dialog'),
    page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }),
  );
  await expect(page).toHaveURL('/utilisateurs?onglet=calendriers');
  await expect(page.getByRole('tab', { name: 'Calendriers', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('link', { name: 'Cal révisé E2E21' })).toHaveCount(0);
});

test('E2E-22 : l’administrateur supprime un projet depuis sa fiche ; Annuler ne supprime rien', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E22', 'chef-e2e22@example.test', 'chef_de_projet');
  const projet = await api.projet('P-E2E22', 'Projet E2E22', chef.id);

  await loginAsAdmin(page);
  await ouvrirProjet(page, 'Projet E2E22');
  await page.getByRole('button', { name: 'Supprimer le projet' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Supprimer Projet E2E22 ?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Annuler' }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Projet E2E22', level: 1 })).toBeVisible();
  expect((await request.get(`/api/projets/${projet.id}`)).status()).toBe(200);

  await page.getByRole('button', { name: 'Supprimer le projet' }).click();
  await page
    .getByRole('dialog', { name: 'Supprimer Projet E2E22 ?' })
    .getByRole('button', { name: 'Supprimer', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Projet E2E22', exact: true })).toHaveCount(0);
  expect((await request.get(`/api/projets/${projet.id}`)).status()).toBe(404);
});

test('E2E-23-r1 : lecture seule — un chef affecté au projet d’un autre chef sans bouton d’écriture, un chef sur un modèle', async ({
  page,
  request,
  browser,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E23', 'chef-e2e23@example.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice E2E23', 'alice-e2e23@example.test', 'ressource', true);
  const projet = await api.projet('P-E2E23', 'Projet E2E23', chef.id);
  await api.affectation(projet.id, alice.id);
  const etude = await api.activite(projet.id, 'Étude E2E23');
  const suite = await api.activite(projet.id, 'Suite E2E23');
  await api.jalon(projet.id, 'Jalon E2E23');
  await api.assignation(etude.id, alice.id, 2);
  await api.dependance(projet.id, etude.id, suite.id);
  const modele = await api.modele('MOD-E2E23', 'Modèle E2E23');
  await api.activite(modele.id, 'Tâche modèle E2E23');
  await api.jalon(modele.id, 'Jalon modèle E2E23');

  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, projet.id, 'E2E23'));
  await page.getByRole('link', { name: 'Projets' }).click();
  await expect(page.getByRole('link', { name: 'Projet E2E23', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: BOUTONS_ECRITURE })).toHaveCount(0);
  await page.getByRole('link', { name: 'Projet E2E23', exact: true }).click();
  await expect(page.getByRole('row', { name: /1 Étude E2E23.*Alice E2E23/ })).toBeVisible();
  await expect(page.getByRole('button', { name: BOUTONS_ECRITURE })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await expect(page.getByRole('row', { name: /Alice E2E23/ })).toBeVisible();
  await expect(page.getByRole('button', { name: BOUTONS_ECRITURE })).toHaveCount(0);

  const contexte = await browser.newContext();
  const pageChef = await contexte.newPage();
  await connecterAvec(pageChef, 'chef-e2e23@example.test');
  await pageChef.getByRole('link', { name: 'Modèles' }).click();
  await expect(
    pageChef.getByRole('button', { name: 'Créer un projet depuis Modèle E2E23', exact: true }),
  ).toBeVisible();
  await expect(pageChef.getByRole('button', { name: BOUTONS_SANS_COPIE })).toHaveCount(0);
  await pageChef.getByRole('link', { name: 'Modèle E2E23', exact: true }).click();
  await expect(pageChef.getByRole('row', { name: /1 Tâche modèle E2E23/ })).toBeVisible();
  await expect(pageChef.getByRole('button', { name: BOUTONS_SANS_COPIE })).toHaveCount(0);
  await pageChef.getByRole('tab', { name: 'Affectations' }).click();
  await expect(pageChef.getByRole('button', { name: BOUTONS_SANS_COPIE })).toHaveCount(0);
  await contexte.close();
});

test('E2E-24-r1 : code déjà utilisé dans la copie et dans « Nouveau modèle »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E24', 'chef-e2e24@example.test', 'chef_de_projet');
  await api.projet('P-E2E24', 'Projet E2E24', chef.id);
  await api.modele('M-E2E24', 'Modèle E2E24');

  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('button', { name: 'Copier Projet E2E24', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('P-E2E24');
  await dialog.getByRole('button', { name: 'Copier', exact: true }).click();
  await expect(dialog.getByText('Ce code est déjà utilisé.')).toBeVisible();
  await expect(dialog).toBeVisible();
  const projets = (await (await request.get('/api/projets')).json()) as { nom: string }[];
  expect(projets.filter((p) => p.nom === 'Copie de Projet E2E24')).toHaveLength(0);
  await fermerEnAbandonnant(page, dialog);

  await page.getByRole('link', { name: 'Modèles' }).click();
  await page.getByRole('button', { name: 'Nouveau modèle' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('M-E2E24');
  await dialog.getByLabel('Nom').fill('Autre modèle E2E24');
  await dialog.getByLabel('Date de début').fill('2027-01-04');
  await dialog.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(dialog.getByText('Ce code est déjà utilisé.')).toBeVisible();
  await expect(dialog).toBeVisible();
  const modeles = (await (await request.get('/api/modeles')).json()) as { nom: string }[];
  expect(modeles.filter((m) => m.nom === 'Autre modèle E2E24')).toHaveLength(0);
});
