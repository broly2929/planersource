import { z } from 'zod';

/**
 * OTP d'un corps de requête (D-225, SPEC §12.2 point 1) : texte, espaces de bord retirés, 1 à 50
 * caractères ; chaîne vide (après retrait) ou null = aucun (null) ; plus de 50 caractères : 400.
 */
export const otpCorps = z
  .string()
  .trim()
  .max(50)
  .transform((v) => (v === '' ? null : v))
  .nullable();
