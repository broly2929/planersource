// Captures du lot 6b (E2E-355, relecture d'apparence), sans assertion fonctionnelle : e2e/captures/
// mes-taches-{contenu,vide}-{1440,1024}.png. Ressource connectée (menu réduit visible).
import { expect, test, type Page } from '@playwright/test';
import { cheminCapture } from './captures.js';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { calculer } from './lot3b-helpers.js';
import { remettreAdminSeul6b, tableauMesTaches, titreMesTaches } from './lot6b-helpers.js';

const LARGEURS = [1440, 1024];

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

async function photographier(page: Page, nom: string) {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.screenshot({ path: cheminCapture(`mes-taches-${nom}-${largeur}.png`) });
  }
}

test('E2E-355 : captures de l’écran Mes tâches et du menu de la ressource (sans assertion fonctionnelle)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 6B', 'chef-6b@lot6b.test', 'chef_de_projet');
  const res = await api.utilisateur('Ressource 6B', 'ressource-6b@lot6b.test', 'ressource', true);
  await api.utilisateur('Sans tâche 6B', 'vide-6b@lot6b.test', 'ressource', true);
  const p1 = await api.projet('MT1', 'Projet Mes tâches 1', chef.id);
  const p2 = await api.projet('MT2', 'Projet Mes tâches 2 au nom plus long', chef.id);
  for (const p of [p1, p2]) await api.affectation(p.id, res.id);
  for (const [p, nom, charge] of [
    [p1, 'Conception détaillée', 2],
    [p1, 'Revue', 0.5],
    [p2, 'Recette', 1.5],
  ] as const) {
    const a = await api.activite(p.id, nom);
    await api.assignation(a.id, res.id, charge);
  }
  await calculer(request, [p1.id]);

  await connecterAvec(page, 'ressource-6b@lot6b.test');
  await expect(tableauMesTaches(page)).toBeVisible();
  await photographier(page, 'contenu');

  await page.context().clearCookies();
  await connecterAvec(page, 'vide-6b@lot6b.test');
  await expect(titreMesTaches(page)).toBeVisible();
  await expect(page.getByText('Aucune tâche en cours.', { exact: true })).toBeVisible();
  await photographier(page, 'vide');
});
