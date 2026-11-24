// REX-3b-r4 (D-132) : E2E-288 (ombre de la colonne Drapeaux figée), E2E-289 (en-têtes entiers à 1440 px),
// E2E-290 (captures, sans assertion fonctionnelle).
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { cheminCapture } from './captures.js';
import { activiteAvec, calculer, monde3b } from './lot3b-helpers.js';

const J06 = '2027-01-06T10:00:00';
const LARGEUR_DRAPEAUX = 92; // mesure de la cellule Drapeaux avant D-132 (badge « Retard »)

test.use({
  locale: 'fr-FR',
  launchOptions: {
    args: ['--lang=fr-FR'],
    env: { ...process.env, LANG: 'fr_FR.UTF-8', LANGUAGE: 'fr' },
  },
});

const connectes = new WeakSet<Page>();
const boite = async (l: Locator) => {
  const b = await l.boundingBox();
  if (!b) throw new Error('élément sans boîte');
  return b;
};

async function mondeRetard(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Retard FDUR', {
    mode: 'FDUR',
    duree_validee: 2,
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await calculer(request, [m.projet.id]);
  return m;
}

async function ouvrirGantt(
  page: Page,
  m: { emailChef: string; projet: { id: number } },
  l: number,
) {
  await page.clock.setFixedTime(J06);
  if (!connectes.has(page)) {
    await connecterAvec(page, m.emailChef);
    connectes.add(page);
  }
  await page.setViewportSize({ width: l, height: 700 });
  await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=semaine`);
  await page.locator('svg[data-zoom]').waitFor();
  return page.getByRole('table', { name: 'Éléments du projet' });
}

async function ouvrirAccueil(page: Page, m: { emailChef: string }, nomProjet: string, l: number) {
  await page.clock.setFixedTime(J06);
  if (!connectes.has(page)) {
    await connecterAvec(page, m.emailChef);
    connectes.add(page);
  }
  await page.setViewportSize({ width: l, height: 700 });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: `Replier ${nomProjet}`, exact: true }),
  ).toBeVisible(); // D-218 (4), (9) : déplié au chargement
  await expect(page.getByRole('button', { name: 'Retard FDUR', exact: true })).toBeVisible();
  return page
    .getByRole('region', { name: 'Tableau du Gantt global', exact: true })
    .getByRole('table');
}

const ombre = (l: Locator) => l.evaluate((e) => getComputedStyle(e).boxShadow);

async function verifierOmbre(tableau: Locator, quoi: string) {
  const entete = tableau.getByRole('columnheader', { name: 'Drapeaux' });
  const cellule = tableau.getByRole('row').filter({ hasText: 'Retard FDUR' }).locator('td').last();
  expect(await ombre(entete), `${quoi} : en-tête`).not.toBe('none');
  expect(await ombre(cellule), `${quoi} : cellule`).not.toBe('none');
  expect((await boite(cellule)).width, `${quoi} : largeur de la cellule`).toBeCloseTo(
    LARGEUR_DRAPEAUX,
    0,
  );
}

test('E2E-288-r1 : 1024 px, ombre portée sur l’en-tête et la cellule Drapeaux (Gantt du projet, Accueil), largeur inchangée', async ({
  page,
  request,
}) => {
  const m = await mondeRetard(request, 'E2E288');
  await verifierOmbre(await ouvrirGantt(page, m, 1024), 'Gantt');
  await verifierOmbre(await ouvrirAccueil(page, m, 'Projet E2E288', 1024), 'Accueil');
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

test('E2E-289-r1 : 1440 px, aucun en-tête de WBS à Avancement recouvert par Drapeaux ; la zone du tableau ne défile pas', async ({
  page,
  request,
}) => {
  const m = await monde3b(request, 'E2E289', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Pas avant 289', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await calculer(request, [m.projet.id]);
  const tableau = await ouvrirGantt(page, m, 1440);
  await expect(tableau.getByText('Pas avant une date').first()).toBeVisible();
  await separateurAuMaximum(page);
  const zone = tableau.locator('xpath=ancestor::div[@tabindex][1]');
  expect(await zone.evaluate((e) => e.scrollLeft)).toBe(0);
  const mesure = await zone.evaluate((e) => ({ s: e.scrollWidth, c: e.clientWidth }));
  expect(mesure.s, 'scrollWidth = clientWidth').toBe(mesure.c);
  const entetes = tableau.getByRole('columnheader');
  const n = await entetes.count();
  const drapeaux = await boite(entetes.nth(n - 1));
  for (let i = 0; i < n - 1; i++) {
    const b = await boite(entetes.nth(i));
    expect(b.x + b.width, `en-tête ${i}`).toBeLessThanOrEqual(drapeaux.x + 0.5);
  }
});

test('E2E-290-r1 : captures de REX-3b-r4 (sans assertion fonctionnelle)', async ({
  page,
  request,
}) => {
  const m = await mondeRetard(request, 'E2E290');
  for (const l of [1440, 1024]) {
    await ouvrirAccueil(page, m, 'Projet E2E290', l);
    await page.screenshot({ path: cheminCapture(`rex3b-r4-accueil-${l}.png`) });
  }
  for (const l of [1440, 1024]) {
    await ouvrirGantt(page, m, l);
    await page.screenshot({ path: cheminCapture(`rex3b-r4-gantt-${l}.png`) });
  }
});
