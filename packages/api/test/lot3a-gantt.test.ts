import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps, creerActeur, creerProjet, liste } from './lot1-helpers.js';
import {
  creerActivite,
  creerAssignation,
  creerDependance,
  creerJalon,
  url,
  type Objet,
} from './lot1-t2-helpers.js';
import { calculer, creerMonde, empreinte, tache, type Monde } from './lot2a-helpers.js';
import { activiteMan, JANV, journee, poser } from './lot2e-helpers.js';

/**
 * Lot 3a : GET /api/projets/:id/gantt (SPEC §6 « Lecture », 5.3, 5.8, 5.9, D-065).
 * Jeu de données de SPEC 5.5 ; D0 = 04/01/2027. Le réel se pose par UPDATE SQL (pas d'API avant le lot 4).
 */
const calcul = { d0: '2027-01-04' };
const DNR = 'dependance_non_respectee';

interface Gantt {
  projet: Record<string, unknown>;
  elements: (Record<string, unknown> & { id: number })[];
  dependances: Record<string, unknown>[];
  sous_projets: Record<string, unknown>[];
}

const adresse = (projetId: number | string) => `/api/projets/${projetId}/gantt`;

/** GET du Gantt, 200 attendu. */
async function lire(ctx: TestCtx, qui: Parameters<typeof appel>[1], projetId: number) {
  const res = await appel(ctx, qui).get(adresse(projetId));
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Gantt;
}

const element = (g: Gantt, id: number) => {
  const e = g.elements.find((x) => x.id === id);
  expect(e, `élément ${id} absent de la réponse`).toBeDefined();
  return e!;
};

async function poserReel(ctx: TestCtx, assignationId: number, reel: number, reste: number) {
  await ctx.pool.query(
    'UPDATE assignation SET charge_reelle = $1, reste_a_faire = $2 WHERE id = $3',
    [reel, reste, assignationId],
  );
}

describe('Gantt : lecture par GET /api/projets/:id/gantt (lot 3a)', () => {
  const ctx = useTestApp();

  it('GANTT-1-r1 : avant calcul, forme complète : ordre et numéros WBS (parent, enfant, jalon), dates planifiées null, drapeaux [], dépendance avec drapeaux []', async () => {
    const m = await creerMonde(ctx);
    const g = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'Parent' });
    const enfant = await creerActivite(ctx, m.admin, m.projet.id, {
      nom: 'Enfant',
      parent_id: g.id,
    });
    const assignation = await creerAssignation(ctx, m.admin, enfant.id, m.alice.id, {
      charge_assignee: 2,
    });
    const jalon = await creerJalon(ctx, m.admin, m.projet.id, { nom: 'Jalon' });
    const lien = await creerDependance(ctx, m.admin, m.projet.id, enfant.id, jalon.id, {
      type: 'FD',
    });
    const reste = assignation.reste_a_faire as number;
    const base = (a: Objet) => ({
      id: a.id,
      type: 'activite',
      parent_id: a.parent_id,
      rang: a.rang,
      nom: a.nom,
      drapeaux: [],
      mode: a.mode,
      priorite: a.priorite,
      debut_valide: a.debut_valide,
      fin_valide: a.fin_valide,
      duree_validee: a.duree_validee,
      debut_planifie: null,
      fin_planifiee: null,
      close: a.close,
    });

    const res = await appel(ctx, m.admin).get(adresse(m.projet.id));
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({
      projet: {
        id: m.projet.id,
        code: m.projet.code,
        nom: m.projet.nom,
        date_debut: '2027-01-04',
        debut_planifie: null,
        fin_planifiee: null,
        clos: false,
        peut_ecrire: true,
      },
      elements: [
        {
          ...base(g),
          wbs: '1',
          est_parent: true,
          charge_assignee: 2,
          charge_reelle: 0,
          reste_a_faire: reste,
          avancement: 0,
        },
        {
          ...base(enfant),
          wbs: '1.1',
          est_parent: false,
          charge_assignee: 2,
          charge_reelle: 0,
          reste_a_faire: reste,
          avancement: 0,
          initiales: [],
        },
        {
          id: jalon.id,
          type: 'jalon',
          parent_id: null,
          rang: jalon.rang,
          wbs: '2',
          nom: 'Jalon',
          drapeaux: [],
          type_jalon: jalon.type,
          date_validee: jalon.date_validee,
          date_planifiee: null,
        },
      ],
      dependances: [
        {
          id: lien.id,
          predecesseur_id: enfant.id,
          successeur_id: jalon.id,
          type: 'FD',
          delai: 0,
          drapeaux: [],
        },
      ],
      sous_projets: [],
    });
  });

  it('GANTT-2 : DEP-1 après calcul : A du 04 au 06/01, B les 07 et 08/01 ; projet du 04 au 08/01', async () => {
    const m = await creerMonde(ctx);
    const a = await tache(ctx, m.admin, m.projet.id, m.alice.id, 3);
    const b = await tache(ctx, m.admin, m.projet.id, m.bob.id, 2);
    await creerDependance(ctx, m.admin, m.projet.id, a.activite.id, b.activite.id, { type: 'FD' });
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    const g = await lire(ctx, m.admin, m.projet.id);
    expect(element(g, a.activite.id)).toMatchObject({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-06',
    });
    expect(element(g, b.activite.id)).toMatchObject({
      debut_planifie: '2027-01-07',
      fin_planifiee: '2027-01-08',
    });
    expect(g.projet).toMatchObject({ debut_planifie: '2027-01-04', fin_planifiee: '2027-01-08' });
  });

  it('GANTT-3 : feuille, Alice assignée 4 j, réel 1 j, reste 3 j → charges 4, 1, 3 ; avancement 25', async () => {
    const m = await creerMonde(ctx);
    const t = await tache(ctx, m.admin, m.projet.id, m.alice.id, 4);
    await poserReel(ctx, t.assignation.id, 1, 3);
    const g = await lire(ctx, m.admin, m.projet.id);
    expect(element(g, t.activite.id)).toMatchObject({
      est_parent: false,
      charge_assignee: 4,
      charge_reelle: 1,
      reste_a_faire: 3,
      avancement: 25,
    });
  });

  it('GANTT-4 : parent G à deux feuilles (4, 1, 3 et 2, 0, 2) → G parent, charges 6, 1, 5, avancement 16,67 ; dates de G = plus petit début, plus grande fin de ses enfants', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'G' });
    const f1 = await tache(ctx, m.admin, m.projet.id, m.alice.id, 4, { parent_id: parent.id });
    const f2 = await tache(ctx, m.admin, m.projet.id, m.bob.id, 2, { parent_id: parent.id });
    await poserReel(ctx, f1.assignation.id, 1, 3);
    await poserReel(ctx, f2.assignation.id, 0, 2);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    const g = await lire(ctx, m.admin, m.projet.id);
    expect(element(g, parent.id)).toMatchObject({
      est_parent: true,
      charge_assignee: 6,
      charge_reelle: 1,
      reste_a_faire: 5,
      avancement: 16.67,
    });
    const debuts = [f1, f2].map((f) => element(g, f.activite.id).debut_planifie as string);
    const fins = [f1, f2].map((f) => element(g, f.activite.id).fin_planifiee as string);
    for (const d of [...debuts, ...fins]) expect(d).toEqual(expect.any(String));
    expect(element(g, parent.id).debut_planifie).toBe([...debuts].sort()[0]);
    expect(element(g, parent.id).fin_planifiee).toBe([...fins].sort().reverse()[0]);
  });

  it('GANTT-5 : activité sans assignation : charges 0, avancement null ; un jalon n’a aucun champ de charge', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id);
    const j = await creerJalon(ctx, m.admin, m.projet.id);
    const g = await lire(ctx, m.admin, m.projet.id);
    expect(element(g, a.id)).toMatchObject({
      charge_assignee: 0,
      charge_reelle: 0,
      reste_a_faire: 0,
      avancement: null,
    });
    const jalon = element(g, j.id);
    expect(jalon.type).toBe('jalon');
    for (const champ of ['charge_assignee', 'charge_reelle', 'reste_a_faire', 'avancement']) {
      expect(jalon).not.toHaveProperty(champ);
    }
  });

  /** ALAP-3 (Alice), JAL-2 (Bob) et MAN-11 cas a (Carole, Dave) dans le même projet, calculés. */
  async function monterDrapeaux(m: Monde) {
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    const dave = await creerActeur(ctx, 'dave@example.test', 'ressource', true);
    await affecter(ctx, m.projet.id, carole.id);
    await affecter(ctx, m.projet.id, dave.id);
    const p = m.projet.id;
    // ALAP-3 : fin validée mer 06/01, Alice 5 j
    const alap = await tache(ctx, m.admin, p, m.alice.id, 5, {
      mode: 'ALAP',
      fin_valide: '2027-01-06',
    });
    // JAL-2 : jalon fixe validé au 06/01, prédécesseur finissant le 08/01 (Bob 5 j du 04 au 08/01)
    const pred = await tache(ctx, m.admin, p, m.bob.id, 5);
    const jalon = await creerJalon(ctx, m.admin, p, { type: 'fixe', date_validee: '2027-01-06' });
    await creerDependance(ctx, m.admin, p, pred.activite.id, jalon.id, { type: 'FD' });
    // MAN-11 cas a : A (ASAP, Carole 3 j) → M (MAN, Dave), FD délai 0, saisie de Dave 1 j le 05/01
    const a = await tache(ctx, m.admin, p, carole.id, 3);
    const man = await activiteMan(ctx, m.admin, p, dave.id, 1);
    const lien = await creerDependance(ctx, m.admin, p, a.activite.id, man.activite.id);
    await poser(ctx, m.admin, man.activite.id, JANV, journee(man.assignation.id, '2027-01-05'));
    const res = await calculer(ctx, m.admin, { projets: [p], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    return { alap, pred, jalon, a, man, lien };
  }

  it('GANTT-6 : drapeaux après calcul : ALAP-3 (retard), JAL-2 (jalon, retard), MAN-11 cas a (dependance_non_respectee sur M et sur la dépendance)', async () => {
    const m = await creerMonde(ctx);
    const s = await monterDrapeaux(m);
    const g = await lire(ctx, m.admin, m.projet.id);
    expect(element(g, s.alap.activite.id).drapeaux).toEqual(['retard']);
    expect(element(g, s.jalon.id)).toMatchObject({
      date_planifiee: '2027-01-06',
      drapeaux: ['retard'],
    });
    expect(element(g, s.a.activite.id).drapeaux).toEqual([]);
    expect(element(g, s.man.activite.id).drapeaux).toEqual([DNR]);
    expect(g.dependances.find((d) => d.id === s.lien.id)?.drapeaux).toEqual([DNR]);
  });

  it('GANTT-7 : P avec sous-projet P1 contenant C, calcul de P : sous_projets = [P1 avec ses dates agrégées] ; C absent de elements', async () => {
    const m = await creerMonde(ctx);
    const p1 = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    await affecter(ctx, p1.id, m.alice.id);
    const a = await tache(ctx, m.admin, m.projet.id, m.bob.id, 2);
    const c = await tache(ctx, m.admin, p1.id, m.alice.id, 3);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    const g = await lire(ctx, m.admin, m.projet.id);
    expect(g.sous_projets).toEqual([
      {
        id: p1.id,
        code: p1.code,
        nom: p1.nom,
        debut_planifie: '2027-01-04',
        fin_planifiee: '2027-01-06',
        clos: false,
      },
    ]);
    expect(g.elements.map((e) => e.id)).toEqual([a.activite.id]);
    expect(g.elements.map((e) => e.id)).not.toContain(c.activite.id);
  });

  it('GANTT-8-r1 : droits : 401 sans session ; ressource affectée 404 ; non affectée 404 ; chef hors portée 404 ; « abc », 2147483648 et 999999 (administrateur) → 404 ; modèle lu par une ressource affectée → 404 ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    const modele = corps(
      await appel(ctx, m.admin).post('/api/modeles', {
        code: 'M1',
        nom: 'Modèle',
        date_debut: '2027-01-04',
      }),
    ) as Objet;
    await affecter(ctx, modele.id, m.alice.id);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const avant = await empreinte(ctx);

    expect((await appel(ctx).get(adresse(m.projet.id))).statusCode).toBe(401);

    // Révision 6b (D-031, D-148 (2)) : la ressource affectée ne lit plus le Gantt.
    expect((await appel(ctx, m.alice).get(adresse(m.projet.id))).statusCode).toBe(404);

    expect((await appel(ctx, carole).get(adresse(m.projet.id))).statusCode).toBe(404);
    expect((await appel(ctx, m.autreChef).get(adresse(m.projet.id))).statusCode).toBe(404);
    expect((await appel(ctx, m.admin).get(adresse('abc'))).statusCode).toBe(404);
    expect((await appel(ctx, m.admin).get(adresse(2147483648))).statusCode).toBe(404);
    expect((await appel(ctx, m.admin).get(adresse(999999))).statusCode).toBe(404);
    expect((await appel(ctx, m.alice).get(adresse(modele.id))).statusCode).toBe(404);

    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('GANTT-11 : G parent de H, H parent de deux feuilles (4, 1, 3 et 2, 0, 2) et d’une feuille directe de G (1 j, reste 1) → H charges 6, 1, 5, avancement 16,67 ; G charges 7, 1, 6, avancement 14,29 ; G et H parents', async () => {
    const m = await creerMonde(ctx);
    const g = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'G' });
    const h = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'H', parent_id: g.id });
    const f1 = await tache(ctx, m.admin, m.projet.id, m.alice.id, 4, { parent_id: h.id });
    const f2 = await tache(ctx, m.admin, m.projet.id, m.bob.id, 2, { parent_id: h.id });
    const f3 = await tache(ctx, m.admin, m.projet.id, m.alice.id, 1, { parent_id: g.id });
    await poserReel(ctx, f1.assignation.id, 1, 3);
    await poserReel(ctx, f2.assignation.id, 0, 2);
    await poserReel(ctx, f3.assignation.id, 0, 1);
    const r = await lire(ctx, m.admin, m.projet.id);
    expect(element(r, h.id)).toMatchObject({
      est_parent: true,
      charge_assignee: 6,
      charge_reelle: 1,
      reste_a_faire: 5,
      avancement: 16.67,
    });
    expect(element(r, g.id)).toMatchObject({
      est_parent: true,
      charge_assignee: 7,
      charge_reelle: 1,
      reste_a_faire: 6,
      avancement: 14.29,
    });
  });

  it('GANTT-9-r1 : chef de projet affecté à P seul, pas à P1 : sous_projets vide pour lui, P1 présent pour l’administrateur ; Alice (ressource) 404', async () => {
    const m = await creerMonde(ctx);
    const p1 = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    // Révision 6b (D-031, D-148 (2), (9)) : témoin de lecture = chef affecté au projet d'un autre chef.
    const lecteur = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
    await affecter(ctx, m.projet.id, lecteur.id);
    const pourLecteur = await lire(ctx, lecteur, m.projet.id);
    expect(pourLecteur.projet.peut_ecrire).toBe(false);
    expect(pourLecteur.sous_projets).toEqual([]);
    expect((await appel(ctx, m.alice).get(adresse(m.projet.id))).statusCode).toBe(404);
    const pourAdmin = await lire(ctx, m.admin, m.projet.id);
    expect(pourAdmin.sous_projets.map((s) => s.id)).toEqual([p1.id]);
  });

  it('GANTT-10 : caractérisation (vert d’emblée) : après le calcul de GANTT-6, GET …/dependances et GET …/jalons ne portent pas de champ drapeaux', async () => {
    const m = await creerMonde(ctx);
    await monterDrapeaux(m);
    const deps = await appel(ctx, m.admin).get(url.dependances(m.projet.id));
    expect(deps.statusCode).toBe(200);
    expect(liste(deps).length).toBeGreaterThan(0);
    for (const d of liste(deps)) expect(d).not.toHaveProperty('drapeaux');
    const jalons = await appel(ctx, m.admin).get(url.jalons(m.projet.id));
    expect(jalons.statusCode).toBe(200);
    expect(liste(jalons).length).toBeGreaterThan(0);
    for (const j of liste(jalons)) expect(j).not.toHaveProperty('drapeaux');
  });
});
