// Lot 5b, limitation des tentatives de connexion par l'écran (D-140 (3)) : E2E-322.
import { expect, test } from '@playwright/test';

test('E2E-322 écran Connexion : 6 échecs d’un même identifiant → « Trop de tentatives de connexion… » ; 1er échec → message habituel', async ({
  page,
}) => {
  // Identifiant unique et inconnu : ne touche aucun compte, ne gêne aucun autre test (clé propre).
  const identifiant = `e2e-limite-${Date.now()}`;
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(identifiant);
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');

  const soumettre = async (): Promise<number> => {
    const reponse = page.waitForResponse('**/api/auth/login');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    return (await reponse).status();
  };

  expect(await soumettre()).toBe(401);
  await expect(page.getByRole('alert')).toHaveText('Identifiant ou mot de passe incorrect.');

  for (let i = 2; i <= 5; i += 1) expect(await soumettre(), `soumission ${i}`).toBe(401);
  expect(await soumettre(), 'soumission 6').toBe(429);
  await expect(page.getByRole('alert')).toHaveText(
    'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
  );
  await expect(page).toHaveURL('/connexion');
});
