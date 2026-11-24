// Captures de l'Accueil (G3), sans assertion forte : e2e/captures/accueil-replie.png et accueil-deplie.png,
// 1440 px, projets calculés (E2E-101).
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { preparer } from './lot1-helpers.js';
import { activiteAvec, calculer, jalonAvec, lier, sousProjet } from './lot3b-helpers.js';
import { remettreAdminSeul } from './lot3c-helpers.js';
import { cheminCapture } from './captures.js';
import { replierTout } from './retouches-rex6-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul();
  await page.clock.setFixedTime('2027-01-06T10:00:00');
});
test.afterEach(remettreAdminSeul);

test('E2E-101-r1 captures de l’Accueil replié puis déplié, projets calculés', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const admin = ((await (await request.get('/api/auth/me')).json()) as { id: number }).id;
  const res = await api.utilisateur('Ressource101', 'r101@g3.test', 'ressource', true);
  const p = await api.projet('P101', 'Projet cartographie', admin);
  const q = await api.projet('Q101', 'Projet migration', admin);
  for (const x of [p, q]) await api.affectation(x.id, res.id);
  const amont = await activiteAvec(request, p.id, 'Cadrage');
  await api.assignation(amont.id, res.id, 4);
  const aval = await activiteAvec(request, p.id, 'Réalisation');
  await api.assignation(aval.id, res.id, 6);
  const jalon = await jalonAvec(request, p.id, 'Recette');
  await lier(request, p.id, amont.id, aval.id, 'FD');
  await lier(request, p.id, aval.id, jalon.id, 'FD');
  const autre = await activiteAvec(request, q.id, 'Bascule');
  await api.assignation(autre.id, res.id, 3);
  const s = await sousProjet(request, p.id, 'S101', 'Sous-projet formation', admin);
  await api.affectation(s.id, res.id);
  const formation = await activiteAvec(request, s.id, 'Sessions');
  await api.assignation(formation.id, res.id, 2);
  await calculer(request, [p.id, q.id]);

  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await replierTout(page); // D-218 (4), (9)
  await expect(page.getByRole('button', { name: 'Déplier Projet cartographie' })).toBeVisible();
  await page.screenshot({ path: cheminCapture('accueil-replie.png') });
  await page.getByRole('button', { name: 'Déplier Projet cartographie' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Cadrage' })).toBeVisible();
  await page.screenshot({ path: cheminCapture('accueil-deplie.png') });
});
