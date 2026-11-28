import { z } from 'zod';

/** Longueur minimale d'un nouveau mot de passe (D-274, SEC-7), en points de code, sans retrait d'espaces. */
export const LONGUEUR_MIN_MOT_DE_PASSE = 12;
export const MESSAGE_LONGUEUR = 'Le mot de passe doit contenir au moins 12 caractères.';
export const motDePasseLongEnough = (mdp: string): boolean =>
  [...mdp].length >= LONGUEUR_MIN_MOT_DE_PASSE;

/** Nouveau mot de passe : 12 caractères au moins, aucune autre règle (D-274, après D-076). Partagé entre /api/utilisateurs et create-admin. */
export const emailSchema = z.email().transform((e) => e.toLowerCase());
export const motDePasseSchema = z
  .string()
  .refine(motDePasseLongEnough, { message: MESSAGE_LONGUEUR });

/** Message d'un corps refusé : celui de la longueur si c'est le seul défaut, sinon « Données invalides ». */
export const messageCorps = (erreur: z.ZodError): string =>
  erreur.issues.length > 0 && erreur.issues.every((i) => i.message === MESSAGE_LONGUEUR)
    ? MESSAGE_LONGUEUR
    : 'Données invalides';

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
