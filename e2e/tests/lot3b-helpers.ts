import { expect, type APIRequestContext } from '@playwright/test';
import { preparer, type Role } from './lot1-helpers.js';

/** Appel d'API avec succès attendu. */
async function envoyer(
  request: APIRequestContext,
  methode: 'POST' | 'PATCH',
  adresse: string,
  data: Record<string, unknown>,
): Promise<{ id: number }> {
  const r = await request.fetch(adresse, { method: methode, data });
  expect(r.ok(), `${methode} ${adresse} : ${r.status()} ${await r.text()}`).toBeTruthy();
  return (await r.json()) as { id: number };
}

/** Calcul par l'API (D0 = 2027-01-04, D-066) ; l'administrateur est connecté sur `request`. */
export async function calculer(request: APIRequestContext, projets: number[]): Promise<void> {
  const r = await request.fetch('/api/calcul', {
    method: 'POST',
    data: { projets, d0: '2027-01-04' },
  });
  expect(r.ok(), `POST /api/calcul : ${r.status()} ${await r.text()}`).toBeTruthy();
}

/** Activité avec champs libres (mode, dates validées, parent_id…). */
export const activiteAvec = (
  request: APIRequestContext,
  projetId: number,
  nom: string,
  champs: Record<string, unknown> = {},
) => envoyer(request, 'POST', `/api/projets/${projetId}/activites`, { nom, ...champs });

/** Jalon avec champs libres (type, date_validee…). */
export const jalonAvec = (
  request: APIRequestContext,
  projetId: number,
  nom: string,
  champs: Record<string, unknown> = {},
) => envoyer(request, 'POST', `/api/projets/${projetId}/jalons`, { nom, ...champs });

/** Sous-projet direct de `parentId`. */
export const sousProjet = (
  request: APIRequestContext,
  parentId: number,
  code: string,
  nom: string,
  chefId: number,
) =>
  envoyer(request, 'POST', '/api/projets', {
    code,
    nom,
    chef_id: chefId,
    parent_id: parentId,
    date_debut: '2027-01-04',
  });

/** Dépendance avec type libre. */
export const lier = (
  request: APIRequestContext,
  projetId: number,
  predecesseurId: number,
  successeurId: number,
  type = 'FD',
) =>
  envoyer(request, 'POST', `/api/projets/${projetId}/dependances`, {
    predecesseur_id: predecesseurId,
    successeur_id: successeurId,
    type,
  });

/** Un chef, des ressources affectées au projet, un projet début 04/01/2027. */
export async function monde3b(request: APIRequestContext, suffixe: string, ressources: string[]) {
  const api = await preparer(request);
  const s = suffixe.toLowerCase();
  const emailChef = `chef-${s}@example.test`;
  const chef = await api.utilisateur(`Chef ${suffixe}`, emailChef, 'chef_de_projet');
  const projet = await api.projet(`P-${suffixe}`, `Projet ${suffixe}`, chef.id);
  const gens: Record<string, { id: number; email: string }> = {};
  for (const nom of ressources) {
    const email = `${nom.toLowerCase()}-${s}@example.test`;
    const u = await api.utilisateur(`${nom} ${suffixe}`, email, 'ressource' as Role, true);
    await api.affectation(projet.id, u.id);
    gens[nom] = { id: u.id, email };
  }
  return { api, chef, emailChef, projet, gens };
}
