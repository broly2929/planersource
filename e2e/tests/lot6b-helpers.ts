// Lot 6b (D-148) : assistants partagés par les révisions D-031 de 6b et les e2e de 6b.
import type { APIRequestContext, Page } from '@playwright/test';
import pg from 'pg';
import { preparer } from './lot1-helpers.js';
import { remettreAdminSeul4b } from './lot4b-helpers.js';
import { remettreAdminSeul6a } from './lot6a-helpers.js';

/**
 * Témoin « lecture seule » d'un écran de projet (D-148 (9)) : chef de projet `est_ressource`, affecté
 * au(x) projet(s) d'un autre chef. Renvoie son email (mot de passe des tests du lot 1).
 */
export async function chefLecteur(
  request: APIRequestContext,
  projets: number | number[],
  suffixe: string,
): Promise<string> {
  const api = await preparer(request);
  const email = `lecteur-${suffixe.toLowerCase()}@lot6b.test`;
  const u = await api.utilisateur(`Lecteur ${suffixe}`, email, 'chef_de_projet', true);
  for (const id of Array.isArray(projets) ? projets : [projets]) await api.affectation(id, u.id);
  return email;
}

// --- E2E de 6b (E2E-347 à E2E-355) ---

/** Base « administrateur seul » : feuilles (4b), puis utilisateurs, projets et équipes (6a). */
export async function remettreAdminSeul6b(): Promise<void> {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
}

export const nav = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });
export const titreMesTaches = (page: Page) =>
  page.getByRole('heading', { name: 'Mes tâches', level: 1 });
export const tableauMesTaches = (page: Page) => page.getByRole('table', { name: 'Mes tâches' });
export const lignesMesTaches = (page: Page) => tableauMesTaches(page).locator('tbody tr');

/** AAAA-MM-JJ → JJ/MM/AAAA. */
export const jjmmaaaa = (jour: string): string => jour.split('-').reverse().join('/');

/** Charges assignées (texte SQL) des assignations de l'utilisateur d'email `email`, relues en base. */
export async function chargesEnBase(email: string): Promise<string[]> {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ charge: string }>(
      `SELECT a.charge_assignee::text AS charge FROM assignation a
         JOIN utilisateur u ON u.id = a.ressource_id
        WHERE u.email = $1 ORDER BY a.id`,
      [email],
    );
    return rows.map((r) => r.charge);
  } finally {
    await client.end();
  }
}
