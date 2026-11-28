// Lot droits, tranche 1 (D-265) : lecture élargie du chef de projet. LCH-1 à LCH-8.
// Valeurs attendues recopiées de SPEC §2, « Lecture élargie du chef et rôle leader métier
// (droits, D-265) », point 7 (cas DR-1 à DR-16).
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, type Corps } from './lot1-helpers.js';
import {
  clesProfondes,
  CLES_CLIENT,
  CLES_FINANCES,
  creerMondeDroits,
  INTERDIT,
  JOUR,
  lire,
  refusSansEffet,
  requete,
  S1,
  TOTAUX_COMPLETS,
} from './droits-helpers.js';

interface Projet {
  id: number;
  peut_ecrire: boolean;
}

describe('Lot droits-1 : lecture élargie du chef de projet (SPEC §2, D-265)', () => {
  const ctx = useTestApp(() => JOUR);

  it('LCH-1 : chef hors portée, GET /api/projets contient P et P1 en lecture seule ; GET /api/projets/:id 200, peut_ecrire faux (DR-1, DR-2)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const projets = await lire<Projet[]>(ctx, m.horsPortee, '/api/projets');
    for (const id of [m.p.id, m.p1.id]) {
      const p = projets.find((x) => x.id === id);
      expect(p, `projet ${id} absent de la liste`).toBeDefined();
      expect(p!.peut_ecrire).toBe(false);
    }
    const p = await lire<Projet>(ctx, m.horsPortee, `/api/projets/${m.p.id}`);
    expect(p.peut_ecrire).toBe(false);
  });

  it('LCH-2 : chef hors portée, lectures de P en 200 ; Gantt peut_ecrire faux, sous_projets contient P1 (DR-3)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const base = `/api/projets/${m.p.id}`;
    for (const url of [
      `${base}/gantt`,
      `${base}/planning`,
      `${base}/activites`,
      `${base}/jalons`,
      `${base}/dependances`,
      `${base}/affectations`,
      `${base}/assignations`,
      `${base}/travail`,
      `/api/activites/${m.fp.id}/saisies?mois=2027-01`,
    ]) {
      const res = await appel(ctx, m.horsPortee).get(url);
      expect(res.statusCode, `${url} ${res.body}`).toBe(200);
    }
    const g = await lire<{ projet: Projet; sous_projets: { id: number }[] }>(
      ctx,
      m.horsPortee,
      `${base}/gantt`,
    );
    expect(g.projet.peut_ecrire).toBe(false);
    expect(g.sous_projets.map((s) => s.id)).toContain(m.p1.id);
  });

  it('LCH-3 : chef hors portée, clés financières et de 6c absentes ; charge_assignee absente de la vue d’une activité (DR-4)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const base = `/api/projets/${m.p.id}`;
    const interdites = ['totaux', ...CLES_FINANCES, ...CLES_CLIENT];
    for (const url of [`${base}/gantt`, `${base}/planning`, `${base}/jalons`]) {
      const cles = clesProfondes(await lire(ctx, m.horsPortee, url));
      for (const c of interdites) expect([...cles], `${url} : ${c}`).not.toContain(c);
    }
    const activites = await lire<Corps[]>(ctx, m.horsPortee, `${base}/activites`);
    expect(activites.length).toBeGreaterThan(0);
    for (const a of activites) {
      for (const c of [...interdites, 'charge_assignee']) expect(Object.keys(a)).not.toContain(c);
    }
  });

  it('LCH-4 : chef hors portée, écritures sur P → 403 { erreur: Interdit }, base inchangée (DR-5)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const h = m.horsPortee;
    const base = `/api/projets/${m.p.id}`;
    const ecritures: [string, 'POST' | 'PATCH' | 'PUT' | 'DELETE', string, unknown?][] = [
      ['PATCH projet', 'PATCH', base, { nom: 'Renommé' }],
      ['DELETE sous-projet', 'DELETE', `/api/projets/${m.p1.id}`],
      ['POST activité', 'POST', `${base}/activites`, { nom: 'Nouvelle' }],
      ['PATCH activité', 'PATCH', `/api/activites/${m.fp.id}`, { nom: 'Renommée' }],
      ['DELETE activité', 'DELETE', `/api/activites/${m.fp2.id}`],
      ['POST jalon', 'POST', `${base}/jalons`, { nom: 'Nouveau jalon' }],
      [
        'POST dépendance',
        'POST',
        `${base}/dependances`,
        { predecesseur_id: m.fp2.id, successeur_id: m.jp.id },
      ],
      ['POST affectation', 'POST', `${base}/affectations`, { ressource_id: m.zoe.id }],
      [
        'POST assignation',
        'POST',
        `/api/activites/${m.fp2.id}/assignations`,
        { ressource_id: m.alice.id, charge_assignee: 1 },
      ],
      ['POST déplacer', 'POST', `/api/elements/${m.jp.id}/deplacer`, { rang: 1 }],
      [
        'POST copie',
        'POST',
        `${base}/copie`,
        { nom: 'Copie', code: 'CDR', date_debut: '2027-02-01' },
      ],
      ['PUT saisies', 'PUT', `/api/activites/${m.fp.id}/saisies?mois=2027-01`, { saisies: [] }],
    ];
    for (const [libelle, methode, url, corps] of ecritures) {
      await refusSansEffet(ctx, 403, () => requete(ctx, h, methode, url, corps), INTERDIT, libelle);
    }
  });

  it('LCH-5 : chef hors portée, calcul, historique et export des coûts de P → 403, base inchangée (DR-6, DR-7, DR-8)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const h = m.horsPortee;
    await refusSansEffet(
      ctx,
      403,
      () => requete(ctx, h, 'POST', '/api/calcul', { projets: [m.p.id], d0: JOUR }),
      undefined,
      'calcul',
    );
    await refusSansEffet(
      ctx,
      403,
      () => requete(ctx, h, 'GET', `/api/projets/${m.p.id}/historique`),
      INTERDIT,
      'historique',
    );
    await refusSansEffet(
      ctx,
      403,
      () => requete(ctx, h, 'GET', `/api/projets/${m.p.id}/couts/export`),
      INTERDIT,
      'export des coûts',
    );
  });

  it('LCH-6 : chef hors portée, planning d’Alice sans ligne masquée ; plan de charge et export sans « Autres projets » (DR-9, DR-10)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const h = m.horsPortee;
    const planning = await lire<{ lignes: { projet: { id: number } | null; activite: unknown }[] }>(
      ctx,
      h,
      `/api/ressources/${m.alice.id}/planning`,
    );
    for (const l of planning.lignes) {
      expect(l.projet, 'ligne masquée').not.toBeNull();
      expect(l.activite, 'ligne masquée').not.toBeNull();
    }
    expect(planning.lignes.map((l) => l.projet?.id)).toContain(m.p.id);

    const plan = await lire<{
      ressources: { ressource_id: number; projets: { projet_id: number | null }[] }[];
    }>(ctx, h, '/api/plan-de-charge?debut=2027-01');
    const alice = plan.ressources.find((r) => r.ressource_id === m.alice.id);
    expect(alice).toBeDefined();
    const ids = alice!.projets.map((p) => p.projet_id);
    expect(ids).not.toContain(null);
    expect(ids).toContain(m.p.id);

    const csv = await appel(ctx, h).get('/api/plan-de-charge/export?debut=2027-01');
    expect(csv.statusCode).toBe(200);
    expect(csv.body).not.toContain('Autres projets');
    expect(csv.body).toContain('PDR · Projet P');
  });

  it('LCH-7 : chef hors portée, non-régression : validation de Q seule, taux et coûts dans sa portée seulement (DR-11 à DR-14)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const h = m.horsPortee;
    const val = await lire<{
      feuilles: { feuille_id: number; projets: { projet_id: number; peut_valider: boolean }[] }[];
    }>(ctx, h, `/api/validations?semaine=${S1}`);
    const f = val.feuilles.find((x) => x.feuille_id === m.feuilleAlice);
    expect(f).toBeDefined();
    const peut = Object.fromEntries(f!.projets.map((p) => [p.projet_id, p.peut_valider]));
    expect(peut).toEqual({ [m.p.id]: false, [m.q.id]: true });

    const res = await requete(ctx, h, 'POST', `/api/feuilles/${m.feuilleAlice}/valider`, {});
    expect(res.statusCode, res.body).toBe(200);
    const { rows } = await ctx.pool.query<{ projet_id: number }>(
      'SELECT projet_id FROM validation_feuille WHERE feuille_id = $1 ORDER BY projet_id',
      [m.feuilleAlice],
    );
    expect(rows.map((r) => r.projet_id)).toEqual([m.q.id]);

    expect((await appel(ctx, h).get(`/api/utilisateurs/${m.alice.id}/taux`)).statusCode).toBe(200);
    await refusSansEffet(
      ctx,
      403,
      () => requete(ctx, h, 'GET', `/api/utilisateurs/${m.zoe.id}/taux`),
      INTERDIT,
      'taux de Zoé',
    );

    const couts = await lire<{ projets: { code: string }[] }>(ctx, h, '/api/couts?debut=2027-01');
    const codes = couts.projets.map((p) => p.code);
    expect(codes).toContain('QDR');
    expect(codes).not.toContain('PDR');
  });

  it('LCH-8 : chef dans sa portée, non-régression : Gantt à huit clés de totaux, charge vendue, calcul et historique 200 (DR-15, DR-16)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const c = m.chef;
    const g = await lire<{ projet: Projet & { totaux: Corps } }>(
      ctx,
      c,
      `/api/projets/${m.p.id}/gantt`,
    );
    expect(g.projet.peut_ecrire).toBe(true);
    expect(Object.keys(g.projet.totaux).sort()).toEqual(TOTAUX_COMPLETS);
    const patch = await appel(ctx, c).patch(`/api/activites/${m.fp.id}`, { charge_vendue: 12 });
    expect(patch.statusCode, patch.body).toBe(200);
    const calcul = await appel(ctx, c).post('/api/calcul', { projets: [m.p.id], d0: JOUR });
    expect(calcul.statusCode, calcul.body).toBe(200);
    const hist = await appel(ctx, c).get(`/api/projets/${m.p.id}/historique`);
    expect(hist.statusCode, hist.body).toBe(200);
  });
});
