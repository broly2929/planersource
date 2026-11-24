// Lancement d'une commande sur la base de test, jamais sur la base de dev (D-193 (3)).
// Usage : node scripts/garde-base-test.mjs exec -- <commande> [arguments]
//         node scripts/garde-base-test.mjs verifier
// `exec` vérifie TEST_DATABASE_URL (variable d'environnement, sinon .env), force DATABASE_URL sur cette
// base pour la commande, et ne lance rien si le contrôle échoue (code 1). Code 2 : usage.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exigerBaseTest, GardeBaseTestError } from './lib/garde-base-test.mjs';

const envRacine = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envRacine)) process.loadEnvFile(envRacine); // une variable déjà définie garde sa valeur

const [sousCommande, ...reste] = process.argv.slice(2);
if (reste[0] === '--') reste.shift();

if (sousCommande !== 'exec' && sousCommande !== 'verifier') {
  console.error('Usage : node scripts/garde-base-test.mjs exec -- <commande> | verifier');
  process.exit(2);
}
if (sousCommande === 'exec' && reste.length === 0) {
  console.error('Usage : node scripts/garde-base-test.mjs exec -- <commande> [arguments]');
  process.exit(2);
}

let url;
try {
  url = exigerBaseTest(process.env);
} catch (e) {
  if (!(e instanceof GardeBaseTestError)) throw e;
  console.error(e.message);
  process.exit(1);
}
if (sousCommande === 'verifier') {
  console.log('Base de test valide.');
  process.exit(0);
}

const [commande, ...args] = reste;
const enfant = spawn(commande, args, {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
enfant.on('error', (e) => {
  console.error(`avec-base-test : ${e.message}`);
  process.exit(2);
});
enfant.on('exit', (code) => process.exit(code ?? 1));
