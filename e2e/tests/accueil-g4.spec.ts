// Gantt global sur Accueil, tranche G4 (D-080 points 8 et 9) : E2E-102 à E2E-110.
// Base « administrateur seul », horloge du navigateur figée au 06/01/2027. Données par l'API sauf E2E-110
// (parcours complet, tout à l'écran).
import { expect, test, type Browser, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { sousProjet } from './lot3b-helpers.js';
import { cheminCapture } from './captures.js';
import {
  allerA,
  base3c,
  creerProjetParEcran,
  creerRessourceParEcran,
  D0_FIGE,
  dialogueCalcul,
  etatsCases,
  J06,
  libellesCases,
  lireGantt,
  notification,
  ouvrirCalendriers,
  projetPret,
  remettreAdminSeul,
} from './lot3c-helpers.js';
import { replierTout } from './retouches-rex6-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul);

const zoneTableau = (page: Page) =>
  page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });
const zoneCalendrier = (page: Page) =>
  page.getByRole('region', { name: 'Calendrier du Gantt global', exact: true });
const boutonCalculer = (page: Page) => page.getByRole('button', { name: 'Calculer', exact: true });
const deplier = (page: Page, nom: string) =>
  page.getByRole('button', { name: `Déplier ${nom}`, exact: true });
const bandeauNonCalcule = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning non calculé' });

async function ouvrirDialogue(page: Page) {
  await boutonCalculer(page).click();
  const dialogue = dialogueCalcul(page);
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByText('Chargement des projets…')).toBeHidden();
  return dialogue;
}

/** Session neuve (autre contexte de navigateur), horloge figée, connectée par l'écran de connexion. */
async function pageConnectee(browser: Browser, email: string): Promise<Page> {
  const p = await (await browser.newContext()).newPage();
  await p.clock.setFixedTime(J06);
  await connecterAvec(p, email);
  return p;
}

test('E2E-102 administrateur : bouton visible, dialogue avec les racines où il écrit, triées, toutes cochées', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const c = await api.projet('R-c', 'Racine c', chef.id);
  await api.projet('R-A', 'Racine A', chef.id);
  await api.projet('R-b', 'Racine b', chef.id);
  await sousProjet(request, c.id, 'S-1', 'Sous-projet S', chef.id);
  await api.modele('M-1', 'Modèle M');
  const clos = await api.projet('X-9', 'Projet clos X', chef.id);
  expect((await request.patch(`/api/projets/${clos.id}`, { data: { clos: true } })).ok()).toBe(
    true,
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await expect(zoneTableau(page)).toBeVisible();
  await expect(boutonCalculer(page)).toBeVisible();
  const dialogue = await ouvrirDialogue(page);
  expect(await libellesCases(dialogue)).toEqual([
    'R-A — Racine A',
    'R-b — Racine b',
    'R-c — Racine c',
  ]);
  expect(await etatsCases(dialogue)).toEqual([true, true, true]);
  await expect(dialogue.getByLabel('Date de début du calcul')).toHaveValue(D0_FIGE);
  await page.screenshot({ path: cheminCapture('accueil-calcul.png') });
});

test('E2E-103-r1 calcul réussi : dialogue fermé, notification, barres de synthèse, dépliage conservé et rechargé', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, 'G4-103A');
  const b = await projetPret(api, chef.id, 'G4-103B');
  let lecturesA = 0;
  let lecturesB = 0;
  page.on('request', (r) => {
    const m = /\/api\/projets\/(\d+)\/gantt$/.exec(new URL(r.url()).pathname);
    if (!m || r.method() !== 'GET') return;
    if (Number(m[1]) === a.projet.id) lecturesA++;
    if (Number(m[1]) === b.projet.id) lecturesB++;
  });
  await loginAsAdmin(page);
  await replierTout(page); // D-218 (4), (9)
  await deplier(page, 'Projet G4-103A').click();
  await expect(page.getByRole('button', { name: 'Replier Projet G4-103A' })).toBeVisible();
  await expect(zoneTableau(page).getByText('Activité G4-103A')).toBeVisible();
  await expect(zoneCalendrier(page).locator('[data-element-id]')).toHaveCount(0);
  await expect(bandeauNonCalcule(page)).toBeVisible();
  expect(lecturesA).toBe(1);

  const dialogue = await ouvrirDialogue(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();

  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect(dialogueCalcul(page)).toHaveCount(0);
  await expect(bandeauNonCalcule(page)).toHaveCount(0);
  const synthese = zoneCalendrier(page).locator('[data-projet-id]');
  await expect(synthese).toHaveCount(2);
  await expect(synthese.first()).toHaveAttribute('role', 'img');
  await expect(page.getByRole('button', { name: 'Replier Projet G4-103A' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  const barres = zoneCalendrier(page).locator('[data-element-id]');
  await expect(barres).toHaveCount(1);
  await expect(barres.first()).toHaveAttribute('data-debut', '2027-01-06');
  await expect(barres.first()).toHaveAttribute('data-fin', '2027-01-07');
  await expect(deplier(page, 'Projet G4-103B')).toHaveAttribute('aria-expanded', 'false');
  expect(lecturesA).toBe(2);
  // D-218 (4) : B, replié, n'a été lu qu'au chargement initial, pas au rechargement.
  expect(lecturesB).toBe(1);
  const gantt = await lireGantt(request, b.projet.id);
  expect(gantt.elements[0]).toMatchObject({ debut_planifie: '2027-01-06' });
});

test('E2E-104 chef de projet : seuls ses projets proposés, cochés, et envoyés', async ({
  request,
  browser,
}) => {
  const { api } = await base3c(request);
  const c1 = await api.utilisateur('Chef C1', 'c1@g4.test', 'chef_de_projet');
  const c2 = await api.utilisateur('Chef C2', 'c2@g4.test', 'chef_de_projet');
  const p1 = await api.projet('C1-1', 'Projet C1-1', c1.id);
  const p2 = await api.projet('C1-2', 'Projet C1-2', c1.id);
  await api.projet('C2-1', 'Projet C2-1', c2.id);

  const chef = await pageConnectee(browser, 'c1@g4.test');
  let envoye: unknown;
  await chef.route('**/api/calcul', async (route) => {
    envoye = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      json: {
        d0: D0_FIGE,
        horizon: '2030-01-06',
        projets: [p1.id, p2.id],
        ignores: [],
        lignes: 0,
        avertissements: [],
      },
    });
  });
  await expect(zoneTableau(chef)).toBeVisible();
  await expect(boutonCalculer(chef)).toBeVisible();
  const dialogue = await ouvrirDialogue(chef);
  expect(await libellesCases(dialogue)).toEqual(['C1-1 — Projet C1-1', 'C1-2 — Projet C1-2']);
  expect(await etatsCases(dialogue)).toEqual([true, true]);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect.poll(() => envoye).toBeTruthy();
  const corps = envoye as { projets: number[]; d0: string };
  expect([...corps.projets].sort((x, y) => x - y)).toEqual([p1.id, p2.id]);
  expect(corps.d0).toBe(D0_FIGE);
});

test('E2E-105-r1 chef en lecture seule : projet affiché, jamais de bouton « Calculer »', async ({
  page,
  request,
  browser,
}) => {
  const { api, chef } = await base3c(request);
  const p = await api.projet('G4-105', 'Projet G4-105', chef.id);
  await api.activite(p.id, 'Activité G4-105');
  const lecteur = await api.utilisateur(
    'Chef lecteur G4',
    'lecteur@g4.test',
    'chef_de_projet',
    true,
  );
  const ressource = await api.utilisateur('Ressource G4', 'ressource@g4.test', 'ressource', true);
  await api.affectation(p.id, lecteur.id);
  await api.affectation(p.id, ressource.id);

  // témoin : l'administrateur voit le bouton sur la même base
  await loginAsAdmin(page);
  await expect(zoneTableau(page).getByText('Projet G4-105')).toBeVisible();
  await expect(boutonCalculer(page)).toBeVisible();

  // Révision 6b (D-031, D-148 (9)) : la ressource n'a plus d'Accueil ; témoin = chef lecteur seul.
  for (const email of ['lecteur@g4.test']) {
    const autre = await pageConnectee(browser, email);
    await expect(zoneTableau(autre).getByText('Projet G4-105'), email).toBeVisible();
    expect((await lireGantt(autre.request, p.id)).projet.peut_ecrire, email).toBe(false);
    await expect(boutonCalculer(autre), email).toHaveCount(0);
  }
});

test('E2E-106 avertissements reste_non_pose listés, une ligne par avertissement', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, 'G4-106A');
  const b = await projetPret(api, chef.id, 'G4-106B');
  await page.route('**/api/calcul', (route) =>
    route.fulfill({
      status: 200,
      json: {
        d0: D0_FIGE,
        horizon: '2030-01-06',
        projets: [a.projet.id, b.projet.id],
        ignores: [],
        lignes: 0,
        avertissements: [
          { code: 'reste_non_pose', assignation_id: a.assignation.id, reste: 1.5 },
          { code: 'reste_non_pose', assignation_id: b.assignation.id, reste: 0.25 },
        ],
      },
    }),
  );
  await loginAsAdmin(page);
  const dialogue = await ouvrirDialogue(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(dialogueCalcul(page)).toHaveCount(0);
  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  const avertissement = page.getByRole('status').filter({ hasText: 'pas pu être posée' });
  await expect(avertissement.getByRole('listitem')).toHaveText([
    'Activité G4-106A — Ressource G4-106A : 1,5 j non posé',
    'Activité G4-106B — Ressource G4-106B : 0,25 j non posé',
  ]);
});

test('E2E-107 refus 409 simulé : message, dialogue ouvert, rien calculé', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, 'G4-107');
  await page.route('**/api/calcul', (route) =>
    route.fulfill({ status: 409, json: { erreur: 'Un calcul est déjà en cours' } }),
  );
  await loginAsAdmin(page);
  const dialogue = await ouvrirDialogue(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(dialogue.getByRole('alert')).toHaveText(
    'Un calcul est déjà en cours. Réessayez dans un instant.',
  );
  await expect(dialogue).toBeVisible();
  expect((await lireGantt(request, a.projet.id)).elements.map((e) => e.debut_planifie)).toEqual([
    null,
  ]);
  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialogueCalcul(page)).toHaveCount(0);
  await expect(bandeauNonCalcule(page)).toBeVisible();
});

test('E2E-108-r1 refus 422 cycle simulé : noms résolus parmi les éléments chargés, « élément <id> » sinon', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  const a = await projetPret(api, chef.id, 'G4-108A');
  const b = await projetPret(api, chef.id, 'G4-108B');
  // D-218 (4) : B ne doit pas être chargé (l'Accueil se déplie au chargement) : sa lecture est refusée.
  await page.route(`**/api/projets/${b.projet.id}/gantt`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"erreur":"boum"}' }),
  );
  await page.route('**/api/calcul', (route) =>
    route.fulfill({
      status: 422,
      json: {
        erreur: 'Calcul impossible',
        code: 'cycle_dependances',
        ids: [a.activite.id, b.activite.id],
      },
    }),
  );
  await loginAsAdmin(page);
  await replierTout(page); // D-218 (4), (9)
  await deplier(page, 'Projet G4-108A').click();
  await expect(zoneTableau(page).getByText('Activité G4-108A')).toBeVisible();
  const dialogue = await ouvrirDialogue(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(dialogue.getByRole('alert')).toHaveText(
    `Calcul impossible : cycle de dépendances entre Activité G4-108A, élément ${b.activite.id}.`,
  );
  await expect(dialogue).toBeVisible();
  for (const p of [a, b]) {
    expect((await lireGantt(request, p.projet.id)).elements.map((e) => e.debut_planifie)).toEqual([
      null,
    ]);
  }
});

test('E2E-109-r5 ordre de tabulation : zoom, « Calculer », « Tout déplier », tableau, calendrier', async ({
  page,
  request,
}) => {
  const { api, chef } = await base3c(request);
  await api.projet('P109', 'Projet109', chef.id);
  await loginAsAdmin(page);
  await replierTout(page); // D-218 (4), (9)
  await expect(zoneTableau(page)).toHaveAttribute('tabindex', '0');

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
  // Révision -r1 (D-031, D-091) : la case « Initiales » s'insère après « Mois ».
  const ordre: string[] = [await libelle()];
  // Révision -r2 (D-031, D-127 (6), (7)) : le crayon « Modifier le projet <nom> » suit le lien du projet.
  // Révision D-213 : le séparateur « Largeur du tableau » précède la zone du calendrier.
  // Révision -r4 (D-216 (3)) : « Colonnes » après « Initiales » ; poignées de largeur des colonnes après la
  // zone du tableau, dans l'ordre des en-têtes, avant le contenu des lignes.
  for (let i = 0; i < 17; i++) {
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
    'Largeur de la colonne Drapeaux',
    'Déplier Projet109',
    'Projet109',
    'Modifier le projet Projet109',
    'Largeur du tableau',
    'Calendrier du Gantt global',
  ]);
});

test('E2E-110-r2 parcours complet à l’écran jusqu’au calcul lancé depuis l’Accueil', async ({
  page,
}) => {
  await loginAsAdmin(page);

  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal G4-110');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal G4-110/ })).toBeVisible();

  await creerRessourceParEcran(page, 'Ressource G4-110', 'ressource-g4-110@g4.test', 'Cal G4-110');
  await creerProjetParEcran(page, 'G4-110', 'Projet G4-110');

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet G4-110' }).click();
  await expect(page.getByRole('heading', { name: 'Projet G4-110', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Ressource')
    .selectOption({ label: 'Ressource G4-110' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource G4-110/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Activité G4-110');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Activité G4-110/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Activité G4-110' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource G4-110' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Activité G4-110.*Ressource G4-110/ })).toBeVisible();

  await allerA(page, 'Accueil');
  await replierTout(page); // D-218 (4), (9)
  await expect(bandeauNonCalcule(page)).toBeVisible();
  const dialogue = await ouvrirDialogue(page);
  expect(await libellesCases(dialogue)).toEqual(['G4-110 — Projet G4-110']);
  expect(await etatsCases(dialogue)).toEqual([true]);
  await expect(dialogue.getByLabel('Date de début du calcul')).toHaveValue(D0_FIGE);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();

  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect(dialogueCalcul(page)).toHaveCount(0);
  await expect(bandeauNonCalcule(page)).toHaveCount(0);
  await expect(zoneCalendrier(page).locator('[data-projet-id]')).toHaveCount(1);

  await deplier(page, 'Projet G4-110').click();
  const barres = zoneCalendrier(page).locator('[data-element-id]');
  await expect(barres).toHaveCount(1);
  await expect(barres.first()).toHaveAttribute('data-debut', '2027-01-06');
  await expect(barres.first()).toHaveAttribute('data-fin', '2027-01-07');
});
