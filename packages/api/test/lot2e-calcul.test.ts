import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps } from './lot1-helpers.js';
import { creerAssignation, creerDependance, url } from './lot1-t2-helpers.js';
import {
  calculer,
  creerMonde,
  datesActivite,
  empreinte,
  jours,
  tache,
  travail,
} from './lot2a-helpers.js';
import {
  activiteMan,
  historique,
  journee,
  JANV,
  matin,
  poser,
  saisiesEnBase,
} from './lot2e-helpers.js';

/**
 * Lot 2e-I : POST /api/calcul avec saisies manuelles (SPEC 5.3, 5.6, D-058).
 * Jeu de données de SPEC 5.5 ; D0 = 04/01/2027 sauf mention contraire.
 */
const D0 = '2027-01-04';
const calcul = { d0: D0 };
const DNR = 'dependance_non_respectee';
const J05 = '2027-01-05';
const J06 = '2027-01-06';
const J07 = '2027-01-07';

const ligne = (jour: string, charge: number, surcharge = false) => ({ jour, charge, surcharge });
const vide = { debut_planifie: null, fin_planifiee: null, drapeaux: [] };

async function reste(ctx: TestCtx, assignationId: number): Promise<number> {
  const { rows } = await ctx.pool.query<{ reste_a_faire: number }>(
    'SELECT reste_a_faire FROM assignation WHERE id = $1',
    [assignationId],
  );
  return rows[0]!.reste_a_faire;
}

async function drapeauxDependance(ctx: TestCtx, id: number): Promise<string[]> {
  const { rows } = await ctx.pool.query<{ drapeaux: string[] }>(
    'SELECT drapeaux FROM dependance WHERE id = $1',
    [id],
  );
  return rows[0]!.drapeaux;
}

describe('Calcul : saisies manuelles (MAN) par POST /api/calcul (lot 2e-I)', () => {
  const ctx = useTestApp();

  it('CALC-35 : MAN-1 par l’API, Alice matin et après-midi du 05/01 sur M, ASAP Alice 2 j → ASAP les 04 et 06/01, M le 05/01 ; second calcul : base identique (MAN-3)', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const asap = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await poser(ctx, m.admin, man.activite.id, JANV, journee(man.assignation.id, J05));
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(corps(res)).toMatchObject({ d0: D0, projets: [m.projet.id], lignes: 3 });
    expect(await travail(ctx, asap.assignation.id)).toEqual([
      ligne('2027-01-04', 1),
      ligne(J06, 1),
    ]);
    expect(await travail(ctx, man.assignation.id)).toEqual([ligne(J05, 1)]);
    expect(await datesActivite(ctx, man.activite.id)).toEqual({
      debut_planifie: J05,
      fin_planifiee: J05,
      drapeaux: [],
    });
    const avant = await empreinte(ctx);
    expect((await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul })).statusCode).toBe(
      200,
    );
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('CALC-36 : MAN-2 par l’API, Alice 1 j le 05/01 sur deux activités MAN (WBS 1 et 2) → WBS 2 en surcharge, drapeau surcharge sur WBS 2 seul', async () => {
    const m = await creerMonde(ctx);
    const un = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 1);
    const deux = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 1);
    await poser(ctx, m.admin, un.activite.id, JANV, journee(un.assignation.id, J05));
    await poser(ctx, m.admin, deux.activite.id, JANV, journee(deux.assignation.id, J05));
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, un.assignation.id)).toEqual([ligne(J05, 1, false)]);
    expect(await travail(ctx, deux.assignation.id)).toEqual([ligne(J05, 1, true)]);
    expect(await datesActivite(ctx, un.activite.id)).toEqual({
      debut_planifie: J05,
      fin_planifiee: J05,
      drapeaux: [],
    });
    expect(await datesActivite(ctx, deux.activite.id)).toEqual({
      debut_planifie: J05,
      fin_planifiee: J05,
      drapeaux: ['surcharge'],
    });
  });

  it('CALC-37 : MAN-4 par l’API, d0 = 11/01, saisies Alice 1 j le 05/01 et le 12/01 → M posé le 12/01 seul, reste de l’assignation 1, dates du 05 au 12/01, ASAP les 11 et 13/01 ; saisies inchangées', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const asap = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await poser(ctx, m.admin, man.activite.id, JANV, [
      ...journee(man.assignation.id, J05),
      ...journee(man.assignation.id, '2027-01-12'),
    ]);
    const saisies = await saisiesEnBase(ctx);
    expect(saisies).toHaveLength(4);
    expect(await reste(ctx, man.assignation.id)).toBe(2);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], d0: '2027-01-11' });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, man.assignation.id)).toEqual([ligne('2027-01-12', 1)]);
    expect(await reste(ctx, man.assignation.id)).toBe(1);
    expect(await datesActivite(ctx, man.activite.id)).toEqual({
      debut_planifie: J05,
      fin_planifiee: '2027-01-12',
      drapeaux: [],
    });
    expect(await travail(ctx, asap.assignation.id)).toEqual([
      ligne('2027-01-11', 1),
      ligne('2027-01-13', 1),
    ]);
    expect(await reste(ctx, asap.assignation.id)).toBe(2);
    expect(await saisiesEnBase(ctx)).toEqual(saisies);
  });

  it('CALC-38 : MAN-17 par l’API, deux assignations (Alice 1 j le 05/01, Bob le 06/01 matin) → travail, reste Alice 1 et Bob 0,5, dates du 05 au 06/01, aucun drapeau', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 3);
    const bob = await creerAssignation(ctx, m.admin, man.activite.id, m.bob.id, {
      charge_assignee: 2,
    });
    await poser(ctx, m.admin, man.activite.id, JANV, [
      ...journee(man.assignation.id, J05),
      matin(bob.id, J06),
    ]);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, man.assignation.id)).toEqual([ligne(J05, 1)]);
    expect(await travail(ctx, bob.id)).toEqual([ligne(J06, 0.5)]);
    expect(await reste(ctx, man.assignation.id)).toBe(1);
    expect(await reste(ctx, bob.id)).toBe(0.5);
    expect(await datesActivite(ctx, man.activite.id)).toEqual({
      debut_planifie: J05,
      fin_planifiee: J06,
      drapeaux: [],
    });
  });

  it('CALC-39 : MAN-11 cas a par l’API, A (ASAP, Alice 3 j) → M (MAN, Bob), FD délai 0, saisie de Bob 1 j le 05/01 → drapeau dependance_non_respectee sur M et sur la dépendance', async () => {
    const m = await creerMonde(ctx);
    const a = await tache(ctx, m.admin, m.projet.id, m.alice.id, 3);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.bob.id, 1);
    const dependance = await creerDependance(
      ctx,
      m.admin,
      m.projet.id,
      a.activite.id,
      man.activite.id,
    );
    await poser(ctx, m.admin, man.activite.id, JANV, journee(man.assignation.id, J05));
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await datesActivite(ctx, a.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: J06,
      drapeaux: [],
    });
    expect(await datesActivite(ctx, man.activite.id)).toEqual({
      debut_planifie: J05,
      fin_planifiee: J05,
      drapeaux: [DNR],
    });
    expect(await drapeauxDependance(ctx, dependance.id)).toEqual([DNR]);
  });

  it('CALC-40 : MAN-15 par l’API, Y STARR début validé 06/01 (Alice 2 j), saisie d’Alice 1 j le 06/01 sur une activité MAN → Y les 07 et 08/01, drapeau debut_non_respecte', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 1);
    const y = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2, {
      mode: 'STARR',
      debut_valide: '2027-01-06',
    });
    await poser(ctx, m.admin, man.activite.id, JANV, journee(man.assignation.id, J06));
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, y.assignation.id)).toEqual([ligne(J07, 1), ligne('2027-01-08', 1)]);
    expect(await datesActivite(ctx, y.activite.id)).toEqual({
      debut_planifie: J07,
      fin_planifiee: '2027-01-08',
      drapeaux: ['debut_non_respecte'],
    });
  });

  it('CALC-41 : MAN-16 par l’API, Y DDUR durée 5 début validé 11/01 (Alice 5 j), saisie d’Alice 1 j le 13/01 sur une activité MAN → 1 j par jour du 11 au 15/01, le 13/01 en surcharge', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 1);
    const y = await tache(ctx, m.admin, m.projet.id, m.alice.id, 5, {
      mode: 'DDUR',
      duree_validee: 5,
      debut_valide: '2027-01-11',
    });
    await poser(ctx, m.admin, man.activite.id, JANV, journee(man.assignation.id, '2027-01-13'));
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, y.assignation.id)).toEqual(
      jours(11, 12, 13, 14, 15).map((j) => ligne(j, 1, j === '2027-01-13')),
    );
    expect(await travail(ctx, man.assignation.id)).toEqual([ligne('2027-01-13', 1, false)]);
  });

  it('CALC-42 : saisies effacées puis recalcul → travail retiré, reste 0, dates et drapeaux vides', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await poser(ctx, m.admin, man.activite.id, JANV, journee(man.assignation.id, J05));
    expect((await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul })).statusCode).toBe(
      200,
    );
    expect(await travail(ctx, man.assignation.id)).toEqual([ligne(J05, 1)]);
    expect(await reste(ctx, man.assignation.id)).toBe(1);
    await poser(ctx, m.admin, man.activite.id, JANV, []);
    expect(await saisiesEnBase(ctx)).toEqual([]);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, man.assignation.id)).toEqual([]);
    expect(await reste(ctx, man.assignation.id)).toBe(0);
    expect(await datesActivite(ctx, man.activite.id)).toEqual(vide);
  });

  it('CALC-43 : un calcul de P seul ne modifie ni les saisies ni le reste à faire de Q', async () => {
    const m = await creerMonde(ctx);
    await affecter(ctx, m.autre.id, m.alice.id);
    const p = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 3);
    const q = await activiteMan(ctx, m.admin, m.autre.id, m.alice.id, 3);
    await poser(ctx, m.admin, p.activite.id, JANV, journee(p.assignation.id, J05));
    await poser(ctx, m.admin, q.activite.id, JANV, journee(q.assignation.id, J06));
    const tous = await calculer(ctx, m.admin, { projets: [m.projet.id, m.autre.id], ...calcul });
    expect(tous.statusCode, tous.body).toBe(200);
    expect(await reste(ctx, q.assignation.id)).toBe(1);
    await poser(ctx, m.admin, q.activite.id, JANV, [
      ...journee(q.assignation.id, J06),
      ...journee(q.assignation.id, J07),
    ]);
    const saisies = await saisiesEnBase(ctx);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await saisiesEnBase(ctx)).toEqual(saisies);
    expect(await reste(ctx, q.assignation.id)).toBe(1);
    expect(await travail(ctx, q.assignation.id)).toEqual([ligne(J06, 1)]);
    expect(await reste(ctx, p.assignation.id)).toBe(1);
  });

  it('CALC-44 : les saisies d’un projet non calculé ne comptent pas : calcul de P seul, ASAP Alice 5 j → 1 j par jour du 04 au 08/01, sans surcharge', async () => {
    const m = await creerMonde(ctx);
    await affecter(ctx, m.autre.id, m.alice.id);
    const q = await activiteMan(ctx, m.admin, m.autre.id, m.alice.id, 1);
    await poser(ctx, m.admin, q.activite.id, JANV, journee(q.assignation.id, J05));
    const p = await tache(ctx, m.admin, m.projet.id, m.alice.id, 5);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, p.assignation.id)).toEqual(
      jours(4, 5, 6, 7, 8).map((j) => ligne(j, 1)),
    );
    expect(await travail(ctx, q.assignation.id)).toEqual([]);
  });

  it('CALC-45 : le calcul écrit le reste à faire (2 → 1) sans aucune entrée d’historique', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await poser(ctx, m.admin, man.activite.id, JANV, journee(man.assignation.id, J05));
    const avant = await historique(ctx);
    expect(avant.length).toBeGreaterThan(0);
    expect(await reste(ctx, man.assignation.id)).toBe(2);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await reste(ctx, man.assignation.id)).toBe(1);
    expect(await historique(ctx)).toEqual(avant);
  });

  it('CALC-46 : seul le reste des assignations de feuilles MAN ouvertes est écrit : M close avec saisies (charge 1, reste 1) garde son reste, aucun travail', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 1);
    await poser(ctx, m.admin, man.activite.id, JANV, journee(man.assignation.id, J05));
    const clos = await appel(ctx, m.admin).patch(url.activite(man.activite.id), { close: true });
    expect(clos.statusCode).toBe(200);
    const saisies = await saisiesEnBase(ctx);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await reste(ctx, man.assignation.id)).toBe(1);
    expect(await travail(ctx, man.assignation.id)).toEqual([]);
    expect(await datesActivite(ctx, man.activite.id)).toEqual(vide);
    expect(await saisiesEnBase(ctx)).toEqual(saisies);
  });
});
