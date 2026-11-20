// Lot 3g (D-114) : jours en surcharge du Gantt, clavier du Planning manuel, racine d'écriture du
// dialogue « Calculer ». E2E-210 à E2E-220.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, D0 des calculs de préparation 2027-01-04 (d0 du dialogue et du recalcul : 2027-01-06),
// zoom jour sauf mention, données créées par l'API. E2E de parcours complet non étendu : aucune entité
// n'est créée par un écran nouveau.
// Contrat (à relire) : rect de jour rouge `svg [data-surcharge-jour]` (valeur AAAA-MM-JJ),
// `data-surcharge-element` = id de l'activité, `aria-hidden`, `pointer-events` none, après la barre dans
// le document, mêmes `y` et `height` que la barre ; annonce `[data-annonce-gantt]` suivie de
// « , jours en surcharge : JJ/MM/AAAA » ; GET `/api/projets/:id/travail` seulement si un élément
// porte le drapeau `surcharge` ; grille du Planning manuel : une seule case à `tabindex` 0
// (`table input[type="checkbox"][tabindex="0"]`), les autres à −1, touches ← → ↑ ↓ Début Fin.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { chefLecteur } from './lot6b-helpers.js';
import { lireSaisies, libelleCase, monde, poserSaisies } from './lot2e-helpers.js';
import { insererSaisies } from './rex3a-helpers.js';
import { activiteAvec, calculer, monde3b, sousProjet } from './lot3b-helpers.js';
import {
  boutonsCalculer,
  dialogueCalcul,
  etatsCases,
  libellesCases,
  notification,
  ouvrirDialogueCalcul,
  remettreAdminSeul,
} from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';
const D0 = '2027-01-06';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom = 'jour') => `/projets/${projetId}?onglet=gantt&zoom=${zoom}`;
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const rouges = (page: Page) => page.locator('svg [data-surcharge-jour]');
const zone = (page: Page) => page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
const annonce = (page: Page) => page.locator('[data-annonce-gantt]');
const alertes = (page: Page) => page.getByRole('alert');
const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

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

/** GET /api/projets/:id/travail émis par la page, pour le projet donné. */
function suivreTravail(page: Page, projetId: number): string[] {
  const gets: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' && new RegExp(`/api/projets/${projetId}/travail$`).test(r.url())) {
      gets.push(r.url());
    }
  });
  return gets;
}

/**
 * Monde des jours rouges : un chef, Alice affectée ; M (MAN, saisie d'Alice une journée le samedi
 * 09/01/2027, en surcharge) et N (MAN, saisie d'Alice le 05/01 matin seule, sans surcharge) ; calcul.
 */
async function mondeSurcharge(request: Parameters<typeof monde3b>[0], suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const alice = m.gens.Alice!;
  const manM = await activiteAvec(request, m.projet.id, 'Manuelle M', { mode: 'MAN' });
  const asM = await m.api.assignation(manM.id, alice.id, 1);
  const manN = await activiteAvec(request, m.projet.id, 'Manuelle N', { mode: 'MAN' });
  const asN = await m.api.assignation(manN.id, alice.id, 1);
  // Révision E2E-210-r1 (D-031, D-123 (8)) : saisie ancienne du samedi, insérée en base (l'API refuse
  // désormais une saisie nouvelle sur un jour non ouvré).
  await insererSaisies([
    { assignation_id: asM.id, jour: '2027-01-09', demi_journee: 'matin' },
    { assignation_id: asM.id, jour: '2027-01-09', demi_journee: 'apres_midi' },
  ]);
  await poserSaisies(request, manN.id, '2027-01', [
    { assignation_id: asN.id, jour: '2027-01-05', demi_journee: 'matin' },
  ]);
  await calculer(request, [m.projet.id]);
  return { ...m, manM, manN };
}

const LIBELLE_M = 'Manuelle M, du 09/01/2027 au 09/01/2027, surcharge';
const LIBELLE_N = 'Manuelle N, du 05/01/2027 au 05/01/2027';

test('E2E-210-r1 : jour rouge de M le samedi 09/01 (aux trois zooms) : un seul rect, bonne géométrie, aria-hidden, sans événement, après la barre ; rien pour N ; aria-label inchangé', async ({
  page,
  request,
}) => {
  const m = await mondeSurcharge(request, 'E2E210');
  await connecterAvec(page, m.emailChef);
  for (const [zoom, px] of [
    ['jour', 24],
    ['semaine', 8],
    ['mois', 4],
  ] as const) {
    await page.goto(gantt(m.projet.id, zoom));
    await expect(barre(page, m.manM.id)).toHaveAttribute('aria-label', LIBELLE_M);
    await expect(barre(page, m.manN.id)).toHaveAttribute('aria-label', LIBELLE_N);

    const rect = rouges(page);
    await expect(rect).toHaveCount(1);
    await expect(rect).toHaveAttribute('data-surcharge-jour', '2027-01-09');
    await expect(rect).toHaveAttribute('data-surcharge-element', String(m.manM.id));
    await expect(rect).toHaveAttribute('width', String(px));
    await expect(rect).toHaveAttribute('x', (await barre(page, m.manM.id).getAttribute('x'))!);
    await expect(rect).toHaveAttribute('aria-hidden', 'true');
    await expect(rect).toHaveCSS('pointer-events', 'none');
    await expect(page.locator(`svg [data-surcharge-element="${m.manN.id}"]`)).toHaveCount(0);
    await expect(barre(page, m.manM.id)).toHaveAttribute('y', (await rect.getAttribute('y'))!);
    await expect(barre(page, m.manM.id)).toHaveAttribute(
      'height',
      (await rect.getAttribute('height'))!,
    );
    const apres = await page.evaluate(
      ([b, r]) =>
        !!(
          document.querySelector(b!)!.compareDocumentPosition(document.querySelector(r!)!) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      [`svg [data-element-id="${m.manM.id}"]`, 'svg [data-surcharge-jour]'],
    );
    expect(apres, 'le rect suit la barre dans le document').toBe(true);
  }
});

test('E2E-211-r1 : GET /travail seulement avec un drapeau surcharge : 0 sans ; avec : au moins 1 au chargement, plus après rechargement de la page, plus encore après un calcul par le dialogue (compteurs relatifs, StrictMode)', async ({
  page,
  request,
}) => {
  const m = await mondeSurcharge(request, 'E2E211');
  const q = await m.api.projet('Q-E2E211', 'Projet sans surcharge', m.chef.id);
  await m.api.affectation(q.id, m.gens.Alice!.id);
  const aQ = await m.api.activite(q.id, 'Tâche Q');
  await m.api.assignation(aQ.id, m.gens.Alice!.id, 2);
  await calculer(request, [q.id]);

  const getsQ = suivreTravail(page, q.id);
  const getsP = suivreTravail(page, m.projet.id);
  await connecterAvec(page, m.emailChef);

  // Sans surcharge : le Gantt est chargé, aucun GET /travail.
  await page.goto(gantt(q.id));
  await expect(barre(page, aQ.id)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(getsQ).toHaveLength(0);
  await expect(rouges(page)).toHaveCount(0);

  // Avec surcharge : au moins un GET par chargement du Gantt (StrictMode rejoue les effets au montage).
  await page.goto(gantt(m.projet.id));
  await expect(rouges(page)).toHaveCount(1);
  expect(getsP.length).toBeGreaterThanOrEqual(1);
  await page.waitForLoadState('networkidle');
  const apresChargement = getsP.length;
  await page.reload();
  await expect(rouges(page)).toHaveCount(1);
  await expect.poll(() => getsP.length).toBeGreaterThan(apresChargement);
  await page.waitForLoadState('networkidle');
  const apresRechargement = getsP.length;

  const dialogue = await ouvrirDialogueCalcul(page);
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect.poll(() => getsP.length).toBeGreaterThan(apresRechargement);
  await expect(rouges(page)).toHaveCount(1);
});

test('E2E-212-r1 : annonce de la barre active (↓) : nom accessible + « , jours en surcharge : 09/01/2027 » pour M, nom seul pour N ; Échap la vide', async ({
  page,
  request,
}) => {
  const m = await mondeSurcharge(request, 'E2E212');
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.manM.id)).toHaveAttribute('aria-label', LIBELLE_M);
  await expect(rouges(page)).toHaveCount(1);

  await zone(page).focus();
  await page.keyboard.press('ArrowDown');
  await expect(annonce(page)).toHaveText(`${LIBELLE_M}, jours en surcharge : 09/01/2027`);
  await expect(barre(page, m.manM.id)).toHaveAttribute('aria-label', LIBELLE_M);
  await page.keyboard.press('ArrowDown');
  await expect(annonce(page)).toHaveText(LIBELLE_N);
  await page.keyboard.press('Escape');
  await expect(annonce(page)).toHaveText('');
});

test('E2E-213-r1 : GET /travail en échec (500) : Gantt affiché, aucun jour rouge, aucune alerte ; témoin : route retirée et rechargement, le jour rouge apparaît', async ({
  page,
  request,
}) => {
  const m = await mondeSurcharge(request, 'E2E213');
  let interceptes = 0;
  await page.route('**/api/projets/*/travail', (route) => {
    interceptes += 1;
    return route.fulfill({ status: 500, json: { erreur: 'panne simulée' } });
  });
  await connecterAvec(page, m.emailChef);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.manM.id)).toHaveAttribute('aria-label', LIBELLE_M);
  await expect(barre(page, m.manN.id)).toHaveAttribute('aria-label', LIBELLE_N);
  await expect.poll(() => interceptes).toBeGreaterThan(0);
  await page.waitForLoadState('networkidle');
  await expect(rouges(page)).toHaveCount(0);
  await expect(alertes(page)).toHaveCount(0);

  await page.unroute('**/api/projets/*/travail');
  await page.reload();
  await expect(rouges(page)).toHaveCount(1);
});

// --- Planning manuel : clavier (D-114 (6)) ---

const URL_MANUEL = (m: { projet: { id: number }; man: { id: number } }, mois = '2027-01') =>
  `/projets/${m.projet.id}/planning-manuel/${m.man.id}?mois=${mois}`;

const cases = (page: Page) => page.locator('table input[type="checkbox"]');
const courantes = (page: Page) => page.locator('table input[type="checkbox"][tabindex="0"]');

const caseDe = (
  page: Page,
  nom: string,
  jour: number,
  demi: 'matin' | 'après-midi',
  mois = 'janvier',
) => page.getByRole('checkbox', { name: libelleCase(nom, jour, mois, demi) });

/** Mois suivant, puis Tab : le focus entre dans la grille sur la case courante. */
async function entrerDansGrille(page: Page) {
  await page.getByRole('button', { name: 'Mois suivant' }).focus();
  await page.keyboard.press('Tab');
}

const dansLaGrille = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('table') !== null);

/** Monde du Planning manuel avec deux assignations : Alice puis Bob. */
async function mondeDeux(request: Parameters<typeof monde>[0], suffixe: string) {
  const m = await monde(request, suffixe);
  const nomBob = `Bob ${suffixe}`;
  const bob = await m.api.utilisateur(
    nomBob,
    `bob-${suffixe.toLowerCase()}@example.test`,
    'ressource',
    true,
  );
  await m.api.affectation(m.projet.id, bob.id);
  const assignationBob = await m.api.assignation(m.man.id, bob.id, 2);
  return { ...m, nomBob, assignationBob };
}

test('E2E-214 : un seul arrêt de tabulation ; flèches ← → ↑ ↓ ; retour par Maj+Tab et Tab sur la même case ; sortie de la grille ; preventDefault des flèches', async ({
  page,
  request,
}) => {
  const m = await mondeDeux(request, 'E2E214');
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_MANUEL(m));
  await expect(cases(page)).toHaveCount(124);
  await expect(courantes(page)).toHaveCount(1);
  await expect(caseDe(page, m.nomAlice, 1, 'matin')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('table input[type="checkbox"][tabindex="-1"]')).toHaveCount(123);
  await page.evaluate(() => {
    const w = window as unknown as { __touches: [string, boolean][] };
    w.__touches = [];
    document.addEventListener('keydown', (e) => w.__touches.push([e.key, e.defaultPrevented]));
  });

  await entrerDansGrille(page);
  await expect(caseDe(page, m.nomAlice, 1, 'matin')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(caseDe(page, m.nomAlice, 1, 'après-midi')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(caseDe(page, m.nomAlice, 2, 'matin')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(caseDe(page, m.nomAlice, 1, 'après-midi')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(caseDe(page, m.nomAlice, 1, 'matin')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(caseDe(page, m.nomBob, 1, 'matin')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(caseDe(page, m.nomAlice, 1, 'matin')).toBeFocused();
  await expect(courantes(page)).toHaveCount(1);

  const touches = await page.evaluate(
    () => (window as unknown as { __touches: [string, boolean][] }).__touches,
  );
  const fleches = touches.filter(([k]) => k.startsWith('Arrow'));
  expect(fleches).toHaveLength(6);
  for (const [touche, empeche] of fleches) expect(empeche, `${touche} empêchée`).toBe(true);

  // Aller à « 3 janvier, après-midi » (cinq flèches →), sortir par Maj+Tab, revenir par Tab.
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(caseDe(page, m.nomAlice, 3, 'après-midi')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Mois suivant' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(caseDe(page, m.nomAlice, 3, 'après-midi')).toBeFocused();
  await expect(courantes(page)).toHaveCount(1);

  // Un seul arrêt : Tab suivant sort de la grille.
  await page.keyboard.press('Tab');
  expect(await dansLaGrille(page)).toBe(false);
});

test('E2E-215 : Début et Fin sur la ligne, bornes sans bouclage (←, ↑, →, ↓), preventDefault de Début et Fin', async ({
  page,
  request,
}) => {
  const m = await mondeDeux(request, 'E2E215');
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_MANUEL(m));
  await expect(cases(page)).toHaveCount(124);
  await page.evaluate(() => {
    const w = window as unknown as { __touches: [string, boolean][] };
    w.__touches = [];
    document.addEventListener('keydown', (e) => w.__touches.push([e.key, e.defaultPrevented]));
  });

  await entrerDansGrille(page);
  const premiere = caseDe(page, m.nomAlice, 1, 'matin');
  await expect(premiere).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(premiere).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(premiere).toBeFocused();

  await page.keyboard.press('End');
  const derniere = caseDe(page, m.nomAlice, 31, 'après-midi');
  await expect(derniere).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(derniere).toBeFocused();
  await page.keyboard.press('Home');
  await expect(premiere).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(caseDe(page, m.nomBob, 1, 'matin')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(caseDe(page, m.nomBob, 1, 'matin')).toBeFocused();
  await page.keyboard.press('End');
  await expect(caseDe(page, m.nomBob, 31, 'après-midi')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(caseDe(page, m.nomBob, 31, 'après-midi')).toBeFocused();
  await expect(courantes(page)).toHaveCount(1);

  const touches = await page.evaluate(
    () => (window as unknown as { __touches: [string, boolean][] }).__touches,
  );
  const homeFin = touches.filter(([k]) => k === 'Home' || k === 'End');
  expect(homeFin).toHaveLength(3);
  for (const [touche, empeche] of homeFin) expect(empeche, `${touche} empêchée`).toBe(true);
});

test('E2E-216-r1 : Espace puis Enregistrer (base vérifiée par l’API), case courante conservée ; Espace puis Annuler, case courante conservée, base inchangée', async ({
  page,
  request,
}) => {
  const m = await mondeDeux(request, 'E2E216');
  const puts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PUT' && r.url().includes('/saisies')) puts.push(r.url());
  });
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_MANUEL(m));
  await expect(cases(page)).toHaveCount(124);

  await entrerDansGrille(page);
  const premiere = caseDe(page, m.nomAlice, 1, 'matin');
  await expect(premiere).toBeFocused();
  await page.keyboard.press('Space');
  await expect(premiere).toBeChecked();
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saisies enregistrées.' })).toBeVisible();
  expect(puts).toHaveLength(1);
  const attendu = [{ assignation_id: m.assignation.id, jour: '2027-01-01', demi_journee: 'matin' }];
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual(attendu);
  await expect(courantes(page)).toHaveCount(1);
  await expect(premiere).toHaveAttribute('tabindex', '0');

  await entrerDansGrille(page);
  await expect(premiere).toBeFocused();
  // Révision -r1 (D-031, D-125) : le samedi 02 est un jour non ouvré (Espace sans effet, D-124 (1)) ;
  // 6 flèches depuis le 1er matin atteignent le lundi 04 matin.
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  const deuxieme = caseDe(page, m.nomAlice, 4, 'matin');
  await expect(deuxieme).toBeFocused();
  await page.keyboard.press('Space');
  await expect(deuxieme).toBeChecked();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(deuxieme).not.toBeChecked();
  await expect(courantes(page)).toHaveCount(1);
  await expect(deuxieme).toHaveAttribute('tabindex', '0');
  expect(puts).toHaveLength(1);
  expect(await lireSaisies(request, m.man.id, '2027-01')).toEqual(attendu);
});

test('E2E-217 : case courante remise à la première au changement de mois ; un clic la rend courante, Annuler la garde', async ({
  page,
  request,
}) => {
  const m = await mondeDeux(request, 'E2E217');
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_MANUEL(m));
  await expect(cases(page)).toHaveCount(124);

  await entrerDansGrille(page);
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  await expect(caseDe(page, m.nomAlice, 5, 'après-midi')).toBeFocused();
  await expect(courantes(page)).toHaveCount(1);

  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await expect(page).toHaveURL(/mois=2027-02/);
  await expect(cases(page)).toHaveCount(112);
  await expect(courantes(page)).toHaveCount(1);
  await expect(caseDe(page, m.nomAlice, 1, 'matin', 'février')).toHaveAttribute('tabindex', '0');

  const cliquee = caseDe(page, m.nomAlice, 10, 'après-midi', 'février');
  await cliquee.check();
  await expect(courantes(page)).toHaveCount(1);
  await expect(cliquee).toHaveAttribute('tabindex', '0');
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(cliquee).not.toBeChecked();
  await expect(courantes(page)).toHaveCount(1);
  await expect(cliquee).toHaveAttribute('tabindex', '0');
});

test('E2E-218-r1 : lecture seule (chef affecté au projet d’un autre chef) : cases désactivées, ni Enregistrer ni Annuler, aucun arrêt dans la grille ; témoin : le chef a un arrêt', async ({
  page,
  request,
}) => {
  const m = await mondeDeux(request, 'E2E218');
  await connecterAvec(page, m.emailChef);
  await page.goto(URL_MANUEL(m));
  await expect(cases(page)).toHaveCount(124);
  await expect(courantes(page)).toHaveCount(1);

  await page.context().clearCookies();
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, m.projet.id, 'E218'));
  await page.goto(URL_MANUEL(m));
  await expect(cases(page)).toHaveCount(124);
  await expect(page.locator('table input[type="checkbox"]:not([disabled])')).toHaveCount(0);
  await expect(courantes(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Annuler' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mois suivant' }).focus();
  await page.keyboard.press('Tab');
  expect(await dansLaGrille(page)).toBe(false);
});

// --- Racine d'écriture (D-114 (8)) ---

const START_11 = { mode: 'START', debut_valide: '2027-01-11' };

/**
 * R (chef A), sous-projet S de R (chef B, ressource affectée aussi à R : R lisible en lecture seule),
 * Alice affectée à S ; « Tâche S » START 11/01, 5 j ; calcul de R (S compris, d0 2027-01-04).
 */
async function mondeChefB(request: Parameters<typeof preparer>[0], suffixe: string) {
  const api = await preparer(request);
  const chefA = await api.utilisateur(
    'Chef A',
    `chef-a-${suffixe.toLowerCase()}@example.test`,
    'chef_de_projet',
  );
  const emailB = `chef-b-${suffixe.toLowerCase()}@example.test`;
  const chefB = await api.utilisateur('Chef B', emailB, 'chef_de_projet', true);
  const r = await api.projet(`R-${suffixe}`, `Racine ${suffixe}`, chefA.id);
  const s = await sousProjet(request, r.id, `S-${suffixe}`, `Sous-projet ${suffixe}`, chefB.id);
  await api.affectation(r.id, chefB.id);
  const alice = await api.utilisateur(
    'Alice',
    `alice-${suffixe.toLowerCase()}@example.test`,
    'ressource',
    true,
  );
  await api.affectation(s.id, alice.id);
  const tache = await activiteAvec(request, s.id, 'Tâche S', START_11);
  await api.assignation(tache.id, alice.id, 5);
  await calculer(request, [r.id]);
  return { api, emailB, r, s, tache, libelleS: `S-${suffixe} — Sous-projet ${suffixe}` };
}

test('E2E-219 : chef B sur le Gantt de S : le dialogue « Calculer » propose S (coché) et pas R ; calcul de S seul, 200', async ({
  page,
  request,
}) => {
  const m = await mondeChefB(request, 'E2E219');
  await connecterAvec(page, m.emailB);
  await page.goto(gantt(m.s.id));
  await expect(barre(page, m.tache.id)).toHaveAttribute(
    'aria-label',
    'Tâche S, du 11/01/2027 au 15/01/2027',
  );

  const dialogue = await ouvrirDialogueCalcul(page);
  expect(await libellesCases(dialogue)).toEqual([m.libelleS]);
  expect(await etatsCases(dialogue)).toEqual([true]);

  const reponse = page.waitForResponse(
    (r) => r.url().endsWith('/api/calcul') && r.request().method() === 'POST',
  );
  await dialogue.getByRole('button', { name: 'Calculer', exact: true }).click();
  const r = await reponse;
  expect(r.request().postDataJSON()).toEqual({ projets: [m.s.id], d0: D0 });
  expect(r.status()).toBe(200);
  await expect(notification(page, 'Planning calculé.')).toBeVisible();
  await expect(dialogueCalcul(page)).toBeHidden();
  await expect(boutonsCalculer(page).first()).toBeVisible();
});

test('E2E-220 : chef B, recalcul automatique sur le Gantt de S : geste réussi → 1 PATCH puis 1 POST /api/calcul { projets: [S] }, 200, aucune alerte', async ({
  page,
  request,
}) => {
  const m = await mondeChefB(request, 'E2E220');
  const posts: unknown[] = [];
  const statuts: number[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/calcul')) posts.push(r.postDataJSON());
  });
  page.on('response', (r) => {
    if (r.request().method() === 'POST' && r.url().endsWith('/api/calcul')) {
      statuts.push(r.status());
    }
  });
  await connecterAvec(page, m.emailB);
  await page.goto(gantt(m.s.id));
  await expect(barre(page, m.tache.id)).toHaveAttribute(
    'aria-label',
    'Tâche S, du 11/01/2027 au 15/01/2027',
  );
  await page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true }).check();

  await glisser(page, barre(page, m.tache.id), 72);
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]).toEqual({ projets: [m.s.id], d0: D0 });
  await expect.poll(() => statuts).toEqual([200]);
  await expect(barre(page, m.tache.id)).toHaveAttribute('aria-label', /^Tâche S, du 14\/01\/2027/);
  await expect(alertes(page)).toHaveCount(0);
});
