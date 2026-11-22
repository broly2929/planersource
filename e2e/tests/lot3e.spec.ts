// Lot 3e (D-104) : liens dans le Gantt, connecteur, clic sur un lien. E2E-171 à E2E-180.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, zoom jour (24 px par jour), données créées par l'API sauf E2E-180 (tout à l'écran),
// requêtes POST, PATCH et DELETE comptées par `page.on('request')`, contexte de navigateur neuf
// (localStorage vide).
// Monde « liens » : A START 11/01/2027 (5 j, Alice) ; B START 18/01/2027 (5 j, Bob) ; J jalon fixe
// 25/01/2027 ; sous-projet S avec une activité de Carole ; calcul avec d0 2027-01-04 ; puis C (ASAP) créée
// après le calcul, donc sans dates. Ordre des lignes : A, B, J, C, puis S (les sous-projets en dernier).
// Contrat (à relire) :
//   - connecteur : `[data-connecteur-element="<id>"]` (cercle, curseur crosshair) ;
//   - pendant le glisser : `[data-lien-provisoire]` (trait) et `[data-cible-lien="<id>"]` (ligne cible) ;
//   - lien : `[data-lien-cible="<id de dépendance>"]` (zone de clic), à côté de `[data-lien-id]` ;
//   - clic sur un lien : dialogue « Modifier la dépendance » (champs Type et Délai) avec un bouton
//     « Supprimer » ; il ouvre la confirmation « Supprimer … ? » ; Annuler la confirmation laisse le
//     dialogue « Modifier la dépendance » ouvert ;
//   - création d'un lien : bandeau « Planning à recalculer » sans contour, ou calcul si la case
//     « Recalcul automatique » est cochée ; refus : alerte `role="alert"` des gestes.
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';
import { activiteAvec, calculer, jalonAvec, lier, monde3b, sousProjet } from './lot3b-helpers.js';
import {
  allerA,
  boutonsCalculer,
  creerProjetParEcran,
  creerRessourceParEcran,
  dialogueCalcul,
  ouvrirCalendriers,
  remettreAdminSeul,
} from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';
const HAUTEUR_LIGNE = 32;
const TITRE_ACTIVITE = 'Modifier l’activité';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom = 'jour') => `/projets/${projetId}?onglet=gantt&zoom=${zoom}`;
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const barreSp = (page: Page, id: number) => page.locator(`svg [data-projet-id="${id}"]`);
const connecteurs = (page: Page) => page.locator('svg [data-connecteur-element]');
const connecteur = (page: Page, id: number) =>
  page.locator(`svg [data-connecteur-element="${id}"]`);
const liens = (page: Page) => page.locator('svg [data-lien-id]');
const zonesLien = (page: Page) => page.locator('svg [data-lien-cible]');
const provisoire = (page: Page) => page.locator('svg [data-lien-provisoire]');
const cibles = (page: Page) => page.locator('svg [data-cible-lien]');
const contours = (page: Page) => page.locator('svg [data-contour-element]');
const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning à recalculer' });
const enCours = (page: Page) => page.getByRole('status').filter({ hasText: 'Recalcul en cours…' });
const alertes = (page: Page) => page.getByRole('alert');
const caseAuto = (page: Page) =>
  page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true });
const dialogueLien = (page: Page) => page.getByRole('dialog', { name: 'Modifier la dépendance' });
const confirmation = (page: Page) => page.getByRole('dialog', { name: /^Supprimer / });

const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

/** Requêtes d'écriture émises par la page, dans l'ordre. */
interface Requetes {
  dependances: { methode: string; corps: unknown }[];
  calculs: unknown[];
  ordre: string[];
}
function suivreRequetes(page: Page): Requetes {
  const r: Requetes = { dependances: [], calculs: [], ordre: [] };
  page.on('request', (req) => {
    const m = req.method();
    if (m === 'GET') return;
    const url = req.url();
    if (/\/api\/projets\/\d+\/dependances$/.test(url) || /\/api\/dependances\/\d+$/.test(url)) {
      r.dependances.push({ methode: m, corps: m === 'DELETE' ? null : req.postDataJSON() });
      r.ordre.push(`${m} dependance`);
    } else if (m === 'POST' && /\/api\/calcul$/.test(url)) {
      r.calculs.push(req.postDataJSON());
      r.ordre.push('POST calcul');
    }
  });
  return r;
}
const parMethode = (r: Requetes, m: string) => r.dependances.filter((d) => d.methode === m);

async function centre(cible: Locator): Promise<{ x: number; y: number }> {
  const b = (await cible.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Appui sur le connecteur de `id` ; puis déplacement vers (x, y) sans relâcher. */
async function commencerGlisser(page: Page, id: number, vers: { x: number; y: number }) {
  const c = connecteur(page, id);
  await expect(c).toHaveCount(1);
  const depart = await centre(c);
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  await page.mouse.move(vers.x, vers.y, { steps: 12 });
  await laisserPasser(page);
}

/** Glisser complet du connecteur de `id` jusqu'à (x, y), relâché. */
async function glisserConnecteur(page: Page, id: number, vers: { x: number; y: number }) {
  await commencerGlisser(page, id, vers);
  await page.mouse.up();
  await laisserPasser(page);
}

/** Point d'une ligne (ordonnée de la ligne `rang` sous A), abscisse au milieu de la barre de A. */
async function pointLigne(page: Page, a: number, rang: number) {
  const c = await centre(barre(page, a));
  return { x: c.x, y: c.y + rang * HAUTEUR_LIGNE };
}

/** Point sur le premier tronçon vertical du lien FD A → B (8 px à droite de la fin de A). */
async function pointLien(page: Page, a: number) {
  const b = (await barre(page, a).boundingBox())!;
  return { x: b.x + b.width + 8, y: b.y + b.height / 2 + 10 };
}

const curseurEn = (page: Page, p: { x: number; y: number }) =>
  page.evaluate(({ x, y }) => {
    const e = document.elementFromPoint(x, y);
    return e ? getComputedStyle(e).cursor : null;
  }, p);

/** Monde « liens ». */
async function mondeLiens(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob', 'Carole']);
  const { api, projet, chef, gens } = m;
  const a = await activiteAvec(request, projet.id, 'Tâche A', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await api.assignation(a.id, gens.Alice!.id, 5);
  const b = await activiteAvec(request, projet.id, 'Tâche B', {
    mode: 'START',
    debut_valide: '2027-01-18',
  });
  await api.assignation(b.id, gens.Bob!.id, 5);
  const j = await jalonAvec(request, projet.id, 'Jalon J', {
    type: 'fixe',
    date_validee: '2027-01-25',
  });
  const s = await sousProjet(request, projet.id, `S-${suffixe}`, `Sous-projet ${suffixe}`, chef.id);
  await api.affectation(s.id, gens.Carole!.id);
  const as = await activiteAvec(request, s.id, 'Tâche S', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await api.assignation(as.id, gens.Carole!.id, 3);
  await calculer(request, [projet.id, s.id]);
  const c = await activiteAvec(request, projet.id, 'Tâche C', { mode: 'ASAP' });
  return { ...m, a, b, j, s, c };
}
type Monde = Awaited<ReturnType<typeof mondeLiens>>;

/** Connexion, page Gantt, préambule : A, B, J et S présents et à leur place, rien pour C, aucun lien. */
async function ouvrirLiens(page: Page, m: Monde, options: { email?: string; zoom?: string } = {}) {
  await connecterAvec(page, options.email ?? m.emailChef);
  await page.goto(gantt(m.projet.id, options.zoom));
  await expect(barre(page, m.a.id)).toHaveAttribute(
    'aria-label',
    'Tâche A, du 11/01/2027 au 15/01/2027',
  );
  await expect(barre(page, m.b.id)).toHaveAttribute(
    'aria-label',
    'Tâche B, du 18/01/2027 au 22/01/2027',
  );
  await expect(barre(page, m.j.id)).toHaveCount(1);
  await expect(barreSp(page, m.s.id)).toHaveCount(1);
  await expect(barre(page, m.c.id)).toHaveCount(0);
  const ya = (await centre(barre(page, m.a.id))).y;
  expect(Math.abs((await centre(barre(page, m.b.id))).y - (ya + HAUTEUR_LIGNE))).toBeLessThan(2);
  expect(Math.abs((await centre(barre(page, m.j.id))).y - (ya + 2 * HAUTEUR_LIGNE))).toBeLessThan(
    2,
  );
  expect(Math.abs((await centre(barreSp(page, m.s.id))).y - (ya + 4 * HAUTEUR_LIGNE))).toBeLessThan(
    2,
  );
}

test('E2E-171-r1 : connecteur sur A, B et J seulement, jour et semaine, pour le chef ; aucun au zoom mois ni pour un chef en lecture seule', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E171');
  await ouvrirLiens(page, m);
  await expect(liens(page)).toHaveCount(0);
  for (const id of [m.a.id, m.b.id, m.j.id]) await expect(connecteur(page, id)).toHaveCount(1);
  await expect(connecteur(page, m.c.id)).toHaveCount(0);
  await expect(connecteurs(page)).toHaveCount(3);
  for (const id of [m.a.id, m.b.id, m.j.id]) {
    expect(await connecteur(page, id).evaluate((e) => getComputedStyle(e).cursor)).toBe(
      'crosshair',
    );
  }

  await page.goto(gantt(m.projet.id, 'semaine'));
  await expect(barre(page, m.a.id)).toHaveCount(1);
  await expect(connecteurs(page)).toHaveCount(3);

  await page.goto(gantt(m.projet.id, 'mois'));
  await expect(barre(page, m.a.id)).toHaveCount(1);
  await expect(connecteurs(page)).toHaveCount(0);

  await page.context().clearCookies();
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, m.projet.id, 'E171'));
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.a.id)).toHaveAttribute(
    'aria-label',
    'Tâche A, du 11/01/2027 au 15/01/2027',
  );
  await expect(connecteurs(page)).toHaveCount(0);
});

test('E2E-172 : glisser du connecteur de A jusqu’à la ligne de B crée A → B (FD, 0), bandeau sans contour', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E172');
  const r = suivreRequetes(page);
  await ouvrirLiens(page, m);

  await glisserConnecteur(page, m.a.id, await centre(barre(page, m.b.id)));
  await expect.poll(() => r.dependances.length).toBe(1);
  expect(r.dependances[0]).toEqual({
    methode: 'POST',
    corps: { predecesseur_id: m.a.id, successeur_id: m.b.id, type: 'FD', delai: 0 },
  });
  await expect(liens(page)).toHaveCount(1);
  await expect(liens(page)).toHaveAttribute('data-type', 'FD');
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(0);
  await laisserPasser(page);
  expect(r.dependances.length).toBe(1);

  await page.getByRole('tab', { name: 'Planning' }).click();
  await expect(page.getByRole('row', { name: /Tâche A\s+Tâche B\s+FD\s+0/ })).toBeVisible();
});

test('E2E-173 : pendant le glisser, trait provisoire et ligne cible ; aucun POST si le lâcher n’est pas sur une cible', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E173');
  const r = suivreRequetes(page);
  await ouvrirLiens(page, m);
  const surB = await centre(barre(page, m.b.id));
  const hors = await centre(page.getByRole('heading', { level: 1 }));

  const cas: [string, { x: number; y: number }, boolean][] = [
    ['ligne de A (la source)', await pointLigne(page, m.a.id, 0), false],
    ['ligne de C (sans barre)', await pointLigne(page, m.a.id, 3), false],
    ['ligne de S (sous-projet)', await pointLigne(page, m.a.id, 4), false],
    ['hors du SVG', hors, false],
    ['Échap pendant le glisser', surB, true],
  ];
  for (const [nom, point, echap] of cas) {
    // Au-dessus de B : trait provisoire et cible.
    await commencerGlisser(page, m.a.id, surB);
    await expect(provisoire(page), nom).toHaveCount(1);
    await expect(cibles(page), nom).toHaveCount(1);
    await expect(cibles(page), nom).toHaveAttribute('data-cible-lien', String(m.b.id));
    if (echap) {
      await page.keyboard.press('Escape');
      await expect(provisoire(page), nom).toHaveCount(0);
    } else {
      await page.mouse.move(point.x, point.y, { steps: 8 });
      await expect(cibles(page), nom).toHaveCount(0);
    }
    await page.mouse.up();
    await laisserPasser(page);
    await expect(provisoire(page), nom).toHaveCount(0);
    await expect(cibles(page), nom).toHaveCount(0);
    expect(r.dependances.length, nom).toBe(0);
    await expect(liens(page), nom).toHaveCount(0);
    await expect(bandeau(page), nom).toHaveCount(0);
  }
});

test('E2E-174 : case « Recalcul automatique » cochée : création du lien, puis un seul calcul, pas de bandeau', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E174');
  const r = suivreRequetes(page);
  await ouvrirLiens(page, m);
  await caseAuto(page).check();

  await glisserConnecteur(page, m.a.id, await centre(barre(page, m.b.id)));
  await expect.poll(() => r.ordre.length).toBe(2);
  expect(r.ordre).toEqual(['POST dependance', 'POST calcul']);
  await expect(enCours(page)).toHaveCount(0);
  await expect(liens(page)).toHaveCount(1);
  await expect(bandeau(page)).toHaveCount(0);
  await laisserPasser(page);
  expect(r.ordre.length).toBe(2);
});

test('E2E-175 : refus d’une création : doublon (409), 422 sans code, 500 ; une seule alerte, ni bandeau ni lien en plus', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E175');
  await lier(request, m.projet.id, m.a.id, m.b.id);
  const r = suivreRequetes(page);
  await ouvrirLiens(page, m);
  await expect(liens(page)).toHaveCount(1);

  await glisserConnecteur(page, m.a.id, await centre(barre(page, m.b.id)));
  await expect(alertes(page)).toHaveCount(1);
  await expect(alertes(page)).toContainText('Cette dépendance existe déjà.');
  await expect(liens(page)).toHaveCount(1);
  await expect(bandeau(page)).toHaveCount(0);
  expect(r.dependances.length).toBe(1);

  const reponses = [
    { status: 422, json: { erreur: 'Règle de planning non respectée' } },
    { status: 500, json: { erreur: 'Erreur interne' } },
  ];
  await page.route('**/api/projets/*/dependances', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill(reponses.shift()!);
  });
  const textes = [
    'Cette opération enfreint une règle du planning.',
    'Modification impossible pour le moment. Réessayez.',
  ];
  for (const [i, texte] of textes.entries()) {
    await glisserConnecteur(page, m.a.id, await centre(barre(page, m.b.id)));
    await expect(alertes(page)).toHaveCount(1);
    await expect(alertes(page)).toContainText(texte);
    await expect(liens(page)).toHaveCount(1);
    await expect(bandeau(page)).toHaveCount(0);
    expect(r.dependances.length).toBe(2 + i);
  }
});

test('E2E-176 : clic sur un lien : dialogue « Modifier la dépendance », PATCH { type, delai }, bandeau', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E176');
  await lier(request, m.projet.id, m.a.id, m.b.id);
  const r = suivreRequetes(page);
  await ouvrirLiens(page, m);
  await expect(liens(page)).toHaveCount(1);

  const p = await pointLien(page, m.a.id);
  await page.mouse.click(p.x, p.y);
  const dialogue = dialogueLien(page);
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByLabel('Type')).toHaveValue('FD');
  await expect(dialogue.getByLabel('Délai')).toHaveValue('0');
  await dialogue.getByLabel('Type').selectOption('DD');
  await dialogue.getByLabel('Délai').fill('2');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();

  await expect.poll(() => parMethode(r, 'PATCH').length).toBe(1);
  expect(parMethode(r, 'PATCH')[0]!.corps).toEqual({ type: 'DD', delai: 2 });
  await expect(dialogue).toHaveCount(0);
  await expect(liens(page)).toHaveAttribute('data-type', 'DD');
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(0);

  await page.getByRole('tab', { name: 'Planning' }).click();
  await expect(page.getByRole('row', { name: /Tâche A\s+Tâche B\s+DD\s+2/ })).toBeVisible();
});

test('E2E-177 : suppression d’un lien depuis le dialogue, avec confirmation', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E177');
  await lier(request, m.projet.id, m.a.id, m.b.id);
  const r = suivreRequetes(page);
  await ouvrirLiens(page, m);
  await expect(liens(page)).toHaveCount(1);

  const p = await pointLien(page, m.a.id);
  await page.mouse.click(p.x, p.y);
  const dialogue = dialogueLien(page);
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(confirmation(page)).toBeVisible();
  await confirmation(page).getByRole('button', { name: 'Annuler' }).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toBeVisible();
  await expect(liens(page)).toHaveCount(1);
  expect(parMethode(r, 'DELETE').length).toBe(0);

  await dialogue.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await confirmation(page).getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect.poll(() => parMethode(r, 'DELETE').length).toBe(1);
  await expect(liens(page)).toHaveCount(0);
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(0);

  await page.getByRole('tab', { name: 'Planning' }).click();
  await expect(page.getByRole('row', { name: /Tâche A\s+Tâche B\s+FD/ })).toHaveCount(0);
});

test('E2E-178-r2 : clic sur un lien au zoom mois ouvre le dialogue ; sans droit d’écriture, ni dialogue ni curseur pointer', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E178');
  await lier(request, m.projet.id, m.a.id, m.b.id);
  await ouvrirLiens(page, m, { zoom: 'mois' });
  await expect(liens(page)).toHaveCount(1);
  const p = await pointLien(page, m.a.id);
  expect(await curseurEn(page, p)).toBe('pointer');
  await page.mouse.click(p.x, p.y);
  await expect(dialogueLien(page)).toBeVisible();
  await dialogueLien(page).getByRole('button', { name: 'Annuler' }).click();
  await expect(dialogueLien(page)).toHaveCount(0);

  await page.context().clearCookies();
  // Préambule (D-107) : A et B seulement, le sous-projet S n'est pas visible pour le chef lecteur.
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, m.projet.id, 'E178r1'));
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.a.id)).toHaveAttribute(
    'aria-label',
    'Tâche A, du 11/01/2027 au 15/01/2027',
  );
  await expect(barre(page, m.b.id)).toHaveAttribute(
    'aria-label',
    'Tâche B, du 18/01/2027 au 22/01/2027',
  );
  await expect(liens(page)).toHaveCount(1);
  const q = await pointLien(page, m.a.id);
  expect(await curseurEn(page, q)).not.toBe('pointer');
  await page.mouse.click(q.x, q.y);
  await laisserPasser(page);
  await expect(dialogueLien(page)).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('E2E-179-r3 : liens et connecteurs hors tabulation, ordre de tabulation de la fiche inchangé', async ({
  page,
  request,
}) => {
  const m = await mondeLiens(request, 'E2E179');
  await lier(request, m.projet.id, m.a.id, m.b.id);
  await ouvrirLiens(page, m);
  // Témoin positif : il y a bien des connecteurs et un lien dans la page.
  expect(await connecteurs(page).count()).toBeGreaterThanOrEqual(1);
  await expect(zonesLien(page)).toHaveCount(1);
  await expect(page.locator('svg [data-lien-cible][tabindex]')).toHaveCount(0);
  await expect(page.locator('svg [data-connecteur-element][tabindex]')).toHaveCount(0);

  const horsLiens = () =>
    page.evaluate(
      () =>
        document.activeElement?.closest(
          'svg [data-element-id], svg [data-projet-id], svg [data-lien-cible], svg [data-connecteur-element]',
        ) === null,
    );
  const tableau = page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
  const calendrier = page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });

  // Même vérification qu'E2E-43-r2.
  const calculerBouton = page.getByRole('button', { name: 'Calculer', exact: true });
  await calculerBouton.focus();
  await expect(calculerBouton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(caseAuto(page)).toBeFocused();
  expect(await horsLiens()).toBe(true);

  const dernierZoom = page.getByRole('group', { name: 'Zoom' }).getByRole('button').last();
  await dernierZoom.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Initiales', exact: true })).toBeFocused();
  // Révision -r1 (D-031, D-111 (6)) : le bouton « Copier » s'insère après « Initiales ».
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Copier', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(tableau).toBeFocused();
  // Révision -r3 (D-031, D-127 (6), (7)) : boutons-noms des éléments en ordre WBS, puis lien et crayon.
  for (const nom of ['Tâche A', 'Tâche B', 'Jalon J', 'Tâche C']) {
    await page.keyboard.press('Tab');
    await expect(tableau.getByRole('button', { name: nom, exact: true })).toBeFocused();
    expect(await horsLiens()).toBe(true);
  }
  await page.keyboard.press('Tab');
  await expect(
    // Révision -r2 (D-031, D-123 (7)) : nom du lien « <code> · <nom> ».
    tableau.getByRole('link', { name: 'S-E2E179 · Sous-projet E2E179', exact: true }),
  ).toBeFocused();
  expect(await horsLiens()).toBe(true);
  await page.keyboard.press('Tab');
  await expect(
    tableau.getByRole('button', { name: 'Modifier le projet Sous-projet E2E179', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(calendrier).toBeFocused();
  expect(await horsLiens()).toBe(true);
});

test('E2E-180-r1 : parcours complet à l’écran, puis lien par le connecteur avec recalcul automatique : la première activité commence après la seconde', async ({
  page,
}) => {
  await loginAsAdmin(page);

  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 3E-180');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 3E-180/ })).toBeVisible();

  await creerRessourceParEcran(
    page,
    'Ressource 3E-180',
    'ressource-3e-180@lot3e.test',
    'Cal 3E-180',
  );
  await creerProjetParEcran(page, '3E-180', 'Projet 3E-180');

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 3E-180' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3E-180', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Ressource')
    .selectOption({ label: 'Ressource 3E-180' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource 3E-180/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Phase 3E-180');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Phase 3E-180/ })).toBeVisible();
  await page
    .getByRole('button', { name: 'Ajouter une sous-activité à Phase 3E-180', exact: true })
    .click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 3E-180');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3E-180/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 3E-180' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource 3E-180' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3E-180.*Ressource 3E-180/ })).toBeVisible();

  await page.getByRole('button', { name: 'Modifier Tâche 3E-180', exact: true }).click();
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

  // Seconde activité START au 11/01/2027, même ressource, créée à l'écran (onglet Planning).
  await page.getByRole('link', { name: 'Projet 3E-180' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3E-180', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche bis 3E-180');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche bis 3E-180/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche bis 3E-180' }).click();
  const assignation2 = page.getByRole('dialog');
  await assignation2.getByLabel('Ressource').selectOption({ label: 'Ressource 3E-180' });
  await assignation2.getByLabel('Charge assignée (jours)').fill('2');
  await assignation2.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche bis 3E-180.*Ressource 3E-180/ })).toBeVisible();
  await page.getByRole('button', { name: 'Modifier Tâche bis 3E-180', exact: true }).click();
  const modifier2 = page.getByRole('dialog', { name: TITRE_ACTIVITE });
  await modifier2.getByLabel('Mode').selectOption('START');
  await modifier2.getByLabel('Début validé').fill('2027-01-11');
  await modifier2.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modifier2).toHaveCount(0);

  // Calcul depuis le Gantt.
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await page.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: 'Jour' }).click();
  await boutonsCalculer(page).first().click();
  const calcul2 = dialogueCalcul(page);
  await expect(calcul2).toBeVisible();
  await calcul2.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(calcul2).toHaveCount(0);

  const premiere = page.getByRole('img', { name: /^Tâche 3E-180, du / });
  const seconde = page.getByRole('img', { name: /^Tâche bis 3E-180, du / });
  await expect(premiere).toHaveCount(1);
  await expect(seconde).toHaveCount(1);
  const idSeconde = Number(await seconde.getAttribute('data-element-id'));
  // Préambule (D-105) : sans lien, le début de la première ≤ la fin de la seconde (la seconde est posée
  // après la première par la capacité de la ressource) ; sinon s'arrêter et le signaler.
  const debutPremiere = (await premiere.getAttribute('data-debut'))!;
  const finSeconde = (await seconde.getAttribute('data-fin'))!;
  expect(
    debutPremiere <= finSeconde,
    `préambule : ${debutPremiere} doit être ≤ ${finSeconde}`,
  ).toBe(true);
  await expect(liens(page)).toHaveCount(0);

  await caseAuto(page).check();
  // Lien inversé : de la seconde vers la première (D-105).
  await glisserConnecteur(page, idSeconde, await centre(premiere));
  // Sans clic sur « Calculer » : la première commence après la fin de la seconde.
  await expect(liens(page)).toHaveCount(1);
  await expect
    .poll(
      async () =>
        (await premiere.getAttribute('data-debut'))! > (await seconde.getAttribute('data-fin'))!,
    )
    .toBe(true);
  await expect(bandeau(page)).toHaveCount(0);
  await expect(contours(page)).toHaveCount(0);
});
