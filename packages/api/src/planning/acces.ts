import type { FastifyReply } from 'fastify';
import type { Db } from '../db/erreurs.js';
import { accesProjet, type Acteur, type Projet } from './projets.js';

/** Verdict d'un contrôle d'accès : 404 si le projet est invisible, 403 s'il est en lecture seule. */
export type Verdict = 'introuvable' | 'interdit';

/**
 * Seul contrôle d'accès des routes de planning : il décide à partir du projet, jamais à partir de
 * `reply` (reply est thenable : le renvoyer d'une fonction async ne stoppe pas la route).
 */
export async function verdictProjet(
  db: Db,
  user: Acteur,
  projetId: number | null,
  ecriture: boolean,
): Promise<{ verdict: Verdict } | { verdict: null; projet: Projet }> {
  const acces = projetId === null ? null : await accesProjet(db, user, projetId);
  if (!acces) return { verdict: 'introuvable' };
  if (ecriture && !acces.peutEcrire) return { verdict: 'interdit' };
  return { verdict: null, projet: acces.projet };
}

/** La route envoie la réponse correspondant au verdict, puis sort. */
export function refuser(reply: FastifyReply, verdict: Verdict) {
  return verdict === 'introuvable'
    ? reply.code(404).send({ erreur: 'Introuvable' })
    : reply.code(403).send({ erreur: 'Interdit' });
}

export { identifiant } from './identifiant.js';
