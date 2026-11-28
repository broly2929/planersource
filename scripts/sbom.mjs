// SBOM CycloneDX des dépendances d'exécution (D-169).
// Usage : node scripts/sbom.mjs [--root <dossier>] [--check]
// Sans --check : écrit <root>/sbom.cdx.json. Avec --check : n'écrit rien, sortie 0 si le fichier
// est à jour, 1 sinon (écart nommé sur stderr).
// Codes de sortie (D-170 (2)) : 0 = fichier écrit, ou à jour avec --check ; 1 = fichier périmé ou
// absent avec --check ; 2 = erreur d'exécution (npm sbom échoue, ou npm introuvable).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { root: { type: 'string' }, check: { type: 'boolean', default: false } },
});
const root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const fichier = join(root, 'sbom.cdx.json');
const COMMANDE = 'npm run sbom';
const MAX_AFFICHES = 10;

/** Workspace d'outillage de test, hors SBOM (D-169 (2)). */
const estE2e = (ref) => ref.startsWith('@planersource/e2e@');
const estDeveloppement = (c) =>
  (c.properties ?? []).some((p) => p.name === 'cdx:npm:package:development' && p.value === 'true');

/** Génère le SBOM de l'arbre complet depuis le lock, sans node_modules (D-169 (2)). */
function genere() {
  const r = spawnSync('npm', ['sbom', '--sbom-format', 'cyclonedx', '--package-lock-only'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.error(`npm sbom a échoué (code ${r.status}) :\n${r.stderr}`);
    process.exit(2);
  }
  return JSON.parse(r.stdout);
}

/** Paquet interne : un workspace, dont le chemin n'est pas sous node_modules (D-272 (5)). */
const cheminDe = (c) => (c.properties ?? []).find((p) => p.name === 'cdx:npm:package:path')?.value;
const estInterne = (c) => {
  const chemin = cheminDe(c);
  return typeof chemin === 'string' && chemin !== '' && !chemin.split('/').includes('node_modules');
};

/**
 * Paquets internes à la version de la racine, avec fournisseur, dépôt (vcs) et propriété
 * `planersource:interne` (D-272 (5)). Les package.json des workspaces restent en 0.0.0.
 */
function marqueInternes(sbom, { version, depot }) {
  const renommes = new Map();
  for (const c of sbom.components.filter(estInterne)) {
    const ancien = c['bom-ref'];
    const nouveau = `${ancien.slice(0, ancien.lastIndexOf('@'))}@${version}`;
    renommes.set(ancien, nouveau);
    c['bom-ref'] = nouveau;
    c.version = version;
    if (typeof c.purl === 'string')
      c.purl = `${c.purl.slice(0, c.purl.lastIndexOf('@'))}@${version}`;
    c.supplier = { name: 'planersource' };
    if (depot) {
      c.externalReferences = [
        ...(c.externalReferences ?? []).filter((r) => r.type !== 'vcs'),
        { type: 'vcs', url: depot },
      ];
    }
    c.properties = [...(c.properties ?? []), { name: 'planersource:interne', value: 'true' }];
  }
  const ref = (r) => renommes.get(r) ?? r;
  sbom.dependencies = sbom.dependencies.map((d) =>
    d.dependsOn
      ? { ...d, ref: ref(d.ref), dependsOn: d.dependsOn.map(ref) }
      : { ...d, ref: ref(d.ref) },
  );
}

/** Retire l'outillage et les champs variables, trie (D-169 (2), (3)). */
function normalise(sbom) {
  const retires = new Set(
    sbom.components
      .filter((c) => estDeveloppement(c) || estE2e(c['bom-ref']))
      .map((c) => c['bom-ref']),
  );
  // npm sbom tire ce nom du dossier de la racine : on le remplace par celui de package.json (D-170 (1)).
  const { name, version, repository } = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  );
  sbom.metadata.component.name = name;
  const depot = typeof repository === 'string' ? repository : repository?.url;
  delete sbom.serialNumber;
  delete sbom.metadata.timestamp;
  delete sbom.metadata.tools;
  sbom.components = sbom.components.filter((c) => !retires.has(c['bom-ref']));
  sbom.dependencies = sbom.dependencies.filter((d) => !retires.has(d.ref));
  marqueInternes(sbom, { version, depot });
  sbom.components = sbom.components.sort((a, b) =>
    a['bom-ref'] < b['bom-ref'] ? -1 : a['bom-ref'] > b['bom-ref'] ? 1 : 0,
  );
  sbom.dependencies = sbom.dependencies
    .filter((d) => !retires.has(d.ref))
    .map((d) =>
      d.dependsOn ? { ...d, dependsOn: d.dependsOn.filter((r) => !retires.has(r)).sort() } : d,
    )
    .sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
  return `${JSON.stringify(sbom, null, 2)}\n`;
}

const attendu = normalise(genere());

if (!values.check) {
  writeFileSync(fichier, attendu);
  console.log(`${fichier} écrit.`);
  process.exit(0);
}

if (!existsSync(fichier)) {
  console.error(`sbom.cdx.json absent. Lancer : ${COMMANDE}`);
  process.exit(1);
}
const actuel = readFileSync(fichier, 'utf8');
if (actuel === attendu) {
  console.log('sbom.cdx.json à jour.');
  process.exit(0);
}

const refsDe = (texte) => {
  try {
    return new Set(JSON.parse(texte).components.map((c) => c['bom-ref']));
  } catch {
    return new Set();
  }
};
const avant = refsDe(actuel);
const apres = refsDe(attendu);
const aAjouter = [...apres].filter((r) => !avant.has(r));
const aRetirer = [...avant].filter((r) => !apres.has(r));
const liste = (xs) =>
  xs.slice(0, MAX_AFFICHES).join(', ') +
  (xs.length > MAX_AFFICHES ? ` … (+${xs.length - MAX_AFFICHES})` : '');
const lignes = ['sbom.cdx.json périmé.'];
if (aAjouter.length > 0) lignes.push(`Composants à ajouter : ${liste(aAjouter)}`);
if (aRetirer.length > 0) lignes.push(`Composants à retirer : ${liste(aRetirer)}`);
if (aAjouter.length === 0 && aRetirer.length === 0)
  lignes.push('Mêmes composants, contenu différent.');
lignes.push(`Lancer : ${COMMANDE}`);
console.error(lignes.join('\n'));
process.exit(1);
