import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  creerProjet,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import { creerActivite, creerAssignation, type Objet } from './lot1-t2-helpers.js';
import { calculer, creerMonde, empreinte, tache } from './lot2a-helpers.js';
import { clore } from './lot4a-helpers.js';

/**
 * Lot 6b (D-148 (3), SPEC « Vue restreinte de la ressource ») : GET /api/mes-taches. Valeurs attendues
 * recopiées de D-148 (3) : assignations de l'utilisateur sur des activités ouvertes de projets
 * ordinaires ouverts ; huit champs exactement ; tri début planifié (null en dernier), code du projet
 * sans tenir compte de la casse, numéro WBS.
 */

interface Tache {
  assignation_id: number;
  projet: { code: string; nom: string };
  activite: { nom: string; wbs: string };
  charge_assignee: number;
  charge_reelle: number;
  reste_a_faire: number;
  debut_planifie: string | null;
  fin_planifiee: string | null;
}

async function mesTaches(ctx: TestCtx, qui: Acteur): Promise<Tache[]> {
  const res = await appel(ctx, qui).get('/api/mes-taches');
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Tache[];
}

async function poserReel(ctx: TestCtx, assignationId: number, reel: number, reste: number) {
  await ctx.pool.query(
    'UPDATE assignation SET charge_reelle = $1, reste_a_faire = $2 WHERE id = $3',
    [reel, reste, assignationId],
  );
}

/** Dates planifiées posées en base (sans calcul), pour le tri. */
async function poserDebut(ctx: TestCtx, activiteId: number, jour: string | null) {
  await ctx.pool.query(
    'UPDATE activite SET debut_planifie = $1, fin_planifiee = $1 WHERE id = $2',
    [jour, activiteId],
  );
}

const CHAMPS = [
  'activite',
  'assignation_id',
  'charge_assignee',
  'charge_reelle',
  'debut_planifie',
  'fin_planifiee',
  'projet',
  'reste_a_faire',
];

describe('Mes tâches : GET /api/mes-taches (lot 6b, D-148 (3))', () => {
  const ctx = useTestApp();

  it('MTA-1 : deux assignations ouvertes : valeurs exactes (projet, activité, charges, dates null avant calcul) ; la route n’écrit rien', async () => {
    const m = await creerMonde(ctx);
    const t1 = await tache(ctx, m.chef, m.projet.id, m.alice.id, 2, { nom: 'Analyse' });
    const t2 = await tache(ctx, m.chef, m.projet.id, m.alice.id, 3, { nom: 'Build' });
    await poserReel(ctx, t1.assignation.id, 0.5, 1.5);
    const avant = await empreinte(ctx);
    const projet = { code: m.projet.code as string, nom: m.projet.nom as string };
    expect(await mesTaches(ctx, m.alice)).toEqual([
      {
        assignation_id: t1.assignation.id,
        projet,
        activite: { nom: 'Analyse', wbs: '1' },
        charge_assignee: 2,
        charge_reelle: 0.5,
        reste_a_faire: 1.5,
        debut_planifie: null,
        fin_planifiee: null,
      },
      {
        assignation_id: t2.assignation.id,
        projet,
        activite: { nom: 'Build', wbs: '2' },
        charge_assignee: 3,
        charge_reelle: 0,
        reste_a_faire: 3,
        debut_planifie: null,
        fin_planifiee: null,
      },
    ]);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('MTA-2 : exclusions : activité close, projet clos, modèle, assignation d’une autre ressource', async () => {
    const m = await creerMonde(ctx);
    const ouverte = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'Ouverte' });
    const close = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'Close' });
    await clore(ctx, m.chef, close.activite.id);
    await tache(ctx, m.chef, m.projet.id, m.bob.id, 1, { nom: 'De Bob' });
    // Projet clos : clos posé en base (D-083 refuserait la clôture d'un projet à activité ouverte).
    const q = await creerProjet(ctx, m.admin, { chef_id: m.chef.id });
    await affecter(ctx, q.id, m.alice.id);
    await tache(ctx, m.chef, q.id, m.alice.id, 1, { nom: 'Dans un projet clos' });
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [q.id]);
    // Modèle : Alice affectée et assignée.
    const res = await appel(ctx, m.admin).post('/api/modeles', {
      code: 'MTA2',
      nom: 'Modèle MTA-2',
      date_debut: '2027-01-04',
    });
    expect(res.statusCode, res.body).toBe(201);
    const modele = corps(res) as Objet;
    await affecter(ctx, modele.id, m.alice.id);
    const am = await creerActivite(ctx, m.admin, modele.id, { nom: 'Dans le modèle' });
    await creerAssignation(ctx, m.admin, am.id, m.alice.id);

    const taches = await mesTaches(ctx, m.alice);
    expect(taches.map((t) => t.assignation_id)).toEqual([ouverte.assignation.id]);
    expect(taches.map((t) => t.activite.nom)).toEqual(['Ouverte']);
  });

  it('MTA-3 : tri : début planifié (null en dernier), puis code du projet sans tenir compte de la casse (« a6b » avant « B6B »), puis numéro WBS', async () => {
    const m = await creerMonde(ctx);
    const pa = await creerProjet(ctx, m.admin, {
      chef_id: m.chef.id,
      code: 'a6b',
      nom: 'Projet a',
    });
    const pb = await creerProjet(ctx, m.admin, {
      chef_id: m.chef.id,
      code: 'B6B',
      nom: 'Projet B',
    });
    await affecter(ctx, pa.id, m.alice.id);
    await affecter(ctx, pb.id, m.alice.id);
    const creer = (p: Corps & { id: number }, nom: string) =>
      tache(ctx, m.chef, p.id, m.alice.id, 1, { nom });
    const a1 = await creer(pa, 'A1');
    const a2 = await creer(pa, 'A2');
    const a3 = await creer(pa, 'A3');
    const b1 = await creer(pb, 'B1');
    const b2 = await creer(pb, 'B2');
    const b3 = await creer(pb, 'B3');
    // B3 passe au rang 2 : WBS « 2 » pour B3, « 3 » pour B2 (le WBS ne suit plus l'ordre de création).
    const dep = await appel(ctx, m.chef).post(`/api/elements/${b3.activite.id}/deplacer`, {
      parent_id: null,
      rang: 2,
    });
    expect(dep.statusCode, dep.body).toBe(200);
    await poserDebut(ctx, a1.activite.id, null);
    await poserDebut(ctx, a2.activite.id, '2027-01-05');
    await poserDebut(ctx, a3.activite.id, '2027-01-04');
    await poserDebut(ctx, b1.activite.id, '2027-01-05');

    const taches = await mesTaches(ctx, m.alice);
    expect(taches.map((t) => `${t.projet.code} ${t.activite.wbs} ${t.activite.nom}`)).toEqual([
      'a6b 3 A3',
      'a6b 2 A2',
      'B6B 1 B1',
      'a6b 1 A1',
      'B6B 2 B3',
      'B6B 3 B2',
    ]);
    expect(taches.map((t) => t.debut_planifie)).toEqual([
      '2027-01-04',
      '2027-01-05',
      '2027-01-05',
      null,
      null,
      null,
    ]);
    expect(b2.assignation.id).toBeGreaterThan(0);
  });

  it('MTA-4 : dates planifiées null avant calcul ; après POST /api/calcul, égales à celles de l’activité en base', async () => {
    const m = await creerMonde(ctx);
    const t = await tache(ctx, m.chef, m.projet.id, m.alice.id, 2, { nom: 'Calculée' });
    const [avant] = await mesTaches(ctx, m.alice);
    expect(avant).toMatchObject({ debut_planifie: null, fin_planifiee: null });
    const res = await calculer(ctx, m.chef, { projets: [m.projet.id], d0: '2027-01-04' });
    expect(res.statusCode, res.body).toBe(200);
    const { rows } = await ctx.pool.query<{ debut: string; fin: string }>(
      'SELECT debut_planifie::text AS debut, fin_planifiee::text AS fin FROM activite WHERE id = $1',
      [t.activite.id],
    );
    expect(rows[0]!.debut).toBeTruthy();
    const [apres] = await mesTaches(ctx, m.alice);
    expect(apres).toMatchObject({ debut_planifie: rows[0]!.debut, fin_planifiee: rows[0]!.fin });
  });

  it('MTA-5 : liste vide pour un utilisateur sans assignation ; sans session 401', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.chef, m.projet.id, m.alice.id, 1);
    expect(await mesTaches(ctx, m.admin)).toEqual([]);
    expect(await mesTaches(ctx, m.bob)).toEqual([]);
    expect((await appel(ctx).get('/api/mes-taches')).statusCode).toBe(401);
  });

  it('MTA-6 : champs exacts : huit clés par entrée, { code, nom } pour projet, { nom, wbs } pour activite', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.chef, m.projet.id, m.alice.id, 1);
    const [t] = await mesTaches(ctx, m.alice);
    expect(Object.keys(t!).sort()).toEqual(CHAMPS);
    expect(Object.keys(t!.projet).sort()).toEqual(['code', 'nom']);
    expect(Object.keys(t!.activite).sort()).toEqual(['nom', 'wbs']);
  });

  it('MTA-7 : tout utilisateur connecté : un chef de projet ressource, assigné sur le projet d’un autre chef, reçoit sa tâche', async () => {
    const m = await creerMonde(ctx);
    const chefRes = await creerActeur(ctx, 'chefres@example.test', 'chef_de_projet', true);
    await affecter(ctx, m.projet.id, chefRes.id);
    const t = await tache(ctx, m.chef, m.projet.id, chefRes.id, 1, { nom: 'Du chef ressource' });
    const taches = await mesTaches(ctx, chefRes);
    expect(taches.map((x) => x.assignation_id)).toEqual([t.assignation.id]);
  });
  it('MTA-8 : activité sous une activité ancêtre close et activité d’un projet sous un projet ancêtre clos (forcés en base) : absentes ; la tâche ouverte témoin reste', async () => {
    const m = await creerMonde(ctx);
    const temoin = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'Témoin' });
    const parent = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Parente' });
    const enfant = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, {
      nom: 'Sous parente close',
      parent_id: parent.id,
    });
    expect(enfant.assignation.id).toBeGreaterThan(0);
    await ctx.pool.query('UPDATE activite SET close = true WHERE id = $1', [parent.id]);
    const sous = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    await affecter(ctx, sous.id, m.alice.id);
    await tache(ctx, m.chef, sous.id, m.alice.id, 1, { nom: 'Sous projet clos' });
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [m.projet.id]);
    const q = await creerProjet(ctx, m.admin, { chef_id: m.chef.id });
    await affecter(ctx, q.id, m.alice.id);
    const ouverte = await tache(ctx, m.chef, q.id, m.alice.id, 1, { nom: 'Ouverte ailleurs' });
    const taches = await mesTaches(ctx, m.alice);
    expect(taches.map((t) => t.assignation_id)).toEqual([ouverte.assignation.id]);
    expect(temoin.assignation.id).toBeGreaterThan(0);
  });
});
