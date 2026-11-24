// Signatures du garde-fou de base de test (D-193 (2)). Implémentation : garde-base-test.mjs.
export const SUFFIXE_BASE_TEST: string;
export class GardeBaseTestError extends Error {}
/** Renvoie `valeur` inchangée si elle désigne une base de test ; sinon lève GardeBaseTestError. */
export function verifierBaseTest(valeur: string | undefined | null, nomVariable?: string): string;
/** Lit la variable `nomVariable` de `env` (jamais de repli sur une autre) et la vérifie. */
export function exigerBaseTest(
  env?: Record<string, string | undefined>,
  nomVariable?: string,
): string;
