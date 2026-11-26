// Lot taux, tranche 1 (D-258) : taux résolu et coûts. TRS-1 à TRS-12.
// Valeurs attendues recopiées de SPEC §12.6 point 11 (cas TRS-A à TRS-N), §12.3 point 8 et §12.5 point 10.
import { beforeEach, describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps, creerActeur, liste, type Acteur } from './lot1-helpers.js';
import { creerActivite, creerAssignation, type Objet } from './lot1-t2-helpers.js';
import {
  imputer,
  MOIS,
  mensuel,
  nommer,
  planifier,
  projet,
  total,
  type ProjetPil,
} from './pilotage-helpers.js';
import { compterRequetesTaux, creerMondeTaux, urlDuJour, type MondeTaux } from './taux-helpers.js';

interface MondeCoutsTaux extends MondeTaux {
  pt: ProjetPil;
  a1: Objet;
  a2: Objet;
  /** Assignation d'Alice sur A1. */
  sA1: number;
  /** Assignation de Dave sur A2. */
  sA2: number;
}

/** Cas TRS-I : projet PT, A1 (Alice 2 j, reste 1 j), A2 (Dave 5 j, reste 4 j), imputations. */
async function mondeCouts(ctx: TestCtx): Promise<MondeCoutsTaux> {
  const m = await creerMondeTaux(ctx);
  const pt = await projet(ctx, m.admin, 'PT', m.admin, { nom: 'Projet T' });
  await affecter(ctx, pt.id, m.alice.id);
  await affecter(ctx, pt.id, m.dave.id);
  const a1 = await creerActivite(ctx, m.admin, pt.id, { nom: 'A1' });
  const a2 = await creerActivite(ctx, m.admin, pt.id, { nom: 'A2' });
  const sA1 = (await creerAssignation(ctx, m.admin, a1.id, m.alice.id, { charge_assignee: 2 })).id;
  const sA2 = (await creerAssignation(ctx, m.admin, a2.id, m.dave.id, { charge_assignee: 5 })).id;
  await ctx.pool.query('UPDATE assignation SET reste_a_faire = 1 WHERE id = $1', [sA1]);
  await ctx.pool.query('UPDATE assignation SET reste_a_faire = 4 WHERE id = $1', [sA2]);
  await imputer(ctx, sA1, '2027-01-15', 1);
  await imputer(ctx, sA1, '2027-02-15', 1);
  await imputer(ctx, sA2, '2027-01-15', 1);
  return { ...m, pt, a1, a2, sA1, sA2 };
}

/** Cas TRS-M : TRS-I plus le travail planifié d'Alice et de Dave. */
async function mondePilotage(ctx: TestCtx): Promise<MondeCoutsTaux> {
  const m = await mondeCouts(ctx);
  await planifier(ctx, m.sA1, '2027-02-16', 0.5);
  await planifier(ctx, m.sA2, '2027-03-15', 1);
  await planifier(ctx, m.sA2, '2027-07-15', 1);
  return m;
}

const duJour = async (ctx: TestCtx, qui: Acteur, date: string) => {
  const res = await appel(ctx, qui).get(urlDuJour(date));
  expect(res.statusCode, `${date} ${res.body}`).toBe(200);
  return liste(res);
};

const entree = (u: Acteur, montant: number | null, source: 'propre' | 'equipe' | null) => ({
  utilisateur_id: u.id,
  montant,
  source,
});

const passerAOps = async (ctx: TestCtx, m: MondeTaux) => {
  const res = await appel(ctx, m.admin).patch(`/api/utilisateurs/${m.dave.id}`, {
    equipe_id: m.ops,
  });
  expect(res.statusCode, res.body).toBe(200);
};

interface Gantt {
  projet: { totaux: Record<string, unknown> };
  elements: Record<string, unknown>[];
}

const cout = (e: Record<string, unknown>) => ({
  cout_planifie: e.cout_planifie,
  cout_impute: e.cout_impute,
  cout_reel: e.cout_reel,
  taux_manquant: e.taux_manquant,
});

const coutAttendu = (planifie: number, impute: number, reel: number, manquant: boolean) => ({
  cout_planifie: planifie,
  cout_impute: impute,
  cout_reel: reel,
  taux_manquant: manquant,
});

describe('Lot taux-1 : taux résolu et coûts (SPEC §12.6, D-258)', () => {
  let jour = '2027-02-15';
  const ctx = useTestApp(() => jour);
  beforeEach(() => {
    jour = '2027-02-15';
  });

  const gantt = async (m: MondeCoutsTaux): Promise<Gantt> => {
    const res = await appel(ctx, m.admin).get(`/api/projets/${m.pt.id}/gantt`);
    expect(res.statusCode, res.body).toBe(200);
    return corps(res) as unknown as Gantt;
  };
  const element = (g: Gantt, id: number) => g.elements.find((e) => e.id === id)!;

  it('TRS-1 : cas TRS-A à TRS-F (taux du jour, administrateur)', async () => {
    const m = await creerMondeTaux(ctx);
    // TRS-A, TRS-E, TRS-F
    expect(await duJour(ctx, m.admin, '2027-01-15')).toEqual([
      entree(m.alice, 600, 'propre'),
      entree(m.dave, 400, 'equipe'),
      entree(m.erin, null, null),
    ]);
    // TRS-B, TRS-E, TRS-F
    expect(await duJour(ctx, m.admin, '2027-02-15')).toEqual([
      entree(m.alice, 400, 'equipe'),
      entree(m.dave, 400, 'equipe'),
      entree(m.erin, null, null),
    ]);
    // TRS-C
    expect((await duJour(ctx, m.admin, '2027-03-15'))[0]).toEqual(entree(m.alice, 700, 'propre'));
    // TRS-D, TRS-F
    expect(await duJour(ctx, m.admin, '2027-07-15')).toEqual([
      entree(m.alice, null, null),
      entree(m.dave, null, null),
      entree(m.erin, null, null),
    ]);
  });

  it('TRS-2 : cas TRS-G : Zoé, non ressource membre de Dev, absente du taux du jour', async () => {
    const m = await creerMondeTaux(ctx);
    for (const date of ['2027-01-15', '2027-02-15']) {
      const ids = (await duJour(ctx, m.admin, date)).map((e) => e.utilisateur_id);
      expect(ids).not.toContain(m.zoe.id);
      expect(ids).not.toContain(m.admin.id);
    }
  });

  it('TRS-3 : cas TRS-H : Dave passé de Dev à Ops, 300 equipe au 15/02/2027 et au 15/07/2027', async () => {
    const m = await creerMondeTaux(ctx);
    await passerAOps(ctx, m);
    for (const date of ['2027-02-15', '2027-07-15']) {
      const e = (await duJour(ctx, m.admin, date)).find((x) => x.utilisateur_id === m.dave.id);
      expect(e, date).toEqual(entree(m.dave, 300, 'equipe'));
    }
  });

  it('TRS-4 : cas TRS-I : Gantt de PT au 15/02/2027 (A1, A2, totaux)', async () => {
    const m = await mondeCouts(ctx);
    const g = await gantt(m);
    expect(cout(element(g, m.a1.id))).toEqual(coutAttendu(800, 1000, 1400, false));
    expect(cout(element(g, m.a2.id))).toEqual(coutAttendu(2000, 400, 2000, false));
    expect(cout(g.projet.totaux)).toEqual(coutAttendu(2800, 1400, 3400, false));
  });

  it('TRS-5 : cas TRS-J : jour 15/07/2027, A2 et projet en taux manquant', async () => {
    jour = '2027-07-15';
    const m = await mondeCouts(ctx);
    const g = await gantt(m);
    expect(cout(element(g, m.a2.id))).toEqual(coutAttendu(0, 400, 400, true));
    expect(g.projet.totaux.taux_manquant).toBe(true);
  });

  it('TRS-6 : cas TRS-K : Dave passé à Ops, A2 au 15/02/2027', async () => {
    const m = await mondeCouts(ctx);
    await passerAOps(ctx, m);
    const g = await gantt(m);
    expect(cout(element(g, m.a2.id))).toEqual(coutAttendu(1500, 300, 1500, false));
  });

  it('TRS-7 : cas TRS-L : Erin sans aucun taux, coûts 0 sans taux manquant', async () => {
    const m = await mondeCouts(ctx);
    await affecter(ctx, m.pt.id, m.erin.id);
    const a3 = await creerActivite(ctx, m.admin, m.pt.id, { nom: 'A3' });
    const s = await creerAssignation(ctx, m.admin, a3.id, m.erin.id, { charge_assignee: 3 });
    await ctx.pool.query('UPDATE assignation SET reste_a_faire = 3 WHERE id = $1', [s.id]);
    const g = await gantt(m);
    expect(cout(element(g, a3.id))).toEqual(coutAttendu(0, 0, 0, false));
  });

  it('TRS-8 : export des coûts de PT (TRS-I) : colonnes de coût de A1, A2 et Total', async () => {
    const m = await mondeCouts(ctx);
    const res = await appel(ctx, m.admin).get(`/api/projets/${m.pt.id}/couts/export`);
    expect(res.statusCode, res.body).toBe(200);
    const lignes = res.body
      .replace(/^﻿/, '')
      .split('\r\n')
      .filter((l) => l !== '')
      .map((l) => l.split(';'));
    const couts = lignes.slice(1).map((c) => [c[0], c[1], ...c.slice(6)]);
    expect(couts).toEqual([
      ['1', 'A1', '800', '1000', '1400', 'non'],
      ['2', 'A2', '2000', '400', '2000', 'non'],
      ['Total', '', '2800', '1400', '3400', 'non'],
    ]);
  });

  it('TRS-9 : cas TRS-M : GET /api/couts?debut=2027-01, projet PT', async () => {
    const m = await mondePilotage(ctx);
    const res = await appel(ctx, m.admin).get('/api/couts?debut=2027-01');
    expect(res.statusCode, res.body).toBe(200);
    const moisProjet = mensuel({
      '2027-01': [1000, 0, 1000],
      '2027-02': [400, 200, 600],
      '2027-03': [0, 400, 400],
      '2027-07': [0, 0, 0, true],
    });
    expect(res.json()).toEqual({
      mois: MOIS,
      projets: [
        {
          projet_id: m.pt.id,
          code: 'PT',
          nom: 'Projet T',
          otp_effectif: null,
          clos: false,
          mois: moisProjet,
          total: total(1400, 600, 2000, true),
          ressources: [
            {
              ressource_id: m.alice.id,
              nom: 'Alice',
              actif: true,
              mois: mensuel({ '2027-01': [600, 0, 600], '2027-02': [400, 200, 600] }),
              total: total(1000, 200, 1200),
            },
            {
              ressource_id: m.dave.id,
              nom: 'Dave',
              actif: true,
              mois: mensuel({
                '2027-01': [400, 0, 400],
                '2027-03': [0, 400, 400],
                '2027-07': [0, 0, 0, true],
              }),
              total: total(400, 400, 800, true),
            },
          ],
        },
      ],
      total: { mois: moisProjet, total: total(1400, 600, 2000, true) },
    });
  });

  it('TRS-10 : cas TRS-N : Dave passé à Ops, ligne de Dave dans GET /api/couts', async () => {
    const m = await mondePilotage(ctx);
    await passerAOps(ctx, m);
    const res = await appel(ctx, m.admin).get('/api/couts?debut=2027-01');
    expect(res.statusCode, res.body).toBe(200);
    const r = res.json() as { projets: { ressources: Record<string, unknown>[] }[] };
    const dave = r.projets[0]!.ressources.find((x) => x.ressource_id === m.dave.id)!;
    expect({ mois: dave.mois, total: dave.total }).toEqual({
      mois: mensuel({
        '2027-01': [300, 0, 300],
        '2027-03': [0, 300, 300],
        '2027-07': [0, 300, 300],
      }),
      total: total(300, 600, 900),
    });
  });

  it('TRS-11 : export du pilotage (TRS-M) : fichier exact', async () => {
    const m = await mondePilotage(ctx);
    const res = await appel(ctx, m.admin).get('/api/couts/export?debut=2027-01');
    expect(res.statusCode, res.body).toBe(200);
    const attendu = [
      'Projet;OTP;Ressource;01/2027;02/2027;03/2027;04/2027;05/2027;06/2027;07/2027;08/2027;09/2027;10/2027;11/2027;12/2027;Total;Taux manquant',
      'PT · Projet T;;Total;1000;600;400;0;0;0;0;0;0;0;0;0;2000;oui',
      'PT · Projet T;;Alice;600;600;0;0;0;0;0;0;0;0;0;0;1200;non',
      'PT · Projet T;;Dave;400;0;400;0;0;0;0;0;0;0;0;0;800;oui',
      'Total;;;1000;600;400;0;0;0;0;0;0;0;0;0;2000;oui',
    ];
    expect(res.body).toBe(`﻿${attendu.join('\r\n')}\r\n`);
  });

  it('TRS-12 : une seule requête de lecture des taux pour le Gantt et pour GET /api/couts, 2 ou 10 ressources', async () => {
    const m = await mondePilotage(ctx);
    const mesurer = async () => {
      const g = await compterRequetesTaux(() =>
        appel(ctx, m.admin).get(`/api/projets/${m.pt.id}/gantt`),
      );
      expect(g.resultat.statusCode, g.resultat.body).toBe(200);
      const c = await compterRequetesTaux(() =>
        appel(ctx, m.admin).get('/api/couts?debut=2027-01'),
      );
      expect(c.resultat.statusCode, c.resultat.body).toBe(200);
      return { gantt: g.requetes, couts: c.requetes };
    };
    expect(await mesurer(), '2 ressources').toEqual({ gantt: 1, couts: 1 });
    for (let i = 0; i < 8; i += 1) {
      const r = await nommer(
        ctx,
        await creerActeur(ctx, `r${i}@taux.test`, 'ressource', true),
        `Ressource ${i}`,
      );
      if (i % 2 === 0) {
        await ctx.pool.query('UPDATE utilisateur SET equipe_id = $2 WHERE id = $1', [r.id, m.dev]);
      }
      await affecter(ctx, m.pt.id, r.id);
      const a = await creerActivite(ctx, m.admin, m.pt.id, { nom: `B${i}` });
      const s = await creerAssignation(ctx, m.admin, a.id, r.id, { charge_assignee: 1 });
      await planifier(ctx, s.id, '2027-02-16', 1);
    }
    expect(await mesurer(), '10 ressources').toEqual({ gantt: 1, couts: 1 });
  });
});
