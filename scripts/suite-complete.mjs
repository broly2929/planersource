// Point d'entrée unique de la suite complète, vitest puis e2e (D-193 (4)).
// Usage : node scripts/suite-complete.mjs --lot <nom> [--justification "<texte>"]
//         node scripts/suite-complete.mjs --lister <lot>
// Codes : 0 = suite verte (ou lister), 1 = suite rouge, refus ou garde-fou, 2 = usage.
// Journal : docs/journal-suites.jsonl, en ajout seulement. Une suite de plus pour un lot déjà présent
// exige --justification. Les e2e ne sont pas lancés si vitest est rouge.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { exigerBaseTest, GardeBaseTestError } from './lib/garde-base-test.mjs';
import { executerSuite, lignesDuLot, SuiteRefusee } from './lib/journal-suites.mjs';
import { commandesPreControle } from './lib/pre-controle.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const journal = join(racine, 'docs', 'journal-suites.jsonl');

let values;
try {
  ({ values } = parseArgs({
    options: {
      lot: { type: 'string' },
      justification: { type: 'string' },
      lister: { type: 'string' },
    },
  }));
} catch (e) {
  console.error(`suite-complete : ${e.message}`);
  process.exit(2);
}

if (values.lister !== undefined) {
  const lignes = lignesDuLot(journal, values.lister);
  console.log(
    lignes.length === 0
      ? `aucune suite complète au journal pour le lot « ${values.lister} »`
      : lignes.join('\n'),
  );
  process.exit(0);
}
if (!values.lot || values.lot.trim() === '') {
  console.error(
    'Usage : npm run suite-complete -- --lot <nom> [--justification "<texte>"] | --lister <lot>',
  );
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

const git = (...args) => spawnSync('git', args, { cwd: racine, encoding: 'utf8' }).stdout.trim();
const lancer = (args) =>
  new Promise((ok) => {
    const enfant = spawn('npm', args, { cwd: racine, stdio: 'inherit', env: process.env });
    enfant.on('error', () => ok({ code: 1 }));
    enfant.on('exit', (code) => ok({ code: code ?? 1 }));
  });

/** Pré-contrôle (D-198 (1)) : sortie capturée, affichée seulement en cas d'échec. */
const executer = ({ commande, args, cwd }) =>
  new Promise((ok) => {
    const enfant = spawn(commande, args, { cwd, env: process.env });
    let sortie = '';
    enfant.stdout.on('data', (d) => (sortie += d));
    enfant.stderr.on('data', (d) => (sortie += d));
    enfant.on('error', (e) => ok({ code: 1, sortie: `${sortie}${e.message}` }));
    enfant.on('exit', (code) => ok({ code: code ?? 1, sortie }));
  });
async function lancerPreControle() {
  console.log(
    'Pré-contrôle : tests structurels rapides, puis chargement de la configuration Playwright…',
  );
  const t0 = performance.now();
  for (const c of commandesPreControle(racine)) {
    const r = await executer(c);
    if (r.code !== 0) {
      return {
        code: r.code,
        sortie: `$ ${c.commande} ${c.args.join(' ')}\n${r.sortie.slice(-8000)}`,
      };
    }
  }
  console.log(`Pré-contrôle vert (${Math.round((performance.now() - t0) / 100) / 10} s).`);
  return { code: 0 };
}

try {
  const r = await executerSuite({
    chemin: journal,
    lot: values.lot,
    ...(values.justification === undefined ? {} : { justification: values.justification }),
    commit: git('rev-parse', '--short', 'HEAD'),
    arbrePropre: git('status', '--porcelain') === '',
    runner: {
      preControle: lancerPreControle,
      vitest: () => lancer(['test']),
      e2e: () => lancer(['run', 'test:e2e']),
    },
  });
  if (r.message) {
    console.error(r.message);
    process.exit(r.code);
  }
  console.log(`\nSuite complète du lot « ${values.lot} » : ${r.resultat}.`);
  console.log(
    `Journal : docs/journal-suites.jsonl (à commiter). Lignes : npm run suite-complete -- --lister ${values.lot}`,
  );
  process.exit(r.code);
} catch (e) {
  if (!(e instanceof SuiteRefusee)) throw e;
  console.error(e.message);
  process.exit(1);
}
