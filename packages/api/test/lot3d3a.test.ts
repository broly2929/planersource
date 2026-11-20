// Lot 3d-3a, gestes à la souris (D-094) : ACT-32 à ACT-35, JLN-17, LIEN-20, ASS-21.
// Rouges attendus : ACT-33, ACT-34 (code `dates_incoherentes` absent).
// Caractérisation (verts d'emblée) : ACT-32, JLN-17, LIEN-20, ASS-21 (404 sous verrou, f5ffc5f), ACT-35.
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { testDbUrl, useTestApp } from './helpers.js';
import { appel } from './lot1-helpers.js';
import {
  attendreRepos,
  creerActivite,
  creerAssignation,
  creerDependance,
  creerJalon,
  creerMonde,
  url,
  type Monde,
} from './lot1-t2-helpers.js';

const ctx = useTestApp();

type Requeteur = Pick<pg.Pool, 'query'>;

/** Contenu de toutes les tables sauf `session` et `schema_version`, trié (historique compris). */
async function empreinte(q: Requeteur = ctx.pool): Promise<Record<string, string[]>> {
  const { rows: tables } = await q.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT IN ('session', 'schema_version')
      ORDER BY tablename`,
  );
  const resultat: Record<string, string[]> = {};
  for (const { tablename } of tables) {
    const { rows } = await q.query<{ ligne: string }>(
      `SELECT t::text AS ligne FROM "${tablename}" t ORDER BY 1`,
    );
    resultat[tablename] = rows.map((r) => r.ligne);
  }
  return resultat;
}

async function modificationsEnBase(): Promise<number> {
  const { rows } = await ctx.pool.query<{ n: string }>(
    `SELECT count(*) AS n FROM historique WHERE operation = 'modification'`,
  );
  return Number(rows[0]!.n);
}

/**
 * Ligne supprimée entre l'accès et le verrou : une seconde connexion ouvre BEGIN puis DELETE ; le PATCH
 * est lancé ; sondage borné (5 s) de `pg_stat_activity` jusqu'à ce qu'une session attende un verrou
 * (`wait_event_type = 'Lock'`) ; COMMIT. Attendu : 404, aucune ligne d'historique de modification, base
 * identique à l'état après la suppression (relevé dans la transaction de suppression, puis annulée
 * sur une troisième connexion).
 */
async function patchSousSuppression(
  suppression: string,
  id: number,
  envoyer: () => ReturnType<ReturnType<typeof appel>['patch']>,
): Promise<void> {
  await attendreRepos(ctx);
  const modificationsAvant = await modificationsEnBase();

  // État attendu après la suppression : relevé dans une transaction annulée.
  const ref = new pg.Client({ connectionString: testDbUrl() });
  await ref.connect();
  let attendu: Record<string, string[]>;
  try {
    await ref.query('BEGIN');
    await ref.query(suppression, [id]);
    attendu = await empreinte(ref);
    await ref.query('ROLLBACK');
  } finally {
    await ref.end();
  }

  const c = new pg.Client({ connectionString: testDbUrl() });
  await c.connect();
  try {
    await c.query('BEGIN');
    const supprime = await c.query(suppression, [id]);
    expect(supprime.rowCount, `ligne ${id} supprimée`).toBeGreaterThanOrEqual(1);
    const pid = Number(
      ((await c.query('SELECT pg_backend_pid() AS pid')).rows[0] as { pid: number }).pid,
    );
    const reponse = envoyer();
    void reponse.catch(() => undefined);
    let enAttente = 0;
    const limite = Date.now() + 5000;
    while (enAttente < 1 && Date.now() < limite) {
      const { rows } = await ctx.pool.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> $1 AND wait_event_type = 'Lock'`,
        [pid],
      );
      enAttente = Number(rows[0]!.n);
      if (enAttente < 1) await new Promise((r) => setTimeout(r, 20));
    }
    expect(enAttente, 'PATCH en attente du verrou de la connexion du test').toBe(1);
    await c.query('COMMIT');
    const res = await reponse;
    expect(res.statusCode, res.body).toBe(404);
  } finally {
    await c.end();
  }
  await attendreRepos(ctx);
  expect(await modificationsEnBase()).toBe(modificationsAvant);
  expect(await empreinte()).toEqual(attendu);
}

describe('3d-3a, 404 quand la ligne est supprimée entre l’accès et le verrou (D-094 (11))', () => {
  it('ACT-32 : caractérisation, activité supprimée sous un PATCH → 404', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, {
      mode: 'START',
      debut_valide: '2027-01-04',
    });
    await patchSousSuppression('DELETE FROM element WHERE id = $1', a.id, () =>
      appel(ctx, m.chef).patch(url.activite(a.id), { debut_valide: '2027-01-11' }),
    );
  });

  it('JLN-17 : caractérisation, jalon supprimé sous un PATCH → 404', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    await patchSousSuppression('DELETE FROM element WHERE id = $1', j.id, () =>
      appel(ctx, m.chef).patch(url.jalon(j.id), { date_validee: '2027-01-15' }),
    );
  });

  it('LIEN-20 : caractérisation, dépendance supprimée sous un PATCH → 404', async () => {
    const m = await creerMonde(ctx);
    const x = await creerActivite(ctx, m.chef, m.projet.id);
    const y = await creerActivite(ctx, m.chef, m.projet.id);
    const d = await creerDependance(ctx, m.chef, m.projet.id, x.id, y.id, { type: 'FD', delai: 0 });
    await patchSousSuppression('DELETE FROM dependance WHERE id = $1', d.id, () =>
      appel(ctx, m.chef).patch(url.dependance(d.id), { delai: 2 }),
    );
  });

  it('ASS-21 : caractérisation, assignation supprimée sous un PATCH → 404', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const s = await creerAssignation(ctx, m.chef, a.id, m.alice.id, {
      taux: 100,
      charge_assignee: 3,
    });
    await patchSousSuppression('DELETE FROM assignation WHERE id = $1', s.id, () =>
      appel(ctx, m.chef).patch(url.assignation(s.id), { taux: 50 }),
    );
  });
});

describe('3d-3a, code dates_incoherentes (D-094 (5))', () => {
  const corpsAttendu = { erreur: 'Règle de planning non respectée', code: 'dates_incoherentes' };

  async function refuse(m: Monde, id: number, corps: Record<string, unknown>) {
    await attendreRepos(ctx);
    const avant = await empreinte();
    const res = await appel(ctx, m.chef).patch(url.activite(id), corps);
    return { res, avant };
  }

  it('ACT-33 : START, début validé après la fin validée restante → 422 dates_incoherentes, base inchangée', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, {
      mode: 'START',
      debut_valide: '2027-01-11',
      fin_valide: '2027-01-15',
    });
    const { res, avant } = await refuse(m, a.id, { debut_valide: '2027-01-20' });
    expect(res.statusCode, res.body).toBe(422);
    expect(res.json()).toEqual(corpsAttendu);
    await attendreRepos(ctx);
    const apres = await empreinte();
    expect(apres['historique']).toEqual(avant['historique']);
    expect(apres).toEqual(avant);
  });

  it('ACT-34 : REGUL, fin antérieure au début → 422 dates_incoherentes, base inchangée', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, {
      mode: 'REGUL',
      debut_valide: '2027-01-04',
      fin_valide: '2027-01-15',
    });
    const { res, avant } = await refuse(m, a.id, {
      debut_valide: '2027-01-18',
      fin_valide: '2027-01-11',
    });
    expect(res.statusCode, res.body).toBe(422);
    expect(res.json()).toEqual(corpsAttendu);
    await attendreRepos(ctx);
    expect(await empreinte()).toEqual(avant);
  });

  it('ACT-35 : caractérisation, REGUL sur un START sans fin validée (activite_fin_requise) → 422 sans code', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, {
      mode: 'START',
      debut_valide: '2027-01-04',
    });
    const { res, avant } = await refuse(m, a.id, { mode: 'REGUL' });
    expect(res.statusCode, res.body).toBe(422);
    expect(res.json()).not.toHaveProperty('code');
    await attendreRepos(ctx);
    expect(await empreinte()).toEqual(avant);
  });
});
