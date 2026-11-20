import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  creerProjet,
  liste,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import { attendreRepos, url } from './lot1-t2-helpers.js';

/*
 * Lot 1b-A, modèles de projet (SPEC §11.1, D-038).
 * Convention de refus pour un parent invalide : la contrainte de base (clé étrangère
 * (parent_id, est_modele), migration 004) est traduite en 422 « Arborescence de projets invalide »
 * (routes/projets.ts, `traduire`), comme pour un cycle. MOD-11 attend donc 422.
 */

/** Contenu de toutes les tables sauf `session`, trié : sert à prouver qu'un refus ne change rien. */
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

/** Chaque requête reçoit le statut attendu et laisse la base identique. */
async function refus(
  ctx: TestCtx,
  par: Acteur | undefined,
  requetes: [
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    adresse: string,
    statut: number,
    c?: Corps,
  ][],
): Promise<void> {
  for (const [methode, adresse, statut, c] of requetes) {
    const avant = await empreinte(ctx);
    const res = await ctx.app.inject({
      method: methode,
      url: adresse,
      ...(c ? { payload: c } : {}),
      headers: par ? { cookie: par.cookie } : {},
    });
    expect(res.statusCode, `${methode} ${adresse}`).toBe(statut);
    expect(await empreinte(ctx), `${methode} ${adresse} : base modifiée`).toEqual(avant);
  }
}

let n = 0;
async function creerModele(ctx: TestCtx, admin: Acteur, champs: Corps = {}) {
  n += 1;
  const res = await appel(ctx, admin).post('/api/modeles', {
    code: `M${n}`,
    nom: `Modèle ${n}`,
    date_debut: '2027-01-04',
    ...champs,
  });
  expect(res.statusCode).toBe(201);
  return corps(res) as Corps & { id: number };
}

async function monde(ctx: TestCtx) {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const modele = await creerModele(ctx, admin);
  return { admin, chef, alice, modele };
}

describe('Modèles de projet (lot 1b-A)', () => {
  const ctx = useTestApp();

  it('MOD-5 : POST /api/modeles → 201, est_modele vrai, chef = administrateur ; hors de /api/projets, dans /api/modeles', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    const ordinaire = await creerProjet(ctx, admin, { chef_id: chef.id });
    const res = await appel(ctx, admin).post('/api/modeles', {
      code: 'MOD-A',
      nom: 'Modèle A',
      date_debut: '2027-01-04',
      chef_id: chef.id, // ignoré : le chef d'un modèle est l'administrateur qui le crée
    });
    expect(res.statusCode).toBe(201);
    const modele = corps(res);
    expect(modele.est_modele).toBe(true);
    expect(modele.chef_id).toBe(admin.id);
    const projets = liste(await appel(ctx, admin).get('/api/projets')).map((p) => p.id);
    expect(projets).toEqual([ordinaire.id]);
    const modeles = liste(await appel(ctx, admin).get('/api/modeles'));
    expect(modeles.map((p) => p.id)).toEqual([modele.id]);
    expect(modeles[0]?.est_modele).toBe(true);
    const lu = await appel(ctx, admin).get(`/api/projets/${String(modele.id)}`);
    expect(lu.statusCode).toBe(200);
  });

  it('MOD-6 : un chef de projet lit la liste, la fiche et le planning d’un modèle, sans droit d’écriture', async () => {
    const { chef, modele, admin } = await monde(ctx);
    const activite = await appel(ctx, admin).post(url.activites(modele.id), { nom: 'Gros œuvre' });
    expect(activite.statusCode).toBe(201);
    const modeles = liste(await appel(ctx, chef).get('/api/modeles'));
    expect(modeles.map((m) => m.id)).toEqual([modele.id]);
    expect(modeles[0]?.peut_ecrire).toBe(false);
    const fiche = await appel(ctx, chef).get(`/api/projets/${modele.id}`);
    expect(fiche.statusCode).toBe(200);
    expect(corps(fiche).peut_ecrire).toBe(false);
    const plan = await appel(ctx, chef).get(url.planning(modele.id));
    expect(plan.statusCode).toBe(200);
    expect(liste(plan)).toHaveLength(1);
    expect(liste(await appel(ctx, chef).get('/api/projets'))).toEqual([]);
  });

  it('MOD-7 : un chef reçoit 403 sur POST /api/modeles, PATCH et DELETE d’un modèle ; base inchangée', async () => {
    const { chef, modele } = await monde(ctx);
    await refus(ctx, chef, [
      ['POST', '/api/modeles', 403, { code: 'X', nom: 'X', date_debut: '2027-01-04' }],
      ['PATCH', `/api/projets/${modele.id}`, 403, { nom: 'Pris' }],
      ['DELETE', `/api/projets/${modele.id}`, 403],
    ]);
  });

  it('MOD-8 : un chef reçoit 403 sur la création d’une activité, d’un jalon, d’une affectation dans un modèle ; base inchangée', async () => {
    const { chef, alice, modele } = await monde(ctx);
    await refus(ctx, chef, [
      ['POST', url.activites(modele.id), 403, { nom: 'A' }],
      ['POST', url.jalons(modele.id), 403, { nom: 'J' }],
      ['POST', `/api/projets/${modele.id}/affectations`, 403, { ressource_id: alice.id }],
    ]);
  });

  it('MOD-9-r1 : une ressource reçoit 403 sur GET /api/modeles et GET /api/projets, 404 sur la fiche d’un modèle, même affectée ; base inchangée', async () => {
    const { alice, modele } = await monde(ctx);
    await affecter(ctx, modele.id, alice.id);
    await refus(ctx, alice, [
      ['GET', '/api/modeles', 403],
      ['GET', `/api/projets/${modele.id}`, 404],
      ['GET', url.planning(modele.id), 404],
      ['POST', url.activites(modele.id), 404, { nom: 'A' }],
    ]);
    // Révision 6b (D-031, D-148 (2)) : liste des projets 403 au lieu de [].
    await refus(ctx, alice, [['GET', '/api/projets', 403]]);
  });

  it('MOD-10 : GET /api/modeles sans session → 401', async () => {
    await monde(ctx);
    await refus(ctx, undefined, [['GET', '/api/modeles', 401]]);
  });

  it('MOD-11 : sous-modèle accepté ; parent ordinaire pour un modèle et parent modèle pour un projet → 422 ; base inchangée', async () => {
    const { admin, chef, modele } = await monde(ctx);
    const ordinaire = await creerProjet(ctx, admin, { chef_id: chef.id });
    const sous = await appel(ctx, admin).post('/api/modeles', {
      code: 'MOD-S',
      nom: 'Sous-modèle',
      date_debut: '2027-01-04',
      parent_id: modele.id,
    });
    expect(sous.statusCode).toBe(201);
    expect(corps(sous).est_modele).toBe(true);
    expect(corps(sous).parent_id).toBe(modele.id);
    await refus(ctx, admin, [
      [
        'POST',
        '/api/modeles',
        422,
        { code: 'MOD-X', nom: 'X', date_debut: '2027-01-04', parent_id: ordinaire.id },
      ],
      [
        'POST',
        '/api/projets',
        422,
        { code: 'P-X', nom: 'X', date_debut: '2027-01-04', parent_id: modele.id },
      ],
    ]);
  });

  it('MOD-12 : PATCH avec est_modele → 400, sur un projet comme sur un modèle ; base inchangée', async () => {
    const { admin, chef, modele } = await monde(ctx);
    const ordinaire = await creerProjet(ctx, admin, { chef_id: chef.id });
    await refus(ctx, admin, [
      ['PATCH', `/api/projets/${ordinaire.id}`, 400, { est_modele: true }],
      ['PATCH', `/api/projets/${modele.id}`, 400, { est_modele: false }],
    ]);
  });

  it('MOD-13 : l’administrateur modifie puis supprime un modèle par /api/projets/:id ; historique écrit', async () => {
    const { admin, modele } = await monde(ctx);
    const maj = await appel(ctx, admin).patch(`/api/projets/${modele.id}`, { nom: 'Renommé' });
    expect(maj.statusCode).toBe(200);
    expect(corps(maj).nom).toBe('Renommé');
    const histo = liste(await appel(ctx, admin).get(`/api/projets/${modele.id}/historique`));
    expect(
      histo.some((e) => e.operation === 'modification' && e.champ === 'nom'),
      'entrée de modification du nom',
    ).toBe(true);
    expect(histo.some((e) => e.operation === 'creation' && e.entite === 'projet')).toBe(true);
    const sup = await appel(ctx, admin).delete(`/api/projets/${modele.id}`);
    expect(sup.statusCode).toBe(204);
    const { rows } = await ctx.pool.query<{ operation: string }>(
      "SELECT operation FROM historique WHERE entite = 'projet' AND entite_id = $1",
      [modele.id],
    );
    expect(rows.map((r) => r.operation).sort()).toEqual([
      'creation',
      'modification',
      'suppression',
    ]);
    const { rowCount } = await ctx.pool.query('SELECT 1 FROM projet WHERE id = $1', [modele.id]);
    expect(rowCount).toBe(0);
  });

  it('MOD-14 : POST /api/modeles, corps invalide → 400, code déjà utilisé par un projet → 409 ; base inchangée', async () => {
    const { admin, chef } = await monde(ctx);
    const ordinaire = await creerProjet(ctx, admin, { chef_id: chef.id });
    await refus(ctx, admin, [
      ['POST', '/api/modeles', 400, { code: '', nom: 'X', date_debut: '2027-01-04' }],
      ['POST', '/api/modeles', 400, { nom: 'X', date_debut: '2027-01-04' }],
      ['POST', '/api/modeles', 400, { code: 'Z', nom: 'X', date_debut: 'demain' }],
      [
        'POST',
        '/api/modeles',
        400,
        { code: 'Z', nom: 'X', date_debut: '2027-01-04', est_modele: false },
      ],
      [
        'POST',
        '/api/modeles',
        409,
        { code: String(ordinaire.code).toLowerCase(), nom: 'X', date_debut: '2027-01-04' },
      ],
    ]);
  });
});
