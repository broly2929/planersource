import type { FastifyInstance } from 'fastify';
import { identifiant, refuser, verdictProjet } from '../planning/acces.js';
import { lireGantt } from '../planning/gantt.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

/** Lecture du Gantt d'un projet (lot 3a, D-065) : lecture seule, droits de lecture du projet. */
export function ganttRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  app.get<{ Params: { id: string } }>(
    '/api/projets/:id/gantt',
    { preHandler: requireUser },
    async (request, reply) => {
      const user = request.user!;
      const id = identifiant(request.params.id);
      const lecture = await verdictProjet(pool, user, id, false);
      if (lecture.verdict) return refuser(reply, lecture.verdict);
      // « interdit » à l'écriture = projet lisible en lecture seule
      const ecriture = await verdictProjet(pool, user, id, true);
      return lireGantt(pool, user, lecture.projet, ecriture.verdict === null);
    },
  );
}
