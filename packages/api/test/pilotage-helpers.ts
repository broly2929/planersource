// Jeu de données de SPEC §12.5 point 6 (PIL-A à PIL-E) pour les tests du pilotage (D-243).
import { expect } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import type { TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  creerActeur,
  creerProjet,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import { empreinte, tache } from './lot2a-helpers.js';
import { poserTaux } from './couts-helpers.js';

export const MOIS = [
  '2027-01',
  '2027-02',
  '2027-03',
  '2027-04',
  '2027-05',
  '2027-06',
  '2027-07',
  '2027-08',
  '2027-09',
  '2027-10',
  '2027-11',
  '2027-12',
];

export interface Mensuel {
  mois: string;
  reel: number;
  planifie: number;
  cout: number;
  taux_manquant: boolean;
}

/** Douze mois à zéro, sauf ceux donnés : [reel, planifie, cout, taux_manquant?] par mois (AAAA-MM). */
export function mensuel(
  valeurs: Record<string, [number, number, number] | [number, number, number, boolean]> = {},
): Mensuel[] {
  return MOIS.map((mois) => {
    const [reel, planifie, cout, manquant] = valeurs[mois] ?? [0, 0, 0];
    return { mois, reel, planifie, cout, taux_manquant: manquant === true };
  });
}

export const total = (reel: number, planifie: number, cout: number, taux_manquant = false) => ({
  reel,
  planifie,
  cout,
  taux_manquant,
});

export async function nommer(ctx: TestCtx, a: Acteur, nom: string): Promise<Acteur> {
  await ctx.pool.query('UPDATE utilisateur SET nom = $2, capacite = 1 WHERE id = $1', [a.id, nom]);
  return a;
}

export async function equipe(ctx: TestCtx, nom: string): Promise<number> {
  const { rows } = await ctx.pool.query<{ id: number }>(
    'INSERT INTO equipe (nom) VALUES ($1) RETURNING id',
    [nom],
  );
  return rows[0]!.id;
}

export const planifier = (ctx: TestCtx, assignation: number, jour: string, charge: number) =>
  ctx.pool.query(
    'INSERT INTO travail_planifie (assignation_id, jour, charge) VALUES ($1, $2, $3)',
    [assignation, jour, charge],
  );

/** Imputation posée par SQL, sur une feuille du statut donné (tout statut compte). */
export async function imputer(
  ctx: TestCtx,
  assignation: number,
  jour: string,
  charge: number,
  statut: 'brouillon' | 'soumise' | 'validee' | 'rejetee' = 'brouillon',
): Promise<void> {
  await ctx.pool.query(
    `INSERT INTO feuille_temps (ressource_id, lundi, statut)
     SELECT s.ressource_id, date_trunc('week', $2::date)::date, $3
       FROM assignation s WHERE s.id = $1
     ON CONFLICT DO NOTHING`,
    [assignation, jour, statut],
  );
  await ctx.pool.query(
    'INSERT INTO imputation (assignation_id, jour, charge) VALUES ($1, $2, $3)',
    [assignation, jour, charge],
  );
}

export interface ProjetPil {
  id: number;
  code: string;
  nom: string;
}

export interface MondePilotage {
  admin: Acteur;
  chef: Acteur;
  alice: Acteur;
  bob: Acteur;
  carol: Acteur;
  p1: ProjetPil;
  p11: ProjetPil;
}

/** Projet par l'API ; nom = « Nom <code> » sauf indication. */
export async function projet(
  ctx: TestCtx,
  par: Acteur,
  code: string,
  chef: Acteur,
  champs: Corps = {},
): Promise<ProjetPil> {
  const nom = typeof champs.nom === 'string' ? champs.nom : `Nom ${code}`;
  const p = await creerProjet(ctx, par, { code, chef_id: chef.id, ...champs, nom });
  return { id: p.id, code, nom };
}

/** Affecte la ressource au projet (si besoin) et lui assigne une activité ; renvoie l'assignation. */
export async function assigner(
  ctx: TestCtx,
  par: Acteur,
  projetId: number,
  ressource: Acteur,
  nomActivite: string,
): Promise<number> {
  const { rows } = await ctx.pool.query(
    'SELECT 1 FROM affectation_projet WHERE projet_id = $1 AND ressource_id = $2',
    [projetId, ressource.id],
  );
  if (rows.length === 0) await affecter(ctx, projetId, ressource.id);
  const t = await tache(ctx, par, projetId, ressource.id, 1, { nom: nomActivite });
  return t.assignation.id;
}

/**
 * SPEC §12.5 point 6 : taux de §12.3 (Alice 600 puis 700, Bob aucun, Carol 500 en mars) ; P1 (OTP-A) avec
 * PIL-A à PIL-D, sous-projet P1.1 avec PIL-E. Chef de P1 et de P1.1 : `chef`.
 */
export async function creerMondePilotage(ctx: TestCtx): Promise<MondePilotage> {
  const admin = await nommer(
    ctx,
    await creerActeur(ctx, 'admin@pil.test', 'administrateur'),
    'Admin',
  );
  const chef = await nommer(ctx, await creerActeur(ctx, 'chef@pil.test', 'chef_de_projet'), 'Chef');
  const alice = await nommer(
    ctx,
    await creerActeur(ctx, 'alice@pil.test', 'ressource', true),
    'Alice',
  );
  const bob = await nommer(ctx, await creerActeur(ctx, 'bob@pil.test', 'ressource', true), 'Bob');
  const carol = await nommer(
    ctx,
    await creerActeur(ctx, 'carol@pil.test', 'ressource', true),
    'Carol',
  );
  await poserTaux(ctx, alice.id, [
    ['2027-01-01', '2027-01-31', 600],
    ['2027-02-01', null, 700],
  ]);
  await poserTaux(ctx, carol.id, [['2027-03-01', '2027-03-31', 500]]);

  const p1 = await projet(ctx, admin, 'P1', chef, { nom: 'Projet un', otp: 'OTP-A' });
  const p11 = await projet(ctx, admin, 'P1.1', chef, { nom: 'Sous-projet un', parent_id: p1.id });

  const pilA = await assigner(ctx, admin, p1.id, alice, 'PIL-A');
  await imputer(ctx, pilA, '2027-01-29', 1, 'validee');
  await imputer(ctx, pilA, '2027-02-01', 1, 'brouillon');
  await planifier(ctx, pilA, '2027-02-15', 0.5);
  const pilB = await assigner(ctx, admin, p1.id, alice, 'PIL-B');
  await planifier(ctx, pilB, '2027-01-05', 0.25);
  const pilC = await assigner(ctx, admin, p1.id, bob, 'PIL-C');
  await imputer(ctx, pilC, '2027-01-11', 1, 'soumise');
  await planifier(ctx, pilC, '2027-03-10', 2);
  const pilD = await assigner(ctx, admin, p1.id, carol, 'PIL-D');
  await planifier(ctx, pilD, '2027-03-15', 1);
  await planifier(ctx, pilD, '2027-04-02', 1);
  const pilE = await assigner(ctx, admin, p11.id, alice, 'PIL-E');
  await planifier(ctx, pilE, '2027-01-04', 1);
  return { admin, chef, alice, bob, carol, p1, p11 };
}

/** Lignes de ressource attendues pour P1 puis P1.1 (SPEC §12.5 point 6). */
export function ressourcesAttendues(m: MondePilotage) {
  const alice = {
    ressource_id: m.alice.id,
    nom: 'Alice',
    actif: true,
    mois: mensuel({ '2027-01': [600, 150, 750], '2027-02': [700, 350, 1050] }),
    total: total(1300, 500, 1800),
  };
  const bob = {
    ressource_id: m.bob.id,
    nom: 'Bob',
    actif: true,
    mois: mensuel(),
    total: total(0, 0, 0),
  };
  const carol = {
    ressource_id: m.carol.id,
    nom: 'Carol',
    actif: true,
    mois: mensuel({ '2027-03': [0, 500, 500], '2027-04': [0, 0, 0, true] }),
    total: total(0, 500, 500, true),
  };
  const aliceP11 = {
    ...alice,
    mois: mensuel({ '2027-01': [0, 600, 600] }),
    total: total(0, 600, 600),
  };
  return { p1: [alice, bob, carol], p11: [aliceP11] };
}

/** Réponse attendue de GET /api/couts?debut=2027-01 pour l'administrateur (SPEC §12.5 point 6). */
export function reponseAttendue(m: MondePilotage) {
  const r = ressourcesAttendues(m);
  return {
    mois: MOIS,
    projets: [
      {
        projet_id: m.p1.id,
        code: 'P1',
        nom: 'Projet un',
        otp_effectif: 'OTP-A',
        clos: false,
        mois: mensuel({
          '2027-01': [600, 150, 750],
          '2027-02': [700, 350, 1050],
          '2027-03': [0, 500, 500],
          '2027-04': [0, 0, 0, true],
        }),
        total: total(1300, 1000, 2300, true),
        ressources: r.p1,
      },
      {
        projet_id: m.p11.id,
        code: 'P1.1',
        nom: 'Sous-projet un',
        otp_effectif: 'OTP-A',
        clos: false,
        mois: mensuel({ '2027-01': [0, 600, 600] }),
        total: total(0, 600, 600),
        ressources: r.p11,
      },
    ],
    total: {
      mois: mensuel({
        '2027-01': [600, 750, 1350],
        '2027-02': [700, 350, 1050],
        '2027-03': [0, 500, 500],
        '2027-04': [0, 0, 0, true],
      }),
      total: total(1300, 1600, 2900, true),
    },
  };
}

/** Statut attendu, base inchangée (empreinte de toutes les tables, sessions exceptées). */
export async function sansEffet(
  ctx: TestCtx,
  statut: number,
  requete: () => Promise<LightMyRequestResponse>,
  libelle = '',
): Promise<LightMyRequestResponse> {
  const avant = await empreinte(ctx);
  const res = await requete();
  expect(res.statusCode, `${libelle} ${res.body}`.trim()).toBe(statut);
  expect(await empreinte(ctx), `base inchangée ${libelle}`.trim()).toEqual(avant);
  return res;
}

export const lire = (ctx: TestCtx, qui: Acteur, requete: string) =>
  appel(ctx, qui).get(`/api/couts${requete}`);
