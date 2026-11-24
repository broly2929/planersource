// Correctif inverse (D-208 (4), SPEC.md Gantt point 17, D-123 (1)) : annulation = requête inverse avec les
// valeurs d'avant le geste. Une réponse de `GET /api/projets/:id/gantt` partie avant un geste et reçue après sa
// réponse ne doit pas faire calculer l'inverse du geste suivant sur l'élément d'avant. La réponse périmée est
// retenue par `page.route` (`route.fetch`, puis `route.fulfill` à la main, aucun délai) (E2E-518 à E2E-520).
import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
  type Route,
} from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, monde3b } from './lot3b-helpers.js';
import { remettreAdminSeul } from './lot3c-helpers.js';
import { appliquerGeste } from './patch-helpers.js';

const J06 = '2027-01-06T10:00:00';
const PX_JOUR = 24;

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime(J06);
  await page.setViewportSize({ width: 1600, height: 900 });
});
test.afterEach(remettreAdminSeul);

const boutonAnnuler = (page: Page) => page.getByRole('button', { name: 'Annuler', exact: true });
const annonce = (page: Page) => page.getByRole('status').filter({ hasText: 'Geste annulé.' });
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);
const poigneeFin = (page: Page, id: number) =>
  page.locator(`svg [data-poignee="droite"][data-poignee-element="${id}"]`);
const contours = (page: Page, id: number) => page.locator(`svg [data-contour-element="${id}"]`);
const connecteur = (page: Page, id: number) =>
  page.locator(`svg [data-connecteur-element="${id}"]`);
const calendrier = (page: Page) =>
  page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
const laisserPasser = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

async function centre(cible: Locator): Promise<{ x: number; y: number }> {
  await cible.scrollIntoViewIfNeeded();
  const b = (await cible.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function glisser(page: Page, cible: Locator, dx: number): Promise<void> {
  const c = await centre(cible);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + dx, c.y, { steps: Math.max(2, Math.ceil(Math.abs(dx) / 6)) });
  await page.mouse.up();
  await laisserPasser(page);
}
/** Glisser puis attente de l'écran (D-146 (2)) : contour posé ailleurs, barre libérée (`cursor-grab`). */
const glisserApplique = (page: Page, id: number, cible: Locator, dx: number) =>
  appliquerGeste(barre(page, id), contours(page, id), () => glisser(page, cible, dx));
/** Poignée de fin : le contour garde son bord gauche, sa largeur change ; puis barre libérée. */
async function etirerApplique(page: Page, id: number, dx: number): Promise<void> {
  const largeur = async () =>
    (await contours(page, id).count()) === 1
      ? (await contours(page, id).boundingBox())!.width
      : null;
  const avant = await largeur();
  await glisser(page, poigneeFin(page, id), dx);
  await expect
    .poll(async () => {
      const l = await largeur();
      return l !== null && l !== avant;
    })
    .toBe(true);
  await expect(barre(page, id)).toHaveClass(/cursor-grab/);
}

interface Ecriture {
  methode: string;
  chemin: string;
  corps: unknown;
}
function suivreEcritures(page: Page): Ecriture[] {
  const e: Ecriture[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (
      r.method() === 'GET' ||
      !url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/api/auth/')
    )
      return;
    e.push({ methode: r.method(), chemin: url.pathname, corps: r.postDataJSON() as unknown });
  });
  return e;
}
const journal = (e: Ecriture[]) =>
  e.map((x, i) => `#${i + 1} ${x.methode} ${x.chemin} ${JSON.stringify(x.corps)}`).join(' ; ');
const patchsDe = (e: Ecriture[], id: number) =>
  e.filter((x) => x.methode === 'PATCH' && x.chemin === `/api/activites/${id}`);

/**
 * Retient la réponse d'un `GET …/gantt` : le n-ième depuis la pose (`rang`), ou le premier après `armer()`.
 * La requête part au serveur tout de suite (`route.fetch`) ; sa réponse n'est rendue à la page qu'à `liberer()`.
 */
async function retenueGantt(page: Page, projetId: number, rang: number | null) {
  let vus = 0;
  let armee = rang !== null;
  let liberer: (() => Promise<void>) | null = null;
  let signaler: () => void = () => undefined;
  const arrivee = new Promise<void>((r) => (signaler = r));
  await page.route(`**/api/projets/${projetId}/gantt`, async (route: Route) => {
    vus++;
    const cible = rang === null ? armee && liberer === null : vus === rang;
    if (!cible) return route.continue();
    armee = false;
    const reponse = await route.fetch();
    liberer = () => route.fulfill({ response: reponse });
    signaler();
  });
  return {
    vus: () => vus,
    armer: () => {
      armee = true;
    },
    retenue: () => arrivee,
    liberer: async () => {
      await liberer!();
      await laisserPasser(page);
    },
  };
}

type Champ = 'debut_valide' | 'duree_validee';
async function valeurEnBase(
  request: APIRequestContext,
  projetId: number,
  id: number,
  champ: Champ,
): Promise<unknown> {
  const r = await request.get(`/api/projets/${projetId}/activites`);
  expect(r.ok(), `GET activites : ${r.status()}`).toBeTruthy();
  const liste = (await r.json()) as ({ id: number } & Record<Champ, unknown>)[];
  return liste.find((a) => a.id === id)![champ];
}
async function enBase(
  request: APIRequestContext,
  projetId: number,
  id: number,
  champ: Champ,
  e: Ecriture[],
  attendu: unknown,
): Promise<void> {
  let lu: unknown;
  try {
    await expect
      .poll(async () => (lu = await valeurEnBase(request, projetId, id, champ)))
      .toBe(attendu);
  } catch (err) {
    throw new Error(
      `${champ} attendu ${String(attendu)}, lu ${String(lu)} ; ${journal(e)}\n${(err as Error).message}`,
    );
  }
}

/** Ctrl+Z dans le calendrier : la n-ième écriture PATCH de `id` porte `corps`, puis la base vaut `attendu`. */
async function annulerParCtrlZ(
  page: Page,
  request: APIRequestContext,
  m: { projet: { id: number } },
  id: number,
  e: Ecriture[],
  n: number,
  corps: Record<Champ, unknown> | Partial<Record<Champ, unknown>>,
  champ: Champ,
  attendu: unknown,
): Promise<void> {
  await expect(boutonAnnuler(page), journal(e)).toBeEnabled();
  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await expect.poll(() => patchsDe(e, id).length, { message: journal(e) }).toBe(n);
  expect(patchsDe(e, id)[n - 1]!.corps, `PATCH #${n} ; ${journal(e)}`).toEqual(corps);
  await expect(annonce(page)).toBeVisible();
  await enBase(request, m.projet.id, id, champ, e, attendu);
}

async function monde(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Bob']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche START', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 5);
  const b = await activiteAvec(request, m.projet.id, 'Tâche B', {
    mode: 'START',
    debut_valide: '2027-01-18',
  });
  await m.api.assignation(b.id, m.gens.Bob!.id, 5);
  const f = await activiteAvec(request, m.projet.id, 'Tâche FDUR', {
    mode: 'FDUR',
    debut_valide: '2027-01-11',
    duree_validee: 5,
  });
  await m.api.assignation(f.id, m.gens.Alice!.id, 5);
  await calculer(request, [m.projet.id]);
  return { ...m, a, b, f };
}
async function ouvrir(page: Page, m: { emailChef: string; projet: { id: number } }) {
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=jour`);
  await page.locator('svg[data-zoom]').waitFor();
}

test('E2E-518 : second GET du montage reçu après le geste 1 : inverses du geste 2 puis du geste 1 (12/01, 11/01)', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E518');
  const e = suivreEcritures(page);
  const r = await retenueGantt(page, m.projet.id, 2);
  await ouvrir(page, m);
  await r.retenue();
  await glisserApplique(page, m.a.id, barre(page, m.a.id), PX_JOUR);
  await enBase(request, m.projet.id, m.a.id, 'debut_valide', e, '2027-01-12');
  await r.liberer();
  await glisserApplique(page, m.a.id, barre(page, m.a.id), 2 * PX_JOUR);
  await enBase(request, m.projet.id, m.a.id, 'debut_valide', e, '2027-01-13');

  await annulerParCtrlZ(
    page,
    request,
    m,
    m.a.id,
    e,
    3,
    { debut_valide: '2027-01-12' },
    'debut_valide',
    '2027-01-12',
  );
  await annulerParCtrlZ(
    page,
    request,
    m,
    m.a.id,
    e,
    4,
    { debut_valide: '2027-01-11' },
    'debut_valide',
    '2027-01-11',
  );
});

test('E2E-519 : poignée de fin d’une FDUR, second GET du montage reçu après le geste 1 : inverses 6 puis 5', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E519');
  const e = suivreEcritures(page);
  const r = await retenueGantt(page, m.projet.id, 2);
  await ouvrir(page, m);
  await r.retenue();
  await etirerApplique(page, m.f.id, 72);
  await enBase(request, m.projet.id, m.f.id, 'duree_validee', e, 6);
  await r.liberer();
  await etirerApplique(page, m.f.id, 96);
  await enBase(request, m.projet.id, m.f.id, 'duree_validee', e, 7);

  await annulerParCtrlZ(page, request, m, m.f.id, e, 3, { duree_validee: 6 }, 'duree_validee', 6);
  await annulerParCtrlZ(page, request, m, m.f.id, e, 4, { duree_validee: 5 }, 'duree_validee', 5);
});

test('E2E-520 : GET de rechargement après un lien reçu après le geste 1 : inverses 12/01 puis 11/01', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E520');
  const e = suivreEcritures(page);
  const r = await retenueGantt(page, m.projet.id, null);
  await ouvrir(page, m);
  await laisserPasser(page);
  await expect.poll(() => r.vus()).toBeGreaterThanOrEqual(1);
  const vusAuMontage = r.vus();
  await page.waitForTimeout(300);
  expect(r.vus(), 'GET …/gantt du montage terminés').toBe(vusAuMontage);

  r.armer();
  const d = await centre(connecteur(page, m.a.id));
  const v = await centre(barre(page, m.b.id));
  await page.mouse.move(d.x, d.y);
  await page.mouse.down();
  await page.mouse.move(v.x, v.y, { steps: 12 });
  await page.mouse.up();
  await r.retenue();
  await expect(boutonAnnuler(page), journal(e)).toBeEnabled();

  await glisserApplique(page, m.a.id, barre(page, m.a.id), PX_JOUR);
  await enBase(request, m.projet.id, m.a.id, 'debut_valide', e, '2027-01-12');
  await r.liberer();
  await glisserApplique(page, m.a.id, barre(page, m.a.id), 2 * PX_JOUR);
  await enBase(request, m.projet.id, m.a.id, 'debut_valide', e, '2027-01-13');

  await annulerParCtrlZ(
    page,
    request,
    m,
    m.a.id,
    e,
    3,
    { debut_valide: '2027-01-12' },
    'debut_valide',
    '2027-01-12',
  );
  await annulerParCtrlZ(
    page,
    request,
    m,
    m.a.id,
    e,
    4,
    { debut_valide: '2027-01-11' },
    'debut_valide',
    '2027-01-11',
  );
});
