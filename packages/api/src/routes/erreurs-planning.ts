import type { FastifyReply } from 'fastify';
import { estContrainte, estDoublon, estReference } from '../db/erreurs.js';
import { RefusCloture } from '../planning/cloture.js';

/** Contraintes reconnues par leur nom : 422 avec un `code` stable (D-094 (5), D-108 (2)). */
const CODES_CONTRAINTES: [string, string][] = [
  ['activite_dates_coherentes', 'dates_incoherentes'],
  ['element_parent_sans_assignation', 'parent_assigne'],
  ['dependance_hierarchie', 'dependance_hierarchie'],
];

/**
 * Traduit une erreur de contrainte en réponse : 409 doublon, 422 règle métier (contrainte, clé
 * étrangère, déclencheur). Toute autre erreur est relancée. Le corps de la requête a déjà été validé (400).
 */
export function traduireErreur(err: unknown, reply: FastifyReply) {
  if (err instanceof RefusCloture) return refusCloture(err, reply);
  if (estDoublon(err)) return reply.code(409).send({ erreur: 'Déjà existant' });
  for (const [contrainte, code] of CODES_CONTRAINTES) {
    if (estContrainte(err, contrainte)) {
      return reply.code(422).send({ erreur: 'Règle de planning non respectée', code });
    }
  }
  if (estContrainte(err) || estReference(err)) {
    return reply.code(422).send({ erreur: 'Règle de planning non respectée' });
  }
  throw err;
}

export const invalide = { erreur: 'Données invalides' };

/** Refus de clôture (D-083) : 422 { erreur, code }. */
export const refusCloture = (err: RefusCloture, reply: FastifyReply) =>
  reply.code(422).send({ erreur: err.message, code: err.code });
