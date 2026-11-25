// Gantt global sur Accueil, tranche G2 (D-080, D-081) : E2E-86 à E2E-92.
// Base « administrateur seul », horloge du navigateur figée au 06/01/2027. Données par l'API, lecture à l'écran.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import pg from 'pg';
import { loginAsAdmin } from './helpers.js';
import { colonnesCompletes } from './colonnes-completes.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';
import { activiteAvec, calculer, sousProjet } from './lot3b-helpers.js';
import { replierTout } from './retouches-rex6-helpers.js';

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

/** Clôt un projet en SQL, sans contrôle de l'API (donnée incohérente, D-083 (10)). */
async function clore(projetId: number): Promise<void> {
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query('UPDATE projet SET clos = true WHERE id = $1', [projetId]);
  } finally {
    await client.end();
  }
}

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul);

type Api = Awaited<ReturnType<typeof preparer>>;

async function adminId(request: APIRequestContext): Promise<number> {
  return ((await (await request.get('/api/auth/me')).json()) as { id: number }).id;
}

/** Projet avec une activité assignée à `ressourceId`, pour avoir des dates planifiées après calcul. */
async function projetAvecActivite(
  api: Api,
  request: APIRequestContext,
  code: string,
  nom: string,
  chef: number,
  ressourceId: number,
): Promise<number> {
  const p = await api.projet(code, nom, chef);
  await api.affectation(p.id, ressourceId);
  const a = await activiteAvec(request, p.id, `Activité ${code}`);
  await api.assignation(a.id, ressourceId, 5);
  return p.id;
}

const zoneTableau = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });
const zoneCalendrier = (page: Page) =>
  page.getByRole('region', { name: 'Calendrier du Gantt global', exact: true });

/** Codes affichés, dans l'ordre des lignes du corps du tableau (première colonne). */
async function codesAffiches(page: Page): Promise<string[]> {
  return zoneTableau(page).locator('tbody tr td:first-child').allInnerTexts();
}

/** « 2027-01-04 » → « 04/01/2027 ». */
const jjmmaaaa = (iso: string) => iso.split('-').reverse().join('/');

interface ProjetApi {
  id: number;
  code: string;
  debut_planifie: string | null;
  fin_planifiee: string | null;
}

test('E2E-86-r1 racines triées par code ; sous-projets, projet clos, sa descendance et modèle absents ; lien vers la fiche', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await adminId(request);
  await api.projet('R-b', 'Projet bravo86', admin);
  const a = await api.projet('R-A', 'Projet alpha86', admin);
  await api.projet('R-c', 'Projet charlie86', admin);
  await sousProjet(request, a.id, 'S-A', 'Sous alpha86', admin);
  const clos = await api.projet('R-CLOS', 'Projet clos86', admin);
  await sousProjet(request, clos.id, 'S-CLOS', 'Sous clos86', admin);
  // D-083 (10), E2E-86-r3 : projet clos avec un sous-projet ouvert = donnée incohérente, que
  // l'API refuse (D-083 (1)) ; posée en SQL. L'intention de D-081 est gardée.
  await clore(clos.id);
  await api.modele('MOD-86', 'Modèle86');

  await loginAsAdmin(page);
  await expect(page.getByText('Connecté en tant que')).toBeVisible();
  await expect(zoneTableau(page)).toBeVisible();
  await replierTout(page); // D-218 (4), (9)
  expect(await codesAffiches(page)).toEqual(['R-A', 'R-b', 'R-c']);
  for (const absent of ['Sous alpha86', 'Projet clos86', 'Sous clos86', 'Modèle86']) {
    await expect(page.getByText(absent)).toHaveCount(0);
  }
  // Révision G3 (D-031) : « Déplier » arrive en G3. Révision G4 (D-031, -r2) : « Calculer » est visible de
  // l'administrateur.
  await expect(page.getByRole('button', { name: /^Déplier / })).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Calculer', exact: true })).toHaveCount(1);

  const lien = zoneTableau(page).getByRole('link', { name: 'Projet alpha86', exact: true });
  await lien.click();
  await expect(page).toHaveURL(`/projets/${a.id}`);
});

test('E2E-87-r2 colonnes, dates, barres de synthèse et trait du jour', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const api = await preparer(request);
  const admin = await adminId(request);
  const res = await api.utilisateur('Ressource87', 'r87@g2.test', 'ressource', true);
  const p1 = await projetAvecActivite(api, request, 'P87-1', 'Premier87', admin, res.id);
  const p2 = await projetAvecActivite(api, request, 'P87-2', 'Second87', admin, res.id);
  await calculer(request, [p1, p2]);
  const projets = (await (await request.get('/api/projets')).json()) as ProjetApi[];

  await loginAsAdmin(page);
  const zone = zoneTableau(page);
  await expect(zone.getByRole('columnheader')).toHaveText([
    'Code',
    'Nom',
    'Début',
    'Fin',
    'Ressources',
    'Drapeaux',
  ]);
  for (const code of ['P87-1', 'P87-2']) {
    const p = projets.find((x) => x.code === code)!;
    expect(p.debut_planifie && p.fin_planifiee).toBeTruthy();
    const debut = jjmmaaaa(p.debut_planifie!);
    const fin = jjmmaaaa(p.fin_planifiee!);
    const ligne = zone.getByRole('row').filter({ hasText: code });
    await expect(ligne.getByRole('cell').nth(2)).toHaveText(debut);
    await expect(ligne.getByRole('cell').nth(3)).toHaveText(fin);
    await expect(ligne.getByRole('cell').nth(4)).toHaveText('');
    const nom = code === 'P87-1' ? 'Premier87' : 'Second87';
    const barre = zoneCalendrier(page).getByRole('img', {
      name: `${nom}, du ${debut} au ${fin}`,
      exact: true,
    });
    await expect(barre).toHaveCount(1);
    await expect(barre).toHaveAttribute('data-projet-id', String(p.id));
  }
  await expect(zoneCalendrier(page).locator('svg [data-projet-id]')).toHaveCount(2);
  await expect(zoneCalendrier(page).locator('[data-aujourdhui]')).toHaveAttribute(
    'data-aujourdhui',
    '2027-01-06',
  );
});

test('E2E-88 zoom dans l’adresse, conservé au rechargement, valeur inconnue = semaine', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.projet('P88', 'Projet88', await adminId(request));
  await loginAsAdmin(page);
  const svg = page.locator('svg[data-zoom]');
  await expect(svg).toHaveAttribute('data-zoom', 'semaine');
  await page.getByRole('button', { name: 'Jour', exact: true }).click();
  await expect(page).toHaveURL('/?zoom=jour');
  await expect(svg).toHaveAttribute('data-zoom', 'jour');
  await page.reload();
  await expect(page.locator('svg[data-zoom]')).toHaveAttribute('data-zoom', 'jour');
  await page.goto('/?zoom=xyz');
  await expect(page.locator('svg[data-zoom]')).toHaveAttribute('data-zoom', 'semaine');
});

test('E2E-89 base « administrateur seul » : état vide', async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByText('Connecté en tant que')).toBeVisible();
  await expect(page.getByText('Aucun projet à afficher.')).toBeVisible();
  await expect(zoneTableau(page)).toHaveCount(0);
  await expect(page.locator('svg[data-zoom]')).toHaveCount(0);
});

test('E2E-90-r1 projets non calculés : bandeau, lignes visibles, aucune barre', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await adminId(request);
  await api.projet('P90-1', 'Projet90 un', admin);
  await api.projet('P90-2', 'Projet90 deux', admin);
  await loginAsAdmin(page);
  const bandeau = page.getByRole('status').filter({ hasText: 'Planning non calculé' });
  await expect(bandeau).toBeVisible();
  await replierTout(page); // D-218 (4), (9)
  expect(await codesAffiches(page)).toEqual(['P90-1', 'P90-2']);
  const ligne = zoneTableau(page).getByRole('row').filter({ hasText: 'P90-1' });
  await expect(ligne.getByRole('cell').nth(2)).toHaveText('—');
  await expect(ligne.getByRole('cell').nth(3)).toHaveText('—');
  await expect(zoneCalendrier(page).getByRole('img')).toHaveCount(0);
});

test('E2E-91-r2 chef affecté à un sous-projet seulement (lecture seule) : il est affiché comme racine, sans bouton', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await adminId(request);
  const ressource = await api.utilisateur('Ressource91', 'r91@g2.test', 'ressource', true);
  const parent = await api.projet('P91', 'Parent91', admin);
  const sous = await sousProjet(request, parent.id, 'S91', 'Sous91', admin);
  await api.affectation(sous.id, ressource.id);

  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, sous.id, 'E91'));
  await replierTout(page); // D-218 (4), (9)
  expect(await codesAffiches(page)).toEqual(['S91']);
  await expect(page.getByText('Parent91')).toHaveCount(0);
  // Révision G3 (D-031) : « Déplier » arrive en G3 ; « Calculer » reste absent (ressource, et G4).
  await expect(page.getByRole('button', { name: 'Déplier Sous91', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Calculer' })).toHaveCount(0);
  await expect(zoneTableau(page).getByRole('link', { name: 'Sous91' })).toHaveAttribute(
    'href',
    `/projets/${sous.id}`,
  );
});

test('E2E-92-r10 zones focalisables nommées et ordre de tabulation', async ({ page, request }) => {
  await colonnesCompletes(page);
  const api = await preparer(request);
  await api.projet('P92', 'Projet92', await adminId(request));
  await loginAsAdmin(page);
  await replierTout(page); // D-218 (4), (9)
  await expect(zoneTableau(page)).toHaveAttribute('tabindex', '0');
  await expect(zoneCalendrier(page)).toHaveAttribute('tabindex', '0');

  await page.getByRole('button', { name: 'Jour', exact: true }).focus();
  const libelle = () =>
    page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      const caseCochable = e as HTMLInputElement | null;
      return (
        e?.getAttribute('aria-label') ??
        (e?.textContent?.trim() || caseCochable?.labels?.[0]?.textContent?.trim()) ??
        ''
      );
    });
  // Révision -r4 (D-031, D-091) : la case « Initiales » s'insère après « Mois ».
  const ordre: string[] = [await libelle()];
  // Révision G3 (D-031) : « Tout déplier » et le bouton « Déplier » s'insèrent dans l'ordre.
  // Révision G4 (D-031, -r3) : « Calculer » s'insère entre le zoom et « Tout déplier ».
  // Révision -r5 (D-031, D-127 (6), (7)) : le crayon « Modifier le projet <nom> » suit le lien du projet.
  // Révision D-213 : le séparateur « Largeur du tableau » précède la zone du calendrier.
  // Révision -r7 (D-216 (3)) : « Colonnes » après « Initiales » ; poignées de largeur des colonnes après la zone
  // du tableau, dans l'ordre des en-têtes, avant le contenu des lignes.
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    ordre.push(await libelle());
  }
  expect(ordre).toEqual([
    'Jour',
    'Semaine',
    'Mois',
    'Initiales',
    'Colonnes',
    'Calculer',
    'Tout déplier',
    'Tableau du Gantt global',
    'Largeur de la colonne Code',
    'Largeur de la colonne Nom',
    'Largeur de la colonne Début',
    'Largeur de la colonne Fin',
    'Largeur de la colonne Ressources',
    'Largeur de la colonne Drapeaux',
    'Déplier Projet92',
    'Projet92',
    'Modifier le projet Projet92',
    'Largeur du tableau',
    'Calendrier du Gantt global',
  ]);
});
