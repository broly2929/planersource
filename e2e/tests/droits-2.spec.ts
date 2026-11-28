// Lot droits, tranche 2 (D-268 ; SPEC §2, « Lecture élargie du chef et rôle leader métier », point 8, cas DE-1
// à DE-10) : E2E-696 à E2E-706. Base « administrateur seul » avant et après chaque test. Données préparées par
// l'API, sauf E2E-706 (parcours complet, tout à l'écran) et l'entité dont l'écran est l'objet du test.
// Valeurs attendues recopiées de SPEC §2 point 8.
// Contrat des écrans (phase verte) :
//   - mention « Lecture seule » (texte exact) dans la cellule Nom d'une ligne de projet non modifiable de la
//     liste Projets, et en tête d'un projet ouvert non modifiable ;
//   - message du chef sans projet au-dessus de la liste Projets (texte exact de DE-3) ;
//   - `voit_finances` côté écran : `peut_ecrire` et rôle autre que `leader_metier`.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, connecterAvec, preparer, type Role } from './lot1-helpers.js';
import { allerA, NOM_ADMIN } from './lot3c-helpers.js';
import { H14 } from './lot4b-helpers.js';
import {
  boutonDe,
  ligneValidation,
  monde4c,
  ouvrirValidation,
  soumettreAlice,
  statutOk,
} from './lot4c-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';

const LEADER = 'leader_metier' as unknown as Role;
const LECTURE_SEULE = 'Lecture seule';
const MESSAGE_SANS_PROJET =
  "Vous n'êtes chef d'aucun projet. L'administrateur désigne le chef dans Modifier le projet.";
const COLONNES_FINANCES = ['Vendu', 'Marge', 'Coût planifié', 'Coût réel'];
const ROLES = ['Administrateur', 'Chef de projet', 'Leader métier', 'Ressource'];

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

/** Chef C (chef de P), chef H (chef de Q), leader L (ressource, affecté à P) ; P a une activité assignée à L. */
async function monde(request: APIRequestContext) {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef C', 'chef-c@droits2.test', 'chef_de_projet');
  const hors = await api.utilisateur('Chef H', 'chef-h@droits2.test', 'chef_de_projet');
  const leader = await api.utilisateur('Léa Leader', 'leader@droits2.test', LEADER, true);
  const p = await api.projet('PDR', 'Projet P', chef.id);
  const q = await api.projet('QDR', 'Projet Q', hors.id);
  await api.affectation(p.id, leader.id);
  const a = await api.activite(p.id, 'Analyse');
  await api.assignation(a.id, leader.id, 2);
  const vendu = await request.patch(`/api/activites/${a.id}`, { data: { charge_vendue: 5 } });
  expect(vendu.ok(), `charge vendue : ${vendu.status()}`).toBeTruthy();
  return { api, chef, hors, leader, p, q, a };
}

const tableauProjets = (page: Page) => page.getByRole('table').first();
const ligneProjet = (page: Page, nom: string) =>
  tableauProjets(page).getByRole('row').filter({ hasText: nom });

async function ouvrirColonnes(page: Page) {
  await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

test('E2E-696 : liste Projets d’un chef : « Lecture seule » sur le projet d’un autre chef, rien sur le sien (DE-1)', async ({
  page,
  request,
}) => {
  await monde(request);
  await connecterAvec(page, 'chef-h@droits2.test');
  await allerA(page, 'Projets');
  await expect(ligneProjet(page, 'Projet P')).toContainText(LECTURE_SEULE);
  await expect(ligneProjet(page, 'Projet Q')).toBeVisible();
  await expect(ligneProjet(page, 'Projet Q')).not.toContainText(LECTURE_SEULE);
});

test('E2E-697 : projet ouvert : « Lecture seule » en tête du projet d’un autre chef, absente sur le sien (DE-2)', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await connecterAvec(page, 'chef-h@droits2.test');
  await page.goto(`/projets/${m.p.id}`);
  await expect(page.getByRole('heading', { name: 'Projet P', level: 1 })).toBeVisible();
  await expect(page.getByText(LECTURE_SEULE, { exact: true })).toBeVisible();
  await page.goto(`/projets/${m.q.id}`);
  await expect(page.getByRole('heading', { name: 'Projet Q', level: 1 })).toBeVisible();
  await expect(page.getByText(LECTURE_SEULE, { exact: true })).toHaveCount(0);
});

test('E2E-698 : chef chef d’aucun projet : message sur l’écran Projets ; absent pour un chef de projet, le leader et l’administrateur (DE-3)', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await m.api.utilisateur('Chef Sans', 'chef-sans@droits2.test', 'chef_de_projet');
  await connecterAvec(page, 'chef-sans@droits2.test');
  await allerA(page, 'Projets');
  await expect(page.getByText(MESSAGE_SANS_PROJET, { exact: true })).toBeVisible();
  await expect(ligneProjet(page, 'Projet P')).toContainText(LECTURE_SEULE);

  for (const email of ['chef-c@droits2.test', 'leader@droits2.test']) {
    await page.context().clearCookies();
    await connecterAvec(page, email);
    await allerA(page, 'Projets');
    await expect(ligneProjet(page, 'Projet P')).toBeVisible();
    await expect(page.getByText(MESSAGE_SANS_PROJET), email).toHaveCount(0);
  }
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await expect(ligneProjet(page, 'Projet P')).toBeVisible();
  await expect(page.getByText(MESSAGE_SANS_PROJET)).toHaveCount(0);
});

test('E2E-699 : leader : menu sans Utilisateurs ; Pilotage sans onglet « Coûts », l’adresse des coûts affiche le plan de charge (DE-4, DE-5)', async ({
  page,
  request,
}) => {
  await monde(request);
  await connecterAvec(page, 'leader@droits2.test');
  for (const lien of ['Mes tâches', 'Accueil', 'Projets', 'Pilotage', 'Imputations']) {
    await expect(nav(page).getByRole('link', { name: lien, exact: true }), lien).toBeVisible();
  }
  await expect(nav(page).getByRole('link', { name: 'Utilisateurs', exact: true })).toHaveCount(0);
  await nav(page).getByRole('link', { name: 'Pilotage', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Plan de charge', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Coûts', exact: true })).toHaveCount(0);
  await page.goto('/pilotage?onglet=couts');
  await expect(page).toHaveURL(/onglet=charge/);
  await expect(page.getByRole('region', { name: 'Coûts' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Coûts', exact: true })).toHaveCount(0);
});

// E2E-700-r1 (D-031, D-268, tag tests-droits-2-r1) : le leader n'est pas ressource, il n'a donc
// qu'un onglet ; D-247 n'affiche alors aucune liste d'onglets et montre directement la Validation.
test('E2E-700-r2 : leader non ressource : Imputations affiche d’abord la Validation (onglets Validation et Absences, D-276), il valide la feuille d’Alice pour P4B et Q4B (DE-6)', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);
  await m.api.utilisateur('Léa Leader', 'leader-4c@droits2.test', LEADER);
  await page.clock.setFixedTime(H14);
  await connecterAvec(page, 'leader-4c@droits2.test');
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Validation des feuilles de temps', level: 1 }),
  ).toBeVisible();
  // révision D-276 (5) a) : onglet « Absences » en plus, la Validation reste l'onglet par défaut
  await expect(page.getByRole('tab')).toHaveText(['Validation', 'Absences']);
  await expect(page.getByRole('tab', { name: 'Validation', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await ouvrirValidation(page);
  const alice = ligneValidation(page, 'Alice 4B');
  await boutonDe(alice, 'Valider la feuille de Alice 4B').click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toContainText('Valider la feuille de Alice 4B pour P4B, Q4B ?');
  await boutonDe(confirmation, 'Valider').click();
  await expect(statutOk(page, 'Feuille validée.')).toBeVisible();
  await expect(alice.getByText('Validée', { exact: true })).toBeVisible();
});

test('E2E-701 : leader, onglet Affectations : ni « Taux du jour » ni « Modifier les taux de … » ; « Taux (%) » présent (DE-7)', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await connecterAvec(page, 'leader@droits2.test');
  await page.goto(`/projets/${m.p.id}`);
  await page.getByRole('tab', { name: 'Affectations', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: 'Taux (%)', exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Léa Leader' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Taux du jour', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: /^Modifier les taux de/ })).toHaveCount(0);
});

test('E2E-702 : leader, Gantt du projet : menu « Colonnes » sans vente, marge ni coûts ; ni « Totaux du projet » ni « Exporter les coûts » ; dialogues d’activité sans « Charge vendue (j) » ni « Marge » (DE-8)', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await connecterAvec(page, 'leader@droits2.test');
  await page.goto(`/projets/${m.p.id}?onglet=gantt`);
  await page.locator('svg[data-zoom]').waitFor();
  const menu = await ouvrirColonnes(page);
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Début', exact: true })).toBeVisible();
  for (const t of COLONNES_FINANCES)
    await expect(menu.getByRole('menuitemcheckbox', { name: t, exact: true }), t).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Totaux du projet' })).toHaveCount(0);
  await expect(page.getByText('Exporter les coûts')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Analyse', exact: true }).click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(modif.getByLabel('Nom')).toHaveValue('Analyse');
  await expect(modif.getByLabel('Charge vendue (j)')).toHaveCount(0);
  await expect(modif.getByText('Marge', { exact: true })).toHaveCount(0);
  await modif.getByRole('button', { name: 'Annuler' }).click();
  await expect(modif).toHaveCount(0);

  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const creation = page.getByRole('dialog');
  await expect(creation.getByLabel('Nom')).toBeVisible();
  await expect(creation.getByLabel('Charge vendue (j)')).toHaveCount(0);
});

test('E2E-703 : leader, Accueil : menu « Colonnes » sans vente, marge ni coûts ; le chef, si (DE-8)', async ({
  page,
  request,
}) => {
  await monde(request);
  await connecterAvec(page, 'leader@droits2.test');
  await expect(page.getByRole('heading', { name: 'Accueil', level: 1 })).toBeVisible();
  const menu = await ouvrirColonnes(page);
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Début', exact: true })).toBeVisible();
  for (const t of COLONNES_FINANCES)
    await expect(menu.getByRole('menuitemcheckbox', { name: t, exact: true }), t).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.context().clearCookies();
  await connecterAvec(page, 'chef-c@droits2.test');
  const menuChef = await ouvrirColonnes(page);
  for (const t of COLONNES_FINANCES)
    await expect(menuChef.getByRole('menuitemcheckbox', { name: t, exact: true }), t).toHaveCount(
      1,
    );
});

test('E2E-704 : administrateur, Utilisateurs : « Leader métier » dans les listes « Rôle » de création et de modification ; création à l’écran, colonne Rôle (DE-9)', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const creation = page.getByRole('dialog');
  expect(await creation.getByLabel('Rôle').locator('option').allTextContents()).toEqual(ROLES);
  await creation.getByLabel('Nom').fill('Léa Leader');
  await creation.getByLabel('Email').fill('lea@droits2.test');
  await creation.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  await creation.getByLabel('Rôle').selectOption({ label: 'Leader métier' });
  await creation.getByRole('button', { name: 'Créer' }).click();
  const ligne = page.getByRole('row').filter({ hasText: 'Léa Leader' });
  await expect(ligne).toContainText('Leader métier');

  await ligne.getByRole('button', { name: /^Modifier/ }).click();
  const modif = page.getByRole('dialog');
  expect(await modif.getByLabel('Rôle').locator('option').allTextContents()).toEqual(ROLES);
  await expect(modif.getByLabel('Rôle')).toHaveValue('leader_metier');
});

test('E2E-705 : administrateur : le leader dans la liste « Chef de projet » de « Nouveau projet » et de « Modifier le projet » (DE-10)', async ({
  page,
  request,
}) => {
  const m = await monde(request);
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const creation = page.getByRole('dialog');
  const chefs = await creation.getByLabel('Chef de projet').locator('option').allTextContents();
  expect(chefs).toContain('Léa Leader');
  expect(chefs).toContain('Chef C');
  await creation.getByRole('button', { name: 'Annuler' }).click();

  await page.goto(`/projets/${m.p.id}`);
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  const modif = page.getByRole('dialog', { name: 'Modifier le projet' });
  await modif.getByLabel('Chef de projet').selectOption({ label: 'Léa Leader' });
  await modif.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modif).toHaveCount(0);
  const lu = await request.get(`/api/projets/${m.p.id}`);
  expect(((await lu.json()) as { chef_id: number }).chef_id).toBe(m.leader.id);
});

test('E2E-706 : parcours complet à l’écran (administrateur seul) : leader créé à l’écran, il modifie l’activité d’un projet dont il n’est pas chef ; ni Vendu, ni Marge, ni Coûts', async ({
  page,
}) => {
  await loginAsAdmin(page);
  // Projet et activité créés à l'écran par l'administrateur (chef : lui-même).
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('PAR706');
  await projet.getByLabel('Nom').fill('Projet 706');
  await projet.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await projet.getByLabel('Pas avant le').fill('2027-01-04');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('link', { name: 'Projet 706', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projet 706', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click();
  const activite = page.getByRole('dialog');
  await activite.getByLabel('Nom').fill('Étude');
  await activite.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Étude' })).toBeVisible();

  // Leader créé à l'écran Utilisateurs.
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const u = page.getByRole('dialog');
  await u.getByLabel('Nom').fill('Léo Leader');
  await u.getByLabel('Email').fill('leo@droits2.test');
  await u.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  await u.getByLabel('Rôle').selectOption({ label: 'Leader métier' });
  await u.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Léo Leader' })).toContainText(
    'Leader métier',
  );
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  // Le leader modifie l'activité, sans être chef du projet.
  await connecterAvec(page, 'leo@droits2.test');
  await expect(nav(page).getByRole('link', { name: 'Utilisateurs', exact: true })).toHaveCount(0);
  await allerA(page, 'Projets');
  await expect(ligneProjet(page, 'Projet 706')).not.toContainText(LECTURE_SEULE);
  await page.getByRole('link', { name: 'Projet 706', exact: true }).click();
  await page.getByRole('tab', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Étude', exact: true }).click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await modif.getByLabel('Nom').fill('Étude détaillée');
  await modif.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modif).toHaveCount(0);
  await page.getByRole('tab', { name: 'Gantt', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Tableau du Gantt', exact: true })
      .getByText('Étude détaillée'),
  ).toBeVisible();
  const menu = await ouvrirColonnes(page);
  for (const t of ['Vendu', 'Marge'])
    await expect(menu.getByRole('menuitemcheckbox', { name: t, exact: true }), t).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('columnheader', { name: 'Vendu', exact: true })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Marge', exact: true })).toHaveCount(0);
  await nav(page).getByRole('link', { name: 'Pilotage', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Plan de charge', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Coûts', exact: true })).toHaveCount(0);
});
