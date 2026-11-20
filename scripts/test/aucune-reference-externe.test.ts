import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// PUB-1 (D-143) : motif construit par morceaux pour ne pas figurer en clair.
const motif = new RegExp(['proj', 'e', 'q', 't', 'or'].join(''), 'i');
const motifsPerso = [
  ['ssh', ' -L'].join(''),
  ['/home/', 'planer', 'source'].join(''),
  ['~/', 'planer', 'source'].join(''),
];
const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('PUB-1 aucune référence à un produit tiers', () => {
  it('aucun fichier suivi ne contient le motif', () => {
    const fichiers = execFileSync('git', ['ls-files', '-z'], { cwd: racine, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
    const fautifs = fichiers.filter((f) => {
      try {
        return motif.test(readFileSync(resolve(racine, f), 'utf8'));
      } catch {
        return false;
      }
    });
    expect(fautifs).toEqual([]);
  });

  // PUB-2 : aucune trace de l'environnement personnel.
  it("PUB-2 aucun fichier suivi ne contient de trace de l'environnement personnel", () => {
    const fichiers = execFileSync('git', ['ls-files', '-z'], { cwd: racine, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
    const fautifs: string[] = [];
    for (const f of fichiers) {
      let texte: string;
      try {
        texte = readFileSync(resolve(racine, f), 'utf8');
      } catch {
        continue;
      }
      for (const m of motifsPerso) if (texte.includes(m)) fautifs.push(`${f} : ${m}`);
    }
    expect(fautifs).toEqual([]);
  });
});
