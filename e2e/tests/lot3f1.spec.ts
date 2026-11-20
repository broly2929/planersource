// Lot 3f-1 (D-108) : glisser une ligne du tableau du Gantt, dialogue « Déplacer ». E2E-181 à E2E-192.
// Base « administrateur seul » remise à zéro avant et après chaque test, horloge du navigateur figée au
// 06/01/2027, zoom jour, données créées par l'API sauf E2E-192 (tout à l'écran), requêtes POST comptées
// par `page.on('request')`, contexte de navigateur neuf (localStorage vide).
// Monde « arbo » (ordre WBS, rangs de 1 à n) : 1 Phase P (parente) ; 1.1 Sous P1 ; 1.2 Sous P2 ;
// 2 Tâche Q (START 11/01/2027, 3 j, Alice, donc assignée, avec barre) ; 3 Tâche R ; 4 Jalon J (fixe
// 25/01/2027) ; 5 Clos K (activité close) ; puis le sous-projet S (ligne de synthèse en dernier).
// Contrat (à relire) :
//   - poignée : `[data-poignee-ligne="<id>"]` dans la cellule Nom du tableau, `aria-hidden="true"`, sans
//     `tabindex`, curseur grab ;
//   - pendant le glisser (seuil de 4 px) : la ligne `tr` source porte `data-ligne-source="<id>"` ; la ligne
//     cible porte `data-insertion-ligne="<id>"` et `data-insertion` = avant | dans | apres ; rien sur une
//     cible interdite ; tout est retiré au lâcher ou à Échap ;
//   - retrait : la cellule Nom contient une classe `pl-N` de retraits.ts (pas de 4 px par niveau de WBS) ;
//   - lâcher accepté : 1 POST /api/elements/:id/deplacer, Gantt rechargé, bandeau « Planning à recalculer »
//     sans contour, ou calcul si la case « Recalcul automatique » est cochée ; refus : alerte `role="alert"` ;
//   - onglet Planning : bouton « Déplacer <nom> » ; dialogue « Déplacer <nom> », champ « Activité parente »,
//     boutons « Déplacer » et « Annuler ».
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
  remettreAdminSeul,
} from './lot3c-helpers.js';

const J06 = '2027-01-06T10:00:00';
const TITRE_ACTIVITE = 'Modifier l’activité';
const BARRE_Q = 'Tâche Q, du 11/01/2027 au 13/01/2027';
const T_PARENT_ASSIGNE = 'Une activité avec des ressources assignées ne peut pas avoir d’enfant.';
const T_PARENT_CLOS = 'Le projet ou l’activité parente est clos.';
const T_HIERARCHIE = 'Une dépendance relie cet élément à l’une de ses activités parentes.';
const T_RECHARGEZ = 'Modification impossible : rechargez la page.';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const gantt = (projetId: number, zoom = 'jour') => `/projets/${projetId}?onglet=gantt&zoom=${zoom}`;
const tableau = (page: Page) => page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
/** Échappement des caractères spéciaux d'expression régulière. */
const echapper = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Ligne par son nom exact ou « <code> · <nom> » (ligne de sous-projet, D-123 (7), D-126). */
const ligneDe = (page: Page, nom: string) =>
  tableau(page)
    .locator('tbody tr')
    .filter({ has: page.getByText(new RegExp(`^(?:\\S+ · )?${echapper(nom)}$`)) });
const poignees = (page: Page) => tableau(page).locator('[data-poignee-ligne]');
const poigneeDe = (page: Page, nom: string) => ligneDe(page, nom).locator('[data-poignee-ligne]');
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const anneau = (page: Page, id: number) => page.locator(`svg [data-anneau-element="${id}"]`);
const contours = (page: Page) => page.locator('svg [data-contour-element]');
const bandeau = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning à recalculer' });
const enCours = (page: Page) => page.getByRole('status').filter({ hasText: 'Recalcul en cours…' });
const alertes = (page: Page) => page.getByRole('alert');
const caseAuto = (page: Page) =>
  page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true });
const sources = (page: Page) => page.locator('[data-ligne-source]');
const insertions = (page: Page) => page.locator('[data-insertion-ligne]');

const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

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

/** Requêtes d'écriture émises par la page, dans l'ordre. */
interface Requetes {
  deplacements: { id: number; corps: unknown }[];
  calculs: unknown[];
  ordre: string[];
  gets: number;
}
function suivreRequetes(page: Page): Requetes {
  const r: Requetes = { deplacements: [], calculs: [], ordre: [], gets: 0 };
  page.on('request', (req) => {
    const m = req.method();
    const url = req.url();
    if (m === 'GET') {
      if (/\/api\/projets\/\d+\/gantt$/.test(url)) r.gets++;
      return;
    }
    const d = /\/api\/elements\/(\d+)\/deplacer$/.exec(url);
    if (m === 'POST' && d) {
      r.deplacements.push({ id: Number(d[1]), corps: req.postDataJSON() });
      r.ordre.push('POST deplacer');
    } else if (m === 'POST' && /\/api\/calcul$/.test(url)) {
      r.calculs.push(req.postDataJSON());
      r.ordre.push('POST calcul');
    }
  });
  return r;
}

async function centre(cible: Locator): Promise<{ x: number; y: number }> {
  const b = (await cible.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Fraction de la hauteur de la ligne cible : activité avant 0,15, dans 0,5, après 0,85 ; jalon 0,25 / 0,75. */
const HAUT = 0.15;
const MILIEU = 0.5;
const BAS = 0.85;
const JALON_HAUT = 0.25;
const JALON_BAS = 0.75;

/** Appui sur la poignée de `source`, déplacement vers la ligne `cible` (fraction `fy`), puis lâcher. */
async function commencerGlisser(page: Page, source: string, cible: string, fy: number) {
  const h = poigneeDe(page, source);
  await expect(h).toHaveCount(1);
  const d = await centre(h);
  await page.mouse.move(d.x, d.y);
  await page.mouse.down();
  await versLigne(page, cible, fy);
}
async function versLigne(page: Page, cible: string, fy: number) {
  const b = (await ligneDe(page, cible).boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + fy * b.height, { steps: 12 });
  await laisserPasser(page);
}
async function glisser(page: Page, source: string, cible: string, fy: number) {
  await commencerGlisser(page, source, cible, fy);
  await page.mouse.up();
  await laisserPasser(page);
}

/** Monde « arbo ». */
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

test('E2E-181-r1 : poignées sur les activités et les jalons (tous zooms), aucune pour un sous-projet, un chef en lecture seule ni un modèle', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E181');
  await ouvrir(page, m);
  for (const id of [m.p.id, m.p1.id, m.p2.id, m.q.id, m.r.id, m.j.id, m.k.id]) {
    const h = tableau(page).locator(`[data-poignee-ligne="${id}"]`);
    await expect(h).toHaveCount(1);
    await expect(h).toHaveAttribute('aria-hidden', 'true');
    expect(await h.getAttribute('tabindex')).toBeNull();
    expect(await h.evaluate((e) => getComputedStyle(e).cursor)).toBe('grab');
  }
  await expect(poignees(page)).toHaveCount(7);
  await expect(ligneDe(page, 'Sous-projet arbo').locator('[data-poignee-ligne]')).toHaveCount(0);
  for (const zoom of ['semaine', 'mois']) {
    await page.goto(gantt(m.projet.id, zoom));
    await expect.poll(() => ordre(page)).toEqual(ORDRE_INITIAL);
    await expect(poignees(page), zoom).toHaveCount(7);
  }

  // Chef lecteur : peut_ecrire faux ; témoin positif : la ligne de Q est affichée.
  await page.context().clearCookies();
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, m.projet.id, 'E181'));
  await page.goto(gantt(m.projet.id));
  await expect(barre(page, m.q.id)).toHaveAttribute('aria-label', BARRE_Q);
  await expect(ligneDe(page, 'Tâche Q')).toHaveCount(1);
  await expect(poignees(page)).toHaveCount(0);

  // Modèle : lignes affichées, aucune poignée.
  const modele = await m.api.modele('MOD-181', 'Modèle 181');
  await activiteAvec(request, modele.id, 'Tâche modèle');
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto(gantt(modele.id));
  await expect(ligneDe(page, 'Tâche modèle')).toHaveCount(1);
  await expect(poignees(page)).toHaveCount(0);
});

test('E2E-182 : « avant » : POST de corps exact, ordre et retrait dans le tableau, bandeau sans contour, barre active gardée', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E182');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  await barre(page, m.q.id).click();
  await expect(anneau(page, m.q.id)).toHaveCount(1);
  const gets = r.gets;

  // Autre fratrie : R devient le premier enfant de P.
  await glisser(page, 'Tâche R', 'Sous P1', HAUT);
  await expect.poll(() => r.deplacements.length).toBe(1);
  expect(r.deplacements[0]).toEqual({ id: m.r.id, corps: { parent_id: m.p.id, rang: 1 } });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Tâche R',
      '1.2 Sous P1',
      '1.3 Sous P2',
      '2 Tâche Q',
      '3 Jalon J',
      '4 Clos K',
      SOUS_PROJET,
    ]);
  expect(await retraits(page)).toEqual([
    'pl-0',
    'pl-4',
    'pl-4',
    'pl-4',
    'pl-0',
    'pl-0',
    'pl-0',
    null,
  ]);
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(0);
  await expect(anneau(page, m.q.id)).toHaveCount(1);
  expect(r.gets).toBeGreaterThan(gets);
  expect(r.calculs.length).toBe(0);

  // Même fratrie, source avant la cible : le rang envoyé est celui de K moins 1.
  await glisser(page, 'Tâche Q', 'Clos K', HAUT);
  await expect.poll(() => r.deplacements.length).toBe(2);
  expect(r.deplacements[1]).toEqual({ id: m.q.id, corps: { parent_id: null, rang: 3 } });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Tâche R',
      '1.2 Sous P1',
      '1.3 Sous P2',
      '2 Jalon J',
      '3 Tâche Q',
      '4 Clos K',
      SOUS_PROJET,
    ]);
  await laisserPasser(page);
  expect(r.deplacements.length).toBe(2);
});

test('E2E-183 : « après » : après une activité parente (après son sous-arbre) et après un jalon', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E183');
  const r = suivreRequetes(page);
  await ouvrir(page, m);

  await glisser(page, 'Tâche R', 'Phase P', BAS);
  await expect.poll(() => r.deplacements.length).toBe(1);
  expect(r.deplacements[0]).toEqual({ id: m.r.id, corps: { parent_id: null, rang: 2 } });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '2 Tâche R',
      '3 Tâche Q',
      '4 Jalon J',
      '5 Clos K',
      SOUS_PROJET,
    ]);

  await glisser(page, 'Sous P2', 'Jalon J', JALON_BAS);
  await expect.poll(() => r.deplacements.length).toBe(2);
  expect(r.deplacements[1]).toEqual({ id: m.p2.id, corps: { parent_id: null, rang: 5 } });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '2 Tâche R',
      '3 Tâche Q',
      '4 Jalon J',
      '5 Sous P2',
      '6 Clos K',
      SOUS_PROJET,
    ]);
  expect((await retraits(page))[5]).toBe('pl-0');
  await expect(bandeau(page)).toBeVisible();
  await expect(contours(page)).toHaveCount(0);
});

test('E2E-184 : « dans » : dernier enfant, corps sans rang ; une feuille devient parente', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E184');
  const r = suivreRequetes(page);
  await ouvrir(page, m);

  await glisser(page, 'Tâche Q', 'Phase P', MILIEU);
  await expect.poll(() => r.deplacements.length).toBe(1);
  expect(r.deplacements[0]).toEqual({ id: m.q.id, corps: { parent_id: m.p.id } });
  expect(Object.keys(r.deplacements[0]!.corps as object)).toEqual(['parent_id']);
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '1.3 Tâche Q',
      '2 Tâche R',
      '3 Jalon J',
      '4 Clos K',
      SOUS_PROJET,
    ]);

  await glisser(page, 'Tâche R', 'Sous P1', MILIEU);
  await expect.poll(() => r.deplacements.length).toBe(2);
  expect(r.deplacements[1]).toEqual({ id: m.r.id, corps: { parent_id: m.p1.id } });
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.1.1 Tâche R',
      '1.2 Sous P2',
      '1.3 Tâche Q',
      '2 Jalon J',
      '3 Clos K',
      SOUS_PROJET,
    ]);
  expect((await retraits(page))[2]).toBe('pl-8');
  await expect(bandeau(page)).toBeVisible();
});

test('E2E-185 : indicateurs pendant le glisser (source, cible, zone), aucun sous le seuil ni sur une cible interdite', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E185');
  const r = suivreRequetes(page);
  await ouvrir(page, m);

  // Sous le seuil de 4 px : pas encore de geste.
  const h = await centre(poigneeDe(page, 'Tâche R'));
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  await page.mouse.move(h.x + 2, h.y + 1);
  await laisserPasser(page);
  await expect(sources(page)).toHaveCount(0);
  await expect(insertions(page)).toHaveCount(0);

  // Au-delà : ligne source marquée, zone de la cible selon la position verticale.
  await versLigne(page, 'Tâche Q', HAUT);
  await expect(sources(page)).toHaveCount(1);
  await expect(ligneDe(page, 'Tâche R')).toHaveAttribute('data-ligne-source', String(m.r.id));
  await expect(insertions(page)).toHaveCount(1);
  await expect(ligneDe(page, 'Tâche Q')).toHaveAttribute('data-insertion-ligne', String(m.q.id));
  await expect(ligneDe(page, 'Tâche Q')).toHaveAttribute('data-insertion', 'avant');
  await versLigne(page, 'Tâche Q', MILIEU);
  await expect(insertions(page)).toHaveCount(1);
  await expect(ligneDe(page, 'Tâche Q')).toHaveAttribute('data-insertion', 'dans');
  await versLigne(page, 'Tâche Q', BAS);
  await expect(ligneDe(page, 'Tâche Q')).toHaveAttribute('data-insertion', 'apres');

  // Jalon : deux zones seulement.
  await versLigne(page, 'Jalon J', JALON_HAUT);
  await expect(insertions(page)).toHaveCount(1);
  await expect(ligneDe(page, 'Jalon J')).toHaveAttribute('data-insertion-ligne', String(m.j.id));
  await expect(ligneDe(page, 'Jalon J')).toHaveAttribute('data-insertion', 'avant');
  await versLigne(page, 'Jalon J', 0.5 + 0.01);
  await expect(ligneDe(page, 'Jalon J')).toHaveAttribute('data-insertion', 'apres');
  await versLigne(page, 'Jalon J', JALON_BAS);
  await expect(ligneDe(page, 'Jalon J')).toHaveAttribute('data-insertion', 'apres');

  // Cibles interdites : la source, un sous-projet : aucun indicateur de cible.
  await versLigne(page, 'Tâche R', MILIEU);
  await expect(insertions(page)).toHaveCount(0);
  await versLigne(page, 'Sous-projet arbo', MILIEU);
  await expect(insertions(page)).toHaveCount(0);
  await expect(sources(page)).toHaveCount(1);

  // Au lâcher : plus aucun indicateur, aucune requête.
  await page.mouse.up();
  await laisserPasser(page);
  await expect(sources(page)).toHaveCount(0);
  await expect(insertions(page)).toHaveCount(0);
  expect(r.deplacements.length).toBe(0);

  // Un descendant de la source n'est pas une cible.
  await commencerGlisser(page, 'Phase P', 'Sous P1', MILIEU);
  await expect(sources(page)).toHaveCount(1);
  await expect(insertions(page)).toHaveCount(0);
  await page.mouse.up();
  await laisserPasser(page);
  await expect(sources(page)).toHaveCount(0);
  expect(r.deplacements.length).toBe(0);
});

test('E2E-186 : lâcher sur une cible interdite, hors du tableau ou Échap : aucun POST, ordre et base inchangés', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E186');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  const base = await etatBase(request, m.projet.id);
  const hors = await centre(page.getByRole('heading', { level: 1 }));

  const cas: [string, string, string, number | { x: number; y: number }, boolean][] = [
    ['la source', 'Tâche R', 'Tâche R', MILIEU, false],
    ['un descendant, dans', 'Phase P', 'Sous P1', MILIEU, false],
    ['un descendant, après', 'Phase P', 'Sous P2', BAS, false],
    ['un sous-projet', 'Tâche R', 'Sous-projet arbo', MILIEU, false],
    ['position identique : avant le frère suivant', 'Tâche R', 'Jalon J', JALON_HAUT, false],
    ['position identique : après le frère précédent', 'Tâche Q', 'Phase P', BAS, false],
    ['dernier enfant déjà dans la cible', 'Sous P2', 'Phase P', MILIEU, false],
    ['hors du tableau', 'Tâche R', 'Tâche Q', hors, false],
    ['Échap pendant le glisser', 'Tâche R', 'Tâche Q', HAUT, true],
  ];
  for (const [nom, source, cible, position, echap] of cas) {
    if (typeof position === 'number') {
      await commencerGlisser(page, source, cible, position);
    } else {
      // d'abord sur une vraie cible, puis hors du tableau
      await commencerGlisser(page, source, cible, HAUT);
      await expect(insertions(page), nom).toHaveCount(1);
      await page.mouse.move(position.x, position.y, { steps: 8 });
      await expect(insertions(page), nom).toHaveCount(0);
    }
    if (echap) {
      await expect(insertions(page), nom).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(sources(page), nom).toHaveCount(0);
      await expect(insertions(page), nom).toHaveCount(0);
    }
    await page.mouse.up();
    await laisserPasser(page);
    await expect(sources(page), nom).toHaveCount(0);
    await expect(insertions(page), nom).toHaveCount(0);
    expect(r.deplacements.length, nom).toBe(0);
    expect(await ordre(page), nom).toEqual(ORDRE_INITIAL);
    await expect(bandeau(page), nom).toHaveCount(0);
    await expect(alertes(page), nom).toHaveCount(0);
  }
  expect(await etatBase(request, m.projet.id)).toEqual(base);
});

test('E2E-187 : refus réels (parent assigné, parent clos, dépendance) et 403 intercepté : texte, ordre et base inchangés, ni bandeau ni calcul', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E187');
  await lier(request, m.projet.id, m.p.id, m.r.id);
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  await caseAuto(page).check();
  const base = await etatBase(request, m.projet.id);

  const cas: [string, string, number, unknown, string][] = [
    ['parent assigné', 'Tâche Q', MILIEU, { parent_id: m.q.id }, T_PARENT_ASSIGNE],
    ['parent clos', 'Clos K', MILIEU, { parent_id: m.k.id }, T_PARENT_CLOS],
    ['dépendance avec un ancêtre', 'Phase P', MILIEU, { parent_id: m.p.id }, T_HIERARCHIE],
  ];
  for (const [i, [nom, cible, fy, corps, texte]] of cas.entries()) {
    await glisser(page, 'Tâche R', cible, fy);
    await expect.poll(() => r.deplacements.length, nom).toBe(i + 1);
    expect(r.deplacements[i], nom).toEqual({ id: m.r.id, corps });
    await expect(alertes(page), nom).toHaveCount(1);
    await expect(alertes(page), nom).toContainText(texte);
    expect(await ordre(page), nom).toEqual(ORDRE_INITIAL);
    await expect(bandeau(page), nom).toHaveCount(0);
    expect(await etatBase(request, m.projet.id), nom).toEqual(base);
  }

  // 403 intercepté : le texte « rechargez la page », rien ne bouge.
  await page.route('**/api/elements/*/deplacer', (route) =>
    route.fulfill({ status: 403, json: { erreur: 'Interdit' } }),
  );
  await glisser(page, 'Tâche R', 'Tâche Q', HAUT);
  await expect.poll(() => r.deplacements.length).toBe(4);
  await expect(alertes(page)).toHaveCount(1);
  await expect(alertes(page)).toContainText(T_RECHARGEZ);
  expect(await ordre(page)).toEqual(ORDRE_INITIAL);
  await expect(bandeau(page)).toHaveCount(0);
  await laisserPasser(page);
  expect(r.calculs.length).toBe(0);
  expect(await etatBase(request, m.projet.id)).toEqual(base);
});

test('E2E-188 : « Recalcul automatique » cochée : un POST de déplacement, puis un seul calcul, pas de bandeau', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E188');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  await caseAuto(page).check();

  await glisser(page, 'Tâche R', 'Phase P', BAS);
  await expect.poll(() => r.ordre.length).toBe(2);
  expect(r.ordre).toEqual(['POST deplacer', 'POST calcul']);
  expect(r.deplacements[0]).toEqual({ id: m.r.id, corps: { parent_id: null, rang: 2 } });
  expect(r.calculs[0]).toEqual({ projets: [m.projet.id], d0: '2027-01-06' });
  await expect(enCours(page)).toHaveCount(0);
  await expect(bandeau(page)).toHaveCount(0);
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '2 Tâche R',
      '3 Tâche Q',
      '4 Jalon J',
      '5 Clos K',
      SOUS_PROJET,
    ]);
  await laisserPasser(page);
  expect(r.ordre.length).toBe(2);
});

const dialogueDeplacer = (page: Page, nom: string) =>
  page.getByRole('dialog', { name: `Déplacer ${nom}` });
const optionsDe = (d: Locator) =>
  d.getByLabel('Activité parente').locator('option').allTextContents();

test('E2E-189-r1 : dialogue « Déplacer » de l’onglet Planning : liste, bouton inactif, POST de corps exact, effet dans le Gantt', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E189');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await expect(page.getByRole('button', { name: 'Monter Tâche R', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Déplacer Jalon J', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Déplacer Sous P1', exact: true })).toHaveCount(1);

  // R : racine, activités sauf R (le jalon J n'est pas un parent possible).
  await page.getByRole('button', { name: 'Déplacer Tâche R', exact: true }).click();
  const d = dialogueDeplacer(page, 'Tâche R');
  await expect(d).toBeVisible();
  expect(await optionsDe(d)).toEqual([
    'Racine du projet',
    '1 Phase P',
    '1.1 Sous P1',
    '1.2 Sous P2',
    '2 Tâche Q',
    '5 Clos K',
  ]);
  await expect(d.getByLabel('Activité parente').locator('option:checked')).toHaveText(
    'Racine du projet',
  );
  await expect(d.getByRole('button', { name: 'Déplacer', exact: true })).toBeDisabled();
  await d.getByLabel('Activité parente').selectOption({ label: '1 Phase P' });
  await expect(d.getByRole('button', { name: 'Déplacer', exact: true })).toBeEnabled();
  await d.getByRole('button', { name: 'Déplacer', exact: true }).click();
  await expect.poll(() => r.deplacements.length).toBe(1);
  expect(r.deplacements[0]).toEqual({ id: m.r.id, corps: { parent_id: m.p.id } });
  await expect(d).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Tâche R/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P1',
      '1.2 Sous P2',
      '1.3 Tâche R',
      '2 Tâche Q',
      '3 Jalon J',
      '4 Clos K',
      SOUS_PROJET,
    ]);

  // P : ni lui-même ni ses descendants (P1, P2, R) dans la liste.
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Déplacer Phase P', exact: true }).click();
  const dp = dialogueDeplacer(page, 'Phase P');
  expect(await optionsDe(dp)).toEqual(['Racine du projet', '2 Tâche Q', '4 Clos K']);
  await dp.getByRole('button', { name: 'Annuler' }).click();
  await expect(dp).toHaveCount(0);

  // P1 : parent actuel présélectionné ; retour à la racine, corps { parent_id: null }.
  await page.getByRole('button', { name: 'Déplacer Sous P1', exact: true }).click();
  const d1 = dialogueDeplacer(page, 'Sous P1');
  await expect(d1.getByLabel('Activité parente').locator('option:checked')).toHaveText('1 Phase P');
  await expect(d1.getByRole('button', { name: 'Déplacer', exact: true })).toBeDisabled();
  await d1.getByLabel('Activité parente').selectOption({ label: 'Racine du projet' });
  await d1.getByRole('button', { name: 'Déplacer', exact: true }).click();
  await expect.poll(() => r.deplacements.length).toBe(2);
  expect(r.deplacements[1]).toEqual({ id: m.p1.id, corps: { parent_id: null } });
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect
    .poll(() => ordre(page))
    .toEqual([
      '1 Phase P',
      '1.1 Sous P2',
      '1.2 Tâche R',
      '2 Tâche Q',
      '3 Jalon J',
      '4 Clos K',
      '5 Sous P1',
      SOUS_PROJET,
    ]);

  // Chef lecteur : aucun bouton « Déplacer » (témoin positif : la ligne est affichée).
  await page.context().clearCookies();
  // Révision 6b (D-031, D-148 (9)) : témoin lecture seule = chef de projet affecté au projet d'un autre chef.
  await connecterAvec(page, await chefLecteur(request, m.projet.id, 'E189'));
  await page.goto(`/projets/${m.projet.id}?onglet=planning`);
  await expect(page.getByRole('row', { name: /Tâche Q/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Déplacer / })).toHaveCount(0);
});

test('E2E-190 : refus dans le dialogue « Déplacer » : texte affiché, dialogue ouvert, ordre et base inchangés', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E190');
  const r = suivreRequetes(page);
  await ouvrir(page, m);
  const base = await etatBase(request, m.projet.id);
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Déplacer Tâche R', exact: true }).click();
  const d = dialogueDeplacer(page, 'Tâche R');
  await expect(d).toBeVisible();
  const choix = d.getByLabel('Activité parente');
  const deplacer = d.getByRole('button', { name: 'Déplacer', exact: true });

  await choix.selectOption({ label: '2 Tâche Q' });
  await deplacer.click();
  await expect.poll(() => r.deplacements.length).toBe(1);
  expect(r.deplacements[0]).toEqual({ id: m.r.id, corps: { parent_id: m.q.id } });
  await expect(d.getByText(T_PARENT_ASSIGNE)).toBeVisible();
  await expect(d).toBeVisible();

  await choix.selectOption({ label: '5 Clos K' });
  await deplacer.click();
  await expect.poll(() => r.deplacements.length).toBe(2);
  await expect(d.getByText(T_PARENT_CLOS)).toBeVisible();
  await expect(d.getByText(T_PARENT_ASSIGNE)).toHaveCount(0);
  await expect(d).toBeVisible();

  await page.route('**/api/elements/*/deplacer', (route) =>
    route.fulfill({ status: 403, json: { erreur: 'Interdit' } }),
  );
  await choix.selectOption({ label: '1 Phase P' });
  await deplacer.click();
  await expect.poll(() => r.deplacements.length).toBe(3);
  await expect(d.getByText(T_RECHARGEZ)).toBeVisible();
  await expect(d).toBeVisible();

  await d.getByRole('button', { name: 'Annuler' }).click();
  await expect(d).toHaveCount(0);
  expect(await etatBase(request, m.projet.id)).toEqual(base);
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect.poll(() => ordre(page)).toEqual(ORDRE_INITIAL);
});

test('E2E-191-r3 : poignées hors tabulation, ordre de tabulation de la fiche inchangé', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request, 'E2E191');
  await ouvrir(page, m);
  // Témoin positif : il y a bien des poignées dans la page.
  expect(await poignees(page).count()).toBeGreaterThanOrEqual(1);
  await expect(page.locator('[data-poignee-ligne][tabindex]')).toHaveCount(0);

  const surPoignee = () =>
    page.evaluate(() => document.activeElement?.closest('[data-poignee-ligne]') !== null);
  const region = page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
  const calendrier = page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });

  // Même vérification qu'E2E-43-r2 et E2E-179.
  const calculerBouton = page.getByRole('button', { name: 'Calculer', exact: true });
  await calculerBouton.focus();
  await page.keyboard.press('Tab');
  await expect(caseAuto(page)).toBeFocused();
  const dernierZoom = page.getByRole('group', { name: 'Zoom' }).getByRole('button').last();
  await dernierZoom.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Initiales', exact: true })).toBeFocused();
  // Révision -r1 (D-031, D-111 (6)) : le bouton « Copier » s'insère après « Initiales ».
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Copier', exact: true })).toBeFocused();
  expect(await surPoignee()).toBe(false);
  await page.keyboard.press('Tab');
  await expect(region).toBeFocused();
  expect(await surPoignee()).toBe(false);
  // Révision -r3 (D-031, D-127 (6), (7)) : boutons-noms des éléments en ordre WBS, puis lien et crayon.
  for (const nom of ['Phase P', 'Sous P1', 'Sous P2', 'Tâche Q', 'Tâche R', 'Jalon J', 'Clos K']) {
    await page.keyboard.press('Tab');
    await expect(region.getByRole('button', { name: nom, exact: true })).toBeFocused();
    expect(await surPoignee()).toBe(false);
  }
  await page.keyboard.press('Tab');
  // Révision -r2 (D-031, D-123 (7)) : nom du lien « <code> · <nom> ».
  await expect(
    region.getByRole('link', { name: 'S-E2E191 · Sous-projet arbo', exact: true }),
  ).toBeFocused();
  expect(await surPoignee()).toBe(false);
  await page.keyboard.press('Tab');
  await expect(
    region.getByRole('button', { name: 'Modifier le projet Sous-projet arbo', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(calendrier).toBeFocused();
  expect(await surPoignee()).toBe(false);
});

test('E2E-192 : parcours complet à l’écran (chaîne d’E2E-180), puis changement de parent par le glisser et par le dialogue', async ({
  page,
}) => {
  await loginAsAdmin(page);

  await allerA(page, 'Calendriers');
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal 3F-192');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal 3F-192/ })).toBeVisible();

  await creerRessourceParEcran(
    page,
    'Ressource 3F-192',
    'ressource-3f-192@lot3f.test',
    'Cal 3F-192',
  );
  await creerProjetParEcran(page, '3F-192', 'Projet 3F-192');

  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet 3F-192' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3F-192', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Ressource')
    .selectOption({ label: 'Ressource 3F-192' });
  await page.getByRole('dialog').getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource 3F-192/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Phase 3F-192');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Phase 3F-192/ })).toBeVisible();
  await page
    .getByRole('button', { name: 'Ajouter une sous-activité à Phase 3F-192', exact: true })
    .click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche 3F-192');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3F-192/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche 3F-192' }).click();
  const assignation = page.getByRole('dialog');
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource 3F-192' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche 3F-192.*Ressource 3F-192/ })).toBeVisible();

  await page.getByRole('button', { name: 'Modifier Tâche 3F-192', exact: true }).click();
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
  await page.getByRole('link', { name: 'Projet 3F-192' }).click();
  await expect(page.getByRole('heading', { name: 'Projet 3F-192', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Tâche bis 3F-192');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Tâche bis 3F-192/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Tâche bis 3F-192' }).click();
  const assignation2 = page.getByRole('dialog');
  await assignation2.getByLabel('Ressource').selectOption({ label: 'Ressource 3F-192' });
  await assignation2.getByLabel('Charge assignée (jours)').fill('2');
  await assignation2.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Tâche bis 3F-192.*Ressource 3F-192/ })).toBeVisible();
  await page.getByRole('button', { name: 'Modifier Tâche bis 3F-192', exact: true }).click();
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

  const premiere = page.getByRole('img', { name: /^Tâche 3F-192, du / });
  const seconde = page.getByRole('img', { name: /^Tâche bis 3F-192, du / });
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
    .toEqual(['1 Phase 3F-192', '1.1 Tâche 3F-192', '2 Tâche bis 3F-192']);
  await glisser(page, 'Tâche bis 3F-192', 'Phase 3F-192', MILIEU);
  await expect
    .poll(() => ordre(page))
    .toEqual(['1 Phase 3F-192', '1.1 Tâche 3F-192', '1.2 Tâche bis 3F-192']);
  expect((await retraits(page))[2]).toBe('pl-4');

  // Puis par le dialogue de l'onglet Planning : retour à la racine.
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Déplacer Tâche bis 3F-192', exact: true }).click();
  const dialogue = dialogueDeplacer(page, 'Tâche bis 3F-192');
  await expect(dialogue.getByLabel('Activité parente').locator('option:checked')).toHaveText(
    '1 Phase 3F-192',
  );
  await dialogue.getByLabel('Activité parente').selectOption({ label: 'Racine du projet' });
  await dialogue.getByRole('button', { name: 'Déplacer', exact: true }).click();
  await expect(dialogue).toHaveCount(0);
  await page.getByRole('tab', { name: 'Gantt' }).click();
  await expect
    .poll(() => ordre(page))
    .toEqual(['1 Phase 3F-192', '1.1 Tâche 3F-192', '2 Tâche bis 3F-192']);
  expect((await retraits(page))[2]).toBe('pl-0');
});
