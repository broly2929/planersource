// Lot 6f (D-160, SPEC « Exports CSV (lot 6f, D-160) ») : E2E-383 à E2E-387.
// Base « administrateur seul » avant et après chaque test. Valeurs recopiées de D-160.
// Téléchargements lus avec `waitForEvent('download')` ; fichiers : BOM, CRLF, séparateur « ; ».
import { readFile } from 'node:fs/promises';
import { expect, test, type Download, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, connecterAvec, preparer } from './lot1-helpers.js';
import { allerA, ouvrirCalendriers, ouvrirEquipes } from './lot3c-helpers.js';
import { EMAIL_ALICE, EMAIL_CHEF_P, H14, bouton, caseCharge } from './lot4b-helpers.js';
import {
  monde4c,
  ouvrirValidation,
  ouvrirValidationParMenu,
  soumettreAlice,
  statutOk,
} from './lot4c-helpers.js';
import { creerEquipeParEcran, equipeApi, nav, options, utilisateurApi } from './lot6a-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';

const BOM = '﻿';
/** En-tête du fichier du plan de charge (D-241) : trois colonnes puis les 12 mois à partir de `annee`-`mois`. */
const entetePlan = (annee: number, mois: number): string =>
  [
    'Ressource',
    'Équipe',
    'Ligne',
    ...Array.from({ length: 12 }, (_, i) => {
      const t = annee * 12 + (mois - 1) + i;
      return `${String((t % 12) + 1).padStart(2, '0')}/${Math.floor(t / 12)}`;
    }),
  ].join(';');
const ZEROS = '0;0;0;0;0;0;0;0;0;0;0;0';
const ENTETE_IMP = 'Ressource;Équipe;Semaine;Statut;Projet;Activité;Jour;Charge';
const ADRESSE_PLAN = '/plan-de-charge?debut=2027-01';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 900 });
});
test.afterEach(remettreAdminSeul6b);

/** Fichier téléchargé : nom proposé et lignes (BOM et CRLF final vérifiés). */
async function lire(telechargement: Download): Promise<{ nom: string; lignes: string[] }> {
  const chemin = await telechargement.path();
  const texte = await readFile(chemin, 'utf8');
  expect(texte.startsWith(BOM), 'BOM').toBe(true);
  expect(texte.endsWith('\r\n'), 'CRLF final').toBe(true);
  return { nom: telechargement.suggestedFilename(), lignes: texte.slice(1, -2).split('\r\n') };
}

/** Bouton ou lien « Exporter CSV » (D-160 (5) : lien de téléchargement dans la barre du plan). */
const exportPlan = (page: Page): Locator =>
  page
    .getByRole('link', { name: 'Exporter CSV', exact: true })
    .or(page.getByRole('button', { name: 'Exporter CSV', exact: true }));
const ouvrirExport = (page: Page) =>
  page.getByRole('button', { name: 'Exporter CSV', exact: true });
const dialogue = (page: Page) => page.getByRole('dialog', { name: 'Exporter les imputations' });
const champDu = (page: Page) => dialogue(page).getByLabel('Du', { exact: true });
const champAu = (page: Page) => dialogue(page).getByLabel('Au', { exact: true });
const listeEquipe = (page: Page) => page.getByLabel('Équipe', { exact: true });
const tableauPlan = (page: Page) => page.getByRole('table', { name: 'Plan de charge' });

/** Clique `declencheur` et lit le fichier téléchargé. */
async function telecharger(page: Page, declencheur: Locator) {
  const [telechargement] = await Promise.all([page.waitForEvent('download'), declencheur.click()]);
  return lire(telechargement);
}

/** Requêtes d'écriture et d'export envoyées par la page. */
function espionner(page: Page) {
  const vus = { ecritures: [] as string[], exportsImputations: [] as string[] };
  page.on('request', (req) => {
    if (req.method() !== 'GET') vus.ecritures.push(`${req.method()} ${req.url()}`);
    if (req.url().includes('/api/imputations/export')) vus.exportsImputations.push(req.url());
  });
  return vus;
}

test('E2E-383-r1 : Plan de charge, « Exporter CSV » : fichier selon les filtres courants, aucun état modifié', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const alpha = await equipeApi(request, 'Alpha 6F');
  const zeta = await equipeApi(request, 'Zeta 6F');
  const alice = await utilisateurApi(request, 'Alice 6F', 'alice-6f@lot6f.test', alpha);
  const bob = await utilisateurApi(request, 'Bob 6F', 'bob-6f@lot6f.test', zeta);
  // Révision D-163 (2) : calendrier propre (lundi à vendredi, sans férié), jamais le calendrier par défaut.
  const calendrier = await api.calendrier('Cal 383');
  for (const id of [alice, bob]) {
    const r = await request.patch(`/api/utilisateurs/${id}`, {
      data: { calendrier_id: calendrier.id },
    });
    expect(r.ok(), `PATCH calendrier de ${id} : ${r.status()}`).toBeTruthy();
  }

  await loginAsAdmin(page);
  await page.goto(ADRESSE_PLAN);
  await expect(tableauPlan(page)).toBeVisible();
  const vus = espionner(page);

  // Ordre de focus : « Exporter CSV » suit « Mois suivant ».
  await page.getByRole('button', { name: 'Mois suivant', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(exportPlan(page)).toBeFocused();

  const complet = await telecharger(page, exportPlan(page));
  expect(complet.nom).toBe('plan-de-charge-2027-01.csv');
  expect(complet.lignes[0]).toBe(entetePlan(2027, 1));
  expect(complet.lignes).toContain(`Alice 6F;Alpha 6F;Charge;${ZEROS}`);
  expect(complet.lignes).toContain(
    'Alice 6F;Alpha 6F;Disponible;21;20;23;22;21;22;22;22;22;21;22;23',
  );
  expect(complet.lignes).toContain('Bob 6F;Zeta 6F;Écart;21;20;23;22;21;22;22;22;22;21;22;23');
  expect(complet.lignes).toHaveLength(1 + 2 * 3);

  await listeEquipe(page).selectOption({ label: 'Alpha 6F' });
  await page.getByLabel('Mois de départ').fill('2027-05');
  await expect(page).toHaveURL(/[?&]debut=2027-05/);
  await expect(tableauPlan(page).getByRole('columnheader').nth(1)).toHaveText('05/2027');
  const url = page.url();
  const filtre = await telecharger(page, exportPlan(page));
  expect(filtre.nom).toBe('plan-de-charge-2027-05.csv');
  expect(filtre.lignes[0]).toBe(entetePlan(2027, 5));
  expect(filtre.lignes).toContain(
    'Alice 6F;Alpha 6F;Disponible;21;22;22;22;22;21;22;23;21;21;23;20',
  );
  expect(filtre.lignes.some((l) => l.startsWith('Bob 6F;'))).toBe(false);
  expect(page.url()).toBe(url);
  expect(vus.ecritures, 'requêtes d’écriture').toEqual([]);
});

test('E2E-384 : Validation, dialogue « Exporter les imputations » : champs préremplis, téléchargement, focus rendu', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await equipeApi(request, 'Zeta 6F');
  await equipeApi(request, 'Alpha 6F');
  await soumettreAlice(playwright, m);

  await loginAsAdmin(page);
  await ouvrirValidation(page);
  await ouvrirExport(page).click();
  await expect(dialogue(page)).toBeVisible();
  await expect(champDu(page)).toHaveAttribute('type', 'date');
  await expect(champAu(page)).toHaveAttribute('type', 'date');
  await expect(champDu(page)).toHaveValue('2026-01-12');
  await expect(champAu(page)).toHaveValue('2026-01-18');
  expect(await options(dialogue(page).getByLabel('Équipe', { exact: true }))).toEqual([
    'Toutes',
    'Sans équipe',
    'Alpha 6F',
    'Zeta 6F',
  ]);

  const fichier = await telecharger(page, dialogue(page).getByRole('button', { name: 'Exporter' }));
  expect(fichier.nom).toBe('imputations-2026-01-12-2026-01-18.csv');
  expect(fichier.lignes[0]).toBe(ENTETE_IMP);
  expect(fichier.lignes).toContain(
    'Alice 4B;;12/01/2026;Soumise;P4B · Projet P4B;1 Tâche A;12/01/2026;1,5',
  );
  expect(fichier.lignes).toContain(
    'Alice 4B;;12/01/2026;Soumise;Q4B · Projet Q4B;1 Tâche B;13/01/2026;1',
  );
  await expect(dialogue(page)).toHaveCount(0);
  await expect(ouvrirExport(page)).toBeFocused();

  await page.getByRole('button', { name: 'Semaine suivante', exact: true }).click();
  await ouvrirExport(page).click();
  await expect(champDu(page)).toHaveValue('2026-01-19');
  await expect(champAu(page)).toHaveValue('2026-01-25');
});

test('E2E-385 : dialogue d’export : période invalide, 366 jours acceptés, 367 refusés, Échap sans téléchargement', async ({
  page,
  request,
}) => {
  await monde4c(request);
  await loginAsAdmin(page);
  await ouvrirValidation(page);
  const vus = espionner(page);
  await ouvrirExport(page).click();
  const exporter = dialogue(page).getByRole('button', { name: 'Exporter' });
  await expect(exporter).toBeEnabled();
  await expect(dialogue(page).getByText('Période invalide.', { exact: true })).toHaveCount(0);

  await champAu(page).fill('2026-01-11');
  await expect(dialogue(page).getByText('Période invalide.', { exact: true })).toBeVisible();
  await expect(champDu(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(champAu(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(exporter).toBeDisabled();

  await champAu(page).fill('2027-01-13');
  await expect(dialogue(page).getByText('Période invalide.', { exact: true })).toBeVisible();
  await expect(exporter).toBeDisabled();

  await champAu(page).fill('2027-01-12');
  await expect(dialogue(page).getByText('Période invalide.', { exact: true })).toHaveCount(0);
  await expect(champAu(page)).not.toHaveAttribute('aria-invalid', 'true');
  await expect(exporter).toBeEnabled();

  await champAu(page).fill('2026-01-11');
  await page.keyboard.press('Escape');
  await expect(dialogue(page)).toHaveCount(0);
  await expect(ouvrirExport(page)).toBeFocused();
  expect(vus.exportsImputations, 'aucun appel à /api/imputations/export').toEqual([]);
});

test('E2E-386-r1 : chef de projet : « Autres projets » et imputations de son projet seulement ; la ressource n’a aucun export', async ({
  page,
  request,
  playwright,
}) => {
  const m = await monde4c(request);
  await soumettreAlice(playwright, m);

  await connecterAvec(page, EMAIL_CHEF_P);
  await page.goto('/plan-de-charge?debut=2026-01');
  await expect(tableauPlan(page)).toBeVisible();
  const plan = await telecharger(page, exportPlan(page));
  expect(plan.nom).toBe('plan-de-charge-2026-01.csv');
  expect(plan.lignes).toContain('Alice 4B;;P4B · Projet P4B;1,5;0;0;0;0;0;0;0;0;0;0;0');
  expect(plan.lignes).toContain('Alice 4B;;Autres projets;1;0;0;0;0;0;0;0;0;0;0;0');
  expect(plan.lignes).toContain('Alice 4B;;Charge;2,5;0;0;0;0;0;0;0;0;0;0;0');
  expect(plan.lignes.join('\n')).not.toContain('Q4B');

  await ouvrirValidation(page);
  await ouvrirExport(page).click();
  const imputations = await telecharger(
    page,
    dialogue(page).getByRole('button', { name: 'Exporter' }),
  );
  expect(imputations.lignes).toEqual([
    ENTETE_IMP,
    'Alice 4B;;12/01/2026;Soumise;P4B · Projet P4B;1 Tâche A;12/01/2026;1,5',
  ]);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await connecterAvec(page, EMAIL_ALICE);
  for (const adresse of ['/plan-de-charge', '/validation']) {
    await page.goto(adresse);
    await expect(page).toHaveURL(/\/mes-taches/);
    await expect(exportPlan(page)).toHaveCount(0);
  }
});

test('E2E-387-r5 : parcours complet à l’écran (administrateur seul) : entités créées à l’écran, imputation saisie, exports du plan de charge et des imputations', async ({
  page,
}) => {
  const RESSOURCE = 'Ressource 6F';
  const CHEF = 'Chef 6F parcours';
  const EMAIL_RES = 'ressource-6f@lot6f.test';
  const EMAIL_CHEF = 'chef-6f-parcours@lot6f.test';
  const ACTIVITE = '1 Tâche 6F';
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 6F');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 6F/ })).toBeVisible();

  await ouvrirEquipes(page);
  await creerEquipeParEcran(page, 'Équipe 6F');

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const utilisateur = page.getByRole('dialog');
  await utilisateur.getByLabel('Nom').fill(RESSOURCE);
  await utilisateur.getByLabel('Email').fill(EMAIL_RES);
  await utilisateur.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  await utilisateur.getByLabel('Calendrier').selectOption({ label: 'Cal 6F' });
  await utilisateur.getByLabel('Équipe', { exact: true }).selectOption({ label: 'Équipe 6F' });
  await utilisateur.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();

  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const chef = page.getByRole('dialog');
  await chef.getByLabel('Nom').fill(CHEF);
  await chef.getByLabel('Email').fill(EMAIL_CHEF);
  await chef.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  await chef.getByLabel('Rôle').selectOption({ label: 'Chef de projet' });
  await chef.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(CHEF) })).toBeVisible();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('6F');
  await projet.getByLabel('Nom').fill('Projet 6F');
  await projet.getByLabel('Chef de projet').selectOption({ label: CHEF });
  await projet.getByLabel('Pas avant le').fill('2026-01-05');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet 6F/ })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  await connecterAvec(page, EMAIL_CHEF);
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 6F' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 6F', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page.getByRole('dialog').getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 6F');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 6F/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 6F' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await assignation.getByLabel('Charge assignée (j)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Tâche 6F.*${RESSOURCE}`) })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  // La ressource saisit 1 j le lundi 12/01/2026 par l'écran Feuille de temps.
  await connecterAvec(page, EMAIL_RES);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  await caseCharge(page, ACTIVITE, 'lun. 12/01').fill('1');
  await bouton(page, 'Enregistrer').click();
  await expect(statutOk(page, 'Feuille enregistrée.')).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  // Exports à l'écran par l'administrateur.
  await loginAsAdmin(page);
  await allerA(page, 'Pilotage');
  await expect(tableauPlan(page)).toBeVisible();
  const plan = await telecharger(page, exportPlan(page));
  expect(plan.nom).toBe('plan-de-charge-2026-01.csv');
  expect(plan.lignes[0]).toBe(entetePlan(2026, 1));
  expect(plan.lignes, plan.lignes.join('\n')).toContain(
    'Ressource 6F;Équipe 6F;Charge;1;0;0;0;0;0;0;0;0;0;0;0',
  );

  await ouvrirValidationParMenu(page);
  await ouvrirExport(page).click();
  const imputations = await telecharger(
    page,
    dialogue(page).getByRole('button', { name: 'Exporter' }),
  );
  expect(imputations.nom).toBe('imputations-2026-01-12-2026-01-18.csv');
  expect(imputations.lignes).toEqual([
    ENTETE_IMP,
    'Ressource 6F;Équipe 6F;12/01/2026;Brouillon;6F · Projet 6F;1 Tâche 6F;12/01/2026;1',
  ]);
});
