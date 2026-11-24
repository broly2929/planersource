import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RACINE } from './outillage-helpers.js';

// E2P-9 (D-199 (12), D-198 (4)) : seul e2e/pile-worker.ts construit les adresses des piles ; aucune
// adresse de dev ni chemin d'état de session unique codé en dur sous e2e/.
const INTERDITS = [
  'localhost:5173',
  'localhost:3000',
  '127.0.0.1:5173',
  '127.0.0.1:3000',
  '.auth/admin.json',
];
const PERMIS = ['e2e/pile-worker.ts'];

describe('E2P-9 aucune adresse de pile codée en dur sous e2e/', () => {
  it('fichiers suivis sous e2e/, hors pile-worker.ts', () => {
    const fichiers = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', 'e2e'],
      {
        cwd: RACINE,
        encoding: 'utf8',
      },
    )
      .split('\n')
      .filter((f) => /\.(ts|mts|mjs|js|json)$/.test(f) && !PERMIS.includes(f));
    expect(fichiers.length).toBeGreaterThan(50);
    const fautes = fichiers.flatMap((f) => {
      const texte = readFileSync(resolve(RACINE, f), 'utf8');
      return INTERDITS.filter((m) => texte.includes(m)).map((m) => `${f} : ${m}`);
    });
    expect(fautes).toEqual([]);
  });
});
