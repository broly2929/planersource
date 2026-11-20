// Contrôle des licences (SPEC section 1, D-013).
// Usage : node scripts/check-licenses.mjs [--root <dossier>]
// Sortie 0 si tout est conforme, 1 sinon (paquets fautifs nommés sur stderr).
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const RUNTIME = ['MIT', 'Apache-2.0', 'BSD', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD'];
const DEV_EXTRA = ['BlueOak-1.0.0', 'CC0-1.0', 'Python-2.0', 'CC-BY-4.0', 'Unlicense', 'MPL-2.0'];

const { values } = parseArgs({ options: { root: { type: 'string' } } });
const root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** Dossiers des workspaces déclarés dans le package.json racine (globs `x/*` ou dossier simple). */
function workspaceDirs(rootPkg) {
  const dirs = [];
  for (const pattern of rootPkg.workspaces ?? []) {
    if (pattern.endsWith('/*')) {
      const base = join(root, pattern.slice(0, -2));
      if (!existsSync(base)) continue;
      for (const e of readdirSync(base, { withFileTypes: true })) {
        if (e.isDirectory() && existsSync(join(base, e.name, 'package.json'))) {
          dirs.push(join(base, e.name));
        }
      }
    } else if (existsSync(join(root, pattern, 'package.json'))) {
      dirs.push(join(root, pattern));
    }
  }
  return dirs;
}

/** Remonte l'arborescence pour trouver node_modules/<name>, comme la résolution de Node. */
function resolvePackage(name, fromDir) {
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate);
    if (dirname(dir) === dir) return null;
  }
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
    return pkg.licenses.map((l) => (typeof l === 'string' ? l : l.type)).join(' OR ');
  }
  return 'UNKNOWN';
}

/** Évalue une expression SPDX simple : OR, AND, parenthèses, suffixe + ignoré. */
function isAllowed(expression, allowed) {
  const tokens = expression
    .replace(/([()])/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean);
  let i = 0;
  const atom = () => {
    const t = tokens[i++];
    if (t === '(') {
      const v = or();
      i++; // ')'
      return v;
    }
    let ok = allowed.has((t ?? '').replace(/\+$/, '').toLowerCase());
    if (tokens[i]?.toUpperCase() === 'WITH') i += 2;
    return ok;
  };
  const and = () => {
    let v = atom();
    while (tokens[i]?.toUpperCase() === 'AND') {
      i++;
      const r = atom();
      v = v && r;
    }
    return v;
  };
  function or() {
    let v = and();
    while (tokens[i]?.toUpperCase() === 'OR') {
      i++;
      const r = and();
      v = v || r;
    }
    return v;
  }
  return or();
}

/** Parcourt les dépendances transitives de `roots` ; renvoie Map(dossier → paquet). */
function collect(roots, firstParty, seen) {
  const found = new Map();
  const queue = roots.map(([name, from]) => [name, from]);
  while (queue.length > 0) {
    const [name, from] = queue.shift();
    if (firstParty.has(name)) continue;
    const dir = resolvePackage(name, from);
    if (!dir || seen.has(dir) || found.has(dir)) continue;
    const pkg = readJson(join(dir, 'package.json'));
    found.set(dir, pkg);
    for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) {
      queue.push([dep, dir]);
    }
  }
  return found;
}

const rootPkg = readJson(join(root, 'package.json'));
const manifests = [
  [root, rootPkg],
  ...workspaceDirs(rootPkg).map((d) => [d, readJson(join(d, 'package.json'))]),
];
const firstParty = new Set(manifests.map(([, p]) => p.name).filter(Boolean));

const rootsOf = (field) =>
  manifests.flatMap(([dir, pkg]) => Object.keys(pkg[field] ?? {}).map((n) => [n, dir]));

const runtime = collect(rootsOf('dependencies'), firstParty, new Set());
const dev = collect(rootsOf('devDependencies'), firstParty, new Set(runtime.keys()));

const runtimeSet = new Set(RUNTIME.map((l) => l.toLowerCase()));
const devSet = new Set([...RUNTIME, ...DEV_EXTRA].map((l) => l.toLowerCase()));

const errors = [];
for (const [category, packages, allowed] of [
  ['exécution', runtime, runtimeSet],
  ['développement', dev, devSet],
]) {
  for (const pkg of packages.values()) {
    const license = licenseOf(pkg);
    if (!isAllowed(license, allowed)) {
      errors.push(`${pkg.name}@${pkg.version} : licence « ${license} » refusée (${category})`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Licences non conformes :\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(
  `Licences conformes : ${runtime.size} paquets d'exécution, ${dev.size} d'outillage de développement.`,
);
