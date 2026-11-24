// e2e en parallèle (D-199) : E2P-6, la pile du worker vise sa propre base.
import { expect, test } from '@playwright/test';
import pg from 'pg';
import { exigerBaseTest } from '../../scripts/lib/garde-base-test.mjs';
import { E2E_ADMIN } from './credentials.js';

async function compter(url: string, nom: string): Promise<number> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    const t = await c.query<{ r: string | null }>("SELECT to_regclass('public.calendrier') AS r");
    if (t.rows[0]?.r === null) return 0;
    return (await c.query('SELECT 1 FROM calendrier WHERE nom = $1', [nom])).rowCount ?? 0;
  } finally {
    await c.end();
  }
}

test('E2P-6 : la base visée est celle du worker ; un calendrier créé par son API y est, et pas dans la base de maintenance', async ({
  request,
}) => {
  const n = Number(process.env.TEST_PARALLEL_INDEX) + 1;
  const base = exigerBaseTest(process.env);
  expect(new URL(base).pathname).toMatch(new RegExp(`_e2e_w${n}_test$`));
  const maintenance = exigerBaseTest(process.env, 'PLANERSOURCE_E2E_MAINTENANCE');
  expect(maintenance).not.toBe(base);

  const nom = `Cal E2P-6 w${n}`;
  const login = await request.post('/api/auth/login', {
    data: { email: E2E_ADMIN.email, mot_de_passe: E2E_ADMIN.motDePasse },
  });
  expect(login.ok(), `connexion : ${login.status()}`).toBeTruthy();
  const r = await request.post('/api/calendriers', {
    data: { nom, jours_travailles: [1, 2, 3, 4, 5] },
  });
  expect(r.ok(), `création : ${r.status()}`).toBeTruthy();

  expect(await compter(base, nom)).toBe(1);
  expect(await compter(maintenance, nom)).toBe(0);
});
