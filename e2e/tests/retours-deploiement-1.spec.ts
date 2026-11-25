// retours-deploiement-1 (D-227 (B) ; SPEC §6 « Colonnes et défilement (gantt-colonnes, D-212) », points 5 et 6) :
// E2E-623 à E2E-628. Colonnes par défaut des trois vues et mémorisation du choix après une navigation puis
// un retour. Rechargement et autre projet : déjà prouvés par E2E-546-r1, E2E-547-r2 et E2E-548-r1
// (gantt-colonnes-2.spec.ts), non dupliqués. Données créées par l'API.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, monde3b } from './lot3b-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';

const J06 = '2027-01-06T10:00:00';
const RETABLIR = "Rétablir l'affichage par défaut";

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime(J06);
});
test.afterEach(remettreAdminSeul6b);

type Vue = 'projet' | 'accueil' | 'ressource';
const VUES: Vue[] = ['projet', 'accueil', 'ressource'];
const LIBELLES: Record<Vue, string> = {
  projet: "Gantt d'un projet",
  accueil: "Gantt global de l'Accueil",
  ressource: "planning d'une ressource",
};
const REGIONS: Record<Vue, string> = {
  projet: 'Tableau du Gantt',
  accueil: 'Tableau du Gantt global',
  ressource: 'Tableau du planning de la ressource',
};
/** Colonnes par défaut, recopiées de D-227 (B). */
const DEFAUTS: Record<Vue, string[]> = {
  projet: ['WBS', 'Nom', 'Début', 'Fin', 'Ressources'],
  accueil: ['Code', 'Nom', 'Début', 'Fin', 'Ressources'],
  ressource: ['Projet', 'Activité', 'Début', 'Fin'],
};
/** Éléments du menu « Colonnes », dans l'ordre fixe (D-212 (4), D-216 (1), (7)). */
const MENUS: Record<Vue, string[]> = {
  projet: [
    'Planification',
    'Début',
    'Fin',
    'Ressources',
    'Charge',
    'Vendu',
    'Marge',
    'Avancement',
    'OTP',
    'Coût planifié',
    'Coût réel',
    'Drapeaux',
  ],
  accueil: [
    'Début',
    'Fin',
    'Ressources',
    'Charge',
    'Avancement',
    'Réel',
    'Vendu',
    'Marge',
    'OTP',
    'Coût planifié',
    'Coût réel',
    'Drapeaux',
  ],
  ressource: ['Début', 'Fin', 'Assigné', 'Réel', 'Reste', 'Drapeaux'],
};
const COCHEES: Record<Vue, string[]> = {
  projet: ['Début', 'Fin', 'Ressources'],
  accueil: ['Début', 'Fin', 'Ressources'],
  ressource: ['Début', 'Fin'],
};

const zoneTableau = (page: Page, v: Vue) =>
  page.getByRole('region', { name: REGIONS[v], exact: true });
const boutonColonnes = (page: Page) => page.getByRole('button', { name: 'Colonnes', exact: true });
const menu = (page: Page) => page.getByRole('menu');
const element = (page: Page, titre: string) =>
  menu(page).getByRole('menuitemcheckbox', { name: titre, exact: true });
const entetes = async (page: Page, v: Vue) =>
  (await zoneTableau(page, v).getByRole('columnheader').allTextContents()).map((t) => t.trim());

async function monde(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche 01');
  await m.api.assignation(a.id, m.gens.Alice!.id, 1);
  await calculer(request, [m.projet.id]);
  return m;
}
type Monde = Awaited<ReturnType<typeof monde>>;

const adresse = (m: Monde, v: Vue) =>
  v === 'projet'
    ? `/projets/${m.projet.id}?onglet=gantt&zoom=jour`
    : v === 'accueil'
      ? '/?zoom=jour'
      : `/?ressource=${m.gens.Alice!.id}&zoom=jour`;

async function attendre(page: Page, v: Vue) {
  const texte = v === 'ressource' ? '1 Tâche 01' : 'Tâche 01';
  await page.locator('svg[data-zoom]').waitFor();
  if (v === 'accueil') {
    await expect(page.getByRole('button', { name: /^Replier / }).first()).toBeVisible();
  }
  await expect(zoneTableau(page, v).getByText(texte, { exact: true }).first()).toBeVisible();
}

async function ouvrir(page: Page, m: Monde, v: Vue) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, m.emailChef);
  await page.goto(adresse(m, v));
  await attendre(page, v);
}

async function ouvrirMenu(page: Page) {
  await boutonColonnes(page).click();
  await expect(menu(page)).toBeVisible();
}
async function basculer(page: Page, titres: string[]) {
  await ouvrirMenu(page);
  for (const t of titres) await element(page, t).click();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
}

test('E2E-623-r2 : colonnes par défaut des trois vues, sans stockage ; autres colonnes décochées au menu', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E623');
  await page.setViewportSize({ width: 1440, height: 900 });
  await connecterAvec(page, m.emailChef);
  for (const v of VUES) {
    await page.goto(adresse(m, v));
    await attendre(page, v);
    expect(await entetes(page, v), LIBELLES[v]).toEqual(DEFAUTS[v]);
    await ouvrirMenu(page);
    const items = await menu(page).getByRole('menuitemcheckbox').allTextContents();
    expect(
      items.map((t) => t.trim()),
      `${LIBELLES[v]} : ordre du menu`,
    ).toEqual(MENUS[v]);
    for (const t of MENUS[v]) {
      await expect(element(page, t), `${LIBELLES[v]} : ${t}`).toHaveAttribute(
        'aria-checked',
        COCHEES[v].includes(t) ? 'true' : 'false',
      );
    }
    await page.keyboard.press('Escape');
    await expect(menu(page)).toHaveCount(0);
  }
});

test("E2E-624-r1 : colonne Drapeaux absente par défaut, puis cochée par le menu (Gantt d'un projet)", async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E624');
  await ouvrir(page, m, 'projet');
  await expect(
    zoneTableau(page, 'projet').getByRole('columnheader', { name: 'Drapeaux' }),
  ).toHaveCount(0);
  await basculer(page, ['Drapeaux']);
  expect(await entetes(page, 'projet')).toEqual([...DEFAUTS.projet, 'Drapeaux']);
});

test("E2E-625-r1 : « Rétablir l'affichage par défaut » donne les nouveaux défauts (Gantt d'un projet)", async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E625');
  await ouvrir(page, m, 'projet');
  await basculer(page, ['Drapeaux', 'Charge', 'Début']);
  expect(await entetes(page, 'projet')).toEqual([
    'WBS',
    'Nom',
    'Fin',
    'Ressources',
    'Charge',
    'Drapeaux',
  ]);
  await ouvrirMenu(page);
  await menu(page).getByRole('menuitem', { name: RETABLIR, exact: true }).click();
  await expect.poll(() => entetes(page, 'projet')).toEqual(DEFAUTS.projet);
});

const CHOIX: Record<Vue, { basculer: string[]; attendu: string[] }> = {
  projet: {
    basculer: ['Début', 'Charge', 'Drapeaux'],
    attendu: ['WBS', 'Nom', 'Fin', 'Ressources', 'Charge', 'Drapeaux'],
  },
  accueil: {
    basculer: ['Fin', 'Avancement'],
    attendu: ['Code', 'Nom', 'Début', 'Ressources', 'Avancement'],
  },
  ressource: { basculer: ['Début', 'Reste'], attendu: ['Projet', 'Activité', 'Fin', 'Reste'] },
};
const NUMEROS: Record<Vue, string> = {
  projet: 'E2E-626-r1',
  accueil: 'E2E-627-r1',
  ressource: 'E2E-628',
};

for (const v of VUES) {
  test(`${NUMEROS[v]} : ${LIBELLES[v]} : choix de colonnes retrouvé après navigation vers un autre écran puis retour`, async ({
    page,
    request,
  }) => {
    const m = await monde(request, NUMEROS[v].replace('-', ''));
    await ouvrir(page, m, v);
    await basculer(page, CHOIX[v].basculer);
    expect(await entetes(page, v)).toEqual(CHOIX[v].attendu);

    // Navigation : écran Projets par la barre latérale, puis retour par l'historique du navigateur.
    await page.getByRole('link', { name: 'Projets' }).first().click();
    await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible();
    await page.goBack();
    await attendre(page, v);
    expect(await entetes(page, v)).toEqual(CHOIX[v].attendu);

    // Retour par l'adresse (nouvelle navigation dans l'application, sans historique).
    await page.getByRole('link', { name: 'Projets' }).first().click();
    await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible();
    await page.goto(adresse(m, v));
    await attendre(page, v);
    expect(await entetes(page, v)).toEqual(CHOIX[v].attendu);
  });
}
