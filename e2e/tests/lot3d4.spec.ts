// Lot 3d-4 (D-100, D-101) : recalcul automatique du Gantt du projet. E2E-158 à E2E-170.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, D0 des calculs de préparation 2027-01-04 (d0 du recalcul : 2027-01-06, date du navigateur),
// zoom jour (24 px par jour), données créées par l'API sauf E2E-170 (tout à l'écran). Chaque test
// part d'un contexte de navigateur neuf : localStorage vide.
// Contrat (à relire) : case à cocher « Recalcul automatique » (role checkbox) juste après « Calculer » ;
// pendant un calcul, `role="status"` « Recalcul en cours… » remplace le bandeau « Planning à recalculer »
// et le bouton « Calculer » de la barre d'outils est désactivé ; alerte `role="alert"` avec bouton
// « Fermer » (celle des gestes) ; clé localStorage `planersource.recalculAuto` ('1' ou '0').
// Les PATCH et les POST /api/calcul sont comptés dans les routes interceptées (`suivreCalculs`).
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { activiteAvec, calculer, sousProjet } from './lot3b-helpers.js';
import {
  allerA,
  boutonsCalculer,
  creerProjetParEcran,
  creerRessourceParEcran,
  dialogueCalcul,
  remettreAdminSeul,
} from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';
const D0 = '2027-01-06';
const CLE = 'planersource.recalculAuto';
const TITRE_ACTIVITE = 'Modifier l’activité';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom = 'jour') => `/projets/${projetId}?onglet=gantt&zoom=${zoom}`;
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const contours = (page: Page) => page.locator('svg [data-contour-element]');
const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning à recalculer' });
const enCours = (page: Page) => page.getByRole('status').filter({ hasText: 'Recalcul en cours…' });
const alertes = (page: Page) => page.getByRole('alert');
const caseAuto = (page: Page) =>
  page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true });
const zone = (page: Page) => page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
const planningCalcule = (page: Page) =>
  page.locator('[role="status"], [role="alert"]').filter({ hasText: 'Planning calculé.' });

const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

/** Les PATCH d'activité émis par la page. */
function suivrePatchs(page: Page): string[] {
  const patchs: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && /\/api\/activites\/\d+$/.test(r.url())) patchs.push(r.url());
  });
  return patchs;
}

interface Reponse {
  status: number;
  json: unknown;
}

/**
 * Intercepte POST /api/calcul : corps reçus, nombre maximal de POST en vol en même temps. `retenir` :
 * les POST attendent `liberer()`. `reponses` : réponses simulées, une par POST (sinon le vrai serveur).
 */
async function suivreCalculs(
  page: Page,
  options: { retenir?: boolean; reponses?: Reponse[] } = {},
) {
  const etat = { corps: [] as unknown[], enVol: 0, maxVol: 0 };
  let liberer: () => void = () => undefined;
  const porte = options.retenir ? new Promise<void>((r) => (liberer = r)) : Promise.resolve();
  const reponses = [...(options.reponses ?? [])];
  await page.route('**/api/calcul', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    etat.corps.push(route.request().postDataJSON());
    etat.enVol++;
    etat.maxVol = Math.max(etat.maxVol, etat.enVol);
    await porte;
    const simulee = reponses.shift();
    if (simulee) {
      etat.enVol--;
      return route.fulfill(simulee);
    }
    const vraie = await route.fetch();
    etat.enVol--;
    return route.fulfill({ response: vraie });
  });
  return { etat, liberer: () => liberer() };
}

/** Appui au centre de `cible`, déplacement de (dx, 0) pixels, relâchement. */
async function glisser(page: Page, cible: Locator, dx: number): Promise<void> {
  await cible.scrollIntoViewIfNeeded();
  const b = (await cible.boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: Math.max(1, Math.ceil(Math.abs(dx) / 6)) });
  await page.mouse.up();
  await laisserPasser(page);
}

const START_11 = { mode: 'START', debut_valide: '2027-01-11' };

/**
 * Monde de base : un chef, Alice (et Bob si demandé) affectées au projet ; A, START `debut_valide`
 * 2027-01-11, 5 j sur Alice, calculée avec d0 2027-01-04 : du 11 au 15/01. Avec Bob : B, START
 * 2027-01-11, 3 j sur Bob (11 au 13/01).
 */
async function mondeA(request: APIRequestContext, suffixe: string, avecB = false) {
  const api = await preparer(request);
  const emailChef = `chef-${suffixe.toLowerCase()}@example.test`;
  const chef = await api.utilisateur('Chef', emailChef, 'chef_de_projet');
  const projet = await api.projet(`P-${suffixe}`, `Projet ${suffixe}`, chef.id);
  const emailAlice = `alice-${suffixe.toLowerCase()}@example.test`;
  const alice = await api.utilisateur('Alice', emailAlice, 'ressource', true);
  await api.affectation(projet.id, alice.id);
  const a = await activiteAvec(request, projet.id, 'Tâche A', START_11);
  const assignation = await api.assignation(a.id, alice.id, 5);
  let b: { id: number } | undefined;
  if (avecB) {
    const bob = await api.utilisateur(
      'Bob',
      `bob-${suffixe.toLowerCase()}@example.test`,
      'ressource',
      true,
    );
    await api.affectation(projet.id, bob.id);
    b = await activiteAvec(request, projet.id, 'Tâche B', START_11);
    await api.assignation(b.id, bob.id, 3);
  }
  await calculer(request, [projet.id]);
  return { api, chef, emailChef, emailAlice, alice, projet, a, assignation, b };
}
type Monde = Awaited<ReturnType<typeof mondeA>>;

/** Connexion du chef, page Gantt du projet, préambule : nom accessible de départ de A (et de B). */
async function ouvrirGantt(page: Page, m: Monde, projetId = m.projet.id) {
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(projetId));
  await expect(barre(page, m.a.id)).toHaveAttribute(
    'aria-label',
    'Tâche A, du 11/01/2027 au 15/01/2027',
  );
  if (m.b) {
    await expect(barre(page, m.b.id)).toHaveAttribute(
      'aria-label',
      'Tâche B, du 11/01/2027 au 13/01/2027',
    );
  }
}

/** Ouvre « Modifier <nom> » depuis l'onglet Planning ; l'appelant l'enregistre ou le ferme. */
async function dialoguePlanning(page: Page, nom: string) {
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: `Modifier ${nom}`, exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await expect(dialogue).toBeVisible();
  return dialogue;
}

test('E2E-158 : case « Recalcul automatique » visible et décochée pour le chef ; absente pour une ressource, sur un modèle et sur l’Accueil', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E158');
  const modele = await m.api.modele('M-158', 'Modèle 158');
  await ouvrirGantt(page, m);
  await expect(caseAuto(page)).toBeVisible();
  await expect(caseAuto(page)).not.toBeChecked();

  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Tableau du Gantt global' })).toBeVisible();
  await expect(caseAuto(page)).toHaveCount(0);

  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(gantt(modele.id));
  await expect(page.getByRole('region', { name: 'Gantt', exact: true })).toBeVisible();
  await expect(caseAuto(page)).toHaveCount(0);

  await page.context().clearCookies();
  await connecterAvec(page, m.emailAlice);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.a.id)).toBeVisible();
  await expect(caseAuto(page)).toHaveCount(0);
});

test('E2E-159 : la préférence est gardée au rechargement, dans localStorage, pour tous les projets du chef', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E159');
  const p2 = await m.api.projet('P-159B', 'Projet 159B', m.chef.id);
  await m.api.affectation(p2.id, m.alice.id);
  const a2 = await m.api.activite(p2.id, 'Activité 159B');
  await m.api.assignation(a2.id, m.alice.id, 2);
  await calculer(request, [m.projet.id, p2.id]);
  await ouvrirGantt(page, m);
  const lire = () => page.evaluate((cle) => localStorage.getItem(cle), CLE);
  expect(await lire()).toBeNull();

  await caseAuto(page).check();
  expect(await lire()).toBe('1');
  await page.reload();
  await expect(caseAuto(page)).toBeChecked();

  await page.goto(gantt(p2.id));
  await expect(barre(page, a2.id)).toBeVisible();
  await expect(caseAuto(page)).toBeChecked();

  await caseAuto(page).uncheck();
  expect(await lire()).toBe('0');
  await page.reload();
  await expect(caseAuto(page)).not.toBeChecked();
});

test('E2E-160 : geste avec case cochée → 1 PATCH puis 1 POST ; « Recalcul en cours… » et « Calculer » désactivé pendant l’attente ; après : barre à jour, ni contour ni bandeau', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E160');
  const patchs = suivrePatchs(page);
  const calculs = await suivreCalculs(page, { retenir: true });
  await ouvrirGantt(page, m);
  await caseAuto(page).check();

  await glisser(page, barre(page, m.a.id), 72);
  await expect.poll(() => patchs.length).toBe(1);
  await expect.poll(() => calculs.etat.corps.length).toBe(1);
  expect(calculs.etat.corps[0]).toEqual({ projets: [m.projet.id], d0: D0 });
  await expect(enCours(page)).toBeVisible();
  await expect(boutonsCalculer(page)).toBeDisabled();
  await expect(bandeau(page)).toHaveCount(0);

  calculs.liberer();
  await expect(barre(page, m.a.id)).toHaveAttribute('aria-label', /^Tâche A, du 14\/01\/2027/);
  await expect(contours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
  await expect(planningCalcule(page)).toHaveCount(0);
  await expect(enCours(page)).toHaveCount(0);
  expect(calculs.etat.corps.length).toBe(1);
});

test('E2E-161-r1 : Gantt d’un sous-projet, case cochée : le calcul porte sur la racine', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E161');
  const s = await sousProjet(request, m.projet.id, 'S-161', 'Sous-projet 161', m.chef.id);
  const bob = await m.api.utilisateur('Bob', 'bob-e2e161@example.test', 'ressource', true);
  await m.api.affectation(s.id, bob.id);
  const aS = await activiteAvec(request, s.id, 'Tâche A', START_11);
  await m.api.assignation(aS.id, bob.id, 5);
  await calculer(request, [m.projet.id, s.id]);
  const calculs = await suivreCalculs(page);
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(s.id));
  await expect(barre(page, aS.id)).toHaveAttribute(
    'aria-label',
    'Tâche A, du 11/01/2027 au 15/01/2027',
  );
  await caseAuto(page).check();

  await glisser(page, barre(page, aS.id), 72);
  await expect.poll(() => calculs.etat.corps.length).toBe(1);
  expect(calculs.etat.corps[0]).toEqual({ projets: [m.projet.id], d0: D0 });
});

test('E2E-162 : enregistrement du dialogue ouvert au clavier, case cochée → 1 POST, bandeau effacé, barre à jour', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E162');
  const calculs = await suivreCalculs(page);
  await ouvrirGantt(page, m);
  await caseAuto(page).check();

  await zone(page).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const dialogue = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await expect(dialogue).toBeVisible();
  await dialogue.getByLabel('Début validé').fill('2027-01-18');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(dialogue).toHaveCount(0);
  await expect.poll(() => calculs.etat.corps.length).toBe(1);
  await expect(barre(page, m.a.id)).toHaveAttribute('aria-label', /^Tâche A, du 18\/01\/2027/);
  await expect(bandeau(page)).toHaveCount(0);
  await expect(enCours(page)).toHaveCount(0);
  expect(calculs.etat.corps.length).toBe(1);
});

test('E2E-163 : case décochée, aucun POST ; cocher avec le bandeau lance un calcul ; cocher sans bandeau n’en lance pas', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E163');
  const calculs = await suivreCalculs(page);
  await ouvrirGantt(page, m);

  await glisser(page, barre(page, m.a.id), 72);
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(1);
  await laisserPasser(page);
  expect(calculs.etat.corps.length).toBe(0);

  await caseAuto(page).check();
  await expect.poll(() => calculs.etat.corps.length).toBe(1);
  await expect(contours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
  await expect(enCours(page)).toHaveCount(0);

  await caseAuto(page).uncheck();
  await caseAuto(page).check();
  await laisserPasser(page);
  await laisserPasser(page);
  expect(calculs.etat.corps.length).toBe(1);
});

test('E2E-164 : gestes pendant un calcul → un seul calcul en attente, lancé à la fin ; jamais deux POST en vol', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E164', true);
  const patchs = suivrePatchs(page);
  const calculs = await suivreCalculs(page, { retenir: true });
  await ouvrirGantt(page, m);
  await caseAuto(page).check();

  await glisser(page, barre(page, m.a.id), 72);
  await expect.poll(() => patchs.length).toBe(1);
  await expect.poll(() => calculs.etat.corps.length).toBe(1);
  await glisser(page, barre(page, m.b!.id), 72);
  await expect.poll(() => patchs.length).toBe(2);
  await glisser(page, barre(page, m.a.id), 96);
  await expect.poll(() => patchs.length).toBe(3);
  await laisserPasser(page);
  expect(calculs.etat.corps.length).toBe(1);

  calculs.liberer();
  await expect.poll(() => calculs.etat.corps.length).toBe(2);
  await expect(enCours(page)).toHaveCount(0);
  await laisserPasser(page);
  expect(calculs.etat.corps.length).toBe(2);
  expect(calculs.etat.maxVol).toBe(1);
});

test('E2E-165 : refus du calcul : texte de 3c, une seule alerte, bandeau et contour maintenus ; « Fermer » ; la modification est gardée', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E165', true);
  const patchs = suivrePatchs(page);
  await suivreCalculs(page, {
    reponses: [
      {
        status: 422,
        json: { erreur: 'Calcul impossible', code: 'cycle_dependances', ids: [m.a.id, m.b!.id] },
      },
      {
        status: 422,
        json: { erreur: 'Calcul impossible', code: 'entree_invalide', ids: [m.a.id] },
      },
      { status: 409, json: { erreur: 'Un calcul est déjà en cours' } },
      { status: 500, json: { erreur: 'Erreur interne' } },
    ],
  });
  await ouvrirGantt(page, m);
  await caseAuto(page).check();

  const attendus = [
    'Calcul impossible : cycle de dépendances entre Tâche A, Tâche B.',
    'Calcul impossible : données incomplètes sur Tâche A.',
    'Un calcul est déjà en cours. Réessayez dans un instant.',
    'Calcul impossible pour le moment. Réessayez.',
  ];
  for (const [i, texte] of attendus.entries()) {
    await glisser(page, barre(page, m.a.id), 72 + 24 * i);
    await expect.poll(() => patchs.length).toBe(i + 1);
    await expect(alertes(page)).toHaveCount(1);
    await expect(alertes(page)).toContainText(texte);
    await expect(bandeau(page)).toBeVisible();
    await expect(contours(page)).toHaveCount(1);
    await expect(enCours(page)).toHaveCount(0);
  }

  await alertes(page).getByRole('button', { name: 'Fermer' }).click();
  await expect(alertes(page)).toHaveCount(0);
  const dialogue = await dialoguePlanning(page, 'Tâche A');
  await expect(dialogue.getByLabel('Début validé')).toHaveValue('2027-01-17');
});

test('E2E-166 : avertissement reste_non_pose du recalcul : notification, pas de « Planning calculé. »', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E166');
  await suivreCalculs(page, {
    reponses: [
      {
        status: 200,
        json: {
          d0: D0,
          horizon: '2030-01-06',
          projets: [m.projet.id],
          ignores: [],
          lignes: 0,
          avertissements: [
            { code: 'reste_non_pose', assignation_id: m.assignation.id, reste: 2.5 },
          ],
        },
      },
    ],
  });
  await ouvrirGantt(page, m);
  await caseAuto(page).check();

  await glisser(page, barre(page, m.a.id), 72);
  const avertissement = page
    .getByRole('status')
    .filter({ hasText: 'Tâche A — Alice : 2,5 j non posé' });
  await expect(avertissement).toBeVisible();
  await expect(planningCalcule(page)).toHaveCount(0);
  await expect(enCours(page)).toHaveCount(0);
});

test('E2E-167 : modification par le dialogue de l’onglet Planning : aucun calcul ; témoin : un geste réussi en lance un', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E167');
  const calculs = await suivreCalculs(page);
  await ouvrirGantt(page, m);
  await caseAuto(page).check();

  const dialogue = await dialoguePlanning(page, 'Tâche A');
  await dialogue.getByLabel('Début validé').fill('2027-01-18');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialogue).toHaveCount(0);
  await laisserPasser(page);
  expect(calculs.etat.corps.length).toBe(0);
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(barre(page, m.a.id)).toBeVisible();
  await laisserPasser(page);
  await laisserPasser(page);
  expect(calculs.etat.corps.length).toBe(0);

  // Témoin positif : même scénario, avec un geste réussi.
  await glisser(page, barre(page, m.a.id), 72);
  await expect.poll(() => calculs.etat.corps.length).toBe(1);
});

test('E2E-168 : PATCH refusé (422 sans code) : alerte de 3d-3a, aucun calcul ; témoin : un geste réussi en lance un', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E168');
  const calculs = await suivreCalculs(page);
  let refuser = true;
  await page.route('**/api/activites/*', async (route) => {
    if (route.request().method() !== 'PATCH' || !refuser) return route.fallback();
    return route.fulfill({ status: 422, json: { erreur: 'Règle de planning non respectée' } });
  });
  await ouvrirGantt(page, m);
  await caseAuto(page).check();

  await glisser(page, barre(page, m.a.id), 72);
  await expect(alertes(page)).toHaveCount(1);
  await expect(alertes(page)).toContainText('Cette opération enfreint une règle du planning.');
  await laisserPasser(page);
  expect(calculs.etat.corps.length).toBe(0);

  // Témoin positif : même scénario, PATCH accepté.
  refuser = false;
  await glisser(page, barre(page, m.a.id), 72);
  await expect.poll(() => calculs.etat.corps.length).toBe(1);
});

test('E2E-169 : GET des activités en échec à l’ouverture du dialogue : alerte, aucun dialogue (D-100)', async ({
  page,
  request,
}) => {
  const m = await mondeA(request, 'E2E169');
  await page.route('**/api/projets/*/activites', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ status: 500, json: { erreur: 'Erreur interne' } });
  });
  await ouvrirGantt(page, m);

  await zone(page).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(alertes(page)).toHaveCount(1);
  await expect(alertes(page)).toContainText('Impossible de charger l’élément à modifier.');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Témoin positif : même scénario, GET accepté → le dialogue s'ouvre.
  await page.unroute('**/api/projets/*/activites');
  await alertes(page).getByRole('button', { name: 'Fermer' }).click();
  await zone(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: TITRE_ACTIVITE })).toBeVisible();
  await expect(alertes(page)).toHaveCount(0);
});

test('E2E-170 : parcours complet à l’écran, puis recalcul automatique : la barre glissée prend sa nouvelle date sans clic sur « Calculer »', async ({
  page,
}) => {
  await loginAsAdmin(page);

  await allerA(page, 'Calendriers');
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 3D-170');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 3D-170/ })).toBeVisible();

  await creerRessourceParEcran(
    page,
    'Ressource 3D-170',
    'ressource-3d-170@lot3d.test',
    'Cal 3D-170',
  );
  await creerProjetParEcran(page, '3D-170', 'Projet 3D-170');

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 3D-170' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3D-170', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Ressource')
    .selectOption({ label: 'Ressource 3D-170' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource 3D-170/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Phase 3D-170');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Phase 3D-170/ })).toBeVisible();
  await page
    .getByRole('button', { name: 'Ajouter une sous-activité à Phase 3D-170', exact: true })
    .click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 3D-170');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3D-170/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 3D-170' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource 3D-170' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3D-170.*Ressource 3D-170/ })).toBeVisible();

  // Aucune activité START dans la chaîne : « Tâche » passe en START au lundi 11/01/2027, par le dialogue.
  await page.getByRole('button', { name: 'Modifier Tâche 3D-170', exact: true }).click();
  const modifier = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await modifier.getByLabel('Mode').selectOption('START');
  await modifier.getByLabel('Début validé').fill('2027-01-11');
  await modifier.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modifier).toHaveCount(0);

  await allerA(page, 'Accueil');
  await boutonsCalculer(page).click();
  const calcul = dialogueCalcul(page);
  await expect(calcul).toBeVisible();
  await calcul.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(calcul).toHaveCount(0);

  await page.getByRole('link', { name: 'Projet 3D-170' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3D-170', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await page.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: 'Jour' }).click();
  const tache = page.getByRole('img', { name: /^Tâche 3D-170, du / });
  await expect(tache).toHaveCount(1);
  const id = Number(await tache.getAttribute('data-element-id'));
  // Préambule : date planifiée de départ = 11/01/2027 ; sinon s'arrêter et le signaler.
  await expect(barre(page, id)).toHaveAttribute('aria-label', /^Tâche 3D-170, du 11\/01\/2027/);

  await caseAuto(page).check();
  await glisser(page, barre(page, id), 72);
  // Sans clic sur « Calculer » : début planifié = 11/01 + 3 jours = 14/01/2027 (jeudi).
  await expect(barre(page, id)).toHaveAttribute('aria-label', /^Tâche 3D-170, du 14\/01\/2027/);
  await expect(contours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
});
