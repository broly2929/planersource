// Dossier des captures d'écran des e2e (e2e/captures), relatif à ce fichier : valable en local et sur la CI (D-085).
import { fileURLToPath } from 'node:url';

export const DOSSIER_CAPTURES = fileURLToPath(new URL('../captures/', import.meta.url));

export function cheminCapture(nom: string): string {
  return `${DOSSIER_CAPTURES}${nom}`;
}
