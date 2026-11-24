// Lot correctif REX-2, tranche R2-A (D-076) : mot de passe sans longueur minimale. E2E-69, E2E-70.
// Base « administrateur seul », tout à l'écran (règle « Parcours IHM »).
import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
import { E2E_ADMIN } from './credentials.js';
import { loginAsAdmin } from './helpers.js';

/** Remet la base de test dans l'état « administrateur seul ». Refuse toute base hors *_test. */
async function remettreAdminSeul(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE projet, historique RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM utilisateur WHERE email IS DISTINCT FROM $1', [
      E2E_ADMIN.email,
    ]);
    await client.query('DELETE FROM calendrier WHERE NOT est_defaut');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

async function allerAUtilisateurs(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Utilisateurs', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Utilisateurs', level: 1 })).toBeVisible();
}

async function creerUtilisateur(
  page: Page,
  nom: string,
  email: string,
  motDePasse: string,
): Promise<void> {
  await allerAUtilisateurs(page);
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(nom);
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Mot de passe').fill(motDePasse);
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(nom) })).toBeVisible();
}

async function deconnecter(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/connexion/);
}

/** Connexion par l'écran ; renvoie vrai si l'accueil s'affiche, faux si un refus s'affiche. */
async function seConnecter(page: Page, email: string, motDePasse: string): Promise<boolean> {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(email);
  await page.getByLabel('Mot de passe').fill(motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  const refus = page.getByRole('alert');
  // Révision 6b (D-031, D-148 (5)) : la ressource n'a plus « Accueil » ; « Mes tâches » prouve aussi la connexion.
  const accueil = page
    .getByRole('link', { name: 'Accueil', exact: true })
    .or(page.getByRole('link', { name: 'Mes tâches', exact: true }));
  await refus.or(accueil).first().waitFor();
  return !(await refus.isVisible());
}

test('E2E-69-r1 utilisateur créé à l’écran avec le mot de passe « a » : il se connecte avec « a »', async ({
  page,
}) => {
  await remettreAdminSeul();
  await loginAsAdmin(page);
  await creerUtilisateur(page, 'Court R2-69', 'court-r2-69@rex2.test', 'a');
  await deconnecter(page);
  expect(await seConnecter(page, 'court-r2-69@rex2.test', 'a'), 'connexion avec « a »').toBe(true);
});

test('E2E-70-r1 nouveau mot de passe « b » saisi dans « Modifier <nom> » : il connecte', async ({
  page,
}) => {
  await remettreAdminSeul();
  await loginAsAdmin(page);
  await creerUtilisateur(page, 'Court R2-70', 'court-r2-70@rex2.test', 'mot-de-passe-initial-70');
  await allerAUtilisateurs(page);
  await page.getByRole('button', { name: 'Modifier Court R2-70' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nouveau mot de passe').fill('b');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await deconnecter(page);
  expect(await seConnecter(page, 'court-r2-70@rex2.test', 'b'), 'connexion avec « b »').toBe(true);
});
