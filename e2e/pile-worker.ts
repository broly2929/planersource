// Pile du worker Playwright courant (D-199 (2)) : seul fichier sous e2e/ qui construit les adresses
// des piles (E2P-9). Worker N = TEST_PARALLEL_INDEX + 1 ; hors worker (global-setup, outils) : 1.
import { PORT_WEB_BASE } from '../scripts/lib/piles-e2e.mjs';

/** Numéro du worker courant (1, 2, …), ou undefined hors d'un worker. */
export function numeroWorker(): number | undefined {
  const i = process.env.TEST_PARALLEL_INDEX;
  return i === undefined || i === '' ? undefined : Number(i) + 1;
}

/** URL du front de la pile du worker `n`. */
export function urlWeb(n: number): string {
  return `http://localhost:${PORT_WEB_BASE + n}`;
}

/** URL du front de la pile du worker courant. */
export const URL_WEB = urlWeb(numeroWorker() ?? 1);
