import pg from 'pg';
import { expect } from 'vitest';
import { testDbUrl, type TestCtx } from './helpers.js';
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

export type Objet = Corps & { id: number };

/** Adresses de l'API de planning (lot 1, T2). */
export const url = {
  activites: (projetId: number) => `/api/projets/${projetId}/activites`,
  activite: (id: number) => `/api/activites/${id}`,
  jalons: (projetId: number) => `/api/projets/${projetId}/jalons`,
  jalon: (id: number) => `/api/jalons/${id}`,
  planning: (projetId: number) => `/api/projets/${projetId}/planning`,
  deplacer: (elementId: number) => `/api/elements/${elementId}/deplacer`,
  dependances: (projetId: number) => `/api/projets/${projetId}/dependances`,
  dependance: (id: number) => `/api/dependances/${id}`,
  assignationsActivite: (activiteId: number) => `/api/activites/${activiteId}/assignations`,
  assignationsProjet: (projetId: number) => `/api/projets/${projetId}/assignations`,
  assignation: (id: number) => `/api/assignations/${id}`,
  affectation: (id: number) => `/api/affectations/${id}`,
};

export interface Monde {
  admin: Acteur;
  /** Chef du projet `projet`. */
  chef: Acteur;
  /** Chef d'un autre projet (`autre`) : ne voit pas `projet`. */
  autreChef: Acteur;
  /** Ressources affectées à `projet` à 100 %. */
  alice: Acteur;
  bob: Acteur;
  projet: Objet;
  autre: Objet;
}

/** Jeu de données de SPEC 5.5 : projet P (début lundi 04/01/2027), Alice et Bob affectées. */
export async function creerMonde(ctx: TestCtx): Promise<Monde> {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const autreChef = await creerActeur(ctx, 'autre@example.test', 'chef_de_projet');
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
  const projet = await creerProjet(ctx, admin, { chef_id: chef.id });
  const autre = await creerProjet(ctx, admin, { chef_id: autreChef.id });
  await affecter(ctx, projet.id, alice.id);
  await affecter(ctx, projet.id, bob.id);
  return { admin, chef, autreChef, alice, bob, projet, autre };
}

let n = 0;

async function creer(
  ctx: TestCtx,
  par: Acteur,
  adresse: string,
  prefixe: string,
  champs: Corps,
): Promise<Objet> {
  n += 1;
  const res = await appel(ctx, par).post(adresse, { nom: `${prefixe} ${n}`, ...champs });
  expect(res.statusCode).toBe(201);
  return corps(res) as Objet;
}

/** Crée une activité par l'API (201 attendu). */
export const creerActivite = (ctx: TestCtx, par: Acteur, projetId: number, champs: Corps = {}) =>
  creer(ctx, par, url.activites(projetId), 'Activité', champs);

/** Crée un jalon par l'API (201 attendu). */
export const creerJalon = (ctx: TestCtx, par: Acteur, projetId: number, champs: Corps = {}) =>
  creer(ctx, par, url.jalons(projetId), 'Jalon', champs);

/** Crée une dépendance par l'API (201 attendu). */
export async function creerDependance(
  ctx: TestCtx,
  par: Acteur,
  projetId: number,
  predecesseurId: number,
  successeurId: number,
  champs: Corps = {},
): Promise<Objet> {
  const res = await appel(ctx, par).post(url.dependances(projetId), {
    predecesseur_id: predecesseurId,
    successeur_id: successeurId,
    ...champs,
  });
  expect(res.statusCode).toBe(201);
  return corps(res) as Objet;
}

/** Crée une assignation par l'API (201 attendu). */
export async function creerAssignation(
  ctx: TestCtx,
  par: Acteur,
  activiteId: number,
  ressourceId: number,
  champs: Corps = {},
): Promise<Objet> {
  const res = await appel(ctx, par).post(url.assignationsActivite(activiteId), {
    ressource_id: ressourceId,
    charge_assignee: 1,
    ...champs,
  });
  expect(res.statusCode).toBe(201);
  return corps(res) as Objet;
}

/** Éléments du projet dans l'ordre WBS (parcours en profondeur). */
export async function planning(ctx: TestCtx, par: Acteur, projetId: number): Promise<Objet[]> {
  const res = await appel(ctx, par).get(url.planning(projetId));
  expect(res.statusCode).toBe(200);
  return liste(res) as Objet[];
}

export interface Requete {
  methode: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  adresse: string;
  corps?: Corps;
}

/**
 * Laisse finir les écritures éventuellement encore en cours après l'envoi d'une réponse (un refus
 * suivi d'une écriture tardive serait sinon lu trop tôt) : courte pause, puis attente qu'aucune
 * autre connexion de la base de test ne soit active.
 */
export async function attendreRepos(ctx: TestCtx): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  for (let i = 0; i < 40; i += 1) {
    const { rows } = await ctx.pool.query(
      `SELECT 1 FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'active'`,
    );
    if (rows.length === 0) return;
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** État complet du projet lu par l'administrateur (planning, listes, affectations). */
export async function etatProjet(ctx: TestCtx, admin: Acteur, projetId: number) {
  await attendreRepos(ctx);
  const lire = async (adresse: string) => {
    const res = await appel(ctx, admin).get(adresse);
    expect(res.statusCode, `GET ${adresse}`).toBe(200);
    return res.json() as unknown;
  };
  return {
    planning: await lire(url.planning(projetId)),
    activites: await lire(url.activites(projetId)),
    jalons: await lire(url.jalons(projetId)),
    dependances: await lire(url.dependances(projetId)),
    assignations: await lire(url.assignationsProjet(projetId)),
    affectations: await lire(`/api/projets/${projetId}/affectations`),
  };
}

/**
 * Chaque requête d'écriture : sans session → 401, chef d'un autre projet → 404 (projet invisible),
 * ressource affectée → 403 (projet visible, rôle insuffisant). Après chaque refus, l'état du projet
 * lu par l'administrateur est strictement égal à l'état d'avant (SPEC §2 : un refus ne modifie rien).
 */
export async function verifierRefus(ctx: TestCtx, m: Monde, requetes: Requete[]): Promise<void> {
  for (const r of requetes) {
    const envoi = (acteur?: Acteur) =>
      ctx.app.inject({
        method: r.methode,
        url: r.adresse,
        ...(r.corps ? { payload: r.corps } : {}),
        headers: acteur ? { cookie: acteur.cookie } : {},
      });
    const nom = `${r.methode} ${r.adresse}`;
    const attendus: [string, Acteur | undefined, number][] = [
      ['sans session', undefined, 401],
      ["chef d'un autre projet", m.autreChef, 404],
      // Révision 6b (D-031, D-148 (2)) : la ressource affectée ne voit plus le projet → 404.
      ['ressource affectée', m.alice, 404],
    ];
    for (const [qui, acteur, statut] of attendus) {
      const avant = await etatProjet(ctx, m.admin, m.projet.id);
      expect((await envoi(acteur)).statusCode, `${nom} ${qui}`).toBe(statut);
      expect(await etatProjet(ctx, m.admin, m.projet.id), `${nom} ${qui} : état modifié`).toEqual(
        avant,
      );
    }
  }
}

export async function compter(ctx: TestCtx, table: string): Promise<number> {
  const { rows } = await ctx.pool.query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(rows[0]!.n);
}

export interface Ordre {
  sql: string;
  params: unknown[];
}

/**
 * Concurrence à ordre forcé, sur deux connexions et deux transactions explicites :
 * 1. le premier ordre est exécuté et son verrou est tenu (transaction ouverte) ;
 * 2. la seconde est lancée ; on attend que PostgreSQL la déclare bloquée sur un verrou ;
 * 3. la première est validée ; la seconde reprend, son résultat est renvoyé.
 * Un échec de la seconde est un résultat attendu ; la seconde transaction est toujours annulée.
 */
export async function concurrenceForcee(
  ctx: TestCtx,
  premier: Ordre,
  second: Ordre,
): Promise<{ ok: boolean; code?: string | undefined }> {
  const c1 = new pg.Client({ connectionString: testDbUrl() });
  const c2 = new pg.Client({ connectionString: testDbUrl() });
  await c1.connect();
  await c2.connect();
  try {
    await c1.query('BEGIN');
    await c2.query('BEGIN');
    const pid2 = Number(
      ((await c2.query('SELECT pg_backend_pid() AS pid')).rows[0] as { pid: number }).pid,
    );
    await c1.query(premier.sql, premier.params);
    let termine = false;
    const attente = c2.query(second.sql, second.params).then(
      () => ({ ok: true }) as { ok: boolean; code?: string | undefined },
      (err: { code?: string }) => ({ ok: false, code: err.code }),
    );
    void attente.then(() => {
      termine = true;
    });
    let bloque = false;
    for (let i = 0; i < 100 && !bloque && !termine; i += 1) {
      const { rows } = await ctx.pool.query<{ wait_event_type: string | null }>(
        'SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1',
        [pid2],
      );
      bloque = rows[0]?.wait_event_type === 'Lock';
      if (!bloque) await new Promise((r) => setTimeout(r, 50));
    }
    expect(bloque, 'le second ordre doit attendre le verrou du premier').toBe(true);
    await c1.query('COMMIT');
    const resultat = await attente;
    await c2.query('ROLLBACK');
    return resultat;
  } finally {
    await c1.end();
    await c2.end();
  }
}
