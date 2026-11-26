import { expect, test } from '@playwright/test';
import { E2E_ADMIN } from './credentials.js';
import { loginAsAdmin } from './helpers.js';

test('E2E-1 : connexion par l’écran de connexion, arrivée sur l’accueil', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill(E2E_ADMIN.motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Accueil' })).toBeVisible();
});

test('E2E-2 : mauvais mot de passe → message d’erreur, pas de navigation', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL('/connexion');
});

test('E2E-3-r1 : l’administrateur crée un utilisateur par le formulaire et le voit dans la liste', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Utilisateurs' }).click();
  await expect(page.getByRole('heading', { name: 'Utilisateurs' })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill('Bob E2E');
  await dialog.getByLabel('Email').fill('bob-e2e@example.test');
  await dialog.getByLabel('Mot de passe', { exact: true }).fill('mot-de-passe-de-bob-e2e');
  await dialog.getByLabel('Rôle').selectOption({ label: 'Ressource' });
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /bob-e2e@example\.test/ })).toBeVisible();
});

test('E2E-4 : l’administrateur se déconnecte par l’interface, l’accueil redirige vers /connexion', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('/connexion');
  await page.goto('/');
  await expect(page).toHaveURL('/connexion');
});
