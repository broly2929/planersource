import { useSyncExternalStore } from 'react';

// Version et commit inscrits à la compilation par Vite (`define`, D-231, SPEC §13 point 4).
declare const __VERSION__: string;
declare const __COMMIT__: string;
// Hors Vite (vitest du web, environnement node) les constantes n'existent pas.
export const VERSION: string = typeof __VERSION__ === 'undefined' ? '0.0.0' : __VERSION__;
export const COMMIT: string = typeof __COMMIT__ === 'undefined' ? 'inconnu' : __COMMIT__;

let versionServeur: string | null = null;
const abonnes = new Set<() => void>();

/** Compare l'en-tête X-PlanerSource-Version d'une réponse à la version du front (SPEC §13 point 5). */
export function noterVersionServeur(entete: string | null): void {
  if (entete === null || entete === versionServeur) return;
  versionServeur = entete;
  abonnes.forEach((a) => a());
}

/** Vrai si le serveur annonce une autre version que celle du front (version seule, pas le commit). */
export function useNouvelleVersion(): boolean {
  const serveur = useSyncExternalStore(
    (cb) => {
      abonnes.add(cb);
      return () => abonnes.delete(cb);
    },
    () => versionServeur,
  );
  return serveur !== null && serveur !== VERSION;
}
