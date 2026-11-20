// Lot correctif REX-2, tranche R2-C (D-079) : arborescence de l'écran Projets et « Projet parent ».
// E2E-79 à E2E-85. Base « administrateur seul », horloge du navigateur figée au 06/01/2027.
import { expect, test, type Locator, type Page } from '@playwright/test';
import pg from 'pg';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec, jalonAvec, sousProjet } from './lot3b-helpers.js';

const NOM_ADMIN_E2E = 'Admin E2E';
const J06 = '2027-01-06T10:00:00';
const AUCUN = 'Aucun (projet racine)';

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
  parent_id: number | null;
}

async function projetsApi(page: Page): Promise<ProjetApi[]> {
  const r = await page.request.get('/api/projets');
  expect(r.ok()).toBeTruthy();
  return (await r.json()) as ProjetApi[];
}

async function parentDe(page: Page, code: string): Promise<number | null | undefined> {
  return (await projetsApi(page)).find((p) => p.code === code)?.parent_id;
}

/** Ligne du tableau dont le texte contient `nom` (noms de test uniques, jamais préfixes l'un de l'autre). */
const ligne = (page: Page, nom: string): Locator => page.getByRole('row').filter({ hasText: nom });

/** Abscisse du nom d'une ligne (lien pour un projet, texte pour un élément). */
async function abscisseNom(page: Page, nom: string): Promise<number> {
  const l = ligne(page, nom);
  const lien = l.getByRole('link', { name: nom, exact: true });
  const cible = (await lien.count()) > 0 ? lien : l.getByText(nom, { exact: true });
  const boite = await cible.first().boundingBox();
  expect(boite, `nom « ${nom} » sans boîte`).not.toBeNull();
  return boite!.x;
}

async function cellule(page: Page, nom: string, colonne: string): Promise<Locator> {
  const entetes = (await page.getByRole('columnheader').allTextContents()).map((t) => t.trim());
  const i = entetes.indexOf(colonne);
  expect(
    i,
    `colonne « ${colonne} » absente (colonnes : ${entetes.join(', ')})`,
  ).toBeGreaterThanOrEqual(0);
  return ligne(page, nom).getByRole('cell').nth(i);
}

/** Création d'un projet par l'écran, avec « Projet parent » facultatif (administrateur connecté). */
async function creerParEcran(
  page: Page,
  code: string,
  nom: string,
  parent?: string,
): Promise<void> {
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill(code);
  await dialog.getByLabel('Nom').fill(nom);
  if (parent) await dialog.getByLabel('Projet parent').selectOption({ label: parent });
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(dialog).toBeHidden();
}

async function optionsParent(dialog: Locator): Promise<string[]> {
  return (await dialog.getByLabel('Projet parent').locator('option').allTextContents()).map((t) =>
    t.trim(),
  );
}

async function ouvrirModification(page: Page, nom: string): Promise<Locator> {
  await page.getByRole('button', { name: `Modifier ${nom}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test('E2E-79 parcours à l’écran : A, B (parent A), C (parent B) créés par l’écran, arbre replié puis déplié', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await creerParEcran(page, 'A79', 'Alpha79');
  await creerParEcran(page, 'B79', 'Beta79', 'A79 — Alpha79');
  await creerParEcran(page, 'C79', 'Gamma79', 'B79 — Beta79');

  await expect(ligne(page, 'Alpha79')).toBeVisible();
  await expect(ligne(page, 'Beta79')).toHaveCount(0);
  await expect(ligne(page, 'Gamma79')).toHaveCount(0);

  const deplierA = page.getByRole('button', { name: 'Déplier Alpha79', exact: true });
  await expect(deplierA).toHaveAttribute('aria-expanded', 'false');
  await deplierA.click();
  await expect(ligne(page, 'Beta79')).toBeVisible();
  await expect
    .poll(async () => (await abscisseNom(page, 'Beta79')) - (await abscisseNom(page, 'Alpha79')))
    .toBeGreaterThan(0);
  await expect(ligne(page, 'Gamma79')).toHaveCount(0);

  await page.getByRole('button', { name: 'Déplier Beta79', exact: true }).click();
  await expect(ligne(page, 'Gamma79')).toBeVisible();
  await expect
    .poll(async () => (await abscisseNom(page, 'Gamma79')) - (await abscisseNom(page, 'Beta79')))
    .toBeGreaterThan(0);

  const projets = await projetsApi(page);
  const id = (code: string) => projets.find((p) => p.code === code)?.id;
  expect(projets.find((p) => p.code === 'A79')?.parent_id).toBeNull();
  expect(projets.find((p) => p.code === 'B79')?.parent_id).toBe(id('A79'));
  expect(projets.find((p) => p.code === 'C79')?.parent_id).toBe(id('B79'));
});

test('E2E-80 arbre : éléments en ordre WBS puis sous-projet, lecture seule, badge « Jalon », Début relu', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await (await request.get('/api/auth/me')).json();
  const ressource = await api.utilisateur('Ressource E80', 'r-e80@rex2c.test', 'ressource', true);
  const p = await api.projet('P80', 'Projet P80', admin.id);
  await api.affectation(p.id, ressource.id);
  const parente = await activiteAvec(request, p.id, 'Parente E80');
  const fille = await activiteAvec(request, p.id, 'Fille E80', { parent_id: parente.id });
  await api.assignation(fille.id, ressource.id, 2);
  await jalonAvec(request, p.id, 'Livraison E80');
  await sousProjet(request, p.id, 'S80', 'Sous-projet S80', admin.id);
  const calcul = await request.post('/api/calcul', { data: { projets: [p.id], d0: '2027-01-06' } });
  expect(calcul.ok(), await calcul.text()).toBeTruthy();
  const gantt = (await (await request.get(`/api/projets/${p.id}/gantt`)).json()) as {
    elements: { id: number; wbs: string; nom: string; debut_planifie?: string | null }[];
  };
  const filleApi = gantt.elements.find((e) => e.id === fille.id);
  expect(filleApi?.debut_planifie).toBeTruthy();

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await expect(ligne(page, 'Projet P80')).toBeVisible();
  for (const nom of ['Parente E80', 'Fille E80', 'Livraison E80', 'Sous-projet S80']) {
    await expect(ligne(page, nom)).toHaveCount(0);
  }

  await page.getByRole('button', { name: 'Déplier Projet P80', exact: true }).click();
  const noms = ['Projet P80', 'Parente E80', 'Fille E80', 'Livraison E80', 'Sous-projet S80'];
  for (const nom of noms) await expect(ligne(page, nom)).toBeVisible();
  const textes = await page.getByRole('row').allTextContents();
  const positions = noms.map((nom) => textes.findIndex((t) => t.includes(nom)));
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(new Set(positions).size).toBe(noms.length);

  // Éléments : numéro WBS en Code, indentation, lecture seule.
  for (const e of gantt.elements) {
    const l = ligne(page, e.nom);
    await expect(l.getByRole('cell').first()).toHaveText(e.wbs);
    await expect(l.getByRole('link')).toHaveCount(0);
    await expect(l.getByRole('button')).toHaveCount(0);
  }
  expect(await abscisseNom(page, 'Fille E80')).toBeGreaterThan(
    await abscisseNom(page, 'Parente E80'),
  );
  await expect(ligne(page, 'Livraison E80').getByText('Jalon', { exact: true })).toBeVisible();
  await expect(ligne(page, 'Fille E80').getByText('Jalon', { exact: true })).toHaveCount(0);
  await expect(await cellule(page, 'Fille E80', 'Début')).toHaveText(filleApi!.debut_planifie!);
  await expect(page.getByRole('link', { name: 'Sous-projet S80', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Replier Projet P80', exact: true }).click();
  for (const nom of noms.slice(1)) await expect(ligne(page, nom)).toHaveCount(0);
});

test('E2E-81 « Tout déplier » puis « Tout replier » : deux racines et un sous-sous-projet', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await (await request.get('/api/auth/me')).json();
  const r1 = await api.projet('R81-1', 'Racine un81', admin.id);
  await api.projet('R81-2', 'Racine deux81', admin.id);
  const s1 = await sousProjet(request, r1.id, 'S81', 'Sous un81', admin.id);
  await sousProjet(request, s1.id, 'SS81', 'Petit-fils un81', admin.id);

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await expect(ligne(page, 'Racine un81')).toBeVisible();
  await expect(ligne(page, 'Sous un81')).toHaveCount(0);

  await page.getByRole('button', { name: 'Tout déplier', exact: true }).click();
  for (const nom of ['Racine un81', 'Racine deux81', 'Sous un81', 'Petit-fils un81']) {
    await expect(ligne(page, nom)).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Tout replier', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tout déplier', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Tout replier', exact: true }).click();
  await expect(ligne(page, 'Racine un81')).toBeVisible();
  await expect(ligne(page, 'Racine deux81')).toBeVisible();
  await expect(ligne(page, 'Sous un81')).toHaveCount(0);
  await expect(ligne(page, 'Petit-fils un81')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tout déplier', exact: true })).toBeVisible();
});

test('E2E-82 « Modifier le projet » : parent proposé sans le projet ni ses descendants, rattachement puis retour à la racine', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await (await request.get('/api/auth/me')).json();
  const a = await api.projet('A82', 'Alpha82', admin.id);
  await sousProjet(request, a.id, 'B82', 'Beta82', admin.id);
  const c = await api.projet('C82', 'Gamma82', admin.id);

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  let dialog = await ouvrirModification(page, 'Alpha82');
  const options = await optionsParent(dialog);
  expect(options[0]).toBe(AUCUN);
  expect(options).toContain('C82 — Gamma82');
  expect(options).not.toContain('A82 — Alpha82');
  expect(options).not.toContain('B82 — Beta82');
  await dialog.getByLabel('Projet parent').selectOption({ label: 'C82 — Gamma82' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();

  // Arbre à jour : Alpha82 n'est plus une racine, il est sous Gamma82.
  await expect(ligne(page, 'Gamma82')).toBeVisible();
  await expect(ligne(page, 'Alpha82')).toHaveCount(0);
  expect(await parentDe(page, 'A82')).toBe(c.id);
  await page.getByRole('button', { name: 'Déplier Gamma82', exact: true }).click();
  await expect(ligne(page, 'Alpha82')).toBeVisible();

  dialog = await ouvrirModification(page, 'Alpha82');
  await dialog.getByLabel('Projet parent').selectOption({ label: AUCUN });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  expect(await parentDe(page, 'A82')).toBeNull();
  await page.getByRole('button', { name: 'Replier Gamma82', exact: true }).click();
  await expect(ligne(page, 'Alpha82')).toBeVisible();
});

test('E2E-83 chef : « Projet parent » limité à ses projets ; ressource : sous-projet affiché comme racine, lecture seule', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await (await request.get('/api/auth/me')).json();
  const chef = await api.utilisateur('Chef E83', 'chef-e83@rex2c.test', 'chef_de_projet');
  const ressource = await api.utilisateur('Ressource E83', 'r-e83@rex2c.test', 'ressource', true);
  await api.projet('P83-CHEF', 'Projet du chef83', chef.id);
  const autre = await api.projet('P83-AUTRE', 'Projet autre83', admin.id);
  const sous = await sousProjet(request, autre.id, 'S83', 'Sous-projet S83', admin.id);
  await api.affectation(sous.id, ressource.id);
  await activiteAvec(request, sous.id, 'Activité E83');

  await connecterAvec(page, 'chef-e83@rex2c.test');
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  expect(await optionsParent(page.getByRole('dialog'))).toEqual([
    AUCUN,
    'P83-CHEF — Projet du chef83',
  ]);

  await page.context().clearCookies();
  await connecterAvec(page, 'r-e83@rex2c.test');
  await allerA(page, 'Projets');
  await expect(ligne(page, 'Sous-projet S83')).toBeVisible();
  await expect(ligne(page, 'Projet autre83')).toHaveCount(0);
  await page.getByRole('button', { name: 'Déplier Sous-projet S83', exact: true }).click();
  await expect(ligne(page, 'Activité E83')).toBeVisible();
  await expect(page.getByRole('button', { name: /Modifier|Copier/ })).toHaveCount(0);
});

test('E2E-84 refus 422 du projet parent : message en alerte, dialogue ouvert, parent inchangé', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await (await request.get('/api/auth/me')).json();
  await api.projet('A84', 'Alpha84', admin.id);
  await api.projet('B84', 'Beta84', admin.id);

  await page.route('**/api/projets/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          erreur: 'Arborescence de projets invalide',
          code: 'arborescence_invalide',
        }),
      });
    } else {
      await route.continue();
    }
  });
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  const dialog = await ouvrirModification(page, 'Beta84');
  await dialog.getByLabel('Projet parent').selectOption({ label: 'A84 — Alpha84' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Ce projet parent n’est pas possible.');
  await expect(dialog).toBeVisible();
  expect(await parentDe(page, 'B84')).toBeNull();
});

test('E2E-85 projet vide : « Aucune activité ni jalon. » ; échec de chargement : message, le reste de l’arbre demeure', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await (await request.get('/api/auth/me')).json();
  await api.projet('A85', 'Alpha85', admin.id);
  const b = await api.projet('B85', 'Beta85', admin.id);

  await page.route(`**/api/projets/${b.id}/gantt`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"erreur":"boum"}' }),
  );
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Déplier Alpha85', exact: true }).click();
  await expect(page.getByText('Aucune activité ni jalon.')).toBeVisible();

  await page.getByRole('button', { name: 'Déplier Beta85', exact: true }).click();
  await expect(page.getByText('Impossible de charger le contenu du projet.')).toBeVisible();
  await expect(ligne(page, 'Alpha85')).toBeVisible();
  await expect(ligne(page, 'Beta85')).toBeVisible();
  await expect(page.getByText('Aucune activité ni jalon.')).toBeVisible();
});
