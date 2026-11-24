// Base par worker de vitest (D-196). Base de maintenance = base de l'URL de test : seule base à
// laquelle la préparation se connecte pour créer ou supprimer les autres. Chaque nom dérivé repasse
// par le garde-fou (D-193) avant toute connexion.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { verifierBaseTest } from './garde-base-test.mjs';

/** Version du mécanisme, comprise dans l'empreinte du modèle. */
export const VERSION_MECANISME = '1';
const LONGUEUR_MAX = 63; // octets ; PostgreSQL tronquerait au-delà, suffixe _test compris
const NOM_VALIDE = /^[a-z0-9_]+$/;
const VERROU = 196_001; // clé du verrou consultatif (D-196)

function nomDeBase(url) {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

function urlDeBase(url, nom) {
  const u = new URL(url);
  u.pathname = `/${nom}`;
  return u.toString();
}

function controlerNom(nom) {
  if (!NOM_VALIDE.test(nom)) {
    throw new Error(`Base par worker : nom « ${nom} » hors [a-z0-9_] (D-196 (1)).`);
  }
  if (Buffer.byteLength(nom) > LONGUEUR_MAX) {
    throw new Error(
      `Base par worker : nom « ${nom} » de plus de ${LONGUEUR_MAX} octets (D-196 (1)).`,
    );
  }
}

function base(url, nom) {
  controlerNom(nom);
  const u = urlDeBase(url, nom);
  verifierBaseTest(u, `base dérivée ${nom}`);
  return { nom, url: u };
}

/** Noms et URL du modèle et, si `worker` est fourni, de la base du worker. */
export function nomsBases(urlMaintenance, opts = {}) {
  const maintenance = nomDeBase(verifierBaseTest(urlMaintenance));
  controlerNom(maintenance);
  const famille = opts.famille ?? 'vitest';
  const prefixe = `${maintenance.slice(0, -'_test'.length)}_${famille}`;
  const r = { modele: base(urlMaintenance, `${prefixe}_modele_test`) };
  if ('worker' in opts) {
    const w = opts.worker;
    if (typeof w !== 'string' || !/^[1-9]\d*$/.test(w)) {
      throw new Error(`Base par worker : identifiant de worker invalide (« ${w} »), D-196 (1).`);
    }
    r.worker = base(urlMaintenance, `${prefixe}_w${w}_test`);
  }
  return r;
}

/** sha256 des noms et contenus des fichiers .sql du dossier, triés, et de la version du mécanisme. */
export function empreinte(dossier) {
  const h = createHash('sha256').update(`mecanisme:${VERSION_MECANISME}\n`);
  for (const f of readdirSync(dossier)
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    const contenu = readFileSync(join(dossier, f));
    h.update(`${f}\n${contenu.length}\n`).update(contenu);
  }
  return h.digest('hex');
}

async function connecterParDefaut(url) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  return c;
}

/** Ouvre la base de maintenance, prend le verrou, exécute `f`, rend le verrou. */
async function sousVerrou(urlMaintenance, opts, f) {
  const connecter = opts.connecter ?? connecterParDefaut;
  const c = await connecter(verifierBaseTest(urlMaintenance));
  try {
    await c.query('SELECT pg_advisory_lock($1)', [VERROU]);
    return await f(c);
  } finally {
    await c.end();
  }
}

async function existe(c, nom) {
  const r = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [nom]);
  return r.rowCount > 0;
}

/** Construit le modèle si son empreinte est absente ou différente ; sinon le réutilise. */
export async function preparerModele(urlMaintenance, opts) {
  const { modele } = nomsBases(urlMaintenance, { famille: opts.famille });
  const attendu = `empreinte:${opts.empreinte}`;
  return sousVerrou(urlMaintenance, opts, async (c) => {
    const r = await c.query(
      "SELECT shobj_description(oid, 'pg_database') AS e FROM pg_database WHERE datname = $1",
      [modele.nom],
    );
    if (r.rows[0]?.e === attendu) return 'reutilise';
    await c.query(`DROP DATABASE IF EXISTS ${modele.nom} WITH (FORCE)`);
    await c.query(`CREATE DATABASE ${modele.nom} TEMPLATE template0`);
    await opts.migrer(modele.url);
    await c.query(`COMMENT ON DATABASE ${modele.nom} IS ${pg.escapeLiteral(attendu)}`);
    return 'construit';
  });
}

/**
 * Crée la base du worker depuis le modèle si elle n'existe pas ; renvoie son URL.
 * `familleModele` : modèle d'une autre famille (e2e clonées du modèle de vitest, D-199 (1)) ;
 * `neuve` : base supprimée puis recréée.
 */
export async function creerBaseWorker(urlMaintenance, opts) {
  const { worker } = nomsBases(urlMaintenance, { famille: opts.famille, worker: opts.worker });
  const { modele } = nomsBases(urlMaintenance, { famille: opts.familleModele ?? opts.famille });
  return sousVerrou(urlMaintenance, opts, async (c) => {
    if (opts.neuve) await c.query(`DROP DATABASE IF EXISTS ${worker.nom} WITH (FORCE)`);
    if (!(await existe(c, worker.nom))) {
      await c.query(`CREATE DATABASE ${worker.nom} TEMPLATE ${modele.nom}`);
    }
    return worker.url;
  });
}

/** Supprime toutes les bases de worker de la famille ; garde le modèle. Renvoie les noms supprimés. */
export async function nettoyerBasesWorker(urlMaintenance, opts = {}) {
  const { modele } = nomsBases(urlMaintenance, { famille: opts.famille });
  const prefixe = modele.nom.slice(0, -'_modele_test'.length);
  const motif = `${prefixe.replaceAll('_', '\\_')}\\_w%\\_test`;
  return sousVerrou(urlMaintenance, opts, async (c) => {
    const r = await c.query('SELECT datname FROM pg_database WHERE datname LIKE $1 ORDER BY 1', [
      motif,
    ]);
    const supprimees = [];
    for (const { datname } of r.rows) {
      const n = /_w([1-9]\d*)_test$/.exec(datname)?.[1];
      if (!n) continue;
      // Nom recalculé et revérifié : seule une base de worker exacte de la famille est supprimée.
      const { worker } = nomsBases(urlMaintenance, { famille: opts.famille, worker: n });
      if (worker.nom !== datname) continue;
      await c.query(`DROP DATABASE IF EXISTS ${worker.nom} WITH (FORCE)`);
      supprimees.push(worker.nom);
    }
    return supprimees;
  });
}
