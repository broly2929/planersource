// Aides du lot 3c (Calcul, D-074). Les aides de création par l'écran sont dupliquées de rex1.spec.ts
// (qui ne change pas) ; les autres préparent les données par l'API.
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import pg from 'pg';
import { E2E_ADMIN } from './credentials.js';
import { MOT_DE_PASSE, preparer } from './lot1-helpers.js';

export const NOM_ADMIN = 'Admin E2E';
/** Horloge du navigateur figée : D0 prérempli = 2027-01-06 (mercredi). */
export const J06 = '2027-01-06T10:00:00';
export const D0_FIGE = '2027-01-06';

/** Remet la base de test dans l'état « administrateur seul ». Refuse toute base hors *_test. */
export async function remettreAdminSeul(): Promise<void> {
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

export async function allerA(page: Page, lien: string): Promise<void> {
  await page.getByRole('link', { name: lien, exact: true }).click();
  await expect(page.getByRole('heading', { name: lien, level: 1 })).toBeVisible();
}

/** Création d'un utilisateur ressource par l'écran Utilisateurs (administrateur connecté). */
export async function creerRessourceParEcran(
  page: Page,
  nom: string,
  email: string,
  calendrier: string,
): Promise<void> {
  await allerA(page, 'Utilisateurs');
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(nom);
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  await expect(dialog.getByRole('checkbox', { name: 'Ressource planifiable' })).toBeChecked();
  await dialog.getByLabel('Calendrier').selectOption({ label: calendrier });
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(nom) })).toBeVisible();
}

/** Création d'un projet par l'écran Projets (administrateur : chef choisi dans la liste). */
export async function creerProjetParEcran(page: Page, code: string, nom: string): Promise<void> {
  await allerA(page, 'Projets');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Code').fill(code);
  await dialog.getByLabel('Nom').fill(nom);
  await dialog.getByLabel('Chef de projet').selectOption({ label: NOM_ADMIN });
  await dialog.getByLabel('Pas avant le').fill('2027-01-04');
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('row', { name: new RegExp(nom) })).toBeVisible();
}

type Api = Awaited<ReturnType<typeof preparer>>;

/** Un chef de projet (créé par l'API) et le contexte d'API de l'administrateur. */
export async function base3c(request: APIRequestContext) {
  const api = await preparer(request);
  const chef = await api.utilisateur('Chef 3C', 'chef-3c@lot3c.test', 'chef_de_projet');
  return { api, chef };
}

/** Projet racine du chef avec une ressource affectée et une activité ASAP de `jours` jours. */
export async function projetPret(api: Api, chefId: number, code: string, jours = 2) {
  const projet = await api.projet(code, `Projet ${code}`, chefId);
  const ressource = await api.utilisateur(
    `Ressource ${code}`,
    `ressource-${code.toLowerCase()}@lot3c.test`,
    'ressource',
    true,
  );
  await api.affectation(projet.id, ressource.id);
  const activite = await api.activite(projet.id, `Activité ${code}`);
  const assignation = await api.assignation(activite.id, ressource.id, jours);
  return { projet, ressource, activite, assignation, nomActivite: `Activité ${code}` };
}

export const adresseGantt = (projetId: number) => `/projets/${projetId}?onglet=gantt`;

/** Réponse de GET /api/projets/:id/gantt, lue avec la session de `request`. */
export async function lireGantt(request: APIRequestContext, projetId: number) {
  const r = await request.get(`/api/projets/${projetId}/gantt`);
  expect(r.ok(), `GET gantt ${projetId} : ${r.status()}`).toBeTruthy();
  return (await r.json()) as {
    projet: { peut_ecrire: boolean };
    elements: {
      id: number;
      nom: string;
      debut_planifie: string | null;
      fin_planifiee: string | null;
    }[];
  };
}

/** Le dialogue « Calculer le planning » et ses éléments. */
export const dialogueCalcul = (page: Page) =>
  page.getByRole('dialog', { name: 'Calculer le planning' });

/** Tous les boutons « Calculer » de la page (barre d'outils et bandeau ; le dialogue ouvert les masque). */
export const boutonsCalculer = (page: Page) =>
  page.getByRole('button', { name: 'Calculer', exact: true });

/** Ouvre le dialogue par le bouton de la barre d'outils du Gantt (le premier dans l'ordre du document). */
export async function ouvrirDialogueCalcul(page: Page) {
  await boutonsCalculer(page).first().click();
  const dialogue = dialogueCalcul(page);
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByText('Chargement des projets…')).toBeHidden();
  return dialogue;
}

export const libellesCases = (dialogue: ReturnType<typeof dialogueCalcul>) =>
  dialogue
    .getByRole('checkbox')
    .evaluateAll((cases) =>
      cases.map((c) => (c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''),
    );

export const etatsCases = (dialogue: ReturnType<typeof dialogueCalcul>) =>
  dialogue
    .getByRole('checkbox')
    .evaluateAll((cases) => cases.map((c) => (c as HTMLInputElement).checked));

/** Notification de retour (role=status ou alert) contenant `texte`. */
export const notification = (page: Page, texte: string) =>
  page.locator('[role="status"], [role="alert"]').filter({ hasText: texte });

export const bandeauNonCalcule = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Planning non calculé' });
