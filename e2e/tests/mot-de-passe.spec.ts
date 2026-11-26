// Lot mot-de-passe (D-254) : E2E-678 à E2E-681 ; lot correctif-atterrissage (D-256) : E2E-682 et E2E-683. SPEC §8, « Changement de mot de passe ».
// Base « administrateur seul » avant et après ; les utilisateurs sont créés par l'API sauf là où
// l'écran est l'objet du test (E2E-678 : case dans « Modifier <nom> » ; E2E-680 : « Nouvel utilisateur »).
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, MOT_DE_PASSE, preparer } from './lot1-helpers.js';
import { remettreAdminSeul6b } from './lot6b-helpers.js';

test.beforeEach(remettreAdminSeul6b);
test.afterEach(remettreAdminSeul6b);

const CASE = 'Doit changer son mot de passe à la prochaine connexion';
const NOUVEAU = 'nouveau-mot-de-passe-e2e-678';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });
const titreForce = (page: Page) =>
  page.getByRole('heading', { name: 'Changez votre mot de passe', level: 1 });

/** Connexion par l'écran avec un mot de passe donné, sans attendre une adresse précise. */
async function seConnecter(page: Page, identifiant: string, motDePasse: string): Promise<void> {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(identifiant);
  await page.getByLabel('Mot de passe').fill(motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

/** Remplit le formulaire de changement (page forcée ou dialogue). */
async function remplirChangement(
  zone: ReturnType<Page['getByRole']> | Page,
  actuel: string,
  nouveau: string,
  confirmation: string,
): Promise<void> {
  await zone.getByLabel('Mot de passe actuel', { exact: true }).fill(actuel);
  await zone.getByLabel('Nouveau mot de passe', { exact: true }).fill(nouveau);
  await zone.getByLabel('Confirmation', { exact: true }).fill(confirmation);
}

test('E2E-678 : case cochée dans « Modifier <nom> » → page « Changez votre mot de passe » à la connexion, changement, accueil, reconnexion, case décochée', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const email = 'chef-678@mot-de-passe.test';
  await api.utilisateur('Chef 678', email, 'chef_de_projet', false);

  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Utilisateurs', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Chef 678' }).click();
  let dialog = page.getByRole('dialog');
  const caseDialogue = dialog.getByRole('checkbox', { name: CASE });
  await expect(caseDialogue).not.toBeChecked();
  await caseDialogue.check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();

  await page.context().clearCookies();
  await seConnecter(page, email, MOT_DE_PASSE);
  await expect(titreForce(page)).toBeVisible();
  await expect(nav(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  await remplirChangement(page, MOT_DE_PASSE, NOUVEAU, NOUVEAU);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page).toHaveURL('/');
  await expect(titreForce(page)).toHaveCount(0);
  await expect(nav(page)).toBeVisible();

  // Reconnexion : l'ancien mot de passe est refusé, le nouveau accepté.
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await seConnecter(page, email, MOT_DE_PASSE);
  await expect(page).toHaveURL(/\/connexion/);
  await expect(page.getByRole('link', { name: 'Accueil', exact: true })).toHaveCount(0);
  await seConnecter(page, email, NOUVEAU);
  await expect(page).toHaveURL('/');
  await expect(titreForce(page)).toHaveCount(0);

  // La case est décochée dans le dialogue de l'administrateur.
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Utilisateurs', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier Chef 678' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('checkbox', { name: CASE })).not.toBeChecked();
});

test('E2E-679 : « Changer mon mot de passe » depuis la barre latérale : confirmation différente sans envoi, actuel incorrect, succès', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const email = 'chef-679@mot-de-passe.test';
  await api.utilisateur('Chef 679', email, 'chef_de_projet', false);
  await connecterAvec(page, email);

  const envois: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/auth/mot-de-passe')) envois.push(r.url());
  });

  await page
    .locator('aside')
    .getByRole('button', { name: 'Changer mon mot de passe', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Changer mon mot de passe' });
  await expect(dialog).toBeVisible();
  for (const nom of ['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmation']) {
    await expect(dialog.getByLabel(nom, { exact: true })).toHaveAttribute('type', 'password');
  }

  // Confirmation différente : message, aucun envoi.
  await remplirChangement(dialog, MOT_DE_PASSE, NOUVEAU, 'autre-chose');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByText('La confirmation ne correspond pas.')).toBeVisible();
  expect(envois).toHaveLength(0);

  // Actuel incorrect : message du serveur, dialogue ouvert.
  await remplirChangement(dialog, 'mot-de-passe-faux', NOUVEAU, NOUVEAU);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByText('Mot de passe actuel incorrect')).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(envois).toHaveLength(1);

  // Succès : dialogue fermé, notification.
  await remplirChangement(dialog, MOT_DE_PASSE, NOUVEAU, NOUVEAU);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Mot de passe changé.')).toBeVisible();

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await seConnecter(page, email, NOUVEAU);
  await expect(page).toHaveURL('/');
});

test('E2E-680 : utilisateur créé avec la case cochée dans « Nouvel utilisateur » → passage forcé à sa connexion', async ({
  page,
}) => {
  const email = 'ress-680@mot-de-passe.test';
  await loginAsAdmin(page);
  await page.getByRole('link', { name: 'Utilisateurs', exact: true }).click();
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom', { exact: true }).fill('Ressource 680');
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE);
  const caseDialogue = dialog.getByRole('checkbox', { name: CASE });
  await expect(caseDialogue).not.toBeChecked();
  await caseDialogue.check();
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Ressource 680/ })).toBeVisible();

  await page.context().clearCookies();
  await seConnecter(page, email, MOT_DE_PASSE);
  await expect(titreForce(page)).toBeVisible();
  await expect(nav(page)).toHaveCount(0);
  await remplirChangement(page, MOT_DE_PASSE, NOUVEAU, NOUVEAU);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(titreForce(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/(mes-taches)?$/);
});

test('E2E-681 : session ouverte, l’administrateur coche la case → à la prochaine action, page « Changez votre mot de passe »', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const email = 'chef-681@mot-de-passe.test';
  const chef = await api.utilisateur('Chef 681', email, 'chef_de_projet', false);
  await connecterAvec(page, email);
  await expect(nav(page)).toBeVisible();

  const r = await request.patch(`/api/utilisateurs/${chef.id}`, {
    data: { doit_changer_mot_de_passe: true },
  });
  expect(r.ok(), `PATCH : ${r.status()}`).toBeTruthy();

  await page.getByRole('link', { name: 'Projets', exact: true }).click();
  await expect(titreForce(page)).toBeVisible();
  await expect(nav(page)).toHaveCount(0);
  await remplirChangement(page, MOT_DE_PASSE, NOUVEAU, NOUVEAU);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(titreForce(page)).toHaveCount(0);
  await expect(nav(page)).toBeVisible();
});

test('E2E-682 : 403 en cours de session depuis /projets (lien du menu) → page forcée, changement, atterrissage sur « / » (Accueil, menu visible)', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const email = 'chef-682@mot-de-passe.test';
  const chef = await api.utilisateur('Chef 682', email, 'chef_de_projet', false);
  await connecterAvec(page, email);
  await page.getByRole('link', { name: 'Projets', exact: true }).click();
  await expect(page).toHaveURL('/projets');
  await expect(page.getByRole('heading', { name: 'Projets', level: 1 })).toBeVisible();

  const r = await request.patch(`/api/utilisateurs/${chef.id}`, {
    data: { doit_changer_mot_de_passe: true },
  });
  expect(r.ok(), `PATCH : ${r.status()}`).toBeTruthy();

  // Prochaine action : lien du menu vers un autre écran que l'Accueil, sans rechargement ; le 403 est reçu.
  const refus = page.waitForResponse(
    (rep) => new URL(rep.url()).pathname.startsWith('/api/') && rep.status() === 403,
  );
  await nav(page).getByRole('link', { name: 'Pilotage', exact: true }).click();
  expect((await refus).status()).toBe(403);
  await expect(titreForce(page)).toBeVisible();
  await expect(nav(page)).toHaveCount(0);
  await remplirChangement(page, MOT_DE_PASSE, NOUVEAU, NOUVEAU);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Accueil', level: 1 })).toBeVisible();
  await expect(titreForce(page)).toHaveCount(0);
  await expect(nav(page)).toBeVisible();
});

test('E2E-683 : changement forcé en cours de session depuis Imputations, rôle ressource → atterrissage sur /mes-taches', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const email = 'ress-683@mot-de-passe.test';
  const ress = await api.utilisateur('Ressource 683', email, 'ressource', true);
  await connecterAvec(page, email);
  await nav(page).getByRole('link', { name: 'Imputations', exact: true }).click();
  await expect(page).toHaveURL(/\/imputations(\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Feuille de temps', level: 1 })).toBeVisible();

  const r = await request.patch(`/api/utilisateurs/${ress.id}`, {
    data: { doit_changer_mot_de_passe: true },
  });
  expect(r.ok(), `PATCH : ${r.status()}`).toBeTruthy();

  await page.reload();
  await expect(titreForce(page)).toBeVisible();
  await expect(nav(page)).toHaveCount(0);
  await remplirChangement(page, MOT_DE_PASSE, NOUVEAU, NOUVEAU);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page).toHaveURL('/mes-taches');
  await expect(page.getByRole('heading', { name: 'Mes tâches', level: 1 })).toBeVisible();
  await expect(titreForce(page)).toHaveCount(0);
  await expect(nav(page)).toBeVisible();
});
