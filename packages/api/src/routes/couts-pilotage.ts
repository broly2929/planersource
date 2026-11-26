import type { FastifyInstance } from 'fastify';
import { exporterCoutsPilotage } from '../export/couts-pilotage.js';
import { lireCoutsPilotage } from '../planning/couts-pilotage.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';
import { lireParametresPlan } from './plan-de-charge.js';

/** Coûts mensuels du pilotage (SPEC §12.5, D-243) et leur export CSV : lecture seule. */
export function coutsPilotageRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  type Requete = { Querystring: { debut?: unknown; equipe?: unknown } };
  const parametres = (role: string, query: Requete['Querystring']) =>
    lireParametresPlan(role, query);

  app.get<Requete>('/api/couts', { preHandler: requireUser }, async (request, reply) => {
    const user = request.user!;
    const p = parametres(user.role, request.query);
    if ('erreur' in p) return reply.code(p.statut).send({ erreur: p.erreur });
    return lireCoutsPilotage(pool, user, p.debut, p.filtre);
  });

  app.get<Requete>('/api/couts/export', { preHandler: requireUser }, async (request, reply) => {
    const user = request.user!;
    const p = parametres(user.role, request.query);
    if ('erreur' in p) return reply.code(p.statut).send({ erreur: p.erreur });
    const corps = await exporterCoutsPilotage(pool, user, p.debut, p.filtre);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="couts-${p.debut}.csv"`)
      .send(corps);
  });
}
