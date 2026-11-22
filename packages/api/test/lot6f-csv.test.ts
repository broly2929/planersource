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
/** Module `export/csv.ts` chargé à la demande : son absence ne masque pas les tests de route. */
const csv = () => import('../src/export/csv.js');

/**
 * Lot 6f (D-160, SPEC « Exports CSV (lot 6f, D-160) ») : CSV-1 à CSV-20. Valeurs attendues recopiées
 * de D-160. Fichiers lus tels que le serveur les envoie : BOM, lignes séparées par CRLF, la dernière
 * comprise. Travail planifié et imputations posés par SQL (le moteur n'est jamais appelé).
 */

const BOM = '﻿';
const ENTETE_PLAN = 'Ressource;Équipe;Projet;Mois;Disponible;Réel;Planifié;Charge;Écart';
const ENTETE_IMP = 'Ressource;Équipe;Semaine;Statut;Projet;Activité;Jour;Charge';
const TYPE = 'text/csv; charset=utf-8';

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
const adresseImp = (requete: string) => `/api/imputations/export${requete}`;

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

const MOIS_2027 = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')}/2027`);
const prefixe = (lignes: string[], debut: string) => lignes.filter((l) => l.startsWith(debut));

describe('Exports CSV : fonctions pures (D-160 (2))', () => {
  it('CSV-1 : BOM, CRLF, en-tête, guillemets', async () => {
    const { champTexte, produireCsv } = await csv();
    expect(produireCsv(['A', 'B'], [['x', 1]])).toBe(`${BOM}A;B\r\nx;1\r\n`);
    expect(produireCsv(['A', 'B'], [])).toBe(`${BOM}A;B\r\n`);
    expect(champTexte('a;b')).toBe('"a;b"');
    expect(champTexte('dit "oui"')).toBe('"dit ""oui"""');
    expect(champTexte('l1\nl2')).toBe('"l1\nl2"');
    expect(champTexte('l1\r\nl2')).toBe('"l1\r\nl2"');
    expect(champTexte('Alice')).toBe('Alice');
    expect(produireCsv(['A'], [['a;b']])).toBe(`${BOM}A\r\n"a;b"\r\n`);
  });

  it('CSV-2 : nombres à virgule décimale, deux décimales au plus, zéros non significatifs retirés', async () => {
    const { formaterNombre } = await csv();
    const attendus: [number, string][] = [
      [12.5, '12,5'],
      [3, '3'],
      [-1, '-1'],
      [0, '0'],
      [0.25, '0,25'],
      [3.75, '3,75'],
      [22, '22'],
      [1234.5, '1234,5'],
      [1.1, '1,1'],
      [0.1 + 0.2, '0,3'],
    ];
    for (const [valeur, texte] of attendus)
      expect(formaterNombre(valeur), String(valeur)).toBe(texte);
    expect(formaterNombre(-1).charCodeAt(0)).toBe(0x2d);
  });

  it('CSV-3 : dates JJ/MM/AAAA et mois MM/AAAA', async () => {
    const { formaterDate, formaterMois } = await csv();
    expect(formaterDate('2027-01-18')).toBe('18/01/2027');
    expect(formaterMois('2027-01')).toBe('01/2027');
  });

  it('CSV-4 : injection de formules sur les champs texte seulement', async () => {
    const { champTexte, produireCsv } = await csv();
    for (const texte of ['=SOMME(A1)', '+1', '-1x', '@x', '\tx']) {
      expect(champTexte(texte), JSON.stringify(texte)).toBe(`'${texte}`);
    }
    expect(champTexte('\rx')).toBe('"\'\rx"');
    for (const texte of ['Alice', 'a=b', '']) expect(champTexte(texte)).toBe(texte);
    expect(produireCsv(['N'], [[-1], ['-1']])).toBe(`${BOM}N\r\n-1\r\n'-1\r\n`);
    expect(produireCsv(['N', 'M'], [[null, 'x']])).toBe(`${BOM}N;M\r\n;x\r\n`);
  });
});

describe('Export du plan de charge (D-160 (3))', () => {
  const ctx = useTestApp();

  it('CSV-5 : accès et refus (401, 403, 400), ordre des refus, base inchangée', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const res1 = await utilisateur(ctx, 'Res1', 'ressource', { ressource: true });
    const res2 = await utilisateur(ctx, 'Res2', 'ressource', { ressource: false });
    await sansEffet(ctx, 401, () => appel(ctx).get(adressePlan('?debut=2027-01')), 'sans session');
    await sansEffet(ctx, 401, () => appel(ctx).get(adressePlan('?debut=abc')), '401 avant 400');
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
    for (const requete of [
      '',
      '?debut=2027-13',
      '?debut=1999-12',
      '?debut=2100-01',
      '?debut=2027-01&equipe=abc',
      '?debut=2027-01&equipe=1.5',
      '?debut=2027-01&equipe=1e2',
    ]) {
      await sansEffet(ctx, 400, () => appel(ctx, a).get(adressePlan(requete)), requete);
    }
    for (const acteur of [a, chef]) {
      const { lignes } = await exporter(ctx, acteur, adressePlan('?debut=2027-01'));
      expect(lignes[0]).toBe(ENTETE_PLAN);
    }
  });

  it('CSV-6 : en-têtes HTTP, nom du fichier, première ligne', async () => {
    const a = await admin(ctx);
    const { res, lignes } = await exporter(ctx, a, adressePlan('?debut=2027-01'));
    expect(res.headers['content-type']).toBe(TYPE);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="plan-de-charge-2027-01.csv"',
    );
    expect(lignes[0]).toBe(ENTETE_PLAN);
    const autre = await appel(ctx, a).get(adressePlan('?debut=2026-11'));
    expect(autre.headers['content-disposition']).toBe(
      'attachment; filename="plan-de-charge-2026-11.csv"',
    );
  });

  it('CSV-7 : douze lignes de total puis douze lignes par projet, valeurs à virgule', async () => {
    const a = await admin(ctx);
    const dev = await equipe(ctx, 'Dev');
    const alice = await utilisateur(ctx, 'Alice', 'ressource', { equipe: dev });
    const p = await projet(ctx, a, 'P1', a, { nom: 'Projet un' });
    const ass = await assigner(ctx, a, p.id, alice);
    await planifier(ctx, ass, '2027-01-05', 1.5);
    await feuille(ctx, alice, '2027-01-11', 'brouillon');
    await imputer(ctx, ass, '2027-01-12', 0.5);

    const { lignes } = await exporter(ctx, a, adressePlan('?debut=2027-01'));
    expect(lignes).toHaveLength(1 + 12 + 12);
    expect(lignes[0]).toBe(ENTETE_PLAN);
    expect(lignes[1]).toBe('Alice;Dev;Total;01/2027;21;0,5;1,5;2;19');
    expect(lignes[2]).toBe('Alice;Dev;Total;02/2027;20;0;0;0;20');
    expect(lignes.slice(1, 13).map((l) => l.split(';')[3])).toEqual(MOIS_2027);
    expect(lignes.slice(1, 13).every((l) => l.startsWith('Alice;Dev;Total;'))).toBe(true);
    expect(lignes[13]).toBe('Alice;Dev;P1 · Projet un;01/2027;;0,5;1,5;2;');
    expect(lignes[14]).toBe('Alice;Dev;P1 · Projet un;02/2027;;0;0;0;');
    expect(lignes.slice(13).map((l) => l.split(';')[3])).toEqual(MOIS_2027);
    expect(lignes.slice(13).every((l) => l.startsWith('Alice;Dev;P1 · Projet un;'))).toBe(true);
  });

  it('CSV-8 : équipe vide, suffixe (inactif), écart négatif sans apostrophe', async () => {
    const a = await admin(ctx);
    const dev = await equipe(ctx, 'Dev');
    const carl = await utilisateur(ctx, 'Carl', 'ressource', { actif: false });
    const bob = await utilisateur(ctx, 'Bob', 'ressource', { equipe: dev });
    const p = await projet(ctx, a, 'P8');
    await planifier(ctx, await assigner(ctx, a, p.id, carl), '2027-03-10', 2);
    await planifier(ctx, await assigner(ctx, a, p.id, bob), '2027-01-04', 22);

    const { lignes } = await exporter(ctx, a, adressePlan('?debut=2027-01'));
    expect(lignes).toContain('Carl (inactif);;Total;03/2027;23;0;2;2;21');
    expect(lignes).toContain('Bob;Dev;Total;01/2027;21;0;22;22;-1');
    expect(lignes.some((l) => l.includes("'-1"))).toBe(false);
  });

  it('CSV-9 : chef de projet, « Autres projets » en dernier, projets illisibles absents ; administrateur : tout', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const autreChef = await utilisateur(ctx, 'Autre', 'chef_de_projet');
    const alice = await utilisateur(ctx, 'Alice');
    const p1 = await projet(ctx, a, 'M-PROJ1', chef);
    const pl = await projet(ctx, a, 'N-LECT', autreChef);
    const p2 = await projet(ctx, a, 'A-ILLISIBLE2', autreChef);
    const p3 = await projet(ctx, a, 'B-ILLISIBLE3', autreChef);
    await affecter(ctx, pl.id, chef.id);
    await planifier(ctx, await assigner(ctx, a, p1.id, alice), '2027-01-05', 2);
    await planifier(ctx, await assigner(ctx, a, pl.id, alice), '2027-01-06', 1);
    await planifier(ctx, await assigner(ctx, a, p2.id, alice), '2027-01-07', 4);
    await imputer(ctx, await assigner(ctx, a, p3.id, alice), '2027-01-08', 0.5);

    const vue = (lignes: string[]) => {
      const projets: string[] = [];
      for (const l of prefixe(lignes, 'Alice;;')) {
        const colonnes = l.split(';');
        if (colonnes[2] !== 'Total' && !projets.includes(colonnes[2]!)) projets.push(colonnes[2]!);
      }
      return projets;
    };
    const { lignes: duChef } = await exporter(ctx, chef, adressePlan('?debut=2027-01'));
    expect(vue(duChef)).toEqual(['M-PROJ1 · Nom M-PROJ1', 'N-LECT · Nom N-LECT', 'Autres projets']);
    const autres = prefixe(duChef, 'Alice;;Autres projets;');
    expect(autres).toHaveLength(12);
    expect(autres[0]).toBe('Alice;;Autres projets;01/2027;;0,5;4;4,5;');
    expect(duChef.some((l) => l.includes('ILLISIBLE'))).toBe(false);
    expect(duChef.indexOf(autres[0]!)).toBeGreaterThan(
      duChef.indexOf('Alice;;N-LECT · Nom N-LECT;12/2027;;0;0;0;'),
    );

    const { lignes: deAdmin } = await exporter(ctx, a, adressePlan('?debut=2027-01'));
    expect(vue(deAdmin)).toEqual([
      'A-ILLISIBLE2 · Nom A-ILLISIBLE2',
      'B-ILLISIBLE3 · Nom B-ILLISIBLE3',
      'M-PROJ1 · Nom M-PROJ1',
      'N-LECT · Nom N-LECT',
    ]);
  });

  it('CSV-10 : filtres équipe, équipe inconnue et base vide : en-tête seul ; aucune écriture', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const vide = await exporter(ctx, a, adressePlan('?debut=2027-01'));
    expect(vide.res.body).toBe(`${BOM}${ENTETE_PLAN}\r\n`);

    const dev = await equipe(ctx, 'Dev');
    await utilisateur(ctx, 'Alice', 'ressource', { equipe: dev });
    await utilisateur(ctx, 'Bob', 'ressource', { equipe: dev });
    await utilisateur(ctx, 'Carl');
    const noms = (lignes: string[]) => [...new Set(lignes.slice(1).map((l) => l.split(';')[0]))];
    expect(
      noms((await exporter(ctx, a, adressePlan(`?debut=2027-01&equipe=${dev}`))).lignes),
    ).toEqual(['Alice', 'Bob']);
    expect(
      noms((await exporter(ctx, a, adressePlan('?debut=2027-01&equipe=aucune'))).lignes),
    ).toEqual(['Carl']);
    const inconnue = await exporter(ctx, a, adressePlan('?debut=2027-01&equipe=9999'));
    expect(inconnue.res.body).toBe(`${BOM}${ENTETE_PLAN}\r\n`);

    const avant = await empreinte(ctx);
    for (const acteur of [a, chef]) {
      await exporter(ctx, acteur, adressePlan('?debut=2027-01'));
      await exporter(ctx, acteur, adressePlan(`?debut=2027-01&equipe=${dev}`));
    }
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('CSV-11 : injection sur le nom de la ressource, de l’équipe et le code du projet ; nom de projet interne non préfixé', async () => {
    const a = await admin(ctx);
    const eq = await equipe(ctx, '@Eq');
    const eve = await utilisateur(ctx, '=Eve', 'ressource', { equipe: eq });
    const p1 = await projet(ctx, a, '=C1', a, { nom: 'Nom' });
    const p2 = await projet(ctx, a, 'Z-1', a, { nom: '=Nom' });
    await planifier(ctx, await assigner(ctx, a, p1.id, eve), '2027-01-05', 1);
    await planifier(ctx, await assigner(ctx, a, p2.id, eve), '2027-01-06', 1);

    const { lignes } = await exporter(ctx, a, adressePlan('?debut=2027-01'));
    expect(lignes).toContain("'=Eve;'@Eq;Total;01/2027;21;0;2;2;19");
    expect(lignes).toContain("'=Eve;'@Eq;'=C1 · Nom;01/2027;;0;1;1;");
    expect(lignes).toContain("'=Eve;'@Eq;Z-1 · =Nom;01/2027;;0;1;1;");
    expect(lignes.some((l) => l.includes(";'Z-1") || l.includes(";'1;"))).toBe(false);
  });
});

describe('Export des imputations : accès et période (D-160 (4))', () => {
  const ctx = useTestApp();
  const PERIODE = '?du=2027-01-01&au=2027-01-31';

  it('CSV-12 : accès (401, 403 avant 400), base inchangée', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const res1 = await utilisateur(ctx, 'Res1', 'ressource', { ressource: true });
    const res2 = await utilisateur(ctx, 'Res2', 'ressource', { ressource: false });
    await sansEffet(ctx, 401, () => appel(ctx).get(adresseImp(PERIODE)), 'sans session');
    await sansEffet(ctx, 401, () => appel(ctx).get(adresseImp('?du=abc')), '401 avant 400');
    for (const r of [res1, res2]) {
      const res = await sansEffet(ctx, 403, () => appel(ctx, r).get(adresseImp(PERIODE)));
      expect(corps(res)).toEqual({ erreur: 'Interdit' });
      await sansEffet(ctx, 403, () => appel(ctx, r).get(adresseImp('?du=abc')), '403 avant 400');
    }
    for (const acteur of [a, chef]) {
      const { lignes } = await exporter(ctx, acteur, adresseImp(PERIODE));
      expect(lignes).toEqual([ENTETE_IMP]);
    }
  });

  it('CSV-13 : 400 sur du, au, année, ordre, equipe ; bornes 2000 et 2099 acceptées', async () => {
    const a = await admin(ctx);
    for (const requete of [
      '',
      '?du=2027-01-01',
      '?au=2027-01-31',
      '?du=2027-1-1&au=2027-01-31',
      '?du=2027-02-30&au=2027-03-01',
      '?du=abc&au=2027-01-31',
      '?du=20270101&au=20270131',
      '?du=1999-12-31&au=2000-01-05',
      '?du=2099-12-30&au=2100-01-01',
      '?du=2027-01-10&au=2027-01-09',
      '?du=2027-01-01&au=2027-01-31&equipe=abc',
      '?du=2027-01-01&au=2027-01-31&equipe=1.5',
      '?du=2027-01-01&au=2027-01-31&equipe=1e2',
    ]) {
      await sansEffet(ctx, 400, () => appel(ctx, a).get(adresseImp(requete)), requete);
    }
    for (const requete of ['?du=2000-01-01&au=2000-01-01', '?du=2099-12-31&au=2099-12-31']) {
      const res = await appel(ctx, a).get(adresseImp(requete));
      expect(res.statusCode, requete).toBe(200);
    }
  });

  it('CSV-14 : 366 jours acceptés, 367 refusés ; jours du et au inclus, veille et lendemain exclus', async () => {
    const a = await admin(ctx);
    const alice = await utilisateur(ctx, 'Alice');
    const p = await projet(ctx, a, 'P14');
    const ass = await assigner(ctx, a, p.id, alice);
    await sansEffet(ctx, 400, () => appel(ctx, a).get(adresseImp('?du=2027-01-01&au=2028-01-02')));
    for (const requete of ['?du=2028-01-01&au=2028-12-31', '?du=2027-01-01&au=2027-12-31']) {
      expect((await appel(ctx, a).get(adresseImp(requete))).statusCode, requete).toBe(200);
    }
    await feuille(ctx, alice, '2027-01-04', 'brouillon');
    for (const jour of ['2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08']) {
      await imputer(ctx, ass, jour, 1);
    }
    const { lignes } = await exporter(ctx, a, adresseImp('?du=2027-01-06&au=2027-01-07'));
    expect(lignes.slice(1).map((l) => l.split(';')[6])).toEqual(['06/01/2027', '07/01/2027']);
  });
});

describe('Export des imputations : contenu (D-160 (4))', () => {
  const ctx = useTestApp();

  it('CSV-15 : en-têtes HTTP, nom du fichier, ligne complète, équipe vide', async () => {
    const a = await admin(ctx);
    const dev = await equipe(ctx, 'Dev');
    const alice = await utilisateur(ctx, 'Alice', 'ressource', { equipe: dev });
    const carl = await utilisateur(ctx, 'Carl');
    const p = await projet(ctx, a, 'P1', a, { nom: 'Projet un' });
    await imputer(ctx, await assigner(ctx, a, p.id, alice, { nom: 'Analyse' }), '2027-01-06', 0.5);
    await feuille(ctx, alice, '2027-01-04', 'validee');
    await imputer(ctx, await assigner(ctx, a, p.id, carl, { nom: 'Revue' }), '2027-01-06', 1);
    await feuille(ctx, carl, '2027-01-04', 'brouillon');

    const { res, lignes } = await exporter(ctx, a, adresseImp('?du=2027-01-01&au=2027-01-31'));
    expect(res.headers['content-type']).toBe(TYPE);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="imputations-2027-01-01-2027-01-31.csv"',
    );
    expect(lignes).toEqual([
      ENTETE_IMP,
      'Alice;Dev;04/01/2027;Validée;P1 · Projet un;1 Analyse;06/01/2027;0,5',
      'Carl;;04/01/2027;Brouillon;P1 · Projet un;2 Revue;06/01/2027;1',
    ]);
  });

  it('CSV-16 : statuts brouillon, soumise, validée, rejetée, quel que soit le statut de la feuille', async () => {
    const a = await admin(ctx);
    const alice = await utilisateur(ctx, 'Alice');
    const p = await projet(ctx, a, 'P16');
    const ass = await assigner(ctx, a, p.id, alice);
    const semaines: [string, string, 'brouillon' | 'soumise' | 'validee' | 'rejetee'][] = [
      ['2027-01-04', '2027-01-05', 'brouillon'],
      ['2027-01-11', '2027-01-12', 'soumise'],
      ['2027-01-18', '2027-01-19', 'validee'],
      ['2027-01-25', '2027-01-26', 'rejetee'],
    ];
    for (const [lundi, jour, statut] of semaines) {
      await feuille(ctx, alice, lundi, statut, statut === 'rejetee' ? 'à revoir' : null);
      await imputer(ctx, ass, jour, 1);
    }
    const { lignes } = await exporter(ctx, a, adresseImp('?du=2027-01-01&au=2027-01-31'));
    expect(lignes.slice(1).map((l) => l.split(';').slice(2, 4).join(' '))).toEqual([
      '04/01/2027 Brouillon',
      '11/01/2027 Soumise',
      '18/01/2027 Validée',
      '25/01/2027 Rejetée',
    ]);
    expect(lignes.some((l) => l.includes('à revoir'))).toBe(false);
  });

  it('CSV-17 : tri par nom sans casse, id, jour, code de projet sans casse, ordre WBS', async () => {
    const a = await admin(ctx);
    const charles = await utilisateur(ctx, 'Charles');
    const bruno = await utilisateur(ctx, 'bruno');
    const alice1 = await utilisateur(ctx, 'Alice');
    const alice2 = await utilisateur(ctx, 'alice');
    const pa = await projet(ctx, a, 'A-1');
    const pb = await projet(ctx, a, 'b-2');
    await affecter(ctx, pa.id, alice1.id);
    await affecter(ctx, pb.id, alice1.id);
    const assB = (await tache(ctx, a, pb.id, alice1.id, 1, { nom: 'B' })).assignation.id;
    const assA1 = (await tache(ctx, a, pa.id, alice1.id, 1, { nom: 'Première' })).assignation.id;
    const assA2 = (await tache(ctx, a, pa.id, alice1.id, 1, { nom: 'Seconde' })).assignation.id;
    // Insertion dans l'ordre inverse de l'ordre attendu.
    await imputer(ctx, assB, '2027-01-06', 1);
    await imputer(ctx, assA2, '2027-01-06', 1);
    await imputer(ctx, assA1, '2027-01-06', 1);
    await imputer(ctx, assA2, '2027-01-05', 1);
    await feuille(ctx, alice1, '2027-01-04', 'brouillon');
    for (const r of [charles, bruno, alice2]) {
      const p = await projet(ctx, a, `R${r.id}`);
      await imputer(ctx, await assigner(ctx, a, p.id, r), '2027-01-05', 1);
      await feuille(ctx, r, '2027-01-04', 'brouillon');
    }
    const { lignes } = await exporter(ctx, a, adresseImp('?du=2027-01-01&au=2027-01-31'));
    const lu = lignes.slice(1).map((l) => {
      const c = l.split(';');
      return `${c[0]} ${c[6]} ${c[4]!.split(' · ')[0]} ${c[5]}`;
    });
    expect(lu.slice(0, 4)).toEqual([
      'Alice 05/01/2027 A-1 2 Seconde',
      'Alice 06/01/2027 A-1 1 Première',
      'Alice 06/01/2027 A-1 2 Seconde',
      'Alice 06/01/2027 b-2 1 B',
    ]);
    expect(lignes.slice(1).map((l) => l.split(';')[0])).toEqual([
      'Alice',
      'Alice',
      'Alice',
      'Alice',
      'alice',
      'bruno',
      'Charles',
    ]);
  });

  it('CSV-18 : le chef ne reçoit que les imputations des projets sur lesquels il écrit ; administrateur : tout', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const autreChef = await utilisateur(ctx, 'Autre', 'chef_de_projet');
    const alice = await utilisateur(ctx, 'Alice');
    const bob = await utilisateur(ctx, 'Bob');
    const p1 = await projet(ctx, a, 'M-PROJ1', chef);
    const pl = await projet(ctx, a, 'N-LECT', autreChef);
    const p2 = await projet(ctx, a, 'P-AUTRE2', autreChef);
    await affecter(ctx, pl.id, chef.id);
    await feuille(ctx, alice, '2027-01-04', 'soumise');
    await feuille(ctx, bob, '2027-01-04', 'brouillon');
    await imputer(ctx, await assigner(ctx, a, p1.id, alice), '2027-01-05', 1);
    await imputer(ctx, await assigner(ctx, a, pl.id, alice), '2027-01-06', 1);
    await imputer(ctx, await assigner(ctx, a, p2.id, alice), '2027-01-07', 1);
    await imputer(ctx, await assigner(ctx, a, p2.id, bob), '2027-01-07', 1);

    const requete = adresseImp('?du=2027-01-01&au=2027-01-31');
    const { lignes: duChef } = await exporter(ctx, chef, requete);
    expect(duChef.slice(1).map((l) => `${l.split(';')[0]} ${l.split(';')[4]}`)).toEqual([
      'Alice M-PROJ1 · Nom M-PROJ1',
    ]);
    const { lignes: deAdmin } = await exporter(ctx, a, requete);
    expect(deAdmin).toHaveLength(1 + 4);
    expect(deAdmin.some((l) => l.startsWith('Bob;'))).toBe(true);
    const { lignes: deAutre } = await exporter(ctx, autreChef, requete);
    expect(deAutre.slice(1).map((l) => l.split(';')[4]!.split(' · ')[0])).toEqual([
      'N-LECT',
      'P-AUTRE2',
      'P-AUTRE2',
    ]);
  });

  it('CSV-19 : filtre équipe, équipe inconnue, période vide : en-tête seul ; aucune écriture', async () => {
    const a = await admin(ctx);
    const chef = await utilisateur(ctx, 'Chef', 'chef_de_projet');
    const dev = await equipe(ctx, 'Dev');
    const alice = await utilisateur(ctx, 'Alice', 'ressource', { equipe: dev });
    const carl = await utilisateur(ctx, 'Carl');
    const p = await projet(ctx, a, 'P19', chef);
    await imputer(ctx, await assigner(ctx, a, p.id, alice), '2027-01-05', 1);
    await imputer(ctx, await assigner(ctx, a, p.id, carl), '2027-01-05', 1);
    await feuille(ctx, alice, '2027-01-04', 'brouillon');
    await feuille(ctx, carl, '2027-01-04', 'brouillon');
    const base = '?du=2027-01-01&au=2027-01-31';
    const noms = (lignes: string[]) => lignes.slice(1).map((l) => l.split(';')[0]);
    expect(noms((await exporter(ctx, a, adresseImp(`${base}&equipe=${dev}`))).lignes)).toEqual([
      'Alice',
    ]);
    expect(noms((await exporter(ctx, a, adresseImp(`${base}&equipe=aucune`))).lignes)).toEqual([
      'Carl',
    ]);
    const entete = `${BOM}${ENTETE_IMP}\r\n`;
    expect((await exporter(ctx, a, adresseImp(`${base}&equipe=9999`))).res.body).toBe(entete);
    expect((await exporter(ctx, a, adresseImp('?du=2028-01-01&au=2028-01-31'))).res.body).toBe(
      entete,
    );
    const avant = await empreinte(ctx);
    for (const acteur of [a, chef]) await exporter(ctx, acteur, adresseImp(base));
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('CSV-20 : injection sur le nom de la ressource et de l’équipe ; nom d’activité interne non préfixé', async () => {
    const a = await admin(ctx);
    const eq = await equipe(ctx, '@Eq');
    const eve = await utilisateur(ctx, '=Eve', 'ressource', { equipe: eq });
    const p = await projet(ctx, a, 'P20');
    await imputer(ctx, await assigner(ctx, a, p.id, eve, { nom: '=Nom' }), '2027-01-05', 1);
    await feuille(ctx, eve, '2027-01-04', 'brouillon');
    const { lignes } = await exporter(ctx, a, adresseImp('?du=2027-01-01&au=2027-01-31'));
    expect(lignes[1]).toBe("'=Eve;'@Eq;04/01/2027;Brouillon;P20 · Nom P20;1 =Nom;05/01/2027;1");
  });
});
