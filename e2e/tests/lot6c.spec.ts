// Lot 6c (D-149, SPEC « Charge vendue et date client (lot 6c, D-149) ») : E2E-358 à E2E-367.
// Base « administrateur seul » avant et après chaque test. Valeurs recopiées de D-149.
// Gantt : D0 = 2027-01-04 (calcul par l'API) ; une activité assignée 4 j, vendue 3, a une marge de −1.
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { colonnesCompletes, sansColonneRessources } from './colonnes-completes.js';
import { MOT_DE_PASSE, connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b } from './lot3b-helpers.js';
import { allerA, creerRessourceParEcran, ouvrirCalendriers } from './lot3c-helpers.js';
import { chefLecteur, remettreAdminSeul6b } from './lot6b-helpers.js';
import { fermerEnAbandonnant } from './garde-dialogue-helpers.js';

const FLAG = 'rgb(190, 18, 60)';
const LARGEURS = [1440, 1024];
const EMAIL_RES = 'ressource-6c@lot6c.test';
const EMAIL_CHEF = 'chef-6c@lot6c.test';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const losangeClient = (page: Page, id: number) => page.locator(`svg [data-date-client="${id}"]`);
const ecartClient = (page: Page, id: number) => page.locator(`svg [data-ecart-client="${id}"]`);
const regionTotaux = (page: Page) => page.getByRole('region', { name: 'Totaux du projet' });
const ligne = (page: Page, nom: string): Locator =>
  page.getByRole('row').filter({ has: page.getByRole('cell', { name: nom, exact: true }) });

async function ouvrirGantt(page: Page, projetId: number, largeur = 1440) {
  await page.setViewportSize({ width: largeur, height: 800 });
  await page.goto(`/projets/${projetId}?onglet=gantt`);
  await page.locator('svg[data-zoom]').waitFor();
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

async function ouvrirPlanning(page: Page, projetId: number) {
  await page.goto(`/projets/${projetId}`);
  await page.getByRole('tab', { name: 'Planning' }).click();
}

/** Valeur d'une colonne de la base de test relue par l'API (session de la page). */
async function lireElements(page: Page, projetId: number) {
  const res = await page.request.get(`/api/projets/${projetId}/gantt`);
  expect(res.ok(), `GET gantt : ${res.status()}`).toBeTruthy();
  return (await res.json()) as {
    projet: { totaux?: Record<string, unknown> };
    elements: Record<string, unknown>[];
  };
}

/** Chef « Chef 6C », ressource Alice affectée ; activité « Tâche » assignée 4 j, vendue `vendue`. */
async function monde(request: APIRequestContext, suffixe: string, vendue: number | null = 3) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const tache = await activiteAvec(request, m.projet.id, `Tâche ${suffixe}`, {
    charge_vendue: vendue,
  });
  await m.api.assignation(tache.id, m.gens.Alice!.id, 4);
  return { ...m, tache };
}

test('E2E-358-r6 : parcours complet à l’écran (administrateur seul) : charge vendue et date client saisies à l’écran, vérifiées dans le Gantt (colonnes, Totaux, marqueur client)', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const RESSOURCE = 'Ressource 6C';
  const CHEF = 'Chef 6C';
  await loginAsAdmin(page);
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 6C');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 6C/ })).toBeVisible();
  await creerRessourceParEcran(page, RESSOURCE, EMAIL_RES, 'Cal 6C');

  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const utilisateur = page.getByRole('dialog');
  await utilisateur.getByLabel('Nom').fill(CHEF);
  await utilisateur.getByLabel('Email').fill(EMAIL_CHEF);
  await utilisateur.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  await utilisateur.getByLabel('Rôle').selectOption({ label: 'Chef de projet' });
  await utilisateur.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(CHEF) })).toBeVisible();

  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const projet = page.getByRole('dialog');
  await projet.getByLabel('Code').fill('6C');
  await projet.getByLabel('Nom').fill('Projet 6C');
  await projet.getByLabel('Chef de projet').selectOption({ label: CHEF });
  await projet.getByLabel('Pas avant le').fill('2027-01-04');
  await projet.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Projet 6C/ })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');

  // Le chef affecte, crée l'activité, l'assigne, saisit la charge vendue et la date client, tout à l'écran.
  await connecterAvec(page, EMAIL_CHEF);
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 6C' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 6C', level: 1 })).toBeVisible();
  const projetId = Number(/\/projets\/(\d+)/.exec(page.url())![1]);
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page.getByRole('dialog').getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: new RegExp(RESSOURCE) })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 6C');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 6C/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 6C' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: RESSOURCE });
  await assignation.getByLabel('Charge assignée (j)').fill('4');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Tâche 6C.*${RESSOURCE}`) })).toBeVisible();

  await page.getByRole('button', { name: 'Tâche 6C', exact: true }).click();
  const modifActivite = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await modifActivite.getByLabel('Charge vendue (j)').fill('6,5');
  await modifActivite.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modifActivite).toHaveCount(0);

  await page.getByRole('button', { name: 'Nouveau jalon' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Jalon 6C');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await page.getByRole('button', { name: 'Jalon 6C', exact: true }).click();
  const modifJalon = page.getByRole('dialog', { name: 'Modifier le jalon' });
  await modifJalon.getByLabel('Type').selectOption({ label: 'Fixe' });
  await modifJalon.getByLabel('Date validée').fill('2027-01-08');
  await modifJalon.getByLabel('Date client').fill('2027-01-06');
  await modifJalon.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modifJalon).toHaveCount(0);

  // Effet dans l'écran consommateur : le Gantt (planning calculé par l'API, hors entité saisie).
  await preparer(request);
  await calculer(request, [projetId]);
  await page.goto(`/projets/${projetId}?onglet=gantt`);
  await page.locator('svg[data-zoom]').waitFor();
  await expect(await cellule(page, 'Tâche 6C', 'Vendu')).toHaveText('6,5');
  await expect(await cellule(page, 'Tâche 6C', 'Marge')).toHaveText('2,5');
  await expect(regionTotaux(page)).toHaveText(
    'Vendu 6,5 j · Assigné 4 j · Marge 2,5 j · Réel 0 j · Coût planifié 0,00 € · Coût réel 0,00 €Exporter les coûts',
  );
  const g = await lireElements(page, projetId);
  const jalon = g.elements.find((e) => e.type === 'jalon')!;
  await expect(losangeClient(page, jalon.id as number)).toHaveCount(1);
  await expect(ecartClient(page, jalon.id as number)).toHaveText('+2 j');
  expect(g.projet.totaux).toEqual({
    charge_vendue: 6.5,
    charge_assignee: 4,
    marge: 2.5,
    charge_reelle: 0,
    cout_planifie: 0,
    cout_impute: 0,
    cout_reel: 0,
    taux_manquant: false,
  });
  expect(jalon).toMatchObject({
    date_client: '2027-01-06',
    ecart_client: 2,
    engagement_depasse: true,
  });
});

test('E2E-359 : dialogue d’activité : champ « Charge vendue (j) » (création, modification), absent pour un parent ; invalide : aria-invalid, message, enregistrement désactivé ; envoyée seulement si changée', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E359', []);
  const parent = await activiteAvec(request, m.projet.id, 'Parent 359');
  await activiteAvec(request, m.projet.id, 'Enfant 359', { parent_id: parent.id });
  const feuille = await activiteAvec(request, m.projet.id, 'Feuille 359', { charge_vendue: 4 });
  const patchs: Record<string, unknown>[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && /\/api\/activites\//.test(r.url())) {
      patchs.push(r.postDataJSON() as Record<string, unknown>);
    }
  });
  await connecterAvec(page, m.emailChef);
  await ouvrirPlanning(page, m.projet.id);

  // Création : champ présent, valeurs invalides refusées, virgule acceptée.
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  const creation = page.getByRole('dialog', { name: 'Nouvelle activité' });
  await creation.getByLabel('Nom').fill('Créée 359');
  const champ = creation.getByLabel('Charge vendue (j)');
  for (const invalide of ['1,234', 'abc', '-1', '1000000']) {
    await champ.fill(invalide);
    await expect(champ, invalide).toHaveAttribute('aria-invalid', 'true');
    await expect(creation.getByText('Charge vendue invalide.')).toBeVisible();
    await expect(creation.getByRole('button', { name: 'Créer' })).toBeDisabled();
  }
  await champ.fill('6,5');
  await expect(champ).not.toHaveAttribute('aria-invalid', 'true');
  await creation.getByRole('button', { name: 'Créer' }).click();
  await expect(creation).toHaveCount(0);
  const apresCreation = (await lireElements(page, m.projet.id)).elements;
  expect(apresCreation.find((e) => e.nom === 'Créée 359')).toMatchObject({ charge_vendue: 6.5 });

  // Activité parente : pas de champ.
  await page.getByRole('button', { name: 'Parent 359', exact: true }).click();
  const dialogueParent = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(dialogueParent.getByLabel('Nom', { exact: true })).toHaveValue('Parent 359');
  await expect(dialogueParent.getByLabel('Charge vendue (j)')).toHaveCount(0);
  await dialogueParent.getByRole('button', { name: 'Annuler' }).click();

  // Modification : charge vendue inchangée, non envoyée ; changée ; vidée.
  await page.getByRole('button', { name: 'Feuille 359', exact: true }).click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await expect(modif.getByLabel('Charge vendue (j)')).toHaveValue('4');
  await modif.getByLabel('Nom', { exact: true }).fill('Feuille 359 bis');
  await modif.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modif).toHaveCount(0);
  expect(patchs).toHaveLength(1);
  expect(Object.keys(patchs[0]!)).not.toContain('charge_vendue');

  await page.getByRole('button', { name: 'Feuille 359 bis', exact: true }).click();
  await modif.getByLabel('Charge vendue (j)').fill('');
  await modif.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modif).toHaveCount(0);
  expect(patchs).toHaveLength(2);
  expect(patchs[1]).toMatchObject({ charge_vendue: null });
  const apres = (await lireElements(page, m.projet.id)).elements;
  expect(apres.find((e) => e.id === feuille.id)).toMatchObject({ charge_vendue: null });
});

test('E2E-360 : dialogue de jalon : champ « Date client » (modification), enregistré, vidé = null ; ouvert depuis le Gantt (double-clic) et depuis l’onglet Planning', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E360', []);
  const j = await jalonAvec(request, m.projet.id, 'Jalon 360');
  await connecterAvec(page, m.emailChef);
  await ouvrirPlanning(page, m.projet.id);
  await page.getByRole('button', { name: 'Jalon 360', exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: 'Modifier le jalon' });
  await expect(dialogue.getByLabel('Date client')).toHaveValue('');
  await dialogue.getByLabel('Date client').fill('2027-02-10');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialogue).toHaveCount(0);
  expect((await lireElements(page, m.projet.id)).elements.find((e) => e.id === j.id)).toMatchObject(
    {
      date_client: '2027-02-10',
    },
  );

  await calculer(request, [m.projet.id]);
  await ouvrirGantt(page, m.projet.id);
  await barre(page, j.id).dblclick();
  const depuisGantt = page.getByRole('dialog', { name: 'Modifier le jalon' });
  await expect(depuisGantt.getByLabel('Date client')).toHaveValue('2027-02-10');
  await depuisGantt.getByLabel('Date client').fill('');
  await depuisGantt.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(depuisGantt).toHaveCount(0);
  expect((await lireElements(page, m.projet.id)).elements.find((e) => e.id === j.id)).toMatchObject(
    {
      date_client: null,
    },
  );
});

test('E2E-361-r1 : refus : sous-activité sous une activité vendue (écran) et 422 activite_parente (intercepté) : texte exact, dialogue ouvert, rien créé', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E361', []);
  await activiteAvec(request, m.projet.id, 'Vendue 361', { charge_vendue: 5 });
  const libre = await activiteAvec(request, m.projet.id, 'Libre 361');
  await connecterAvec(page, m.emailChef);
  await ouvrirPlanning(page, m.projet.id);
  const avant = (await lireElements(page, m.projet.id)).elements.length;

  await page.getByRole('button', { name: 'Ajouter une sous-activité à Vendue 361' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Nouvelle sous-activité' });
  await dialogue.getByLabel('Nom').fill('Enfant refusé');
  await dialogue.getByRole('button', { name: 'Créer' }).click();
  await expect(
    dialogue.getByText(
      'Cette activité porte une charge vendue : elle ne peut pas recevoir d’enfant.',
    ),
  ).toBeVisible();
  await expect(dialogue).toBeVisible();
  expect((await lireElements(page, m.projet.id)).elements).toHaveLength(avant);
  await fermerEnAbandonnant(page, dialogue);

  await page.route(`**/api/activites/${libre.id}`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            erreur: 'Règle de planning non respectée',
            code: 'activite_parente',
          }),
        })
      : route.continue(),
  );
  await page.getByRole('button', { name: 'Libre 361', exact: true }).click();
  const modif = page.getByRole('dialog', { name: 'Modifier l’activité' });
  await modif.getByLabel('Charge vendue (j)').fill('2');
  await modif.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    modif.getByText('Une activité parente ne porte pas de charge vendue.'),
  ).toBeVisible();
  await expect(modif).toBeVisible();
});

test('E2E-362-r4 : Gantt du projet (administrateur) : colonnes « Vendu » et « Marge » après « Charge », marge négative en couleur flag, « — », parent = somme, jalon vide, région « Totaux du projet »', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const m = await monde(request, 'E2E362', 3);
  const parent = await activiteAvec(request, m.projet.id, 'Parent 362');
  const f1 = await activiteAvec(request, m.projet.id, 'Positive 362', {
    parent_id: parent.id,
    charge_vendue: 10,
  });
  await m.api.assignation(f1.id, m.gens.Alice!.id, 4);
  // Sans charge vendue ni assignation : « — » en Vendu et Marge (la marge du projet reste vendu − assigné).
  await activiteAvec(request, m.projet.id, 'Sans vendue 362', { parent_id: parent.id });
  await jalonAvec(request, m.projet.id, 'Jalon 362');
  await calculer(request, [m.projet.id]);
  await loginAsAdmin(page);
  await ouvrirGantt(page, m.projet.id);

  const entetes = (await page.getByRole('columnheader').allTextContents()).map((t) => t.trim());
  expect(entetes.slice(entetes.indexOf('Charge'), entetes.indexOf('Charge') + 3)).toEqual([
    'Charge',
    'Vendu',
    'Marge',
  ]);
  const vendu = await cellule(page, 'Tâche E2E362', 'Vendu');
  const marge = await cellule(page, 'Tâche E2E362', 'Marge');
  await expect(vendu).toHaveText('3');
  await expect(marge).toHaveText('−1');
  await expect(marge).toHaveCSS('color', FLAG);
  await expect(await cellule(page, 'Positive 362', 'Marge')).toHaveText('6');
  await expect(await cellule(page, 'Positive 362', 'Marge')).not.toHaveCSS('color', FLAG);
  await expect(await cellule(page, 'Sans vendue 362', 'Vendu')).toHaveText('—');
  await expect(await cellule(page, 'Sans vendue 362', 'Marge')).toHaveText('—');
  await expect(await cellule(page, 'Parent 362', 'Vendu')).toHaveText('10');
  await expect(await cellule(page, 'Parent 362', 'Marge')).toHaveText('6');
  await expect(await cellule(page, 'Jalon 362', 'Vendu')).toHaveText('');
  await expect(await cellule(page, 'Jalon 362', 'Marge')).toHaveText('');

  const region = regionTotaux(page);
  await expect(region).toHaveText(
    'Vendu 13 j · Assigné 8 j · Marge 5 j · Réel 0 j · Coût planifié 0,00 € · Coût réel 0,00 €Exporter les coûts',
  );
  const boiteRegion = await region.boundingBox();
  const boiteTableau = await page.getByRole('table').first().boundingBox();
  expect(boiteRegion!.y + boiteRegion!.height).toBeLessThanOrEqual(boiteTableau!.y + 0.5);

  // Projet sans charge vendue : « — ».
  const vide = await monde3b(request, 'E2E362B', []);
  // Projet sans élément : état vide, sans SVG (SPEC §6, 3b point 9).
  await page.goto(`/projets/${vide.projet.id}?onglet=gantt`);
  await expect(regionTotaux(page)).toHaveText(
    'Vendu — j · Assigné 0 j · Marge — j · Réel 0 j · Coût planifié 0,00 € · Coût réel 0,00 €Exporter les coûts',
  );
});

test('E2E-363-r1 : jalon à date client : losange, texte d’écart, badge « Client », nom accessible ; écart négatif : neutre, sans badge', async ({
  page,
  request,
}) => {
  await colonnesCompletes(page);
  const m = await monde3b(request, 'E2E363', []);
  const retard = await jalonAvec(request, m.projet.id, 'Dépassé 363', {
    type: 'fixe',
    date_validee: '2027-01-08',
    date_client: '2027-01-06',
  });
  const tenu = await jalonAvec(request, m.projet.id, 'Tenu 363', {
    type: 'fixe',
    date_validee: '2027-01-08',
    date_client: '2027-01-11',
  });
  await calculer(request, [m.projet.id]);
  await loginAsAdmin(page);
  await ouvrirGantt(page, m.projet.id);

  const losange = losangeClient(page, retard.id);
  await expect(losange).toHaveCount(1);
  await expect(losange).toHaveAttribute('aria-hidden', 'true');
  await expect(losange).toHaveCSS('pointer-events', 'none');
  expect(await losange.evaluate((e) => getComputedStyle(e).stroke)).toBe(FLAG);
  const boiteLosange = (await losange.boundingBox())!;
  const boiteJalon = (await barre(page, retard.id).boundingBox())!;
  expect(boiteLosange.x + boiteLosange.width / 2).toBeLessThan(boiteJalon.x + boiteJalon.width / 2);
  expect(Math.abs(boiteLosange.y - boiteJalon.y)).toBeLessThan(1);
  await expect(ecartClient(page, retard.id)).toHaveText('+2 j');
  await expect(ecartClient(page, retard.id)).toHaveAttribute('aria-hidden', 'true');
  const badge = (await cellule(page, 'Dépassé 363', 'Drapeaux')).getByText('Client', {
    exact: true,
  });
  await expect(badge).toHaveAttribute('title', 'Engagement client dépassé');
  await expect(barre(page, retard.id)).toHaveAttribute(
    'aria-label',
    'Dépassé 363, le 08/01/2027, date client 06/01/2027, écart +2 j, engagement client dépassé',
  );

  await expect(losangeClient(page, tenu.id)).toHaveCount(1);
  expect(await losangeClient(page, tenu.id).evaluate((e) => getComputedStyle(e).stroke)).not.toBe(
    FLAG,
  );
  await expect(ecartClient(page, tenu.id)).toHaveText('−3 j');
  await expect(
    (await cellule(page, 'Tenu 363', 'Drapeaux')).getByText('Client', { exact: true }),
  ).toHaveCount(0);
  await expect(barre(page, tenu.id)).toHaveAttribute(
    'aria-label',
    'Tenu 363, le 08/01/2027, date client 11/01/2027, écart −3 j',
  );
});

test('E2E-364 : la plage du Gantt inclut la date client (08/03/2027, au-delà des autres dates)', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E364', []);
  const j = await jalonAvec(request, m.projet.id, 'Lointain 364', {
    type: 'fixe',
    date_validee: '2027-01-08',
    date_client: '2027-03-08',
  });
  await calculer(request, [m.projet.id]);
  await loginAsAdmin(page);
  await ouvrirGantt(page, m.projet.id);
  const svg = page.locator('svg[data-zoom]');
  const boiteSvg = (await svg.boundingBox())!;
  const losange = (await losangeClient(page, j.id).boundingBox())!;
  expect(losange.x).toBeGreaterThanOrEqual(boiteSvg.x);
  expect(losange.x + losange.width).toBeLessThanOrEqual(boiteSvg.x + boiteSvg.width);
  await expect(ecartClient(page, j.id)).toHaveText('−59 j');
});

test('E2E-365-r2 : témoin, chef de projet en lecture seule : ni colonnes, ni région, ni marqueur, ni badge ; réponses sans les clés', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E365', 3);
  const j = await jalonAvec(request, m.projet.id, 'Jalon 365', {
    type: 'fixe',
    date_validee: '2027-01-08',
    date_client: '2027-01-06',
  });
  await calculer(request, [m.projet.id]);
  const email = await chefLecteur(request, m.projet.id, 'E365');
  // E2E-365-r2 : chaque corps est lu par page.route (la réponse est récupérée par le test avant d'être servie à la page).
  const corpsLus: string[] = [];
  await page.route(/\/api\/projets\/\d+\/(gantt|planning)$/, async (route) => {
    const rep = await route.fetch();
    corpsLus.push(await rep.text());
    await route.fulfill({ response: rep });
  });
  await connecterAvec(page, email);
  await ouvrirGantt(page, m.projet.id);
  await expect(page.getByRole('cell', { name: 'Jalon 365', exact: true })).toBeVisible();
  const entetes = (await page.getByRole('columnheader').allTextContents()).map((t) => t.trim());
  expect(entetes).not.toContain('Vendu');
  expect(entetes).not.toContain('Marge');
  await expect(regionTotaux(page)).toHaveCount(0);
  await expect(page.locator('svg [data-date-client]')).toHaveCount(0);
  await expect(page.locator('svg [data-ecart-client]')).toHaveCount(0);
  await expect(page.getByText('Client', { exact: true })).toHaveCount(0);
  await expect(barre(page, j.id)).toHaveAttribute('aria-label', 'Jalon 365, le 08/01/2027');
  await ouvrirPlanning(page, m.projet.id);
  await expect(page.getByRole('cell', { name: 'Jalon 365', exact: true })).toBeVisible();
  expect(corpsLus.length).toBeGreaterThanOrEqual(2);
  for (const corps of corpsLus) {
    expect(corps).not.toMatch(
      /charge_vendue|"marge"|date_client|ecart_client|engagement_depasse|totaux/,
    );
  }
});

/** Révision D-212 (7) : séparateur porté au maximum (80 % de la vue) par un glisser à la souris. */
async function separateurAuMaximum(page: Page) {
  const sep = page.getByRole('separator', { name: 'Largeur du tableau', exact: true });
  const max = Number(await sep.getAttribute('aria-valuemax'));
  const b = (await sep.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + 20);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 3000, b.y + 20, { steps: 10 });
  await page.mouse.up();
  await expect(sep).toHaveAttribute('aria-valuenow', String(max));
}

for (const largeur of LARGEURS) {
  test(`E2E-366-r4 (${largeur} px) : critères D-069 (a) à (d) avec « Vendu », « Marge » et le badge « Client »`, async ({
    page,
    request,
  }) => {
    await colonnesCompletes(page);
    await sansColonneRessources(page); // D-238 (1)
    const m = await monde(request, `E2E366-${largeur}`, 3);
    const nom = `Tâche E2E366-${largeur}`;
    const j = await jalonAvec(request, m.projet.id, `Jalon ${largeur}`, {
      type: 'fixe',
      date_validee: '2027-01-08',
      date_client: '2027-01-06',
    });
    const simple = await activiteAvec(request, m.projet.id, `Simple ${largeur}`, {
      charge_vendue: 2,
    });
    await m.api.assignation(simple.id, m.gens.Alice!.id, 1);
    await calculer(request, [m.projet.id]);
    await loginAsAdmin(page);
    await ouvrirGantt(page, m.projet.id, largeur);
    if (largeur === 1440) await separateurAuMaximum(page);

    const tableau = page.getByRole('table').first();
    const zone = tableau.locator('xpath=ancestor::div[@tabindex][1]');
    const entetes = tableau.getByRole('columnheader');
    const n = await entetes.count();
    const drapeaux = (await entetes.nth(n - 1).boundingBox())!;
    // (a) badge « Client » entièrement visible, sans défilement du tableau.
    const badge = (await cellule(page, `Jalon ${largeur}`, 'Drapeaux')).getByText('Client', {
      exact: true,
    });
    const boiteBadge = (await badge.boundingBox())!;
    const boiteZone = (await zone.boundingBox())!;
    expect(boiteBadge.x).toBeGreaterThanOrEqual(boiteZone.x - 0.5);
    expect(boiteBadge.x + boiteBadge.width).toBeLessThanOrEqual(
      boiteZone.x + boiteZone.width + 0.5,
    );
    expect(await zone.evaluate((e) => e.scrollLeft)).toBe(0);
    // (b) aucun en-tête précédent n'est recouvert par Drapeaux ; WBS et Nom visibles.
    // D-153 (2) : tous les en-têtes à 1440 px ; WBS et Nom seulement à 1024 px (D-069 (b)).
    for (let i = 0; i < (largeur === 1440 ? n - 1 : 2); i++) {
      const b = (await entetes.nth(i).boundingBox())!;
      expect(b.x + b.width, `en-tête ${i}`).toBeLessThanOrEqual(drapeaux.x + 0.5);
    }
    await expect(page.getByRole('cell', { name: nom, exact: true })).toBeVisible();
    // (c) la page ne défile pas en horizontal.
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    // (d) une ligne à badge a la hauteur d'une ligne sans badge.
    const hBadge = (await ligne(page, `Jalon ${largeur}`).boundingBox())!.height;
    const hSans = (await ligne(page, `Simple ${largeur}`).boundingBox())!.height;
    expect(Math.abs(hBadge - hSans)).toBeLessThanOrEqual(0.5);
    expect(j.id).toBeGreaterThan(0);
  });
}

test('E2E-367-r1 : témoin, Accueil inchangé : ni « Vendu » ni « Marge », ni « Totaux du projet », ni marqueur client', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E367', 3);
  await jalonAvec(request, m.projet.id, 'Jalon 367', {
    type: 'fixe',
    date_validee: '2027-01-08',
    date_client: '2027-01-06',
  });
  await calculer(request, [m.projet.id]);
  await loginAsAdmin(page);
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: `Replier ${'Projet E2E367'}`, exact: true }),
  ).toBeVisible(); // D-218 (4), (9) : déplié au chargement
  await expect(page.getByRole('button', { name: 'Jalon 367', exact: true })).toBeVisible();
  const entetes = (await page.getByRole('columnheader').allTextContents()).map((t) => t.trim());
  expect(entetes).not.toContain('Vendu');
  expect(entetes).not.toContain('Marge');
  await expect(page.getByRole('region', { name: 'Totaux du projet' })).toHaveCount(0);
  await expect(page.locator('svg [data-date-client]')).toHaveCount(0);
  await expect(page.locator('svg [data-ecart-client]')).toHaveCount(0);
});
