import { describe, expect, it } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import { useTestApp, type TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  creerCalendrier,
  creerProjet,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import { empreinte, tache } from './lot2a-helpers.js';

/**
 * Lot 6d (D-154, SPEC « Plan de charge (lot 6d, D-154) ») : GET /api/plan-de-charge. PDC-1 à PDC-13.
 * Valeurs attendues recopiées de D-154. Jours ouvrés du calendrier réel de 2027 (1er janvier 2027 =
 * vendredi), standard lundi-vendredi : 21, 20, 23, 22, 21, 22, 22, 22, 22, 21, 22, 23. Travail planifié
 * et imputations posés par SQL : le moteur n'est jamais appelé (« tel que laissé par le dernier calcul »).
 */

const MOIS_2027 = [
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
const DISPO_STANDARD = [21, 20, 23, 22, 21, 22, 22, 22, 22, 21, 22, 23];
const ZEROS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

interface MoisRessource {
  mois: string;
  disponible: number;
  reel: number;
  planifie: number;
  charge: number;
  ecart: number;
}
interface MoisProjet {
  mois: string;
  reel: number;
  planifie: number;
  charge: number;
}
interface LigneProjet {
  projet_id: number | null;
  code: string | null;
  nom: string | null;
  mois: MoisProjet[];
}
interface LigneRessource {
  ressource_id: number;
  nom: string;
  actif: boolean;
  equipe_id: number | null;
  mois: MoisRessource[];
  projets: LigneProjet[];
}
interface Plan {
  mois: string[];
  ressources: LigneRessource[];
}

const adresse = (requete: string) => `/api/plan-de-charge${requete}`;

async function lire(ctx: TestCtx, qui: Acteur, requete = '?debut=2027-01'): Promise<Plan> {
  const res = await appel(ctx, qui).get(adresse(requete));
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Plan;
}

/** Statut attendu, base inchangée (empreinte de toutes les tables, sessions exceptées). */
async function sansEffet(
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

let n = 0;

/** Utilisateur de nom donné ; ressource par défaut, actif, capacité 1, calendrier par défaut. */
async function utilisateur(
  ctx: TestCtx,
  nom: string,
  role: 'administrateur' | 'chef_de_projet' | 'ressource' = 'ressource',
  options: { ressource?: boolean; actif?: boolean; capacite?: number } = {},
): Promise<Acteur> {
  n += 1;
  const a = await creerActeur(
    ctx,
    `u${n}@plan.test`,
    role,
    options.ressource ?? role === 'ressource',
  );
  await ctx.pool.query('UPDATE utilisateur SET nom = $2, capacite = $3, actif = $4 WHERE id = $1', [
    a.id,
    nom,
    options.capacite ?? 1,
    options.actif ?? true,
  ]);
  return a;
}

const admin = (ctx: TestCtx) => utilisateur(ctx, 'Admin', 'administrateur');

async function projet(
  ctx: TestCtx,
  par: Acteur,
  code: string,
  chef: Acteur = par,
  champs: Corps = {},
): Promise<{ id: number; code: string; nom: string }> {
  const p = await creerProjet(ctx, par, { code, nom: `Nom ${code}`, chef_id: chef.id, ...champs });
  return { id: p.id, code, nom: `Nom ${code}` };
}

/** Affecte la ressource au projet et lui assigne une activité ; renvoie l'assignation. */
async function assigner(
  ctx: TestCtx,
  par: Acteur,
  projetId: number,
  ressource: Acteur,
): Promise<number> {
  await affecter(ctx, projetId, ressource.id);
  const t = await tache(ctx, par, projetId, ressource.id, 1);
  return t.assignation.id;
}

const planifier = (ctx: TestCtx, assignation: number, jour: string, charge: number) =>
  ctx.pool.query(
    'INSERT INTO travail_planifie (assignation_id, jour, charge) VALUES ($1, $2, $3)',
    [assignation, jour, charge],
  );

const imputer = (ctx: TestCtx, assignation: number, jour: string, charge: number) =>
  ctx.pool.query('INSERT INTO imputation (assignation_id, jour, charge) VALUES ($1, $2, $3)', [
    assignation,
    jour,
    charge,
  ]);

const parNom = (plan: Plan, nom: string): LigneRessource => {
  const r = plan.ressources.find((x) => x.nom === nom);
  expect(
    r,
    `ressource « ${nom} » absente (${plan.ressources.map((x) => x.nom).join(', ')})`,
  ).toBeDefined();
  return r!;
};

const noms = (plan: Plan) => plan.ressources.map((r) => r.nom);
const col = <K extends keyof MoisRessource>(r: LigneRessource, cle: K) => r.mois.map((m) => m[cle]);

describe('Plan de charge : accès et paramètres (D-154 (2))', () => {
  const ctx = useTestApp();

  it('PDC-1 : sans session 401 ; ressource (est_ressource ou non) 403 { erreur: "Interdit" } ; administrateur et chef 200 ; base inchangée', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const res1 = await utilisateur(ctx, 'Res1', 'ressource', { ressource: true });
    const res2 = await utilisateur(ctx, 'Res2', 'ressource', { ressource: false });
    await sansEffet(ctx, 401, () => appel(ctx).get(adresse('?debut=2027-01')), 'sans session');
    for (const r of [res1, res2]) {
      const res = await sansEffet(ctx, 403, () => appel(ctx, r).get(adresse('?debut=2027-01')));
      expect(corps(res)).toEqual({ erreur: 'Interdit' });
    }
    for (const acteur of [a, chef]) {
      const plan = await lire(ctx, acteur);
      expect(plan.mois).toHaveLength(12);
    }
  });

  it('PDC-2 : 400 sur debut ou equipe invalides, base inchangée ; bornes 2000-01 et 2099-12 acceptées', async () => {
    const a = await admin(ctx);
    for (const requete of [
      '',
      '?equipe=aucune',
      '?debut=2027-13',
      '?debut=2027-00',
      '?debut=2027-1',
      '?debut=2027',
      '?debut=abcd-ef',
      '?debut=2027-01-01',
      '?debut=1999-12',
      '?debut=2100-01',
      '?debut=2027-01&equipe=abc',
      '?debut=2027-01&equipe=1.5',
      '?debut=2027-01&equipe=1e2',
    ]) {
      await sansEffet(ctx, 400, () => appel(ctx, a).get(adresse(requete)), requete);
    }
    for (const debut of ['2000-01', '2099-12']) {
      const res = await appel(ctx, a).get(adresse(`?debut=${debut}`));
      expect(res.statusCode, debut).toBe(200);
    }
  });
});

describe('Plan de charge : forme, disponible, calendriers (D-154 (3), (4))', () => {
  const ctx = useTestApp();

  it('PDC-3 : douze mois à partir de debut (passage d’année, bornes) ; clés exactes d’une ressource sans charge', async () => {
    const a = await admin(ctx);
    const alice = await utilisateur(ctx, 'Alice');
    const plan = await lire(ctx, a, '?debut=2026-11');
    expect(plan.mois).toEqual([
      '2026-11',
      '2026-12',
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
    ]);
    const r = parNom(plan, 'Alice');
    expect(Object.keys(r).sort()).toEqual(
      ['actif', 'equipe_id', 'mois', 'nom', 'projets', 'ressource_id'].sort(),
    );
    expect(r.ressource_id).toBe(alice.id);
    expect(r.actif).toBe(true);
    expect(r.equipe_id).toBeNull();
    expect(r.projets).toEqual([]);
    expect(r.mois).toHaveLength(12);
    for (const m of r.mois) {
      expect(Object.keys(m).sort()).toEqual(
        ['charge', 'disponible', 'ecart', 'mois', 'planifie', 'reel'].sort(),
      );
      for (const v of [m.disponible, m.reel, m.planifie, m.charge, m.ecart]) {
        expect(typeof v).toBe('number');
      }
    }
    const fin = await lire(ctx, a, '?debut=2099-12');
    expect(fin.mois.slice(0, 2)).toEqual(['2099-12', '2100-01']);
  });

  it('PDC-4 : disponible au calendrier par défaut pour la capacité 1, 0,5 et 2 ; reel, planifie, charge à 0, ecart = disponible', async () => {
    const a = await admin(ctx);
    await utilisateur(ctx, 'Cap1');
    await utilisateur(ctx, 'Cap05', 'ressource', { capacite: 0.5 });
    await utilisateur(ctx, 'Cap2', 'ressource', { capacite: 2 });
    const plan = await lire(ctx, a);
    const attendu: Record<string, number[]> = {
      Cap1: [21, 20, 23, 22, 21, 22, 22, 22, 22, 21, 22, 23],
      Cap05: [10.5, 10, 11.5, 11, 10.5, 11, 11, 11, 11, 10.5, 11, 11.5],
      Cap2: [42, 40, 46, 44, 42, 44, 44, 44, 44, 42, 44, 46],
    };
    for (const [nom, dispo] of Object.entries(attendu)) {
      const r = parNom(plan, nom);
      expect(col(r, 'mois'), nom).toEqual(MOIS_2027);
      expect(col(r, 'disponible'), nom).toEqual(dispo);
      expect(col(r, 'ecart'), nom).toEqual(dispo);
      for (const cle of ['reel', 'planifie', 'charge'] as const) {
        expect(col(r, cle), `${nom} ${cle}`).toEqual(ZEROS);
      }
    }
  });

  it('PDC-5 : calendrier lundi-mardi-mercredi et jours fériés ; un férié non travaillé ou d’un autre calendrier est sans effet', async () => {
    const a = await admin(ctx);
    const lmm = await creerCalendrier(ctx, a, { jours_travailles: [1, 2, 3] });
    const autre = await creerCalendrier(ctx, a, { jours_travailles: [1, 2, 3, 4, 5] });
    const { rows } = await ctx.pool.query<{ id: number }>(
      'SELECT id FROM calendrier WHERE est_defaut',
    );
    const defaut = rows[0]!.id;
    const ferie = (calendrier: number, jour: string) =>
      ctx.pool.query('INSERT INTO calendrier_ferie (calendrier_id, jour) VALUES ($1, $2)', [
        calendrier,
        jour,
      ]);
    for (const jour of ['2027-01-05', '2027-01-07', '2027-01-02']) await ferie(lmm.id, jour);
    await ferie(defaut, '2027-01-01');
    await ferie(autre.id, '2027-01-20');
    await utilisateur(ctx, 'Standard');
    const complet = await utilisateur(ctx, 'LunMarMer');
    const demi = await utilisateur(ctx, 'LunMarMerDemi', 'ressource', { capacite: 0.5 });
    for (const u of [complet, demi]) {
      await ctx.pool.query('UPDATE utilisateur SET calendrier_id = $2 WHERE id = $1', [
        u.id,
        lmm.id,
      ]);
    }
    const plan = await lire(ctx, a);
    expect(col(parNom(plan, 'Standard'), 'disponible').slice(0, 3)).toEqual([20, 20, 23]);
    expect(col(parNom(plan, 'LunMarMer'), 'disponible').slice(0, 2)).toEqual([11, 12]);
    expect(col(parNom(plan, 'LunMarMerDemi'), 'disponible').slice(0, 2)).toEqual([5.5, 6]);
  });
});

describe('Plan de charge : valeurs (D-154 (4))', () => {
  const ctx = useTestApp();

  it('PDC-6 : réel et planifié dans le même mois, toutes feuilles, bornes de la période, somme exacte en SQL', async () => {
    const a = await admin(ctx);
    const alice = await utilisateur(ctx, 'Alice');
    const p = await projet(ctx, a, 'P6');
    const ass = await assigner(ctx, a, p.id, alice);
    await planifier(ctx, ass, '2027-01-18', 1.5);
    await planifier(ctx, ass, '2027-01-19', 1);
    await planifier(ctx, ass, '2027-02-01', 0.5);
    await ctx.pool.query(
      `INSERT INTO feuille_temps (ressource_id, lundi, statut) VALUES
         ($1, '2027-01-04', 'validee'), ($1, '2027-01-11', 'brouillon'), ($1, '2027-02-01', 'rejetee')`,
      [alice.id],
    );
    await imputer(ctx, ass, '2027-01-05', 0.75);
    await imputer(ctx, ass, '2027-01-12', 0.5);
    await imputer(ctx, ass, '2027-02-02', 0.25);
    await imputer(ctx, ass, '2027-03-01', 0.1);
    await imputer(ctx, ass, '2027-03-02', 0.2);
    await imputer(ctx, ass, '2027-12-31', 0.5);
    await imputer(ctx, ass, '2026-12-31', 3);
    await imputer(ctx, ass, '2028-01-03', 4);

    const r = parNom(await lire(ctx, a), 'Alice');
    expect(col(r, 'disponible')).toEqual(DISPO_STANDARD);
    expect(col(r, 'reel')).toEqual([1.25, 0.25, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0.5]);
    expect(col(r, 'planifie')).toEqual([2.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(col(r, 'charge')).toEqual([3.75, 0.75, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0.5]);
    expect(col(r, 'ecart')).toEqual([17.25, 19.25, 22.7, 22, 21, 22, 22, 22, 22, 21, 22, 22.5]);
    expect(r.projets).toHaveLength(1);
    const ligne = r.projets[0]!;
    expect([ligne.projet_id, ligne.code, ligne.nom]).toEqual([p.id, 'P6', 'Nom P6']);
    expect(ligne.mois.map((m) => m.mois)).toEqual(MOIS_2027);
    expect(ligne.mois.map((m) => m.reel)).toEqual([1.25, 0.25, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0.5]);
    expect(ligne.mois.map((m) => m.planifie)).toEqual([2.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(ligne.mois.map((m) => m.charge)).toEqual([3.75, 0.75, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0.5]);
    for (const m of ligne.mois)
      expect(Object.keys(m).sort()).toEqual(['charge', 'mois', 'planifie', 'reel']);
  });

  it('PDC-7 : écart négatif (planifié 22 j pour 21 j disponibles en janvier)', async () => {
    const a = await admin(ctx);
    const bob = await utilisateur(ctx, 'Bob');
    const p = await projet(ctx, a, 'P7');
    const ass = await assigner(ctx, a, p.id, bob);
    await planifier(ctx, ass, '2027-01-04', 22);
    const r = parNom(await lire(ctx, a), 'Bob');
    expect(r.mois[0]).toEqual({
      mois: '2027-01',
      disponible: 21,
      reel: 0,
      planifie: 22,
      charge: 22,
      ecart: -1,
    });
  });
});

describe('Plan de charge : ressources et projets (D-154 (5), (6))', () => {
  const ctx = useTestApp();

  it('PDC-8 : ressources actives, inactives à charge, hors période, non ressource à charge', async () => {
    const a = await admin(ctx);
    const p = await projet(ctx, a, 'P8');
    const actif = await utilisateur(ctx, 'Actif');
    const inactifCharge = await utilisateur(ctx, 'InactifCharge');
    const inactifHors = await utilisateur(ctx, 'InactifHors');
    await utilisateur(ctx, 'InactifRien', 'ressource', { actif: false });
    await utilisateur(ctx, 'ChefSans', 'chef_de_projet');
    const ancien = await utilisateur(ctx, 'Ancien');
    expect(actif.id).toBeGreaterThan(0);

    const assCharge = await assigner(ctx, a, p.id, inactifCharge);
    await planifier(ctx, assCharge, '2027-03-10', 1);
    const assHors = await assigner(ctx, a, p.id, inactifHors);
    await imputer(ctx, assHors, '2026-12-31', 1);
    await imputer(ctx, assHors, '2028-02-01', 1);
    const assAncien = await assigner(ctx, a, p.id, ancien);
    await planifier(ctx, assAncien, '2027-02-03', 2);
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = ANY($1)', [
      [inactifCharge.id, inactifHors.id],
    ]);
    await ctx.pool.query('UPDATE utilisateur SET est_ressource = false WHERE id = $1', [ancien.id]);

    const plan = await lire(ctx, a);
    expect(noms(plan)).toEqual(['Actif', 'Ancien', 'InactifCharge']);
    expect(parNom(plan, 'InactifCharge').actif).toBe(false);
    expect(col(parNom(plan, 'InactifCharge'), 'charge')[2]).toBe(1);
    expect(parNom(plan, 'Ancien').actif).toBe(true);
    expect(col(parNom(plan, 'Ancien'), 'charge')[1]).toBe(2);
  });

  it('PDC-9 : tri par nom sans tenir compte de la casse, puis par id', async () => {
    const a = await admin(ctx);
    await utilisateur(ctx, 'Charles');
    await utilisateur(ctx, 'bruno');
    const premier = await utilisateur(ctx, 'Alice');
    const second = await utilisateur(ctx, 'alice');
    const plan = await lire(ctx, a);
    expect(noms(plan)).toEqual(['Alice', 'alice', 'bruno', 'Charles']);
    expect(plan.ressources.map((r) => r.ressource_id).slice(0, 2)).toEqual([premier.id, second.id]);
  });

  it('PDC-10 : filtres équipe, « aucune », équipe inconnue', async () => {
    const a = await admin(ctx);
    const { rows: eq } = await ctx.pool.query<{ id: number; nom: string }>(
      `INSERT INTO equipe (nom) VALUES ('Dev'), ('Pilotage') RETURNING id, nom`,
    );
    const dev = eq.find((e) => e.nom === 'Dev')!.id;
    const pilotage = eq.find((e) => e.nom === 'Pilotage')!.id;
    const p = await projet(ctx, a, 'P10');
    const alice = await utilisateur(ctx, 'alice');
    const bob = await utilisateur(ctx, 'bob');
    const chefa = await utilisateur(ctx, 'chefa', 'chef_de_projet', { ressource: true });
    await utilisateur(ctx, 'carl');
    const yan = await utilisateur(ctx, 'Yan');
    const zed = await utilisateur(ctx, 'Zed');
    for (const [u, e] of [
      [alice, dev],
      [bob, dev],
      [chefa, pilotage],
      [zed, dev],
    ] as const) {
      await ctx.pool.query('UPDATE utilisateur SET equipe_id = $2 WHERE id = $1', [u.id, e]);
    }
    for (const u of [yan, zed]) {
      const ass = await assigner(ctx, a, p.id, u);
      await planifier(ctx, ass, '2027-01-12', 1);
    }
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = ANY($1)', [
      [yan.id, zed.id],
    ]);

    expect(noms(await lire(ctx, a))).toEqual(['alice', 'bob', 'carl', 'chefa', 'Yan', 'Zed']);
    const filtre = await lire(ctx, a, `?debut=2027-01&equipe=${dev}`);
    expect(noms(filtre)).toEqual(['alice', 'bob', 'Zed']);
    for (const r of filtre.ressources) expect(r.equipe_id).toBe(dev);
    expect(noms(await lire(ctx, a, `?debut=2027-01&equipe=${pilotage}`))).toEqual(['chefa']);
    expect(noms(await lire(ctx, a, '?debut=2027-01&equipe=aucune'))).toEqual(['carl', 'Yan']);
    const inconnue = await lire(ctx, a, '?debut=2027-01&equipe=9999');
    expect(inconnue.ressources).toEqual([]);
    expect(inconnue.mois).toHaveLength(12);
  });

  it('PDC-11 : projets à charge non nulle dans la période, clos compris, tri par code sans casse, jamais de modèle', async () => {
    const a = await admin(ctx);
    const alice = await utilisateur(ctx, 'Alice');
    const b2 = await projet(ctx, a, 'b-2');
    const c3 = await projet(ctx, a, 'c-3');
    const a1 = await projet(ctx, a, 'A-1');
    const d4 = await projet(ctx, a, 'D-4');
    await projet(ctx, a, 'E-5');
    const mod = await appel(ctx, a).post('/api/modeles', {
      code: 'MOD-1',
      nom: 'Modèle un',
      date_debut: '2027-01-04',
    });
    expect(mod.statusCode).toBe(201);
    await planifier(ctx, await assigner(ctx, a, b2.id, alice), '2027-01-12', 1);
    await imputer(ctx, await assigner(ctx, a, c3.id, alice), '2027-02-02', 1);
    await planifier(ctx, await assigner(ctx, a, a1.id, alice), '2027-03-02', 1);
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [a1.id]);
    const ass4 = await assigner(ctx, a, d4.id, alice);
    await planifier(ctx, ass4, '2028-01-03', 1);
    await imputer(ctx, ass4, '2026-12-31', 1);

    const r = parNom(await lire(ctx, a), 'Alice');
    expect(r.projets.map((x) => x.code)).toEqual(['A-1', 'b-2', 'c-3']);
    expect(r.projets.map((x) => x.nom)).toEqual(['Nom A-1', 'Nom b-2', 'Nom c-3']);
    expect(r.projets.every((x) => x.projet_id !== null)).toBe(true);
  });

  it('PDC-12 : chef de projet : projets illisibles regroupés en une ligne finale à champs null ; administrateur : tout, sans regroupement', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const autreChef = await utilisateur(ctx, 'Autre', 'chef_de_projet');
    const alice = await utilisateur(ctx, 'Alice');
    const bob = await utilisateur(ctx, 'Bob');
    const p1 = await projet(ctx, a, 'M-PROJ1', chef);
    const pl = await projet(ctx, a, 'N-LECT', autreChef);
    const p2 = await projet(ctx, a, 'A-ILLISIBLE2', autreChef);
    const p3 = await projet(ctx, a, 'B-ILLISIBLE3', autreChef);
    await affecter(ctx, pl.id, chef.id);
    await planifier(ctx, await assigner(ctx, a, p1.id, alice), '2027-01-05', 2);
    await planifier(ctx, await assigner(ctx, a, pl.id, alice), '2027-01-06', 1);
    const ass2 = await assigner(ctx, a, p2.id, alice);
    await planifier(ctx, ass2, '2027-01-07', 4);
    await planifier(ctx, ass2, '2027-02-03', 1);
    await imputer(ctx, await assigner(ctx, a, p3.id, alice), '2027-01-08', 0.5);
    await planifier(ctx, await assigner(ctx, a, p2.id, bob), '2027-01-07', 1);

    const vueChef = parNom(await lire(ctx, chef), 'Alice');
    expect(vueChef.projets.map((x) => x.code)).toEqual(['M-PROJ1', 'N-LECT', null]);
    expect(vueChef.projets.map((x) => x.projet_id)).toEqual([p1.id, pl.id, null]);
    const autres = vueChef.projets[2]!;
    expect(autres.nom).toBeNull();
    expect(autres.mois.map((m) => m.mois)).toEqual(MOIS_2027);
    expect(autres.mois.map((m) => m.reel).slice(0, 2)).toEqual([0.5, 0]);
    expect(autres.mois.map((m) => m.planifie).slice(0, 2)).toEqual([4, 1]);
    expect(autres.mois.map((m) => m.charge).slice(0, 2)).toEqual([4.5, 1]);
    expect(vueChef.mois[0]).toMatchObject({ reel: 0.5, planifie: 7, charge: 7.5 });

    const vueBob = parNom(await lire(ctx, chef), 'Bob');
    expect(vueBob.projets.map((x) => x.code)).toEqual([null]);

    const vueAdmin = parNom(await lire(ctx, a), 'Alice');
    expect(vueAdmin.projets.map((x) => x.code)).toEqual([
      'A-ILLISIBLE2',
      'B-ILLISIBLE3',
      'M-PROJ1',
      'N-LECT',
    ]);
    expect(vueAdmin.projets.every((x) => x.projet_id !== null)).toBe(true);
    expect(vueAdmin.mois[0]).toMatchObject({ reel: 0.5, planifie: 7, charge: 7.5 });

    // L'autre chef lit P2, P3 et PL, pas P1 : P1 (planifié 2 en janvier) tombe dans la ligne regroupée.
    const vueAutre = parNom(await lire(ctx, autreChef), 'Alice');
    expect(vueAutre.projets.map((x) => x.code)).toEqual([
      'A-ILLISIBLE2',
      'B-ILLISIBLE3',
      'N-LECT',
      null,
    ]);
    expect(vueAutre.projets[3]!.mois[0]).toEqual({
      mois: '2027-01',
      reel: 0,
      planifie: 2,
      charge: 2,
    });
  });

  it('PDC-13 : la route n’écrit rien (administrateur et chef, avec et sans filtre)', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const alice = await utilisateur(ctx, 'Alice');
    const p = await projet(ctx, a, 'P13', chef);
    const ass = await assigner(ctx, a, p.id, alice);
    await planifier(ctx, ass, '2027-01-12', 1);
    await imputer(ctx, ass, '2027-01-13', 1);
    for (const requete of [
      '?debut=2027-01',
      '?debut=2027-01&equipe=aucune',
      '?debut=2027-06&equipe=9999',
    ]) {
      await sansEffet(ctx, 200, () => appel(ctx, a).get(adresse(requete)), `admin ${requete}`);
      await sansEffet(ctx, 200, () => appel(ctx, chef).get(adresse(requete)), `chef ${requete}`);
    }
  });
});
