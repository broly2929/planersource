// Tranche Clôture, C2 (D-083 (9), (11), (12)) : textes des refus à l'écran, E2E-111 à E2E-123.
// Base « administrateur seul », horloge du navigateur figée au 06/01/2027. Données préalables par
// l'API (toujours cohérentes : enfant clos avant le parent), action testée à l'écran ; E2E-123 est le
// parcours complet, tout à l'écran.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { preparer } from './lot1-helpers.js';
import { activiteAvec, jalonAvec, sousProjet } from './lot3b-helpers.js';
import {
  allerA,
  creerProjetParEcran,
  creerRessourceParEcran,
  dialogueCalcul,
  J06,
  notification,
  ouvrirCalendriers,
  remettreAdminSeul,
} from './lot3c-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul);

// Textes recopiés de SPEC §3 (puces « Refus de clôture » et « Projet parent »).
const ENFANTS_PROJET = 'Ce projet a des sous-projets ou des activités non clos.';
const ENFANTS_ACTIVITE = 'Cette activité a des sous-activités non closes.';
const PARENT_CLOS_ELEMENT = 'Le projet ou l’activité parente est clos.';
const PARENT_CLOS_PROJET = 'Le projet parent est clos.';
const PARENT_IMPOSSIBLE = 'Ce projet parent n’est pas possible.';
const AUCUN = 'Aucun (projet racine)';

async function adminId(request: APIRequestContext): Promise<number> {
  const r = await request.get('/api/auth/me');
  expect(r.ok()).toBeTruthy();
  return ((await r.json()) as { id: number }).id;
}

async function patcher(request: APIRequestContext, adresse: string, data: Record<string, unknown>) {
  const r = await request.patch(adresse, { data });
  expect(r.ok(), `PATCH ${adresse} : ${r.status()} ${await r.text()}`).toBeTruthy();
}
const clore = (request: APIRequestContext, projetId: number) =>
  patcher(request, `/api/projets/${projetId}`, { clos: true });
const cloreActivite = (request: APIRequestContext, id: number) =>
  patcher(request, `/api/activites/${id}`, { close: true });

async function ouvrir(page: Page, bouton: string): Promise<Locator> {
  await page.getByRole('button', { name: bouton, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Refus attendu : texte exact en alerte, dialogue resté ouvert ; puis « Annuler ». */
async function refuse(dialog: Locator, texte: string): Promise<void> {
  await expect(dialog.getByRole('alert')).toHaveText(texte);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialog).toBeHidden();
}

const caseCochee = (dialog: Locator, nom: string) =>
  dialog.getByRole('checkbox', { name: nom, exact: true });

/** Fiche d'un projet, onglet Planning (par défaut). */
async function fiche(page: Page, projetId: number, nom: string): Promise<void> {
  await page.goto(`/projets/${projetId}`);
  await expect(page.getByRole('heading', { name: nom, level: 1 })).toBeVisible();
}

/** Noms des lignes du tableau du planning, dans l'ordre affiché. */
async function nomsPlanning(page: Page): Promise<string[]> {
  const lignes = page.getByRole('table').first().getByRole('row');
  await expect(lignes.nth(1)).toBeVisible();
  const n = await lignes.count();
  const noms: string[] = [];
  for (let i = 1; i < n; i++) {
    noms.push((await lignes.nth(i).getByRole('cell').nth(1).textContent())?.trim() ?? '');
  }
  return noms;
}

test('E2E-111 « Modifier le projet », Clos coché avec une activité ouverte : texte, dialogue ouvert, Clos relu non coché', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const p = await api.projet('P111', 'Projet 111', await adminId(request));
  await api.activite(p.id, 'Activité 111');

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  const dialog = await ouvrir(page, 'Modifier Projet 111');
  await caseCochee(dialog, 'Clos').check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await refuse(dialog, ENFANTS_PROJET);

  await page.reload();
  const relu = await ouvrir(page, 'Modifier Projet 111');
  await expect(caseCochee(relu, 'Clos')).not.toBeChecked();
});

test('E2E-112 parent changé et Clos coché, activité ouverte : texte de enfants_ouverts, pas celui du parent', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await adminId(request);
  const p = await api.projet('P112', 'Projet 112', admin);
  await api.activite(p.id, 'Activité 112');
  await api.projet('Q112', 'Parent 112', admin);

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  const dialog = await ouvrir(page, 'Modifier Projet 112');
  await dialog.getByLabel('Projet parent').selectOption({ label: 'Q112 — Parent 112' });
  await caseCochee(dialog, 'Clos').check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert')).not.toHaveText(PARENT_IMPOSSIBLE);
  await refuse(dialog, ENFANTS_PROJET);

  await page.reload();
  const relu = await ouvrir(page, 'Modifier Projet 112');
  await expect(relu.getByLabel('Projet parent').locator('option:checked')).toHaveText(AUCUN);
  await expect(caseCochee(relu, 'Clos')).not.toBeChecked();
});

test('E2E-113 cycle réel de parent, sans interception : « Ce projet parent n’est pas possible. »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await adminId(request);
  const a = await api.projet('A113', 'Alpha 113', admin);
  const b = await api.projet('B113', 'Beta 113', admin);

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  const dialog = await ouvrir(page, 'Modifier Alpha 113');
  // B rattaché à A après l'ouverture : la liste du dialogue propose encore B.
  await patcher(request, `/api/projets/${b.id}`, { parent_id: a.id });
  await dialog.getByLabel('Projet parent').selectOption({ label: 'B113 — Beta 113' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await refuse(dialog, PARENT_IMPOSSIBLE);

  await page.reload();
  const relu = await ouvrir(page, 'Modifier Alpha 113');
  await expect(relu.getByLabel('Projet parent').locator('option:checked')).toHaveText(AUCUN);
});

test('E2E-114 rouvrir un sous-projet sous un parent clos : « Le projet parent est clos. »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await adminId(request);
  const p = await api.projet('P114', 'Parent 114', admin);
  const s = await sousProjet(request, p.id, 'S114', 'Sous-projet 114', admin);
  await clore(request, s.id);
  await clore(request, p.id);

  await loginAsAdmin(page);
  await fiche(page, s.id, 'Sous-projet 114');
  const dialog = await ouvrir(page, 'Modifier le projet');
  await caseCochee(dialog, 'Clos').uncheck();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await refuse(dialog, PARENT_CLOS_PROJET);

  await page.reload();
  const relu = await ouvrir(page, 'Modifier le projet');
  await expect(caseCochee(relu, 'Clos')).toBeChecked();
});

test('E2E-115 « Nouveau projet » sous un parent clos : « Le projet parent est clos. », rien de créé', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const p = await api.projet('P115', 'Parent 115', await adminId(request));
  await clore(request, p.id);

  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  const dialog = await ouvrir(page, 'Nouveau projet');
  await dialog.getByLabel('Code').fill('N115');
  await dialog.getByLabel('Nom').fill('Nouveau 115');
  await dialog.getByLabel('Projet parent').selectOption({ label: 'P115 — Parent 115' });
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await refuse(dialog, PARENT_CLOS_PROJET);

  await page.reload();
  await page.getByRole('button', { name: 'Déplier Parent 115', exact: true }).click();
  await expect(page.getByText('Aucune activité ni jalon.')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Nouveau 115' })).toHaveCount(0);
});

test('E2E-116 clore une activité parente avec une sous-activité ouverte : texte, Close relue non cochée', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const p = await api.projet('P116', 'Projet 116', await adminId(request));
  const a = await activiteAvec(request, p.id, 'Activité A116');
  await activiteAvec(request, p.id, 'Activité B116', { parent_id: a.id });

  await loginAsAdmin(page);
  await fiche(page, p.id, 'Projet 116');
  const dialog = await ouvrir(page, 'Modifier Activité A116');
  await caseCochee(dialog, 'Close').check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await refuse(dialog, ENFANTS_ACTIVITE);

  await page.reload();
  const relu = await ouvrir(page, 'Modifier Activité A116');
  await expect(caseCochee(relu, 'Close')).not.toBeChecked();
});

test('E2E-117 rouvrir une activité sous une activité close : texte, Close relue cochée', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const p = await api.projet('P117', 'Projet 117', await adminId(request));
  const a = await activiteAvec(request, p.id, 'Activité A117');
  const b = await activiteAvec(request, p.id, 'Activité B117', { parent_id: a.id });
  await cloreActivite(request, b.id);
  await cloreActivite(request, a.id);

  await loginAsAdmin(page);
  await fiche(page, p.id, 'Projet 117');
  const dialog = await ouvrir(page, 'Modifier Activité B117');
  await caseCochee(dialog, 'Close').uncheck();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await refuse(dialog, PARENT_CLOS_ELEMENT);

  await page.reload();
  const relu = await ouvrir(page, 'Modifier Activité B117');
  await expect(caseCochee(relu, 'Close')).toBeChecked();
});

/** Projet clos contenant une activité close « Témoin » (ligne témoin du planning). */
async function projetClosAvecTemoin(request: APIRequestContext, code: string, nom: string) {
  const api = await preparer(request);
  const p = await api.projet(code, nom, await adminId(request));
  const t = await api.activite(p.id, 'Témoin');
  await cloreActivite(request, t.id);
  await clore(request, p.id);
  return p;
}

test('E2E-118 « Nouvelle activité » dans un projet clos : texte, aucune ligne créée', async ({
  page,
  request,
}) => {
  const p = await projetClosAvecTemoin(request, 'P118', 'Projet 118');

  await loginAsAdmin(page);
  await fiche(page, p.id, 'Projet 118');
  const dialog = await ouvrir(page, 'Nouvelle activité');
  await dialog.getByLabel('Nom').fill('Activité 118');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await refuse(dialog, PARENT_CLOS_ELEMENT);

  await page.reload();
  expect(await nomsPlanning(page)).toEqual(['Témoin']);
});

test('E2E-119 « Nouveau jalon » dans un projet clos : texte, aucune ligne créée', async ({
  page,
  request,
}) => {
  const p = await projetClosAvecTemoin(request, 'P119', 'Projet 119');

  await loginAsAdmin(page);
  await fiche(page, p.id, 'Projet 119');
  const dialog = await ouvrir(page, 'Nouveau jalon');
  await dialog.getByLabel('Nom').fill('Jalon 119');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await refuse(dialog, PARENT_CLOS_ELEMENT);

  await page.reload();
  expect(await nomsPlanning(page)).toEqual(['Témoin']);
});

test('E2E-120 sous-activité sous une activité close : texte, aucune ligne créée', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const p = await api.projet('P120', 'Projet 120', await adminId(request));
  const a = await api.activite(p.id, 'Activité A120');
  await cloreActivite(request, a.id);

  await loginAsAdmin(page);
  await fiche(page, p.id, 'Projet 120');
  const dialog = await ouvrir(page, 'Ajouter une sous-activité à Activité A120');
  await dialog.getByLabel('Nom').fill('Sous-activité 120');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await refuse(dialog, PARENT_CLOS_ELEMENT);

  await page.reload();
  expect(await nomsPlanning(page)).toEqual(['Activité A120']);
});

test('E2E-121 modèle avec une activité ouverte, Clos coché depuis Modèles : texte, Clos relu non coché', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const m = await api.modele('M121', 'Modèle 121');
  await api.activite(m.id, 'Activité 121');

  await loginAsAdmin(page);
  await allerA(page, 'Modèles');
  const dialog = await ouvrir(page, 'Modifier Modèle 121');
  await caseCochee(dialog, 'Clos').check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await refuse(dialog, ENFANTS_PROJET);

  await page.reload();
  const relu = await ouvrir(page, 'Modifier Modèle 121');
  await expect(caseCochee(relu, 'Clos')).not.toBeChecked();
});

test('E2E-122 « Monter » un jalon sous une activité close : alerte, ordre inchangé (D-083 (12))', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const p = await api.projet('P122', 'Projet 122', await adminId(request));
  const a = await activiteAvec(request, p.id, 'Activité A122');
  const b = await activiteAvec(request, p.id, 'Activité B122', { parent_id: a.id });
  await jalonAvec(request, p.id, 'Jalon J122', { parent_id: a.id });
  await cloreActivite(request, b.id);
  await cloreActivite(request, a.id);

  await loginAsAdmin(page);
  await fiche(page, p.id, 'Projet 122');
  expect(await nomsPlanning(page)).toEqual(['Activité A122', 'Activité B122', 'Jalon J122']);
  await page.getByRole('button', { name: 'Monter Jalon J122', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(PARENT_CLOS_ELEMENT);

  await page.reload();
  expect(await nomsPlanning(page)).toEqual(['Activité A122', 'Activité B122', 'Jalon J122']);
});

test('E2E-123-r1 parcours complet à l’écran : calcul depuis l’Accueil, clôture des activités puis du projet, projet absent de l’Accueil', async ({
  page,
}) => {
  await loginAsAdmin(page);

  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal C2-123');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal C2-123/ })).toBeVisible();

  await creerRessourceParEcran(page, 'Ressource C2-123', 'ressource-c2-123@c2.test', 'Cal C2-123');
  await creerProjetParEcran(page, 'C2-123', 'Projet C2-123');

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet C2-123' }).click();
  await expect(page.getByRole('heading', { name: 'Projet C2-123', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Ressource')
    .selectOption({ label: 'Ressource C2-123' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource C2-123/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Phase C2-123');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Phase C2-123/ })).toBeVisible();
  await page
    .getByRole('button', { name: 'Ajouter une sous-activité à Phase C2-123', exact: true })
    .click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche C2-123');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche C2-123/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche C2-123' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource C2-123' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche C2-123.*Ressource C2-123/ })).toBeVisible();

  await allerA(page, 'Accueil');
  await page.getByRole('button', { name: 'Calculer', exact: true }).click();
  const calcul = dialogueCalcul(page);
  await expect(calcul).toBeVisible();
  await calcul.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect(calcul).toHaveCount(0);
  const calendrierAccueil = page.getByRole('region', {
    name: 'Calendrier du Gantt global',
    exact: true,
  });
  await expect(calendrierAccueil.locator('[data-projet-id]')).toHaveCount(1);

  await page.getByRole('link', { name: 'Projet C2-123' }).click();
  await expect(page.getByRole('heading', { name: 'Projet C2-123', level: 1 })).toBeVisible();
  const tentative = await ouvrir(page, 'Modifier le projet');
  await caseCochee(tentative, 'Clos').check();
  await tentative.getByRole('button', { name: 'Enregistrer' }).click();
  await refuse(tentative, ENFANTS_PROJET);

  for (const nom of ['Tâche C2-123', 'Phase C2-123']) {
    const dialog = await ouvrir(page, `Modifier ${nom}`);
    await caseCochee(dialog, 'Close').check();
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(dialog).toBeHidden();
  }
  const cloture = await ouvrir(page, 'Modifier le projet');
  await caseCochee(cloture, 'Clos').check();
  await cloture.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(cloture).toBeHidden();

  await allerA(page, 'Accueil');
  await expect(page.getByText('Aucun projet à afficher.')).toBeVisible();
  await expect(page.locator('[data-projet-id]')).toHaveCount(0);
});

test('E2E-124 parent changé, 422 intercepté sans code : message générique, dialogue ouvert, rien modifié (D-083 (14))', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = await adminId(request);
  await api.projet('P124', 'Projet 124', admin);
  await api.projet('Q124', 'Parent 124', admin);

  await page.route('**/api/projets/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ erreur: 'Refus sans code' }),
      });
    } else {
      await route.continue();
    }
  });
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  const dialog = await ouvrir(page, 'Modifier Projet 124');
  await dialog.getByLabel('Projet parent').selectOption({ label: 'Q124 — Parent 124' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await refuse(dialog, 'Cette opération enfreint une règle du planning.');

  await page.reload();
  const relu = await ouvrir(page, 'Modifier Projet 124');
  await expect(relu.getByLabel('Projet parent').locator('option:checked')).toHaveText(AUCUN);
});
