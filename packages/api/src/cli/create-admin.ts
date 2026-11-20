import { parseArgs } from 'node:util';
import { createAdmin } from '../auth/create-admin.js';
import { loadConfig } from '../config.js';
import { createPool } from '../db/pool.js';
import { chargerEnv } from '../env.js';

chargerEnv();

const { values } = parseArgs({
  options: { login: { type: 'string' }, email: { type: 'string' }, nom: { type: 'string' } },
});
const motDePasse = process.env.ADMIN_PASSWORD;
if ((!values.login && !values.email) || !values.nom || !motDePasse) {
  console.error(
    'Usage : ADMIN_PASSWORD=… npm run create-admin -- --login <identifiant> [--email <email>] --nom <nom> (login ou email requis)',
  );
  process.exit(2);
}

const pool = createPool(loadConfig().databaseUrl);
try {
  const { created } = await createAdmin(pool, {
    nom: values.nom,
    login: values.login,
    email: values.email,
    motDePasse,
  });
  console.log(created ? 'Administrateur créé.' : 'Aucun administrateur créé.');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
