// Lot 5i, bandeau du mot de passe d'origine (D-138 (2)) : E2E-321.
// Base « administrateur seul », tout à l'écran (règle « Parcours IHM »).
import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
import { E2E_ADMIN } from './credentials.js';
import { loginAsAdmin } from './helpers.js';

// Texte de D-138 (2), apostrophe droite ou typographique (convention des écrans, D-135 (10) a).
const BANDEAU_RE = /Le mot de passe de l['’]administrateur est celui d['’]origine : changez-le\./;

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

async function deconnecter(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/connexion/);
}

async function seConnecter(page: Page, identifiant: string, motDePasse: string): Promise<void> {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(identifiant);
  await page.getByLabel('Mot de passe').fill(motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('link', { name: 'Accueil', exact: true })).toBeVisible();
}

test.afterAll(remettreAdminSeul);

test('E2E-321 bandeau du mot de passe d’origine : affiché pour admin / admin, absent après changement à l’écran', async ({
  page,
}) => {
  await remettreAdminSeul();
  await loginAsAdmin(page);
  // L'administrateur e2e n'a pas le mot de passe d'origine : pas de bandeau.
  await expect(page.getByText(BANDEAU_RE)).toHaveCount(0);

  await allerAUtilisateurs(page);
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const creation = page.getByRole('dialog');
  await creation.getByLabel('Nom').fill('Administrateur initial');
  await creation.getByLabel('Identifiant').fill('admin');
  await creation.getByLabel('Mot de passe').fill('admin');
  await creation.getByLabel('Rôle').selectOption({ label: 'Administrateur' });
  await creation.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Administrateur initial/ })).toBeVisible();
  await deconnecter(page);

  await seConnecter(page, 'admin', 'admin');
  await expect(page.getByText(BANDEAU_RE)).toBeVisible();

  await allerAUtilisateurs(page);
  await page.getByRole('button', { name: 'Modifier Administrateur initial' }).click();
  const modification = page.getByRole('dialog');
  await modification.getByLabel('Nouveau mot de passe').fill('nouveau-mot-de-passe-321');
  await modification.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(modification).toBeHidden();

  await seConnecter(page, 'admin', 'nouveau-mot-de-passe-321');
  await expect(page.getByText(BANDEAU_RE)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Accueil', exact: true })).toBeVisible();
  await expect(page.getByText(BANDEAU_RE)).toHaveCount(0);
});
