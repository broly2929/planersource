// Lot absences, tranche charge-taux (D-276) : CTT-1 à CTT-7.
// Valeurs attendues recopiées de SPEC §4, « Absences et charge depuis le taux (absences, D-276) », points 11 à 16,
// cas CT-1, CT-2 et CT-10 à CT-14.
import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, creerActeur, creerProjet, type Acteur } from './lot1-helpers.js';
import { creerActivite } from './lot1-t2-helpers.js';
import { calculer, empreinte } from './lot2a-helpers.js';

const JOUR = '2027-01-15';
const j = (n: number): string => `2027-01-${String(n).padStart(2, '0')}`;

async function monde(ctx: TestCtx) {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const p = await creerProjet(ctx, admin);
  await affecter(ctx, p.id, alice.id);
  const regul = await creerActivite(ctx, admin, p.id, {
    nom: 'Régulière',
    mode: 'REGUL',
    debut_valide: j(4),
    fin_valide: j(15),
  });
  const asap = await creerActivite(ctx, admin, p.id, { nom: 'Dès que possible' });
  return { admin, alice, p, regul, asap };
}

const assigner = (ctx: TestCtx, qui: Acteur, activiteId: number, corps: Record<string, unknown>) =>
  appel(ctx, qui).post(`/api/activites/${activiteId}/assignations`, corps);

async function refus(
  ctx: TestCtx,
  statut: number,
  envoyer: () => ReturnType<ReturnType<typeof appel>['get']>,
  code: string,
) {
  const avant = await empreinte(ctx);
  const res = await envoyer();
  expect(res.statusCode, res.body).toBe(statut);
  expect(res.json()).toMatchObject({ code });
  expect(await empreinte(ctx)).toEqual(avant);
}

async function enBase(ctx: TestCtx, id: number) {
  const { rows } = await ctx.pool.query<{ charge: string; reste: string; champ: boolean }>(
    `SELECT charge_assignee::text AS charge, reste_a_faire::text AS reste,
            charge_depuis_taux AS champ FROM assignation WHERE id = $1`,
    [id],
  );
  return rows[0]!;
}

describe('charge depuis le taux, API (SPEC §4 D-276, CT-10 à CT-14)', () => {
  const ctx = useTestApp(() => JOUR);

  it('CTT-1 : champ vrai hors REGUL → 422 mode_incompatible ; REGUL → 201 et 200 ; clé présente, faux par défaut (CT-10)', async () => {
    const m = await monde(ctx);
    await refus(
      ctx,
      422,
      () =>
        assigner(ctx, m.admin, m.asap.id, {
          ressource_id: m.alice.id,
          charge_assignee: 1,
          charge_depuis_taux: true,
        }),
      'mode_incompatible',
    );
    const ordinaire = await assigner(ctx, m.admin, m.asap.id, {
      ressource_id: m.alice.id,
      charge_assignee: 1,
    });
    expect(ordinaire.statusCode, ordinaire.body).toBe(201);
    expect(ordinaire.json()).toMatchObject({ charge_depuis_taux: false });
    const id = (ordinaire.json() as { id: number }).id;
    await refus(
      ctx,
      422,
      () => appel(ctx, m.admin).patch(`/api/assignations/${id}`, { charge_depuis_taux: true }),
      'mode_incompatible',
    );
    const r = await assigner(ctx, m.admin, m.regul.id, {
      ressource_id: m.alice.id,
      charge_assignee: 2,
      taux: 50,
      charge_depuis_taux: true,
    });
    expect(r.statusCode, r.body).toBe(201);
    expect(r.json()).toMatchObject({ charge_depuis_taux: true });
    const rid = (r.json() as { id: number }).id;
    const off = await appel(ctx, m.admin).patch(`/api/assignations/${rid}`, {
      charge_depuis_taux: false,
    });
    expect(off.statusCode, off.body).toBe(200);
    expect(off.json()).toMatchObject({ charge_depuis_taux: false });
    const lus = await appel(ctx, m.admin).get(`/api/projets/${m.p.id}/assignations`);
    for (const a of lus.json() as Record<string, unknown>[])
      expect(a).toHaveProperty('charge_depuis_taux');
  });

  it('CTT-2 : PATCH charge_assignee sur une assignation au champ vrai (ou le devenant) → 422 charge_calculee (CT-11)', async () => {
    const m = await monde(ctx);
    const r = await assigner(ctx, m.admin, m.regul.id, {
      ressource_id: m.alice.id,
      charge_assignee: 2,
      charge_depuis_taux: true,
    });
    const id = (r.json() as { id: number }).id;
    await refus(
      ctx,
      422,
      () => appel(ctx, m.admin).patch(`/api/assignations/${id}`, { charge_assignee: 3 }),
      'charge_calculee',
    );
    await appel(ctx, m.admin).patch(`/api/assignations/${id}`, { charge_depuis_taux: false });
    await refus(
      ctx,
      422,
      () =>
        appel(ctx, m.admin).patch(`/api/assignations/${id}`, {
          charge_assignee: 3,
          charge_depuis_taux: true,
        }),
      'charge_calculee',
    );
    const taux = await appel(ctx, m.admin).patch(`/api/assignations/${id}`, { taux: 50 });
    expect(taux.statusCode).toBe(200);
  });

  it('CTT-3 : activité passée de REGUL à ASAP : champ faux, charge inchangée (CT-12)', async () => {
    const m = await monde(ctx);
    const r = await assigner(ctx, m.admin, m.regul.id, {
      ressource_id: m.alice.id,
      charge_assignee: 2,
      charge_depuis_taux: true,
    });
    const id = (r.json() as { id: number }).id;
    const mode = await appel(ctx, m.admin).patch(`/api/activites/${m.regul.id}`, { mode: 'ASAP' });
    expect(mode.statusCode, mode.body).toBe(200);
    expect(await enBase(ctx, id)).toEqual({ charge: '2.00', reste: '2.00', champ: false });
  });

  it('CTT-4 : calcul : charge et reste écrits depuis la sortie (CT-1, CT-2), sans historique (CT-13)', async () => {
    const m = await monde(ctx);
    const r = await assigner(ctx, m.admin, m.regul.id, {
      ressource_id: m.alice.id,
      charge_assignee: 2,
      taux: 50,
      charge_depuis_taux: true,
    });
    const id = (r.json() as { id: number }).id;
    const histo = async () =>
      (await ctx.pool.query('SELECT 1 FROM historique WHERE entite = $1', ['assignation']))
        .rowCount;
    const avant = await histo();
    expect((await calculer(ctx, m.admin, { projets: [m.p.id], d0: j(4) })).statusCode).toBe(200);
    expect(await enBase(ctx, id)).toEqual({ charge: '5.00', reste: '5.00', champ: true });
    const abs = await appel(ctx, m.alice).post('/api/absences', {
      ressource_id: m.alice.id,
      debut: j(7),
      fin: j(7),
      portion: 'journee',
      motif: 'conge',
    });
    expect(abs.statusCode, abs.body).toBe(201);
    const demi = await appel(ctx, m.alice).post('/api/absences', {
      ressource_id: m.alice.id,
      debut: j(12),
      fin: j(12),
      portion: 'matin',
      motif: 'formation',
    });
    expect(demi.statusCode, demi.body).toBe(201);
    expect((await calculer(ctx, m.admin, { projets: [m.p.id], d0: j(4) })).statusCode).toBe(200);
    expect(await enBase(ctx, id)).toEqual({ charge: '4.25', reste: '4.25', champ: true });
    expect(await histo()).toBe(avant);
  });

  it('CTT-5 : copie de projet : champ copié (CT-14)', async () => {
    const m = await monde(ctx);
    await assigner(ctx, m.admin, m.regul.id, {
      ressource_id: m.alice.id,
      charge_assignee: 2,
      charge_depuis_taux: true,
    });
    const c = await appel(ctx, m.admin).post(`/api/projets/${m.p.id}/copie`, {
      nom: 'Copie',
      code: 'COPIE-CT',
      date_debut: j(4),
    });
    expect(c.statusCode, c.body).toBe(201);
    const lus = await appel(ctx, m.admin).get(
      `/api/projets/${(c.json() as { id: number }).id}/assignations`,
    );
    expect(
      (lus.json() as { charge_depuis_taux: boolean }[]).map((a) => a.charge_depuis_taux),
    ).toEqual([true]);
  });

  it('CTT-6 : migration 021 : colonne booléenne non nulle, défaut faux', async () => {
    const { rows } = await ctx.pool.query<{
      is_nullable: string;
      column_default: string;
      data_type: string;
    }>(
      `SELECT is_nullable, column_default, data_type FROM information_schema.columns
        WHERE table_name = 'assignation' AND column_name = 'charge_depuis_taux'`,
    );
    expect(rows).toEqual([{ is_nullable: 'NO', column_default: 'false', data_type: 'boolean' }]);
  });

  it('CTT-7 : historique : changement du champ historisé', async () => {
    const m = await monde(ctx);
    const r = await assigner(ctx, m.admin, m.regul.id, {
      ressource_id: m.alice.id,
      charge_assignee: 2,
      charge_depuis_taux: true,
    });
    const id = (r.json() as { id: number }).id;
    await appel(ctx, m.admin).patch(`/api/assignations/${id}`, { charge_depuis_taux: false });
    const { rows } = await ctx.pool.query<{ ancienne_valeur: unknown; nouvelle_valeur: unknown }>(
      `SELECT ancienne_valeur, nouvelle_valeur FROM historique
        WHERE entite = 'assignation' AND entite_id = $1 AND champ = 'charge_depuis_taux'`,
      [id],
    );
    expect(rows).toEqual([{ ancienne_valeur: true, nouvelle_valeur: false }]);
  });
});
