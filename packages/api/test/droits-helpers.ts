import type { LightMyRequestResponse } from 'fastify';
import { expect } from 'vitest';
import type { Role, TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  creerProjet,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import {
  creerActivite,
  creerAssignation,
  creerDependance,
  creerJalon,
  type Objet,
} from './lot1-t2-helpers.js';
import { empreinte } from './lot2a-helpers.js';
import { ajouterTaux, ajouterTauxEquipe } from './taux-helpers.js';

/**
 * Lot droits, tranche 1 (D-265) : jeu de données de SPEC §2, « Lecture élargie du chef et rôle
 * leader métier (droits, D-265) », point 7 (cas DR-1 à DR-39).
 */

/** Date du jour du serveur : après la semaine S1, pour que les imputations ne soient pas futures. */
export const JOUR = '2027-01-15';
export const S1 = '2027-01-04';
export const INTERDIT = { erreur: 'Interdit' };
export const CHEF_REFUSE = { erreur: 'Seul l’administrateur désigne le chef de projet' };

/** Rôle ajouté par D-265 (migration 018) ; absent du type `Role` des aides existantes. */
export const LEADER = 'leader_metier' as unknown as Role;

/** Clés sous `voit_finances` (D-265 (3)). */
export const CLES_FINANCES = [
  'charge_vendue',
  'marge',
  'cout_planifie',
  'cout_impute',
  'cout_reel',
  'taux_manquant',
] as const;
/** Clés de la date client, sous `peut_ecrire`. */
export const CLES_CLIENT = ['date_client', 'ecart_client', 'engagement_depasse'] as const;
/** Les huit clés de `projet.totaux` pour qui voit les finances (DR-15, DR-39). */
export const TOTAUX_COMPLETS = [
  'charge_assignee',
  'charge_reelle',
  'charge_vendue',
  'cout_impute',
  'cout_planifie',
  'cout_reel',
  'marge',
  'taux_manquant',
];

export interface MondeDroits {
  admin: Acteur;
  /** C : chef de P (et donc de P1). */
  chef: Acteur;
  /** H : chef de Q, ni chef ni affecté sur P. */
  horsPortee: Acteur;
  /** L : leader métier, `est_ressource`, affecté à P et assigné sur `fp2` (absent si sansLeader). */
  leader: Acteur | null;
  /** Alice : ressource affectée à P et à Q, assignée sur `fp` et `fq`, feuille de S1 soumise. */
  alice: Acteur;
  /** Zoé : ressource affectée à P seulement. */
  zoe: Acteur;
  p: Objet;
  p1: Objet;
  q: Objet;
  m: Objet;
  fp: Objet;
  fp2: Objet;
  jp: Objet;
  fq: Objet;
  aliceFp: Objet;
  aliceFq: Objet;
  leaderFp2: Objet | null;
  equipe: { id: number };
  tauxAlice: { id: number };
  tauxEquipe: { id: number };
  feuilleAlice: number;
}

/** Requête quelconque (PUT compris) avec la session d'un acteur. */
export function requete(
  ctx: TestCtx,
  qui: Acteur | undefined,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  payload?: unknown,
): Promise<LightMyRequestResponse> {
  return ctx.app.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Corps }),
    headers: qui ? { cookie: qui.cookie } : {},
  });
}

/** Refus attendu : statut, corps exact si donné, base identique (empreinte de toutes les tables). */
export async function refusSansEffet(
  ctx: TestCtx,
  statut: number,
  envoyer: () => Promise<LightMyRequestResponse>,
  attendu?: unknown,
  libelle = '',
): Promise<void> {
  const avant = await empreinte(ctx);
  const res = await envoyer();
  expect(res.statusCode, `${libelle} ${res.body}`.trim()).toBe(statut);
  if (attendu !== undefined) expect(res.json(), libelle).toEqual(attendu);
  expect(await empreinte(ctx), `base inchangée ${libelle}`.trim()).toEqual(avant);
}

/** Toutes les clés d'un objet JSON, à toute profondeur. */
export function clesProfondes(v: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => clesProfondes(x, acc));
  else if (v !== null && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      acc.add(k);
      clesProfondes(x, acc);
    }
  }
  return acc;
}

/** GET attendu en 200, corps JSON. */
export async function lire<T = Corps>(ctx: TestCtx, qui: Acteur, url: string): Promise<T> {
  const res = await appel(ctx, qui).get(url);
  expect(res.statusCode, `${url} ${res.body}`).toBe(200);
  return res.json() as T;
}

/**
 * Crée le monde de DR-1 à DR-39. Tout passe par l'API (administrateur), sauf la création des
 * comptes et des affectations (aides existantes, en base). Le leader est créé avec le rôle
 * `leader_metier` : tant que la migration 018 manque, la contrainte CHECK refuse l'insertion.
 */
export async function creerMondeDroits(
  ctx: TestCtx,
  options: { sansLeader?: boolean } = {},
): Promise<MondeDroits> {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const horsPortee = await creerActeur(ctx, 'horsportee@example.test', 'chef_de_projet');
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const zoe = await creerActeur(ctx, 'zoe@example.test', 'ressource', true);
  const leader = options.sansLeader
    ? null
    : await creerActeur(ctx, 'leader@example.test', LEADER, true);

  const p = await creerProjet(ctx, admin, { code: 'PDR', nom: 'Projet P', chef_id: chef.id });
  const p1 = await creerProjet(ctx, admin, {
    code: 'PDR1',
    nom: 'Sous-projet P1',
    chef_id: chef.id,
    parent_id: p.id,
  });
  const q = await creerProjet(ctx, admin, {
    code: 'QDR',
    nom: 'Projet Q',
    chef_id: horsPortee.id,
  });
  const resM = await appel(ctx, admin).post('/api/modeles', {
    code: 'MDR',
    nom: 'Modèle M',
    date_debut: '2027-01-04',
  });
  expect(resM.statusCode, resM.body).toBe(201);
  const m = corps(resM) as Objet;

  await affecter(ctx, p.id, alice.id);
  await affecter(ctx, q.id, alice.id);
  await affecter(ctx, p.id, zoe.id);
  if (leader) await affecter(ctx, p.id, leader.id);

  const fp = await creerActivite(ctx, admin, p.id, { nom: 'Feuille P', charge_vendue: 10 });
  const fp2 = await creerActivite(ctx, admin, p.id, { nom: 'Feuille P2' });
  const jp = await creerJalon(ctx, admin, p.id, { nom: 'Jalon P', date_client: '2027-02-01' });
  await creerDependance(ctx, admin, p.id, fp.id, fp2.id);
  const fq = await creerActivite(ctx, admin, q.id, { nom: 'Feuille Q' });
  const aliceFp = await creerAssignation(ctx, admin, fp.id, alice.id, { charge_assignee: 5 });
  const aliceFq = await creerAssignation(ctx, admin, fq.id, alice.id, { charge_assignee: 3 });
  await creerAssignation(ctx, admin, fp2.id, zoe.id, { charge_assignee: 1 });
  const leaderFp2 = leader
    ? await creerAssignation(ctx, admin, fp2.id, leader.id, { charge_assignee: 2 })
    : null;

  const resEquipe = await appel(ctx, admin).post('/api/equipes', { nom: 'Dev' });
  expect(resEquipe.statusCode, resEquipe.body).toBe(201);
  const equipe = corps(resEquipe) as { id: number };
  const tauxEquipe = await ajouterTauxEquipe(ctx, admin, equipe.id, {
    debut: '2027-01-01',
    montant: 400,
  });
  const tauxAlice = await ajouterTaux(ctx, admin, alice.id, { debut: '2027-01-01', montant: 600 });

  // Feuille d'Alice, semaine S1 : imputations sur P et sur Q, puis soumise.
  const put = await requete(ctx, alice, 'PUT', `/api/feuilles?semaine=${S1}`, {
    lignes: [
      { assignation_id: aliceFp.id, imputations: [{ jour: '2027-01-05', charge: 1 }] },
      { assignation_id: aliceFq.id, imputations: [{ jour: '2027-01-06', charge: 1 }] },
    ],
  });
  expect(put.statusCode, put.body).toBe(200);
  const feuilleAlice = (put.json() as { feuille: { id: number } }).feuille.id;
  const soumise = await requete(ctx, alice, 'POST', `/api/feuilles/${feuilleAlice}/soumettre`, {});
  expect(soumise.statusCode, soumise.body).toBe(200);

  return {
    admin,
    chef,
    horsPortee,
    leader,
    alice,
    zoe,
    p,
    p1,
    q,
    m,
    fp,
    fp2,
    jp,
    fq,
    aliceFp,
    aliceFq,
    leaderFp2,
    equipe,
    tauxAlice,
    tauxEquipe,
    feuilleAlice,
  };
}

/** Le leader du monde (créé sauf `sansLeader`). */
export const leaderDe = (m: MondeDroits): Acteur => {
  expect(m.leader).not.toBeNull();
  return m.leader!;
};
