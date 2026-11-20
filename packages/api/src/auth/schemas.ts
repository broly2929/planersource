import { z } from 'zod';

/** Mot de passe : non vide, aucune autre contrainte (D-076). Règles partagées entre la route /api/utilisateurs et la commande create-admin. */
export const emailSchema = z.email().transform((e) => e.toLowerCase());
export const motDePasseSchema = z.string().min(1);

/** Identifiant de connexion (D-077) : rogné, minuscules, non vide, sans autre format. */
export const loginSchema = z
  .string()
  .transform((l) => l.trim().toLowerCase())
  .pipe(z.string().min(1));

/** Initiales (D-077) : rognées ; vides ou null = aucune ; 1 à 4 caractères sinon. */
export const initialesSchema = z
  .union([
    z.null(),
    z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(4)),
  ])
  .transform((v) => (v === null || v === '' ? null : v));
