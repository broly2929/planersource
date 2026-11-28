// Lot absences-grille (D-280) : AGT-1 à AGT-5.
// Valeurs attendues recopiées de SPEC §4, « Absences et charge depuis le taux », sous-section
// « Grille mensuelle (absences-grille, D-280) », points 29 et 30 (cas AG-1 à AG-5).
import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { LEADER } from './droits-helpers.js';
import {
  affecter,
  appel,
  creerActeur,
  creerCalendrier,
  creerProjet,
  type Acteur,
} from './lot1-helpers.js';

const JOUR = '2027-01-15';
const CLES = ['equipe_id', 'id', 'jours_non_ouvres', 'nom', 'peut_ecrire'];

interface LigneGrille {
  id: number;
  nom: string;
  equipe_id: number | null;
  peut_ecrire: boolean;
  jours_non_ouvres: string[];
}

interface Monde {
  admin: Acteur;
  chef: Acteur;
  leader: Acteur;
  alice: Acteur;
  bob: Acteur;
  claire: Acteur;
  dan: Acteur;
  equipe: number;
}

describe('absences-grille, lecture de la grille (SPEC §4 points 29 et 30, AG-1 à AG-5)', () => {
  const ctx = useTestApp(() => JOUR);

  /** Jeu de AG : Alice (équipe « Dev », mercredi 06/01/2027 férié), Bob (lundi au samedi), Claire non ressource, Dan inactif. */
  async function monde(): Promise<Monde> {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    const leader = await creerActeur(ctx, 'leader@example.test', LEADER);
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    const claire = await creerActeur(ctx, 'claire@example.test', 'ressource', false);
    const dan = await creerActeur(ctx, 'dan@example.test', 'ressource', true);
    const equipe = (
      await ctx.pool.query<{ id: number }>(`INSERT INTO equipe (nom) VALUES ('Dev') RETURNING id`)
    ).rows[0]!.id;
    const calFerie = await creerCalendrier(ctx, admin, { jours_travailles: [1, 2, 3, 4, 5] });
    const ferie = await appel(ctx, admin).post(`/api/calendriers/${calFerie.id}/feries`, {
      jour: '2027-01-06',
      libelle: 'Férié',
    });
    expect(ferie.statusCode, ferie.body).toBe(201);
    const calSamedi = await creerCalendrier(ctx, admin, { jours_travailles: [1, 2, 3, 4, 5, 6] });
    const noms: [Acteur, string][] = [
      [alice, 'Alice'],
      [bob, 'Bob'],
      [claire, 'Claire'],
      [dan, 'Dan'],
    ];
    for (const [u, nom] of noms) {
      await ctx.pool.query('UPDATE utilisateur SET nom = $2 WHERE id = $1', [u.id, nom]);
    }
    await ctx.pool.query(
      'UPDATE utilisateur SET calendrier_id = $2, equipe_id = $3 WHERE id = $1',
      [alice.id, calFerie.id, equipe],
    );
    await ctx.pool.query('UPDATE utilisateur SET calendrier_id = $2 WHERE id = $1', [
      bob.id,
      calSamedi.id,
    ]);
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = $1', [dan.id]);
    // Le chef a un projet où seule Alice est affectée.
    const p = await creerProjet(ctx, chef);
    await affecter(ctx, p.id, alice.id);
    return { admin, chef, leader, alice, bob, claire, dan, equipe };
  }

  const lire = async (ctx2: TestCtx, par: Acteur, mois = '2027-01') => {
    const r = await appel(ctx2, par).get(`/api/absences/grille?mois=${mois}`);
    expect(r.statusCode, r.body).toBe(200);
    return r.json() as LigneGrille[];
  };

  it('AGT-1 : chef, leader et administrateur lisent Alice et Bob seulement, triés par nom, clés exactes (AG-1)', async () => {
    const m = await monde();
    for (const par of [m.chef, m.leader, m.admin]) {
      const lignes = await lire(ctx, par);
      expect(lignes.map((l) => l.nom)).toEqual(['Alice', 'Bob']);
      expect(lignes.map((l) => l.id)).toEqual([m.alice.id, m.bob.id]);
      for (const l of lignes) expect(Object.keys(l).sort()).toEqual(CLES);
      expect(lignes[0]!.equipe_id).toBe(m.equipe);
      expect(lignes[1]!.equipe_id).toBeNull();
    }
  });

  it('AGT-2 : jours non ouvrés de janvier 2027 : Alice (férié le 06/01) et Bob (lundi au samedi) (AG-2)', async () => {
    const m = await monde();
    const lignes = await lire(ctx, m.admin);
    expect(lignes[0]!.jours_non_ouvres).toEqual([
      '2027-01-02',
      '2027-01-03',
      '2027-01-06',
      '2027-01-09',
      '2027-01-10',
      '2027-01-16',
      '2027-01-17',
      '2027-01-23',
      '2027-01-24',
      '2027-01-30',
      '2027-01-31',
    ]);
    expect(lignes[1]!.jours_non_ouvres).toEqual([
      '2027-01-03',
      '2027-01-10',
      '2027-01-17',
      '2027-01-24',
      '2027-01-31',
    ]);
  });

  it('AGT-3 : peut_ecrire : administrateur et leader pour toutes, chef pour Alice seule (AG-3)', async () => {
    const m = await monde();
    for (const par of [m.admin, m.leader]) {
      expect((await lire(ctx, par)).map((l) => l.peut_ecrire)).toEqual([true, true]);
    }
    expect((await lire(ctx, m.chef)).map((l) => l.peut_ecrire)).toEqual([true, false]);
  });

  it('AGT-4 : refus 401, 403 (rôle ressource), 400 (mois absent ou invalide), base inchangée (AG-4)', async () => {
    const m = await monde();
    await ctx.pool.query(
      `INSERT INTO absence (ressource_id, debut, fin, portion, motif)
       VALUES ($1, '2027-01-04', '2027-01-04', 'journee', 'conge')`,
      [m.alice.id],
    );
    const compte = async () =>
      (
        await ctx.pool.query<{ a: string; h: string }>(
          `SELECT (SELECT count(*) FROM absence) AS a, (SELECT count(*) FROM historique) AS h`,
        )
      ).rows[0]!;
    const avant = await compte();
    expect((await appel(ctx).get('/api/absences/grille?mois=2027-01')).statusCode).toBe(401);
    expect((await appel(ctx, m.alice).get('/api/absences/grille?mois=2027-01')).statusCode).toBe(
      403,
    );
    for (const mois of ['', '?mois=2027-13', '?mois=2027-1', '?mois=1999-12']) {
      const r = await appel(ctx, m.chef).get(`/api/absences/grille${mois}`);
      expect(r.statusCode, mois).toBe(400);
    }
    expect(await compte()).toEqual(avant);
  });

  it('AGT-5 : GET /api/absences?du&au sans ressource_id : chef lit tout le mois, Alice les siennes (AG-5)', async () => {
    const m = await monde();
    const poser = async (r: Acteur, debut: string, fin: string) =>
      ctx.pool.query(
        `INSERT INTO absence (ressource_id, debut, fin, portion, motif)
         VALUES ($1, $2, $3, 'journee', 'conge')`,
        [r.id, debut, fin],
      );
    await poser(m.alice, '2027-01-04', '2027-01-05');
    await poser(m.bob, '2027-01-28', '2027-02-02');
    await poser(m.bob, '2027-03-01', '2027-03-01');
    const url = '/api/absences?du=2027-01-01&au=2027-01-31';
    const chef = await appel(ctx, m.chef).get(url);
    expect(chef.statusCode, chef.body).toBe(200);
    expect((chef.json() as { ressource_id: number }[]).map((a) => a.ressource_id)).toEqual([
      m.alice.id,
      m.bob.id,
    ]);
    const alice = await appel(ctx, m.alice).get(url);
    expect(alice.statusCode, alice.body).toBe(200);
    expect((alice.json() as { ressource_id: number }[]).map((a) => a.ressource_id)).toEqual([
      m.alice.id,
    ]);
  });
});
