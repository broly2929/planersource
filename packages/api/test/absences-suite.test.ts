// Lot absences-suite (D-278) : ASU-1 à ASU-6.
// Valeurs attendues recopiées de SPEC §4, « Absences et charge depuis le taux », points 21 à 24
// (cas AB-12, AB-13, PCA-1 à PCA-8).
import { describe, expect, it, vi } from 'vitest';
import type { Entree } from '@planersource/engine';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, creerActeur, creerProjet, type Acteur } from './lot1-helpers.js';
import { creerActivite, creerAssignation } from './lot1-t2-helpers.js';
import { calculer, empreinte } from './lot2a-helpers.js';
import { joursAbsence } from '../src/planning/absences.js';

// Entrées du moteur capturées (ASU-1) : le moteur réel est appelé, son entrée est gardée.
const entrees = vi.hoisted(() => [] as unknown[]);
vi.mock('@planersource/engine', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@planersource/engine')>();
  return {
    ...reel,
    calculer: (entree: Entree) => {
      entrees.push(entree);
      return reel.calculer(entree);
    },
  };
});

const JOUR = '2027-01-15';

describe('absences-suite, dépliage borné (SPEC §4 point 22, AB-13, SEC-21)', () => {
  const ctx = useTestApp(() => JOUR);

  it('ASU-1 : un calcul de D0 04/01/2027 ne reçoit aucun jour d’absence postérieur à l’horizon (04/01/2030) (AB-13)', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const p = await creerProjet(ctx, admin);
    await affecter(ctx, p.id, alice.id);
    const act = await creerActivite(ctx, admin, p.id, { nom: 'ASAP' });
    await creerAssignation(ctx, admin, act.id, alice.id, { charge_assignee: 2 });
    await ctx.pool.query(
      `INSERT INTO absence (ressource_id, debut, fin, portion, motif)
       VALUES ($1, '2027-01-04', '2040-12-31', 'journee', 'conge')`,
      [alice.id],
    );
    entrees.length = 0;
    const r = await calculer(ctx, admin, { projets: [p.id], d0: '2027-01-04' });
    expect(r.statusCode, r.body).toBe(200);
    expect(entrees).toHaveLength(1);
    const entree = entrees[0] as Entree;
    const siennes = entree.ressources.find((x) => x.id === alice.id)?.absences ?? [];
    expect(siennes.length).toBeGreaterThan(0);
    expect(siennes.filter((a) => a.jour > '2030-01-04')).toEqual([]);
  });

  it('ASU-2 : une lecture dépliée du 04/01 au 08/01/2027 d’une absence jusqu’en 99999 rend 5 jours en moins de 2 s (AB-13)', async () => {
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    await ctx.pool.query(
      `INSERT INTO absence (ressource_id, debut, fin, portion, motif)
       VALUES ($1, '2027-01-04', '99999-12-31', 'journee', 'conge')`,
      [alice.id],
    );
    const client = await ctx.pool.connect();
    try {
      await client.query(`SET statement_timeout = '2s'`);
      const jours = await joursAbsence(client, [alice.id], '2027-01-04', '2027-01-08');
      expect(jours.map((x) => x.jour)).toEqual([
        '2027-01-04',
        '2027-01-05',
        '2027-01-06',
        '2027-01-07',
        '2027-01-08',
      ]);
    } finally {
      await client.query('RESET statement_timeout');
      client.release();
    }
  });
});

const DUREE = { erreur: 'Une absence dure au plus 366 jours.', code: 'duree_excessive' };

async function refusDuree(
  ctx: TestCtx,
  envoyer: () => Promise<{ statusCode: number; body: string; json: () => unknown }>,
) {
  const avant = await empreinte(ctx);
  const res = await envoyer();
  expect(res.statusCode, res.body).toBe(422);
  expect(res.json()).toEqual(DUREE);
  expect(await empreinte(ctx), 'base inchangée').toEqual(avant);
}

describe('absences-suite, durée maximale (SPEC §4 point 21, AB-12)', () => {
  const ctx = useTestApp(() => JOUR);
  const corps = (ressourceId: number, debut: string, fin: string) => ({
    ressource_id: ressourceId,
    debut,
    fin,
    portion: 'journee',
    motif: 'conge',
  });

  it('ASU-3 : POST de 366 jours → 201 ; de 367 jours → 422 duree_excessive, base inchangée (AB-12)', async () => {
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const r = await appel(ctx, alice).post(
      '/api/absences',
      corps(alice.id, '2027-01-01', '2028-01-01'),
    );
    expect(r.statusCode, r.body).toBe(201);
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    await refusDuree(ctx, () =>
      appel(ctx, bob).post('/api/absences', corps(bob.id, '2027-01-01', '2028-01-02')),
    );
  });

  it('ASU-4 : PATCH vers 367 jours (fin, puis début) → 422 duree_excessive, base inchangée (AB-12)', async () => {
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const r = await appel(ctx, alice).post(
      '/api/absences',
      corps(alice.id, '2027-01-01', '2028-01-01'),
    );
    expect(r.statusCode, r.body).toBe(201);
    const id = (r.json() as { id: number }).id;
    await refusDuree(ctx, () =>
      appel(ctx, alice).patch(`/api/absences/${id}`, { fin: '2028-01-02' }),
    );
    await refusDuree(ctx, () =>
      appel(ctx, alice).patch(`/api/absences/${id}`, { debut: '2026-12-31' }),
    );
  });
});

describe('absences-suite, plan de charge (SPEC §4 point 24, PCA-1 à PCA-8)', () => {
  const ctx = useTestApp(() => JOUR);

  interface MoisLu {
    mois: string;
    disponible: number;
    ecart: number;
  }

  /** Administrateur et Alice (capacité donnée, calendrier par défaut, équipe « Dev »). */
  async function monde(capacite = 1): Promise<{ admin: Acteur; alice: Acteur }> {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const { rows } = await ctx.pool.query<{ id: number }>(
      `INSERT INTO equipe (nom) VALUES ('Dev') RETURNING id`,
    );
    await ctx.pool.query(
      `UPDATE utilisateur SET nom = 'Alice', capacite = $2, equipe_id = $3 WHERE id = $1`,
      [alice.id, capacite, rows[0]!.id],
    );
    return { admin, alice };
  }

  async function poser(alice: Acteur, debut: string, fin: string, portion = 'journee') {
    const r = await appel(ctx, alice).post('/api/absences', {
      ressource_id: alice.id,
      debut,
      fin,
      portion,
      motif: 'conge',
    });
    expect(r.statusCode, r.body).toBe(201);
  }

  async function moisDe(admin: Acteur, alice: Acteur): Promise<MoisLu[]> {
    const r = await appel(ctx, admin).get('/api/plan-de-charge?debut=2027-01');
    expect(r.statusCode, r.body).toBe(200);
    const ressources = (r.json() as { ressources: { ressource_id: number; mois: MoisLu[] }[] })
      .ressources;
    return ressources.find((x) => x.ressource_id === alice.id)!.mois;
  }

  it('ASU-5 : disponible et écart, PCA-1 à PCA-7', async () => {
    // PCA-1
    const m = await monde();
    await poser(m.alice, '2027-01-04', '2027-01-08');
    let mois = await moisDe(m.admin, m.alice);
    expect(mois[0]).toMatchObject({ mois: '2027-01', disponible: 16, ecart: 16 });
    expect(mois[1]).toMatchObject({ mois: '2027-02', disponible: 20 });

    // PCA-2, puis PCA-3 (après-midi ajouté le même jour)
    await ctx.pool.query('DELETE FROM absence');
    await poser(m.alice, '2027-01-05', '2027-01-05', 'matin');
    expect((await moisDe(m.admin, m.alice))[0]!.disponible, 'PCA-2').toBe(20.5);
    await poser(m.alice, '2027-01-05', '2027-01-05', 'apres_midi');
    expect((await moisDe(m.admin, m.alice))[0]!.disponible, 'PCA-3').toBe(20);

    // PCA-4
    await ctx.pool.query('DELETE FROM absence');
    await poser(m.alice, '2027-01-09', '2027-01-09');
    await poser(m.alice, '2027-01-10', '2027-01-10', 'matin');
    expect((await moisDe(m.admin, m.alice))[0]!.disponible, 'PCA-4').toBe(21);

    // PCA-5
    await ctx.pool.query('DELETE FROM absence');
    await poser(m.alice, '2027-01-25', '2027-02-05');
    mois = await moisDe(m.admin, m.alice);
    expect([mois[0]!.disponible, mois[1]!.disponible], 'PCA-5').toEqual([16, 15]);

    // PCA-6
    await ctx.pool.query('DELETE FROM absence');
    await ctx.pool.query('UPDATE utilisateur SET capacite = 0.75 WHERE id = $1', [m.alice.id]);
    await poser(m.alice, '2027-01-05', '2027-01-05', 'matin');
    expect((await moisDe(m.admin, m.alice))[0]!.disponible, 'PCA-6').toBe(15.37);

    // PCA-7
    await ctx.pool.query('DELETE FROM absence');
    await ctx.pool.query('UPDATE utilisateur SET capacite = 1 WHERE id = $1', [m.alice.id]);
    const { rows } = await ctx.pool.query<{ id: number }>(
      `INSERT INTO calendrier (nom) VALUES ('Avec férié') RETURNING id`,
    );
    await ctx.pool.query(
      `INSERT INTO calendrier_ferie (calendrier_id, jour) VALUES ($1, '2027-01-06')`,
      [rows[0]!.id],
    );
    await ctx.pool.query('UPDATE utilisateur SET calendrier_id = $2 WHERE id = $1', [
      m.alice.id,
      rows[0]!.id,
    ]);
    await poser(m.alice, '2027-01-05', '2027-01-07');
    expect((await moisDe(m.admin, m.alice))[0]!.disponible, 'PCA-7').toBe(18);
  });

  it('ASU-6 : export, lignes « Disponible » et « Écart » de PCA-8', async () => {
    const m = await monde();
    await poser(m.alice, '2027-01-04', '2027-01-08');
    const r = await appel(ctx, m.admin).get('/api/plan-de-charge/export?debut=2027-01');
    expect(r.statusCode, r.body).toBe(200);
    const lignes = r.body.replace(/^\uFEFF/, '').split('\r\n');
    expect(lignes).toContain('Alice;Dev;Disponible;16;20;23;22;21;22;22;22;22;21;22;23');
    expect(lignes).toContain('Alice;Dev;Écart;16;20;23;22;21;22;22;22;22;21;22;23');
  });
});
