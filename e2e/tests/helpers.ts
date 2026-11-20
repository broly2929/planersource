import { expect, type Page } from '@playwright/test';
import { E2E_ADMIN } from './credentials.js';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill(E2E_ADMIN.motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL('/');
}
