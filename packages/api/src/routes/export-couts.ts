import type { FastifyInstance } from 'fastify';
import { exporterCouts } from '../export/couts.js';
import { identifiant, refuser, verdictProjet } from '../planning/acces.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

/** Export CSV des coûts d'un projet (D-229) : lecture seule, réservé à qui écrit sur le projet. */
export function exportCoutsRoutes(app: FastifyInstance, { pool, aujourdhui }: AppDeps): void {
  const jourDuServeur = aujourdhui ?? (() => new Date().toISOString().slice(0, 10));
  app.get<{ Params: { id: string } }>(
    '/api/projets/:id/couts/export',
    { preHandler: requireUser },
    async (request, reply) => {
      const user = request.user!;
      if (user.role === 'ressource') return reply.code(403).send({ erreur: 'Interdit' });
      // 404 si le projet est illisible, 403 s'il est en lecture seule
      const acces = await verdictProjet(pool, user, identifiant(request.params.id), true);
      if (acces.verdict) return refuser(reply, acces.verdict);
      const jour = jourDuServeur();
      const corps = await exporterCouts(pool, user, acces.projet, jour);
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="couts-${acces.projet.code}-${jour}.csv"`,
        )
        .send(corps);
    },
  );
}
