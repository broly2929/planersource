// Aides du lot 5b : le limiteur est importé dynamiquement (module absent en phase rouge).
import { fileURLToPath } from 'node:url';

export interface Limiteur {
  verifier(ip: string, identifiant: string): { bloque: boolean; retryAfter: number };
  echec(ip: string, identifiant: string): void;
  succes(ip: string, identifiant: string): void;
  taille(): number;
}

const CHEMIN = fileURLToPath(new URL('../src/auth/limiteur.ts', import.meta.url));

export async function nouveauLimiteur(maintenant: () => number): Promise<Limiteur> {
  const m = (await import(/* @vite-ignore */ CHEMIN)) as {
    creerLimiteur: (maintenant: () => number) => Limiteur;
  };
  return m.creerLimiteur(maintenant);
}
