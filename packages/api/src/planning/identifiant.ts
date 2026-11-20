import { z } from 'zod';

/** Plus grand identifiant accepté (entier signé 32 bits de PostgreSQL). */
export const MAX_ID = 2147483647;

/** Identifiant d'un paramètre d'adresse : entier décimal de 1 à 2^31-1, sinon null (→ 404). */
export function identifiant(brut: string): number | null {
  if (!/^[0-9]{1,10}$/.test(brut)) return null;
  const n = Number(brut);
  return n >= 1 && n <= MAX_ID ? n : null;
}

/** Plage des entiers 32 bits signés de PostgreSQL (int4). */
export const INT4_MIN = -2147483648;

/** Champ `*_id` d'un corps (D-140 (4)) : entier de 1 à 2147483647, sinon 400 (jamais 500). */
export const idCorps = z.number().int().min(1).max(MAX_ID);

/** Rang d'un corps : entier de 1 à 2147483647. */
export const rangCorps = idCorps;

/** Entier signé 32 bits (delai, duree_validee) : hors plage → 400. */
export const int4Corps = z.number().int().min(INT4_MIN).max(MAX_ID);
