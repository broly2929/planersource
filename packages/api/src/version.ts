import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Version et commit court de l'application (D-231, SPEC §13). */
export interface InfoVersion {
  version: string;
  commit: string;
}

/**
 * Lit la version dans le package.json racine (même chemin depuis src/ et dist/, et dans l'image) et le
 * commit dans la variable COMMIT (« inconnu » si absente ou vide). Aucune lecture de .git.
 */
export function lireVersion(): InfoVersion {
  const chemin = resolve(import.meta.dirname, '../../../package.json');
  const { version } = JSON.parse(readFileSync(chemin, 'utf8')) as { version: string };
  return { version, commit: process.env['COMMIT'] || 'inconnu' };
}
