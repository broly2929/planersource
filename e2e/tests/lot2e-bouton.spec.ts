import { expect, test } from '@playwright/test';
import { connecterAvec, preparer } from './lot1-helpers.js';
import { monde } from './lot2e-helpers.js';

test('E2E-31 : le bouton « Planning manuel » suit les changements de mode et de feuille sans rechargement', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E31', 'chef-e2e31@example.test', 'chef_de_projet');
  const projet = await api.projet('P-E2E31', 'Projet E2E31', chef.id);
  await api.activite(projet.id, 'Étude E2E31');
  await connecterAvec(page, 'chef-e2e31@example.test');
  await page.goto(`/projets/${projet.id}`);
  const ligne = page.getByRole('row', { name: /Étude E2E31/ });
  await expect(ligne).toBeVisible();
  await expect(ligne.getByLabel('Planning manuel')).toHaveCount(0);

  await page.getByRole('button', { name: 'Modifier Étude E2E31', exact: true }).click();
  const dialogue = page.getByRole('dialog');
  await dialogue.getByLabel('Mode').selectOption('MAN');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialogue).toHaveCount(0);
  await expect(ligne.getByLabel('Planning manuel')).toHaveCount(1);

  await page.getByRole('button', { name: 'Ajouter une sous-activité à Étude E2E31' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Enfant E2E31');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /1\.1 Enfant E2E31/ })).toBeVisible();
  await expect(ligne.getByLabel('Planning manuel')).toHaveCount(0);
});

test('E2E-32 : les boutons de mois sont inactifs aux bornes 2000-01 et 2099-12', async ({
  page,
  request,
}) => {
  const m = await monde(request, 'E2E32');
  await connecterAvec(page, m.emailChef);
  const adresse = `/projets/${m.projet.id}/planning-manuel/${m.man.id}`;
  const precedent = page.getByRole('button', { name: 'Mois précédent' });
  const suivant = page.getByRole('button', { name: 'Mois suivant' });

  await page.goto(`${adresse}?mois=2099-12`);
  await expect(suivant).toBeDisabled();
  await expect(precedent).toBeEnabled();

  await page.goto(`${adresse}?mois=2000-01`);
  await expect(precedent).toBeDisabled();
  await expect(suivant).toBeEnabled();
});
