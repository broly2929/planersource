// Lot correctif REX-2, tranche R2-D (D-077) : identifiant de connexion, initiales, email facultatif.
// E2E-71 à E2E-74. Base « administrateur seul », tout à l'écran (règle « Parcours IHM »).
import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
import { loginAsAdmin } from './helpers.js';
import { fermerEnAbandonnant } from './garde-dialogue-helpers.js';

const NOM_ADMIN_E2E = 'Admin E2E';

/**
 * Remet la base dans l'état « administrateur seul ». Les remises à zéro des autres specs
 * suppriment par `email <> admin` et ne suppriment pas un utilisateur sans email : celle-ci
 * supprime par le nom, valable avant et après la migration 011. Refuse toute base hors *_test.
 */
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
    await client.query('DELETE FROM utilisateur WHERE nom <> $1', [NOM_ADMIN_E2E]);
    await client.query('DELETE FROM calendrier WHERE NOT est_defaut');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

test.beforeEach(remettreAdminSeul);
test.afterEach(remettreAdminSeul);

async function allerAUtilisateurs(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Utilisateurs', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Utilisateurs', level: 1 })).toBeVisible();
}

interface Saisie {
  nom?: string;
  identifiant?: string;
  initiales?: string;
  email?: string;
  motDePasse?: string;
}

async function remplirCreation(page: Page, s: Saisie): Promise<void> {
  await allerAUtilisateurs(page);
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(s.nom ?? 'Sans nom');
  if (s.identifiant !== undefined) await dialog.getByLabel('Identifiant').fill(s.identifiant);
  if (s.initiales !== undefined) await dialog.getByLabel('Initiales').fill(s.initiales);
  if (s.email !== undefined) await dialog.getByLabel('Email').fill(s.email);
  await dialog.getByLabel('Mot de passe', { exact: true }).fill(s.motDePasse ?? 'a');
  await dialog.getByRole('button', { name: 'Créer' }).click();
}

async function deconnecter(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/connexion/);
}

/** Connexion par l'écran ; vrai si l'accueil s'affiche, faux si un refus s'affiche. */
async function seConnecter(page: Page, identifiant: string, motDePasse: string): Promise<boolean> {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(identifiant);
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

test('E2E-71-r1 création sans email avec Identifiant et Initiales : la ligne les affiche, l’utilisateur se connecte avec l’identifiant', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await remplirCreation(page, {
    nom: 'Bob R2-71',
    identifiant: 'bob71',
    initiales: 'B7',
    motDePasse: 'a',
  });
  const ligne = page.getByRole('row', { name: /Bob R2-71/ });
  await expect(ligne).toContainText('bob71');
  await expect(ligne).toContainText('B7');
  await deconnecter(page);
  expect(await seConnecter(page, 'bob71', 'a'), 'connexion avec « bob71 »').toBe(true);
});

test('E2E-72-r1 « Modifier <nom> » : identifiant et initiales changés, email vidé ; la ligne est à jour, le nouvel identifiant connecte', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await remplirCreation(page, {
    nom: 'Eve R2-72',
    identifiant: 'ancien72',
    initiales: 'AN',
    email: 'eve72@rex2d.test',
    motDePasse: 'a',
  });
  await expect(page.getByRole('row', { name: /Eve R2-72/ })).toContainText('ancien72');

  await page.getByRole('button', { name: 'Modifier Eve R2-72' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Identifiant').fill('nouveau72');
  await dialog.getByLabel('Initiales').fill('NV');
  await dialog.getByLabel('Email').fill('');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();

  const ligne = page.getByRole('row', { name: /Eve R2-72/ });
  await expect(ligne).toContainText('nouveau72');
  await expect(ligne).toContainText('NV');
  await expect(ligne).not.toContainText('eve72@rex2d.test');
  await deconnecter(page);
  expect(await seConnecter(page, 'nouveau72', 'a'), 'connexion avec « nouveau72 »').toBe(true);
});

test('E2E-73-r1 refus : identifiant et email vides, puis identifiant déjà utilisé ; dialogue ouvert, rien de créé', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await remplirCreation(page, { nom: 'Vide R2-73', identifiant: '', email: '', motDePasse: 'a' });
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toHaveText('Renseignez un identifiant ou un email.');
  await fermerEnAbandonnant(page, dialog);
  await expect(page.getByRole('row', { name: /Vide R2-73/ })).toHaveCount(0);

  await remplirCreation(page, { nom: 'Un R2-73', identifiant: 'bob73', motDePasse: 'a' });
  await expect(page.getByRole('row', { name: /Un R2-73/ })).toBeVisible();

  await remplirCreation(page, { nom: 'Deux R2-73', identifiant: 'bob73', motDePasse: 'a' });
  await expect(dialog.getByRole('alert')).toHaveText('Cet identifiant est déjà utilisé.');
  await expect(dialog).toBeVisible();
  await fermerEnAbandonnant(page, dialog);
  await page.reload();
  await expect(page.getByRole('row', { name: /Deux R2-73/ })).toHaveCount(0);
});

test('E2E-74 écran Connexion : champ « Identifiant » ; mauvais mot de passe → « Identifiant ou mot de passe incorrect. »', async ({
  page,
}) => {
  await page.goto('/connexion');
  await expect(page.getByLabel('Identifiant')).toBeVisible();
  await page.getByLabel('Identifiant').fill('inconnu74');
  await page.getByLabel('Mot de passe').fill('mauvais');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toHaveText('Identifiant ou mot de passe incorrect.');
});
