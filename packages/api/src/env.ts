import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Chemin du .env de la racine du dépôt. */
export const ENV_RACINE = fileURLToPath(new URL('../../../.env', import.meta.url));

/** Charge un fichier .env s'il existe ; une variable déjà définie garde sa valeur (D-071). */
export function chargerEnv(chemin: string = ENV_RACINE): void {
  if (existsSync(chemin)) process.loadEnvFile(chemin);
}
