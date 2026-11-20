import { expect, test } from '@playwright/test';
import { connecterAvec, preparer } from './lot1-helpers.js';

/*
 * Contrat (D-041) : « Descendre <nom> » et « Monter <nom> » déplacent l'élément d'une position
 * parmi ses frères ; les numéros WBS suivent.
 */

test('E2E-25 : Descendre puis Monter l’activité du milieu', async ({ page, request }) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E25', 'chef-e2e25@example.test', 'chef_de_projet');
  const projet = await api.projet('P-E2E25', 'Projet E2E25', chef.id);
  await api.activite(projet.id, 'Alpha E2E25');
  await api.activite(projet.id, 'Bravo E2E25');
  await api.activite(projet.id, 'Charlie E2E25');

  await connecterAvec(page, 'chef-e2e25@example.test');
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('link', { name: 'Projet E2E25', exact: true }).click();
  await expect(page.getByRole('row', { name: /^2 Bravo E2E25/ })).toBeVisible();

  await page.getByRole('button', { name: 'Descendre Bravo E2E25' }).click();
  await expect(page.getByRole('row', { name: /^1 Alpha E2E25/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^2 Charlie E2E25/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^3 Bravo E2E25/ })).toBeVisible();

  // Bravo est dernier : le remettre au milieu, puis le monter en tête
  await page.getByRole('button', { name: 'Monter Bravo E2E25' }).click();
  await expect(page.getByRole('row', { name: /^2 Bravo E2E25/ })).toBeVisible();
  await page.getByRole('button', { name: 'Monter Bravo E2E25' }).click();
  await expect(page.getByRole('row', { name: /^1 Bravo E2E25/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^2 Alpha E2E25/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^3 Charlie E2E25/ })).toBeVisible();
});
