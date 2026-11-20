// Aides du lot 6a (équipes, D-147). Base « administrateur seul » équipes comprises ; données préparées par
// l'API sauf dans les tests « par l'écran » ; lecture de la base par SQL (refus : base inchangée).
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import pg from 'pg';
import { MOT_DE_PASSE, preparer } from './lot1-helpers.js';
import { allerA, remettreAdminSeul } from './lot3c-helpers.js';

async function avecBase<T>(f: (c: pg.Client) => Promise<T>): Promise<T> {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await f(client);
  } finally {
    await client.end();
  }
}

/** Base « administrateur seul » : l'équipe de l'administrateur est retirée, puis les équipes supprimées. */
export async function remettreAdminSeul6a(): Promise<void> {
  const existe = await avecBase(
    async (c) => (await c.query("SELECT to_regclass('equipe') AS t")).rows[0].t !== null,
  );
  if (existe) await avecBase((c) => c.query('UPDATE utilisateur SET equipe_id = NULL'));
  await remettreAdminSeul();
  if (existe) await avecBase((c) => c.query('DELETE FROM equipe'));
}

export interface EquipeBase {
  id: number;
  nom: string;
}

/** Équipes en base, par identifiant. */
export const equipesEnBase = (): Promise<EquipeBase[]> =>
  avecBase(async (c) => (await c.query('SELECT id, nom FROM equipe ORDER BY id')).rows);

/** Équipe d'un utilisateur (null si aucune), par son nom. */
export const equipeDe = (nomUtilisateur: string): Promise<number | null> =>
  avecBase(async (c) => {
    const r = await c.query('SELECT equipe_id FROM utilisateur WHERE nom = $1', [nomUtilisateur]);
    expect(r.rowCount, `utilisateur ${nomUtilisateur}`).toBe(1);
    return r.rows[0].equipe_id as number | null;
  });

/** Relevé complet des tables equipe et utilisateur : une chaîne par ligne. */
export const releve6a = (): Promise<string[]> =>
  avecBase(async (c) => {
    const e = await c.query("SELECT 'e:' || t::text AS l FROM equipe t ORDER BY 1");
    const u = await c.query("SELECT 'u:' || t::text AS l FROM utilisateur t ORDER BY 1");
    return [...e.rows, ...u.rows].map((r) => r.l as string);
  });

/** Équipe créée par l'API (administrateur connecté sur `request`). */
export async function equipeApi(request: APIRequestContext, nom: string): Promise<number> {
  await preparer(request);
  const r = await request.post('/api/equipes', { data: { nom } });
  expect(r.status(), `POST /api/equipes ${nom}`).toBe(201);
  return ((await r.json()) as { id: number }).id;
}

/** Utilisateur ressource créé par l'API, éventuellement dans une équipe. */
export async function utilisateurApi(
  request: APIRequestContext,
  nom: string,
  email: string,
  equipeId?: number,
): Promise<number> {
  await preparer(request);
  const r = await request.post('/api/utilisateurs', {
    data: {
      nom,
      email,
      mot_de_passe: MOT_DE_PASSE,
      role: 'ressource',
      est_ressource: true,
      ...(equipeId === undefined ? {} : { equipe_id: equipeId }),
    },
  });
  expect(r.status(), `POST /api/utilisateurs ${nom}`).toBe(201);
  return ((await r.json()) as { id: number }).id;
}

export const nav = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });
export const tableauEquipes = (page: Page) =>
  page.getByRole('table', { name: 'Liste des équipes' });
export const ligneEquipe = (page: Page, nom: string) =>
  tableauEquipes(page).getByRole('row', { name: new RegExp(`^${nom}\\b`) });

/** Ouvre l'écran Équipes par la navigation. */
export const ouvrirEquipes = (page: Page) => allerA(page, 'Équipes');

/** Création d'une équipe par l'écran (dialogue « Nouvelle équipe »), succès attendu. */
export async function creerEquipeParEcran(page: Page, nom: string): Promise<void> {
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(nom);
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(ligneEquipe(page, nom)).toBeVisible();
}

/** Contenu des cellules de la colonne `titre` d'un tableau, pour la ligne de `nom`. */
export async function cellule(tableau: Locator, nom: string, titre: string): Promise<Locator> {
  await expect(tableau.getByRole('columnheader', { name: titre, exact: true })).toBeVisible();
  const entetes = await tableau.getByRole('columnheader').allTextContents();
  const i = entetes.findIndex((t) => t.trim() === titre);
  expect(i, `colonne ${titre}`).toBeGreaterThanOrEqual(0);
  return tableau
    .getByRole('row', { name: new RegExp(nom) })
    .getByRole('cell')
    .nth(i);
}

/** Libellés des options d'une liste. */
export const options = (liste: Locator): Promise<string[]> =>
  liste.locator('option').allTextContents();

/** Libellé de l'option sélectionnée d'une liste. */
export const choix = (liste: Locator): Promise<string> =>
  liste.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');

/** Corps JSON des requêtes `methode` vers `motif`, relayées au serveur. */
export async function espionner(page: Page, motif: string, methode: string): Promise<unknown[]> {
  const corps: unknown[] = [];
  await page.route(motif, async (route) => {
    if (route.request().method() === methode) corps.push(route.request().postDataJSON());
    await route.continue();
  });
  return corps;
}
