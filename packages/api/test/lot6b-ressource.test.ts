import type { LightMyRequestResponse } from 'fastify';
import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  liste,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import { creerDependance, creerJalon, type Objet } from './lot1-t2-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import { activiteMan, JANV, matin, poser } from './lot2e-helpers.js';
import { j, S2 } from './lot4a-helpers.js';

/**
 * Lot 6b (D-148, SPEC « Vue restreinte de la ressource ») : refus du rôle ressource sur les projets.
 * Valeurs attendues recopiées de D-148 (2) : 404 pour une route qui désigne un projet, un élément, une
 * dépendance, une affectation, une assignation, un historique ou des saisies ; 403 { erreur:
 * 'Interdit' } pour une liste sans identifiant ; base inchangée après chaque refus.
 */

type Methode = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type Cas = [Methode, string, Corps?];

/** Date du serveur : vendredi 15/01/2027 (les imputations de la semaine S2 ne sont pas futures). */
const AUJOURDHUI = '2027-01-15';

function envoyer(ctx: TestCtx, qui: Acteur | undefined, [methode, url, c]: Cas) {
  return ctx.app.inject({
    method: methode,
    url,
    ...(c ? { payload: c } : {}),
    headers: qui ? { cookie: qui.cookie } : {},
  });
}

/** Chaque requête reçoit `statut` et laisse l'empreinte de la base identique. */
async function refus(ctx: TestCtx, qui: Acteur | undefined, statut: number, cas: Cas[]) {
  for (const c of cas) {
    const avant = await empreinte(ctx);
    const res: LightMyRequestResponse = await envoyer(ctx, qui, c);
    expect(res.statusCode, `${c[0]} ${c[1]} : ${res.body}`).toBe(statut);
    expect(await empreinte(ctx), `${c[0]} ${c[1]} : base modifiée`).toEqual(avant);
  }
}

/**
 * Projet P (chef « chef ») : Alice et Bob affectés ; activité A assignée à Alice (2 j) ; jalon J ;
 * dépendance A → J ; activité MAN M assignée à Alice avec une saisie le 05/01/2027 ; modèle où Alice
 * est affectée.
 */
async function monde6b(ctx: TestCtx) {
  const m = await creerMonde(ctx);
  const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 2, { nom: 'A' });
  const jalon = await creerJalon(ctx, m.chef, m.projet.id, { nom: 'J' });
  const d = await creerDependance(ctx, m.chef, m.projet.id, a.activite.id, jalon.id);
  const man = await activiteMan(ctx, m.chef, m.projet.id, m.alice.id, 1, { nom: 'M' });
  await poser(ctx, m.chef, man.activite.id, JANV, [matin(man.assignation.id, '2027-01-05')]);
  const { rows } = await ctx.pool.query<{ id: number }>(
    'SELECT id FROM affectation_projet WHERE projet_id = $1 AND ressource_id = $2',
    [m.projet.id, m.alice.id],
  );
  const res = await appel(ctx, m.admin).post('/api/modeles', {
    code: 'M6B',
    nom: 'Modèle 6b',
    date_debut: '2027-01-04',
  });
  expect(res.statusCode, res.body).toBe(201);
  const modele = corps(res) as Objet;
  await affecter(ctx, modele.id, m.alice.id);
  return { ...m, a, jalon, d, man, affectation: rows[0]!.id, modele };
}

describe('Vue restreinte de la ressource : API (lot 6b, D-148)', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('RES-1 : listes sans identifiant : GET /api/projets et GET /api/modeles → 403 { erreur: « Interdit » } pour la ressource ; sans session 401 ; base inchangée', async () => {
    const m = await monde6b(ctx);
    await refus(ctx, undefined, 401, [
      ['GET', '/api/projets'],
      ['GET', '/api/modeles'],
    ]);
    await refus(ctx, m.alice, 403, [
      ['GET', '/api/projets'],
      ['GET', '/api/modeles'],
    ]);
    for (const url of ['/api/projets', '/api/modeles']) {
      expect((await appel(ctx, m.alice).get(url)).json(), url).toEqual({ erreur: 'Interdit' });
    }
  });

  it('RES-2 : projet désigné (affecté) et modèle où elle est affectée : lecture, modification, suppression, copie, Gantt, travail, planning, historique → 404 ; base inchangée', async () => {
    const m = await monde6b(ctx);
    const p = `/api/projets/${m.projet.id}`;
    const copie = { nom: 'Copie', code: 'C6B', date_debut: '2027-02-01' };
    await refus(ctx, m.alice, 404, [
      ['GET', p],
      ['PATCH', p, { nom: 'X' }],
      ['PATCH', p, { priorite: 'x' }],
      ['DELETE', p],
      ['POST', `${p}/copie`, copie],
      ['GET', `${p}/gantt`],
      ['GET', `${p}/travail`],
      ['GET', `${p}/planning`],
      ['GET', `${p}/historique`],
      ['GET', `/api/projets/${m.modele.id}`],
      ['GET', `/api/projets/${m.modele.id}/gantt`],
    ]);
  });

  it('RES-3 : éléments : activités, jalons et déplacement → 404 (corps invalide compris) ; base inchangée', async () => {
    const m = await monde6b(ctx);
    const p = `/api/projets/${m.projet.id}`;
    const act = `/api/activites/${m.a.activite.id}`;
    const jal = `/api/jalons/${m.jalon.id}`;
    await refus(ctx, m.alice, 404, [
      ['GET', `${p}/activites`],
      ['POST', `${p}/activites`, { nom: 'X' }],
      ['POST', `${p}/activites`, {}],
      ['PATCH', act, { nom: 'X' }],
      ['PATCH', act, { priorite: 'x' }],
      ['DELETE', act],
      ['GET', `${p}/jalons`],
      ['POST', `${p}/jalons`, { nom: 'X' }],
      ['PATCH', jal, { nom: 'X' }],
      ['DELETE', jal],
      ['POST', `/api/elements/${m.a.activite.id}/deplacer`, { parent_id: null }],
      ['POST', `/api/elements/${m.a.activite.id}/deplacer`, { rang: 'x' }],
    ]);
  });

  it('RES-4 : dépendances : lecture, création, modification, suppression → 404 ; base inchangée', async () => {
    const m = await monde6b(ctx);
    const p = `/api/projets/${m.projet.id}`;
    await refus(ctx, m.alice, 404, [
      ['GET', `${p}/dependances`],
      [
        'POST',
        `${p}/dependances`,
        { predecesseur_id: m.jalon.id, successeur_id: m.man.activite.id },
      ],
      ['PATCH', `/api/dependances/${m.d.id}`, { delai: 1 }],
      ['DELETE', `/api/dependances/${m.d.id}`],
    ]);
  });

  it('RES-5 : affectations (sa propre affectation comprise) : lecture, création, modification, suppression → 404 ; base inchangée', async () => {
    const m = await monde6b(ctx);
    const p = `/api/projets/${m.projet.id}`;
    await refus(ctx, m.alice, 404, [
      ['GET', `${p}/affectations`],
      ['POST', `${p}/affectations`, { ressource_id: m.bob.id }],
      ['PATCH', `/api/affectations/${m.affectation}`, { taux: 50 }],
      ['DELETE', `/api/affectations/${m.affectation}`],
    ]);
  });

  it('RES-6 : assignations (sa propre assignation comprise) : lecture, création, modification, suppression → 404 ; base inchangée', async () => {
    const m = await monde6b(ctx);
    const s = `/api/assignations/${m.a.assignation.id}`;
    await refus(ctx, m.alice, 404, [
      ['GET', `/api/projets/${m.projet.id}/assignations`],
      [
        'POST',
        `/api/activites/${m.a.activite.id}/assignations`,
        { ressource_id: m.bob.id, charge_assignee: 1 },
      ],
      ['PATCH', s, { charge_assignee: 3 }],
      ['PATCH', s, { reste_a_faire: 1 }],
      ['DELETE', s],
    ]);
  });

  it('RES-7 : saisies manuelles de son activité MAN : GET …/saisies, GET …/jours-non-ouvres, PUT …/saisies (corps valide, corps invalide, mois invalide) → 404 ; base inchangée', async () => {
    const m = await monde6b(ctx);
    const base = `/api/activites/${m.man.activite.id}`;
    const valide = { saisies: [matin(m.man.assignation.id, '2027-01-06')] };
    await refus(ctx, m.alice, 404, [
      ['GET', `${base}/saisies?mois=${JANV}`],
      ['GET', `${base}/jours-non-ouvres?mois=${JANV}`],
      ['PUT', `${base}/saisies?mois=${JANV}`, valide],
      ['PUT', `${base}/saisies?mois=${JANV}`, { saisies: 'x' }],
      ['PUT', `${base}/saisies?mois=2027-13`, valide],
    ]);
  });

  it('RES-8 : témoin : un chef de projet ressource, affecté au projet d’un autre chef, garde ses droits (lecture seule : liste, Gantt, saisies ; PATCH 403, base inchangée)', async () => {
    const m = await monde6b(ctx);
    const chefRes = await creerActeur(ctx, 'chefres@example.test', 'chef_de_projet', true);
    await affecter(ctx, m.projet.id, chefRes.id);
    const api = appel(ctx, chefRes);
    const projets = liste(await api.get('/api/projets'));
    expect(projets.find((p) => p.id === m.projet.id)?.peut_ecrire).toBe(false);
    const p = `/api/projets/${m.projet.id}`;
    expect((await api.get(`${p}/gantt`)).statusCode).toBe(200);
    expect(
      (await api.get(`/api/activites/${m.man.activite.id}/saisies?mois=${JANV}`)).statusCode,
    ).toBe(200);
    await refus(ctx, chefRes, 403, [['PATCH', p, { nom: 'X' }]]);
  });

  it('RES-9 : témoin : un administrateur ressource, affecté au projet, garde ses droits (liste, Gantt, PATCH 200)', async () => {
    const m = await monde6b(ctx);
    const adminRes = await creerActeur(ctx, 'adminres@example.test', 'administrateur', true);
    await affecter(ctx, m.projet.id, adminRes.id);
    const api = appel(ctx, adminRes);
    const projets = liste(await api.get('/api/projets'));
    expect(projets.find((p) => p.id === m.projet.id)?.peut_ecrire).toBe(true);
    const p = `/api/projets/${m.projet.id}`;
    expect((await api.get(`${p}/gantt`)).statusCode).toBe(200);
    const res = await api.patch(p, { nom: 'Renommé 6b' });
    expect(res.statusCode, res.body).toBe(200);
    expect(corps(res).nom).toBe('Renommé 6b');
  });

  it('RES-10 : témoin : routes inchangées pour la ressource : auth/me, feuille de temps (GET et PUT), annuaire, calendriers, équipes, validations (200, liste vide)', async () => {
    const m = await monde6b(ctx);
    const api = appel(ctx, m.alice);
    const moi = await api.get('/api/auth/me');
    expect(moi.statusCode).toBe(200);
    expect(corps(moi).id).toBe(m.alice.id);

    const feuille = await api.get(`/api/feuilles?semaine=${S2}`);
    expect(feuille.statusCode, feuille.body).toBe(200);
    const lignes = (feuille.json() as { lignes: { assignation_id: number }[] }).lignes;
    expect(lignes.map((l) => l.assignation_id)).toContain(m.a.assignation.id);
    const put = await ctx.app.inject({
      method: 'PUT',
      url: `/api/feuilles?semaine=${S2}`,
      payload: {
        lignes: [
          { assignation_id: m.a.assignation.id, imputations: [{ jour: j(11), charge: 0.5 }] },
        ],
      },
      headers: { cookie: m.alice.cookie },
    });
    expect(put.statusCode, put.body).toBe(200);

    expect((await api.get('/api/annuaire')).statusCode).toBe(200);
    const calendriers = await api.get('/api/calendriers');
    expect(calendriers.statusCode).toBe(200);
    const premier = liste(calendriers)[0]!;
    expect((await api.get(`/api/calendriers/${premier.id as number}`)).statusCode).toBe(200);
    expect((await api.get('/api/equipes')).statusCode).toBe(200);
    const validations = await api.get(`/api/validations?semaine=${S2}`);
    expect(validations.statusCode).toBe(200);
    expect(validations.json()).toEqual({ feuilles: [] });
  });
});
