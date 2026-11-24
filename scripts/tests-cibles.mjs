// Passes ciblées pendant le développement (D-194 (1)).
// Usage : node scripts/tests-cibles.mjs [--depuis <commit>] [--domaine <nom>]... [--lister]
// e2e : specs modifiées depuis <commit> (`playwright --only-changed`) et specs des domaines de
// e2e/domaines.json, sans doublon, avec leur raison. vitest : `--changed <commit>`, seulement avec --depuis.
// N'écrit jamais dans docs/journal-suites.jsonl : ce n'est pas une suite complète.
// Codes : 0 = vert ou --lister, 1 = test rouge, domaine inconnu ou garde-fou, 2 = usage.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { exigerBaseTest, GardeBaseTestError } from './lib/garde-base-test.mjs';
import {
  chargerDomaines,
  construireCommandes,
  DomaineInconnu,
  lireListeVitest,
  selectionnerE2e,
  specsChangeesPlaywright,
} from './lib/tests-cibles.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'Usage : npm run tests-cibles -- [--depuis <commit>] [--domaine <nom>]... [--lister]';

let values;
try {
  ({ values } = parseArgs({
    options: {
      depuis: { type: 'string' },
      domaine: { type: 'string', multiple: true, default: [] },
      lister: { type: 'boolean', default: false },
    },
  }));
} catch (e) {
  console.error(`tests-cibles : ${e.message}\n${USAGE}`);
  process.exit(2);
}
const { depuis, domaine: domaines, lister } = values;
if (depuis === undefined && domaines.length === 0) {
  console.error(`tests-cibles : --depuis ou --domaine est requis.\n${USAGE}`);
  process.exit(2);
}

const envRacine = join(racine, '.env');
if (existsSync(envRacine)) process.loadEnvFile(envRacine); // une variable déjà définie garde sa valeur
try {
  exigerBaseTest(process.env);
} catch (e) {
  if (!(e instanceof GardeBaseTestError)) throw e;
  console.error(e.message);
  process.exit(1);
}

let selection;
try {
  const definitions = chargerDomaines(join(racine, 'e2e', 'domaines.json'));
  selectionnerE2e({ domaines, definitions }); // domaine inconnu : échec avant tout lancement
  const specsChangees =
    depuis === undefined ? [] : specsChangeesPlaywright({ depuis, racineE2e: join(racine, 'e2e') });
  selection = selectionnerE2e({ depuis, domaines, definitions, specsChangees });
} catch (e) {
  if (e instanceof DomaineInconnu) {
    console.error(e.message);
    process.exit(1);
  }
  console.error(`tests-cibles : ${e.message}`);
  process.exit(1);
}

console.log(`e2e : ${selection.length} spec(s)`);
for (const s of selection) console.log(`  ${s.spec} : ${s.raisons.join(' ; ')}`);
if (depuis !== undefined) {
  if (lister) {
    const v = spawnSync('npx', ['vitest', 'list', '--changed', depuis, '--filesOnly'], {
      cwd: racine,
      encoding: 'utf8',
    });
    const fichiersVitest = lireListeVitest(v.stdout ?? '');
    console.log(
      `vitest : ${fichiersVitest.length} fichier(s), modifiés ou touchés par un changement depuis ${depuis}`,
    );
    for (const f of fichiersVitest) console.log(`  ${f}`);
  } else {
    console.log(`vitest : fichiers modifiés ou touchés par un changement depuis ${depuis}`);
  }
}
if (lister) process.exit(0);

const commandes = construireCommandes({ selection, depuis, racine });
if (commandes.length === 0) {
  console.log('Aucun test à lancer.');
  process.exit(0);
}
let code = 0;
for (const c of commandes) {
  const r = spawnSync(c.commande, c.args, { cwd: c.cwd, stdio: 'inherit', env: process.env });
  if (r.status !== 0) code = 1;
}
process.exit(code);
