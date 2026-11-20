// Lot 3f-2 (D-111) : menu contextuel du Gantt du projet et bouton « Copier ». E2E-194 à E2E-208.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, zoom jour, données créées par l'API sauf E2E-208 (tout à l'écran), requêtes d'écriture
// comptées par `page.on('request')`, contexte de navigateur neuf (localStorage vide).
// Monde « arbo » de lot3f1.spec.ts (ordre WBS, rangs de 1 à n) : 1 Phase P (parente) ; 1.1 Sous P1 ;
// 1.2 Sous P2 ; 2 Tâche Q (START 11/01/2027, 3 j, Alice, donc assignée, avec barre) ; 3 Tâche R ; 4 Jalon J
// (fixe 25/01/2027) ; 5 Clos K (activité close) ; puis le sous-projet S.
// Contrat (à relire) :
//   - menu : `role="menu"` (Radix), entrées `role="menuitem"` « Nouvelle activité », « Nouveau jalon »,
//     « Nouvelle sous-activité » ; ouvert par `contextmenu` (clic droit) sur la ligne du tableau ou sur la
//     barre / le losange du SVG, ou par Maj+F10 / touche Menu sur la barre active ; `contextmenu` empêché
//     (`defaultPrevented`) seulement quand le menu s'ouvre ;
//   - dialogues : titres « Nouvelle activité », « Nouveau jalon », « Nouvelle sous-activité », champ Nom,
//     bouton « Créer », « Annuler » ; refus : texte dans le dialogue ouvert ;
//   - focus rendu à la région d'origine : « Tableau du Gantt » ou « Calendrier du Gantt » ;
//   - bouton « Copier » (icône lucide `copy`) juste après la case « Initiales » dans la barre d'outils.
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b, sousProjet } from './lot3b-helpers.js';
import {
  allerA,
  boutonsCalculer,
  creerProjetParEcran,
  creerRessourceParEcran,
  dialogueCalcul,
  remettreAdminSeul,
} from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';
const TITRE_ACTIVITE = 'Modifier l’activité';
const BARRE_Q = 'Tâche Q, du 11/01/2027 au 13/01/2027';
const T_PARENT_ASSIGNE = 'Une activité avec des ressources assignées ne peut pas avoir d’enfant.';
const T_PARENT_CLOS = 'Le projet ou l’activité parente est clos.';
const NOUVELLE_ACTIVITE = 'Nouvelle activité';
const NOUVEAU_JALON = 'Nouveau jalon';
const NOUVELLE_SOUS = 'Nouvelle sous-activité';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom = 'jour') => `/projets/${projetId}?onglet=gantt&zoom=${zoom}`;
const tableau = (page: Page) => page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
const calendrier = (page: Page) =>
  page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
/** Échappement des caractères spéciaux d'expression régulière. */
const echapper = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Ligne par son nom exact ou « <code> · <nom> » (ligne de sous-projet, D-123 (7), D-126). */
const ligneDe = (page: Page, nom: string) =>
  tableau(page)
    .locator('tbody tr')
    .filter({ has: page.getByText(new RegExp(`^(?:\\S+ · )?${echapper(nom)}$`)) });
const poignees = (page: Page) => tableau(page).locator('[data-poignee-ligne]');
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const anneau = (page: Page, id: number) => page.locator(`svg [data-anneau-element="${id}"]`);
const contours = (page: Page) => page.locator('svg [data-contour-element]');
const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning à recalculer' });
const enCours = (page: Page) => page.getByRole('status').filter({ hasText: 'Recalcul en cours…' });
const caseAuto = (page: Page) =>
  page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true });
const menu = (page: Page) => page.getByRole('menu');
const boutonCopier = (page: Page) => page.getByRole('button', { name: 'Copier', exact: true });

const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

async function centre(cible: Locator): Promise<{ x: number; y: number }> {
  const b = (await cible.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Lignes du tableau, dans l'ordre : « <wbs> <nom> » (sous-projet : « — <nom> »). */
const ordre = (page: Page) =>
  tableau(page)
    .locator('tbody tr')
    .evaluateAll((rows) =>
      rows.map((r) => {
        const t = r.querySelectorAll('td');
        const wbs = t[0]!.textContent!.trim();
        const nom = t[1]!.textContent!.trim();
        // D-123 (7) : le nom d'un sous-projet s'affiche « <code> · <nom> » ; ramené à « <nom> ».
        return `${wbs} ${wbs === '—' ? nom.replace(/^\S+ · /, '') : nom}`;
      }),
    );
/** Classe de retrait `pl-N` de la cellule Nom de chaque ligne, dans l'ordre. */
const retraits = (page: Page) =>
  tableau(page)
    .locator('tbody tr')
    .evaluateAll((rows) =>
      rows.map((r) => /\bpl-\d+\b/.exec(r.querySelectorAll('td')[1]!.innerHTML)?.[0] ?? null),
    );

const SOUS_PROJET = '— Sous-projet arbo';
const ORDRE_INITIAL = [
  '1 Phase P',
  '1.1 Sous P1',
  '1.2 Sous P2',
  '2 Tâche Q',
  '3 Tâche R',
  '4 Jalon J',
  '5 Clos K',
  SOUS_PROJET,
];

/** Espion de `contextmenu` : valeur de `defaultPrevented` à la fin de la propagation (document). */
async function surveillerMenuNavigateur(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cm: boolean[] };
    w.__cm = [];
    document.addEventListener('contextmenu', (e) => w.__cm.push(e.defaultPrevented));
  });
}
const evenementsMenu = (page: Page) =>
  page.evaluate(() => (window as unknown as { __cm: boolean[] }).__cm.slice());

/** Clic droit ; renvoie `defaultPrevented` du `contextmenu` produit (échoue s'il n'y en a pas). */
async function clicDroit(page: Page, cible: Locator): Promise<boolean> {
  const avant = (await evenementsMenu(page)).length;
  await cible.click({ button: 'right' });
  await expect.poll(async () => (await evenementsMenu(page)).length).toBe(avant + 1);
  const apres = await evenementsMenu(page);
  return apres[apres.length - 1]!;
}

/** Noms des entrées du menu ouvert, dans l'ordre. */
const entrees = async (page: Page) =>
  (await menu(page).getByRole('menuitem').allTextContents()).map((t) => t.trim());

/** Ouvre le menu sur `origine` (clic droit), choisit `entree`, remplit le Nom ; renvoie le dialogue. */
async function remplirParMenu(page: Page, origine: Locator, entree: string, nom: string) {
  await origine.click({ button: 'right' });
  await expect(menu(page)).toBeVisible();
  await menu(page).getByRole('menuitem', { name: entree, exact: true }).click();
  const d = page.getByRole('dialog', { name: entree, exact: true });
  await expect(d).toBeVisible();
  await d.getByLabel('Nom').fill(nom);
  return d;
}
async function creerParMenu(page: Page, origine: Locator, entree: string, nom: string) {
  const d = await remplirParMenu(page, origine, entree, nom);
  await d.getByRole('button', { name: 'Créer' }).click();
  await expect(d).toHaveCount(0);
}

/** Requêtes d'écriture émises par la page, dans l'ordre. */
interface Requetes {
  creations: { chemin: 'activites' | 'jalons'; corps: unknown }[];
  copies: { id: number; corps: unknown }[];
  calculs: unknown[];
  ecritures: number;
  ordre: string[];
  gets: number;
}
function suivreRequetes(page: Page): Requetes {
  const r: Requetes = { creations: [], copies: [], calculs: [], ecritures: 0, ordre: [], gets: 0 };
  page.on('request', (req) => {
    const m = req.method();
    const url = req.url();
    if (m === 'GET') {
      if (/\/api\/projets\/\d+\/gantt$/.test(url)) r.gets++;
      return;
    }
    // Révision -r1 (D-031, D-113 (2)) : la connexion n'est pas une écriture de l'écran.
    if (!/\/api\/auth\//.test(url)) r.ecritures++;
    const c = /\/api\/projets\/\d+\/(activites|jalons)$/.exec(url);
    const k = /\/api\/projets\/(\d+)\/copie$/.exec(url);
    if (m === 'POST' && c) {
      r.creations.push({ chemin: c[1] as 'activites' | 'jalons', corps: req.postDataJSON() });
      r.ordre.push(`POST ${c[1]}`);
    } else if (m === 'POST' && k) {
      r.copies.push({ id: Number(k[1]), corps: req.postDataJSON() });
      r.ordre.push('POST copie');
    } else if (m === 'POST' && /\/api\/calcul$/.test(url)) {
      r.calculs.push(req.postDataJSON());
      r.ordre.push('POST calcul');
    }
  });
  return r;
}

/** Monde « arbo » (identique à celui de lot3f1.spec.ts). */
async function mondeArbo(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const { api, projet, chef, gens } = m;
  const p = await activiteAvec(request, projet.id, 'Phase P');
  const p1 = await activiteAvec(request, projet.id, 'Sous P1', { parent_id: p.id });
  const p2 = await activiteAvec(request, projet.id, 'Sous P2', { parent_id: p.id });
  const q = await activiteAvec(request, projet.id, 'Tâche Q', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await api.assignation(q.id, gens.Alice!.id, 3);
  const r = await activiteAvec(request, projet.id, 'Tâche R');
  const j = await jalonAvec(request, projet.id, 'Jalon J', {
    type: 'fixe',
    date_validee: '2027-01-25',
  });
  const k = await activiteAvec(request, projet.id, 'Clos K');
  const clos = await request.patch(`/api/activites/${k.id}`, { data: { close: true } });
  expect(clos.ok(), `clôture de K : ${clos.status()}`).toBeTruthy();
  const s = await sousProjet(request, projet.id, `S-${suffixe}`, 'Sous-projet arbo', chef.id);
  await calculer(request, [projet.id]);
  return { ...m, p, p1, p2, q, r, j, k, s };
}
type Monde = Awaited<ReturnType<typeof mondeArbo>>;

/** Connexion, page Gantt, préambule : barre de Q aux dates attendues, ordre et retraits initiaux. */
async function ouvrir(page: Page, m: Monde, options: { email?: string; zoom?: string } = {}) {
  await surveillerMenuNavigateur(page);
  await connecterAvec(page, options.email ?? m.emailChef);
  await page.goto(gantt(m.projet.id, options.zoom));
  await expect(barre(page, m.q.id)).toHaveAttribute('aria-label', BARRE_Q);
  await expect.poll(() => ordre(page)).toEqual(ORDRE_INITIAL);
}

/** Parent et rang de chaque élément du projet, lus par l'API (état en base). */
async function etatBase(request: APIRequestContext, projetId: number) {
  const res = await request.get(`/api/projets/${projetId}/gantt`);
  expect(res.ok(), `GET gantt : ${res.status()}`).toBeTruthy();
  const g = (await res.json()) as {
    elements: { id: number; parent_id: number | null; rang: number }[];
  };
  return g.elements.map((e) => [e.id, e.parent_id, e.rang]).sort((a, b) => a[0]! - b[0]!);
}

const dialogueDeplacer = (page: Page, nom: string) =>
  page.getByRole('dialog', { name: `Déplacer ${nom}` });
const MILIEU = 0.5;

/** Glisser de la poignée de `source` vers `cible` (fraction `fy` de la hauteur), puis lâcher. */
async function glisser(page: Page, source: string, cible: string, fy: number) {
  const h = ligneDe(page, source).locator('[data-poignee-ligne]');
  await expect(h).toHaveCount(1);
  const d = await centre(h);
  await page.mouse.move(d.x, d.y);
  await page.mouse.down();
  const b = (await ligneDe(page, cible).boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + fy * b.height, { steps: 12 });
  await laisserPasser(page);
  await page.mouse.up();
  await laisserPasser(page);
}

test('E2E-194-r1 : menu au clic droit sur une ligne d’activité ou de jalon (tableau) et sur une barre ou un losange (SVG), tous zooms ; aucun sur un sous-projet', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E194');
  // Révision -r1 (D-031, D-113 (1)) : S reçoit une activité assignée à Bob (affecté à S) pour avoir une barre.
  const bob = await m.api.utilisateur('Bob', 'bob-e2e194@example.test', 'ressource', true);
  await m.api.affectation(m.s.id, bob.id);
  const aS = await activiteAvec(request, m.s.id, 'Tâche S');
  await m.api.assignation(aS.id, bob.id, 5);
  await calculer(request, [m.projet.id, m.s.id]);
  await ouvrir(page, m);
  await expect(page.locator('svg [data-projet-id]')).toHaveCount(1);
  for (const zoom of ['jour', 'semaine', 'mois']) {
    if (zoom !== 'jour') {
      await page.goto(gantt(m.projet.id, zoom));
      await expect.poll(() => ordre(page)).toEqual(ORDRE_INITIAL);
    }
    const cibles: [string, Locator][] = [
      ['ligne P', ligneDe(page, 'Phase P')],
      ['ligne J', ligneDe(page, 'Jalon J')],
      ['ligne K close', ligneDe(page, 'Clos K')],
      ['barre Q', barre(page, m.q.id)],
      ['losange J', barre(page, m.j.id)],
    ];
    for (const [nom, cible] of cibles) {
      expect(await clicDroit(page, cible), `${zoom} ${nom} : contextmenu empêché`).toBe(true);
      await expect(menu(page), `${zoom} ${nom}`).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu(page), `${zoom} ${nom} fermé`).toHaveCount(0);
    }
    // Sous-projet : menu du navigateur conservé.
    expect(await clicDroit(page, ligneDe(page, 'Sous-projet arbo')), `${zoom} ligne S`).toBe(false);
    await expect(menu(page), `${zoom} ligne S`).toHaveCount(0);
    expect(
      await clicDroit(page, page.locator('svg [data-projet-id]').first()),
      `${zoom} barre S`,
    ).toBe(false);
    await expect(menu(page), `${zoom} barre S`).toHaveCount(0);
  }
  expect(await etatBase(request, m.projet.id)).toBeTruthy();
});

test('E2E-195 : aucun menu pour une ressource, un modèle ni l’Accueil ; témoin positif : le chef l’a', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E195');
  const modele = await m.api.modele('MOD-195', 'Modèle 195');
  await activiteAvec(request, modele.id, 'Tâche modèle');
  await ouvrir(page, m);

  // Témoin positif : le chef a le menu sur Q dans le même monde.
  expect(await clicDroit(page, ligneDe(page, 'Tâche Q'))).toBe(true);
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press('Escape');

  // Ressource : peut_ecrire faux ; témoin : ligne et barre de Q affichées.
  await page.context().clearCookies();
  await connecterAvec(page, m.gens.Alice!.email);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.q.id)).toHaveAttribute('aria-label', BARRE_Q);
  await expect(ligneDe(page, 'Tâche Q')).toHaveCount(1);
  expect(await clicDroit(page, ligneDe(page, 'Tâche Q'))).toBe(false);
  expect(await clicDroit(page, barre(page, m.q.id))).toBe(false);
  await expect(menu(page)).toHaveCount(0);

  // Modèle : ligne affichée, aucun menu.
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(gantt(modele.id));
  await expect(ligneDe(page, 'Tâche modèle')).toHaveCount(1);
  expect(await clicDroit(page, ligneDe(page, 'Tâche modèle'))).toBe(false);
  await expect(menu(page)).toHaveCount(0);

  // Accueil : Gantt global déplié, ligne d'activité affichée, aucun menu.
  await page.goto('/');
  const global = page.getByRole('region', { name: 'Tableau du Gantt global', exact: true });
  await page.getByRole('button', { name: 'Déplier Projet E2E195', exact: true }).click();
  const ligneQ = global.getByRole('row').filter({ hasText: 'Tâche Q' });
  await expect(ligneQ).toHaveCount(1);
  expect(await clicDroit(page, ligneQ)).toBe(false);
  await expect(menu(page)).toHaveCount(0);
});

test('E2E-196 : entrées du menu dans l’ordre selon la ligne : activité (3), jalon (2, sans sous-activité), tableau et SVG', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E196');
  await ouvrir(page, m);
  const activite = [NOUVELLE_ACTIVITE, NOUVEAU_JALON, NOUVELLE_SOUS];
  const jalon = [NOUVELLE_ACTIVITE, NOUVEAU_JALON];
  const cas: [string, Locator, string[]][] = [
    ['tableau P', ligneDe(page, 'Phase P'), activite],
    ['tableau R', ligneDe(page, 'Tâche R'), activite],
    ['tableau K close', ligneDe(page, 'Clos K'), activite],
    ['tableau J', ligneDe(page, 'Jalon J'), jalon],
    ['SVG Q', barre(page, m.q.id), activite],
    ['SVG J', barre(page, m.j.id), jalon],
  ];
  for (const [nom, cible, attendu] of cas) {
    await cible.click({ button: 'right' });
    await expect(menu(page), nom).toBeVisible();
    expect(await entrees(page), nom).toEqual(attendu);
    await page.keyboard.press('Escape');
    await expect(menu(page), nom).toHaveCount(0);
  }
});

test('E2E-197 : Maj+F10 ou touche Menu sur la barre active ouvre le menu sur cette barre ; rien sans barre active ni pour une ressource', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E197');
  await ouvrir(page, m);

  // Sans barre active : aucun menu.
  await calendrier(page).focus();
  await expect(calendrier(page)).toBeFocused();
  await expect(page.locator('svg [data-anneau-element]')).toHaveCount(0);
  await page.keyboard.press('Shift+F10');
  await expect(menu(page)).toHaveCount(0);

  // Barre de Q active (clic simple) : Maj+F10 ouvre le menu sur la barre.
  await barre(page, m.q.id).click();
  await expect(anneau(page, m.q.id)).toHaveCount(1);
  await page.keyboard.press('Shift+F10');
  await expect(menu(page)).toBeVisible();
  expect(await entrees(page)).toEqual([NOUVELLE_ACTIVITE, NOUVEAU_JALON, NOUVELLE_SOUS]);
  const b = (await barre(page, m.q.id).boundingBox())!;
  const mb = (await menu(page).boundingBox())!;
  expect(mb.x, 'abscisse du menu dans la barre').toBeGreaterThanOrEqual(b.x - 1);
  expect(mb.x, 'abscisse du menu dans la barre').toBeLessThanOrEqual(b.x + b.width);
  expect(mb.y, 'ordonnée du menu sur la barre').toBeGreaterThanOrEqual(b.y - 1);
  expect(mb.y, 'ordonnée du menu sur la barre').toBeLessThanOrEqual(b.y + b.height + 8);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);

  // Touche Menu.
  await page.keyboard.press('ContextMenu');
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);

  // Ressource : barre active, mais aucun menu.
  await page.context().clearCookies();
  await connecterAvec(page, m.gens.Alice!.email);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.q.id)).toHaveAttribute('aria-label', BARRE_Q);
  await barre(page, m.q.id).click();
  await expect(anneau(page, m.q.id)).toHaveCount(1);
  await page.keyboard.press('Shift+F10');
  await page.keyboard.press('ContextMenu');
  await expect(menu(page)).toHaveCount(0);
});

test('E2E-198-r1 : Échap ferme le menu et rend le focus à la zone d’origine, sans requête d’écriture', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E198');
  const r = suivreRequetes(page);
  await ouvrir(page, m);

  await ligneDe(page, 'Phase P').click({ button: 'right' });
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect(tableau(page)).toBeFocused();

  await barre(page, m.r.id).click({ button: 'right' });
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect(calendrier(page)).toBeFocused();

  await barre(page, m.q.id).click();
  await expect(anneau(page, m.q.id)).toHaveCount(1);
  await page.keyboard.press('Shift+F10');
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect(calendrier(page)).toBeFocused();
  await expect(anneau(page, m.q.id)).toHaveCount(1);

  await laisserPasser(page);
  expect(r.ecritures).toBe(0);
  expect(await ordre(page)).toEqual(ORDRE_INITIAL);
});

test('E2E-199 : « Nouvelle activité » : POST de corps exact (rang de la ligne + 1), ordre, bandeau sans contour, barre active gardée, focus rendu', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E199');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  await barre(page, m.q.id).click();
  await expect(anneau(page, m.q.id)).toHaveCount(1);
  const gets = r.gets;

  // Depuis le tableau : ligne de P1 (rang 1 sous P) → rang 2.
  await creerParMenu(page, ligneDe(page, 'Sous P1'), NOUVELLE_ACTIVITE, 'Nouvelle A');
  await expect.poll(() => r.creations.length).toBe(1);
  expect(r.creations[0]).toEqual({
    chemin: 'activites',
    corps: { nom: 'Nouvelle A', parent_id: m.p.id, rang: 2 },
  });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Nouvelle A',
      '1.3 Sous P2',
      '2 Tâche Q',
      '3 Tâche R',
      '4 Jalon J',
      '5 Clos K',
      SOUS_PROJET,
    ]);
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(0);
  await expect(anneau(page, m.q.id)).toHaveCount(1);
  expect(r.gets).toBeGreaterThan(gets);
  expect(r.calculs.length).toBe(0);
  await expect(tableau(page)).toBeFocused();

  // Depuis le SVG : barre de Q (rang 2, racine) → rang 3.
  await creerParMenu(page, barre(page, m.q.id), NOUVELLE_ACTIVITE, 'Nouvelle B');
  await expect.poll(() => r.creations.length).toBe(2);
  expect(r.creations[1]).toEqual({
    chemin: 'activites',
    corps: { nom: 'Nouvelle B', parent_id: null, rang: 3 },
  });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Nouvelle A',
      '1.3 Sous P2',
      '2 Tâche Q',
      '3 Nouvelle B',
      '4 Tâche R',
      '5 Jalon J',
      '6 Clos K',
      SOUS_PROJET,
    ]);
  await expect(calendrier(page)).toBeFocused();
  await expect(anneau(page, m.q.id)).toHaveCount(1);
  await laisserPasser(page);
  expect(r.creations.length).toBe(2);
  expect(r.calculs.length).toBe(0);
});

test('E2E-200 : « Nouveau jalon » depuis le tableau et « Nouvelle activité » depuis un losange : corps exacts, ordre', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E200');
  const r = suivreRequetes(page);
  await ouvrir(page, m);

  await creerParMenu(page, ligneDe(page, 'Tâche R'), NOUVEAU_JALON, 'Jalon N');
  await expect.poll(() => r.creations.length).toBe(1);
  expect(r.creations[0]).toEqual({
    chemin: 'jalons',
    corps: { nom: 'Jalon N', parent_id: null, rang: 4 },
  });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '2 Tâche Q',
      '3 Tâche R',
      '4 Jalon N',
      '5 Jalon J',
      '6 Clos K',
      SOUS_PROJET,
    ]);
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(0);

  // Losange de J (devenu 5) : « Nouvelle activité » → rang 6.
  await creerParMenu(page, barre(page, m.j.id), NOUVELLE_ACTIVITE, 'Act M');
  await expect.poll(() => r.creations.length).toBe(2);
  expect(r.creations[1]).toEqual({
    chemin: 'activites',
    corps: { nom: 'Act M', parent_id: null, rang: 6 },
  });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '2 Tâche Q',
      '3 Tâche R',
      '4 Jalon N',
      '5 Jalon J',
      '6 Act M',
      '7 Clos K',
      SOUS_PROJET,
    ]);
  await expect(calendrier(page)).toBeFocused();
});

test('E2E-201 : « Nouvelle sous-activité » : dernier enfant, corps sans rang, retrait d’un niveau', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E201');
  const r = suivreRequetes(page);
  await ouvrir(page, m);

  await creerParMenu(page, ligneDe(page, 'Phase P'), NOUVELLE_SOUS, 'Fille P');
  await expect.poll(() => r.creations.length).toBe(1);
  expect(r.creations[0]).toEqual({
    chemin: 'activites',
    corps: { nom: 'Fille P', parent_id: m.p.id },
  });
  expect(Object.keys(r.creations[0]!.corps as object)).not.toContain('rang');
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '1.3 Fille P',
      '2 Tâche Q',
      '3 Tâche R',
      '4 Jalon J',
      '5 Clos K',
      SOUS_PROJET,
    ]);
  expect((await retraits(page))[3]).toBe('pl-4');
  await expect(bandeau(page)).toBeVisible();

  // Depuis la barre de R (feuille, SVG) : R devient parente.
  await creerParMenu(page, barre(page, m.r.id), NOUVELLE_SOUS, 'Fille R');
  await expect.poll(() => r.creations.length).toBe(2);
  expect(r.creations[1]).toEqual({
    chemin: 'activites',
    corps: { nom: 'Fille R', parent_id: m.r.id },
  });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '1.3 Fille P',
      '2 Tâche Q',
      '3 Tâche R',
      '3.1 Fille R',
      '4 Jalon J',
      '5 Clos K',
      SOUS_PROJET,
    ]);
});

test('E2E-202 : « Recalcul automatique » cochée : une création par le menu, puis un seul calcul, pas de bandeau', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E202');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  await caseAuto(page).check();

  await creerParMenu(page, ligneDe(page, 'Tâche R'), NOUVEAU_JALON, 'Jalon auto');
  await expect.poll(() => r.ordre.length).toBe(2);
  expect(r.ordre).toEqual(['POST jalons', 'POST calcul']);
  expect(r.creations[0]).toEqual({
    chemin: 'jalons',
    corps: { nom: 'Jalon auto', parent_id: null, rang: 4 },
  });
  expect(r.calculs[0]).toEqual({ projets: [m.projet.id], d0: '2027-01-06' });
  await expect(enCours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '2 Tâche Q',
      '3 Tâche R',
      '4 Jalon auto',
      '5 Jalon J',
      '6 Clos K',
      SOUS_PROJET,
    ]);
  await laisserPasser(page);
  expect(r.ordre.length).toBe(2);
});

test('E2E-203-r1 : refus réels dans le dialogue laissé ouvert (parent assigné, parent clos), base inchangée ; témoin positif', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E203');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  await caseAuto(page).check();
  const base = await etatBase(request, m.projet.id);

  // Q assignée.
  const d = await remplirParMenu(page, ligneDe(page, 'Tâche Q'), NOUVELLE_SOUS, 'Fille Q');
  await d.getByRole('button', { name: 'Créer' }).click();
  await expect.poll(() => r.creations.length).toBe(1);
  expect(r.creations[0]).toEqual({
    chemin: 'activites',
    corps: { nom: 'Fille Q', parent_id: m.q.id },
  });
  await expect(d.getByText(T_PARENT_ASSIGNE)).toBeVisible();
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Annuler' }).click();
  await expect(d).toHaveCount(0);
  await expect(tableau(page)).toBeFocused();

  // K close.
  const d2 = await remplirParMenu(page, ligneDe(page, 'Clos K'), NOUVELLE_SOUS, 'Fille K');
  await d2.getByRole('button', { name: 'Créer' }).click();
  await expect.poll(() => r.creations.length).toBe(2);
  expect(r.creations[1]).toEqual({
    chemin: 'activites',
    corps: { nom: 'Fille K', parent_id: m.k.id },
  });
  await expect(d2.getByText(T_PARENT_CLOS)).toBeVisible();
  await expect(d2.getByText(T_PARENT_ASSIGNE)).toHaveCount(0);
  await expect(d2).toBeVisible();
  await d2.getByRole('button', { name: 'Annuler' }).click();
  await expect(d2).toHaveCount(0);
  // Révision -r1 (D-031, D-113 (3)) : K close n'a pas de barre ; menu ouvert depuis le tableau.
  await expect(tableau(page)).toBeFocused();

  expect(await ordre(page)).toEqual(ORDRE_INITIAL);
  expect(await etatBase(request, m.projet.id)).toEqual(base);
  await expect(bandeau(page)).toHaveCount(0);
  await laisserPasser(page);
  expect(r.calculs.length).toBe(0);

  // Témoin positif : la même entrée sur R (feuille libre) réussit.
  await creerParMenu(page, ligneDe(page, 'Tâche R'), NOUVELLE_SOUS, 'Fille R');
  await expect.poll(() => r.creations.length).toBe(3);
  await expect.poll(() => ordre(page)).toContain('3.1 Fille R');
});

test('E2E-204 : bouton « Copier » après « Initiales » pour le chef et l’administrateur ; absent pour une ressource et un modèle', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E204');
  const modele = await m.api.modele('MOD-204', 'Modèle 204');
  await activiteAvec(request, modele.id, 'Tâche modèle');
  await ouvrir(page, m);

  for (const zoom of ['jour', 'semaine', 'mois']) {
    await page.goto(gantt(m.projet.id, zoom));
    await expect.poll(() => ordre(page)).toEqual(ORDRE_INITIAL);
    await expect(boutonCopier(page), zoom).toHaveCount(1);
    await expect(boutonCopier(page).locator('svg.lucide-copy'), zoom).toHaveCount(1);
  }
  // Ordre de tabulation : Initiales, Copier, tableau.
  const initiales = page.getByRole('checkbox', { name: 'Initiales', exact: true });
  await initiales.focus();
  await page.keyboard.press('Tab');
  await expect(boutonCopier(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(tableau(page)).toBeFocused();

  // Administrateur.
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(gantt(m.projet.id));
  await expect.poll(() => ordre(page)).toEqual(ORDRE_INITIAL);
  await expect(boutonCopier(page)).toHaveCount(1);

  // Ressource (témoin : barre de Q) : aucun bouton.
  await page.context().clearCookies();
  await connecterAvec(page, m.gens.Alice!.email);
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.q.id)).toHaveAttribute('aria-label', BARRE_Q);
  await expect(boutonCopier(page)).toHaveCount(0);

  // Modèle (témoin : ligne de son activité) : aucun bouton.
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(gantt(modele.id));
  await expect(ligneDe(page, 'Tâche modèle')).toHaveCount(1);
  await expect(boutonCopier(page)).toHaveCount(0);
});

test('E2E-205 : dialogue de copie du Gantt : titre, valeurs préremplies, case « Enregistrer comme modèle » pour l’administrateur seul', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E205');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  await boutonCopier(page).click();
  const d = page.getByRole('dialog', { name: 'Copier Projet E2E205', exact: true });
  await expect(d).toBeVisible();
  await expect(d.getByLabel('Nom')).toHaveValue('Copie de Projet E2E205');
  await expect(d.getByLabel('Date de début')).toHaveValue('2027-01-04');
  await expect(d.getByRole('checkbox', { name: 'Enregistrer comme modèle' })).toHaveCount(0);
  await d.getByRole('button', { name: 'Annuler' }).click();
  await expect(d).toHaveCount(0);

  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(gantt(m.projet.id));
  await expect.poll(() => ordre(page)).toEqual(ORDRE_INITIAL);
  await boutonCopier(page).click();
  await expect(d).toBeVisible();
  const caseModele = d.getByRole('checkbox', { name: 'Enregistrer comme modèle' });
  await expect(caseModele).toHaveCount(1);
  await expect(caseModele).not.toBeChecked();
  await d.getByRole('button', { name: 'Annuler' }).click();
  await expect(d).toHaveCount(0);
  await laisserPasser(page);
  expect(r.copies.length).toBe(0);
});

test('E2E-206-r1 : copie faite à l’écran depuis le Gantt (chef) : POST de corps exact, navigation, Gantt de la copie, source inchangée', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E206');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  const base = await etatBase(request, m.projet.id);
  await boutonCopier(page).click();
  const d = page.getByRole('dialog', { name: 'Copier Projet E2E206', exact: true });
  await d.getByLabel('Code').fill('C-206');
  await d.getByRole('button', { name: 'Copier', exact: true }).click();

  await expect.poll(() => r.copies.length).toBe(1);
  expect(r.copies[0]).toEqual({
    id: m.projet.id,
    corps: {
      nom: 'Copie de Projet E2E206',
      code: 'C-206',
      date_debut: '2027-01-04',
      sous_projets: true,
      affectations: true,
      est_modele: false,
    },
  });
  // Révision -r1 (D-031, D-113 (4)) : attendre la navigation avant de lire l'id de la copie.
  await expect(page).not.toHaveURL(new RegExp(`/projets/${m.projet.id}(\\?|$)`));
  await expect(page).toHaveURL(/\/projets\/\d+/);
  expect(Number(/\/projets\/(\d+)/.exec(page.url())![1])).not.toBe(m.projet.id);
  await expect(
    page.getByRole('heading', { name: 'Copie de Projet E2E206', level: 1 }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect
    .poll(async () => (await ordre(page)).filter((l) => !l.startsWith('—')))
    .toEqual(ORDRE_INITIAL.filter((l) => !l.startsWith('—')));
  await expect(page.locator('svg [data-element-id]')).toHaveCount(0);
  expect(await etatBase(request, m.projet.id)).toEqual(base);
});

test('E2E-207 : copie « Enregistrer comme modèle » depuis le Gantt (administrateur) : corps, fiche du modèle sans « Copier » ni poignée, écran « Modèles »', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E207');
  const r = suivreRequetes(page);
  await ouvrir(page, m, {});
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(gantt(m.projet.id));
  await expect.poll(() => ordre(page)).toEqual(ORDRE_INITIAL);
  await boutonCopier(page).click();
  const d = page.getByRole('dialog', { name: 'Copier Projet E2E207', exact: true });
  await d.getByLabel('Code').fill('M-207');
  await d.getByRole('checkbox', { name: 'Enregistrer comme modèle' }).check();
  await d.getByRole('button', { name: 'Copier', exact: true }).click();

  await expect.poll(() => r.copies.length).toBe(1);
  expect(r.copies[0]!.corps).toEqual({
    nom: 'Copie de Projet E2E207',
    code: 'M-207',
    date_debut: '2027-01-04',
    sous_projets: true,
    affectations: true,
    est_modele: true,
  });
  await expect(page).toHaveURL(/\/projets\/\d+/);
  await expect(
    page.getByRole('heading', { name: 'Copie de Projet E2E207', level: 1 }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect(ligneDe(page, 'Phase P')).toHaveCount(1);
  await expect(boutonCopier(page)).toHaveCount(0);
  await expect(poignees(page)).toHaveCount(0);

  await allerA(page, 'Modèles');
  await expect(page.getByRole('row', { name: /Copie de Projet E2E207/ })).toBeVisible();
});

test('E2E-208 : parcours complet à l’écran (chaîne d’E2E-192), puis création par le menu contextuel et copie depuis le Gantt', async ({
  page,
}) => {
  await loginAsAdmin(page);

  await allerA(page, 'Calendriers');
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 3F-208');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 3F-208/ })).toBeVisible();

  await creerRessourceParEcran(
    page,
    'Ressource 3F-208',
    'ressource-3f-192@lot3f.test',
    'Cal 3F-208',
  );
  await creerProjetParEcran(page, '3F-208', 'Projet 3F-208');

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 3F-208' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3F-208', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Ressource')
    .selectOption({ label: 'Ressource 3F-208' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource 3F-208/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Phase 3F-208');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Phase 3F-208/ })).toBeVisible();
  await page
    .getByRole('button', { name: 'Ajouter une sous-activité à Phase 3F-208', exact: true })
    .click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 3F-208');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3F-208/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 3F-208' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource 3F-208' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3F-208.*Ressource 3F-208/ })).toBeVisible();

  await page.getByRole('button', { name: 'Modifier Tâche 3F-208', exact: true }).click();
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
  await page.getByRole('link', { name: 'Projet 3F-208' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3F-208', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche bis 3F-208');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche bis 3F-208/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche bis 3F-208' }).click();
  const assignation2 = page.getByRole('dialog');
  await assignation2.getByLabel('Ressource').selectOption({ label: 'Ressource 3F-208' });
  await assignation2.getByLabel('Charge assignée (jours)').fill('2');
  await assignation2.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche bis 3F-208.*Ressource 3F-208/ })).toBeVisible();
  await page.getByRole('button', { name: 'Modifier Tâche bis 3F-208', exact: true }).click();
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

  const premiere = page.getByRole('img', { name: /^Tâche 3F-208, du / });
  const seconde = page.getByRole('img', { name: /^Tâche bis 3F-208, du / });
  await expect(premiere).toHaveCount(1);
  await expect(seconde).toHaveCount(1);
  const idSeconde = Number(await seconde.getAttribute('data-element-id'));
  // Préambule (D-105) : sans lien, le début de la première ≤ la fin de la seconde.
  const debutPremiere = (await premiere.getAttribute('data-debut'))!;
  const finSeconde = (await seconde.getAttribute('data-fin'))!;
  expect(
    debutPremiere <= finSeconde,
    `préambule : ${debutPremiere} doit être ≤ ${finSeconde}`,
  ).toBe(true);
  await expect(page.locator('svg [data-lien-id]')).toHaveCount(0);

  await caseAuto(page).check();
  // Lien de la seconde vers la première par le connecteur (D-105), recalcul automatique.
  const cibleLien = await centre(premiere);
  const connecteur = page.locator(`svg [data-connecteur-element="${idSeconde}"]`);
  await expect(connecteur).toHaveCount(1);
  const depart = await centre(connecteur);
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  await page.mouse.move(cibleLien.x, cibleLien.y, { steps: 12 });
  await laisserPasser(page);
  await page.mouse.up();
  await laisserPasser(page);
  await expect(page.locator('svg [data-lien-id]')).toHaveCount(1);
  await expect
    .poll(
      async () =>
        (await premiere.getAttribute('data-debut'))! > (await seconde.getAttribute('data-fin'))!,
    )
    .toBe(true);
  await expect(bandeau(page)).toHaveCount(0);

  // 3f-1 : changement de parent à l'écran. Glisser « Tâche bis » dans « Phase ».
  await expect
    .poll(() => ordre(page))
    .toEqual(['1 Phase 3F-208', '1.1 Tâche 3F-208', '2 Tâche bis 3F-208']);
  await glisser(page, 'Tâche bis 3F-208', 'Phase 3F-208', MILIEU);
  await expect
    .poll(() => ordre(page))
    .toEqual(['1 Phase 3F-208', '1.1 Tâche 3F-208', '1.2 Tâche bis 3F-208']);
  expect((await retraits(page))[2]).toBe('pl-4');

  // Puis par le dialogue de l'onglet Planning : retour à la racine.
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Déplacer Tâche bis 3F-208', exact: true }).click();
  const dialogue = dialogueDeplacer(page, 'Tâche bis 3F-208');
  await expect(dialogue.getByLabel('Activité parente').locator('option:checked')).toHaveText(
    '1 Phase 3F-208',
  );
  await dialogue.getByLabel('Activité parente').selectOption({ label: 'Racine du projet' });
  await dialogue.getByRole('button', { name: 'Déplacer', exact: true }).click();
  await expect(dialogue).toHaveCount(0);
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect
    .poll(() => ordre(page))
    .toEqual(['1 Phase 3F-208', '1.1 Tâche 3F-208', '2 Tâche bis 3F-208']);
  expect((await retraits(page))[2]).toBe('pl-0');

  // 3f-2 : création par le menu contextuel (recalcul automatique décoché pour isoler l'effet).
  await caseAuto(page).uncheck();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await creerParMenu(page, ligneDe(page, 'Tâche bis 3F-208'), NOUVEAU_JALON, 'Jalon 3F-208');
  await expect
    .poll(() => ordre(page))
    .toEqual(['1 Phase 3F-208', '1.1 Tâche 3F-208', '2 Tâche bis 3F-208', '3 Jalon 3F-208']);
  await expect(bandeau(page)).toBeVisible();

  // Copie depuis le Gantt, vérifiée dans l'écran de la copie.
  await boutonCopier(page).click();
  const copie = page.getByRole('dialog', { name: 'Copier Projet 3F-208', exact: true });
  await expect(copie).toBeVisible();
  await copie.getByLabel('Code').fill('3F-208C');
  await copie.getByRole('button', { name: 'Copier', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Copie de Projet 3F-208', level: 1 }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect
    .poll(() => ordre(page))
    .toEqual(['1 Phase 3F-208', '1.1 Tâche 3F-208', '2 Tâche bis 3F-208', '3 Jalon 3F-208']);
});
