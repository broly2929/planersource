// Lot 3d-1 (D-088 (2)) : initiales des ressources à droite des barres du Gantt. E2E-125 à E2E-131.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, D0 des calculs 2027-01-04. Attributs et textes seulement, jamais de pixels.
// Contrat : texte SVG `text[data-initiales-element="<id>"]` ; case à cocher « Initiales » ; adresse `initiales=1`.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { MOT_DE_PASSE, preparer } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b } from './lot3b-helpers.js';
import {
  allerA,
  creerProjetParEcran,
  dialogueCalcul,
  notification,
  ouvrirCalendriers,
  remettreAdminSeul,
} from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom?: string) =>
  `/projets/${projetId}?onglet=gantt${zoom ? `&zoom=${zoom}` : ''}`;
const caseInitiales = (page: Page) =>
  page.getByRole('checkbox', { name: 'Initiales', exact: true });
const textes = (page: Page) => page.locator('svg text[data-initiales-element]');
const texteDe = (page: Page, id: number) =>
  page.locator(`svg text[data-initiales-element="${id}"]`);
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);

async function fixerInitiales(request: APIRequestContext, id: number, initiales: string) {
  const r = await request.patch(`/api/utilisateurs/${id}`, { data: { initiales } });
  expect(r.ok(), `PATCH utilisateur ${id} : ${r.status()}`).toBeTruthy();
}

/** Activité « A » assignée à Alice (« AB ») puis Bob (« CD »), calculée : 04/01 → 06/01/2027. */
async function baseAB(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob']);
  await fixerInitiales(request, m.gens.Alice!.id, 'AB');
  await fixerInitiales(request, m.gens.Bob!.id, 'CD');
  const a = await activiteAvec(request, m.projet.id, 'A');
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await m.api.assignation(a.id, m.gens.Bob!.id, 3);
  await calculer(request, [m.projet.id]);
  return { ...m, a };
}

test('E2E-125 : case « Initiales » décochée par défaut ; cochée, texte « AB, CD » rattaché à la barre, adresse initiales=1, nom accessible inchangé', async ({
  page,
  request,
}) => {
  const m = await baseAB(request, 'E2E125');
  await loginAsAdmin(page);
  await page.goto(gantt(m.projet.id));

  await expect(barre(page, m.a.id)).toHaveCount(1);
  await expect(caseInitiales(page)).not.toBeChecked();
  await expect(textes(page)).toHaveCount(0);

  await caseInitiales(page).check();
  await expect(page).toHaveURL(/initiales=1/);
  await expect(textes(page)).toHaveCount(1);
  await expect(texteDe(page, m.a.id)).toHaveText('AB, CD');
  await expect(
    page.getByRole('img', { name: 'A, du 04/01/2027 au 06/01/2027', exact: true }),
  ).toHaveCount(1);
});

test('E2E-126 : état conservé au rechargement et au changement de zoom ; zoom conservé au décochage', async ({
  page,
  request,
}) => {
  const m = await baseAB(request, 'E2E126');
  await loginAsAdmin(page);
  await page.goto(gantt(m.projet.id));
  await caseInitiales(page).check();
  await expect(texteDe(page, m.a.id)).toHaveText('AB, CD');

  await page.reload();
  await expect(caseInitiales(page)).toBeChecked();
  await expect(texteDe(page, m.a.id)).toHaveText('AB, CD');

  await page.getByRole('button', { name: 'Jour', exact: true }).click();
  await expect(page).toHaveURL(/zoom=jour/);
  await expect(page).toHaveURL(/initiales=1/);
  await expect(page.locator('svg[data-zoom="jour"]')).toHaveCount(1);
  await expect(texteDe(page, m.a.id)).toHaveText('AB, CD');

  await caseInitiales(page).uncheck();
  await expect(page).toHaveURL(/zoom=jour/);
  await expect(page).not.toHaveURL(/initiales/);
  await expect(page.locator('svg[data-zoom="jour"]')).toHaveCount(1);
  await expect(textes(page)).toHaveCount(0);
});

test('E2E-127 : ressource sans initiales, feuille sans assignation, jalon, parent : aucun texte', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E127', ['Alice', 'Bob']);
  await fixerInitiales(request, m.gens.Alice!.id, 'AB');
  const parent = await activiteAvec(request, m.projet.id, 'Parent');
  const enfant = await activiteAvec(request, m.projet.id, 'Enfant', { parent_id: parent.id });
  const sansInitiales = await activiteAvec(request, m.projet.id, 'SansInitiales');
  const libre = await activiteAvec(request, m.projet.id, 'Libre');
  const jalon = await jalonAvec(request, m.projet.id, 'Jalon', {
    type: 'fixe',
    date_validee: '2027-01-06',
  });
  await m.api.assignation(enfant.id, m.gens.Alice!.id, 3);
  await m.api.assignation(sansInitiales.id, m.gens.Bob!.id, 2);
  await calculer(request, [m.projet.id]);

  await loginAsAdmin(page);
  await page.goto(gantt(m.projet.id));
  await caseInitiales(page).check();
  await expect(texteDe(page, enfant.id)).toHaveText('AB');
  await expect(textes(page)).toHaveCount(1);
  for (const e of [parent, sansInitiales, libre, jalon]) {
    await expect(texteDe(page, e.id)).toHaveCount(0);
  }
  await expect(barre(page, parent.id)).toHaveCount(1);
  await expect(barre(page, jalon.id)).toHaveCount(1);
});

test('E2E-128 : activité non calculée (sans dates planifiées) : aucun texte ; l’activité calculée garde le sien', async ({
  page,
  request,
}) => {
  const m = await baseAB(request, 'E2E128');
  const neuve = await activiteAvec(request, m.projet.id, 'Neuve');
  await m.api.assignation(neuve.id, m.gens.Alice!.id, 2);

  await loginAsAdmin(page);
  await page.goto(gantt(m.projet.id));
  await caseInitiales(page).check();
  await expect(texteDe(page, m.a.id)).toHaveText('AB, CD');
  await expect(barre(page, neuve.id)).toHaveCount(0);
  await expect(texteDe(page, neuve.id)).toHaveCount(0);
  await expect(textes(page)).toHaveCount(1);
});

test('E2E-129-r1 : Accueil : case « Initiales » cochée par défaut, texte visible sur le projet déplié, adresse initiales=0 une fois décochée, conservé au rechargement', async ({
  page,
  request,
}) => {
  // D-218 (4) : sur l'Accueil, projets dépliés et initiales affichées par défaut.
  const m = await baseAB(request, 'E2E129');
  await loginAsAdmin(page);
  await page.goto('/');
  await expect(caseInitiales(page)).toBeChecked();
  await expect(texteDe(page, m.a.id)).toHaveText('AB, CD');

  await caseInitiales(page).uncheck();
  await expect(page).toHaveURL(/initiales=0/);
  await expect(textes(page)).toHaveCount(0);

  await page.reload();
  await expect(caseInitiales(page)).not.toBeChecked();
  await expect(
    page.getByRole('button', { name: 'Replier Projet E2E129', exact: true }),
  ).toBeVisible();
  await expect(textes(page)).toHaveCount(0);
  await caseInitiales(page).check();
  await expect(page).not.toHaveURL(/initiales/);
  await expect(texteDe(page, m.a.id)).toHaveText('AB, CD');
});

/** Création d'une ressource par l'écran Utilisateurs, avec initiales (administrateur connecté). */
async function creerRessourceAvecInitiales(
  page: Page,
  nom: string,
  email: string,
  initiales: string,
  calendrier?: string,
): Promise<void> {
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(nom);
  await dialog.getByLabel('Initiales').fill(initiales);
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  if (calendrier) await dialog.getByLabel('Calendrier').selectOption({ label: calendrier });
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(nom) })).toBeVisible();
}

async function idParNom(request: APIRequestContext, nom: string): Promise<number> {
  const r = await request.get('/api/utilisateurs');
  expect(r.ok()).toBeTruthy();
  const u = ((await r.json()) as { id: number; nom: string }[]).find((x) => x.nom === nom);
  expect(u, `utilisateur ${nom}`).toBeDefined();
  return u!.id;
}

test('E2E-130 : parcours IHM : initiales saisies à l’écran Utilisateurs, visibles dans le Gantt après coche', async ({
  page,
  request,
}) => {
  await loginAsAdmin(page);
  await creerRessourceAvecInitiales(page, 'Ressource 130', 'ressource-130@lot3d.test', 'RP');

  const api = await preparer(request);
  const admin = await idParNom(request, 'Admin E2E');
  const ressource = await idParNom(request, 'Ressource 130');
  const projet = await api.projet('P130', 'Projet 130', admin);
  await api.affectation(projet.id, ressource);
  const a = await api.activite(projet.id, 'Activité 130');
  await api.assignation(a.id, ressource, 2);
  await calculer(request, [projet.id]);

  await page.goto(gantt(projet.id));
  await caseInitiales(page).check();
  await expect(texteDe(page, a.id)).toHaveText('RP');
});

test('E2E-131-r2 : extension du parcours complet : initiales « RC » saisies à l’écran, case cochée, texte rattaché à « Tâche »', async ({
  page,
}) => {
  await loginAsAdmin(page);

  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 3D-131');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 3D-131/ })).toBeVisible();

  await creerRessourceAvecInitiales(
    page,
    'Ressource 3D-131',
    'ressource-3d-131@lot3d.test',
    'RC',
    'Cal 3D-131',
  );
  await creerProjetParEcran(page, '3D-131', 'Projet 3D-131');

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 3D-131' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3D-131', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Ressource')
    .selectOption({ label: 'Ressource 3D-131' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource 3D-131/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Phase 3D-131');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Phase 3D-131/ })).toBeVisible();
  await page
    .getByRole('button', { name: 'Ajouter une sous-activité à Phase 3D-131', exact: true })
    .click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 3D-131');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3D-131/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 3D-131' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource 3D-131' });
  await assignation.getByLabel('Charge assignée (j)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3D-131.*Ressource 3D-131/ })).toBeVisible();

  await allerA(page, 'Accueil');
  await page.getByRole('button', { name: 'Calculer', exact: true }).click();
  const calcul = dialogueCalcul(page);
  await expect(calcul).toBeVisible();
  await calcul.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect(calcul).toHaveCount(0);

  await page.getByRole('link', { name: 'Projet 3D-131' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3D-131', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  const tache: Locator = page.getByRole('img', { name: /^Tâche 3D-131, du / });
  await expect(tache).toHaveCount(1);
  const id = Number(await tache.getAttribute('data-element-id'));
  await expect(caseInitiales(page)).not.toBeChecked();
  await expect(textes(page)).toHaveCount(0);
  await caseInitiales(page).check();
  await expect(texteDe(page, id)).toHaveText('RC');
});
