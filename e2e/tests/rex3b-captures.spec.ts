// Captures de REX-3b (E2E-278, relecture d'apparence), sans assertion fonctionnelle : e2e/captures/
// rex3b-{gantt,accueil}-{1440,1024}.png.
import { expect, test, type Page } from '@playwright/test';
import { connecterAvec } from './lot1-helpers.js';
import { cheminCapture } from './captures.js';
import { activiteAvec, calculer, jalonAvec, monde3b, sousProjet } from './lot3b-helpers.js';

const LARGEURS = [1440, 1024];

// Champs de date au format français, comme E2E-255.
test.use({
  locale: 'fr-FR',
  launchOptions: {
    args: ['--lang=fr-FR'],
    env: { ...process.env, LANG: 'fr_FR.UTF-8', LANGUAGE: 'fr' },
  },
});

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({ path: cheminCapture(`rex3b-${nom}-${largeur}.png`) });
  }
}

test('E2E-278 : captures de REX-3b (sans assertion fonctionnelle)', async ({ page, request }) => {
  const m = await monde3b(request, 'E2E278', ['Alice']);
  const a = await activiteAvec(request, m.projet.id, 'Tâche 278', {
    mode: 'START',
    debut_valide: '2027-01-11',
  });
  await m.api.assignation(a.id, m.gens.Alice!.id, 3);
  await activiteAvec(request, m.projet.id, 'Bravo 278');
  await jalonAvec(request, m.projet.id, 'Jalon 278', { type: 'fixe', date_validee: '2027-01-25' });
  await sousProjet(request, m.projet.id, 'SP-278', 'Sous-projet 278', m.chef.id);
  await calculer(request, [m.projet.id]);
  await connecterAvec(page, m.emailChef);

  // Gantt du projet : un geste (contour, « Annuler » actif), boutons-noms, crayon du sous-projet.
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto(`/projets/${m.projet.id}?onglet=gantt`);
  const barre = page.locator(`svg [data-element-id="${a.id}"]`);
  const b = (await barre.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 24, b.y + b.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator(`svg [data-contour-element="${a.id}"]`)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeEnabled();
  await photographier(page, 'gantt');

  // Accueil déplié : boutons-noms et crayons.
  await page.goto('/');
  await page.getByRole('button', { name: `Déplier Projet E2E278`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tâche 278', exact: true })).toBeVisible();
  await photographier(page, 'accueil');
});
