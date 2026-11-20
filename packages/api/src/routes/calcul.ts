import { ErreurMoteur } from '@planersource/engine';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ErreurVerrouOccupe, transactionSerialisee } from '../db/transaction.js';
import { refuser } from '../planning/acces.js';
import { lancerCalcul } from '../planning/calcul.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

// strictObject : toute clé inconnue est refusée (D-044 1).
const corpsCalcul = z.strictObject({
  projets: z.array(z.number().int().positive().max(2147483647)).min(1),
  d0: z.iso.date().optional(),
});

export function calculRoutes(
  app: FastifyInstance,
  { pool, aujourdhui, delaiVerrouCalcul = 10000 }: AppDeps,
): void {
  const jourDuServeur = aujourdhui ?? (() => new Date().toISOString().slice(0, 10));

  // Calcul du planning : administrateur et chef de projet (SPEC §2, D-044).
  app.post('/api/calcul', { preHandler: requireUser }, async (request, reply) => {
    const user = request.user!;
    if (user.role === 'ressource') return reply.code(403).send({ erreur: 'Interdit' });
    const body = corpsCalcul.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const d0 = body.data.d0 ?? jourDuServeur();
    try {
      const resultat = await transactionSerialisee(
        pool,
        'calcul',
        (db) => lancerCalcul(db, user, body.data.projets, d0),
        delaiVerrouCalcul,
      );
      if ('verdict' in resultat) return refuser(reply, resultat.verdict);
      return resultat;
    } catch (err) {
      if (err instanceof ErreurVerrouOccupe) {
        return reply.code(409).send({ erreur: 'Un calcul est déjà en cours' });
      }
      // Erreur du moteur : tout est annulé, le client reçoit le code et les éléments fautifs.
      if (err instanceof ErreurMoteur) {
        return reply.code(422).send({ erreur: 'Calcul impossible', code: err.code, ids: err.ids });
      }
      throw err;
    }
  });
}
