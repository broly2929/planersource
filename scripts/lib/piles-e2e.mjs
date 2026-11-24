// e2e en parallèle, une pile par worker (D-199) : base clonée du modèle de vitest (D-196), API et front
// sur des ports dérivés de l'index du worker, registre des processus pour le nettoyage, y compris
// après un arrêt brutal. Chaque nom de base dérivé repasse par le garde-fou (D-193).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname } from 'node:path';
import { creerBaseWorker, nettoyerBasesWorker, nomsBases } from './bases-worker.mjs';

export const PORT_API_BASE = 3300;
export const PORT_WEB_BASE = 5300;
/** Variable d'environnement posée sur chaque processus de pile ; valeur : chemin du registre. */
export const MARQUEUR = 'PLANERSOURCE_PILE_E2E';

function numero(n) {
  const v = typeof n === 'string' && /^\d+$/.test(n) ? Number(n) : n;
  if (!Number.isInteger(v) || v < 1) {
    throw new Error(
      `Pile e2e : numéro de worker invalide (« ${n} »), entier positif attendu (D-199 (1)).`,
    );
  }
  return v;
}

/** Base, modèle et ports de la pile du worker `n` (1, 2, …). */
export function pileDuWorker(urlMaintenance, n, opts = {}) {
  const v = numero(n);
  const famille = opts.famille ?? 'e2e';
  const { worker } = nomsBases(urlMaintenance, { famille, worker: String(v) });
  const { modele } = nomsBases(urlMaintenance, { famille: opts.familleModele ?? 'vitest' });
  const portApi = (opts.portApi ?? PORT_API_BASE) + v;
  const portWeb = (opts.portWeb ?? PORT_WEB_BASE) + v;
  return {
    n: v,
    base: worker,
    modele,
    portApi,
    portWeb,
    urlApi: `http://localhost:${portApi}`,
    urlWeb: `http://localhost:${portWeb}`,
  };
}

/** Supprime puis recrée la base du worker depuis le modèle ; renvoie son URL. */
export function recreerBaseWorker(
  urlMaintenance,
  { n, famille = 'e2e', familleModele = 'vitest' },
) {
  return creerBaseWorker(urlMaintenance, {
    famille,
    familleModele,
    worker: String(numero(n)),
    neuve: true,
  });
}

/** Heure de démarrage du processus (champ 22 de /proc/<pid>/stat), ou null s'il n'existe pas. */
export function debutProcessus(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] ?? null;
  } catch {
    return null;
  }
}

export function lireRegistre(chemin) {
  if (!existsSync(chemin)) return null;
  return JSON.parse(readFileSync(chemin, 'utf8'));
}

export function ecrireRegistre(chemin, registre) {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, `${JSON.stringify(registre, null, 2)}\n`);
}

function lanceurVivant(lanceur) {
  if (!lanceur || lanceur.pid === process.pid) return false;
  const debut = debutProcessus(lanceur.pid);
  return debut !== null && debut === lanceur.debut;
}

/** Processus du groupe `pgid` qui portent le marqueur de ce registre. */
function membresMarques(pgid, registre) {
  const attendu = `${MARQUEUR}=${registre}`;
  const pids = [];
  for (const d of readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try {
      const stat = readFileSync(`/proc/${d}/stat`, 'utf8');
      const groupe = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[2]);
      if (groupe !== pgid) continue;
      if (readFileSync(`/proc/${d}/environ`, 'utf8').split('\0').includes(attendu)) {
        pids.push(Number(d));
      }
    } catch {
      // processus disparu ou illisible : ignoré
    }
  }
  return pids;
}

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function arreterGroupe(pgid, registre) {
  if (membresMarques(pgid, registre).length === 0) return false;
  try {
    process.kill(-pgid, 'SIGTERM');
  } catch {
    return false;
  }
  for (let i = 0; i < 50 && membresMarques(pgid, registre).length > 0; i++) await pause(100);
  if (membresMarques(pgid, registre).length > 0) {
    try {
      process.kill(-pgid, 'SIGKILL');
    } catch {
      // déjà arrêté
    }
    for (let i = 0; i < 20 && membresMarques(pgid, registre).length > 0; i++) await pause(100);
  }
  return true;
}

/** Vrai si une connexion TCP sur localhost:port aboutit. */
export function portOccupe(port) {
  return new Promise((ok) => {
    const s = connect({ port, host: 'localhost', autoSelectFamily: true });
    s.once('connect', () => {
      s.destroy();
      ok(true);
    });
    s.once('error', () => ok(false));
  });
}

/** Attend que le port réponde, ou lève une erreur après `delaiMs`. */
export async function attendrePort(port, delaiMs) {
  const fin = Date.now() + delaiMs;
  while (Date.now() < fin) {
    if (await portOccupe(port)) return;
    await pause(100);
  }
  throw new Error(`Pile e2e : le port ${port} ne répond pas après ${delaiMs} ms.`);
}

/** Arrête les groupes marqués du registre, supprime les bases de la famille, efface le registre. */
export async function arreterPiles({
  registre,
  urlMaintenance,
  famille = 'e2e',
  proprietaire = false,
}) {
  const r = lireRegistre(registre);
  // Mode propriétaire (D-199 (14)) : teardown ou arrêt sur échec, rien si le registre est à un autre lanceur.
  if (proprietaire && r && r.lanceur?.pid !== process.pid) return { arretes: [], bases: [] };
  const arretes = [];
  for (const p of r?.processus ?? []) {
    if (await arreterGroupe(p.pgid, registre)) arretes.push(p.pgid);
  }
  const bases = await nettoyerBasesWorker(urlMaintenance, { famille });
  rmSync(registre, { force: true });
  return { arretes, bases };
}

/**
 * Nettoyage du démarrage (D-199 (6)) : refus si le lanceur du registre vit encore ; sinon arrêt des
 * restes d'une exécution précédente, bases supprimées, registre effacé ; puis contrôle des ports.
 */
export async function nettoyerPiles({ registre, urlMaintenance, famille = 'e2e', ports = [] }) {
  const r = lireRegistre(registre);
  if (r && lanceurVivant(r.lanceur)) {
    throw new Error(
      `Pile e2e : une exécution e2e est déjà en cours (lanceur pid ${r.lanceur.pid}, registre ${registre}). ` +
        'Une seule exécution à la fois (D-179, D-199 (6)).',
    );
  }
  const resultat = await arreterPiles({ registre, urlMaintenance, famille });
  for (const port of ports) {
    if (await portOccupe(port)) {
      throw new Error(
        `Pile e2e : le port ${port} est occupé par un processus qui n'est pas une pile de ce registre ; ` +
          'libérer le port puis relancer (D-199 (6)).',
      );
    }
  }
  return resultat;
}

/**
 * Réserve le registre pour le lanceur courant (D-199 (14)) : création exclusive, avant toute préparation.
 * Un registre déjà présent (exécution concurrente) est un refus.
 */
export function reserverRegistre(registre) {
  mkdirSync(dirname(registre), { recursive: true });
  const contenu = {
    lanceur: { pid: process.pid, debut: debutProcessus(process.pid) },
    processus: [],
  };
  try {
    writeFileSync(registre, `${JSON.stringify(contenu, null, 2)}\n`, { flag: 'wx' });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const autre = lireRegistre(registre)?.lanceur?.pid;
    throw new Error(
      `Pile e2e : le registre ${registre} est déjà réservé (lanceur pid ${autre}) ; une seule exécution e2e à la fois (D-199 (14)).`,
    );
  }
}

/** Lance un processus détaché (groupe propre), marqué, et l'inscrit au registre avant de rendre la main. */
export function lancerProcessus({ registre, nom, port, commande, args, cwd, env }) {
  const r = lireRegistre(registre) ?? {
    lanceur: { pid: process.pid, debut: debutProcessus(process.pid) },
    processus: [],
  };
  const enfant = spawn(commande, args, {
    cwd,
    env: { ...env, [MARQUEUR]: registre },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let sortie = '';
  const garder = (b) => {
    sortie = (sortie + b.toString()).slice(-4000);
  };
  enfant.stdout.on('data', garder);
  enfant.stderr.on('data', garder);
  enfant.sortie = () => sortie;
  r.processus.push({ nom, pgid: enfant.pid, port });
  ecrireRegistre(registre, r);
  return enfant;
}
