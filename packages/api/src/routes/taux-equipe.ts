import type { FastifyInstance } from 'fastify';
import { transaction } from '../db/transaction.js';
import { identifiant } from '../planning/identifiant.js';
import { RefusTaux } from '../planning/taux.js';
import {
  chefLitTauxEquipe,
  creerTauxEquipe,
  equipeExiste,
  lireTauxEquipe,
  lireUnTauxEquipe,
  modifierTauxEquipe,
  supprimerTauxEquipe,
} from '../planning/taux-equipe.js';
import type { AppDeps } from '../app.js';
import { requireAdmin, requireFinances } from './acces.js';
import { creation, definis, invalide, modification, REFUS } from './taux.js';

const interdit = { erreur: 'Interdit' };
const equipeIntrouvable = { erreur: 'Équipe introuvable' };
const tauxIntrouvable = { erreur: 'Taux introuvable' };

/** Taux par équipe (SPEC §12.6 points 1 à 5, D-258). */
export function tauxEquipeRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  // Lecture : 401, 403 (rôle ressource), 404, 403 (chef sans membre dans sa portée).
  app.get<{ Params: { id: string } }>(
    '/api/equipes/:id/taux',
    { preHandler: requireFinances },
    async (request, reply) => {
      const user = request.user!;
      const id = identifiant(request.params.id);
      if (id === null || !(await equipeExiste(pool, id))) {
        return reply.code(404).send(equipeIntrouvable);
      }
      if (user.role !== 'administrateur' && !(await chefLitTauxEquipe(pool, user, id))) {
        return reply.code(403).send(interdit);
      }
      return lireTauxEquipe(pool, id);
    },
  );

  // Écriture : administrateur seul. Ordre : 401, 403, 404, 400, 422, 409.
  app.post<{ Params: { id: string } }>(
    '/api/equipes/:id/taux',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      if (id === null || !(await equipeExiste(pool, id))) {
        return reply.code(404).send(equipeIntrouvable);
      }
      const body = creation.safeParse(request.body);
      if (!body.success) return reply.code(400).send(invalide);
      try {
        const taux = await transaction(pool, (db) =>
          creerTauxEquipe(db, request.user!.id, id, body.data),
        );
        if (!taux) return reply.code(404).send(equipeIntrouvable);
        return reply.code(201).send(taux);
      } catch (err) {
        if (err instanceof RefusTaux)
          return reply.code(REFUS[err.motif][0]).send(REFUS[err.motif][1]);
        throw err;
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/api/taux-equipe/:id',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      if (id === null || !(await lireUnTauxEquipe(pool, id))) {
        return reply.code(404).send(tauxIntrouvable);
      }
      const body = modification.safeParse(request.body);
      if (!body.success) return reply.code(400).send(invalide);
      try {
        const taux = await transaction(pool, (db) =>
          modifierTauxEquipe(db, request.user!.id, id, definis(body.data)),
        );
        return taux ?? reply.code(404).send(tauxIntrouvable);
      } catch (err) {
        if (err instanceof RefusTaux)
          return reply.code(REFUS[err.motif][0]).send(REFUS[err.motif][1]);
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/taux-equipe/:id',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      const fait =
        id !== null &&
        (await transaction(pool, (db) => supprimerTauxEquipe(db, request.user!.id, id)));
      return fait ? reply.code(204).send() : reply.code(404).send(tauxIntrouvable);
    },
  );
}
