import { expect, test } from '@playwright/test';

test('E2E-45-r1 : le champ Identifiant de la connexion n’est pas de type email et accepte « admin »', async ({
  page,
}) => {
  await page.goto('/connexion');
  const champ = page.getByLabel('Identifiant');
  await expect(champ).not.toHaveAttribute('type', 'email');
  await champ.fill('admin');
  await page.getByLabel('Mot de passe').fill('admin');
  const requete = page.waitForRequest('**/api/auth/login');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await requete;
});
