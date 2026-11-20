import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { chargerEnv } from '../src/env.js';

const CLES = ['DEV_ENV_TEST_A', 'DEV_ENV_TEST_B'];

describe('Chargement du .env (D-071)', () => {
  afterEach(() => {
    for (const k of CLES) delete process.env[k];
  });

  it('DEV-9 : charge un fichier présent, garde les variables déjà définies, ignore un fichier absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dev-env-'));
    try {
      const fichier = join(dir, '.env');
      writeFileSync(fichier, 'DEV_ENV_TEST_A=du-fichier\nDEV_ENV_TEST_B=du-fichier\n');
      process.env.DEV_ENV_TEST_B = 'de-l-environnement';
      chargerEnv(fichier);
      expect(process.env.DEV_ENV_TEST_A).toBe('du-fichier');
      expect(process.env.DEV_ENV_TEST_B).toBe('de-l-environnement');
      expect(() => chargerEnv(join(dir, 'absent.env'))).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
