// Captures du lot 3f-1 (D-108), sans assertion de comparaison : e2e/captures/gantt-glisser-{1440,1024}.png
// (tableau pendant un glisser, zone « dans »), gantt-glisser-avant-*.png (trait d'insertion) et
// deplacer-dialogue-*.png (dialogue « Déplacer »). Monde « arbo » recopié de lot3f1.spec.ts.
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
const ligneDe = (page: Page, nom: string) =>
  tableau(page)
    .locator('tbody tr')
    .filter({ has: page.getByText(nom, { exact: true }) });

async function centre(cible: Locator) {
  const b = (await cible.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function mondeArbo(request: APIRequestContext) {
  const m = await monde3b(request, 'CAPF', ['Alice']);
  const { api, projet, chef, gens } = m;
  const p = await activiteAvec(request, projet.id, 'Phase P');
  await activiteAvec(request, projet.id, 'Sous P1', { parent_id: p.id });
  await activiteAvec(request, projet.id, 'Sous P2', { parent_id: p.id });
  const q = await activiteAvec(request, projet.id, 'Tâche Q', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await api.assignation(q.id, gens.Alice!.id, 3);
  await activiteAvec(request, projet.id, 'Tâche R');
  await jalonAvec(request, projet.id, 'Jalon J', { type: 'fixe', date_validee: '2027-01-25' });
  await sousProjet(request, projet.id, 'S-CAPF', 'Sous-projet arbo', chef.id);
  await calculer(request, [projet.id]);
  return m;
}

test('captures du lot 3f-1 : glisser (dans, avant) et dialogue « Déplacer »', async ({
  page,
  request,
}) => {
  const m = await mondeArbo(request);
  await page.clock.setFixedTime(J06);
  await connecterAvec(page, m.emailChef);

  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto(`/projets/${m.projet.id}?onglet=gantt&zoom=jour`);
    await page.locator('svg[data-zoom]').waitFor();
    const poignee = ligneDe(page, 'Tâche R').locator('[data-poignee-ligne]');
    await expect(poignee).toHaveCount(1);
    for (const [nom, fy] of [
      ['glisser', 0.5],
      ['glisser-avant', 0.15],
    ] as const) {
      const d = await centre(poignee);
      await page.mouse.move(d.x, d.y);
      await page.mouse.down();
      const b = (await ligneDe(page, 'Phase P').boundingBox())!;
      await page.mouse.move(b.x + 40, b.y + fy * b.height, { steps: 12 });
      await expect(page.locator('[data-insertion-ligne]')).toHaveCount(1);
      await page.screenshot({ path: cheminCapture(`gantt-${nom}-${largeur}.png`) });
      await page.keyboard.press('Escape');
      await page.mouse.up();
    }
    await page.getByRole('tab', { name: 'Planning' }).click();
    await page.getByRole('button', { name: 'Déplacer Tâche R', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.screenshot({ path: cheminCapture(`deplacer-dialogue-${largeur}.png`) });
    await page.keyboard.press('Escape');
  }
});
