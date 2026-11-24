import { fileURLToPath } from 'node:url';
import { numeroWorker } from './pile-worker.js';

/** État de session partagée de l'administrateur pour la pile du worker `n` (D-199 (5)). */
export function etatAdmin(n: number): string {
  return fileURLToPath(new URL(`.auth/admin-w${n}.json`, import.meta.url));
}

/** Session partagée du worker courant : écrite par le global-setup, réécrite par loginAsAdmin (D-194 (4)). */
export const ETAT_ADMIN = etatAdmin(numeroWorker() ?? 1);
