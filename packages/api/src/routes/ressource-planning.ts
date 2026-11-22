import type { FastifyInstance } from 'fastify';
import { lirePlanningRessource } from '../planning/planning-ressource.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

/** Planning d'une ressource (lot 6e, D-157 (2)) : administrateur et chef de projet, lecture seule. */
export function ressourcePlanningRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  app.get<{ Params: { id: string } }>(
    '/api/ressources/:id/planning',
    { preHandler: requireUser },
    async (request, reply) => {
      const user = request.user!;
      if (user.role === 'ressource') return reply.code(403).send({ erreur: 'Interdit' });
      const { id } = request.params;
      const numero = /^\d{1,10}$/.test(id) ? Number(id) : 0;
      const plan =
        numero >= 1 && numero <= 2147483647
          ? await lirePlanningRessource(pool, user, numero)
          : null;
      if (!plan) return reply.code(404).send({ erreur: 'Introuvable' });
      return plan;
    },
  );
}
