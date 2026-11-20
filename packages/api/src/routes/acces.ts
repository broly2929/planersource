import type { FastifyReply, FastifyRequest } from 'fastify';

/** 401 sans session. */
export async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) return reply.code(401).send({ erreur: 'Non authentifié' });
}

/** 401 sans session, 403 si l'utilisateur n'est pas administrateur. */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) return reply.code(401).send({ erreur: 'Non authentifié' });
  if (request.user.role !== 'administrateur') return reply.code(403).send({ erreur: 'Interdit' });
}
