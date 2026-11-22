// Lot correctif REX-1 (D-072) : écrans Utilisateurs et Projets. E2E-46 à E2E-58.
// Chaque test crée par l'écran l'entité qu'il vérifie ; `preparer` ne crée que les autres entités.
import { expect, test, type Browser, type Page } from '@playwright/test';
import pg from 'pg';
import { E2E_ADMIN } from './credentials.js';
import { loginAsAdmin } from './helpers.js';
import { connecterAvec, MOT_DE_PASSE, preparer } from './lot1-helpers.js';
import { ouvrirCalendriers } from './lot3c-helpers.js';

const NOM_ADMIN = 'Admin E2E';
const CODE_UTILISE = 'Ce code est déjà utilisé.';

/** Remet la base de test dans l'état « administrateur seul » (E2E-46). Refuse toute base hors *_test. */
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
    await client.query('DELETE FROM utilisateur WHERE email <> $1', [E2E_ADMIN.email]);
    await client.query('DELETE FROM calendrier WHERE NOT est_defaut');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

async function allerA(page: Page, lien: string): Promise<void> {
  await page.getByRole('link', { name: lien, exact: true }).click();
  await expect(page.getByRole('heading', { name: lien, level: 1 })).toBeVisible();
}

interface NouvelUtilisateur {
  nom: string;
  email: string;
  motDePasse?: string;
  role?: string;
  /** Faux : décoche la case. Sinon la case doit être cochée par défaut. */
  ressource?: boolean;
  capacite?: string;
  calendrier?: string;
}

/** Création d'un utilisateur par l'écran Utilisateurs (administrateur connecté). */
async function creerUtilisateur(page: Page, u: NouvelUtilisateur): Promise<void> {
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(u.nom);
  await dialog.getByLabel('Email').fill(u.email);
  await dialog.getByLabel('Mot de passe').fill(u.motDePasse ?? MOT_DE_PASSE);
  if (u.role) await dialog.getByLabel('Rôle').selectOption({ label: u.role });
  const ressource = dialog.getByRole('checkbox', { name: 'Ressource planifiable' });
  if (u.ressource === false) await ressource.uncheck();
  else await expect(ressource).toBeChecked();
  if (u.capacite) await dialog.getByLabel('Capacité (j/jour)').fill(u.capacite);
  if (u.calendrier) await dialog.getByLabel('Calendrier').selectOption({ label: u.calendrier });
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(u.nom) })).toBeVisible();
}

/** Cellule d'un tableau, repérée par le titre de sa colonne (échoue si la colonne est absente). */
async function cellule(page: Page, ligne: string, colonne: string) {
  await expect(page.getByRole('row', { name: new RegExp(ligne) })).toBeVisible();
  const entetes = (await page.getByRole('columnheader').allTextContents()).map((t) => t.trim());
  const i = entetes.indexOf(colonne);
  expect(
    i,
    `colonne « ${colonne} » absente (colonnes : ${entetes.join(', ')})`,
  ).toBeGreaterThanOrEqual(0);
  return page
    .getByRole('row', { name: new RegExp(ligne) })
    .getByRole('cell')
    .nth(i);
}

async function ouvrirModificationUtilisateur(page: Page, nom: string) {
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: `Modifier ${nom}` }).click();
  return page.getByRole('dialog');
}

/** Ouvre le dialogue d'affectation d'un projet et le renvoie (pour lire les ressources proposées). */
async function ouvrirAffectation(page: Page, projet: string) {
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: projet }).click();
  await expect(page.getByRole('heading', { name: projet, level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Affectations' }).click();
  await page.getByRole('button', { name: 'Affecter une ressource' }).click();
  return page.getByRole('dialog');
}

/** Création d'un projet par l'écran Projets (administrateur : chef choisi dans la liste). */
async function creerProjet(page: Page, code: string, nom: string, chef = NOM_ADMIN): Promise<void> {
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill(code);
  await dialog.getByLabel('Nom').fill(nom);
  await dialog.getByLabel('Chef de projet').selectOption({ label: chef });
  await dialog.getByLabel('Pas avant le').fill('2027-01-04');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(nom) })).toBeVisible();
}

async function idUtilisateur(
  request: Parameters<typeof preparer>[0],
  email: string,
): Promise<number> {
  const res = await request.get('/api/utilisateurs');
  const liste = (await res.json()) as { id: number; email: string }[];
  const trouve = liste.find((u) => u.email === email);
  expect(trouve, `utilisateur ${email} dans l'API`).toBeDefined();
  return trouve!.id;
}

/** Session neuve (autre contexte de navigateur) connectée par l'écran de connexion. */
async function pageNeuve(browser: Browser): Promise<Page> {
  const contexte = await browser.newContext();
  return contexte.newPage();
}

test('E2E-46-r1 parcours complet à l’écran, base avec l’administrateur seul', async ({ page }) => {
  await remettreAdminSeul();
  await loginAsAdmin(page);

  // Calendrier
  await ouvrirCalendriers(page);
  await page.getByRole('button', { name: 'Nouveau calendrier' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Cal R1-46');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Cal R1-46/ })).toBeVisible();

  // Utilisateur ressource, capacité 0,5, ce calendrier
  await creerUtilisateur(page, {
    nom: 'Ressource R1-46',
    email: 'ressource-r1-46@rex1.test',
    capacite: '0.5',
    calendrier: 'Cal R1-46',
  });

  // Projet
  await creerProjet(page, 'R1-46', 'Projet R1-46');

  // Onglet Affectations : la ressource est proposée, on l'affecte
  const affectation = await ouvrirAffectation(page, 'Projet R1-46');
  await expect(affectation.getByRole('option', { name: 'Ressource R1-46' })).toHaveCount(1);
  await affectation.getByLabel('Ressource').selectOption({ label: 'Ressource R1-46' });
  await affectation.getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('row', { name: /Ressource R1-46/ })).toBeVisible();

  // Onglet Planning : activité, la ressource est proposée à l'assignation, on l'assigne
  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Nouvelle activité' }).click();
  await page.getByRole('dialog').getByLabel('Nom').fill('Activité R1-46');
  await page.getByRole('dialog').getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Activité R1-46/ })).toBeVisible();
  await page.getByRole('button', { name: 'Assigner une ressource à Activité R1-46' }).click();
  const assignation = page.getByRole('dialog');
  await expect(assignation.getByRole('option', { name: 'Ressource R1-46' })).toHaveCount(1);
  await assignation.getByLabel('Ressource').selectOption({ label: 'Ressource R1-46' });
  await assignation.getByLabel('Charge assignée (jours)').fill('2');
  await assignation.getByRole('button', { name: 'Assigner' }).click();
  await expect(page.getByRole('row', { name: /Activité R1-46.*Ressource R1-46/ })).toBeVisible();
});

test('E2E-47 case « Ressource planifiable » décochée : non proposé à l’affectation', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef R1-47', 'chef-r1-47@rex1.test', 'chef_de_projet');
  await api.projet('R1-47', 'Projet R1-47', chef.id);
  await loginAsAdmin(page);
  await creerUtilisateur(page, {
    nom: 'Ressource R1-47',
    email: 'ressource-r1-47@rex1.test',
    ressource: false,
  });
  const dialog = await ouvrirAffectation(page, 'Projet R1-47');
  await expect(dialog.getByRole('option', { name: 'Choisir une ressource' })).toHaveCount(1);
  await expect(dialog.getByRole('option', { name: 'Ressource R1-47' })).toHaveCount(0);
});

test('E2E-48 un utilisateur non ressource devient ressource par le dialogue', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef R1-48', 'chef-r1-48@rex1.test', 'chef_de_projet');
  await api.projet('R1-48', 'Projet R1-48', chef.id);
  await loginAsAdmin(page);
  await creerUtilisateur(page, {
    nom: 'Ressource R1-48',
    email: 'ressource-r1-48@rex1.test',
    ressource: false,
  });
  const dialog = await ouvrirModificationUtilisateur(page, 'Ressource R1-48');
  await dialog.getByRole('checkbox', { name: 'Ressource planifiable' }).check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  const affectation = await ouvrirAffectation(page, 'Projet R1-48');
  await expect(affectation.getByRole('option', { name: 'Ressource R1-48' })).toHaveCount(1);
});

test('E2E-49 capacité et calendrier modifiés par le dialogue, relus après rechargement', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  await api.calendrier('Cal R1-49');
  await loginAsAdmin(page);
  await creerUtilisateur(page, { nom: 'Ressource R1-49', email: 'ressource-r1-49@rex1.test' });
  const dialog = await ouvrirModificationUtilisateur(page, 'Ressource R1-49');
  await dialog.getByLabel('Capacité (j/jour)').fill('0.75');
  await dialog.getByLabel('Calendrier').selectOption({ label: 'Cal R1-49' });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(await cellule(page, 'Ressource R1-49', 'Capacité')).toHaveText('0.75');
  await expect(await cellule(page, 'Ressource R1-49', 'Calendrier')).toHaveText('Cal R1-49');
  await expect(await cellule(page, 'Ressource R1-49', 'Ressource')).toHaveText('Oui');
});

test('E2E-50 désactivation par le dialogue : badge Inactif, non proposé à l’affectation', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef R1-50', 'chef-r1-50@rex1.test', 'chef_de_projet');
  await api.projet('R1-50', 'Projet R1-50', chef.id);
  await loginAsAdmin(page);
  await creerUtilisateur(page, { nom: 'Ressource R1-50', email: 'ressource-r1-50@rex1.test' });
  const dialog = await ouvrirModificationUtilisateur(page, 'Ressource R1-50');
  await dialog.getByRole('checkbox', { name: 'Actif' }).uncheck();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(await cellule(page, 'Ressource R1-50', 'Statut')).toHaveText('Inactif');
  const affectation = await ouvrirAffectation(page, 'Projet R1-50');
  await expect(affectation.getByRole('option', { name: 'Choisir une ressource' })).toHaveCount(1);
  await expect(affectation.getByRole('option', { name: 'Ressource R1-50' })).toHaveCount(0);
});

test('E2E-51 refus : un utilisateur affecté ne cesse pas d’être ressource', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef R1-51', 'chef-r1-51@rex1.test', 'chef_de_projet');
  const projet = await api.projet('R1-51', 'Projet R1-51', chef.id);
  await loginAsAdmin(page);
  await creerUtilisateur(page, { nom: 'Ressource R1-51', email: 'ressource-r1-51@rex1.test' });
  await api.affectation(projet.id, await idUtilisateur(request, 'ressource-r1-51@rex1.test'));
  const dialog = await ouvrirModificationUtilisateur(page, 'Ressource R1-51');
  await dialog.getByRole('checkbox', { name: 'Ressource planifiable' }).uncheck();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert')).toContainText(/affect/i);
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(await cellule(page, 'Ressource R1-51', 'Ressource')).toHaveText('Oui');
});

test('E2E-52 refus : l’administrateur connecté ne se désactive pas', async ({ page }) => {
  await loginAsAdmin(page);
  const dialog = await ouvrirModificationUtilisateur(page, NOM_ADMIN);
  await dialog.getByRole('checkbox', { name: 'Actif' }).uncheck();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert')).toContainText(/désactiv|rôle/i);
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(await cellule(page, NOM_ADMIN, 'Statut')).toHaveText('Actif');
});

test('E2E-53-r1 nouveau mot de passe : vide = inchangé, saisi = nouveau mot de passe', async ({
  page,
  browser,
}) => {
  const email = 'ressource-r1-53@rex1.test';
  const ancien = 'ancien-mdp-r1-53';
  const nouveau = 'nouveau-mdp-r1-53';
  await loginAsAdmin(page);
  await creerUtilisateur(page, { nom: 'Ressource R1-53', email, motDePasse: ancien });

  const connecte = async (motDePasse: string): Promise<boolean> => {
    const p = await pageNeuve(browser);
    await p.goto('/connexion');
    await p.getByLabel('Identifiant').fill(email);
    await p.getByLabel('Mot de passe').fill(motDePasse);
    await p.getByRole('button', { name: 'Se connecter' }).click();
    const refus = p.getByRole('alert');
    // Révision 6b (D-031, D-148 (5)) : la ressource n'a plus « Accueil » ; « Mes tâches » prouve la connexion.
    await refus
      .or(p.getByRole('link', { name: 'Accueil', exact: true }))
      .or(p.getByRole('link', { name: 'Mes tâches', exact: true }))
      .first()
      .waitFor();
    const ok = !(await refus.isVisible());
    await p.context().close();
    return ok;
  };

  // Champ laissé vide : on change seulement le nom, l'ancien mot de passe connecte toujours.
  let dialog = await ouvrirModificationUtilisateur(page, 'Ressource R1-53');
  await dialog.getByLabel('Nom').fill('Ressource R1-53 bis');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name: /Ressource R1-53 bis/ })).toBeVisible();
  expect(await connecte(ancien), 'ancien mot de passe après modification sans mot de passe').toBe(
    true,
  );

  // Nouveau mot de passe saisi : il connecte, l'ancien ne connecte plus.
  dialog = await ouvrirModificationUtilisateur(page, 'Ressource R1-53 bis');
  await dialog.getByLabel('Nouveau mot de passe').fill(nouveau);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  expect(await connecte(nouveau), 'nouveau mot de passe').toBe(true);
  expect(await connecte(ancien), 'ancien mot de passe après changement').toBe(false);
});

test('E2E-54 fiche projet : code, date, priorité et clos modifiés, relus après rechargement', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await creerProjet(page, 'R1-54', 'Projet R1-54');
  await page.getByRole('link', { name: 'Projet R1-54' }).click();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('R1-54B');
  await dialog.getByLabel('Pas avant le').fill('2027-02-01');
  await dialog.getByLabel('Priorité').fill('200');
  await dialog.getByRole('checkbox', { name: 'Clos' }).check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await allerA(page, 'Projets');
  await expect(page.getByRole('row', { name: /R1-54B.*Projet R1-54/ })).toBeVisible();
  // « Pas avant le », priorité et clos ne sont pas relus dans la liste (D-073 2) : dialogue rouvert.
  await page.getByRole('link', { name: 'Projet R1-54' }).click();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  await expect(page.getByRole('dialog').getByLabel('Pas avant le')).toHaveValue('2027-02-01');
  await expect(page.getByRole('dialog').getByLabel('Priorité')).toHaveValue('200');
  await expect(page.getByRole('dialog').getByRole('checkbox', { name: 'Clos' })).toBeChecked();
});

test('E2E-55 fiche projet : code déjà utilisé, refus affiché, rien de modifié', async ({
  page,
  request,
}) => {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef R1-55', 'chef-r1-55@rex1.test', 'chef_de_projet');
  await api.projet('R1-55B', 'Projet occupant R1-55', chef.id);
  await loginAsAdmin(page);
  await creerProjet(page, 'R1-55A', 'Projet R1-55');
  await page.getByRole('link', { name: 'Projet R1-55', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('R1-55B');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(CODE_UTILISE);
  await expect(dialog).toBeVisible();
  await page.reload();
  await allerA(page, 'Projets');
  await expect(page.getByRole('row', { name: /R1-55A.*Projet R1-55/ })).toBeVisible();
});

test('E2E-56 liste Projets : « Modifier <nom> » modifie nom et code sans passer par la fiche', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await creerProjet(page, 'R1-56', 'Projet R1-56');
  await page.getByRole('button', { name: 'Modifier Projet R1-56' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('R1-56B');
  await dialog.getByLabel('Nom').fill('Projet R1-56 renommé');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name: /R1-56B.*Projet R1-56 renommé/ })).toBeVisible();
  await expect(page).toHaveURL(/\/projets$/);
});

test('E2E-57 liste Modèles : « Modifier <nom> » pour l’administrateur, rien pour un chef de projet', async ({
  page,
  browser,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef R1-57', 'chef-r1-57@rex1.test', 'chef_de_projet');
  await loginAsAdmin(page);
  await allerA(page, 'Modèles');
  await page.getByRole('button', { name: 'Nouveau modèle' }).click();
  const creation = page.getByRole('dialog');
  await creation.getByLabel('Code').fill('R1-57');
  await creation.getByLabel('Nom').fill('Modèle R1-57');
  await creation.getByLabel('Date de début').fill('2027-01-04');
  await creation.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: /Modèle R1-57/ })).toBeVisible();

  await page.getByRole('button', { name: 'Modifier Modèle R1-57' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill('R1-57B');
  await dialog.getByLabel('Nom').fill('Modèle R1-57 renommé');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name: /R1-57B.*Modèle R1-57 renommé/ })).toBeVisible();

  // Chef de projet : le modèle est listé, sans bouton « Modifier ».
  const chef = await pageNeuve(browser);
  await connecterAvec(chef, 'chef-r1-57@rex1.test');
  await allerA(chef, 'Modèles');
  await expect(chef.getByRole('row', { name: /Modèle R1-57 renommé/ })).toBeVisible();
  await expect(chef.getByRole('button', { name: /^Modifier/ })).toHaveCount(0);
  await chef.context().close();
});

test('E2E-58 chef de projet sur son projet : pas de champ « Chef de projet »', async ({
  page,
  browser,
  request,
}) => {
  const api = await preparer(request);
  await api.utilisateur('Chef R1-58', 'chef-r1-58@rex1.test', 'chef_de_projet');
  const chef = await pageNeuve(browser);
  await connecterAvec(chef, 'chef-r1-58@rex1.test');
  await allerA(chef, 'Projets');
  await chef.getByRole('button', { name: 'Nouveau projet' }).click();
  const creation = chef.getByRole('dialog');
  await creation.getByLabel('Code').fill('R1-58');
  await creation.getByLabel('Nom').fill('Projet R1-58');
  await creation.getByLabel('Pas avant le').fill('2027-01-04');
  await creation.getByRole('button', { name: 'Créer' }).click();
  await expect(chef.getByRole('row', { name: /Projet R1-58/ })).toBeVisible();
  await chef.getByRole('link', { name: 'Projet R1-58' }).click();
  await chef.getByRole('button', { name: 'Modifier le projet' }).click();
  const dialogChef = chef.getByRole('dialog');
  // Le dialogue complet existe (champ Code) mais sans chef de projet.
  await expect(dialogChef.getByLabel('Code')).toBeVisible();
  await expect(dialogChef.getByLabel('Chef de projet')).toHaveCount(0);
  await chef.context().close();

  // Témoin : l'administrateur, sur le même projet, a le champ.
  await loginAsAdmin(page);
  await allerA(page, 'Projets');
  await page.getByRole('link', { name: 'Projet R1-58' }).click();
  await page.getByRole('button', { name: 'Modifier le projet' }).click();
  await expect(page.getByRole('dialog').getByLabel('Chef de projet')).toBeVisible();
});
