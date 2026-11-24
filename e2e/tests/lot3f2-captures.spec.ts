// Captures du lot 3f-2 (E2E-209, séance UX), sans assertion de comparaison : e2e/captures/menu-gantt-{tableau,svg}-*.png
// et ux-*.png (poignées, contour, anneau, recalcul automatique, connecteur, glisser de ligne, « Copier »).
// Monde « arbo » de lot3f1.spec.ts, horloge au 06/01/2027, zoom jour.
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, monde3b, sousProjet } from './lot3b-helpers.js';
import { remettreAdminSeul } from './lot3c-helpers.js';
import { cheminCapture } from './captures.js';

const J06 = '2027-01-06T10:00:00';
const LARGEURS = [1440, 1024];

test.beforeEach(remettreAdminSeul);
test.afterEach(remettreAdminSeul);

const tableau = (page: Page) => page.getByRole('region', { name: 'Tableau du Gantt', exact: true });
const calendrier = (page: Page) =>
  page.getByRole('region', { name: 'Calendrier du Gantt', exact: true });
const ligneDe = (page: Page, nom: string) =>
  tableau(page)
    .locator('tbody tr')
    .filter({ has: page.getByText(nom, { exact: true }) });
const barre = (page: Page, id: number) => page.locator(`svg [data-element-id="${id}"]`);

async function centre(cible: Locator) {
  const b = (await cible.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function mondeArbo(request: APIRequestContext) {
  const m = await monde3b(request, 'CAPG', ['Alice', 'Bob']);
  const { api, projet, chef, gens } = m;
  const p = await activiteAvec(request, projet.id, 'Phase P');
  await activiteAvec(request, projet.id, 'Sous P1', { parent_id: p.id });
  await activiteAvec(request, projet.id, 'Sous P2', { parent_id: p.id });
  const q = await activiteAvec(request, projet.id, 'Tâche Q', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await api.assignation(q.id, gens.Alice!.id, 3);
  const r = await activiteAvec(request, projet.id, 'Tâche R');
  await jalonAvec(request, projet.id, 'Jalon J', { type: 'fixe', date_validee: '2027-01-25' });
  const f = await activiteAvec(request, projet.id, 'Tâche FDUR', {
    mode: 'FDUR',
    debut_valide: '2027-01-18',
    duree_validee: 5,
  });
  await api.assignation(f.id, gens.Alice!.id, 5);
  const g = await activiteAvec(request, projet.id, 'Tâche G', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await api.assignation(g.id, gens.Bob!.id, 4);
  await sousProjet(request, projet.id, 'S-CAPG', 'Sous-projet arbo', chef.id);
  await calculer(request, [projet.id]);
  return { ...m, q, r, f, g };
}

async function glisserVers(page: Page, depart: Locator, cible: Locator, fy: number, nom: string) {
  const d = await centre(depart);
  await page.mouse.move(d.x, d.y);
  await page.mouse.down();
  const b = (await cible.boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + fy * b.height, { steps: 12 });
  await expect(page.locator('[data-insertion-ligne]')).toHaveCount(1);
  await page.screenshot({ path: cheminCapture(nom) });
  await page.keyboard.press('Escape');
  await page.mouse.up();
}

test('E2E-209-r2 captures du lot 3f-2 : menu contextuel et captures pour la séance UX', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request);
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);

  for (const l of LARGEURS) {
    await page.setViewportSize({ width: l, height: 800 });
    await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=jour`);
    await page.locator('svg[data-zoom]').waitFor();

    // Menu sur une ligne du tableau, puis sur une barre du SVG.
    await ligneDe(page, 'Phase P').click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.screenshot({ path: cheminCapture(`menu-gantt-tableau-${l}.png`) });
    await page.keyboard.press('Escape');
    await barre(page, m.q.id).click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await page.screenshot({ path: cheminCapture(`menu-gantt-svg-${l}.png`) });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);

    // Barre d'outils avec « Copier » et la case « Recalcul automatique » cochée.
    const caseAuto = page.getByRole('checkbox', { name: 'Recalcul automatique', exact: true });
    await caseAuto.check();
    const copier = page.getByRole('button', { name: 'Copier', exact: true });
    // Focus clavier (Tab) pour que le contour de focus visible apparaisse.
    await page.getByRole('checkbox', { name: 'Initiales', exact: true }).focus();
    // Révision -r2 (D-216 (3)) : le bouton « Colonnes » s'insère entre « Initiales » et « Copier ».
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(copier).toBeFocused();
    await page.screenshot({
      path: cheminCapture(`ux-barre-outils-copier-${l}.png`),
      clip: { x: 0, y: 0, width: l, height: 260 },
    });
    await page.screenshot({ path: cheminCapture(`ux-recalcul-automatique-coche-${l}.png`) });
    await caseAuto.uncheck();

    // Poignées d'une barre FDUR (survol de la poignée droite), zoom jour.
    await barre(page, m.f.id).scrollIntoViewIfNeeded();
    const poignee = page.locator(`svg [data-poignee="droite"][data-poignee-element="${m.f.id}"]`);
    const zone = (await calendrier(page).boundingBox())!;
    const bp = (await poignee.boundingBox())!;
    const decalage = bp.x + bp.width - (zone.x + zone.width) + 60;
    if (decalage > 0) await calendrier(page).evaluate((el, d) => el.scrollBy(d, 0), decalage);
    const p = await centre(poignee);
    await page.mouse.move(p.x, p.y);
    await calendrier(page).screenshot({ path: cheminCapture(`ux-poignees-barre-fdur-${l}.png`) });

    // Anneau de la barre active et connecteur de lien.
    await barre(page, m.q.id).click();
    await page.mouse.move(0, 0);
    await calendrier(page).screenshot({ path: cheminCapture(`ux-anneau-barre-active-${l}.png`) });
    const connecteur = page.locator(`svg [data-connecteur-element="${m.q.id}"]`);
    await expect(connecteur).toHaveCount(1);
    await connecteur.hover();
    await calendrier(page).screenshot({
      path: cheminCapture(`ux-connecteur-lien-visible-${l}.png`),
    });
    await page.keyboard.press('Escape');

    // Poignée de ligne et indicateurs d'insertion pendant un glisser (dans, avant, après).
    const poigneeLigne = ligneDe(page, 'Tâche R').locator('[data-poignee-ligne]');
    await ligneDe(page, 'Tâche R').hover();
    await page.screenshot({ path: cheminCapture(`ux-poignee-ligne-survol-${l}.png`) });
    // Révision -r5 (D-212 (7)) : le survol de la ligne, plus large que le tableau à sa largeur par défaut, a
    // fait défiler la zone du tableau ; elle revient à gauche, où sont les poignées.
    await tableau(page).evaluate((e) => {
      e.scrollLeft = 0;
    });
    await glisserVers(
      page,
      poigneeLigne,
      ligneDe(page, 'Phase P'),
      0.5,
      `ux-glisser-dans-${l}.png`,
    );
    await glisserVers(
      page,
      poigneeLigne,
      ligneDe(page, 'Phase P'),
      0.15,
      `ux-glisser-avant-${l}.png`,
    );
    await glisserVers(
      page,
      poigneeLigne,
      ligneDe(page, 'Phase P'),
      0.85,
      `ux-glisser-apres-${l}.png`,
    );

    // Contour pointillé après un geste (case « Recalcul automatique » décochée).
    const bg = barre(page, m.g.id);
    await bg.scrollIntoViewIfNeeded();
    const c = await centre(bg);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 72, c.y, { steps: 12 });
    await page.mouse.up();
    await expect(page.locator('svg [data-contour-element]')).toHaveCount(1);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: cheminCapture(`ux-contour-pointille-geste-${l}.png`) });
  }
});
