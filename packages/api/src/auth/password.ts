import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';

export const hashPassword = (motDePasse: string): Promise<string> => argon2.hash(motDePasse);

export const verifyPassword = (hash: string, motDePasse: string): Promise<boolean> =>
  argon2.verify(hash, motDePasse);

let hashFactice: Promise<string> | undefined;

/**
 * Hash d'une valeur aléatoire, mêmes paramètres que `hashPassword`, calculé une fois par processus
 * (paresseusement) : vérifié à la place du hash réel quand l'utilisateur est inconnu ou inactif,
 * pour que la connexion prenne le même temps dans tous les cas (D-140 (2)).
 */
export const hashDeSubstitution = (): Promise<string> => {
  hashFactice ??= hashPassword(randomBytes(32).toString('base64url'));
  return hashFactice;
};
