// Lot 6c (D-149 (4)) : visibilité. VIS-1 à VIS-5. Clés absentes (pas null) hors droit d'écriture.
import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { appel, corps, liste, type Acteur, type Corps } from './lot1-helpers.js';
import {
  creerActivite,
  creerAssignation,
  creerJalon,
  creerMonde,
  url,
  type Monde,
  type Objet,
} from './lot1-t2-helpers.js';
import { S2 } from './lot4a-helpers.js';
import {
  CLES_6C,
  chefLecteur,
  lireGantt,
  lirePlanning,
  poserDatePlanifiee,
  urlGantt,
} from './lot6c-helpers.js';

/** Projet à une feuille vendue 3 (assignée 4) et un jalon à date client, planifié le 2027-01-08. */
async function monde(ctx: TestCtx) {
  const m = await creerMonde(ctx);
  const a = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: 3 });
  await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: 4 });
  const j = await creerJalon(ctx, m.admin, m.projet.id, { date_client: '2027-01-06' });
  await poserDatePlanifiee(ctx, j.id, '2027-01-08');
  return { m, a, j };
}

const cles = (o: Corps) => Object.keys(o).filter((k) => (CLES_6C as readonly string[]).includes(k));

async function sansCles(ctx: TestCtx, qui: Acteur, adresse: string, cle: 'elements' | null) {
  const res = await appel(ctx, qui).get(adresse);
  expect(res.statusCode, `GET ${adresse}`).toBe(200);
  const lignes = cle ? (res.json() as Record<string, Corps[]>)[cle]! : (liste(res) as Corps[]);
  expect(lignes.length).toBeGreaterThan(0);
  for (const l of lignes) expect(cles(l), `${adresse} #${String(l.id)}`).toEqual([]);
  return res;
}

describe('Lot 6c : visibilité (D-149 (4), (11))', () => {
  const ctx = useTestApp();

  it('VIS-1 : chef lecteur : …/gantt et …/planning sans les clés de 6c ni projet.totaux ; l’administrateur les reçoit', async () => {
    const { m, a, j } = await monde(ctx);
    const lecteur = await chefLecteur(ctx, m);

    const g = await lireGantt(ctx, lecteur, m.projet.id);
    expect(g.projet.peut_ecrire).toBe(false);
    expect('totaux' in g.projet).toBe(false);
    expect(g.elements.map((e) => e.id)).toEqual([a.id, j.id]);
    for (const e of g.elements) expect(cles(e)).toEqual([]);
    expect(g.elements[0]).toMatchObject({ charge_assignee: 4, nom: a.nom });
    await sansCles(ctx, lecteur, url.planning(m.projet.id), null);
    expect((await lirePlanning(ctx, lecteur, m.projet.id)).map((e) => e.id)).toEqual([a.id, j.id]);

    const ga = await lireGantt(ctx, m.admin, m.projet.id);
    expect(ga.projet.totaux).toBeDefined();
    expect(ga.elements[0]).toMatchObject({ charge_vendue: 3, marge: -1 });
    expect(ga.elements[1]).toMatchObject({
      date_client: '2027-01-06',
      ecart_client: 2,
      engagement_depasse: true,
    });
  });

  it('VIS-2 : …/activites et …/jalons : clés absentes pour le chef lecteur, présentes pour l’administrateur', async () => {
    const { m } = await monde(ctx);
    const lecteur = await chefLecteur(ctx, m);
    await sansCles(ctx, lecteur, url.activites(m.projet.id), null);
    await sansCles(ctx, lecteur, url.jalons(m.projet.id), null);
    const acts = liste(await appel(ctx, m.admin).get(url.activites(m.projet.id)));
    const jals = liste(await appel(ctx, m.admin).get(url.jalons(m.projet.id)));
    expect(acts[0]).toMatchObject({ charge_vendue: 3 });
    expect(jals[0]).toMatchObject({ date_client: '2027-01-06', engagement_depasse: true });
  });

  it('VIS-3 : écrivains (administrateur, chef du projet) : clés présentes, null compris, y compris dans les réponses POST et PATCH', async () => {
    const { m } = await monde(ctx);
    for (const qui of [m.admin, m.chef]) {
      const g = await lireGantt(ctx, qui, m.projet.id);
      expect(g.projet.totaux).toBeDefined();
      for (const e of g.elements) {
        expect(cles(e).length, `gantt ${qui.email}`).toBeGreaterThan(0);
      }
      const api = appel(ctx, qui);
      const a = await api.post(url.activites(m.projet.id), { nom: 'Sans vendue' });
      expect(corps(a)).toMatchObject({ charge_vendue: null, marge: null });
      const pa = await api.patch(url.activite(corps(a).id as number), { nom: 'Renommée' });
      expect(corps(pa)).toMatchObject({ charge_vendue: null, marge: null });
      const j = await api.post(url.jalons(m.projet.id), { nom: 'Sans client' });
      expect(corps(j)).toMatchObject({
        date_client: null,
        ecart_client: null,
        engagement_depasse: false,
      });
      const pj = await api.patch(url.jalon(corps(j).id as number), { nom: 'Renommé' });
      expect(corps(pj)).toMatchObject({
        date_client: null,
        ecart_client: null,
        engagement_depasse: false,
      });
    }
  });

  it('VIS-4 : rôle ressource : 404 sur les routes du projet ; /api/mes-taches sans clé de 6c (témoin, D-148 (6))', async () => {
    const { m } = await monde(ctx);
    for (const adresse of [
      urlGantt(m.projet.id),
      url.planning(m.projet.id),
      url.activites(m.projet.id),
      url.jalons(m.projet.id),
    ]) {
      expect((await appel(ctx, m.alice).get(adresse)).statusCode, adresse).toBe(404);
    }
    const res = await appel(ctx, m.alice).get('/api/mes-taches');
    expect(res.statusCode).toBe(200);
    expect(liste(res)).toHaveLength(1);
    expect(res.body).not.toMatch(/charge_vendue|marge|date_client|ecart_client|engagement_depasse/);
  });

  it('VIS-5 : routes inchangées : GET /api/projets, …/travail, /api/validations, /api/feuilles sans clé de 6c (témoin)', async () => {
    const { m } = await monde(ctx);
    await ctx.pool.query('UPDATE jalon SET date_planifiee = date_planifiee');
    const lecteurs: [Acteur, string][] = [
      [m.admin, '/api/projets'],
      [m.admin, `/api/projets/${m.projet.id}/travail`],
      [m.admin, `/api/validations?semaine=${S2}`],
      [m.alice, `/api/feuilles?semaine=${S2}`],
    ];
    for (const [qui, adresse] of lecteurs) {
      const res = await appel(ctx, qui).get(adresse);
      expect(res.statusCode, adresse).toBe(200);
      expect(res.body, adresse).not.toMatch(
        /charge_vendue|"marge"|date_client|ecart_client|engagement_depasse|totaux/,
      );
    }
  });
});

export type { Monde, Objet };
