// Sélection des tests pendant le développement (D-194 (1)). Fonctions pures, sauf
// `specsChangeesPlaywright` (lance `playwright test --list --only-changed`).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// Le CLI de Playwright est lancé directement : `npx` se replace à la racine du paquet npm le plus proche.
const cliPlaywright = createRequire(import.meta.url).resolve('@playwright/test/cli');

export class DomaineInconnu extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomaineInconnu';
  }
}

export function chargerDomaines(chemin) {
  return JSON.parse(readFileSync(chemin, 'utf8'));
}

const comparer = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Union sans doublon, triée par nom de spec ; DomaineInconnu si un domaine demandé n'existe pas. */
export function selectionnerE2e({ depuis, domaines = [], definitions, specsChangees = [] }) {
  const inconnus = domaines.filter((d) => !Object.hasOwn(definitions, d));
  if (inconnus.length > 0) {
    throw new DomaineInconnu(
      `Domaine inconnu : ${inconnus.join(', ')}. Domaines connus : ${Object.keys(definitions).sort().join(', ')}.`,
    );
  }
  const retenues = new Map();
  const ajouter = (spec, raison) => {
    const raisons = retenues.get(spec) ?? [];
    if (!raisons.includes(raison)) raisons.push(raison);
    retenues.set(spec, raisons);
  };
  if (depuis) for (const spec of specsChangees) ajouter(spec, `modifiée depuis ${depuis}`);
  for (const domaine of domaines) {
    for (const spec of definitions[domaine]) ajouter(spec, `domaine ${domaine}`);
  }
  return [...retenues.entries()]
    .sort(([a], [b]) => comparer(a, b))
    .map(([spec, raisons]) => ({ spec, raisons }));
}

export function construireCommandes({ selection, depuis, racine }) {
  const commandes = [];
  if (depuis) {
    commandes.push({ commande: 'npx', args: ['vitest', 'run', '--changed', depuis], cwd: racine });
  }
  if (selection.length > 0) {
    commandes.push({
      commande: 'npx',
      args: ['playwright', 'test', ...selection.map((s) => `tests/${s.spec}`)],
      cwd: join(racine, 'e2e'),
    });
  }
  return commandes;
}

/** Lit la sortie de `vitest list --filesOnly` : « [projet] chemin » donne les chemins. */
export function lireListeVitest(sortie) {
  return sortie
    .split('\n')
    .map((l) => /^\[[^\]]+\]\s+(\S.*)$/.exec(l.trimEnd())?.[1])
    .filter((chemin) => chemin !== undefined);
}

function fichiers(suites, trouves = new Set()) {
  for (const s of suites ?? []) {
    if (s.file) trouves.add(s.file);
    fichiers(s.suites, trouves);
  }
  return trouves;
}

/** Specs (noms relatifs au dossier des tests) que `--only-changed=<depuis>` retient. */
export function specsChangeesPlaywright({ depuis, racineE2e }) {
  const r = spawnSync(
    process.execPath,
    [cliPlaywright, 'test', '--list', `--only-changed=${depuis}`, '--reporter=json'],
    { cwd: racineE2e, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  let rapport;
  try {
    rapport = JSON.parse(r.stdout);
  } catch {
    throw new Error(`playwright --list --only-changed=${depuis} : ${r.stderr || r.stdout}`.trim());
  }
  const erreurs = (rapport.errors ?? [])
    .map((e) => e.message ?? '')
    .filter((m) => !/No tests found/.test(m));
  if (erreurs.length > 0)
    throw new Error(`playwright --list --only-changed=${depuis} : ${erreurs[0]}`);
  return [...fichiers(rapport.suites)].sort(comparer);
}
