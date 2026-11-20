// 4b-corr (D-134) : E2E-291 à E2E-296 (mise en page, erreurs de case, badge « Brouillon »), E2E-297
// (captures, sans assertion fonctionnelle). Monde et horloge de lot4b.spec.ts.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { cheminCapture } from './captures.js';
import {
  EMAIL_ALICE,
  H14,
  S,
  adresseFeuille,
  bouton,
  caseCharge,
  ligneFeuille,
  monde4b,
  remettreAdminSeul4b,
  statutFeuille,
  tableauFeuille,
} from './lot4b-helpers.js';

const A = '1 Tâche A';
const MAR = 'mar. 13/01';
const CHARGE_INVALIDE = 'Saisir un nombre de jours entre 0 et 10, avec 2 décimales au plus.';
const FOND_NEUTRE = 'rgb(243, 244, 246)';
const FLAG = 'rgb(190, 18, 60)';

test.beforeEach(remettreAdminSeul4b);
test.afterEach(remettreAdminSeul4b);

const boite = async (l: Locator) => {
  const b = await l.boundingBox();
  if (!b) throw new Error('élément sans boîte');
  return b;
};

async function ouvrir(page: Page, largeur: number) {
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: largeur, height: 700 });
  await connecterAvec(page, EMAIL_ALICE);
  await page.goto(adresseFeuille(S));
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();
  await expect(tableauFeuille(page)).toBeVisible();
}

/** Même ligne : centres verticaux à 4 px près (la hauteur des éléments diffère : badge, bouton, texte). */
async function memeLigne(elements: Locator[]) {
  const centres: number[] = [];
  for (const e of elements) {
    const b = await boite(e);
    centres.push(b.y + b.height / 2);
  }
  expect(Math.max(...centres) - Math.min(...centres), centres.join(', ')).toBeLessThanOrEqual(4);
}

const conteneur = (page: Page) => tableauFeuille(page).locator('xpath=..');
const entetesJours = (page: Page) => tableauFeuille(page).locator('th[data-jour]');

test('E2E-291 : 1024 px : le tableau entier tient sans défilement horizontal', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await ouvrir(page, 1024);
  const dims = await conteneur(page).evaluate((e) => ({ s: e.scrollWidth, c: e.clientWidth }));
  expect(dims.s, `scrollWidth ${dims.s}, clientWidth ${dims.c}`).toBe(dims.c);
  const cadre = await boite(conteneur(page));
  for (const th of [
    tableauFeuille(page).getByRole('columnheader', { name: 'Reste à faire' }),
    page.locator('th[data-jour="2026-01-18"]'),
  ]) {
    const b = await boite(th);
    expect(b.x).toBeGreaterThanOrEqual(cadre.x - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(cadre.x + cadre.width + 1);
  }
});

for (const largeur of [1440, 1024]) {
  test(`E2E-292 : ${largeur} px : les sept colonnes de jour ont la même largeur (± 1 px)`, async ({
    page,
    request,
  }) => {
    await monde4b(request);
    await ouvrir(page, largeur);
    const ths = entetesJours(page);
    await expect(ths).toHaveCount(7);
    const largeurs: number[] = [];
    for (let i = 0; i < 7; i++) largeurs.push((await boite(ths.nth(i))).width);
    expect(Math.max(...largeurs) - Math.min(...largeurs), largeurs.join(', ')).toBeLessThanOrEqual(
      1,
    );
  });
}

test('E2E-293 : 1440 px : navigation, semaine, statut et actions sur une même ligne', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await ouvrir(page, 1440);
  const elements = [
    bouton(page, 'Semaine précédente'),
    bouton(page, 'Cette semaine'),
    bouton(page, 'Semaine suivante'),
    page.getByText('Semaine du 12/01/2026 au 18/01/2026', { exact: true }),
    statutFeuille(page),
    bouton(page, 'Enregistrer'),
    bouton(page, 'Soumettre'),
  ];
  await memeLigne(elements);
});

test('E2E-294 : 1024 px : statut et actions sur une même ligne', async ({ page, request }) => {
  await monde4b(request);
  await ouvrir(page, 1024);
  await memeLigne([statutFeuille(page), bouton(page, 'Enregistrer'), bouton(page, 'Soumettre')]);
  // Groupe : le plus proche ancêtre commun du statut et des actions ne contient pas la navigation.
  const groupe = await statutFeuille(page).evaluate((st) => {
    const actions = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Enregistrer',
    )!;
    let a: Element | null = st;
    while (a && !a.contains(actions)) a = a.parentElement;
    const nav = [...document.querySelectorAll('button')].some(
      (b) => b.textContent?.includes('Semaine précédente') && a!.contains(b),
    );
    return { nowrap: a ? getComputedStyle(a).flexWrap : null, nav };
  });
  expect(groupe).toEqual({ nowrap: 'nowrap', nav: false });
});

test('E2E-295 : valeur invalide : message sous le tableau, ligne de hauteur inchangée, aria-errormessage', async ({
  page,
  request,
}) => {
  const m = await monde4b(request);
  await ouvrir(page, 1440);
  const c = caseCharge(page, A, MAR);
  const avant = await boite(ligneFeuille(page, m.sa.id));
  const bordureAvant = await c.evaluate((e) => getComputedStyle(e).borderTopColor);
  await c.fill('abc');
  await expect(c).toHaveAttribute('aria-invalid', 'true');
  expect((await boite(ligneFeuille(page, m.sa.id))).height).toBeCloseTo(avant.height, 0);
  await expect(c).toHaveCSS('border-top-color', FLAG);

  const id = await c.getAttribute('aria-errormessage');
  expect(id, 'aria-errormessage').toBeTruthy();
  const ligne = page.locator(`[id="${id}"]`);
  await expect(ligne).toHaveCount(1);
  await expect(ligne).toHaveText(`mar. 13/01 · ${A} : ${CHARGE_INVALIDE}`);
  await expect(tableauFeuille(page).getByText(CHARGE_INVALIDE)).toHaveCount(0);
  const tableau = await boite(conteneur(page));
  expect((await boite(ligne)).y).toBeGreaterThanOrEqual(tableau.y + tableau.height);

  await c.fill('0,25');
  await expect(page.getByText(CHARGE_INVALIDE)).toHaveCount(0);
  await expect(c).not.toHaveAttribute('aria-errormessage', /.+/);
  await expect(c).toHaveCSS('border-top-color', bordureAvant);
});

test('E2E-296 : badge « Brouillon » : contraste ≥ 4,5:1 et fond distinct du badge neutre', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await ouvrir(page, 1440);
  const badge = statutFeuille(page).locator('span');
  await expect(badge).toHaveText('Brouillon');
  const { couleur, fond } = await badge.evaluate((e) => {
    const s = getComputedStyle(e);
    return { couleur: s.color, fond: s.backgroundColor };
  });
  const rgb = (t: string) => (t.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
  const lum = (t: string) => {
    const [r, g, b] = rgb(t).map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [a, b] = [lum(couleur), lum(fond)];
  const contraste = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  expect(contraste, `${couleur} sur ${fond}`).toBeGreaterThanOrEqual(4.5);
  expect(fond).not.toBe(FOND_NEUTRE);
});

test('E2E-297 : captures de la feuille de temps après correction (sans assertion fonctionnelle)', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await ouvrir(page, 1440);
  const photographier = async (nom: string) => {
    for (const largeur of [1440, 1024]) {
      await page.setViewportSize({ width: largeur, height: 700 });
      await page.screenshot({ path: cheminCapture(`feuille-temps-corr-${nom}-${largeur}.png`) });
    }
  };
  await photographier('brouillon');
  await caseCharge(page, A, MAR).fill('abc');
  await photographier('invalide');
});

test('E2E-298 : liste des erreurs de case : région aria-live polite présente dès l’affichage', async ({
  page,
  request,
}) => {
  await monde4b(request);
  await ouvrir(page, 1440);
  const region = page.locator('main [aria-live="polite"]');
  await expect(region).toHaveCount(1);
  await expect(region).toBeEmpty();
  const c = caseCharge(page, A, MAR);
  await c.fill('abc');
  await expect(region).toHaveCount(1);
  await expect(region).toContainText(`mar. 13/01 · ${A} : ${CHARGE_INVALIDE}`);
  await c.fill('0,25');
  await expect(region).toHaveCount(1);
  await expect(region).toBeEmpty();
});
