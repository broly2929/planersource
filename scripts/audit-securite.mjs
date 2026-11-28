// Audit des dépendances (D-272 (4)).
// 1) `npm audit --omit=dev --audit-level=high` : dépendances d'exécution, bloquant (code de sortie du script).
// 2) `npm audit` complet : outillage compris, pour information (son code est ignoré).
import { spawnSync } from 'node:child_process';

const lance = (args) => {
  console.log(`\n> npm ${args.join(' ')}`);
  const r = spawnSync('npm', args, { stdio: 'inherit' });
  if (r.error) {
    console.error(`npm introuvable : ${r.error.message}`);
    process.exit(2);
  }
  return r.status ?? 2;
};

const code = lance(['audit', '--omit=dev', '--audit-level=high']);
lance(['audit']);
console.log(
  code === 0
    ? '\nExécution : aucune faille haute ou critique.'
    : '\nExécution : faille haute ou critique (voir ci-dessus).',
);
process.exit(code);
