// Correctif rex3b (D-207 (1), SPEC.md Gantt point 17) : un geste qui enregistre dure jusqu'à la réponse de
// son enregistrement ; pendant ce temps Ctrl+Z, Cmd+Z et le bouton « Annuler » sont ignorés (bouton
// désactivé). La requête du geste est retenue par `page.route`, sans délai (E2E-512 à E2E-517).
import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
  type Route,
} from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b } from './lot3b-helpers.js';
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
const glisserApplique = (page: Page, id: number, dx: number) =>
  appliquerGeste(barre(page, id), contours(page, id), () => glisser(page, barre(page, id), dx));

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
 * Retient la prochaine requête `methode` vers `motif` une fois armée ; `liberer()` la laisse passer,
 * `refuser(statut)` y répond par un refus simulé.
 */
async function retenue(page: Page, motif: string, methode: string) {
  let armee = false;
  let route: Route | null = null;
  let signaler: () => void = () => undefined;
  const arrivee = new Promise<void>((r) => (signaler = r));
  await page.route(motif, async (r) => {
    if (r.request().method() === methode && armee && route === null) {
      route = r;
      signaler();
      return;
    }
    await r.continue();
  });
  return {
    armer: () => {
      armee = true;
    },
    retenue: async () => {
      await arrivee;
    },
    liberer: async () => {
      await route!.continue();
    },
    refuser: async (statut: number) => {
      await route!.fulfill({
        status: statut,
        contentType: 'application/json',
        body: JSON.stringify({ erreur: 'Refus simulé' }),
      });
    },
  };
}

async function activiteBase(request: APIRequestContext, projetId: number, id: number) {
  const r = await request.get(`/api/projets/${projetId}/activites`);
  expect(r.ok(), `GET activites : ${r.status()}`).toBeTruthy();
  const liste = (await r.json()) as { id: number; debut_valide: string | null }[];
  return liste.find((a) => a.id === id)!;
}
async function debutEnBase(
  request: APIRequestContext,
  projetId: number,
  id: number,
  e: Ecriture[],
  attendu: string,
) {
  let lu: string | null | undefined;
  try {
    await expect
      .poll(async () => (lu = (await activiteBase(request, projetId, id)).debut_valide))
      .toBe(attendu);
  } catch (err) {
    throw new Error(
      `debut_valide attendu ${attendu}, lu ${String(lu)} ; ${journal(e)}\n${(err as Error).message}`,
    );
  }
}
async function dependancesBase(request: APIRequestContext, projetId: number) {
  const r = await request.get(`/api/projets/${projetId}/gantt`);
  expect(r.ok(), `GET gantt : ${r.status()}`).toBeTruthy();
  return ((await r.json()) as { dependances: { id: number }[] }).dependances;
}
const ordre = (page: Page) =>
  page.locator('table tbody tr').evaluateAll((rows) =>
    rows.map((r) => {
      const t = r.querySelectorAll('td');
      return `${t[0]!.textContent!.trim()} ${t[1]!.textContent!.trim()}`;
    }),
  );
const ligneDe = (page: Page, nom: string) =>
  page
    .getByRole('region', { name: 'Tableau du Gantt', exact: true })
    .locator('tr', { hasText: nom });

async function mondeStart(request: APIRequestContext, suffixe: string) {
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
  await calculer(request, [m.projet.id]);
  return { ...m, a, b };
}
async function ouvrir(page: Page, m: { emailChef: string; projet: { id: number } }) {
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=jour`);
  await page.locator('svg[data-zoom]').waitFor();
}
/** Laisse l'éventuelle réaction d'une annulation interdite se produire. */
const attendre = async (page: Page) => {
  await laisserPasser(page);
  await page.waitForTimeout(300);
};

for (const mode of ['ctrlz', 'bouton'] as const) {
  test(`${mode === 'ctrlz' ? 'E2E-512' : 'E2E-513'} : deux gestes de barre, le second retenu : ${mode === 'ctrlz' ? 'Ctrl+Z' : 'bouton « Annuler »'} ignoré, puis deux annulations`, async ({
    page,
    request,
  }) => {
    const m = await mondeStart(request, mode === 'ctrlz' ? 'E2E512' : 'E2E513');
    const e = suivreEcritures(page);
    const r = await retenue(page, `**/api/activites/${m.a.id}`, 'PATCH');
    await ouvrir(page, m);
    await glisserApplique(page, m.a.id, PX_JOUR);
    await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-12');

    r.armer();
    await glisser(page, barre(page, m.a.id), 2 * PX_JOUR);
    await r.retenue();
    if (mode === 'ctrlz') {
      await calendrier(page).focus();
      await page.keyboard.press('Control+z');
    } else {
      await expect(boutonAnnuler(page), journal(e)).toBeDisabled();
      await boutonAnnuler(page).click({ force: true });
    }
    await attendre(page);
    expect(patchsDe(e, m.a.id).length, journal(e)).toBe(2);
    await expect(annonce(page)).toHaveCount(0);

    await r.liberer();
    await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-13');
    await expect(boutonAnnuler(page)).toBeEnabled();
    await boutonAnnuler(page).click();
    await expect.poll(() => patchsDe(e, m.a.id).length, { message: journal(e) }).toBe(3);
    expect(patchsDe(e, m.a.id)[2]!.corps, journal(e)).toEqual({ debut_valide: '2027-01-12' });
    await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-12');
    await expect(boutonAnnuler(page)).toBeEnabled();
    await boutonAnnuler(page).click();
    await expect.poll(() => patchsDe(e, m.a.id).length, { message: journal(e) }).toBe(4);
    expect(patchsDe(e, m.a.id)[3]!.corps, journal(e)).toEqual({ debut_valide: '2027-01-11' });
    await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-11');
    await expect(boutonAnnuler(page)).toBeDisabled();
  });
}

// Révision E2E-514-r1 (D-031, D-210 (2)) : la base est relue par `expect.poll` après le DELETE, avec le journal en message.
test('E2E-514-r1 : lien créé par glisser, POST retenu : Ctrl+Z et « Annuler » ignorés ; libéré : annulation du lien puis de la barre', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E514');
  const e = suivreEcritures(page);
  const r = await retenue(page, `**/api/projets/${m.projet.id}/dependances`, 'POST');
  await ouvrir(page, m);
  await glisserApplique(page, m.a.id, PX_JOUR);
  await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-12');

  r.armer();
  const d = await centre(connecteur(page, m.a.id));
  const v = await centre(barre(page, m.b.id));
  await page.mouse.move(d.x, d.y);
  await page.mouse.down();
  await page.mouse.move(v.x, v.y, { steps: 12 });
  await page.mouse.up();
  await r.retenue();
  await expect(boutonAnnuler(page), journal(e)).toBeDisabled();
  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await boutonAnnuler(page).click({ force: true });
  await attendre(page);
  expect(
    e.map((x) => x.methode),
    journal(e),
  ).toEqual(['PATCH', 'POST']);
  await expect(annonce(page)).toHaveCount(0);

  await r.liberer();
  await expect.poll(async () => (await dependancesBase(request, m.projet.id)).length).toBe(1);
  await expect(boutonAnnuler(page)).toBeEnabled();
  await boutonAnnuler(page).click();
  await expect
    .poll(() => e.filter((x) => x.methode === 'DELETE').length, { message: journal(e) })
    .toBe(1);
  let dependances: { id: number }[] | undefined;
  try {
    await expect
      .poll(async () => (dependances = await dependancesBase(request, m.projet.id)).length)
      .toBe(0);
  } catch (err) {
    throw new Error(
      `dépendances lues après le DELETE : ${JSON.stringify(dependances)} ; ${journal(e)}\n${String(err)}`,
    );
  }
  await expect(boutonAnnuler(page)).toBeEnabled();
  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, m.a.id).length, { message: journal(e) }).toBe(2);
  expect(patchsDe(e, m.a.id)[1]!.corps, journal(e)).toEqual({ debut_valide: '2027-01-11' });
  await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-11');
});

test('E2E-515 : ligne glissée dans une activité, POST retenu : Ctrl+Z et « Annuler » ignorés ; libéré : annulation de la ligne puis de la barre', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E515', ['Alice']);
  const p = await activiteAvec(request, m.projet.id, 'Phase P');
  await activiteAvec(request, m.projet.id, 'Sous P1', { parent_id: p.id });
  await activiteAvec(request, m.projet.id, 'Sous P2', { parent_id: p.id });
  const q = await activiteAvec(request, m.projet.id, 'Tâche Q', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(q.id, m.gens.Alice!.id, 3);
  const rr = await activiteAvec(request, m.projet.id, 'Tâche R');
  await jalonAvec(request, m.projet.id, 'Jalon J', { type: 'fixe', date_validee: '2027-01-25' });
  await calculer(request, [m.projet.id]);
  const ORDRE = ['1 Phase P', '1.1 Sous P1', '1.2 Sous P2', '2 Tâche Q', '3 Tâche R', '4 Jalon J'];
  const e = suivreEcritures(page);
  const r = await retenue(page, `**/api/elements/${rr.id}/deplacer`, 'POST');
  await ouvrir(page, m);
  await expect.poll(() => ordre(page)).toEqual(ORDRE);
  await glisserApplique(page, q.id, PX_JOUR);
  await debutEnBase(request, m.projet.id, q.id, e, '2027-01-12');

  r.armer();
  const h = await centre(ligneDe(page, 'Tâche R').locator('[data-poignee-ligne]'));
  const cible = (await ligneDe(page, 'Phase P').boundingBox())!;
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  await page.mouse.move(cible.x + 40, cible.y + 0.5 * cible.height, { steps: 12 });
  await laisserPasser(page);
  await page.mouse.up();
  await r.retenue();
  await expect(boutonAnnuler(page), journal(e)).toBeDisabled();
  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await boutonAnnuler(page).click({ force: true });
  await attendre(page);
  expect(
    e.map((x) => `${x.methode} ${x.chemin}`),
    journal(e),
  ).toEqual([`PATCH /api/activites/${q.id}`, `POST /api/elements/${rr.id}/deplacer`]);
  await expect(annonce(page)).toHaveCount(0);

  await r.liberer();
  await expect.poll(() => ordre(page)).not.toEqual(ORDRE);
  await expect(boutonAnnuler(page)).toBeEnabled();
  await boutonAnnuler(page).click();
  await expect
    .poll(() => e.filter((x) => x.chemin.endsWith('/deplacer')).length, { message: journal(e) })
    .toBe(2);
  expect(e.filter((x) => x.chemin.endsWith('/deplacer'))[1]!.corps, journal(e)).toEqual({
    parent_id: null,
    rang: 3,
  });
  await expect.poll(() => ordre(page)).toEqual(ORDRE);
  await expect(boutonAnnuler(page)).toBeEnabled();
  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, q.id).length, { message: journal(e) }).toBe(2);
  expect(patchsDe(e, q.id)[1]!.corps, journal(e)).toEqual({ debut_valide: '2027-01-11' });
  await debutEnBase(request, m.projet.id, q.id, e, '2027-01-11');
});

test('E2E-516 : geste de la barre B retenu, geste de A empilé : Ctrl+Z et « Annuler » ignorés (A garde son geste) ; libéré : B puis A', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E516');
  const e = suivreEcritures(page);
  const r = await retenue(page, `**/api/activites/${m.b.id}`, 'PATCH');
  await ouvrir(page, m);
  await glisserApplique(page, m.a.id, PX_JOUR);
  await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-12');

  r.armer();
  await glisser(page, barre(page, m.b.id), PX_JOUR);
  await r.retenue();
  await expect(boutonAnnuler(page), journal(e)).toBeDisabled();
  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await boutonAnnuler(page).click({ force: true });
  await attendre(page);
  expect(patchsDe(e, m.a.id).length, journal(e)).toBe(1);
  await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-12');
  await expect(annonce(page)).toHaveCount(0);

  await r.liberer();
  await debutEnBase(request, m.projet.id, m.b.id, e, '2027-01-19');
  await expect(boutonAnnuler(page)).toBeEnabled();
  await boutonAnnuler(page).click();
  await debutEnBase(request, m.projet.id, m.b.id, e, '2027-01-18');
  await expect(boutonAnnuler(page)).toBeEnabled();
  await boutonAnnuler(page).click();
  await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-11');
  await expect(boutonAnnuler(page)).toBeDisabled();
});

test('E2E-517-r1 : PATCH du second geste retenu puis refusé (500) : bouton désactivé pendant la retenue, puis alerte, base inchangée, pile du premier geste', async ({
  page,
  request,
}) => {
  const m = await mondeStart(request, 'E2E517');
  const e = suivreEcritures(page);
  const r = await retenue(page, `**/api/activites/${m.a.id}`, 'PATCH');
  await ouvrir(page, m);
  await glisserApplique(page, m.a.id, PX_JOUR);
  await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-12');

  r.armer();
  await glisser(page, barre(page, m.a.id), 2 * PX_JOUR);
  await r.retenue();
  await expect(boutonAnnuler(page), journal(e)).toBeDisabled();
  await calendrier(page).focus();
  await page.keyboard.press('Control+z');
  await attendre(page);
  expect(patchsDe(e, m.a.id).length, journal(e)).toBe(2);

  await r.refuser(500);
  // Révision E2E-517-r1 (D-031) : l'alerte contient aussi le bouton « Fermer » ; le texte est vérifié par `toContainText`.
  await expect(page.getByRole('alert')).toContainText(
    'Modification impossible pour le moment. Réessayez.',
  );
  await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-12');
  await expect(annonce(page)).toHaveCount(0);
  await expect(boutonAnnuler(page)).toBeEnabled();
  await boutonAnnuler(page).click();
  await expect.poll(() => patchsDe(e, m.a.id).length, { message: journal(e) }).toBe(3);
  expect(patchsDe(e, m.a.id)[2]!.corps, journal(e)).toEqual({ debut_valide: '2027-01-11' });
  await debutEnBase(request, m.projet.id, m.a.id, e, '2027-01-11');
  await expect(boutonAnnuler(page)).toBeDisabled();
});
