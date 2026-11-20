// Remet la base de test à zéro avant le démarrage de l'API. Refuse toute base hors *_test.
import pg from 'pg';

const url = process.env.DATABASE_URL ?? '';
if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) {
  console.error('prepare-db : DATABASE_URL doit désigner une base dont le nom finit par _test');
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('DROP SCHEMA public CASCADE');
await client.query('CREATE SCHEMA public');
await client.end();
