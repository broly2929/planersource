import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { identifiant, refuser, verdictProjet } from '../planning/acces.js';
import { ENTITES, lireHistorique, lireHistoriqueProjet } from '../planning/historique.js';
import type { AppDeps } from '../app.js';
import { requireAdmin, requireUser } from './acces.js';
import { invalide } from './erreurs-planning.js';

const filtre = z.strictObject({ entite: z.enum(ENTITES as [string, ...string[]]).optional() });

export function historiqueRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  // Historique d'un projet : administrateur et chef du projet (droit d'écriture), 404 si invisible.
  app.get<{ Params: { id: string } }>(
    '/api/projets/:id/historique',
    { preHandler: requireUser },
    async (request, reply) => {
      const acces = await verdictProjet(pool, request.user!, identifiant(request.params.id), true);
      if (acces.verdict) return refuser(reply, acces.verdict);
      return lireHistoriqueProjet(pool, acces.projet.id);
    },
  );

  // Historique transversal (calendriers) : administrateur seulement.
  app.get('/api/historique', { preHandler: requireAdmin }, async (request, reply) => {
    const query = filtre.safeParse(request.query);
    if (!query.success) return reply.code(400).send(invalide);
    return lireHistorique(pool, query.data.entite as (typeof ENTITES)[number] | undefined);
  });
}
