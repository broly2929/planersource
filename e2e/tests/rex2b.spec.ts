// Lot correctif REX-2, tranche R2-B (D-078) : formulaire projet.
// E2E-75 à E2E-78. Base « administrateur seul », horloge du navigateur figée au 06/01/2027.
import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
import { loginAsAdmin } from './helpers.js';
import { preparer } from './lot1-helpers.js';

const NOM_ADMIN_E2E = 'Admin E2E';
const J06 = '2027-01-06T10:00:00';

/** Remet la base dans l'état « administrateur seul », par le nom. Refuse toute base hors *_test. */
async function remettreAdminSeul(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE projet, historique RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM utilisateur WHERE nom <> $1', [NOM_ADMIN_E2E]);
    await client.query('DELETE FROM calendrier WHERE NOT est_defaut');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul);

async function allerA(page: Page, lien: string): Promise<void> {
  await page.getByRole('link', { name: lien, exact: true }).click();
  await expect(page.getByRole('heading', { name: lien, level: 1 })).toBeVisible();
}

interface ProjetApi {
  id: number;
  code: string;
  chef_id: number;
  date_debut: string;
  debut_planifie: string | null;
}

async function projetsApi(page: Page): Promise<ProjetApi[]> {
  const r = await page.request.get('/api/projets');
  expect(r.ok()).toBeTruthy();
  return (await r.json()) as ProjetApi[];
}

/** Cellule d'un tableau, repérée par le titre de sa colonne. */
async function cellule(page: Page, ligne: string, colonne: string) {
  await expect(page.getByRole('row', { name: new RegExp(ligne) })).toBeVisible();
  const entetes = (await page.getByRole('columnheader').allTextContents()).map((t) => t.trim());
  const i = entetes.indexOf(colonne);
  expect(
    i,
    `colonne « ${colonne} » absente (colonnes : ${entetes.join(', ')})`,
  ).toBeGreaterThanOrEqual(0);
  return page
    .getByRole('row', { name: new RegExp(ligne) })
    .getByRole('cell')
    .nth(i);
}

test('E2E-75 « Nouveau projet » : « Pas avant le » prérempli à la date du jour, chef « Moi (par défaut) », création avec code et nom seuls', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Pas avant le')).toHaveValue('2027-01-06');
  await expect(dialog.getByLabel('Date de début')).toHaveCount(0);
  const chef = dialog.getByLabel('Chef de projet');
  await expect(chef.locator('option:checked')).toHaveText('Moi (par défaut)');

  await dialog.getByLabel('Code').fill('R2B-75');
  await dialog.getByLabel('Nom').fill('Projet R2B-75');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('row', { name: /R2B-75.*Projet R2B-75.*Admin E2E/ })).toBeVisible();
  const admin = await (await page.request.get('/api/auth/me')).json();
  const projet = (await projetsApi(page)).find((p) => p.code === 'R2B-75');
  expect(projet?.date_debut).toBe('2027-01-06');
  expect(projet?.chef_id).toBe(admin.id);
});

test('E2E-76 liste Projets : colonne « Début » = « — » avant calcul, puis le début calculé', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await (await request.get('/api/auth/me')).json();
  const ressource = await api.utilisateur(
    'Ressource R2B-76',
    'r2b-76@rex2b.test',
    'ressource',
    true,
  );
  const projet = await api.projet('R2B-76', 'Projet R2B-76', admin.id);
  await api.affectation(projet.id, ressource.id);
  const activite = await api.activite(projet.id, 'Activité R2B-76');
  await api.assignation(activite.id, ressource.id, 2);

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await expect(await cellule(page, 'R2B-76', 'Début')).toHaveText('—');

  const calcul = await request.post('/api/calcul', {
    data: { projets: [projet.id], d0: '2027-01-06' },
  });
  expect(calcul.ok(), await calcul.text()).toBeTruthy();
  const relu = (await projetsApi(page)).find((p) => p.code === 'R2B-76');
  expect(relu?.debut_planifie).toBeTruthy();
  expect(relu?.debut_planifie).not.toBe('2027-01-04');

  await page.reload();
  await expect(await cellule(page, 'R2B-76', 'Début')).toHaveText(relu!.debut_planifie!);
});

test('E2E-77 « Modifier le projet » : « Pas avant le » pour un projet ordinaire, « Date de début » pour un modèle, une création de modèle et une copie', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await (await request.get('/api/auth/me')).json();
  await api.projet('R2B-77', 'Projet R2B-77', admin.id);
  await api.modele('MOD-R2B77', 'Modèle R2B-77');

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet R2B-77' }).click();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Pas avant le')).toHaveValue('2027-01-04');
  await expect(dialog.getByLabel('Date de début')).toHaveCount(0);
  await dialog.getByLabel('Pas avant le').fill('2027-03-01');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  await expect(page.getByRole('dialog').getByLabel('Pas avant le')).toHaveValue('2027-03-01');
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();

  await allerA(page, 'Modèles');
  await page.getByRole('button', { name: 'Modifier Modèle R2B-77', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Date de début')).toHaveValue('2027-01-04');
  await expect(dialog.getByLabel('Pas avant le')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Annuler' }).click();

  await page.getByRole('button', { name: 'Nouveau modèle' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Date de début')).toBeVisible();
  await expect(dialog.getByLabel('Pas avant le')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Annuler' }).click();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Copier Projet R2B-77', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Date de début')).toBeVisible();
  await expect(dialog.getByLabel('Pas avant le')).toHaveCount(0);
});

test('E2E-78 écran Modèles : « Créer un projet depuis <nom> » affiche « Créer un projet » et ouvre le dialogue de création', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.modele('MOD-R2B78', 'Modèle R2B-78');

  await loginAsAdmin(page);
  await allerA(page, 'Modèles');
  const bouton = page.getByRole('button', {
    name: 'Créer un projet depuis Modèle R2B-78',
    exact: true,
  });
  await expect(bouton).toHaveText('Créer un projet');
  await bouton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('Code')).toBeVisible();
});
