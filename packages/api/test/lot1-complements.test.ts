import { describe, expect, it } from 'vitest';
import { seedUser, useTestApp, type TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  creerCalendrier,
  creerProjet,
  liste,
} from './lot1-helpers.js';
import type { Acteur, Corps } from './lot1-helpers.js';
import {
  attendreRepos,
  compter,
  creerActivite,
  creerAssignation,
  creerDependance,
  creerJalon,
  creerMonde,
  planning,
  url,
  type Monde,
} from './lot1-t2-helpers.js';

type Methode = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Une requête de la liste, avec l'acteur et le statut attendu. */
interface Cas {
  qui: Acteur | undefined;
  methode: Methode;
  adresse: string;
  corps?: Corps;
  statut: number;
}

const libelleActeur = (qui: Acteur | undefined) => (qui ? qui.email : 'sans session');
const nomCas = (c: Cas) =>
  `${c.methode} ${c.adresse} ${JSON.stringify(c.corps ?? {})} par ${libelleActeur(c.qui)}`;

const envoyer = (ctx: TestCtx, c: Pick<Cas, 'qui' | 'methode' | 'adresse' | 'corps'>) =>
  ctx.app.inject({
    method: c.methode,
    url: c.adresse,
    ...(c.corps ? { payload: c.corps } : {}),
    headers: c.qui ? { cookie: c.qui.cookie } : {},
  });

/**
 * Empreinte de la base : pour chaque table sauf `session` et `schema_version`, le contenu trié et
 * sérialisé (une ligne = le texte de l'enregistrement).
 */
async function empreinte(ctx: TestCtx): Promise<Record<string, string[]>> {
  await attendreRepos(ctx);
  const { rows: tables } = await ctx.pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT IN ('session', 'schema_version')
      ORDER BY tablename`,
  );
  const resultat: Record<string, string[]> = {};
  for (const { tablename } of tables) {
    const { rows } = await ctx.pool.query<{ ligne: string }>(
      `SELECT t::text AS ligne FROM "${tablename}" t ORDER BY 1`,
    );
    resultat[tablename] = rows.map((r) => r.ligne);
  }
  return resultat;
}

/** Chaque requête reçoit le statut attendu et laisse l'empreinte de la base identique. */
async function verifierRefus(ctx: TestCtx, cas: Cas[]): Promise<void> {
  let avant = await empreinte(ctx);
  for (const c of cas) {
    const res = await envoyer(ctx, c);
    expect(res.statusCode, nomCas(c)).toBe(c.statut);
    const apres = await empreinte(ctx);
    expect(apres, `${nomCas(c)} : la base a changé`).toEqual(avant);
    avant = apres;
  }
}

/** Preuve que l'empreinte détecte une écriture : une requête témoin acceptée la change. */
async function prouverDetection(ctx: TestCtx, c: Cas): Promise<void> {
  const avant = await empreinte(ctx);
  const res = await envoyer(ctx, c);
  expect(res.statusCode, `témoin ${nomCas(c)}`).toBe(c.statut);
  expect(await empreinte(ctx), `témoin ${nomCas(c)} : l'empreinte doit changer`).not.toEqual(avant);
}

/** Sans session → 401, chef d'un autre projet → 404, ressource affectée → 404 (révision 6b, D-148 (2)). */
function trio(m: Monde, methode: Methode, adresse: string, c?: Corps): Cas[] {
  const base = { methode, adresse, ...(c ? { corps: c } : {}) };
  return [
    { ...base, qui: undefined, statut: 401 },
    { ...base, qui: m.autreChef, statut: 404 },
    { ...base, qui: m.alice, statut: 404 },
  ];
}

describe('Compléments de T2 : refus sans écriture, identifiants, visibilité par affectation', () => {
  const ctx = useTestApp();
  const DELAI = 120_000;

  it(
    'REF-1-r1 : routes de T1, toute requête refusée laisse l’empreinte de la base identique',
    async () => {
      const m = await creerMonde(ctx);
      const { admin, chef, autreChef, alice } = m;
      const carol = await creerActeur(ctx, 'carol@example.test', 'ressource', true);
      const nonRessource = await creerActeur(ctx, 'sans@example.test', 'ressource', false);
      const inactif = await seedUser(ctx.pool, { email: 'inactif@example.test', actif: false });
      await ctx.pool.query('UPDATE utilisateur SET est_ressource = true WHERE id = $1', [inactif]);
      const sous = await creerProjet(ctx, admin, { chef_id: chef.id, parent_id: m.projet.id });
      const cal = await creerCalendrier(ctx, admin);
      const calUtilise = await creerCalendrier(ctx, admin);
      await appel(ctx, admin).patch(`/api/utilisateurs/${carol.id}`, {
        calendrier_id: calUtilise.id,
      });
      await ctx.pool.query(
        "INSERT INTO calendrier_ferie (calendrier_id, jour, libelle) VALUES ($1, '2027-01-01', '')",
        [cal.id],
      );
      const defaut = liste(await appel(ctx, admin).get('/api/calendriers')).find(
        (c) => c.est_defaut === true,
      );
      const act = await creerActivite(ctx, admin, m.projet.id);
      await creerAssignation(ctx, admin, act.id, alice.id);
      const { rows } = await ctx.pool.query<{ id: number; ressource_id: number }>(
        'SELECT id, ressource_id FROM affectation_projet WHERE projet_id = $1',
        [m.projet.id],
      );
      const affAlice = rows.find((r) => r.ressource_id === alice.id)!.id;
      const P = m.projet;
      const A = m.autre;

      const cas: Cas[] = [
        // calendriers (CAL-6, CAL-7, CAL-10, CAL-11)
        {
          qui: undefined,
          methode: 'POST',
          adresse: '/api/calendriers',
          corps: { nom: 'X' },
          statut: 401,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: '/api/calendriers',
          corps: { nom: 'X' },
          statut: 403,
        },
        {
          qui: alice,
          methode: 'POST',
          adresse: '/api/calendriers',
          corps: { nom: 'X' },
          statut: 403,
        },
        ...[[], [0], [8], [1, 9]].map((jours): Cas => ({
          qui: admin,
          methode: 'POST',
          adresse: '/api/calendriers',
          corps: { nom: 'Invalide', jours_travailles: jours },
          statut: 400,
        })),
        { qui: admin, methode: 'POST', adresse: '/api/calendriers', corps: {}, statut: 400 },
        {
          qui: undefined,
          methode: 'PATCH',
          adresse: `/api/calendriers/${cal.id}`,
          corps: { nom: 'Y' },
          statut: 401,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: `/api/calendriers/${cal.id}`,
          corps: { nom: 'Y' },
          statut: 403,
        },
        {
          qui: alice,
          methode: 'PATCH',
          adresse: `/api/calendriers/${cal.id}`,
          corps: { nom: 'Y' },
          statut: 403,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/calendriers/${cal.id}`,
          corps: { jours_travailles: [] },
          statut: 400,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: '/api/calendriers/999999',
          corps: { nom: 'Y' },
          statut: 404,
        },
        { qui: undefined, methode: 'DELETE', adresse: `/api/calendriers/${cal.id}`, statut: 401 },
        { qui: chef, methode: 'DELETE', adresse: `/api/calendriers/${cal.id}`, statut: 403 },
        { qui: alice, methode: 'DELETE', adresse: `/api/calendriers/${cal.id}`, statut: 403 },
        { qui: admin, methode: 'DELETE', adresse: `/api/calendriers/${defaut!.id}`, statut: 409 },
        {
          qui: admin,
          methode: 'DELETE',
          adresse: `/api/calendriers/${calUtilise.id}`,
          statut: 409,
        },
        { qui: admin, methode: 'DELETE', adresse: '/api/calendriers/999999', statut: 404 },
        // jours fériés
        {
          qui: undefined,
          methode: 'POST',
          adresse: `/api/calendriers/${cal.id}/feries`,
          corps: { jour: '2027-05-01' },
          statut: 401,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: `/api/calendriers/${cal.id}/feries`,
          corps: { jour: '2027-05-01' },
          statut: 403,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: `/api/calendriers/${cal.id}/feries`,
          corps: { jour: 'pas-une-date' },
          statut: 400,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: `/api/calendriers/${cal.id}/feries`,
          corps: { jour: '2027-01-01' },
          statut: 409,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/calendriers/999999/feries',
          corps: { jour: '2027-05-01' },
          statut: 404,
        },
        {
          qui: chef,
          methode: 'DELETE',
          adresse: `/api/calendriers/${cal.id}/feries/2027-01-01`,
          statut: 403,
        },
        {
          qui: undefined,
          methode: 'DELETE',
          adresse: `/api/calendriers/${cal.id}/feries/2027-01-01`,
          statut: 401,
        },
        {
          qui: admin,
          methode: 'DELETE',
          adresse: `/api/calendriers/${cal.id}/feries/2027-05-01`,
          statut: 404,
        },
        // projets (PRJ-6, PRJ-7, PRJ-9, PRJ-10, PRJ-15, PRJ-16, PRJ-18)
        {
          qui: undefined,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04' },
          statut: 401,
        },
        {
          qui: alice,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04' },
          statut: 403,
        },
        { qui: admin, methode: 'POST', adresse: '/api/projets', corps: { code: 'X' }, statut: 400 },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04', priorite: 1001 },
          statut: 400,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04', priorite: -1 },
          statut: 400,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: String(P.code).toLowerCase(), nom: 'X', date_debut: '2027-01-04' },
          statut: 409,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04', chef_id: alice.id },
          statut: 422,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04', chef_id: inactif },
          statut: 422,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04', chef_id: 999999 },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04', chef_id: autreChef.id },
          statut: 403,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: '/api/projets',
          corps: { code: 'X', nom: 'X', date_debut: '2027-01-04', parent_id: A.id },
          statut: 404,
        },
        {
          qui: undefined,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { nom: 'X' },
          statut: 401,
        },
        {
          qui: autreChef,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { nom: 'Pirate' },
          statut: 404,
        },
        {
          qui: alice,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { nom: 'X' },
          statut: 404,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { priorite: 1001 },
          statut: 400,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { code: String(A.code).toUpperCase() },
          statut: 409,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { chef_id: alice.id },
          statut: 422,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { chef_id: inactif },
          statut: 422,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { parent_id: P.id },
          statut: 422,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { parent_id: sous.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { chef_id: autreChef.id },
          statut: 403,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: `/api/projets/${P.id}`,
          corps: { parent_id: A.id },
          statut: 404,
        },
        ...trio(m, 'DELETE', `/api/projets/${P.id}`),
        { qui: admin, methode: 'DELETE', adresse: `/api/projets/${P.id}`, statut: 409 },
        // affectations (AFF-3, AFF-8, AFF-9, AFF-12)
        ...trio(m, 'POST', `/api/projets/${P.id}/affectations`, { ressource_id: carol.id }),
        {
          qui: admin,
          methode: 'POST',
          adresse: `/api/projets/${P.id}/affectations`,
          corps: { ressource_id: alice.id },
          statut: 409,
        },
        ...[0, -5, 100.01, 101].map((taux): Cas => ({
          qui: admin,
          methode: 'POST',
          adresse: `/api/projets/${P.id}/affectations`,
          corps: { ressource_id: carol.id, taux },
          statut: 400,
        })),
        {
          qui: admin,
          methode: 'POST',
          adresse: `/api/projets/${P.id}/affectations`,
          corps: {},
          statut: 400,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: `/api/projets/${P.id}/affectations`,
          corps: { ressource_id: nonRessource.id },
          statut: 422,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: `/api/projets/${P.id}/affectations`,
          corps: { ressource_id: carol.id, date_debut: '2027-02-01', date_fin: '2027-01-31' },
          statut: 422,
        },
        ...trio(m, 'PATCH', `/api/affectations/${affAlice}`, { taux: 10 }),
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/affectations/${affAlice}`,
          corps: { taux: 0 },
          statut: 400,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/affectations/${affAlice}`,
          corps: { date_debut: '2027-02-01', date_fin: '2027-01-31' },
          statut: 422,
        },
        ...trio(m, 'DELETE', `/api/affectations/${affAlice}`),
        { qui: admin, methode: 'DELETE', adresse: `/api/affectations/${affAlice}`, statut: 409 },
        // utilisateurs (USR, AFF-11, CAL-5)
        { qui: undefined, methode: 'GET', adresse: '/api/utilisateurs', statut: 401 },
        { qui: chef, methode: 'GET', adresse: '/api/utilisateurs', statut: 403 },
        {
          qui: undefined,
          methode: 'POST',
          adresse: '/api/utilisateurs',
          corps: {
            nom: 'N',
            email: 'n@example.test',
            mot_de_passe: 'motdepasse-long',
            role: 'ressource',
          },
          statut: 401,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: '/api/utilisateurs',
          corps: {
            nom: 'N',
            email: 'n@example.test',
            mot_de_passe: 'motdepasse-long',
            role: 'ressource',
          },
          statut: 403,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/utilisateurs',
          corps: {
            nom: 'N',
            email: 'ALICE@example.test',
            mot_de_passe: 'motdepasse-long',
            role: 'ressource',
          },
          statut: 409,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/utilisateurs',
          corps: { nom: 'N', email: 'n@example.test', mot_de_passe: '', role: 'ressource' },
          statut: 400,
        },
        {
          qui: admin,
          methode: 'POST',
          adresse: '/api/utilisateurs',
          corps: {
            nom: 'N',
            email: 'n@example.test',
            mot_de_passe: 'motdepasse-long',
            role: 'ressource',
            calendrier_id: 999999,
          },
          statut: 422,
        },
        {
          qui: undefined,
          methode: 'PATCH',
          adresse: `/api/utilisateurs/${alice.id}`,
          corps: { nom: 'X' },
          statut: 401,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: `/api/utilisateurs/${alice.id}`,
          corps: { nom: 'X' },
          statut: 403,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/utilisateurs/${admin.id}`,
          corps: { actif: false },
          statut: 409,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/utilisateurs/${admin.id}`,
          corps: { role: 'ressource' },
          statut: 409,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/utilisateurs/${alice.id}`,
          corps: { est_ressource: false },
          statut: 409,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/utilisateurs/${alice.id}`,
          corps: { email: 'bob@example.test' },
          statut: 409,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/utilisateurs/${alice.id}`,
          corps: { calendrier_id: 999999 },
          statut: 422,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: `/api/utilisateurs/${alice.id}`,
          corps: { role: 'inconnu' },
          statut: 400,
        },
        {
          qui: admin,
          methode: 'PATCH',
          adresse: '/api/utilisateurs/999999',
          corps: { nom: 'X' },
          statut: 404,
        },
      ];
      await verifierRefus(ctx, cas);
      // le témoin prouve que l'empreinte voit une écriture acceptée
      await prouverDetection(ctx, {
        qui: admin,
        methode: 'POST',
        adresse: '/api/calendriers',
        corps: { nom: 'Témoin' },
        statut: 201,
      });
      await prouverDetection(ctx, {
        qui: admin,
        methode: 'PATCH',
        adresse: `/api/utilisateurs/${alice.id}`,
        corps: { nom: 'Témoin' },
        statut: 200,
      });
    },
    DELAI,
  );

  it(
    'REF-2-r1 : routes de T2, toute requête refusée laisse l’empreinte de la base identique',
    async () => {
      const m = await creerMonde(ctx);
      const { chef, alice, admin } = m;
      const P = m.projet;
      const carol = await creerActeur(ctx, 'carol@example.test', 'ressource', true);
      const a = await creerActivite(ctx, chef, P.id);
      const b = await creerActivite(ctx, chef, P.id);
      const parent = await creerActivite(ctx, chef, P.id);
      const enfant = await creerActivite(ctx, chef, P.id, { parent_id: parent.id });
      const j = await creerJalon(ctx, chef, P.id);
      const etrangere = await creerActivite(ctx, admin, m.autre.id);
      const d = await creerDependance(ctx, chef, P.id, a.id, b.id);
      const s = await creerAssignation(ctx, chef, a.id, alice.id, { charge_assignee: 2 });
      const bobAss = await creerAssignation(ctx, chef, b.id, m.bob.id);
      await ctx.pool.query('UPDATE assignation SET charge_reelle = 1 WHERE id = $1', [bobAss.id]);

      const cas: Cas[] = [
        // activités (ACT-14, ACT-17, ACT-18, ACT-21)
        ...trio(m, 'POST', url.activites(P.id), { nom: 'X' }),
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: '' },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', priorite: 1001 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', priorite: -1 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', mode: 'BIDON' },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', debut_planifie: '2027-01-04' },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', debut_valide: '2027-02-01', fin_valide: '2027-01-01' },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', duree_validee: 0 },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', parent_id: j.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', parent_id: etrangere.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.activites(P.id),
          corps: { nom: 'X', parent_id: a.id },
          statut: 422,
        },
        ...trio(m, 'PATCH', url.activite(a.id), { nom: 'X' }),
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.activite(a.id),
          corps: { priorite: -1 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.activite(a.id),
          corps: { priorite: 1001 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.activite(a.id),
          corps: { mode: 'BIDON' },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.activite(a.id),
          corps: { debut_planifie: '2027-01-04' },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.activite(a.id),
          corps: { debut_valide: '2027-02-01', fin_valide: '2027-01-01' },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.activite(a.id),
          corps: { duree_validee: 0 },
          statut: 422,
        },
        ...trio(m, 'DELETE', url.activite(a.id)),
        { qui: chef, methode: 'DELETE', adresse: url.activite(parent.id), statut: 409 },
        // jalons (JLN-8)
        ...trio(m, 'POST', url.jalons(P.id), { nom: 'X' }),
        { qui: chef, methode: 'POST', adresse: url.jalons(P.id), corps: { nom: '' }, statut: 400 },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.jalons(P.id),
          corps: { nom: 'X', type: 'bidon' },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.jalons(P.id),
          corps: { nom: 'X', parent_id: j.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.jalons(P.id),
          corps: { nom: 'X', parent_id: etrangere.id },
          statut: 422,
        },
        ...trio(m, 'PATCH', url.jalon(j.id), { nom: 'X' }),
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.jalon(j.id),
          corps: { type: 'bidon' },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.jalon(j.id),
          corps: { date_planifiee: '2027-01-04' },
          statut: 400,
        },
        ...trio(m, 'DELETE', url.jalon(j.id)),
        // déplacement
        ...trio(m, 'POST', url.deplacer(b.id), { parent_id: null }),
        {
          qui: chef,
          methode: 'POST',
          adresse: url.deplacer(b.id),
          corps: { rang: 0 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.deplacer(parent.id),
          corps: { parent_id: parent.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.deplacer(parent.id),
          corps: { parent_id: enfant.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.deplacer(b.id),
          corps: { parent_id: j.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.deplacer(b.id),
          corps: { parent_id: etrangere.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.deplacer(b.id),
          corps: { parent_id: a.id },
          statut: 422,
        },
        // dépendances (LIEN-15, LIEN-17)
        ...trio(m, 'POST', url.dependances(P.id), { predecesseur_id: b.id, successeur_id: j.id }),
        {
          qui: chef,
          methode: 'POST',
          adresse: url.dependances(P.id),
          corps: { predecesseur_id: a.id, successeur_id: b.id },
          statut: 409,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.dependances(P.id),
          corps: { predecesseur_id: b.id, successeur_id: a.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.dependances(P.id),
          corps: { predecesseur_id: a.id, successeur_id: a.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.dependances(P.id),
          corps: { predecesseur_id: parent.id, successeur_id: enfant.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.dependances(P.id),
          corps: { predecesseur_id: a.id, successeur_id: etrangere.id },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.dependances(P.id),
          corps: { predecesseur_id: b.id, successeur_id: j.id, delai: 1.5 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.dependances(P.id),
          corps: { predecesseur_id: b.id, successeur_id: j.id, type: 'XX' },
          statut: 400,
        },
        ...trio(m, 'PATCH', url.dependance(d.id), { delai: 1 }),
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.dependance(d.id),
          corps: { delai: 0.5 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.dependance(d.id),
          corps: { type: 'ZZ' },
          statut: 400,
        },
        ...trio(m, 'DELETE', url.dependance(d.id)),
        // assignations (ASS-12, ASS-14, ASS-16)
        ...trio(m, 'POST', url.assignationsActivite(b.id), {
          ressource_id: carol.id,
          charge_assignee: 1,
        }),
        {
          qui: chef,
          methode: 'POST',
          adresse: url.assignationsActivite(a.id),
          corps: { ressource_id: alice.id, charge_assignee: 1 },
          statut: 409,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.assignationsActivite(b.id),
          corps: { ressource_id: carol.id, charge_assignee: 1 },
          statut: 422,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.assignationsActivite(parent.id),
          corps: { ressource_id: m.bob.id, charge_assignee: 1 },
          statut: 422,
        },
        ...[0, -5, 100.01, 101].map((taux): Cas => ({
          qui: chef,
          methode: 'POST',
          adresse: url.assignationsActivite(b.id),
          corps: { ressource_id: m.bob.id, charge_assignee: 1, taux },
          statut: 400,
        })),
        {
          qui: chef,
          methode: 'POST',
          adresse: url.assignationsActivite(enfant.id),
          corps: { ressource_id: alice.id, charge_assignee: -1 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'POST',
          adresse: url.assignationsActivite(enfant.id),
          corps: { ressource_id: alice.id, charge_assignee: 0.255 },
          statut: 400,
        },
        ...trio(m, 'PATCH', url.assignation(s.id), { charge_assignee: 3 }),
        ...[0, -5, 100.01, 101].map((taux): Cas => ({
          qui: chef,
          methode: 'PATCH',
          adresse: url.assignation(s.id),
          corps: { taux },
          statut: 400,
        })),
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.assignation(s.id),
          corps: { charge_assignee: -0.5 },
          statut: 400,
        },
        {
          qui: chef,
          methode: 'PATCH',
          adresse: url.assignation(s.id),
          corps: { charge_assignee: 0.255 },
          statut: 400,
        },
        ...trio(m, 'DELETE', url.assignation(s.id)),
        { qui: chef, methode: 'DELETE', adresse: url.assignation(bobAss.id), statut: 409 },
      ];
      await verifierRefus(ctx, cas);
      await prouverDetection(ctx, {
        qui: chef,
        methode: 'POST',
        adresse: url.activites(P.id),
        corps: { nom: 'Témoin' },
        statut: 201,
      });
      await prouverDetection(ctx, {
        qui: chef,
        methode: 'PATCH',
        adresse: url.assignation(s.id),
        corps: { charge_assignee: 3 },
        statut: 200,
      });
    },
    DELAI,
  );

  it(
    'ID-1 : identifiant 1e30, 2147483648, -1, 1.5 ou « abc » dans l’adresse → 404, jamais 500',
    async () => {
      const m = await creerMonde(ctx);
      const admin = m.admin;
      const identifiants = ['1e30', '2147483648', '-1', '1.5', 'abc'];
      const modeles: { methode: Methode; adresse: string; corps?: Corps }[] = [
        // projets et ce qui s'y rattache
        { methode: 'GET', adresse: '/api/projets/:id' },
        { methode: 'PATCH', adresse: '/api/projets/:id', corps: { nom: 'N' } },
        { methode: 'DELETE', adresse: '/api/projets/:id' },
        { methode: 'GET', adresse: '/api/projets/:id/affectations' },
        {
          methode: 'POST',
          adresse: '/api/projets/:id/affectations',
          corps: { ressource_id: m.alice.id },
        },
        { methode: 'GET', adresse: '/api/projets/:id/planning' },
        { methode: 'GET', adresse: '/api/projets/:id/activites' },
        { methode: 'POST', adresse: '/api/projets/:id/activites', corps: { nom: 'N' } },
        { methode: 'GET', adresse: '/api/projets/:id/jalons' },
        { methode: 'POST', adresse: '/api/projets/:id/jalons', corps: { nom: 'N' } },
        { methode: 'GET', adresse: '/api/projets/:id/dependances' },
        {
          methode: 'POST',
          adresse: '/api/projets/:id/dependances',
          corps: { predecesseur_id: 1, successeur_id: 2 },
        },
        { methode: 'GET', adresse: '/api/projets/:id/assignations' },
        // affectations, activités, jalons, éléments, dépendances, assignations
        { methode: 'PATCH', adresse: '/api/affectations/:id', corps: { taux: 50 } },
        { methode: 'DELETE', adresse: '/api/affectations/:id' },
        { methode: 'PATCH', adresse: '/api/activites/:id', corps: { nom: 'N' } },
        { methode: 'DELETE', adresse: '/api/activites/:id' },
        {
          methode: 'POST',
          adresse: '/api/activites/:id/assignations',
          corps: { ressource_id: m.alice.id, charge_assignee: 1 },
        },
        { methode: 'PATCH', adresse: '/api/jalons/:id', corps: { nom: 'N' } },
        { methode: 'DELETE', adresse: '/api/jalons/:id' },
        { methode: 'POST', adresse: '/api/elements/:id/deplacer', corps: { parent_id: null } },
        { methode: 'PATCH', adresse: '/api/dependances/:id', corps: { delai: 1 } },
        { methode: 'DELETE', adresse: '/api/dependances/:id' },
        { methode: 'PATCH', adresse: '/api/assignations/:id', corps: { charge_assignee: 1 } },
        { methode: 'DELETE', adresse: '/api/assignations/:id' },
        // calendriers et utilisateurs
        { methode: 'GET', adresse: '/api/calendriers/:id' },
        { methode: 'PATCH', adresse: '/api/calendriers/:id', corps: { nom: 'N' } },
        { methode: 'DELETE', adresse: '/api/calendriers/:id' },
        { methode: 'POST', adresse: '/api/calendriers/:id/feries', corps: { jour: '2027-05-01' } },
        { methode: 'DELETE', adresse: '/api/calendriers/:id/feries/2027-05-01' },
        { methode: 'PATCH', adresse: '/api/utilisateurs/:id', corps: { nom: 'N' } },
      ];
      const avant = await empreinte(ctx);
      const ecarts: string[] = [];
      for (const modele of modeles) {
        for (const id of identifiants) {
          const cas = {
            qui: admin,
            methode: modele.methode,
            adresse: modele.adresse.replace(':id', id),
            ...(modele.corps ? { corps: modele.corps } : {}),
          };
          const res = await envoyer(ctx, cas);
          if (res.statusCode !== 404)
            ecarts.push(`${res.statusCode} ${nomCas({ ...cas, statut: 404 })}`);
        }
      }
      expect(ecarts, 'requêtes qui ne répondent pas 404').toEqual([]);
      expect(await empreinte(ctx), 'aucun identifiant invalide ne modifie la base').toEqual(avant);
    },
    DELAI,
  );

  it('PRJ-21 : un chef de projet, ressource affectée au projet d’un autre chef, le lit et ne peut pas y écrire', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet', true);
    const p1 = await creerProjet(ctx, admin, { chef_id: c1.id });
    const p2 = await creerProjet(ctx, admin, { chef_id: c2.id });
    const autre = await creerProjet(ctx, admin, { chef_id: c1.id });
    await creerActivite(ctx, c1, p1.id);
    await affecter(ctx, p1.id, c2.id);
    const api = appel(ctx, c2);
    // lecture
    const lecture = await api.get(`/api/projets/${p1.id}`);
    expect(lecture.statusCode).toBe(200);
    expect(corps(lecture).id).toBe(p1.id);
    expect(
      liste(await api.get('/api/projets'))
        .map((p) => p.id)
        .sort(),
    ).toEqual([p1.id, p2.id].sort());
    expect((await planning(ctx, c2, p1.id)).length).toBe(1);
    expect((await api.get(`/api/projets/${p1.id}/affectations`)).statusCode).toBe(200);
    // un projet sans lien reste invisible
    expect((await api.get(`/api/projets/${autre.id}`)).statusCode).toBe(404);
    // écriture refusée (403), base inchangée
    await verifierRefus(ctx, [
      {
        qui: c2,
        methode: 'PATCH',
        adresse: `/api/projets/${p1.id}`,
        corps: { nom: 'X' },
        statut: 403,
      },
      { qui: c2, methode: 'DELETE', adresse: `/api/projets/${p1.id}`, statut: 403 },
      { qui: c2, methode: 'POST', adresse: url.activites(p1.id), corps: { nom: 'X' }, statut: 403 },
      { qui: c2, methode: 'POST', adresse: url.jalons(p1.id), corps: { nom: 'X' }, statut: 403 },
      {
        qui: c2,
        methode: 'POST',
        adresse: `/api/projets/${p1.id}/affectations`,
        corps: { ressource_id: c2.id },
        statut: 403,
      },
    ]);
    // son propre projet reste modifiable
    expect((await api.patch(`/api/projets/${p2.id}`, { nom: 'Mien' })).statusCode).toBe(200);
  });

  it('AFF-12 : affecter une ressource inactive → 422, rien n’est créé', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const projet = await creerProjet(ctx, admin);
    const inactif = await seedUser(ctx.pool, { email: 'inactif@example.test', actif: false });
    await ctx.pool.query('UPDATE utilisateur SET est_ressource = true WHERE id = $1', [inactif]);
    const actif = await creerActeur(ctx, 'actif@example.test', 'ressource', true);
    const avant = await empreinte(ctx);
    const res = await appel(ctx, admin).post(`/api/projets/${projet.id}/affectations`, {
      ressource_id: inactif,
    });
    expect(res.statusCode).toBe(422);
    expect(await compter(ctx, 'affectation_projet')).toBe(0);
    expect(await empreinte(ctx)).toEqual(avant);
    // une ressource active reste affectable
    const ok = await appel(ctx, admin).post(`/api/projets/${projet.id}/affectations`, {
      ressource_id: actif.id,
    });
    expect(ok.statusCode).toBe(201);
  });
});
