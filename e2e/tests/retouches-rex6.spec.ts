// Retouches REX-6 (D-218 ; SPEC §6 « Retouches REX-6 », Accueil point 2 et « Édition » point 2) :
// E2E-558 à E2E-571. Base « administrateur seul » avant et après chaque test. Données préparées par l'API.
// Textes recopiés de D-218 et de la décision du porteur : libellés et aides des types de dépendance,
// aide du champ « Date de début » d'un modèle, ordre des colonnes de l'Accueil.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { dialogueCalcul, ouvrirDialogueCalcul } from './lot3c-helpers.js';
import { activiteAvec, calculer, lier, monde3b } from './lot3b-helpers.js';
import {
  EMAIL_ALICE,
  S,
  adresseFeuille,
  caseCharge,
  ecouterEcritures,
  monde4b,
} from './lot4b-helpers.js';
import { nav, remettreAdminSeul6b } from './lot6b-helpers.js';
import { cliquerDansConfirmation } from './stabilite-helpers.js';
import { cheminCapture } from './captures.js';

const J06 = '2027-01-06T10:00:00';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul6b);

const AIDE_MODELE =
  'Date de référence : à la copie, les dates du modèle sont décalées de l’écart entre cette date et la date de début du nouveau projet.';
const TYPES: { code: string; libelle: string; aide: string }[] = [
  {
    code: 'FD',
    libelle: 'Fin → début (FD)',
    aide: 'Le successeur commence après la fin du prédécesseur.',
  },
  {
    code: 'DD',
    libelle: 'Début → début (DD)',
    aide: 'Le successeur commence après le début du prédécesseur.',
  },
  {
    code: 'FF',
    libelle: 'Fin → fin (FF)',
    aide: 'Le successeur finit après la fin du prédécesseur.',
  },
];

const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const zoneAccueil = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });
const caseInitiales = (page: Page) =>
  page.getByRole('checkbox', { name: 'Initiales', exact: true });

/** Chaque type : libellé de la liste ; aide affichée sous la liste et reliée par `aria-describedby`. */
async function verifierTypes(dialogue: Locator) {
  const liste = dialogue.getByLabel('Type', { exact: true });
  const options = await liste.locator('option').allTextContents();
  expect(options.map((o) => o.trim())).toEqual(TYPES.map((t) => t.libelle));
  for (const t of TYPES) {
    await liste.selectOption(t.code);
    await expect(liste).toHaveValue(t.code);
    await expect(dialogue.getByText(t.aide, { exact: true })).toBeVisible();
    const id = await liste.getAttribute('aria-describedby');
    expect(id, `aria-describedby de ${t.code}`).toBeTruthy();
    await expect(dialogue.locator(`[id="${id}"]`)).toHaveText(t.aide);
  }
}

/** Deux activités A et B du projet de `m`. */
async function deuxActivites(request: Parameters<typeof monde3b>[0], suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche A', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 5);
  const b = await activiteAvec(request, m.projet.id, 'Tâche B', {
    mode: 'START',
    debut_valide: '2027-01-18',
  });
  await m.api.assignation(b.id, m.gens.Bob!.id, 5);
  return { ...m, a, b };
}

test('E2E-558-r1 : « Nouveau modèle » : date de début préremplie à la date du jour du navigateur, aide sous le champ, obligatoire ; création par l’écran : date enregistrée', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto('/modeles');
  await page.getByRole('button', { name: 'Nouveau modèle' }).click();
  const d = page.getByRole('dialog', { name: 'Nouveau modèle' });
  const champ = d.getByLabel('Date de début', { exact: true });
  await expect(champ).toHaveValue('2027-01-06');
  await expect(champ).toHaveAttribute('required', '');
  await expect(d.getByText(AIDE_MODELE, { exact: true })).toBeVisible();
  await expect(champ).toHaveAccessibleDescription(AIDE_MODELE);

  await d.getByLabel('Code', { exact: true }).fill('MOD-558');
  await d.getByLabel('Nom', { exact: true }).fill('Modèle 558');
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Modèle 558', exact: true })).toBeVisible();
  const r = await page.request.get('/api/modeles');
  const liste = (await r.json()) as { code: string; date_debut: string }[];
  expect(liste.find((m) => m.code === 'MOD-558')?.date_debut).toBe('2027-01-06');
});

test('E2E-559 : onglet Planning, « Nouvelle dépendance » : types « Fin → début (FD) », « Début → début (DD) », « Fin → fin (FF) » et aide selon le type ; codes de l’API inchangés', async ({
  page,
  request,
}) => {
  const m = await deuxActivites(request, 'E2E559');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle dépendance' }).click();
  const d = page.getByRole('dialog', { name: 'Nouvelle dépendance' });
  await expect(d.getByLabel('Type', { exact: true })).toHaveValue('FD');
  await verifierTypes(d);

  await d.getByLabel('Prédécesseur').selectOption({ label: 'Tâche A' });
  await d.getByLabel('Successeur').selectOption({ label: 'Tâche B' });
  await d.getByLabel('Type', { exact: true }).selectOption('FF');
  await d.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(d).toHaveCount(0);
  const r = await request.get(`/api/projets/${m.projet.id}/dependances`);
  const liste = (await r.json()) as { type: string }[];
  expect(liste.map((x) => x.type)).toEqual(['FF']);
});

test('E2E-560 : onglet Planning, tableau des dépendances et dialogue de modification : libellés explicites des types', async ({
  page,
  request,
}) => {
  const m = await deuxActivites(request, 'E2E560');
  const c = await activiteAvec(request, m.projet.id, 'Tâche C');
  const e = await activiteAvec(request, m.projet.id, 'Tâche D');
  await lier(request, m.projet.id, m.a.id, m.b.id, 'FD');
  await lier(request, m.projet.id, m.b.id, c.id, 'DD');
  await lier(request, m.projet.id, c.id, e.id, 'FF');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  const tableau = page.getByRole('table', { name: 'Dépendances du projet' });
  const lignes = tableau.locator('tbody tr');
  await expect(lignes).toHaveCount(3);
  await expect(lignes.nth(0).locator('td').nth(2)).toHaveText('Fin → début (FD)');
  await expect(lignes.nth(1).locator('td').nth(2)).toHaveText('Début → début (DD)');
  await expect(lignes.nth(2).locator('td').nth(2)).toHaveText('Fin → fin (FF)');

  await page
    .getByRole('button', { name: 'Modifier la dépendance Tâche B → Tâche C', exact: true })
    .click();
  const d = page.getByRole('dialog', { name: 'Modifier la dépendance' });
  await expect(d.getByLabel('Type', { exact: true })).toHaveValue('DD');
  await expect(
    d.getByText('Le successeur commence après le début du prédécesseur.', { exact: true }),
  ).toBeVisible();
  await verifierTypes(d);
});

test('E2E-561 : Gantt, dialogue d’un lien : libellés des types et aide selon le type choisi', async ({
  page,
  request,
}) => {
  const m = await deuxActivites(request, 'E2E561');
  await lier(request, m.projet.id, m.a.id, m.b.id);
  await calculer(request, [m.projet.id]);
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=jour`);
  await expect(barre(page, m.a.id)).toHaveAttribute(
    'aria-label',
    'Tâche A, du 11/01/2027 au 15/01/2027',
  );
  await expect(page.locator('svg [data-lien-id]')).toHaveCount(1);
  const b = (await barre(page, m.a.id).boundingBox())!;
  await page.mouse.click(b.x + b.width + 8, b.y + b.height / 2 + 10);
  const d = page.getByRole('dialog', { name: 'Modifier la dépendance' });
  await expect(d).toBeVisible();
  await expect(d.getByLabel('Type', { exact: true })).toHaveValue('FD');
  await expect(
    d.getByText('Le successeur commence après la fin du prédécesseur.', { exact: true }),
  ).toBeVisible();
  await verifierTypes(d);
});

test('E2E-562-r1 : « Modifier l’activité » : « Début planifié » et « Fin planifiée » en lecture seule, « — » avant tout calcul, après « Début validé » (« Fin validée » masquée en START) ; pas de champ', async ({
  page,
  request,
}) => {
  const m = await deuxActivites(request, 'E2E562');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Modifier Tâche A', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(d.getByText('Début planifié', { exact: true })).toBeVisible();
  await expect(d.getByText('Fin planifiée', { exact: true })).toBeVisible();
  await expect(d.locator('[data-planifie="debut"]')).toHaveText('—');
  await expect(d.locator('[data-planifie="fin"]')).toHaveText('—');
  await expect(d.getByLabel('Début planifié')).toHaveCount(0);
  await expect(d.getByLabel('Fin planifiée')).toHaveCount(0);
  const yFinValidee = (await d.getByLabel('Début validé', { exact: true }).boundingBox())!.y;
  const yDebutPlanifie = (await d.locator('[data-planifie="debut"]').boundingBox())!.y;
  const yFinPlanifiee = (await d.locator('[data-planifie="fin"]').boundingBox())!.y;
  expect(yDebutPlanifie).toBeGreaterThan(yFinValidee);
  expect(yFinPlanifiee).toBeGreaterThan(yDebutPlanifie);
});

test('E2E-563 : « Modifier l’activité » avant et après « Calculer » : « — » puis dates planifiées JJ/MM/AAAA à jour', async ({
  page,
  request,
}) => {
  const m = await deuxActivites(request, 'E2E563');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Modifier Tâche A', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(d.locator('[data-planifie="debut"]')).toHaveText('—');
  await expect(d.locator('[data-planifie="fin"]')).toHaveText('—');
  await d.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(d).toHaveCount(0);

  await page.getByRole('tab', { name: 'Gantt' }).click();
  await ouvrirDialogueCalcul(page);
  await dialogueCalcul(page).getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(dialogueCalcul(page)).toHaveCount(0);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Modifier Tâche A', exact: true }).click();
  const d2 = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(d2.locator('[data-planifie="debut"]')).toHaveText('11/01/2027');
  await expect(d2.locator('[data-planifie="fin"]')).toHaveText('15/01/2027');
});

/** Accueil : chef, projet « Projet <s> » avec « Tâche A » (Alice, initiales « AL »), calculé. */
async function mondeAccueil(request: Parameters<typeof monde3b>[0], suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const r = await request.patch(`/api/utilisateurs/${m.gens.Alice!.id}`, {
    data: { initiales: 'AL' },
  });
  expect(r.ok()).toBeTruthy();
  const a = await activiteAvec(request, m.projet.id, 'Tâche A', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 5);
  await calculer(request, [m.projet.id]);
  return { ...m, a };
}

test('E2E-564 : Accueil sans paramètre : projets dépliés, activités et initiales visibles, case « Initiales » cochée ; « Tout replier » disponible ; `initiales=0` gardé au rechargement', async ({
  page,
  request,
}) => {
  const m = await mondeAccueil(request, 'E2E564');
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  await page.locator('svg[data-zoom]').waitFor();
  await expect(
    page.getByRole('button', { name: 'Replier Projet E2E564', exact: true }),
  ).toBeVisible();
  await expect(zoneAccueil(page).getByText('Tâche A', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tout replier', exact: true })).toBeVisible();
  await expect(caseInitiales(page)).toBeChecked();
  await expect(page.locator(`svg text[data-initiales-element="${m.a.id}"]`)).toHaveText('AL');
  await expect(page).not.toHaveURL(/initiales/);

  await caseInitiales(page).uncheck();
  await expect(page).toHaveURL(/initiales=0/);
  await expect(page.locator('svg text[data-initiales-element]')).toHaveCount(0);
  await page.reload();
  await page.locator('svg[data-zoom]').waitFor();
  await expect(page).toHaveURL(/initiales=0/);
  await expect(caseInitiales(page)).not.toBeChecked();
  await expect(zoneAccueil(page).getByText('Tâche A', { exact: true })).toBeVisible();
  await expect(page.locator('svg text[data-initiales-element]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Tout replier', exact: true }).click();
  await expect(zoneAccueil(page).getByText('Tâche A', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tout déplier', exact: true })).toBeVisible();
});

test('E2E-565 : Gantt d’un projet inchangé : case « Initiales » décochée par défaut, pas d’initiales', async ({
  page,
  request,
}) => {
  const m = await mondeAccueil(request, 'E2E565');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=jour`);
  await page.locator('svg[data-zoom]').waitFor();
  await expect(caseInitiales(page)).not.toBeChecked();
  await expect(page.locator('svg text[data-initiales-element]')).toHaveCount(0);
  await caseInitiales(page).check();
  await expect(page).toHaveURL(/initiales=1/);
  await expect(page.locator(`svg text[data-initiales-element="${m.a.id}"]`)).toHaveText('AL');
});

test('E2E-566 : Mes tâches d’une ressource : tableau des tâches, aucune section « Mon calendrier », aucune lecture de calendrier', async ({
  page,
  request,
}) => {
  const m = await deuxActivites(request, 'E2E566');
  await calculer(request, [m.projet.id]);
  const lectures: string[] = [];
  page.on('request', (r) => {
    if (/\/api\/calendriers(\/|$)/.test(new URL(r.url()).pathname)) lectures.push(r.url());
  });
  await connecterAvec(page, m.gens.Alice!.email);
  await expect(page).toHaveURL('/mes-taches');
  await expect(page.getByRole('table', { name: 'Mes tâches' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mon calendrier' })).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Jours fériés à venir' })).toHaveCount(0);
  await expect(page.getByText('Jours travaillés')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(lectures).toEqual([]);
});

test('E2E-567-r1 : le logo est un lien « PlanerSource » vers « / » ; clic depuis une fiche projet : Accueil', async ({
  page,
  request,
}) => {
  const m = await deuxActivites(request, 'E2E567');
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}`);
  const logo = page
    .getByRole('complementary')
    .getByRole('link', { name: 'PlanerSource', exact: true });
  await expect(logo).toContainText('PlanerSource');
  await expect(logo).toHaveAttribute('href', '/');
  await logo.click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('region', { name: 'Tableau du Gantt global' })).toBeVisible();
});

const confirmation = (page: Page) =>
  page.getByRole('dialog', { name: 'Abandonner les modifications ?' });

test('E2E-568-r1 : logo depuis la Feuille de temps avec une saisie non enregistrée : confirmation (D-172) ; « Annuler » reste, « Abandonner » part vers « / », donc /mes-taches pour une ressource ; base inchangée', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await monde4b(request);
  await connecterAvec(page, EMAIL_ALICE);
  await page.goto(adresseFeuille(S));
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  const ecritures = ecouterEcritures(page);
  await caseCharge(page, '1 Tâche A', 'lun. 12/01').fill('1');
  const logo = page.getByRole('link', { name: 'PlanerSource', exact: true });
  await logo.click();
  await expect(confirmation(page)).toBeVisible();
  await confirmation(page).getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page).toHaveURL(adresseFeuille(S));
  await expect(caseCharge(page, '1 Tâche A', 'lun. 12/01')).toHaveValue('1');

  await logo.click();
  await cliquerDansConfirmation(
    confirmation(page),
    confirmation(page).getByRole('button', { name: 'Abandonner', exact: true }),
    confirmation(page).getByRole('button', { name: 'Annuler', exact: true }),
  );
  await expect(page).toHaveURL('/mes-taches');
  expect(ecritures).toHaveLength(0);
  const f = await page.request.get(`/api/feuilles?semaine=${S}`);
  expect(((await f.json()) as { feuille: { id: number | null } }).feuille.id).toBeNull();
  await expect(nav(page).getByRole('link', { name: 'Accueil' })).toHaveCount(0);
});

const ENTETES_ACCUEIL = [
  'Code',
  'Nom',
  'Début',
  'Fin',
  'Ressources',
  'Charge',
  'Avancement',
  'Réel',
  'Vendu',
  'Marge',
  'Drapeaux',
];

test('E2E-569-r4 : Accueil, toutes les colonnes cochées : en-têtes Code, Nom, Début, Fin, Charge, Avancement, Réel, Vendu, Marge, Drapeaux, dans l’ordre du menu « Colonnes »', async ({
  page,
  request,
}) => {
  const m = await mondeAccueil(request, 'E2E569');
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, m.emailChef);
  await page.goto('/?zoom=jour');
  await page.locator('svg[data-zoom]').waitFor();
  await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
  for (const t of ['Charge', 'Avancement', 'Réel', 'Vendu', 'Marge', 'Drapeaux']) {
    await page.getByRole('menuitemcheckbox', { name: t, exact: true }).click();
  }
  const elements = (
    await page.getByRole('menu').getByRole('menuitemcheckbox').allTextContents()
  ).map((t) => t.trim());
  expect(elements).toEqual([
    ...ENTETES_ACCUEIL.slice(2, -1),
    'OTP',
    'Coût planifié',
    'Coût réel',
    'Notes',
    'Drapeaux',
  ]);
  await page.keyboard.press('Escape');
  const entetes = (await zoneAccueil(page).getByRole('columnheader').allTextContents()).map((t) =>
    t.trim(),
  );
  expect(entetes).toEqual(ENTETES_ACCUEIL);
});

test('E2E-570-r2 : poignée de largeur : un glisser qui revient à son point de départ laisse la largeur enregistrée (défaut, puis réglée au clavier), sans largeur intermédiaire', async ({
  page,
  request,
}) => {
  const m = await mondeAccueil(request, 'E2E570');
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=jour`);
  await page.locator('svg[data-zoom]').waitFor();
  const zone = page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
  const poignee = zone.getByRole('separator', { name: 'Largeur de la colonne Début', exact: true });
  const entete = zone.getByRole('columnheader', { name: 'Début', exact: true });
  const valeur = async () => Number(await poignee.getAttribute('aria-valuenow'));
  const stocke = async () => {
    const v = await page.evaluate(() => window.localStorage.getItem('planersource.gantt.projet'));
    const o = v ? (JSON.parse(v) as { largeurs?: Record<string, number> }) : {};
    return o.largeurs?.debut ?? null;
  };
  const laisserPasser = () =>
    page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );

  const glisserEtRevenir = async () => {
    const b = (await poignee.boundingBox())!;
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y, { steps: 8 });
    await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    await laisserPasser();
  };

  const defaut = await valeur();
  await glisserEtRevenir();
  expect(await valeur(), 'défaut : aria-valuenow').toBe(defaut);
  expect(Math.abs((await entete.boundingBox())!.width - defaut)).toBeLessThanOrEqual(1);
  expect(await stocke(), 'défaut : rien d’enregistré').toBeNull();

  await poignee.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(valeur).toBe(defaut + 16);
  expect(await stocke()).toBe(defaut + 16);
  await glisserEtRevenir();
  expect(await valeur(), 'réglée : aria-valuenow').toBe(defaut + 16);
  expect(Math.abs((await entete.boundingBox())!.width - (defaut + 16))).toBeLessThanOrEqual(1);
  expect(await stocke(), 'réglée : enregistrée').toBe(defaut + 16);
});

test('E2E-571 : captures sans assertion de valeur (D-218) : Accueil, dialogue d’une activité, dialogue d’une dépendance, 1440 et 1024 px', async ({
  page,
  request,
}) => {
  const m = await deuxActivites(request, 'E2E571');
  await lier(request, m.projet.id, m.a.id, m.b.id);
  await calculer(request, [m.projet.id]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, m.emailChef);
  await page.goto('/');
  await page.locator('svg[data-zoom]').waitFor();
  await page.screenshot({ path: cheminCapture('retouches-rex6-accueil-1440.png') });
  await page.goto(`/projets/${m.projet.id}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Modifier Tâche A', exact: true }).click();
  await page.getByRole('dialog', { name: 'Modifier l’activité' }).waitFor();
  await page.screenshot({ path: cheminCapture('retouches-rex6-activite-1440.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Nouvelle dépendance' }).click();
  await page.getByRole('dialog', { name: 'Nouvelle dépendance' }).waitFor();
  await page.screenshot({ path: cheminCapture('retouches-rex6-dependance-1440.png') });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.getByRole('button', { name: 'Modifier Tâche A', exact: true }).click();
  await page.getByRole('dialog', { name: 'Modifier l’activité' }).waitFor();
  await page.screenshot({ path: cheminCapture('retouches-rex6-activite-1024.png') });
  await page.keyboard.press('Escape');
  await page.goto('/');
  await page.locator('svg[data-zoom]').waitFor();
  await page.screenshot({ path: cheminCapture('retouches-rex6-accueil-1024.png') });
});
