// Mise en place du dépôt (D-198 (2)) : pose core.hooksPath sur `.githooks`, dossier suivi par git.
// Usage : npm run setup-depot. Hors d'un dépôt git (image Docker), ne fait rien et rend 0.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => spawnSync('git', ['-C', racine, ...args], { encoding: 'utf8' });

const dedans = git('rev-parse', '--is-inside-work-tree');
if (dedans.status !== 0 || dedans.stdout.trim() !== 'true') {
  console.log('setup-depot : hors d’un dépôt git, rien à faire.');
  process.exit(0);
}
const r = git('config', 'core.hooksPath', '.githooks');
if (r.status !== 0) {
  console.error(`setup-depot : git config a échoué\n${r.stderr}`);
  process.exit(1);
}
console.log('setup-depot : core.hooksPath = .githooks (hook commit-msg, D-198 (2)).');
