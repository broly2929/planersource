import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { colonnesCompletes } from './colonnes-completes.js';
import { activiteAvec, calculer, jalonAvec, monde3b, sousProjet } from './lot3b-helpers.js';

/*
 * Focus des zones à défilement du Gantt (règle 12, D-070, SPEC §6 Affichage 12). Ordre de tabulation :
 * boutons de zoom, zone du tableau, liens de sous-projets, zone du SVG ; barres et jalons non focalisables.
 * Montage : une activité assignée, un jalon, un sous-projet (donc un lien de sous-projet dans le tableau).
 */
const J06 = '2027-01-06T10:00:00';
const LARGEURS = [1440, 1024];

async function montage(request: APIRequestContext, suffixe: string) {
  const m = await monde3b(request, suffixe, ['Alice', 'Carole']);
  const p = m.projet.id;
  const a = await activiteAvec(request, p, 'Activité A');
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await jalonAvec(request, p, 'Jalon J', { type: 'fixe', date_validee: '2027-01-08' });
  const sp = await sousProjet(request, p, `SP-${suffixe}`, `Sous-projet ${suffixe}`, m.chef.id);
  await m.api.affectation(sp.id, m.gens.Carole!.id);
  const c = await activiteAvec(request, sp.id, 'Activité C');
  await m.api.assignation(c.id, m.gens.Carole!.id, 2);
  await calculer(request, [p, sp.id]);
  return { ...m, sp };
}

async function ouvrir(
  page: Page,
  request: APIRequestContext,
  suffixe: string,
  largeur: number,
  zoom: string,
) {
  const m = await montage(request, suffixe);
  await page.setViewportSize({ width: largeur, height: 800 });
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);
  await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=${zoom}`);
  await page.locator('svg[data-zoom]').waitFor();
  return m;
}

for (const largeur of LARGEURS) {
  test(`E2E-43-r9 (${largeur} px) : zones à défilement en région focalisable, ordre de tabulation, barres et jalons hors tabulation`, async ({
    page,
    request,
  }) => {
    await colonnesCompletes(page);
    const m = await ouvrir(page, request, `E2E43-${largeur}`, largeur, 'semaine');
    const tableau = page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
    const calendrier = page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
    await expect(tableau).toHaveCount(1);
    await expect(calendrier).toHaveCount(1);
    await expect(tableau).toHaveAttribute('tabindex', '0');
    await expect(calendrier).toHaveAttribute('tabindex', '0');
    // Chaque zone contient bien son contenu.
    await expect(tableau.getByRole('table', { name: 'Éléments du projet' })).toHaveCount(1);
    await expect(calendrier.locator('svg[data-zoom]')).toHaveCount(1);

    // Aucune barre ni aucun jalon n'est focalisable.
    await expect(page.locator('svg [data-element-id][tabindex]')).toHaveCount(0);
    await expect(page.locator('svg [data-projet-id][tabindex]')).toHaveCount(0);

    const horsBarre = () =>
      page.evaluate(
        () =>
          document.activeElement?.closest('svg [data-element-id], svg [data-projet-id]') === null,
      );

    // Révision -r2 (D-031, D-101 (8)) : la case « Recalcul automatique » suit « Calculer » dans l'ordre de focus.
    const calculer = page.getByRole('button', { name: 'Calculer', exact: true });
    await calculer.focus();
    await expect(calculer).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true }),
    ).toBeFocused();
    expect(await horsBarre()).toBe(true);

    // Tab depuis le dernier bouton de zoom : case « Initiales », tableau, lien du sous-projet, calendrier.
    const dernierZoom = page.getByRole('group', { name: 'Zoom' }).getByRole('button').last();
    await dernierZoom.focus();
    await expect(dernierZoom).toBeFocused();
    // Révision -r1 (D-031, D-091) : la case « Initiales » s'insère après « Mois ».
    await page.keyboard.press('Tab');
    await expect(page.getByRole('checkbox', { name: 'Initiales', exact: true })).toBeFocused();
    expect(await horsBarre()).toBe(true);
    // Révision -r7 (D-216 (3)) : le bouton « Colonnes » s'insère après « Initiales ».
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Colonnes', exact: true })).toBeFocused();
    // Révision -r3 (D-031, D-111 (6)) : le bouton « Copier » s'insère après « Initiales ».
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Copier', exact: true })).toBeFocused();
    expect(await horsBarre()).toBe(true);
    await page.keyboard.press('Tab');
    await expect(tableau).toBeFocused();
    expect(await horsBarre()).toBe(true);
    // Révision -r7 (D-216 (3)) : poignées de largeur, dans l'ordre des en-têtes, avant le contenu des lignes.
    for (const titre of [
      'WBS',
      'Nom',
      'Planification',
      'Début',
      'Fin',
      'Ressources',
      'Charge',
      'Vendu',
      'Marge',
      'Avancement',
      'Drapeaux',
    ]) {
      await page.keyboard.press('Tab');
      await expect(
        tableau.getByRole('separator', { name: `Largeur de la colonne ${titre}`, exact: true }),
      ).toBeFocused();
    }
    // Révision -r5 (D-031, D-127 (6), (7)) : les boutons-noms des éléments, en ordre WBS, puis le lien et
    // le crayon du sous-projet.
    // Révision -r9 (D-031, D-238 (6)) : le bouton d'assignation de la colonne Ressources suit le nom de sa ligne.
    for (const nom of ['Activité A', /^Modifier l'assignation de .* à Activité A$/, 'Jalon J']) {
      await page.keyboard.press('Tab');
      await expect(
        tableau.getByRole(
          'button',
          typeof nom === 'string' ? { name: nom, exact: true } : { name: nom },
        ),
      ).toBeFocused();
      expect(await horsBarre()).toBe(true);
    }
    await page.keyboard.press('Tab');
    await expect(
      // Révision -r4 (D-031, D-123 (7)) : nom du lien « <code> · <nom> ».
      tableau.getByRole('link', {
        name: `SP-E2E43-${largeur} · Sous-projet E2E43-${largeur}`,
        exact: true,
      }),
    ).toBeFocused();
    expect(await horsBarre()).toBe(true);
    await page.keyboard.press('Tab');
    await expect(
      tableau.getByRole('button', {
        name: `Modifier le projet Sous-projet E2E43-${largeur}`,
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    // Révision D-213 : le séparateur « Largeur du tableau » précède la zone du calendrier.
    await expect(
      page.getByRole('separator', { name: 'Largeur du tableau', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(calendrier).toBeFocused();
    expect(await horsBarre()).toBe(true);
    expect(m.sp.id).toBeGreaterThan(0);
  });
}

test('E2E-44 (1024 px, zoom jour) : ArrowRight puis ArrowLeft font défiler la zone du SVG focalisée', async ({
  page,
  request,
}) => {
  await ouvrir(page, request, 'E2E44', 1024, 'jour');
  const calendrier = page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
  await expect(calendrier).toHaveCount(1);
  // Précondition du montage : la zone a quelque chose à faire défiler.
  const mesure = await calendrier.evaluate((e) => ({
    scroll: e.scrollWidth,
    client: e.clientWidth,
  }));
  expect(mesure.scroll, 'la zone du SVG doit déborder à 1024 px, zoom jour').toBeGreaterThan(
    mesure.client,
  );

  await calendrier.focus();
  await expect(calendrier).toBeFocused();
  expect(await calendrier.evaluate((e) => e.scrollLeft)).toBe(0);
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => calendrier.evaluate((e) => e.scrollLeft), {
      message: 'scrollLeft après ArrowRight',
    })
    .toBeGreaterThan(0);
  await page.keyboard.press('ArrowLeft');
  await expect
    .poll(() => calendrier.evaluate((e) => e.scrollLeft), { message: 'scrollLeft après ArrowLeft' })
    .toBe(0);
});
