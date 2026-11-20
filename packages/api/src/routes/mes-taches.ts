import type { FastifyInstance } from 'fastify';
import { lireMesTaches } from '../planning/mes-taches.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

/** Lot 6b (D-148 (3)) : tâches de l'utilisateur connecté, lecture seule. */
export function mesTachesRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  app.get('/api/mes-taches', { preHandler: requireUser }, async (request) =>
    lireMesTaches(pool, request.user!.id),
  );
}
