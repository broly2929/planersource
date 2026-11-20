import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, preparer } from './lot1-helpers.js';

/*
 * Contrat d'interface du lot 1b-A (écran « Modèles ») — libellés accessibles attendus :
 *
 * Navigation : lien « Modèles » pour l'administrateur et le chef de projet, absent pour une
 *   ressource.
 * Écran « Modèles » : titre de niveau 1 « Modèles », tableau Code | Nom | Début ; le nom est un
 *   lien vers l'écran projet existant (titre de niveau 1 = nom, onglets, boutons d'écriture
 *   pilotés par peut_ecrire). Bouton « Nouveau modèle » (administrateur seul) → dialogue : champs
 *   « Code », « Nom », « Date de début », bouton « Créer ».
 * Un modèle n'apparaît pas dans l'écran « Projets ».
 */

test('E2E-12 : l’administrateur crée un modèle, le voit dans « Modèles » et pas dans « Projets », y crée une activité', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Modèles' }).click();
  await expect(page.getByRole('heading', { name: 'Modèles', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Nouveau modèle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('MOD-E2E12');
  await dialog.getByLabel('Nom').fill('Modèle E2E12');
  await dialog.getByLabel('Date de début').fill('2027-01-04');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(
    page.getByRole('row', { name: /MOD-E2E12.*Modèle E2E12.*2027-01-04/ }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Projets' }).click();
  await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modèle E2E12' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Modèles' }).click();
  await page.getByRole('link', { name: 'Modèle E2E12' }).click();
  await expect(page.getByRole('heading', { name: 'Modèle E2E12', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Étude E2E12');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /1 Étude E2E12/ })).toBeVisible();
});

test('E2E-13-r1 : un chef voit le modèle et son planning sans bouton d’écriture ; une ressource n’a ni le lien « Projets » ni le lien « Modèles »', async ({
  page,
  request,
  browser,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef E2E13', 'chef-e2e13@example.test', 'chef_de_projet');
  await api.utilisateur('Alice E2E13', 'alice-e2e13@example.test', 'ressource', true);
  const modele = await api.modele('MOD-E2E13', 'Modèle E2E13');
  await api.activite(modele.id, 'Étude E2E13');
  void chef;

  await connecterAvec(page, 'chef-e2e13@example.test');
  await page.getByRole('link', { name: 'Modèles' }).click();
  await expect(page.getByRole('heading', { name: 'Modèles', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nouveau modèle' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Modèle E2E13' }).click();
  await expect(page.getByRole('heading', { name: 'Modèle E2E13', level: 1 })).toBeVisible();
  await expect(page.getByRole('row', { name: /1 Étude E2E13/ })).toBeVisible();
  const ecriture =
    /Nouvelle activité|Nouveau jalon|Nouvelle dépendance|Affecter|Modifier|Ajouter|Assigner|Supprimer/;
  await expect(page.getByRole('button', { name: ecriture })).toHaveCount(0);

  const contexte = await browser.newContext();
  const pageRessource = await contexte.newPage();
  await connecterAvec(pageRessource, 'alice-e2e13@example.test');
  // Révision 6b (D-031, D-148 (5)) : menu de la ressource sans « Projets ».
  await expect(pageRessource.getByRole('link', { name: 'Projets' })).toHaveCount(0);
  await expect(pageRessource.getByRole('link', { name: 'Modèles' })).toHaveCount(0);
  await contexte.close();
});
