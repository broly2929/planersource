import type { FastifyReply, FastifyRequest } from 'fastify';
import { roleVoitFinances } from '../auth/user.js';

/** 401 sans session. */
export async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) return reply.code(401).send({ erreur: 'Non authentifié' });
}

/** 401 sans session, 403 si l'utilisateur n'est pas administrateur. */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) return reply.code(401).send({ erreur: 'Non authentifié' });
  if (request.user.role !== 'administrateur') return reply.code(403).send({ erreur: 'Interdit' });
}

/** 401 sans session, 403 pour le rôle ressource. */
export async function requireNonRessource(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.user) return reply.code(401).send({ erreur: 'Non authentifié' });
  if (request.user.role === 'ressource') return reply.code(403).send({ erreur: 'Interdit' });
}

/** 401 sans session, 403 pour le rôle ressource et le leader métier (coûts et taux, D-265 (3)). */
export async function requireFinances(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) return reply.code(401).send({ erreur: 'Non authentifié' });
  if (!roleVoitFinances(request.user.role)) return reply.code(403).send({ erreur: 'Interdit' });
}
