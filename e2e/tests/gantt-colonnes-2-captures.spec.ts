// Captures de gantt-colonnes, tranche 2 (D-212 (6)), sans assertion : E2E-557. Menu « Colonnes » ouvert sur les
// trois vues (1440 px) ; toutes les colonnes affichées (1440 et 1024 px) ; poignée de la colonne Nom survolée,
// glissée et focalisée. Révision E2E-557-r1 (D-031) : planning d'Alice attendu sur sa propre tâche.
import { expect, test, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { activiteAvec, calculer, monde3b } from './lot3b-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';
import { cheminCapture } from './captures.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul6b();
  await page.clock.setFixedTime('2027-01-06T10:00:00');
});
test.afterEach(remettreAdminSeul6b);

const VUES = ['projet', 'accueil', 'ressource'] as const;
type Vue = (typeof VUES)[number];

async function attendre(page: Page, vue: Vue) {
  await page.locator('svg[data-zoom]').waitFor();
  if (vue === 'accueil') {
    await expect(page.getByRole('button', { name: /^Replier / }).first()).toBeVisible(); // D-218 (4), (9)
    await page.getByText('Tâche B', { exact: true }).first().waitFor();
  }
  if (vue === 'ressource') await page.getByText('1 Tâche 01', { exact: true }).waitFor();
}

async function cocherTout(page: Page) {
  await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
  const items = page.getByRole('menu').getByRole('menuitemcheckbox');
  for (let i = 0; i < (await items.count()); i++) {
    if ((await items.nth(i).getAttribute('aria-checked')) === 'false') await items.nth(i).click();
  }
  await page.keyboard.press('Escape');
}

test('E2E-557-r2 : captures du menu « Colonnes », de toutes les colonnes et des poignées', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const m = await monde3b(request, 'E2E557', ['Alice', 'Bob']);
  const p = m.projet.id;
  for (let i = 1; i <= 12; i++) {
    const a = await activiteAvec(request, p, `Tâche ${String(i).padStart(2, '0')}`, {
      charge_vendue: i % 3 === 0 ? 0.5 : 2,
    });
    await m.api.assignation(a.id, m.gens.Alice!.id, 1);
  }
  const b = await activiteAvec(request, p, 'Tâche B', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(b.id, m.gens.Bob!.id, 5);
  await calculer(request, [p]);
  await connecterAvec(page, m.emailChef);

  const adresses: Record<Vue, string> = {
    projet: `/projets/${p}?onglet=gantt&zoom=jour`,
    accueil: '/?zoom=jour',
    ressource: `/?ressource=${m.gens.Alice!.id}&zoom=jour`,
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const vue of VUES) {
    await page.goto(adresses[vue]);
    await attendre(page, vue);
    await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
    await page.getByRole('menu').waitFor();
    await page.screenshot({ path: cheminCapture(`gantt-colonnes-2-menu-${vue}.png`) });
    await page.keyboard.press('Escape');
  }
  for (const largeur of [1440, 1024]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const vue of VUES) {
      await page.goto(adresses[vue]);
      await attendre(page, vue);
      await cocherTout(page);
      await page.screenshot({
        path: cheminCapture(`gantt-colonnes-2-toutes-${vue}-${largeur}.png`),
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(adresses.projet);
  await attendre(page, 'projet');
  const poignee = page.getByRole('separator', { name: 'Largeur de la colonne Nom', exact: true });
  const boite = (await poignee.boundingBox())!;
  const x = boite.x + boite.width / 2;
  const y = boite.y + boite.height / 2;
  await page.mouse.move(x, y);
  await page.screenshot({ path: cheminCapture('gantt-colonnes-2-poignee-survol.png') });
  await page.mouse.down();
  await page.mouse.move(x + 32, y);
  await page.screenshot({ path: cheminCapture('gantt-colonnes-2-poignee-glisser.png') });
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await poignee.focus();
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: cheminCapture('gantt-colonnes-2-poignee-focus.png') });
  // Remise aux défauts : le stockage du navigateur est propre au contexte du test.
  await page.getByRole('button', { name: 'Colonnes', exact: true }).click();
  await page
    .getByRole('menu')
    .getByRole('menuitem', { name: "Rétablir l'affichage par défaut", exact: true })
    .click();
});
