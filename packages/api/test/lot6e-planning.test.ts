import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, creerActeur, creerProjet, type Acteur } from './lot1-helpers.js';
import { creerActivite, creerMonde, type Monde } from './lot1-t2-helpers.js';
import { empreinte, tache } from './lot2a-helpers.js';
import { clore } from './lot4a-helpers.js';

/**
 * Lot 6e (D-157, SPEC « Accueil : planning d'une ressource (lot 6e, D-157) ») :
 * GET /api/ressources/:id/planning. RPL-1 à RPL-11. Valeurs attendues recopiées de D-157. Dates
 * planifiées et drapeaux posés par SQL : le moteur n'est jamais appelé.
 */

interface Ligne {
  assignation_id: number;
  projet: { id: number; code: string; nom: string } | null;
  activite: { id: number; nom: string; wbs: string } | null;
  debut_planifie: string | null;
  fin_planifiee: string | null;
  charge_assignee: number;
  charge_reelle: number;
  reste_a_faire: number;
  drapeaux: string[];
}
interface Planning {
  ressource: { id: number; nom: string; actif: boolean };
  lignes: Ligne[];
}

const adresse = (id: number | string) => `/api/ressources/${id}/planning`;

async function lire(ctx: TestCtx, qui: Acteur, ressource: Acteur | number | string) {
  const id = typeof ressource === 'object' ? ressource.id : ressource;
  const res = await appel(ctx, qui).get(adresse(id));
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Planning;
}

/** Statut attendu, base inchangée (empreinte de toutes les tables, sessions exceptées). */
async function sansEffet(ctx: TestCtx, statut: number, requete: () => Promise<unknown>) {
  const avant = await empreinte(ctx);
  const res = (await requete()) as { statusCode: number; body: string };
  expect(res.statusCode, res.body).toBe(statut);
  expect(await empreinte(ctx), 'base inchangée').toEqual(avant);
  return res;
}

const poserDates = (ctx: TestCtx, activiteId: number, debut: string | null, fin = debut) =>
  ctx.pool.query('UPDATE activite SET debut_planifie = $1, fin_planifiee = $2 WHERE id = $3', [
    debut,
    fin,
    activiteId,
  ]);

const poserReel = (ctx: TestCtx, assignationId: number, reel: number, reste: number) =>
  ctx.pool.query('UPDATE assignation SET charge_reelle = $1, reste_a_faire = $2 WHERE id = $3', [
    reel,
    reste,
    assignationId,
  ]);

/** Projet de `chef` (créé par l'administrateur), Alice affectée. */
async function projetAvecAlice(
  ctx: TestCtx,
  m: Monde,
  code: string,
  chef: Acteur,
  alice = m.alice,
) {
  const p = await creerProjet(ctx, m.admin, { code, nom: `Nom ${code}`, chef_id: chef.id });
  await affecter(ctx, p.id, alice.id);
  return p;
}

describe('Planning d’une ressource : accès et forme (D-157 (2), (3))', () => {
  const ctx = useTestApp();

  it('RPL-1 : sans session 401 ; rôle ressource 403 { erreur: "Interdit" } (même sur un identifiant inconnu) ; administrateur et chef 200 ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.chef, m.projet.id, m.alice.id, 1);
    await sansEffet(ctx, 401, () => appel(ctx).get(adresse(m.alice.id)));
    for (const id of [m.alice.id, m.bob.id, 9999]) {
      const res = await sansEffet(ctx, 403, () => appel(ctx, m.alice).get(adresse(id)));
      expect(res.body).toBe(JSON.stringify({ erreur: 'Interdit' }));
    }
    const chefRessource = await creerActeur(ctx, 'chefres@example.test', 'ressource', false);
    await sansEffet(ctx, 403, () => appel(ctx, chefRessource).get(adresse(m.alice.id)));
    expect((await lire(ctx, m.admin, m.alice)).lignes).toHaveLength(1);
    expect((await lire(ctx, m.chef, m.alice)).lignes).toHaveLength(1);
  });

  it('RPL-2 : 404 (inconnu, mal formé, hors plage) ; 200 lignes vide pour un utilisateur sans assignation, non ressource ou inactif', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.chef, m.projet.id, m.alice.id, 1);
    // Témoin : un utilisateur existant répond 200 (rend le rouge probant : la route existe).
    expect((await lire(ctx, m.admin, m.alice)).lignes).toHaveLength(1);
    for (const id of [
      '9999',
      'abc',
      '1.5',
      '1e2',
      '0',
      '-1',
      '2147483648',
      '99999999999999999999',
    ]) {
      await sansEffet(ctx, 404, () => appel(ctx, m.admin).get(adresse(id)));
      await sansEffet(ctx, 404, () => appel(ctx, m.chef).get(adresse(id)));
    }
    const sans = await lire(ctx, m.admin, m.bob);
    expect(sans).toEqual({
      ressource: { id: m.bob.id, nom: expect.any(String), actif: true },
      lignes: [],
    });
    expect(Object.keys(sans.ressource).sort()).toEqual(['actif', 'id', 'nom']);
    expect((await lire(ctx, m.chef, m.admin)).lignes).toEqual([]);
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = $1', [m.alice.id]);
    const inactive = await lire(ctx, m.admin, m.alice);
    expect(inactive.ressource.actif).toBe(false);
    expect(inactive.lignes).toHaveLength(1);
  });

  it('RPL-3 : forme avant calcul : clés exactes, projet { id, code, nom }, activité { id, nom, wbs }, dates null, drapeaux [], charges recopiées, ordre WBS', async () => {
    const m = await creerMonde(ctx);
    const t1 = await tache(ctx, m.chef, m.projet.id, m.alice.id, 2, { nom: 'Analyse' });
    const t2 = await tache(ctx, m.chef, m.projet.id, m.alice.id, 3, { nom: 'Build' });
    await poserReel(ctx, t1.assignation.id, 0.5, 1.5);
    const plan = await lire(ctx, m.admin, m.alice);
    expect(Object.keys(plan).sort()).toEqual(['lignes', 'ressource']);
    expect(Object.keys(plan.lignes[0]!).sort()).toEqual([
      'activite',
      'assignation_id',
      'charge_assignee',
      'charge_reelle',
      'debut_planifie',
      'drapeaux',
      'fin_planifiee',
      'projet',
      'reste_a_faire',
    ]);
    expect(Object.keys(plan.lignes[0]!.projet!).sort()).toEqual(['code', 'id', 'nom']);
    expect(Object.keys(plan.lignes[0]!.activite!).sort()).toEqual(['id', 'nom', 'wbs']);
    const projet = { id: m.projet.id, code: m.projet.code, nom: m.projet.nom };
    expect(plan.lignes).toEqual([
      {
        assignation_id: t1.assignation.id,
        projet,
        activite: { id: t1.activite.id, nom: 'Analyse', wbs: '1' },
        debut_planifie: null,
        fin_planifiee: null,
        charge_assignee: 2,
        charge_reelle: 0.5,
        reste_a_faire: 1.5,
        drapeaux: [],
      },
      {
        assignation_id: t2.assignation.id,
        projet,
        activite: { id: t2.activite.id, nom: 'Build', wbs: '2' },
        debut_planifie: null,
        fin_planifiee: null,
        charge_assignee: 3,
        charge_reelle: 0,
        reste_a_faire: 3,
        drapeaux: [],
      },
    ]);
  });

  it('RPL-4 : drapeaux de l’activité repris tels quels ; activité sans drapeau : []', async () => {
    const m = await creerMonde(ctx);
    const t1 = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'Drapeaux' });
    const t2 = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'Sans' });
    await poserDates(ctx, t1.activite.id, '2027-01-04', '2027-01-06');
    await ctx.pool.query(
      `UPDATE activite SET drapeaux = ARRAY['retard', 'surcharge'] WHERE id = $1`,
      [t1.activite.id],
    );
    const plan = await lire(ctx, m.admin, m.alice);
    const parId = new Map(plan.lignes.map((l) => [l.assignation_id, l]));
    expect(parId.get(t1.assignation.id)).toMatchObject({
      drapeaux: ['retard', 'surcharge'],
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-06',
    });
    expect(parId.get(t2.assignation.id)!.drapeaux).toEqual([]);
  });

  it('RPL-5 : aucune clé de charge vendue (posée à 12 sur l’activité) ; le JSON ne contient pas « vendue »', async () => {
    const m = await creerMonde(ctx);
    const t = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'Vendue' });
    await ctx.pool.query('UPDATE activite SET charge_vendue = 12 WHERE id = $1', [t.activite.id]);
    const res = await appel(ctx, m.admin).get(adresse(m.alice.id));
    expect(res.statusCode, res.body).toBe(200);
    expect(res.body).not.toContain('vendue');
    const plan = res.json() as Planning;
    expect(plan.lignes).toHaveLength(1);
    for (const objet of [
      plan,
      plan.ressource,
      plan.lignes[0]!,
      plan.lignes[0]!.projet!,
      plan.lignes[0]!.activite!,
    ]) {
      expect(Object.keys(objet)).not.toContain('charge_vendue');
    }
  });
});

describe('Planning d’une ressource : tri et filtres (D-157 (3))', () => {
  const ctx = useTestApp();

  it('RPL-6 : tri : début (null en dernier), code du projet sans casse, numéro WBS (2 avant 10)', async () => {
    const m = await creerMonde(ctx);
    const pb = await projetAvecAlice(ctx, m, 'b-2', m.chef);
    const pa = await projetAvecAlice(ctx, m, 'A-1', m.chef);
    const pc = await projetAvecAlice(ctx, m, 'c-3', m.chef);
    const dans = async (p: { id: number }, noms: string[]) => {
      const res = [];
      for (const nom of noms) res.push(await tache(ctx, m.chef, p.id, m.alice.id, 1, { nom }));
      return res;
    };
    // Projet A-1 : onze activités ; « K10 » a le WBS 10, « K2 » le WBS 2.
    const a = await dans(pa, ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10', 'K11']);
    const [b] = await dans(pb, ['B1']);
    const [c] = await dans(pc, ['C1']);
    // Même date : A-1 (WBS 2 puis 10), b-2, c-3 ; puis deux lignes sans date (code, puis WBS).
    await poserDates(ctx, c!.activite.id, '2027-01-04');
    await poserDates(ctx, b!.activite.id, '2027-01-04');
    await poserDates(ctx, a[9]!.activite.id, '2027-01-04');
    await poserDates(ctx, a[1]!.activite.id, '2027-01-04');
    await poserDates(ctx, a[0]!.activite.id, '2027-01-03');
    const plan = await lire(ctx, m.admin, m.alice);
    const lignes = plan.lignes.map((l) => `${l.projet!.code} ${l.activite!.wbs}`);
    expect(lignes.slice(0, 5)).toEqual(['A-1 1', 'A-1 2', 'A-1 10', 'b-2 1', 'c-3 1']);
    expect(lignes.slice(5)).toEqual([
      'A-1 3',
      'A-1 4',
      'A-1 5',
      'A-1 6',
      'A-1 7',
      'A-1 8',
      'A-1 9',
      'A-1 11',
    ]);
    expect(plan.lignes.slice(5).every((l) => l.debut_planifie === null)).toBe(true);
  });

  it('RPL-7 : exclusions : activité close, activité sous un ancêtre clos, projet clos, projet sous un projet clos, modèle, autre ressource ; témoin retenu', async () => {
    const m = await creerMonde(ctx);
    const temoin = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'Témoin' });
    const close = await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'Close' });
    await clore(ctx, m.chef, close.activite.id);
    const parent = await creerActivite(ctx, m.chef, m.projet.id, { nom: 'Parente' });
    await tache(ctx, m.chef, m.projet.id, m.alice.id, 1, {
      nom: 'Sous close',
      parent_id: parent.id,
    });
    await ctx.pool.query('UPDATE activite SET close = true WHERE id = $1', [parent.id]);
    await tache(ctx, m.chef, m.projet.id, m.bob.id, 1, { nom: 'De Bob' });
    // Projet clos (forcé en base) et son sous-projet.
    const clos = await projetAvecAlice(ctx, m, 'CLOS', m.chef);
    await tache(ctx, m.chef, clos.id, m.alice.id, 1, { nom: 'Dans un projet clos' });
    const sous = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: clos.id });
    await affecter(ctx, sous.id, m.alice.id);
    await tache(ctx, m.chef, sous.id, m.alice.id, 1, { nom: 'Sous un projet clos' });
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [clos.id]);
    // Modèle.
    const res = await appel(ctx, m.admin).post('/api/modeles', {
      code: 'RPL7',
      nom: 'Modèle RPL-7',
      date_debut: '2027-01-04',
    });
    expect(res.statusCode, res.body).toBe(201);
    const modele = res.json() as { id: number };
    await affecter(ctx, modele.id, m.alice.id);
    await tache(ctx, m.admin, modele.id, m.alice.id, 1, { nom: 'Dans le modèle' });
    // Projet ouvert sous un projet ouvert : retenu.
    const sousOuvert = await creerProjet(ctx, m.admin, {
      chef_id: m.chef.id,
      parent_id: m.projet.id,
    });
    await affecter(ctx, sousOuvert.id, m.alice.id);
    const retenue = await tache(ctx, m.chef, sousOuvert.id, m.alice.id, 1, { nom: 'Sous ouvert' });

    const plan = await lire(ctx, m.admin, m.alice);
    expect(plan.lignes.map((l) => l.assignation_id).sort((x, y) => x - y)).toEqual(
      [temoin.assignation.id, retenue.assignation.id].sort((x, y) => x - y),
    );
  });
});

describe('Planning d’une ressource : lignes masquées (D-157 (4))', () => {
  const ctx = useTestApp();

  /** Alice dans P1 (lisible), PL (lisible, chef affecté) et P2 (illisible pour le chef). */
  async function monde() {
    const m = await creerMonde(ctx);
    const p1 = m.projet;
    const pl = await projetAvecAlice(ctx, m, 'PL', m.autreChef);
    await affecter(ctx, pl.id, m.chef.id);
    const p2 = m.autre;
    await affecter(ctx, p2.id, m.alice.id);
    const t1 = await tache(ctx, m.chef, p1.id, m.alice.id, 1, { nom: 'Un' });
    const tl = await tache(ctx, m.admin, pl.id, m.alice.id, 1, { nom: 'Lisible' });
    const t2 = await tache(ctx, m.admin, p2.id, m.alice.id, 4, { nom: 'Illisible' });
    await poserDates(ctx, t1.activite.id, '2027-01-04');
    await poserDates(ctx, tl.activite.id, '2027-01-06');
    await poserDates(ctx, t2.activite.id, '2027-01-05');
    await poserReel(ctx, t2.assignation.id, 1, 3);
    await ctx.pool.query(`UPDATE activite SET drapeaux = ARRAY['retard'] WHERE id = $1`, [
      t2.activite.id,
    ]);
    return { m, p2, t1, tl, t2 };
  }

  it('RPL-8-r1 : chef de projet : aucune ligne masquée (D-265), lignes en clair comme pour l’administrateur ; mêmes dates et charges', async () => {
    const { m, p2, t1, tl, t2 } = await monde();
    const plan = await lire(ctx, m.chef, m.alice);
    // Révision D-265 (4) : le chef lit tous les projets ; sa vue est celle de l'administrateur.
    expect(plan).toEqual(await lire(ctx, m.admin, m.alice));
    expect(plan.lignes.map((l) => l.assignation_id).sort((a, b) => a - b)).toEqual(
      [t1.assignation.id, t2.assignation.id, tl.assignation.id].sort((a, b) => a - b),
    );
    expect(plan.lignes.find((l) => l.assignation_id === t2.assignation.id)).toMatchObject({
      projet: { id: p2.id, code: p2.code, nom: p2.nom },
      debut_planifie: '2027-01-05',
      fin_planifiee: '2027-01-05',
      charge_assignee: 4,
      charge_reelle: 1,
      reste_a_faire: 3,
    });
    for (const l of plan.lignes) expect(l.projet, 'ligne masquée').not.toBeNull();
    // Bob, assigné seulement dans P2 : sa ligne est en clair.
    await affecter(ctx, m.autre.id, m.bob.id);
    await tache(ctx, m.admin, m.autre.id, m.bob.id, 2, { nom: 'Bob' });
    const bob = await lire(ctx, m.chef, m.bob);
    expect(bob.lignes).toHaveLength(1);
    expect(bob.lignes[0]!.projet).not.toBeNull();
    // Un autre chef lit aussi P1 : aucune ligne masquée.
    const autre = await lire(ctx, m.autreChef, m.alice);
    for (const l of autre.lignes) expect(l.projet, 'ligne masquée').not.toBeNull();
  });

  it('RPL-9 : administrateur : la même ligne en clair (projet, activité, drapeaux), mêmes dates et charges ; aucune ligne masquée', async () => {
    const { m, p2, t2 } = await monde();
    const plan = await lire(ctx, m.admin, m.alice);
    const ligne = plan.lignes.find((l) => l.assignation_id === t2.assignation.id)!;
    expect(ligne).toEqual({
      assignation_id: t2.assignation.id,
      projet: { id: p2.id, code: p2.code, nom: p2.nom },
      activite: { id: t2.activite.id, nom: 'Illisible', wbs: '1' },
      debut_planifie: '2027-01-05',
      fin_planifiee: '2027-01-05',
      charge_assignee: 4,
      charge_reelle: 1,
      reste_a_faire: 3,
      drapeaux: ['retard'],
    });
    expect(plan.lignes.every((l) => l.projet !== null && l.activite !== null)).toBe(true);
  });

  it('RPL-10 : tri avec lignes masquées : par date (entre deux lignes lisibles), puis assignation_id ; sans date après les datées', async () => {
    const { m, p2, t1, tl, t2 } = await monde();
    // Deuxième ligne masquée à la même date que t2, puis une masquée sans date.
    const t3 = await tache(ctx, m.admin, p2.id, m.alice.id, 1, { nom: 'Illisible bis' });
    const t4 = await tache(ctx, m.admin, p2.id, m.alice.id, 1, { nom: 'Illisible sans date' });
    await poserDates(ctx, t3.activite.id, '2027-01-05');
    await poserDates(ctx, t4.activite.id, null);
    const plan = await lire(ctx, m.chef, m.alice);
    expect(plan.lignes.map((l) => l.assignation_id)).toEqual([
      t1.assignation.id,
      t2.assignation.id,
      t3.assignation.id,
      tl.assignation.id,
      t4.assignation.id,
    ]);
    expect(t2.assignation.id).toBeLessThan(t3.assignation.id);
    expect(plan.lignes.map((l) => l.debut_planifie)).toEqual([
      '2027-01-04',
      '2027-01-05',
      '2027-01-05',
      '2027-01-06',
      null,
    ]);
  });
});

describe('Planning d’une ressource : lecture seule (D-157 (1))', () => {
  const ctx = useTestApp();

  it('RPL-11 : la route n’écrit rien (administrateur et chef)', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.chef, m.projet.id, m.alice.id, 2, { nom: 'Lecture' });
    await affecter(ctx, m.autre.id, m.alice.id);
    await tache(ctx, m.admin, m.autre.id, m.alice.id, 1, { nom: 'Autre' });
    const avant = await empreinte(ctx);
    for (const qui of [m.admin, m.chef]) {
      expect((await lire(ctx, qui, m.alice)).lignes).toHaveLength(2);
    }
    expect(await empreinte(ctx)).toEqual(avant);
  });
});
