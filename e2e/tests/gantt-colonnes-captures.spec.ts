// Captures de gantt-colonnes, tranche 1 (D-212 (6)), sans assertion : E2E-538. Trois vues à deux zones, 1440 et
// 1024 px de large, 900 px de haut, 61 lignes, zones défilées à mi-hauteur ; séparateur focalisé.
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

const REGIONS = {
  projet: 'Calendrier du Gantt',
  accueil: 'Calendrier du Gantt global',
  ressource: 'Calendrier du planning de la ressource',
} as const;

async function defilerAMiHauteur(page: Page, region: string) {
  await page.getByRole('region', { name: region, exact: true }).evaluate((e) => {
    e.scrollTop = (e.scrollHeight - e.clientHeight) / 2;
  });
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

test('E2E-538-r1 : captures des trois vues (1440 et 1024 px) et du séparateur focalisé', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const m = await monde3b(request, 'E2E538', ['Alice', 'Bob']);
  const p = m.projet.id;
  for (let i = 1; i <= 60; i++) {
    const a = await activiteAvec(request, p, `Tâche ${String(i).padStart(2, '0')}`);
    await m.api.assignation(a.id, m.gens.Alice!.id, 1);
  }
  const b = await activiteAvec(request, p, 'Tâche B', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(b.id, m.gens.Bob!.id, 5);
  await calculer(request, [p]);
  await connecterAvec(page, m.emailChef);

  const adresses = {
    projet: `/projets/${p}?onglet=gantt&zoom=jour`,
    accueil: '/?zoom=jour',
    ressource: `/?ressource=${m.gens.Alice!.id}&zoom=jour`,
  } as const;
  for (const largeur of [1440, 1024]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const vue of ['projet', 'accueil', 'ressource'] as const) {
      await page.goto(adresses[vue]);
      await page.locator('svg[data-zoom]').waitFor();
      if (vue === 'accueil') {
        await expect(page.getByRole('button', { name: /^Replier / }).first()).toBeVisible(); // D-218 (4), (9)
        await page.getByText('Tâche B', { exact: true }).first().waitFor();
      }
      await defilerAMiHauteur(page, REGIONS[vue]);
      await page.screenshot({ path: cheminCapture(`gantt-colonnes-${vue}-${largeur}.png`) });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(adresses.projet);
  await page.locator('svg[data-zoom]').waitFor();
  const sep = page.getByRole('separator', { name: 'Largeur du tableau', exact: true });
  // Survol, puis glisser, puis focus par le clavier (l'anneau n'apparaît qu'à la navigation au clavier).
  const boite = (await sep.boundingBox())!;
  const x = boite.x + boite.width / 2;
  const y = boite.y + boite.height / 2;
  await page.mouse.move(x, y);
  await page.screenshot({ path: cheminCapture('gantt-colonnes-separateur-survol.png') });
  await page.mouse.down();
  await page.mouse.move(x + 24, y);
  await page.screenshot({ path: cheminCapture('gantt-colonnes-separateur-glisser.png') });
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await sep.focus();
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: cheminCapture('gantt-colonnes-separateur-focus.png') });
});
