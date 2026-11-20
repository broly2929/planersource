import type { FastifyInstance } from 'fastify';
import { identifiant, refuser, verdictProjet } from '../planning/acces.js';
import { lireTravail } from '../planning/travail.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

/** Travail planifié par jour d'un projet (lot 3g, D-114 (2)) : lecture seule, droits de lecture du projet. */
export function travailRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  app.get<{ Params: { id: string } }>(
    '/api/projets/:id/travail',
    { preHandler: requireUser },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      const lecture = await verdictProjet(pool, request.user!, id, false);
      if (lecture.verdict) return refuser(reply, lecture.verdict);
      return { lignes: await lireTravail(pool, lecture.projet.id) };
    },
  );
}
