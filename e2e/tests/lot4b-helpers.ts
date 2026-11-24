// Aides du lot 4b (écran Feuille de temps, D-120). Données préparées par l'API ; base « administrateur
// seul » remise à zéro, feuilles de temps comprises (la clé étrangère de `feuille_temps` vers
// `utilisateur` empêche sinon `remettreAdminSeul` de supprimer la ressource).
import {
  expect,
  type APIRequestContext,
  type Page,
  type PlaywrightWorkerArgs,
} from '@playwright/test';
import pg from 'pg';
import { URL_WEB } from '../pile-worker.js';
import { MOT_DE_PASSE, preparer } from './lot1-helpers.js';
import { remettreAdminSeul } from './lot3c-helpers.js';

/** Horloge du navigateur : mercredi 14/01/2026 (date du serveur réelle, postérieure). */
export const H14 = '2026-01-14T10:00:00';
/** Semaine courante du navigateur et semaine précédente. */
export const S = '2026-01-12';
export const SP = '2026-01-05';
export const jS = (n: number): string => `2026-01-${String(n).padStart(2, '0')}`;

export const EMAIL_ALICE = 'alice-4b@lot4b.test';
export const EMAIL_CHEF_P = 'chef-p-4b@lot4b.test';

export interface Imputation {
  jour: string;
  charge: number;
}
export interface LigneApi {
  assignation_id: number;
  projet_code: string;
  activite_nom: string;
  wbs: string;
  assignee: number;
  reel_cumule: number;
  reste: number;
  modifiable: boolean;
  imputations: Imputation[];
}
export interface FeuilleApi {
  feuille: {
    id: number | null;
    statut: string;
    commentaire: string | null;
    validations: { projet_id: number }[];
  };
  lignes: LigneApi[];
}

/** Base « administrateur seul », feuilles de temps et validations supprimées d'abord. */
export async function remettreAdminSeul4b(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? '';
  if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL doit désigner une base dont le nom finit par _test');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('TRUNCATE feuille_temps RESTART IDENTITY CASCADE');
  } finally {
    await client.end();
  }
  await remettreAdminSeul();
}

/** Contexte d'API neuf connecté avec `email` (mot de passe des tests). */
export async function sessionDe(
  playwright: PlaywrightWorkerArgs['playwright'],
  email: string,
): Promise<APIRequestContext> {
  const ctx = await playwright.request.newContext({ baseURL: URL_WEB });
  const r = await ctx.post('/api/auth/login', { data: { email, mot_de_passe: MOT_DE_PASSE } });
  expect(r.ok(), `connexion API de ${email} : ${r.status()}`).toBeTruthy();
  return ctx;
}

/**
 * Monde du lot 4b : P4B (chef « Chef P 4B ») avec « Tâche A » (Alice, 5 j) ; Q4B (chef « Chef Q 4B »)
 * avec « Tâche B » (Alice, 3 j). Alice : ressource, capacité 1, calendrier par défaut (lundi à
 * vendredi). WBS : « 1 Tâche A », « 1 Tâche B ». `request` reste connecté en administrateur.
 */
export async function monde4b(request: APIRequestContext, { avecB = true } = {}) {
  const api = await preparer(request);
  const chefP = await api.utilisateur('Chef P 4B', EMAIL_CHEF_P, 'chef_de_projet');
  const chefQ = await api.utilisateur('Chef Q 4B', 'chef-q-4b@lot4b.test', 'chef_de_projet');
  const alice = await api.utilisateur('Alice 4B', EMAIL_ALICE, 'ressource', true);
  const p = await api.projet('P4B', 'Projet P4B', chefP.id);
  const q = await api.projet('Q4B', 'Projet Q4B', chefQ.id);
  await api.affectation(p.id, alice.id);
  await api.affectation(q.id, alice.id);
  const a = await api.activite(p.id, 'Tâche A');
  const sa = await api.assignation(a.id, alice.id, 5);
  let b: { id: number } | null = null;
  let sb: { id: number } | null = null;
  if (avecB) {
    b = await api.activite(q.id, 'Tâche B');
    sb = await api.assignation(b.id, alice.id, 3);
  }
  return { api, chefP, chefQ, alice, p, q, a, sa, b: b!, sb: sb! };
}

/** PUT /api/feuilles?semaine=… attendu en 200. */
export async function imputerApi(
  ctx: APIRequestContext,
  semaine: string,
  lignes: { assignation_id: number; imputations: Imputation[]; reste?: number }[],
): Promise<FeuilleApi> {
  const r = await ctx.put(`/api/feuilles?semaine=${semaine}`, { data: { lignes } });
  expect(r.ok(), `PUT feuille ${semaine} : ${r.status()} ${await r.text()}`).toBeTruthy();
  return (await r.json()) as FeuilleApi;
}

/** GET /api/feuilles?semaine=… (sa propre feuille). */
export async function lireFeuilleApi(ctx: APIRequestContext, semaine: string): Promise<FeuilleApi> {
  const r = await ctx.get(`/api/feuilles?semaine=${semaine}`);
  expect(r.ok(), `GET feuille ${semaine} : ${r.status()}`).toBeTruthy();
  return (await r.json()) as FeuilleApi;
}

/** POST /api/feuilles/:id/<verbe> attendu en 200. */
export async function agirApi(
  ctx: APIRequestContext,
  id: number,
  verbe: 'soumettre' | 'rappeler' | 'valider' | 'rejeter',
  data: Record<string, unknown> = {},
): Promise<void> {
  const r = await ctx.post(`/api/feuilles/${id}/${verbe}`, { data });
  expect(r.ok(), `${verbe} : ${r.status()} ${await r.text()}`).toBeTruthy();
}

/** PATCH /api/activites/:id { close: true } (administrateur). */
export async function clore(request: APIRequestContext, activiteId: number): Promise<void> {
  const r = await request.patch(`/api/activites/${activiteId}`, { data: { close: true } });
  expect(r.ok(), `clore ${activiteId} : ${r.status()} ${await r.text()}`).toBeTruthy();
}

/** Imputations d'une ligne lue par l'API (par nom d'activité). */
export const imputationsDe = (f: FeuilleApi, activite: string): Imputation[] | undefined =>
  f.lignes.find((l) => l.activite_nom === activite)?.imputations;

// --- Écran (contrat de phase verte, docs/state.md) ---

export const adresseFeuille = (semaine?: string) =>
  semaine === undefined ? '/imputations' : `/imputations?semaine=${semaine}`;

/** Case de charge : nom accessible « <wbs> <nom>, <jour> », jour au format « lun. 12/01 ». */
export const caseCharge = (page: Page, activite: string, jour: string) =>
  page.getByRole('textbox', { name: `${activite}, ${jour}`, exact: true });
/** Case du reste à faire : « <wbs> <nom>, reste à faire ». */
export const caseReste = (page: Page, activite: string) =>
  page.getByRole('textbox', { name: `${activite}, reste à faire`, exact: true });
export const tableauFeuille = (page: Page) =>
  page.getByRole('table', { name: 'Imputations de la semaine', exact: true });
export const ligneFeuille = (page: Page, assignationId: number) =>
  page.locator(`tr[data-ligne-assignation="${assignationId}"]`);
/** Cellules d'une ligne (th et td), dans l'ordre des colonnes. */
export const cellules = (page: Page, assignationId: number) =>
  ligneFeuille(page, assignationId).locator(':scope > th, :scope > td');
export const totalJour = (page: Page, jour: string) => page.locator(`[data-total-jour="${jour}"]`);
export const depassementJour = (page: Page, jour: string) =>
  page.locator(`[data-depassement-jour="${jour}"]`);
export const statutFeuille = (page: Page) => page.locator('[data-statut-feuille]');
export const bouton = (page: Page, nom: string) =>
  page.getByRole('button', { name: nom, exact: true });
export const alerte = (page: Page, texte: string) =>
  page.getByRole('alert').filter({ hasText: texte });

/** Écritures de feuille envoyées par la page (PUT et POST de /api/feuilles). */
export function ecouterEcritures(page: Page) {
  const ecritures: { methode: string; url: string; corps: unknown }[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/feuilles') && req.method() !== 'GET') {
      ecritures.push({ methode: req.method(), url: req.url(), corps: req.postDataJSON() });
    }
  });
  return ecritures;
}
