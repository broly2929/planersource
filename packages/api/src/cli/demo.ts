import { createAdmin } from '../auth/create-admin.js';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { exigerBaseDemo, NOM_BASE_DEMO, urlBaseDemo } from '../demo/base.js';
import { remplirDemo } from '../demo/remplir.js';
import { migrate } from '../db/migrate.js';
import { createPool } from '../db/pool.js';
import { chargerEnv } from '../env.js';

chargerEnv();

/** Lundi de la semaine du jour (lecture de l'horloge ici, jamais dans le moteur). */
function lundiDeLaSemaine(aujourdhui: Date): string {
  const d = new Date(
    Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()),
  );
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const config = loadConfig();
const urlDemo = urlBaseDemo(config.databaseUrl);
try {
  exigerBaseDemo(urlDemo);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

// DROP et CREATE se font depuis la base de développement, qui n'est jamais modifiée.
const serveur = createPool(config.databaseUrl);
try {
  await serveur.query(`DROP DATABASE IF EXISTS ${NOM_BASE_DEMO} WITH (FORCE)`);
  await serveur.query(`CREATE DATABASE ${NOM_BASE_DEMO}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await serveur.end();
}

const pool = createPool(urlDemo);
const lundi = lundiDeLaSemaine(new Date());
try {
  await migrate(pool);
  await createAdmin(pool, { login: 'admin', nom: 'Administrateur', motDePasse: 'admin' });
  const app = buildApp({ pool, config: { ...config, databaseUrl: urlDemo } });
  await app.ready();
  await remplirDemo(app, { lundi });
  await app.close();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}

if (!process.exitCode) {
  console.log(`Base ${NOM_BASE_DEMO} prête (semaine du ${lundi}).

Comptes (mot de passe = identifiant) :
  admin  administrateur
  chefa  chef de projet (DEMO-R, DEMO-Q, DEMO-C)
  chefb  chef de projet et ressource (DEMO-S ; DEMO-R en lecture seule)
  alice  ressource
  bob    ressource

Projets : DEMO-R (avec sous-projet DEMO-S), DEMO-Q, DEMO-C (clos), DEMO-M (modèle)

Lancer : npm run dev:demo
Adresse : http://localhost:5173`);
}
