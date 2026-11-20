// Tranche Clôture, C1 (D-083) : PRJ-26 à PRJ-38, ACT-23 à ACT-29, JLN-13, JLN-14.
// Valeurs de SPEC §3, puce « Clôture (D-083) ». Chaque refus vérifie le statut, le champ `code`,
// l'empreinte de la base (tables hors session) et l'historique. Les données incohérentes
// (D-083 (7)) sont posées en SQL, l'API les refusant désormais.
import type { LightMyRequestResponse } from 'fastify';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { testDbUrl, useTestApp, type TestCtx } from './helpers.js';
import {
  appel,
  corps,
  creerActeur,
  creerProjet,
  liste,
  type Acteur,
  type Corps,
} from './lot1-helpers.js';
import { attendreRepos, creerActivite, creerJalon, url } from './lot1-t2-helpers.js';

/** Contenu de toutes les tables sauf `session`, trié : prouve qu'un refus ne change rien. */
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

async function historique(ctx: TestCtx): Promise<unknown[]> {
  return (await ctx.pool.query('SELECT * FROM historique ORDER BY id')).rows as unknown[];
}

type Methode = 'POST' | 'PATCH';

/** Envoie la requête ; attend `statut` (et `code` si donné), base et historique inchangés. */
async function refus(
  ctx: TestCtx,
  par: Acteur,
  methode: Methode,
  adresse: string,
  c: Corps,
  statut: number,
  code?: string,
): Promise<LightMyRequestResponse> {
  const avant = await empreinte(ctx);
  const histAvant = await historique(ctx);
  const res =
    methode === 'POST'
      ? await appel(ctx, par).post(adresse, c)
      : await appel(ctx, par).patch(adresse, c);
  const nom = `${methode} ${adresse} ${JSON.stringify(c)}`;
  expect(res.statusCode, `${nom} : ${res.body}`).toBe(statut);
  if (code !== undefined) {
    const b = corps(res);
    expect(b.code, `${nom} : code`).toBe(code);
    expect(typeof b.erreur, `${nom} : erreur`).toBe('string');
  }
  expect(await historique(ctx), `${nom} : historique modifié`).toEqual(histAvant);
  expect(await empreinte(ctx), `${nom} : base modifiée`).toEqual(avant);
  return res;
}

const refus422 = (
  ctx: TestCtx,
  par: Acteur,
  methode: Methode,
  adresse: string,
  c: Corps,
  code: string,
) => refus(ctx, par, methode, adresse, c, 422, code);

async function ok(res: LightMyRequestResponse | Promise<LightMyRequestResponse>, quoi: string) {
  const r = await res;
  expect(r.statusCode, `${quoi} : ${r.body}`).toBe(200);
  return r;
}

const projetUrl = (id: number) => `/api/projets/${id}`;

async function sqlCloreProjet(ctx: TestCtx, id: number) {
  await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [id]);
}
async function sqlCloreActivites(ctx: TestCtx, ids: number[]) {
  await ctx.pool.query('UPDATE activite SET close = true WHERE id = ANY($1)', [ids]);
}

let n = 0;
async function creerModele(ctx: TestCtx, admin: Acteur): Promise<Corps & { id: number }> {
  n += 1;
  const res = await appel(ctx, admin).post('/api/modeles', {
    code: `MC${n}`,
    nom: `Modèle C${n}`,
    date_debut: '2027-01-04',
  });
  expect(res.statusCode).toBe(201);
  return corps(res) as Corps & { id: number };
}

/**
 * Une connexion SQL tient la ligne du projet racine (FOR UPDATE) et y écrit ; la requête API est
 * lancée ; on attend que PostgreSQL déclare une autre connexion en attente de verrou (sondage
 * borné, pas de délai arbitraire), puis on valide. Renvoie si la requête a attendu et sa réponse.
 */
async function sousVerrou(
  ctx: TestCtx,
  racineId: number,
  ecriture: { sql: string; params: unknown[] },
  requete: () => Promise<LightMyRequestResponse>,
): Promise<{ bloque: boolean; res: LightMyRequestResponse }> {
  const c1 = new pg.Client({ connectionString: testDbUrl() });
  await c1.connect();
  try {
    await c1.query('BEGIN');
    const pid1 = Number(
      ((await c1.query('SELECT pg_backend_pid() AS pid')).rows[0] as { pid: number }).pid,
    );
    await c1.query('SELECT id FROM projet WHERE id = $1 FOR UPDATE', [racineId]);
    await c1.query(ecriture.sql, ecriture.params);
    let termine = false;
    const enCours = requete().then((r) => {
      termine = true;
      return r;
    });
    let bloque = false;
    for (let i = 0; i < 100 && !bloque && !termine; i += 1) {
      const { rows } = await ctx.pool.query(
        `SELECT 1 FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> $1 AND wait_event_type = 'Lock'`,
        [pid1],
      );
      bloque = rows.length > 0;
      if (!bloque) await new Promise((r) => setTimeout(r, 50));
    }
    await c1.query('COMMIT');
    return { bloque, res: await enCours };
  } finally {
    await c1.end();
  }
}

describe('Clôture C1 (D-083)', () => {
  const ctx = useTestApp();
  const admin = () => creerActeur(ctx, 'admin@example.test', 'administrateur');

  it('PRJ-26 : clôture refusée, activité ouverte au 3e niveau (A1 et A2 closes en SQL) → 422 enfants_ouverts', async () => {
    const a = await admin();
    const p = await creerProjet(ctx, a);
    const a1 = await creerActivite(ctx, a, p.id);
    const a2 = await creerActivite(ctx, a, p.id, { parent_id: a1.id });
    await creerActivite(ctx, a, p.id, { parent_id: a2.id });
    await sqlCloreActivites(ctx, [a1.id, a2.id]);
    await refus422(ctx, a, 'PATCH', projetUrl(p.id), { clos: true }, 'enfants_ouverts');
  });

  it('PRJ-27 : clôture refusée, sous-projet ouvert au 2e niveau (S1 clos en SQL) → 422 enfants_ouverts', async () => {
    const a = await admin();
    const p = await creerProjet(ctx, a);
    const s1 = await creerProjet(ctx, a, { parent_id: p.id });
    await creerProjet(ctx, a, { parent_id: s1.id });
    await sqlCloreProjet(ctx, s1.id);
    await refus422(ctx, a, 'PATCH', projetUrl(p.id), { clos: true }, 'enfants_ouverts');
  });

  it('PRJ-28 : clôture refusée, sous-projet clos (en SQL) contenant une activité ouverte → 422 enfants_ouverts', async () => {
    const a = await admin();
    const p = await creerProjet(ctx, a);
    const s = await creerProjet(ctx, a, { parent_id: p.id });
    await creerActivite(ctx, a, s.id);
    await sqlCloreProjet(ctx, s.id);
    await refus422(ctx, a, 'PATCH', projetUrl(p.id), { clos: true }, 'enfants_ouverts');
  });

  it('PRJ-29 : garde, clôture acceptée : tout clos par l’API, jalons ouverts → 200', async () => {
    const a = await admin();
    const p = await creerProjet(ctx, a);
    const parente = await creerActivite(ctx, a, p.id);
    const feuille = await creerActivite(ctx, a, p.id, { parent_id: parente.id });
    await creerJalon(ctx, a, p.id);
    const s = await creerProjet(ctx, a, { parent_id: p.id });
    const b = await creerActivite(ctx, a, s.id);
    await creerJalon(ctx, a, s.id);
    const api = appel(ctx, a);
    await ok(api.patch(url.activite(feuille.id), { close: true }), 'feuille');
    await ok(api.patch(url.activite(parente.id), { close: true }), 'parente');
    await ok(api.patch(url.activite(b.id), { close: true }), 'activité de S');
    await ok(api.patch(projetUrl(s.id), { clos: true }), 'S');
    await ok(api.patch(projetUrl(p.id), { clos: true }), 'P');
    expect(corps(await api.get(projetUrl(p.id))).clos).toBe(true);
  });

  it('PRJ-30a : modèle, même règle : activité ouverte → 422 enfants_ouverts', async () => {
    const a = await admin();
    const m = await creerModele(ctx, a);
    await creerActivite(ctx, a, m.id);
    await refus422(ctx, a, 'PATCH', projetUrl(m.id), { clos: true }, 'enfants_ouverts');
  });

  it('PRJ-30b : modèle, acceptation : activité close → 200', async () => {
    const a = await admin();
    const m = await creerModele(ctx, a);
    const act = await creerActivite(ctx, a, m.id);
    await ok(appel(ctx, a).patch(url.activite(act.id), { close: true }), 'activité');
    await ok(appel(ctx, a).patch(projetUrl(m.id), { clos: true }), 'modèle');
  });

  /** A > B > C, B close en SQL (incohérent), C ouverte. */
  async function troisNiveaux(a: Acteur) {
    const p = await creerProjet(ctx, a);
    const actA = await creerActivite(ctx, a, p.id);
    const actB = await creerActivite(ctx, a, p.id, { parent_id: actA.id });
    const actC = await creerActivite(ctx, a, p.id, { parent_id: actB.id });
    await sqlCloreActivites(ctx, [actB.id]);
    return { actA, actC };
  }

  it('ACT-23a : activité parente, petite-fille ouverte (fille close en SQL) → 422 enfants_ouverts', async () => {
    const a = await admin();
    const { actA } = await troisNiveaux(a);
    await refus422(ctx, a, 'PATCH', url.activite(actA.id), { close: true }, 'enfants_ouverts');
  });

  it('ACT-23b : activité parente, acceptation : petite-fille close → 200', async () => {
    const a = await admin();
    const { actA, actC } = await troisNiveaux(a);
    await ok(appel(ctx, a).patch(url.activite(actC.id), { close: true }), 'C');
    await ok(appel(ctx, a).patch(url.activite(actA.id), { close: true }), 'A');
  });

  it('ACT-24a : réouverture d’une activité sous une activité close → 422 parent_clos', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p1 = await creerProjet(ctx, a);
    const actA = await creerActivite(ctx, a, p1.id);
    const actB = await creerActivite(ctx, a, p1.id, { parent_id: actA.id });
    await ok(api.patch(url.activite(actB.id), { close: true }), 'B');
    await ok(api.patch(url.activite(actA.id), { close: true }), 'A');
    await refus422(ctx, a, 'PATCH', url.activite(actB.id), { close: false }, 'parent_clos');
  });

  it('ACT-24b : réouverture d’une activité dans un projet clos → 422 parent_clos', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p2 = await creerProjet(ctx, a);
    const x = await creerActivite(ctx, a, p2.id);
    await ok(api.patch(url.activite(x.id), { close: true }), 'X');
    await ok(api.patch(projetUrl(p2.id), { clos: true }), 'P2');
    await refus422(ctx, a, 'PATCH', url.activite(x.id), { close: false }, 'parent_clos');
  });

  it('ACT-24c : réouverture d’une activité dans un projet dont un ancêtre est clos (SQL) → 422 parent_clos', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const g = await creerProjet(ctx, a);
    const p3 = await creerProjet(ctx, a, { parent_id: g.id });
    const y = await creerActivite(ctx, a, p3.id);
    await ok(api.patch(url.activite(y.id), { close: true }), 'Y');
    await sqlCloreProjet(ctx, g.id);
    await refus422(ctx, a, 'PATCH', url.activite(y.id), { close: false }, 'parent_clos');
  });

  it('PRJ-31a : réouverture d’un sous-projet dont le parent est clos → 422 parent_clos', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p = await creerProjet(ctx, a);
    const s = await creerProjet(ctx, a, { parent_id: p.id });
    await ok(api.patch(projetUrl(s.id), { clos: true }), 'S');
    await ok(api.patch(projetUrl(p.id), { clos: true }), 'P');
    await refus422(ctx, a, 'PATCH', projetUrl(s.id), { clos: false }, 'parent_clos');
  });

  it('PRJ-31b : réouverture d’un sous-projet dont un ancêtre est clos (SQL), parent ouvert → 422 parent_clos', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const g = await creerProjet(ctx, a);
    const p2 = await creerProjet(ctx, a, { parent_id: g.id });
    const s2 = await creerProjet(ctx, a, { parent_id: p2.id });
    await ok(api.patch(projetUrl(s2.id), { clos: true }), 'S2');
    await sqlCloreProjet(ctx, g.id);
    await refus422(ctx, a, 'PATCH', projetUrl(s2.id), { clos: false }, 'parent_clos');
  });

  it('ACT-25a : création d’une activité dans un projet clos → 422 parent_clos', async () => {
    const a = await admin();
    const clos = await creerProjet(ctx, a);
    await ok(appel(ctx, a).patch(projetUrl(clos.id), { clos: true }), 'projet');
    await refus422(ctx, a, 'POST', url.activites(clos.id), { nom: 'Nouvelle' }, 'parent_clos');
  });

  it('ACT-25b : création d’une activité sous une activité close → 422 parent_clos', async () => {
    const a = await admin();
    const q = await creerProjet(ctx, a);
    const actA = await creerActivite(ctx, a, q.id);
    await ok(appel(ctx, a).patch(url.activite(actA.id), { close: true }), 'A');
    await refus422(
      ctx,
      a,
      'POST',
      url.activites(q.id),
      { nom: 'Nouvelle', parent_id: actA.id },
      'parent_clos',
    );
  });

  it('JLN-13a : création d’un jalon dans un projet clos → 422 parent_clos', async () => {
    const a = await admin();
    const clos = await creerProjet(ctx, a);
    await ok(appel(ctx, a).patch(projetUrl(clos.id), { clos: true }), 'projet');
    await refus422(ctx, a, 'POST', url.jalons(clos.id), { nom: 'Nouveau' }, 'parent_clos');
  });

  it('JLN-13b : création d’un jalon sous une activité close → 422 parent_clos', async () => {
    const a = await admin();
    const q = await creerProjet(ctx, a);
    const actA = await creerActivite(ctx, a, q.id);
    await ok(appel(ctx, a).patch(url.activite(actA.id), { close: true }), 'A');
    await refus422(
      ctx,
      a,
      'POST',
      url.jalons(q.id),
      { nom: 'Nouveau', parent_id: actA.id },
      'parent_clos',
    );
  });

  it('PRJ-32 : création d’un sous-projet sous un projet clos → 422 parent_clos', async () => {
    const a = await admin();
    const clos = await creerProjet(ctx, a);
    await ok(appel(ctx, a).patch(projetUrl(clos.id), { clos: true }), 'projet');
    await refus422(
      ctx,
      a,
      'POST',
      '/api/projets',
      { code: 'SOUS-32', nom: 'Sous 32', date_debut: '2027-01-04', parent_id: clos.id },
      'parent_clos',
    );
  });

  it('ACT-26a : déplacement d’une activité sous une activité close → 422 parent_clos', async () => {
    const a = await admin();
    const q = await creerProjet(ctx, a);
    const actA = await creerActivite(ctx, a, q.id);
    const actB = await creerActivite(ctx, a, q.id);
    await ok(appel(ctx, a).patch(url.activite(actA.id), { close: true }), 'A');
    await refus422(ctx, a, 'POST', url.deplacer(actB.id), { parent_id: actA.id }, 'parent_clos');
  });

  it('ACT-26b : déplacement d’une activité dans un projet clos (changement de rang) → 422 parent_clos', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p = await creerProjet(ctx, a);
    const x = await creerActivite(ctx, a, p.id);
    const y = await creerActivite(ctx, a, p.id);
    await ok(api.patch(url.activite(x.id), { close: true }), 'X');
    await ok(api.patch(url.activite(y.id), { close: true }), 'Y');
    await ok(api.patch(projetUrl(p.id), { clos: true }), 'P');
    await refus422(ctx, a, 'POST', url.deplacer(x.id), { rang: 2 }, 'parent_clos');
  });

  it('JLN-14a : déplacement d’un jalon sous une activité close → 422 parent_clos', async () => {
    const a = await admin();
    const q = await creerProjet(ctx, a);
    const actA = await creerActivite(ctx, a, q.id);
    const j = await creerJalon(ctx, a, q.id);
    await ok(appel(ctx, a).patch(url.activite(actA.id), { close: true }), 'A');
    await refus422(ctx, a, 'POST', url.deplacer(j.id), { parent_id: actA.id }, 'parent_clos');
  });

  it('JLN-14b : déplacement d’un jalon dans un projet clos (changement de rang) → 422 parent_clos', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p = await creerProjet(ctx, a);
    const x = await creerActivite(ctx, a, p.id);
    const j2 = await creerJalon(ctx, a, p.id);
    await ok(api.patch(url.activite(x.id), { close: true }), 'X');
    await ok(api.patch(projetUrl(p.id), { clos: true }), 'P');
    await refus422(ctx, a, 'POST', url.deplacer(j2.id), { rang: 1 }, 'parent_clos');
  });

  it('PRJ-33a : rattachement d’un projet ouvert à un projet clos → 422 parent_clos', async () => {
    const a = await admin();
    const clos = await creerProjet(ctx, a);
    await ok(appel(ctx, a).patch(projetUrl(clos.id), { clos: true }), 'parent');
    const ouvert = await creerProjet(ctx, a);
    await refus422(ctx, a, 'PATCH', projetUrl(ouvert.id), { parent_id: clos.id }, 'parent_clos');
  });

  it('PRJ-33b : témoin, projet clos rattaché à un projet clos → 200', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const clos = await creerProjet(ctx, a);
    await ok(api.patch(projetUrl(clos.id), { clos: true }), 'parent');
    const k = await creerProjet(ctx, a);
    await ok(api.patch(projetUrl(k.id), { clos: true }), 'K');
    await ok(api.patch(projetUrl(k.id), { parent_id: clos.id }), 'rattachement de K');
  });

  it('PRJ-34 : cycle → 422 { erreur: Arborescence de projets invalide, code: arborescence_invalide }', async () => {
    const a = await admin();
    const p = await creerProjet(ctx, a);
    const s = await creerProjet(ctx, a, { parent_id: p.id });
    const res = await refus422(
      ctx,
      a,
      'PATCH',
      projetUrl(p.id),
      { parent_id: s.id },
      'arborescence_invalide',
    );
    expect(corps(res)).toEqual({
      erreur: 'Arborescence de projets invalide',
      code: 'arborescence_invalide',
    });
  });

  it('PRJ-35 : garde, ordre : clos: true et code déjà pris, activité ouverte → 409', async () => {
    const a = await admin();
    const p = await creerProjet(ctx, a);
    await creerActivite(ctx, a, p.id);
    const autre = await creerProjet(ctx, a);
    await refus(ctx, a, 'PATCH', projetUrl(p.id), { clos: true, code: autre.code as string }, 409);
  });

  it('PRJ-36 : garde, transitions seules : PATCH du nom et de la priorité sur des projets incohérents → 200', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p = await creerProjet(ctx, a);
    const s = await creerProjet(ctx, a, { parent_id: p.id });
    await creerActivite(ctx, a, p.id);
    await sqlCloreProjet(ctx, p.id);
    await ok(api.patch(projetUrl(p.id), { nom: 'P renommé' }), 'nom de P');
    await ok(api.patch(projetUrl(s.id), { nom: 'S renommé' }), 'nom de S');
    await ok(api.patch(projetUrl(p.id), { priorite: 100 }), 'priorité de P');
  });

  it('ACT-27 : garde, transitions seules : PATCH du nom d’activités incohérentes → 200', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p = await creerProjet(ctx, a);
    const actA = await creerActivite(ctx, a, p.id);
    const actB = await creerActivite(ctx, a, p.id, { parent_id: actA.id });
    await sqlCloreActivites(ctx, [actA.id]);
    await sqlCloreProjet(ctx, p.id);
    await ok(api.patch(url.activite(actA.id), { nom: 'A renommée' }), 'nom de A');
    await ok(api.patch(url.activite(actB.id), { nom: 'B renommée' }), 'nom de B');
  });

  it('PRJ-37 : garde, rouvrir un projet parent clos → 200, le sous-projet reste clos', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p = await creerProjet(ctx, a);
    const s = await creerProjet(ctx, a, { parent_id: p.id });
    await ok(api.patch(projetUrl(s.id), { clos: true }), 'S');
    await ok(api.patch(projetUrl(p.id), { clos: true }), 'P');
    await ok(api.patch(projetUrl(p.id), { clos: false }), 'réouverture de P');
    expect(corps(await api.get(projetUrl(s.id))).clos).toBe(true);
  });

  it('ACT-28 : garde, rouvrir une activité parente close → 200, la fille reste close', async () => {
    const a = await admin();
    const api = appel(ctx, a);
    const p = await creerProjet(ctx, a);
    const actA = await creerActivite(ctx, a, p.id);
    const actB = await creerActivite(ctx, a, p.id, { parent_id: actA.id });
    await ok(api.patch(url.activite(actB.id), { close: true }), 'B');
    await ok(api.patch(url.activite(actA.id), { close: true }), 'A');
    await ok(api.patch(url.activite(actA.id), { close: false }), 'réouverture de A');
    const b = liste(await api.get(url.activites(p.id))).find((x) => x.id === actB.id);
    expect(b?.close).toBe(true);
  });

  it('PRJ-38 : concurrence, la clôture attend le verrou de la racine et voit l’activité rouverte → 422 enfants_ouverts', async () => {
    const a = await admin();
    const r = await creerProjet(ctx, a);
    const p = await creerProjet(ctx, a, { parent_id: r.id });
    const x = await creerActivite(ctx, a, p.id);
    await ok(appel(ctx, a).patch(url.activite(x.id), { close: true }), 'X');
    const { bloque, res } = await sousVerrou(
      ctx,
      r.id,
      { sql: 'UPDATE activite SET close = false WHERE id = $1', params: [x.id] },
      () => appel(ctx, a).patch(projetUrl(p.id), { clos: true }),
    );
    expect(bloque, 'la clôture doit attendre le verrou de la racine').toBe(true);
    expect(res.statusCode, res.body).toBe(422);
    expect(corps(res).code).toBe('enfants_ouverts');
    const { rows } = await ctx.pool.query('SELECT clos FROM projet WHERE id = $1', [p.id]);
    expect(rows[0]).toEqual({ clos: false });
  });

  it('ACT-29 : concurrence, la création attend le verrou de la racine et voit le projet clos → 422 parent_clos', async () => {
    const a = await admin();
    const r = await creerProjet(ctx, a);
    const p = await creerProjet(ctx, a, { parent_id: r.id });
    const { bloque, res } = await sousVerrou(
      ctx,
      r.id,
      { sql: 'UPDATE projet SET clos = true WHERE id = $1', params: [p.id] },
      () => appel(ctx, a).post(url.activites(p.id), { nom: 'Concurrente' }),
    );
    expect(bloque, 'la création doit attendre le verrou de la racine').toBe(true);
    expect(res.statusCode, res.body).toBe(422);
    expect(corps(res).code).toBe('parent_clos');
    const { rows } = await ctx.pool.query(
      'SELECT count(*)::int AS n FROM element WHERE projet_id = $1',
      [p.id],
    );
    expect(rows[0]).toEqual({ n: 0 });
  });
});
