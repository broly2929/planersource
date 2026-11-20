// Lot 5i, cookie de session selon COOKIE_SECURE (D-139 (2)) : INST-12.
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { MOT_DE_PASSE, SESSION_COOKIE, seedUser, testDbUrl, useTestApp } from './helpers.js';

describe('Cookie de session : COOKIE_SECURE (D-139 (2))', () => {
  const ctx = useTestApp();

  async function secure(env: Record<string, string>): Promise<boolean | undefined> {
    await seedUser(ctx.pool, { email: 'alice@example.test' });
    const config = loadConfig({
      DATABASE_URL: testDbUrl(),
      SESSION_SECRET: 'secret-de-test-au-moins-32-caracteres!!',
      ...env,
    });
    const app = buildApp({ pool: ctx.pool, config });
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { identifiant: 'alice@example.test', mot_de_passe: MOT_DE_PASSE },
      });
      expect(res.statusCode).toBe(200);
      const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
      expect(cookie).toBeDefined();
      return cookie?.secure;
    } finally {
      await app.close();
    }
  }

  it('INST-12 : production, COOKIE_SECURE=0 → sans Secure', async () => {
    expect(await secure({ NODE_ENV: 'production', COOKIE_SECURE: '0' })).toBeFalsy();
  });

  it('INST-12 : production, COOKIE_SECURE=1 → Secure', async () => {
    expect(await secure({ NODE_ENV: 'production', COOKIE_SECURE: '1' })).toBe(true);
  });

  it('INST-12 : development, COOKIE_SECURE=1 → Secure', async () => {
    expect(await secure({ NODE_ENV: 'development', COOKIE_SECURE: '1' })).toBe(true);
  });

  it('INST-12 : absente, production → Secure', async () => {
    expect(await secure({ NODE_ENV: 'production' })).toBe(true);
  });

  it('INST-12 : absente, development → sans Secure', async () => {
    expect(await secure({ NODE_ENV: 'development' })).toBeFalsy();
  });
});
