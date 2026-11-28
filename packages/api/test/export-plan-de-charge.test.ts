import { describe, expect, it } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
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
import { empreinte, tache } from './lot2a-helpers.js';

/**
 * Export du plan de charge, nouveau contenu (D-241, SPEC §7 « Exports CSV », point 3) : PCX-1 à PCX-3.
 * Valeurs attendues recopiées de l'exemple de la SPEC. Travail planifié et imputations posés par SQL.
 */

const BOM = '\uFEFF';
const TYPE = 'text/csv; charset=utf-8';
const ENTETE_PLAN =
  'Ressource;Équipe;Ligne;01/2027;02/2027;03/2027;04/2027;05/2027;06/2027;07/2027;08/2027;09/2027;10/2027;11/2027;12/2027';

/** Lignes d'un fichier CSV complet : BOM et CRLF final vérifiés, sans la ligne vide finale. */
function lignesDe(texte: string): string[] {
  expect(texte.startsWith(BOM), 'BOM').toBe(true);
  expect(texte.endsWith('\r\n'), 'CRLF final').toBe(true);
  const sansBom = texte.slice(1);
  expect(sansBom.includes('\n') && sansBom.replace(/\r\n/g, '').includes('\n'), 'LF isolé').toBe(
    false,
  );
  return sansBom.slice(0, -2).split('\r\n');
}

const adressePlan = (requete: string) => `/api/plan-de-charge/export${requete}`;

async function exporter(
  ctx: TestCtx,
  qui: Acteur,
  adresse: string,
): Promise<{ res: LightMyRequestResponse; lignes: string[] }> {
  const res = await appel(ctx, qui).get(adresse);
  expect(res.statusCode, res.body).toBe(200);
  return { res, lignes: lignesDe(res.body) };
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
  options: { ressource?: boolean; actif?: boolean; equipe?: number | null } = {},
): Promise<Acteur> {
  n += 1;
  const a = await creerActeur(
    ctx,
    `u${n}@csv.test`,
    role,
    options.ressource ?? role === 'ressource',
  );
  await ctx.pool.query(
    'UPDATE utilisateur SET nom = $2, capacite = 1, actif = $3, equipe_id = $4 WHERE id = $1',
    [a.id, nom, options.actif ?? true, options.equipe ?? null],
  );
  return a;
}

const admin = (ctx: TestCtx) => utilisateur(ctx, 'Admin', 'administrateur');

async function equipe(ctx: TestCtx, nom: string): Promise<number> {
  const { rows } = await ctx.pool.query<{ id: number }>(
    'INSERT INTO equipe (nom) VALUES ($1) RETURNING id',
    [nom],
  );
  return rows[0]!.id;
}

async function projet(
  ctx: TestCtx,
  par: Acteur,
  code: string,
  chef: Acteur = par,
  champs: Corps = {},
): Promise<{ id: number; code: string; nom: string }> {
  const nom = typeof champs.nom === 'string' ? champs.nom : `Nom ${code}`;
  const p = await creerProjet(ctx, par, { code, chef_id: chef.id, ...champs, nom });
  return { id: p.id, code, nom };
}

/** Affecte la ressource au projet et lui assigne une activité ; renvoie l'assignation. */
async function assigner(
  ctx: TestCtx,
  par: Acteur,
  projetId: number,
  ressource: Acteur,
  champsActivite: Corps = {},
): Promise<number> {
  await affecter(ctx, projetId, ressource.id);
  const t = await tache(ctx, par, projetId, ressource.id, 1, champsActivite);
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

const feuille = (
  ctx: TestCtx,
  ressource: Acteur,
  lundi: string,
  statut: 'brouillon' | 'soumise' | 'validee' | 'rejetee',
  commentaire: string | null = null,
) =>
  ctx.pool.query(
    'INSERT INTO feuille_temps (ressource_id, lundi, statut, commentaire) VALUES ($1, $2, $3, $4)',
    [ressource.id, lundi, statut, commentaire],
  );

/** Ligne du fichier : trois champs puis les douze mois. */
const ligneDe = (ressource: string, equipe: string, libelle: string, mois: string): string =>
  `${ressource};${equipe};${libelle};${mois}`;

describe('Export du plan de charge : nouveau contenu (D-241)', () => {
  const ctx = useTestApp();

  it('PCX-1 : fichier exact de l’exemple de la SPEC (BOM, « ; », CRLF, en-tête, cinq lignes)', async () => {
    const a = await admin(ctx);
    const dev = await equipe(ctx, 'Dev');
    const alice = await utilisateur(ctx, 'Alice', 'ressource', { equipe: dev });
    const p1 = await projet(ctx, a, 'P1', a, { nom: 'Projet un' });
    const p2 = await projet(ctx, a, 'P2', a, { nom: 'Projet deux' });
    const ass1 = await assigner(ctx, a, p1.id, alice);
    const ass2 = await assigner(ctx, a, p2.id, alice);
    await planifier(ctx, ass1, '2027-01-05', 1.5);
    await planifier(ctx, ass2, '2027-01-06', 19.5);
    await feuille(ctx, alice, '2027-01-11', 'brouillon');
    await imputer(ctx, ass1, '2027-01-12', 0.5);

    const res = await appel(ctx, a).get(adressePlan('?debut=2027-01'));
    expect(res.statusCode, res.body).toBe(200);
    const attendu = [
      ENTETE_PLAN,
      'Alice;Dev;Charge;21,5;0;0;0;0;0;0;0;0;0;0;0',
      'Alice;Dev;Disponible;21;20;23;22;21;22;22;22;22;21;22;23',
      'Alice;Dev;Écart;-0,5;20;23;22;21;22;22;22;22;21;22;23',
      'Alice;Dev;P1 · Projet un;2;0;0;0;0;0;0;0;0;0;0;0',
      'Alice;Dev;P2 · Projet deux;19,5;0;0;0;0;0;0;0;0;0;0;0',
    ];
    expect(res.body).toBe(`${BOM}${attendu.join('\r\n')}\r\n`);
    expect(res.headers['content-type']).toBe(TYPE);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="plan-de-charge-2027-01.csv"',
    );
  });

  it('PCX-2-r1 : chef de projet (tous les projets nommés, D-265), inactif, sans équipe, valeur nulle « 0 »', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const autreChef = await utilisateur(ctx, 'Autre', 'chef_de_projet');
    const dev = await equipe(ctx, 'Dev');
    const alice = await utilisateur(ctx, 'Alice');
    const carl = await utilisateur(ctx, 'Carl', 'ressource', { actif: false, equipe: dev });
    const m1 = await projet(ctx, a, 'M1', chef, { nom: 'Mon projet' });
    const px = await projet(ctx, a, 'X-SECRET', autreChef, { nom: 'Projet caché' });
    await planifier(ctx, await assigner(ctx, a, m1.id, alice), '2027-01-05', 2);
    const assX = await assigner(ctx, a, px.id, alice);
    await planifier(ctx, assX, '2027-01-07', 4);
    await feuille(ctx, alice, '2027-01-04', 'brouillon');
    await imputer(ctx, assX, '2027-01-08', 0.5);
    await planifier(ctx, await assigner(ctx, a, m1.id, carl), '2027-03-10', 24);

    const { lignes } = await exporter(ctx, chef, adressePlan('?debut=2027-01'));
    expect(lignes).toEqual([
      ENTETE_PLAN,
      ligneDe('Alice', '', 'Charge', '6,5;0;0;0;0;0;0;0;0;0;0;0'),
      ligneDe('Alice', '', 'Disponible', '21;20;23;22;21;22;22;22;22;21;22;23'),
      ligneDe('Alice', '', 'Écart', '14,5;20;23;22;21;22;22;22;22;21;22;23'),
      ligneDe('Alice', '', 'M1 · Mon projet', '2;0;0;0;0;0;0;0;0;0;0;0'),
      // Révision D-265 (4) : le projet de l'autre chef est nommé, plus de ligne « Autres projets ».
      ligneDe('Alice', '', 'X-SECRET · Projet caché', '4,5;0;0;0;0;0;0;0;0;0;0;0'),
      ligneDe('Carl (inactif)', 'Dev', 'Charge', '0;0;24;0;0;0;0;0;0;0;0;0'),
      ligneDe('Carl (inactif)', 'Dev', 'Disponible', '21;20;23;22;21;22;22;22;22;21;22;23'),
      ligneDe('Carl (inactif)', 'Dev', 'Écart', '21;20;-1;22;21;22;22;22;22;21;22;23'),
      ligneDe('Carl (inactif)', 'Dev', 'M1 · Mon projet', '0;0;24;0;0;0;0;0;0;0;0;0'),
    ]);
    expect(lignes.some((l) => l.includes('Autres projets'))).toBe(false);
    expect(lignes.some((l) => l.includes("'-1"))).toBe(false);
  });

  it('PCX-3 : filtre équipe, équipe inconnue (en-tête seul), refus et ordre des refus inchangés, base inchangée', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const vide = await exporter(ctx, a, adressePlan('?debut=2027-01'));
    expect(vide.res.body).toBe(`${BOM}${ENTETE_PLAN}\r\n`);

    const dev = await equipe(ctx, 'Dev');
    await utilisateur(ctx, 'Alice', 'ressource', { equipe: dev });
    await utilisateur(ctx, 'Carl');
    const dispo = '21;20;23;22;21;22;22;22;22;21;22;23';
    const zero = '0;0;0;0;0;0;0;0;0;0;0;0';
    expect((await exporter(ctx, a, adressePlan(`?debut=2027-01&equipe=${dev}`))).lignes).toEqual([
      ENTETE_PLAN,
      ligneDe('Alice', 'Dev', 'Charge', zero),
      ligneDe('Alice', 'Dev', 'Disponible', dispo),
      ligneDe('Alice', 'Dev', 'Écart', dispo),
    ]);
    expect((await exporter(ctx, a, adressePlan('?debut=2027-01&equipe=aucune'))).lignes).toEqual([
      ENTETE_PLAN,
      ligneDe('Carl', '', 'Charge', zero),
      ligneDe('Carl', '', 'Disponible', dispo),
      ligneDe('Carl', '', 'Écart', dispo),
    ]);
    const inconnue = await exporter(ctx, a, adressePlan('?debut=2027-01&equipe=9999'));
    expect(inconnue.res.body).toBe(`${BOM}${ENTETE_PLAN}\r\n`);

    await sansEffet(ctx, 401, () => appel(ctx).get(adressePlan('?debut=2027-01')), 'sans session');
    await sansEffet(ctx, 401, () => appel(ctx).get(adressePlan('?debut=abc')), '401 avant 400');
    const res1 = await utilisateur(ctx, 'Res1', 'ressource', { ressource: true });
    const res2 = await utilisateur(ctx, 'Res2', 'ressource', { ressource: false });
    for (const r of [res1, res2]) {
      const res = await sansEffet(ctx, 403, () => appel(ctx, r).get(adressePlan('?debut=2027-01')));
      expect(corps(res)).toEqual({ erreur: 'Interdit' });
      await sansEffet(
        ctx,
        403,
        () => appel(ctx, r).get(adressePlan('?debut=abc')),
        '403 avant 400',
      );
    }
    for (const requete of ['', '?debut=2027-13', '?debut=2027-01&equipe=abc']) {
      await sansEffet(ctx, 400, () => appel(ctx, a).get(adressePlan(requete)), requete);
    }
    const avant = await empreinte(ctx);
    await exporter(ctx, chef, adressePlan('?debut=2027-01'));
    await exporter(ctx, a, adressePlan(`?debut=2027-01&equipe=${dev}`));
    expect(await empreinte(ctx)).toEqual(avant);
  });
});
