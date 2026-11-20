import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { E2E_ADMIN } from './credentials.js';

/** Mot de passe de tous les utilisateurs créés par les tests du lot 1. */
export const MOT_DE_PASSE = 'mot-de-passe-e2e-lot1';

export type Role = 'administrateur' | 'chef_de_projet' | 'ressource';

/** Ouvre une session administrateur sur un contexte d'API neuf (préparation des données). */
export async function preparer(request: APIRequestContext) {
  const res = await request.post('/api/auth/login', {
    data: { email: E2E_ADMIN.email, mot_de_passe: E2E_ADMIN.motDePasse },
  });
  expect(res.ok(), 'connexion API de l’administrateur').toBeTruthy();

  const envoyer = async (
    methode: 'POST' | 'PATCH',
    adresse: string,
    data: Record<string, unknown>,
  ): Promise<{ id: number }> => {
    const r = await request.fetch(adresse, { method: methode, data });
    expect(r.ok(), `${methode} ${adresse} : ${r.status()} ${await r.text()}`).toBeTruthy();
    return (await r.json()) as { id: number };
  };

  return {
    utilisateur: (nom: string, email: string, role: Role, estRessource = false) =>
      envoyer('POST', '/api/utilisateurs', {
        nom,
        email,
        mot_de_passe: MOT_DE_PASSE,
        role,
        est_ressource: estRessource,
      }),
    projet: (code: string, nom: string, chefId: number) =>
      envoyer('POST', '/api/projets', { code, nom, chef_id: chefId, date_debut: '2027-01-04' }),
    modele: (code: string, nom: string) =>
      envoyer('POST', '/api/modeles', { code, nom, date_debut: '2027-01-04' }),
    affectation: (projetId: number, ressourceId: number) =>
      envoyer('POST', `/api/projets/${projetId}/affectations`, { ressource_id: ressourceId }),
    activite: (projetId: number, nom: string) =>
      envoyer('POST', `/api/projets/${projetId}/activites`, { nom }),
    jalon: (projetId: number, nom: string) =>
      envoyer('POST', `/api/projets/${projetId}/jalons`, { nom }),
    assignation: (activiteId: number, ressourceId: number, charge: number) =>
      envoyer('POST', `/api/activites/${activiteId}/assignations`, {
        ressource_id: ressourceId,
        charge_assignee: charge,
      }),
    dependance: (projetId: number, predecesseurId: number, successeurId: number) =>
      envoyer('POST', `/api/projets/${projetId}/dependances`, {
        predecesseur_id: predecesseurId,
        successeur_id: successeurId,
      }),
    calendrier: (nom: string) => envoyer('POST', '/api/calendriers', { nom }),
    ferie: (calendrierId: number, jour: string, libelle: string) =>
      envoyer('POST', `/api/calendriers/${calendrierId}/feries`, { jour, libelle }),
  };
}

/** Connexion par l'écran de connexion, avec un utilisateur créé par `preparer`. */
export async function connecterAvec(page: Page, email: string): Promise<void> {
  await page.goto('/connexion');
  await page.getByLabel('Identifiant').fill(email);
  await page.getByLabel('Mot de passe').fill(MOT_DE_PASSE);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL('/');
}
