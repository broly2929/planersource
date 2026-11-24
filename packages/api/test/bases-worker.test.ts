import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { testDbUrl } from './helpers.js';

// BPW-8 (D-196 (3)) : un test de l'API travaille sur la base de son worker.
describe('BPW-8 base du worker courant', () => {
  it('testDbUrl() désigne la base du worker, migrée', async () => {
    const worker = process.env.VITEST_POOL_ID;
    expect(worker).toMatch(/^[1-9]\d*$/);
    const nom = decodeURIComponent(new URL(testDbUrl()).pathname.slice(1));
    expect(nom).toMatch(new RegExp(`_vitest_w${worker}_test$`));
    const c = new pg.Client({ connectionString: testDbUrl() });
    await c.connect();
    try {
      const r = await c.query<{ n: string }>('SELECT count(*) AS n FROM schema_version');
      expect(Number(r.rows[0]!.n)).toBeGreaterThan(0);
    } finally {
      await c.end();
    }
  });
});
