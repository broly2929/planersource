import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// PRT-1 (D-190 (2)) : prettier ne lit que le `.prettierignore` du dossier courant ; un lancement depuis un
// dossier de travail reformaterait les documents Markdown (accident du commit 64982ce).
const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dossiers = ['.', 'packages/engine', 'packages/api', 'packages/web', 'e2e', 'scripts'];

describe('PRT-1 prettier ignore les documents Markdown depuis chaque dossier de travail', () => {
  it.each(dossiers)('%s/.prettierignore contient **/*.md', (dossier) => {
    const fichier = resolve(racine, dossier, '.prettierignore');
    expect(existsSync(fichier), `${fichier} absent`).toBe(true);
    const lignes = readFileSync(fichier, 'utf8')
      .split('\n')
      .map((l) => l.trim());
    expect(lignes).toContain('**/*.md');
  });
});
