// Remet la base de test à zéro avant le démarrage de l'API. Refuse toute base hors *_test.
import pg from 'pg';
import { exigerBaseTest } from '../scripts/lib/garde-base-test.mjs';

// Garde-fou unique (D-193) : refus avant toute connexion.
const url = exigerBaseTest(process.env, 'DATABASE_URL');
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('DROP SCHEMA public CASCADE');
await client.query('CREATE SCHEMA public');
await client.end();
