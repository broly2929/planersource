import { expect, type APIRequestContext } from '@playwright/test';
import { preparer } from './lot1-helpers.js';

/** Une saisie de l'API : une demi-journée d'une assignation. */
export interface SaisieApi {
  assignation_id: number;
  jour: string;
  demi_journee: 'matin' | 'apres_midi';
}

/**
 * Jeu de données du lot 2e-E (D-060), créé par l'API : projet début 04/01/2027, un chef,
 * Alice affectée, une activité MAN assignée à Alice. `suffixe` rend les noms uniques par test.
 */
export async function monde(request: APIRequestContext, suffixe: string) {
  const api = await preparer(request);
  const emailChef = `chef-${suffixe.toLowerCase()}@example.test`;
  const emailAlice = `alice-${suffixe.toLowerCase()}@example.test`;
  const chef = await api.utilisateur(`Chef ${suffixe}`, emailChef, 'chef_de_projet');
  const alice = await api.utilisateur(`Alice ${suffixe}`, emailAlice, 'ressource', true);
  const projet = await api.projet(`P-${suffixe}`, `Projet ${suffixe}`, chef.id);
  await api.affectation(projet.id, alice.id);
  const nomMan = `Manuelle ${suffixe}`;
  const man = await activite(request, projet.id, nomMan, 'MAN');
  const assignation = await api.assignation(man.id, alice.id, 2);
  return {
    api,
    chef,
    alice,
    projet,
    man,
    nomMan,
    assignation,
    nomAlice: `Alice ${suffixe}`,
    projetNom: `Projet ${suffixe}`,
    emailChef,
    emailAlice,
  };
}

/** Crée une activité avec un mode donné (le helper existant ne passe que le nom). */
export async function activite(
  request: APIRequestContext,
  projetId: number,
  nom: string,
  mode: string,
): Promise<{ id: number }> {
  const r = await request.fetch(`/api/projets/${projetId}/activites`, {
    method: 'POST',
    data: { nom, mode },
  });
  expect(r.ok(), `POST activité ${nom} : ${r.status()} ${await r.text()}`).toBeTruthy();
  return (await r.json()) as { id: number };
}

/** Clôt une activité par l'API. */
export async function clore(request: APIRequestContext, activiteId: number): Promise<void> {
  const r = await request.fetch(`/api/activites/${activiteId}`, {
    method: 'PATCH',
    data: { close: true },
  });
  expect(r.ok(), `PATCH close : ${r.status()} ${await r.text()}`).toBeTruthy();
}

/** Remplace les saisies d'un mois par l'API (préparation des données). */
export async function poserSaisies(
  request: APIRequestContext,
  activiteId: number,
  mois: string,
  saisies: SaisieApi[],
): Promise<void> {
  const r = await request.fetch(`/api/activites/${activiteId}/saisies?mois=${mois}`, {
    method: 'PUT',
    data: { saisies },
  });
  expect(r.ok(), `PUT saisies ${mois} : ${r.status()} ${await r.text()}`).toBeTruthy();
}

/** Saisies d'un mois lues par l'API (vérification de l'état en base). */
export async function lireSaisies(
  request: APIRequestContext,
  activiteId: number,
  mois: string,
): Promise<SaisieApi[]> {
  const r = await request.get(`/api/activites/${activiteId}/saisies?mois=${mois}`);
  expect(r.ok(), `GET saisies ${mois} : ${r.status()} ${await r.text()}`).toBeTruthy();
  return ((await r.json()) as { saisies: SaisieApi[] }).saisies;
}

/** Libellé accessible d'une demi-case : « <ressource>, <jour> <mois>, matin|après-midi ». */
export const libelleCase = (
  ressource: string,
  jour: number,
  moisTexte: string,
  demi: 'matin' | 'après-midi',
): string => `${ressource}, ${jour} ${moisTexte}, ${demi}`;
